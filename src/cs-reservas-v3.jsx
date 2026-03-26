import { useState, useMemo, useEffect, useRef } from "react";
import CommPanel, { useCommPanel, CommPanelTrigger } from "./comm-panel";
import { supabase as SB } from "./supabase.js";
import { TablaHistorial } from "./useHistorial.jsx";

// ─────────────────────────────────────────────────────────────
// TEMA ZOHO CLARO — igual que seller / verificador
// ─────────────────────────────────────────────────────────────
var TODAY = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
function uid(){ return Math.random().toString(36).slice(2,10); }
function fmtUSD(n){ return "$"+(Number(n)||0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0}); }
function fmtDate(s){ if(!s) return "--"; var d=new Date(s+"T12:00:00"); return ("0"+(d.getMonth()+1)).slice(-2)+"/"+("0"+d.getDate()).slice(-2)+"/"+d.getFullYear(); }
function daysAgo(n){ var d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split("T")[0]; }
function daysFromNow(n){ var d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; }
function addDays(s,n){ var d=new Date((s||TODAY)+"T12:00:00"); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; }
function daysBetween(a,b){ return Math.max(0,Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/(1000*60*60*24))); }
function daysSince(s){ return Math.floor((Date.now()-new Date((s||TODAY)+"T12:00:00").getTime())/(1000*60*60*24)); }

var GREEN="#1a7f3c"; var AMBER="#925c0a"; var RED="#b91c1c";
var BLUE="#1565c0"; var TEAL="#0ea5a0"; var VIOLET="#7c3aed"; var INDIGO="#3d5bcd";

var EDGE_URL  = "https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/zoho-payments";
var ANON_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";
var AUTH_HDR  = { "Content-Type": "application/json", "Authorization": "Bearer " + ANON_KEY };
var ZOHO_API_KEY = "1003.afb484f19b10b5674c7e6f7c0c0ee5f5.89f010a430837bed480829a015a88641";

