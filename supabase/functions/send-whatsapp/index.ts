import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const TWILIO_SID=Deno.env.get("TWILIO_SID")||"";
const TWILIO_TOKEN=Deno.env.get("TWILIO_TOKEN")||"";
const FROM_NUMBER=Deno.env.get("TWILIO_WA_FROM")||"";
const TEMPLATE_SID=Deno.env.get("TWILIO_TEMPLATE_SID")||"";
const MESSAGING_SID=Deno.env.get("TWILIO_MESSAGING_SID")||"";
const SB_URL="https://gsvnvahrjgswwejnuiyn.supabase.co";
serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,content-type,apikey"}});
  try{
    const{lead_id,to,mensaje,use_template,service_key}=await req.json();
    if(!to) return new Response(JSON.stringify({error:"Faltan parametros"}),{status:400});
    const toWA=to.startsWith("whatsapp:")?to:"whatsapp:+"+to.replace(/\D/g,"");
    let body;
    if(use_template){
      body=new URLSearchParams({MessagingServiceSid:MESSAGING_SID,To:toWA,ContentSid:TEMPLATE_SID});
    } else {
      if(!mensaje) return new Response(JSON.stringify({error:"Falta mensaje"}),{status:400});
      body=new URLSearchParams({MessagingServiceSid:MESSAGING_SID,To:toWA,Body:mensaje});
    }
    const twilioRes=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,{method:"POST",headers:{"Authorization":"Basic "+btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),"Content-Type":"application/x-www-form-urlencoded"},body});
    const td=await twilioRes.json();
    if(!twilioRes.ok) return new Response(JSON.stringify({error:td.message,details:td}),{status:400});
    if(service_key) await fetch(`${SB_URL}/rest/v1/whatsapp_messages`,{method:"POST",headers:{"apikey":service_key,"Authorization":`Bearer ${service_key}`,"Content-Type":"application/json"},body:JSON.stringify({lead_id:lead_id||null,direccion:"outbound",de:FROM_NUMBER,para:toWA,mensaje:use_template?"[Template: Bienvenida]":mensaje,twilio_sid:td.sid,status:td.status})});
    return new Response(JSON.stringify({ok:true,sid:td.sid}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }catch(e){return new Response(JSON.stringify({error:e.message}),{status:500});}
});
