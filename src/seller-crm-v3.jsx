import { useState, useEffect, useRef } from "react";
import { supabase as SB } from "./supabase.js";
import EmailPanel from "./email-panel.jsx";
import ChatVendedor from "./chat-vendedor.jsx";
import CommPanel, { useCommPanel, CommPanelTrigger } from "./comm-panel";
import { registrarEvento, TablaHistorial } from "./useHistorial.jsx";

// 
// HELPERS
// 
const TODAY = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const ALERT_DAYS = 2;

function daysSince(d) {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d + "T12:00:00")) / 86400000);
}
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function daysFromNow(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function fmtDate(d) {
  if (!d) return "-";
  return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}
async function callClaude(prompt, max = 1000) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: max, messages: [{ role: "user", content: prompt }] }),
  });
  const d = await r.json();
  return d.content?.[0]?.text || "";
}

// 
// CONSTANTS
// 
const STATUS_ORDER = ["nuevo","no_contesta","contactado","interesado","cita","verificacion","venta","tarjeta_rechazada","no_interesado"];
const STATUS_CFG = {
  nuevo:         { label:"Nuevo",         icon:"", color:"#0369a1", bg:"#e0f2fe", border:"#bae6fd"  },
  no_contesta:   { label:"No Contesta",    icon:"", color:"#b45309", bg:"#fef3c7", border:"#fcd34d"  },
  contactado:    { label:"Contactado",    icon:"", color:"#5b21b6", bg:"#ede9fe", border:"#c4b5fd"  },
  interesado:    { label:"Interesado",    icon:"", color:"#925c0a", bg:"#fef9e7", border:"#f0d080"  },
  cita:          { label:"Cita",          icon:"", color:"#0f766e", bg:"#f0fdfa", border:"#99f6e4"  },
  verificacion:  { label:"Verificacion",  icon:"", color:"#1a7f3c", bg:"#edf7ee", border:"#a3d9a5"  },
  venta:         { label:"Venta",         icon:"", color:"#1a385a", bg:"#eaf0f7", border:"#b8cfe0"  },
  tarjeta_rechazada: { label:"Tarjeta Rechazada", icon:"", color:"#b91c1c", bg:"#fef2f2", border:"#fecaca"  },
  no_interesado: { label:"No interesado", icon:"", color:"#6b7280", bg:"#f4f5f7", border:"#e3e6ea"  },
};

const TIPOS_CONTACTO = ["llamada","whatsapp","cita","email","venta","verificacion","nota"];
const TIPO_ICONS = { llamada:"", whatsapp:"", cita:"", email:"", venta:"", verificacion:"", nota:"" };


const EMISORAS = ["Radio Hits","Banda 107","Stereo 94","Exitos 102","Mix 88","La Ke Buena"];
const ESTADO_CIVIL_OPTIONS = ["Casado","Union libre","Soltero hombre","Soltera mujer"];

//  Catalogo de destinos con reglas de calificacion 
// DESTINOS_CATALOG ahora viene de Supabase — ver SellerCRMv3 donde se carga
// Esta variable se rellena dinamicamente; se define aqui como fallback vacio
var DESTINOS_CATALOG = [];

// Convierte fila DB → formato interno seller
function dbToDestinoSeller(r) {
  var qc = r.qc || {};
  var nq = r.nq || {};
  return {
    id:      r.id,
    nombre:  r.nombre,
    icon:    r.icon || "",
    region:  r.region || "internacional",
    activo:  r.activo !== false,
    qc: {
      noches:  qc.nights  || qc.noches || 4,
      ageMin:  qc.ageMin  || 18,
      ageMax:  qc.ageMax  || 99,
      marital: qc.marital || [],
    },
    nq: {
      enabled: nq.enabled || false,
      noches:  nq.nights  || nq.noches || 3,
      label:   nq.label   || "",
    },
    regalosDisponibles: ((qc.gifts && qc.gifts.items) || [])
      .filter(function(g){ return g.active !== false; })
      .map(function(g){ return { id: g.id, icon: g.icon || "", label: g.name }; }),
  };
}



// Funcion de calificacion - igual que destinations-v5
function calificarDestinos(edad, estadoCivil, edadCoProp) {
  if (!edad || !estadoCivil) return { qc: [], nq: [] };
  const age = Number(edad);
  const ageCo = Number(edadCoProp) || 0;
  const qc = [], nq = [];
  for (const dest of DESTINOS_CATALOG) {
    const { ageMin, ageMax, marital } = dest.qc;
    const edadOk = (age >= ageMin && age <= ageMax) || (ageCo > 0 && ageCo >= ageMin && ageCo <= ageMax);
    const califica = edadOk && marital.includes(estadoCivil);
    if (califica) {
      qc.push(dest);
    } else if (dest.nq.enabled) {
      nq.push(dest);
    }
  }
  return { qc, nq };
}

// 
// SEED DATA
// 
const SEED_USERS = [
  { id:"U03", name:"Marco Silva",   role:"supervisor", supervisorId:null },
  { id:"U05", name:"Carlos Vega",   role:"vendedor",   supervisorId:"U03" },
  { id:"U06", name:"Ana Morales",   role:"vendedor",   supervisorId:"U03" },
  { id:"U07", name:"Luis Ramos",    role:"vendedor",   supervisorId:"U03" },
  { id:"U09", name:"Diana Ortiz",   role:"vendedor",   supervisorId:"U03" },
];

const mkLead = (o) => ({
  bloqueado:false, bloqueadoNota:"", proximoSeguimiento:null,
  salePrice:0, pagoInicial:0, metodoPago:"tarjeta",
  destinos:[], notas:[], edad:0, estadoCivil:"",
  email:"", whatsapp:"", coProp:"", coPropEdad:0, coPropTel:"",
  direccion:"", ciudad:"Miami", estado:"FL", zip:"",
  ...o,
});

const SEED_LEADS = [
  mkLead({ id:"L001", folio:"F001", nombre:"Miguel Torres",    edad:42, estadoCivil:"Casado",    tel:"305-1234-5678", whatsapp:"305-1234-5678", email:"mtorres@gmail.com",    coProp:"Sofia Torres",   coPropEdad:38, coPropTel:"305-1234-0001", direccion:"4520 NW 7th St",    emisora:"Radio Hits",  fecha:TODAY,      vendedorId:"U05", status:"nuevo",        ultimoContacto:TODAY }),
  mkLead({ id:"L002", folio:"F002", nombre:"Patricia Sanchez", edad:55, estadoCivil:"Soltero hombre",   tel:"305-2345-6789", whatsapp:"305-2345-6789", email:"psanchez@hotmail.com",                                                                  direccion:"8200 SW 8th St",    emisora:"Banda 107",   fecha:TODAY,      vendedorId:"U05", status:"contactado",   ultimoContacto:TODAY,       proximoSeguimiento:daysFromNow(1), notas:[{ts:TODAY,autor:"Carlos Vega",tipo:"llamada",nota:"Llame, muy interesada"}] }),
  mkLead({ id:"L003", folio:"F003", nombre:"Fernando Reyes",   edad:47, estadoCivil:"Casado",    tel:"305-3456-7890", whatsapp:"305-3456-7890", email:"freyes@yahoo.com",     coProp:"Maria Reyes",    coPropEdad:44, coPropTel:"305-3456-0002", direccion:"1200 Coral Way",    emisora:"Stereo 94",   fecha:daysAgo(1), vendedorId:"U05", status:"interesado",   ultimoContacto:daysAgo(1),  proximoSeguimiento:daysFromNow(2), notas:[{ts:daysAgo(1),autor:"Carlos Vega",tipo:"llamada",nota:"Muy interesado, quieren Cancun"}] }),
  mkLead({ id:"L004", folio:"F004", nombre:"Rosa Gutierrez",   edad:61, estadoCivil:"Soltero hombre",     tel:"305-4567-8901",                                                                                                                            direccion:"500 Flagler St",    emisora:"Radio Hits",  fecha:daysAgo(2), vendedorId:"U05", status:"nuevo",        ultimoContacto:daysAgo(3) }),
  mkLead({ id:"L005", folio:"F005", nombre:"Hector Jimenez",   edad:38, estadoCivil:"Casado",    tel:"305-5678-9012", whatsapp:"305-5678-9012", email:"hjimenez@gmail.com",   coProp:"Elena Jimenez",  coPropEdad:35, coPropTel:"305-5678-0003", direccion:"3100 SW 22nd Ave",  emisora:"Mix 88",      fecha:daysAgo(3), vendedorId:"U05", status:"cita",         ultimoContacto:daysAgo(1),  proximoSeguimiento:daysFromNow(1), notas:[{ts:daysAgo(1),autor:"Carlos Vega",tipo:"cita",nota:"Cita confirmada sabado 10am"}] }),
  mkLead({ id:"L006", folio:"F006", nombre:"Carmen Lopez",     edad:50, estadoCivil:"Casado",    tel:"305-6789-0123", whatsapp:"305-6789-0123", email:"clopez@gmail.com",     coProp:"Roberto Lopez",  coPropEdad:53, coPropTel:"305-6789-0004", direccion:"7800 Biscayne Blvd",emisora:"Exitos 102",  fecha:daysAgo(5), vendedorId:"U05", status:"venta",        ultimoContacto:daysAgo(1),  salePrice:52000, pagoInicial:8000, metodoPago:"tarjeta_credito", destinos:[{destId:"D01",tipo:"qc",noches:5,regalo:{id:"G001",icon:"",label:"Tour Chichen Itza"}}], notas:[{ts:daysAgo(1),autor:"Carlos Vega",tipo:"venta",nota:"Cerro. Cancun 5n QC."}] }),
  mkLead({ id:"L007", folio:"F007", nombre:"Pablo Mendoza",    edad:33, estadoCivil:"Soltero hombre",   tel:"305-7890-1234",                           email:"pmendoza@outlook.com",                                                                   direccion:"920 NE 2nd Ave",    emisora:"Banda 107",   fecha:TODAY,      vendedorId:"U06", status:"nuevo",        ultimoContacto:TODAY }),
  mkLead({ id:"L008", folio:"F008", nombre:"Laura Vasquez",    edad:44, estadoCivil:"Soltero hombre",tel:"305-8901-2345", whatsapp:"305-8901-2345", email:"lvasquez@gmail.com",                                                                    direccion:"2200 Collins Ave",  emisora:"Radio Hits",  fecha:TODAY,      vendedorId:"U06", status:"contactado",   ultimoContacto:TODAY,       proximoSeguimiento:daysFromNow(1), notas:[{ts:TODAY,autor:"Ana Morales",tipo:"llamada",nota:"Interesada, pregunto por Cancun"}] }),
  mkLead({ id:"L009", folio:"F009", nombre:"Andres Mora",      edad:52, estadoCivil:"Casado",    tel:"305-9012-3456", whatsapp:"305-9012-3456", email:"amora@yahoo.com",      coProp:"Ingrid Mora",    coPropEdad:49, coPropTel:"305-9012-0005", direccion:"5400 NW 36th St",   emisora:"Stereo 94",   fecha:daysAgo(1), vendedorId:"U06", status:"interesado",   ultimoContacto:daysAgo(2),  proximoSeguimiento:TODAY, notas:[{ts:daysAgo(2),autor:"Ana Morales",tipo:"llamada",nota:"Revisara con su esposa"}] }),
  mkLead({ id:"L010", folio:"F010", nombre:"Veronica Cruz",    edad:48, estadoCivil:"Casado",    tel:"305-0123-4567", whatsapp:"305-0123-4567", email:"vcruz@hotmail.com",    coProp:"Ivan Cruz",      coPropEdad:51, coPropTel:"305-0123-0006", direccion:"1100 Coral Reef Dr", emisora:"Mix 88",     fecha:daysAgo(2), vendedorId:"U06", status:"verificacion", ultimoContacto:daysAgo(1),  salePrice:78000, pagoInicial:12000, metodoPago:"tarjeta_credito", destinos:[{destId:"D03",tipo:"qc",noches:6,regalo:{id:"G009",icon:"",label:"Tour Tulum + Cenote"}},{destId:"D01",tipo:"qc",noches:5,regalo:null}], notas:[{ts:daysAgo(1),autor:"Ana Morales",tipo:"verificacion",nota:"Dos destinos. Enviado a verificacion."}] }),
  mkLead({ id:"L011", folio:"F011", nombre:"Jorge Ibarra",     edad:57, estadoCivil:"Soltero hombre",tel:"305-1234-0987",                                                                                                                            direccion:"3300 Bird Rd",      emisora:"Exitos 102",  fecha:daysAgo(4), vendedorId:"U06", status:"no_interesado",ultimoContacto:daysAgo(4),  notas:[{ts:daysAgo(4),autor:"Ana Morales",tipo:"llamada",nota:"Ya tiene paquete con otra empresa"}] }),
  mkLead({ id:"L012", folio:"F012", nombre:"Sofia Pedraza",    edad:36, estadoCivil:"Union libre",tel:"305-2345-1098",whatsapp:"305-2345-1098",  email:"spedraza@gmail.com",                                                                   direccion:"9500 SW 40th St",   emisora:"Radio Hits",  fecha:TODAY,      vendedorId:"U07", status:"nuevo",        ultimoContacto:TODAY }),
  mkLead({ id:"L013", folio:"F013", nombre:"Roberto Fuentes",  edad:62, estadoCivil:"Casado",    tel:"305-3456-2109",                           email:"rfuentes@yahoo.com",   coProp:"Martha Fuentes", coPropEdad:59, coPropTel:"305-3456-0007", direccion:"1800 NE 123rd St",  emisora:"Banda 107",   fecha:daysAgo(1), vendedorId:"U07", status:"contactado",   ultimoContacto:daysAgo(3),  proximoSeguimiento:TODAY }),
  mkLead({ id:"L014", folio:"F014", nombre:"Daniela Rios",     edad:29, estadoCivil:"Soltero hombre",   tel:"305-4567-3210", whatsapp:"305-4567-3210", email:"drios@gmail.com",                                                                       direccion:"600 Lincoln Rd",    emisora:"Stereo 94",   fecha:daysAgo(2), vendedorId:"U07", status:"cita",         ultimoContacto:daysAgo(1),  proximoSeguimiento:daysFromNow(1), notas:[{ts:daysAgo(1),autor:"Luis Ramos",tipo:"cita",nota:"Cita domingo 12pm"}] }),
  mkLead({ id:"L015", folio:"F015", nombre:"Eduardo Salinas",  edad:45, estadoCivil:"Casado",    tel:"305-5678-4321", whatsapp:"305-5678-4321", email:"esalinas@outlook.com", coProp:"Luz Salinas",    coPropEdad:42, coPropTel:"305-5678-0008", direccion:"4700 W Flagler St",  emisora:"Mix 88",     fecha:daysAgo(5), vendedorId:"U07", status:"venta",        ultimoContacto:daysAgo(2),  salePrice:61000, pagoInicial:10000, metodoPago:"efectivo", destinos:[{destId:"D06",tipo:"qc",noches:4,regalo:{id:"G016",icon:"",label:"Tour en barco bahia"}}], notas:[{ts:daysAgo(2),autor:"Luis Ramos",tipo:"venta",nota:"Cerro. Puerto Vallarta QC."}] }),
  mkLead({ id:"L016", folio:"F016", nombre:"Gloria Mendez",    edad:53, estadoCivil:"Soltero hombre",     tel:"305-6789-5432",                                                                                                                            direccion:"2100 SW 57th Ave",  emisora:"Radio Hits",  fecha:daysAgo(6), vendedorId:"U07", status:"nuevo",        ultimoContacto:daysAgo(6),  bloqueado:true, bloqueadoNota:"Sin actividad 6 dias" }),
  mkLead({ id:"L017", folio:"F017", nombre:"Marcos Tellez",    edad:40, estadoCivil:"Casado",    tel:"305-7890-6543", whatsapp:"305-7890-6543", email:"mtellez@gmail.com",    coProp:"Ana Tellez",     coPropEdad:37, coPropTel:"305-7890-0009", direccion:"3600 NW 82nd Ave",  emisora:"Exitos 102",  fecha:TODAY,      vendedorId:"U09", status:"nuevo",        ultimoContacto:TODAY }),
  mkLead({ id:"L018", folio:"F018", nombre:"Claudia Herrera",  edad:39, estadoCivil:"Casado",    tel:"305-8901-7654", whatsapp:"305-8901-7654", email:"cherrera@hotmail.com", coProp:"Victor Herrera", coPropEdad:43, coPropTel:"305-8901-0010", direccion:"8900 Fontainebleau", emisora:"Banda 107",   fecha:daysAgo(1), vendedorId:"U09", status:"interesado",   ultimoContacto:daysAgo(2),  proximoSeguimiento:TODAY, notas:[{ts:daysAgo(2),autor:"Diana Ortiz",tipo:"llamada",nota:"Interesados en Cancun"}] }),
  mkLead({ id:"L019", folio:"F019", nombre:"Ramon Castillo",   edad:58, estadoCivil:"Soltero hombre",tel:"305-9012-8765",                                                                                                                            direccion:"1500 Ponce de Leon", emisora:"Stereo 94",   fecha:daysAgo(3), vendedorId:"U09", status:"contactado",   ultimoContacto:daysAgo(4) }),
];