var S = {
  wrap:   { background:"#f4f5f7", minHeight:"100vh", fontFamily:"system-ui,'Segoe UI',sans-serif", color:"#1a1f2e", fontSize:"13px" },
  topbar: { background:"#ffffff", borderBottom:"1px solid #e3e6ea", padding:"0 20px", height:52, display:"flex", alignItems:"center", gap:12, flexShrink:0 },
  card:   { background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:10, padding:"14px 16px", marginBottom:10 },
  input:  { width:"100%", background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:8, padding:"9px 12px", color:"#1a1f2e", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  sel:    { width:"100%", background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:8, padding:"9px 12px", color:"#1a1f2e", fontSize:13, outline:"none", cursor:"pointer", fontFamily:"inherit", boxSizing:"border-box" },
  ta:     { width:"100%", background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:8, padding:"9px 12px", color:"#1a1f2e", fontSize:13, outline:"none", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box", minHeight:72 },
  label:  { fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:3, display:"block" },
  stit:   { fontSize:10, fontWeight:700, color:"#9ca3af", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 },
  modal:  { position:"fixed", inset:0, background:"rgba(15,20,30,0.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
  mbox:   { background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:14, padding:28, maxWidth:580, width:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 8px 32px rgba(0,0,0,0.10)" },
  g2:     { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  g3:     { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 },
  bdg:    function(c,bg,br){ return { display:"inline-flex", alignItems:"center", padding:"2px 9px", borderRadius:20, fontSize:10, fontWeight:700, color:c, background:bg, border:"1px solid "+br }; },
  tab:    function(a){ return { padding:"8px 14px", cursor:"pointer", fontSize:12, fontWeight:a?700:500, color:a?BLUE:"#6b7280", background:"none", border:"none", borderBottom:a?"2px solid "+BLUE:"2px solid transparent", transition:"all 0.15s", whiteSpace:"nowrap" }; },
  btn:    function(v){
    var m = {
      primary: {bg:"#1a385a",   c:"#fff",     br:"transparent"},
      success: {bg:"#edf7ee",   c:GREEN,      br:"#a3d9a5"},
      danger:  {bg:"#fef2f2",   c:RED,        br:"#f5b8b8"},
      warn:    {bg:"#fef9e7",   c:AMBER,      br:"#f0d080"},
      ghost:   {bg:"#f4f5f7",   c:"#6b7280",  br:"#e3e6ea"},
      indigo:  {bg:"#e8f0fe",   c:BLUE,       br:"#aac4f0"},
      teal:    {bg:"rgba(14,165,160,0.08)", c:TEAL, br:"rgba(14,165,160,0.3)"},
      violet:  {bg:"#f3e8ff",   c:VIOLET,     br:"#c4b5fd"},
    };
    var s = m[v]||m.ghost;
    return { display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, background:s.bg, color:s.c, border:"1px solid "+s.br, transition:"all 0.15s", whiteSpace:"nowrap" };
  },
};

// ─────────────────────────────────────────────────────────────
// CATÁLOGOS
// ─────────────────────────────────────────────────────────────
var ROLES = {
  cs:        { label:"Customer Service", color:VIOLET,
    permisos:{ verReservas:true, crearReserva:true, modificarReserva:false, cancelarReserva:false, confirmarReserva:false,
               verHistorial:true, crearNota:true, crearCaso:true, crearOperacion:true,
               verFinanciero:true, verContacto:true, iniciarRetencion:true } },
  reservas:  { label:"Reservas", color:TEAL,
    permisos:{ verReservas:true, crearReserva:true, modificarReserva:true, cancelarReserva:true, confirmarReserva:true,
               verHistorial:true, crearNota:true, crearCaso:false, crearOperacion:false,
               verFinanciero:false, verContacto:true, iniciarRetencion:false } },
  supervisor:{ label:"Supervisor", color:AMBER,
    permisos:{ verReservas:true, crearReserva:true, modificarReserva:true, cancelarReserva:true, confirmarReserva:true,
               verHistorial:true, crearNota:true, crearCaso:true, crearOperacion:true,
               verFinanciero:true, verContacto:true, iniciarRetencion:true } },
};

var RES_STATUS = {
  solicitud:       {label:"Solicitud",       color:AMBER,  bg:"rgba(245,158,11,0.08)", br:"rgba(245,158,11,0.3)"},
  vlo_proceso:     {label:"VLO en proceso",  color:BLUE,   bg:"#e8f0fe", br:"#aac4f0"},
  rechazado_hotel: {label:"Rechazado hotel", color:RED,    bg:"#fef2f2", br:"#f5b8b8"},
  confirmada:      {label:"Confirmada",      color:GREEN,  bg:"#edf7ee", br:"#a3d9a5"},
  cancelada:       {label:"Cancelada",       color:RED,    bg:"#fef2f2", br:"#f5b8b8"},
  completada:      {label:"Completada",      color:"#9ca3af", bg:"#f4f5f7", br:"#e3e6ea"},
};
var CASO_STATUS = {
  abierto:    {label:"Abierto",    color:RED,   bg:"#fef2f2", br:"#f5b8b8"},
  en_proceso: {label:"En proceso", color:AMBER, bg:"#fef9e7", br:"#f0d080"},
  resuelto:   {label:"Resuelto",   color:GREEN, bg:"#edf7ee", br:"#a3d9a5"},
};
var OP_TIPOS = {
  cancelacion:       {label:"Cancelacion",        color:RED,    bg:"#fef2f2", br:"#f5b8b8"},
  extension:         {label:"Extension vigencia", color:AMBER,  bg:"#fef9e7", br:"#f0d080"},
  reembolso:         {label:"Reembolso",          color:GREEN,  bg:"#edf7ee", br:"#a3d9a5"},
  cambio_destino:    {label:"Cambio de destinos", color:BLUE,   bg:"#e8f0fe", br:"#aac4f0"},
  descuento_credito: {label:"Descuento/Credito",  color:VIOLET, bg:"#f3e8ff", br:"#c4b5fd"},
};
var OP_STATUS = {
  pendiente: {label:"Pend. aprobacion", color:AMBER, bg:"#fef9e7", br:"#f0d080"},
  aprobado:  {label:"Aprobado",         color:GREEN, bg:"#edf7ee", br:"#a3d9a5"},
  rechazado: {label:"Rechazado",        color:RED,   bg:"#fef2f2", br:"#f5b8b8"},
};
var CANALES = { llamada:{label:"Llamada"}, whatsapp:{label:"WhatsApp"}, email:{label:"Email"}, sistema:{label:"Sistema"}, presencial:{label:"Presencial"} };
var CATEGORIAS_CASO = ["Cambio de fecha","Cancelacion","Queja del servicio","Informacion del paquete","Problema con reservacion","Solicitud especial","Cobro / facturacion","Modificacion de paquete","Otro"];
var REGIMENES = ["Solo habitacion","Desayuno incluido","Media pension","Todo incluido"];
var OFERTAS_RET = [
  {id:"ext_vigencia", label:"Extension de membresia sin costo",  color:TEAL,   bg:"rgba(14,165,160,0.08)",  br:"rgba(14,165,160,0.3)"},
  {id:"precio_menor", label:"Precio de cierre menor (descuento)", color:GREEN,  bg:"#edf7ee", br:"#a3d9a5"},
  {id:"gift_card",    label:"Gift Card $100 USD",                 color:AMBER,  bg:"#fef9e7", br:"#f0d080"},
  {id:"otro",         label:"Otro",                               color:"#6b7280", bg:"#f4f5f7", br:"#e3e6ea"},
];

// ─────────────────────────────────────────────────────────────
// HOTELES CATALOGO (completo)
// ─────────────────────────────────────────────────────────────
var HOTELES_CATALOG = {
  "Cancun":[
    {id:"H101",nombre:"Krystal Grand Cancun Resort",cat:"5",fee:75,precioNoche:120,ageMin:25,ageMax:65,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc"],habs:[{id:"a",nombre:"Superior",base:true,up:0},{id:"b",nombre:"Deluxe",base:false,up:40},{id:"c",nombre:"Deluxe Oceano King",base:false,up:75},{id:"d",nombre:"Suite Junior",base:false,up:130}],regs:["Solo habitacion","Desayuno incluido","Todo incluido"],temps:[{id:"t1",nombre:"Semana Santa",inicio:"2026-03-28",fin:"2026-04-05",surcharge:60}]},
    {id:"H102",nombre:"Hotel Emporio Cancun",cat:"4",fee:50,precioNoche:90,ageMin:25,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Estandar",base:true,up:0},{id:"b",nombre:"Superior",base:false,up:30},{id:"c",nombre:"Deluxe",base:false,up:55}],regs:["Solo habitacion","Desayuno incluido","Todo incluido"],temps:[]},
    {id:"H103",nombre:"Live Aqua Beach Resort",cat:"5",fee:100,precioNoche:180,ageMin:30,ageMax:60,marital:["Casado","Union libre"],tipos:["qc"],habs:[{id:"a",nombre:"Aqua Room",base:true,up:0},{id:"b",nombre:"Aqua Suite",base:false,up:150}],regs:["Todo incluido"],temps:[]},
  ],
  "Los Cabos":[
    {id:"H201",nombre:"Riu Palace Cabo San Lucas",cat:"5",fee:80,precioNoche:140,ageMin:36,ageMax:99,marital:["Casado","Union libre"],tipos:["qc"],habs:[{id:"a",nombre:"Deluxe",base:true,up:0},{id:"b",nombre:"Junior Suite",base:false,up:100},{id:"c",nombre:"Suite Premium",base:false,up:200}],regs:["Todo incluido"],temps:[]},
    {id:"H202",nombre:"Melia Cabo Real Beach Golf",cat:"5",fee:65,precioNoche:110,ageMin:25,ageMax:99,marital:["Casado","Union libre"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Superior Garden View",base:true,up:0},{id:"b",nombre:"Deluxe Sea View",base:false,up:60}],regs:["Solo habitacion","Desayuno incluido","Todo incluido"],temps:[]},
  ],
  "Riviera Maya":[
    {id:"H301",nombre:"Iberostar Paraiso Lindo",cat:"5",fee:85,precioNoche:150,ageMin:25,ageMax:60,marital:["Casado","Union libre"],tipos:["qc"],habs:[{id:"a",nombre:"Superior",base:true,up:0},{id:"b",nombre:"Premium",base:false,up:80},{id:"c",nombre:"Suite Oceanfront",base:false,up:180}],regs:["Todo incluido"],temps:[]},
    {id:"H302",nombre:"Grand Palladium Riviera Resort",cat:"5",fee:70,precioNoche:120,ageMin:25,ageMax:70,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Junior Suite",base:true,up:0},{id:"b",nombre:"Suite",base:false,up:90}],regs:["Todo incluido"],temps:[]},
  ],
  "Puerto Vallarta":[
    {id:"H401",nombre:"Marriott Puerto Vallarta Resort",cat:"5",fee:70,precioNoche:115,ageMin:25,ageMax:60,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Deluxe",base:true,up:0},{id:"b",nombre:"Deluxe Marina View",base:false,up:60},{id:"c",nombre:"Suite Junior",base:false,up:140}],regs:["Solo habitacion","Desayuno incluido","Todo incluido"],temps:[]},
  ],
  "Huatulco":[
    {id:"H501",nombre:"Dreams Huatulco Resort Spa",cat:"5",fee:60,precioNoche:100,ageMin:25,ageMax:65,marital:["Casado","Union libre"],tipos:["qc"],habs:[{id:"a",nombre:"Deluxe",base:true,up:0},{id:"b",nombre:"Preferred Club",base:false,up:90}],regs:["Todo incluido"],temps:[]},
    {id:"H502",nombre:"Barcelo Huatulco",cat:"4",fee:50,precioNoche:80,ageMin:25,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Estandar",base:true,up:0},{id:"b",nombre:"Superior",base:false,up:40}],regs:["Todo incluido"],temps:[]},
  ],
  "Las Vegas":[
    {id:"H601",nombre:"MGM Grand",cat:"4",fee:60,precioNoche:95,ageMin:21,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Deluxe",base:true,up:0},{id:"b",nombre:"Strip View",base:false,up:50}],regs:["Solo habitacion"],temps:[]},
    {id:"H602",nombre:"Bellagio Hotel Casino",cat:"5",fee:90,precioNoche:160,ageMin:25,ageMax:70,marital:["Casado","Union libre"],tipos:["qc"],habs:[{id:"a",nombre:"Deluxe",base:true,up:0},{id:"b",nombre:"Fountain View",base:false,up:80}],regs:["Solo habitacion"],temps:[]},
  ],
  "Orlando":[
    {id:"H701",nombre:"Walt Disney World Swan",cat:"4",fee:70,precioNoche:110,ageMin:25,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Standard",base:true,up:0},{id:"b",nombre:"Lake View",base:false,up:50}],regs:["Solo habitacion","Desayuno incluido"],temps:[]},
  ],
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function calificaHotel(h,c){
  var motivos=[];
  if(c.edad&&(c.edad<h.ageMin||c.edad>h.ageMax)) motivos.push("Edad fuera de rango");
  if(c.estadoCivil&&h.marital&&!h.marital.includes(c.estadoCivil)) motivos.push("EC no permitido");
  return {ok:motivos.length===0, motivos:motivos};
}
function getPenalidad(dias){ if(dias<=7) return {pct:100}; if(dias<=30) return {pct:80}; if(dias<=90) return {pct:60}; if(dias<=180) return {pct:40}; return {pct:20}; }

// ─────────────────────────────────────────────────────────────
// MAPEAR LEAD SUPABASE → MIEMBRO CS
// Un lead con status='venta' se convierte en miembro activo
// ─────────────────────────────────────────────────────────────
function leadToMiembro(r) {
  // _exp combina expediente + verificacion para tener todos los datos del titular
  var expRaw = r.expediente || {};
  var verif  = r.verificacion || {};
  var exp = Object.assign({}, expRaw, verif);
  // Armar nombre completo
  var nombre = ((exp.tFirstName||"")+" "+(exp.tLastName||"")).trim() || r.nombre || "Sin nombre";
  var coProp = exp.hasPartner ? (((exp.pFirstName||"")+" "+(exp.pLastName||"")).trim()||null) : null;
  // Calcular edad desde fecha de nacimiento
  var edad = 0;
  if(exp.tFechaNac) { edad = Math.floor((Date.now()-new Date(exp.tFechaNac).getTime())/31557600000); }
  else if(r.edad) { edad = Number(r.edad); }
  // Destinos: vienen del campo destinos del lead
  var destinos = (r.destinos||[]).map(function(d, i) {
    return {
      id: "D"+(i+1),
      leadDestId: d.destId,
      nombre: d.destId || "Destino",   // se enriquece luego con catálogo
      noches: d.noches || 5,
      tipo: d.tipo || "qc",
      regalo: d.regalo || null,
    };
  });
  // Calcular pagado + saldo
  var pagosHistorial = r.pagos_historial || [];
  var totalPagado = (Number(r.pago_inicial)||0) + pagosHistorial.reduce(function(s,p){ return s+(p.monto||0); }, 0);
  var saldo = Math.max(0, (Number(r.sale_price)||0) - totalPagado);
  // Pagos para tab financiero
  var pagos = [];
  if(r.pago_inicial>0) pagos.push({id:"P0",fecha:r.created_at?r.created_at.split("T")[0]:TODAY,monto:Number(r.pago_inicial),concepto:"Pago inicial (venta)",metodo:r.metodo_pago||"tarjeta",referencia:r.tarjeta_last4?"*"+r.tarjeta_last4:"—"});
  pagosHistorial.forEach(function(p){ pagos.push({id:p.id||uid(),fecha:p.fecha,monto:p.monto,concepto:p.concepto,metodo:p.metodo,referencia:p.referencia}); });

  return {
    id:             r.id,
    folio:          "XT-"+String(r.id).slice(0,6).toUpperCase(),
    nombre:         nombre,
    coProp:         r.co_prop      || coProp,
    coPropTel:      exp.pPhone || r.co_prop_tel || null,
    tFechaNac:      exp.tFechaNac  || "",
    pFechaNac:      exp.pFechaNac  || "",
    pEdad:          exp.pFechaNac ? Math.floor((Date.now()-new Date(exp.pFechaNac).getTime())/31557600000) : (exp.pEdad ? Number(exp.pEdad) : 0),
    estadoCivil:    r.estado_civil || exp.tEstadoCivil || "",
    edad:           edad,
    tel:            r.tel          || exp.tPhone || r.whatsapp || "",
    whatsapp:       r.whatsapp     || exp.tPhone || "",
    email:          r.email        || exp.tEmail || "",
    direccion:      r.direccion    || exp.address  || "",
    ciudad:         r.ciudad       || exp.city     || "",
    estado:         r.estado       || exp.state    || "",
    zip:            r.zip          || exp.zip      || "",
    membresia:      "Silver",
    vendedor:       r.vendedor_nombre || "",
    compra:         r.created_at ? r.created_at.split("T")[0] : TODAY,
    vigencia:       daysFromNow(730),
    precioPaquete:  Number(r.sale_price) || 0,
    pagoInicial:    Number(r.pago_inicial) || 0,
    totalPagado:    totalPagado,
    saldoPendiente: saldo,
    pagos:          pagos,
    reservasData:   r.reservas_historial || [],
    statusCliente:  "activo",
    motivoRetencion:null,
    destinos:       destinos,
    _exp:           exp,
    verificacion:   r.verificacion ? Object.assign({}, r.verificacion, {
      firma_firmada_at:  r.firma_firmada_at  || (r.verificacion ? r.verificacion.firma_firmada_at  : null),
      firma_enviada_at:  r.firma_enviada_at  || (r.verificacion ? r.verificacion.firma_enviada_at  : null),
    }) : (r.firma_enviada_at ? { firma_enviada_at: r.firma_enviada_at, firma_firmada_at: r.firma_firmada_at || null } : null),
    firma_contrato:      r.firma_contrato      || null,
    firma_autorizacion:  r.firma_autorizacion  || null,
    firma_terminos:      r.firma_terminos       || null,
    firma_firmada_at:    r.firma_firmada_at     || null,
    firma_ip:            r.firma_ip             || null,
    firma_device:        r.firma_device         || null,
    firma_location:      r.firma_location       || null,
    zohoPaymentMethodId: r.zoho_payment_method_id || "",
    zohoCustomerId:      r.zoho_customer_id       || "",
    tarjetaLast4:        r.tarjeta_last4           || "",
    tarjetaBrand:        r.tarjeta_brand           || "",
  };
}

// ─────────────────────────────────────────────────────────────
// COMPONENTES BASE
// ─────────────────────────────────────────────────────────────
function ModalWrap(props) {
  var accentColor = props.color || "#1a385a";
  return (
    <div style={S.modal} onClick={props.onClose}>
      <div style={Object.assign({},S.mbox,props.wide?{maxWidth:720}:{})} onClick={function(e){e.stopPropagation();}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#1a1f2e"}}>{props.title}</div>
            {props.sub&&<div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>{props.sub}</div>}
          </div>
          <button onClick={props.onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af",padding:"2px 6px",lineHeight:1}}>✕</button>
        </div>
        <div style={{height:3,borderRadius:2,background:accentColor,marginBottom:20}} />
        {props.children}
      </div>
    </div>
  );
}

function EjecutivoSel(props){
  var opts=["Ana Lopez (CS)","Carlos M. (CS)","Maria R. (Reservas)","Jorge P. (Reservas)","Marco Silva (Supervisor)"];
  return <select style={S.sel} value={props.value} onChange={props.onChange}>{opts.map(function(o){return <option key={o} value={o}>{o}</option>;})}</select>;
}

function EventoDot(props){
  var col = props.col || "#9ca3af";
  var ch = (CANALES[props.canal]||{label:props.canal||""}).label;
  return (
    <div style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid #f0f1f4"}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:col,flexShrink:0,marginTop:4}} />
      <div style={{flex:1}}>
        <div style={{fontSize:12,color:"#3d4554",lineHeight:1.4}}>{props.texto}</div>
        <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{fmtDate(props.fecha)}{ch?" · "+ch:""}</div>
      </div>
      <div style={{fontSize:10,color:"#9ca3af",flexShrink:0,textAlign:"right"}}>{props.autor}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL — NUEVA / EDITAR RESERVA
// ─────────────────────────────────────────────────────────────
function ReservaFormModal(props) {
  var c = props.cliente; var res = props.reserva; var isEdit = !!res;
  var preDestino = props.destino || null;
  var initDest = res ? res.destino : (preDestino ? preDestino.nombre : (c.destinos&&c.destinos[0] ? c.destinos[0].nombre : ""));
  var [destino,  setDestino]  = useState(initDest);
  var [checkin,  setCheckin]  = useState(res ? res.checkin  : "");
  var [checkout, setCheckout] = useState(res ? res.checkout : "");
  var [adultos,  setAdultos]  = useState(res ? String(res.adultos||2) : "2");
  var [ninos,    setNinos]    = useState(res ? String(res.ninos||0)   : "0");
  var [notas,    setNotas]    = useState(res ? res.notasInternas : "");

  var destinoObj = (c.destinos||[]).find(function(d){ return d.nombre===destino; });
  var tipoDestino = destinoObj ? destinoObj.tipo : "qc";
  var nBase  = destinoObj ? destinoObj.noches : 0;
  var nTotal = (checkin && checkout) ? Math.max(0, Math.round((new Date(checkout)-new Date(checkin))/(1000*60*60*24))) : 0;
  var nExtra = Math.max(0, nTotal - nBase);
  var ok     = destino && checkin && checkout && new Date(checkout) > new Date(checkin);

  return (
    <ModalWrap title={isEdit?"Modificar reserva":"Nueva solicitud de reserva"} sub={c.nombre+" — "+c.folio} color={TEAL} onClose={props.onClose} wide>
      <div style={Object.assign({},S.g2,{marginBottom:12})}>
        <div>
          <label style={S.label}>Destino</label>
          <select style={S.sel} value={destino} onChange={function(e){ setDestino(e.target.value); }}>
            <option value="">-- Seleccionar --</option>
            {(c.destinos||[]).map(function(d){ return <option key={d.id||d.nombre} value={d.nombre}>{d.nombre} · {d.noches}n {(d.tipo||"").toUpperCase()}</option>; })}
          </select>
        </div>
        <div/>
        <div>
          <label style={S.label}>Fecha check-in</label>
          <input style={S.input} type="date" value={checkin} onChange={function(e){ setCheckin(e.target.value); }}/>
        </div>
        <div>
          <label style={S.label}>Fecha check-out</label>
          <input style={S.input} type="date" value={checkout} min={checkin||""} onChange={function(e){ setCheckout(e.target.value); }}/>
        </div>
      </div>
      {destino && checkin && checkout && nTotal > 0 && (
        <div style={{padding:"9px 12px",borderRadius:9,background:"rgba(14,165,160,0.05)",border:"1px solid rgba(14,165,160,0.2)",marginBottom:12,display:"flex",gap:18,fontSize:12,flexWrap:"wrap"}}>
          <span style={{color:"#9ca3af"}}>Noches incluidas: <strong style={{color:"#1a1f2e"}}>{nBase}</strong></span>
          <span style={{color:"#9ca3af"}}>Total noches: <strong style={{color:TEAL}}>{nTotal}</strong></span>
          {nExtra > 0 && <span style={{color:"#9ca3af"}}>Noches adicionales: <strong style={{color:AMBER}}>{nExtra}</strong></span>}
        </div>
      )}
      <div style={Object.assign({},S.g2,{marginBottom:12})}>
        <div>
          <label style={S.label}>Adultos</label>
          <input style={S.input} type="number" min="1" max="6" value={adultos} onChange={function(e){ setAdultos(e.target.value); }}/>
        </div>
        <div>
          <label style={S.label}>Ninos</label>
          <input style={S.input} type="number" min="0" max="6" value={ninos} onChange={function(e){ setNinos(e.target.value); }}/>
        </div>
      </div>
      <div style={{marginBottom:20}}>
        <label style={S.label}>Notas / solicitudes especiales</label>
        <textarea style={Object.assign({},S.ta,{minHeight:60,marginTop:4})} value={notas} onChange={function(e){setNotas(e.target.value);}} placeholder="Preferencias, celebraciones, peticiones..."/>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button style={S.btn("ghost")} onClick={props.onClose}>Cancelar</button>
        <button style={S.btn("teal")} onClick={function(){ props.onSave({destino:destino,checkin:checkin,checkout:checkout,adultos:parseInt(adultos)||2,ninos:parseInt(ninos)||0,nochesIncluidas:nBase,nochesExtra:nExtra,tipo:tipoDestino,notasInternas:notas,agente:props.autor||"Agente",status:"solicitada"}); props.onClose(); }} disabled={!ok}>
          {isEdit?"Guardar cambios":"Enviar solicitud"}
        </button>
      </div>
    </ModalWrap>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL — VER RESERVA
// ─────────────────────────────────────────────────────────────
function ReservaDetailModal(props) {
  var res=props.reserva; var perms=props.perms;
  var sc=RES_STATUS[res.status]||RES_STATUS.solicitud;
  var pasada=new Date(res.checkin+"T12:00:00")<new Date();
  var [conf,setConf]=useState(res.confirmacion||"");
  return (
    <ModalWrap title={res.folio+" — "+res.destino} sub={res.hotel} color={sc.color} onClose={props.onClose} wide>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        <span style={S.bdg(sc.color,sc.bg,sc.br)}>{sc.label}</span>
        <span style={S.bdg(res.tipo==="qc"?BLUE:AMBER,res.tipo==="qc"?"#e8f0fe":"#fef9e7",res.tipo==="qc"?"#aac4f0":"#f0d080")}>{(res.tipo||"").toUpperCase()}</span>
        {pasada&&res.status!=="cancelada"&&<span style={S.bdg("#9ca3af","#f4f5f7","#e3e6ea")}>Viaje pasado</span>}
      </div>
      <div style={Object.assign({},S.g3,{marginBottom:14})}>
        <div style={S.card}><label style={S.label}>Check-in</label><strong style={{fontSize:13}}>{fmtDate(res.checkin)}</strong></div>
        <div style={S.card}><label style={S.label}>Check-out</label><strong style={{fontSize:13}}>{fmtDate(res.checkout)}</strong></div>
        <div style={S.card}><label style={S.label}>Noches</label><strong style={{color:TEAL,fontSize:13}}>{daysBetween(res.checkin,res.checkout)}</strong></div>
        <div style={S.card}><label style={S.label}>Habitacion</label><span style={{fontSize:12}}>{res.habitacion||"--"}</span></div>
        <div style={S.card}><label style={S.label}>Regimen</label><span style={{fontSize:12}}>{res.regimen||"--"}</span></div>
        <div style={S.card}><label style={S.label}>Personas</label><strong style={{fontSize:13}}>{res.personas}</strong></div>
        {res.totalCobrado>0&&<div style={S.card}><label style={S.label}>Cargo extra</label><strong style={{color:AMBER,fontSize:13}}>{fmtUSD(res.totalCobrado)}</strong></div>}
        <div style={S.card}><label style={S.label}>Agente</label><span style={{fontSize:12}}>{res.agente}</span></div>
      </div>
      {res.confirmacion&&<div style={{padding:"8px 12px",borderRadius:8,background:"#edf7ee",border:"1px solid #a3d9a5",fontSize:12,color:GREEN,marginBottom:12}}>Confirmacion hotel: <strong>{res.confirmacion}</strong></div>}
      {res.notasInternas&&<div style={Object.assign({},S.card,{borderColor:"rgba(245,158,11,0.25)",marginBottom:12})}><label style={S.label}>Notas internas</label><div style={{fontSize:12,marginTop:3}}>{res.notasInternas}</div></div>}
      {perms.confirmarReserva&&(res.status==="solicitud"||res.status==="vlo_proceso")&&!pasada&&(
        <div style={{padding:"12px",borderRadius:10,background:"rgba(14,165,160,0.05)",border:"1px solid rgba(14,165,160,0.2)",marginBottom:14}}>
          <label style={S.label}>Marcar como confirmada</label>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            <input style={S.input} value={conf} onChange={function(e){setConf(e.target.value);}} placeholder="No. confirmacion del hotel (ej: KGC-44821)"/>
            <button style={Object.assign({},S.btn("teal"),{flexShrink:0})} onClick={function(){props.onConfirmar(res.id,conf);props.onClose();}} disabled={!conf.trim()}>Confirmar</button>
          </div>
        </div>
      )}
      <div style={S.stit}>Historial de la reserva</div>
      {(res.historial||[]).map(function(h,i){
        return <div key={i} style={{display:"flex",gap:10,padding:"5px 0",borderBottom:"1px solid #f0f1f4"}}>
          <div style={{fontSize:10,color:"#9ca3af",width:80,flexShrink:0}}>{fmtDate(h.fecha)}</div>
          <div style={{fontSize:12,flex:1}}>{h.texto}</div>
          <div style={{fontSize:10,color:"#9ca3af"}}>{h.autor}</div>
        </div>;
      })}
      <div style={{display:"flex",gap:8,justifyContent:"space-between",marginTop:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:8}}>
          {perms.modificarReserva&&res.status!=="cancelada"&&res.status!=="completada"&&<button style={S.btn("warn")} onClick={function(){props.onEditar(res);props.onClose();}}>Modificar</button>}
          {perms.cancelarReserva&&res.status!=="cancelada"&&res.status!=="completada"&&<button style={S.btn("danger")} onClick={function(){props.onCancelar(res.id);props.onClose();}}>Cancelar reserva</button>}
        </div>
        <button style={S.btn("ghost")} onClick={props.onClose}>Cerrar</button>
      </div>
    </ModalWrap>
  );
}

// ─────────────────────────────────────────────────────────────
// MODALES SIMPLES
// ─────────────────────────────────────────────────────────────
function NotaModal(props) {
  var [txt,setTxt]=useState(""); var [canal,setCanal]=useState("llamada"); var [autor,setAutor]=useState("Ana Lopez (CS)");
  return (
    <ModalWrap title="Nota rapida" sub={props.cliente.nombre} color={VIOLET} onClose={props.onClose}>
      <div style={{marginBottom:10}}><label style={S.label}>Canal</label><select style={S.sel} value={canal} onChange={function(e){setCanal(e.target.value);}}>{Object.keys(CANALES).map(function(k){return <option key={k} value={k}>{CANALES[k].label}</option>;})}</select></div>
      <div style={{marginBottom:10}}><label style={S.label}>Nota</label><textarea style={Object.assign({},S.ta,{minHeight:100,marginTop:4})} value={txt} onChange={function(e){setTxt(e.target.value);}} placeholder="Detalle de la interaccion..."/></div>
      <div style={{marginBottom:18}}><label style={S.label}>Ejecutivo</label><EjecutivoSel value={autor} onChange={function(e){setAutor(e.target.value);}}/></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button style={S.btn("ghost")} onClick={props.onClose}>Cancelar</button>
        <button style={S.btn("primary")} onClick={function(){props.onSave(txt,canal,autor);props.onClose();}} disabled={!txt.trim()}>Guardar nota</button>
      </div>
    </ModalWrap>
  );
}

function CasoModal(props) {
  var [titulo,setTitulo]=useState(""); var [categoria,setCategoria]=useState(CATEGORIAS_CASO[0]); var [canal,setCanal]=useState("llamada"); var [autor,setAutor]=useState("Ana Lopez (CS)");
  return (
    <ModalWrap title="Nuevo caso CS" sub={props.cliente.nombre} color={BLUE} onClose={props.onClose}>
      <div style={{marginBottom:10}}><label style={S.label}>Titulo del caso</label><input style={S.input} value={titulo} onChange={function(e){setTitulo(e.target.value);}} placeholder="Resumen del caso..."/></div>
      <div style={Object.assign({},S.g2,{marginBottom:10})}>
        <div><label style={S.label}>Categoria</label><select style={S.sel} value={categoria} onChange={function(e){setCategoria(e.target.value);}}>{CATEGORIAS_CASO.map(function(c){return <option key={c}>{c}</option>;})}</select></div>
        <div><label style={S.label}>Canal</label><select style={S.sel} value={canal} onChange={function(e){setCanal(e.target.value);}}>{Object.keys(CANALES).map(function(k){return <option key={k} value={k}>{CANALES[k].label}</option>;})}</select></div>
      </div>
      <div style={{marginBottom:18}}><label style={S.label}>Asignado a</label><EjecutivoSel value={autor} onChange={function(e){setAutor(e.target.value);}}/></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button style={S.btn("ghost")} onClick={props.onClose}>Cancelar</button>
        <button style={S.btn("primary")} onClick={function(){props.onSave({titulo:titulo,categoria:categoria,canal:canal,autor:autor});props.onClose();}} disabled={!titulo.trim()}>Crear caso</button>
      </div>
    </ModalWrap>
  );
}

function OpModal(props) {
  var c=props.cliente;
  var [tipo,setTipo]=useState(""); var [nota,setNota]=useState(""); var [autor,setAutor]=useState("Ana Lopez (CS)");
  var dias=daysSince(c.compra); var pen=getPenalidad(dias); var reembolso=Math.round((c.precioPaquete||0)*pen.pct/100);
  return (
    <ModalWrap title="Nueva operacion" sub={c.nombre+" — "+c.folio} color={AMBER} onClose={props.onClose}>
      <div style={{marginBottom:10}}><label style={S.label}>Tipo de operacion</label>
        <select style={S.sel} value={tipo} onChange={function(e){setTipo(e.target.value);}}>
          <option value="">-- Seleccionar --</option>
          {Object.entries(OP_TIPOS).map(function(e){return <option key={e[0]} value={e[0]}>{e[1].label}</option>;})}
        </select>
      </div>
      {tipo==="cancelacion"&&(
        <div style={{padding:"12px",borderRadius:10,background:"#fef2f2",border:"1px solid #f5b8b8",marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:RED,marginBottom:8}}>Calculadora de cancelacion</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,fontSize:12}}>
            <div><label style={S.label}>Dias desde compra</label><strong>{dias}d</strong></div>
            <div><label style={S.label}>Politica</label><strong style={{color:AMBER}}>{pen.pct}%</strong></div>
            <div><label style={S.label}>Precio original</label><strong>{fmtUSD(c.precioPaquete)}</strong></div>
            <div><label style={S.label}>Reembolso est.</label><strong style={{color:GREEN}}>{fmtUSD(reembolso)}</strong></div>
          </div>
        </div>
      )}
      <div style={{marginBottom:10}}><label style={S.label}>Nota CS</label><textarea style={Object.assign({},S.ta,{minHeight:64,marginTop:4})} value={nota} onChange={function(e){setNota(e.target.value);}} placeholder="Contexto o detalles adicionales..."/></div>
      <div style={{marginBottom:18}}><label style={S.label}>Ejecutivo CS</label><EjecutivoSel value={autor} onChange={function(e){setAutor(e.target.value);}}/></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button style={S.btn("ghost")} onClick={props.onClose}>Cancelar</button>
        <button style={S.btn("warn")} onClick={function(){props.onSave({tipo:tipo,notaCS:nota,autor:autor,detalle:{dias:dias,pct:pen.pct,montoOriginal:c.precioPaquete,montoReembolso:reembolso}});props.onClose();}} disabled={!tipo}>Enviar a aprobacion</button>
      </div>
    </ModalWrap>
  );
}


// ─────────────────────────────────────────────────────────────
// FORMULARIO DE ABONO CS — con Zoho para tarjeta
// ─────────────────────────────────────────────────────────────
function PagoAbonoCS(props) {
  var c = props.cliente;
  var saldo = c.saldoPendiente || 0;
  var [monto,          setMonto]          = useState("");
  var [metodo,         setMetodo]         = useState("tarjeta");
  var [concepto,       setConcepto]       = useState("Abono");
  var [ref,            setRef]            = useState("");
  var [autorizado,     setAutorizado]     = useState(false);
  var [usarOtra,       setUsarOtra]       = useState(false);
  var [saving,         setSaving]         = useState(false);
  var [err,            setErr]            = useState("");
  var [zohoError,      setZohoError]      = useState("");

  var pmId   = c.zohoPaymentMethodId || "";
  var custId = c.zohoCustomerId      || "";
  var last4  = c.tarjetaLast4        || "";
  var brand  = c.tarjetaBrand        || "Tarjeta";
  var tieneGuardada = !usarOtra && !!pmId;

  useEffect(function() {
    if (window.ZPayments) return;
    var s = document.createElement("script");
    s.src = "https://static.zohocdn.com/zpay/zpay-js/v1/zpayments.js";
    s.onerror = function() { setZohoError("No se pudo cargar SDK de Zoho"); };
    document.head.appendChild(s);
  }, []);

  function guardarAbono(nuevo) {
    var nuevosAbonos = (c.pagos || []).filter(function(p){ return p.concepto !== "Pago inicial (venta)"; }).concat([nuevo]);
    SB.from("leads").update({ pagos_historial: nuevosAbonos }).eq("id", c.id)
      .then(function(res) {
        setSaving(false);
        if (res.error) { setErr("Cobrado pero error al guardar: " + res.error.message); return; }
        setMonto(""); setConcepto("Abono"); setRef(""); setAutorizado(false);
        if (props.onAbono) props.onAbono(nuevosAbonos);
      });
  }

  function handleManual() {
    var m = Number(monto);
    if (!m || m <= 0) { setErr("Ingresa un monto válido"); return; }
    if (m > saldo + 0.01) { setErr("El abono supera el saldo de " + fmtUSD(saldo)); return; }
    setErr(""); setSaving(true);
    guardarAbono({ id: "P" + Date.now(), monto: m, metodo: metodo, referencia: ref || "—", concepto: concepto || "Abono", fecha: new Date().toISOString(), por: "CS" });
  }

  function handleZoho() {
    var m = Number(monto);
    if (!m || m <= 0) { setErr("Ingresa un monto válido"); return; }
    if (m > saldo + 0.01) { setErr("El abono supera el saldo de " + fmtUSD(saldo)); return; }
    setErr(""); setSaving(true);

    if (pmId && custId && !usarOtra) {
      fetch(EDGE_URL + "/charge-saved-card", {
        method: "POST", headers: AUTH_HDR,
        body: JSON.stringify({ lead_id: c.id, customer_id: custId, payment_method_id: pmId, amount: m, folio: c.id, nombre: c.nombre }),
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        setSaving(false);
        if (data.error) { setErr("Error Zoho: " + data.error); return; }
        if (data.status === "succeeded" || data.status === "success") {
          guardarAbono({ id: "P" + Date.now(), monto: m, metodo: "tarjeta", referencia: data.payment_id || "Zoho-OK", concepto: concepto || "Abono tarjeta", fecha: new Date().toISOString(), por: "CS" });
        } else { setErr("Cargo rechazado: " + (data.status || "error")); }
      })
      .catch(function(e) { setSaving(false); setErr("Error de red: " + e.message); });
      return;
    }

    if (!window.ZPayments) { setSaving(false); setErr("SDK Zoho no disponible"); return; }
    fetch(EDGE_URL + "/create-session", {
      method: "POST", headers: AUTH_HDR,
      body: JSON.stringify({ amount: m, folio: c.id, nombre: c.nombre, email: c.email || "" }),
    })
    .then(function(r) { return r.json(); })
    .then(function(sess) {
      if (sess.error) { setSaving(false); setErr("Error sesión: " + sess.error); return; }
      var zp = new window.ZPayments(ZOHO_API_KEY);
      zp.pay({
        hostedpage_id: sess.hostedpage_id || sess.id,
        success: function(data) {
          setSaving(false);
          guardarAbono({ id: "P" + Date.now(), monto: m, metodo: "tarjeta", referencia: data.payment_id || "Zoho-OK", concepto: concepto || "Abono tarjeta", fecha: new Date().toISOString(), por: "CS" });
        },
        failure: function(e) { setSaving(false); setErr("Pago rechazado: " + (e.message || e)); },
        cancel:  function()  { setSaving(false); },
      });
    })
    .catch(function(e) { setSaving(false); setErr("Error sesión Zoho: " + e.message); });
  }

  var METODOS = ["tarjeta", "transferencia", "efectivo", "cheque"];

  return (
    <div style={{background:"#f9fafb",borderRadius:10,padding:14,border:"1px solid #e3e6ea",marginTop:14}}>
      <div style={{fontSize:11,fontWeight:700,color:BLUE,marginBottom:12}}>➕ Aplicar abono</div>
      <div style={Object.assign({},S.g2,{marginBottom:10})}>
        <div>
          <label style={S.label}>Monto (USD)</label>
          <input style={Object.assign({},S.input,{fontWeight:700})} type="number" min="1" max={saldo}
            placeholder={"Máx " + fmtUSD(saldo)} value={monto}
            onChange={function(e){ setMonto(e.target.value); setErr(""); }}/>
        </div>
        <div>
          <label style={S.label}>Método</label>
          <select style={S.sel} value={metodo} onChange={function(e){ setMetodo(e.target.value); setErr(""); setAutorizado(false); setUsarOtra(false); }}>
            {METODOS.map(function(m){ return <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>; })}
          </select>
        </div>
        {metodo !== "tarjeta" && (
          <div>
            <label style={S.label}>Concepto</label>
            <input style={S.input} value={concepto} onChange={function(e){ setConcepto(e.target.value); }} placeholder="Abono, 2do pago..."/>
          </div>
        )}
        {metodo !== "tarjeta" && (
          <div>
            <label style={S.label}>Referencia / No. transacción</label>
            <input style={S.input} value={ref} onChange={function(e){ setRef(e.target.value); }} placeholder="TXN-12345 / SPEI-..."/>
          </div>
        )}
      </div>

      {/* TARJETA GUARDADA */}
      {metodo === "tarjeta" && pmId && !usarOtra && (
        <div style={{padding:"10px 12px",borderRadius:8,background:"#e8f0fe",border:"1px solid #aac4f0",marginBottom:10,display:"flex",gap:10,alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{fontSize:18}}>💳</div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:BLUE}}>{brand} **** {last4||"guardada"}</div>
              <div style={{fontSize:11,color:"#6b7280"}}>Tarjeta guardada · {c.nombre}</div>
            </div>
          </div>
          <button style={{fontSize:11,color:"#6b7280",background:"none",border:"1px solid #e3e6ea",borderRadius:6,padding:"3px 8px",cursor:"pointer"}}
            onClick={function(){ setUsarOtra(true); setAutorizado(false); }}>Usar otra</button>
        </div>
      )}

      {/* USAR OTRA */}
      {metodo === "tarjeta" && pmId && usarOtra && (
        <div style={{padding:"10px 12px",borderRadius:8,background:"#fef9e7",border:"1px solid #f0d080",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:12,color:AMBER}}>⚠️ Se abrirá el widget de Zoho para nueva tarjeta</div>
          <button style={{fontSize:11,color:BLUE,background:"none",border:"1px solid #aac4f0",borderRadius:6,padding:"3px 8px",cursor:"pointer"}}
            onClick={function(){ setUsarOtra(false); setAutorizado(false); }}>← Usar guardada</button>
        </div>
      )}

      {/* SIN TARJETA GUARDADA */}
      {metodo === "tarjeta" && !pmId && (
        <div style={{padding:"10px 12px",borderRadius:8,background:"#fef9e7",border:"1px solid #f0d080",marginBottom:10,fontSize:12,color:AMBER}}>
          ⚠️ Este cliente no tiene tarjeta guardada. Se abrirá el widget de Zoho.
        </div>
      )}

      {/* CHECKBOX AUTORIZACIÓN */}
      {metodo === "tarjeta" && pmId && !usarOtra && (
        <div onClick={function(){ setAutorizado(function(p){ return !p; }); }}
          style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",borderRadius:8,
            background:autorizado?"rgba(26,127,60,0.06)":"#f9fafb",
            border:"1px solid "+(autorizado?"#a3d9a5":"#e3e6ea"),
            marginBottom:10,cursor:"pointer",userSelect:"none"}}>
          <div style={{width:16,height:16,borderRadius:4,border:"2px solid "+(autorizado?"#1a7f3c":"#9ca3af"),
            background:autorizado?"#1a7f3c":"#fff",flexShrink:0,marginTop:1,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            {autorizado && <span style={{color:"#fff",fontSize:11,fontWeight:900,lineHeight:1}}>✓</span>}
          </div>
          <div style={{fontSize:12,color:autorizado?"#1a7f3c":"#6b7280",lineHeight:1.4}}>
            <strong>El cliente autorizó el cargo</strong> a la tarjeta {brand} **** {last4||"guardada"} por {monto ? fmtUSD(Number(monto)) : "el monto indicado"}
          </div>
        </div>
      )}

      {err && <div style={{fontSize:12,color:RED,marginBottom:8,fontWeight:600}}>⚠️ {err}</div>}
      {zohoError && metodo === "tarjeta" && <div style={{fontSize:12,color:RED,marginBottom:8}}>⚠️ {zohoError}</div>}

      {metodo === "tarjeta" ? (
        <button style={Object.assign({},S.btn("success"),{width:"100%",justifyContent:"center"})}
          disabled={!monto||saving||(pmId&&!usarOtra&&!autorizado)}
          onClick={handleZoho}>
          {saving ? "Procesando..." : "💳 Cobrar " + (monto ? fmtUSD(Number(monto)) : "—") + " con tarjeta"}
        </button>
      ) : (
        <button style={Object.assign({},S.btn("success"),{width:"100%",justifyContent:"center"})}
          disabled={!monto||saving} onClick={handleManual}>
          {saving ? "Guardando..." : "Registrar abono de " + (monto ? fmtUSD(Number(monto)) : "—")}
        </button>
      )}
    </div>
  );
}




// ─────────────────────────────────────────────────────────────
// MODAL EDITAR NOMBRE TITULAR — CS
// ─────────────────────────────────────────────────────────────
function EditNombreModal(props) {
  var c = props.cliente;
  var exp = c._exp || {};
  var [firstName,  setFirstName]  = useState(exp.tFirstName || c.nombre.split(" ")[0] || "");
  var [lastName,   setLastName]   = useState(exp.tLastName  || c.nombre.split(" ").slice(1).join(" ") || "");
  var [tFechaNac,  setTFechaNac]  = useState(exp.tFechaNac  || "");
  var [estadoCivil, setEstadoCivil] = useState(exp.tEstadoCivil || c.estado_civil || "");
  var hasPartner = estadoCivil === "Casado" || estadoCivil === "Cohabitante";
  var [pFirstName, setPFirstName] = useState(exp.pFirstName || "");
  var [pLastName,  setPLastName]  = useState(exp.pLastName  || "");
  var [pFechaNac,  setPFechaNac]  = useState(exp.pFechaNac  || "");
  var [pTel,       setPTel]       = useState(exp.pPhone     || "");
  var [pEmail,     setPEmail]     = useState(exp.pEmail     || "");
  var [saving, setSaving] = useState(false);
  var [err,    setErr]    = useState("");

  function handleSave() {
    if (!firstName.trim()) { setErr("El nombre es requerido"); return; }
    setSaving(true); setErr("");
    // Usar _exp existente del cliente como base para no perder otros campos
    var expBase = c._exp || {};
    var verifNuevo = Object.assign({}, expBase, {
      tFirstName:    firstName.trim(),
      tLastName:     lastName.trim(),
      tFechaNac:     tFechaNac,
      tEstadoCivil:  estadoCivil,
      hasPartner:    hasPartner,
      pFirstName:    hasPartner ? pFirstName.trim() : (expBase.pFirstName||""),
      pLastName:     hasPartner ? pLastName.trim()  : (expBase.pLastName||""),
      pFechaNac:     hasPartner ? pFechaNac         : (expBase.pFechaNac||""),
      pPhone:        hasPartner ? pTel               : (expBase.pPhone||""),
      pEmail:        hasPartner ? pEmail             : (expBase.pEmail||""),
    });
    var nombreCompleto = (firstName.trim() + " " + lastName.trim()).trim();
    SB.from("leads").update({ nombre: nombreCompleto, estado_civil: estadoCivil, verificacion: verifNuevo }).eq("id", c.id)
    .then(function(res) {
      setSaving(false);
      if (res && res.error) { setErr("Error al guardar: " + res.error.message); return; }
      props.onSave({
        nombre:       nombreCompleto,
        tFechaNac:    tFechaNac,
        estadoCivil:  estadoCivil,
        hasPartner:   hasPartner,
        pFirstName:   hasPartner ? pFirstName.trim() : "",
        pLastName:    hasPartner ? pLastName.trim()  : "",
        pFechaNac:    hasPartner ? pFechaNac : "",
      });
    });
  }

  return (
    <div style={S.modal} onClick={props.onClose}>
      <div style={Object.assign({}, S.mbox, {maxWidth: 420})} onClick={function(e){ e.stopPropagation(); }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:16,fontWeight:700,color:"#1a1f2e"}}>Corregir nombre del titular</div>
          <button onClick={props.onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button>
        </div>
        <div style={{fontSize:12,color:"#9ca3af",marginBottom:4}}>{c.folio}</div>
        <div style={{height:3,borderRadius:2,background:BLUE,marginBottom:20}}/>
        <div style={S.g2}>
          <div>
            <label style={S.label}>Nombre(s)</label>
            <input style={S.input} value={firstName} onChange={function(e){ setFirstName(e.target.value); }} placeholder="Nombre"/>
          </div>
          <div>
            <label style={S.label}>Apellido(s)</label>
            <input style={S.input} value={lastName} onChange={function(e){ setLastName(e.target.value); }} placeholder="Apellido"/>
          </div>
          <div>
            <label style={S.label}>Fecha de nacimiento</label>
            <input style={S.input} type="date" value={tFechaNac} onChange={function(e){ setTFechaNac(e.target.value); }} max={TODAY}/>
          </div>
          <div>
            <label style={S.label}>Estado civil</label>
            <select style={S.select} value={estadoCivil} onChange={function(e){ setEstadoCivil(e.target.value); }}>
              <option value="">-- Seleccionar --</option>
              <option>Casado</option>
              <option>Cohabitante</option>
              <option>Soltero</option>
              <option>Soltera</option>
            </select>
          </div>
        </div>
        {hasPartner && (
          <div style={{marginTop:8}}>
            <div style={{fontSize:11,color:"#1565c0",fontWeight:600,margin:"8px 0 8px"}}>Co-propietario / Pareja</div>
            <div style={S.g2}>
              <div><label style={S.label}>Nombre</label><input style={S.input} value={pFirstName} onChange={function(e){ setPFirstName(e.target.value); }} placeholder="Nombre"/></div>
              <div><label style={S.label}>Apellido</label><input style={S.input} value={pLastName} onChange={function(e){ setPLastName(e.target.value); }} placeholder="Apellido"/></div>
              <div><label style={S.label}>Fecha de nacimiento</label><input style={S.input} type="date" value={pFechaNac} onChange={function(e){ setPFechaNac(e.target.value); }} max={TODAY}/></div>
              <div><label style={S.label}>Telefono / WhatsApp</label><input style={S.input} value={pTel} onChange={function(e){ setPTel(e.target.value); }} placeholder="+1 555-000-0000"/></div>
            </div>
          </div>
        )}
        {err && <div style={{fontSize:12,color:RED,margin:"10px 0"}}>&#9888; {err}</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
          <button style={S.btn("ghost")} onClick={props.onClose}>Cancelar</button>
          <button style={S.btn("primary")} onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL TRANSFERIR CERTIFICADO — CS
// ─────────────────────────────────────────────────────────────
function TransferirModal(props) {
  var c = props.cliente;
  var [paso,       setPaso]       = useState(1);
  var [firstName,  setFirstName]  = useState("");
  var [lastName,   setLastName]   = useState("");
  var [edad,       setEdad]       = useState("");
  var [tFechaNac,  setTFechaNac]  = useState("");
  var [tel,        setTel]        = useState("");
  var [email,      setEmail]      = useState("");
  var [conPareja,  setConPareja]  = useState(false);
  var [pFirstName, setPFirstName] = useState("");
  var [pLastName,  setPLastName]  = useState("");
  var [pEdad,      setPEdad]      = useState("");
  var [pFechaNac,  setPFechaNac]  = useState("");
  var [pTel,       setPTel]       = useState("");
  var [motivo,     setMotivo]     = useState("");
  var [saving,     setSaving]     = useState(false);
  var [err,        setErr]        = useState("");

  var edadN = parseInt(edad) || 0;
  var edadP = parseInt(pEdad) || 0;

  var resultados = (c.destinos || []).map(function(d) {
    var razones = [];
    if (edadN < 21) razones.push("Nuevo titular menor de 21 años");
    if (edadN > 70) razones.push("Nuevo titular mayor de 70 años");
    if (conPareja && edadP < 21) razones.push("Co-propietario menor de 21 años");
    return { destino: d, ok: razones.length === 0, razones: razones };
  });

  var todosCalifican = resultados.every(function(r){ return r.ok; });
  var okPaso1 = firstName.trim() && lastName.trim() && edad && tel.trim() && email.trim() && motivo.trim();
  var okPareja = !conPareja || (pFirstName.trim() && pEdad && pTel.trim());

  function handleConfirmar() {
    setSaving(true); setErr("");
    var nombreNuevo = (firstName.trim() + " " + lastName.trim()).trim();
    SB.from("leads").select("verificacion").eq("id", c.id).single()
    .then(function(res2) {
      var verif = (res2.data && res2.data.verificacion) ? Object.assign({}, res2.data.verificacion) : {};
      var verifNuevo = Object.assign({}, verif, {
        tFirstName: firstName.trim(), tLastName: lastName.trim(),
        tPhone: tel, tEmail: email, edad: edadN,
        tFechaNac:  tFechaNac,
        hasPartner: conPareja,
        pFirstName: conPareja ? pFirstName.trim() : "",
        pLastName:  conPareja ? pLastName.trim()  : "",
        pPhone:     conPareja ? pTel               : "",
        pEdad:      conPareja ? edadP              : null,
        pFechaNac:  conPareja ? pFechaNac          : "",
      });
      var destFiltrados = (c.destinos || []).filter(function(_, i){ return resultados[i].ok; });
      return SB.from("leads").update({
        nombre:      nombreNuevo,
        whatsapp:    tel,
        email:       email,
        verificacion: verifNuevo,
        destinos:    destFiltrados.map(function(d){ return { destId: d.leadDestId || d.nombre, noches: d.noches, tipo: d.tipo, regalo: d.regalo || null }; }),
      }).eq("id", c.id);
    })
    .then(function(res) {
      setSaving(false);
      if (res && res.error) { setErr("Error al guardar: " + res.error.message); return; }
      props.onSave();
    });
  }

  var PASOS = ["Nuevo titular", "Recalificación", "Confirmar"];

  return (
    <div style={S.modal} onClick={props.onClose}>
      <div style={Object.assign({}, S.mbox, {maxWidth: 600})} onClick={function(e){ e.stopPropagation(); }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:16,fontWeight:700,color:"#1a1f2e"}}>Transferir certificado</div>
          <button onClick={props.onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button>
        </div>
        <div style={{fontSize:12,color:"#9ca3af",marginBottom:4}}>{c.nombre} · {c.folio}</div>
        <div style={{height:3,borderRadius:2,background:INDIGO,marginBottom:16}}/>

        {/* STEPPER */}
        <div style={{display:"flex",marginBottom:20}}>
          {PASOS.map(function(p, i){
            var active = paso === i+1;
            var done   = paso > i+1;
            return (
              <div key={i} style={{flex:1,display:"flex",alignItems:"center"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1}}>
                  <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:12,fontWeight:800,
                    background:done?GREEN:active?BLUE:"#f2f3f6",
                    color:done||active?"#fff":"#9ca3af",
                    border:"2px solid "+(done?GREEN:active?BLUE:"#e3e6ea")}}>
                    {done ? "✓" : i+1}
                  </div>
                  <div style={{fontSize:10,color:active?BLUE:"#9ca3af",marginTop:3,fontWeight:active?700:400}}>{p}</div>
                </div>
                {i < PASOS.length-1 && <div style={{height:2,flex:1,maxWidth:32,background:done?"rgba(26,127,60,0.4)":"#f2f3f6",marginBottom:14}}/>}
              </div>
            );
          })}
        </div>

        {/* PASO 1 */}
        {paso === 1 && (
          <div>
            <div style={S.stit}>Datos del nuevo titular</div>
            <div style={S.g2}>
              <div><label style={S.label}>Nombre(s)</label><input style={S.input} value={firstName} onChange={function(e){ setFirstName(e.target.value); }} placeholder="Nombre"/></div>
              <div><label style={S.label}>Apellido(s)</label><input style={S.input} value={lastName} onChange={function(e){ setLastName(e.target.value); }} placeholder="Apellido"/></div>
              <div><label style={S.label}>Fecha de nacimiento</label><input style={S.input} type="date" value={tFechaNac} onChange={function(e){ setTFechaNac(e.target.value); }} max={TODAY}/></div>
              <div><label style={S.label}>Edad</label><input style={S.input} type="number" value={edad} onChange={function(e){ setEdad(e.target.value); }} placeholder="Edad"/></div>
              <div><label style={S.label}>Teléfono / WhatsApp</label><input style={S.input} value={tel} onChange={function(e){ setTel(e.target.value); }} placeholder="+1 555-000-0000"/></div>
              <div style={{gridColumn:"1/-1"}}><label style={S.label}>Email</label><input style={S.input} type="email" value={email} onChange={function(e){ setEmail(e.target.value); }} placeholder="correo@ejemplo.com"/></div>
            </div>
            <div onClick={function(){ setConPareja(function(p){ return !p; }); }}
              style={{display:"flex",alignItems:"center",gap:8,margin:"12px 0",cursor:"pointer",userSelect:"none"}}>
              <div style={{width:16,height:16,borderRadius:4,border:"2px solid "+(conPareja?BLUE:"#9ca3af"),background:conPareja?BLUE:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {conPareja && <span style={{color:"#fff",fontSize:11,fontWeight:900}}>✓</span>}
              </div>
              <span style={{fontSize:12,color:"#6b7280"}}>Incluye co-propietario</span>
            </div>
            {conPareja && (
              <div style={S.g2}>
                <div><label style={S.label}>Nombre co-prop.</label><input style={S.input} value={pFirstName} onChange={function(e){ setPFirstName(e.target.value); }} placeholder="Nombre"/></div>
                <div><label style={S.label}>Apellido</label><input style={S.input} value={pLastName} onChange={function(e){ setPLastName(e.target.value); }} placeholder="Apellido"/></div>
                <div><label style={S.label}>Fecha de nacimiento</label><input style={S.input} type="date" value={pFechaNac} onChange={function(e){ setPFechaNac(e.target.value); }} max={TODAY}/></div>
                <div><label style={S.label}>Edad</label><input style={S.input} type="number" value={pEdad} onChange={function(e){ setPEdad(e.target.value); }} placeholder="Edad"/></div>
                <div><label style={S.label}>Teléfono</label><input style={S.input} value={pTel} onChange={function(e){ setPTel(e.target.value); }} placeholder="+1 555-000-0000"/></div>
              </div>
            )}
            <div style={{marginTop:12}}>
              <label style={S.label}>Motivo de la transferencia</label>
              <textarea style={Object.assign({},S.textarea,{marginTop:4,minHeight:60})} value={motivo} onChange={function(e){ setMotivo(e.target.value); }} placeholder="Razón de la transferencia..."/>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
              <button style={S.btn("primary")} onClick={function(){ setPaso(2); }} disabled={!okPaso1||!okPareja}>Siguiente →</button>
            </div>
          </div>
        )}

        {/* PASO 2 */}
        {paso === 2 && (
          <div>
            <div style={S.stit}>Recalificación de destinos</div>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:12}}>Verificando si el nuevo titular califica para cada destino del paquete:</div>
            {resultados.map(function(r, i){
              return (
                <div key={i} style={Object.assign({}, S.card, {borderColor:r.ok?"rgba(26,127,60,0.3)":"rgba(185,28,28,0.2)",marginBottom:8})}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#1a1f2e"}}>{r.destino.nombre}</div>
                      <div style={{fontSize:11,color:"#9ca3af"}}>{r.destino.noches} noches · {(r.destino.tipo||"").toUpperCase()}</div>
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:r.ok?GREEN:RED}}>{r.ok?"✅ Califica":"❌ No califica"}</span>
                  </div>
                  {r.razones.length > 0 && r.razones.map(function(rz, j){
                    return <div key={j} style={{fontSize:11,color:RED,marginTop:3}}>- {rz}</div>;
                  })}
                </div>
              );
            })}
            {!todosCalifican && (
              <div style={{padding:"10px 12px",borderRadius:8,background:"#fef9e7",border:"1px solid #f0d080",fontSize:12,color:AMBER,marginTop:8}}>
                ⚠️ Los destinos donde no califica serán removidos del paquete al confirmar la transferencia.
              </div>
            )}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:16}}>
              <button style={S.btn("ghost")} onClick={function(){ setPaso(1); }}>← Atrás</button>
              <button style={S.btn("primary")} onClick={function(){ setPaso(3); }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* PASO 3 */}
        {paso === 3 && (
          <div>
            <div style={S.stit}>Confirmar transferencia</div>
            <div style={Object.assign({}, S.card, {marginBottom:12})}>
              <div style={S.g2}>
                <div><label style={S.label}>Titular actual</label><div style={{fontSize:13,color:"#1a1f2e",fontWeight:600}}>{c.nombre}</div></div>
                <div><label style={S.label}>Nuevo titular</label><div style={{fontSize:13,color:GREEN,fontWeight:700}}>{(firstName+" "+lastName).trim()}</div></div>
                <div><label style={S.label}>Folio</label><div style={{fontSize:13,color:"#1a1f2e"}}>{c.folio}</div></div>
                <div><label style={S.label}>Destinos elegibles</label><div style={{fontSize:13,color:"#1a1f2e"}}>{resultados.filter(function(r){return r.ok;}).length} de {resultados.length}</div></div>
              </div>
              {motivo && <div style={{fontSize:12,color:"#6b7280",marginTop:10,fontStyle:"italic"}}>{motivo}</div>}
            </div>
            {err && <div style={{fontSize:12,color:RED,marginBottom:10}}>⚠️ {err}</div>}
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button style={S.btn("ghost")} onClick={function(){ setPaso(2); }}>← Atrás</button>
              <button style={S.btn("danger")} onClick={handleConfirmar} disabled={saving}>
                {saving ? "Procesando..." : "Confirmar transferencia"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL EDITAR CONTACTO — CS
// ─────────────────────────────────────────────────────────────
function EditContactoModal(props) {
  var c = props.cliente;
  var [d, setD] = useState({
    tel:         c.tel         || "",
    whatsapp:    c.whatsapp    || "",
    email:       c.email       || "",
    direccion:   c.direccion   || "",
    ciudad:      c.ciudad      || "",
    estado:      c.estado      || "",
    zip:         c.zip         || "",
    estadoCivil: c.estadoCivil || "",
    coProp:      c.coProp      || "",
    coPropTel:   c.coPropTel   || "",
  });
  var [saving, setSaving] = useState(false);
  var [err,    setErr]    = useState("");

  function set(k, v) { setD(function(p){ return Object.assign({}, p, {[k]: v}); }); }

  function handleSave() {
    setSaving(true); setErr("");
    SB.from("leads").update({
      tel:          d.tel,
      whatsapp:     d.whatsapp,
      email:        d.email,
      ciudad:       d.ciudad,
      estado_us:    d.estado,
      co_prop:      d.coProp,
      co_prop_tel:  d.coPropTel,
    }).eq("id", c.id)
    .then(function(res) {
      setSaving(false);
      console.log("EditContacto result:", JSON.stringify(res));
      if (res && res.error) { setErr("Error: " + res.error.message); return; }
      props.onSave(d);
    })
    .catch(function(e) {
      setSaving(false);
      setErr("Error: " + e.message);
      console.error("EditContacto catch:", e);
    });
  }

  return (
    <div style={S.modal} onClick={props.onClose}>
      <div style={Object.assign({}, S.mbox, {maxWidth: 520})} onClick={function(e){ e.stopPropagation(); }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:16,fontWeight:700,color:"#1a1f2e"}}>Editar contacto</div>
          <button onClick={props.onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button>
        </div>
        <div style={{fontSize:12,color:"#9ca3af",marginBottom:4}}>{c.nombre} · {c.folio}</div>
        <div style={{height:3,borderRadius:2,background:BLUE,marginBottom:20}}/>

        <div style={{marginBottom:16}}>
          <div style={S.stit}>Datos de contacto</div>
          <div style={S.g2}>
            <div>
              <label style={S.label}>📞 Teléfono</label>
              <input style={S.input} value={d.tel} onChange={function(e){ set("tel", e.target.value); }} placeholder="+1 (555) 000-0000"/>
            </div>
            <div>
              <label style={S.label}>💬 WhatsApp</label>
              <input style={S.input} value={d.whatsapp} onChange={function(e){ set("whatsapp", e.target.value); }} placeholder="+1 (555) 000-0000"/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={S.label}>✉️ Email</label>
              <input style={S.input} type="email" value={d.email} onChange={function(e){ set("email", e.target.value); }} placeholder="correo@ejemplo.com"/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={S.label}>📍 Calle y número</label>
              <input style={S.input} value={d.direccion} onChange={function(e){ set("direccion", e.target.value); }} placeholder="Ej: 123 Main St"/>
            </div>
            <div>
              <label style={S.label}>🏙️ Ciudad</label>
              <input style={S.input} value={d.ciudad} onChange={function(e){ set("ciudad", e.target.value); }} placeholder="Ciudad"/>
            </div>
            <div>
              <label style={S.label}>Estado</label>
              <input style={S.input} value={d.estado} onChange={function(e){ set("estado", e.target.value); }} placeholder="Estado / Provincia"/>
            </div>
            <div>
              <label style={S.label}>Código postal</label>
              <input style={S.input} value={d.zip} onChange={function(e){ set("zip", e.target.value); }} placeholder="ZIP / CP"/>
            </div>
            <div>
              <label style={S.label}>💍 Estado civil</label>
              <select style={S.sel} value={d.estadoCivil} onChange={function(e){ set("estadoCivil", e.target.value); }}>
                <option value="">-- Seleccionar --</option>
                <option value="Casado">Casado</option>
                <option value="Cohabitante">Cohabitante</option>
                <option value="Soltero">Soltero</option>
                <option value="Soltera">Soltera</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <div style={S.stit}>Co-propietario</div>
          <div style={S.g2}>
            <div>
              <label style={S.label}>👥 Nombre</label>
              <input style={S.input} value={d.coProp} onChange={function(e){ set("coProp", e.target.value); }} placeholder="Nombre completo"/>
            </div>
            <div>
              <label style={S.label}>📞 Teléfono</label>
              <input style={S.input} value={d.coPropTel} onChange={function(e){ set("coPropTel", e.target.value); }} placeholder="+1 (555) 000-0000"/>
            </div>
          </div>
        </div>

        {err && <div style={{fontSize:12,color:RED,marginBottom:10}}>⚠️ {err}</div>}

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button style={S.btn("ghost")} onClick={props.onClose}>Cancelar</button>
          <button style={S.btn("primary")} onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar contacto"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL EDITAR DESTINOS — CS
// ─────────────────────────────────────────────────────────────
function EditDestinosModal(props) {
  var c = props.cliente;
  var catalog = props.catalog || {};  // destCatalogMap {id -> {id, nombre, icon, qc, nq}}
  var [destinos, setDestinos] = useState((c.destinos||[]).map(function(d){ return Object.assign({},d); }));
  var [saving, setSaving] = useState(false);
  var [err, setErr] = useState("");

  var selIds = destinos.map(function(d){ return d.leadDestId || d.nombre; });

  function removeDest(i) {
    setDestinos(function(p){ return p.filter(function(_,j){ return j !== i; }); });
  }

  function setNoches(i, n) {
    setDestinos(function(p){ return p.map(function(d,j){ return j===i ? Object.assign({},d,{noches:Number(n)}) : d; }); });
  }

  function setRegalo(i, regalo) {
    setDestinos(function(p){ return p.map(function(d,j){ return j===i ? Object.assign({},d,{regalo:regalo}) : d; }); });
  }

  function addDest(cat, tipo) {
    var noches = tipo==="qc" ? ((cat.qc&&cat.qc.nights)||5) : ((cat.nq&&cat.nq.nights)||3);
    setDestinos(function(p){ return p.concat([{ id:"D"+(p.length+1), leadDestId:cat.id, nombre:(cat.icon||"")+" "+cat.nombre, noches:noches, tipo:tipo, regalo:null }]); });
  }

  function handleSave() {
    setSaving(true);
    var nuevosDest = destinos.map(function(d){ return { destId: d.leadDestId || d.nombre, noches: d.noches, tipo: d.tipo, regalo: d.regalo || null }; });
    SB.from("leads").update({ destinos: nuevosDest }).eq("id", c.id)
      .then(function(res) {
        setSaving(false);
        if (res.error) { setErr("Error al guardar: " + res.error.message); return; }
        props.onSave(destinos);
      });
  }

  // Calcular destinos disponibles para agregar
  var catalogArr = Object.values(catalog).filter(function(d){ return !selIds.includes(d.id); });
  var destQC = catalogArr.filter(function(d){ return d.qc && d.qc.nights; });
  var destNQ = catalogArr.filter(function(d){ return d.nq && d.nq.enabled; });

  return (
    <div style={S.modal} onClick={props.onClose}>
      <div style={Object.assign({},S.mbox,{maxWidth:640})} onClick={function(e){ e.stopPropagation(); }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:16,fontWeight:700,color:"#1a1f2e"}}>Editar destinos</div>
          <button onClick={props.onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button>
        </div>
        <div style={{fontSize:12,color:"#9ca3af",marginBottom:4}}>{c.nombre} · {c.folio}</div>
        <div style={{height:3,borderRadius:2,background:BLUE,marginBottom:20}}/>

        {/* DESTINOS ACTUALES */}
        <div style={{marginBottom:16}}>
          <div style={S.stit}>Destinos del paquete</div>
          {destinos.length===0 && <div style={{fontSize:12,color:"#9ca3af",textAlign:"center",padding:20}}>Sin destinos — agrega uno abajo</div>}
          {destinos.map(function(dest, i) {
            var cat = catalog[dest.leadDestId || dest.nombre] || {};
            var regalos = (cat.qc && cat.qc.gifts && cat.qc.gifts.items) || [];
            return (
              <div key={i} style={{padding:"12px 14px",borderRadius:10,marginBottom:8,
                background:dest.tipo==="qc"?"rgba(21,101,192,0.04)":"rgba(124,58,237,0.04)",
                border:"2px solid "+(dest.tipo==="qc"?"rgba(21,101,192,0.2)":"rgba(124,58,237,0.2)")}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:regalos.length>0?10:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:20}}>{cat.icon||"🏖️"}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#1a1f2e"}}>{cat.nombre||dest.nombre}</div>
                      <div style={{fontSize:11,color:dest.tipo==="qc"?BLUE:VIOLET}}>
                        {dest.tipo==="qc"?"⭐ QC":"🔹 NQ"} · {dest.noches} noches
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                      <div style={{fontSize:9,color:"#9ca3af",marginBottom:2}}>Noches</div>
                      <input style={Object.assign({},S.input,{width:54,textAlign:"center",padding:"5px 4px",fontSize:13,fontWeight:700})}
                        type="number" min="1" max="14" value={dest.noches}
                        onChange={function(e){ setNoches(i, e.target.value); }}/>
                    </div>
                    <button onClick={function(){ removeDest(i); }}
                      style={{background:"#fef2f2",border:"1px solid #f5b8b8",color:RED,borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:14,fontWeight:700}}>✕</button>
                  </div>
                </div>
                {regalos.length > 0 && (
                  <div>
                    <div style={{fontSize:9,color:AMBER,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>🎁 Regalo (elige 1)</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      <div onClick={function(){ setRegalo(i,null); }}
                        style={{padding:"3px 9px",borderRadius:7,cursor:"pointer",fontSize:11,
                          background:!dest.regalo?"#e8f0fe":"#f9fafb",border:"1px solid "+(!dest.regalo?"#aac4f0":"#e3e6ea"),
                          color:!dest.regalo?BLUE:"#9ca3af",fontWeight:!dest.regalo?700:400}}>
                        Sin regalo
                      </div>
                      {regalos.filter(function(r){ return r.active!==false; }).map(function(r){
                        var sel = dest.regalo && dest.regalo.id===r.id;
                        return (
                          <div key={r.id} onClick={function(){ setRegalo(i,{id:r.id,icon:r.icon,label:r.name}); }}
                            style={{padding:"3px 9px",borderRadius:7,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:4,
                              background:sel?"#fef9e7":"#f9fafb",border:"2px solid "+(sel?"rgba(245,158,11,0.5)":"#e3e6ea"),
                              color:sel?AMBER:"#9ca3af",fontWeight:sel?700:400}}>
                            {r.icon&&<span>{r.icon}</span>}{r.name}{sel&&<span> ✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AGREGAR QC */}
        {destQC.length > 0 && (
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:GREEN,textTransform:"uppercase",marginBottom:6}}>⭐ Agregar QC</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {destQC.map(function(cat){
                return (
                  <button key={cat.id} onClick={function(){ addDest(cat,"qc"); }}
                    style={{padding:"6px 12px",borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",gap:6,
                      background:"rgba(21,101,192,0.04)",border:"2px solid rgba(21,101,192,0.15)",fontSize:12}}>
                    <span>{cat.icon||"🏖️"}</span>
                    <span style={{fontWeight:600,color:"#1a1f2e"}}>{cat.nombre}</span>
                    <span style={{fontSize:10,color:BLUE}}>{(cat.qc&&cat.qc.nights)||5}n</span>
                    <span style={{color:BLUE,fontWeight:700}}>+</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* AGREGAR NQ */}
        {destNQ.length > 0 && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,color:VIOLET,textTransform:"uppercase",marginBottom:6}}>🔹 Agregar NQ</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {destNQ.map(function(cat){
                return (
                  <button key={cat.id} onClick={function(){ addDest(cat,"nq"); }}
                    style={{padding:"6px 12px",borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",gap:6,
                      background:"rgba(124,58,237,0.04)",border:"2px solid rgba(124,58,237,0.15)",fontSize:12}}>
                    <span>{cat.icon||"🏖️"}</span>
                    <span style={{fontWeight:600,color:"#1a1f2e"}}>{cat.nombre}</span>
                    <span style={{fontSize:10,color:VIOLET}}>{(cat.nq&&cat.nq.nights)||3}n · {(cat.nq&&cat.nq.label)||"NQ"}</span>
                    <span style={{color:VIOLET,fontWeight:700}}>+</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {err && <div style={{fontSize:12,color:RED,marginBottom:10}}>⚠️ {err}</div>}

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button style={S.btn("ghost")} onClick={props.onClose}>Cancelar</button>
          <button style={S.btn("primary")} onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar destinos"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FICHA DEL MIEMBRO — tabs
// ─────────────────────────────────────────────────────────────
function FichaMiembro(props) {
  var c=props.cliente; var perms=props.perms; var rol=props.rol;
  var reservas=props.reservas; var interacciones=props.interacciones;
  var casos=props.casos; var ops=props.ops;
  var [tab,setTab]=useState("contacto");

  var resCliente=reservas.filter(function(r){return r.clienteFolio===c.folio;});
  var resActivas=resCliente.filter(function(r){return r.status!=="cancelada"&&r.status!=="completada";});
  var casosCliente=casos.filter(function(x){return x.clienteFolio===c.folio;});
  var opsCliente=ops.filter(function(x){return x.clienteFolio===c.folio;});
  var historialCS=interacciones.filter(function(x){return x.clienteFolio===c.folio;}).sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);});

  var MEMBCOLOR={Silver:"#6b7280",Gold:AMBER,Platinum:VIOLET};
  var [editDestinos,  setEditDestinos]  = useState(false);
  var [editContacto,  setEditContacto]  = useState(false);
  var [editNombre,    setEditNombre]    = useState(false);
  var [transferir,    setTransferir]    = useState(false);

  var TABS=[
    {id:"contacto",  label:"📞 Contacto",                         show:perms.verContacto},
    {id:"paquete",   label:"📦 Paquete",                          show:true},
    {id:"reservas",  label:"🏨 Reservas"+(resCliente.length?" ("+resCliente.length+")":""), show:true},
    {id:"financiero",label:"💰 Financiero",                       show:perms.verFinanciero},
    {id:"casos",     label:"📋 Casos"+(casosCliente.length?" ("+casosCliente.length+")":""), show:perms.crearCaso||perms.verHistorial},
    {id:"ops",       label:"⚙️ Ops"+(opsCliente.length?" ("+opsCliente.length+")":""),      show:perms.crearOperacion||perms.verHistorial},
    {id:"historial", label:"🕒 Historial",                        show:perms.verHistorial},
  ].filter(function(t){return t.show;});

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* HEADER DEL MIEMBRO */}
      <div style={{background:"#ffffff",borderBottom:"1px solid #e3e6ea",padding:"12px 20px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,"+BLUE+","+TEAL+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff",flexShrink:0}}>
              {c.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{fontSize:16,fontWeight:700,color:"#1a1f2e"}}>{c.nombre}{c.coProp?" + "+c.coProp:""}</div>
                <button onClick={function(){ setEditNombre(true); }} style={{background:"none",border:"1px solid #e3e6ea",borderRadius:6,padding:"2px 7px",cursor:"pointer",fontSize:11,color:"#6b7280"}}>✏️</button>
              </div>
              <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>
                {c.folio}
                {c.estadoCivil?" · "+c.estadoCivil:""}
                {c.edad?" · "+c.edad+" años":""}
                {c.coProp&&c.pEdad?" · "+c.coProp+": "+c.pEdad+" años":""}
                {c.vendedor?" · Vend: "+c.vendedor:""}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
            <span style={S.bdg(GREEN,"#edf7ee","#a3d9a5")}>✅ Miembro activo</span>
            <span style={S.bdg(MEMBCOLOR[c.membresia]||"#6b7280","#f4f5f7","#e3e6ea")}>{c.membresia}</span>
            {c.saldoPendiente>0&&<span style={S.bdg(AMBER,"#fef9e7","#f0d080")}>Saldo {fmtUSD(c.saldoPendiente)}</span>}
            {c.verificacion&&!c.verificacion.firma_firmada_at&&<span style={S.bdg(RED,"#fef2f2","#f5b8b8")}>✍️ Firma pendiente</span>}
            {resActivas.length>0&&<span style={S.bdg(TEAL,"rgba(14,165,160,0.08)","rgba(14,165,160,0.3)")}>{resActivas.length} reserva{resActivas.length>1?"s":""}</span>}
          </div>
        </div>
        {/* RESUMEN RAPIDO */}
        <div style={{display:"flex",gap:16,fontSize:11,color:"#9ca3af",marginBottom:10,flexWrap:"wrap"}}>
          <span>Paquete: <strong style={{color:"#1a1f2e"}}>{fmtUSD(c.precioPaquete)}</strong></span>
          <span>Pagado: <strong style={{color:GREEN}}>{fmtUSD(c.totalPagado)}</strong></span>
          {c.saldoPendiente>0&&<span>Saldo: <strong style={{color:AMBER}}>{fmtUSD(c.saldoPendiente)}</strong></span>}
          <span>Vigencia: <strong style={{color:"#1a1f2e"}}>{fmtDate(c.vigencia)}</strong></span>
          <span>Compra: <strong style={{color:"#1a1f2e"}}>{fmtDate(c.compra)}</strong></span>
        </div>
        {/* ACCIONES */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          {perms.crearReserva
            ? <button style={S.btn("teal")} onClick={function(){props.onNuevaReserva(c);}}>+ Reserva</button>
            : <button style={Object.assign({},S.btn("ghost"),{opacity:0.45,cursor:"not-allowed"})} disabled>+ Reserva</button>}
          {perms.crearNota&&<button style={S.btn("ghost")} onClick={function(){props.onNota(c);}}>+ Nota</button>}
          {perms.crearCaso&&<button style={S.btn("indigo")} onClick={function(){props.onCaso(c);}}>+ Caso</button>}
          {perms.crearOperacion&&<button style={S.btn("warn")} onClick={function(){props.onOp(c);}}>+ Op.</button>}
          {c.firma_contrato&&<button style={S.btn("indigo")} onClick={function(){props.onVerFirma(c);}}>📄 Ver certificado</button>}
          <CommPanelTrigger cliente={c} onOpen={props.onComm}/>
          {perms.iniciarRetencion&&c.statusCliente==="activo"&&(
            <button style={S.btn("danger")} onClick={function(){props.onRetencion(c);}}>Retención</button>
          )}
          <button style={S.btn("indigo")} onClick={function(){ setTransferir(true); }}>Transferir</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{background:"#ffffff",borderBottom:"1px solid #e3e6ea",padding:"0 20px",display:"flex",gap:0,overflowX:"auto",flexShrink:0}}>
        {TABS.map(function(t){
          return <button key={t.id} style={S.tab(tab===t.id)} onClick={function(){setTab(t.id);}}>{t.label}</button>;
        })}
      </div>

      {/* CONTENIDO */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px",background:"#f4f5f7"}}>

        {/* ── PAQUETE ── */}
        {tab==="paquete"&&(
          <div>
            <div style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={S.stit}>Destinos del paquete</div>
                <button style={Object.assign({},S.btn("ghost"),{padding:"4px 10px",fontSize:11})} onClick={function(){ setEditDestinos(true); }}>✏️ Editar</button>
              </div>
              {(c.destinos||[]).length===0&&<div style={{fontSize:12,color:"#9ca3af",textAlign:"center",padding:"20px 0"}}>Sin destinos asignados</div>}
              {(c.destinos||[]).map(function(d,i){
                var resD=resCliente.filter(function(r){return r.destino===d.nombre;});
                var resActD=resD.filter(function(r){return r.status!=="cancelada"&&r.status!=="completada";});
                return (
                  <div key={i} style={{padding:"10px 12px",borderRadius:9,marginBottom:7,
                    background:d.tipo==="qc"?"rgba(21,101,192,0.04)":"rgba(146,92,10,0.04)",
                    border:"1px solid "+(d.tipo==="qc"?"rgba(21,101,192,0.2)":"rgba(146,92,10,0.2)")}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#1a1f2e"}}>{d.nombre}</div>
                        <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>
                          {d.noches} noches · {(d.tipo||"").toUpperCase()}
                          {d.regalo?" · 🎁 "+d.regalo.label:""}
                        </div>
                      </div>
                      <div>
                        {resActD.length>0
                          ? <span style={S.bdg(TEAL,"rgba(14,165,160,0.08)","rgba(14,165,160,0.3)")}>Reserva activa</span>
                          : perms.crearReserva&&<button style={Object.assign({},S.btn("ghost"),{fontSize:11,padding:"4px 10px"})} onClick={function(){props.onNuevaReserva(c,d);}}>+ Reservar</button>
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ── CONTACTO ── */}
        {tab==="contacto"&&(
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={S.stit}>Datos de contacto</div>
                <button style={Object.assign({},S.btn("ghost"),{padding:"4px 10px",fontSize:11})} onClick={function(){ setEditContacto(true); }}>✏️ Editar</button>
              </div>
            <div style={S.g2}>
              {[["📞 Teléfono","tel"],["💬 WhatsApp","whatsapp"],["✉️ Email","email"],["📍 Calle","direccion"],["🏙️ Ciudad","ciudad"],["Estado","estado"],["ZIP / CP","zip"]].map(function(f){
                return <div key={f[0]}>
                  <label style={S.label}>{f[0]}</label>
                  <div style={{fontSize:13,color:"#1a1f2e",padding:"4px 0"}}>{c[f[1]]||"—"}</div>
                </div>;
              })}
              {(c.tFechaNac||c.pFechaNac)&&(
                <div style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  {c.tFechaNac&&<div>
                    <label style={S.label}>Fecha nac. titular</label>
                    <div style={{fontSize:13,color:"#1a1f2e",padding:"4px 0"}}>{c.tFechaNac}</div>
                  </div>}
                  {c.pFechaNac&&<div>
                    <label style={S.label}>Fecha nac. co-prop</label>
                    <div style={{fontSize:13,color:"#1a1f2e",padding:"4px 0"}}>{c.pFechaNac}</div>
                  </div>}
                </div>
              )}
              {c.coProp&&(
                <div style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div>
                    <label style={S.label}>👥 Co-propietario</label>
                    <div style={{fontSize:13,color:"#1a1f2e",padding:"4px 0"}}>{c.coProp}</div>
                  </div>
                  {c.coPropTel&&<div>
                    <label style={S.label}>Tel. co-propietario</label>
                    <div style={{fontSize:13,color:"#1a1f2e",padding:"4px 0"}}>{c.coPropTel}</div>
                  </div>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RESERVAS ── */}
        {tab==="reservas"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={S.stit}>Reservas ({resCliente.length})</div>
              {perms.crearReserva&&<button style={S.btn("teal")} onClick={function(){props.onNuevaReserva(c);}}>+ Nueva reserva</button>}
            </div>
            {resCliente.length===0&&<div style={{textAlign:"center",padding:"40px",color:"#9ca3af",fontSize:13}}>Sin reservas registradas</div>}
            {resCliente.sort(function(a,b){return new Date(b.creadoEn||b.checkin)-new Date(a.creadoEn||a.checkin);}).map(function(r){
              var sc=RES_STATUS[r.status]||RES_STATUS.solicitud;
              return (
                <div key={r.id} onClick={function(){props.onVerReserva(r);}} style={Object.assign({},S.card,{cursor:"pointer",borderColor:sc.br})}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#1a1f2e"}}>{r.destino}</div>
                      <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{r.hotel}</div>
                    </div>
                    <div style={{display:"flex",gap:5}}>
                      <span style={S.bdg(r.tipo==="qc"?BLUE:AMBER,r.tipo==="qc"?"#e8f0fe":"#fef9e7",r.tipo==="qc"?"#aac4f0":"#f0d080")}>{(r.tipo||"").toUpperCase()}</span>
                      <span style={S.bdg(sc.color,sc.bg,sc.br)}>{sc.label}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:14,fontSize:11,color:"#6b7280",flexWrap:"wrap"}}>
                    <span>Check-in: <strong style={{color:"#1a1f2e"}}>{fmtDate(r.checkin)}</strong></span>
                    <span>Noches: <strong style={{color:TEAL}}>{daysBetween(r.checkin,r.checkout)}</strong></span>
                    {r.confirmacion&&<span style={{color:GREEN}}>No. {r.confirmacion}</span>}
                    {r.totalCobrado>0&&<span>Cargo: <strong style={{color:AMBER}}>{fmtUSD(r.totalCobrado)}</strong></span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── HISTORIAL ── */}
        {tab==="historial"&&(
          <div>
            <div style={S.stit}>Historial CRM — Ventas + Verificación</div>
            <TablaHistorial leadId={c.id} />
            {historialCS.length>0&&(
              <div style={{marginTop:16}}>
                <div style={S.stit}>Interacciones CS</div>
                {historialCS.map(function(item){
                  var cols={compra:GREEN,pago:GREEN,reserva_creada:TEAL,reserva_confirmada:GREEN,reserva_cancelada:RED,nota:"#9ca3af",caso:BLUE,operacion:AMBER,retencion:RED,email_enviado:VIOLET,whatsapp:GREEN};
                  return <EventoDot key={item.id} tipo={item.tipo} canal={item.canal} texto={item.texto} fecha={item.fecha} autor={item.autor} col={cols[item.tipo]||"#9ca3af"}/>;
                })}
              </div>
            )}
          </div>
        )}

        {/* ── FINANCIERO ── */}
        {tab==="financiero"&&(
          perms.verFinanciero ? (
            <div>
              <div style={S.card}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:13,color:"#6b7280"}}>Precio del paquete</span><span style={{fontSize:16,fontWeight:700}}>{fmtUSD(c.precioPaquete)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:GREEN}}>Total pagado</span><span style={{fontSize:13,fontWeight:600,color:GREEN}}>{fmtUSD(c.totalPagado)}</span></div>
                {c.saldoPendiente>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,color:AMBER}}>Saldo pendiente</span><span style={{fontSize:13,fontWeight:600,color:AMBER}}>{fmtUSD(c.saldoPendiente)}</span></div>}
                <div style={{height:6,background:"#f0f1f4",borderRadius:4,overflow:"hidden",marginTop:8}}>
                  <div style={{height:"100%",width:Math.min(100,Math.round(c.totalPagado/(c.precioPaquete||1)*100))+"%",background:c.saldoPendiente>0?AMBER:GREEN,borderRadius:4,transition:"width 0.5s"}}/>
                </div>
                {c.saldoPendiente>0&&<PagoAbonoCS cliente={c} onAbono={props.onAbono}/>}
                {c.saldoPendiente<=0&&<div style={{marginTop:12,padding:"10px 14px",borderRadius:9,background:"rgba(26,127,60,0.06)",border:"1px solid #a3d9a5",textAlign:"center",fontSize:13,color:GREEN,fontWeight:600}}>✅ Saldo liquidado</div>}
              </div>
              <div style={S.stit}>Historial de pagos</div>
              {(c.pagos||[]).map(function(p){
                return <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f0f1f4"}}>
                  <div><div style={{fontSize:12,color:"#1a1f2e"}}>{p.concepto}</div><div style={{fontSize:10,color:"#9ca3af"}}>{fmtDate(p.fecha)} · {p.metodo} · {p.referencia}</div></div>
                  <span style={{fontSize:13,fontWeight:600,color:GREEN}}>{fmtUSD(p.monto)}</span>
                </div>;
              })}
            </div>
          ) : <div style={{textAlign:"center",padding:"40px",color:"#9ca3af"}}>Sin permiso para ver datos financieros</div>
        )}

        {/* ── CASOS ── */}
        {tab==="casos"&&(
          <div>
            {casosCliente.length===0&&<div style={{textAlign:"center",padding:"40px",color:"#9ca3af"}}>Sin casos registrados</div>}
            {casosCliente.map(function(x){
              var st=CASO_STATUS[x.status]||CASO_STATUS.abierto;
              return <div key={x.id} style={S.card}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{fontSize:13,fontWeight:600,color:"#1a1f2e"}}>{x.titulo}</div><span style={S.bdg(st.color,st.bg,st.br)}>{st.label}</span></div>
                <div style={{fontSize:11,color:"#9ca3af"}}>{x.categoria} · {x.folio} · {fmtDate(x.creado)} · {x.autor}</div>
                {x.resolucion&&<div style={{fontSize:12,color:"#6b7280",marginTop:5}}>{x.resolucion}</div>}
              </div>;
            })}
          </div>
        )}

        {/* ── OPERACIONES ── */}
        {tab==="ops"&&(
          <div>
            {opsCliente.length===0&&<div style={{textAlign:"center",padding:"40px",color:"#9ca3af"}}>Sin operaciones</div>}
            {opsCliente.map(function(o){
              var cfg=OP_TIPOS[o.tipo]; var st=OP_STATUS[o.status];
              return <div key={o.id} style={S.card}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {cfg&&<span style={S.bdg(cfg.color,cfg.bg,cfg.br)}>{cfg.label}</span>}
                    <span style={{fontSize:11,color:"#9ca3af"}}>{o.folio}</span>
                  </div>
                  {st&&<span style={S.bdg(st.color,st.bg,st.br)}>{st.label}</span>}
                </div>
                <div style={{fontSize:11,color:"#9ca3af"}}>{fmtDate(o.creado)} · {o.autor}</div>
                {o.notaCS&&<div style={{fontSize:12,color:"#6b7280",marginTop:4}}>{o.notaCS}</div>}
                {o.detalle&&o.tipo==="cancelacion"&&(
                  <div style={{marginTop:8,display:"flex",gap:14,fontSize:11,color:"#9ca3af"}}>
                    <span>Dias: <strong style={{color:"#1a1f2e"}}>{o.detalle.diasDesdeCompra||o.detalle.dias}d</strong></span>
                    <span>Politica: <strong style={{color:AMBER}}>{o.detalle.pct}%</strong></span>
                    <span>Reembolso est.: <strong style={{color:GREEN}}>{fmtUSD(o.detalle.montoReembolso)}</strong></span>
                  </div>
                )}
              </div>;
            })}
          </div>
        )}

      </div>
    {editNombre   && <EditNombreModal    cliente={c} onClose={function(){ setEditNombre(false);  }} onSave={function(upd){
        setEditNombre(false);
        // Actualizar _exp en memoria para reflejar cambios sin recargar
        var expActual = c._exp || {};
        var expNuevo = Object.assign({}, expActual, {
          tFirstName: (upd.nombre||"").split(" ")[0],
          tLastName:  (upd.nombre||"").split(" ").slice(1).join(" "),
          tFechaNac:  upd.tFechaNac  || expActual.tFechaNac  || "",
          hasPartner: upd.hasPartner,
          pFirstName: upd.pFirstName || "",
          pLastName:  upd.pLastName  || "",
          pFechaNac:  upd.pFechaNac  || "",
        });
        if(props.onExpUpdate) props.onExpUpdate(expNuevo, upd.nombre, c.id);
        if(props.onNombreGuardado) props.onNombreGuardado();
      }}/>}
    {transferir    && <TransferirModal     cliente={c} onClose={function(){ setTransferir(false);  }} onSave={function(){ setTransferir(false);  if(props.onTransferencia)    props.onTransferencia();    }}/>}
    {editContacto && <EditContactoModal cliente={c} onClose={function(){ setEditContacto(false); }} onSave={function(nuevos){ setEditContacto(false); if(props.onContactoGuardado) props.onContactoGuardado(nuevos); }}/>}
    {editDestinos && <EditDestinosModal cliente={c} catalog={props.destCatalogMap||{}} onClose={function(){ setEditDestinos(false); }} onSave={function(){ setEditDestinos(false); if(props.onDestinosGuardados) props.onDestinosGuardados(); }}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LISTA DE MIEMBROS (sidebar izquierdo)
// ─────────────────────────────────────────────────────────────
function ListaMiembros(props) {
  var [q,setQ]=useState(""); var [filtro,setFiltro]=useState("todos");
  var filtrados=useMemo(function(){
    var r=props.clientes;
    if(filtro==="saldo") r=r.filter(function(c){return c.saldoPendiente>0;});
    if(filtro==="retencion") r=r.filter(function(c){return c.statusCliente==="retencion";});
    if(q.trim()){ var lq=q.toLowerCase(); r=r.filter(function(c){return c.nombre.toLowerCase().includes(lq)||c.folio.toLowerCase().includes(lq)||(c.email||"").toLowerCase().includes(lq)||(c.tel||"").includes(lq);}); }
    return r;
  },[props.clientes,filtro,q]);

  return (
    <div style={{width:268,flexShrink:0,borderRight:"1px solid #e3e6ea",display:"flex",flexDirection:"column",background:"#ffffff"}}>
      <div style={{padding:"12px 12px 8px",borderBottom:"1px solid #e3e6ea"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:7}}>
          Miembros activos ({props.clientes.length})
        </div>
        <input style={Object.assign({},S.input,{marginBottom:7})} placeholder="Buscar nombre, folio, email..." value={q} onChange={function(e){setQ(e.target.value);}}/>
        <div style={{display:"flex",gap:3}}>
          {[["todos","Todos"],["saldo","Con saldo"],["retencion","Retención"]].map(function(f){
            return <button key={f[0]} style={Object.assign({},S.tab(filtro===f[0]),{padding:"3px 8px",fontSize:10,borderRadius:6,borderBottom:"none",border:"1px solid "+(filtro===f[0]?"#aac4f0":"#e3e6ea"),background:filtro===f[0]?"#e8f0fe":"#f4f5f7"})} onClick={function(){setFiltro(f[0]);}}>{f[1]}</button>;
          })}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {filtrados.length===0&&<div style={{fontSize:12,color:"#9ca3af",textAlign:"center",padding:"20px"}}>Sin resultados</div>}
        {filtrados.map(function(c){
          var sel=props.selected&&props.selected.folio===c.folio;
          var MEMBCOLOR={Silver:"#6b7280",Gold:AMBER,Platinum:VIOLET};
          return (
            <div key={c.folio} onClick={function(){props.onSelect(c);}}
              style={{padding:"10px 12px",cursor:"pointer",
                borderLeft:"3px solid "+(sel?BLUE:"transparent"),
                background:sel?"rgba(21,101,192,0.04)":"transparent",
                borderBottom:"1px solid #f0f1f4",transition:"all 0.1s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:2}}>
                <div style={{fontSize:13,fontWeight:600,color:"#1a1f2e",lineHeight:1.3}}>{c.nombre}</div>
                {c.saldoPendiente>0&&<span style={{fontSize:9,color:AMBER,fontWeight:700}}>{fmtUSD(c.saldoPendiente)}</span>}
              </div>
              <div style={{fontSize:10,color:"#9ca3af",marginBottom:2}}>{c.folio}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:600,color:MEMBCOLOR[c.membresia]||"#6b7280"}}>{c.membresia}</span>
                <span style={{fontSize:10,color:"#9ca3af"}}>{(c.destinos||[]).map(function(d){return d.nombre;}).join(", ")||"Sin destinos"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT — CsReservas v3
// ─────────────────────────────────────────────────────────────
export default function CsReservasV3() {
  var currentUser = {nombre:"Ana Lopez (CS)", rol:"cs"};
  var [rolActual,   setRolActual]  = useState("cs");
  var [miembros,    setMiembros]   = useState([]);
  var [loading,     setLoading]    = useState(true);
  var [error,       setError]      = useState(null);
  var [selected,    setSelected]   = useState(null);
  var [reservas,    setReservas]   = useState([]);
  var [interacciones,setInteracciones] = useState([]);
  var [casos,       setCasos]      = useState([]);
  var [operaciones, setOperaciones]= useState([]);
  var [modal,       setModal]      = useState(null);
  var [toast,       setToast]      = useState("");
  var [destCatalogMap, setDestCatalogMap] = useState({});

  var perms   = (ROLES[rolActual]||ROLES.cs).permisos;
  var rolCfg  = ROLES[rolActual]||ROLES.cs;
  var comm    = useCommPanel();

  // ── Notificación rápida
  function showToast(msg){ setToast(msg); setTimeout(function(){ setToast(""); },3000); }

  // ── Cargar catálogo de destinos (para nombres)
  useEffect(function(){
    SB.from("destinos_catalog").select("id,nombre,icon,qc,nq,activo").then(function(res){
      if(res.data){ var m={}; res.data.forEach(function(d){ m[d.id]=d; }); setDestCatalogMap(m); }
    });
  },[]);

  // ── Cargar miembros: leads con status='venta'
  function cargarMiembros(){
    setLoading(true); setError(null);
    SB.from("leads")
      .select("*")
      .eq("status","venta")
      .order("created_at",{ascending:false})
      .then(function(res){
        if(res.error){ setLoading(false); setError(res.error.message); return; }
        var m=(res.data||[]).map(leadToMiembro);
        var leadIds = m.map(function(mb){ return mb.id; });
        // Cargar reservas desde tabla reservaciones usando lead_id
        SB.from("reservaciones")
          .select("*")
          .in("lead_id", leadIds)
          .order("created_at",{ascending:false})
          .then(function(resRv){
            setLoading(false);
            var todasReservas = [];
            if (!resRv.error) {
              (resRv.data||[]).forEach(function(rv){
                var mb = m.find(function(x){ return x.id === rv.lead_id; });
                if (!mb) return;
                todasReservas.push({
                  id:           rv.id,
                  folio:        rv.folio,
                  clienteFolio: mb.folio,
                  destino:      rv.destino_nombre || rv.destino_id || "",
                  checkin:      rv.checkin || "",
                  checkout:     rv.checkout || "",
                  adultos:      rv.adultos || rv.pax || 2,
                  ninos:        rv.ninos || 0,
                  hotel:        rv.hotel || "",
                  habitacion:   rv.habitacion || "",
                  regimen:      rv.regimen || "",
                  tipo:         rv.tipo || "qc",
                  status:       rv.status || "solicitud",
                  confirmacion: rv.num_confirmacion || "",
                  notasInternas:rv.notas_agente || "",
                  agente:       rv.agente_nombre || "CS",
                  nochesIncluidas: rv.noches_base || 0,
                  nochesExtra:  rv.noches_extra || 0,
                  creadoEn:     rv.created_at ? rv.created_at.split("T")[0] : TODAY,
                  historial:    rv.historial || [{fecha:rv.created_at?rv.created_at.split("T")[0]:TODAY, texto:"Reserva creada", autor:rv.agente_nombre||"CS"}],
                });
              });
            }
            setReservas(todasReservas);
            setMiembros(function(prev){
              if(prev.length>0 && m.length>prev.length){
                var nuevos=m.filter(function(nm){ return !prev.find(function(pm){return pm.id===nm.id;}); });
                if(nuevos.length>0) showToast("Nueva venta: "+nuevos[0].nombre+" 🎉");
              }
              return m;
            });
            setSelected(function(prev){
              if(!prev&&m.length>0) return m[0];
              if(prev){ var upd=m.find(function(x){return x.id===prev.id;}); return upd||prev; }
              return prev;
            });
          });
      });
  }

  useEffect(function(){ cargarMiembros(); },[]);

  // Polling 30s para detectar nuevas ventas en tiempo real
  useEffect(function(){
    // Sin auto-refresh para no interrumpir edicion de modales
  },[]);

  // Enriquecer nombres de destinos con catálogo cuando tengamos ambos
  var miembrosEnriquecidos = useMemo(function(){
    if(Object.keys(destCatalogMap).length===0) return miembros;
    return miembros.map(function(m){
      return Object.assign({},m,{
        destinos:(m.destinos||[]).map(function(d){
          var cat = destCatalogMap[d.leadDestId||d.nombre];
          return cat ? Object.assign({},d,{nombre:(cat.icon||"")+" "+cat.nombre}) : d;
        }),
      });
    });
  },[miembros,destCatalogMap]);

  // ── Handlers
  function closeModal(){ setModal(null); }

  function addEvento(clienteFolio,tipo,canal,texto,autor){
    setInteracciones(function(prev){return [{id:uid(),clienteFolio:clienteFolio,tipo:tipo,canal:canal,texto:texto,autor:autor,fecha:new Date().toISOString()},...prev];});
  }

  function handleNuevaReserva(c,d){ if(perms.crearReserva) setModal({tipo:"nueva_res",cliente:c,destino:d||null}); }
  function handleVerReserva(r){ setModal({tipo:"ver_res",reserva:r}); }
  function handleNota(c){ setModal({tipo:"nota",cliente:c}); }
  function handleCaso(c){ setModal({tipo:"caso",cliente:c}); }
  function handleOp(c){ setModal({tipo:"op",cliente:c}); }

  function handleRetencion(c){
    setMiembros(function(prev){return prev.map(function(m){return m.folio===c.folio?Object.assign({},m,{statusCliente:"retencion"}):m;});});
    if(selected&&selected.folio===c.folio) setSelected(function(p){return Object.assign({},p,{statusCliente:"retencion"});});
    addEvento(c.folio,"retencion","sistema","Proceso de retención iniciado.",rolCfg.label);
    showToast("Retención iniciada para "+c.nombre);
  }

  function saveReserva(clienteFolio, datos, esEdit, resId) {
    var miembro = miembros.find(function(m){ return m.folio === clienteFolio; });
    if (!miembro) { showToast("Error: miembro no encontrado"); return; }

    var dbData = {
      lead_id:       miembro.id,
      destino_id:    datos.destino || "",
      destino_nombre:datos.destino || "",
      checkin:       datos.checkin || null,
      checkout:      datos.checkout || null,
      adultos:       datos.adultos || 2,
      ninos:         datos.ninos || 0,
      tipo:          datos.tipo || "qc",
      noches_base:   datos.nochesIncluidas || 0,
      noches_extra:  datos.nochesExtra || 0,
      notas_agente:  datos.notasInternas || "",
      agente_nombre: datos.agente || rolCfg.label,
      status:        "solicitada",
    };

    if (esEdit) {
      SB.from("reservaciones").update(dbData).eq("id", resId)
      .then(function(res2) {
        if (res2.error) { showToast("Error al actualizar: " + res2.error.message); return; }
        showToast("Reserva actualizada");
        cargarMiembros();
      });
    } else {
      var folioNew = "RES-" + uid().toUpperCase().slice(0,6);
      SB.from("reservaciones").insert(Object.assign({}, dbData, { folio: folioNew }))
      .then(function(res2) {
        if (res2.error) {
          console.error("Error reserva:", JSON.stringify(res2.error));
          showToast("Error: " + res2.error.message + " | " + (res2.error.details||res2.error.hint||""));
          return;
        }
        showToast("Reserva creada: " + folioNew);
        cargarMiembros();
      });
    }
    // Actualizar estado local optimista
    var obj = Object.assign({}, datos, {
      id: esEdit ? resId : ("RES-"+uid().slice(0,6)), folio: esEdit ? resId : ("RES-"+uid().slice(0,6)),
      clienteFolio: clienteFolio, status: "solicitud", confirmacion: "",
      agente: datos.agente || rolCfg.label, creadoEn: TODAY,
      historial: [{fecha:TODAY, texto: esEdit?"Reserva modificada":"Reserva creada", autor:datos.agente||rolCfg.label}]
    });
    if (esEdit) { setReservas(function(p){ return p.map(function(r){ return r.id===resId ? obj : r; }); }); }
    else { setReservas(function(p){ return [obj, ...p]; }); }
    addEvento(clienteFolio, "reserva_" + (esEdit ? "modificada" : "creada"), "sistema",
      (esEdit ? "Reserva modificada: " + datos.destino : "Reserva creada: " + datos.destino), datos.agente || rolCfg.label);
  }

  function confirmarReserva(resId,numConf){
    setReservas(function(p){return p.map(function(r){
      if(r.id!==resId) return r;
      return Object.assign({},r,{status:"confirmada",confirmacion:numConf,historial:[...(r.historial||[]),{fecha:TODAY,texto:"Confirmada. No. "+numConf,autor:rolCfg.label}]});
    });});
    var res=reservas.find(function(r){return r.id===resId;});
    if(res) addEvento(res.clienteFolio,"reserva_confirmada","sistema","Reserva "+resId+" confirmada. No. "+numConf,rolCfg.label);
    showToast("Reserva confirmada ✅");
  }

  function cancelarReserva(resId){
    setReservas(function(p){return p.map(function(r){
      if(r.id!==resId) return r;
      return Object.assign({},r,{status:"cancelada",historial:[...(r.historial||[]),{fecha:TODAY,texto:"Reserva cancelada.",autor:rolCfg.label}]});
    });});
    showToast("Reserva cancelada");
  }

  function saveNota(txt,canal,autor){ if(selected) addEvento(selected.folio,"nota",canal,txt,autor); showToast("Nota guardada"); }

  function saveCaso(datos){
    var folio="CASO-"+uid().slice(0,5).toUpperCase();
    if(selected){
      setCasos(function(p){return [{id:uid(),clienteFolio:selected.folio,folio:folio,titulo:datos.titulo,categoria:datos.categoria,status:"abierto",canal:datos.canal,autor:datos.autor,creado:new Date().toISOString(),resolucion:""},...p];});
      addEvento(selected.folio,"caso",datos.canal,folio+": "+datos.titulo+" ("+datos.categoria+")",datos.autor);
    }
    showToast("Caso creado: "+folio);
  }

  function saveOp(datos){
    var folio="OP-"+uid().slice(0,5).toUpperCase();
    if(selected){
      setOperaciones(function(p){return [{id:uid(),clienteFolio:selected.folio,tipo:datos.tipo,folio:folio,status:"pendiente",autor:datos.autor,creado:new Date().toISOString(),notaCS:datos.notaCS,detalle:datos.detalle},...p];});
      addEvento(selected.folio,"operacion","sistema",folio+" — "+(OP_TIPOS[datos.tipo]||{label:datos.tipo}).label+" pendiente. "+datos.notaCS,datos.autor);
    }
    showToast("Operación enviada a aprobación");
  }

  // ── Selección actualizada después de cambios de estado
  var selectedActualizado = selected && miembrosEnriquecidos.find(function(m){return m.id===selected.id;}) || selected;

  var [modoDetalle, setModoDetalle] = useState(false);
  function handleSelect(c){ setSelected(c); setModoDetalle(true); }
  function handleRegresar(){ setModoDetalle(false); }

  function handleUpdatePagos(folio, nuevosAbonos){
    setMiembros(function(prev){ return prev.map(function(m){
      if(m.folio!==folio) return m;
      var totalPagado = (m.pagoInicial||0) + nuevosAbonos.reduce(function(s,p){ return s+(p.monto||0); },0);
      var saldo = Math.max(0,(m.precioPaquete||0)-totalPagado);
      return Object.assign({},m,{pagosHistorial:nuevosAbonos, totalPagado:totalPagado, saldoPendiente:saldo});
    }); });
    setSelected(function(prev){
      if(!prev||prev.folio!==folio) return prev;
      var totalPagado = (prev.pagoInicial||0) + nuevosAbonos.reduce(function(s,p){ return s+(p.monto||0); },0);
      var saldo = Math.max(0,(prev.precioPaquete||0)-totalPagado);
      return Object.assign({},prev,{pagosHistorial:nuevosAbonos, totalPagado:totalPagado, saldoPendiente:saldo});
    });
  }

  var [firmaModal, setFirmaModal] = useState(null);

  var fichaProps = {
    currentUser:currentUser, perms:perms, rol:rolActual,
    reservas:reservas, interacciones:interacciones, casos:casos, ops:operaciones,
    onNuevaReserva:handleNuevaReserva, onVerReserva:handleVerReserva,
    onNota:handleNota, onCaso:handleCaso, onOp:handleOp, onVerFirma:function(cl){ setFirmaModal(cl); },
    onRetencion:handleRetencion, onComm:comm.open,
    onAbono:function(nuevosAbonos){
      cargarMiembros();
    },
    onDestinosGuardados:function(){ cargarMiembros(); },
    onContactoGuardado:function(){ cargarMiembros(); },
    onNombreGuardado:function(){ cargarMiembros(); },
    onExpUpdate:function(expNuevo, nombreNuevo, clienteId){
      // Actualizar _exp del cliente en memoria sin recargar toda la lista
      setMiembros(function(prev){
        return prev.map(function(m){
          if(m.id !== clienteId) return m;
          return Object.assign({}, m, {
            nombre: nombreNuevo || m.nombre,
            _exp: expNuevo,
          });
        });
      });
      setSelected(function(prev){
        if(!prev || prev.id !== clienteId) return prev;
        return Object.assign({}, prev, {
          nombre: nombreNuevo || prev.nombre,
          _exp: expNuevo,
        });
      });
    },
    onTransferencia:function(){ cargarMiembros(); },
    destCatalogMap:destCatalogMap,
    onUpdatePagos:handleUpdatePagos,
  };

  return (
    <div style={S.wrap}>
      {firmaModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={function(){setFirmaModal(null);}}>
          <div style={{background:"#fff",borderRadius:12,padding:"20px",maxWidth:"500px",width:"100%"}} onClick={function(e){e.stopPropagation();}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
              <div style={{fontSize:"14px",fontWeight:"700",color:"#1a1f2e"}}>Certificado firmado — {firmaModal.nombre}</div>
              <button style={{background:"none",border:"none",cursor:"pointer",fontSize:"18px",color:"#9ca3af"}} onClick={function(){setFirmaModal(null);}}>✕</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
              {[{key:"firma_contrato",label:"Contrato"},{key:"firma_autorizacion",label:"Autorización"},{key:"firma_terminos",label:"Términos"}].map(function(doc){
                var img = firmaModal[doc.key];
                return (
                  <div key={doc.key} style={{border:"1px solid #e3e6ea",borderRadius:"8px",overflow:"hidden"}}>
                    <div style={{fontSize:"10px",fontWeight:"600",color:"#9ca3af",padding:"5px 8px",background:"#f9fafb",borderBottom:"1px solid #e3e6ea",textTransform:"uppercase"}}>{doc.label}</div>
                    {img ? <img src={img} alt={doc.label} style={{width:"100%",height:"80px",objectFit:"contain",background:"#fff",display:"block"}} />
                         : <div style={{height:"80px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",color:"#d1d5db"}}>sin firma</div>}
                  </div>
                );
              })}
            </div>
            {firmaModal.firma_firmada_at && (
              <div style={{marginTop:"14px",padding:"12px",background:"#f8f9fb",borderRadius:"8px",border:"1px solid #e3e6ea"}}>
                <div style={{fontSize:"11px",fontWeight:"700",color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"8px"}}>Hoja de confirmación</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px",fontSize:"12px"}}>
                  <div><span style={{color:"#9ca3af"}}>Firmado:</span> <strong>{new Date(firmaModal.firma_firmada_at).toLocaleString("es-MX",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})}</strong></div>
                  <div><span style={{color:"#9ca3af"}}>IP:</span> <strong>{firmaModal.firma_ip||"—"}</strong></div>
                  <div><span style={{color:"#9ca3af"}}>Zona horaria:</span> <strong>{firmaModal.firma_location||"—"}</strong></div>
                  <div style={{gridColumn:"1/-1"}}><span style={{color:"#9ca3af"}}>Dispositivo:</span> <strong style={{fontSize:"10px",wordBreak:"break-all"}}>{firmaModal.firma_device||"—"}</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOPBAR */}
      <div style={S.topbar}>
        <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:"0.1em",textTransform:"uppercase"}}>Mini-Vac CRM</div>
        <div style={{width:1,height:18,background:"#e3e6ea"}}/>
        <div style={{fontSize:14,fontWeight:600,color:"#1a385a"}}>Customer Service & Reservas</div>
        <div style={{flex:1}}/>
        {/* Selector de rol */}
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:11,color:"#9ca3af"}}>Vista:</span>
          {Object.entries(ROLES).map(function(e){
            var active=rolActual===e[0];
            return <button key={e[0]} style={Object.assign({},S.btn(active?"primary":"ghost"),{padding:"5px 10px",fontSize:11})} onClick={function(){setRolActual(e[0]);}}>{e[1].label}</button>;
          })}
        </div>
        <button style={Object.assign({},S.btn("ghost"),{padding:"5px 10px",fontSize:11})} onClick={cargarMiembros}>🔄 Actualizar</button>
        <div style={{fontSize:10,color:"#9ca3af"}}>{fmtDate(TODAY)}</div>
      </div>

      {/* BODY */}
      <div style={{height:"calc(100vh - 52px)",display:"flex",overflow:"hidden"}}>

        {loading ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
            <div style={{width:32,height:32,border:"3px solid #e3e6ea",borderTopColor:BLUE,borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
            <div style={{fontSize:13,color:"#9ca3af"}}>Cargando miembros activos...</div>
          </div>
        ) : error ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
            <div style={{fontSize:14,color:RED,fontWeight:600}}>Error al cargar: {error}</div>
            <button style={S.btn("primary")} onClick={cargarMiembros}>Reintentar</button>
          </div>
        ) : miembrosEnriquecidos.length===0 ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}>
            <div style={{fontSize:32}}>🏖️</div>
            <div style={{fontSize:15,fontWeight:700,color:"#1a1f2e"}}>Sin miembros activos aún</div>
            <div style={{fontSize:12,color:"#9ca3af",maxWidth:320,textAlign:"center"}}>
              Cuando un lead cambie a estado <strong>"venta"</strong> en el módulo de verificación, aparecerá aquí automáticamente como miembro activo.
            </div>
            <button style={S.btn("indigo")} onClick={cargarMiembros}>🔄 Verificar ahora</button>
          </div>
        ) : (
          <>
            {/* MODO LISTA — se oculta al seleccionar */}
            {!modoDetalle && (
              <ListaMiembros
                clientes={miembrosEnriquecidos}
                selected={selectedActualizado}
                onSelect={handleSelect}
              />
            )}
            {/* MODO DETALLE — ocupa toda la pantalla */}
            {modoDetalle && selectedActualizado ? (
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                {/* Barra de navegación con botón regresar */}
                <div style={{background:"#ffffff",borderBottom:"1px solid #e3e6ea",padding:"8px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  <button style={Object.assign({},S.btn("ghost"),{padding:"5px 12px",fontSize:12})} onClick={handleRegresar}>
                    ← Miembros
                  </button>
                  <div style={{width:1,height:16,background:"#e3e6ea"}}/>
                  <div style={{fontSize:12,color:"#6b7280"}}>{miembrosEnriquecidos.length} miembros</div>
                  <div style={{flex:1}}/>
                  {/* Navegación rápida anterior/siguiente */}
                  {(function(){
                    var idx = miembrosEnriquecidos.findIndex(function(m){return m.id===selectedActualizado.id;});
                    var prev = idx>0 ? miembrosEnriquecidos[idx-1] : null;
                    var next = idx<miembrosEnriquecidos.length-1 ? miembrosEnriquecidos[idx+1] : null;
                    return (
                      <div style={{display:"flex",gap:4}}>
                        <button style={Object.assign({},S.btn("ghost"),{padding:"4px 10px",fontSize:11,opacity:prev?1:0.35,cursor:prev?"pointer":"default"})} onClick={function(){if(prev) setSelected(prev);}} disabled={!prev}>‹ Ant.</button>
                        <button style={Object.assign({},S.btn("ghost"),{padding:"4px 10px",fontSize:11,opacity:next?1:0.35,cursor:next?"pointer":"default"})} onClick={function(){if(next) setSelected(next);}} disabled={!next}>Sig. ›</button>
                      </div>
                    );
                  })()}
                </div>
                <FichaMiembro key={selectedActualizado.id} cliente={selectedActualizado} {...fichaProps} onUpdatePagos={handleUpdatePagos}/>
              </div>
            ) : !modoDetalle && (
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,color:"#9ca3af"}}>
                <div style={{fontSize:24}}>👆</div>
                <div style={{fontSize:13}}>Selecciona un miembro de la lista</div>
              </div>
            )}
          </>
        )}

      </div>

      {/* MODALES */}
      {modal&&modal.tipo==="nueva_res"&&(
        <ReservaFormModal cliente={modal.cliente} destino={modal.destino} autor={rolCfg.label} onClose={closeModal}
          onSave={function(d){saveReserva(modal.cliente.folio,d,false,null);}}/>
      )}
      {modal&&modal.tipo==="editar_res"&&(
        <ReservaFormModal cliente={modal.cliente} reserva={modal.reserva} autor={rolCfg.label} onClose={closeModal}
          onSave={function(d){saveReserva(modal.cliente.folio,d,true,modal.reserva.id);}}/>
      )}
      {modal&&modal.tipo==="ver_res"&&(
        <ReservaDetailModal reserva={modal.reserva} perms={perms} onClose={closeModal}
          onConfirmar={confirmarReserva}
          onEditar={function(r){setModal({tipo:"editar_res",reserva:r,cliente:selectedActualizado});}}
          onCancelar={cancelarReserva}/>
      )}
      {modal&&modal.tipo==="nota"&&<NotaModal cliente={modal.cliente} onClose={closeModal} onSave={saveNota}/>}
      {modal&&modal.tipo==="caso"&&<CasoModal cliente={modal.cliente} onClose={closeModal} onSave={saveCaso}/>}
      {modal&&modal.tipo==="op"&&<OpModal cliente={modal.cliente} onClose={closeModal} onSave={saveOp}/>}

      <CommPanel
        visible={comm.visible}
        cliente={comm.cliente}
        logs={comm.logs}
        currentUser={currentUser}
        onClose={comm.close}
        onLog={function(entry){
          comm.addLog(entry);
          if(entry.clienteFolio) addEvento(entry.clienteFolio,entry.tipo||"nota",entry.canal||"sistema",entry.texto,entry.autor);
        }}
      />

      {/* TOAST */}
      {toast&&(
        <div style={{position:"fixed",bottom:20,right:20,background:"#1a385a",color:"#fff",padding:"10px 18px",borderRadius:10,fontSize:13,fontWeight:600,boxShadow:"0 4px 16px rgba(0,0,0,0.18)",zIndex:300,animation:"fadeIn 0.2s"}}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
