import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ZOHO_ACCOUNT_ID     = Deno.env.get("ZOHO_ACCOUNT_ID")     || "874101637";
const ZOHO_WEBHOOK_SECRET = Deno.env.get("ZOHO_WEBHOOK_SECRET") || "72340fff708033bb5434d0c8f0f02562a93ffa84703e4d8c0e6ce076436e9ed64057afa8a6c1599ae884fb91c86d96d2d0761ef7d8c4bbd04604865297bb0b9d25f01910841467564bcbfc1e6303f375";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  if (!signature) return false;
  try {
    const key = new TextEncoder().encode(ZOHO_WEBHOOK_SECRET);
    const message = new TextEncoder().encode(payload);
    const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, message);
    const computed = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    return computed === signature.toLowerCase();
  } catch {
    return false;
  }
}

async function getZohoToken(): Promise<string> {
  const res = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: Deno.env.get("ZOHO_REFRESH_TOKEN") || "",
      client_id:     Deno.env.get("ZOHO_CLIENT_ID")     || "",
      client_secret: Deno.env.get("ZOHO_CLIENT_SECRET") || "",
      grant_type:    "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("No access_token: " + JSON.stringify(data));
  return data.access_token;
}

async function createPaymentSession(token: string, body: { amount: number; currency: string; reference_number: string; description: string; invoice_number?: string; }) {
  const res = await fetch(`https://payments.zoho.com/api/v1/paymentsessions?account_id=${ZOHO_ACCOUNT_ID}`, {
    method: "POST",
    headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount:           body.amount,
      currency:         body.currency || "USD",
      description:      body.description,
      reference_number: body.reference_number,
      invoice_number:   body.invoice_number || body.reference_number,
    }),
  });
  const data = await res.json();
  if (!data.payments_session) throw new Error("Error creando session: " + JSON.stringify(data));
  return data.payments_session;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const url  = new URL(req.url);
  const path = url.pathname.replace(/^\/zoho-payments/, "");

  if (req.method === "POST" && path === "/create-session") {
    try {
      const body = await req.json();
      const { lead_id, amount, currency, folio, nombre } = body;
      if (!lead_id || !amount) return new Response(JSON.stringify({ error: "lead_id y amount requeridos" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      const token   = await getZohoToken();
      const session = await createPaymentSession(token, {
        amount:           Number(amount),
        currency:         currency || "USD",
        reference_number: folio || lead_id,
        description:      "Mini-Vac enganche - " + (nombre || lead_id),
        invoice_number:   folio || lead_id,
      });
      return new Response(JSON.stringify({ payments_session_id: session.payments_session_id, amount: session.amount, currency: session.currency }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    } catch (err) {
      console.error("create-session error:", err);
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

  if (req.method === "POST" && path === "/webhook") {
    try {
      const payload   = await req.text();
      const signature = req.headers.get("x-zoho-signature") || "";
      const valid = await verifyWebhookSignature(payload, signature);
      if (!valid) {
        console.error("Firma invalida:", signature.slice(0, 20));
        return new Response("Firma invalida", { status: 401 });
      }
      const event = JSON.parse(payload);
      const type  = event.event_type || "";
      console.log("Webhook:", type);

      const SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      if (type === "payment.success" || type === "payment.succeeded") {
        const payment    = event.data?.payment || event.payment || {};
        const ref        = payment.reference_number || "";
        const payment_id = payment.payment_id || "";
        const amount     = payment.amount || "0";
        const last4      = payment.payment_method?.card?.last_four_digits || "";
        const brand      = payment.payment_method?.card?.brand || "";
        if (ref) {
          const { data: leads } = await SB.from("leads").select("id, verificacion").or(`folio.eq.${ref},id.eq.${ref}`).limit(1);
          const lead = leads?.[0];
          if (lead) {
            await SB.from("leads").update({
              status: "venta",
              verificacion: { ...(lead.verificacion || {}), result: "venta", paymentStatus: "paid", zohoPaymentId: payment_id, amount, last4, brand, paidAt: new Date().toISOString() },
              tarjeta_numero: null, tarjeta_nombre: null, tarjeta_vence: null, tarjeta_cvv: null, tarjeta_captura_ts: null,
            }).eq("id", lead.id);
            console.log("Lead -> venta:", lead.id);
          }
        }
      }

      if (type === "payment.failed") {
        const payment = event.data?.payment || event.payment || {};
        const ref     = payment.reference_number || "";
        if (ref) {
          const { data: leads } = await SB.from("leads").select("id, verificacion").or(`folio.eq.${ref},id.eq.${ref}`).limit(1);
          const lead = leads?.[0];
          if (lead) {
            const attempts = (lead.verificacion?.chargeAttempts || []);
            attempts.push({ ts: new Date().toISOString(), amount: payment.amount, status: "failed", error: payment.error_message || "Rechazada" });
            await SB.from("leads").update({ verificacion: { ...(lead.verificacion || {}), result: "tarjeta_rechazada", paymentStatus: "failed", chargeAttempts: attempts } }).eq("id", lead.id);
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      console.error("webhook error:", err);
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  return new Response("Not found", { status: 404 });
});
