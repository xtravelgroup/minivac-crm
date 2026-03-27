import { useState, useEffect } from "react";
import { supabase as SB } from "./supabase.js";
import CommPanel, { useCommPanel, CommPanelTrigger } from "./comm-panel";
import { registrarEvento, TablaHistorial } from "./useHistorial.jsx";
import EmailPanel from "./email-panel.jsx";

const TODAY = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

function fmtDate(d) {
  if (!d) return "--";
  return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day:"2-digit", month:"short", year:"numeric" });
}
function fmtUSD(n) {
  if (!n && n !== 0) return "--";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits:0 });
}
function maskCard(num) {
  if (!num) return "**** **** **** ****";
  const c = num.replace(/\s/g, "");
  return c.slice(0,-4).replace(/\d/g,"*").replace(/(.{4})/g,"$1 ").trim() + " " + c.slice(-4);
}
function calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date(), nac = new Date(fechaNac + "T12:00:00");
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}
function edadLabel(f) { const e = calcEdad(f); return e !== null ? e + " anos" : "--"; }

// DESTINOS_CATALOG cargado desde Supabase — se rellena en VerificationModule
var DESTINOS_CATALOG = [];
var DEST_MAP = {};

// Convierte fila DB → formato interno verificador
function dbToDestinoVerif(r) {
  var qc = r.qc || {};
  var nq = r.nq || {};
  return {
    id:      r.id,
    nombre:  r.nombre,
    icon:    r.icon || "🏖️",
    region:  r.region || "internacional",
    activo:  r.activo !== false,
    qc: {
      noches:  qc.nights  || qc.noches  || 4,
      ageMin:  qc.ageMin  || 18,
      ageMax:  qc.ageMax  || 99,
      adultos: qc.adultos || 2,
      ninos:   qc.ninos   || 0,
      marital: qc.marital || [],
    },
    nq: {
      enabled: nq.enabled || false,
      noches:  nq.nights  || nq.noches  || 3,
      label:   nq.label   || "",
    },
    regalosDisponibles: ((qc.gifts && qc.gifts.items) || [])
      .filter(function(g){ return g.active !== false; })
      .map(function(g){ return { id: g.id || g.label, label: g.name || g.label, icon: g.icon || "🎁" }; }),
  };
}



var ESTADO_CIVIL_OPTIONS = ["Casado","Union libre","Soltero hombre","Soltera mujer"];

const BENEFICIOS_CATALOGO = [
  { id:"late_checkout",   label:"Late checkout",              precio:80  },
  { id:"early_checkin",   label:"Early check-in",             precio:80  },
  { id:"traslado_ida",    label:"Traslado aeropuerto ida",    precio:120 },
  { id:"traslado_vuelta", label:"Traslado aeropuerto vuelta", precio:120 },
  { id:"traslado_doble",  label:"Traslado doble ida+vuelta",  precio:200 },
  { id:"cena_romantica",  label:"Cena romantica",             precio:150 },
  { id:"decoracion",      label:"Decoracion habitacion",      precio:100 },
  { id:"snorkel",         label:"Tour snorkel",               precio:90  },
  { id:"tour_ciudad",     label:"City tour",                  precio:70  },
  { id:"spa_credito",     label:"Credito spa $100",           precio:100 },
];

const VERIF_RESULTS = {
  venta:                 { label:"Venta",             color:"#1a7f3c", bg:"rgba(74,222,128,0.08)",   border:"#a3d9a5"   },
  venta_pendiente:       { label:"Venta Pendiente",   color:"#925c0a", bg:"#fffbe0",  border:"#f0d080"   },
  tarjeta_rechazada:     { label:"Tarjeta Rechazada", color:"#b91c1c", bg:"rgba(248,113,113,0.08)", border:"#f5b8b8"  },
  cliente_no_interesado: { label:"No Interesado",     color:"#6b7280", bg:"rgba(148,163,184,0.08)", border:"rgba(148,163,184,0.3)"  },
};

const SEED = [
  {
    id:"L004", nombre:"Miguel Torres", phone:"305-1234-04",
    radioName:"Radio Hits 99.3 FM", sellerName:"Luis Ramos", createdAt:TODAY, status:"verificacion",
    exp:{
      tFirstName:"Miguel", tLastName:"Torres", tFechaNac:"1982-05-14", tSexo:"Hombre", tPhone:"305-1234-04", tEmail:"miguel@email.com", tEstadoCivil:"Casado",
      hasPartner:true, pFirstName:"Elena", pLastName:"Torres", pFechaNac:"1985-03-22", pSexo:"Mujer", pPhone:"305-1234-05",
      address:"4520 NW 7th St", city:"Miami", state:"FL", zip:"33126",
      destinos:[{ destId:"D01", tipo:"qc", noches:5, regalo:{ id:"G001", label:"Tour Chichen Itza" } }],
      salePrice:5200, pagoInicial:1000,
      metodoPago:"tarjeta",
      tarjetaNumero:"4111111111111111", tarjetaNombre:"MIGUEL TORRES", tarjetaVence:"12/27", tarjetaCVV:"123", tarjetaTipo:"credito",
      tarjetaCapturaTs: new Date(Date.now() - 3600000).toISOString(),
      notas:"Viajan agosto. Regalo: Tour Chichen Itza.",
    },
    verificacion: null,
  },
  {
    id:"L007", nombre:"Patricia Sanchez", phone:"305-9876-07",
    radioName:"Banda 107.7 FM", sellerName:"Ana Morales", createdAt:TODAY, status:"verificacion",
    exp:{
      tFirstName:"Patricia", tLastName:"Sanchez", tFechaNac:"1989-11-30", tSexo:"Mujer", tPhone:"305-9876-07", tEmail:"paty.sanchez@gmail.com", tEstadoCivil:"Casado",
      hasPartner:true, pFirstName:"Rodrigo", pLastName:"Sanchez", pFechaNac:"1986-07-08", pSexo:"Hombre", pPhone:"305-9876-08",
      address:"8901 Coral Way", city:"Miami", state:"FL", zip:"33155",
      destinos:[
        { destId:"D03", tipo:"qc", noches:6, regalo:{ id:"G009", label:"Tour Tulum + Cenote" } },
        { destId:"D07", tipo:"nq", noches:3, regalo:null },
      ],
      salePrice:7800, pagoInicial:1500,
      metodoPago:"tarjeta",
      tarjetaNumero:"5500005555555559", tarjetaNombre:"PATRICIA SANCHEZ", tarjetaVence:"08/26", tarjetaCVV:"321", tarjetaTipo:"credito",
      tarjetaCapturaTs: new Date(Date.now() - 1800000).toISOString(),
      notas:"Paquete aniversario. Riviera Maya QC + Huatulco NQ.",
    },
    verificacion: null,
  },
  {
    id:"L008", nombre:"Fernando Reyes", phone:"305-5544-08",
    radioName:"Stereo 94.5 FM", sellerName:"Carlos Vega", createdAt:TODAY, status:"verificacion",
    exp:{
      tFirstName:"Fernando", tLastName:"Reyes", tFechaNac:"1969-02-19", tSexo:"Hombre", tPhone:"305-5544-08", tEmail:"freyes@hotmail.com", tEstadoCivil:"Soltero hombre",
      hasPartner:false, pFirstName:"", pLastName:"", pFechaNac:"", pPhone:"",
      address:"1200 Brickell Ave", city:"Miami", state:"FL", zip:"33131",
      destinos:[{ destId:"D02", tipo:"qc", noches:4, regalo:{ id:"G006", label:"Cena en la playa" } }],
      salePrice:4500, pagoInicial:900,
      metodoPago:"transferencia",
      tarjetaNumero:"", tarjetaNombre:"", tarjetaVence:"", tarjetaCVV:"", tarjetaTipo:"",
      tarjetaCapturaTs: null,
      notas:"Ejecutivo. Los Cabos Premium.",
    },
    verificacion:{
      result:"venta_pendiente", verifiedAt:TODAY, verifiedBy:"Verificador",
      paymentStatus:"pending", notes:"Esperando confirmacion transferencia.",
      docsSent:false, chargeAttempts:[],
    },
  },
];

