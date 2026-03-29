import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ANTHROPIC_KEY  = Deno.env.get("ANTHROPIC_API_KEY") || "";
const UNSPLASH_KEY   = "omrp-MWVGbHhNROvFOmPsyJAujUKyPUpWpm8RL491Lo";
const FROM_EMAIL = "members@xtravelgroup.com";
const FROM_NAME  = "X Travel Group";
const CORS = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization"};
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const SB = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/resend-email/, "");
  if (req.method === "POST" && path === "/send") {
    try {
      const body = await req.json();
      const { to_email, to_name, subject, body_html, body_text, lead_id, usuario_id, reply_to_id } = body;
      if (!to_email || !subject) return new Response(JSON.stringify({ error: "requeridos" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      const r = await fetch("https://api.resend.com/emails", { method:"POST", headers:{"Authorization":`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json"}, body:JSON.stringify({from:`${FROM_NAME} <${FROM_EMAIL}>`,to:[to_name?`${to_name} <${to_email}>`:to_email],subject,html:body_html||`<p>${body_text||""}</p>`,text:body_text||""}) });
      const rd = await r.json();
      if (!r.ok) { await SB.from("emails").insert({direction:"outbound",status:"failed",from_email:FROM_EMAIL,from_name:FROM_NAME,to_email,to_name,subject,body_text,body_html,lead_id:lead_id||null,usuario_id:usuario_id||null,metadata:{error:rd}}); return new Response(JSON.stringify({error:rd.message||"Error"}),{status:500,headers:{...CORS,"Content-Type":"application/json"}}); }
      const { data: er } = await SB.from("emails").insert({direction:"outbound",status:"sent",from_email:FROM_EMAIL,from_name:FROM_NAME,to_email,to_name,subject,body_text,body_html,resend_id:rd.id,lead_id:lead_id||null,usuario_id:usuario_id||null,reply_to_id:reply_to_id||null}).select().single();
      return new Response(JSON.stringify({success:true,email_id:er?.id,resend_id:rd.id}),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
    } catch(err) { return new Response(JSON.stringify({error:String(err)}),{status:500,headers:{...CORS,"Content-Type":"application/json"}}); }
  }
  if (req.method === "POST" && path === "/inbound") {
    try {
      const p = await req.json();
      const fm = (p.from||"").match(/^(.+?)\s*<(.+?)>$/) || [];
      const fromName=fm[1]?.trim()||""; const fromEmail=fm[2]?.trim()||p.from||"";
      const ta=p.to||[]; const tf=Array.isArray(ta)?ta[0]:ta;
      const tm=(typeof tf==="string"?tf:"").match(/^(.+?)\s*<(.+?)>$/)||[];
      const toEmail=tm[2]?.trim()||tf||"";
      let lead_id=null;
      if(fromEmail){const{data:ls}=await SB.from("leads").select("id").eq("email",fromEmail).limit(1);if(ls&&ls[0])lead_id=ls[0].id;}
      await SB.from("emails").insert({direction:"inbound",status:"received",from_email:fromEmail,from_name:fromName,to_email:toEmail,subject:p.subject||"(sin asunto)",body_text:p.text||"",body_html:p.html||"",lead_id,metadata:{raw:p}});
      return new Response(JSON.stringify({received:true}),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
    } catch(err){return new Response(JSON.stringify({error:String(err)}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});}
  }
  if (req.method === "GET" && path === "/inbox") {
    try {
      const p=url.searchParams; const lead_id=p.get("lead_id"); const direction=p.get("direction"); const limit=parseInt(p.get("limit")||"50");
      let q=SB.from("emails").select("*").order("created_at",{ascending:false}).limit(limit);
      if(lead_id)q=q.eq("lead_id",lead_id); if(direction&&direction!=="all")q=q.eq("direction",direction);
      const{data,error}=await q; if(error)throw error;
      return new Response(JSON.stringify(data),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
    } catch(err){return new Response(JSON.stringify({error:String(err)}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});}
  }
  if (req.method === "POST" && path === "/ai-paquete") {
    try {
      const { prompt } = await req.json();
      if (!prompt) return new Response(JSON.stringify({error:"prompt requerido"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
      const ar = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-opus-4-6",max_tokens:1500,messages:[{role:"user",content:prompt}]})});
      const ad = await ar.json();
      if (!ar.ok) throw new Error(ad.error?.message||"Error AI");
      const text=(ad.content||[]).find((b: any)=>b.type==="text")?.text||"{}";
      const clean=text.replace(/```json\n?|```/g,"").trim();
      const parsed=JSON.parse(clean);
      return new Response(JSON.stringify(parsed),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
    } catch(err){console.error("ai-paquete:",err);return new Response(JSON.stringify({error:String(err)}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});}
  }
  if (req.method === "POST" && path === "/unsplash-foto") {
    try {
      const { query } = await req.json();
      if (!query) return new Response(JSON.stringify({url:null}),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
      const q = encodeURIComponent(query + " vacation travel landscape");
      const ur = await fetch(`https://api.unsplash.com/search/photos?query=${q}&per_page=1&orientation=landscape`,{headers:{"Authorization":`Client-ID ${UNSPLASH_KEY}`}});
      const ud = await ur.json();
      const foto = ud?.results?.[0];
      const fotoUrl = foto ? foto.urls.regular : null;
      return new Response(JSON.stringify({url:fotoUrl}),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
    } catch(err){return new Response(JSON.stringify({url:null}),{status:200,headers:{...CORS,"Content-Type":"application/json"}});}
  }

  if (req.method === "POST" && path === "/chat-ai") {
    try {
      const { chat_id, lead_id, historial, modo } = await req.json();
      const SB2 = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: lead } = await SB2.from("leads").select("*").eq("id", lead_id).single();
      const { data: kbRows } = await SB2.from("knowledge_base").select("key,contenido");
      const kb = (kbRows||[]).map((r:any)=>r.contenido).filter(Boolean).join("\n\n");
      const { data: emails } = await SB2.from("emails").select("subject,body_text,created_at").eq("lead_id", lead_id).order("created_at",{ascending:false}).limit(5);
      const nombre = lead?.nombre || lead?.name || "el cliente";
      const destinos = (lead?.destinos||[]).map((d:any)=>d.nombre||d.destId).filter(Boolean).join(", ") || "destinos por confirmar";
      const presupuesto = lead?.budget || lead?.salePrice || "";
      const notas = lead?.notes || lead?.notas || "";
      const historialTexto = (historial||[]).map((m:any)=>m.autor+":\n"+m.mensaje).join("\n");
      const emailsTexto = (emails||[]).map((e:any)=>"Email: "+e.subject).join("\n");
      const systemPrompt = "Eres un asesor de viajes de X Travel Group. REGLAS ESTRICTAS: 1) Solo habla de los destinos especificos del cliente, NUNCA inventes informacion. 2) Si no sabes algo di que lo consultaras con el equipo. 3) No menciones precios ni condiciones que no esten en el perfil.\n\nINFORMACION DE X TRAVEL GROUP:\n"+kb+"\n\nPERFIL DEL CLIENTE:\n- Nombre: "+nombre+"\n- Destinos en su paquete: "+destinos+"\n- Presupuesto: "+(presupuesto||"no especificado")+"\n- Notas del vendedor: "+(notas||"ninguna")+"\n\nEMAILS ENVIADOS:\n"+(emailsTexto||"ninguno")+"\n\nHISTORIAL DEL CHAT:\n"+historialTexto+"\n\nIMPORTANTE: Solo responde sobre "+destinos+". Si preguntan de otro destino di que su paquete incluye estos destinos especificos.";

      if (modo === "auto") {
        const esInicio = !historial || historial.length === 0;
        const userMsg = esInicio
          ? `Saluda al cliente ${nombre} de forma cálida y personalizada. Menciona sus destinos de interés (${destinos}). Invítalo a hacer preguntas. Máximo 3 oraciones. Sin asteriscos ni markdown.`
          : `El cliente acaba de escribir. Responde de forma natural, cálida y útil. Máximo 3 oraciones. Sin asteriscos ni markdown.`;
        const ar = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-opus-4-6",max_tokens:300,system:systemPrompt,messages:[{role:"user",content:userMsg}]})});
        const ad = await ar.json();
        const mensaje = (ad.content||[]).find((b:any)=>b.type==="text")?.text||"";
        return new Response(JSON.stringify({mensaje}),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
      }
      if (modo === "sugerencias") {
        const userMsg = `Genera exactamente 3 sugerencias de respuesta cortas para que el asesor responda al último mensaje del cliente. Responde SOLO en JSON así: {"sugerencias":["respuesta1","respuesta2","respuesta3"]}. Sin markdown.`;
        const ar = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-opus-4-6",max_tokens:400,system:systemPrompt,messages:[{role:"user",content:userMsg}]})});
        const ad = await ar.json();
        const text = (ad.content||[]).find((b:any)=>b.type==="text")?.text||"{}";
        const clean = text.replace(/```json|```/g,"").trim();
        const parsed = JSON.parse(clean);
        return new Response(JSON.stringify(parsed),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
      }
      return new Response(JSON.stringify({error:"modo invalido"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});
    } catch(err){console.error("chat-ai:",err);return new Response(JSON.stringify({error:String(err)}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});}
  }
  if (req.method === "POST" && path === "/portal-invite") {
    try {
      const body = await req.json();
      const { email, nombre, lead_id } = body;
      if (!email || !lead_id) return new Response(JSON.stringify({error:"email y lead_id requeridos"}),{status:400,headers:{...CORS,"Content-Type":"application/json"}});

      // 1. Check if user already exists in auth
      const { data: existingUsers } = await SB.auth.admin.listUsers({ filter: `email.eq.${email}` });
      let userId: string;
      const userExists = existingUsers?.users?.find((u: any) => u.email === email);

      if (userExists) {
        userId = userExists.id;
      } else {
        // Create new auth user with a temp password (they'll set their own)
        const tempPass = crypto.randomUUID();
        const { data: newUser, error: createErr } = await SB.auth.admin.createUser({
          email,
          password: tempPass,
          email_confirm: true,
          user_metadata: { nombre, lead_id, role: "cliente" }
        });
        if (createErr) throw new Error(createErr.message);
        userId = newUser.user.id;
      }

      // 2. Generate recovery token (we'll verify it client-side with verifyOtp)
      const { data: linkData, error: linkErr } = await SB.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `https://minivac-crm.vercel.app/portal?setup=1` }
      });
      if (linkErr) throw new Error(linkErr.message);

      // Use the OTP token directly in our URL (bypass Supabase redirect which uses wrong Site URL)
      const emailOtp = linkData?.properties?.email_otp || "";
      const actionLink = `https://minivac-crm.vercel.app/portal?setup=1&token=${emailOtp}&email=${encodeURIComponent(email)}`;

      // 3. Send styled email with the link
      const portalHtml = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;background:#ffffff;">
<div style="background:linear-gradient(135deg,#1a385a 0%,#0ea5a0 100%);padding:32px 24px;text-align:center;border-radius:8px 8px 0 0;">
<img src="https://minivac-crm.vercel.app/logo.png" alt="X Travel Group" style="height:50px;object-fit:contain;margin-bottom:12px;" />
<p style="color:rgba(255,255,255,0.85);margin:0;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Tu aventura comienza ahora</p></div>
<div style="padding:32px 28px;background:#ffffff;">
<h2 style="color:#1a385a;font-size:20px;margin:0 0 16px;">Bienvenido a la familia de X Travel Group!</h2>
<p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 16px;">Hola <strong>${nombre || "estimado cliente"}</strong>,</p>
<p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 16px;">Estamos muy emocionados de acompanarte en este primer paso hacia unas vacaciones increibles. Tu paquete ya esta confirmado y estas mucho mas cerca de disfrutar una experiencia unica en uno de nuestros destinos premium.</p>
<p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 8px;">A partir de este momento, tienes acceso a tu portal de cliente, donde podras:</p>
<ul style="color:#374151;font-size:15px;line-height:2;margin:0 0 20px;padding-left:20px;">
<li>Consultar los detalles de tu paquete</li>
<li>Explorar destinos disponibles</li>
<li>Gestionar tus fechas de viaje</li>
<li>Recibir informacion importante para tu proxima experiencia</li></ul>
<p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 16px;"><strong>Para acceder, primero crea tu contrasena:</strong></p>
<div style="text-align:center;margin:28px 0;">
<a href="${actionLink}" style="display:inline-block;background:linear-gradient(135deg,#0ea5a0 0%,#0d8f8b 100%);color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 12px rgba(14,165,160,0.35);">Crear mi contrasena y acceder</a></div>
<p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 16px;">Este es solo el comienzo. Muy pronto estaras disfrutando de hoteles unicos, destinos espectaculares y momentos que realmente valen la pena.</p>
<p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 16px;">Nuestro equipo estara contigo en cada paso para asegurarnos de que tu experiencia sea perfecta.</p>
<p style="color:#1a385a;font-size:15px;line-height:1.8;margin:0 0 4px;font-weight:700;font-style:italic;">Preparate... porque tus proximas vacaciones estan mas cerca de lo que imaginas.</p>
<p style="color:#374151;font-size:15px;line-height:1.8;margin:20px 0 0;">Bienvenido nuevamente,<br/><strong style="color:#1a385a;">X Travel Group</strong></p></div>
<div style="background:#f8fafc;padding:20px 28px;border-top:1px solid #e5e7eb;border-radius:0 0 8px 8px;text-align:center;">
<p style="color:#9ca3af;font-size:12px;margin:0;">X Travel Group &bull; Miami, FL &bull; 1-800-927-1490</p>
<p style="color:#9ca3af;font-size:11px;margin:6px 0 0;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
</div></div>`;

      const r = await fetch("https://api.resend.com/emails", {
        method:"POST",
        headers:{"Authorization":`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json"},
        body:JSON.stringify({
          from:`${FROM_NAME} <${FROM_EMAIL}>`,
          to:[nombre?`${nombre} <${email}>`:email],
          subject:"Bienvenido a X Travel Group - Crea tu acceso al Portal",
          html:portalHtml
        })
      });
      const rd = await r.json();
      if (!r.ok) throw new Error(rd.message||"Error enviando email");

      // Save in emails table
      await SB.from("emails").insert({
        direction:"outbound",status:"sent",from_email:FROM_EMAIL,from_name:FROM_NAME,
        to_email:email,to_name:nombre||null,
        subject:"Bienvenido a X Travel Group - Crea tu acceso al Portal",
        body_html:portalHtml,resend_id:rd.id,lead_id:lead_id||null
      });

      return new Response(JSON.stringify({success:true,resend_id:rd.id,user_id:userId}),{status:200,headers:{...CORS,"Content-Type":"application/json"}});
    } catch(err) {
      console.error("portal-invite:",err);
      return new Response(JSON.stringify({error:String(err)}),{status:500,headers:{...CORS,"Content-Type":"application/json"}});
    }
  }
  return new Response("Not found",{status:404,headers:CORS});
});
