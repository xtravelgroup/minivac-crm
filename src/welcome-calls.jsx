import React, { useState, useEffect } from "react";
import { supabase as SB } from "./supabase.js";
import { registrarEvento } from "./useHistorial.jsx";

var SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
var SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxNTA0MiwiZXhwIjoyMDg4NTkxMDQyfQ.-P8KH6yhs6AJ1lUwBrwUpcoZV3KGvM7fDlFM3RsYKxw";
var HDR = { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, "Content-Type": "application/json" };

var fmtUSD = function(n){ return "$" + Number(n||0).toLocaleString("en-US", {minimumFractionDigits:0}); };

var C = {
  bg:"#f4f5f7", white:"#ffffff", border:"#e3e6ea", text:"#1a1f2e", sub:"#6b7280",
  muted:"#9ca3af", indigo:"#1565c0", teal:"#0ea5a0", green:"#1a7f3c", amber:"#f59e0b",
  red:"#b91c1c", violet:"#5b21b6", coral:"#f97316",
};

var S = {
  root:  { background:C.bg, minHeight:"100vh", fontFamily:"'DM Sans',system-ui,sans-serif", color:C.text, fontSize:13 },
  page:  { padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 },
  card:  { background:C.white, border:"1px solid "+C.border, borderRadius:10, padding:18 },
  ctit:  { fontSize:10, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14, paddingBottom:8, borderBottom:"1px solid "+C.border },
  th:    { background:"#f8f9fb", color:C.muted, padding:"8px 12px", textAlign:"left", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid "+C.border, whiteSpace:"nowrap" },
  thc:   { background:"#f8f9fb", color:C.muted, padding:"8px 12px", textAlign:"center", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid "+C.border, whiteSpace:"nowrap" },
  td:    { padding:"9px 12px", borderBottom:"1px solid #f4f5f7", verticalAlign:"middle" },
  tdc:   { padding:"9px 12px", borderBottom:"1px solid #f4f5f7", verticalAlign:"middle", textAlign:"center" },
  bdg:   function(c,bg){ return { display:"inline-block", padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, color:c, background:bg }; },
  btn:   function(c,bg){ return { background:bg, color:c, border:"none", borderRadius:6, padding:"6px 12px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }; },
};

// Retry delays: 1st=24h, 2nd=72h, 3rd+=7d
var RETRY_HOURS = [24, 72, 168];

function toEST(dateStr){
  if(!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-CA",{timeZone:"America/New_York"});
}

function timeAgo(dateStr){
  if(!dateStr) return "";
  var diff = Date.now() - new Date(dateStr).getTime();
  var mins = Math.floor(diff/60000);
  if(mins<60) return mins+"m";
  var hrs = Math.floor(mins/60);
  if(hrs<24) return hrs+"h";
  return Math.floor(hrs/24)+"d";
}

export default function WelcomeCalls({ currentUser, onVerCliente }) {
  var [leads, setLeads] = useState([]);
  var [usuarios, setUsuarios] = useState([]);
  var [loading, setLoading] = useState(true);
  var [toast, setToast] = useState(null);
  var [actionLead, setActionLead] = useState(null);

  function notify(msg, ok) {
    setToast({ msg:msg, ok:ok!==false });
    setTimeout(function(){ setToast(null); }, 3200);
  }

  function cargar() {
    Promise.all([
      SB.from("leads").select("id, nombre, apellido, tel, whatsapp, email, emisora, status, created_at, sale_price, pago_inicial, vendedor_id, verificador_id, welcome_call_status, welcome_call_attempts, welcome_call_next_at, welcome_call_completed_at")
        .eq("status", "venta")
        .order("created_at", { ascending: false }),
      SB.from("usuarios").select("id, nombre, rol"),
    ]).then(function(results){
      setLeads((!results[0].error && results[0].data) ? results[0].data : []);
      setUsuarios((!results[1].error && results[1].data) ? results[1].data : []);
      setLoading(false);
    });
  }

  useEffect(function(){ cargar(); var iv=setInterval(cargar,30000); return function(){clearInterval(iv);}; },[]);

  var usrMap = {};
  usuarios.forEach(function(u){ usrMap[u.id] = u.nombre; });

  var now = new Date();

  // Queue: pendientes (no completados, y si tiene next_at debe ser <= ahora)
  var queue = leads.filter(function(l){
    if(l.welcome_call_status === "completado") return false;
    if(l.welcome_call_next_at && new Date(l.welcome_call_next_at) > now) return false;
    return true;
  });

  // Programados: tienen next_at en el futuro
  var programados = leads.filter(function(l){
    if(l.welcome_call_status === "completado") return false;
    if(l.welcome_call_next_at && new Date(l.welcome_call_next_at) > now) return true;
    return false;
  });

  // Completados
  var completados = leads.filter(function(l){ return l.welcome_call_status === "completado"; });

  function marcarNoContesta(lead) {
    var attempts = (lead.welcome_call_attempts || 0) + 1;
    var retryIdx = Math.min(attempts - 1, RETRY_HOURS.length - 1);
    var hoursDelay = RETRY_HOURS[retryIdx];
    var nextAt = new Date(Date.now() + hoursDelay * 3600000).toISOString();

    SB.from("leads").update({
      welcome_call_status: "no_contesta",
      welcome_call_attempts: attempts,
      welcome_call_next_at: nextAt,
    }).eq("id", lead.id).then(function(res){
      if(res.error){ notify("Error: "+res.error.message, false); return; }
      notify("No contesta — reintentar en "+hoursDelay+"h (intento "+attempts+")");
      registrarEvento(lead.id, "welcome", "Welcome call: No contesta — reintentar en "+hoursDelay+"h (intento "+attempts+")", null, {nombre:currentUser?.nombre||"CS"});
      cargar();
      setActionLead(null);
    });
  }

  function marcarCompletado(lead) {
    SB.from("leads").update({
      welcome_call_status: "completado",
      welcome_call_completed_at: new Date().toISOString(),
    }).eq("id", lead.id).then(function(res){
      if(res.error){ notify("Error: "+res.error.message, false); return; }
      notify("Welcome call completada");
      registrarEvento(lead.id, "welcome", "Welcome call completada", null, {nombre:currentUser?.nombre||"CS"});
      cargar();
      setActionLead(null);
    });
  }

  function enviarAccesoPortal(lead) {
    if(!lead.email){ notify("Sin email", false); return; }

    fetch(SB_URL+"/functions/v1/resend-email/portal-invite", {
      method:"POST",
      headers: HDR,
      body: JSON.stringify({
        email: lead.email,
        nombre: lead.nombre||"",
        lead_id: lead.id,
      }),
    }).then(function(r){ return r.json(); }).then(function(r){
      if(r.success){ notify("Invitacion al portal enviada por email"); registrarEvento(lead.id, "welcome", "Invitacion al portal enviada", null, {nombre:currentUser?.nombre||"CS"}); }
      else notify("Error: "+(r.error||r.message||"fallo envio"), false);
    }).catch(function(e){ notify("Error de red: "+e.message, false); });
  }

  function enviarEmailWelcome(lead) {
    if(!lead.email){ notify("Sin email", false); return; }
    var cuerpo = "Hola "+lead.nombre+",\n\nBienvenido a Mini-Vac Vacation Club! Estamos muy contentos de tenerte como miembro.\n\nTu paquete tiene un valor de "+fmtUSD(lead.sale_price)+". Pronto un asesor se pondra en contacto contigo para coordinar tu primer viaje.\n\nPuedes acceder a tu portal de miembro en: https://minivac-crm.vercel.app/portal?id="+lead.id+"\n\nGracias por confiar en nosotros.\n\nMini-Vac Vacation Club\n1-800-927-1490";

    fetch(SB_URL+"/functions/v1/resend-email/send", {
      method:"POST",
      headers: HDR,
      body: JSON.stringify({
        to_email: lead.email,
        to_name: lead.nombre||"",
        subject: "Bienvenido a Mini-Vac Vacation Club",
        body_html: "<div style='font-family:sans-serif;max-width:600px;margin:auto;padding:32px;'>"
          + "<div style='background:#0ea5a0;padding:16px 24px;border-radius:8px 8px 0 0;'>"
          + "<h2 style='color:#fff;margin:0;font-size:18px;'>Mini-Vac Vacation Club</h2></div>"
          + "<div style='background:#f8fafc;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;'>"
          + "<p style='color:#1e293b;font-size:15px;line-height:1.7;margin:0;'>" + cuerpo.replace(/\n/g,"<br/>") + "</p>"
          + "<hr style='border:none;border-top:1px solid #e2e8f0;margin:20px 0;'/>"
          + "<p style='color:#94a3b8;font-size:12px;margin:0;'>Mini-Vac Vacation Club &bull; Miami, FL</p>"
          + "</div></div>",
        body_text: cuerpo,
        lead_id: lead.id,
      }),
    }).then(function(r){ return r.json(); }).then(function(r){
      if(r.success || r.resend_id){ notify("Email de bienvenida enviado"); registrarEvento(lead.id, "welcome", "Email de bienvenida enviado", null, {nombre:currentUser?.nombre||"CS"}); }
      else notify("Error: "+(r.error||r.message||"fallo envio"), false);
    }).catch(function(e){ notify("Error de red: "+e.message, false); });
  }

  function enviarWhatsAppWelcome(lead) {
    var tel = lead.whatsapp || lead.tel || "";
    if(!tel){ notify("Sin numero de telefono", false); return; }

    fetch(SB_URL+"/functions/v1/send-whatsapp", {
      method:"POST",
      headers: HDR,
      body: JSON.stringify({ to:tel, use_template:true, lead_id:lead.id, service_key:SERVICE_KEY }),
    }).then(function(r){ return r.json(); }).then(function(r){
      if(r.ok){ notify("WhatsApp de bienvenida enviado"); registrarEvento(lead.id, "welcome", "WhatsApp de bienvenida enviado", null, {nombre:currentUser?.nombre||"CS"}); }
      else notify("Error: "+(r.error||"fallo envio"), false);
    });
  }

  if(loading) return React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",color:C.sub,fontSize:14}},"Cargando...");

  return React.createElement("div", {style:S.root}, [
    // Header
    React.createElement("div", {key:"hdr", style:{background:C.white, borderBottom:"1px solid "+C.border, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:52}}, [
      React.createElement("div", {key:"t", style:{fontWeight:800, fontSize:15, color:C.text}}, "Welcome Calls"),
      React.createElement("div", {key:"stats", style:{display:"flex", gap:16, fontSize:12}}, [
        React.createElement("span", {key:"q", style:{color:C.coral, fontWeight:700}}, "En queue: "+queue.length),
        React.createElement("span", {key:"p", style:{color:C.amber, fontWeight:700}}, "Programados: "+programados.length),
        React.createElement("span", {key:"c", style:{color:C.green, fontWeight:700}}, "Completados: "+completados.length),
      ]),
    ]),

    React.createElement("div", {key:"body", style:S.page}, [
      // Queue principal
      React.createElement("div", {key:"queue", style:S.card}, [
        React.createElement("div", {key:"t", style:S.ctit}, "Queue — Pendientes de llamar ("+queue.length+")"),
        queue.length===0
          ? React.createElement("div",{key:"empty",style:{textAlign:"center",padding:"24px",color:C.muted,fontSize:12}},"Sin llamadas pendientes")
          : React.createElement("table", {key:"tbl", style:{width:"100%", borderCollapse:"collapse"}}, [
              React.createElement("thead", {key:"h"}, React.createElement("tr", {},
                ["Fecha Venta","Cliente","Telefono","Agente","Verificador","Radio","Enganche","Intentos","Acciones"].map(function(h){ return React.createElement("th",{key:h,style:S.th},h); })
              )),
              React.createElement("tbody", {key:"b"},
                queue.map(function(l){
                  var isOpen = actionLead === l.id;
                  return React.createElement("tr", {key:l.id, style:{background:isOpen?"rgba(21,101,192,0.04)":"transparent"}}, [
                    React.createElement("td",{key:"f",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.sub}},toEST(l.created_at))),
                    React.createElement("td",{key:"n",style:S.td}, React.createElement("span",{style:{fontWeight:600,color:C.indigo,cursor:onVerCliente?"pointer":"default",textDecoration:onVerCliente?"underline":"none"},onClick:function(){if(onVerCliente) onVerCliente(l.id);}},l.nombre||"--")),
                    React.createElement("td",{key:"t",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.indigo}},l.whatsapp||l.tel||"--")),
                    React.createElement("td",{key:"a",style:S.td}, React.createElement("span",{style:{fontSize:12}},usrMap[l.vendedor_id]||"--")),
                    React.createElement("td",{key:"v",style:S.td}, React.createElement("span",{style:{fontSize:12}},usrMap[l.verificador_id]||"--")),
                    React.createElement("td",{key:"r",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.sub}},l.emisora||"--")),
                    React.createElement("td",{key:"e",style:S.tdc}, React.createElement("span",{style:{fontWeight:700,color:C.green}},fmtUSD(l.pago_inicial||0))),
                    React.createElement("td",{key:"att",style:S.tdc}, React.createElement("span",{style:S.bdg(l.welcome_call_attempts>0?C.amber:C.muted, l.welcome_call_attempts>0?"rgba(245,158,11,0.1)":"#f4f5f7")}, String(l.welcome_call_attempts||0))),
                    React.createElement("td",{key:"act",style:Object.assign({},S.tdc,{whiteSpace:"nowrap"})},
                      isOpen
                        ? React.createElement("div", {style:{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}, [
                            React.createElement("button",{key:"comp",style:S.btn("#fff",C.green),onClick:function(){marcarCompletado(l);}},"Completado"),
                            React.createElement("button",{key:"nc",style:S.btn("#fff",C.amber),onClick:function(){marcarNoContesta(l);}},"No Contesta"),
                            React.createElement("button",{key:"portal",style:S.btn("#fff",C.indigo),onClick:function(){enviarAccesoPortal(l);}},"Portal"),
                            React.createElement("button",{key:"email",style:S.btn("#fff",C.teal),onClick:function(){enviarEmailWelcome(l);}},"Email"),
                            React.createElement("button",{key:"wa",style:S.btn("#fff","#25d366"),onClick:function(){enviarWhatsAppWelcome(l);}},"WhatsApp"),
                            React.createElement("button",{key:"x",style:S.btn(C.muted,"transparent"),onClick:function(){setActionLead(null);}},"x"),
                          ])
                        : React.createElement("button",{style:S.btn(C.indigo,"rgba(21,101,192,0.08)"),onClick:function(){setActionLead(l.id);}},"Acciones")
                    ),
                  ]);
                })
              ),
            ]),
      ]),

      // Programados
      programados.length > 0 && React.createElement("div", {key:"prog", style:S.card}, [
        React.createElement("div", {key:"t", style:S.ctit}, "Programados — Reintento pendiente ("+programados.length+")"),
        React.createElement("table", {key:"tbl", style:{width:"100%", borderCollapse:"collapse"}}, [
          React.createElement("thead", {key:"h"}, React.createElement("tr", {},
            ["Cliente","Telefono","Intentos","Proximo intento","Tiempo restante"].map(function(h){ return React.createElement("th",{key:h,style:S.th},h); })
          )),
          React.createElement("tbody", {key:"b"},
            programados.map(function(l){
              var nextAt = new Date(l.welcome_call_next_at);
              var diffMs = nextAt - now;
              var diffH = Math.max(0, Math.floor(diffMs/3600000));
              var diffM = Math.max(0, Math.floor((diffMs%3600000)/60000));
              return React.createElement("tr", {key:l.id}, [
                React.createElement("td",{key:"n",style:S.td}, React.createElement("span",{style:{fontWeight:600,color:C.indigo,cursor:onVerCliente?"pointer":"default",textDecoration:onVerCliente?"underline":"none"},onClick:function(){if(onVerCliente) onVerCliente(l.id);}},l.nombre||"--")),
                React.createElement("td",{key:"t",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.indigo}},l.whatsapp||l.tel||"--")),
                React.createElement("td",{key:"a",style:S.tdc}, React.createElement("span",{style:S.bdg(C.amber,"rgba(245,158,11,0.1)")},String(l.welcome_call_attempts||0))),
                React.createElement("td",{key:"next",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.sub}},toEST(l.welcome_call_next_at)+" "+nextAt.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",timeZone:"America/New_York"}))),
                React.createElement("td",{key:"rem",style:S.tdc}, React.createElement("span",{style:{fontSize:12,fontWeight:700,color:C.amber}},diffH+"h "+diffM+"m")),
              ]);
            })
          ),
        ]),
      ]),

      // Completados recientes
      React.createElement("div", {key:"done", style:S.card}, [
        React.createElement("div", {key:"t", style:S.ctit}, "Completados ("+completados.length+")"),
        completados.length===0
          ? React.createElement("div",{key:"empty",style:{textAlign:"center",padding:"20px",color:C.muted,fontSize:12}},"Sin welcome calls completadas")
          : React.createElement("table", {key:"tbl", style:{width:"100%", borderCollapse:"collapse"}}, [
              React.createElement("thead", {key:"h"}, React.createElement("tr", {},
                ["Fecha Venta","Cliente","Agente","Verificador","Enganche","Completado"].map(function(h){ return React.createElement("th",{key:h,style:S.th},h); })
              )),
              React.createElement("tbody", {key:"b"},
                completados.slice(0,20).map(function(l){
                  return React.createElement("tr", {key:l.id}, [
                    React.createElement("td",{key:"f",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.sub}},toEST(l.created_at))),
                    React.createElement("td",{key:"n",style:S.td}, React.createElement("span",{style:{fontWeight:600,color:C.indigo,cursor:onVerCliente?"pointer":"default",textDecoration:onVerCliente?"underline":"none"},onClick:function(){if(onVerCliente) onVerCliente(l.id);}},l.nombre||"--")),
                    React.createElement("td",{key:"a",style:S.td}, React.createElement("span",{style:{fontSize:12}},usrMap[l.vendedor_id]||"--")),
                    React.createElement("td",{key:"v",style:S.td}, React.createElement("span",{style:{fontSize:12}},usrMap[l.verificador_id]||"--")),
                    React.createElement("td",{key:"e",style:S.tdc}, React.createElement("span",{style:{fontWeight:700,color:C.green}},fmtUSD(l.pago_inicial||0))),
                    React.createElement("td",{key:"d",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.green,fontWeight:600}},toEST(l.welcome_call_completed_at))),
                  ]);
                })
              ),
            ]),
      ]),
    ]),

    // Toast
    toast && React.createElement("div", {key:"toast", style:{position:"fixed",bottom:24,right:24,background:toast.ok?C.green:C.red,color:"#fff",padding:"10px 20px",borderRadius:8,fontSize:13,fontWeight:600,boxShadow:"0 4px 12px rgba(0,0,0,0.15)",zIndex:999}}, toast.msg),
  ]);
}