const S = {
  wrap:    { minHeight:"100vh", background:"#f4f5f7", color:"#3d4554", fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif" },
  topbar:  { background:"#ffffff", borderBottom:"1px solid #e3e6ea", padding:"0 24px", display:"flex", alignItems:"center", gap:"14px", position:"sticky", top:0, zIndex:100, minHeight:"52px" },
  card:    { background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:"12px", padding:"20px", marginBottom:"14px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" },
  label:   { fontSize:"11px", color:"#9ca3af", marginBottom:"3px", fontWeight:"600" },
  value:   { fontSize:"14px", color:"#1a1f2e", fontWeight:"500" },
  sTitle:  { fontSize:"10px", fontWeight:"700", color:"#9ca3af", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" },
  divider: { height:"1px", background:"#e3e6ea", margin:"14px 0" },
  input:   { width:"100%", background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:"8px", padding:"9px 12px", color:"#1a1f2e", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  textarea:{ width:"100%", background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:"8px", padding:"9px 12px", color:"#1a1f2e", fontSize:"13px", outline:"none", resize:"vertical", minHeight:"72px", boxSizing:"border-box", fontFamily:"inherit" },
  select:  { width:"100%", background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:"8px", padding:"9px 12px", color:"#1a1f2e", fontSize:"13px", outline:"none", cursor:"pointer", fontFamily:"inherit", boxSizing:"border-box" },
  modal:   { position:"fixed", inset:0, background:"rgba(15,20,30,0.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" },
  modalBox:{ background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:"14px", padding:"28px", maxWidth:"600px", width:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 8px 32px rgba(0,0,0,0.10)" },
  badge:   (color, bg, border) => ({ display:"inline-flex", alignItems:"center", gap:"5px", padding:"3px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:"600", color, background:bg, border:"1px solid " + border }),
  pill:    (color) => ({ display:"inline-block", padding:"2px 9px", borderRadius:"12px", fontSize:"11px", fontWeight:"600", background:color + "22", color, border:"1px solid " + color + "55" }),
  btn:     (v) => {
    const m = {
      primary:{ bg:"#1a385a",  color:"#fff",    border:"transparent" },
      success:{ bg:"#edf7ee",  color:"#1a7f3c", border:"#a3d9a5"     },
      danger: { bg:"#fef2f2",  color:"#b91c1c", border:"#f5b8b8"     },
      warning:{ bg:"#fef9e7",  color:"#925c0a", border:"#f0d080"     },
      ghost:  { bg:"#f4f5f7",  color:"#6b7280", border:"#e3e6ea"     },
      indigo: { bg:"#e8f0fe",  color:"#1565c0", border:"#aac4f0"     },
    };
    const s = m[v] || m.primary;
    return { display:"inline-flex", alignItems:"center", gap:"7px", padding:"9px 18px", borderRadius:"9px", cursor:"pointer", fontSize:"13px", fontWeight:"600", background:s.bg, color:s.color, border:"1px solid " + s.border, transition:"all 0.18s", whiteSpace:"nowrap" };
  },
  g2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" },
  g3: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px" },
};

function EditExpedienteModal({ exp, destCatalog, destMap, onClose, onSave }) {
  // Forzar re-render cuando el catálogo cargue
  var [tick, setTick] = useState(0);
  useEffect(function() {
    if (DESTINOS_CATALOG.length > 0) return; // ya cargó
    var t = setInterval(function() {
      if (DESTINOS_CATALOG.length > 0) { setTick(function(n){ return n+1; }); clearInterval(t); }
    }, 200);
    return function(){ clearInterval(t); };
  }, []);
  var catalog = (destCatalog && destCatalog.length > 0) ? destCatalog : DESTINOS_CATALOG;
  var dmap    = (destMap && Object.keys(destMap).length > 0) ? destMap : DEST_MAP;



  var [d, setD] = useState(Object.assign({}, exp, {
    destinos: (exp.destinos||[]).map(function(x){ return Object.assign({},x); }),
    tEstadoCivil: exp.tEstadoCivil || exp.estadoCivil || "",
  }));
  function set(k,v){ setD(function(p){ return Object.assign({},p,{[k]:v}); }); }
  function setRegalo(i, regalo) {
    setD(function(p){
      return Object.assign({},p,{destinos:p.destinos.map(function(x,j){ return j===i?Object.assign({},x,{regalo:regalo}):x; })});
    });
  }
  function removeDest(i) {
    setD(function(p){ return Object.assign({},p,{destinos:p.destinos.filter(function(_,j){ return j!==i; })}); });
  }
  function addDest(dest, tipo) {
    var noches = tipo==="qc" ? (dest.qc.noches||5) : (dest.nq.noches||3);
    setD(function(p){ return Object.assign({},p,{destinos:p.destinos.concat([{destId:dest.id,tipo:tipo,noches:noches,regalo:null}])}); });
  }

  var saldo   = (d.salePrice||0) - (d.pagoInicial||0);
  var selIds  = d.destinos.map(function(x){ return x.destId; });
  var edad    = Number(d.edad) || (d.tFechaNac ? Math.floor((Date.now()-new Date(d.tFechaNac).getTime())/31557600000) : 0);
  var ec      = d.estadoCivil || d.tEstadoCivil || "";

  // Calificar destinos con catálogo dinámico
  var destQC = []; var destNQ = [];
  catalog.filter(function(dest){ return dest.activo !== false; }).forEach(function(dest) {
    var qc = dest.qc || {};
    if (selIds.includes(dest.id)) return; // ya agregado
    if (edad > 0 && ec && (qc.marital||[]).length > 0) {
      // Calificar estrictamente solo si hay reglas definidas
      var edadOk = edad >= (qc.ageMin||18) && edad <= (qc.ageMax||99);
      var ecOk   = (qc.marital||[]).includes(ec);
      if (edadOk && ecOk) destQC.push(dest);
      else if (dest.nq && dest.nq.enabled) destNQ.push(dest);
    } else {
      // Sin perfil completo o sin reglas → mostrar todos como QC
      destQC.push(dest);
    }
  });

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={function(e){ e.stopPropagation(); }}>
        <div style={{fontSize:18,fontWeight:700,color:"#1a1f2e",marginBottom:4}}>Editar Expediente</div>
        <div style={{fontSize:13,color:"#9ca3af",marginBottom:20}}>Cambios registrados por el verificador</div>

        {/* TITULAR */}
        <div style={{marginBottom:16}}>
          <div style={S.sTitle}>Titular</div>
          <div style={S.g3}>
            <div><div style={S.label}>Nombre</div><input style={S.input} value={d.tFirstName||""} onChange={function(e){ set("tFirstName",e.target.value); }} /></div>
            <div><div style={S.label}>Apellido</div><input style={S.input} value={d.tLastName||""} onChange={function(e){ set("tLastName",e.target.value); }} /></div>
            <div>
              <div style={S.label}>Fecha de nacimiento</div>
              <input style={S.input} type="date" value={d.tFechaNac||""} onChange={function(e){ set("tFechaNac",e.target.value); }} max={TODAY} />
              {d.tFechaNac && <div style={{fontSize:11,color:"#1a7f3c",marginTop:3,fontWeight:600}}>Edad: {edadLabel(d.tFechaNac)}</div>}
            </div>
            <div>
              <div style={S.label}>Sexo</div>
              <select style={S.select} value={d.tSexo||""} onChange={function(e){ set("tSexo",e.target.value); }}>
                <option value="">-- Seleccionar --</option>
                <option value="Hombre">Hombre</option>
                <option value="Mujer">Mujer</option>
              </select>
            </div>
            <div>
              <div style={S.label}>Estado civil</div>
              <select style={S.select} value={d.tEstadoCivil||""} onChange={function(e){ set("tEstadoCivil",e.target.value); }}>
                <option value="">-- Seleccionar --</option>
                {ESTADO_CIVIL_OPTIONS.map(function(o){ return <option key={o}>{o}</option>; })}
              </select>
            </div>
            <div><div style={S.label}>Teléfono</div><input style={S.input} value={d.tPhone||""} onChange={function(e){ set("tPhone",e.target.value); }} /></div>
            <div style={{gridColumn:"1/-1"}}><div style={S.label}>Email</div><input style={S.input} value={d.tEmail||""} onChange={function(e){ set("tEmail",e.target.value); }} /></div>
          </div>
        </div>

        {/* CO-PROPIETARIO */}
        {(function(){
          var showCoProp = ["Casado","Union libre","Cohabitante"].includes(d.tEstadoCivil);
          if (!showCoProp) return null;
          return (
        <div style={{marginBottom:16}}>
          <div style={{marginBottom:10}}>
            <div style={S.sTitle}>Co-propietario</div>
          </div>
          <div style={S.g3}>
            <div><div style={S.label}>Nombre</div><input style={S.input} value={d.pFirstName||""} onChange={function(e){ set("pFirstName",e.target.value); }} /></div>
            <div><div style={S.label}>Apellido</div><input style={S.input} value={d.pLastName||""} onChange={function(e){ set("pLastName",e.target.value); }} /></div>
            <div>
              <div style={S.label}>Fecha de nacimiento</div>
              <input style={S.input} type="date" value={d.pFechaNac||""} onChange={function(e){ set("pFechaNac",e.target.value); }} max={TODAY} />
              {d.pFechaNac && <div style={{fontSize:11,color:"#1a7f3c",marginTop:3,fontWeight:600}}>Edad: {edadLabel(d.pFechaNac)}</div>}
            </div>
            <div>
              <div style={S.label}>Sexo</div>
              <select style={S.select} value={d.pSexo||""} onChange={function(e){ set("pSexo",e.target.value); }}>
                <option value="">-- Seleccionar --</option>
                <option value="Hombre">Hombre</option>
                <option value="Mujer">Mujer</option>
              </select>
              </div>
              <div><div style={S.label}>Teléfono</div><input style={S.input} value={d.pPhone||""} onChange={function(e){ set("pPhone",e.target.value); }} /></div>
            </div>
        </div>
          );
        })()}

        {/* DIRECCIÓN */}
        <div style={{marginBottom:16}}>
          <div style={S.sTitle}>Dirección</div>
          <div style={S.g2}>
            <div style={{gridColumn:"1/-1"}}><div style={S.label}>Calle y número</div><input style={S.input} value={d.address||""} onChange={function(e){ set("address",e.target.value); }} /></div>
            <div><div style={S.label}>Ciudad</div><input style={S.input} value={d.city||""} onChange={function(e){ set("city",e.target.value); }} /></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}><div><div style={S.label}>Estado</div><input style={S.input} value={d.state||""} onChange={function(e){ set("state",e.target.value); }} placeholder="FL"/></div><div><div style={S.label}>ZIP Code</div><input style={S.input} value={d.zip||""} onChange={function(e){ set("zip",e.target.value); }} placeholder="00000"/></div></div>
          </div>
        </div>

        {/* DESTINOS — mismo UX que vendedor */}
        <div style={{marginBottom:16}}>
          <div style={S.sTitle}>Destinos del paquete</div>

          {/* Destinos ya seleccionados */}
          {d.destinos.map(function(dest, i) {
            var cat = dmap[dest.destId];
            if (!cat) return null;
            var regalos = cat.regalosDisponibles || [];
            return (
              <div key={i} style={{padding:"12px 14px",borderRadius:10,marginBottom:8,
                background:dest.tipo==="qc"?"rgba(165,214,167,0.06)":"rgba(206,147,216,0.06)",
                border:"2px solid "+(dest.tipo==="qc"?"rgba(165,214,167,0.3)":"rgba(206,147,216,0.3)")}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:regalos.length>0?10:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:20}}>{cat.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:"#1a1f2e"}}>{cat.nombre}</div>
                      <div style={{fontSize:11,color:dest.tipo==="qc"?"#1a7f3c":"#7c3aed"}}>
                        {dest.tipo==="qc"?"⭐ QC":"🔹 NQ"} · {dest.noches} noches
                        {dest.tipo==="nq"&&cat.nq&&cat.nq.label?" · "+cat.nq.label:""}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                      <div style={{fontSize:9,color:"#9ca3af",marginBottom:2}}>Noches</div>
                      <div style={{width:48,textAlign:"center",fontSize:15,fontWeight:700,color:"#1a1f2e"}}>{dest.noches}</div>
                    </div>
                    <button onClick={function(){ removeDest(i); }}
                      style={{background:"#fef2f2",border:"1px solid #f5b8b8",color:"#b91c1c",borderRadius:7,padding:"4px 8px",cursor:"pointer",fontSize:14,fontWeight:700}}>✕</button>
                  </div>
                </div>
                {regalos.length > 0 && (
                  <div>
                    <div style={{fontSize:9,color:"#925c0a",fontWeight:700,textTransform:"uppercase",marginBottom:5}}>🎁 Regalo (elige 1)</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      <div onClick={function(){ setRegalo(i,null); }}
                        style={{padding:"3px 9px",borderRadius:7,cursor:"pointer",fontSize:11,
                          background:!dest.regalo?"#e8f0fe":"#f9fafb",border:"1px solid "+(!dest.regalo?"#aac4f0":"#e3e6ea"),
                          color:!dest.regalo?"#1565c0":"#9ca3af",fontWeight:!dest.regalo?700:400}}>
                        Sin regalo
                      </div>
                      {regalos.map(function(r){
                        var sel = dest.regalo && dest.regalo.id === r.id;
                        return (
                          <div key={r.id} onClick={function(){ setRegalo(i,r); }}
                            style={{padding:"3px 9px",borderRadius:7,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",gap:4,
                              background:sel?"#fef9e7":"#f9fafb",border:"2px solid "+(sel?"rgba(251,191,36,0.5)":"#e3e6ea"),
                              color:sel?"#925c0a":"#9ca3af",fontWeight:sel?700:400}}>
                            {r.icon&&<span>{r.icon}</span>}{r.label}{sel&&<span>✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Agregar destinos — calificados */}
          {catalog.length === 0 && (
            <div style={{padding:"10px 14px",borderRadius:9,background:"#fffbe0",border:"1px solid #f3d88c",fontSize:12,color:"#925c0a",marginTop:8}}>
              ⏳ Cargando catálogo de destinos...
            </div>
          )}
          {destQC.length > 0 && (
            <div style={{marginTop:10,marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,color:"#1a7f3c",textTransform:"uppercase",marginBottom:6}}>⭐ Agregar QC</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {destQC.map(function(dest){
                  return (
                    <button key={dest.id} onClick={function(){ addDest(dest,"qc"); }}
                      style={{padding:"6px 12px",borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",gap:6,
                        background:"rgba(165,214,167,0.07)",border:"2px solid rgba(165,214,167,0.25)",fontSize:12}}>
                      <span>{dest.icon}</span>
                      <span style={{fontWeight:600,color:"#1a1f2e"}}>{dest.nombre}</span>
                      <span style={{fontSize:10,color:"#1a7f3c"}}>{dest.qc.noches}n</span>
                      <span style={{fontSize:11,color:"#a5d6a7"}}>+</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {destNQ.length > 0 && (
            <div style={{marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,color:"#7c3aed",textTransform:"uppercase",marginBottom:6}}>🔹 Agregar NQ</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {destNQ.map(function(dest){
                  return (
                    <button key={dest.id} onClick={function(){ addDest(dest,"nq"); }}
                      style={{padding:"6px 12px",borderRadius:9,cursor:"pointer",display:"flex",alignItems:"center",gap:6,
                        background:"rgba(206,147,216,0.07)",border:"2px solid rgba(206,147,216,0.25)",fontSize:12}}>
                      <span>{dest.icon}</span>
                      <span style={{fontWeight:600,color:"#1a1f2e"}}>{dest.nombre}</span>
                      <span style={{fontSize:10,color:"#7c3aed"}}>{dest.nq.noches}n · {dest.nq.label}</span>
                      <span style={{fontSize:11,color:"#ce93d8"}}>+</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MONTOS */}
        <div style={{marginBottom:16}}>
          <div style={S.sTitle}>Montos (USD)</div>
          <div style={S.g3}>
            <div><div style={S.label}>Precio Total</div><input style={S.input} type="number" value={d.salePrice||""} onChange={function(e){ set("salePrice",Number(e.target.value)); }} /></div>
            <div><div style={S.label}>Pago hoy</div><input style={{...S.input,borderColor:"rgba(129,140,248,0.4)"}} type="number" value={d.pagoInicial||""} onChange={function(e){ set("pagoInicial",Number(e.target.value)); }} /></div>
            <div><div style={S.label}>Saldo</div><div style={{fontSize:15,fontWeight:800,color:"#925c0a",padding:"9px 0"}}>{fmtUSD(saldo)}</div></div>
          </div>
        </div>

        <div style={{marginBottom:20}}>
          <div style={S.label}>Notas del paquete</div>
          <textarea style={{...S.textarea,marginTop:5}} value={d.notas||""} onChange={function(e){ set("notas",e.target.value); }} placeholder="Notas, condiciones especiales..." />
        </div>

        <div style={{display:"flex",gap:10}}>
          <button style={{...S.btn("ghost"),flex:1}} g onClick={onClose}>Cerrar</button>
          <button style={{...S.btn("success"),flex:2,justifyContent:"center"}} onClick={function(){ onSave(d); }}>Guardar cambios</button>
        </div>
      </div>
    </div>
  );
}

function ChargeModal({ lead, onClose, onResult }) {
  const [phase,  setPhase]  = useState("confirm");
  const [result, setResult] = useState(null);
  const exp = lead.exp;

  const doCharge = (forceResult) => {
    setPhase("processing");
    setTimeout(() => {
      const r = forceResult || (Math.random() > 0.25 ? "approved" : "rejected");
      setResult(r);
      setPhase("result");
    }, 2200);
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, maxWidth:"420px" }} onClick={e => e.stopPropagation()}>
        {phase === "confirm" && (
          <div>
            <div style={{ fontSize:"18px", fontWeight:"700", color:"#1a1f2e", marginBottom:"4px" }}>Confirmar Cobro</div>
            <div style={{ fontSize:"13px", color:"#9ca3af", marginBottom:"18px" }}>Se procesara el pago del cliente</div>
            <div style={{ padding:"16px", borderRadius:"12px", background:"rgba(21,101,192,0.06)", border:"1px solid rgba(21,101,192,0.2)", marginBottom:"18px" }}>
              {[["Cliente", exp.tarjetaNombre||exp.tFirstName+" "+exp.tLastName], ["Tarjeta", maskCard(exp.tarjetaNumero)], ["Tipo", exp.tarjetaTipo||"transferencia"]].map(([l,v]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
                  <span style={{ fontSize:"13px", color:"#9ca3af" }}>{l}</span>
                  <span style={{ fontSize:"13px", fontWeight:"600", color:"#3d4554" }}>{v}</span>
                </div>
              ))}
              <div style={S.divider} />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:"14px", color:"#6b7280", fontWeight:"600" }}>Monto a cobrar</span>
                <span style={{ fontSize:"22px", fontWeight:"800", color:"#1a7f3c" }}>{fmtUSD(exp.pagoInicial)}</span>
              </div>
            </div>
            <div style={{ display:"flex", gap:"10px" }}>
              <button style={{ ...S.btn("ghost"), flex:1 }} g onClick={onClose}>Cerrar</button>
              <button style={{ ...S.btn("success"), flex:2, justifyContent:"center" }} onClick={() => doCharge(null)}>Procesar Cobro</button>
            </div>
            <div style={{ textAlign:"center", marginTop:"10px" }}>
              <button style={{ background:"none", border:"none", color:"#9ca3af", fontSize:"11px", cursor:"pointer" }} onClick={() => doCharge("rejected")}>Simular rechazo</button>
            </div>
          </div>
        )}
        {phase === "processing" && (
          <div style={{ textAlign:"center", padding:"32px 0" }}>
            <div style={{ fontSize:"44px", marginBottom:"14px" }}>...</div>
            <div style={{ fontSize:"16px", fontWeight:"600", color:"#1a1f2e" }}>Procesando pago...</div>
            <div style={{ fontSize:"13px", color:"#9ca3af", marginTop:"6px" }}>Conectando con gateway de pagos</div>
          </div>
        )}
        {phase === "result" && (
          <div>
            <div style={{ textAlign:"center", marginBottom:"22px" }}>
              <div style={{ fontSize:"52px", marginBottom:"12px" }}>{result === "approved" ? "OK" : "X"}</div>
              <div style={{ fontSize:"20px", fontWeight:"700", color:result === "approved" ? "#1a7f3c" : "#b91c1c" }}>
                {result === "approved" ? "Pago Aprobado" : "Tarjeta Rechazada"}
              </div>
              <div style={{ fontSize:"13px", color:"#9ca3af", marginTop:"5px" }}>
                {result === "approved" ? fmtUSD(exp.pagoInicial) + " procesados correctamente" : "El banco rechazo la transaccion"}
              </div>
            </div>
            <button style={{ ...S.btn(result === "approved" ? "success" : "danger"), width:"100%", justifyContent:"center" }} onClick={() => onResult(result)}>
              {result === "approved" ? "Continuar - Enviar documentos" : "Registrar resultado"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SendDocsModal({ lead, onClose, onSent }) {
  const [phase,    setPhase]    = useState("ready");
  const [error,    setError]    = useState("");
  const [link,     setLink]     = useState("");
  const [waSent,   setWaSent]   = useState(false);
  const [mailSent, setMailSent] = useState(false);
  const exp  = lead.exp;
  const SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
  const EDGE_RESEND = "https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/resend-email";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";
  const HDR  = { "Content-Type":"application/json", "Authorization":"Bearer "+SB_KEY };
  const nombre = (exp.tFirstName||"") + " " + (exp.tLastName||"");
  const phone  = (exp.tPhone||"").replace(/\D/g,"");
  const email  = exp.tEmail||"";

  const doSend = async () => {
    setPhase("generating"); setError("");
    try {
      // 1. Generar link de firma
      var res = await fetch(SB_URL + "/functions/v1/zoho-payments/generar-link", {
        method:"POST", headers:HDR,
        body: JSON.stringify({ lead_id: lead.id })
      });
      if (!res.ok) { throw new Error("HTTP " + res.status + " — " + await res.text()); }
      var data = await res.json();
      if (!data.link) throw new Error(data.error || "No se pudo generar el link");
      var firmaLink = data.link;
      setLink(firmaLink);

      // 2. Mensaje WhatsApp
      var waMsg = "Hola " + nombre.trim() + "! Te enviamos tu Travel Certificate de X Travel Group para firma digital. Por favor haz clic en el siguiente link para revisar y firmar tu certificado: " + firmaLink + " Gracias por tu compra! Para dudas: 1.800.430.4640";
      var waNum = phone.startsWith("1") ? phone : "1" + phone;
      var waUrl = "https://api.whatsapp.com/send?phone=" + waNum + "&text=" + encodeURIComponent(waMsg);

      // 3. Enviar email via Resend
      var emailHtml = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>"
        + "<table width='100%' cellpadding='0' cellspacing='0' bgcolor='#1a385a' style='background:#1a385a;border-radius:12px 12px 0 0'><tr><td align='center' style='padding:24px;background:#1a385a'>"
        + "<h1 style='color:#ffffff;margin:0;font-size:22px;font-family:Arial,sans-serif'>TRAVEL<span style='color:#8aacca'>X</span> GROUP</h1>"
        + "<p style='color:rgba(255,255,255,0.6);font-size:12px;margin:4px 0 0'>Travel Certificate</p>"
        + "</td></tr></table>"
        + "<div style='background:#fff;border:1px solid #e0e0e0;padding:28px'>"
        + "<p style='font-size:15px'>Hola <strong>" + nombre.trim() + "</strong>,</p>"
        + "<p style='font-size:14px;color:#444'>Te enviamos tu Travel Certificate de X Travel Group para firma digital. Por favor haz clic en el botón para revisar y firmar tu certificado.</p>"
        + "<div style='text-align:center;margin:24px 0'><a href='" + firmaLink + "' style='background:#1a385a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px'>✍️ Firmar mi certificado</a></div>"
        + "<p style='font-size:12px;color:#888'>Este link es personal e intransferible. Si tienes dudas llámanos al 1 (800) 927-1490.</p>"
        + "</div>"
        + "<div style='background:#0f2340;padding:14px;text-align:center;border-radius:0 0 12px 12px'><div style='font-size:11px;color:#475569'>© 2025 X Travel Group · members@xtravelgroup.com</div></div>"
        + "</div>";

      fetch(EDGE_RESEND + "/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + ANON_KEY },
        body: JSON.stringify({
          to_email: email,
          to_name: nombre.trim(),
          subject: "Tu Travel Certificate - X Travel Group",
          body_html: emailHtml,
          lead_id: lead.id
        })
      }).then(function(){ setMailSent(true); }).catch(function(){});

      setPhase("ready_to_send");

      // Guardar link generado en Supabase
      await fetch(SB_URL + "/rest/v1/leads?id=eq." + lead.id, {
        method:"PATCH", headers:{ ...HDR, "apikey": SB_KEY, "Prefer":"return=minimal" },
        body: JSON.stringify({ firma_token: data.token, firma_enviada_at: new Date().toISOString() })
      });

      // Auto-abrir WhatsApp
      setTimeout(function() { window.open(waUrl, "_blank"); setWaSent(true); }, 400);

    } catch(e) {
      setError(e.message || "Error al generar el link");
      setPhase("ready");
    }
  };

  const openWA = () => {
    var waMsg = "Hola " + nombre.trim() + "! Te enviamos tu Travel Certificate de X Travel Group para firma digital. Haz clic aqui para revisar y firmar: " + link + " Dudas: 1.800.430.4640";
    var waNum = phone.startsWith("1") ? phone : "1" + phone;
    window.open("https://api.whatsapp.com/send?phone=" + waNum + "&text=" + encodeURIComponent(waMsg), "_blank");
    setWaSent(true);
  };

  const openMail = () => {
    var emailSubj = "Tu Travel Certificate - X Travel Group";
    var emailBody = "Hola " + nombre.trim() + ",\n\nTe enviamos tu Travel Certificate de X Travel Group para firma digital.\n\nHaz clic en el siguiente link para revisar y firmar:\n" + link + "\n\nPara dudas: 1.800.430.4640\n\nGracias,\nX Travel Group Inc";
    window.open("mailto:" + email + "?subject=" + encodeURIComponent(emailSubj) + "&body=" + encodeURIComponent(emailBody), "_blank");
    setMailSent(true);
  };

  const copyLink = () => { navigator.clipboard.writeText(link).catch(function(){}); };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, maxWidth:"460px" }} onClick={e => e.stopPropagation()}>

        <div style={{ fontSize:"18px", fontWeight:"700", color:"#1a1f2e", marginBottom:"4px" }}>Enviar Travel Certificate</div>
        <div style={{ fontSize:"13px", color:"#9ca3af", marginBottom:"18px" }}>Se generara un link unico de firma para este cliente</div>

        {/* Cliente info */}
        <div style={{ padding:"12px 14px", borderRadius:"10px", background:"#f9fafb", border:"1px solid #e3e6ea", marginBottom:"14px" }}>
          <div style={{ fontSize:"12px", fontWeight:"600", color:"#374151", marginBottom:"8px" }}>Datos del cliente</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
            <span style={{ fontSize:"12px", fontWeight:"600", color:"#1a1f2e" }}>{nombre.trim()}</span>
            <span style={S.badge("#25d366","rgba(37,211,102,0.08)","rgba(37,211,102,0.25)")}>WA {exp.tPhone||"sin telefono"}</span>
            <span style={S.badge("#1565c0","rgba(96,165,250,0.08)","#b5cdf2")}>{email||"sin email"}</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding:"10px 14px", borderRadius:"8px", background:"rgba(185,28,28,0.07)", border:"1px solid #fca5a5", color:"#b91c1c", fontSize:"12px", marginBottom:"14px" }}>
            {error}
          </div>
        )}

        {/* FASE: ready */}
        {phase === "ready" && (
          <button style={{ ...S.btn("primary"), width:"100%", justifyContent:"center" }} onClick={doSend}>
            Generar link y enviar por WhatsApp + Email
          </button>
        )}

        {/* FASE: generating */}
        {phase === "generating" && (
          <div style={{ textAlign:"center", padding:"20px", color:"#6b7280", fontSize:"13px" }}>
            <div style={{ marginBottom:"8px" }}>Generando link seguro...</div>
            <div style={{ width:"28px", height:"28px", border:"2px solid #e3e6ea", borderTopColor:"#1a2e4a", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto" }}></div>
          </div>
        )}

        {/* FASE: ready_to_send - link generado, mostrar botones */}
        {phase === "ready_to_send" && (
          <div>
            {/* Link preview */}
            <div style={{ padding:"10px 14px", borderRadius:"8px", background:"#f0f9ff", border:"1px solid #bae6fd", marginBottom:"14px", display:"flex", alignItems:"center", gap:"10px" }}>
              <div style={{ flex:1, fontSize:"11px", color:"#0369a1", wordBreak:"break-all", fontFamily:"monospace" }}>{link}</div>
              <button onClick={copyLink} style={{ flexShrink:0, fontSize:"11px", padding:"4px 10px", borderRadius:"5px", border:"1px solid #bae6fd", background:"#fff", color:"#0369a1", cursor:"pointer", fontFamily:"inherit" }}>Copiar</button>
            </div>

            {/* WhatsApp */}
            <div style={{ padding:"14px", borderRadius:"10px", background:"#fff", border:"1px solid " + (waSent ? "rgba(37,211,102,0.4)" : "#e3e6ea"), marginBottom:"10px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px" }}>
              <div>
                <div style={{ fontSize:"13px", fontWeight:"600", color:"#1a1f2e" }}>WhatsApp</div>
                <div style={{ fontSize:"12px", color:"#9ca3af" }}>{exp.tPhone||"sin telefono"}</div>
              </div>
              {waSent
                ? <span style={{ fontSize:"12px", fontWeight:"600", color:"#1a7f3c" }}>Enviado</span>
                : <button onClick={openWA} style={{ ...S.btn("success"), fontSize:"12px", padding:"7px 14px" }}>Abrir WhatsApp</button>
              }
            </div>

            {/* Email */}
            <div style={{ padding:"14px", borderRadius:"10px", background:"#fff", border:"1px solid " + (mailSent ? "rgba(21,101,192,0.3)" : "#e3e6ea"), marginBottom:"14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px" }}>
              <div>
                <div style={{ fontSize:"13px", fontWeight:"600", color:"#1a1f2e" }}>Email</div>
                <div style={{ fontSize:"12px", color:"#9ca3af" }}>{email||"sin email"}</div>
              </div>
              {mailSent
                ? <span style={{ fontSize:"12px", fontWeight:"600", color:"#1565c0" }}>Enviado</span>
                : <button onClick={openMail} style={{ ...S.btn("primary"), fontSize:"12px", padding:"7px 14px" }}>Abrir Email</button>
              }
            </div>

            {/* Confirmar */}
            <button
              style={{ ...S.btn("success"), width:"100%", justifyContent:"center" }}
              onClick={onSent}
            >
              Confirmar - Documentos enviados al cliente
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function FinishModal({ defaultResult, onClose, onFinish }) {
  const [result, setResult] = useState(defaultResult||"");
  const [notes,  setNotes]  = useState("");
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:"18px", fontWeight:"700", color:"#1a1f2e", marginBottom:"18px" }}>Resultado de Verificacion</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"18px" }}>
          {Object.entries(VERIF_RESULTS).map(([key,cfg]) => (
            <div key={key} onClick={() => setResult(key)} style={{ padding:"14px", borderRadius:"12px", cursor:"pointer", border:"2px solid " + (result===key ? cfg.color : "#e3e6ea"), background:result===key ? cfg.bg : "transparent", transition:"all 0.18s" }}>
              <div style={{ fontSize:"13px", fontWeight:"600", color:result===key ? cfg.color : "#9ca3af" }}>{cfg.label}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom:"16px" }}>
          <div style={S.label}>Notas / observaciones</div>
          <textarea style={{ ...S.textarea, marginTop:"5px" }} placeholder="Motivo, acuerdos, comentarios..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div style={{ display:"flex", gap:"10px" }}>
          <button style={{ ...S.btn("ghost"), flex:1 }} g onClick={onClose}>Cerrar</button>
          <button disabled={!result}
            style={{ ...S.btn(result==="venta" ? "success" : (result==="tarjeta_rechazada"||result==="cliente_no_interesado") ? "danger" : "warning"), flex:2, justifyContent:"center", opacity:!result?0.4:1 }}
            onClick={() => onFinish(result,notes)}>
            Guardar Resultado
          </button>
        </div>
      </div>
    </div>
  );
}

function UpsalePanel({ exp, onSave }) {
  const [open,      setOpen]      = useState(false);
  const [upTab,     setUpTab]     = useState("destino");
  const [destId,    setDestId]    = useState("");
  const [destTipo,  setDestTipo]  = useState("qc");
  const [destNoches,setDestNoches]= useState(5);
  const [destPrecio,setDestPrecio]= useState("");
  const [selBenef,  setSelBenef]  = useState([]);
  const [precioOvr, setPrecioOvr] = useState({});

  const destCat  = DEST_MAP[destId];
  const existIds = (exp.destinos||[]).map(d => d.destId);
  const totalBenef = selBenef.reduce((s,id) => {
    const p = precioOvr[id] !== undefined ? Number(precioOvr[id]) : (BENEFICIOS_CATALOGO.find(b => b.id===id)||{}).precio||0;
    return s + p;
  }, 0);

  const handleAddDestino = () => {
    if (!destId || !destPrecio) return;
    const newDestinos = [...(exp.destinos||[]), { destId, tipo:destTipo, noches:destNoches, regalo:null }];
    const montoUp = Number(destPrecio);
    onSave({ ...exp, destinos:newDestinos, salePrice:(exp.salePrice||0)+montoUp, upsaleMonto:(exp.upsaleMonto||0)+montoUp });
    setDestId(""); setDestPrecio(""); setOpen(false);
  };

  const handleAddBeneficios = () => {
    if (!selBenef.length) return;
    onSave({ ...exp, salePrice:(exp.salePrice||0)+totalBenef, upsaleMonto:(exp.upsaleMonto||0)+totalBenef });
    setSelBenef([]); setPrecioOvr({}); setOpen(false);
  };

  const toggleBenef = (id) => setSelBenef(p => p.includes(id) ? p.filter(x => x!==id) : [...p,id]);

  return (
    <div style={{ background:"#f9fafb", border:"1px solid #e3e6ea", borderRadius:"12px", padding:"14px 16px", marginBottom:"16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:"13px", fontWeight:"700", color:"#1a1f2e" }}>Upsale en verificacion</div>
        <button onClick={() => setOpen(o => !o)} style={{ padding:"6px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:"600", background:open?"#e5eafd":"#f6f7f9", color:open?"#1565c0":"#6b7280", border:"1px solid " + (open?"#aab4f5":"#eceff3") }}>
          {open ? "Cerrar" : "+ Agregar"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop:"14px" }}>
          <div style={{ display:"flex", gap:"5px", marginBottom:"14px" }}>
            {[["destino","Destino adicional"],["beneficios","Beneficios extra"]].map(([k,l]) => (
              <button key={k} onClick={() => setUpTab(k)} style={{ padding:"6px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:upTab===k?"700":"400", background:upTab===k?"#e5eafd":"transparent", color:upTab===k?"#1565c0":"#9ca3af", border:upTab===k?"1px solid rgba(21,101,192,0.3)":"1px solid transparent" }}>{l}</button>
            ))}
          </div>

          {upTab === "destino" && (
            <div>
              <div style={{ ...S.g2, marginBottom:"10px" }}>
                <div>
                  <div style={S.label}>Destino</div>
                  <select style={S.select} value={destId} onChange={e => { setDestId(e.target.value); const dc = DEST_MAP[e.target.value]; if (dc) { setDestNoches(dc.qc.noches); setDestTipo("qc"); } }}>
                    <option value="">-- Seleccionar --</option>
                    {DESTINOS_CATALOG.filter(dc => !existIds.includes(dc.id)).map(dc => <option key={dc.id} value={dc.id}>{dc.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <div style={S.label}>Tipo</div>
                  <div style={{ display:"flex", gap:"6px" }}>
                    <button onClick={() => { setDestTipo("qc"); if (destCat) setDestNoches(destCat.qc.noches); }} style={{ flex:1, padding:"8px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:"600", background:destTipo==="qc"?"#e5eafd":"#f9fafb", color:destTipo==="qc"?"#1565c0":"#9ca3af", border:"1px solid " + (destTipo==="qc"?"#aab4f5":"#e3e6ea") }}>QC</button>
                    <button onClick={() => { if (destCat && destCat.nq.enabled) { setDestTipo("nq"); setDestNoches(destCat.nq.noches); } }} style={{ flex:1, padding:"8px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:"600", background:destTipo==="nq"?"#e5f3e8":"#f9fafb", color:destTipo==="nq"?"#1a7f3c":"#9ca3af", border:"1px solid " + (destTipo==="nq"?"#a3d9a5":"#e3e6ea"), opacity:destCat && !destCat.nq.enabled ? 0.3 : 1 }}>NQ</button>
                  </div>
                </div>
              </div>
              <div style={{ ...S.g2, marginBottom:"12px" }}>
                <div>
                  <div style={S.label}>Noches</div>
                  <div style={{ display:"flex", gap:"5px" }}>
                    {[3,4,5,6,7].map(n => <button key={n} onClick={() => setDestNoches(n)} style={{ flex:1, padding:"7px", borderRadius:"7px", cursor:"pointer", fontSize:"12px", fontWeight:"600", background:destNoches===n?"#e5eafd":"#f9fafb", color:destNoches===n?"#1565c0":"#9ca3af", border:"1px solid " + (destNoches===n?"#aab4f5":"#e3e6ea") }}>{n}</button>)}
                  </div>
                </div>
                <div>
                  <div style={S.label}>Precio adicional (USD)</div>
                  <input type="number" value={destPrecio} onChange={e => setDestPrecio(e.target.value)} placeholder="Ej: 800" min="0" style={S.input} />
                </div>
              </div>
              <button disabled={!destId||!destPrecio} onClick={handleAddDestino} style={{ width:"100%", padding:"9px", borderRadius:"9px", cursor:"pointer", fontSize:"13px", fontWeight:"700", background:"#e5eafd", color:"#1565c0", border:"1px solid rgba(21,101,192,0.25)", opacity:destId&&destPrecio?1:0.4 }}>
                Agregar destino al paquete
              </button>
            </div>
          )}

          {upTab === "beneficios" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px", marginBottom:"12px" }}>
                {BENEFICIOS_CATALOGO.map(b => {
                  const sel = selBenef.includes(b.id);
                  const precio = precioOvr[b.id] !== undefined ? precioOvr[b.id] : b.precio;
                  return (
                    <div key={b.id} style={{ borderRadius:"9px", border:"2px solid " + (sel?"rgba(21,101,192,0.4)":"#e3e6ea"), background:sel?"rgba(21,101,192,0.06)":"#ffffff", overflow:"hidden" }}>
                      <div onClick={() => toggleBenef(b.id)} style={{ padding:"9px 11px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:"12px", fontWeight:"600", color:sel?"#1565c0":"#6b7280" }}>{b.label}</span>
                        <span style={{ fontSize:"11px", color:sel?"#1565c0":"#9ca3af", fontWeight:"700" }}>${precio}</span>
                      </div>
                      {sel && (
                        <div style={{ padding:"0 10px 9px", borderTop:"1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ fontSize:"10px", color:"#9ca3af", marginBottom:"3px", marginTop:"6px" }}>Precio editable</div>
                          <input type="number" value={precio} onChange={e => setPrecioOvr(p => ({ ...p, [b.id]:e.target.value }))} min="0" style={{ width:"100%", background:"#ffffff", border:"1px solid rgba(21,101,192,0.25)", borderRadius:"6px", padding:"5px 9px", color:"#3d4554", fontSize:"12px", outline:"none", boxSizing:"border-box" }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {selBenef.length > 0 && (
                <div style={{ padding:"10px 14px", borderRadius:"9px", background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.25)", marginBottom:"10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:"12px", color:"#1a7f3c" }}>{selBenef.length} beneficio(s) seleccionado(s)</span>
                  <span style={{ fontSize:"14px", fontWeight:"800", color:"#1a7f3c" }}>+${totalBenef}</span>
                </div>
              )}
              <button disabled={!selBenef.length} onClick={handleAddBeneficios} style={{ width:"100%", padding:"9px", borderRadius:"9px", cursor:"pointer", fontSize:"13px", fontWeight:"700", background:"#eaf5ec", color:"#1a7f3c", border:"1px solid rgba(74,222,128,0.3)", opacity:selBenef.length?1:0.4 }}>
                Agregar beneficios al paquete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionPersonal({ exp }) {
  return (
    <div style={S.card}>
      <div style={S.sTitle}>Titular</div>
      <div style={S.g2}>
        <div><div style={S.label}>Nombre completo</div><div style={S.value}>{exp.tFirstName} {exp.tLastName}</div></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
          <div><div style={S.label}>Sexo</div><div style={S.value}>{exp.tSexo||"--"}</div></div>
          <div><div style={S.label}>Estado civil</div><div style={S.value}>{exp.tEstadoCivil||"--"}</div></div>
        </div>
        <div>
          <div style={S.label}>Fecha de nacimiento</div>
          <div style={S.value}>{exp.tFechaNac ? fmtDate(exp.tFechaNac) : "--"}</div>
          {exp.tFechaNac && <div style={{ fontSize:"11px", color:"#1a7f3c", fontWeight:"600", marginTop:"2px" }}>{edadLabel(exp.tFechaNac)}</div>}
        </div>
        <div><div style={S.label}>Telefono</div><div style={S.value}>{exp.tPhone}</div></div>
        <div><div style={S.label}>Email</div><div style={S.value}>{exp.tEmail||"--"}</div></div>
        <div style={{ gridColumn:"1/-1" }}><div style={S.label}>Direccion</div><div style={S.value}>{exp.address}, {exp.city}, {exp.state} {exp.zip}</div></div>
      </div>
      {exp.hasPartner && (
        <div>
          <div style={S.divider} />
          <div style={S.sTitle}>Co-propietario</div>
          <div style={S.g2}>
            <div><div style={S.label}>Nombre</div><div style={S.value}>{exp.pFirstName} {exp.pLastName}</div></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
              <div><div style={S.label}>Sexo</div><div style={S.value}>{exp.pSexo||"--"}</div></div>
              <div>
                <div style={S.label}>Fecha nac.</div>
                <div style={S.value}>{exp.pFechaNac ? fmtDate(exp.pFechaNac) : "--"}</div>
                {exp.pFechaNac && <div style={{ fontSize:"11px", color:"#1a7f3c", fontWeight:"600", marginTop:"2px" }}>{edadLabel(exp.pFechaNac)}</div>}
              </div>
            </div>
            {exp.pPhone && <div><div style={S.label}>Telefono</div><div style={S.value}>{exp.pPhone}</div></div>}
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// SECTION PAGOS — aplica abonos al saldo del lead
// ─────────────────────────────────────────────────────────────
function SectionPagos({ lead, exp, onAbonoGuardado }) {
  var zohoReady     = typeof window !== "undefined" && !!window.ZPayments;
  var [zohoLoaded,  setZohoLoaded]  = useState(false);
  var [zohoError,   setZohoError]   = useState("");
  var [cobrando,    setCobrando]    = useState(false);
  var [usarOtraTarjeta, setUsarOtraTarjeta] = useState(false);
  var [autorizado,      setAutorizado]      = useState(false);

  // Cargar SDK Zoho al montar
  useEffect(function() {
    if (window.ZPayments) { setZohoLoaded(true); return; }
    var s = document.createElement("script");
    s.src = "https://static.zohocdn.com/zpay/zpay-js/v1/zpayments.js";
    s.onload = function() { setZohoLoaded(true); };
    s.onerror = function() { setZohoError("No se pudo cargar SDK de Zoho"); };
    document.head.appendChild(s);
  }, []);
  var totalPagado = (exp.pagosHistorial||[]).reduce(function(s,p){ return s+(Number(p.monto)||0); },0);
  var saldo       = Math.max(0, (exp.salePrice||0) - totalPagado);

  var [monto,   setMonto]   = useState("");
  var [metodo,  setMetodo]  = useState("tarjeta");
  var [ref,     setRef]     = useState("");
  var [concepto,setConcepto]= useState("Abono");
  var [otroDesc,setOtroDesc]= useState("");
  var [saving,  setSaving]  = useState(false);
  var [numCuotas,   setNumCuotas]   = useState("");
  var [planPagos,   setPlanPagos]   = useState([]);
  var [err,     setErr]     = useState("");

  function aplicarAbono() {
    var m = Number(monto);
    if (!m || m <= 0)       { setErr("Ingresa un monto válido"); return; }
    if (m > saldo + 0.01)   { setErr("El abono supera el saldo pendiente de " + fmtUSD(saldo)); return; }
    setErr(""); setSaving(true);
    var nuevo = {
      id:       "P" + Date.now(),
      monto:    m,
      metodo:   metodo === "otro" ? ("otro: " + (otroDesc||"sin descripción")) : metodo,
      referencia: ref || "—",
      concepto: concepto || "Abono",
      fecha:    new Date().toISOString(),
      por:      "Verificador",
    };
    var nuevosAbonos = (exp.pagosHistorial||[]).concat([nuevo]);
    SB.from("leads")
      .update({ pagos_historial: nuevosAbonos })
      .eq("id", lead.id)
      .then(function(res) {
        setSaving(false);
        if (res.error) { setErr("Error al guardar: " + res.error.message); return; }
        setMonto(""); setRef(""); setConcepto("Abono"); setOtroDesc("");
        if (onAbonoGuardado) onAbonoGuardado(nuevosAbonos);
      });
  }

  var METODOS = ["tarjeta","transferencia","efectivo","cheque","otro"];

  return (
    <div style={S.card}>
      <div style={S.sTitle}>💰 Balance y Pagos</div>

      {/* Resumen de balance */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        <div style={{background:"#f4f5f7",borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
          <div style={{fontSize:9,color:"#9ca3af",textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Precio total</div>
          <div style={{fontSize:16,fontWeight:800,color:"#1a1f2e"}}>{fmtUSD(exp.salePrice||0)}</div>
        </div>
        <div style={{background:"rgba(74,222,128,0.07)",borderRadius:10,padding:"10px 14px",textAlign:"center",border:"1px solid rgba(74,222,128,0.2)"}}>
          <div style={{fontSize:9,color:"#1a7f3c",textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Total pagado</div>
          <div style={{fontSize:16,fontWeight:800,color:"#1a7f3c"}}>{fmtUSD(totalPagado)}</div>
        </div>
        <div style={{background:saldo<=0?"rgba(74,222,128,0.07)":"rgba(251,191,36,0.07)",borderRadius:10,padding:"10px 14px",textAlign:"center",border:"1px solid "+(saldo<=0?"rgba(74,222,128,0.2)":"rgba(251,191,36,0.3)")}}>
          <div style={{fontSize:9,color:saldo<=0?"#1a7f3c":"#925c0a",textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Saldo</div>
          <div style={{fontSize:16,fontWeight:800,color:saldo<=0?"#1a7f3c":"#925c0a"}}>{saldo<=0?"✅ Liquidado":fmtUSD(saldo)}</div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div style={{height:6,background:"#f0f1f4",borderRadius:4,overflow:"hidden",marginBottom:16}}>
        <div style={{height:"100%",width:Math.min(100,Math.round(totalPagado/((exp.salePrice||1))*100))+"%",background:saldo<=0?"#22c55e":"#1565c0",borderRadius:4,transition:"width 0.4s"}} />
      </div>

      {/* Historial de pagos */}
      {((exp.pagosHistorial||[]).length > 0 || exp.pagoInicial > 0) && (
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",marginBottom:8}}>Historial de pagos</div>
          {exp.pagoInicial > 0 && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f0f1f4"}}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:"#3d4554"}}>Pago inicial (venta)</div>
                <div style={{fontSize:10,color:"#9ca3af"}}>Vendedor · tarjeta</div>
              </div>
              <span style={{fontSize:13,fontWeight:700,color:"#1a7f3c"}}>{fmtUSD(exp.pagoInicial)}</span>
            </div>
          )}
          {(exp.pagosHistorial||[]).map(function(p){
            return (
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f0f1f4"}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:"#3d4554"}}>{p.concepto}</div>
                  <div style={{fontSize:10,color:"#9ca3af"}}>{p.por} · {p.metodo} · Ref: {p.referencia} · {p.fecha ? new Date(p.fecha).toLocaleDateString("es-MX") : "--"}</div>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:"#1a7f3c"}}>{fmtUSD(p.monto)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan de pagos — solo si hay saldo */}
      {saldo > 0 && (
        <div style={{background:"#f0f4ff",borderRadius:10,padding:"14px",border:"1px solid #c7d7f7",marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"#1565c0",marginBottom:10}}>📅 Plan de pagos</div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{flex:1}}>
              <div style={S.label}>Número de cuotas</div>
              <input style={{...S.input,maxWidth:120}} type="number" min="1" max="24" placeholder="Ej: 3"
                value={numCuotas}
                onChange={function(e){
                  var n = parseInt(e.target.value)||0;
                  setNumCuotas(e.target.value);
                  if(n>0){
                    var montoCuota = Math.ceil(saldo/n);
                    var hoy = new Date();
                    var cuotas = [];
                    for(var i=0;i<n;i++){
                      var fecha = new Date(hoy);
                      fecha.setMonth(fecha.getMonth()+i+1);
                      cuotas.push({
                        num: i+1,
                        fecha: fecha.toISOString().split("T")[0],
                        monto: i===n-1 ? saldo-(montoCuota*(n-1)) : montoCuota
                      });
                    }
                    setPlanPagos(cuotas);
                  } else {
                    setPlanPagos([]);
                  }
                }}
              />
            </div>
            {planPagos.length>0 && (
              <div style={{fontSize:11,color:"#1565c0",fontWeight:600,alignSelf:"flex-end",paddingBottom:4}}>
                Saldo: {fmtUSD(saldo)} / {planPagos.length} cuotas
              </div>
            )}
          </div>
          {planPagos.length>0 && (
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {planPagos.map(function(c,i){
                return (
                  <div key={i} style={{display:"grid",gridTemplateColumns:"40px 1fr 1fr",gap:8,alignItems:"center"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textAlign:"center"}}>#{c.num}</div>
                    <div>
                      <div style={S.label}>Fecha</div>
                      <input style={S.input} type="date" value={c.fecha}
                        onChange={function(e){
                          var updated = planPagos.map(function(x,j){ return j===i?Object.assign({},x,{fecha:e.target.value}):x; });
                          setPlanPagos(updated);
                        }}
                      />
                    </div>
                    <div>
                      <div style={S.label}>Monto (USD)</div>
                      <input style={S.input} type="number" value={c.monto}
                        onChange={function(e){
                          var updated = planPagos.map(function(x,j){ return j===i?Object.assign({},x,{monto:Number(e.target.value)||0}):x; });
                          setPlanPagos(updated);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Formulario de abono — solo si hay saldo */}
      {saldo > 0 && (
        <div style={{background:"#f9fafb",borderRadius:10,padding:"14px",border:"1px solid #e3e6ea"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#1565c0",marginBottom:12}}>➕ Aplicar abono</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={S.label}>Monto (USD)</div>
              <input style={{...S.input,fontWeight:700}} type="number" min="1" max={saldo}
                placeholder={"Máx "+fmtUSD(saldo)} value={monto}
                onChange={function(e){ setMonto(e.target.value); setErr(""); }} />
            </div>
            <div>
              <div style={S.label}>Método</div>
              <select style={S.select} value={metodo} onChange={function(e){ setMetodo(e.target.value); setErr(""); setUsarOtraTarjeta(false); setAutorizado(false); }}>
                {METODOS.map(function(m){ return <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>; })}
              </select>
            </div>
            {metodo !== "tarjeta" && (
              <div>
                <div style={S.label}>Concepto</div>
                <input style={S.input} value={concepto} onChange={function(e){ setConcepto(e.target.value); }} placeholder="Abono, 2do pago..." />
              </div>
            )}
            {metodo !== "tarjeta" && (
              <div>
                <div style={S.label}>Referencia / No. transacción</div>
                <input style={S.input} value={ref} onChange={function(e){ setRef(e.target.value); }} placeholder="TXN-12345 / SPEI-..." />
              </div>
            )}
            {metodo === "otro" && (
              <div style={{gridColumn:"1/-1"}}>
                <div style={S.label}>Descripción del método</div>
                <input style={S.input} value={otroDesc} onChange={function(e){ setOtroDesc(e.target.value); }} placeholder="Ej: Pago en oficina, giro bancario..." />
              </div>
            )}
          </div>

          {/* INFO TARJETA GUARDADA */}
          {metodo === "tarjeta" && exp.zohoPaymentMethodId && !usarOtraTarjeta && (
            <div style={{padding:"10px 12px",borderRadius:8,background:"#e8f0fe",border:"1px solid #aac4f0",marginBottom:10,display:"flex",gap:10,alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <div style={{fontSize:20}}>💳</div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#1565c0"}}>{exp.tarjetaBrand||"Tarjeta"} **** {exp.tarjetaLast4||"guardada"}</div>
                  <div style={{fontSize:11,color:"#6b7280"}}>Tarjeta guardada · {exp.tFirstName} {exp.tLastName}</div>
                </div>
              </div>
              <button style={{fontSize:11,color:"#6b7280",background:"none",border:"1px solid #e3e6ea",borderRadius:6,padding:"3px 8px",cursor:"pointer"}}
                onClick={function(){ setUsarOtraTarjeta(true); }}>
                Usar otra
              </button>
            </div>
          )}

          {/* USAR OTRA TARJETA */}
          {metodo === "tarjeta" && exp.zohoPaymentMethodId && usarOtraTarjeta && (
            <div style={{padding:"10px 12px",borderRadius:8,background:"#fef9e7",border:"1px solid #f0d080",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:12,color:"#925c0a"}}>⚠️ Se abrirá el widget de Zoho para nueva tarjeta</div>
              <button style={{fontSize:11,color:"#1565c0",background:"none",border:"1px solid #aac4f0",borderRadius:6,padding:"3px 8px",cursor:"pointer"}}
                onClick={function(){ setUsarOtraTarjeta(false); }}>
                ← Usar guardada
              </button>
            </div>
          )}

          {/* SIN TARJETA GUARDADA */}
          {metodo === "tarjeta" && !exp.zohoPaymentMethodId && (
            <div style={{padding:"10px 12px",borderRadius:8,background:"#fef9e7",border:"1px solid #f0d080",marginBottom:10,fontSize:12,color:"#925c0a"}}>
              ⚠️ Este cliente no tiene tarjeta guardada. Se abrirá el widget de Zoho.
            </div>
          )}

          {err && <div style={{fontSize:12,color:"#b91c1c",marginBottom:8,fontWeight:600}}>⚠️ {err}</div>}
          {zohoError && metodo==="tarjeta" && <div style={{fontSize:12,color:"#b91c1c",marginBottom:8}}>⚠️ {zohoError}</div>}

          {/* CHECKBOX AUTORIZACIÓN — solo cuando usa tarjeta guardada */}
          {metodo === "tarjeta" && exp.zohoPaymentMethodId && !usarOtraTarjeta && (
            <div
              onClick={function(){ setAutorizado(function(p){ return !p; }); }}
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
                <strong>El cliente autorizó el cargo</strong> a la tarjeta {exp.tarjetaBrand||""} **** {exp.tarjetaLast4||"guardada"} por {monto ? fmtUSD(Number(monto)) : "el monto indicado"}
              </div>
            </div>
          )}

          {/* BOTÓN — tarjeta usa Zoho, resto manual */}
          {metodo === "tarjeta" ? (
            <button
              style={{...S.btn("success"),width:"100%",justifyContent:"center"}}
              disabled={!monto||cobrando||!!zohoError||(exp.zohoPaymentMethodId&&!usarOtraTarjeta&&!autorizado)}
              onClick={function(){
                var m = Number(monto);
                if (!m || m <= 0) { setErr("Ingresa un monto válido"); return; }
                if (m > saldo + 0.01) { setErr("El abono supera el saldo de " + fmtUSD(saldo)); return; }
                setErr(""); setCobrando(true);

                // Si tiene tarjeta guardada y no quiere usar otra → charge-saved-card
                if (exp.zohoPaymentMethodId && exp.zohoCustomerId && !usarOtraTarjeta) {
                  fetch(EDGE_URL + "/charge-saved-card", {
                    method:"POST", headers:AUTH_HDR,
                    body: JSON.stringify({
                      lead_id:           lead.id,
                      customer_id:       exp.zohoCustomerId,
                      payment_method_id: exp.zohoPaymentMethodId,
                      amount:            m,
                      folio:             lead.id,
                      nombre:            exp.tFirstName + " " + exp.tLastName,
                    }),
                  })
                  .then(function(r){ return r.json(); })
                  .then(function(data){
                    setCobrando(false);
                    if (data.error) { setErr("Error Zoho: " + data.error); return; }
                    if (data.status==="succeeded"||data.status==="success") {
                      var nuevo = { id:"P"+Date.now(), monto:m, metodo:"tarjeta",
                        referencia: data.payment_id||"Zoho-OK", concepto:concepto||"Abono tarjeta",
                        fecha:new Date().toISOString(), por:"Verificador" };
                      var nuevosAbonos = (exp.pagosHistorial||[]).concat([nuevo]);
                      SB.from("leads").update({pagos_historial:nuevosAbonos}).eq("id",lead.id)
                        .then(function(res2){
                          if (res2.error) { setErr("Cobrado pero error al guardar: "+res2.error.message); return; }
                          setMonto(""); setConcepto("Abono");
                          if (onAbonoGuardado) onAbonoGuardado(nuevosAbonos);
                        });
                    } else {
                      setErr("Cargo rechazado: " + (data.status||"error"));
                    }
                  })
                  .catch(function(e){ setCobrando(false); setErr("Error de red: "+e.message); });
                  return;
                }

                // Sin tarjeta guardada → widget Zoho
                if (!window.ZPayments) { setCobrando(false); setErr("SDK Zoho no disponible"); return; }
                fetch(EDGE_URL + "/create-session", {
                  method:"POST", headers:AUTH_HDR,
                  body: JSON.stringify({
                    amount:  m,
                    folio:   lead.id,
                    nombre:  exp.tFirstName + " " + exp.tLastName,
                    email:   exp.tEmail || "",
                  }),
                })
                .then(function(r){ return r.json(); })
                .then(function(sess){
                  if (sess.error) { setCobrando(false); setErr("Error sesión: "+sess.error); return; }
                  var zp = new window.ZPayments(ZOHO_API_KEY);
                  zp.pay({
                    hostedpage_id: sess.hostedpage_id || sess.id,
                    success: function(data){
                      setCobrando(false);
                      var nuevo = { id:"P"+Date.now(), monto:m, metodo:"tarjeta",
                        referencia:data.payment_id||"Zoho-OK", concepto:concepto||"Abono tarjeta",
                        fecha:new Date().toISOString(), por:"Verificador" };
                      var nuevosAbonos = (exp.pagosHistorial||[]).concat([nuevo]);
                      SB.from("leads").update({pagos_historial:nuevosAbonos}).eq("id",lead.id)
                        .then(function(res2){
                          if (!res2.error){ setMonto(""); setConcepto("Abono"); if(onAbonoGuardado) onAbonoGuardado(nuevosAbonos); }
                          else setErr("Cobrado pero error al guardar: "+res2.error.message);
                        });
                    },
                    failure: function(err){ setCobrando(false); setErr("Pago rechazado: "+(err.message||err)); },
                    cancel:  function(){ setCobrando(false); },
                  });
                })
                .catch(function(e){ setCobrando(false); setErr("Error sesión Zoho: "+e.message); });
              }}>
              {cobrando ? "Procesando..." : "💳 Cobrar " + (monto ? fmtUSD(Number(monto)) : "—") + " con tarjeta"}
            </button>
          ) : (
            <button style={{...S.btn("success"),width:"100%",justifyContent:"center"}}
              onClick={aplicarAbono} disabled={saving}>
              {saving ? "Guardando..." : "Registrar abono de " + (monto ? fmtUSD(Number(monto)) : "—")}
            </button>
          )}
        </div>
      )}
      {saldo <= 0 && (
        <div style={{padding:"10px 14px",borderRadius:9,background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.2)",textAlign:"center",fontSize:13,color:"#1a7f3c",fontWeight:600}}>
          ✅ Saldo liquidado — paquete completamente pagado
        </div>
      )}
    </div>
  );
}

function SectionPaquete({ exp, destMap: dm, onEdit }) {
  var dmap = dm || DEST_MAP;
  const saldo = (exp.salePrice||0) - (exp.pagoInicial||0);
  return (
    <div style={S.card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
        <div style={{ ...S.sTitle, marginBottom:0 }}>Paquete Contratado</div>
        <button style={{ ...S.btn("indigo"), padding:"5px 12px", fontSize:"12px" }} onClick={onEdit}>Editar expediente</button>
      </div>
      <div style={{ marginBottom:"14px" }}>
        {(exp.destinos||[]).map((d,i) => {
          const cat = dmap[d.destId];
          if (!cat) return null;
          return (
            <div key={i} style={{ padding:"10px 14px", borderRadius:"10px", background:"rgba(21,101,192,0.05)", border:"1px solid rgba(21,101,192,0.2)", marginBottom:"6px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"14px", fontWeight:"600", color:"#3d4554" }}>{cat.nombre}</div>
                  {d.regalo && <div style={{ fontSize:"12px", color:"#925c0a", marginTop:"2px" }}>Regalo: {d.regalo.label}</div>}
                </div>
                <span style={S.pill(d.tipo==="qc"?"#1565c0":"#1a7f3c")}>{d.tipo.toUpperCase()} - {d.noches}n</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={S.g3}>
        <div><div style={S.label}>Precio Total</div><div style={{ fontSize:"17px", fontWeight:"800", color:"#1a7f3c" }}>{fmtUSD(exp.salePrice)}</div></div>
        <div><div style={S.label}>Pago hoy</div><div style={{ fontSize:"17px", fontWeight:"800", color:"#1565c0" }}>{fmtUSD(exp.pagoInicial)}</div></div>
        <div><div style={S.label}>Saldo</div><div style={{ fontSize:"17px", fontWeight:"800", color:"#925c0a" }}>{fmtUSD(saldo)}</div></div>
      </div>
      {exp.notas && (
        <div style={{ marginTop:"12px", padding:"10px 14px", borderRadius:"9px", background:"#f9fafb", border:"1px solid #e3e6ea" }}>
          <div style={S.label}>Notas</div>
          <div style={{ fontSize:"13px", color:"#6b7280", marginTop:"3px" }}>{exp.notas}</div>
        </div>
      )}
    </div>
  );
}

// Zoho Payments config
var ZOHO_ACCOUNT_ID = "874101637";
var ZOHO_API_KEY    = "1003.afb484f19b10b5674c7e6f7c0c0ee5f5.89f010a430837bed480829a015a88641";
// URL de tu Supabase Edge Function
var EDGE_URL    = "https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/zoho-payments";
var ANON_KEY    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";
var AUTH_HDR    = { "Content-Type": "application/json", "Authorization": "Bearer " + ANON_KEY };

function SectionFirma({ lead, exp, verif, onSendDocs }) {
  const SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
  const EDGE_RESEND = "https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/resend-email";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";
  const HDR = { "Content-Type":"application/json", "Authorization":"Bearer "+SB_KEY, "apikey":SB_KEY };

  const [firmaData,  setFirmaData]  = useState(null);
  const [loadingFirma, setLoadingFirma] = useState(true);
  const [showImg,    setShowImg]    = useState(null); // "contrato"|"autorizacion"|"terminos"

  useEffect(function() {
    if (!lead.id) return;
    fetch(SB_URL + "/rest/v1/leads?id=eq." + lead.id + "&select=firma_token,firma_enviada_at,firma_firmada_at,firma_contrato,firma_autorizacion,firma_terminos", { headers: HDR })
      .then(function(r){ return r.json(); })
      .then(function(data) {
        setLoadingFirma(false);
        if (data && data[0]) setFirmaData(data[0]);
      })
      .catch(function(){ setLoadingFirma(false); });
  }, [lead.id]);

  // Cuantos dias hace que se envio sin firmar
  var diasPendiente = null;
  if (firmaData && firmaData.firma_enviada_at && !firmaData.firma_firmada_at) {
    var ms = Date.now() - new Date(firmaData.firma_enviada_at).getTime();
    diasPendiente = Math.floor(ms / (1000*60*60*24));
  }

  var firmado    = firmaData && !!firmaData.firma_firmada_at;
  var enviado    = firmaData && !!firmaData.firma_enviada_at;
  var docsSent   = verif && verif.docsSent;

  // Generar link de reenvio
  var firmaLink = null;
  if (firmaData && firmaData.firma_token) {
    firmaLink = "https://minivac-crm.vercel.app/firma.html?lead=" + lead.id + "&token=" + firmaData.firma_token;
  }

  var copyLink = function() {
    if (firmaLink) navigator.clipboard.writeText(firmaLink).catch(function(){});
  };

  if (loadingFirma) return (
    <div style={S.card}>
      <div style={S.sTitle}>Firma Digital</div>
      <div style={{ fontSize:"13px", color:"#9ca3af" }}>Cargando...</div>
    </div>
  );

  return (
    <div style={S.card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
        <div style={S.sTitle}>Firma Digital</div>
        {firmado && <span style={S.badge("#1a7f3c","rgba(74,222,128,0.08)","rgba(74,222,128,0.25)")}>Firmado</span>}
        {!firmado && enviado && <span style={S.badge("#925c0a","#fffbe0","rgba(251,191,36,0.3)")}>Pendiente firma</span>}
        {!firmado && !enviado && <span style={S.badge("#6b7280","rgba(148,163,184,0.08)","rgba(148,163,184,0.3)")}>No enviado</span>}
      </div>

      {/* ALERTA: enviado pero sin firmar y han pasado horas */}
      {!firmado && enviado && diasPendiente !== null && diasPendiente >= 0 && (
        <div style={{ padding:"12px 14px", borderRadius:"10px", background: diasPendiente >= 1 ? "rgba(185,28,28,0.07)" : "#fffbe0", border:"1px solid " + (diasPendiente >= 1 ? "#fca5a5" : "rgba(251,191,36,0.35)"), marginBottom:"14px", display:"flex", gap:"12px", alignItems:"flex-start" }}>
          <div style={{ fontSize:"20px", lineHeight:1 }}>{diasPendiente >= 1 ? "!" : "~"}</div>
          <div>
            <div style={{ fontSize:"13px", fontWeight:"700", color: diasPendiente >= 1 ? "#b91c1c" : "#925c0a", marginBottom:"2px" }}>
              {diasPendiente >= 1 ? "El cliente no ha firmado hace " + diasPendiente + " dia" + (diasPendiente > 1 ? "s" : "") : "Certificado enviado - esperando firma del cliente"}
            </div>
            <div style={{ fontSize:"12px", color:"#6b7280" }}>
              Enviado: {new Date(firmaData.firma_enviada_at).toLocaleString("es-MX", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
            </div>
          </div>
        </div>
      )}

      {/* FIRMADO: mostrar fecha y previews */}
      {firmado && (
        <div>
          <div style={{ padding:"10px 14px", borderRadius:"9px", background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.2)", marginBottom:"14px" }}>
            <div style={{ fontSize:"12px", color:"#1a7f3c", fontWeight:"600" }}>
              Firmado el {new Date(firmaData.firma_firmada_at).toLocaleString("es-MX", { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" })}
            </div>
            {firmaData.firma_enviada_at && (
              <div style={{ fontSize:"11px", color:"#9ca3af", marginTop:"2px" }}>
                Enviado: {new Date(firmaData.firma_enviada_at).toLocaleString("es-MX", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
              </div>
            )}
          </div>

          {/* Previews de las 3 firmas */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"4px" }}>
            {[
              { key:"firma_contrato",     label:"Contrato"      },
              { key:"firma_autorizacion", label:"Autorizacion"  },
              { key:"firma_terminos",     label:"Terminos"      },
            ].map(function(doc) {
              var imgSrc = firmaData[doc.key];
              return (
                <div key={doc.key} style={{ border:"1px solid #e3e6ea", borderRadius:"8px", overflow:"hidden", cursor: imgSrc ? "pointer" : "default" }}
                  onClick={function(){ if(imgSrc) setShowImg({ src:imgSrc, label:doc.label }); }}>
                  <div style={{ fontSize:"10px", fontWeight:"600", color:"#9ca3af", padding:"5px 8px", background:"#f9fafb", borderBottom:"1px solid #e3e6ea", textTransform:"uppercase", letterSpacing:"0.08em" }}>{doc.label}</div>
                  {imgSrc
                    ? <img src={imgSrc} alt={doc.label} style={{ width:"100%", height:"70px", objectFit:"contain", background:"#fff", display:"block" }} />
                    : <div style={{ height:"70px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:"#d1d5db" }}>sin firma</div>
                  }
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:"10px", color:"#d1d5db", textAlign:"center", marginTop:"4px" }}>Haz clic en una firma para ampliar</div>
        </div>
      )}

      {/* NO ENVIADO aun: boton para enviar */}
      {!enviado && !docsSent && verif && verif.paymentStatus === "approved" && (
        <button style={{ ...S.btn("indigo"), width:"100%", justifyContent:"center" }} onClick={onSendDocs}>
          Enviar Travel Certificate al cliente
        </button>
      )}

      {/* ENVIADO pero no firmado: link + reenviar */}
      {enviado && !firmado && firmaLink && (
        <div>
          <div style={{ display:"flex", gap:"8px", alignItems:"center", background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:"8px", padding:"8px 12px", marginBottom:"10px" }}>
            <div style={{ flex:1, fontSize:"11px", color:"#0369a1", wordBreak:"break-all", fontFamily:"monospace" }}>{firmaLink}</div>
            <button onClick={copyLink} style={{ flexShrink:0, fontSize:"11px", padding:"4px 10px", borderRadius:"5px", border:"1px solid #bae6fd", background:"#fff", color:"#0369a1", cursor:"pointer", fontFamily:"inherit" }}>Copiar</button>
          </div>
          <button style={{ ...S.btn("warning"), width:"100%", justifyContent:"center", fontSize:"12px" }} onClick={onSendDocs}>
            Reenviar por WhatsApp + Email
          </button>
        </div>
      )}

      {/* MODAL imagen firma ampliada */}
      {showImg && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={function(){ setShowImg(null); }}>
          <div style={{ background:"#fff", borderRadius:"14px", padding:"20px", maxWidth:"480px", width:"90%", textAlign:"center" }}
            onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ fontSize:"13px", fontWeight:"700", color:"#1a1f2e", marginBottom:"12px" }}>Firma — {showImg.label}</div>
            <img src={showImg.src} alt={showImg.label} style={{ width:"100%", border:"1px solid #e3e6ea", borderRadius:"8px" }} />
            <button style={{ ...S.btn("ghost"), marginTop:"14px", justifyContent:"center", width:"100%" }} onClick={function(){ setShowImg(null); }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCobro({ lead, exp, verif, onChargeResult }) {

  var [loading,        setLoading]        = useState(false);
  var [error,          setError]          = useState(null);
  var [zohoReady,      setZohoReady]      = useState(false);
  var [usarOtra,       setUsarOtra]       = useState(false);
  var [metodoCobro,    setMetodoCobro]    = useState("tarjeta");
  var [refCobro,       setRefCobro]       = useState("");
  var [otroDescCobro,  setOtroDescCobro]  = useState("");
  var yaPagado = verif && verif.paymentStatus === "approved";

  var tieneGuardada = !usarOtra && (exp.zohoPaymentMethodId || "");

  // Cargar script de Zoho Payments una vez
  useEffect(function() {
    if (window.ZPayments) { setZohoReady(true); return; }
    var script = document.createElement("script");
    script.src = "https://static.zohocdn.com/zpay/zpay-js/v1/zpayments.js";
    script.onload = function() { setZohoReady(true); };
    script.onerror = function() { setError("No se pudo cargar el SDK de Zoho Payments"); };
    document.head.appendChild(script);
  }, []);

  // Cobro manual (no tarjeta)
  var handleCobrarManual = function() {
    setLoading(true); setError(null);
    var metodoLabel = metodoCobro === "otro" ? ("otro: " + (otroDescCobro || "sin descripción")) : metodoCobro;
    // Guardar en Supabase como pago aprobado manual
    var SBurl = "https://gsvnvahrjgswwejnuiyn.supabase.co";
    var SBkey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";
    fetch(SBurl + "/rest/v1/leads?id=eq." + lead.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SBkey, "apikey": SBkey, "Prefer": "return=minimal" },
      body: JSON.stringify({
        verificacion: Object.assign({}, verif || {}, {
          paymentStatus: "approved",
          result:        "venta",
          metodo:        metodoLabel,
          referencia:    refCobro || "—",
          paidAt:        new Date().toISOString(),
        }),
        status: "venta",
      }),
    })
    .then(function(r) {
      setLoading(false);
      if (r.ok) { onChargeResult("approved", "manual-" + metodoCobro); }
      else { setError("Error guardando pago manual"); }
    })
    .catch(function(err) { setLoading(false); setError("Error: " + err.message); });
  };

  var handleCobrar = function() {
    setLoading(true);
    setError(null);

    var pmId   = tieneGuardada ? (exp.zohoPaymentMethodId || "") : "";
    var custId = tieneGuardada ? (exp.zohoCustomerId || "") : "";

    // Si tiene tarjeta guardada via Zoho, cobrar directo
    if (pmId && custId) {
      fetch(EDGE_URL + "/charge-saved-card", {
        method: "POST",
        headers: AUTH_HDR,
        body: JSON.stringify({
          lead_id:           lead.id,
          customer_id:       custId,
          payment_method_id: pmId,
          amount:            exp.pagoInicial,
          folio:             lead.id,
          nombre:            exp.tFirstName + " " + exp.tLastName,
        }),
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        setLoading(false);
        if (data.error) throw new Error(data.error);
        if (data.status === "succeeded" || data.status === "success") {
          onChargeResult("approved", data.payment_id || "");
        } else {
          setError("Estado inesperado: " + data.status);
          onChargeResult("rejected", "");
        }
      })
      .catch(function(err) {
        setLoading(false);
        setError("Error cobrando: " + err.message);
        onChargeResult("rejected", "");
      });
      return;
    }

    // Sin tarjeta guardada - abrir widget de Zoho
    if (!zohoReady || !window.ZPayments) {
      setLoading(false);
      setError("SDK de Zoho Payments no disponible");
      return;
    }

    fetch(EDGE_URL + "/create-session", {
      method: "POST",
      headers: AUTH_HDR,
      body: JSON.stringify({
        lead_id:  lead.id,
        amount:   exp.pagoInicial,
        currency: "USD",
        folio:    lead.id,
        nombre:   exp.tFirstName + " " + exp.tLastName,
      }),
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) throw new Error(data.error);
      var sessionId = data.payments_session_id;
      var config    = { account_id: ZOHO_ACCOUNT_ID, domain: "US", otherOptions: { api_key: ZOHO_API_KEY } };
      var instance  = new window.ZPayments(config);
      var options   = {
        amount:              String(exp.pagoInicial),
        currency_code:       "USD",
        payments_session_id: sessionId,
        currency_symbol:     "$",
        business:            "Mini-Vac Travel",
        description:         "Enganche - " + exp.tFirstName + " " + exp.tLastName,
        invoice_number:      lead.id,
        reference_number:    lead.id,
        address: { name: exp.tFirstName + " " + exp.tLastName, email: exp.tEmail || "", phone: exp.tPhone || "" },
      };
      instance.requestPaymentMethod(options)
        .then(function(result) {
          setLoading(false);
          instance.close();
          onChargeResult("approved", result.payment_id || "");
        })
        .catch(function(err) {
          setLoading(false);
          instance.close();
          if (err.code === "widget_closed") { setError("Pago cancelado"); }
          else { setError("Error: " + (err.message || JSON.stringify(err))); onChargeResult("rejected", ""); }
        });
    })
    .catch(function(err) {
      setLoading(false);
      setError("Error creando sesion: " + err.message);
    });
  };

  return (
    <div style={S.card}>
      <div style={S.sTitle}>Pago via Zoho Payments</div>

      {/* Selector método de cobro */}
      {!yaPagado && (
        <div style={{marginBottom:14}}>
          <div style={S.label}>Método de cobro</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["tarjeta","💳 Tarjeta"],["transferencia","🏦 Transferencia/Zelle"],["otro","✏️ Otro"]].map(function(op){
              return (
                <button key={op[0]} onClick={function(){ setMetodoCobro(op[0]); setError(null); }}
                  style={{padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,
                    background:metodoCobro===op[0]?"#1565c0":"#f4f5f7",
                    color:metodoCobro===op[0]?"#fff":"#3d4554",
                    border:"2px solid "+(metodoCobro===op[0]?"#1565c0":"#e3e6ea")}}>
                  {op[1]}
                </button>
              );
            })}
          </div>
          {metodoCobro !== "tarjeta" && (
            <div style={{marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div>
                <div style={S.label}>Referencia / No. transacción</div>
                <input style={S.input} value={refCobro} onChange={function(e){ setRefCobro(e.target.value); }} placeholder="TXN-12345 / SPEI-..." />
              </div>
              {metodoCobro === "otro" && (
                <div>
                  <div style={S.label}>Descripción del método</div>
                  <input style={S.input} value={otroDescCobro} onChange={function(e){ setOtroDescCobro(e.target.value); }} placeholder="Ej: Cheque, giro bancario..." />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resumen del cobro */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderRadius:"10px", background:"#f4f5f7", border:"1px solid #e3e6ea", marginBottom:"14px" }}>
        <div>
          <div style={{ fontSize:"11px", color:"#9ca3af", marginBottom:"2px" }}>ENGANCHE A COBRAR</div>
          <div style={{ fontSize:"24px", fontWeight:"800", color:"#1a385a" }}>{fmtUSD(exp.pagoInicial)}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:"11px", color:"#9ca3af", marginBottom:"2px" }}>PRECIO TOTAL</div>
          <div style={{ fontSize:"14px", fontWeight:"600", color:"#6b7280" }}>{fmtUSD(exp.salePrice)}</div>
        </div>
      </div>

      {/* Estado si ya fue pagado */}
      {yaPagado && (
        <div style={{ padding:"12px 14px", borderRadius:"10px", background:"#edf7ee", border:"1px solid #a3d9a5", marginBottom:"14px" }}>
          <div style={{ fontSize:"13px", fontWeight:"700", color:"#1a7f3c" }}>Pago procesado</div>
          {verif.zohoPaymentId && (
            <div style={{ fontSize:"11px", color:"#6b7280", marginTop:"3px" }}>ID: {verif.zohoPaymentId} - {verif.brand} *{verif.last4}</div>
          )}
        </div>
      )}

      {/* Intentos fallidos */}
      {verif && verif.chargeAttempts && verif.chargeAttempts.length > 0 && (
        <div style={{ marginBottom:"12px" }}>
          <div style={S.label}>Intentos anteriores</div>
          {verif.chargeAttempts.map(function(a, i) {
            return (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 12px", borderRadius:"8px", marginTop:"5px", background:a.status==="approved"?"rgba(74,222,128,0.05)":"rgba(248,113,113,0.05)", border:"1px solid "+(a.status==="approved"?"rgba(74,222,128,0.2)":"rgba(248,113,113,0.2)") }}>
                <span style={{ fontSize:"12px", color:"#6b7280" }}>{fmtUSD(a.amount)} - {a.ts ? a.ts.slice(0,10) : ""}</span>
                <span style={{ fontSize:"11px", fontWeight:"700", color:a.status==="approved"?"#1a7f3c":"#b91c1c" }}>{a.status==="approved"?"Aprobado":"Rechazado"}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding:"9px 12px", borderRadius:"8px", background:"#fef2f2", border:"1px solid #f5b8b8", marginBottom:"12px", fontSize:"12px", color:"#b91c1c" }}>
          {error}
        </div>
      )}

      {/* Tarjeta guardada */}
      {!yaPagado && metodoCobro === "tarjeta" && tieneGuardada && (
        <div style={{ padding:"10px 14px", borderRadius:"8px", background:"#edf7ee", border:"1px solid #a3d9a5", marginBottom:"10px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"10px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ fontSize:"18px" }}>CC</div>
            <div>
              <div style={{ fontSize:"12px", fontWeight:"700", color:"#1a7f3c" }}>Tarjeta guardada</div>
              <div style={{ fontSize:"11px", color:"#374151" }}>
                {(exp.tarjetaBrand || "Tarjeta") + " **** " + (exp.tarjetaLast4 || "----")}
              </div>
            </div>
          </div>
          <button
            style={{ fontSize:"11px", color:"#1565c0", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", padding:"0" }}
            onClick={function() { setUsarOtra(true); setError(null); }}>
            Usar otra tarjeta
          </button>
        </div>
      )}

      {/* Aviso cuando se usa otra tarjeta */}
      {!yaPagado && metodoCobro === "tarjeta" && usarOtra && (
        <div style={{ padding:"9px 12px", borderRadius:"8px", background:"#fffce5", border:"1px solid #f0d080", marginBottom:"10px", fontSize:"12px", color:"#925c0a", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>Nueva tarjeta - se abrira el widget de Zoho</span>
          <button
            style={{ fontSize:"11px", color:"#1565c0", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", padding:"0" }}
            onClick={function() { setUsarOtra(false); setError(null); }}>
            Volver a tarjeta guardada
          </button>
        </div>
      )}

      {/* Boton cobrar */}
      {!yaPagado && metodoCobro === "tarjeta" && (
        <button
          style={{ ...S.btn("success"), width:"100%", justifyContent:"center", opacity:loading?0.6:1, cursor:loading?"not-allowed":"pointer" }}
          disabled={loading}
          onClick={handleCobrar}>
          {loading ? "Procesando pago..." :
            tieneGuardada
              ? "Cobrar " + fmtUSD(exp.pagoInicial) + " con tarjeta guardada"
              : "Cobrar " + fmtUSD(exp.pagoInicial) + " con nueva tarjeta"
          }
        </button>
      )}

      {/* Boton cobro manual (no tarjeta) */}
      {!yaPagado && metodoCobro !== "tarjeta" && (
        <button
          style={{ ...S.btn("success"), width:"100%", justifyContent:"center", opacity:loading?0.6:1, cursor:loading?"not-allowed":"pointer" }}
          disabled={loading}
          onClick={handleCobrarManual}>
          {loading ? "Guardando..." : "✅ Confirmar cobro " + fmtUSD(exp.pagoInicial) + " — " + (metodoCobro === "otro" ? (otroDescCobro||"Otro") : metodoCobro)}
        </button>
      )}

      <div style={{ fontSize:"10px", color:"#b0b8c4", marginTop:"8px", textAlign:"center" }}>
        Pago seguro procesado por Zoho Payments - PCI DSS Level 1
      </div>
    </div>
  );
}

function DetailView({ lead, destCatalog, destMap, onBack, onUpdate, verificadores, onCambiarVerificador }) {

  const [exp,         setExp]         = useState({ ...lead.exp });
  const [verif,       setVerif]       = useState(lead.verificacion||null);
  const [editModal,   setEditModal]   = useState(false);
  const [emailModal,  setEmailModal]  = useState(false);
  const [chargeModal, setChargeModal] = useState(false);
  const [sendModal,   setSendModal]   = useState(false);
  const [finishModal, setFinishModal] = useState(null);
  const comm = useCommPanel();

  // Sincronizar cuando el lead se actualiza desde polling
  useEffect(function() {
    setExp({ ...lead.exp });
    setVerif(lead.verificacion || null);
  }, [lead.id, lead.status, lead.exp && lead.exp.zohoPaymentMethodId, lead.exp && (lead.exp.destinos||[]).length]);

  const vr = verif && verif.result ? VERIF_RESULTS[verif.result] : null;

  const limpiarTarjeta = (e) => ({ ...e, tarjetaNumero:"", tarjetaNombre:"", tarjetaVence:"", tarjetaCVV:"", tarjetaCapturaTs:null });

  const pushUpdate = (newExp, newVerif, extra) => {
    onUpdate({ ...lead, exp:newExp, verificacion:newVerif, ...(extra||{}) });
  };

  const handleSaveExp    = (newExp) => { setExp(newExp); pushUpdate(newExp, verif, null); };

  const handleChargeResult = (result) => {
    const attempt = { ts:new Date().toISOString(), amount:exp.pagoInicial, status:result==="approved"?"approved":"rejected" };
    const v = { ...(verif||{}), paymentStatus:result, chargeAttempts:[attempt, ...((verif||{}).chargeAttempts||[])] };
    setVerif(v);
    var extra = result === "approved" ? { status: "venta" } : null;
    pushUpdate(exp, v, extra);
    setChargeModal(false);
    if (result === "approved") setTimeout(() => setSendModal(true), 400);
    else setTimeout(() => setFinishModal({ defaultResult:"tarjeta_rechazada" }), 400);
  };

  const handleDocsSent = () => {
    const v = { ...(verif||{}), docsSent:true };
    setVerif(v); pushUpdate(exp, v, null);
    setSendModal(false);
    setTimeout(() => setFinishModal({ defaultResult:"venta" }), 400);
  };

  const handleFinish = (result, notes) => {
    const cleanExp = limpiarTarjeta(exp);
    const v = { result, notes, verifiedAt:TODAY, verifiedBy:"Verificador", paymentStatus:(verif||{}).paymentStatus||null, chargeAttempts:(verif||{}).chargeAttempts||[], docsSent:(verif||{}).docsSent||false };
    const newStatus = result==="venta" ? "venta" : result==="tarjeta_rechazada" ? "tarjeta_rechazada" : result==="cliente_no_interesado" ? "no_interesado" : "verificacion";
    setExp(cleanExp); setVerif(v);
    pushUpdate(cleanExp, v, { status:newStatus });
    setFinishModal(null);
  };

  const steps = [
    { label:"Expediente", done:true },
    { label:"Cobro",      done:!!(verif && verif.paymentStatus==="approved") },
    { label:"Documentos", done:!!(verif && verif.docsSent) },
    { label:"Resultado",  done:!!(verif && verif.result) },
  ];

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"22px" }}>
        <button style={{ ...S.btn("ghost"), padding:"7px 12px" }} onClick={onBack}>Volver</button>
        <div style={{ flex:1 }}>
          <h2 style={{ margin:0, fontSize:"20px", fontWeight:"700", color:"#1a1f2e" }}>{exp.tFirstName} {exp.tLastName}</h2>
          <div style={{ display:"flex", gap:"12px", alignItems:"center", marginTop:"4px", flexWrap:"wrap" }}>
            <span style={{ fontSize:"12px", color:"#6b7280" }}>Folio {lead.id}</span>
            <span style={{ fontSize:"12px", background:"#eaf0f7", color:"#1a385a", border:"1px solid #b8cfe0", borderRadius:"6px", padding:"1px 8px", fontWeight:"600" }}>
              Vendedor: {lead.sellerName||"--"}
            </span>
            <span style={{ fontSize:"12px", color:"#6b7280" }}>{fmtDate(lead.createdAt)}</span>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"4px", alignItems:"flex-end" }}>
          <label style={{ fontSize:"10px", fontWeight:"700", color:"#9ca3af", textTransform:"uppercase" }}>Verificador</label>
          <select
            value={lead.verificadorId||""}
            onChange={function(e){ onCambiarVerificador && onCambiarVerificador(lead, e.target.value, (verificadores||[]).find(function(v){return v.id===e.target.value;})||{}); }}
            style={{ fontSize:"12px", border:"1px solid #e3e6ea", borderRadius:"7px", padding:"5px 10px", background:"#fff", color:"#1a1f2e", cursor:"pointer", minWidth:"160px" }}
          >
            <option value="">-- Sin asignar --</option>
            {(verificadores||[]).map(function(v){ return <option key={v.id} value={v.id}>{v.nombre}</option>; })}
          </select>
        </div>
        <CommPanelTrigger
          cliente={{folio:lead.id,nombre:exp.tFirstName+" "+exp.tLastName,membresia:"Lead",tel:exp.tPhone||lead.phone||"",whatsapp:exp.tPhone||lead.phone||"",email:exp.tEmail||""}}
          onOpen={comm.open}
        />
        <button style={{ ...S.btn("ghost"), padding:"7px 12px", fontSize:"13px" }} onClick={() => setEmailModal(true)}>✉️ Emails</button>
        {vr
          ? <span style={S.badge(vr.color,vr.bg,vr.border)}>{vr.label}</span>
          : <span style={S.badge("#925c0a","#fffbe0","rgba(251,191,36,0.2)")}>Pendiente</span>
        }
      </div>

      <div style={{ display:"flex", alignItems:"center", marginBottom:"24px", background:"#f9fafb", border:"1px solid #e3e6ea", borderRadius:"12px", padding:"16px 24px" }}>
        {steps.map((step,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", flex:1 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
              <div style={{ width:"30px", height:"30px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"5px", fontWeight:"700", fontSize:"13px", background:step.done?"#1a7f3c":"#f2f3f6", color:step.done?"#052e16":"#9ca3af" }}>
                {step.done ? "v" : i+1}
              </div>
              <div style={{ fontSize:"11px", fontWeight:"600", color:step.done?"#1a7f3c":"#9ca3af" }}>{step.label}</div>
            </div>
            {i < steps.length-1 && <div style={{ height:"2px", flex:1, maxWidth:"32px", background:step.done?"rgba(74,222,128,0.5)":"#f2f3f6" }} />}
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", alignItems:"start" }}>
        <div>
          <SectionPersonal exp={exp} />
          <SectionPaquete exp={exp} destMap={destMap||DEST_MAP} onEdit={() => setEditModal(true)} />
          <SectionPagos lead={lead} exp={exp}
            onAbonoGuardado={function(nuevosAbonos){
              var newExp = Object.assign({},exp,{pagosHistorial:nuevosAbonos});
              setExp(newExp);
              registrarEvento(lead.id,"pago","Abono registrado · "+nuevosAbonos[nuevosAbonos.length-1].concepto+" "+fmtUSD(nuevosAbonos[nuevosAbonos.length-1].monto),null,{nombre:"Verificador"});
            }} />
          <UpsalePanel exp={exp} onSave={(newExp) => { setExp(newExp); pushUpdate(newExp, verif, null); }} />
        </div>
        <div>
          <SectionFirma lead={lead} exp={exp} verif={verif} onSendDocs={() => setSendModal(true)} />
          <SectionCobro lead={lead} exp={exp} verif={verif} onChargeResult={handleChargeResult} />
          {!(verif && verif.result) && (
            <div style={S.card}>
              <div style={S.sTitle}>Acciones</div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                <button style={{ ...S.btn("success"), justifyContent:"center" }} onClick={() => setChargeModal(true)}>Cobrar y continuar</button>
                <button style={{ ...S.btn("warning"), justifyContent:"center" }} onClick={() => setFinishModal({ defaultResult:"venta_pendiente" })}>Marcar venta pendiente</button>
                <button style={{ ...S.btn("danger"),  justifyContent:"center" }} onClick={() => setFinishModal({ defaultResult:"tarjeta_rechazada" })}>Tarjeta rechazada</button>
                <button style={{ ...S.btn("ghost"),   justifyContent:"center" }} onClick={() => setFinishModal({ defaultResult:"cliente_no_interesado" })}>Cliente no interesado</button>
              </div>
            </div>
          )}
          {vr && verif && verif.result && (
            <div style={{ ...S.card, border:"1px solid " + vr.border, background:vr.bg }}>
              <div style={S.sTitle}>Resultado Final</div>
              <div style={{ fontSize:"22px", fontWeight:"800", color:vr.color, marginBottom:"6px" }}>{vr.label}</div>
              {verif.notes && <div style={{ fontSize:"13px", color:"#6b7280", marginBottom:"10px" }}>{verif.notes}</div>}
              <div style={{ fontSize:"12px", color:"#9ca3af", marginBottom:"10px" }}>Verificado el {fmtDate(verif.verifiedAt)}</div>
              {verif.docsSent && (
                <div style={{ padding:"9px 12px", borderRadius:"9px", background:"rgba(37,211,102,0.06)", border:"1px solid rgba(37,211,102,0.2)", marginBottom:"8px" }}>
                  <div style={{ fontSize:"12px", color:"#1a7f3c" }}>Documentos enviados - WhatsApp + Email</div>
                </div>
              )}
              <div style={{ display:"flex", gap:"8px", marginTop:"10px", flexWrap:"wrap" }}>
                <button style={{ ...S.btn("ghost"), fontSize:"12px" }} onClick={() => setFinishModal({ defaultResult:verif.result })}>Editar resultado</button>
                {!verif.docsSent && verif.paymentStatus==="approved" && (
                  <button style={{ ...S.btn("indigo"), fontSize:"12px" }} onClick={() => setSendModal(true)}>Reenviar documentos</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HISTORIAL */}
      <div style={{padding:"0 20px 20px"}}>
        <div style={{...S.sTitle, marginBottom:10}}>🕒 Historial del lead</div>
        <TablaHistorial leadId={lead.id} />
      </div>

      {emailModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:"12px", padding:"24px", width:"600px", maxWidth:"95vw", maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
              <h3 style={{ margin:0, fontSize:"16px", fontWeight:700 }}>✉️ Emails — {exp.tFirstName} {exp.tLastName}</h3>
              <button onClick={() => setEmailModal(false)} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#6b7280" }}>✕</button>
            </div>
            <EmailPanel lead={{ ...lead, nombre: exp.tFirstName+" "+exp.tLastName, email: exp.tEmail || lead.email }} currentUser={{ id: "verificador" }} />
          </div>
        </div>
      )}
      {editModal   && <EditExpedienteModal exp={exp} destCatalog={destCatalog||DESTINOS_CATALOG} destMap={destMap||DEST_MAP} onClose={() => setEditModal(false)} onSave={handleSaveExp} />}
      
      {sendModal   && <SendDocsModal lead={{ ...lead, exp }} onClose={() => setSendModal(false)} onSent={handleDocsSent} />}
      {finishModal && <FinishModal defaultResult={finishModal.defaultResult} onClose={() => setFinishModal(null)} onFinish={handleFinish} />}
      <CommPanel
        visible={comm.visible}
        cliente={comm.cliente}
        logs={comm.logs}
        currentUser={{nombre:"Verificador"}}
        onClose={comm.close}
        onLog={comm.addLog}
      />
    </div>
  );
}

function QueueCard({ lead, onOpen, onTomar, currentUser }) {
  const exp = lead.exp;
  const vr  = lead.verificacion && lead.verificacion.result ? VERIF_RESULTS[lead.verificacion.result] : null;
  // Alerta firma pendiente: docsSent pero no firmada
  var docsSent   = lead.verificacion && lead.verificacion.docsSent;
  var firmada    = lead.firma_firmada_at;
  var enviada    = lead.firma_enviada_at;
  var diasSinFirma = null;
  if (enviada && !firmada) {
    diasSinFirma = Math.floor((Date.now() - new Date(enviada).getTime()) / (1000*60*60*24));
  }
  return (
    <div style={{ ...S.card, cursor:"pointer" }} onClick={() => onOpen(lead)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#f2f3f6"; }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
        <div>
          <div style={{ fontSize:"16px", fontWeight:"700", color:"#1a1f2e" }}>{exp.tFirstName} {exp.tLastName}</div>
          <div style={{ fontSize:"12px", color:"#9ca3af", marginTop:"2px" }}>{lead.phone}</div>
          <div style={{ display:"flex", gap:"4px", marginTop:"4px", flexWrap:"wrap" }}>
            <span style={{ fontSize:"10px", background:"#eaf0f7", color:"#1a385a", border:"1px solid #b8cfe0", borderRadius:"4px", padding:"1px 6px", fontWeight:"600" }}>V: {lead.sellerName||"--"}</span>
            <span style={{ fontSize:"10px", background:"#ede9fe", color:"#5b21b6", border:"1px solid #c4b5fd", borderRadius:"4px", padding:"1px 6px", fontWeight:"600" }}>VF: {lead.verificadorNombre||"Sin asignar"}</span>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"4px" }}>
          {vr
            ? <span style={S.badge(vr.color,vr.bg,vr.border)}>{vr.label}</span>
            : <span style={S.badge("#925c0a","#fffbe0","rgba(251,191,36,0.2)")}>Pendiente</span>
          }
          {firmada && (
            <span style={S.badge("#1a7f3c","rgba(74,222,128,0.08)","rgba(74,222,128,0.25)")}>Firmado</span>
          )}
          {!firmada && enviada && diasSinFirma !== null && (
            <span style={S.badge(
              diasSinFirma >= 1 ? "#b91c1c" : "#925c0a",
              diasSinFirma >= 1 ? "rgba(185,28,28,0.07)" : "#fffbe0",
              diasSinFirma >= 1 ? "#fca5a5" : "rgba(251,191,36,0.35)"
            )}>
              {diasSinFirma >= 1 ? "Sin firmar " + diasSinFirma + "d" : "Esperando firma"}
            </span>
          )}
        </div>
      </div>
      {/* Alerta roja si lleva mas de 1 dia sin firmar */}
      {!firmada && diasSinFirma >= 1 && (
        <div style={{ padding:"8px 12px", borderRadius:"8px", background:"rgba(185,28,28,0.07)", border:"1px solid #fca5a5", marginBottom:"10px", fontSize:"12px", color:"#b91c1c", fontWeight:"600" }}>
          Cliente no ha firmado el Travel Certificate ({diasSinFirma} dia{diasSinFirma > 1 ? "s" : ""})
        </div>
      )}
      <div style={{ display:"flex", gap:"16px", marginTop:"8px" }}>
        <div><div style={S.label}>Precio total</div><div style={{ fontSize:"15px", fontWeight:"800", color:"#1a7f3c" }}>{fmtUSD(exp.salePrice)}</div></div>
        <div><div style={S.label}>Pago hoy</div><div style={{ fontSize:"15px", fontWeight:"800", color:"#1565c0" }}>{fmtUSD(exp.pagoInicial)}</div></div>
      </div>
    </div>
  );
}

// Convierte un row de Supabase al formato interno del modulo de verificacion
function dbToVerifLead(r) {
  return {
    id:           r.id,
    nombre:       r.nombre || "",
    phone:        r.tel    || r.whatsapp || "",
    radioName:    r.emisora || "",
    sellerName:   (r.vendedor && r.vendedor.nombre) || r.vendedor_nombre || "",
    createdAt:    (r.created_at || TODAY).split("T")[0],
    status:       r.status || "verificacion",
    exp: {
      tFirstName:    r.nombre    || "",
      tLastName:     r.apellido  || "",
      tFechaNac:     r.fecha_nac || "",
      tSexo:         r.estado_civil === "Soltera mujer" ? "Mujer" : "Hombre",
      tPhone:        r.tel       || "",
      tEmail:        r.email     || "",
      tEstadoCivil:  r.estado_civil || "",
      hasPartner:    ["Casado","Union libre","Cohabitante"].includes(r.estado_civil),
      pFirstName:    r.co_prop         || "",
      pLastName:     r.co_prop_apellido|| "",
      pFechaNac:     r.co_prop_fecha_nac || "",
      pSexo:         r.co_prop_sexo    || "",
      pPhone:        r.co_prop_tel     || "",
      pEmail:        r.co_prop_email   || "",
      address:       r.direccion || "",
      city:          r.ciudad    || "Miami",
      state:         r.estado_us || "FL",
      zip:           r.zip       || "",
      destinos:      r.destinos  || [],
      salePrice:     Number(r.sale_price)   || 0,
      pagoInicial:   Number(r.pago_inicial) || 0,
      metodoPago:    r.metodo_pago || "",
      tarjetaNumero: r.tarjeta_numero  || "",
      tarjetaNombre: r.tarjeta_nombre  || "",
      tarjetaVence:  r.tarjeta_vence   || "",
      tarjetaCVV:    r.tarjeta_cvv     || "",
      tarjetaTipo:   r.tarjeta_tipo    || (r.metodo_pago === "tarjeta_credito" ? "credito" : r.metodo_pago === "tarjeta_debito" ? "debito" : ""),
      tarjetaCapturaTs: r.tarjeta_captura_ts || null,
      zohoPaymentMethodId: r.zoho_payment_method_id || "",
      zohoCustomerId:      r.zoho_customer_id       || "",
      tarjetaLast4:        r.tarjeta_last4           || "",
      tarjetaBrand:        r.tarjeta_brand           || "",
      notas:         (r.notas || []).map(function(n){ return typeof n === "string" ? n : (n.nota || ""); }).join("\n"),
      pagosHistorial: r.pagos_historial || [],
    },
    verificacion: r.verificacion || null,
    firma_enviada_at:  r.firma_enviada_at  || null,
    firma_firmada_at:  r.firma_firmada_at  || null,
    verificadorId:     r.verificador_id    || "",
    verificadorNombre: (r.verificador && r.verificador.nombre) || r.verificador_nombre || "",
  };
}

export default function VerificationModule({ currentUser }) {
  const [leads,        setLeads]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [detail,       setDetail]       = useState(null);
  const [toast,        setToast]        = useState(null);
  const [destCatalog,  setDestCatalog]  = useState([]);
  const [verificadores, setVerificadores] = useState([]);
  const [destMap,      setDestMap]      = useState({});

  const notify = function(msg, ok) { setToast({ msg, ok:ok!==false }); setTimeout(function(){ setToast(null); }, 3200); };

  // Cargar catalogo de destinos desde Supabase
  function cargarDestinos() {
    SB.from("destinos_catalog")
      .select("*")
      .eq("activo", true)
      .order("id", { ascending: true })
      .then(function(res) {
        if (res.data) {
          var mapped = res.data.map(dbToDestinoVerif);
          // Mantener globals para compatibilidad con componentes que aún los usan
          DESTINOS_CATALOG = mapped;
          DEST_MAP = Object.fromEntries(mapped.map(function(d){ return [d.id, d]; }));
          // Actualizar state para forzar re-render
          setDestCatalog(mapped);
          setDestMap(DEST_MAP);
        }
      });
  }

  // Cargar verificadores
  function cargarVerificadores() {
    SB.from("usuarios")
      .select("id, nombre, rol")
      .in("rol", ["verificador","admin","director","supervisor"])
      .order("nombre")
      .then(function(res) {
        if (res.data) setVerificadores(res.data);
      });
  }

  // Cargar leads en verificacion o con resultado de verificacion de hoy
  function cargarLeads() {
    SB.from("leads")
      .select("*, firma_enviada_at, firma_firmada_at, pagos_historial, sale_price, pago_inicial")
      .or("status.eq.verificacion,status.eq.venta,status.eq.no_interesado,status.eq.tarjeta_rechazada")
      .order("created_at", { ascending: false })
      .then(function(res) {
        setLoading(false);
        if (res.data) {
          // DEBUG — ver valores crudos de Supabase
          res.data.slice(0,3).forEach(function(r) {

          });
          // Cargar nombres de usuarios para cruzar
          SB.from("usuarios").select("id, nombre, rol").then(function(uRes) {
            var uMap = {};
            if (uRes.data) uRes.data.forEach(function(u){ uMap[u.id] = u.nombre; });
            var mapped = res.data.map(function(r) {
              var row = { ...r,
                vendedor_nombre: uMap[r.vendedor_id] || "",
                verificador_nombre: uMap[r.verificador_id] || ""
              };
              return dbToVerifLead(row);
            });
            var filtrados = mapped.filter(function(l) {
              return l.status === "verificacion" || l.status === "venta" || l.status === "no_interesado" || l.status === "tarjeta_rechazada";
            });
            setLeads(filtrados);
          });
          return;

        } else {
          console.error("Error cargando leads verificacion:", res.error);
        }
      });
  }

  useEffect(function() {
    cargarDestinos();
    cargarLeads();
    cargarVerificadores();
    var interval = setInterval(function() { cargarLeads(); }, 30000);
    return function() { clearInterval(interval); };
  }, []);

  const updateLead = function(u) {
    var prev = leads.find(function(l){ return l.id === u.id; });
    var newStatus = u.status;
    if (u.verificacion && u.verificacion.result === "venta") newStatus = "venta";
    if (u.verificacion && u.verificacion.paymentStatus === "approved" && !u.verificacion.result) newStatus = "venta";

    var dbUpdate = {
      verificacion:      u.verificacion,
      status:            newStatus,
      // Campos del expediente editables por el verificador
      estado_civil:      u.exp.tEstadoCivil    || null,
      co_prop:           u.exp.pFirstName      || null,
      co_prop_tel:       u.exp.pPhone          || null,
      destinos:          u.exp.destinos        || [],
      direccion:         u.exp.address         || null,
    };
    // Campos que requieren la migración SQL — solo incluir si tienen valor
    if (u.exp.salePrice)      dbUpdate.sale_price         = u.exp.salePrice;
    if (u.exp.pagoInicial)    dbUpdate.pago_inicial       = u.exp.pagoInicial;
    if (u.exp.upsaleMonto)    dbUpdate.upsale_monto       = u.exp.upsaleMonto;
    if (u.exp.salePrice)      dbUpdate.sale_price         = u.exp.salePrice;
    if (u.verificacion && u.verificacion.result === "venta") {
      var vid = currentUser && (currentUser.id || currentUser.auth_id);
      console.log("verificador_id guardando:", vid, "currentUser:", currentUser);
      dbUpdate.verificador_id = vid || null;
    }
    if (u.exp.pagoInicial)    dbUpdate.pago_inicial       = u.exp.pagoInicial;
    if (u.exp.upsaleMonto)    dbUpdate.upsale_monto       = u.exp.upsaleMonto;
    if (u.exp.tFechaNac)      dbUpdate.fecha_nac          = u.exp.tFechaNac;
    if (u.exp.pLastName)      dbUpdate.co_prop_apellido   = u.exp.pLastName;
    if (u.exp.pFechaNac)      dbUpdate.co_prop_fecha_nac  = u.exp.pFechaNac;
    if (u.exp.pSexo)          dbUpdate.co_prop_sexo       = u.exp.pSexo;
    if (u.exp.pEmail)         dbUpdate.co_prop_email      = u.exp.pEmail;
    if (u.exp.city)           dbUpdate.ciudad             = u.exp.city;
    if (u.exp.state)          dbUpdate.estado_us          = u.exp.state;
    if (u.exp.zip)            dbUpdate.zip                = u.exp.zip;
    SB.from("leads").update(dbUpdate).eq("id", u.id).then(function(res) {
      if (res.error) {
        notify("Error al guardar: " + res.error.message, false);
      } else {
        var updated = Object.assign({}, u, { status: newStatus });
        setLeads(function(p){ return p.map(function(l){ return l.id === u.id ? updated : l; }); });
        notify("Expediente actualizado", true);
        // ── Registrar eventos de historial
        var v = u.verificacion || {};
        var pv = (prev && prev.verificacion) ? prev.verificacion : {};
        if (prev && prev.status !== newStatus) {
          registrarEvento(u.id, "status", "Status: " + (prev.status||"?") + " → " + newStatus, null, { nombre: "Verificador" });
        }
        if (v.result && v.result !== pv.result) {
          registrarEvento(u.id, "verif", "Resultado verificación: " + v.result + (v.notes ? " — " + v.notes : ""), { result: v.result }, { nombre: "Verificador" });
        }
        if (v.paymentStatus === "approved" && pv.paymentStatus !== "approved") {
          registrarEvento(u.id, "cobro", "Cobro aprobado", { paymentStatus: "approved" }, { nombre: "Verificador" });
        }
        if (v.paymentStatus === "declined" && pv.paymentStatus !== "declined") {
          registrarEvento(u.id, "cobro", "Cobro rechazado", { paymentStatus: "declined" }, { nombre: "Verificador" });
        }
        if (v.docsSent && !pv.docsSent) {
          registrarEvento(u.id, "firma", "Travel Certificate enviado al cliente", null, { nombre: "Verificador" });
        }
      }
    });
  };

  const detailLead      = leads.find(function(l){ return l.id === detail; });
  const colVerificacion = leads.filter(function(l){ return !(l.verificacion && l.verificacion.result); });
  const colPendientePago= leads.filter(function(l){ return l.verificacion && (l.verificacion.result==="tarjeta_rechazada" || l.verificacion.paymentStatus==="declined"); });
  function getSaldo(l) {
    var exp = l.exp || {};
    var total = Number(exp.salePrice||l.sale_price||0);
    var pagado = Number(exp.pagoInicial||l.pago_inicial||0) + ((exp.pagosHistorial||l.pagos_historial||[]).reduce(function(s,p){ return s+Number(p.monto||0); },0));
    return Math.max(0, total - pagado);
  }
  var hoyD = new Date(); hoyD.setHours(0,0,0,0);
  var lunD = new Date(hoyD); lunD.setDate(hoyD.getDate() - (hoyD.getDay()===0?6:hoyD.getDay()-1));
  var domD = new Date(lunD); domD.setDate(lunD.getDate()+6);
  function estaEnSemana(fechaStr) {
    if (!fechaStr) return false;
    var d = new Date(fechaStr.split("T")[0]+"T12:00:00");
    return d >= lunD && d <= domD;
  }
  // Columnas NO excluyentes — un lead puede aparecer en varias
  const colCobranzaPend   = leads.filter(function(l){ return l.verificacion && l.verificacion.result==="venta" && getSaldo(l) > 0; });
  const colPendienteFirma = leads.filter(function(l){ return l.verificacion && l.verificacion.result==="venta" && !l.firma_firmada_at && l.firma_enviada_at; });
  const colVentas         = leads.filter(function(l){ return l.verificacion && l.verificacion.result==="venta" && estaEnSemana(l.verificacion.verifiedAt||l.firma_firmada_at); });
  function handleTomar(lead) {
    var uid = currentUser && (currentUser.dbId || currentUser.id);
    var nombre = currentUser && (currentUser.nombre || currentUser.name || "Verificador");
    SB.from("leads").update({ verificador_id: uid }).eq("id", lead.id).then(function(res) {
      if (!res.error) {
        setLeads(function(prev) { return prev.map(function(l) { return l.id === lead.id ? Object.assign({}, l, { verificadorId: uid, verificadorNombre: nombre }) : l; }); });
      }
    });
  }
  const pending         = colVerificacion;
  const done            = leads.filter(l => l.verificacion && l.verificacion.result);
  const ventas          = colVentas;

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={{ fontSize:"12px", fontWeight:"700", color:"#9ca3af", letterSpacing:"0.12em", textTransform:"uppercase" }}>Mini-Vac CRM</div>
        <div style={{ width:"1px", height:"18px", background:"#e3e6ea" }} />
        <div style={{ fontSize:"14px", fontWeight:"600", color:"#1565c0" }}>Verificacion</div>
        <div style={{ flex:1 }} />
        {pending.length > 0 && <span style={S.badge("#925c0a","#fffbe0","rgba(251,191,36,0.2)")}>{pending.length} pendiente(s)</span>}
        {ventas.length  > 0 && <span style={S.badge("#1a7f3c","rgba(74,222,128,0.08)","rgba(74,222,128,0.2)")}>{ventas.length} venta(s) hoy</span>}
        <button style={{ ...S.btn("ghost"), padding:"5px 12px", fontSize:"12px" }} onClick={cargarLeads}>Actualizar</button>
      </div>

      {loading ? (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"200px" }}>
          <div style={{ fontSize:"14px", color:"#9ca3af" }}>Cargando expedientes...</div>
        </div>
      ) : (
        <div style={{ padding:"24px 28px", maxWidth:"1200px", margin:"0 auto" }}>
          {detail && detailLead ? (
            <DetailView lead={detailLead} destCatalog={destCatalog} destMap={destMap} onBack={function(){ setDetail(null); }} onUpdate={updateLead}
              verificadores={verificadores}
              onCambiarVerificador={function(lead, uid, user) {
                SB.from("leads").update({ verificador_id: uid||null }).eq("id", lead.id).then(function(res) {
                  if (!res.error) {
                    updateLead(Object.assign({}, lead, { verificadorId: uid, verificadorNombre: user.nombre||"" }));
                  }
                });
              }}
            />
          ) : (
            <div>
              <div style={{ display:"flex", gap:"12px", marginBottom:"24px", flexWrap:"wrap" }}>
                {[
                  { label:"En cola",       val:pending.length,                                                              color:"#925c0a" },
                  { label:"Ventas",        val:ventas.length,                                                               color:"#1a7f3c" },
                  { label:"Rechazadas",    val:done.filter(function(l){ return l.verificacion.result==="tarjeta_rechazada"; }).length,        color:"#b91c1c" },
                  { label:"No interesado", val:done.filter(function(l){ return l.verificacion.result==="cliente_no_interesado"; }).length,    color:"#6b7280" },
                  { label:"Pend. pago",    val:done.filter(function(l){ return l.verificacion.result==="venta_pendiente"; }).length,          color:"#925c0a" },
                ].map(function(s){ return (
                  <div key={s.label} style={{ flex:1, minWidth:"110px", padding:"16px 20px", borderRadius:"12px", background:"#ffffff", border:"1px solid #e3e6ea" }}>
                    <div style={{ fontSize:"28px", fontWeight:"800", color:s.color }}>{s.val}</div>
                    <div style={{ fontSize:"12px", color:"#9ca3af", marginTop:"2px" }}>{s.label}</div>
                  </div>
                ); })}
              </div>
              {pending.length === 0 && done.length === 0 && (
                <div style={{ textAlign:"center", padding:"40px", color:"#9ca3af", fontSize:"14px" }}>
                  No hay expedientes en cola. Los leads en "Verificacion" aparecen aqui automaticamente.
                </div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"16px", alignItems:"start" }}>
                {[
                  { label:"Verificaciones", leads:colVerificacion, color:"#925c0a", bg:"#fffbe0", bd:"rgba(251,191,36,0.3)" },
                  { label:"Pendiente Pago",  leads:colPendientePago,  color:"#b91c1c", bg:"#fef2f2", bd:"rgba(185,28,28,0.2)" },
                  { label:"Cobranza Pend.",  leads:colCobranzaPend,   color:"#925c0a", bg:"#fffbe0", bd:"rgba(251,191,36,0.3)" },
                  { label:"Pend. Firma",     leads:colPendienteFirma, color:"#1565c0", bg:"#e8f0fe", bd:"rgba(21,101,192,0.2)" },
                  { label:"Ventas (semana)", leads:colVentas,         color:"#1a7f3c", bg:"rgba(74,222,128,0.06)", bd:"rgba(74,222,128,0.2)" },
                ].map(function(col){
                  return (
                    <div key={col.label} style={{ background:col.bg, border:"1px solid "+col.bd, borderRadius:"12px", overflow:"hidden" }}>
                      <div style={{ padding:"10px 14px", borderBottom:"1px solid "+col.bd, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div style={{ fontSize:"12px", fontWeight:"700", color:col.color, textTransform:"uppercase", letterSpacing:"0.08em" }}>{col.label}</div>
                        <span style={{ fontSize:"12px", fontWeight:"700", color:col.color, background:"rgba(255,255,255,0.6)", padding:"2px 8px", borderRadius:"20px", border:"1px solid "+col.bd }}>{col.leads.length}</span>
                      </div>
                      <div style={{ padding:"8px", display:"flex", flexDirection:"column", gap:"6px", maxHeight:"600px", overflowY:"auto" }}>
                        {col.leads.length===0 && <div style={{ textAlign:"center", padding:"20px 10px", fontSize:"11px", color:"#9ca3af" }}>Sin expedientes</div>}
                        {col.leads.map(function(l){ return <QueueCard key={l.id} lead={l} onOpen={function(l){ setDetail(l.id); }} onTomar={handleTomar} currentUser={currentUser} />; })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:"24px", right:"24px", zIndex:999, padding:"12px 20px", borderRadius:"10px", background:toast.ok?"#e5f3e8":"#fdeaea", border:"1px solid " + (toast.ok?"#a3d9a5":"#f5b8b8"), color:toast.ok?"#1a7f3c":"#b91c1c", fontSize:"14px", fontWeight:"600", boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
