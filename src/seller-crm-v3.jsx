import { useState } from "react";
import { supabase as SB } from "./supabase.js";
import CommPanel, { useCommPanel, CommPanelTrigger } from "./comm-panel";

// 
// HELPERS
// 
const TODAY = new Date().toISOString().split("T")[0];
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
const STATUS_ORDER = ["nuevo","contactado","interesado","cita","verificacion","venta","no_interesado"];
const STATUS_CFG = {
  nuevo:         { label:"Nuevo",         icon:"", color:"#0369a1", bg:"#e0f2fe", border:"#bae6fd"  },
  contactado:    { label:"Contactado",    icon:"", color:"#5b21b6", bg:"#ede9fe", border:"#c4b5fd"  },
  interesado:    { label:"Interesado",    icon:"", color:"#925c0a", bg:"#fef9e7", border:"#f0d080"  },
  cita:          { label:"Cita",          icon:"", color:"#0f766e", bg:"#f0fdfa", border:"#99f6e4"  },
  verificacion:  { label:"Verificacion",  icon:"", color:"#1a7f3c", bg:"#edf7ee", border:"#a3d9a5"  },
  venta:         { label:"Venta",         icon:"", color:"#1a385a", bg:"#eaf0f7", border:"#b8cfe0"  },
  no_interesado: { label:"No interesado", icon:"", color:"#6b7280", bg:"#f4f5f7", border:"#e3e6ea"  },
};

const TIPOS_CONTACTO = ["llamada","whatsapp","cita","email","venta","verificacion","nota"];
const TIPO_ICONS = { llamada:"", whatsapp:"", cita:"", email:"", venta:"", verificacion:"", nota:"" };

const VERIF_ITEMS = [
  "Nombre completo del titular confirmado",
  "Co-propietario presente o confirmado",
  "Edad del titular  25 anos",
  "Telefono de contacto verificado",
  "Destino(s) y noches definidos",
  "Precio de venta acordado",
  "Regalos del paquete seleccionados",
];

const EMISORAS = ["Radio Hits","Banda 107","Stereo 94","Exitos 102","Mix 88","La Ke Buena"];
const ESTADO_CIVIL_OPTIONS = ["Casado","Union libre","Soltero hombre","Soltera mujer"];

//  Catalogo de destinos con reglas de calificacion 
const DESTINOS_CATALOG = [
  {
    id:"D01", nombre:"Cancun", icon:"", region:"internacional",
    qc:{ noches:5, ageMin:25, ageMax:65, marital:["Casado","Union libre","Soltero hombre","Soltera mujer"] },
    nq:{ enabled:true, noches:4, label:"Cancun Esencial" },
    regalosDisponibles:[
      { id:"G001", icon:"", label:"Tour Chichen Itza" },
      { id:"G002", icon:"", label:"Snorkel Isla Mujeres" },
      { id:"G004", icon:"", label:"Gift Card $75 USD" },
    ],
  },
  {
    id:"D02", nombre:"Los Cabos", icon:"", region:"internacional",
    qc:{ noches:4, ageMin:36, ageMax:99, marital:["Casado","Union libre"] },
    nq:{ enabled:false, noches:3, label:"" },
    regalosDisponibles:[
      { id:"G006", icon:"", label:"Cena romantica en la playa" },
      { id:"G007", icon:"", label:"Tour en lancha al Arco" },
      { id:"G008", icon:"", label:"Gift Card $75 USD" },
    ],
  },
  {
    id:"D03", nombre:"Riviera Maya", icon:"", region:"internacional",
    qc:{ noches:6, ageMin:25, ageMax:60, marital:["Casado","Union libre"] },
    nq:{ enabled:true, noches:4, label:"Riviera Maya Basico" },
    regalosDisponibles:[
      { id:"G009", icon:"", label:"Tour Tulum + Cenote" },
      { id:"G010", icon:"", label:"Snorkel en arrecife" },
      { id:"G011", icon:"", label:"Gift Card $75 USD" },
    ],
  },
  {
    id:"D04", nombre:"Las Vegas", icon:"", region:"nacional",
    qc:{ noches:3, ageMin:21, ageMax:99, marital:["Casado","Union libre","Soltero hombre","Soltera mujer"] },
    nq:{ enabled:false, noches:3, label:"" },
    regalosDisponibles:[
      { id:"G012", icon:"", label:"$50 credito casino" },
      { id:"G013", icon:"", label:"Show ticket" },
    ],
  },
  {
    id:"D05", nombre:"Orlando", icon:"", region:"nacional",
    qc:{ noches:4, ageMin:25, ageMax:99, marital:["Casado","Union libre","Soltero hombre","Soltera mujer"] },
    nq:{ enabled:false, noches:3, label:"" },
    regalosDisponibles:[
      { id:"G014", icon:"", label:"Gift Card $100" },
      { id:"G015", icon:"", label:"2 entradas parque de agua" },
    ],
  },
  {
    id:"D06", nombre:"Puerto Vallarta", icon:"", region:"internacional",
    qc:{ noches:4, ageMin:25, ageMax:60, marital:["Casado","Union libre","Soltero hombre","Soltera mujer"] },
    nq:{ enabled:true, noches:3, label:"Vallarta Basico" },
    regalosDisponibles:[
      { id:"G016", icon:"", label:"Tour en barco bahia" },
      { id:"G017", icon:"", label:"Canopy Sierra Madre" },
    ],
  },
  {
    id:"D07", nombre:"Huatulco", icon:"", region:"internacional",
    qc:{ noches:5, ageMin:25, ageMax:65, marital:["Casado","Union libre"] },
    nq:{ enabled:true, noches:3, label:"Huatulco Basico" },
    regalosDisponibles:[
      { id:"G018", icon:"", label:"Tour en lancha bahias" },
      { id:"G019", icon:"", label:"Gift Card $50 USD" },
    ],
  },
];

