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
  return new Response("Not found",{status:404,headers:CORS});
});
