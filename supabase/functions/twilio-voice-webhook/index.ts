import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

const SELF_URL = `${SB_URL}/functions/v1/twilio-voice-webhook`;
const STATUS_URL = `${SB_URL}/functions/v1/twilio-voice-status`;
const EVENTS_URL = `${SB_URL}/functions/v1/twilio-call-events`;

// Phone ring tone hosted on Supabase Storage (12s: 2 ring cycles of 2s tone + 4s silence)
const RING_TONE = `${SB_URL}/storage/v1/object/public/audio/phone_ring.wav`;

// ── Queue routing by phone number ──────────────────────────
// Map Twilio numbers to queue names. When you get the CS and Reservas numbers,
// add them here. Format: "+1XXXXXXXXXX": "queue_name"
const QUEUE_MAP: Record<string, string> = {
  "+17867835400": "ventas",
  "+17867835592": "cs",
  "+17867834775": "reservas",
};

const QUEUE_CONFIG: Record<string, { name: string; welcome: string; hold: string; callerIdOverride?: string }> = {
  ventas: {
    name: "Sala A - Ventas",
    welcome: "Ya estas participando. Por favor permanecer en linea para ser atendido por un promotor.",
    hold: "Por favor permanezca en linea. Un promotor le atendera en breve.",
  },
  cs: {
    name: "Customer Service",
    welcome: "Gracias por llamar. Un agente de servicio al cliente le atendera en breve.",
    hold: "Por favor permanezca en linea. Un agente le atendera pronto.",
  },
  reservas: {
    name: "Reservaciones",
    welcome: "Gracias por llamar al departamento de reservaciones. Un agente le atendera en breve.",
    hold: "Por favor permanezca en linea. Un agente de reservaciones le atendera pronto.",
  },
};

