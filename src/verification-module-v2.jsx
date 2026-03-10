import { useState } from "react";
import CommPanel, { useCommPanel, CommPanelTrigger } from "./comm-panel";

const TODAY = new Date().toISOString().split("T")[0];

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

const DESTINOS_CATALOG = [
  { id:"D01", nombre:"Cancun",          icon:"[CUN]", qc:{ noches:5, ageMin:25, ageMax:65 }, nq:{ enabled:true,  noches:4 }, regalos:[{id:"G001",label:"Tour Chichen Itza"},{id:"G002",label:"Snorkel Isla Mujeres"},{id:"G004",label:"Gift Card $75"}] },
  { id:"D02", nombre:"Los Cabos",       icon:"[CAB]", qc:{ noches:4, ageMin:36, ageMax:99 }, nq:{ enabled:false, noches:3 }, regalos:[{id:"G006",label:"Cena en la playa"},{id:"G007",label:"Tour Arco"},{id:"G008",label:"Gift Card $75"}] },
  { id:"D03", nombre:"Riviera Maya",    icon:"[RMY]", qc:{ noches:6, ageMin:25, ageMax:60 }, nq:{ enabled:true,  noches:4 }, regalos:[{id:"G009",label:"Tour Tulum + Cenote"},{id:"G010",label:"Snorkel arrecife"},{id:"G011",label:"Gift Card $75"}] },
  { id:"D04", nombre:"Las Vegas",       icon:"[LVG]", qc:{ noches:3, ageMin:21, ageMax:99 }, nq:{ enabled:false, noches:3 }, regalos:[{id:"G012",label:"$50 credito casino"},{id:"G013",label:"Show ticket"}] },
  { id:"D05", nombre:"Orlando",         icon:"[ORL]", qc:{ noches:4, ageMin:25, ageMax:99 }, nq:{ enabled:false, noches:3 }, regalos:[{id:"G014",label:"Gift Card $100"},{id:"G015",label:"2 entradas parque agua"}] },
  { id:"D06", nombre:"Puerto Vallarta", icon:"[PVR]", qc:{ noches:4, ageMin:25, ageMax:60 }, nq:{ enabled:true,  noches:3 }, regalos:[{id:"G016",label:"Tour bahia"},{id:"G017",label:"Canopy Sierra Madre"}] },
  { id:"D07", nombre:"Huatulco",        icon:"[HUX]", qc:{ noches:5, ageMin:25, ageMax:65 }, nq:{ enabled:true,  noches:3 }, regalos:[{id:"G018",label:"Tour lanchas bahias"},{id:"G019",label:"Gift Card $50"}] },
];
const DEST_MAP = Object.fromEntries(DESTINOS_CATALOG.map(d => [d.id, d]));

const ESTADO_CIVIL_OPTIONS = ["Casado","Union libre","Soltero hombre","Soltera mujer"];

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

