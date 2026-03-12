import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL     = "members@xtravelgroup.com";
const FROM_NAME      = "X Travel Group";
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const SB   = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url  = new URL(req.url);
  const path = url.pathname.replace(/^\/resend-email/, "");

  if (req.method === "POST" && path === "/send") {
    try {
      const body = await req.json();
      const { to_email, to_name, subject, body_html, body_text, lead_id, usuario_id, reply_to_id } = body;
      if (!to_email || !subject) return new Response(JSON.stringify({ error: "to_email y subject requeridos" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to_name ? `${to_name} <${to_email}>` : to_email], subject, html: body_html || `<p>${body_text||""}</p>`, text: body_text || "", reply_to: FROM_EMAIL }),
      });
      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        await SB.from("emails").insert({ direction:"outbound", status:"failed", from_email:FROM_EMAIL, from_name:FROM_NAME, to_email, to_name, subject, body_text, body_html, lead_id:lead_id||null, usuario_id:usuario_id||null, metadata:{ error: resendData } });
        return new Response(JSON.stringify({ error: resendData.message || "Error enviando" }), { status: 500, headers: { ...C

mkdir -p supabase/functions/resend-email
cat > supabase/functions/resend-email/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL     = "members@xtravelgroup.com";
const FROM_NAME      = "X Travel Group";
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const SB   = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url  = new URL(req.url);
  const path = url.pathname.replace(/^\/resend-email/, "");

  if (req.method === "POST" && path === "/send") {
    try {
      const body = await req.json();
      const { to_email, to_name, subject, body_html, body_text, lead_id, usuario_id, reply_to_id } = body;
      if (!to_email || !subject) return new Response(JSON.stringify({ error: "to_email y subject requeridos" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to_name ? `${to_name} <${to_email}>` : to_email], subject, html: body_html || `<p>${body_text||""}</p>`, text: body_text || "", reply_to: FROM_EMAIL }),
      });
      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        await SB.from("emails").insert({ direction:"outbound", status:"failed", from_email:FROM_EMAIL, from_name:FROM_NAME, to_email, to_name, subject, body_text, body_html, lead_id:lead_id||null, usuario_id:usuario_id||null, metadata:{ error: resendData } });
        return new Response(JSON.stringify({ error: resendData.message || "Error enviando" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
      const { data: emailRow } = await SB.from("emails").insert({ direction:"outbound", status:"sent", from_email:FROM_EMAIL, from_name:FROM_NAME, to_email, to_name, subject, body_text, body_html, resend_id:resendData.id, lead_id:lead_id||null, usuario_id:usuario_id||null, reply_to_id:reply_to_id||null }).select().single();
      return new Response(JSON.stringify({ success: true, email_id: emailRow?.id, resend_id: resendData.id }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

  if (req.method === "POST" && path === "/inbound") {
    try {
      const payload = await req.json();
      const from = payload.from || "";
      const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/) || [];
      const fromName  = fromMatch[1]?.trim() || "";
      const fromEmail = fromMatch[2]?.trim() || from;
      const toArr   = payload.to || [];
      const toFirst = Array.isArray(toArr) ? toArr[0] : toArr;
      const toMatch = (typeof toFirst === "string" ? toFirst : "").match(/^(.+?)\s*<(.+?)>$/) || [];
      const toEmail = toMatch[2]?.trim() || toFirst || "";
      let lead_id = null;
      if (fromEmail) {
        const { data: leads } = await SB.from("leads").select("id").eq("email", fromEmail).limit(1);
        if (leads && leads[0]) lead_id = leads[0].id;
      }
      await SB.from("emails").insert({ direction:"inbound", status:"received", from_email:fromEmail, from_name:fromName, to_email:toEmail, subject:payload.subject||"(sin asunto)", body_text:payload.text||"", body_html:payload.html||"", lead_id, metadata:{ raw: payload } });
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

  if (req.method === "GET" && path === "/inbox") {
    try {
      const params = url.searchParams;
      const lead_id = params.get("lead_id");
      const direction = params.get("direction");
      const limit = parseInt(params.get("limit") || "50");
      let query = SB.from("emails").select("*").order("created_at", { ascending: false }).limit(limit);
      if (lead_id) query = query.eq("lead_id", lead_id);
      if (direction && direction !== "all") query = query.eq("direction", direction);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

  return new Response("Not found", { status: 404, headers: CORS });
});