function resolveQueue(toNumber: string, urlQueue: string | null): string {
  if (urlQueue && QUEUE_CONFIG[urlQueue]) return urlQueue;
  const clean = toNumber.replace(/[^\d+]/g, "");
  return QUEUE_MAP[clean] || "ventas";
}

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

    // Determine which queue this call belongs to
    const urlQueue = reqUrl.searchParams.get("queue");
    const queue = resolveQueue(to, urlQueue);
    const qCfg = QUEUE_CONFIG[queue] || QUEUE_CONFIG.ventas;
    console.log(`Call: ${from} -> ${to}, SID: ${callSid}, retry: ${isRetry}, queue: ${queue}`);

    // ── Outbound call from browser client → forward to outbound handler
    if (from.startsWith("client:") && !isRetry) {
      const callerIdentity = from.replace("client:", "");
      const CALLER_ID = Deno.env.get("TWILIO_CALLER_ID") || "+17867835400";

      // Internal call: agent_xxx → agent_yyy
      if (to.startsWith("agent_")) {
        const callerUserId = callerIdentity.replace("agent_", "");
        const targetUserId = to.replace("agent_", "");

        // Create call_log for internal call
        await fetch(`${SB_URL}/rest/v1/call_log`, {
          method: "POST", headers: HDR,
          body: JSON.stringify({
            twilio_call_sid: callSid,
            direction: "internal",
            from_number: callerIdentity,
            to_number: to,
            status: "ringing",
            started_at: new Date().toISOString(),
            agent_id: callerUserId,
          }),
        });

        // Set caller to on_call
        await fetch(`${SB_URL}/rest/v1/agent_status?usuario_id=eq.${callerUserId}`, {
          method: "PATCH", headers: HDR,
          body: JSON.stringify({ status: "on_call", updated_at: new Date().toISOString() }),
        });

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" callerId="${callerIdentity}" record="record-from-answer-dual" recordingStatusCallback="${EVENTS_URL}" recordingStatusCallbackMethod="POST">
    <Client statusCallbackEvent="initiated ringing answered completed" statusCallback="${EVENTS_URL}" statusCallbackMethod="POST">${to}</Client>
  </Dial>
  <Say language="es-MX">El agente no contesto.</Say>
</Response>`;
        return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
      }

      // External outbound call
      if (to) {
        let dialTo = to.replace(/[^\d+]/g, "");
        if (!dialTo.startsWith("+")) dialTo = "+1" + dialTo;
        const callerUserId = callerIdentity.replace("agent_", "");

        await fetch(`${SB_URL}/rest/v1/call_log`, {
          method: "POST", headers: HDR,
          body: JSON.stringify({
            twilio_call_sid: callSid,
            direction: "outbound",
            from_number: CALLER_ID,
            to_number: dialTo,
            status: "ringing",
            started_at: new Date().toISOString(),
            agent_id: callerUserId,
          }),
        });

        await fetch(`${SB_URL}/rest/v1/agent_status?usuario_id=eq.${callerUserId}`, {
          method: "PATCH", headers: HDR,
          body: JSON.stringify({ status: "on_call", updated_at: new Date().toISOString() }),
        });

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${CALLER_ID}" timeout="30" record="record-from-answer-dual" recordingStatusCallback="${EVENTS_URL}" recordingStatusCallbackMethod="POST">
    <Number statusCallbackEvent="initiated ringing answered completed" statusCallback="${EVENTS_URL}" statusCallbackMethod="POST">${dialTo}</Number>
  </Dial>
</Response>`;
        return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
      }
    }

    let callLogId = existingLogId;
    let lead: any = null;

    // Only create call_log and ACD queue on first call (not retries)
    if (!isRetry) {
      // Look up lead by phone number
      const cleanPhone = from.replace(/[^\d+]/g, "");
      const phoneSearch = cleanPhone.replace("+", "");
      const leadRes = await fetch(`${SB_URL}/rest/v1/leads?tel=ilike.*${phoneSearch.slice(-10)}&limit=1`, { headers: HDR });
      const leads = await leadRes.json();
      lead = Array.isArray(leads) && leads.length > 0 ? leads[0] : null;

      // Auto-create lead if phone number not registered
      if (!lead && phoneSearch.length >= 7) {
        const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
        const newLead = {
          nombre: "",
          apellido: "",
          tel: from,
          whatsapp: from,
          status: "nuevo",
          fecha: todayStr,
          ultimo_contacto: todayStr,
          ciudad: "Miami",
          estado_us: "FL",
          destinos: [],
          notas: JSON.stringify([{ ts: todayStr, autor: "Sistema", tipo: "llamada", nota: "Lead creado automaticamente por llamada entrante desde " + from }]),
          bloqueado: false,
          sale_price: 0,
          pago_inicial: 0,
          metodo_pago: "tarjeta",
        };
        const newLeadRes = await fetch(`${SB_URL}/rest/v1/leads`, {
          method: "POST", headers: { ...HDR, Prefer: "return=representation" },
          body: JSON.stringify(newLead),
        });
        const newLeadText = await newLeadRes.text();
        console.log(`Auto-created lead for ${from}: ${newLeadRes.status} ${newLeadText}`);
        try {
          const parsed = JSON.parse(newLeadText);
          if (Array.isArray(parsed) && parsed.length > 0) lead = parsed[0];
          else if (parsed && parsed.id) lead = parsed;
        } catch (_) {
          console.error("Failed to parse new lead response");
        }
      }

      // Create call_log entry
      const callLog: Record<string, unknown> = {
        twilio_call_sid: callSid,
        direction: "inbound",
        from_number: from,
        to_number: to,
        status: "ringing",
        started_at: new Date().toISOString(),
        queue: queue,
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
            queue: queue,
          }),
        });
        const acdText = await acdRes.text();
        console.log(`acd_queue insert response (${acdRes.status}): ${acdText}`);
      } else {
        console.error("No callLogId — skipping acd_queue insert");
      }
    }

    // Find available agent — prioritize the lead's assigned vendedor
    // 5-minute freshness window for heartbeats (agent must have sent heartbeat within 5 min)
    const freshnessWindow = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // If lead has an assigned vendedor, try them first
    let preferredAgentId: string | null = null;
    if (!isRetry) {
      // On first call, read the lead we found/created above
      if (lead && lead.vendedor_id) {
        preferredAgentId = lead.vendedor_id;
        console.log(`Lead has assigned vendedor: ${preferredAgentId}`);
      }
    } else {
      // On retry, look up the lead from the call_log
      if (callLogId) {
        try {
          const clRes = await fetch(`${SB_URL}/rest/v1/call_log?id=eq.${callLogId}&select=lead_id`, { headers: HDR });
          const clData = await clRes.json();
          const leadId = Array.isArray(clData) && clData.length > 0 ? clData[0].lead_id : null;
          if (leadId) {
            const lRes = await fetch(`${SB_URL}/rest/v1/leads?id=eq.${leadId}&select=vendedor_id&limit=1`, { headers: HDR });
            const lData = await lRes.json();
            if (Array.isArray(lData) && lData.length > 0 && lData[0].vendedor_id) {
              preferredAgentId = lData[0].vendedor_id;
            }
          }
        } catch (_) {}
      }
    }

    const qaRes = await fetch(`${SB_URL}/rest/v1/queue_agents?activo=eq.true&queue=eq.${queue}&order=prioridad.asc`, { headers: HDR });
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
        // Build priority map from queue_agents
        const prioMap: Record<string, number> = {};
        (qaData as any[]).forEach((q: any) => { prioMap[q.usuario_id] = q.prioridad; });

        // Sort by priority first, then round-robin: within same priority,
        // the agent who has been "available" the longest gets the call first
        // (updated_at ASC = became available earliest = waited longest)
        agents = allAvailable.sort((a: any, b: any) => {
          const pa = prioMap[a.usuario_id] ?? 99;
          const pb = prioMap[b.usuario_id] ?? 99;
          if (pa !== pb) return pa - pb;
          // Same priority: longest time available first (oldest updated_at)
          const ta = new Date(a.updated_at || 0).getTime();
          const tb = new Date(b.updated_at || 0).getTime();
          return ta - tb;
        });

        // Move preferred agent to front if available
        if (preferredAgentId) {
          const prefIdx = agents.findIndex((a: any) => a.usuario_id === preferredAgentId);
          if (prefIdx > 0) {
            const pref = agents.splice(prefIdx, 1)[0];
            agents.unshift(pref);
            console.log(`Prioritized assigned vendedor ${preferredAgentId}`);
          } else if (prefIdx === -1) {
            // Preferred agent not in queue — check if they're available anyway
            try {
              const prefRes = await fetch(
                `${SB_URL}/rest/v1/agent_status?usuario_id=eq.${preferredAgentId}&status=eq.available&last_heartbeat=gte.${freshnessWindow}`,
                { headers: HDR }
              );
              const prefData = await prefRes.json();
              if (Array.isArray(prefData) && prefData.length > 0) {
                agents.unshift(prefData[0]);
                console.log(`Assigned vendedor ${preferredAgentId} available (not in queue), added to front`);
              }
            } catch (_) {}
          }
        }
      }
    } else if (preferredAgentId) {
      // No queue agents at all, but try the preferred agent
      try {
        const prefRes = await fetch(
          `${SB_URL}/rest/v1/agent_status?usuario_id=eq.${preferredAgentId}&status=eq.available&last_heartbeat=gte.${freshnessWindow}`,
          { headers: HDR }
        );
        const prefData = await prefRes.json();
        if (Array.isArray(prefData) && prefData.length > 0) {
          agents = prefData;
          console.log(`No queue agents but assigned vendedor ${preferredAgentId} is available`);
        }
      } catch (_) {}
    }

    // Build the redirect URL for retries (& must be &amp; in XML/TwiML)
    const nextN = loopCount + 1;
    const retryUrl = `${SELF_URL}?retry=1&amp;callLogId=${callLogId}&amp;n=${nextN}&amp;queue=${queue}`;

    if (agents.length === 0) {
      // No agents available — short loop (~6s per cycle) to check for agents frequently
      console.log(`No agents available, loop #${loopCount}, holding caller in queue`);

      let twiml: string;

      if (!isRetry) {
        // First time: welcome message then ring, then redirect to check again
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX">${qCfg.welcome}</Say>
  <Play loop="1">${RING_TONE}</Play>
  <Redirect method="POST">${retryUrl}</Redirect>
</Response>`;
      } else if (loopCount % 4 === 0) {
        // Every 4th retry (~24s): repeat hold message then ring
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX">${qCfg.hold}</Say>
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

    // Agent available — connect immediately, record the call (dual channel)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="10" action="${statusCallback}" method="POST" record="record-from-answer-dual" recordingStatusCallback="${EVENTS_URL}" recordingStatusCallbackMethod="POST">
    <Client statusCallbackEvent="initiated ringing answered completed" statusCallback="${EVENTS_URL}" statusCallbackMethod="POST">${agentIdentity}</Client>
  </Dial>
</Response>`;

    console.log(`Routing to agent: ${agentIdentity}`);
    return new Response(twiml, { headers: { "Content-Type": "text/xml" } });

  } catch (e) {
    const errMsg = e instanceof Error ? e.message + " | " + e.stack : String(e);
    console.error("Voice webhook error:", errMsg);
    // Return error detail in a Say so we can debug from Twilio logs
    const safeMsg = errMsg.replace(/[<>&"']/g, "").substring(0, 200);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX">Error: ${safeMsg}</Say>
  <Hangup/>
</Response>`;
    return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
  }
});
