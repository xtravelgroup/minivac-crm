import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_API_KEY_SID = Deno.env.get("TWILIO_API_KEY_SID") || "";
const TWILIO_API_KEY_SECRET = Deno.env.get("TWILIO_API_KEY_SECRET") || "";
const TWILIO_TWIML_APP_SID = Deno.env.get("TWILIO_TWIML_APP_SID") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type,apikey",
};

// ── Base64url helpers ──
function b64url(data: Uint8Array): string {
  let s = "";
  for (const b of data) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlStr(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return new Uint8Array(sig);
}

async function createTwilioToken(identity: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" };
  const payload = {
    jti: TWILIO_API_KEY_SID + "-" + now,
    iss: TWILIO_API_KEY_SID,
    sub: TWILIO_ACCOUNT_SID,
    nbf: now,
    exp: now + 3600,
    grants: {
      identity: identity,
      voice: {
        incoming: { allow: true },
        outgoing: { application_sid: TWILIO_TWIML_APP_SID },
      },
    },
  };

  const segments = b64urlStr(JSON.stringify(header)) + "." + b64urlStr(JSON.stringify(payload));
  const sig = await hmacSha256(TWILIO_API_KEY_SECRET, segments);
  return segments + "." + b64url(sig);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json();
    const userId = body.usuario_id;
    if (!userId) return new Response(JSON.stringify({ error: "missing usuario_id" }), { status: 400, headers: CORS });

    const identity = "agent_" + userId;
    const token = await createTwilioToken(identity);

    // Upsert agent_status to available
    const HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" };
    await fetch(`${SB_URL}/rest/v1/agent_status`, {
      method: "POST",
      headers: HDR,
      body: JSON.stringify({ usuario_id: userId, status: "available", last_heartbeat: new Date().toISOString() }),
    });

    return new Response(JSON.stringify({ token, identity }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("twilio-token error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