// 
// STYLES
// 
const S = {
  wrap:     { minHeight:"100vh", background:"#f4f5f7", color:"#3d4554", fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif" },
  topbar:   { background:"#ffffff", borderBottom:"1px solid #e3e6ea", padding:"0 20px", display:"flex", alignItems:"center", gap:"12px", position:"sticky", top:0, zIndex:100, minHeight:"52px" },
  card:     { background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:"10px", padding:"14px 16px", marginBottom:"10px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" },
  label:    { fontSize:"11px", color:"#9ca3af", marginBottom:"4px", fontWeight:"600" },
  sTitle:   { fontSize:"10px", fontWeight:"700", color:"#9ca3af", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" },
  badge:    (color, bg, border) => ({ display:"inline-flex", alignItems:"center", gap:"4px", padding:"2px 9px", borderRadius:"20px", fontSize:"11px", fontWeight:"600", color, background:bg, border:`1px solid ${border}` }),
  input:    { width:"100%", background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:"8px", padding:"8px 12px", color:"#1a1f2e", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  select:   { width:"100%", background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:"8px", padding:"8px 12px", color:"#1a1f2e", fontSize:"13px", outline:"none", cursor:"pointer", fontFamily:"inherit", boxSizing:"border-box" },
  modal:    { position:"fixed", inset:0, background:"rgba(15,20,30,0.45)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" },
  modalBox: { background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:"14px", padding:"24px", maxWidth:"580px", width:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 8px 32px rgba(0,0,0,0.10)" },
  tab:      (a, c="#1565c0") => ({ padding:"8px 14px", cursor:"pointer", fontSize:"12px", fontWeight:a?"700":"400", background:"transparent", color:a?c:"#9ca3af", borderBottom:`2px solid ${a?c:"transparent"}`, border:"none", transition:"all 0.15s", whiteSpace:"nowrap", fontFamily:"'DM Sans','Segoe UI',sans-serif" }),
  btn:      (v="ghost") => {
    const m = {
      primary: { bg:"#1a385a", color:"#fff",     border:"transparent" },
      success: { bg:"#edf7ee", color:"#1a7f3c",  border:"#a3d9a5" },
      danger:  { bg:"#fef2f2", color:"#b91c1c",  border:"#f5b8b8" },
      warning: { bg:"#fef9e7", color:"#925c0a",  border:"#f0d080" },
      ghost:   { bg:"#f4f5f7", color:"#6b7280",  border:"#e3e6ea" },
      indigo:  { bg:"#e8f0fe", color:"#1565c0",  border:"#aac4f0" },
      alert:   { bg:"#fef9e7", color:"#925c0a",  border:"#f0d080" },
    };
    const s = m[v] || m.ghost;
    return { display:"inline-flex", alignItems:"center", gap:"6px", padding:"7px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:"600", background:s.bg, color:s.color, border:`1px solid ${s.border}`, transition:"all 0.15s", whiteSpace:"nowrap" };
  },
};

// 
// PAQUETE TAB  (componente separado para claridad)
// 
// ─────────────────────────────────────────────────────────────
// TAB DESTINOS — calificación y selección de destinos
// ─────────────────────────────────────────────────────────────
function DestinosTab({ draft, set, destCatalog }) {
  var catalog = (destCatalog && destCatalog.length > 0) ? destCatalog : DESTINOS_CATALOG;
  var edad = Number(draft.edad) || 0;
  var edadCoProp = Number(draft.coPropEdad) || 0;
  var ec   = draft.estadoCivil || "";
  var hasPerfil = edad > 0 && ec;

  // Calificar usando el catálogo recibido — titular O copropietario califica
  var destQC = []; var destNQ = [];
  if (hasPerfil) {
    catalog.filter(function(d){ return d.activo !== false; }).forEach(function(dest) {
      var qc = dest.qc || {};
      var edadOk = (edad >= (qc.ageMin||18) && edad <= (qc.ageMax||99)) ||
                   (edadCoProp > 0 && edadCoProp >= (qc.ageMin||18) && edadCoProp <= (qc.ageMax||99));
      var califica = edadOk && (qc.marital||[]).includes(ec);
      if (califica) { destQC.push(dest); }
      else if (dest.nq && dest.nq.enabled) { destNQ.push(dest); }
    });
  }

  var selIds = (draft.destinos || []).map(function(d){ return d.destId; });

  function addDest(dest, tipo) {
    set("destinos", (draft.destinos||[]).concat([{
      destId: dest.id,
      tipo:   tipo,
      noches: tipo === "qc" ? (dest.qc.noches||dest.qc.nights||5) : (dest.nq.noches||dest.nq.nights||3),
      regalo: null,
    }]));
  }

  function removeDest(i) {
    set("destinos", (draft.destinos||[]).filter(function(_,j){ return j!==i; }));
  }

  function setRegalo(i, regalo) {
    var nd = (draft.destinos||[]).map(function(x,j){ return j===i ? Object.assign({},x,{regalo:regalo}) : x; });
    set("destinos", nd);
  }

  function getCatalog(destId) {
    return catalog.find(function(d){ return d.id === destId; });
  }

  return (
    <div>
      {/* Destinos ya seleccionados */}
      {(draft.destinos||[]).length > 0 && (
        <div style={{marginBottom:14}}>
          <div style={{...S.sTitle, color:"#0ea5a0"}}>🗺️ Destinos del paquete</div>
          {(draft.destinos||[]).map(function(d, i) {
            var cat = getCatalog(d.destId);
            if (!cat) return null;
            var regalos = cat.regalosDisponibles || [];
            return (
              <div key={i} style={{padding:"12px 14px",borderRadius:10,background:d.tipo==="qc"?"rgba(165,214,167,0.06)":"rgba(206,147,216,0.06)",border:"2px solid "+(d.tipo==="qc"?"rgba(165,214,167,0.3)":"rgba(206,147,216,0.3)"),marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:20}}>{cat.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#1a1f2e"}}>{cat.nombre}</div>
                      <div style={{fontSize:11,color:d.tipo==="qc"?"#1a7f3c":"#7c3aed"}}>
                        {d.tipo==="qc"?"⭐ QC":"🔹 NQ"} · {d.noches} noches
                        {d.tipo==="nq"&&cat.nq&&cat.nq.label?" · "+cat.nq.label:""}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                      <div style={{fontSize:9,color:"#9ca3af",marginBottom:2}}>Noches</div>
                      <div style={{width:52,textAlign:"center",fontSize:15,fontWeight:700,color:"#1a1f2e"}}>{d.noches}</div>
                    </div>
                    <button style={{...S.btn("danger"),padding:"3px 9px",fontSize:11}} onClick={function(){ removeDest(i); }}>✕</button>
                  </div>
                </div>
                {regalos.length > 0 && d.tipo === "qc" && (
                  <div>
                    <div style={{fontSize:9,color:"#925c0a",fontWeight:700,textTransform:"uppercase",marginBottom:5}}>🎁 Regalo QC (elige 1)</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      <div onClick={function(){ setRegalo(i,null); }}
                        style={{padding:"4px 9px",borderRadius:7,cursor:"pointer",fontSize:11,background:!d.regalo?"#f4f5f7":"#fff",border:"1px solid #e3e6ea",color:!d.regalo?"#1a1f2e":"#9ca3af"}}>
                        Sin regalo
                      </div>
                      {regalos.map(function(r){
                        var sel = d.regalo && d.regalo.id === r.id;
                        return (
                          <div key={r.id} onClick={function(){ setRegalo(i,r); }}
                            style={{padding:"4px 9px",borderRadius:7,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:11,
                              background:sel?"#fef9e7":"#f9fafb",border:"2px solid "+(sel?"rgba(251,191,36,0.5)":"#f0f1f4"),
                              color:sel?"#925c0a":"#9ca3af",fontWeight:sel?700:400}}>
                            <span>{r.icon}</span>{r.label}{sel&&<span style={{color:"#925c0a"}}>✓</span>}
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
      )}

      {/* Agregar destinos */}
      {!hasPerfil ? (
        <div style={{padding:16,borderRadius:12,background:"rgba(251,146,60,0.07)",border:"1px solid rgba(251,146,60,0.25)",textAlign:"center"}}>
          <div style={{fontSize:20,marginBottom:8}}>⚠️</div>
          <div style={{fontSize:13,color:"#925c0a",fontWeight:600,marginBottom:4}}>Perfil incompleto</div>
          <div style={{fontSize:12,color:"#92400e"}}>Ve a <b>📋 Datos</b> y llena la <b>edad</b> y <b>estado civil</b> para ver destinos disponibles.</div>
        </div>
      ) : (
        <div>
          {destQC.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#1a7f3c",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>
                ⭐ Califica QC — {destQC.length} destino{destQC.length>1?"s":""}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                {destQC.map(function(dest){
                  var yaSel = selIds.includes(dest.id);
                  return (
                    <button key={dest.id} disabled={yaSel} onClick={function(){ if(!yaSel) addDest(dest,"qc"); }}
                      style={{padding:"8px 14px",borderRadius:10,cursor:yaSel?"default":"pointer",display:"flex",alignItems:"center",gap:7,
                        background:yaSel?"rgba(165,214,167,0.15)":"rgba(165,214,167,0.07)",
                        border:"2px solid "+(yaSel?"rgba(165,214,167,0.5)":"rgba(165,214,167,0.2)"),opacity:yaSel?0.6:1}}>
                      <span style={{fontSize:18}}>{dest.icon}</span>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontSize:12,fontWeight:700,color:yaSel?"#1a7f3c":"#3d4554"}}>{dest.nombre}</div>
                        <div style={{fontSize:10,color:"#1a7f3c"}}>QC · {dest.qc.noches||dest.qc.nights||5}n</div>
                      </div>
                      {yaSel?<span style={{fontSize:12,color:"#1a7f3c"}}>✓</span>:<span style={{fontSize:11,color:"#a5d6a7"}}>+</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {destNQ.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#7c3aed",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>
                🔹 No califica QC — Paquete NQ disponible
              </div>
              <div style={{fontSize:10,color:"#7c3aed",marginBottom:8}}>
                El titular no cumple la edad o estado civil para QC, pero puede acceder al paquete NQ.
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                {destNQ.map(function(dest){
                  var yaSel = selIds.includes(dest.id);
                  return (
                    <button key={dest.id} disabled={yaSel} onClick={function(){ if(!yaSel) addDest(dest,"nq"); }}
                      style={{padding:"8px 14px",borderRadius:10,cursor:yaSel?"default":"pointer",display:"flex",alignItems:"center",gap:7,
                        background:yaSel?"rgba(206,147,216,0.15)":"rgba(206,147,216,0.07)",
                        border:"2px solid "+(yaSel?"rgba(206,147,216,0.5)":"rgba(206,147,216,0.2)"),opacity:yaSel?0.6:1}}>
                      <span style={{fontSize:18}}>{dest.icon}</span>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontSize:12,fontWeight:700,color:yaSel?"#7c3aed":"#3d4554"}}>{dest.nombre}</div>
                        <div style={{fontSize:10,color:"#7c3aed"}}>NQ · {dest.nq.noches||dest.nq.nights||3}n · {dest.nq.label}</div>
                      </div>
                      {yaSel?<span style={{fontSize:12,color:"#7c3aed"}}>✓</span>:<span style={{fontSize:11,color:"#ce93d8"}}>+</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {destQC.length===0 && destNQ.length===0 && (
            <div style={{padding:14,borderRadius:10,background:"#f4f5f7",border:"1px solid #e3e6ea",textAlign:"center",fontSize:12,color:"#9ca3af"}}>
              Sin destinos disponibles para este perfil.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PaymentLinkBtn — genera link de captura de tarjeta y lo manda por email
function PaymentLinkBtn({ draft }) {
  var [loading, setLoading] = useState(false);
  var [link, setLink] = useState(null);
  var [err, setErr] = useState(null);
  var [sent, setSent] = useState(false);

  function generarYEnviar() {
    if (!draft.id) return;
    setLoading(true); setErr(null); setLink(null); setSent(false);
    fetch("https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/zoho-payments/capture-link", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA" },
      body: JSON.stringify({ lead_id: draft.id, nombre: (draft.nombre||"") + " " + (draft.apellido||""), email: draft.email })
    })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (data.error) throw new Error(data.error);
      var url = data.link;
      setLink(url);
      if (draft.email && url) {
        var nombre = (draft.nombre||"") + " " + (draft.apellido||"");
        return fetch("https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/resend-email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA" },
          body: JSON.stringify({
            to_email: draft.email,
            to_name: nombre,
            subject: "Registre su método de pago - X Travel Group",
            body_html: "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'><div style='background:#1a385a;padding:20px;border-radius:12px 12px 0 0;text-align:center'><div style='color:#fff;font-size:20px;font-weight:700'>TRAVEL<span style='color:#8aacca'>X</span> GROUP</div></div><div style='background:#fff;border:1px solid #e0e0e0;padding:24px'><p style='font-size:15px'>Estimado/a <strong>" + nombre + "</strong>,</p><p style='font-size:14px;color:#444'>Le invitamos a registrar su método de pago de forma segura a través del siguiente enlace:</p><div style='text-align:center;margin:24px 0'><a href='" + url + "' style='background:#1a385a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px'>Registrar tarjeta →</a></div><p style='font-size:12px;color:#888'>Sus datos son procesados de forma segura por Zoho Payments. Si tiene preguntas llame al 1 (800) 927-1490.</p></div><div style='background:#0f2340;padding:14px;text-align:center;border-radius:0 0 12px 12px'><div style='font-size:11px;color:#475569'>© 2025 X Travel Group · members@xtravelgroup.com</div></div></div>",
            lead_id: draft.id
          })
        }).then(function(){ setSent(true); setLoading(false); });
      } else {
        setLoading(false);
      }
    })
    .catch(function(e){ setErr(String(e)); setLoading(false); });
  }

  return (
    <div style={{marginTop:12,padding:"12px 14px",borderRadius:10,background:"rgba(26,56,90,0.05)",border:"1px solid rgba(26,56,90,0.2)"}}>
      <div style={{fontSize:11,fontWeight:700,color:"#1a385a",marginBottom:8}}>📧 LINK DE PAGO POR EMAIL</div>
      {!link && !sent && (
        <button style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:8,background:"#1a385a",color:"#fff",border:"none",fontSize:12,fontWeight:600,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1}}
          onClick={generarYEnviar} disabled={loading}>
          {loading ? "Generando..." : "📧 Enviar link para captura de tarjeta"}
        </button>
      )}
      {err && <div style={{fontSize:11,color:"#b91c1c",marginTop:6}}>{err}</div>}
      {link && <div style={{fontSize:11,color:"#1a7f3c",marginTop:6}}>✓ Link: <a href={link} target="_blank" style={{color:"#1a385a"}}>{link}</a></div>}
      {sent && <div style={{fontSize:11,color:"#1a7f3c",marginTop:4}}>✓ Email enviado a {draft.email}</div>}
    </div>
  );
}

// TAB PAGO — precio, forma de pago, tarjeta
// ─────────────────────────────────────────────────────────────
function PagoTab({ draft, set, onSave }) {
  return (
    <div>
      <div style={{padding:14,borderRadius:12,background:"rgba(251,191,36,0.05)",border:"1px solid rgba(251,191,36,0.2)",marginBottom:14}}>
        <div style={{...S.sTitle,color:"#925c0a"}}>💰 Precio y forma de pago</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <div style={S.label}>Precio total (USD)</div>
            <input style={{...S.input,fontWeight:700,fontSize:15}} type="number" min="0" placeholder="0"
              value={draft.salePrice||""} onChange={function(e){ set("salePrice",Number(e.target.value)); }} />
          </div>
          <div>
            <div style={S.label}>Pago hoy (USD)</div>
            <input style={{...S.input,fontWeight:700,fontSize:15}} type="number" min="0" placeholder="0"
              value={draft.pagoInicial||""} onChange={function(e){ set("pagoInicial",Number(e.target.value)); }} />
          </div>
        </div>

        <div style={{marginBottom:10}}>
          <div style={S.label}>Método de pago</div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1,padding:"10px 14px",borderRadius:10,textAlign:"center",fontWeight:700,fontSize:13,
                background:"#e8f0fe",border:"2px solid #aac4f0",color:"#1565c0"}}>
              💳 Tarjeta
            </div>
          </div>
        </div>

        {draft.metodoPago === "tarjeta" && (
          <ZohoCardCapture
            lead={draft}
            onSaved={function(pmId, custId, last4, brand) {
              set("zohoPaymentMethodId", pmId);
              set("zohoCustomerId", custId);
              set("tarjetaLast4", last4);
              set("tarjetaBrand", brand);
              set("tarjetaCapturaTs", new Date().toISOString());
              if (onSave) onSave(Object.assign({}, draft, {
                zohoPaymentMethodId: pmId, zohoCustomerId: custId,
                tarjetaLast4: last4, tarjetaBrand: brand,
                tarjetaCapturaTs: new Date().toISOString()
              }));
            }}
          />
        )}

        {draft.salePrice > 0 && (
          <div style={{display:"flex",gap:12,padding:"10px 12px",borderRadius:9,background:"#fffce5",border:"1px solid rgba(251,191,36,0.2)",flexWrap:"wrap",marginTop:10}}>
            <div>
              <div style={{fontSize:9,color:"#92400e",textTransform:"uppercase",fontWeight:700}}>Total</div>
              <div style={{fontSize:16,fontWeight:800,color:"#925c0a"}}>${(draft.salePrice||0).toLocaleString()}</div>
            </div>
            <div>
              <div style={{fontSize:9,color:"#92400e",textTransform:"uppercase",fontWeight:700}}>Pago hoy</div>
              <div style={{fontSize:16,fontWeight:800,color:"#1a7f3c"}}>${(draft.pagoInicial||0).toLocaleString()}</div>
            </div>
            <div>
              <div style={{fontSize:9,color:"#92400e",textTransform:"uppercase",fontWeight:700}}>Saldo</div>
              <div style={{fontSize:16,fontWeight:800,color:"#b91c1c"}}>${Math.max(0,(draft.salePrice||0)-(draft.pagoInicial||0)).toLocaleString()}</div>
            </div>
            {draft.metodoPago && (
              <div>
                <div style={{fontSize:9,color:"#92400e",textTransform:"uppercase",fontWeight:700}}>Método</div>
                <div style={{fontSize:13,fontWeight:700,color:"#925c0a"}}>{{tarjeta:"💳 Tarjeta",transferencia:"🏦 Transferencia"}[draft.metodoPago]}</div>
              </div>
            )}
          </div>
        )}
      </div>
      <PaymentLinkBtn draft={draft} />
    </div>
  );
}


// 
// AI PANEL
// 
function LeadAIPanel({ lead, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState(null);

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const prompt = `Eres un coach de ventas experto en clubes vacacionales. Analiza este lead y responde SOLO con JSON valido, sin markdown.

LEAD:
- Nombre: ${lead.nombre}, Edad: ${lead.edad || "?"}, Estado civil: ${lead.estadoCivil || "?"}
- Emisora: ${lead.emisora}, Status: ${lead.status}
- Dias sin contacto: ${daysSince(lead.ultimoContacto)}
- Historial: ${(lead.notas||[]).map(n=>n.nota).join(" | ") || "Sin notas"}
- Precio: ${lead.salePrice > 0 ? "$"+lead.salePrice : "No definido"}

Responde con EXACTAMENTE este JSON:
{"probabilidadCierre":72,"nivelUrgencia":"alta","razonUrgencia":"texto corto","guionSugerido":"Exactamente que decir al llamar, 3-4 oraciones","objecionEsperada":"La objecion mas probable","comoManejarla":"Como responderla en 2 oraciones","mejorHorario":"Manana","proximoPaso":"Accion concreta hoy"}`;
      const text = await callClaude(prompt, 600);
      setResult(JSON.parse(text));
    } catch(e) { setError("No se pudo generar el analisis."); }
    setLoading(false);
  };

  const urgColor = { alta:"#b91c1c", media:"#925c0a", baja:"#1a7f3c" };
  const pctColor = (p) => p >= 70 ? "#1a7f3c" : p >= 45 ? "#925c0a" : "#b91c1c";

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, maxWidth:"520px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
          <div>
            <div style={{ fontSize:"17px", fontWeight:"700", color:"#1a1f2e" }}> Analisis AI - {lead.nombre}</div>
            <div style={{ fontSize:"12px", color:"#9ca3af", marginTop:"2px" }}>{lead.emisora} . {STATUS_CFG[lead.status]?.label}</div>
          </div>
          <button style={{ ...S.btn("ghost"), padding:"5px 10px" }} onClick={onClose}></button>
        </div>
        {!result && !loading && (
          <div style={{ textAlign:"center", padding:"32px 20px" }}>
            <div style={{ fontSize:"36px", marginBottom:"12px" }}></div>
            <div style={{ fontSize:"13px", color:"#9ca3af", marginBottom:"18px", lineHeight:1.6 }}>Claude analiza el historial y te dice que decir, que objeciones esperar y la probabilidad de cierre.</div>
            <button style={{ ...S.btn("indigo"), padding:"10px 24px", fontSize:"14px" }} onClick={run}> Analizar</button>
          </div>
        )}
        {loading && <div style={{ textAlign:"center", padding:"32px" }}><div style={{ fontSize:"28px", marginBottom:"10px" }}></div><div style={{ fontSize:"13px", color:"#1565c0" }}>Analizando...</div></div>}
        {error && <div style={{ padding:"12px 14px", borderRadius:"9px", background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", color:"#b91c1c", fontSize:"13px", marginBottom:"14px" }}> {error} <button style={{ ...S.btn("ghost"), marginLeft:"10px", padding:"3px 10px", fontSize:"11px" }} onClick={run}>Reintentar</button></div>}
        {result && (
          <div>
            <div style={{ display:"flex", gap:"10px", marginBottom:"14px" }}>
              <div style={{ flex:1, padding:"14px 16px", borderRadius:"12px", background:`${pctColor(result.probabilidadCierre)}0d`, border:`2px solid ${pctColor(result.probabilidadCierre)}33`, textAlign:"center" }}>
                <div style={{ fontSize:"32px", fontWeight:"900", color:pctColor(result.probabilidadCierre), lineHeight:1 }}>{result.probabilidadCierre}%</div>
                <div style={{ fontSize:"10px", color:pctColor(result.probabilidadCierre), opacity:0.8, fontWeight:"700", textTransform:"uppercase", marginTop:"3px" }}>Prob. cierre</div>
              </div>
              <div style={{ flex:2, padding:"14px 16px", borderRadius:"12px", background:`${urgColor[result.nivelUrgencia]||"#6b7280"}0d`, border:`1px solid ${urgColor[result.nivelUrgencia]||"#6b7280"}33` }}>
                <div style={{ fontSize:"10px", fontWeight:"700", color:urgColor[result.nivelUrgencia], textTransform:"uppercase", marginBottom:"4px" }}>Urgencia {result.nivelUrgencia}</div>
                <div style={{ fontSize:"12px", color:"#6b7280", lineHeight:1.5 }}>{result.razonUrgencia}</div>
              </div>
            </div>
            <div style={{ marginBottom:"12px", padding:"14px 16px", borderRadius:"12px", background:"rgba(129,140,248,0.07)", border:"1px solid rgba(129,140,248,0.2)" }}>
              <div style={{ fontSize:"10px", fontWeight:"700", color:"#1565c0", textTransform:"uppercase", marginBottom:"8px" }}> Que decir cuando llames</div>
              <div style={{ fontSize:"13px", color:"#3d4554", lineHeight:1.7, fontStyle:"italic" }}>"{result.guionSugerido}"</div>
            </div>
            <div style={{ marginBottom:"12px", padding:"14px 16px", borderRadius:"12px", background:"rgba(251,146,60,0.07)", border:"1px solid rgba(251,146,60,0.2)" }}>
              <div style={{ fontSize:"10px", fontWeight:"700", color:"#925c0a", textTransform:"uppercase", marginBottom:"6px" }}> Objecion esperada</div>
              <div style={{ fontSize:"12px", color:"#925c0a", fontWeight:"600", marginBottom:"6px" }}>"{result.objecionEsperada}"</div>
              <div style={{ fontSize:"12px", color:"#6b7280", lineHeight:1.6 }}> {result.comoManejarla}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"14px" }}>
              <div style={{ padding:"12px 14px", borderRadius:"10px", background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.2)" }}>
                <div style={{ fontSize:"10px", fontWeight:"700", color:"#1a7f3c", textTransform:"uppercase", marginBottom:"4px" }}> Proximo paso</div>
                <div style={{ fontSize:"12px", color:"#6b7280" }}>{result.proximoPaso}</div>
              </div>
              <div style={{ padding:"12px 14px", borderRadius:"10px", background:"rgba(96,165,250,0.07)", border:"1px solid rgba(96,165,250,0.2)" }}>
                <div style={{ fontSize:"10px", fontWeight:"700", color:"#1565c0", textTransform:"uppercase", marginBottom:"4px" }}> Mejor horario</div>
                <div style={{ fontSize:"13px", fontWeight:"700", color:"#1565c0" }}>{result.mejorHorario}</div>
              </div>
            </div>
            <button style={{ ...S.btn("ghost"), width:"100%", justifyContent:"center", fontSize:"11px" }} onClick={run}> Regenerar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// 
// LEAD MODAL
// 
function SpotSelect({value, onChange, disabled}){
  var [opts, setOpts] = useState([]);
  useEffect(function(){
    var hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    Promise.all([
      SB.from("radio_spots").select("id,emisora_id,hora,fecha").lte("fecha", new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })).order("fecha",{ascending:false}).limit(100),
      SB.from("emisoras").select("id,nombre")
    ]).then(function(res){
      var spots = res[0].data || [];
      var ems = res[1].data || [];
      var emMap = {};
      ems.forEach(function(e){ emMap[e.id]=e.nombre; });
      var mapped = spots.map(function(s){
        var d = new Date(s.fecha+"T12:00:00");
        var fmtFecha = d.toLocaleDateString("es-MX",{weekday:"short",day:"2-digit",month:"short"});
        var h = s.hora||"";
        var parts = h.split(":");
        var hr = parseInt(parts[0]);
        var min = parts[1]||"00";
        var ampm = hr>=12?"PM":"AM";
        var hr12 = hr===0?12:hr>12?hr-12:hr;
        var fmtHora = hr12+":"+min+" "+ampm;
        return {id:s.id, label:(emMap[s.emisora_id]||"Sin emisora")+" - "+fmtHora+" "+fmtFecha, emisora_id:s.emisora_id};
      });
      setOpts(mapped);
    });
  },[]);
  return <select style={{width:"100%",background:"#f8f9fb",border:"1px solid #e3e6ea",borderRadius:"8px",padding:"9px 12px",color:"#3d4554",fontSize:"13px",outline:"none"}} value={value||""} onChange={function(e){
    var sp = opts.find(function(o){return o.id===e.target.value;});
    onChange(e.target.value, sp ? sp.emisora_id : null, sp ? sp.label : null);
  }} disabled={disabled}>
    <option value="">-- Sin spot --</option>
    {opts.map(function(s){return <option key={s.id} value={s.id}>{s.label}</option>;})}
  </select>;
}

// RESUMEN VENTA (solo lectura para vendedor)
// ─────────────────────────────────────────────────────────────
function VentaResumen({ draft, destCatalog }) {
  var catalog  = (destCatalog && destCatalog.length > 0) ? destCatalog : DESTINOS_CATALOG;
  var destinos = (draft.destinos || []).map(function(d) {
    var cat = catalog.find(function(c){ return c.id === d.destId; }) || {};
    return Object.assign({}, d, { nombre: cat.nombre || cat.name || d.destId });
  });
  var total    = Number(draft.salePrice || 0);
  var inicial  = Number(draft.pagoInicial || 0);
  var pagos    = (draft.pagosAdicionales || []).reduce(function(a,p){ return a + Number(p.monto||0); }, 0);
  var cobrado  = inicial + pagos;
  var saldo    = Math.max(0, total - cobrado);

  var rowStyle = { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f0f1f4" };
  var labelStyle = { fontSize:12, color:"#6b7280" };
  var valStyle   = { fontSize:13, fontWeight:700, color:"#1a1f2e" };

  return (
    <div>
      {/* Destinos */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>🗺️ Destinos contratados</div>
        {destinos.length === 0
          ? <div style={{ fontSize:12, color:"#9ca3af" }}>Sin destinos registrados</div>
          : destinos.map(function(d, i) {
              return (
                <div key={i} style={{ padding:"10px 12px", borderRadius:9, background:"#f8f9fb", border:"1px solid #e8eaf0", marginBottom:6 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1a1f2e" }}>{d.nombre}</div>
                  <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>
                    {d.tipo ? d.tipo.toUpperCase() : ""} · {d.noches || 0} noches
                    {d.regalo ? " · 🎁 " + d.regalo.label : ""}
                  </div>
                </div>
              );
            })
        }
      </div>

      {/* Resumen financiero */}
      <div style={{ padding:"12px 14px", borderRadius:10, background:"#fffce5", border:"1px solid rgba(251,191,36,0.25)" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#92400e", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>💰 Resumen financiero</div>
        <div style={rowStyle}>
          <span style={labelStyle}>Monto total</span>
          <span style={{ fontSize:15, fontWeight:800, color:"#925c0a" }}>${total.toLocaleString()}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Pago inicial</span>
          <span style={valStyle}>${inicial.toLocaleString()}</span>
        </div>
        {(draft.pagosAdicionales||[]).map(function(p, i){
          return (
            <div key={i} style={rowStyle}>
              <span style={labelStyle}>{p.concepto || "Abono " + (i+1)} · {(p.fecha||"").slice(0,10)}</span>
              <span style={valStyle}>${Number(p.monto||0).toLocaleString()}</span>
            </div>
          );
        })}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0 0 0", marginTop:4 }}>
          <span style={{ fontSize:12, fontWeight:700, color: saldo > 0 ? "#b91c1c" : "#1a7f3c" }}>Saldo pendiente</span>
          <span style={{ fontSize:16, fontWeight:800, color: saldo > 0 ? "#b91c1c" : "#1a7f3c" }}>${saldo.toLocaleString()}</span>
        </div>
      </div>

      {/* Tarjeta */}
      {draft.tarjetaLast4 && (
        <div style={{ marginTop:10, padding:"8px 12px", borderRadius:9, background:"#e8f0fe", border:"1px solid #aac4f0", fontSize:12, color:"#1565c0", fontWeight:600 }}>
          💳 {draft.tarjetaBrand || "Tarjeta"} *{draft.tarjetaLast4}
        </div>
      )}
    </div>
  );
}

function LeadModal({ lead, users, currentUser, isSupervisor, destCatalog, onClose, onSave, onBlock, onUnblock }) {
  const [draft, setDraft]           = useState({ ...lead, notas: (lead.notas||[]).map(n => typeof n === "string" ? {ts:TODAY,autor:currentUser.name,tipo:"nota",nota:n} : n) });
  const [tab, setTab]               = useState("datos");
  const [newNota, setNewNota]       = useState("");
  const [newTipo, setNewTipo]       = useState("llamada");
  const [blockNote, setBlockNote]   = useState("");
  const [showBlock, setShowBlock]   = useState(false);
  const comm = useCommPanel();

  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }));
  const vendedor        = users.find(u => u.id === lead.vendedorId);
  const dias            = daysSince(lead.ultimoContacto);
  const isAlert         = dias >= ALERT_DAYS && !["venta","no_interesado"].includes(lead.status) && !lead.bloqueado;
  const sc              = STATUS_CFG[draft.status];
  const canEdit         = isSupervisor || (!lead.bloqueado && !["verificacion","venta"].includes(lead.status));
  const canSeePaquete   = true;

  const addNota = () => {
    if (!newNota.trim()) return;
    set("notas", [...(draft.notas||[]), { ts:TODAY, autor:currentUser.name, tipo:newTipo, nota:newNota.trim() }]);
    set("ultimoContacto", TODAY);
    setNewNota("");
  };

  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const tabBtn = (key, label, c="#1565c0") => (
    <button key={key} style={S.tab(tab===key, c)} onClick={() => setTab(key)}>{label}</button>
  );

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"14px" }}>
          <div>
            <div style={{ fontSize:"17px", fontWeight:"700", color:"#1a1f2e" }}>{draft.nombre}</div>
            <div style={{ fontSize:"12px", color:"#9ca3af", marginTop:"2px" }}>{lead.folio} . {draft.emisora||lead.emisora} . {vendedor?.name}</div>
          </div>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", justifyContent:"flex-end" }}>
            {lead.bloqueado && <span style={S.badge("#b91c1c","#fef2f2","#f7c0c0")}>Bloqueado</span>}
            {isAlert && <span style={S.badge("#925c0a","#fef9e7","rgba(251,146,60,0.25)")}>{dias}d sin contacto</span>}
            <CommPanelTrigger cliente={{folio:lead.folio,nombre:lead.nombre,membresia:"Lead",tel:lead.tel,whatsapp:lead.whatsapp,email:lead.email}} onOpen={comm.open}/>
            <button style={{ ...S.btn("ghost"), padding:"4px 8px" }} onClick={onClose}>x</button>
          </div>
        </div>

        {/* Status */}
        <div style={{ marginBottom:"12px" }}>
          <div style={S.label}>Status</div>
          <select style={{ ...S.select, borderColor:sc?.color+"55", color:sc?.color }}
            value={draft.status} onChange={e => set("status", e.target.value)} disabled={!canEdit}>
            {STATUS_ORDER.filter(function(k){ return isSupervisor || k !== "venta"; }).map(function(k){
              return <option key={k} value={k}>{STATUS_CFG[k].label}</option>;
            })}
          </select>
          {!isSupervisor && draft.status !== "venta" && (
            <div style={{ fontSize:"11px", color:"#9ca3af", marginTop:"4px" }}>El status "Venta" lo asigna el verificador</div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:"5px", borderBottom:"1px solid #e3e6ea", marginBottom:"14px", flexWrap:"wrap", paddingBottom:"8px" }}>
          {tabBtn("datos",       "📋 Datos")}
          {tabBtn("seguimiento", `📝 Seguim.${(draft.notas||[]).length>0?" ("+draft.notas.length+")":""}`, "#925c0a")}
          {canSeePaquete && canEdit && tabBtn("destinos", "🗺️ Destinos", "#1a7f3c")}
          {canSeePaquete && tabBtn("pago",     "💳 Pago",     "#1565c0")}
          {canEdit && tabBtn("emails",    "✉️ Emails",   "#6d28d9")}
          {canEdit && tabBtn("chat",      "💬 Chat",     "#0891b2")}
          {tabBtn("historial", "🕒 Historial", "#6b7280")}
          {isSupervisor  && tabBtn("admin",    "⚙️ Admin",    "#b91c1c")}
        </div>

        {/* TAB: DATOS */}
        {tab === "datos" && (
          <div>
            <style>{`input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}input[type=number]{-moz-appearance:textfield}`}</style>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"12px" }}>
              <div>
                <div style={S.label}>Nombre *</div>
                <input style={S.input} value={draft.nombre||""} onChange={e => set("nombre",e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <div style={S.label}>Apellido</div>
                <input style={S.input} value={draft.apellido||""} onChange={e => set("apellido",e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <div style={S.label}>Edad</div>
                <input style={{...S.input,MozAppearance:"textfield",WebkitAppearance:"none"}} type="number" min="18" max="99" value={draft.edad||""} onChange={e => set("edad",Number(e.target.value))} disabled={!canEdit} />
              </div>
              <div>
                <div style={S.label}>Estado civil</div>
                <select style={{ ...S.select, borderColor: draft.estadoCivil ? "rgba(129,140,248,0.4)" : "#f5b8b8" }}
                  value={draft.estadoCivil||""} onChange={e => set("estadoCivil",e.target.value)} disabled={!canEdit}>
                  <option value="">- Seleccionar -</option>
                  {ESTADO_CIVIL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <div style={S.label}>Telefono</div>
                <input style={S.input} value={draft.tel||""} onChange={e => set("tel",e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <div style={S.label}>WhatsApp</div>
                <input style={S.input} value={draft.whatsapp||""} onChange={e => set("whatsapp",e.target.value)} disabled={!canEdit} />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <div style={S.label}>Correo electronico</div>
                <input style={S.input} type="email" value={draft.email||""} onChange={e => set("email",e.target.value)} disabled={!canEdit} />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <div style={S.label}>Direccion</div>
                <input style={S.input} value={draft.direccion||""} onChange={e => set("direccion",e.target.value)} disabled={!canEdit} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 1fr", gap:"8px" }}>
                <div>
                  <div style={S.label}>Ciudad</div>
                  <input style={S.input} value={draft.ciudad||""} onChange={e => set("ciudad",e.target.value)} disabled={!canEdit} />
                </div>
                <div>
                  <div style={S.label}>Estado</div>
                  <input style={S.input} value={draft.estado||""} onChange={e => set("estado",e.target.value)} disabled={!canEdit} />
                </div>
                <div>
                  <div style={S.label}>ZIP Code</div>
                  <input style={S.input} value={draft.zip||""} onChange={e => set("zip",e.target.value)} disabled={!canEdit} placeholder="00000" />
                </div>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <div style={S.label}>Spot de radio</div>
                <SpotSelect value={draft.spotId||""} onChange={function(spotId, emisoraId, label){ set("spotId",spotId||null); set("emisoraId",emisoraId||null); if(label) set("emisora",label); }} disabled={!canEdit}/>
              </div>
            </div>
            {(draft.estadoCivil==="Casado" || draft.estadoCivil==="Union libre") && (
            <div style={{ padding:"12px 14px", borderRadius:"10px", background:"#f9fafb", border:"1px solid #e3e6ea" }}>
              <div style={S.sTitle}> Co-propietario</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"8px" }}>
                <div><div style={S.label}>Nombre</div><input style={S.input} value={draft.coProp||""} onChange={e=>set("coProp",e.target.value)} disabled={!canEdit} placeholder="-" /></div>
                <div><div style={S.label}>Apellido</div><input style={S.input} value={draft.coPropApellido||""} onChange={e=>set("coPropApellido",e.target.value)} disabled={!canEdit} placeholder="-" /></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 80px", gap:"8px" }}>
                <div><div style={S.label}>Telefono</div><input style={S.input} value={draft.coPropTel||""} onChange={e=>set("coPropTel",e.target.value)} disabled={!canEdit} placeholder="-" /></div>
                <div><div style={S.label}>Edad</div><input style={{...S.input,MozAppearance:"textfield",WebkitAppearance:"none"}} type="number" min="18" value={draft.coPropEdad||""} onChange={e=>set("coPropEdad",Number(e.target.value))} disabled={!canEdit} /></div>
              </div>
            </div>
            )}
            {/* Aviso si falta perfil para calificacion */}
            {(!draft.edad || !draft.estadoCivil) && (
              <div style={{ marginTop:"10px", padding:"9px 12px", borderRadius:"8px", background:"rgba(251,146,60,0.07)", border:"1px solid rgba(251,146,60,0.2)", fontSize:"11px", color:"#925c0a" }}>
                 Llena <b>edad</b> y <b>estado civil</b> para ver los destinos disponibles en la pestana  Paquete
              </div>
            )}
            {/* Reasignacion - solo roles con permisos */}
            {(["supervisor","verificador","director","admin"].includes(currentUser.role)) && (
              <div style={{ marginTop:12, padding:"12px 14px", borderRadius:10, background:"#f0f4ff", border:"1px solid #c7d7f8" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#1565c0", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>🔄 Reasignación</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <div style={S.label}>Vendedor asignado</div>
                    <select style={S.select} value={draft.vendedorId||""} onChange={e=>set("vendedorId",e.target.value)}>
                      <option value="">— Sin asignar —</option>
                      {users.filter(u=>u.role==="vendedor").map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={S.label}>Verificador asignado</div>
                    <select style={S.select} value={draft.verificadorId||""} onChange={e=>set("verificadorId",e.target.value)}>
                      <option value="">— Sin asignar —</option>
                      {users.filter(u=>u.role==="verificador").map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: SEGUIMIENTO */}
        {tab === "seguimiento" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"14px" }}>
              <div>
                <div style={S.label}>Ultimo contacto</div>
                <input style={S.input} type="date" value={draft.ultimoContacto||""} onChange={e=>set("ultimoContacto",e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <div style={S.label}>Proximo seguimiento</div>
                <input style={{ ...S.input, borderColor:draft.proximoSeguimiento===TODAY?"rgba(129,140,248,0.5)":"" }}
                  type="date" value={draft.proximoSeguimiento||""} onChange={e=>set("proximoSeguimiento",e.target.value||null)} disabled={!canEdit} />
              </div>
            </div>
            <div style={S.sTitle}>Historial de contactos</div>
            <div style={{ maxHeight:"200px", overflowY:"auto", marginBottom:"12px", display:"flex", flexDirection:"column", gap:"6px" }}>
              {!(draft.notas||[]).length
                ? <div style={{ fontSize:"12px", color:"#374151", padding:"10px", textAlign:"center" }}>Sin historial</div>
                : [...(draft.notas||[])].reverse().map((n,i) => (
                  <div key={i} style={{ padding:"8px 12px", borderRadius:"8px", background:"#fafbfc", border:"1px solid #e3e6ea" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"3px" }}>
                      <div style={{ display:"flex", gap:"5px", alignItems:"center" }}>
                        <span style={{ fontSize:"12px" }}>{TIPO_ICONS[n.tipo]||""}</span>
                        <span style={{ fontSize:"10px", fontWeight:"700", color:"#1565c0", textTransform:"uppercase" }}>{n.tipo||"nota"}</span>
                      </div>
                      <div style={{ fontSize:"10px", color:"#b0b8c4" }}>{n.ts} . {n.autor}</div>
                    </div>
                    <div style={{ fontSize:"12px", color:"#6b7280", lineHeight:1.5 }}>{n.nota}</div>
                  </div>
                ))
              }
            </div>
            {canEdit && (
              <div style={{ display:"flex", gap:"8px" }}>
                <select style={{ ...S.select, width:"130px", flexShrink:0 }} value={newTipo} onChange={e=>setNewTipo(e.target.value)}>
                  {TIPOS_CONTACTO.map(t=><option key={t} value={t}>{TIPO_ICONS[t]} {t}</option>)}
                </select>
                <input style={{ ...S.input, flex:1 }} placeholder="Agregar nota..."
                  value={newNota} onChange={e=>setNewNota(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addNota()} />
                <button style={{ ...S.btn("indigo"), padding:"7px 12px", flexShrink:0 }} onClick={addNota}>+</button>
              </div>
            )}
          </div>
        )}

        {/* TAB: DESTINOS */}
        {tab === "destinos" && canSeePaquete && (
          <DestinosTab draft={draft} set={set} destCatalog={destCatalog} />
        )}

        {/* TAB: PAGO */}
        {tab === "pago" && canSeePaquete && (
          (!isSupervisor && draft.status === "venta")
            ? <VentaResumen draft={draft} destCatalog={destCatalog} />
            : <PagoTab draft={draft} set={set} onSave={onSave} />
        )}

        {/* TAB: EMAILS */}
        {tab === "chat" && (
          <ChatVendedor lead={draft} currentUser={currentUser} />
        )}

        {tab === "emails" && (
          <EmailPanel lead={draft} currentUser={currentUser} destCatalog={destCatalog} />
        )}

        {/* TAB: HISTORIAL */}
        {tab === "historial" && (
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>
              🕒 Historial del lead
            </div>
            <TablaHistorial leadId={lead.id} />
          </div>
        )}

        {/* TAB: ADMIN */}
        {tab === "admin" && isSupervisor && (
          <div>
            {lead.bloqueado && lead.bloqueadoNota && (
              <div style={{ padding:"10px 14px", borderRadius:"8px", background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.2)", marginBottom:"12px" }}>
                <div style={{ fontSize:"11px", fontWeight:"600", color:"#b91c1c", marginBottom:"2px" }}> Motivo</div>
                <div style={{ fontSize:"12px", color:"#6b7280" }}>{lead.bloqueadoNota}</div>
              </div>
            )}
            <div style={{ marginBottom:"14px" }}>
              <div style={S.label}>Reasignar a</div>
              <select style={S.select} value={draft.vendedorId} onChange={e=>set("vendedorId",e.target.value)}>
                {users.filter(u=>u.role==="vendedor").map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            {!lead.bloqueado
              ? !showBlock
                ? <button style={{ ...S.btn("danger"), width:"100%", justifyContent:"center" }} onClick={()=>setShowBlock(true)}> Bloquear lead</button>
                : (
                  <div style={{ padding:"12px", borderRadius:"10px", background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.25)" }}>
                    <div style={{ fontSize:"12px", color:"#b91c1c", fontWeight:"600", marginBottom:"8px" }}>Motivo del bloqueo</div>
                    <input style={{ ...S.input, marginBottom:"8px" }} value={blockNote} onChange={e=>setBlockNote(e.target.value)} placeholder="Describe el motivo..." />
                    <div style={{ display:"flex", gap:"8px" }}>
                      <button style={{ ...S.btn("ghost"), flex:1 }} onClick={()=>setShowBlock(false)}>Cancelar</button>
                      <button style={{ ...S.btn("danger"), flex:2, justifyContent:"center" }} onClick={()=>onBlock(lead.id,blockNote)}>Confirmar</button>
                    </div>
                  </div>
                )
              : <button style={{ ...S.btn("success"), width:"100%", justifyContent:"center" }} onClick={()=>onUnblock(lead.id)}> Desbloquear</button>
            }
          </div>
        )}

        {/* Actions */}
        <div style={{ display:"flex", gap:"8px", marginTop:"16px" }}>
          <button style={{ ...S.btn("ghost"), flex:1 }} onClick={onClose}>Cerrar</button>
          {canEdit && (
            <button style={{ ...S.btn(saved?"primary":"success"), flex:2, justifyContent:"center", background: saved?"#1a7f3c":undefined, color: saved?"#fff":undefined }}
              onClick={handleSave}>
              {saved ? "✓ Guardado" : " Guardar"}
            </button>
          )}
        </div>
      </div>
      <CommPanel
        visible={comm.visible}
        cliente={comm.cliente}
        logs={comm.logs}
        canalInicial={comm.canalInicial}
        currentUser={{nombre:currentUser.name||currentUser.nombre||"Agente"}}
        onClose={comm.close}
        onLog={function(entry){
          comm.addLog(entry);
          if(entry.canal==="llamada"||entry.canal==="sms"||entry.canal==="whatsapp"||entry.canal==="email"){
            var tipo = entry.canal==="llamada"?"llamada":entry.canal==="sms"?"nota":entry.canal;
            set("notas",[...(draft.notas||[]),{ts:new Date().toISOString(),autor:currentUser.name||"Agente",tipo:tipo,nota:entry.texto}]);
            set("ultimoContacto",TODAY);
          }
        }}
      />
    </div>
  );
}
// 
function NuevoLeadModal({ currentUser, users, onClose, onSave }) {
  const isSup      = currentUser.role === "supervisor";
  const isVerif    = currentUser.role === "verificador";
  const canAssign  = isSup || isVerif;
  const vendedores = (users||[]).filter(u => u.role==="vendedor");
  const [nombre,   setNombre]   = useState("");
  const [tel,      setTel]      = useState("");
  const [spotId,   setSpotId]   = useState("");
  const [emisora,  setEmisora]  = useState("");
  const [nota,     setNota]     = useState("");
  const [asignarA, setAsignarA] = useState(canAssign ? "__self__" : currentUser.id);
  const [spots,    setSpots]    = useState([]);
  const [emisoras, setEmisoras] = useState([]);
  const [loadingSpots, setLoadingSpots] = useState(true);
  const valid = nombre.trim() && tel.trim();

  // Cargar spots de la semana actual y siguientes desde Supabase
  useState(() => {
    var hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    Promise.all([
      SB.from("radio_spots").select("*").eq("fecha", hoy).order("hora"),
      SB.from("emisoras").select("id,nombre").order("nombre"),
    ]).then(function(results) {
      var resS = results[0];
      var resE = results[1];
      setLoadingSpots(false);
      if (resE.data) setEmisoras(resE.data);
      if (resS.data && resS.data.length > 0) {
        setSpots(resS.data);
        setSpotId(resS.data[0].id);
        if (resE.data) {
          var em = resE.data.find(function(e){ return e.id === resS.data[0].emisora_id; });
          setEmisora(em ? em.nombre : "");
        }
      } else {
        // Sin spots: ir a modo manual automaticamente
        setSpots([]);
        setSpotId("__manual__");
      }
    }).catch(function(err){
      console.error("Error cargando spots:", err);
      setLoadingSpots(false);
      setSpotId("__manual__");
    });
  });

  function emNombre(emId) {
    const em = emisoras.find(e => e.id === emId);
    return em ? em.nombre : emId;
  }

  function fmtHora(t) {
    if (!t) return "";
    const parts = t.split(":");
    const h = parseInt(parts[0]);
    const m = parts[1] || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return h12 + ":" + m + " " + ampm;
  }

  function fmtFechaCort(sp) {
    if (!sp) return "";
    var str = sp.fecha || sp.semana || "";
    if (!str) return "";
    return new Date(str + "T12:00:00").toLocaleDateString("es-MX", {weekday:"short", day:"2-digit", month:"short"});
  }

  function handleSpotChange(e) {
    const sid = e.target.value;
    setSpotId(sid);
    if (sid === "__manual__") { setEmisora(""); return; }
    const sp = spots.find(s => s.id === sid);
    if (sp) {
      const em = emisoras.find(e => e.id === sp.emisora_id);
      setEmisora(em ? em.nombre : "");
    }
  }

  const handleSave = () => {
    if (!valid) return;
    const sp = spots.find(s => s.id === spotId);
    const emLabel = sp ? (emNombre(sp.emisora_id) + " - " + fmtHora(sp.hora) + " " + fmtFechaCort(sp)) : emisora;
    const sp2 = spots.find(s => s.id === spotId);
    onSave(mkLead({
      id: "L"+Date.now(), folio:"F"+Date.now().toString().slice(-5),
      nombre:nombre.trim(), tel:tel.trim(),
      emisora: emLabel,
      emisoraId: sp2 ? sp2.emisora_id : null,
      spotId: spotId !== "__manual__" ? spotId : null,
      vendedorId: asignarA === "__self__" ? currentUser.id : asignarA, status:"nuevo",
      fecha:TODAY, ultimoContacto:TODAY,
      notas: nota.trim() ? [{ts:TODAY,autor:currentUser.name,tipo:"llamada",nota:nota.trim()}] : [],
    }));
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, maxWidth:"400px" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
          <div>
            <div style={{ fontSize:"18px", fontWeight:"800", color:"#1a1f2e" }}>Nuevo lead</div>
            <div style={{ fontSize:"12px", color:"#9ca3af", marginTop:"2px" }}>Captura rapida durante la llamada</div>
          </div>
          <button style={{ ...S.btn("ghost"), padding:"5px 10px" }} onClick={onClose}>X</button>
        </div>

        <div style={{ marginBottom:"14px" }}>
          <div style={S.label}>Nombre *</div>
          <input style={{ ...S.input, fontSize:"15px", borderColor:nombre?"#e3e6ea":"#f5b8b8" }}
            placeholder="Nombre del prospecto" value={nombre} onChange={e=>setNombre(e.target.value)} autoFocus />
        </div>

        <div style={{ marginBottom:"14px" }}>
          <div style={S.label}>Telefono *</div>
          <input style={{ ...S.input, fontSize:"15px", borderColor:tel?"#e3e6ea":"#f5b8b8" }}
            placeholder="305-123-4567" value={tel} onChange={e=>setTel(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&valid&&handleSave()} />
        </div>

        <div style={{ marginBottom:isSup?"14px":"16px" }}>
          <div style={S.label}>Spot del log de radio *</div>
          {loadingSpots ? (
            <div style={{ ...S.input, color:"#9ca3af", fontSize:"12px" }}>Cargando spots...</div>
          ) : (
            <select style={{ ...S.select, borderColor:"#aac4f0" }} value={spotId} onChange={handleSpotChange}>
              {spots.length === 0 && <option value="">Sin spots disponibles</option>}
              {spots.map(sp => (
                <option key={sp.id} value={sp.id}>
                  {emNombre(sp.emisora_id)} - {fmtHora(sp.hora)} - {fmtFechaCort(sp)}
                </option>
              ))}
              <option value="__manual__">-- Ingresar emisora manualmente --</option>
            </select>
          )}
          {spotId === "__manual__" && (
            <input style={{ ...S.input, marginTop:"8px" }} placeholder="Nombre de la emisora"
              value={emisora} onChange={e=>setEmisora(e.target.value)} />
          )}
        </div>

        {canAssign && (
          <div style={{ marginBottom:"16px" }}>
            <div style={S.label}>Asignar a *</div>
            <select style={{ ...S.select, borderColor:"#a3d9a5" }} value={asignarA} onChange={e=>setAsignarA(e.target.value)}>
              <option value="__self__">— Yo mismo ({currentUser.name}) —</option>
              {vendedores.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom:"18px" }}>
          <div style={S.label}>Nota rapida (opcional)</div>
          <input style={S.input} placeholder="Ej: muy interesado, viene con pareja..."
            value={nota} onChange={e=>setNota(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&valid&&handleSave()} />
        </div>

        <div style={{ display:"flex", gap:"8px" }}>
          <button style={{ ...S.btn("ghost"), flex:1 }} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn("success"), flex:3, justifyContent:"center", fontSize:"14px", padding:"10px", opacity:valid?1:0.4 }}
            disabled={!valid} onClick={handleSave}>Guardar lead</button>
        </div>
      </div>
    </div>
  );
}

// 
// LEAD CARD
// 
function LeadCard({ lead, isSupervisor, isSelected, onSelect, onClick, onDragStart, onAI, users }) {
  const dias             = daysSince(lead.ultimoContacto);
  const isAlert          = dias >= ALERT_DAYS && !["venta","no_interesado"].includes(lead.status) && !lead.bloqueado;
  const hoyEsSeg         = lead.proximoSeguimiento === TODAY;
  const segVencido       = lead.proximoSeguimiento && lead.proximoSeguimiento < TODAY && !["venta","no_interesado"].includes(lead.status);
  const ultimaNota       = (lead.notas||[]).length > 0 ? lead.notas[lead.notas.length-1] : null;

  return (
    <div draggable={isSupervisor} onDragStart={e=>onDragStart&&onDragStart(e,lead)}
      onClick={()=>onClick(lead)}
      style={{ padding:"11px 12px", borderRadius:"10px", marginBottom:"7px", cursor:"pointer", userSelect:"none",
        background: lead.bloqueado?"rgba(248,113,113,0.06)":segVencido?"rgba(251,146,60,0.06)":hoyEsSeg?"rgba(129,140,248,0.07)":"#f8f9fb",
        border:`1px solid ${lead.bloqueado?"#f5b8b8":segVencido?"rgba(251,146,60,0.35)":hoyEsSeg?"rgba(129,140,248,0.4)":"#f0f1f4"}`,
        outline:isSelected?"2px solid #818cf8":"none" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"4px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
          {isSupervisor && <input type="checkbox" checked={isSelected} onClick={e=>{e.stopPropagation();onSelect(lead.id);}} style={{ cursor:"pointer", accentColor:"#1565c0" }} />}
          <div style={{ fontSize:"13px", fontWeight:"600", color:lead.bloqueado?"#b91c1c":"#1a1f2e" }}>{lead.nombre}{lead.bloqueado&&" "}</div>
        </div>
        <div style={{ display:"flex", gap:"4px" }}>
          {isAlert    && <span style={{ fontSize:"9px", padding:"1px 5px", borderRadius:"5px", background:"rgba(251,146,60,0.15)", color:"#925c0a", fontWeight:"700" }}>{dias}d</span>}
          {hoyEsSeg   && <span style={{ fontSize:"9px", padding:"1px 5px", borderRadius:"5px", background:"rgba(129,140,248,0.15)", color:"#1565c0", fontWeight:"700" }}>HOY</span>}
          {segVencido && <span style={{ fontSize:"9px", padding:"1px 5px", borderRadius:"5px", background:"rgba(251,146,60,0.15)", color:"#925c0a", fontWeight:"700" }}>{fmtDate(lead.proximoSeguimiento)}</span>}
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"3px" }}>
        <div style={{ fontSize:"11px", color:"#9ca3af" }}> {lead.emisora}</div>
        {lead.coProp && <div style={{ fontSize:"10px", color:"#b0b8c4" }}> +{lead.coProp.split(" ")[0]}</div>}
      </div>
      {isSupervisor && lead.vendedorId && users && (function(){
        var v = users.find(function(u){ return u.id===lead.vendedorId || u.dbId===lead.vendedorId || u.authId===lead.vendedorId; });
        return v ? <div style={{ fontSize:"10px", color:"#1565c0", fontWeight:"600", marginBottom:"2px" }}>👤 {v.name||v.nombre}</div> : null;
      })()}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:"11px", color:"#b0b8c4" }}> {lead.tel}</div>
        {!lead.bloqueado && <button style={{ fontSize:"10px", padding:"2px 7px", borderRadius:"6px", background:"rgba(129,140,248,0.12)", color:"#1565c0", border:"1px solid rgba(129,140,248,0.25)", cursor:"pointer", fontWeight:"600" }}
          onClick={e=>{e.stopPropagation();onAI&&onAI(lead);}}> AI</button>}
      </div>
      {ultimaNota && (
        <div style={{ fontSize:"10px", color:"#9ca3af", marginTop:"4px", display:"flex", gap:"4px", alignItems:"flex-start" }}>
          <span>{TIPO_ICONS[ultimaNota.tipo]||""}</span>
          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, fontStyle:"italic" }}>{ultimaNota.nota}</span>
        </div>
      )}
    </div>
  );
}

// 
// KANBAN COLUMN
// 
function KanbanCol({ status, leads, isSupervisor, selectedIds, onSelect, onCardClick, onDragStart, onAI, users }) {
  const sc = STATUS_CFG[status];
  return (
    <div style={{ minWidth:"210px", flex:1, display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"7px 11px", borderRadius:"8px 8px 0 0", background:sc.bg, border:`1px solid ${sc.border}`, marginBottom:"5px", display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:"11px", fontWeight:"700", color:sc.color }}>{sc.icon} {sc.label}</span>
        <span style={{ fontSize:"11px", fontWeight:"700", color:sc.color, background:`${sc.color}20`, padding:"0 7px", borderRadius:"10px" }}>{leads.length}</span>
      </div>
      <div style={{ flex:1, minHeight:"60px" }}>
        {leads.map(l => <LeadCard key={l.id} lead={l} isSupervisor={isSupervisor} isSelected={selectedIds?.includes(l.id)} onSelect={onSelect} onClick={onCardClick} onDragStart={onDragStart} onAI={onAI} users={users} />)}
        {!leads.length && <div style={{ padding:"14px", textAlign:"center", color:"#b0b8c4", fontSize:"11px", border:"1px dashed #e3e6ea", borderRadius:"8px" }}>Sin leads</div>}
      </div>
    </div>
  );
}

// 
// AI PANELS (Prioridades / Briefing)
// 
function PrioridadesAI({ leads, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const misLeads = leads.filter(l => l.vendedorId===currentUser.id && !l.bloqueado && !["venta","no_interesado"].includes(l.status));

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const prompt = `Coach de ventas de clubes vacacionales. Prioriza estos leads. Responde SOLO con JSON valido.
LEADS:
${misLeads.map(l=>`- ${l.nombre} | ${l.status} | ${daysSince(l.ultimoContacto)}d sin contacto | ${(l.notas||[]).slice(-1)[0]?.nota||"sin notas"}`).join("\n")}
JSON: {"prioridades":[{"nombre":"","razon":"","accion":"","urgencia":"alta|media|baja"}],"resumen":""}`;
      const text = await callClaude(prompt, 800);
      setResult(JSON.parse(text));
    } catch(e) { setError("No se pudo generar las prioridades."); }
    setLoading(false);
  };

  const urgColor = { alta:"#b91c1c", media:"#925c0a", baja:"#1a7f3c" };
  return (
    <div style={{ ...S.card, padding:"20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
        <div>
          <div style={{ fontSize:"15px", fontWeight:"700", color:"#1a1f2e" }}> Prioridades del dia</div>
          <div style={{ fontSize:"12px", color:"#9ca3af" }}>{misLeads.length} leads activos</div>
        </div>
        <button style={S.btn("indigo")} onClick={run} disabled={loading}>{loading?" Analizando...":" Priorizar con AI"}</button>
      </div>
      {error && <div style={{ fontSize:"12px", color:"#b91c1c", marginBottom:"10px" }}> {error}</div>}
      {result && (
        <div>
          <div style={{ padding:"10px 14px", borderRadius:"9px", background:"rgba(129,140,248,0.07)", border:"1px solid rgba(129,140,248,0.2)", marginBottom:"14px" }}>
            <div style={{ fontSize:"12px", color:"#1565c0" }}> {result.resumen}</div>
          </div>
          {(result.prioridades||[]).map((p,i) => (
            <div key={i} style={{ padding:"12px 14px", borderRadius:"10px", background:"#fafbfc", border:`1px solid ${urgColor[p.urgencia]||"#9ca3af"}33`, marginBottom:"8px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px" }}>
                <div style={{ fontSize:"13px", fontWeight:"600", color:"#1a1f2e" }}>{i+1}. {p.nombre}</div>
                <span style={{ fontSize:"9px", padding:"1px 7px", borderRadius:"6px", background:`${urgColor[p.urgencia]}20`, color:urgColor[p.urgencia], fontWeight:"700", textTransform:"uppercase" }}>{p.urgencia}</span>
              </div>
              <div style={{ fontSize:"11px", color:"#9ca3af", marginBottom:"3px" }}>{p.razon}</div>
              <div style={{ fontSize:"12px", color:"#6b7280" }}> {p.accion}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BriefingAI({ leads, users, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const miEquipo  = users.filter(u => u.supervisorId===currentUser.id);
  const teamIds   = miEquipo.map(u => u.id);
  const teamLeads = leads.filter(l => teamIds.includes(l.vendedorId));

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const stats = miEquipo.map(v => {
        const vl = teamLeads.filter(l=>l.vendedorId===v.id);
        return `${v.name}: ${vl.length} leads, ${vl.filter(l=>l.status==="venta").length} ventas, ${vl.filter(l=>daysSince(l.ultimoContacto)>=ALERT_DAYS&&!["venta","no_interesado"].includes(l.status)).length} alertas`;
      }).join("\n");
      const prompt = `Gerente de ventas clubes vacacionales. Analiza el equipo. Responde SOLO con JSON valido.
EQUIPO:\n${stats}
JSON: {"estadoGeneral":"bueno|regular|critico","resumenEjecutivo":"","acciones":[{"vendedor":"","problema":"","recomendacion":""}],"oportunidades":""}`;
      const text = await callClaude(prompt, 700);
      setResult(JSON.parse(text));
    } catch(e) { setError("No se pudo generar el briefing."); }
    setLoading(false);
  };

  const estadoColor = { bueno:"#1a7f3c", regular:"#925c0a", critico:"#b91c1c" };
  return (
    <div style={{ ...S.card, padding:"20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
        <div>
          <div style={{ fontSize:"15px", fontWeight:"700", color:"#1a1f2e" }}> Briefing del equipo</div>
          <div style={{ fontSize:"12px", color:"#9ca3af" }}>{miEquipo.length} vendedores . {teamLeads.length} leads</div>
        </div>
        <button style={S.btn("indigo")} onClick={run} disabled={loading}>{loading?" Analizando...":" Generar briefing"}</button>
      </div>
      {error && <div style={{ fontSize:"12px", color:"#b91c1c", marginBottom:"10px" }}> {error}</div>}
      {result && (
        <div>
          <div style={{ padding:"14px 16px", borderRadius:"12px", background:`${estadoColor[result.estadoGeneral]||"#1565c0"}0d`, border:`2px solid ${estadoColor[result.estadoGeneral]||"#1565c0"}33`, marginBottom:"14px" }}>
            <div style={{ fontSize:"11px", fontWeight:"700", color:estadoColor[result.estadoGeneral], textTransform:"uppercase", marginBottom:"6px" }}>Estado: {result.estadoGeneral}</div>
            <div style={{ fontSize:"13px", color:"#3d4554", lineHeight:1.6 }}>{result.resumenEjecutivo}</div>
          </div>
          {(result.acciones||[]).map((a,i) => (
            <div key={i} style={{ padding:"12px 14px", borderRadius:"10px", background:"#fafbfc", border:"1px solid #e3e6ea", marginBottom:"8px" }}>
              <div style={{ fontSize:"13px", fontWeight:"600", color:"#1a1f2e", marginBottom:"3px" }}>{a.vendedor}</div>
              <div style={{ fontSize:"11px", color:"#b91c1c", marginBottom:"3px" }}> {a.problema}</div>
              <div style={{ fontSize:"12px", color:"#1a7f3c" }}> {a.recomendacion}</div>
            </div>
          ))}
          {result.oportunidades && (
            <div style={{ padding:"12px 14px", borderRadius:"10px", background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.2)" }}>
              <div style={{ fontSize:"10px", fontWeight:"700", color:"#1a7f3c", textTransform:"uppercase", marginBottom:"4px" }}> Oportunidades</div>
              <div style={{ fontSize:"12px", color:"#6b7280" }}>{result.oportunidades}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COBRANZA VENDEDOR
// ─────────────────────────────────────────────────────────────
function CobranzaVendedor({ leads, currentUser, onUpdateLead }) {
  const [selLead, setSelLead] = useState(null);
  const [nota, setNota] = useState("");

  var ventasConSaldo = leads.filter(function(l) {
    return l.vendedorId === currentUser.id && l.status === "venta" && Number(l.salePrice||0) > 0;
  }).map(function(l) {
    var pagos = (l.pagosAdicionales||[]).reduce(function(a,p){ return a+Number(p.monto||0); }, 0);
    var cobrado = Number(l.pagoInicial||0) + pagos;
    var saldo = Math.max(0, Number(l.salePrice||0) - cobrado);
    return Object.assign({}, l, { cobrado, saldo });
  }).filter(function(l) { return l.saldo > 0; })
    .sort(function(a,b) { return b.saldo - a.saldo; });

  function handleAddNota() {
    if (!nota.trim() || !selLead) return;
    var updated = Object.assign({}, selLead, {
      notas: [...(selLead.notas||[]), { ts: new Date().toISOString(), autor: currentUser.name, tipo: "nota", nota: nota.trim() }]
    });
    onUpdateLead(updated);
    setSelLead(updated);
    setNota("");
  }

  return (
    <div>
      <div style={{ display:"flex", gap:"12px", marginBottom:"18px", flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:"120px", padding:"14px 16px", borderRadius:"12px", background:"rgba(185,28,28,0.06)", border:"1px solid rgba(185,28,28,0.15)" }}>
          <div style={{ fontSize:"9px", fontWeight:"700", color:"#b91c1c", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>Saldo total pendiente</div>
          <div style={{ fontSize:"22px", fontWeight:"800", color:"#b91c1c" }}>${ventasConSaldo.reduce(function(a,l){ return a+l.saldo; },0).toLocaleString()}</div>
        </div>
        <div style={{ flex:1, minWidth:"120px", padding:"14px 16px", borderRadius:"12px", background:"rgba(21,101,192,0.06)", border:"1px solid rgba(21,101,192,0.15)" }}>
          <div style={{ fontSize:"9px", fontWeight:"700", color:"#1565c0", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>Clientes con saldo</div>
          <div style={{ fontSize:"22px", fontWeight:"800", color:"#1565c0" }}>{ventasConSaldo.length}</div>
        </div>
        <div style={{ flex:1, minWidth:"120px", padding:"14px 16px", borderRadius:"12px", background:"rgba(26,127,60,0.06)", border:"1px solid rgba(26,127,60,0.15)" }}>
          <div style={{ fontSize:"9px", fontWeight:"700", color:"#1a7f3c", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"4px" }}>Total cobrado</div>
          <div style={{ fontSize:"22px", fontWeight:"800", color:"#1a7f3c" }}>${ventasConSaldo.reduce(function(a,l){ return a+l.cobrado; },0).toLocaleString()}</div>
        </div>
      </div>

      {ventasConSaldo.length === 0 && (
        <div style={{ textAlign:"center", padding:"40px", color:"#9ca3af", fontSize:"14px" }}>
          ✅ Sin saldos pendientes
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns: selLead ? "1fr 340px" : "1fr", gap:"14px" }}>
        <div>
          {ventasConSaldo.map(function(l) {
            var pct = Math.round((l.cobrado / Number(l.salePrice||1)) * 100);
            var isSel = selLead && selLead.id === l.id;
            return (
              <div key={l.id} onClick={function(){ setSelLead(isSel ? null : l); setNota(""); }}
                style={{ padding:"14px 16px", borderRadius:"12px", background: isSel ? "#f0f4ff" : "#fff",
                  border:"1px solid " + (isSel ? "#aac4f0" : "#e3e6ea"),
                  marginBottom:"10px", cursor:"pointer", transition:"all 0.15s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px" }}>
                  <div>
                    <div style={{ fontSize:"14px", fontWeight:"700", color:"#1a1f2e" }}>{l.nombre} {l.apellido||""}</div>
                    <div style={{ fontSize:"11px", color:"#9ca3af", marginTop:"2px" }}>{l.folio} · {l.tel||"—"}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"15px", fontWeight:"800", color:"#b91c1c" }}>${l.saldo.toLocaleString()} pendiente</div>
                    <div style={{ fontSize:"11px", color:"#6b7280" }}>de ${Number(l.salePrice).toLocaleString()} total</div>
                  </div>
                </div>
                <div style={{ background:"#f3f4f6", borderRadius:"6px", height:"6px", marginBottom:"6px" }}>
                  <div style={{ background:"#1a7f3c", borderRadius:"6px", height:"6px", width: pct + "%" }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"11px", color:"#6b7280" }}>
                  <span>Cobrado: <b style={{color:"#1a7f3c"}}>${l.cobrado.toLocaleString()}</b></span>
                  <span>{pct}% pagado</span>
                  {l.tarjetaLast4 && <span>💳 *{l.tarjetaLast4}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {selLead && (
          <div style={{ padding:"16px", borderRadius:"12px", background:"#f9fafb", border:"1px solid #e3e6ea", alignSelf:"start" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
              <div style={{ fontSize:"13px", fontWeight:"700", color:"#1a1f2e" }}>Perfil del cliente</div>
              <button style={{ ...S.btn("ghost"), padding:"3px 8px", fontSize:"11px" }} onClick={function(){ setSelLead(null); }}>✕</button>
            </div>
            <div style={{ fontSize:"12px", color:"#6b7280", lineHeight:1.8 }}>
              <div><b>Tel:</b> {selLead.tel||"—"}</div>
              <div><b>WhatsApp:</b> {selLead.whatsapp||"—"}</div>
              <div><b>Email:</b> {selLead.email||"—"}</div>
              <div><b>Dirección:</b> {selLead.direccion||"—"}</div>
              {selLead.coProp && <div><b>Co-prop:</b> {selLead.coProp} · {selLead.coPropTel||"—"}</div>}
              {selLead.tarjetaLast4 && <div><b>Tarjeta:</b> {selLead.tarjetaBrand||"Tarjeta"} *{selLead.tarjetaLast4}</div>}
            </div>

            <div style={{ marginTop:"14px", borderTop:"1px solid #e3e6ea", paddingTop:"12px" }}>
              <div style={{ fontSize:"10px", fontWeight:"700", color:"#6b7280", textTransform:"uppercase", marginBottom:"8px" }}>Notas</div>
              {(selLead.notas||[]).slice(-5).reverse().map(function(n, i) {
                return (
                  <div key={i} style={{ marginBottom:"6px", padding:"7px 10px", borderRadius:"8px", background:"#fff", border:"1px solid #e3e6ea" }}>
                    <div style={{ fontSize:"10px", color:"#9ca3af", marginBottom:"2px" }}>{n.autor} · {(n.ts||"").slice(0,10)}</div>
                    <div style={{ fontSize:"12px", color:"#374151" }}>{n.nota}</div>
                  </div>
                );
              })}
              <div style={{ display:"flex", gap:"6px", marginTop:"8px" }}>
                <input style={{ ...S.input, flex:1, fontSize:"12px" }} placeholder="Agregar nota..." value={nota}
                  onChange={function(e){ setNota(e.target.value); }}
                  onKeyDown={function(e){ if(e.key==="Enter") handleAddNota(); }} />
                <button style={{ ...S.btn("primary"), padding:"6px 10px", fontSize:"12px" }} onClick={handleAddNota}>+</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 
// VENDEDOR VIEW
// 
function VendedorView({ leads, users, currentUser, destCatalog, onUpdateLead, initialLeadId }) {
  const [sel,     setSel]    = useState(null);
  useEffect(() => { if (initialLeadId && leads.length) { const f = leads.find(l => l.id === initialLeadId); if (f) setSel(f); } }, [initialLeadId, leads]);
  const [aiLead,  setAiLead] = useState(null);
  const [search,  setSearch] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [tab,     setTab]    = useState("kanban");

  const misLeads = leads.filter(l => l.vendedorId===currentUser.id && !l.bloqueado);
  const alertas  = misLeads.filter(l => daysSince(l.ultimoContacto)>=ALERT_DAYS && !["venta","no_interesado"].includes(l.status));
  const filtered = misLeads.filter(l =>
    (fStatus==="all" || l.status===fStatus) &&
    (!search || l.nombre.toLowerCase().includes(search.toLowerCase()) || l.emisora.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = [
    { label:"Mis leads",    val:misLeads.length,                                  color:"#1565c0" },
    { label:"Nuevos",       val:misLeads.filter(l=>l.status==="nuevo").length,    color:"#4fc3f7" },
    { label:"Ventas",       val:misLeads.filter(l=>l.status==="venta").length,    color:"#1a7f3c" },
    { label:"Sin contacto", val:alertas.length,                                   color:"#925c0a" },
  ];

  return (
    <div style={{ padding:"20px 24px" }}>
      {alertas.length > 0 && (
        <div style={{ padding:"12px 16px", borderRadius:"10px", background:"rgba(251,146,60,0.08)", border:"1px solid rgba(251,146,60,0.3)", marginBottom:"16px", display:"flex", gap:"10px", alignItems:"center" }}>
          <span style={{ fontSize:"18px" }}></span>
          <div>
            <div style={{ fontSize:"13px", fontWeight:"600", color:"#925c0a" }}>{alertas.length} lead{alertas.length>1?"s":""} sin contacto {ALERT_DAYS}+ dias</div>
            <div style={{ fontSize:"11px", color:"#92400e" }}>{alertas.map(l=>l.nombre).join(", ")}</div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", gap:"6px", marginBottom:"16px" }}>
        <button style={S.tab(tab==="kanban")} onClick={()=>setTab("kanban")}> Mis leads</button>
        <button style={S.tab(tab==="cobranza","#b91c1c")} onClick={()=>setTab("cobranza")}>💰 Cobranza</button>
        <button style={S.tab(tab==="prioridades","#1565c0")} onClick={()=>setTab("prioridades")}> Prioridades AI</button>
      </div>
      {tab==="prioridades" && <PrioridadesAI leads={leads} currentUser={currentUser} />}
      {tab==="cobranza" && <CobranzaVendedor leads={leads} currentUser={currentUser} onUpdateLead={onUpdateLead} />}
      {tab==="kanban" && (
        <>
          <div style={{ display:"flex", gap:"10px", marginBottom:"18px", flexWrap:"wrap" }}>
            {stats.map(s => (
              <div key={s.label} style={{ flex:1, minWidth:"110px", padding:"14px 16px", borderRadius:"12px", background:`${s.color}09`, border:`1px solid ${s.color}20` }}>
                <div style={{ fontSize:"9px", fontWeight:"700", color:s.color, letterSpacing:"0.1em", textTransform:"uppercase", opacity:0.8, marginBottom:"4px" }}>{s.label}</div>
                <div style={{ fontSize:"22px", fontWeight:"800", color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:"8px", marginBottom:"14px", flexWrap:"wrap" }}>
            <input style={{ ...S.input, maxWidth:"220px" }} placeholder=" Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
            {["all",...STATUS_ORDER].map(s => (
              <button key={s} style={S.tab(fStatus===s, s==="all"?"#1565c0":STATUS_CFG[s]?.color)} onClick={()=>setFStatus(s)}>
                {s==="all"?"Todos":STATUS_CFG[s].label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:"10px", overflowX:"auto", paddingBottom:"12px" }}>
            {STATUS_ORDER.map(status => (
              <KanbanCol key={status} status={status} leads={filtered.filter(l=>l.status===status)} users={users}
                isSupervisor={false} onCardClick={setSel} onAI={setAiLead} />
            ))}
          </div>
        </>
      )}
      {sel && <LeadModal lead={sel} users={users} currentUser={currentUser} isSupervisor={false} destCatalog={destCatalog}
        onClose={()=>setSel(null)} onSave={u=>{onUpdateLead(u);}} onBlock={()=>{}} onUnblock={()=>{}} />}
      {aiLead && <LeadAIPanel lead={aiLead} onClose={()=>setAiLead(null)} />}
    </div>
  );
}

// 
// SUPERVISOR VIEW
// 
function SupervisorView({ leads, users, currentUser, destCatalog, onUpdateLead, onBulkReassign, initialLeadId }) {
  const [tab,           setTab]           = useState("pipeline");
  const [selLead,       setSelLead]       = useState(null);
  useEffect(() => { if (initialLeadId && leads.length) { const f = leads.find(l => l.id === initialLeadId); if (f) setSelLead(f); } }, [initialLeadId, leads]);
  const [selIds,        setSelIds]        = useState([]);
  const [dragLead,      setDragLead]      = useState(null);
  const [dragOverV,     setDragOverV]     = useState(null);
  const [reassignModal, setReassignModal] = useState(false);
  const [reassignTo,    setReassignTo]    = useState("");
  const [fVendedor,     setFVendedor]     = useState("all");
  const [fStatus,       setFStatus]       = useState("all");

  const isAdmin   = currentUser.role === "admin" || currentUser.role === "director" || currentUser.role === "supervisor";
  const miEquipo  = isAdmin ? users : users.filter(u => u.supervisorId===currentUser.id);
  const teamIds   = miEquipo.map(u => u.id);
  const teamLeads = isAdmin ? leads : leads.filter(l => teamIds.includes(l.vendedorId));
  const alertas   = teamLeads.filter(l => daysSince(l.ultimoContacto)>=ALERT_DAYS && !["venta","no_interesado"].includes(l.status) && !l.bloqueado);

  const filtered = teamLeads.filter(l =>
    (fVendedor==="all" || l.vendedorId===fVendedor) &&
    (fStatus==="all" || l.status===fStatus)
  );

  const toggleSel      = id => setSelIds(p => p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const handleDragStart= (e,lead) => { setDragLead(lead); e.dataTransfer.effectAllowed="move"; };
  const handleDropV    = (e,vid) => { e.preventDefault(); if(dragLead&&dragLead.vendedorId!==vid) onUpdateLead({...dragLead,vendedorId:vid}); setDragLead(null); setDragOverV(null); };
  const handleBlock    = (id,nota) => { const l=leads.find(x=>x.id===id); onUpdateLead({...l,bloqueado:true,bloqueadoNota:nota}); setSelLead(null); };
  const handleUnblock  = id => { const l=leads.find(x=>x.id===id); onUpdateLead({...l,bloqueado:false,bloqueadoNota:""}); setSelLead(null); };
  const doBulkReassign = () => { if(!reassignTo||!selIds.length) return; onBulkReassign(selIds,reassignTo); setSelIds([]); setReassignModal(false); setReassignTo(""); };

  const fmtUSD = n => "$"+Number(n).toLocaleString("en-US");

  const vendedorStats = miEquipo.map(v => {
    const vl = teamLeads.filter(l=>l.vendedorId===v.id);
    const ventas = vl.filter(l=>l.status==="venta").length;
    const alV = vl.filter(l=>daysSince(l.ultimoContacto)>=ALERT_DAYS&&!["venta","no_interesado"].includes(l.status)&&!l.bloqueado).length;
    return { ...v, total:vl.length, ventas, alV, cierre:vl.length>0?(ventas/vl.length*100).toFixed(0):0 };
  });

  return (
    <div style={{ padding:"20px 24px" }}>
      {alertas.length > 0 && (
        <div style={{ padding:"12px 16px", borderRadius:"10px", background:"rgba(251,146,60,0.08)", border:"1px solid rgba(251,146,60,0.3)", marginBottom:"16px", display:"flex", gap:"10px", alignItems:"center" }}>
          <span style={{ fontSize:"18px" }}></span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"13px", fontWeight:"600", color:"#925c0a" }}>{alertas.length} lead{alertas.length>1?"s":""} del equipo sin contacto {ALERT_DAYS}+ dias</div>
            <div style={{ fontSize:"11px", color:"#92400e" }}>
              {alertas.slice(0,3).map(l=>{const v=users.find(u=>u.id===l.vendedorId);return `${l.nombre} (${v?.name.split(" ")[0]})`;}).join(" . ")}{alertas.length>3?` +${alertas.length-3} mas`:""}
            </div>
          </div>
          <button style={{ ...S.btn("alert"), padding:"5px 10px", fontSize:"11px" }} onClick={()=>setTab("alertas")}>Ver </button>
        </div>
      )}

      <div style={{ display:"flex", gap:"6px", marginBottom:"16px", flexWrap:"wrap" }}>
        <button style={S.tab(tab==="pipeline")} onClick={()=>setTab("pipeline")}> Pipeline</button>
        <button style={S.tab(tab==="ventas","#1a7f3c")} onClick={()=>setTab("ventas")}> Ventas ({teamLeads.filter(l=>l.status==="venta").length})</button>
        <button style={S.tab(tab==="equipo")} onClick={()=>setTab("equipo")}> Equipo</button>
        <button style={S.tab(tab==="stats")} onClick={()=>setTab("stats")}> Stats</button>
        {alertas.length>0 && <button style={S.tab(tab==="alertas","#925c0a")} onClick={()=>setTab("alertas")}> Alertas ({alertas.length})</button>}
        <button style={S.tab(tab==="briefing","#1565c0")} onClick={()=>setTab("briefing")}> Briefing AI</button>
      </div>

      {/* VENTAS */}
      {tab==="ventas" && (() => {
        const ventas = teamLeads.filter(l=>l.status==="venta");
        const verifs = teamLeads.filter(l=>l.status==="verificacion");
        const totalMonto = ventas.reduce((a,l)=>a+Number(l.salePrice||0),0);
        return (
          <div>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"18px" }}>
              {[
                { l:"Ventas",          v:ventas.length,                                                              c:"#1a7f3c" },
                { l:"Monto total",     v:fmtUSD(totalMonto),                                                        c:"#925c0a" },
                { l:"Ticket promedio", v:ventas.length?fmtUSD(Math.round(totalMonto/ventas.length)):"-",            c:"#1565c0" },
                { l:"Verificacion",    v:verifs.length,                                                              c:"#1565c0" },
              ].map(k=>(
                <div key={k.l} style={{ flex:1, minWidth:"110px", padding:"14px 16px", borderRadius:"12px", background:`${k.c}09`, border:`1px solid ${k.c}20` }}>
                  <div style={{ fontSize:"9px", fontWeight:"700", color:k.c, textTransform:"uppercase", letterSpacing:"0.1em", opacity:0.8, marginBottom:"4px" }}>{k.l}</div>
                  <div style={{ fontSize:"20px", fontWeight:"800", color:k.c }}>{k.v}</div>
                </div>
              ))}
            </div>
            {ventas.length===0
              ? <div style={{ textAlign:"center", padding:"40px", color:"#9ca3af" }}>Sin ventas registradas</div>
              : (
                <div style={{ borderRadius:"12px", overflow:"hidden", border:"1px solid rgba(74,222,128,0.2)", marginBottom:"20px" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr 90px 90px 1fr", background:"rgba(74,222,128,0.05)", borderBottom:"2px solid rgba(74,222,128,0.15)", padding:"8px 16px", gap:"8px" }}>
                    {["Folio","Cliente","Vendedor","Total","Pago hoy","Destinos"].map((h,i)=>(
                      <div key={i} style={{ fontSize:"10px", fontWeight:"700", color:"#1a7f3c", textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</div>
                    ))}
                  </div>
                  {ventas.map((l,i)=>{
                    const v=users.find(u=>u.id===l.vendedorId);
                    return (
                      <div key={l.id} onClick={()=>setSelLead(l)} style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr 90px 90px 1fr", padding:"10px 16px", gap:"8px", borderBottom:"1px solid rgba(74,222,128,0.07)", background:i%2===0?"rgba(74,222,128,0.03)":"transparent", alignItems:"center", cursor:"pointer" }}>
                        <div style={{ fontSize:"11px", color:"#9ca3af" }}>{l.folio}</div>
                        <div><div style={{ fontSize:"13px", fontWeight:"600", color:"#1a1f2e" }}>{l.nombre}</div><div style={{ fontSize:"11px", color:"#9ca3af" }}>{l.emisora}</div></div>
                        <div style={{ fontSize:"12px", color:"#6b7280" }}>{v?.name}</div>
                        <div style={{ fontSize:"13px", fontWeight:"700", color:"#925c0a" }}>{fmtUSD(l.salePrice||0)}</div>
                        <div style={{ fontSize:"12px", fontWeight:"700", color:"#1a7f3c" }}>{fmtUSD(l.pagoInicial||0)}</div>
                        <div>{(l.destinos||[]).map((d,j)=>{const cat=DESTINOS_CATALOG.find(x=>x.id===d.destId);return <div key={j} style={{ fontSize:"10px", color:"#0ea5a0" }}>{cat?.icon} {cat?.nombre} {d.noches}n {d.tipo?.toUpperCase()}</div>;})}</div>
                      </div>
                    );
                  })}
                  <div style={{ display:"grid", gridTemplateColumns:"90px 1fr 1fr 90px 90px 1fr", padding:"10px 16px", gap:"8px", background:"rgba(74,222,128,0.08)", borderTop:"2px solid rgba(74,222,128,0.2)" }}>
                    <div style={{ fontSize:"11px", fontWeight:"800", color:"#1a7f3c", gridColumn:"1/4" }}>TOTAL ({ventas.length})</div>
                    <div style={{ fontSize:"14px", fontWeight:"900", color:"#925c0a" }}>{fmtUSD(totalMonto)}</div>
                  </div>
                </div>
              )
            }
            {verifs.length>0 && (
              <>
                <div style={{ fontSize:"10px", fontWeight:"700", color:"#1565c0", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 10px" }}> En verificacion ({verifs.length})</div>
                {verifs.map((l,i)=>{
                  const v=users.find(u=>u.id===l.vendedorId);
                  return (
                    <div key={l.id} onClick={()=>setSelLead(l)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderRadius:"10px", border:"1px solid rgba(129,140,248,0.2)", background:i%2===0?"rgba(129,140,248,0.04)":"transparent", cursor:"pointer", marginBottom:"6px" }}>
                      <div><div style={{ fontSize:"13px", fontWeight:"600", color:"#1a1f2e" }}>{l.nombre}</div><div style={{ fontSize:"11px", color:"#9ca3af" }}>{l.folio} . {v?.name}</div></div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:"13px", fontWeight:"700", color:"#1565c0" }}>{fmtUSD(l.salePrice||0)}</div>
                        <div style={{ fontSize:"10px", color:"#9ca3af" }}>{(l.destinos||[]).map(d=>DESTINOS_CATALOG.find(x=>x.id===d.destId)?.nombre).filter(Boolean).join(" + ")}</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      })()}

      {/* PIPELINE */}
      {tab==="pipeline" && (
        <>
          <div style={{ display:"flex", gap:"8px", marginBottom:"12px", flexWrap:"wrap", alignItems:"center" }}>
            <select style={{ ...S.select, maxWidth:"170px" }} value={fVendedor} onChange={e=>setFVendedor(e.target.value)}>
              <option value="all">Todo el equipo</option>
              {miEquipo.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <select style={{ ...S.select, maxWidth:"150px" }} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
              <option value="all">Todos los status</option>
              {STATUS_ORDER.map(s=><option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
            </select>
            <div style={{ flex:1 }} />
            {selIds.length>0 ? (
              <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
                <span style={{ fontSize:"12px", color:"#1565c0", fontWeight:"600" }}>{selIds.length} seleccionados</span>
                <button style={S.btn("indigo")} onClick={()=>setReassignModal(true)}> Reasignar</button>
                <button style={{ ...S.btn("ghost"), padding:"5px 10px" }} onClick={()=>setSelIds([])}></button>
              </div>
            ) : (
              <button style={{ ...S.btn("ghost"), fontSize:"11px" }} onClick={()=>setSelIds(filtered.filter(l=>!l.bloqueado).map(l=>l.id))}>Seleccionar todos</button>
            )}
          </div>
          <div style={{ display:"flex", gap:"10px", overflowX:"auto", paddingBottom:"12px" }}>
            {STATUS_ORDER.map(status=>(
              <KanbanCol key={status} status={status} leads={filtered.filter(l=>l.status===status)}
                isSupervisor={true} selectedIds={selIds} onSelect={toggleSel} onCardClick={setSelLead} onDragStart={handleDragStart} users={users} />
            ))}
          </div>
        </>
      )}

      {/* EQUIPO */}
      {tab==="equipo" && (
        <div>
          <div style={{ fontSize:"12px", color:"#9ca3af", marginBottom:"14px" }}> Arrastra cualquier lead a la columna del vendedor para reasignarlo</div>
          <div style={{ display:"flex", gap:"14px", overflowX:"auto", paddingBottom:"16px" }}>
            {miEquipo.map(v=>{
              const vl=teamLeads.filter(l=>l.vendedorId===v.id);
              const isOver=dragOverV===v.id;
              return (
                <div key={v.id} style={{ minWidth:"240px", flex:1 }}
                  onDragOver={e=>{e.preventDefault();setDragOverV(v.id);}}
                  onDragLeave={()=>setDragOverV(null)}
                  onDrop={e=>handleDropV(e,v.id)}>
                  <div style={{ padding:"12px 14px", borderRadius:"10px 10px 0 0", marginBottom:"6px", background:isOver?"#e8f0fe":"#f4f5f7", border:`2px solid ${isOver?"#aac4f0":"#e3e6ea"}`, transition:"all 0.15s" }}>
                    <div style={{ fontSize:"14px", fontWeight:"700", color:"#1a1f2e" }}>{v.name}</div>
                    <div style={{ display:"flex", gap:"10px", marginTop:"5px" }}>
                      <span style={{ fontSize:"11px", color:"#1565c0" }}>{vl.filter(l=>!l.bloqueado).length} leads</span>
                      <span style={{ fontSize:"11px", color:"#1a7f3c" }}>{vl.filter(l=>l.status==="venta").length} ventas</span>
                      {vl.filter(l=>l.bloqueado).length>0 && <span style={{ fontSize:"11px", color:"#b91c1c" }}> {vl.filter(l=>l.bloqueado).length}</span>}
                    </div>
                  </div>
                  <div style={{ minHeight:"150px" }}>
                    {vl.map(l=><LeadCard key={l.id} lead={l} isSupervisor={true} isSelected={selIds.includes(l.id)} onSelect={toggleSel} onClick={setSelLead} onDragStart={handleDragStart} />)}
                    {!vl.length && <div style={{ padding:"20px", textAlign:"center", color:"#b0b8c4", fontSize:"11px", border:"2px dashed #e3e6ea", borderRadius:"8px" }}>Suelta aqui</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STATS */}
      {tab==="stats" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"12px", marginBottom:"20px" }}>
            {vendedorStats.map(v=>(
              <div key={v.id} style={{ padding:"16px", borderRadius:"12px", background:"#fafbfc", border:"1px solid #e3e6ea" }}>
                <div style={{ fontSize:"14px", fontWeight:"700", color:"#1a1f2e", marginBottom:"10px" }}>{v.name}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                  {[{l:"Leads",v:v.total,c:"#1565c0"},{l:"Ventas",v:v.ventas,c:"#1a7f3c"},{l:"Cierre",v:v.cierre+"%",c:"#1565c0"},{l:"Alertas",v:v.alV,c:v.alV>0?"#925c0a":"#374151"}].map(s=>(
                    <div key={s.l}><div style={{ fontSize:"9px", color:"#9ca3af", marginBottom:"1px" }}>{s.l}</div><div style={{ fontSize:"18px", fontWeight:"800", color:s.c }}>{s.v}</div></div>
                  ))}
                </div>
                <div style={{ marginTop:"10px", height:"4px", borderRadius:"2px", background:"#f6f7f9" }}>
                  <div style={{ height:"100%", width:`${v.cierre}%`, background:"#1565c0", borderRadius:"2px" }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding:"16px 20px", borderRadius:"12px", background:"rgba(129,140,248,0.07)", border:"1px solid rgba(129,140,248,0.2)", display:"flex", gap:"24px", flexWrap:"wrap" }}>
            {[
              {l:"Total leads",    v:teamLeads.filter(l=>!l.bloqueado).length,              c:"#1565c0"},
              {l:"Ventas",         v:teamLeads.filter(l=>l.status==="venta").length,        c:"#1a7f3c"},
              {l:"Verificacion",   v:teamLeads.filter(l=>l.status==="verificacion").length, c:"#5b21b6"},
              {l:"Bloqueados",     v:teamLeads.filter(l=>l.bloqueado).length,               c:"#b91c1c"},
              {l:"Alertas",        v:alertas.length,                                        c:"#925c0a"},
            ].map(s=>(
              <div key={s.l}>
                <div style={{ fontSize:"9px", color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"3px" }}>{s.l}</div>
                <div style={{ fontSize:"22px", fontWeight:"800", color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALERTAS */}
      {tab==="alertas" && (
        <div>
          {!alertas.length
            ? <div style={{ textAlign:"center", padding:"40px", color:"#9ca3af" }}>Sin alertas </div>
            : alertas.sort((a,b)=>daysSince(b.ultimoContacto)-daysSince(a.ultimoContacto)).map(l=>{
              const v=users.find(u=>u.id===l.vendedorId);
              const dias=daysSince(l.ultimoContacto);
              return (
                <div key={l.id} onClick={()=>setSelLead(l)} style={{ ...S.card, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid rgba(251,146,60,0.25)" }}>
                  <div>
                    <div style={{ fontSize:"14px", fontWeight:"600", color:"#1a1f2e" }}>{l.nombre}</div>
                    <div style={{ fontSize:"12px", color:"#9ca3af", marginTop:"2px" }}>{v?.name} . {l.emisora} . {STATUS_CFG[l.status].label}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"22px", fontWeight:"800", color:"#925c0a" }}>{dias}d</div>
                    <div style={{ fontSize:"10px", color:"#9ca3af" }}>sin contacto</div>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {/* BRIEFING */}
      {tab==="briefing" && <BriefingAI leads={leads} users={users} currentUser={currentUser} />}

      {selLead && (
        <LeadModal lead={selLead} users={users} currentUser={currentUser} isSupervisor={true} destCatalog={destCatalog}
          onClose={()=>setSelLead(null)} onSave={u=>{onUpdateLead(u);}}
          onBlock={handleBlock} onUnblock={handleUnblock} />
      )}

      {reassignModal && (
        <div style={S.modal} onClick={()=>setReassignModal(false)}>
          <div style={{ ...S.modalBox, maxWidth:"360px" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:"17px", fontWeight:"700", color:"#1a1f2e", marginBottom:"4px" }}> Reasignacion masiva</div>
            <div style={{ fontSize:"13px", color:"#9ca3af", marginBottom:"18px" }}>{selIds.length} leads seleccionados</div>
            <div style={{ marginBottom:"18px" }}>
              <div style={S.label}>Asignar a</div>
              <select style={S.select} value={reassignTo} onChange={e=>setReassignTo(e.target.value)}>
                <option value="">- Seleccionar vendedor -</option>
                {miEquipo.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:"8px" }}>
              <button style={{ ...S.btn("ghost"), flex:1 }} onClick={()=>setReassignModal(false)}>Cancelar</button>
              <button style={{ ...S.btn("success"), flex:2, justifyContent:"center" }} onClick={doBulkReassign} disabled={!reassignTo}> Reasignar {selIds.length} leads</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 
// SUPABASE HELPERS - mapeo DB al modulo
// 

function dbToLead(r) {
  return {
    id:                  r.id,
    folio:               r.folio               || "",
    nombre:              r.nombre              || "",
    apellido:            r.apellido            || "",
    edad:                r.edad                || 0,
    estadoCivil:         r.estado_civil        || "",
    tel:                 r.tel                 || "",
    whatsapp:            r.whatsapp            || "",
    email:               r.email               || "",
    coProp:              r.co_prop             || "",
    coPropApellido:      r.co_prop_apellido    || "",
    coPropEdad:          r.co_prop_edad        || 0,
    coPropTel:           r.co_prop_tel         || "",
    fechaNac:            r.fecha_nac           || "",
    direccion:           r.direccion           || "",
    ciudad:              r.ciudad              || "Miami",
    estado:              r.estado_us           || "FL",
    zip:                 r.zip                 || "",
    emisora:             r.emisora             || "",
    emisoraId:           r.emisora_id          || null,
    spotId:              r.spot_id             || null,
    status:              r.status              || "nuevo",
    vendedorId:          r.vendedor_id         || null,
    supervisorId:        r.supervisor_id       || null,
    ultimoContacto:      r.ultimo_contacto     || TODAY,
    proximoSeguimiento:  r.proximo_seguimiento || null,
    salePrice:           Number(r.sale_price)  || 0,
    pagoInicial:         Number(r.pago_inicial)|| 0,
    metodoPago:          r.metodo_pago         || "",
    bloqueado:           r.bloqueado           || false,
    bloqueadoNota:       r.bloqueado_nota      || "",
    destinos:            r.destinos            || [],
    notas:               r.notas               || [],
    fecha:               r.fecha               || TODAY,
    tarjetaNumero:       r.tarjeta_numero      || null,
    tarjetaNombre:       r.tarjeta_nombre      || null,
    tarjetaVence:        r.tarjeta_vence       || null,
    tarjetaCVV:          r.tarjeta_cvv         || null,
    tarjetaTipo:         r.tarjeta_tipo        || null,
    tarjetaCapturaTs:    r.tarjeta_captura_ts  || null,
    zohoPaymentMethodId: r.zoho_payment_method_id || null,
    zohoCustomerId:      r.zoho_customer_id       || null,
    tarjetaLast4:        r.tarjeta_last4          || null,
    tarjetaBrand:        r.tarjeta_brand          || null,
  };
}

function leadToDb(l) {
  return {
    folio:               l.folio               || null,
    nombre:              l.nombre              || null,
    apellido:            l.apellido            || null,
    edad:                l.edad                || null,
    estado_civil:        l.estadoCivil         || null,
    tel:                 l.tel                 || null,
    whatsapp:            l.whatsapp            || null,
    email:               l.email               || null,
    co_prop:             l.coProp              || null,
    co_prop_apellido:    l.coPropApellido      || null,
    co_prop_edad:        l.coPropEdad          || null,
    co_prop_tel:         l.coPropTel           || null,
    fecha_nac:           l.fechaNac            || null,
    zip:                 l.zip                 || null,
    ciudad:              l.ciudad              || null,
    estado_us:           l.estadoUs            || null,
    direccion:           l.direccion           || null,
    destinos:            l.destinos            || [],
    emisora:             l.emisora             || null,
    emisora_id:          l.emisoraId           || null,
    spot_id:             l.spotId              || null,
    status:              l.status              || "nuevo",
    vendedor_id:         l.vendedorId          || null,
    supervisor_id:       l.supervisorId        || null,
    ultimo_contacto:     l.ultimoContacto      || TODAY,
    proximo_seguimiento: l.proximoSeguimiento  || null,
    sale_price:          l.salePrice           || null,
    pago_inicial:        l.pagoInicial         || null,
    metodo_pago:         l.metodoPago          || null,
    fecha:               l.fecha               || TODAY,
    zoho_payment_method_id: l.zohoPaymentMethodId || null,
    zoho_customer_id:       l.zohoCustomerId      || null,
    tarjeta_last4:          l.tarjetaLast4        || null,
    tarjeta_brand:          l.tarjetaBrand        || null,
    tarjeta_captura_ts:     l.tarjetaCapturaTs    || null,
  };
}


// =====================================================
// ZohoCardCapture - Widget de Zoho para guardar tarjeta
// =====================================================
var ZOHO_ACCOUNT_ID_SELLER = "874101637";
var ZOHO_API_KEY_SELLER     = "1003.afb484f19b10b5674c7e6f7c0c0ee5f5.89f010a430837bed480829a015a88641";
var EDGE_URL_SELLER         = "https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/zoho-payments";

function ZohoCardCapture({ lead, onSaved }) {
  var [loading,    setLoading]    = useState(false);
  var [error,      setError]      = useState(null);
  var [zohoReady,  setZohoReady]  = useState(false);
  var yaTiene = lead && lead.zohoPaymentMethodId;

  useEffect(function() {
    if (window.ZPayments) { setZohoReady(true); return; }
    var existing = document.getElementById("zpayments-sdk");
    if (existing) {
      existing.addEventListener("load", function() { setZohoReady(true); });
      return;
    }
    var script = document.createElement("script");
    script.id      = "zpayments-sdk";
    script.src     = "https://static.zohocdn.com/zpay/zpay-js/v1/zpayments.js";
    script.onload  = function() { setZohoReady(true); };
    script.onerror = function() { setError("No se pudo cargar el SDK de Zoho Payments"); };
    document.head.appendChild(script);
  }, []);

  var handleGuardar = function() {
    if (!zohoReady || !window.ZPayments) { setError("SDK no disponible"); return; }
    setLoading(true);
    setError(null);

    fetch(EDGE_URL_SELLER + "/create-customer-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA",
      },
      body: JSON.stringify({
        nombre: (lead.nombre || "") + " " + (lead.apellido || ""),
        email:  lead.email  || "",
        phone:  lead.tel    || "",
      }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) throw new Error(data.error);
      var customerId = data.customer_id;
      var sessionId  = data.payment_method_session_id;

      var config = {
        account_id: ZOHO_ACCOUNT_ID_SELLER,
        domain:     "US",
        otherOptions: { api_key: ZOHO_API_KEY_SELLER },
      };
      var instance = new window.ZPayments(config);

      var options = {
        payment_method:            "card",
        transaction_type:          "add",
        customer_id:               customerId,
        payment_method_session_id: sessionId,
      };

      console.log("ZPay options:", JSON.stringify(options));

      instance.requestPaymentMethod(options)
        .then(function(result) {
          console.log("ZPay result:", JSON.stringify(result));
          setLoading(false);
          instance.close();
          var pmId  = result.payment_method_id || result.paymentMethodId || "";
          var last4 = result.card ? result.card.last_four_digits || "" : "";
          var brand = result.card ? result.card.brand || "" : "";
          console.log("pmId:", pmId, "last4:", last4, "brand:", brand);
          onSaved(pmId, customerId, last4, brand);
        })
        .catch(function(err) {
          setLoading(false);
          instance.close();
          console.log("ZPay error:", JSON.stringify(err));
          if (err.code !== "widget_closed") {
            setError("Error: " + (err.message || JSON.stringify(err)));
          }
        });
    })
    .catch(function(err) {
      setLoading(false);
      setError("Error creando sesion: " + err.message);
    });
  };

  return (
    <div style={{ padding:"14px 16px", borderRadius:"10px", background:"rgba(129,140,248,0.06)", border:"1px solid rgba(129,140,248,0.25)", marginBottom:"10px" }}>
      <div style={{ fontSize:"12px", fontWeight:"700", color:"#1565c0", marginBottom:"10px" }}>Tarjeta de pago - Zoho Payments</div>

      {yaTiene ? (
        <div>
          <div style={{ padding:"10px 14px", borderRadius:"9px", background:"#edf7ee", border:"1px solid #a3d9a5", marginBottom:"10px" }}>
            <div style={{ fontSize:"13px", fontWeight:"700", color:"#1a7f3c" }}>Tarjeta guardada de forma segura</div>
            <div style={{ fontSize:"12px", color:"#6b7280", marginTop:"3px" }}>
              {lead.tarjetaBrand ? lead.tarjetaBrand + " " : ""}
              {lead.tarjetaLast4 ? "**** " + lead.tarjetaLast4 : ""}
            </div>
          </div>
          <button style={{ padding:"8px 16px", borderRadius:"8px", background:"#f4f5f7", border:"1px solid #e3e6ea", fontSize:"12px", color:"#6b7280", cursor:"pointer" }}
            onClick={handleGuardar} disabled={loading || !zohoReady}>
            Cambiar tarjeta
          </button>
        </div>
      ) : (
        <div>
          <div style={{ padding:"9px 12px", borderRadius:"8px", background:"#f4f5f7", border:"1px solid #e3e6ea", fontSize:"12px", color:"#6b7280", marginBottom:"10px" }}>
            La tarjeta se guarda de forma segura en Zoho Payments. Nunca se almacenan datos completos en nuestra base de datos.
          </div>
          {error && (
            <div style={{ padding:"8px 12px", borderRadius:"8px", background:"#fef2f2", border:"1px solid #f5b8b8", fontSize:"12px", color:"#b91c1c", marginBottom:"10px" }}>
              {error}
            </div>
          )}
          <button
            style={{ width:"100%", padding:"11px 16px", borderRadius:"9px", background:"#1a385a", border:"none", color:"#fff", fontSize:"13px", fontWeight:"700", cursor:loading||!zohoReady?"not-allowed":"pointer", opacity:loading||!zohoReady?0.6:1 }}
            disabled={loading || !zohoReady}
            onClick={handleGuardar}>
            {loading ? "Abriendo Zoho Payments..." : !zohoReady ? "Cargando SDK..." : "Guardar tarjeta del cliente"}
          </button>
        </div>
      )}
    </div>
  );
}

// 
// ROOT
// 
export default function SellerCRMv3({ currentUser: shellUser, initialLeadId }) {
  const [leads,        setLeads]      = useState([]);
  const [sbUsers,      setSbUsers]    = useState([]);
  const [loading,      setLoading]    = useState(true);
  const [toast,        setToast]      = useState(null);
  const [showNuevo,    setShowNuevo]  = useState(false);
  const [vistaUserId,  setVistaUserId]= useState(null);
  const [destCatalog,  setDestCatalog]= useState([]);

  var rolShell  = (shellUser && shellUser.rol) ? shellUser.rol : "vendedor";
  var SUP_ROLES = ["admin", "director", "supervisor"];
  var isSup     = SUP_ROLES.includes(rolShell);
  var myAuthId  = shellUser ? (shellUser.auth_id || shellUser.id) : null;

  // Auto-abrir lead si viene desde Comunicaciones
  const initialLeadIdRef = useRef(initialLeadId);
  useEffect(() => {
    if (initialLeadIdRef.current && leads.length > 0) {
      const lead = leads.find(l => l.id === initialLeadIdRef.current);
      if (lead) {
        initialLeadIdRef.current = null;
        // Trigger open depending on role
        setTimeout(() => {
          const evt = new CustomEvent("openLead", { detail: lead });
          window.dispatchEvent(evt);
        }, 100);
      }
    }
  }, [leads]);

  var mappedUser = shellUser ? {
    id:    myAuthId || "U_shell",
    name:  shellUser.nombre || shellUser.name || "Usuario",
    role:  isSup ? "supervisor" : (shellUser.rol || shellUser.role || "vendedor"),
    supervisorId: null,
  } : SEED_USERS[0];

  // Supervisor puede ver equipo o un vendedor especifico
  var activeUser = (isSup && vistaUserId)
    ? (sbUsers.find(function(u){ return u.id === vistaUserId; }) || mappedUser)
    : mappedUser;

  const notify = function(msg, ok) {
    var isOk = ok === undefined ? true : ok;
    setToast({msg:msg, ok:isOk});
    setTimeout(function(){ setToast(null); }, 3000);
  };

  // ---- Cargar leads desde Supabase ----
  function cargarLeads() {
    var query = SB.from("leads").select("*").order("created_at", {ascending:false});
    // Para vendedor, buscar su dbId correcto
    if (!isSup && myAuthId) {
      var meEnSb = sbUsers.find(function(u){ return u.authId === myAuthId || u.id === myAuthId; });
      var miDbId = meEnSb ? meEnSb.dbId : myAuthId;
      query = query.eq("vendedor_id", miDbId);
    }
    query.then(function(res) {
      setLoading(false);
      if (res.data) {
        const mapped = res.data.map(dbToLead);
        setLeads(mapped);
        // Auto-abrir lead si viene desde Comunicaciones
        if (initialLeadIdRef.current) {
          const found = mapped.find(l => l.id === initialLeadIdRef.current);
          if (found) {
            initialLeadIdRef.current = null;
            if (isSup) setSelLead(found);
            else setSel(found);
          }
        }
      } else {
        console.error("Error cargando leads:", res.error);
      }
    });
  }

  // Cargar usuarios del equipo para el supervisor
  function cargarUsuarios() {
    SB.from("usuarios").select("id,nombre,rol,auth_id,activo")
      .in("rol", ["vendedor","supervisor","admin","director","verificador"])
      .eq("activo", true)
      .order("nombre")
      .then(function(res) {
        if (res.data) {
          setSbUsers(res.data.map(function(u) {
            return { id: u.auth_id || u.id, dbId: u.id, authId: u.auth_id, name: u.nombre, role: u.rol, supervisorId: null };
          }));
        }
      });
  }

  // Cargar catalogo de destinos desde Supabase
  function cargarDestinos() {
    SB.from("destinos_catalog")
      .select("*")
      .eq("activo", true)
      .order("id", { ascending: true })
      .then(function(res) {
        if (res.data) {
          var mapped = res.data.map(dbToDestinoSeller);
          setDestCatalog(mapped);
          // Actualizar la variable global para compatibilidad con funciones que la usan directamente
          DESTINOS_CATALOG = mapped;
        }
      });
  }

  // Cargar al montar y polling cada 30 segundos
  useEffect(function() {
    cargarDestinos();
    // Cargar usuarios primero, luego leads
    SB.from("usuarios").select("id,nombre,rol,auth_id,activo")
      .in("rol", ["vendedor","supervisor","admin","director","verificador"])
      .eq("activo", true)
      .order("nombre")
      .then(function(res) {
        if (res.data) {
          var mapped = res.data.map(function(u) {
            return { id: u.auth_id || u.id, dbId: u.id, authId: u.auth_id, name: u.nombre, role: u.rol, supervisorId: null };
          });
          setSbUsers(mapped);
          // Ahora cargar leads con los usuarios ya cargados
          var query = SB.from("leads").select("*").order("created_at", {ascending:false});
          if (!isSup && myAuthId) {
            var me = mapped.find(function(u){ return u.authId === myAuthId || u.id === myAuthId; });
            if (me && me.dbId) query = query.eq("vendedor_id", me.dbId);
          }
          query.then(function(res2) {
            setLoading(false);
            if (res2.data) setLeads(res2.data.map(dbToLead));
          });
        }
      });
    var interval = setInterval(function() { cargarLeads(); }, 30000);
    return function() { clearInterval(interval); };
  }, []);

  const limpiarTarjeta = function(lead) {
    return {
      ...lead,
      tarjetaNumero: null, tarjetaNombre: null,
      tarjetaVence: null,  tarjetaCVV: null,
      tarjetaTipo: null,   tarjetaCapturaTs: null,
    };
  };

  // ---- Guardar lead actualizado en Supabase ----
  const handleUpdateLead = function(u) {
    var prev = leads.find(function(l){ return l.id === u.id; });
    var recienVerificado = ["verificacion","venta"].includes(u.status) && !["verificacion","venta"].includes(prev ? prev.status : "");
    var final = recienVerificado ? limpiarTarjeta(u) : u;
    setLeads(function(p){ return p.map(function(l){ return l.id === final.id ? final : l; }); });
    SB.from("leads").update(leadToDb(final)).eq("id", final.id).then(function(res) {
      if (res.error) {
        notify("Error al guardar: " + res.error.message, false);
        cargarLeads();
      } else {
        if (recienVerificado && u.tarjetaNumero) notify("Datos de tarjeta eliminados al pasar a " + u.status);
        else notify("Lead actualizado");
        // ── Registrar eventos de historial
        var usr = mappedUser;
        if (prev && prev.status !== u.status) {
          registrarEvento(u.id, "status",
            "Status: " + (prev.status||"nuevo") + " → " + u.status,
            { de: prev.status, a: u.status }, usr);
        }
        if (prev && JSON.stringify(prev.destinos) !== JSON.stringify(u.destinos)) {
          var nombres = (u.destinos||[]).map(function(d){ return d.destId + " (" + d.tipo + ")"; }).join(", ") || "ninguno";
          registrarEvento(u.id, "destino", "Destinos: " + nombres, { destinos: u.destinos }, usr);
        }
        if (prev && (prev.salePrice !== u.salePrice || prev.pagoInicial !== u.pagoInicial || prev.metodoPago !== u.metodoPago)) {
          registrarEvento(u.id, "pago",
            "Precio $" + (u.salePrice||0) + " · Pago hoy $" + (u.pagoInicial||0) + (u.metodoPago ? " · " + u.metodoPago : ""),
            { salePrice: u.salePrice, pagoInicial: u.pagoInicial, metodoPago: u.metodoPago }, usr);
        }
        if (prev && (prev.nombre !== u.nombre || prev.edad !== u.edad || prev.estadoCivil !== u.estadoCivil ||
            prev.email !== u.email || prev.whatsapp !== u.whatsapp)) {
          registrarEvento(u.id, "datos", "Datos actualizados: " + u.nombre, null, usr);
        }
        // Notas nuevas
        var prevNotas = (prev && prev.notas) ? prev.notas.length : 0;
        var newNotas  = (u.notas||[]).length;
        if (newNotas > prevNotas) {
          var ultimaNota = u.notas[u.notas.length-1];
          registrarEvento(u.id, "nota", "Nota: " + (ultimaNota.texto||ultimaNota.text||""), null, usr);
        }
      }
    });
  };

  const handleAddLead = function(l) {
    var dbRow = leadToDb(l);
    // Si el lead ya tiene vendedorId asignado (supervisor eligio vendedor), usar ese
    if (l.vendedorId) {
      var vendedorEnUsuarios = sbUsers.find(function(u){ return u.id === l.vendedorId || u.authId === l.vendedorId; });
      dbRow.vendedor_id = vendedorEnUsuarios ? vendedorEnUsuarios.dbId : l.vendedorId;
    } else {
      // Si no, asignar al usuario actual
      var meEnUsuarios = sbUsers.find(function(u){ return u.id === myAuthId || u.authId === myAuthId; });
      var vendedorDbId = meEnUsuarios ? meEnUsuarios.dbId : myAuthId;
      if (vendedorDbId) dbRow.vendedor_id = vendedorDbId;
    }
    SB.from("leads").insert(dbRow).then(function(res) {
      if (res.error) {
        notify("Error al crear lead: " + res.error.message, false);
      } else {
        // Buscar el lead recien creado por folio
        SB.from("leads").select("*").eq("folio", dbRow.folio).limit(1).then(function(res2) {
          if (res2.data && res2.data[0]) {
            var nuevo = dbToLead(res2.data[0]);
            setLeads(function(p){ return [nuevo, ...p]; });
            notify("Lead agregado - " + nuevo.nombre);
            registrarEvento(nuevo.id, "status", "Lead creado · status: " + (nuevo.status||"nuevo"), null, mappedUser);
          } else {
            notify("Lead creado");
            cargarLeads();
          }
        });
      }
    });
  };

  // ---- Reasignacion masiva ----
  const handleBulkReassign = function(ids, vid) {
    var v = sbUsers.find(function(u){ return u.id === vid; });
    SB.from("leads").update({vendedor_id: vid}).in("id", ids).then(function(res) {
      if (res.error) {
        notify("Error al reasignar", false);
      } else {
        setLeads(function(p){ return p.map(function(l){ return ids.includes(l.id) ? {...l, vendedorId:vid} : l; }); });
        notify(ids.length + " leads reasignados a " + (v ? v.name : vid));
      }
    });
  };

  var usersParaVista = sbUsers.length > 0 ? sbUsers : SEED_USERS;
  var vendedoresEquipo = usersParaVista.filter(function(u){ return u.role === "vendedor"; });

  if (loading) {
    return (
      <div style={{ ...S.wrap, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:"14px", color:"#9ca3af" }}>Cargando leads...</div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={{ fontSize:"12px", fontWeight:"700", color:"#9ca3af", letterSpacing:"0.1em", textTransform:"uppercase" }}>Mini-Vac CRM</div>
        <div style={{ width:"1px", height:"16px", background:"#e3e6ea" }} />
        <div style={{ fontSize:"14px", fontWeight:"600", color:"#1a385a" }}>{isSup ? "Pipeline del equipo" : "Mis Leads"}</div>
        <div style={{ flex:1 }} />
        <button style={{ ...S.btn("success"), padding:"7px 16px", fontSize:"13px", fontWeight:"700" }} onClick={function(){ setShowNuevo(true); }}>+ Nuevo lead</button>
        {isSup && vendedoresEquipo.length > 0 && (
          <>
            <div style={{ width:"1px", height:"16px", background:"#e3e6ea" }} />
            <div style={{ display:"flex", gap:"4px", alignItems:"center" }}>
              <span style={{ fontSize:"11px", color:"#9ca3af" }}>Vista:</span>
              <button style={{ ...S.btn(!vistaUserId?"indigo":"ghost"), padding:"4px 9px", fontSize:"11px" }}
                onClick={function(){ setVistaUserId(null); }}>
                Equipo
              </button>
              {vendedoresEquipo.map(function(u){
                return (
                  <button key={u.id} style={{ ...S.btn(vistaUserId===u.id?"indigo":"ghost"), padding:"4px 9px", fontSize:"11px" }}
                    onClick={function(){ setVistaUserId(u.id); }}>
                    {u.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {isSup
        ? <SupervisorView leads={leads} users={usersParaVista} currentUser={activeUser} destCatalog={destCatalog} onUpdateLead={handleUpdateLead} onBulkReassign={handleBulkReassign} initialLeadId={initialLeadId} />
        : <VendedorView   leads={leads} users={usersParaVista} currentUser={mappedUser}  destCatalog={destCatalog} onUpdateLead={handleUpdateLead} initialLeadId={initialLeadId} />
      }

      {showNuevo && (
        <NuevoLeadModal currentUser={isSup ? activeUser : mappedUser} users={usersParaVista}
          onClose={function(){ setShowNuevo(false); }}
          onSave={function(l){ handleAddLead(l); setShowNuevo(false); }} />
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:"24px", right:"24px", zIndex:999, padding:"12px 20px", borderRadius:"10px",
          background:toast.ok?"#e5f3e8":"#fdeaea", border:"1px solid " + (toast.ok?"#a3d9a5":"#f5b8b8"),
          color:toast.ok?"#1a7f3c":"#b91c1c", fontSize:"14px", fontWeight:"600", boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