// Funcion de calificacion - igual que destinations-v5
function calificarDestinos(edad, estadoCivil) {
  if (!edad || !estadoCivil) return { qc: [], nq: [] };
  const age = Number(edad);
  const qc = [], nq = [];
  for (const dest of DESTINOS_CATALOG) {
    const { ageMin, ageMax, marital } = dest.qc;
    const califica = age >= ageMin && age <= ageMax && marital.includes(estadoCivil);
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
  salePrice:0, pagoInicial:0, metodoPago:"",
  destinos:[], notas:[], edad:0, estadoCivil:"",
  email:"", whatsapp:"", coProp:"", coPropEdad:0, coPropTel:"",
  direccion:"", ciudad:"Miami", estado:"FL",
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
function PaqueteTab({ draft, set }) {
  const edad = Number(draft.edad) || 0;
  const ec   = draft.estadoCivil || "";
  const { qc: destQC, nq: destNQ } = calificarDestinos(edad, ec);
  const hasPerfil = edad > 0 && ec;

  const addDest = (dest, tipo) => {
    set("destinos", [...(draft.destinos || []), {
      destId: dest.id,
      tipo,
      noches: tipo === "qc" ? dest.qc.noches : dest.nq.noches,
      regalo: null,
    }]);
  };

  const removeDest = (i) => set("destinos", (draft.destinos || []).filter((_, j) => j !== i));

  const setRegalo = (i, regalo) => {
    const nd = [...(draft.destinos || [])];
    nd[i] = { ...nd[i], regalo };
    set("destinos", nd);
  };

  const getCatalog = (destId) => DESTINOS_CATALOG.find(d => d.id === destId);

  // IDs ya seleccionados
  const selIds = (draft.destinos || []).map(d => d.destId);

  return (
    <div>
      {/*  Financiero  */}
      <div style={{ padding:"14px", borderRadius:"12px", background:"rgba(251,191,36,0.05)", border:"1px solid rgba(251,191,36,0.2)", marginBottom:"14px" }}>
        <div style={{ ...S.sTitle, color:"#925c0a" }}> Precio y forma de pago</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
          <div>
            <div style={S.label}>Precio total (USD)</div>
            <input style={{ ...S.input, fontWeight:"700", fontSize:"15px" }} type="number" min="0" placeholder="0"
              value={draft.salePrice || ""} onChange={e => set("salePrice", Number(e.target.value))} />
          </div>
          <div>
            <div style={S.label}>Pago hoy (USD)</div>
            <input style={{ ...S.input, fontWeight:"700", fontSize:"15px" }} type="number" min="0" placeholder="0"
              value={draft.pagoInicial || ""} onChange={e => set("pagoInicial", Number(e.target.value))} />
          </div>
        </div>
        <div style={{ marginBottom:"10px" }}>
          <div style={S.label}>Metodo de pago</div>
          <div style={{ display:"flex", gap:"8px" }}>
            {[
              { val:"tarjeta",       label:" Tarjeta" },
              { val:"transferencia", label:" Transferencia" },
            ].map(op => {
              const sel = draft.metodoPago === op.val;
              return (
                <div key={op.val} onClick={() => set("metodoPago", op.val)}
                  style={{ flex:1, padding:"10px 14px", borderRadius:"10px", cursor:"pointer", textAlign:"center", fontWeight:"700", fontSize:"13px",
                    background: sel ? "rgba(129,140,248,0.15)" : "#f8f9fb",
                    border: `2px solid ${sel ? "rgba(129,140,248,0.5)" : "#f0f1f4"}`,
                    color: sel ? "#1565c0" : "#9ca3af", transition:"all 0.15s" }}>
                  {op.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Info tarjeta - temporal, se borra al verificar o 24h */}
        {draft.metodoPago === "tarjeta" && (
          <div style={{ padding:"14px 16px", borderRadius:"10px", background:"rgba(129,140,248,0.06)", border:"1px solid rgba(129,140,248,0.25)", marginBottom:"10px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
              <span style={{ fontSize:"18px" }}></span>
              <div>
                <div style={{ fontSize:"12px", fontWeight:"700", color:"#1565c0" }}>Datos de tarjeta - Uso unico</div>
                <div style={{ fontSize:"11px", color:"#6366f1" }}>Se eliminan automaticamente al verificar o en 24 horas</div>
              </div>
            </div>
            <div style={{ marginBottom:"8px" }}>
              <div style={S.label}>Numero de tarjeta</div>
              <input style={{ ...S.input, letterSpacing:"0.15em", fontWeight:"600" }}
                placeholder="   " maxLength={19}
                value={draft.tarjetaNumero || ""}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g,"").slice(0,16);
                  set("tarjetaNumero", v.match(/.{1,4}/g)?.join(" ") || v);
                }} />
            </div>
            <div style={{ marginBottom:"8px" }}>
              <div style={S.label}>Nombre en tarjeta</div>
              <input style={{ ...S.input, textTransform:"uppercase" }} placeholder="NOMBRE APELLIDO"
                value={draft.tarjetaNombre || ""}
                onChange={e => set("tarjetaNombre", e.target.value.toUpperCase())} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"8px" }}>
              <div>
                <div style={S.label}>Vencimiento</div>
                <input style={S.input} placeholder="MM/AA" maxLength={5}
                  value={draft.tarjetaVence || ""}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g,"").slice(0,4);
                    set("tarjetaVence", v.length > 2 ? v.slice(0,2)+"/"+v.slice(2) : v);
                  }} />
              </div>
              <div>
                <div style={S.label}>CVV</div>
                <input style={S.input} placeholder="" maxLength={4} type="password"
                  value={draft.tarjetaCVV || ""}
                  onChange={e => set("tarjetaCVV", e.target.value.replace(/\D/g,"").slice(0,4))} />
              </div>
              <div>
                <div style={S.label}>Tipo</div>
                <select style={S.select} value={draft.tarjetaTipo || ""} onChange={e => set("tarjetaTipo", e.target.value)}>
                  <option value="">- -</option>
                  <option value="credito">Credito</option>
                  <option value="debito">Debito</option>
                </select>
              </div>
            </div>
            {/* Timestamp de captura para control de borrado */}
            {!draft.tarjetaCapturaTs && draft.tarjetaNumero && (
              <div style={{ display:"none" }}>{set("tarjetaCapturaTs", new Date().toISOString())}</div>
            )}
            <div style={{ padding:"8px 12px", borderRadius:"8px", background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", fontSize:"11px", color:"#b91c1c", lineHeight:1.6 }}>
               <strong>Datos sensibles - acceso restringido.</strong> Solo visible para el verificador asignado. Se eliminan automaticamente tras la verificacion o a las 24 horas de captura.
            </div>
          </div>
        )}
        {draft.salePrice > 0 && (
          <div style={{ display:"flex", gap:"12px", padding:"10px 12px", borderRadius:"9px", background:"#fffce5", border:"1px solid rgba(251,191,36,0.15)", flexWrap:"wrap", marginTop:"10px" }}>
            <div><div style={{ fontSize:"9px", color:"#92400e", textTransform:"uppercase", fontWeight:"700" }}>Total</div><div style={{ fontSize:"16px", fontWeight:"800", color:"#925c0a" }}>${(draft.salePrice||0).toLocaleString()}</div></div>
            <div><div style={{ fontSize:"9px", color:"#92400e", textTransform:"uppercase", fontWeight:"700" }}>Pago hoy</div><div style={{ fontSize:"16px", fontWeight:"800", color:"#1a7f3c" }}>${(draft.pagoInicial||0).toLocaleString()}</div></div>
            <div><div style={{ fontSize:"9px", color:"#92400e", textTransform:"uppercase", fontWeight:"700" }}>Saldo</div><div style={{ fontSize:"16px", fontWeight:"800", color:"#b91c1c" }}>${Math.max(0,(draft.salePrice||0)-(draft.pagoInicial||0)).toLocaleString()}</div></div>
            {draft.metodoPago && <div><div style={{ fontSize:"9px", color:"#92400e", textTransform:"uppercase", fontWeight:"700" }}>Metodo</div><div style={{ fontSize:"13px", fontWeight:"700", color:"#925c0a" }}>{{ tarjeta:" Tarjeta", transferencia:" Transferencia" }[draft.metodoPago]}</div></div>}
          </div>
        )}
      </div>

      {/*  Destinos seleccionados  */}
      {(draft.destinos || []).length > 0 && (
        <div style={{ marginBottom:"14px" }}>
          <div style={{ ...S.sTitle, color:"#0ea5a0" }}> Destinos del paquete</div>
          {(draft.destinos || []).map((d, i) => {
            const cat = getCatalog(d.destId);
            if (!cat) return null;
            const regalos = cat.regalosDisponibles || [];
            return (
              <div key={i} style={{ padding:"12px 14px", borderRadius:"10px", background:"rgba(14,165,160,0.05)", border:`2px solid ${d.tipo === "qc" ? "rgba(165,214,167,0.3)" : "rgba(206,147,216,0.3)"}`, marginBottom:"8px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <span style={{ fontSize:"20px" }}>{cat.icon}</span>
                    <div>
                      <div style={{ fontSize:"13px", fontWeight:"700", color:"#1a1f2e" }}>{cat.nombre}</div>
                      <div style={{ fontSize:"11px", color: d.tipo === "qc" ? "#a5d6a7" : "#ce93d8" }}>
                        {d.tipo === "qc" ? " QC" : " NQ"} . {d.noches} noches
                        {d.tipo === "nq" && cat.nq.label ? ` - ${cat.nq.label}` : ""}
                      </div>
                    </div>
                  </div>
                  <button style={{ ...S.btn("danger"), padding:"3px 9px", fontSize:"11px" }} onClick={() => removeDest(i)}></button>
                </div>
                {regalos.length > 0 && d.tipo === "qc" && (
                  <div>
                    <div style={{ fontSize:"9px", color:"#925c0a", fontWeight:"700", textTransform:"uppercase", marginBottom:"5px" }}>Regalo QC (elige 1)</div>
                    <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                      <div onClick={() => setRegalo(i, null)}
                        style={{ padding:"4px 9px", borderRadius:"7px", cursor:"pointer", fontSize:"11px", background: !d.regalo ? "#f4f5f7" : "#ffffff", border:`1px solid ${!d.regalo ? "#e3e6ea" : "#e3e6ea"}`, color: !d.regalo ? "#1a1f2e" : "#9ca3af" }}>
                        Sin regalo
                      </div>
                      {regalos.map(r => {
                        const sel = d.regalo?.id === r.id;
                        return (
                          <div key={r.id} onClick={() => setRegalo(i, r)}
                            style={{ padding:"4px 9px", borderRadius:"7px", cursor:"pointer", display:"flex", alignItems:"center", gap:"4px", fontSize:"11px", background: sel ? "#fef9e7" : "#f9fafb", border:`2px solid ${sel ? "rgba(251,191,36,0.5)" : "#f0f1f4"}`, color: sel ? "#925c0a" : "#9ca3af", fontWeight: sel ? "700" : "400" }}>
                            <span>{r.icon}</span>{r.label}{sel && <span style={{ color:"#925c0a" }}></span>}
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

      {/*  Agregar destinos  */}
      {!hasPerfil ? (
        <div style={{ padding:"16px", borderRadius:"12px", background:"rgba(251,146,60,0.07)", border:"1px solid rgba(251,146,60,0.25)", textAlign:"center" }}>
          <div style={{ fontSize:"20px", marginBottom:"8px" }}></div>
          <div style={{ fontSize:"13px", color:"#925c0a", fontWeight:"600", marginBottom:"4px" }}>Perfil incompleto</div>
          <div style={{ fontSize:"12px", color:"#92400e" }}>Ve a la pestana <b> Datos</b> y llena la <b>edad</b> y <b>estado civil</b> para ver los destinos disponibles.</div>
        </div>
      ) : (
        <div>
          {/* QC */}
          {destQC.length > 0 && (
            <div style={{ marginBottom:"12px" }}>
              <div style={{ fontSize:"11px", fontWeight:"700", color:"#a5d6a7", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px" }}>
                 Califica QC - {destQC.length} destino{destQC.length > 1 ? "s" : ""}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"7px" }}>
                {destQC.map(dest => {
                  const yaSel = selIds.includes(dest.id);
                  return (
                    <button key={dest.id} disabled={yaSel}
                      onClick={() => addDest(dest, "qc")}
                      style={{ padding:"8px 14px", borderRadius:"10px", cursor: yaSel ? "default" : "pointer", display:"flex", alignItems:"center", gap:"7px", background: yaSel ? "rgba(165,214,167,0.15)" : "rgba(165,214,167,0.07)", border:`2px solid ${yaSel ? "rgba(165,214,167,0.5)" : "rgba(165,214,167,0.2)"}`, opacity: yaSel ? 0.6 : 1 }}>
                      <span style={{ fontSize:"18px" }}>{dest.icon}</span>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ fontSize:"12px", fontWeight:"700", color: yaSel ? "#a5d6a7" : "#3d4554" }}>{dest.nombre}</div>
                        <div style={{ fontSize:"10px", color:"#1a7f3c" }}>QC . {dest.qc.noches}n</div>
                      </div>
                      {yaSel ? <span style={{ fontSize:"12px", color:"#1a7f3c" }}></span> : <span style={{ fontSize:"11px", color:"#a5d6a7" }}>+</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* NQ */}
          {destNQ.length > 0 && (
            <div style={{ marginBottom:"12px" }}>
              <div style={{ fontSize:"11px", fontWeight:"700", color:"#ce93d8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"4px" }}>
                 No califica QC - Paquete NQ disponible
              </div>
              <div style={{ fontSize:"10px", color:"#7c3aed", marginBottom:"8px" }}>
                El titular no cumple la edad o estado civil para el paquete premium de estos destinos, pero puede acceder al paquete NQ.
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"7px" }}>
                {destNQ.map(dest => {
                  const yaSel = selIds.includes(dest.id);
                  return (
                    <button key={dest.id} disabled={yaSel}
                      onClick={() => addDest(dest, "nq")}
                      style={{ padding:"8px 14px", borderRadius:"10px", cursor: yaSel ? "default" : "pointer", display:"flex", alignItems:"center", gap:"7px", background: yaSel ? "rgba(206,147,216,0.15)" : "rgba(206,147,216,0.07)", border:`2px solid ${yaSel ? "rgba(206,147,216,0.5)" : "rgba(206,147,216,0.2)"}`, opacity: yaSel ? 0.6 : 1 }}>
                      <span style={{ fontSize:"18px" }}>{dest.icon}</span>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ fontSize:"12px", fontWeight:"700", color: yaSel ? "#ce93d8" : "#3d4554" }}>{dest.nombre}</div>
                        <div style={{ fontSize:"10px", color:"#ce93d8" }}>NQ . {dest.nq.noches}n . {dest.nq.label}</div>
                      </div>
                      {yaSel ? <span style={{ fontSize:"12px", color:"#ce93d8" }}></span> : <span style={{ fontSize:"11px", color:"#ce93d8" }}>+</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {destQC.length === 0 && destNQ.length === 0 && (
            <div style={{ padding:"14px", borderRadius:"10px", background:"rgba(84,110,122,0.08)", border:"1px solid rgba(84,110,122,0.2)", textAlign:"center", fontSize:"12px", color:"#9ca3af" }}>
              Sin destinos disponibles para este perfil.
            </div>
          )}
        </div>
      )}
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
function LeadModal({ lead, users, currentUser, isSupervisor, onClose, onSave, onBlock, onUnblock }) {
  const [draft, setDraft]           = useState({ ...lead, notas: (lead.notas||[]).map(n => typeof n === "string" ? {ts:TODAY,autor:currentUser.name,tipo:"nota",nota:n} : n) });
  const [tab, setTab]               = useState("datos");
  const [newNota, setNewNota]       = useState("");
  const [newTipo, setNewTipo]       = useState("llamada");
  const [blockNote, setBlockNote]   = useState("");
  const [showBlock, setShowBlock]   = useState(false);
  const [verifCheck, setVerifCheck] = useState({});
  const comm = useCommPanel();

  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }));
  const vendedor        = users.find(u => u.id === lead.vendedorId);
  const dias            = daysSince(lead.ultimoContacto);
  const isAlert         = dias >= ALERT_DAYS && !["venta","no_interesado"].includes(lead.status) && !lead.bloqueado;
  const sc              = STATUS_CFG[draft.status];
  const canEdit         = !lead.bloqueado || isSupervisor;
  const isVentaVerif    = ["venta","verificacion"].includes(draft.status);
  const wasVentaVerif   = ["venta","verificacion"].includes(lead.status);
  const showChecklist   = isVentaVerif && !wasVentaVerif;
  const verifComplete   = VERIF_ITEMS.every((_, i) => verifCheck[i]);
  const canSeePaquete   = true; // Siempre visible - se puede ir llenando desde el primer contacto

  const addNota = () => {
    if (!newNota.trim()) return;
    set("notas", [...(draft.notas||[]), { ts:TODAY, autor:currentUser.name, tipo:newTipo, nota:newNota.trim() }]);
    set("ultimoContacto", TODAY);
    setNewNota("");
  };

  const handleSave = () => {
    if (showChecklist && !verifComplete) return;
    onSave(draft);
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
            <div style={{ fontSize:"12px", color:"#9ca3af", marginTop:"2px" }}>{lead.folio} . {lead.emisora} . {vendedor?.name}</div>
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
            {STATUS_ORDER.map(k => <option key={k} value={k}>{STATUS_CFG[k].label}</option>)}
          </select>
        </div>

        {/* Checklist */}
        {showChecklist && (
          <div style={{ marginBottom:"14px", padding:"14px", borderRadius:"12px", background:"rgba(129,140,248,0.08)", border:`2px solid ${verifComplete?"rgba(74,222,128,0.4)":"rgba(129,140,248,0.3)"}` }}>
            <div style={{ fontSize:"11px", fontWeight:"700", color:verifComplete?"#1a7f3c":"#1565c0", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"10px" }}>
               Checklist - {VERIF_ITEMS.filter((_,i)=>verifCheck[i]).length}/{VERIF_ITEMS.length}
            </div>
            {VERIF_ITEMS.map((item, i) => (
              <div key={i} onClick={() => setVerifCheck(p=>({...p,[i]:!p[i]}))}
                style={{ display:"flex", alignItems:"center", gap:"8px", padding:"6px 8px", borderRadius:"7px", cursor:"pointer", marginBottom:"4px", background:verifCheck[i]?"rgba(74,222,128,0.07)":"transparent", border:`1px solid ${verifCheck[i]?"rgba(74,222,128,0.2)":"#f6f7f9"}` }}>
                <div style={{ width:"16px", height:"16px", borderRadius:"4px", border:`2px solid ${verifCheck[i]?"#1a7f3c":"#9ca3af"}`, background:verifCheck[i]?"#1a7f3c":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {verifCheck[i] && <span style={{ fontSize:"10px", color:"#ffffff", fontWeight:"900" }}></span>}
                </div>
                <span style={{ fontSize:"12px", color:verifCheck[i]?"#1a7f3c":"#6b7280" }}>{item}</span>
              </div>
            ))}
            {!verifComplete && <div style={{ fontSize:"11px", color:"#b91c1c", marginTop:"8px" }}> Completa el checklist para guardar</div>}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:"flex", gap:"5px", borderBottom:"1px solid #e3e6ea", marginBottom:"14px", flexWrap:"wrap", paddingBottom:"8px" }}>
          {tabBtn("datos",       " Datos")}
          {tabBtn("seguimiento", ` Seguim.${(draft.notas||[]).length>0?` (${draft.notas.length})`:""}`, "#925c0a")}
          {canSeePaquete && tabBtn("paquete", " Paquete", "#1a7f3c")}
          {isSupervisor  && tabBtn("admin",   " Admin",   "#b91c1c")}
        </div>

        {/* TAB: DATOS */}
        {tab === "datos" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"12px" }}>
              <div style={{ gridColumn:"1/-1" }}>
                <div style={S.label}>Nombre *</div>
                <input style={S.input} value={draft.nombre||""} onChange={e => set("nombre",e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <div style={S.label}>Edad</div>
                <input style={S.input} type="number" min="18" max="99" value={draft.edad||""} onChange={e => set("edad",Number(e.target.value))} disabled={!canEdit} />
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
              <div>
                <div style={S.label}>Ciudad</div>
                <input style={S.input} value={draft.ciudad||""} onChange={e => set("ciudad",e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <div style={S.label}>Estado</div>
                <input style={S.input} value={draft.estado||""} onChange={e => set("estado",e.target.value)} disabled={!canEdit} />
              </div>
            </div>
            <div style={{ padding:"12px 14px", borderRadius:"10px", background:"#f9fafb", border:"1px solid #e3e6ea" }}>
              <div style={S.sTitle}> Co-propietario</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 70px 1fr", gap:"8px" }}>
                <div><div style={S.label}>Nombre</div><input style={S.input} value={draft.coProp||""} onChange={e=>set("coProp",e.target.value)} disabled={!canEdit} placeholder="-" /></div>
                <div><div style={S.label}>Edad</div><input style={S.input} type="number" min="18" value={draft.coPropEdad||""} onChange={e=>set("coPropEdad",Number(e.target.value))} disabled={!canEdit} /></div>
                <div><div style={S.label}>Telefono</div><input style={S.input} value={draft.coPropTel||""} onChange={e=>set("coPropTel",e.target.value)} disabled={!canEdit} placeholder="-" /></div>
              </div>
            </div>
            {/* Aviso si falta perfil para calificacion */}
            {(!draft.edad || !draft.estadoCivil) && (
              <div style={{ marginTop:"10px", padding:"9px 12px", borderRadius:"8px", background:"rgba(251,146,60,0.07)", border:"1px solid rgba(251,146,60,0.2)", fontSize:"11px", color:"#925c0a" }}>
                 Llena <b>edad</b> y <b>estado civil</b> para ver los destinos disponibles en la pestana  Paquete
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

        {/* TAB: PAQUETE */}
        {tab === "paquete" && canSeePaquete && (
          <PaqueteTab draft={draft} set={set} />
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
            <button style={{ ...S.btn("success"), flex:2, justifyContent:"center", opacity:showChecklist&&!verifComplete?0.4:1 }}
              disabled={showChecklist&&!verifComplete} onClick={handleSave}>
               Guardar{showChecklist&&!verifComplete?" (checklist incompleto)":""}
            </button>
          )}
        </div>
      </div>
      <CommPanel
        visible={comm.visible}
        cliente={comm.cliente}
        logs={comm.logs}
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
  const vendedores = (users||[]).filter(u => u.role==="vendedor");
  const [nombre,   setNombre]   = useState("");
  const [tel,      setTel]      = useState("");
  const [spotId,   setSpotId]   = useState("");
  const [emisora,  setEmisora]  = useState("");
  const [nota,     setNota]     = useState("");
  const [asignarA, setAsignarA] = useState(isSup ? (vendedores[0]?.id||"") : currentUser.id);
  const [spots,    setSpots]    = useState([]);
  const [emisoras, setEmisoras] = useState([]);
  const [loadingSpots, setLoadingSpots] = useState(true);
  const valid = nombre.trim() && tel.trim();

  // Cargar spots de la semana actual y siguientes desde Supabase
  useState(() => {
    var hoy = new Date();
    var dia = hoy.getDay();
    var lunesOffset = dia === 0 ? -6 : 1 - dia;
    var lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + lunesOffset);
    var lunesStr = lunes.toISOString().split("T")[0];
    Promise.all([
      SB.from("radio_spots").select("*").gte("semana", lunesStr).order("semana").order("dia_semana").order("hora"),
      SB.from("emisoras").select("id,nombre").order("nombre"),
    ]).then(function(results) {
      var resS = results[0];
      var resE = results[1];
      setLoadingSpots(false);
      if (resS.data) setSpots(resS.data);
      if (resE.data) setEmisoras(resE.data);
      if (resS.data && resS.data.length > 0) {
        setSpotId(resS.data[0].id);
        if (resE.data) {
          var em = resE.data.find(function(e){ return e.id === resS.data[0].emisora_id; });
          setEmisora(em ? em.nombre : "");
        }
      } else {
        setSpotId("__manual__");
      }
    }).catch(function(){ setLoadingSpots(false); setSpotId("__manual__"); });
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
    var dias = { lunes:0, martes:1, miercoles:2, jueves:3, viernes:4, sabado:5, domingo:6 };
    var offset = dias[sp.dia_semana] !== undefined ? dias[sp.dia_semana] : 0;
    var base = new Date(sp.semana + "T12:00:00");
    base.setDate(base.getDate() + offset);
    return base.toLocaleDateString("es-MX", {weekday:"short", day:"2-digit", month:"short"});
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
    onSave(mkLead({
      id: "L"+Date.now(), folio:"F"+Date.now().toString().slice(-5),
      nombre:nombre.trim(), tel:tel.trim(),
      emisora: emLabel,
      spotId: spotId !== "__manual__" ? spotId : null,
      vendedorId:asignarA, status:"nuevo",
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

        {isSup && (
          <div style={{ marginBottom:"16px" }}>
            <div style={S.label}>Asignar a *</div>
            <select style={{ ...S.select, borderColor:"#a3d9a5" }} value={asignarA} onChange={e=>setAsignarA(e.target.value)}>
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
function LeadCard({ lead, isSupervisor, isSelected, onSelect, onClick, onDragStart, onAI }) {
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
function KanbanCol({ status, leads, isSupervisor, selectedIds, onSelect, onCardClick, onDragStart, onAI }) {
  const sc = STATUS_CFG[status];
  return (
    <div style={{ minWidth:"210px", flex:1, display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"7px 11px", borderRadius:"8px 8px 0 0", background:sc.bg, border:`1px solid ${sc.border}`, marginBottom:"5px", display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:"11px", fontWeight:"700", color:sc.color }}>{sc.icon} {sc.label}</span>
        <span style={{ fontSize:"11px", fontWeight:"700", color:sc.color, background:`${sc.color}20`, padding:"0 7px", borderRadius:"10px" }}>{leads.length}</span>
      </div>
      <div style={{ flex:1, minHeight:"60px" }}>
        {leads.map(l => <LeadCard key={l.id} lead={l} isSupervisor={isSupervisor} isSelected={selectedIds?.includes(l.id)} onSelect={onSelect} onClick={onCardClick} onDragStart={onDragStart} onAI={onAI} />)}
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

// 
// VENDEDOR VIEW
// 
function VendedorView({ leads, users, currentUser, onUpdateLead }) {
  const [sel,     setSel]    = useState(null);
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
        <button style={S.tab(tab==="prioridades","#1565c0")} onClick={()=>setTab("prioridades")}> Prioridades AI</button>
      </div>
      {tab==="prioridades" && <PrioridadesAI leads={leads} currentUser={currentUser} />}
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
            {["all",...STATUS_ORDER.filter(s=>s!=="no_interesado")].map(s => (
              <button key={s} style={S.tab(fStatus===s, s==="all"?"#1565c0":STATUS_CFG[s]?.color)} onClick={()=>setFStatus(s)}>
                {s==="all"?"Todos":STATUS_CFG[s].label}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:"10px", overflowX:"auto", paddingBottom:"12px" }}>
            {STATUS_ORDER.filter(s=>s!=="no_interesado").map(status => (
              <KanbanCol key={status} status={status} leads={filtered.filter(l=>l.status===status)}
                isSupervisor={false} onCardClick={setSel} onAI={setAiLead} />
            ))}
          </div>
        </>
      )}
      {sel && <LeadModal lead={sel} users={users} currentUser={currentUser} isSupervisor={false}
        onClose={()=>setSel(null)} onSave={u=>{onUpdateLead(u);setSel(null);}} onBlock={()=>{}} onUnblock={()=>{}} />}
      {aiLead && <LeadAIPanel lead={aiLead} onClose={()=>setAiLead(null)} />}
    </div>
  );
}

// 
// SUPERVISOR VIEW
// 
function SupervisorView({ leads, users, currentUser, onUpdateLead, onBulkReassign }) {
  const [tab,           setTab]           = useState("pipeline");
  const [selLead,       setSelLead]       = useState(null);
  const [selIds,        setSelIds]        = useState([]);
  const [dragLead,      setDragLead]      = useState(null);
  const [dragOverV,     setDragOverV]     = useState(null);
  const [reassignModal, setReassignModal] = useState(false);
  const [reassignTo,    setReassignTo]    = useState("");
  const [fVendedor,     setFVendedor]     = useState("all");
  const [fStatus,       setFStatus]       = useState("all");

  const miEquipo  = users.filter(u => u.supervisorId===currentUser.id);
  const teamIds   = miEquipo.map(u => u.id);
  const teamLeads = leads.filter(l => teamIds.includes(l.vendedorId));
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
            {STATUS_ORDER.filter(s=>s!=="no_interesado").map(status=>(
              <KanbanCol key={status} status={status} leads={filtered.filter(l=>l.status===status)}
                isSupervisor={true} selectedIds={selIds} onSelect={toggleSel} onCardClick={setSelLead} onDragStart={handleDragStart} />
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
        <LeadModal lead={selLead} users={users} currentUser={currentUser} isSupervisor={true}
          onClose={()=>setSelLead(null)} onSave={u=>{onUpdateLead(u);setSelLead(null);}}
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
// ROOT
// 
export default function SellerCRMv3({ currentUser: shellUser }) {
  const [leads,        setLeads]       = useState(SEED_LEADS);
  const [toast,        setToast]       = useState(null);
  const [showNuevo,    setShowNuevo]   = useState(false);
  // Para supervisor: permite cambiar la vista entre vendedores de su equipo
  const [vistaUserId,  setVistaUserId] = useState(null);

  // Normalizar el usuario del shell al formato interno del modulo
  // El shell pasa: { id, nombre, rol, auth_id, ... }
  // El modulo usa: { id, name, role, supervisorId }
  var rolShell = (shellUser && shellUser.rol) ? shellUser.rol : "vendedor";
  var SUP_ROLES = ["admin", "director", "supervisor"];
  var isSup = SUP_ROLES.includes(rolShell);

  var mappedUser = shellUser ? {
    id:           shellUser.auth_id || shellUser.id || "U_shell",
    name:         shellUser.nombre  || shellUser.name || "Usuario",
    role:         isSup ? "supervisor" : "vendedor",
    supervisorId: null,
  } : SEED_USERS[0];

  // Si es supervisor y cambia de vista, usamos vistaUserId; sino el propio usuario
  var activeUser = (isSup && vistaUserId)
    ? (SEED_USERS.find(function(u){ return u.id === vistaUserId; }) || mappedUser)
    : mappedUser;

  const notify = (msg, ok) => {
    var isOk = ok === undefined ? true : ok;
    setToast({msg:msg, ok:isOk});
    setTimeout(function(){ setToast(null); }, 3000);
  };

  const limpiarTarjeta = (lead) => ({
    ...lead,
    tarjetaNumero: null, tarjetaNombre: null,
    tarjetaVence: null,  tarjetaCVV: null,
    tarjetaTipo: null,   tarjetaCapturaTs: null,
  });

  useState(function(){
    var ahora = Date.now();
    setLeads(function(p){ return p.map(function(l){
      if (l.tarjetaCapturaTs && (ahora - new Date(l.tarjetaCapturaTs).getTime()) > 86400000) {
        return limpiarTarjeta(l);
      }
      return l;
    }); });
  });

  const handleUpdateLead = function(u) {
    var prev = leads.find(function(l){ return l.id === u.id; });
    var recienVerificado = ["verificacion","venta"].includes(u.status) && !["verificacion","venta"].includes(prev ? prev.status : "");
    var final = recienVerificado ? limpiarTarjeta(u) : u;
    setLeads(function(p){ return p.map(function(l){ return l.id === final.id ? final : l; }); });
    if (recienVerificado && u.tarjetaNumero) notify("Datos de tarjeta eliminados al pasar a " + u.status);
    else notify("Lead actualizado");
  };

  const handleAddLead = function(l) {
    setLeads(function(p){ return [l, ...p]; });
    notify("Lead agregado - " + l.nombre);
  };

  const handleBulkReassign = function(ids, vid) {
    var v = SEED_USERS.find(function(u){ return u.id === vid; });
    setLeads(function(p){ return p.map(function(l){ return ids.includes(l.id) ? {...l, vendedorId:vid} : l; }); });
    notify(ids.length + " leads reasignados a " + (v ? v.name : vid));
  };

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={{ fontSize:"12px", fontWeight:"700", color:"#9ca3af", letterSpacing:"0.1em", textTransform:"uppercase" }}>Mini-Vac CRM</div>
        <div style={{ width:"1px", height:"16px", background:"#e3e6ea" }} />
        <div style={{ fontSize:"14px", fontWeight:"600", color:"#1a385a" }}>{isSup ? "Pipeline del equipo" : "Mis Leads"}</div>
        <div style={{ flex:1 }} />
        <button style={{ ...S.btn("success"), padding:"7px 16px", fontSize:"13px", fontWeight:"700" }} onClick={function(){ setShowNuevo(true); }}>+ Nuevo lead</button>
        {isSup && (
          <>
            <div style={{ width:"1px", height:"16px", background:"#e3e6ea" }} />
            <div style={{ display:"flex", gap:"4px", alignItems:"center" }}>
              <span style={{ fontSize:"11px", color:"#9ca3af" }}>Vista:</span>
              <button style={{ ...S.btn(!vistaUserId?"indigo":"ghost"), padding:"4px 9px", fontSize:"11px" }}
                onClick={function(){ setVistaUserId(null); }}>
                Equipo
              </button>
              {SEED_USERS.filter(function(u){ return u.role==="vendedor"; }).map(function(u){
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
        ? <SupervisorView leads={leads} users={SEED_USERS} currentUser={activeUser} onUpdateLead={handleUpdateLead} onBulkReassign={handleBulkReassign} />
        : <VendedorView   leads={leads} users={SEED_USERS} currentUser={mappedUser}  onUpdateLead={handleUpdateLead} />
      }

      {showNuevo && (
        <NuevoLeadModal currentUser={isSup ? activeUser : mappedUser} users={SEED_USERS}
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