function EditExpedienteModal({ exp, onClose, onSave }) {
  const [d, setD] = useState({ ...exp, destinos: exp.destinos.map(x => ({ ...x })) });
  const set = (k, v) => setD(p => ({ ...p, [k]:v }));
  const setDest = (i, k, v) => setD(p => ({ ...p, destinos: p.destinos.map((x,j) => j===i ? { ...x, [k]:v } : x) }));
  const setRegalo = (i, regalo) => setDest(i, "regalo", regalo);
  const addDest = () => {
    const used = d.destinos.map(x => x.destId);
    const free = DESTINOS_CATALOG.find(x => !used.includes(x.id));
    if (!free) return;
    setD(p => ({ ...p, destinos:[...p.destinos, { destId:free.id, tipo:"qc", noches:free.qc.noches, regalo:null }] }));
  };
  const removeDest = (i) => setD(p => ({ ...p, destinos:p.destinos.filter((_,j) => j!==i) }));
  const saldo = (d.salePrice||0) - (d.pagoInicial||0);

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:"18px", fontWeight:"700", color:"#1a1f2e", marginBottom:"4px" }}>Editar Expediente</div>
        <div style={{ fontSize:"13px", color:"#9ca3af", marginBottom:"20px" }}>Cambios registrados por el verificador</div>

        <div style={{ marginBottom:"16px" }}>
          <div style={S.sTitle}>Titular</div>
          <div style={S.g3}>
            <div><div style={S.label}>Nombre</div><input style={S.input} value={d.tFirstName} onChange={e => set("tFirstName",e.target.value)} /></div>
            <div><div style={S.label}>Apellido</div><input style={S.input} value={d.tLastName} onChange={e => set("tLastName",e.target.value)} /></div>
            <div>
              <div style={S.label}>Fecha de nacimiento</div>
              <input style={S.input} type="date" value={d.tFechaNac||""} onChange={e => set("tFechaNac",e.target.value)} max={TODAY} />
              {d.tFechaNac && <div style={{ fontSize:"11px", color:"#1a7f3c", marginTop:"3px", fontWeight:"600" }}>Edad: {edadLabel(d.tFechaNac)}</div>}
            </div>
            <div>
              <div style={S.label}>Sexo</div>
              <select style={S.select} value={d.tSexo||""} onChange={e => set("tSexo",e.target.value)}>
                <option value="">-- Seleccionar --</option>
                <option value="Hombre">Hombre</option>
                <option value="Mujer">Mujer</option>
              </select>
            </div>
            <div>
              <div style={S.label}>Estado civil</div>
              <select style={S.select} value={d.tEstadoCivil||""} onChange={e => set("tEstadoCivil",e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {ESTADO_CIVIL_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div><div style={S.label}>Telefono</div><input style={S.input} value={d.tPhone} onChange={e => set("tPhone",e.target.value)} /></div>
            <div><div style={S.label}>Email</div><input style={S.input} value={d.tEmail} onChange={e => set("tEmail",e.target.value)} /></div>
          </div>
        </div>

        <div style={{ marginBottom:"16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
            <div style={S.sTitle}>Co-propietario</div>
            <label style={{ display:"flex", alignItems:"center", gap:"6px", cursor:"pointer", marginBottom:"12px" }}>
              <input type="checkbox" checked={!!d.hasPartner} onChange={e => set("hasPartner",e.target.checked)} />
              <span style={{ fontSize:"12px", color:"#9ca3af" }}>Incluir</span>
            </label>
          </div>
          {d.hasPartner && (
            <div style={S.g3}>
              <div><div style={S.label}>Nombre</div><input style={S.input} value={d.pFirstName} onChange={e => set("pFirstName",e.target.value)} /></div>
              <div><div style={S.label}>Apellido</div><input style={S.input} value={d.pLastName} onChange={e => set("pLastName",e.target.value)} /></div>
              <div>
                <div style={S.label}>Fecha de nacimiento</div>
                <input style={S.input} type="date" value={d.pFechaNac||""} onChange={e => set("pFechaNac",e.target.value)} max={TODAY} />
                {d.pFechaNac && <div style={{ fontSize:"11px", color:"#1a7f3c", marginTop:"3px", fontWeight:"600" }}>Edad: {edadLabel(d.pFechaNac)}</div>}
              </div>
              <div>
                <div style={S.label}>Sexo</div>
                <select style={S.select} value={d.pSexo||""} onChange={e => set("pSexo",e.target.value)}>
                  <option value="">-- Seleccionar --</option>
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                </select>
              </div>
              <div><div style={S.label}>Telefono</div><input style={S.input} value={d.pPhone||""} onChange={e => set("pPhone",e.target.value)} /></div>
            </div>
          )}
        </div>

        <div style={{ marginBottom:"16px" }}>
          <div style={S.sTitle}>Direccion</div>
          <div style={S.g2}>
            <div style={{ gridColumn:"1/-1" }}><div style={S.label}>Calle y numero</div><input style={S.input} value={d.address} onChange={e => set("address",e.target.value)} /></div>
            <div><div style={S.label}>Ciudad</div><input style={S.input} value={d.city} onChange={e => set("city",e.target.value)} /></div>
            <div><div style={S.label}>Estado / ZIP</div><input style={S.input} value={d.state + " " + d.zip} onChange={e => set("state",e.target.value)} /></div>
          </div>
        </div>

        <div style={{ marginBottom:"16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
            <div style={S.sTitle}>Destinos</div>
            {d.destinos.length < 4 && (
              <button style={{ ...S.btn("indigo"), padding:"5px 12px", fontSize:"12px" }} onClick={addDest}>+ Agregar</button>
            )}
          </div>
          {d.destinos.map((dest, i) => {
            const cat = DEST_MAP[dest.destId];
            const usedIds = d.destinos.map((x,j) => j!==i ? x.destId : null).filter(Boolean);
            return (
              <div key={i} style={{ padding:"12px 14px", borderRadius:"10px", background:"rgba(21,101,192,0.05)", border:"1px solid rgba(21,101,192,0.2)", marginBottom:"8px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px" }}>
                  <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr 70px", gap:"8px" }}>
                    <div>
                      <div style={S.label}>Destino</div>
                      <select style={S.select} value={dest.destId} onChange={e => {
                        const nd = DEST_MAP[e.target.value];
                        setD(p => ({ ...p, destinos:p.destinos.map((x,j) => j===i ? { destId:e.target.value, tipo:"qc", noches:nd.qc.noches, regalo:null } : x) }));
                      }}>
                        {DESTINOS_CATALOG.filter(dl => !usedIds.includes(dl.id)||dl.id===dest.destId).map(dl => (
                          <option key={dl.id} value={dl.id}>{dl.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={S.label}>Tipo</div>
                      <select style={S.select} value={dest.tipo} onChange={e => {
                        const t = e.target.value;
                        setDest(i,"tipo",t);
                        setDest(i,"noches", t==="qc" ? cat.qc.noches : cat.nq.noches);
                      }}>
                        <option value="qc">QC - {cat ? cat.qc.noches : 0}n</option>
                        {cat && cat.nq.enabled && <option value="nq">NQ - {cat.nq.noches}n</option>}
                      </select>
                    </div>
                    <div>
                      <div style={S.label}>Noches</div>
                      <input style={S.input} type="number" min="1" max="14" value={dest.noches} onChange={e => setDest(i,"noches",Number(e.target.value))} />
                    </div>
                  </div>
                  <button onClick={() => removeDest(i)} style={{ background:"#fef2f2", border:"1px solid rgba(248,113,113,0.2)", color:"#b91c1c", borderRadius:"7px", padding:"4px 8px", cursor:"pointer", fontSize:"14px" }}>x</button>
                </div>
                {cat && (
                  <div style={{ paddingTop:"8px", borderTop:"1px solid #e3e6ea" }}>
                    <div style={{ fontSize:"10px", color:"#925c0a", fontWeight:"700", marginBottom:"5px" }}>Regalo (elige 1)</div>
                    <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
                      <div onClick={() => setRegalo(i,null)} style={{ padding:"3px 9px", borderRadius:"7px", cursor:"pointer", fontSize:"11px", background:!dest.regalo?"#eceff3":"#f9fafb", border:"1px solid " + (!dest.regalo?"rgba(255,255,255,0.3)":"#e3e6ea"), color:!dest.regalo?"#1a1f2e":"#9ca3af" }}>Sin regalo</div>
                      {cat.regalos.map(r => {
                        const sel = dest.regalo && dest.regalo.id === r.id;
                        return (
                          <div key={r.id} onClick={() => setRegalo(i,r)} style={{ padding:"3px 9px", borderRadius:"7px", cursor:"pointer", fontSize:"11px", background:sel?"#fef9e7":"#f9fafb", border:"2px solid " + (sel?"rgba(251,191,36,0.5)":"#e3e6ea"), color:sel?"#925c0a":"#9ca3af", fontWeight:sel?"700":"400" }}>
                            {r.label}
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

        <div style={{ marginBottom:"16px" }}>
          <div style={S.sTitle}>Montos (USD)</div>
          <div style={S.g3}>
            <div><div style={S.label}>Precio Total</div><input style={S.input} type="number" value={d.salePrice||""} onChange={e => set("salePrice",Number(e.target.value))} /></div>
            <div><div style={S.label}>Pago hoy</div><input style={{ ...S.input, borderColor:"rgba(129,140,248,0.4)" }} type="number" value={d.pagoInicial||""} onChange={e => set("pagoInicial",Number(e.target.value))} /></div>
            <div><div style={S.label}>Saldo</div><div style={{ fontSize:"15px", fontWeight:"800", color:"#925c0a", padding:"9px 0" }}>{fmtUSD(saldo)}</div></div>
          </div>
        </div>

        <div style={{ marginBottom:"20px" }}>
          <div style={S.label}>Notas del paquete</div>
          <textarea style={{ ...S.textarea, marginTop:"5px" }} value={d.notas||""} onChange={e => set("notas",e.target.value)} placeholder="Notas, condiciones especiales..." />
        </div>

        <div style={{ display:"flex", gap:"10px" }}>
          <button style={{ ...S.btn("ghost"), flex:1 }} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn("success"), flex:2, justifyContent:"center" }} onClick={() => onSave(d)}>Guardar cambios</button>
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
              <button style={{ ...S.btn("ghost"), flex:1 }} onClick={onClose}>Cancelar</button>
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
  const [phase, setPhase] = useState("ready");
  const exp = lead.exp;
  const doSend = () => { setPhase("sending"); setTimeout(() => setPhase("sent"), 1800); };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, maxWidth:"440px" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:"18px", fontWeight:"700", color:"#1a1f2e", marginBottom:"4px" }}>Enviar Documentos al Cliente</div>
        <div style={{ fontSize:"13px", color:"#9ca3af", marginBottom:"18px" }}>El cliente recibira 2 documentos para firmar</div>
        {[
          { title:"Autorizacion de cargo", desc:"Firma autorizando el cobro del enganche" },
          { title:"Terminos y condiciones", desc:"Condiciones del paquete vacacional contratado" },
        ].map((doc,i) => (
          <div key={i} style={{ display:"flex", gap:"12px", alignItems:"center", padding:"12px 14px", borderRadius:"10px", background:"#ffffff", border:"1px solid #e3e6ea", marginBottom:"8px" }}>
            <div>
              <div style={{ fontSize:"13px", fontWeight:"600", color:"#3d4554" }}>{doc.title}</div>
              <div style={{ fontSize:"12px", color:"#9ca3af" }}>{doc.desc}</div>
            </div>
          </div>
        ))}
        <div style={{ margin:"14px 0", padding:"12px 14px", borderRadius:"10px", background:"#f9fafb", border:"1px solid #e3e6ea" }}>
          <div style={S.label}>Destinos de envio</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginTop:"6px" }}>
            <span style={S.badge("#25d366","rgba(37,211,102,0.08)","rgba(37,211,102,0.25)")}>WhatsApp {exp.tPhone}</span>
            <span style={S.badge("#1565c0","rgba(96,165,250,0.08)","#b5cdf2")}>{exp.tEmail||"sin email"}</span>
          </div>
        </div>
        {phase === "ready"   && <button style={{ ...S.btn("primary"), width:"100%", justifyContent:"center" }} onClick={doSend}>Enviar Documentos Ahora</button>}
        {phase === "sending" && <div style={{ textAlign:"center", padding:"14px", color:"#6b7280", fontSize:"14px" }}>Enviando...</div>}
        {phase === "sent"    && (
          <div>
            <div style={{ padding:"14px", borderRadius:"10px", textAlign:"center", background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.2)", marginBottom:"12px" }}>
              <div style={{ fontSize:"14px", fontWeight:"600", color:"#1a7f3c" }}>Documentos enviados</div>
              <div style={{ fontSize:"12px", color:"#9ca3af", marginTop:"3px" }}>WhatsApp + Email - En espera de firma</div>
            </div>
            <button style={{ ...S.btn("success"), width:"100%", justifyContent:"center" }} onClick={onSent}>Continuar - Finalizar verificacion</button>
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
          <button style={{ ...S.btn("ghost"), flex:1 }} onClick={onClose}>Cancelar</button>
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
    onSave({ ...exp, destinos:newDestinos, salePrice:(exp.salePrice||0)+Number(destPrecio) });
    setDestId(""); setDestPrecio(""); setOpen(false);
  };

  const handleAddBeneficios = () => {
    if (!selBenef.length) return;
    onSave({ ...exp, salePrice:(exp.salePrice||0)+totalBenef });
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

function SectionPaquete({ exp, onEdit }) {
  const saldo = (exp.salePrice||0) - (exp.pagoInicial||0);
  return (
    <div style={S.card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
        <div style={{ ...S.sTitle, marginBottom:0 }}>Paquete Contratado</div>
        <button style={{ ...S.btn("indigo"), padding:"5px 12px", fontSize:"12px" }} onClick={onEdit}>Editar expediente</button>
      </div>
      <div style={{ marginBottom:"14px" }}>
        {(exp.destinos||[]).map((d,i) => {
          const cat = DEST_MAP[d.destId];
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

function SectionCobro({ exp, verif, onCharge }) {
  const [showCVV, setShowCVV] = useState(false);
  const hasTarjeta = exp.metodoPago === "tarjeta" && exp.tarjetaNumero;

  return (
    <div style={S.card}>
      <div style={S.sTitle}>Pago</div>
      {hasTarjeta ? (
        <div>
          <div style={{ background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%)", borderRadius:"14px", padding:"20px 22px", marginBottom:"14px", border:"1px solid rgba(129,140,248,0.2)" }}>
            <div style={{ fontSize:"16px", fontWeight:"700", letterSpacing:"0.12em", color:"#3d4554", marginBottom:"14px", fontFamily:"monospace" }}>{maskCard(exp.tarjetaNumero)}</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
              <div>
                <div style={{ fontSize:"9px", color:"#1565c0", marginBottom:"2px" }}>TITULAR</div>
                <div style={{ fontSize:"13px", fontWeight:"600", color:"#3d4554" }}>{exp.tarjetaNombre}</div>
              </div>
              <div style={{ display:"flex", gap:"14px" }}>
                {[["VENCE",exp.tarjetaVence],["TIPO",exp.tarjetaTipo]].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontSize:"9px", color:"#1565c0", marginBottom:"2px" }}>{l}</div>
                    <div style={{ fontSize:"12px", fontWeight:"600", color:"#3d4554", textTransform:"capitalize" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", marginBottom:"14px", padding:"7px 14px", borderRadius:"8px", background:"#fffbe0", border:"1px solid rgba(251,191,36,0.2)", cursor:"pointer" }} onClick={() => setShowCVV(p => !p)}>
            <span style={{ fontSize:"12px", color:"#925c0a" }}>CVV (solo verificador):</span>
            <span style={{ fontSize:"14px", fontWeight:"800", color:"#925c0a", letterSpacing:"0.2em" }}>{showCVV ? exp.tarjetaCVV : "***"}</span>
            <span style={{ fontSize:"11px", color:"#92400e" }}>{showCVV ? "ocultar" : "ver"}</span>
          </div>
          <div style={{ padding:"8px 12px", borderRadius:"8px", background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.2)", marginBottom:"14px", fontSize:"11px", color:"#b91c1c" }}>
            Los datos de tarjeta se borraran al completar la verificacion.
          </div>
        </div>
      ) : (
        <div style={{ padding:"12px 14px", borderRadius:"10px", background:"rgba(96,165,250,0.07)", border:"1px solid rgba(96,165,250,0.2)", marginBottom:"14px" }}>
          <div style={{ fontSize:"13px", fontWeight:"600", color:"#1565c0" }}>Pago por transferencia bancaria</div>
          <div style={{ fontSize:"12px", color:"#9ca3af", marginTop:"3px" }}>Verificar comprobante antes de procesar</div>
        </div>
      )}
      {verif && verif.chargeAttempts && verif.chargeAttempts.length > 0 && (
        <div style={{ marginBottom:"12px" }}>
          <div style={S.label}>Intentos de cobro</div>
          {verif.chargeAttempts.map((a,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", borderRadius:"8px", marginTop:"6px", background:a.status==="approved"?"rgba(74,222,128,0.05)":"rgba(248,113,113,0.05)", border:"1px solid " + (a.status==="approved"?"rgba(74,222,128,0.2)":"rgba(248,113,113,0.2)") }}>
              <span style={{ fontSize:"12px", color:"#6b7280" }}>{fmtUSD(a.amount)}</span>
              <span style={{ fontSize:"11px", fontWeight:"700", color:a.status==="approved"?"#1a7f3c":"#b91c1c" }}>{a.status==="approved"?"Aprobado":"Rechazado"}</span>
            </div>
          ))}
        </div>
      )}
      <button style={S.btn("success")} onClick={onCharge}>Cobrar {fmtUSD(exp.pagoInicial)}</button>
    </div>
  );
}

function DetailView({ lead, onBack, onUpdate }) {
  const [exp,         setExp]         = useState({ ...lead.exp });
  const [verif,       setVerif]       = useState(lead.verificacion||null);
  const [editModal,   setEditModal]   = useState(false);
  const [chargeModal, setChargeModal] = useState(false);
  const [sendModal,   setSendModal]   = useState(false);
  const [finishModal, setFinishModal] = useState(null);
  const comm = useCommPanel();

  const vr = verif && verif.result ? VERIF_RESULTS[verif.result] : null;

  const limpiarTarjeta = (e) => ({ ...e, tarjetaNumero:"", tarjetaNombre:"", tarjetaVence:"", tarjetaCVV:"", tarjetaCapturaTs:null });

  const pushUpdate = (newExp, newVerif, extra) => {
    onUpdate({ ...lead, exp:newExp, verificacion:newVerif, ...(extra||{}) });
  };

  const handleSaveExp    = (newExp) => { setExp(newExp); pushUpdate(newExp, verif, null); setEditModal(false); };

  const handleChargeResult = (result) => {
    const attempt = { ts:new Date().toISOString(), amount:exp.pagoInicial, status:result==="approved"?"approved":"rejected" };
    const v = { ...(verif||{}), paymentStatus:result, chargeAttempts:[attempt, ...((verif||{}).chargeAttempts||[])] };
    setVerif(v); pushUpdate(exp, v, null);
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
    const newStatus = result==="venta" ? "venta" : (result==="tarjeta_rechazada"||result==="cliente_no_interesado") ? "no_interesado" : "verificacion";
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
          <div style={{ fontSize:"13px", color:"#9ca3af" }}>Folio {lead.id} - Vendedor: {lead.sellerName} - {fmtDate(lead.createdAt)}</div>
        </div>
        <CommPanelTrigger
          cliente={{folio:lead.id,nombre:exp.tFirstName+" "+exp.tLastName,membresia:"Lead",tel:exp.tPhone||lead.phone||"",whatsapp:exp.tPhone||lead.phone||"",email:exp.tEmail||""}}
          onOpen={comm.open}
        />
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
          <SectionPaquete exp={exp} onEdit={() => setEditModal(true)} />
          <UpsalePanel exp={exp} onSave={(newExp) => { setExp(newExp); pushUpdate(newExp, verif, null); }} />
        </div>
        <div>
          <SectionCobro exp={exp} verif={verif} onCharge={() => setChargeModal(true)} />
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

      {editModal   && <EditExpedienteModal exp={exp} onClose={() => setEditModal(false)} onSave={handleSaveExp} />}
      {chargeModal && <ChargeModal lead={{ ...lead, exp }} onClose={() => setChargeModal(false)} onResult={handleChargeResult} />}
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

function QueueCard({ lead, onOpen }) {
  const exp = lead.exp;
  const vr  = lead.verificacion && lead.verificacion.result ? VERIF_RESULTS[lead.verificacion.result] : null;
  return (
    <div style={{ ...S.card, cursor:"pointer" }} onClick={() => onOpen(lead)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#f2f3f6"; }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
        <div>
          <div style={{ fontSize:"16px", fontWeight:"700", color:"#1a1f2e" }}>{exp.tFirstName} {exp.tLastName}</div>
          <div style={{ fontSize:"12px", color:"#9ca3af", marginTop:"2px" }}>{lead.phone} - {lead.radioName}</div>
          <div style={{ fontSize:"12px", color:"#9ca3af" }}>{lead.sellerName} - Folio {lead.id}</div>
        </div>
        {vr
          ? <span style={S.badge(vr.color,vr.bg,vr.border)}>{vr.label}</span>
          : <span style={S.badge("#925c0a","#fffbe0","rgba(251,191,36,0.2)")}>Pendiente</span>
        }
      </div>
      <div style={S.g3}>
        <div>
          <div style={S.label}>Destinos</div>
          <div style={{ fontSize:"13px", color:"#3d4554" }}>{(exp.destinos||[]).map(d => (DEST_MAP[d.destId]||{}).nombre||d.destId).join(" + ")||"--"}</div>
        </div>
        <div><div style={S.label}>Precio total</div><div style={{ fontSize:"15px", fontWeight:"800", color:"#1a7f3c" }}>{fmtUSD(exp.salePrice)}</div></div>
        <div><div style={S.label}>Pago hoy</div><div style={{ fontSize:"15px", fontWeight:"800", color:"#1565c0" }}>{fmtUSD(exp.pagoInicial)}</div></div>
      </div>
    </div>
  );
}

export default function VerificationModule() {
  const [leads,  setLeads]  = useState(SEED);
  const [detail, setDetail] = useState(null);
  const [toast,  setToast]  = useState(null);

  const notify = (msg, ok) => { setToast({ msg, ok:ok!==false }); setTimeout(() => setToast(null), 3200); };

  const updateLead = (u) => { setLeads(p => p.map(l => l.id===u.id ? u : l)); notify("Expediente actualizado", true); };

  const detailLead = leads.find(l => l.id===detail);
  const pending    = leads.filter(l => !(l.verificacion && l.verificacion.result));
  const done       = leads.filter(l =>   l.verificacion && l.verificacion.result);
  const ventas     = done.filter(l => l.verificacion.result==="venta");

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={{ fontSize:"12px", fontWeight:"700", color:"#9ca3af", letterSpacing:"0.12em", textTransform:"uppercase" }}>Mini-Vac CRM</div>
        <div style={{ width:"1px", height:"18px", background:"#eff1f4" }} />
        <div style={{ fontSize:"14px", fontWeight:"600", color:"#1565c0" }}>Verificacion</div>
        <div style={{ flex:1 }} />
        {pending.length > 0 && <span style={S.badge("#925c0a","#fffbe0","rgba(251,191,36,0.2)")}>{pending.length} pendiente(s)</span>}
        {ventas.length  > 0 && <span style={S.badge("#1a7f3c","rgba(74,222,128,0.08)","rgba(74,222,128,0.2)")}>{ventas.length} venta(s) hoy</span>}
      </div>

      <div style={{ padding:"24px 28px", maxWidth:"1200px", margin:"0 auto" }}>
        {detail && detailLead ? (
          <DetailView lead={detailLead} onBack={() => setDetail(null)} onUpdate={updateLead} />
        ) : (
          <div>
            <div style={{ display:"flex", gap:"12px", marginBottom:"24px", flexWrap:"wrap" }}>
              {[
                { label:"En cola",       val:pending.length,                                                              color:"#925c0a" },
                { label:"Ventas",        val:ventas.length,                                                               color:"#1a7f3c" },
                { label:"Rechazadas",    val:done.filter(l => l.verificacion.result==="tarjeta_rechazada").length,        color:"#b91c1c" },
                { label:"No interesado", val:done.filter(l => l.verificacion.result==="cliente_no_interesado").length,    color:"#6b7280" },
                { label:"Pend. pago",    val:done.filter(l => l.verificacion.result==="venta_pendiente").length,          color:"#925c0a" },
              ].map(s => (
                <div key={s.label} style={{ flex:1, minWidth:"110px", padding:"16px 20px", borderRadius:"12px", background:"#ffffff", border:"1px solid #e3e6ea" }}>
                  <div style={{ fontSize:"28px", fontWeight:"800", color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:"12px", color:"#9ca3af", marginTop:"2px" }}>{s.label}</div>
                </div>
              ))}
            </div>
            {pending.length > 0 && (
              <div>
                <div style={S.sTitle}>Pendientes de verificar</div>
                {pending.map(l => <QueueCard key={l.id} lead={l} onOpen={l => setDetail(l.id)} />)}
              </div>
            )}
            {done.length > 0 && (
              <div style={{ marginTop:"22px" }}>
                <div style={S.sTitle}>Verificados hoy</div>
                {done.map(l => <QueueCard key={l.id} lead={l} onOpen={l => setDetail(l.id)} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position:"fixed", bottom:"24px", right:"24px", zIndex:999, padding:"12px 20px", borderRadius:"10px", background:toast.ok?"#e5f3e8":"#fdeaea", border:"1px solid " + (toast.ok?"#a3d9a5":"#f5b8b8"), color:toast.ok?"#1a7f3c":"#b91c1c", fontSize:"14px", fontWeight:"600", boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
