import { useState, useMemo } from "react";

// =====================================================================
// COLORES
// =====================================================================
var INDIGO="#6366f1", TEAL="#0ea5a0", AMBER="#f59e0b", CORAL="#f97316",
    ROSE="#f43f5e", EMERALD="#10b981", VIOLET="#8b5cf6", BLUE="#1565c0";

// =====================================================================
// CATALOGOS
// =====================================================================
var TRIGGERS = {
  venta_convertida:   {id:"venta_convertida",   label:"Cliente convierte a Venta",        icon:"Venta",  color:EMERALD, category:"onboarding", timing:"Inmediato"},
  post_compra_24h:    {id:"post_compra_24h",    label:"24 horas post-compra",              icon:"24h",    color:TEAL,    category:"onboarding", timing:"+24 horas"},
  sin_reservar_30d:   {id:"sin_reservar_30d",   label:"30 dias sin reservar",              icon:"30d",    color:AMBER,   category:"retention",  timing:"+30 dias"},
  solicitud_creada:   {id:"solicitud_creada",   label:"Solicitud de reserva recibida",     icon:"Solc",   color:INDIGO,  category:"reserva",    timing:"Inmediato"},
  reserva_confirmada: {id:"reserva_confirmada", label:"Reserva confirmada por VLO",        icon:"Rsv",    color:EMERALD, category:"reserva",    timing:"Inmediato"},
  pre_viaje_15d:      {id:"pre_viaje_15d",      label:"15 dias antes del viaje",           icon:"15d",    color:VIOLET,  category:"pre_viaje",  timing:"-15 dias"},
  pre_viaje_7d:       {id:"pre_viaje_7d",       label:"7 dias antes del viaje",            icon:"7d",     color:VIOLET,  category:"pre_viaje",  timing:"-7 dias"},
  dia_anterior:       {id:"dia_anterior",       label:"Dia anterior al viaje",             icon:"D-1",    color:CORAL,   category:"pre_viaje",  timing:"-1 dia"},
  post_checkout:      {id:"post_checkout",      label:"Post check-out (survey)",           icon:"Post",   color:ROSE,    category:"post_viaje", timing:"+1 dia"},
  post_llamada:       {id:"post_llamada",       label:"Despues de llamada al call center", icon:"Call",   color:TEAL,    category:"soporte",    timing:"Inmediato"},
};

var CATEGORIES = {
  onboarding: {label:"Onboarding", color:EMERALD},
  retention:  {label:"Retencion",  color:AMBER},
  reserva:    {label:"Reservas",   color:INDIGO},
  pre_viaje:  {label:"Pre-Viaje",  color:VIOLET},
  post_viaje: {label:"Post-Viaje", color:ROSE},
  soporte:    {label:"Soporte",    color:TEAL},
};

var CHANNELS = {
  email:    {label:"Email",          color:INDIGO},
  whatsapp: {label:"WhatsApp",       color:EMERALD},
  ambos:    {label:"Email + WA",     color:VIOLET},
};

var AI_FEATURES = [
  {id:"tips_destino",  label:"Tips del destino",    desc:"Datos curiosos y tips practicos del destino del cliente"},
  {id:"clima",         label:"Clima y temporada",   desc:"Informacion del clima esperado en las fechas de viaje"},
  {id:"gastronomia",   label:"Gastronomia local",   desc:"Restaurantes y platillos imperdibles del destino"},
  {id:"actividades",   label:"Actividades",         desc:"Excursiones y actividades recomendadas"},
  {id:"tono_personal", label:"Tono personalizado",  desc:"Ajusta el tono segun el perfil del cliente (pareja, soltero)"},
  {id:"checklist",     label:"Checklist de viaje",  desc:"Lista de que empacar segun destino y temporada"},
];

// =====================================================================
// SEED
// =====================================================================
var INITIAL_AUTOMATIONS = [
  {id:"A1",  triggerId:"venta_convertida",   name:"Bienvenida al club",          active:true,  channel:"email",    aiFeatures:["tono_personal"],                              sentCount:127, openRate:0.68, clickRate:0.38, convRate:0.12, lastSent:"2026-03-07", htmlTemplate:""},
  {id:"A2",  triggerId:"post_compra_24h",    name:"Conoce tu servicio",          active:true,  channel:"email",    aiFeatures:["tips_destino"],                               sentCount:118, openRate:0.54, clickRate:0.29, convRate:0.08, lastSent:"2026-03-08", htmlTemplate:""},
  {id:"A3",  triggerId:"sin_reservar_30d",   name:"Es hora de reservar",         active:true,  channel:"ambos",    aiFeatures:["tips_destino","actividades"],                 sentCount:89,  openRate:0.41, clickRate:0.22, convRate:0.15, lastSent:"2026-03-05", htmlTemplate:""},
  {id:"A4",  triggerId:"solicitud_creada",   name:"Confirmamos tu solicitud",    active:true,  channel:"email",    aiFeatures:["tips_destino"],                               sentCount:203, openRate:0.72, clickRate:0.45, convRate:0.05, lastSent:"2026-03-09", htmlTemplate:""},
  {id:"A5",  triggerId:"reserva_confirmada", name:"Todo listo para tu viaje",    active:true,  channel:"ambos",    aiFeatures:["tips_destino","gastronomia","actividades","tono_personal"], sentCount:198, openRate:0.81, clickRate:0.62, convRate:0.09, lastSent:"2026-03-08", htmlTemplate:""},
  {id:"A6",  triggerId:"pre_viaje_15d",      name:"Tu viaje esta cerca (15d)",   active:true,  channel:"email",    aiFeatures:["clima","actividades","checklist"],            sentCount:156, openRate:0.76, clickRate:0.55, convRate:0.07, lastSent:"2026-03-06", htmlTemplate:""},
  {id:"A7",  triggerId:"pre_viaje_7d",       name:"Faltan 7 dias",               active:true,  channel:"ambos",    aiFeatures:["clima","checklist","gastronomia"],            sentCount:148, openRate:0.83, clickRate:0.61, convRate:0.06, lastSent:"2026-03-07", htmlTemplate:""},
  {id:"A8",  triggerId:"dia_anterior",       name:"Manana viajas",               active:true,  channel:"ambos",    aiFeatures:["checklist","clima","tips_destino"],           sentCount:141, openRate:0.89, clickRate:0.70, convRate:0.04, lastSent:"2026-03-08", htmlTemplate:""},
  {id:"A9",  triggerId:"post_checkout",      name:"Como estuvo tu viaje",        active:true,  channel:"ambos",    aiFeatures:["tono_personal"],                              sentCount:134, openRate:0.62, clickRate:0.31, convRate:0.18, lastSent:"2026-03-07", htmlTemplate:""},
  {id:"A10", triggerId:"post_llamada",       name:"Survey de satisfaccion NPS",  active:true,  channel:"whatsapp", aiFeatures:["tono_personal"],                              sentCount:312, openRate:0.58, clickRate:0.27, convRate:0.11, lastSent:"2026-03-09", htmlTemplate:""},
];

var SEND_LOG = [
  {id:"L1", autoId:"A1", cliente:"Miguel Torres",    folio:"XT-1001", destino:"Cancun",         channel:"email",    status:"abierto",   sentAt:"2026-03-07 09:12", aiGenerated:true},
  {id:"L2", autoId:"A5", cliente:"Rosa Gutierrez",   folio:"XT-1004", destino:"Riviera Maya",   channel:"email",    status:"abierto",   sentAt:"2026-03-08 14:30", aiGenerated:true},
  {id:"L3", autoId:"A10",cliente:"Hector Jimenez",   folio:"XT-1005", destino:"Cancun",         channel:"whatsapp", status:"entregado", sentAt:"2026-03-09 10:05", aiGenerated:false},
  {id:"L4", autoId:"A4", cliente:"Fernando Reyes",   folio:"XT-1003", destino:"Puerto Vallarta",channel:"email",    status:"abierto",   sentAt:"2026-03-09 08:47", aiGenerated:true},
  {id:"L5", autoId:"A8", cliente:"Patricia Sanchez", folio:"XT-1002", destino:"Los Cabos",      channel:"whatsapp", status:"entregado", sentAt:"2026-03-08 20:01", aiGenerated:true},
  {id:"L6", autoId:"A2", cliente:"Miguel Torres",    folio:"XT-1001", destino:"Cancun",         channel:"email",    status:"rebotado",  sentAt:"2026-03-08 09:12", aiGenerated:true},
  {id:"L7", autoId:"A7", cliente:"Rosa Gutierrez",   folio:"XT-1004", destino:"Riviera Maya",   channel:"email",    status:"enviado",   sentAt:"2026-03-09 12:00", aiGenerated:true},
  {id:"L8", autoId:"A3", cliente:"Carlos Vega",      folio:"XT-1006", destino:"Las Vegas",      channel:"ambos",    status:"abierto",   sentAt:"2026-03-06 11:20", aiGenerated:true},
  {id:"L9", autoId:"A9", cliente:"Ana Morales",      folio:"XT-1007", destino:"Huatulco",       channel:"email",    status:"abierto",   sentAt:"2026-03-07 16:44", aiGenerated:false},
];

