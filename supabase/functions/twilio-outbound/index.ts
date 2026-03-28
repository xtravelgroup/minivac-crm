import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ================================================================
// TWILIO OUTBOUND — Handles TwiML for outbound & internal calls
//
// This is the Voice URL for the TwiML Application.
// When an agent dials from the browser (device.connect), Twilio
// sends a POST here with the "To" parameter.
//
// Routes:
//   - To starts with "agent_" → internal call to another agent
//   - To starts with "+" or digits → external phone call
//   - ?transfer=1 → warm/cold transfer of active call
// ================================================================

const SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

const EVENTS_URL = `${SB_URL}/functions/v1/twilio-call-events`;
const CALLER_ID = Deno.env.get("TWILIO_CALLER_ID") || "+17867835400";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,apikey" },
    });
  }

  try {
    const url = new URL(req.url);

    // ── JSON body from our frontend (initiate call via REST API)
    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json();
      const action = body.action;

      // ── TRANSFER: Update active call's TwiML via Twilio REST API
      if (action === "transfer") {
        const callSid = body.callSid;       // Parent call SID
        const targetAgent = body.targetAgent; // "agent_xxx" identity
        const targetName = body.targetName || targetAgent;
        const callLogId = body.callLogId || "";

        if (!callSid || !targetAgent) {
          return jsonRes({ error: "missing callSid or targetAgent" }, 400);
        }

        // Build TwiML to redirect the call to the target agent
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX">Transfiriendo la llamada.</Say>
  <Dial timeout="20" callerId="${CALLER_ID}">
    <Client statusCallbackEvent="initiated ringing answered completed" statusCallback="${EVENTS_URL}" statusCallbackMethod="POST">${targetAgent}</Client>
  </Dial>
</Response>`;

        // Use Twilio REST API to update the call with new TwiML
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`;
        const params = new URLSearchParams({ Twiml: twiml });

        const twilioRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(TWILIO_ACCOUNT_SID + ":" + TWILIO_AUTH_TOKEN),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        const twilioData = await twilioRes.text();
        console.log(`Transfer call ${callSid} to ${targetAgent}: ${twilioRes.status}`);

        if (twilioRes.ok) {
          // Update call_log with transfer info
          if (callLogId) {
            await fetch(`${SB_URL}/rest/v1/call_log?id=eq.${callLogId}`, {
              method: "PATCH", headers: HDR,
              body: JSON.stringify({
                notes: JSON.stringify([{ action: "transfer", to: targetAgent, to_name: targetName, at: new Date().toISOString() }]),
              }),
            });
          }
          return jsonRes({ success: true, message: "Call transferred" });
        } else {
          console.error("Twilio transfer error:", twilioData);
          return jsonRes({ error: "Transfer failed", details: twilioData }, 500);
        }
      }

      return jsonRes({ error: "unknown action" }, 400);
    }

    // ── TwiML voice URL handler (Twilio POST with form data)
    const formData = await req.formData();
    const to = formData.get("To") as string || "";
    const from = formData.get("From") as string || "";
    const callSid = formData.get("CallSid") as string || "";
    const callerIdentity = from.replace("client:", "");

    console.log(`Outbound call: from=${from}, to=${to}, SID=${callSid}`);

    // ── Internal call: agent_xxx → agent_yyy
    if (to.startsWith("agent_")) {
      // Look up caller's name
      const callerUserId = callerIdentity.replace("agent_", "");
      let callerName = callerIdentity;
      try {
        const uRes = await fetch(`${SB_URL}/rest/v1/usuarios?id=eq.${callerUserId}&select=nombre&limit=1`, { headers: HDR });
        const uData = await uRes.json();
        if (Array.isArray(uData) && uData.length > 0) callerName = uData[0].nombre;
      } catch (_) {}

      // Create call_log for internal call
      const targetUserId = to.replace("agent_", "");
      const callLog = {
        twilio_call_sid: callSid,
        direction: "internal",
        from_number: callerName,
        to_number: to,
        status: "ringing",
        started_at: new Date().toISOString(),
        agent_id: callerUserId,
        notes: JSON.stringify([{ type: "internal", from: callerIdentity, to: to }]),
      };
      await fetch(`${SB_URL}/rest/v1/call_log`, {
        method: "POST", headers: HDR,
        body: JSON.stringify(callLog),
      });

      // Set target agent to ringing
      await fetch(`${SB_URL}/rest/v1/agent_status?usuario_id=eq.${targetUserId}`, {
        method: "PATCH", headers: HDR,
        body: JSON.stringify({ status: "on_call", updated_at: new Date().toISOString() }),
      });

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" callerId="${callerIdentity}">
    <Client statusCallbackEvent="initiated ringing answered completed" statusCallback="${EVENTS_URL}" statusCallbackMethod="POST">${to}</Client>
  </Dial>
  <Say language="es-MX">El agente no contesto.</Say>
</Response>`;

      return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // ── External call: agent → phone number
    if (to) {
      // Normalize phone number
      let dialTo = to.replace(/[^\d+]/g, "");
      if (!dialTo.startsWith("+")) dialTo = "+1" + dialTo;

      // Create call_log for outbound call
      const callerUserId = callerIdentity.replace("agent_", "");
      const callLog = {
        twilio_call_sid: callSid,
        direction: "outbound",
        from_number: CALLER_ID,
        to_number: dialTo,
        status: "ringing",
        started_at: new Date().toISOString(),
        agent_id: callerUserId,
      };
      await fetch(`${SB_URL}/rest/v1/call_log`, {
        method: "POST", headers: HDR,
        body: JSON.stringify(callLog),
      });

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${CALLER_ID}" timeout="30">
    <Number statusCallbackEvent="initiated ringing answered completed" statusCallback="${EVENTS_URL}" statusCallbackMethod="POST">${dialTo}</Number>
  </Dial>
</Response>`;

      return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // No destination
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Say language="es-MX">No se especificó un destino.</Say><Hangup/></Response>`, {
      headers: { "Content-Type": "text/xml" },
    });

  } catch (e) {
    console.error("Outbound error:", e);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Say language="es-MX">Error al procesar la llamada.</Say><Hangup/></Response>`, {
      headers: { "Content-Type": "text/xml" },
    });
  }
});

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
}
