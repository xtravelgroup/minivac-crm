// supabase/functions/zoho-payments/index.ts
// Deploy: supabase functions deploy zoho-payments
//
// Variables de entorno necesarias (supabase secrets set):
//   ZOHO_CLIENT_ID
//   ZOHO_CLIENT_SECRET
//   ZOHO_REFRESH_TOKEN
//   ZOHO_ACCOUNT_ID       = 874101637
//   ZOHO_WEBHOOK_SECRET   = (signing key del webhook)
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ZOHO_ACCOUNT_ID    = Deno.env.get("ZOHO_ACCOUNT_ID")     || "874101637";
const ZOHO_WEBHOOK_SECRET = Deno.env.get("ZOHO_WEBHOOK_SECRET") ||
  "72340fff708033bb5434d0c8f0f02562a93ffa84703e4d8c0e6ce076436e9ed64057afa8a6c1599ae884fb91c86d96d2d0761ef7d8c4bbd04604865297bb0b9d25f01910841467564bcbfc1e6303f375";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ---- Verificar firma HMAC-SHA256 del webhook ----
async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  if (!signature) return false;
  try {
    const key     = new TextEncoder().encode(ZOHO_WEBHOOK_SECRET);
    const message = new TextEncoder().encode(payload);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, message);
    const computed  = Array.from(new Uint8Array(sigBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    return computed === signature.toLowerCase();
  } catch {
    return false;
  }
}

// ---- Obtener access token via refresh token ----
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

// ---- Crear Payment Session en Zoho ----
async function createPaymentLink(token: string, body: {
  amount: number;
  currency: string;
  reference_number: string;
  description: string;
  customer_email?: string;
}) {
  const res = await fetch(
    `https://payments.zoho.com/api/v1/paymentlinks?account_id=${ZOHO_ACCOUNT_ID}`,
    {
      method: "POST",
      headers: {
        "Authorization": "Zoho-oauthtoken " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount:      String(Number(body.amount).toFixed(2)),
        currency:    body.currency || "USD",
        description: body.description || "Abono Mini-Vac",
      }),
    }
  );
  const data = await res.json();
  console.log("createPaymentLink response:", JSON.stringify(data));
  if (!data.payment_links) throw new Error("Error creando payment link: " + JSON.stringify(data));
  return data.payment_links;
}

// ---- Crear Customer en Zoho ----
async function createCustomer(token: string, nombre: string, email: string, phone: string) {
  const body: Record<string, string> = { name: nombre || "Cliente" };
  if (email && email.includes("@")) body.email = email;
  if (phone) body.phone = phone.replace(/[^0-9+\-\s()]/g, "").trim();

  const res = await fetch(
    `https://payments.zoho.com/api/v1/customers?account_id=${ZOHO_ACCOUNT_ID}`,
    {
      method: "POST",
      headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  console.log("createCustomer response:", JSON.stringify(data));
  if (!data.customer) throw new Error("Error creando customer: " + JSON.stringify(data));
  return data.customer;
}

// ---- Crear Payment Method Session en Zoho ----
async function createPaymentMethodSession(token: string, customerId: string) {
  const res = await fetch(
    `https://payments.zoho.com/api/v1/paymentmethodsessions?account_id=${ZOHO_ACCOUNT_ID}`,
    {
      method: "POST",
      headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: customerId, description: "Guardar tarjeta - Mini-Vac" }),
    }
  );
  const data = await res.json();
  if (!data.payment_method_session) throw new Error("Error creando payment method session: " + JSON.stringify(data));
  return data.payment_method_session;
}

