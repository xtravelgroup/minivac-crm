// supabase/functions/resend-email/index.ts
// Deploy: supabase functions deploy resend-email
//
// Secrets necesarios:
//   RESEND_API_KEY = re_NFbt912m_CbqbDnhSEVngvxpZuuZF1YYS
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL     = "members@xtravelgroup.com";
const FROM_NAME      = "X Travel Group";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const SB = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url  = new URL(req.url);
  const path = url.pathname.replace(/^\/resend-email/, "");

  // ================================================
  // POST /send — enviar email
  // ================================================
  if (req.method === "POST" && path === "/send") {
    try {
      const body = await req.json();
      const { to_email, to_name, subject, body_html, body_text, lead_id, usuario_id, reply_to_id } = body;

      if (!to_email || !subject) {
        return new Response(JSON.stringify({ error: "to_email y subject son requeridos" }), {
          status: 400, headers: { ...CORS, "Content-Type": "application/json" }
        });
      }

      // Enviar via Resend
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:    `${FROM_NAME} <${FROM_EMAIL}>`,
          to:      [to_name ? `${to_name} <${to_email}>` : to_email],
          subject: subject,
          html:    body_html || `<p>${body_text || ""}</p>`,
          text:    body_text || "",
          reply_to: FROM_EMAIL,
        }),
      });

      const resendData = await resendRes.json();

      if (!resendRes.ok) {
        console.error("Resend error:", resendData);
        // Guardar como fallido
        await SB.from("emails").insert({
          direction:  "outbound",
          status:     "failed",
          from_email: FROM_EMAIL,
          from_name:  FROM_NAME,
          to_email,
          to_name,
          subject,
          body_text,
          body_html,
          lead_id:    lead_id || null,
          usuario_id: usuario_id || null,
          reply_to_id: reply_to_id || null,
          metadata:   { error: resendData },
        });
        return new Response(JSON.stringify({ error: resendData.message || "Error enviando email" }), {
          status: 500, headers: { ...CORS, "Content-Type": "application/json" }
        });
      }

      // Guardar email enviado en Supabase
      const { data: emailRow } = await SB.from("emails").insert({
        direction:   "outbound",
        status:      "sent",
        from_email:  FROM_EMAIL,
        from_name:   FROM_NAME,
        to_email,
        to_name,
        subject,
        body_text,
        body_html,
        resend_id:   resendData.id,
        lead_id:     lead_id || null,
        usuario_id:  usuario_id || null,
        reply_to_id: reply_to_id || null,
      }).select().single();

      return new Response(JSON.stringify({ success: true, email_id: emailRow?.id, resend_id: resendData.id }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" }
      });

    } catch (err) {
      console.error("send error:", err);
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
  }

  // ================================================
  // POST /inbound — webhook de Resend para emails recibidos
  // ================================================
  if (req.method === "POST" && path === "/inbound") {
    try {
      const payload = await req.json();
      console.log("Inbound email:", JSON.stringify(payload).slice(0, 300));

      const from    = payload.from || "";
      const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/) || [];
      const fromName  = fromMatch[1]?.trim() || "";
      const fromEmail = fromMatch[2]?.trim() || from;

      const toArr   = payload.to || [];
      const toFirst = Array.isArray(toArr) ? toArr[0] : toArr;
      const toMatch = (typeof toFirst === "string" ? toFirst : "").match(/^(.+?)\s*<(.+?)>$/) || [];
      const toEmail = toMatch[2]?.trim() || toFirst || "";

      // Buscar si el email corresponde a un lead
      let lead_id = null;
      if (fromEmail) {
        const { data: leads } = await SB.from("leads").select("id").eq("email", fromEmail).limit(1);
        if (leads && leads[0]) lead_id = leads[0].id;
      }

      await SB.from("emails").insert({
        direction:  "inbound",
        status:     "received",
        from_email: fromEmail,
        from_name:  fromName,
        to_email:   toEmail,
        subject:    payload.subject || "(sin asunto)",
        body_text:  payload.text || "",
        body_html:  payload.html || "",
        lead_id:    lead_id,
        metadata:   { raw: payload },
      });

      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" }
      });

    } catch (err) {
      console.error("inbound error:", err);
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
  }

  // ================================================
  // GET /inbox — obtener emails del inbox
  // ================================================
  if (req.method === "GET" && path === "/inbox") {
    try {
      const params   = url.searchParams;
      const lead_id  = params.get("lead_id");
      const direction = params.get("direction"); // inbound | outbound | all
      const limit    = parseInt(params.get("limit") || "50");

      let query = SB.from("emails").select("*").order("created_at", { ascending: false }).limit(limit);
      if (lead_id)   query = query.eq("lead_id", lead_id);
      if (direction && direction !== "all") query = query.eq("direction", direction);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify(data), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
  }

  // ================================================
  // POST /ai-paquete — genera texto AI para email de paquete
  // ================================================
  if (req.method === "POST" && path === "/ai-paquete") {
    try {
      const { prompt } = await req.json();
      if (!prompt) return new Response(JSON.stringify({ error: "prompt requerido" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" }
      });

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") || "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await anthropicRes.json();
      if (!anthropicRes.ok) throw new Error(data.error?.message || "Error AI");

      const text = (data.content || []).find((b: any) => b.type === "text")?.text || "{}";
      // Strip backticks if present
      const clean = text.replace(/```json\n?|```/g, "").trim();
      const parsed = JSON.parse(clean);

      return new Response(JSON.stringify(parsed), {
        status: 200, headers: { ...CORS, "Content-Type": "application/json" }
      });
    } catch (err) {
      console.error("ai-paquete error:", err);
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" }
      });
    }
  }

  return new Response("Not found", { status: 404, headers: CORS });
});
