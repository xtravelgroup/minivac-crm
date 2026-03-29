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

    // Client leg events send the child SID; use ParentCallSid to find the call_log
    const parentSid = formData.get("ParentCallSid") as string || "";

    // Handle recording status callback (from <Dial record="...">)
    const recordingStatus = formData.get("RecordingStatus") as string || "";
    const recordingSid = formData.get("RecordingSid") as string || "";
    if (recordingStatus === "completed" && recordingUrl) {
      const recSid = parentSid || callSid;
      console.log(`Recording completed: SID=${recordingSid}, URL=${recordingUrl}, CallSid=${recSid}`);
      if (recSid) {
        await fetch(`${SB_URL}/rest/v1/call_log?twilio_call_sid=eq.${recSid}`, {
          method: "PATCH", headers: HDR,
          body: JSON.stringify({ recording_url: recordingUrl }),
        });
      }
      return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
    }

    // Handle call status updates
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

      // Check if call was ever answered — if not, mark as missed (no-answer)
      const logRes = await fetch(`${SB_URL}/rest/v1/call_log?twilio_call_sid=eq.${sid}&limit=1`, { headers: HDR });
      const logData = await logRes.json();
      if (Array.isArray(logData) && logData.length > 0) {
        const log = logData[0];
        // If never answered (no answered_at), this is a missed/abandoned call
        if (!log.answered_at && log.status !== "completed") {
          updates.status = "no-answer";
        }
        // Reset agent status back to available
        if (log.agent_id) {
          await fetch(`${SB_URL}/rest/v1/agent_status?usuario_id=eq.${log.agent_id}`, {
            method: "PATCH", headers: HDR,
            body: JSON.stringify({ status: "available", updated_at: new Date().toISOString(), last_heartbeat: new Date().toISOString() }),
          });
        }
      }

      // Register call in lead_historial if lead is linked
      if (Array.isArray(logData) && logData.length > 0) {
        const log2 = logData[0];
        if (log2.lead_id) {
          const wasAnswered = !!log2.answered_at || updates.status === "completed";
          const durMin = callDuration > 0 ? Math.floor(callDuration / 60) + "m " + (callDuration % 60) + "s" : "0s";
          const statusLabel = wasAnswered ? "Completada" : "Perdida";
          const desc = log2.direction === "inbound"
            ? `Llamada entrante ${statusLabel} (${durMin}) desde ${log2.from_number || "desconocido"}`
            : log2.direction === "outbound"
            ? `Llamada saliente ${statusLabel} (${durMin}) a ${log2.to_number || "desconocido"}`
            : `Llamada interna ${statusLabel} (${durMin})`;

          // Get agent name
          let agentName = "Sistema";
          if (log2.agent_id) {
            try {
              const uRes = await fetch(`${SB_URL}/rest/v1/usuarios?id=eq.${log2.agent_id}&select=nombre&limit=1`, { headers: HDR });
              const uData = await uRes.json();
              if (Array.isArray(uData) && uData.length > 0) agentName = uData[0].nombre;
            } catch (_) {}
          }

          await fetch(`${SB_URL}/rest/v1/lead_historial`, {
            method: "POST", headers: HDR,
            body: JSON.stringify({
              lead_id: log2.lead_id,
              tipo: "llamada",
              descripcion: desc,
              detalle: JSON.stringify({ call_log_id: log2.id, duration: callDuration, direction: log2.direction, status: updates.status || log2.status, recording_url: log2.recording_url || null }),
              usuario_id: log2.agent_id || null,
              usuario_nombre: agentName,
            }),
          });
          console.log(`Registered call in lead_historial for lead ${log2.lead_id}`);

          // Update lead's ultimo_contacto
          await fetch(`${SB_URL}/rest/v1/leads?id=eq.${log2.lead_id}`, {
            method: "PATCH", headers: HDR,
            body: JSON.stringify({ ultimo_contacto: new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }) }),
          });
        }
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
