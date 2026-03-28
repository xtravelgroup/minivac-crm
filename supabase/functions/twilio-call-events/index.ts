import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,apikey" } });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "";
    const callLogId = url.searchParams.get("callLogId") || "";

    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string || "";
    const callStatus = formData.get("CallStatus") as string || "";
    const callDuration = parseInt(formData.get("CallDuration") as string || "0", 10);
    const recordingUrl = formData.get("RecordingUrl") as string || "";

    // Handle voicemail recording
    if (type === "voicemail" && recordingUrl && callLogId) {
      await fetch(`${SB_URL}/rest/v1/call_log?id=eq.${callLogId}`, {
        method: "PATCH", headers: HDR,
        body: JSON.stringify({ recording_url: recordingUrl, notes: "Voicemail" }),
      });
      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Handle call status updates
    // Client leg events send the child SID; use ParentCallSid to find the call_log
    const parentSid = formData.get("ParentCallSid") as string || "";
    const sid = parentSid || callSid;
    console.log(`Call event: status=${callStatus}, CallSid=${callSid}, ParentCallSid=${parentSid}, using=${sid}`);
    if (!sid) return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });

    const statusMap: Record<string, string> = {
      "ringing": "ringing",
      "in-progress": "in-progress",
      "completed": "completed",
      "busy": "busy",
      "no-answer": "no-answer",
      "failed": "failed",
      "canceled": "canceled",
    };
    const mappedStatus = statusMap[callStatus] || callStatus;

    const updates: Record<string, unknown> = { status: mappedStatus };
    if (callStatus === "in-progress") {
      updates.answered_at = new Date().toISOString();

      // Agent answered — mark ACD queue as answered (visible in live queue as active call)
      await fetch(`${SB_URL}/rest/v1/acd_queue?twilio_call_sid=eq.${sid}`, {
        method: "PATCH", headers: HDR,
        body: JSON.stringify({ status: "answered" }),
      });
    }
    if (callStatus === "completed") {
      updates.ended_at = new Date().toISOString();
      updates.duration_secs = callDuration;

      // Reset agent status back to available
      const logRes = await fetch(`${SB_URL}/rest/v1/call_log?twilio_call_sid=eq.${sid}&limit=1`, { headers: HDR });
      const logData = await logRes.json();
      if (Array.isArray(logData) && logData.length > 0 && logData[0].agent_id) {
        await fetch(`${SB_URL}/rest/v1/agent_status?usuario_id=eq.${logData[0].agent_id}`, {
          method: "PATCH", headers: HDR,
          body: JSON.stringify({ status: "available", updated_at: new Date().toISOString() }),
        });
      }

      // Remove ACD queue entry — call is done
      await fetch(`${SB_URL}/rest/v1/acd_queue?twilio_call_sid=eq.${sid}`, {
        method: "DELETE", headers: HDR,
      });
    }

    await fetch(`${SB_URL}/rest/v1/call_log?twilio_call_sid=eq.${sid}`, {
      method: "PATCH", headers: HDR,
      body: JSON.stringify(updates),
    });

    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    console.error("Call events error:", e);
    return new Response("error", { status: 500 });
  }
});
