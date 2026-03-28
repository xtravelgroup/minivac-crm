import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

const SELF_URL = `${SB_URL}/functions/v1/twilio-voice-webhook`;
const STATUS_URL = `${SB_URL}/functions/v1/twilio-voice-status`;
const EVENTS_URL = `${SB_URL}/functions/v1/twilio-call-events`;

// Phone ring tone hosted on Supabase Storage (12s: 2 ring cycles of 2s tone + 4s silence)
const RING_TONE = `${SB_URL}/storage/v1/object/public/audio/phone_ring.wav`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,apikey" } });
  }

  try {
    const reqUrl = new URL(req.url);
    const isRetry = reqUrl.searchParams.get("retry") === "1";
    const existingLogId = reqUrl.searchParams.get("callLogId") || "";
    const loopCount = parseInt(reqUrl.searchParams.get("n") || "0", 10);

    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string || "";
    const from = formData.get("From") as string || "";
    const to = formData.get("To") as string || "";

    console.log(`Incoming call: ${from} -> ${to}, SID: ${callSid}, retry: ${isRetry}`);

    let callLogId = existingLogId;

    // Only create call_log and ACD queue on first call (not retries)
    if (!isRetry) {
      // Look up lead by phone number
      const cleanPhone = from.replace(/[^\d+]/g, "");
      const phoneSearch = cleanPhone.replace("+", "");
      const leadRes = await fetch(`${SB_URL}/rest/v1/leads?tel=ilike.*${phoneSearch.slice(-10)}&limit=1`, { headers: HDR });
      const leads = await leadRes.json();
      const lead = Array.isArray(leads) && leads.length > 0 ? leads[0] : null;

      // Create call_log entry
      const callLog: Record<string, unknown> = {
        twilio_call_sid: callSid,
        direction: "inbound",
        from_number: from,
        to_number: to,
        status: "ringing",
        started_at: new Date().toISOString(),
      };
      if (lead) callLog.lead_id = lead.id;

      const logRes = await fetch(`${SB_URL}/rest/v1/call_log`, {
        method: "POST", headers: { ...HDR, Prefer: "return=representation" },
        body: JSON.stringify(callLog),
      });
      const logText = await logRes.text();
      console.log(`call_log insert response (${logRes.status}): ${logText}`);
      try {
        const logData = JSON.parse(logText);
        if (Array.isArray(logData) && logData.length > 0) {
          callLogId = logData[0].id;
        } else if (logData && logData.id) {
          callLogId = logData.id;
        }
      } catch (_) {
        console.error("Failed to parse call_log response");
      }

      // Create ACD queue entry (call_log_id is NOT NULL, so only insert if we have it)
      if (callLogId) {
        const acdRes = await fetch(`${SB_URL}/rest/v1/acd_queue`, {
          method: "POST", headers: HDR,
          body: JSON.stringify({
            twilio_call_sid: callSid,
            call_log_id: callLogId,
            from_number: from,
            current_agent_id: null,
            status: "queued",
            attempt_count: 0,
            agents_tried: [],
            ring_started_at: new Date().toISOString(),
          }),
        });
        const acdText = await acdRes.text();
        console.log(`acd_queue insert response (${acdRes.status}): ${acdText}`);
      } else {
        console.error("No callLogId — skipping acd_queue insert");
      }
    }

    // Find available agent using queue_agents priority
    // 5-minute freshness window for heartbeats (agent must have sent heartbeat within 5 min)
    const freshnessWindow = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const qaRes = await fetch(`${SB_URL}/rest/v1/queue_agents?activo=eq.true&order=prioridad.asc`, { headers: HDR });
    const qaData = await qaRes.json();
    const queueAgentIds = Array.isArray(qaData) ? qaData.map((q: any) => q.usuario_id) : [];

    let agents: any[] = [];
    if (queueAgentIds.length > 0) {
      const agentRes = await fetch(
        `${SB_URL}/rest/v1/agent_status?status=eq.available&last_heartbeat=gte.${freshnessWindow}&usuario_id=in.(${queueAgentIds.join(",")})`,
        { headers: HDR }
      );
      const allAvailable = await agentRes.json();
      if (Array.isArray(allAvailable)) {
        agents = queueAgentIds
          .map((id: string) => allAvailable.find((a: any) => a.usuario_id === id))
          .filter(Boolean);
      }
    }

    // Build the redirect URL for retries (& must be &amp; in XML/TwiML)
    const nextN = loopCount + 1;
    const retryUrl = `${SELF_URL}?retry=1&amp;callLogId=${callLogId}&amp;n=${nextN}`;

    if (agents.length === 0) {
      // No agents available — short loop (~6s per cycle) to check for agents frequently
      console.log(`No agents available, loop #${loopCount}, holding caller in queue`);

      let twiml: string;

      if (!isRetry) {
        // First time: welcome message then ring, then redirect to check again
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX">Ya estas participando. Por favor permanecer en linea para ser atendido por un promotor.</Say>
  <Play loop="1">${RING_TONE}</Play>
  <Redirect method="POST">${retryUrl}</Redirect>
</Response>`;
      } else if (loopCount % 4 === 0) {
        // Every 4th retry (~24s): repeat hold message then ring
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX">Por favor permanezca en linea. Un promotor le atendera en breve.</Say>
  <Play loop="1">${RING_TONE}</Play>
  <Redirect method="POST">${retryUrl}</Redirect>
</Response>`;
      } else {
        // Normal retry: just ring (~6s) then check again immediately
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play loop="1">${RING_TONE}</Play>
  <Redirect method="POST">${retryUrl}</Redirect>
</Response>`;
      }

      return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // Agent found — dial them
    const agent = agents[0];
    const agentIdentity = "agent_" + agent.usuario_id;

    // Set agent to on_call
    await fetch(`${SB_URL}/rest/v1/agent_status?usuario_id=eq.${agent.usuario_id}`, {
      method: "PATCH", headers: HDR,
      body: JSON.stringify({ status: "on_call", updated_at: new Date().toISOString() }),
    });

    // Update call_log with agent
    if (callLogId) {
      await fetch(`${SB_URL}/rest/v1/call_log?id=eq.${callLogId}`, {
        method: "PATCH", headers: HDR,
        body: JSON.stringify({ agent_id: agent.usuario_id, status: "ringing" }),
      });
    }

    // Update ACD queue
    await fetch(`${SB_URL}/rest/v1/acd_queue?twilio_call_sid=eq.${callSid}`, {
      method: "PATCH", headers: HDR,
      body: JSON.stringify({
        current_agent_id: agent.usuario_id,
        status: "ringing",
        attempt_count: 1,
        agents_tried: [agent.usuario_id],
      }),
    });

    // Dial the agent — if no answer, action URL will loop back
    // Pass agentId so voice-status can log the attempt
    const statusCallback = `${STATUS_URL}?callLogId=${callLogId}&amp;agentId=${agent.usuario_id}`;

    // Agent available — connect immediately, no ring tone or welcome message
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="10" action="${statusCallback}" method="POST">
    <Client statusCallbackEvent="initiated ringing answered completed" statusCallback="${EVENTS_URL}" statusCallbackMethod="POST">${agentIdentity}</Client>
  </Dial>
</Response>`;

    console.log(`Routing to agent: ${agentIdentity}`);
    return new Response(twiml, { headers: { "Content-Type": "text/xml" } });

  } catch (e) {
    console.error("Voice webhook error:", e);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX">Lo sentimos, ocurrio un error. Por favor intente mas tarde.</Say>
  <Hangup/>
</Response>`;
    return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
  }
});