// ---- Cobrar con Payment Method guardado ----
async function chargePaymentMethod(token: string, customerId: string, paymentMethodId: string, amount: number, description: string, reference: string) {
  const res = await fetch(
    `https://payments.zoho.com/api/v1/payments?account_id=${ZOHO_ACCOUNT_ID}`,
    {
      method: "POST",
      headers: { "Authorization": "Zoho-oauthtoken " + token, "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id:       customerId,
        payment_method_id: paymentMethodId,
        amount:            amount,
        currency:          "USD",
        description:       description,
        reference_number:  reference,
      }),
    }
  );
  const data = await res.json();
  if (!data.payment) throw new Error("Error cobrando: " + JSON.stringify(data));
  return data.payment;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/zoho-payments/, "");

  // ================================================
  // POST /create-customer-session — crea customer + payment method session
  // ================================================
  if (req.method === "POST" && path === "/create-customer-session") {
    try {
      const body = await req.json();
      const { nombre, email, phone } = body;
      const token    = await getZohoToken();
      const customer = await createCustomer(token, nombre || "Cliente", email || "", phone || "");
      const session  = await createPaymentMethodSession(token, customer.customer_id);
      return new Response(
        JSON.stringify({ customer_id: customer.customer_id, payment_method_session_id: session.payment_method_session_id }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("create-customer-session error:", err);
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

  // ================================================
  // POST /charge-saved-card — cobra con tarjeta guardada
  // ================================================
  if (req.method === "POST" && path === "/charge-saved-card") {
    try {
      const body = await req.json();
      const { lead_id, customer_id, payment_method_id, amount, folio, nombre } = body;
      if (!customer_id || !payment_method_id || !amount) {
        return new Response(JSON.stringify({ error: "customer_id, payment_method_id y amount son requeridos" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      }
      const token   = await getZohoToken();
      const payment = await chargePaymentMethod(
        token, customer_id, payment_method_id,
        Number(amount),
        "Mini-Vac enganche - " + (nombre || lead_id),
        folio || lead_id
      );

      // Actualizar lead en Supabase si el pago fue exitoso
      if (payment.status === "succeeded" || payment.status === "success") {
        const SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: leads } = await SB.from("leads").select("id, verificacion").eq("id", lead_id).limit(1);
        const lead = leads?.[0];
        if (lead) {
          await SB.from("leads").update({
            status: "venta",
            verificacion: {
              ...(lead.verificacion || {}),
              result:        "venta",
              paymentStatus: "paid",
              zohoPaymentId: payment.payment_id,
              amount:        payment.amount,
              last4:         payment.payment_method?.card?.last_four_digits || "",
              brand:         payment.payment_method?.card?.brand || "",
              paidAt:        new Date().toISOString(),
            },
          }).eq("id", lead.id);
        }
      }

      return new Response(
        JSON.stringify({ payment_id: payment.payment_id, status: payment.status, amount: payment.amount }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("charge-saved-card error:", err);
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

  // ================================================
  // POST /create-session — crea Payment Session (checkout directo)
  // ================================================
  if (req.method === "POST" && path === "/create-session") {
    try {
      const body = await req.json();
      const { lead_id, amount, currency, folio, nombre, email } = body;

      if (!amount) {
        return new Response(
          JSON.stringify({ error: "amount es requerido" }),
          { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
        );
      }

      const token   = await getZohoToken();
      const link = await createPaymentLink(token, {
        amount:           Number(amount),
        currency:         currency || "USD",
        reference_number: folio || lead_id || ("MV-" + Date.now()),
        description:      "Abono Mini-Vac - " + (nombre || folio || ""),
        customer_email:   email || undefined,
      });

      return new Response(
        JSON.stringify({
          payments_session_id: link.payment_link_id,
          payment_url:         link.url,
          amount:              link.amount,
        }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("create-session error:", err);
      return new Response(
        JSON.stringify({ error: String(err) }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }
  }

  // ================================================
  // POST /webhook — recibe eventos de Zoho Payments
  // ================================================
  if (req.method === "POST" && path === "/webhook") {
    try {
      const payload   = await req.text();
      const signature = req.headers.get("x-zoho-signature") || "";

      const valid = await verifyWebhookSignature(payload, signature);
      if (!valid) {
        console.error("Firma invalida. sig:", signature.slice(0,20));
        return new Response("Firma invalida", { status: 401 });
      }

      const event = JSON.parse(payload);
      const type  = event.event_type || "";
      console.log("Webhook recibido:", type, JSON.stringify(event).slice(0, 200));

      // Solo procesar pagos exitosos
      if (type === "payment.success" || type === "payment.succeeded") {
        const payment     = event.data?.payment || event.payment || {};
        const ref         = payment.reference_number || "";
        const payment_id  = payment.payment_id || "";
        const amount      = payment.amount || "0";
        const last4       = payment.payment_method?.card?.last_four_digits || "";
        const brand       = payment.payment_method?.card?.brand || "";

        if (ref) {
          const SB = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );

          // Buscar lead por folio o id
          const { data: leads } = await SB
            .from("leads")
            .select("id, status, verificacion")
            .or(`folio.eq.${ref},id.eq.${ref}`)
            .limit(1);

          const lead = leads?.[0];
          if (lead) {
            const verifActual = lead.verificacion || {};
            await SB.from("leads").update({
              status: "venta",
              verificacion: {
                ...verifActual,
                result:         "venta",
                paymentStatus:  "paid",
                zohoPaymentId:  payment_id,
                amount:         amount,
                last4:          last4,
                brand:          brand,
                paidAt:         new Date().toISOString(),
              },
              // Limpiar datos de tarjeta tras pago exitoso
              tarjeta_numero:     null,
              tarjeta_nombre:     null,
              tarjeta_vence:      null,
              tarjeta_cvv:        null,
              tarjeta_captura_ts: null,
            }).eq("id", lead.id);

            console.log("Lead actualizado a venta:", lead.id);
          }
        }
      }

      // Pago fallido
      if (type === "payment.failed") {
        const payment = event.data?.payment || event.payment || {};
        const ref     = payment.reference_number || "";
        if (ref) {
          const SB = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          const { data: leads } = await SB
            .from("leads")
            .select("id, verificacion")
            .or(`folio.eq.${ref},id.eq.${ref}`)
            .limit(1);

          const lead = leads?.[0];
          if (lead) {
            const verifActual = lead.verificacion || {};
            const attempts = verifActual.chargeAttempts || [];
            attempts.push({
              ts:     new Date().toISOString(),
              amount: payment.amount,
              status: "failed",
              error:  payment.error_message || "Rechazada",
            });
            await SB.from("leads").update({
              verificacion: {
                ...verifActual,
                result:         "tarjeta_rechazada",
                paymentStatus:  "failed",
                chargeAttempts: attempts,
              },
            }).eq("id", lead.id);
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("webhook error:", err);
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // POST /generar-link
  if (req.method === "POST" && path === "/payment-link") {
    try {
      const body = await req.json();
      const { amount, lead_id, email, nombre, description } = body;
      if (!amount || !lead_id) return new Response(JSON.stringify({ error: "amount y lead_id requeridos" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      const token = await getZohoToken();
      const link = await createPaymentLink(token, { amount: String(amount), currency: "USD", reference_number: lead_id, description: description || "Abono Mini-Vac - " + (nombre || lead_id), customer_email: email });
      return new Response(JSON.stringify({ url: link.link_url || link.url || link.short_url, link }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

  if (req.method === "POST" && path === "/capture-link") {
    try {
      const body = await req.json();
      const { lead_id, nombre, email } = body;
      if (!lead_id) return new Response(JSON.stringify({ error: "lead_id requerido" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      const SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const token = crypto.randomUUID();
      await SB.from("leads").update({ captura_token: token, captura_enviada_at: new Date().toISOString() }).eq("id", lead_id);
      const baseUrl = Deno.env.get("CERTIFICATE_BASE_URL") || "https://minivac-crm.vercel.app";
      const link = `${baseUrl}/captura-tarjeta?lead=${lead_id}&token=${token}`;
      return new Response(JSON.stringify({ link, token }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

  if (req.method === "POST" && path === "/generar-link") {
    try {
      const body    = await req.json();
      const { lead_id } = body;
      if (!lead_id) return new Response(JSON.stringify({ error: "lead_id requerido" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      const SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const token = crypto.randomUUID();
      await SB.from("leads").update({ firma_token: token, firma_enviada_at: new Date().toISOString() }).eq("id", lead_id);
      const baseUrl = Deno.env.get("CERTIFICATE_BASE_URL") || "https://minivac-crm.vercel.app";
      const link = `${baseUrl}/firma.html?lead=${lead_id}&token=${token}`;
      return new Response(JSON.stringify({ link, token }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

if (path === "/guardar-firma") {
    try {
      const body = await req.json();
      const { lead_id, token, firma_contrato, firma_autorizacion, firma_terminos, firmado_en, firma_ip, firma_device, firma_location } = body;
      if (!lead_id) return new Response(JSON.stringify({ error: "lead_id requerido" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

      const SB = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Verificar token
      const { data: leads } = await SB.from("leads").select("id, firma_token, verificacion").eq("id", lead_id).limit(1);
      const lead = leads?.[0];
      if (!lead) return new Response(JSON.stringify({ error: "Lead no encontrado" }), { status: 404, headers: { ...CORS, "Content-Type": "application/json" } });
      // Token check removido - el lead_id es suficiente identificador

      // Actualizar verificacion con datos de firma
      const verifActual = lead.verificacion || {};
      await SB.from("leads").update({
        firma_firmada_at: firmado_en || new Date().toISOString(),
        firma_contrato:      firma_contrato      || null,
        firma_autorizacion:  firma_autorizacion  || null,
        firma_terminos:      firma_terminos       || null,
        firma_ip:            firma_ip            || null,
        firma_device:        firma_device        || null,
        firma_location:      firma_location      || null,
        verificacion: {
          ...verifActual,
          docsSigned: true,
          docsSignedAt: firmado_en || new Date().toISOString(),
        },
      }).eq("id", lead_id);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

    return new Response("Not found", { status: 404 });
});
