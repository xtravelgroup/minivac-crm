import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

const WEBHOOK_URL = `${SB_URL}/functions/v1/twilio-voice-webhook`;
const EVENTS_URL = `${SB_URL}/functions/v1/twilio-call-events`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,apikey" } });
  }

  try {
    const url = new URL(req.url);
    const callLogId = url.searchParams.get("callLogId") || "";

    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string || "";
    const dialCallStatus = formData.get("DialCallStatus") as string || "";

    console.log(`Voice status: SID=${callSid}, DialCallStatus=${dialCallStatus}, callLogId=${callLogId}`);

    // If answered/completed — call was handled successfully
    if (dialCallStatus === "completed" || dialCallStatus === "answered") {
      if (callLogId) {
        await fetch(`${SB_URL}/rest/v1/call_log?id=eq.${callLogId}`, {
          method: "PATCH", headers: HDR,
          body: JSON.stringify({ status: "completed", ended_at: new Date().toISOString() }),
        });
      }

      // Note: acd_queue status is managed by call-events (in-progress/completed)

      return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Agent didn't answer — reset agent and loop back to queue
    const qRes = await fetch(`${SB_URL}/rest/v1/acd_queue?twilio_call_sid=eq.${callSid}&limit=1`, { headers: HDR });
    const qData = await qRes.json();
    const queue = Array.isArray(qData) && qData.length > 0 ? qData[0] : null;

    if (queue && queue.current_agent_id) {
      // Reset previous agent back to available
      await fetch(`${SB_URL}/rest/v1/agent_status?usuario_id=eq.${queue.current_agent_id}`, {
        method: "PATCH", headers: HDR,
        body: JSON.stringify({ status: "available", updated_at: new Date().toISOString() }),
      });
    }

    // Update ACD queue status back to waiting
    await fetch(`${SB_URL}/rest/v1/acd_queue?twilio_call_sid=eq.${callSid}`, {
      method: "PATCH", headers: HDR,
      body: JSON.stringify({ status: "queued", current_agent_id: null }),
    });

    // Redirect back to webhook to find next available agent (keeps caller in queue)
    const retryUrl = `${WEBHOOK_URL}?retry=1&amp;callLogId=${callLogId}`;
    console.log(`Agent didn't answer, redirecting back to queue`);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX">Por favor permanezca en linea. Le estamos conectando con un promotor.</Say>
  <Pause length="2"/>
  <Redirect method="POST">${retryUrl}</Redirect>
</Response>`;

    return new Response(twiml, { headers: { "Content-Type": "text/xml" } });

  } catch (e) {
    console.error("Voice status error:", e);
    // On error, still try to keep caller in queue
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