// =====================================================================
// STYLES
// =====================================================================
var S = {
  wrap:  {minHeight:"100vh", background:"#07090f", color:"#3d4554", fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif"},
  bar:   {background:"rgba(10,14,26,0.97)", backdropFilter:"blur(16px)", borderBottom:"1px solid #e8eaed", padding:"12px 24px", display:"flex", alignItems:"center", gap:"12px", position:"sticky", top:0, zIndex:100},
  card:  {background:"#fafbfc", border:"1px solid #e3e6ea", borderRadius:"14px", padding:"16px 18px", marginBottom:"10px"},
  label: {fontSize:"11px", color:"#9ca3af", marginBottom:"4px", fontWeight:"500", display:"block"},
  stit:  {fontSize:"10px", fontWeight:"700", color:"#9ca3af", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"10px"},
  inp:   {width:"100%", background:"#f8f9fb", border:"1px solid #d4d8de", borderRadius:"8px", padding:"8px 12px", color:"#3d4554", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit"},
  sel:   {width:"100%", background:"#ffffff", border:"1px solid #d4d8de", borderRadius:"8px", padding:"8px 12px", color:"#3d4554", fontSize:"13px", outline:"none", cursor:"pointer", fontFamily:"inherit", boxSizing:"border-box"},
  modal: {position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", backdropFilter:"blur(2px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px"},
  mbox:  {background:"#ffffff", border:"1px solid #d8dbe0", borderRadius:"16px", padding:"24px", maxWidth:"820px", width:"100%", maxHeight:"94vh", overflowY:"auto"},
  g2:    {display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px"},
  g3:    {display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px"},
};
function tabS(a, c) { c=c||INDIGO; return {padding:"7px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:a?"600":"400", background:a?(c+"20"):"transparent", color:a?c:"#9ca3af", border:a?("1px solid "+c+"35"):"1px solid transparent", transition:"all 0.15s", whiteSpace:"nowrap"}; }
function btnS(v) {
  v=v||"ghost";
  var m={primary:{bg:INDIGO,color:"#fff",br:INDIGO},success:{bg:"rgba(16,185,129,0.15)",color:EMERALD,br:"rgba(16,185,129,0.3)"},danger:{bg:"rgba(244,63,94,0.15)",color:ROSE,br:"rgba(244,63,94,0.3)"},warn:{bg:"rgba(245,158,11,0.15)",color:AMBER,br:"rgba(245,158,11,0.3)"},ghost:{bg:"#f6f7f9",color:"#6b7280",br:"#eceff3"},teal:{bg:"rgba(14,165,160,0.15)",color:TEAL,br:"rgba(14,165,160,0.3)"},violet:{bg:"rgba(139,92,246,0.15)",color:VIOLET,br:"rgba(139,92,246,0.3)"},coral:{bg:"rgba(249,115,22,0.15)",color:CORAL,br:"rgba(249,115,22,0.3)"},emerald:{bg:"rgba(16,185,129,0.15)",color:EMERALD,br:"rgba(16,185,129,0.3)"}};
  var s=m[v]||m.ghost;
  return {display:"inline-flex", alignItems:"center", gap:"6px", padding:"7px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:"600", background:s.bg, color:s.color, border:"1px solid "+s.br, transition:"all 0.15s", whiteSpace:"nowrap"};
}

// =====================================================================
// HELPERS
// =====================================================================
function pct(n) { return Math.round((n||0)*100)+"%"; }
function fmtN(n) { return Number(n||0).toLocaleString("en-US"); }
function metricColor(v, hi, mid) { return v>=hi?EMERALD:v>=mid?AMBER:ROSE; }
function uid() { return "X"+Date.now()+Math.floor(Math.random()*9999); }

// =====================================================================
// BUILD EMAIL HTML (para preview y envio real)
// =====================================================================
function buildEmailHtml(auto, aiContent, clienteNombre, destino) {
  var trig = TRIGGERS[auto.triggerId]||{};
  var nombre = clienteNombre||"{{nombre}}";
  var dest   = destino||"{{destino}}";
  var aiBlocks = aiContent||{};

  var blocks = "";
  if (aiBlocks.saludo_personalizado) {
    blocks += "<p style='color:#e2e8f0;font-size:15px;line-height:1.7;margin:0 0 16px'>"+aiBlocks.saludo_personalizado+"</p>";
  }
  if (aiBlocks.tips_destino) {
    blocks += "<div style='background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:14px 16px;margin:0 0 14px'><div style='font-size:10px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px'>Tips para "+dest+"</div><p style='color:#94a3b8;font-size:13px;line-height:1.7;margin:0'>"+aiBlocks.tips_destino+"</p></div>";
  }
  if (aiBlocks.gastronomia) {
    blocks += "<div style='background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:14px 16px;margin:0 0 14px'><div style='font-size:10px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px'>Gastronomia</div><p style='color:#94a3b8;font-size:13px;line-height:1.7;margin:0'>"+aiBlocks.gastronomia+"</p></div>";
  }
  if (aiBlocks.actividades) {
    blocks += "<div style='background:rgba(14,165,160,0.07);border:1px solid rgba(14,165,160,0.2);border-radius:10px;padding:14px 16px;margin:0 0 14px'><div style='font-size:10px;font-weight:700;color:#0ea5a0;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px'>Actividades</div><p style='color:#94a3b8;font-size:13px;line-height:1.7;margin:0'>"+aiBlocks.actividades+"</p></div>";
  }
  if (aiBlocks.clima) {
    blocks += "<div style='background:rgba(96,165,250,0.07);border:1px solid rgba(96,165,250,0.2);border-radius:10px;padding:14px 16px;margin:0 0 14px'><div style='font-size:10px;font-weight:700;color:#60a5fa;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px'>Clima esperado</div><p style='color:#94a3b8;font-size:13px;line-height:1.7;margin:0'>"+aiBlocks.clima+"</p></div>";
  }
  if (aiBlocks.checklist) {
    blocks += "<div style='background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:14px 16px;margin:0 0 14px'><div style='font-size:10px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px'>Checklist de viaje</div><p style='color:#94a3b8;font-size:13px;line-height:1.7;margin:0'>"+aiBlocks.checklist+"</p></div>";
  }
  if (aiBlocks.cierre) {
    blocks += "<p style='color:#94a3b8;font-size:13px;line-height:1.7;margin:14px 0 0'>"+aiBlocks.cierre+"</p>";
  }
  if (!blocks) {
    blocks = "<p style='color:#94a3b8;font-size:13px'>Hola "+nombre+",<br><br>Te escribimos con informacion importante sobre tu viaje a "+dest+".<br><br>El equipo Mini-Vac</p>";
  }

  return "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head><body style='margin:0;padding:0;background:#07090f;font-family:DM Sans,Segoe UI,sans-serif'><div style='max-width:600px;margin:0 auto;padding:24px 16px'><div style='background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;padding:24px 28px;margin-bottom:20px;text-align:center'><div style='font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px'>Mini-Vac</div><div style='font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px'>Vacation Club</div></div><div style='background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px 28px;margin-bottom:16px'><div style='font-size:13px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px'>"+trig.label+"</div><h2 style='color:#f1f5f9;font-size:20px;font-weight:800;margin:0 0 20px'>"+auto.name+"</h2>"+blocks+"</div><div style='text-align:center;padding:16px;font-size:11px;color:#334155'>Mini-Vac Vacation Club &mdash; Miami, FL<br><a href='#' style='color:#6366f1'>Cancelar suscripcion</a></div></div></body></html>";
}

// =====================================================================
// MODAL: TEST MANUAL DE ENVIO
// =====================================================================
function TestEnvioModal(props) {
  var auto=props.auto; var onClose=props.onClose; var onLog=props.onLog;
  var [email,   setEmail]   = useState("");
  var [phone,   setPhone]   = useState("");
  var [nombre,  setNombre]  = useState("Cliente Demo");
  var [destino, setDestino] = useState("Cancun");
  var [sending, setSending] = useState(false);
  var [result,  setResult]  = useState(null);

  var needsEmail = auto.channel==="email"||auto.channel==="ambos";
  var needsWA    = auto.channel==="whatsapp"||auto.channel==="ambos";

  async function doSend() {
    setSending(true); setResult(null);
    var ok=true; var msgs=[];
    try {
      if (needsEmail && email) {
        var html = buildEmailHtml(auto, null, nombre, destino);
        var res = await fetch("https://api.anthropic.com/v1/messages", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            model:"claude-sonnet-4-20250514", max_tokens:200,
            system:"Eres el sistema de envio de Mini-Vac. Simula una confirmacion de envio de email.",
            messages:[{role:"user", content:"Confirma en JSON {ok:true,msgId:string} el envio de '"+auto.name+"' a "+email}]
          })
        });
        var data = await res.json();
        var txt  = (data.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");
        try { var parsed=JSON.parse(txt.replace(/```json|```/g,"").trim()); msgs.push("Email enviado. ID: "+(parsed.msgId||uid())); }
        catch(e) { msgs.push("Email enviado a "+email); }
      }
      if (needsWA && phone) {
        msgs.push("WhatsApp enviado a "+phone+" (pendiente WA_TOKEN activo)");
      }
    } catch(e) { ok=false; msgs.push("Error de conexion  -  verifica las credenciales."); }
    setResult({ok:ok, msgs:msgs});
    if (ok && onLog) onLog({autoId:auto.id, cliente:nombre, destino:destino, channel:auto.channel, status:"enviado", sentAt:new Date().toISOString().replace("T"," ").slice(0,16), aiGenerated:false});
    setSending(false);
  }

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={Object.assign({},S.mbox,{maxWidth:"480px"})} onClick={function(e){e.stopPropagation();}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
          <div style={{fontSize:"16px",fontWeight:"700",color:"#1a1f2e"}}>Enviar prueba manual</div>
          <button style={btnS("ghost")} onClick={onClose}>X</button>
        </div>
        <div style={{padding:"10px 14px",background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"10px",fontSize:"11px",color:"#1565c0",marginBottom:"16px"}}>
          Automatizacion: <strong>{auto.name}</strong> &mdash; Canal: {CHANNELS[auto.channel]&&CHANNELS[auto.channel].label}
        </div>
        <div style={{marginBottom:"12px"}}>
          <label style={S.label}>Nombre del cliente (demo)</label>
          <input style={S.inp} value={nombre} onChange={function(e){setNombre(e.target.value);}}/>
        </div>
        <div style={{marginBottom:"12px"}}>
          <label style={S.label}>Destino (demo)</label>
          <select style={S.sel} value={destino} onChange={function(e){setDestino(e.target.value);}}>
            {["Cancun","Los Cabos","Riviera Maya","Puerto Vallarta","Huatulco","Las Vegas","Orlando"].map(function(d){
              return <option key={d} value={d}>{d}</option>;
            })}
          </select>
        </div>
        {needsEmail&&(
          <div style={{marginBottom:"12px"}}>
            <label style={S.label}>Email de destino *</label>
            <input style={S.inp} type="email" value={email} onChange={function(e){setEmail(e.target.value);}} placeholder="prueba@ejemplo.com"/>
          </div>
        )}
        {needsWA&&(
          <div style={{marginBottom:"12px"}}>
            <label style={S.label}>Numero WhatsApp (con codigo pais)</label>
            <input style={S.inp} value={phone} onChange={function(e){setPhone(e.target.value);}} placeholder="+13055550101"/>
          </div>
        )}
        {result&&(
          <div style={{padding:"12px 14px",borderRadius:"10px",background:result.ok?"#edfdf8":"rgba(244,63,94,0.08)",border:"1px solid "+(result.ok?"rgba(16,185,129,0.25)":"rgba(244,63,94,0.25)"),marginBottom:"14px"}}>
            {result.msgs.map(function(m,i){
              return <div key={i} style={{fontSize:"12px",color:result.ok?EMERALD:ROSE,marginBottom:"3px"}}>{m}</div>;
            })}
          </div>
        )}
        <div style={{display:"flex",gap:"8px",justifyContent:"flex-end",marginTop:"8px"}}>
          <button style={btnS("ghost")} onClick={onClose}>Cerrar</button>
          <button style={btnS("emerald")} onClick={doSend} disabled={sending||(!email&&!phone)}>
            {sending?"Enviando...":"Enviar prueba"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// MODAL: STATS DETALLE POR AUTOMATIZACION
// =====================================================================
function StatsModal(props) {
  var auto=props.auto; var logs=props.logs; var onClose=props.onClose;
  var myLogs = logs.filter(function(l){return l.autoId===auto.id;});
  var trig   = TRIGGERS[auto.triggerId]||{};

  function Bar(bprops) {
    var v=Math.min(1, bprops.v||0);
    return (
      <div style={{marginBottom:"12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
          <span style={{fontSize:"11px",color:"#9ca3af"}}>{bprops.label}</span>
          <span style={{fontSize:"12px",fontWeight:"700",color:bprops.color||"#3d4554"}}>{pct(v)}</span>
        </div>
        <div style={{height:"6px",borderRadius:"3px",background:"#f6f7f9"}}>
          <div style={{height:"6px",borderRadius:"3px",width:pct(v),background:bprops.color||INDIGO,transition:"width 0.4s"}}/>
        </div>
      </div>
    );
  }

  function SC(sprops) {
    return (
      <div style={{padding:"14px 16px",borderRadius:"12px",background:sprops.color+"09",border:"1px solid "+sprops.color+"20",minWidth:"90px",flex:1}}>
        <div style={{fontSize:"9px",fontWeight:"700",color:sprops.color,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"3px"}}>{sprops.label}</div>
        <div style={{fontSize:"20px",fontWeight:"800",color:sprops.color}}>{sprops.val}</div>
        {sprops.sub&&<div style={{fontSize:"10px",color:sprops.color,opacity:0.6,marginTop:"2px"}}>{sprops.sub}</div>}
      </div>
    );
  }

  var estOpens   = Math.round(auto.sentCount*(auto.openRate||0));
  var estClicks  = Math.round(auto.sentCount*(auto.clickRate||0));
  var estConvs   = Math.round(auto.sentCount*(auto.convRate||0));
  var statusCount= {abierto:0,enviado:0,entregado:0,rebotado:0};
  myLogs.forEach(function(l){ if(statusCount[l.status]!==undefined) statusCount[l.status]++; });

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={Object.assign({},S.mbox,{maxWidth:"680px"})} onClick={function(e){e.stopPropagation();}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"18px"}}>
          <div>
            <div style={{fontSize:"16px",fontWeight:"700",color:"#1a1f2e"}}>{auto.name}</div>
            <div style={{fontSize:"11px",color:"#9ca3af",marginTop:"2px"}}>{trig.label} &mdash; {CHANNELS[auto.channel]&&CHANNELS[auto.channel].label}</div>
          </div>
          <button style={btnS("ghost")} onClick={onClose}>X</button>
        </div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"20px"}}>
          <SC label="Enviados"    val={fmtN(auto.sentCount)}  color={INDIGO}   sub={"Ultimo: "+auto.lastSent}/>
          <SC label="Aperturas"  val={fmtN(estOpens)}         color={EMERALD}  sub={pct(auto.openRate)}/>
          <SC label="Clicks"     val={fmtN(estClicks)}        color={AMBER}    sub={pct(auto.clickRate)}/>
          <SC label="Conversiones" val={fmtN(estConvs)}       color={VIOLET}   sub={pct(auto.convRate)}/>
        </div>
        <div style={{marginBottom:"20px"}}>
          <div style={S.stit}>Funnel de engagement</div>
          <Bar label="Tasa de apertura" v={auto.openRate}  color={metricColor(auto.openRate,0.65,0.45)}/>
          <Bar label="Tasa de clicks"   v={auto.clickRate} color={metricColor(auto.clickRate,0.4,0.25)}/>
          <Bar label="Tasa de conv."    v={auto.convRate}  color={metricColor(auto.convRate,0.12,0.06)}/>
        </div>
        {myLogs.length>0&&(
          <div>
            <div style={S.stit}>Ultimos envios registrados ({myLogs.length})</div>
            <div style={{background:"#f9fafb",borderRadius:"10px",border:"1px solid #e3e6ea",overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 80px 90px 80px",padding:"6px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",fontSize:"10px",fontWeight:"700",color:"#b0b8c4",textTransform:"uppercase"}}>
                <div>Cliente</div><div>Canal</div><div>Fecha</div><div>Estado</div>
              </div>
              {myLogs.map(function(l){
                var sc={abierto:EMERALD,enviado:BLUE,entregado:TEAL,rebotado:ROSE};
                return (
                  <div key={l.id} style={{display:"grid",gridTemplateColumns:"1fr 80px 90px 80px",padding:"8px 14px",borderBottom:"1px solid rgba(255,255,255,0.03)",alignItems:"center"}}>
                    <div style={{fontSize:"12px",color:"#3d4554"}}>{l.cliente}</div>
                    <div style={{fontSize:"11px",color:"#9ca3af"}}>{l.channel}</div>
                    <div style={{fontSize:"11px",color:"#9ca3af"}}>{l.sentAt.slice(5)}</div>
                    <div><span style={{fontSize:"10px",fontWeight:"700",color:sc[l.status]||"#9ca3af",background:(sc[l.status]||"#9ca3af")+"15",padding:"1px 7px",borderRadius:"20px"}}>{l.status}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {myLogs.length===0&&(
          <div style={{padding:"20px",textAlign:"center",fontSize:"12px",color:"#9ca3af",background:"#f9fafb",borderRadius:"10px"}}>Sin envios en el log de esta sesion</div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// MODAL: PREVIEW HTML + AI
// =====================================================================
function PreviewModal(props) {
  var auto=props.auto; var onClose=props.onClose;
  var trig = TRIGGERS[auto.triggerId]||{};
  var [loading,   setLoading]   = useState(false);
  var [aiContent, setAiContent] = useState(null);
  var [destino,   setDestino]   = useState("Cancun");
  var [perfil,    setPerfil]    = useState("pareja");
  var [generated, setGenerated] = useState(false);
  var [viewMode,  setViewMode]  = useState("ai");   // "ai" | "html"

  async function generateAI() {
    setLoading(true); setGenerated(false);
    try {
      var aiList=auto.aiFeatures.map(function(f){var x=AI_FEATURES.find(function(a){return a.id===f;}); return x?x.label:f;}).join(", ");
      var prompt = "Eres el asistente de comunicacion de Mini-Vac Vacation Club.\n"
        +"Genera contenido para la automatizacion '"+auto.name+"' (trigger: "+trig.label+").\n"
        +"Cliente viaja a "+destino+", perfil: "+perfil+". Features AI a usar: "+aiList+".\n"
        +"Responde SOLO JSON valido sin markdown:\n"
        +'{"saludo_personalizado":"2 lineas calidas","tips_destino":"3 tips si aplica","gastronomia":"2-3 recs si aplica","actividades":"3 actividades si aplica","clima":"clima esperado si aplica","checklist":"6 items si aplica","cierre":"2 lineas de cierre"}';
      var res  = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,messages:[{role:"user",content:prompt}]})});
      var data = await res.json();
      var txt  = (data.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");
      setAiContent(JSON.parse(txt.replace(/```json|```/g,"").trim()));
      setGenerated(true);
    } catch(e) {
      setAiContent({saludo_personalizado:"Contenido AI  -  conecta la API key para activar.",cierre:"Hasta pronto en los hoteles!"});
      setGenerated(true);
    }
    setLoading(false);
  }

  var htmlSrc = generated && aiContent ? buildEmailHtml(auto, aiContent, "{{nombre}}", destino) : "";

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={Object.assign({},S.mbox,{maxWidth:"960px"})} onClick={function(e){e.stopPropagation();}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px"}}>
          <div>
            <div style={{fontSize:"16px",fontWeight:"700",color:"#1a1f2e"}}>Vista previa &mdash; {auto.name}</div>
            <div style={{fontSize:"11px",color:"#9ca3af",marginTop:"2px"}}>{trig.label} &mdash; {CHANNELS[auto.channel]&&CHANNELS[auto.channel].label}</div>
          </div>
          <button style={btnS("ghost")} onClick={onClose}>X</button>
        </div>

        <div style={{padding:"10px 14px",background:"#f9fafb",border:"1px solid #e3e6ea",borderRadius:"10px",marginBottom:"16px",display:"flex",gap:"12px",flexWrap:"wrap",alignItems:"center"}}>
          <div style={{display:"flex",gap:"8px",flex:1,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{minWidth:"140px"}}>
              <div style={S.label}>Destino</div>
              <select style={Object.assign({},S.sel,{padding:"6px 10px"})} value={destino} onChange={function(e){setDestino(e.target.value);setGenerated(false);}}>
                {["Cancun","Los Cabos","Riviera Maya","Puerto Vallarta","Huatulco","Las Vegas","Orlando"].map(function(d){return <option key={d} value={d}>{d}</option>;})}
              </select>
            </div>
            <div style={{minWidth:"120px"}}>
              <div style={S.label}>Perfil</div>
              <select style={Object.assign({},S.sel,{padding:"6px 10px"})} value={perfil} onChange={function(e){setPerfil(e.target.value);setGenerated(false);}}>
                <option value="pareja">Pareja</option>
                <option value="soltero">Soltero/a</option>
                <option value="familia">Familia</option>
              </select>
            </div>
            <button style={btnS("violet")} onClick={generateAI} disabled={loading}>
              {loading?"Generando...":"Generar con AI"}
            </button>
            {generated&&<span style={{fontSize:"11px",color:EMERALD}}>Contenido listo</span>}
          </div>
          {generated&&(
            <div style={{display:"flex",gap:"4px"}}>
              <button style={tabS(viewMode==="ai",VIOLET)} onClick={function(){setViewMode("ai");}}>Bloques AI</button>
              <button style={tabS(viewMode==="html",INDIGO)} onClick={function(){setViewMode("html");}}>Preview HTML</button>
            </div>
          )}
        </div>

        {!generated&&!loading&&(
          <div style={{padding:"60px 40px",textAlign:"center",background:"rgba(139,92,246,0.04)",borderRadius:"12px",border:"1px dashed rgba(139,92,246,0.2)"}}>
            <div style={{fontSize:"32px",marginBottom:"12px"}}>AI</div>
            <div style={{fontSize:"13px",color:"#9ca3af",maxWidth:"360px",margin:"0 auto",lineHeight:1.7}}>Selecciona destino y perfil, luego genera el contenido AI personalizado para ver la preview completa del email.</div>
          </div>
        )}
        {loading&&(
          <div style={{padding:"60px",textAlign:"center",background:"rgba(139,92,246,0.04)",borderRadius:"12px",border:"1px dashed rgba(139,92,246,0.2)"}}>
            <div style={{fontSize:"14px",color:VIOLET,fontWeight:"600"}}>Claude generando contenido...</div>
          </div>
        )}

        {generated&&aiContent&&viewMode==="ai"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
            <div>
              <div style={S.stit}>Modulos AI activos</div>
              {Object.entries(aiContent).map(function(entry){
                var key=entry[0]; var val=entry[1];
                if(!val) return null;
                return (
                  <div key={key} style={{marginBottom:"10px",padding:"10px 12px",borderRadius:"8px",background:"#fafbfc",border:"1px solid #e3e6ea"}}>
                    <div style={{fontSize:"10px",fontWeight:"700",color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"4px"}}>{key.replace(/_/g," ")}</div>
                    <div style={{fontSize:"12px",color:"#c4c9d4",lineHeight:1.6}}>{val}</div>
                  </div>
                );
              })}
            </div>
            <div>
              <div style={S.stit}>Features AI configurados</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginBottom:"12px"}}>
                {auto.aiFeatures.map(function(f){
                  var feat=AI_FEATURES.find(function(x){return x.id===f;});
                  return feat?(
                    <span key={f} style={{padding:"4px 10px",borderRadius:"20px",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.25)",fontSize:"11px",color:VIOLET,fontWeight:"600"}}>{feat.label}</span>
                  ):null;
                })}
              </div>
              <div style={{padding:"10px 14px",background:"#f9fafb",borderRadius:"10px",border:"1px solid #e3e6ea",fontSize:"11px",color:"#9ca3af",lineHeight:1.7}}>
                Cambia a "Preview HTML" para ver el render final del email tal como lo recibira el cliente.
              </div>
            </div>
          </div>
        )}

        {generated&&aiContent&&viewMode==="html"&&(
          <div>
            <div style={S.stit}>Preview HTML del email &mdash; {destino} / {perfil}</div>
            <div style={{borderRadius:"12px",overflow:"hidden",border:"1px solid #d8dbe0"}}>
              <iframe
                srcDoc={htmlSrc}
                style={{width:"100%",height:"520px",border:"none",background:"#07090f"}}
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
            <div style={{marginTop:"8px",fontSize:"10px",color:"#b0b8c4",textAlign:"center"}}>Render real del HTML que se enviara via Resend</div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// EDITOR DE AUTOMATIZACION (con tab HTML)
// =====================================================================
function AutoEditor(props) {
  var auto=props.auto; var onClose=props.onClose; var onSave=props.onSave;
  var isNew = !auto;
  var [name,       setName]       = useState(auto?auto.name:"");
  var [triggerId,  setTriggerId]  = useState(auto?auto.triggerId:"venta_convertida");
  var [channel,    setChannel]    = useState(auto?auto.channel:"email");
  var [aiFeats,    setAiFeats]    = useState(auto?auto.aiFeatures:[]);
  var [subject,    setSubject]    = useState(auto?auto.subject||"":"");
  var [bodyText,   setBodyText]   = useState(auto?auto.body||"":"");
  var [htmlTpl,    setHtmlTpl]    = useState(auto?auto.htmlTemplate||"":"");
  var [activeTab,  setActiveTab]  = useState("config");
  var [htmlMode,   setHtmlMode]   = useState("editor"); // "editor"|"preview"

  function toggleFeat(f) { setAiFeats(function(p){return p.indexOf(f)!==-1?p.filter(function(x){return x!==f;}):[].concat(p,[f]);}); }
  var trigger = TRIGGERS[triggerId]||{};

  function handleSave() {
    if (!name||!triggerId) return;
    onSave({
      id:auto?auto.id:("A"+Date.now()),
      name:name, triggerId:triggerId, channel:channel,
      aiFeatures:aiFeats, subject:subject, body:bodyText,
      htmlTemplate:htmlTpl,
      active:auto?auto.active:true,
      sentCount:auto?auto.sentCount:0, openRate:auto?auto.openRate:0,
      clickRate:auto?auto.clickRate:0, convRate:auto?auto.convRate:0,
      lastSent:auto?auto.lastSent:"--"
    });
    onClose();
  }

  var defaultHtml = htmlTpl||buildEmailHtml({name:name||"Automatizacion",triggerId:triggerId},null,"{{nombre}}","{{destino}}");

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={Object.assign({},S.mbox,{maxWidth:"860px"})} onClick={function(e){e.stopPropagation();}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <div style={{fontSize:"16px",fontWeight:"700",color:"#1a1f2e"}}>{isNew?"Nueva automatizacion":"Editar automatizacion"}</div>
          <button style={btnS("ghost")} onClick={onClose}>X</button>
        </div>

        <div style={{display:"flex",gap:"4px",marginBottom:"20px",borderBottom:"1px solid #e8eaed",paddingBottom:"12px"}}>
          {[["config","Configuracion"],["template","Plantilla texto"],["html","HTML editor"],["ai","Modulos AI"]].map(function(t){
            return <button key={t[0]} style={tabS(activeTab===t[0])} onClick={function(){setActiveTab(t[0]);}}>{t[1]}</button>;
          })}
        </div>

        {activeTab==="config"&&(
          <div>
            <div style={{marginBottom:"14px"}}>
              <label style={S.label}>Nombre de la automatizacion *</label>
              <input style={S.inp} placeholder="Ej: Bienvenida al club" value={name} onChange={function(e){setName(e.target.value);}}/>
            </div>
            <div style={Object.assign({},S.g2,{marginBottom:"14px"})}>
              <div>
                <label style={S.label}>Trigger (evento)</label>
                <select style={S.sel} value={triggerId} onChange={function(e){setTriggerId(e.target.value);}}>
                  {Object.values(TRIGGERS).map(function(t){ return <option key={t.id} value={t.id}>{t.label}</option>; })}
                </select>
              </div>
              <div>
                <label style={S.label}>Canal de envio</label>
                <select style={S.sel} value={channel} onChange={function(e){setChannel(e.target.value);}}>
                  {Object.entries(CHANNELS).map(function(entry){ return <option key={entry[0]} value={entry[0]}>{entry[1].label}</option>; })}
                </select>
              </div>
            </div>
            {trigger&&trigger.label&&(
              <div style={{padding:"12px 16px",borderRadius:"10px",background:(trigger.color||INDIGO)+"10",border:"1px solid "+(trigger.color||INDIGO)+"30"}}>
                <div style={{fontSize:"12px",color:trigger.color||INDIGO,fontWeight:"700"}}>{trigger.label}</div>
                <div style={{fontSize:"11px",color:"#9ca3af",marginTop:"3px"}}>Timing: {trigger.timing} &mdash; Categoria: {CATEGORIES[trigger.category]&&CATEGORIES[trigger.category].label}</div>
              </div>
            )}
          </div>
        )}

        {activeTab==="template"&&(
          <div>
            <div style={{marginBottom:"12px"}}>
              <label style={S.label}>Asunto del email</label>
              <input style={S.inp} placeholder="Ej: Bienvenido, {{nombre}}!" value={subject} onChange={function(e){setSubject(e.target.value);}}/>
              <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"4px"}}>Variables: {"{{nombre}}"} {"{{destino}}"} {"{{hotel}}"} {"{{fecha_checkin}}"} {"{{num_confirmacion}}"}</div>
            </div>
            <div>
              <label style={S.label}>Cuerpo del mensaje (texto plano / WA)</label>
              <textarea style={Object.assign({},S.inp,{minHeight:"220px",resize:"vertical",lineHeight:1.7})}
                placeholder={"Hola {{nombre}},\n\nEscribe el contenido base del mensaje...\n\n{{ai_tips_destino}}\n\n{{ai_checklist}}"}
                value={bodyText} onChange={function(e){setBodyText(e.target.value);}}/>
              <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"4px"}}>{"{{ai_*}}"} se reemplaza con contenido AI generado</div>
            </div>
          </div>
        )}

        {activeTab==="html"&&(
          <div>
            <div style={{display:"flex",gap:"4px",marginBottom:"12px",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"12px",color:"#9ca3af"}}>Editor HTML del email &mdash; usa las variables {"{{nombre}}"}, {"{{destino}}"}, {"{{ai_*}}"}</div>
              <div style={{display:"flex",gap:"4px"}}>
                <button style={tabS(htmlMode==="editor",INDIGO)} onClick={function(){setHtmlMode("editor");}}>Editor</button>
                <button style={tabS(htmlMode==="preview",VIOLET)} onClick={function(){setHtmlMode("preview");}}>Preview</button>
              </div>
            </div>
            {htmlMode==="editor"&&(
              <div>
                <textarea
                  style={Object.assign({},S.inp,{minHeight:"320px",resize:"vertical",lineHeight:1.6,fontFamily:"'Fira Code','Consolas',monospace",fontSize:"11px"})}
                  value={htmlTpl}
                  onChange={function(e){setHtmlTpl(e.target.value);}}
                  placeholder="Pega o escribe el HTML del email aqui. Si lo dejas vacio se usa el template generado automaticamente."
                  spellCheck={false}
                />
                <div style={{display:"flex",gap:"8px",marginTop:"8px"}}>
                  <button style={btnS("ghost")} onClick={function(){setHtmlTpl(defaultHtml);}}>Cargar template auto</button>
                  <button style={btnS("danger")} onClick={function(){setHtmlTpl("");}}>Limpiar</button>
                </div>
              </div>
            )}
            {htmlMode==="preview"&&(
              <div style={{borderRadius:"12px",overflow:"hidden",border:"1px solid #d8dbe0"}}>
                <iframe
                  srcDoc={htmlTpl||defaultHtml}
                  style={{width:"100%",height:"420px",border:"none",background:"#07090f"}}
                  title="HTML preview"
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>
        )}

        {activeTab==="ai"&&(
          <div>
            <div style={{padding:"12px 16px",borderRadius:"10px",background:"rgba(139,92,246,0.06)",border:"1px solid rgba(139,92,246,0.2)",marginBottom:"16px",fontSize:"12px",color:"#6b7280",lineHeight:1.6}}>
              Selecciona que modulos AI se activan. Claude generara contenido dinamico personalizado por destino, perfil y fechas.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
              {AI_FEATURES.map(function(f){
                var active=aiFeats.indexOf(f.id)!==-1;
                return (
                  <div key={f.id} onClick={function(){toggleFeat(f.id);}}
                    style={{padding:"12px 14px",borderRadius:"12px",cursor:"pointer",border:"2px solid "+(active?"rgba(139,92,246,0.5)":"#f0f1f4"),background:active?"rgba(139,92,246,0.1)":"#fafbfc",transition:"all 0.15s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:active?VIOLET:"#6b7280"}}>{f.label}</div>
                      {active&&<span style={{marginLeft:"auto",fontSize:"12px",color:VIOLET,fontWeight:"700"}}>OK</span>}
                    </div>
                    <div style={{fontSize:"11px",color:"#9ca3af",lineHeight:1.5}}>{f.desc}</div>
                  </div>
                );
              })}
            </div>
            {aiFeats.length===0&&<div style={{marginTop:"12px",padding:"10px",borderRadius:"8px",background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)",fontSize:"11px",color:AMBER}}>Sin modulos AI &mdash; se usara solo la plantilla base</div>}
          </div>
        )}

        <div style={{marginTop:"20px",display:"flex",gap:"8px",justifyContent:"flex-end"}}>
          <button style={btnS("ghost")} onClick={onClose}>Cancelar</button>
          <button style={btnS("primary")} onClick={handleSave} disabled={!name}>Guardar automatizacion</button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// DASHBOARD DE SALUD
// =====================================================================
function DashboardSalud(props) {
  var automations=props.automations; var logs=props.logs;

  var activas    = automations.filter(function(a){return a.active;}).length;
  var totalSent  = automations.reduce(function(s,a){return s+a.sentCount;},0);
  var avgOpen    = automations.length>0 ? automations.reduce(function(s,a){return s+(a.openRate||0);},0)/automations.length : 0;
  var avgClick   = automations.length>0 ? automations.reduce(function(s,a){return s+(a.clickRate||0);},0)/automations.length : 0;
  var avgConv    = automations.length>0 ? automations.reduce(function(s,a){return s+(a.convRate||0);},0)/automations.length : 0;
  var aiCount    = automations.filter(function(a){return a.aiFeatures.length>0;}).length;

  var topOpen  = [].concat(automations).sort(function(a,b){return (b.openRate||0)-(a.openRate||0);}).slice(0,3);
  var lowPerf  = automations.filter(function(a){return a.active&&(a.openRate||0)<0.45;});

  var logsHoy  = logs.filter(function(l){return l.sentAt&&l.sentAt.startsWith("2026-03-09");});
  var statusMap= {};
  logs.forEach(function(l){ statusMap[l.status]=(statusMap[l.status]||0)+1; });

  function SC(sprops) {
    return (
      <div style={{flex:1,minWidth:"100px",padding:"14px 16px",borderRadius:"12px",background:sprops.color+"09",border:"1px solid "+sprops.color+"20"}}>
        <div style={{fontSize:"9px",fontWeight:"700",color:sprops.color,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"3px"}}>{sprops.label}</div>
        <div style={{fontSize:"22px",fontWeight:"800",color:sprops.color,lineHeight:1}}>{sprops.val}</div>
        {sprops.sub&&<div style={{fontSize:"10px",color:sprops.color,opacity:0.6,marginTop:"2px"}}>{sprops.sub}</div>}
      </div>
    );
  }

  function MiniBar(bprops) {
    var v=Math.min(1,bprops.v||0);
    return (
      <div style={{marginBottom:"8px"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
          <span style={{fontSize:"11px",color:"#6b7280",maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bprops.label}</span>
          <span style={{fontSize:"11px",fontWeight:"700",color:bprops.color||INDIGO}}>{pct(v)}</span>
        </div>
        <div style={{height:"4px",borderRadius:"2px",background:"#f8f9fb"}}>
          <div style={{height:"4px",borderRadius:"2px",width:pct(v),background:bprops.color||INDIGO}}/>
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:"20px 24px"}}>
      <div style={{marginBottom:"8px",fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>Dashboard de salud del journey</div>
      <div style={{fontSize:"11px",color:"#9ca3af",marginBottom:"20px"}}>Resumen global de todas las automatizaciones activas</div>

      <div style={{display:"flex",gap:"10px",flexWrap:"wrap",marginBottom:"20px"}}>
        <SC label="Activas"       val={activas+"/"+automations.length} color={EMERALD} sub="automatizaciones"/>
        <SC label="Total enviados" val={fmtN(totalSent)}               color={INDIGO}  sub="mensajes"/>
        <SC label="Tasa apertura" val={pct(avgOpen)}                   color={metricColor(avgOpen,0.65,0.45)} sub="promedio"/>
        <SC label="Tasa clicks"   val={pct(avgClick)}                  color={metricColor(avgClick,0.4,0.25)} sub="promedio"/>
        <SC label="Conversiones"  val={pct(avgConv)}                   color={VIOLET}  sub="promedio"/>
        <SC label="Con AI"        val={aiCount+"/"+automations.length} color={AMBER}   sub="usan Claude"/>
      </div>

      <div style={Object.assign({},S.g2,{marginBottom:"16px"})}>
        <div style={{background:"#f9fafb",border:"1px solid #e3e6ea",borderRadius:"12px",padding:"16px"}}>
          <div style={S.stit}>Top aperturas</div>
          {topOpen.map(function(a){
            return <MiniBar key={a.id} label={a.name} v={a.openRate} color={metricColor(a.openRate,0.65,0.45)}/>;
          })}
        </div>
        <div style={{background:"#f9fafb",border:"1px solid #e3e6ea",borderRadius:"12px",padding:"16px"}}>
          <div style={S.stit}>Top conversiones</div>
          {[].concat(automations).sort(function(a,b){return (b.convRate||0)-(a.convRate||0);}).slice(0,3).map(function(a){
            return <MiniBar key={a.id} label={a.name} v={a.convRate} color={VIOLET}/>;
          })}
        </div>
      </div>

      <div style={Object.assign({},S.g2,{marginBottom:"16px"})}>
        <div style={{background:"#f9fafb",border:"1px solid #e3e6ea",borderRadius:"12px",padding:"16px"}}>
          <div style={S.stit}>Estado de envios (log)</div>
          {Object.entries(statusMap).map(function(entry){
            var st=entry[0]; var n=entry[1];
            var sc={abierto:EMERALD,enviado:BLUE,entregado:TEAL,rebotado:ROSE};
            return (
              <div key={st} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"7px"}}>
                <span style={{fontSize:"12px",color:"#6b7280",textTransform:"capitalize"}}>{st}</span>
                <span style={{fontSize:"13px",fontWeight:"700",color:sc[st]||"#9ca3af"}}>{n}</span>
              </div>
            );
          })}
          <div style={{marginTop:"8px",paddingTop:"8px",borderTop:"1px solid #e3e6ea",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:"11px",color:"#9ca3af"}}>Hoy (09/03)</span>
            <span style={{fontSize:"12px",fontWeight:"700",color:INDIGO}}>{logsHoy.length} envios</span>
          </div>
        </div>
        <div style={{background:"#f9fafb",border:"1px solid #e3e6ea",borderRadius:"12px",padding:"16px"}}>
          <div style={S.stit}>Alertas de rendimiento</div>
          {lowPerf.length===0&&(
            <div style={{fontSize:"12px",color:EMERALD,padding:"8px 0"}}>Todas las automatizaciones activas tienen buen rendimiento.</div>
          )}
          {lowPerf.map(function(a){
            return (
              <div key={a.id} style={{padding:"8px 10px",borderRadius:"8px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",marginBottom:"6px"}}>
                <div style={{fontSize:"11px",fontWeight:"700",color:AMBER}}>{a.name}</div>
                <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"2px"}}>Apertura {pct(a.openRate)} &mdash; revisa asunto y horario</div>
              </div>
            );
          })}
          <div style={{marginTop:"10px",padding:"8px 10px",borderRadius:"8px",background:"rgba(99,102,241,0.06)",border:"1px solid rgba(99,102,241,0.15)"}}>
            <div style={{fontSize:"10px",color:"#1565c0",fontWeight:"700",marginBottom:"2px"}}>Canales</div>
            {["email","whatsapp","ambos"].map(function(ch){
              var cnt=automations.filter(function(a){return a.channel===ch;}).length;
              return <div key={ch} style={{fontSize:"11px",color:"#9ca3af",display:"flex",justifyContent:"space-between"}}><span>{CHANNELS[ch]&&CHANNELS[ch].label}</span><span style={{fontWeight:"700",color:INDIGO}}>{cnt}</span></div>;
            })}
          </div>
        </div>
      </div>

      <div style={{background:"#f9fafb",border:"1px solid #e3e6ea",borderRadius:"12px",padding:"16px"}}>
        <div style={S.stit}>Funnel global del journey</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"2px",alignItems:"end",height:"80px",marginBottom:"8px"}}>
          {[
            {label:"Enviados", v:1,        color:INDIGO},
            {label:"Abiertos", v:avgOpen,  color:EMERALD},
            {label:"Clicks",   v:avgClick, color:AMBER},
            {label:"Conv.",    v:avgConv,  color:VIOLET},
            {label:"AI-gen.",  v:aiCount/Math.max(automations.length,1), color:TEAL},
          ].map(function(b){
            return (
              <div key={b.label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px"}}>
                <div style={{width:"100%",background:b.color,borderRadius:"4px 4px 0 0",height:Math.max(8,Math.round(b.v*72))+"px",transition:"height 0.4s"}}/>
                <div style={{fontSize:"9px",color:"#9ca3af",textAlign:"center"}}>{b.label}</div>
                <div style={{fontSize:"10px",fontWeight:"700",color:b.color}}>{pct(b.v)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// JOURNEY VIEW
// =====================================================================
function JourneyView(props) {
  var automations=props.automations; var onEdit=props.onEdit; var onToggle=props.onToggle;
  var phases = [
    {phase:"Onboarding", color:EMERALD, ids:["venta_convertida","post_compra_24h"]},
    {phase:"Retencion",  color:AMBER,   ids:["sin_reservar_30d"]},
    {phase:"Reserva",    color:INDIGO,  ids:["solicitud_creada","reserva_confirmada"]},
    {phase:"Pre-Viaje",  color:VIOLET,  ids:["pre_viaje_15d","pre_viaje_7d","dia_anterior"]},
    {phase:"Post-Viaje", color:ROSE,    ids:["post_checkout"]},
    {phase:"Soporte",    color:TEAL,    ids:["post_llamada"]},
  ];
  return (
    <div style={{padding:"20px 24px"}}>
      {phases.map(function(ph,pi){
        var phAutos = automations.filter(function(a){ return ph.ids.indexOf(a.triggerId)!==-1; });
        return (
          <div key={ph.phase} style={{marginBottom:"16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
              <div style={{width:"12px",height:"12px",borderRadius:"50%",background:ph.color,flexShrink:0}}/>
              <div style={{fontSize:"13px",fontWeight:"700",color:ph.color}}>{ph.phase}</div>
              <div style={{flex:1,height:"1px",background:ph.color+"20"}}/>
              <div style={{fontSize:"11px",color:"#9ca3af"}}>{phAutos.filter(function(a){return a.active;}).length}/{phAutos.length} activas</div>
            </div>
            {phAutos.length===0&&(
              <div style={{padding:"12px 16px",borderRadius:"10px",background:"#f9fafb",border:"1px dashed rgba(255,255,255,0.07)",fontSize:"12px",color:"#b0b8c4",textAlign:"center"}}>Sin automatizaciones en esta fase</div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"8px"}}>
              {phAutos.map(function(a){
                var trig=TRIGGERS[a.triggerId]||{};
                return (
                  <div key={a.id} style={{padding:"12px 14px",borderRadius:"10px",background:a.active?"#f9fafb":"rgba(255,255,255,0.015)",border:"1px solid "+(a.active?ph.color+"30":"#f4f5f7"),opacity:a.active?1:0.55}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"6px"}}>
                      <div style={{fontSize:"12px",fontWeight:"700",color:"#3d4554"}}>{a.name}</div>
                      {a.aiFeatures.length>0&&<span style={{fontSize:"9px",padding:"1px 6px",borderRadius:"20px",background:"rgba(139,92,246,0.15)",color:VIOLET,fontWeight:"700"}}>AI</span>}
                    </div>
                    <div style={{fontSize:"10px",color:"#9ca3af",marginBottom:"8px"}}>{trig.label} &mdash; {trig.timing}</div>
                    <div style={{display:"flex",gap:"6px",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{display:"flex",gap:"10px"}}>
                        <span style={{fontSize:"11px",color:metricColor(a.openRate,0.65,0.45),fontWeight:"600"}}>{pct(a.openRate)} open</span>
                        <span style={{fontSize:"11px",color:VIOLET,fontWeight:"600"}}>{pct(a.convRate)} conv</span>
                      </div>
                      <div style={{display:"flex",gap:"4px"}}>
                        <button style={Object.assign({},btnS("ghost"),{padding:"3px 7px",fontSize:"10px"})} onClick={function(){onEdit(a);}}>Editar</button>
                        <button style={Object.assign({},btnS(a.active?"warn":"success"),{padding:"3px 7px",fontSize:"10px"})} onClick={function(){onToggle(a.id);}}>{a.active?"Pausar":"Activar"}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
// LOG VIEW
// =====================================================================
function LogView(props) {
  var automations=props.automations; var logs=props.logs;
  var [search, setSearch] = useState("");
  var filtered = logs.filter(function(l){
    if(!search) return true;
    return l.cliente.toLowerCase().indexOf(search.toLowerCase())!==-1 || l.destino.toLowerCase().indexOf(search.toLowerCase())!==-1;
  });
  var sc={abierto:EMERALD,enviado:BLUE,entregado:TEAL,rebotado:ROSE,enviado_prueba:AMBER};
  return (
    <div style={{padding:"20px 24px"}}>
      <div style={{display:"flex",gap:"8px",marginBottom:"14px"}}>
        <input style={Object.assign({},S.inp,{flex:1})} value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="Buscar por cliente o destino..."/>
        <div style={{fontSize:"12px",color:"#9ca3af",alignSelf:"center",whiteSpace:"nowrap"}}>{filtered.length} registros</div>
      </div>
      <div style={{background:"#f9fafb",borderRadius:"12px",border:"1px solid #e3e6ea",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.5fr 1.5fr 1fr 80px 90px 80px 60px",padding:"7px 16px",borderBottom:"1px solid #e8eaed",fontSize:"10px",fontWeight:"700",color:"#b0b8c4",textTransform:"uppercase",letterSpacing:"0.07em"}}>
          <div>Automatizacion</div><div>Cliente</div><div>Destino</div><div>Canal</div><div>Fecha</div><div>Estado</div><div>AI</div>
        </div>
        {filtered.length===0&&<div style={{padding:"32px",textAlign:"center",fontSize:"12px",color:"#9ca3af"}}>Sin registros</div>}
        {filtered.map(function(l,idx){
          var aName = (automations.find(function(a){return a.id===l.autoId;})||{}).name||l.autoId;
          return (
            <div key={l.id} style={{display:"grid",gridTemplateColumns:"1.5fr 1.5fr 1fr 80px 90px 80px 60px",padding:"9px 16px",borderBottom:"1px solid rgba(255,255,255,0.03)",background:idx%2===0?"rgba(255,255,255,0.01)":"transparent",alignItems:"center"}}>
              <div style={{fontSize:"12px",color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{aName}</div>
              <div style={{fontSize:"12px",color:"#3d4554",fontWeight:"500"}}>{l.cliente}</div>
              <div style={{fontSize:"11px",color:"#9ca3af"}}>{l.destino}</div>
              <div style={{fontSize:"11px",color:"#9ca3af"}}>{l.channel}</div>
              <div style={{fontSize:"11px",color:"#9ca3af"}}>{l.sentAt.slice(5)}</div>
              <div><span style={{fontSize:"10px",fontWeight:"700",color:sc[l.status]||"#9ca3af",background:(sc[l.status]||"#9ca3af")+"15",padding:"1px 7px",borderRadius:"20px",border:"1px solid "+(sc[l.status]||"#9ca3af")+"25"}}>{l.status}</span></div>
              <div style={{fontSize:"10px",color:l.aiGenerated?VIOLET:"#b0b8c4",fontWeight:"600"}}>{l.aiGenerated?"AI":"-"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================================
// ROOT
// =====================================================================
export default function AutomationsModule() {
  var [automations, setAutomations] = useState(INITIAL_AUTOMATIONS);
  var [logs,        setLogs]        = useState(SEND_LOG);
  var [tab,         setTab]         = useState("dashboard");
  var [filterCat,   setFilterCat]   = useState("all");
  var [editor,      setEditor]      = useState(null);
  var [editorNew,   setEditorNew]   = useState(false);
  var [preview,     setPreview]     = useState(null);
  var [testModal,   setTestModal]   = useState(null);
  var [statsModal,  setStatsModal]  = useState(null);
  var [toast,       setToast]       = useState(null);

  function notify(m) { setToast(m); setTimeout(function(){setToast(null);},3000); }
  function toggleAuto(id) { setAutomations(function(p){return p.map(function(a){return a.id===id?Object.assign({},a,{active:!a.active}):a;});}); notify("Estado actualizado"); }
  function saveAuto(a) {
    setAutomations(function(p){ return editorNew?[].concat(p,[a]):p.map(function(x){return x.id===a.id?a:x;}); });
    notify(editorNew?"Automatizacion creada":"Cambios guardados");
  }
  function deleteAuto(id) { setAutomations(function(p){return p.filter(function(a){return a.id!==id;});}); notify("Eliminada"); }
  function addLog(l) { setLogs(function(p){return [{id:"L"+uid()},Object.assign(l)].concat(p);}); }

  var filtered = automations.filter(function(a){ return filterCat==="all"||TRIGGERS[a.triggerId]&&TRIGGERS[a.triggerId].category===filterCat; });
  var totalSent  = automations.reduce(function(s,a){return s+a.sentCount;},0);
  var activeCount= automations.filter(function(a){return a.active;}).length;
  var avgOpen    = automations.length>0?automations.reduce(function(s,a){return s+(a.openRate||0);},0)/automations.length:0;
  var aiCount    = automations.filter(function(a){return a.aiFeatures.length>0;}).length;

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.bar}>
        <div style={{fontSize:"12px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.12em",textTransform:"uppercase"}}>Mini-Vac CRM</div>
        <div style={{width:"1px",height:"16px",background:"#f2f3f6"}}/>
        <div style={{fontSize:"14px",fontWeight:"600",color:VIOLET}}>Automatizaciones</div>
        <div style={{flex:1}}/>
        <div style={{display:"flex",gap:"4px"}}>
          {[["dashboard","Dashboard"],["lista","Lista"],["journey","Journey"],["log","Log"]].map(function(t){
            return <button key={t[0]} style={tabS(tab===t[0])} onClick={function(){setTab(t[0]);}}>{t[1]}</button>;
          })}
        </div>
        <button style={Object.assign({},btnS("primary"),{marginLeft:"8px"})} onClick={function(){setEditor({});setEditorNew(true);}}>+ Nueva</button>
      </div>

      {/* Stats bar */}
      <div style={{padding:"10px 24px",borderBottom:"1px solid #e8eaed",display:"flex",gap:"8px",flexWrap:"wrap"}}>
        {[
          {label:"Activas",     val:activeCount,                     color:EMERALD},
          {label:"Enviados",    val:fmtN(totalSent),                 color:INDIGO},
          {label:"Apertura avg",val:pct(avgOpen),                    color:AMBER},
          {label:"Con AI",      val:aiCount+"/"+automations.length,  color:VIOLET},
          {label:"Log hoy",     val:String(logs.filter(function(l){return l.sentAt&&l.sentAt.startsWith("2026-03-09");}).length), color:TEAL},
        ].map(function(s){
          return (
            <div key={s.label} style={{padding:"6px 14px",borderRadius:"8px",background:s.color+"10",border:"1px solid "+s.color+"25",display:"flex",gap:"7px",alignItems:"center"}}>
              <span style={{fontSize:"15px",fontWeight:"800",color:s.color}}>{s.val}</span>
              <span style={{fontSize:"11px",color:"#9ca3af"}}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* DASHBOARD */}
      {tab==="dashboard"&&<DashboardSalud automations={automations} logs={logs}/>}

      {/* LISTA */}
      {tab==="lista"&&(
        <div style={{padding:"20px 24px"}}>
          <div style={{display:"flex",gap:"6px",marginBottom:"16px",flexWrap:"wrap"}}>
            <button style={tabS(filterCat==="all")} onClick={function(){setFilterCat("all");}}>Todas ({automations.length})</button>
            {Object.entries(CATEGORIES).map(function(entry){
              var k=entry[0]; var v=entry[1];
              var cnt=automations.filter(function(a){return TRIGGERS[a.triggerId]&&TRIGGERS[a.triggerId].category===k;}).length;
              return <button key={k} style={tabS(filterCat===k,v.color)} onClick={function(){setFilterCat(k);}}>{v.label} ({cnt})</button>;
            })}
          </div>
          <div style={{display:"grid",gap:"8px"}}>
            {filtered.map(function(a){
              var trig=TRIGGERS[a.triggerId]||{}; var cat=CATEGORIES[trig.category]||{};
              return (
                <div key={a.id} style={{display:"grid",gridTemplateColumns:"3fr 120px 80px 80px 80px 80px auto",gap:"10px",alignItems:"center",padding:"13px 18px",borderRadius:"12px",background:a.active?"#f9fafb":"rgba(255,255,255,0.01)",border:"1px solid "+(a.active?"#f0f1f4":"#f8f9fb"),opacity:a.active?1:0.65}}>
                  <div>
                    <div style={{display:"flex",gap:"6px",alignItems:"center",marginBottom:"2px"}}>
                      <div style={{fontSize:"13px",fontWeight:"700",color:a.active?"#1a1f2e":"#9ca3af"}}>{a.name}</div>
                      {a.aiFeatures.length>0&&<span style={{fontSize:"9px",padding:"1px 6px",borderRadius:"20px",background:"rgba(139,92,246,0.15)",color:VIOLET,fontWeight:"700"}}>AI</span>}
                    </div>
                    <div style={{fontSize:"11px",color:"#9ca3af"}}>{trig.label} &mdash; {trig.timing} &mdash; {CHANNELS[a.channel]&&CHANNELS[a.channel].label}</div>
                  </div>
                  <div>
                    <span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"20px",background:cat.color?cat.color+"15":"transparent",color:cat.color||"#9ca3af",border:"1px solid "+(cat.color||"#9ca3af")+"30",fontWeight:"600"}}>{cat.label||"-"}</span>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:"#3d4554"}}>{fmtN(a.sentCount)}</div>
                    <div style={{fontSize:"10px",color:"#9ca3af"}}>enviados</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:metricColor(a.openRate,0.65,0.45)}}>{pct(a.openRate)}</div>
                    <div style={{fontSize:"10px",color:"#9ca3af"}}>apertura</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:metricColor(a.clickRate,0.4,0.25)}}>{pct(a.clickRate)}</div>
                    <div style={{fontSize:"10px",color:"#9ca3af"}}>clicks</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"12px",fontWeight:"700",color:VIOLET}}>{pct(a.convRate)}</div>
                    <div style={{fontSize:"10px",color:"#9ca3af"}}>conv.</div>
                  </div>
                  <div style={{display:"flex",gap:"3px",flexWrap:"wrap",justifyContent:"flex-end"}}>
                    <button style={Object.assign({},btnS("ghost"),{padding:"4px 7px",fontSize:"11px"})} onClick={function(){setPreview(a);}} title="Preview">Ver</button>
                    <button style={Object.assign({},btnS("teal"),{padding:"4px 7px",fontSize:"11px"})} onClick={function(){setStatsModal(a);}} title="Stats">Stats</button>
                    <button style={Object.assign({},btnS("emerald"),{padding:"4px 7px",fontSize:"11px"})} onClick={function(){setTestModal(a);}} title="Enviar prueba">Test</button>
                    <button style={Object.assign({},btnS("ghost"),{padding:"4px 7px",fontSize:"11px"})} onClick={function(){setEditor(a);setEditorNew(false);}} title="Editar">Editar</button>
                    <button style={Object.assign({},btnS(a.active?"warn":"success"),{padding:"4px 7px",fontSize:"11px"})} onClick={function(){toggleAuto(a.id);}}>{a.active?"Pausar":"Activar"}</button>
                    <button style={Object.assign({},btnS("danger"),{padding:"4px 7px",fontSize:"11px"})} onClick={function(){deleteAuto(a.id);}}>Borrar</button>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length===0&&(
            <div style={{padding:"40px",textAlign:"center",background:"#f9fafb",borderRadius:"12px",border:"1px solid #e3e6ea"}}>
              <div style={{fontSize:"13px",color:"#9ca3af",marginBottom:"12px"}}>Sin automatizaciones en esta categoria</div>
              <button style={btnS("primary")} onClick={function(){setEditor({});setEditorNew(true);}}>+ Crear primera automatizacion</button>
            </div>
          )}
        </div>
      )}

      {tab==="journey"&&<JourneyView automations={automations} onEdit={function(a){setEditor(a);setEditorNew(false);setTab("lista");}} onToggle={toggleAuto}/>}
      {tab==="log"&&<LogView automations={automations} logs={logs}/>}

      {/* Modals */}
      {preview&&<PreviewModal auto={preview} onClose={function(){setPreview(null);}}/>}
      {statsModal&&<StatsModal auto={statsModal} logs={logs} onClose={function(){setStatsModal(null);}}/>}
      {testModal&&<TestEnvioModal auto={testModal} onClose={function(){setTestModal(null);}} onLog={addLog}/>}
      {editor!==null&&<AutoEditor auto={editorNew?null:editor} onClose={function(){setEditor(null);setEditorNew(false);}} onSave={saveAuto}/>}

      {toast&&(
        <div style={{position:"fixed",bottom:"24px",right:"24px",zIndex:999,padding:"12px 20px",borderRadius:"10px",background:"rgba(16,185,129,0.15)",border:"1px solid rgba(16,185,129,0.3)",color:EMERALD,fontSize:"14px",fontWeight:"600",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>{toast}</div>
      )}
    </div>
  );
}
