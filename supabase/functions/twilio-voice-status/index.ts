import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

const WEBHOOK_URL = `${SB_URL}/functions/v1/twilio-voice-webhook`;

// Helper: read current routing history from call_log.notes
async function getRoutingHistory(callLogId: string): Promise<any[]> {
  if (!callLogId) return [];
  try {
    const res = await fetch(`${SB_URL}/rest/v1/call_log?id=eq.${callLogId}&select=notes`, { headers: HDR });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0].notes) {
      return JSON.parse(data[0].notes);
    }
  } catch (_) {}
  return [];
}

// Helper: save routing history to call_log.notes
async function saveRoutingHistory(callLogId: string, history: any[]) {
  if (!callLogId) return;
  await fetch(`${SB_URL}/rest/v1/call_log?id=eq.${callLogId}`, {
    method: "PATCH", headers: HDR,
    body: JSON.stringify({ notes: JSON.stringify(history) }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,apikey" } });
  }

  try {
    const url = new URL(req.url);
    const callLogId = url.searchParams.get("callLogId") || "";
    const agentId = url.searchParams.get("agentId") || "";

    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string || "";
    const dialCallStatus = formData.get("DialCallStatus") as string || "";
    const dialDuration = formData.get("DialCallDuration") as string || "0";

    console.log(`Voice status: SID=${callSid}, DialCallStatus=${dialCallStatus}, agentId=${agentId}, callLogId=${callLogId}`);

    // Load current routing history
    const history = await getRoutingHistory(callLogId);

    // If answered/completed — call was handled successfully
    if (dialCallStatus === "completed" || dialCallStatus === "answered") {
      // Log this successful attempt
      history.push({
        agent_id: agentId,
        result: "answered",
        duration: parseInt(dialDuration, 10) || 0,
        at: new Date().toISOString(),
      });

      // Update call_log with final status and history
      if (callLogId) {
        await fetch(`${SB_URL}/rest/v1/call_log?id=eq.${callLogId}`, {
          method: "PATCH", headers: HDR,
          body: JSON.stringify({
            status: "completed",
            ended_at: new Date().toISOString(),
            duration_secs: parseInt(dialDuration, 10) || 0,
            notes: JSON.stringify(history),
          }),
        });
      }

      // Reset agent back to available immediately
      if (agentId) {
        await fetch(`${SB_URL}/rest/v1/agent_status?usuario_id=eq.${agentId}`, {
          method: "PATCH", headers: HDR,
          body: JSON.stringify({ status: "available", updated_at: new Date().toISOString(), last_heartbeat: new Date().toISOString() }),
        });
      }

      // Clean up ACD queue entry
      await fetch(`${SB_URL}/rest/v1/acd_queue?twilio_call_sid=eq.${callSid}`, {
        method: "DELETE", headers: HDR,
      });

      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Agent didn't answer — log failed attempt and try next
    history.push({
      agent_id: agentId,
      result: dialCallStatus || "no-answer",
      at: new Date().toISOString(),
    });
    await saveRoutingHistory(callLogId, history);

    // Reset previous agent back to available
    if (agentId) {
      await fetch(`${SB_URL}/rest/v1/agent_status?usuario_id=eq.${agentId}`, {
        method: "PATCH", headers: HDR,
        body: JSON.stringify({ status: "available", updated_at: new Date().toISOString(), last_heartbeat: new Date().toISOString() }),
      });
    }

    // Update ACD queue status back to queued
    await fetch(`${SB_URL}/rest/v1/acd_queue?twilio_call_sid=eq.${callSid}`, {
      method: "PATCH", headers: HDR,
      body: JSON.stringify({ status: "queued", current_agent_id: null }),
    });

    // Redirect back to webhook to find next available agent
    const retryUrl = `${WEBHOOK_URL}?retry=1&amp;callLogId=${callLogId}`;
    console.log(`Agent ${agentId} didn't answer (${dialCallStatus}), attempt #${history.length}, redirecting`);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="POST">${retryUrl}</Redirect>
</Response>`;

    return new Response(twiml, { headers: { "Content-Type": "text/xml" } });

  } catch (e) {
    console.error("Voice status error:", e);
    const retryUrl = `${WEBHOOK_URL}?retry=1&amp;callLogId=`;
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="3"/>
  <Redirect method="POST">${retryUrl}</Redirect>
</Response>`, {
      headers: { "Content-Type": "text/xml" },
    });
  }
});
