import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// =====================================================================
// SUPABASE
// =====================================================================
var _sb = createClient(
  "https://gsvnvahrjgswwejnuiyn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA"
);

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const TODAY = new Date().toISOString().split("T")[0];
const DAYS  = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

function getWeekRange(dateStr) {
  const d   = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { mon: mon.toISOString().split("T")[0], sun: sun.toISOString().split("T")[0] };
}
function dayOffset(weekMon, dayName) {
  const idx = DAYS.indexOf(dayName);
  const d   = new Date(weekMon + "T12:00:00");
  d.setDate(d.getDate() + (idx === -1 ? 0 : idx));
  return d.toISOString().split("T")[0];
}
function fmtTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${h===0?12:h>12?h-12:h}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d+"T12:00:00").toLocaleDateString("es-MX",{weekday:"short",day:"2-digit",month:"short"});
}
function fmtUSD(n) {
  return "$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
}
function uid(p="X") { return p+Date.now()+Math.random().toString(36).slice(2,5); }
function calcPrecioEquipo(spot) {
  const base = Number(spot.costo||0) * 1.15 + Number(spot.talento||0);
  return spot.precioEquipoOverride != null ? Number(spot.precioEquipoOverride) : base;
}
const WEEK = getWeekRange(TODAY);

// ═══════════════════════════════════════════════════════════════
// CATÁLOGOS
// ═══════════════════════════════════════════════════════════════
const TIPOS_SPOT = ["30seg","60seg","45seg","90seg","Mención","Cuña"];
const INCIDENCIAS = {
  no_salio:  { label:"No salió",  icon:"❌", color:"#f87171", bg:"rgba(248,113,113,0.08)", border:"rgba(248,113,113,0.25)", credito:true  },
  salio_mal: { label:"Salió mal", icon:"⚠️", color:"#fb923c", bg:"rgba(251,146,60,0.08)",  border:"rgba(251,146,60,0.25)",  credito:false },
};
const SPOT_STATUS = {
  pendiente:  { label:"Pendiente",  color:"#94a3b8", bg:"rgba(148,163,184,0.1)",  border:"rgba(148,163,184,0.25)" },
  ordenado:   { label:"Ordenado",   color:"#60a5fa", bg:"rgba(96,165,250,0.1)",   border:"rgba(96,165,250,0.25)"  },
  confirmado: { label:"Confirmado", color:"#fbbf24", bg:"rgba(251,191,36,0.1)",   border:"rgba(251,191,36,0.25)"  },
  pagado:     { label:"Pagado",     color:"#4ade80", bg:"rgba(74,222,128,0.1)",   border:"rgba(74,222,128,0.25)"  },
};

// ═══════════════════════════════════════════════════════════════
// SEED
// ═══════════════════════════════════════════════════════════════
const SEED_EMISORAS = [
  { id:"E01", nombre:"Radio Hits",  frecuencia:"99.3 FM",  ciudad:"Miami",           contrato:"RH-2026-01",   active:true,  vendedor:"Patricia Lomas",    telefono:"(305) 555-0101", email:"plomas@radiohits.com",    tarifaBase:68,  notas:"Mejor horario 7-9am y 12pm. Muy puntual en transmisiones." },
  { id:"E02", nombre:"Banda 107",   frecuencia:"107.7 FM", ciudad:"Miami",           contrato:"B107-2026-03", active:true,  vendedor:"Jorge Méndez",      telefono:"(305) 555-0202", email:"jmendez@banda107.com",    tarifaBase:54,  notas:"Audiencia 25-45 años. Buenos resultados martes y jueves." },
  { id:"E03", nombre:"Stereo 94",   frecuencia:"94.5 FM",  ciudad:"Hialeah",         contrato:"S94-2026-02",  active:true,  vendedor:"Ana Rodríguez",     telefono:"(305) 555-0303", email:"arodriguez@stereo94.com", tarifaBase:47,  notas:"Hialeah y zonas norte. Ha tenido 2 no-salidas este mes — monitorear." },
  { id:"E04", nombre:"Éxitos 102",  frecuencia:"102.1 FM", ciudad:"Miami",           contrato:"EX-2026-01",   active:true,  vendedor:"Carlos Fuentes",    telefono:"(305) 555-0404", email:"cfuentes@exitos102.com",  tarifaBase:44,  notas:"Tarifa más económica. Buena para cobertura nocturna (8-10pm)." },
  { id:"E05", nombre:"Mix 88",      frecuencia:"88.9 FM",  ciudad:"Fort Lauderdale", contrato:"MX-2026-02",   active:true,  vendedor:"Sandra Villegas",   telefono:"(954) 555-0505", email:"svillegas@mix88.com",     tarifaBase:53,  notas:"Cubre Broward County. Negociar descuento por volumen en Q2." },
  { id:"E06", nombre:"La Ke Buena", frecuencia:"92.3 FM",  ciudad:"Miami",           contrato:"KB-2026-01",   active:false, vendedor:"Roberto Castañeda", telefono:"(305) 555-0606", email:"rcastaneda@lakebueena.com",tarifaBase:61,  notas:"Pausada — contrato vence en junio. Evaluar renovación." },
];

const SEED_SPOTS = [
  { id:"SP01", emisoraId:"E01", dia:"Lunes",     fecha:dayOffset(WEEK.mon,"Lunes"),     hora:"07:15", tipo:"60seg", costo:68, talento:12, contrato:"RH-2026-01",   status:"confirmado", incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP02", emisoraId:"E02", dia:"Lunes",     fecha:dayOffset(WEEK.mon,"Lunes"),     hora:"08:00", tipo:"30seg", costo:54, talento:8,  contrato:"B107-2026-03", status:"pagado",     incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP03", emisoraId:"E03", dia:"Lunes",     fecha:dayOffset(WEEK.mon,"Lunes"),     hora:"09:30", tipo:"30seg", costo:47, talento:6,  contrato:"S94-2026-02",  status:"confirmado", incidencia:"no_salio",  incidenciaNota:"Confirmado con la emisora — no se transmitió",precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP04", emisoraId:"E01", dia:"Lunes",     fecha:dayOffset(WEEK.mon,"Lunes"),     hora:"12:30", tipo:"60seg", costo:80, talento:12, contrato:"RH-2026-01",   status:"confirmado", incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP05", emisoraId:"E04", dia:"Lunes",     fecha:dayOffset(WEEK.mon,"Lunes"),     hora:"20:00", tipo:"30seg", costo:44, talento:0,  contrato:"EX-2026-01",   status:"pendiente",  incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP06", emisoraId:"E01", dia:"Martes",    fecha:dayOffset(WEEK.mon,"Martes"),    hora:"07:15", tipo:"60seg", costo:68, talento:12, contrato:"RH-2026-01",   status:"pendiente",  incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP07", emisoraId:"E02", dia:"Martes",    fecha:dayOffset(WEEK.mon,"Martes"),    hora:"08:00", tipo:"30seg", costo:54, talento:8,  contrato:"B107-2026-03", status:"ordenado",   incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP08", emisoraId:"E05", dia:"Martes",    fecha:dayOffset(WEEK.mon,"Martes"),    hora:"17:00", tipo:"60seg", costo:53, talento:0,  contrato:"MX-2026-02",   status:"pendiente",  incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP09", emisoraId:"E01", dia:"Miércoles", fecha:dayOffset(WEEK.mon,"Miércoles"), hora:"07:15", tipo:"60seg", costo:68, talento:12, contrato:"RH-2026-01",   status:"pendiente",  incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP10", emisoraId:"E03", dia:"Miércoles", fecha:dayOffset(WEEK.mon,"Miércoles"), hora:"12:00", tipo:"30seg", costo:47, talento:6,  contrato:"S94-2026-02",  status:"ordenado",   incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP11", emisoraId:"E04", dia:"Jueves",    fecha:dayOffset(WEEK.mon,"Jueves"),    hora:"08:30", tipo:"30seg", costo:44, talento:0,  contrato:"EX-2026-01",   status:"pendiente",  incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP12", emisoraId:"E01", dia:"Jueves",    fecha:dayOffset(WEEK.mon,"Jueves"),    hora:"19:00", tipo:"60seg", costo:80, talento:12, contrato:"RH-2026-01",   status:"pendiente",  incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:110,  semana:WEEK.mon },
  { id:"SP13", emisoraId:"E02", dia:"Viernes",   fecha:dayOffset(WEEK.mon,"Viernes"),   hora:"07:00", tipo:"30seg", costo:54, talento:8,  contrato:"B107-2026-03", status:"pendiente",  incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP14", emisoraId:"E05", dia:"Viernes",   fecha:dayOffset(WEEK.mon,"Viernes"),   hora:"20:00", tipo:"60seg", costo:53, talento:0,  contrato:"MX-2026-02",   status:"pendiente",  incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
  { id:"SP15", emisoraId:"E01", dia:"Sábado",    fecha:dayOffset(WEEK.mon,"Sábado"),    hora:"10:00", tipo:"60seg", costo:74, talento:12, contrato:"RH-2026-01",   status:"pendiente",  incidencia:null,        incidenciaNota:"",                                           precioEquipoOverride:null, semana:WEEK.mon },
];

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const S = {
  wrap:     { color:"#e2e8f0", fontFamily:"'DM Sans','Segoe UI',sans-serif" },
  tab:      (a) => ({ padding:"7px 16px", borderRadius:"8px", cursor:"pointer", fontSize:"13px", fontWeight:a?"600":"400", background:a?"rgba(251,191,36,0.15)":"transparent", color:a?"#fbbf24":"#64748b", border:a?"1px solid rgba(251,191,36,0.3)":"1px solid transparent", transition:"all 0.15s" }),
  card:     { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"20px", marginBottom:"14px" },
  label:    { fontSize:"11px", color:"#64748b", marginBottom:"4px", fontWeight:"500" },
  sTitle:   { fontSize:"10px", fontWeight:"700", color:"#475569", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"12px" },
  badge:    (color,bg,border) => ({ display:"inline-flex", alignItems:"center", gap:"5px", padding:"3px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:"600", color, background:bg||`${color}12`, border:`1px solid ${border||color+"28"}` }),
  input:    { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"9px", padding:"9px 12px", color:"#e2e8f0", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  select:   { width:"100%", background:"rgba(15,18,30,0.95)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"9px", padding:"9px 12px", color:"#e2e8f0", fontSize:"13px", outline:"none", cursor:"pointer", fontFamily:"inherit", boxSizing:"border-box" },
  modal:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.84)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" },
  modalBox: { background:"#0d1117", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"18px", padding:"28px", maxWidth:"520px", width:"100%", maxHeight:"90vh", overflowY:"auto" },
  btn: (v="ghost") => {
    const m = { primary:{bg:"#4f46e5",color:"#fff",border:"transparent"}, success:{bg:"rgba(74,222,128,0.15)",color:"#4ade80",border:"rgba(74,222,128,0.3)"}, danger:{bg:"rgba(248,113,113,0.15)",color:"#f87171",border:"rgba(248,113,113,0.3)"}, warning:{bg:"rgba(251,191,36,0.15)",color:"#fbbf24",border:"rgba(251,191,36,0.3)"}, ghost:{bg:"rgba(255,255,255,0.05)",color:"#94a3b8",border:"rgba(255,255,255,0.1)"}, indigo:{bg:"rgba(99,102,241,0.15)",color:"#818cf8",border:"rgba(99,102,241,0.3)"} };
    const s = m[v]||m.ghost;
    return { display:"inline-flex", alignItems:"center", gap:"7px", padding:"8px 16px", borderRadius:"9px", cursor:"pointer", fontSize:"13px", fontWeight:"600", background:s.bg, color:s.color, border:`1px solid ${s.border}`, transition:"all 0.18s", whiteSpace:"nowrap" };
  },
  g2: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" },
  g3: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px" },
};

// ═══════════════════════════════════════════════════════════════
// SPOT MODAL
// ═══════════════════════════════════════════════════════════════
function SpotModal({ spot, diaDefault, emisoras, semana, onClose, onSave }) {
  const isNew = !spot;
  const [d, setD] = useState(spot ? {...spot} : { emisoraId:"", dia:diaDefault||"Lunes", hora:"07:00", tipo:"60seg", costo:"", talento:"", contrato:"", status:"pendiente", precioEquipoOverride:null, semana:semana.mon });
  const [errors, setErrors] = useState({});
  const set = (k,v) => { setD(p=>({...p,[k]:v})); setErrors(p=>({...p,[k]:undefined})); };

  const neto = Number(d.costo)||0;
  const tal  = Number(d.talento)||0;
  const base = neto * 1.15 + tal;
  const precioFinal = d.precioEquipoOverride != null ? Number(d.precioEquipoOverride) : base;

  const handleSave = () => {
    const e = {};
    if (!d.emisoraId) e.emisoraId = "Selecciona una emisora";
    if (!d.hora)      e.hora      = "Requerido";
    if (!d.costo || Number(d.costo)<=0) e.costo = "Costo inválido";
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...d, fecha:dayOffset(semana.mon,d.dia), costo:Number(d.costo), talento:Number(d.talento)||0, precioEquipoOverride:d.precioEquipoOverride!=null?Number(d.precioEquipoOverride):null });
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:"18px", fontWeight:"700", color:"#f1f5f9", marginBottom:"16px" }}>{isNew?"➕ Agregar Spot":"✏️ Editar Spot"}</div>

        {/* ── Preview fijo arriba — siempre visible ── */}
        <div style={{ marginBottom:"18px", borderRadius:"12px", overflow:"hidden", border:`1px solid ${neto>0?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.08)"}`, transition:"border-color 0.2s" }}>
          <div style={{ padding:"7px 14px", background:neto>0?"rgba(99,102,241,0.12)":"rgba(255,255,255,0.03)", borderBottom:`1px solid ${neto>0?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.06)"}` }}>
            <div style={{ fontSize:"10px", fontWeight:"700", color:neto>0?"#818cf8":"#475569", textTransform:"uppercase", letterSpacing:"0.1em" }}>
              👁 Vista previa — log de ventas
            </div>
          </div>
          <div style={{ padding:"12px 14px", background:neto>0?"rgba(99,102,241,0.04)":"rgba(255,255,255,0.01)" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"10px" }}>
              <div>
                <div style={{ fontSize:"10px", color:"#475569", marginBottom:"3px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.07em" }}>Emisora</div>
                <div style={{ fontSize:"13px", color: d.emisoraId?"#e2e8f0":"#334155", fontWeight:"600" }}>
                  {d.emisoraId ? emisoras.find(e=>e.id===d.emisoraId)?.nombre : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize:"10px", color:"#475569", marginBottom:"3px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.07em" }}>Hora · Tipo</div>
                <div style={{ fontSize:"13px", color:"#94a3b8", fontWeight:"600" }}>{fmtTime(d.hora)} · {d.tipo}</div>
              </div>
              <div>
                <div style={{ fontSize:"10px", color:"#f87171", marginBottom:"3px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.07em" }}>Costo neto</div>
                <div style={{ fontSize:"15px", color: neto>0?"#f87171":"#334155", fontWeight:"700" }}>{neto>0 ? fmtUSD(neto) : "—"}</div>
              </div>
              <div>
                <div style={{ fontSize:"10px", color:"#fbbf24", marginBottom:"3px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.07em" }}>
                  Precio al equipo {d.precioEquipoOverride!=null?"⚡":""}
                </div>
                <div style={{ fontSize:"20px", color: neto>0?"#fbbf24":"#334155", fontWeight:"900", lineHeight:1 }}>
                  {neto>0 ? fmtUSD(precioFinal) : "—"}
                </div>
                {neto>0 && (
                  <div style={{ fontSize:"10px", color:"#64748b", marginTop:"3px" }}>
                    {d.precioEquipoOverride!=null ? "override manual" : tal>0 ? "neto x1.15 + talento" : "neto + 15%"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginBottom:"14px" }}>
          <div style={S.label}>Emisora *</div>
          <select style={{ ...S.select, borderColor:errors.emisoraId?"rgba(248,113,113,0.5)":"" }} value={d.emisoraId} onChange={e=>set("emisoraId",e.target.value)}>
            <option value="">— Seleccionar —</option>
            {emisoras.filter(e=>e.active).map(e=><option key={e.id} value={e.id}>{e.nombre} · {e.frecuencia} · {e.ciudad}</option>)}
          </select>
          {errors.emisoraId && <div style={{ fontSize:"11px",color:"#f87171",marginTop:"3px" }}>{errors.emisoraId}</div>}
        </div>
        <div style={{ ...S.g2, marginBottom:"14px" }}>
          <div>
            <div style={S.label}>Día *</div>
            <select style={S.select} value={d.dia} onChange={e=>set("dia",e.target.value)}>
              {DAYS.map(day=><option key={day} value={day}>{day} · {fmtDate(dayOffset(semana.mon,day))}</option>)}
            </select>
          </div>
          <div>
            <div style={S.label}>Hora *</div>
            <input style={{ ...S.input, borderColor:errors.hora?"rgba(248,113,113,0.5)":"" }} type="time" value={d.hora} onChange={e=>set("hora",e.target.value)} />
            {errors.hora && <div style={{ fontSize:"11px",color:"#f87171",marginTop:"3px" }}>{errors.hora}</div>}
          </div>
        </div>
        <div style={{ ...S.g3, marginBottom:"14px" }}>
          <div>
            <div style={S.label}>Tipo</div>
            <select style={S.select} value={d.tipo} onChange={e=>set("tipo",e.target.value)}>
              {TIPOS_SPOT.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={S.label}>Status</div>
            <select style={S.select} value={d.status||"pendiente"} onChange={e=>set("status",e.target.value)}>
              {Object.entries(SPOT_STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <div style={S.label}>Contrato</div>
            <input style={S.input} value={d.contrato||""} onChange={e=>set("contrato",e.target.value)} placeholder="RH-2026-01" />
          </div>
        </div>
        <div style={{ ...S.g2, marginBottom:"14px" }}>
          <div>
            <div style={S.label}>Costo neto (USD) *</div>
            <input style={{ ...S.input, borderColor:errors.costo?"rgba(248,113,113,0.5)":"" }} type="number" min="0" step="1" placeholder="68" value={d.costo} onChange={e=>set("costo",e.target.value)} />
            {errors.costo && <div style={{ fontSize:"11px",color:"#f87171",marginTop:"3px" }}>{errors.costo}</div>}
          </div>
          <div>
            <div style={S.label}>Talento (USD)</div>
            <input style={S.input} type="number" min="0" step="1" placeholder="12" value={d.talento||""} onChange={e=>set("talento",e.target.value)} />
            <div style={{ fontSize:"11px",color:"#475569",marginTop:"3px" }}>Locutor / producción</div>
          </div>
        </div>
        {(neto>0||tal>0) && (
          <div style={{ marginBottom:"14px", padding:"14px", borderRadius:"10px", background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.18)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", color:"#94a3b8", marginBottom:"3px" }}><span>Neto</span><span>{fmtUSD(neto)}</span></div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", color:"#94a3b8", marginBottom:"3px" }}><span>+ 15% comisión agencia</span><span>{fmtUSD(neto*0.15)}</span></div>
            {tal>0&&<div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", color:"#94a3b8", marginBottom:"3px" }}><span>+ Talento (sin comisión)</span><span>{fmtUSD(tal)}</span></div>}
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"10px" }}>
              <span style={{ fontSize:"13px", fontWeight:"700", color:"#fbbf24" }}>Precio al equipo {d.precioEquipoOverride!=null?"(override)":"(auto)"}</span>
              <span style={{ fontSize:"16px", fontWeight:"800", color:"#fbbf24" }}>{fmtUSD(precioFinal)}</span>
            </div>
            <div style={S.label}>Override manual (opcional)</div>
            <div style={{ display:"flex", gap:"8px" }}>
              <input style={{ ...S.input, borderColor:d.precioEquipoOverride!=null?"rgba(251,191,36,0.5)":"" }} type="number" min="0" step="1" placeholder={`${fmtUSD(base)} (automático)`} value={d.precioEquipoOverride!=null?d.precioEquipoOverride:""} onChange={e=>set("precioEquipoOverride",e.target.value===""?null:Number(e.target.value))} />
              {d.precioEquipoOverride!=null && <button style={{ ...S.btn("ghost"), padding:"7px 10px" }} onClick={()=>set("precioEquipoOverride",null)}>↩</button>}
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:"10px" }}>
          <button style={{ ...S.btn("ghost"), flex:1 }} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn("success"), flex:2, justifyContent:"center" }} onClick={handleSave}>{isNew?"➕ Agregar":"✅ Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EMISORA MODAL
// ═══════════════════════════════════════════════════════════════
function EmisoraModal({ emisora, onClose, onSave }) {
  const isNew = !emisora;
  const [d, setD] = useState(emisora ? {...emisora} : {
    nombre:"", frecuencia:"", ciudad:"", contrato:"", active:true,
    vendedor:"", telefono:"", email:"", tarifaBase:"", notas:"",
  });
  const [errors, setErrors] = useState({});
  const set = (k,v) => { setD(p=>({...p,[k]:v})); setErrors(p=>({...p,[k]:undefined})); };

  const handleSave = () => {
    const e = {};
    if (!d.nombre.trim())    e.nombre     = "Requerido";
    if (!d.frecuencia.trim())e.frecuencia = "Requerido";
    if (!d.ciudad.trim())    e.ciudad     = "Requerido";
    if (!d.contrato.trim())  e.contrato   = "Requerido";
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...d, tarifaBase: Number(d.tarifaBase)||0 });
  };

  const Divider = ({label}) => (
    <div style={{ display:"flex", alignItems:"center", gap:"10px", margin:"18px 0 14px" }}>
      <div style={{ fontSize:"10px", fontWeight:"700", color:"#475569", textTransform:"uppercase", letterSpacing:"0.1em", whiteSpace:"nowrap" }}>{label}</div>
      <div style={{ flex:1, height:"1px", background:"rgba(255,255,255,0.07)" }} />
    </div>
  );

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, maxWidth:"560px" }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:"18px", fontWeight:"700", color:"#f1f5f9", marginBottom:"4px" }}>
          {isNew ? "📻 Nueva Emisora" : "✏️ Editar Emisora"}
        </div>
        <div style={{ fontSize:"12px", color:"#64748b", marginBottom:"20px" }}>
          {isNew ? "Completa los datos de la emisora y su contacto comercial" : d.nombre}
        </div>

        {/* ── Datos de la emisora ── */}
        <Divider label="Datos de la emisora" />
        <div style={{ marginBottom:"14px" }}>
          <div style={S.label}>Nombre *</div>
          <input style={{ ...S.input, borderColor:errors.nombre?"rgba(248,113,113,0.5)":"" }}
            value={d.nombre} onChange={e=>set("nombre",e.target.value)} placeholder="ej. Radio Hits" />
          {errors.nombre && <div style={{ fontSize:"11px",color:"#f87171",marginTop:"3px" }}>{errors.nombre}</div>}
        </div>
        <div style={{ ...S.g3, marginBottom:"14px" }}>
          <div>
            <div style={S.label}>Frecuencia *</div>
            <input style={{ ...S.input, borderColor:errors.frecuencia?"rgba(248,113,113,0.5)":"" }}
              value={d.frecuencia} onChange={e=>set("frecuencia",e.target.value)} placeholder="99.3 FM" />
            {errors.frecuencia && <div style={{ fontSize:"11px",color:"#f87171",marginTop:"3px" }}>{errors.frecuencia}</div>}
          </div>
          <div>
            <div style={S.label}>Ciudad *</div>
            <input style={{ ...S.input, borderColor:errors.ciudad?"rgba(248,113,113,0.5)":"" }}
              value={d.ciudad} onChange={e=>set("ciudad",e.target.value)} placeholder="Miami" />
            {errors.ciudad && <div style={{ fontSize:"11px",color:"#f87171",marginTop:"3px" }}>{errors.ciudad}</div>}
          </div>
          <div>
            <div style={S.label}>Tarifa base (USD)</div>
            <input style={S.input} type="number" min="0" step="1"
              value={d.tarifaBase||""} onChange={e=>set("tarifaBase",e.target.value)} placeholder="ej. 68" />
            <div style={{ fontSize:"11px", color:"#475569", marginTop:"3px" }}>Costo neto por spot</div>
          </div>
        </div>
        <div style={{ ...S.g2, marginBottom:"14px" }}>
          <div>
            <div style={S.label}>Número de contrato *</div>
            <input style={{ ...S.input, borderColor:errors.contrato?"rgba(248,113,113,0.5)":"" }}
              value={d.contrato} onChange={e=>set("contrato",e.target.value)} placeholder="RH-2026-01" />
            {errors.contrato && <div style={{ fontSize:"11px",color:"#f87171",marginTop:"3px" }}>{errors.contrato}</div>}
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", paddingBottom:"2px" }}>
            <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer" }}>
              <input type="checkbox" checked={d.active} onChange={e=>set("active",e.target.checked)} />
              <span style={{ fontSize:"13px", color:"#94a3b8" }}>Emisora activa</span>
            </label>
          </div>
        </div>

        {/* ── Contacto comercial ── */}
        <Divider label="Contacto comercial" />
        <div style={{ marginBottom:"14px" }}>
          <div style={S.label}>Nombre del vendedor / ejecutivo de cuenta</div>
          <input style={S.input}
            value={d.vendedor||""} onChange={e=>set("vendedor",e.target.value)}
            placeholder="ej. Patricia Lomas" />
        </div>
        <div style={{ ...S.g2, marginBottom:"14px" }}>
          <div>
            <div style={S.label}>Teléfono</div>
            <input style={S.input}
              value={d.telefono||""} onChange={e=>set("telefono",e.target.value)}
              placeholder="(305) 555-0101" />
          </div>
          <div>
            <div style={S.label}>Correo electrónico</div>
            <input style={S.input} type="email"
              value={d.email||""} onChange={e=>set("email",e.target.value)}
              placeholder="vendedor@emisora.com" />
          </div>
        </div>

        {/* ── Notas ── */}
        <Divider label="Notas internas" />
        <div style={{ marginBottom:"22px" }}>
          <textarea style={{ ...S.input, minHeight:"80px", resize:"vertical" }}
            placeholder="Horarios preferidos, historial de incidencias, notas de negociación..."
            value={d.notas||""} onChange={e=>set("notas",e.target.value)} />
        </div>

        <div style={{ display:"flex", gap:"10px" }}>
          <button style={{ ...S.btn("ghost"), flex:1 }} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn("success"), flex:2, justifyContent:"center" }} onClick={handleSave}>
            {isNew ? "➕ Agregar emisora" : "✅ Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INCIDENCIA MODAL
// ═══════════════════════════════════════════════════════════════
function IncidenciaModal({ spot, emisora, onClose, onSave }) {
  const [tipo, setTipo] = useState(spot.incidencia||"no_salio");
  const [nota, setNota] = useState(spot.incidenciaNota||"");
  const inc = INCIDENCIAS[tipo];
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, maxWidth:"420px" }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontSize:"18px", fontWeight:"700", color:"#f1f5f9", marginBottom:"4px" }}>{inc.icon} Reportar Incidencia</div>
        <div style={{ fontSize:"13px", color:"#64748b", marginBottom:"20px" }}>{emisora?.nombre} · {fmtTime(spot.hora)} · {spot.dia}</div>
        <div style={{ marginBottom:"14px" }}>
          <div style={S.label}>Tipo de incidencia</div>
          <div style={{ display:"flex", gap:"10px", marginTop:"6px" }}>
            {Object.entries(INCIDENCIAS).map(([k,v])=>(
              <div key={k} onClick={()=>setTipo(k)} style={{ flex:1, padding:"12px 14px", borderRadius:"10px", cursor:"pointer", border:`2px solid ${tipo===k?v.color:"rgba(255,255,255,0.08)"}`, background:tipo===k?v.bg:"transparent", transition:"all 0.15s" }}>
                <div style={{ fontSize:"20px", marginBottom:"4px" }}>{v.icon}</div>
                <div style={{ fontSize:"13px", fontWeight:"600", color:tipo===k?v.color:"#64748b" }}>{v.label}</div>
                {v.credito && <div style={{ fontSize:"11px", color:v.color, marginTop:"2px", opacity:0.8 }}>Genera crédito</div>}
              </div>
            ))}
          </div>
        </div>
        {INCIDENCIAS[tipo].credito && (
          <div style={{ padding:"12px 14px", borderRadius:"10px", background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", marginBottom:"14px" }}>
            <div style={{ fontSize:"12px", color:"#f87171", fontWeight:"600" }}>📋 Crédito pendiente con {emisora?.nombre} por {fmtUSD(spot.costo)}</div>
          </div>
        )}
        <div style={{ marginBottom:"20px" }}>
          <div style={S.label}>Nota / detalle</div>
          <textarea style={{ ...S.input, minHeight:"80px", resize:"vertical" }} placeholder="Describe qué ocurrió..." value={nota} onChange={e=>setNota(e.target.value)} />
        </div>
        <div style={{ display:"flex", gap:"10px" }}>
          <button style={{ ...S.btn("ghost"), flex:1 }} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn("danger"), flex:2, justifyContent:"center" }} onClick={()=>onSave({...spot,incidencia:tipo,incidenciaNota:nota})}>{inc.icon} Registrar</button>
        </div>
        {spot.incidencia && (
          <button style={{ ...S.btn("ghost"), width:"100%", justifyContent:"center", marginTop:"8px", fontSize:"12px" }} onClick={()=>onSave({...spot,incidencia:null,incidenciaNota:""})}>✕ Quitar incidencia</button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SPOT ROW
// ═══════════════════════════════════════════════════════════════
function SpotRow({ spot, emisora, isToday, onEdit, onDelete, onIncidencia, isSupervisor }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const st  = SPOT_STATUS[spot.status]||SPOT_STATUS.pendiente;
  const inc = spot.incidencia ? INCIDENCIAS[spot.incidencia] : null;
  const precio = calcPrecioEquipo(spot);
  return (
    <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 55px 80px 70px 100px 150px", alignItems:"center", padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)", background:isToday?"rgba(99,102,241,0.04)":"transparent" }}>
      <div style={{ fontSize:"13px", fontWeight:"600", color:"#94a3b8" }}>{fmtTime(spot.hora)}</div>
      <div>
        <div style={{ fontSize:"13px", fontWeight:"600", color:"#e2e8f0" }}>{emisora?.nombre||"—"}</div>
        <div style={{ fontSize:"11px", color:"#475569" }}>{emisora?.frecuencia} · {spot.contrato||"—"}</div>
        {inc && <span style={{ ...S.badge(inc.color,inc.bg,inc.border), marginTop:"3px", fontSize:"10px" }}>{inc.icon} {inc.label}</span>}
      </div>
      <div style={{ fontSize:"11px", color:"#64748b" }}>{spot.tipo}</div>
      <div style={{ fontSize:"13px", fontWeight:"600", color:"#f87171" }}>{fmtUSD(spot.costo)}</div>
      <div style={{ fontSize:"12px", color: inc?.credito?"#f87171":"#475569" }}>{inc?.credito?"📋 Crédito":"—"}</div>
      <div style={{ fontSize:"13px", fontWeight:"600", color:"#fbbf24" }}>{spot.precioEquipoOverride!=null?"⚡ ":""}{fmtUSD(precio)}</div>
      <div style={{ display:"flex", alignItems:"center", gap:"4px", flexWrap:"wrap" }}>
        <span style={{ ...S.badge(st.color,st.bg,st.border), fontSize:"10px", padding:"2px 7px" }}>{st.label}</span>
        {!confirmDel ? (
          <>
            <button style={{ ...S.btn("ghost"), padding:"3px 7px", fontSize:"11px" }} onClick={()=>onEdit(spot)}>✏️</button>
            {isSupervisor && <button style={{ ...S.btn(inc?"warning":"ghost"), padding:"3px 7px", fontSize:"11px" }} onClick={()=>onIncidencia(spot)}>{inc?inc.icon:"⚠️"}</button>}
            <button style={{ ...S.btn("danger"), padding:"3px 7px", fontSize:"11px" }} onClick={()=>setConfirmDel(true)}>🗑</button>
          </>
        ) : (
          <>
            <button style={{ ...S.btn("danger"), padding:"3px 7px", fontSize:"11px" }} onClick={()=>onDelete(spot.id)}>Confirmar</button>
            <button style={{ ...S.btn("ghost"), padding:"3px 7px", fontSize:"11px" }} onClick={()=>setConfirmDel(false)}>✕</button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOG SEMANAL
// ═══════════════════════════════════════════════════════════════
function LogSemanal({ spots, emisoras, semana, onAddSpot, onEditSpot, onDeleteSpot, onIncidencia, isSupervisor }) {
  const spotsSemana = spots.filter(s=>s.semana===semana.mon).sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.hora.localeCompare(b.hora));
  const totalCosto  = spotsSemana.reduce((a,s)=>a+Number(s.costo||0),0);
  const creditos    = spotsSemana.filter(s=>s.incidencia==="no_salio");
  const TableHead = () => (
    <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 55px 80px 70px 100px 150px", background:"rgba(255,255,255,0.03)", borderBottom:"2px solid rgba(255,255,255,0.08)", padding:"8px 16px", borderRadius:"10px 10px 0 0" }}>
      {["Hora","Emisora","Tipo","Costo","Crédito","Precio equipo","Status"].map((h,i)=>(
        <div key={i} style={{ fontSize:"10px", fontWeight:"700", color:"#475569", textTransform:"uppercase", letterSpacing:"0.08em" }}>{h}</div>
      ))}
    </div>
  );
  return (
    <div>
      <div style={{ display:"flex", gap:"10px", marginBottom:"22px", flexWrap:"wrap" }}>
        {[
          { label:"Spots semana",   val:spotsSemana.length,                           color:"#818cf8", fmt:"n" },
          { label:"Costo total",    val:totalCosto,                                    color:"#f87171", fmt:"$" },
          { label:"Emisoras",       val:new Set(spotsSemana.map(s=>s.emisoraId)).size, color:"#fbbf24", fmt:"n" },
          { label:"Spots hoy",      val:spotsSemana.filter(s=>s.fecha===TODAY).length, color:"#4ade80", fmt:"n" },
          { label:"Incidencias",    val:spotsSemana.filter(s=>s.incidencia).length,    color:"#fb923c", fmt:"n" },
        ].map(stat=>(
          <div key={stat.label} style={{ flex:1, minWidth:"100px", padding:"12px 16px", borderRadius:"12px", background:`${stat.color}09`, border:`1px solid ${stat.color}20` }}>
            <div style={{ fontSize:"9px", fontWeight:"700", color:stat.color, textTransform:"uppercase", letterSpacing:"0.1em", opacity:0.8, marginBottom:"4px" }}>{stat.label}</div>
            <div style={{ fontSize:"20px", fontWeight:"800", color:stat.color }}>{stat.fmt==="$"?fmtUSD(stat.val):stat.val}</div>
          </div>
        ))}
        <div style={{ display:"flex", alignItems:"center" }}>
          <button style={S.btn("success")} onClick={()=>onAddSpot()}>➕ Agregar spot</button>
        </div>
      </div>
      {creditos.length > 0 && (
        <div style={{ padding:"14px 16px", borderRadius:"12px", background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.2)", marginBottom:"20px" }}>
          <div style={{ fontSize:"11px", fontWeight:"700", color:"#f87171", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"10px" }}>📋 Créditos pendientes ({creditos.length})</div>
          {creditos.map(s=>{
            const em=emisoras.find(e=>e.id===s.emisoraId);
            return (
              <div key={s.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(248,113,113,0.1)" }}>
                <div>
                  <span style={{ fontSize:"13px", fontWeight:"600", color:"#f87171" }}>{em?.nombre}</span>
                  <span style={{ fontSize:"12px", color:"#94a3b8", marginLeft:"10px" }}>{s.dia} {fmtTime(s.hora)} · {s.tipo}</span>
                  {s.incidenciaNota && <div style={{ fontSize:"11px", color:"#64748b", marginTop:"1px" }}>"{s.incidenciaNota}"</div>}
                </div>
                <div style={{ fontSize:"14px", fontWeight:"700", color:"#f87171" }}>-{fmtUSD(s.costo)}</div>
              </div>
            );
          })}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:"8px" }}>
            <span style={{ fontSize:"12px", color:"#f87171", fontWeight:"600" }}>Total créditos</span>
            <span style={{ fontSize:"14px", fontWeight:"800", color:"#f87171" }}>-{fmtUSD(creditos.reduce((a,s)=>a+Number(s.costo||0),0))}</span>
          </div>
        </div>
      )}
      {DAYS.map(dia=>{
        const fecha    = dayOffset(semana.mon,dia);
        const diaSpots = spotsSemana.filter(s=>s.dia===dia);
        const isToday  = fecha===TODAY;
        const isPast   = fecha<TODAY;
        const subtotal = diaSpots.reduce((a,s)=>a+Number(s.costo||0),0);
        return (
          <div key={dia} style={{ marginBottom:"20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
              <div style={{ fontSize:"14px", fontWeight:"700", color:isToday?"#818cf8":isPast?"#475569":"#f1f5f9" }}>
                {dia}{isToday&&<span style={{ marginLeft:"8px", fontSize:"10px", padding:"2px 8px", borderRadius:"10px", background:"rgba(99,102,241,0.15)", color:"#818cf8", border:"1px solid rgba(99,102,241,0.3)", verticalAlign:"middle" }}>HOY</span>}
              </div>
              <div style={{ fontSize:"12px", color:"#475569" }}>{fmtDate(fecha)}</div>
              <div style={{ flex:1, height:"1px", background:"rgba(255,255,255,0.06)" }} />
              {diaSpots.length>0?<div style={{ fontSize:"12px", color:"#64748b" }}>{diaSpots.length} spots · {fmtUSD(subtotal)}</div>:<div style={{ fontSize:"12px", color:"#374151" }}>Sin spots</div>}
              <button style={{ ...S.btn("ghost"), padding:"4px 10px", fontSize:"11px" }} onClick={()=>onAddSpot(dia)}>+ spot</button>
            </div>
            {diaSpots.length>0&&(
              <div style={{ borderRadius:"12px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.07)" }}>
                <TableHead />
                {diaSpots.sort((a,b)=>a.hora.localeCompare(b.hora)).map(sp=>(
                  <SpotRow key={sp.id} spot={sp} emisora={emisoras.find(e=>e.id===sp.emisoraId)} isToday={isToday} onEdit={onEditSpot} onDelete={onDeleteSpot} onIncidencia={onIncidencia} isSupervisor={isSupervisor} />
                ))}
                <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 55px 80px 70px 100px 150px", padding:"8px 16px", background:"rgba(251,191,36,0.05)", borderTop:"1px solid rgba(251,191,36,0.15)" }}>
                  <div style={{ fontSize:"11px", fontWeight:"700", color:"#fbbf24", gridColumn:"1/4" }}>TOTAL {dia.toUpperCase()}</div>
                  <div style={{ fontSize:"13px", fontWeight:"800", color:"#fbbf24" }}>{fmtUSD(subtotal)}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {spotsSemana.length>0&&(
        <div style={{ padding:"16px 20px", borderRadius:"12px", background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.25)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:"14px", fontWeight:"700", color:"#fbbf24" }}>TOTAL SEMANA — {spotsSemana.length} spots</div>
          <div style={{ fontSize:"22px", fontWeight:"800", color:"#fbbf24" }}>{fmtUSD(totalCosto)}</div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// EXPEDIENTE EMISORA — historial, cuentas por pagar, créditos
// ═══════════════════════════════════════════════════════════════
function ExpedienteModal({ emisora, spots, onClose, onEdit, onUpdateSpot }) {
  const [tab, setTab]           = useState("historial");
  const [aplicando, setAplicando] = useState(null); // crédito seleccionado para aplicar
  const [modo, setModo]         = useState(null);   // "spot" | "factura"
  const [spotDestino, setSpotDestino] = useState("");
  const [notaFactura, setNotaFactura] = useState("");
  const [confirm, setConfirm]   = useState(false);

  const todosSpots = spots
    .filter(s => s.emisoraId === emisora.id)
    .sort((a,b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));

  // créditos pendientes = no_salio y sin creditoAplicado
  const creditos  = todosSpots.filter(s => s.incidencia === "no_salio" && !s.creditoAplicado);
  // créditos ya aplicados
  const aplicados = todosSpots.filter(s => s.incidencia === "no_salio" && s.creditoAplicado);
  // spots pendientes de pago (posibles destinos)
  const porPagar  = todosSpots.filter(s => ["pendiente","ordenado","confirmado"].includes(s.status) && s.incidencia !== "no_salio");
  const pagados   = todosSpots.filter(s => s.status === "pagado");

  const totalCreditos   = creditos.reduce((a,s)=>a+Number(s.costo||0),0);
  const totalAplicados  = aplicados.reduce((a,s)=>a+Number(s.costo||0),0);
  const totalPorPagar   = porPagar.reduce((a,s)=>a+Number(s.costo||0),0);
  const totalPagado     = pagados.reduce((a,s)=>a+Number(s.costo||0),0);
  const totalGastado    = todosSpots.filter(s=>s.incidencia!=="no_salio").reduce((a,s)=>a+Number(s.costo||0),0);
  const pctIncidencia   = todosSpots.length > 0 ? (todosSpots.filter(s=>s.incidencia==="no_salio").length / todosSpots.length * 100).toFixed(0) : 0;

  const tabStyle = (a) => ({ padding:"7px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:a?"600":"400", background:a?"rgba(99,102,241,0.15)":"transparent", color:a?"#818cf8":"#64748b", border:a?"1px solid rgba(99,102,241,0.3)":"1px solid transparent", transition:"all 0.15s" });
  const SBadge = ({status}) => { const st=SPOT_STATUS[status]||SPOT_STATUS.pendiente; return <span style={{ ...S.badge(st.color,st.bg,st.border), fontSize:"10px", padding:"2px 7px" }}>{st.label}</span>; };

  const resetAplicar = () => { setAplicando(null); setModo(null); setSpotDestino(""); setNotaFactura(""); setConfirm(false); };

  const handleAplicar = () => {
    if (!aplicando) return;
    if (modo === "spot" && !spotDestino) return;
    if (modo === "factura" && !notaFactura.trim()) return;

    if (modo === "spot") {
      // Descuento en el spot destino: reducir su costo + marcar crédito aplicado
      const dest = spots.find(s => s.id === spotDestino);
      const descuento = Math.min(Number(aplicando.costo||0), Number(dest.costo||0));
      onUpdateSpot({ ...dest, costo: Number(dest.costo||0) - descuento, creditoAplicadoRef: aplicando.id });
    }
    // Marcar el crédito como aplicado en ambos modos
    onUpdateSpot({
      ...aplicando,
      creditoAplicado: true,
      creditoModo: modo,
      creditoRef: modo === "spot" ? spotDestino : null,
      creditoNota: modo === "factura" ? notaFactura : `Aplicado a spot ${spotDestino}`,
      creditoFecha: TODAY,
    });
    resetAplicar();
  };

  // Panel lateral de aplicar crédito
  const PanelAplicar = () => {
    const dest = spots.find(s => s.id === spotDestino);
    const montoCredito = Number(aplicando?.costo||0);
    const montoDestino = Number(dest?.costo||0);
    const descuento    = Math.min(montoCredito, montoDestino);
    const saldoFavor   = montoCredito - descuento;

    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}
        onClick={resetAplicar}>
        <div style={{ background:"#0d1117", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"18px", padding:"26px", maxWidth:"480px", width:"100%", maxHeight:"90vh", overflowY:"auto" }}
          onClick={e=>e.stopPropagation()}>

          <div style={{ fontSize:"17px", fontWeight:"800", color:"#f1f5f9", marginBottom:"4px" }}>💳 Aplicar crédito</div>
          <div style={{ fontSize:"12px", color:"#64748b", marginBottom:"20px" }}>
            {emisora.nombre} · {fmtDate(aplicando?.fecha)} {fmtTime(aplicando?.hora)} · <span style={{ color:"#fb923c", fontWeight:"700" }}>{fmtUSD(montoCredito)}</span>
          </div>

          {/* Modo */}
          <div style={{ marginBottom:"18px" }}>
            <div style={S.label}>¿Cómo aplicar el crédito?</div>
            <div style={{ display:"flex", gap:"10px", marginTop:"8px" }}>
              {[
                { id:"spot",    icon:"🎯", label:"A un spot pendiente", sub:"Descuento directo en el costo" },
                { id:"factura", icon:"📄", label:"Nota de crédito",     sub:"Descuento en próxima factura"  },
              ].map(m=>(
                <div key={m.id} onClick={()=>{ setModo(m.id); setSpotDestino(""); setNotaFactura(""); }}
                  style={{ flex:1, padding:"12px 14px", borderRadius:"10px", cursor:"pointer", border:`2px solid ${modo===m.id?"#818cf8":"rgba(255,255,255,0.08)"}`, background:modo===m.id?"rgba(99,102,241,0.1)":"transparent", transition:"all 0.15s" }}>
                  <div style={{ fontSize:"18px", marginBottom:"4px" }}>{m.icon}</div>
                  <div style={{ fontSize:"13px", fontWeight:"600", color:modo===m.id?"#818cf8":"#94a3b8" }}>{m.label}</div>
                  <div style={{ fontSize:"11px", color:"#475569", marginTop:"2px" }}>{m.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Modo: spot */}
          {modo==="spot" && (
            <div style={{ marginBottom:"16px" }}>
              <div style={S.label}>Selecciona el spot al que se aplicará el descuento</div>
              {porPagar.length === 0
                ? <div style={{ padding:"12px", borderRadius:"9px", background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", fontSize:"12px", color:"#f87171", marginTop:"6px" }}>
                    No hay spots pendientes de pago para esta emisora.
                  </div>
                : (
                  <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginTop:"8px" }}>
                    {porPagar.map(sp=>(
                      <div key={sp.id} onClick={()=>setSpotDestino(sp.id)}
                        style={{ padding:"10px 14px", borderRadius:"9px", cursor:"pointer", border:`2px solid ${spotDestino===sp.id?"#818cf8":"rgba(255,255,255,0.08)"}`, background:spotDestino===sp.id?"rgba(99,102,241,0.1)":"rgba(255,255,255,0.02)", transition:"all 0.15s" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div>
                            <div style={{ fontSize:"13px", fontWeight:"600", color:"#e2e8f0" }}>{fmtDate(sp.fecha)} · {fmtTime(sp.hora)} · {sp.tipo}</div>
                            <div style={{ fontSize:"11px", color:"#64748b", marginTop:"1px" }}>{SPOT_STATUS[sp.status]?.label}</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:"13px", fontWeight:"700", color:"#f87171" }}>{fmtUSD(sp.costo)}</div>
                            {spotDestino===sp.id && (
                              <div style={{ fontSize:"11px", color:"#4ade80", marginTop:"1px" }}>
                                → {fmtUSD(Math.max(0, sp.costo - montoCredito))} después del descuento
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
              {/* Resumen del descuento */}
              {spotDestino && (
                <div style={{ marginTop:"12px", padding:"12px 14px", borderRadius:"9px", background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.2)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", color:"#94a3b8", marginBottom:"3px" }}><span>Costo original del spot</span><span>{fmtUSD(montoDestino)}</span></div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", color:"#4ade80", marginBottom:"3px" }}><span>— Descuento (crédito)</span><span>-{fmtUSD(descuento)}</span></div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"13px", fontWeight:"700", color:"#4ade80", borderTop:"1px solid rgba(74,222,128,0.2)", paddingTop:"6px", marginTop:"3px" }}><span>Costo final del spot</span><span>{fmtUSD(Math.max(0, montoDestino - descuento))}</span></div>
                  {saldoFavor > 0 && (
                    <div style={{ marginTop:"8px", fontSize:"11px", color:"#fb923c" }}>⚠️ Saldo a favor restante: {fmtUSD(saldoFavor)} — se marcará como crédito pendiente</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Modo: factura */}
          {modo==="factura" && (
            <div style={{ marginBottom:"16px" }}>
              <div style={S.label}>Referencia / nota de crédito</div>
              <input style={{ ...S.input, marginTop:"6px" }}
                placeholder="ej. NC-2026-03 · Aplicar en factura de marzo"
                value={notaFactura} onChange={e=>setNotaFactura(e.target.value)} />
              <div style={{ marginTop:"10px", padding:"12px 14px", borderRadius:"9px", background:"rgba(251,146,60,0.07)", border:"1px solid rgba(251,146,60,0.2)" }}>
                <div style={{ fontSize:"12px", color:"#fb923c", fontWeight:"600" }}>📄 Nota de crédito por {fmtUSD(montoCredito)}</div>
                <div style={{ fontSize:"11px", color:"#64748b", marginTop:"3px" }}>Se registrará como descuento pendiente en la próxima factura de {emisora.nombre}.</div>
              </div>
            </div>
          )}

          {/* Botones */}
          <div style={{ display:"flex", gap:"10px", marginTop:"8px" }}>
            <button style={{ ...S.btn("ghost"), flex:1 }} onClick={resetAplicar}>Cancelar</button>
            <button
              style={{ ...S.btn("success"), flex:2, justifyContent:"center", opacity:(!modo || (modo==="spot"&&!spotDestino) || (modo==="factura"&&!notaFactura.trim())) ? 0.4 : 1 }}
              disabled={!modo || (modo==="spot"&&!spotDestino) || (modo==="factura"&&!notaFactura.trim())}
              onClick={handleAplicar}>
              ✅ Aplicar crédito
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, maxWidth:"720px", maxHeight:"88vh" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"18px" }}>
          <div>
            <div style={{ fontSize:"20px", fontWeight:"800", color:"#f1f5f9" }}>📻 {emisora.nombre}</div>
            <div style={{ fontSize:"13px", color:"#60a5fa", marginTop:"2px" }}>{emisora.frecuencia} · {emisora.ciudad} · {emisora.contrato}</div>
            {emisora.vendedor && <div style={{ fontSize:"12px", color:"#64748b", marginTop:"2px" }}>👤 {emisora.vendedor}{emisora.telefono?` · ${emisora.telefono}`:""}</div>}
          </div>
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <button style={{ ...S.btn("ghost"), padding:"6px 12px", fontSize:"12px" }} onClick={onEdit}>✏️ Editar</button>
            <button style={{ ...S.btn("ghost"), padding:"6px 10px", fontSize:"14px" }} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"16px" }}>
          {[
            { label:"Total spots",    val:todosSpots.length,  color:"#818cf8", fmt:"n"   },
            { label:"Total gastado",  val:totalGastado,        color:"#f87171", fmt:"$"   },
            { label:"Por pagar",      val:totalPorPagar,       color:"#fbbf24", fmt:"$"   },
            { label:"Pagado",         val:totalPagado,         color:"#4ade80", fmt:"$"   },
            { label:"Créditos",       val:totalCreditos,       color:"#fb923c", fmt:"$"   },
            { label:"% incidencias",  val:`${pctIncidencia}%`, color:Number(pctIncidencia)>10?"#f87171":Number(pctIncidencia)>5?"#fb923c":"#4ade80", fmt:"raw" },
          ].map(k=>(
            <div key={k.label} style={{ flex:1, minWidth:"90px", padding:"10px 12px", borderRadius:"10px", background:`${k.color}09`, border:`1px solid ${k.color}20` }}>
              <div style={{ fontSize:"9px", fontWeight:"700", color:k.color, textTransform:"uppercase", letterSpacing:"0.08em", opacity:0.8, marginBottom:"3px" }}>{k.label}</div>
              <div style={{ fontSize:"15px", fontWeight:"800", color:k.color }}>{k.fmt==="$"?fmtUSD(k.val):k.val}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:"6px", borderBottom:"1px solid rgba(255,255,255,0.07)", marginBottom:"16px", flexWrap:"wrap" }}>
          <button style={tabStyle(tab==="historial")} onClick={()=>setTab("historial")}>📋 Historial ({todosSpots.length})</button>
          <button style={tabStyle(tab==="porpagar")} onClick={()=>setTab("porpagar")}>
            ⏳ Por pagar ({porPagar.length}){totalPorPagar>0&&<span style={{ marginLeft:"5px", fontSize:"10px", background:"rgba(251,191,36,0.2)", color:"#fbbf24", padding:"1px 6px", borderRadius:"10px" }}>{fmtUSD(totalPorPagar)}</span>}
          </button>
          <button style={tabStyle(tab==="creditos")} onClick={()=>setTab("creditos")}>
            💳 Créditos ({creditos.length}){totalCreditos>0&&<span style={{ marginLeft:"5px", fontSize:"10px", background:"rgba(251,146,60,0.2)", color:"#fb923c", padding:"1px 6px", borderRadius:"10px" }}>{fmtUSD(totalCreditos)}</span>}
          </button>
        </div>

        {/* ── HISTORIAL ── */}
        {tab==="historial" && (
          <div>
            {todosSpots.length===0
              ? <div style={{ textAlign:"center", padding:"40px", color:"#475569" }}>Sin spots registrados</div>
              : (
                <div style={{ borderRadius:"10px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"95px 75px 55px 80px 70px 100px 90px", background:"rgba(255,255,255,0.03)", borderBottom:"2px solid rgba(255,255,255,0.08)", padding:"8px 14px" }}>
                    {["Fecha","Hora","Tipo","Costo","Talento","Precio equipo","Status"].map((h,i)=>(
                      <div key={i} style={{ fontSize:"10px", fontWeight:"700", color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</div>
                    ))}
                  </div>
                  {todosSpots.map((sp,i)=>{
                    const inc = sp.incidencia ? INCIDENCIAS[sp.incidencia] : null;
                    return (
                      <div key={sp.id} style={{ display:"grid", gridTemplateColumns:"95px 75px 55px 80px 70px 100px 90px", padding:"9px 14px", borderBottom:"1px solid rgba(255,255,255,0.04)", background:inc?"rgba(248,113,113,0.04)":i%2===0?"rgba(255,255,255,0.015)":"transparent", alignItems:"center" }}>
                        <div style={{ fontSize:"12px", color:"#94a3b8" }}>{fmtDate(sp.fecha)}</div>
                        <div style={{ fontSize:"12px", color:"#94a3b8" }}>{fmtTime(sp.hora)}</div>
                        <div style={{ fontSize:"11px", color:"#64748b" }}>{sp.tipo}</div>
                        <div style={{ fontSize:"12px", fontWeight:"600", color:"#f87171" }}>{fmtUSD(sp.costo)}</div>
                        <div style={{ fontSize:"12px", color:"#c084fc" }}>{sp.talento>0?fmtUSD(sp.talento):"—"}</div>
                        <div style={{ fontSize:"12px", fontWeight:"600", color:"#fbbf24" }}>{fmtUSD(calcPrecioEquipo(sp))}</div>
                        <div>{inc?<span style={{ ...S.badge(inc.color,inc.bg,inc.border), fontSize:"10px", padding:"2px 6px" }}>{inc.icon}{sp.creditoAplicado?" ✓":""} {inc.label}</span>:<SBadge status={sp.status}/>}</div>
                      </div>
                    );
                  })}
                  <div style={{ display:"grid", gridTemplateColumns:"95px 75px 55px 80px 70px 100px 90px", padding:"9px 14px", background:"rgba(251,191,36,0.06)", borderTop:"2px solid rgba(251,191,36,0.2)", alignItems:"center" }}>
                    <div style={{ fontSize:"11px", fontWeight:"800", color:"#fbbf24", gridColumn:"1/4" }}>TOTAL ({todosSpots.length})</div>
                    <div style={{ fontSize:"12px", fontWeight:"800", color:"#fbbf24" }}>{fmtUSD(totalGastado)}</div>
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* ── POR PAGAR ── */}
        {tab==="porpagar" && (
          <div>
            {porPagar.length===0
              ? <div style={{ textAlign:"center", padding:"40px", color:"#475569" }}>✅ No hay spots pendientes de pago</div>
              : (
                <>
                  <div style={{ padding:"12px 16px", borderRadius:"10px", background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.2)", marginBottom:"14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:"13px", fontWeight:"700", color:"#fbbf24" }}>💳 Total por pagar a {emisora.nombre}</div>
                      <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>{porPagar.length} spots · {totalCreditos>0?<span style={{ color:"#fb923c" }}>Tienes {fmtUSD(totalCreditos)} en créditos disponibles</span>:""}</div>
                    </div>
                    <div style={{ fontSize:"22px", fontWeight:"900", color:"#fbbf24" }}>{fmtUSD(totalPorPagar)}</div>
                  </div>
                  {totalCreditos > 0 && (
                    <div style={{ padding:"10px 14px", borderRadius:"9px", background:"rgba(251,146,60,0.07)", border:"1px solid rgba(251,146,60,0.2)", marginBottom:"14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ fontSize:"12px", color:"#fb923c" }}>💡 Tienes <strong>{fmtUSD(totalCreditos)}</strong> en créditos pendientes — puedes aplicarlos desde la pestaña Créditos</div>
                      <button style={{ ...S.btn("warning"), padding:"5px 12px", fontSize:"11px" }} onClick={()=>setTab("creditos")}>Ver créditos →</button>
                    </div>
                  )}
                  <div style={{ borderRadius:"10px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"100px 75px 55px 80px 110px 100px", background:"rgba(255,255,255,0.03)", borderBottom:"2px solid rgba(255,255,255,0.08)", padding:"8px 14px" }}>
                      {["Fecha","Hora","Tipo","Costo","Precio equipo","Status"].map((h,i)=>(
                        <div key={i} style={{ fontSize:"10px", fontWeight:"700", color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</div>
                      ))}
                    </div>
                    {porPagar.map((sp,i)=>(
                      <div key={sp.id} style={{ display:"grid", gridTemplateColumns:"100px 75px 55px 80px 110px 100px", padding:"9px 14px", borderBottom:"1px solid rgba(255,255,255,0.04)", background:i%2===0?"rgba(255,255,255,0.015)":"transparent", alignItems:"center" }}>
                        <div style={{ fontSize:"12px", color:"#94a3b8" }}>{fmtDate(sp.fecha)}</div>
                        <div style={{ fontSize:"12px", color:"#94a3b8" }}>{fmtTime(sp.hora)}</div>
                        <div style={{ fontSize:"11px", color:"#64748b" }}>{sp.tipo}</div>
                        <div>
                          <div style={{ fontSize:"13px", fontWeight:"600", color:"#f87171" }}>{fmtUSD(sp.costo)}</div>
                          {sp.creditoAplicadoRef && <div style={{ fontSize:"10px", color:"#4ade80", marginTop:"1px" }}>✓ crédito aplicado</div>}
                        </div>
                        <div style={{ fontSize:"13px", fontWeight:"600", color:"#fbbf24" }}>{fmtUSD(calcPrecioEquipo(sp))}</div>
                        <SBadge status={sp.status}/>
                      </div>
                    ))}
                    <div style={{ display:"grid", gridTemplateColumns:"100px 75px 55px 80px 110px 100px", padding:"9px 14px", background:"rgba(251,191,36,0.07)", borderTop:"2px solid rgba(251,191,36,0.2)" }}>
                      <div style={{ fontSize:"11px", fontWeight:"800", color:"#fbbf24", gridColumn:"1/4" }}>TOTAL A PAGAR</div>
                      <div style={{ fontSize:"13px", fontWeight:"800", color:"#fbbf24" }}>{fmtUSD(totalPorPagar)}</div>
                    </div>
                  </div>
                </>
              )
            }
          </div>
        )}

        {/* ── CRÉDITOS ── */}
        {tab==="creditos" && (
          <div>
            {/* Créditos pendientes */}
            {creditos.length === 0 && aplicados.length === 0
              ? <div style={{ textAlign:"center", padding:"40px", color:"#475569" }}>✅ Sin créditos pendientes con esta emisora</div>
              : (
                <>
                  {creditos.length > 0 && (
                    <>
                      <div style={{ padding:"12px 16px", borderRadius:"10px", background:"rgba(251,146,60,0.08)", border:"1px solid rgba(251,146,60,0.25)", marginBottom:"14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontSize:"13px", fontWeight:"700", color:"#fb923c" }}>📋 {emisora.nombre} nos debe — pendientes de aplicar</div>
                          <div style={{ fontSize:"11px", color:"#64748b", marginTop:"2px" }}>{creditos.length} spots no transmitidos</div>
                        </div>
                        <div style={{ fontSize:"22px", fontWeight:"900", color:"#fb923c" }}>{fmtUSD(totalCreditos)}</div>
                      </div>
                      <div style={{ borderRadius:"10px", overflow:"hidden", border:"1px solid rgba(251,146,60,0.2)", marginBottom:"16px" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"95px 70px 50px 75px 1fr 120px", background:"rgba(255,255,255,0.03)", borderBottom:"2px solid rgba(255,255,255,0.08)", padding:"8px 14px" }}>
                          {["Fecha","Hora","Tipo","Crédito","Incidencia",""].map((h,i)=>(
                            <div key={i} style={{ fontSize:"10px", fontWeight:"700", color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em" }}>{h}</div>
                          ))}
                        </div>
                        {creditos.map((sp,i)=>{
                          const inc=INCIDENCIAS[sp.incidencia];
                          return (
                            <div key={sp.id} style={{ display:"grid", gridTemplateColumns:"95px 70px 50px 75px 1fr 120px", padding:"10px 14px", borderBottom:"1px solid rgba(251,146,60,0.1)", background:i%2===0?"rgba(251,146,60,0.04)":"transparent", alignItems:"center" }}>
                              <div style={{ fontSize:"12px", color:"#94a3b8" }}>{fmtDate(sp.fecha)}</div>
                              <div style={{ fontSize:"12px", color:"#94a3b8" }}>{fmtTime(sp.hora)}</div>
                              <div style={{ fontSize:"11px", color:"#64748b" }}>{sp.tipo}</div>
                              <div style={{ fontSize:"13px", fontWeight:"700", color:"#fb923c" }}>{fmtUSD(sp.costo)}</div>
                              <div>
                                <span style={{ ...S.badge(inc.color,inc.bg,inc.border), fontSize:"10px", padding:"2px 7px" }}>{inc.icon} {inc.label}</span>
                                {sp.incidenciaNota && <div style={{ fontSize:"10px", color:"#64748b", marginTop:"2px" }}>"{sp.incidenciaNota}"</div>}
                              </div>
                              <div>
                                <button style={{ ...S.btn("warning"), padding:"5px 10px", fontSize:"11px" }} onClick={()=>{ setAplicando(sp); setModo(null); }}>
                                  💳 Aplicar
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ display:"grid", gridTemplateColumns:"95px 70px 50px 75px 1fr 120px", padding:"9px 14px", background:"rgba(251,146,60,0.1)", borderTop:"2px solid rgba(251,146,60,0.3)" }}>
                          <div style={{ fontSize:"11px", fontWeight:"800", color:"#fb923c", gridColumn:"1/4" }}>PENDIENTES</div>
                          <div style={{ fontSize:"14px", fontWeight:"900", color:"#fb923c" }}>{fmtUSD(totalCreditos)}</div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Créditos ya aplicados */}
                  {aplicados.length > 0 && (
                    <>
                      <div style={{ ...S.sTitle, marginTop:"4px" }}>✅ Créditos ya aplicados</div>
                      <div style={{ borderRadius:"10px", overflow:"hidden", border:"1px solid rgba(74,222,128,0.15)" }}>
                        {aplicados.map((sp,i)=>(
                          <div key={sp.id} style={{ display:"grid", gridTemplateColumns:"95px 70px 50px 75px 1fr", padding:"9px 14px", borderBottom:"1px solid rgba(74,222,128,0.08)", background:i%2===0?"rgba(74,222,128,0.03)":"transparent", alignItems:"center" }}>
                            <div style={{ fontSize:"12px", color:"#64748b" }}>{fmtDate(sp.fecha)}</div>
                            <div style={{ fontSize:"12px", color:"#64748b" }}>{fmtTime(sp.hora)}</div>
                            <div style={{ fontSize:"11px", color:"#475569" }}>{sp.tipo}</div>
                            <div style={{ fontSize:"12px", fontWeight:"600", color:"#4ade80" }}>{fmtUSD(sp.costo)}</div>
                            <div style={{ fontSize:"11px", color:"#64748b" }}>
                              {sp.creditoModo==="spot" ? `🎯 Aplicado a spot · ${sp.creditoNota}` : `📄 Nota de crédito · ${sp.creditoNota}`}
                              {sp.creditoFecha && <span style={{ marginLeft:"8px", color:"#334155" }}>{fmtDate(sp.creditoFecha)}</span>}
                            </div>
                          </div>
                        ))}
                        <div style={{ padding:"8px 14px", background:"rgba(74,222,128,0.06)", borderTop:"1px solid rgba(74,222,128,0.15)", display:"flex", justifyContent:"space-between" }}>
                          <span style={{ fontSize:"11px", fontWeight:"700", color:"#4ade80" }}>TOTAL APLICADO</span>
                          <span style={{ fontSize:"13px", fontWeight:"800", color:"#4ade80" }}>{fmtUSD(totalAplicados)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )
            }
          </div>
        )}

      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// CATÁLOGO EMISORAS
// ═══════════════════════════════════════════════════════════════
function CatalogoEmisoras({ emisoras, spots, onAddEmisora, onEditEmisora, onUpdateSpot }) {
  const activas   = emisoras.filter(e=>e.active);
  const inactivas = emisoras.filter(e=>!e.active);
  const [expediente, setExpediente] = useState(null); // emisora seleccionada para ver expediente
  const ECard = ({e}) => (
    <div style={{ ...S.card, opacity:e.active?1:0.6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
        <div>
          <div style={{ fontSize:"15px", fontWeight:"700", color:"#f1f5f9" }}>{e.nombre}</div>
          <div style={{ fontSize:"13px", color:"#60a5fa", marginTop:"2px" }}>{e.frecuencia} · {e.ciudad}</div>
        </div>
        <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
          {e.active
            ? <span style={S.badge("#4ade80","rgba(74,222,128,0.08)","rgba(74,222,128,0.2)")}>● Activa</span>
            : <span style={S.badge("#475569","rgba(71,85,105,0.08)","rgba(71,85,105,0.2)")}>● Inactiva</span>}
          <button style={{ ...S.btn("indigo"), padding:"5px 10px", fontSize:"12px" }} onClick={()=>setExpediente(e)}>📋 Expediente</button>
          <button style={{ ...S.btn("ghost"), padding:"5px 10px", fontSize:"12px" }} onClick={()=>onEditEmisora(e)}>✏️ Editar</button>
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"10px", marginBottom: e.notas ? "12px" : "0" }}>
        <div style={{ padding:"10px 12px", borderRadius:"9px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize:"10px", color:"#475569", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"3px" }}>📄 Contrato</div>
          <div style={{ fontSize:"13px", color:"#e2e8f0", fontWeight:"600" }}>{e.contrato||"—"}</div>
        </div>
        {e.tarifaBase > 0 && (
          <div style={{ padding:"10px 12px", borderRadius:"9px", background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.15)" }}>
            <div style={{ fontSize:"10px", color:"#fbbf24", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"3px" }}>💵 Tarifa base</div>
            <div style={{ fontSize:"13px", color:"#fbbf24", fontWeight:"700" }}>{fmtUSD(e.tarifaBase)} / spot</div>
          </div>
        )}
        {e.vendedor && (
          <div style={{ padding:"10px 12px", borderRadius:"9px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize:"10px", color:"#475569", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"3px" }}>👤 Vendedor</div>
            <div style={{ fontSize:"13px", color:"#e2e8f0", fontWeight:"600" }}>{e.vendedor}</div>
          </div>
        )}
        {e.telefono && (
          <div style={{ padding:"10px 12px", borderRadius:"9px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize:"10px", color:"#475569", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"3px" }}>📞 Teléfono</div>
            <div style={{ fontSize:"13px", color:"#e2e8f0", fontWeight:"600" }}>{e.telefono}</div>
          </div>
        )}
        {e.email && (
          <div style={{ padding:"10px 12px", borderRadius:"9px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize:"10px", color:"#475569", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"3px" }}>✉️ Correo</div>
            <div style={{ fontSize:"13px", color:"#60a5fa", fontWeight:"600", wordBreak:"break-all" }}>{e.email}</div>
          </div>
        )}
      </div>

      {/* Notas */}
      {e.notas && (
        <div style={{ marginTop:"10px", padding:"10px 12px", borderRadius:"9px", background:"rgba(129,140,248,0.05)", border:"1px solid rgba(129,140,248,0.15)" }}>
          <div style={{ fontSize:"10px", color:"#818cf8", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"3px" }}>📝 Notas</div>
          <div style={{ fontSize:"12px", color:"#94a3b8", lineHeight:1.6 }}>{e.notas}</div>
        </div>
      )}
    </div>
  );
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"18px" }}>
        <div>
          <div style={{ fontSize:"15px", fontWeight:"700", color:"#f1f5f9" }}>Emisoras registradas</div>
          <div style={{ fontSize:"12px", color:"#64748b", marginTop:"2px" }}>{activas.length} activas · {inactivas.length} inactivas</div>
        </div>
        <button style={S.btn("success")} onClick={onAddEmisora}>📻 Nueva emisora</button>
      </div>
      {activas.length>0&&<><div style={S.sTitle}>Activas</div>{activas.map(e=><ECard key={e.id} e={e}/>)}</>}
      {inactivas.length>0&&<><div style={{ ...S.sTitle, marginTop:"16px" }}>Inactivas</div>{inactivas.map(e=><ECard key={e.id} e={e}/>)}</>}

      {/* Modal expediente */}
      {expediente && (
        <ExpedienteModal
          emisora={expediente}
          spots={spots}
          onClose={()=>setExpediente(null)}
          onEdit={()=>{ onEditEmisora(expediente); setExpediente(null); }}
          onUpdateSpot={onUpdateSpot}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FINANZAS
// ═══════════════════════════════════════════════════════════════
function FinanzasTab({ spots, emisoras, semana }) {
  const spotsSemana = spots.filter(s=>s.semana===semana.mon);
  const activos     = spotsSemana.filter(s=>s.incidencia!=="no_salio");
  const creditos    = spotsSemana.filter(s=>s.incidencia==="no_salio");
  const totalNeto   = activos.reduce((a,s)=>a+Number(s.costo||0),0);
  const totalTal    = activos.reduce((a,s)=>a+Number(s.talento||0),0);
  const totalBruto  = totalNeto+totalTal;
  const totalAgen   = totalNeto*0.15;
  const totalEquipo = activos.reduce((a,s)=>a+calcPrecioEquipo(s),0);
  const totalCred   = creditos.reduce((a,s)=>a+Number(s.costo||0),0);
  const SC = ({label,val,color,sub}) => (
    <div style={{ flex:1, minWidth:"120px", padding:"14px 16px", borderRadius:"12px", background:`${color}09`, border:`1px solid ${color}20` }}>
      <div style={{ fontSize:"9px", fontWeight:"700", color, textTransform:"uppercase", letterSpacing:"0.1em", opacity:0.8, marginBottom:"4px" }}>{label}</div>
      <div style={{ fontSize:"18px", fontWeight:"800", color, lineHeight:1 }}>{val}</div>
      {sub&&<div style={{ fontSize:"10px", color, opacity:0.6, marginTop:"2px" }}>{sub}</div>}
    </div>
  );
  const porEmisora = emisoras.map(em=>{
    const ems=activos.filter(s=>s.emisoraId===em.id);
    if(!ems.length) return null;
    return { em, neto:ems.reduce((a,s)=>a+Number(s.costo||0),0), tal:ems.reduce((a,s)=>a+Number(s.talento||0),0), equipo:ems.reduce((a,s)=>a+calcPrecioEquipo(s),0), spots:ems.length };
  }).filter(Boolean);
  return (
    <div>
      <div style={{ ...S.card, marginBottom:"20px" }}>
        <div style={S.sTitle}>💰 Resumen financiero — {fmtDate(semana.mon)} al {fmtDate(semana.sun)}</div>
        <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginBottom:"16px" }}>
          <SC label="Costo neto"      val={fmtUSD(totalNeto)}   color="#f87171" />
          <SC label="Talento"          val={fmtUSD(totalTal)}    color="#c084fc" />
          <SC label="Comisión 15%"     val={fmtUSD(totalAgen)}   color="#fb923c" />
          <SC label="Precio al equipo" val={fmtUSD(totalEquipo)} color="#fbbf24" sub="con overrides" />
          {totalCred>0&&<SC label="Créditos por cobrar" val={fmtUSD(totalCred)} color="#4ade80" sub={`${creditos.length} spots`} />}
        </div>
        <div style={{ padding:"14px 16px", borderRadius:"10px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
          {[
            { label:"Costo neto ("+activos.length+" spots)",  val:totalNeto,            color:"#f87171" },
            { label:"+ Comision agencia 15%",                  val:totalAgen,            color:"#fb923c" },
            { label:"= Neto + comision",                       val:totalNeto+totalAgen,  color:"#94a3b8", div:true },
            { label:"+ Talento (sin comision)",                val:totalTal,             color:"#c084fc" },
            { label:"= Precio base al equipo",                 val:totalNeto*1.15+totalTal, color:"#fbbf24", bold:true },
            { label:"Precio real (con overrides)",             val:totalEquipo,          color:"#4ade80", bold:true },
            { label:"- Creditos por cobrar",                   val:-totalCred,           color:"#f87171" },
            { label:"Costo neto real pagado",                  val:totalNeto-totalCred,  color:"#e2e8f0", bold:true },
          ].map((r,i)=>(
            <div key={i}>
              {r.div&&<div style={{ height:"1px", background:"rgba(255,255,255,0.07)", margin:"6px 0" }} />}
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                <span style={{ fontSize:"12px", color:"#94a3b8" }}>{r.label}</span>
                <span style={{ fontSize:r.bold?"14px":"12px", fontWeight:r.bold?"700":"600", color:r.color }}>{r.val<0?`-${fmtUSD(Math.abs(r.val))}`:fmtUSD(r.val)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={S.card}>
        <div style={S.sTitle}>📻 Desglose por emisora</div>
        <div style={{ borderRadius:"10px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 100px 100px 110px", background:"rgba(255,255,255,0.03)", borderBottom:"2px solid rgba(255,255,255,0.08)", padding:"8px 16px" }}>
            {["Emisora","Spots","Costo neto","Talento","Precio equipo"].map((h,i)=>(
              <div key={h} style={{ fontSize:"10px", fontWeight:"700", color:"#475569", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:i===0?"left":"center" }}>{h}</div>
            ))}
          </div>
          {porEmisora.map(({em,neto,tal,equipo,spots},idx)=>(
            <div key={em.id} style={{ display:"grid", gridTemplateColumns:"1fr 60px 100px 100px 110px", padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)", background:idx%2===0?"rgba(255,255,255,0.015)":"transparent", alignItems:"center" }}>
              <div><div style={{ fontSize:"13px", fontWeight:"600", color:"#e2e8f0" }}>{em.nombre}</div><div style={{ fontSize:"11px", color:"#475569" }}>{em.frecuencia}</div></div>
              <div style={{ textAlign:"center", fontSize:"14px", fontWeight:"700", color:"#818cf8" }}>{spots}</div>
              <div style={{ textAlign:"center", fontSize:"13px", color:"#f87171", fontWeight:"600" }}>{fmtUSD(neto)}</div>
              <div style={{ textAlign:"center", fontSize:"13px", color:"#c084fc", fontWeight:"600" }}>{fmtUSD(tal)}</div>
              <div style={{ textAlign:"center", fontSize:"13px", color:"#fbbf24", fontWeight:"700" }}>{fmtUSD(equipo)}</div>
            </div>
          ))}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 100px 100px 110px", padding:"10px 16px", background:"rgba(251,191,36,0.07)", borderTop:"2px solid rgba(251,191,36,0.2)", alignItems:"center" }}>
            <div style={{ fontSize:"12px", fontWeight:"800", color:"#fbbf24" }}>TOTAL</div>
            <div style={{ textAlign:"center", fontSize:"13px", fontWeight:"800", color:"#fbbf24" }}>{activos.length}</div>
            <div style={{ textAlign:"center", fontSize:"13px", fontWeight:"800", color:"#fbbf24" }}>{fmtUSD(totalNeto)}</div>
            <div style={{ textAlign:"center", fontSize:"13px", fontWeight:"800", color:"#fbbf24" }}>{fmtUSD(totalTal)}</div>
            <div style={{ textAlign:"center", fontSize:"14px", fontWeight:"800", color:"#fbbf24" }}>{fmtUSD(totalEquipo)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SEED LEADS RADIO (atribucion por emisora — campo registrado por vendedor)
// En produccion esto viene del Seller CRM via props desde el Shell
// ═══════════════════════════════════════════════════════════════
function daysAgoStr(n){ const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split("T")[0]; }
function weeksAgoMon(n){ const d=new Date(WEEK.mon+"T12:00:00"); d.setDate(d.getDate()-n*7); return getWeekRange(d.toISOString().split("T")[0]).mon; }

const SEED_LEADS_RADIO = [
  // semana actual
  { id:"RL001", nombre:"Miguel Torres",    emisora:"Radio Hits",  fecha:TODAY,           status:"venta",        salePrice:52000 },
  { id:"RL002", nombre:"Patricia Sanchez", emisora:"Banda 107",   fecha:TODAY,           status:"interesado",   salePrice:0     },
  { id:"RL003", nombre:"Fernando Reyes",   emisora:"Stereo 94",   fecha:daysAgoStr(1),   status:"cita",         salePrice:0     },
  { id:"RL004", nombre:"Rosa Gutierrez",   emisora:"Radio Hits",  fecha:daysAgoStr(1),   status:"venta",        salePrice:61000 },
  { id:"RL005", nombre:"Hector Jimenez",   emisora:"Mix 88",      fecha:daysAgoStr(2),   status:"contactado",   salePrice:0     },
  { id:"RL006", nombre:"Carmen Lopez",     emisora:"Radio Hits",  fecha:daysAgoStr(2),   status:"venta",        salePrice:78000 },
  { id:"RL007", nombre:"Pablo Mendoza",    emisora:"Banda 107",   fecha:daysAgoStr(3),   status:"no_interesado",salePrice:0     },
  { id:"RL008", nombre:"Laura Vasquez",    emisora:"Exitos 102",  fecha:daysAgoStr(3),   status:"nuevo",        salePrice:0     },
  { id:"RL009", nombre:"Andres Mora",      emisora:"Stereo 94",   fecha:daysAgoStr(4),   status:"interesado",   salePrice:0     },
  { id:"RL010", nombre:"Veronica Cruz",    emisora:"Mix 88",      fecha:daysAgoStr(4),   status:"venta",        salePrice:45000 },
  // semana -1
  { id:"RL011", nombre:"Jorge Ibarra",     emisora:"Radio Hits",  fecha:daysAgoStr(8),   status:"venta",        salePrice:55000 },
  { id:"RL012", nombre:"Sofia Pedraza",    emisora:"Radio Hits",  fecha:daysAgoStr(8),   status:"venta",        salePrice:49000 },
  { id:"RL013", nombre:"Roberto Fuentes",  emisora:"Banda 107",   fecha:daysAgoStr(9),   status:"cita",         salePrice:0     },
  { id:"RL014", nombre:"Daniela Rios",     emisora:"Stereo 94",   fecha:daysAgoStr(9),   status:"venta",        salePrice:38000 },
  { id:"RL015", nombre:"Eduardo Salinas",  emisora:"Mix 88",      fecha:daysAgoStr(10),  status:"no_interesado",salePrice:0     },
  { id:"RL016", nombre:"Gloria Mendez",    emisora:"Radio Hits",  fecha:daysAgoStr(10),  status:"interesado",   salePrice:0     },
  { id:"RL017", nombre:"Marcos Tellez",    emisora:"Exitos 102",  fecha:daysAgoStr(11),  status:"venta",        salePrice:42000 },
  { id:"RL018", nombre:"Lucia Vargas",     emisora:"Banda 107",   fecha:daysAgoStr(11),  status:"venta",        salePrice:67000 },
  // semana -2
  { id:"RL019", nombre:"Ricardo Pena",     emisora:"Radio Hits",  fecha:daysAgoStr(15),  status:"venta",        salePrice:71000 },
  { id:"RL020", nombre:"Natalia Soto",     emisora:"Radio Hits",  fecha:daysAgoStr(15),  status:"venta",        salePrice:58000 },
  { id:"RL021", nombre:"Ivan Delgado",     emisora:"Stereo 94",   fecha:daysAgoStr(16),  status:"interesado",   salePrice:0     },
  { id:"RL022", nombre:"Paola Rios",       emisora:"Mix 88",      fecha:daysAgoStr(16),  status:"venta",        salePrice:51000 },
  { id:"RL023", nombre:"Samuel Ortiz",     emisora:"Banda 107",   fecha:daysAgoStr(17),  status:"venta",        salePrice:44000 },
  { id:"RL024", nombre:"Adriana Luna",     emisora:"Radio Hits",  fecha:daysAgoStr(17),  status:"cita",         salePrice:0     },
  { id:"RL025", nombre:"Carlos Medina",    emisora:"Exitos 102",  fecha:daysAgoStr(18),  status:"venta",        salePrice:39000 },
];

// ═══════════════════════════════════════════════════════════════
// ROI TAB
// ═══════════════════════════════════════════════════════════════
function ROITab({ spots, emisoras, leads, semana }) {
  const [periodo, setPeriodo] = useState("semana");
  const [semanaOff, setSemanaOff] = useState(0); // 0=actual, -1=anterior, -2=hace2

  // Seleccionar rango de fechas segun periodo y offset
  function getRango(){
    if(periodo==="semana"){
      const mon = semanaOff===0 ? WEEK.mon : weeksAgoMon(-semanaOff);
      const sun = getWeekRange(mon).sun;
      return { desde:mon, hasta:sun, label: semanaOff===0?"Semana actual":semanaOff===-1?"Semana anterior":"Hace 2 semanas" };
    }
    if(periodo==="mes"){
      const now = new Date();
      const desde = new Date(now.getFullYear(), now.getMonth()-(-semanaOff), 1).toISOString().split("T")[0];
      const hasta = new Date(now.getFullYear(), now.getMonth()-(-semanaOff)+1, 0).toISOString().split("T")[0];
      const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      const mesIdx = (now.getMonth()-(-semanaOff)+12)%12;
      return { desde, hasta, label:"Mes: "+meses[mesIdx] };
    }
    // total
    return { desde:"2000-01-01", hasta:"2099-12-31", label:"Todo el periodo" };
  }

  const rango = getRango();

  // Filtrar por rango
  const spotsR = spots.filter(function(s){ return s.fecha>=rango.desde && s.fecha<=rango.hasta && s.incidencia!=="no_salio"; });
  const leadsR = leads.filter(function(l){ return l.fecha>=rango.desde && l.fecha<=rango.hasta; });

  // Inversion total por emisora (precio al equipo)
  function inversionEmisora(emNombre){
    const em = emisoras.find(function(e){ return e.nombre===emNombre; });
    if(!em) return 0;
    return spotsR.filter(function(s){ return s.emisoraId===em.id; }).reduce(function(a,s){ return a+calcPrecioEquipo(s); },0);
  }

  // Agrupar leads por emisora
  const emNames = [...new Set(leads.map(function(l){ return l.emisora; }))].sort();

  const tablaData = emNames.map(function(emNombre){
    const emLeads  = leadsR.filter(function(l){ return l.emisora===emNombre; });
    const ventas   = emLeads.filter(function(l){ return l.status==="venta"; });
    const inversion= inversionEmisora(emNombre);
    const ingresos = ventas.reduce(function(a,l){ return a+Number(l.salePrice||0); },0);
    const roi      = inversion>0 ? ((ingresos-inversion)/inversion*100) : null;
    const cpl      = emLeads.length>0 && inversion>0 ? inversion/emLeads.length : null;
    const tasa     = emLeads.length>0 ? Math.round(ventas.length/emLeads.length*100) : 0;
    return { emNombre, leads:emLeads.length, ventas:ventas.length, inversion, ingresos, roi, cpl, tasa };
  }).filter(function(r){ return r.leads>0 || r.inversion>0; }).sort(function(a,b){ return b.ingresos-a.ingresos; });

  const totInv = tablaData.reduce(function(a,r){ return a+r.inversion; },0);
  const totLds = tablaData.reduce(function(a,r){ return a+r.leads; },0);
  const totVts = tablaData.reduce(function(a,r){ return a+r.ventas; },0);
  const totIng = tablaData.reduce(function(a,r){ return a+r.ingresos; },0);
  const totROI = totInv>0 ? ((totIng-totInv)/totInv*100) : null;
  const totCPL = totLds>0 && totInv>0 ? totInv/totLds : null;

  // Mejor horario por emisora: spots con mas leads en esa franja
  // Aproximacion: agrupamos spots por hora y cruzamos con leads del mismo dia/emisora
  function mejorHorario(emNombre){
    const em = emisoras.find(function(e){ return e.nombre===emNombre; });
    if(!em) return "--";
    const ems = spotsR.filter(function(s){ return s.emisoraId===em.id; });
    if(!ems.length) return "--";
    // Agrupar por franja horaria
    const franjas = {};
    ems.forEach(function(s){
      const h = parseInt(s.hora||"0");
      var franja;
      if(h>=5&&h<12)  franja="Manana (5-12h)";
      else if(h>=12&&h<18) franja="Tarde (12-18h)";
      else franja="Noche (18-24h)";
      if(!franjas[franja]) franjas[franja]=0;
      franjas[franja]++;
    });
    return Object.entries(franjas).sort(function(a,b){ return b[1]-a[1]; })[0][0];
  }

  // Comparativo con semana anterior
  function getRangoAnterior(){
    if(periodo==="semana"){
      const mon = weeksAgoMon(-semanaOff+1);
      const sun = getWeekRange(mon).sun;
      return { desde:mon, hasta:sun };
    }
    if(periodo==="mes"){
      const now = new Date();
      const desde = new Date(now.getFullYear(), now.getMonth()-(-semanaOff)-1, 1).toISOString().split("T")[0];
      const hasta = new Date(now.getFullYear(), now.getMonth()-(-semanaOff), 0).toISOString().split("T")[0];
      return { desde, hasta };
    }
    return null;
  }
  const rangoAnt = getRangoAnterior();
  const leadsAnt = rangoAnt ? leads.filter(function(l){ return l.fecha>=rangoAnt.desde&&l.fecha<=rangoAnt.hasta; }) : [];
  const ventasAnt = leadsAnt.filter(function(l){ return l.status==="venta"; });
  const spotsAnt  = rangoAnt ? spots.filter(function(s){ return s.fecha>=rangoAnt.desde&&s.fecha<=rangoAnt.hasta&&s.incidencia!=="no_salio"; }) : [];
  const invAnt    = spotsAnt.reduce(function(a,s){ return a+calcPrecioEquipo(s); },0);
  const ingAnt    = ventasAnt.reduce(function(a,l){ return a+Number(l.salePrice||0); },0);

  function delta(curr, prev){
    if(!prev) return null;
    const pct = Math.round((curr-prev)/prev*100);
    return { pct, up: pct>=0 };
  }

  const ROI_COLOR = function(roi){ return roi===null?"#64748b":roi>=300?"#4ade80":roi>=100?"#fbbf24":roi>=0?"#fb923c":"#f87171"; };

  function SC(props){
    var d = props.delta;
    return (
      <div style={{ flex:1, minWidth:"130px", padding:"14px 16px", borderRadius:"12px", background:props.color+"09", border:"1px solid "+props.color+"20" }}>
        <div style={{ fontSize:"9px", fontWeight:"700", color:props.color, textTransform:"uppercase", letterSpacing:"0.1em", opacity:0.8, marginBottom:"4px" }}>{props.label}</div>
        <div style={{ fontSize:"20px", fontWeight:"800", color:props.color, lineHeight:1 }}>{props.val}</div>
        {d&&<div style={{ fontSize:"10px", color:d.up?"#4ade80":"#f87171", marginTop:"3px", fontWeight:"600" }}>{d.up?"+":""}{d.pct}% vs anterior</div>}
      </div>
    );
  }

  const hdCell = function(txt, right){ return { fontSize:"10px", fontWeight:"700", color:"#475569", textTransform:"uppercase", letterSpacing:"0.07em", textAlign:right?"right":"left" }; };
  const cols = "2fr 60px 60px 110px 120px 90px 90px 130px";

  return (
    <div>
      {/* Controles de periodo */}
      <div style={{ display:"flex", gap:"8px", marginBottom:"20px", flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:"4px" }}>
          {[["semana","Semana"],["mes","Mes"],["total","Total"]].map(function(p){
            return (
              <button key={p[0]} style={S.tab(periodo===p[0])} onClick={function(){ setPeriodo(p[0]); setSemanaOff(0); }}>{p[1]}</button>
            );
          })}
        </div>
        {periodo!=="total"&&(
          <div style={{ display:"flex", gap:"4px", marginLeft:"8px", alignItems:"center" }}>
            <button style={{ ...S.btn("ghost"), padding:"5px 10px" }} onClick={function(){ setSemanaOff(function(p){ return p-1; }); }}>←</button>
            <span style={{ fontSize:"12px", color:"#94a3b8", minWidth:"140px", textAlign:"center" }}>{rango.label}</span>
            <button style={{ ...S.btn("ghost"), padding:"5px 10px", opacity:semanaOff>=0?0.3:1 }} onClick={function(){ setSemanaOff(function(p){ return Math.min(0,p+1); }); }} disabled={semanaOff>=0}>→</button>
          </div>
        )}
        <div style={{ marginLeft:"auto", fontSize:"11px", color:"#475569" }}>{rango.desde} al {rango.hasta}</div>
      </div>

      {/* KPIs globales */}
      <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginBottom:"18px" }}>
        <SC label="Inversion total"  val={fmtUSD(totInv)}                              color="#f87171" delta={rangoAnt?delta(totInv,invAnt):null}/>
        <SC label="Leads generados"  val={String(totLds)}                               color="#60a5fa" delta={rangoAnt?delta(totLds,leadsAnt.length):null}/>
        <SC label="Ventas cerradas"  val={String(totVts)}                               color="#4ade80" delta={rangoAnt?delta(totVts,ventasAnt.length):null}/>
        <SC label="Ingresos ventas"  val={fmtUSD(totIng)}                              color="#fbbf24" delta={rangoAnt?delta(totIng,ingAnt):null}/>
        <SC label="ROI"              val={totROI!==null?(Math.round(totROI)+"%"):"--"}  color={ROI_COLOR(totROI)}/>
        <SC label="Costo por lead"   val={totCPL!==null?fmtUSD(totCPL):"--"}           color="#a78bfa"/>
      </div>

      {/* Tabla por emisora */}
      <div style={S.card}>
        <div style={S.sTitle}>ROI por emisora — {rango.label}</div>
        <div style={{ borderRadius:"10px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.07)" }}>
          {/* Header */}
          <div style={{ display:"grid", gridTemplateColumns:cols, padding:"9px 16px", background:"rgba(255,255,255,0.03)", borderBottom:"2px solid rgba(255,255,255,0.08)", gap:"8px" }}>
            {[["Emisora",false],["Leads",true],["Ventas",true],["Inversion",true],["Ingresos",true],["Tasa %",true],["CPL",true],["ROI",true]].map(function(h){
              return <div key={h[0]} style={hdCell(h[0],h[1])}>{h[0]}</div>;
            })}
          </div>
          {/* Filas */}
          {tablaData.length===0&&(
            <div style={{ padding:"24px", textAlign:"center", color:"#475569", fontSize:"13px" }}>Sin datos para este periodo</div>
          )}
          {tablaData.map(function(r, idx){
            var roiColor = ROI_COLOR(r.roi);
            return (
              <div key={r.emNombre} style={{ display:"grid", gridTemplateColumns:cols, padding:"11px 16px", borderBottom:"1px solid rgba(255,255,255,0.04)", background:idx%2===0?"rgba(255,255,255,0.012)":"transparent", gap:"8px", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:"600", color:"#e2e8f0" }}>{r.emNombre}</div>
                  <div style={{ fontSize:"10px", color:"#475569", marginTop:"2px" }}>Mejor horario: {mejorHorario(r.emNombre)}</div>
                </div>
                <div style={{ textAlign:"right", fontSize:"14px", fontWeight:"700", color:"#60a5fa" }}>{r.leads}</div>
                <div style={{ textAlign:"right", fontSize:"14px", fontWeight:"700", color:"#4ade80" }}>{r.ventas}</div>
                <div style={{ textAlign:"right", fontSize:"13px", color:"#f87171", fontWeight:"600" }}>{fmtUSD(r.inversion)}</div>
                <div style={{ textAlign:"right", fontSize:"13px", color:"#fbbf24", fontWeight:"700" }}>{r.ingresos>0?fmtUSD(r.ingresos):"--"}</div>
                <div style={{ textAlign:"right" }}>
                  <span style={{ fontSize:"12px", fontWeight:"700", padding:"2px 8px", borderRadius:"20px", background:r.tasa>=30?"rgba(74,222,128,0.12)":"rgba(248,113,113,0.08)", color:r.tasa>=30?"#4ade80":"#f87171" }}>{r.tasa}%</span>
                </div>
                <div style={{ textAlign:"right", fontSize:"12px", color:"#a78bfa", fontWeight:"600" }}>{r.cpl!==null?fmtUSD(r.cpl):"--"}</div>
                <div style={{ textAlign:"right" }}>
                  <span style={{ fontSize:"13px", fontWeight:"800", color:roiColor }}>{r.roi!==null?(Math.round(r.roi)+"%"):"--"}</span>
                </div>
              </div>
            );
          })}
          {/* Total */}
          {tablaData.length>0&&(
            <div style={{ display:"grid", gridTemplateColumns:cols, padding:"11px 16px", background:"rgba(251,191,36,0.06)", borderTop:"2px solid rgba(251,191,36,0.2)", gap:"8px", alignItems:"center" }}>
              <div style={{ fontSize:"12px", fontWeight:"800", color:"#fbbf24" }}>TOTAL</div>
              <div style={{ textAlign:"right", fontSize:"14px", fontWeight:"800", color:"#60a5fa" }}>{totLds}</div>
              <div style={{ textAlign:"right", fontSize:"14px", fontWeight:"800", color:"#4ade80" }}>{totVts}</div>
              <div style={{ textAlign:"right", fontSize:"13px", fontWeight:"800", color:"#f87171" }}>{fmtUSD(totInv)}</div>
              <div style={{ textAlign:"right", fontSize:"13px", fontWeight:"800", color:"#fbbf24" }}>{fmtUSD(totIng)}</div>
              <div style={{ textAlign:"right", fontSize:"12px", fontWeight:"800", color:totVts>0?"#4ade80":"#f87171" }}>{totLds>0?Math.round(totVts/totLds*100):0}%</div>
              <div style={{ textAlign:"right", fontSize:"12px", fontWeight:"800", color:"#a78bfa" }}>{totCPL!==null?fmtUSD(totCPL):"--"}</div>
              <div style={{ textAlign:"right", fontSize:"14px", fontWeight:"800", color:ROI_COLOR(totROI) }}>{totROI!==null?(Math.round(totROI)+"%"):"--"}</div>
            </div>
          )}
        </div>
        <div style={{ marginTop:"10px", fontSize:"10px", color:"#334155" }}>
          CPL = Costo por lead (inversion / leads). ROI = (ingresos - inversion) / inversion x 100. Tasa = ventas / leads.
        </div>
      </div>

      {/* Comparativo semanal rapido */}
      {rangoAnt&&leadsAnt.length>0&&(
        <div style={S.card}>
          <div style={S.sTitle}>Comparativo vs periodo anterior</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"10px" }}>
            {[
              { label:"Leads", curr:totLds,   prev:leadsAnt.length,     color:"#60a5fa", fmt:function(v){return String(v);} },
              { label:"Ventas",curr:totVts,   prev:ventasAnt.length,    color:"#4ade80", fmt:function(v){return String(v);} },
              { label:"Inv.",  curr:totInv,   prev:invAnt,              color:"#f87171", fmt:fmtUSD },
              { label:"Ingr.", curr:totIng,   prev:ingAnt,              color:"#fbbf24", fmt:fmtUSD },
            ].map(function(c){
              var d = delta(c.curr,c.prev);
              return (
                <div key={c.label} style={{ padding:"12px 14px", borderRadius:"10px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize:"10px", color:"#475569", fontWeight:"700", textTransform:"uppercase", marginBottom:"6px" }}>{c.label}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                    <div>
                      <div style={{ fontSize:"10px", color:"#475569", marginBottom:"2px" }}>Anterior</div>
                      <div style={{ fontSize:"13px", color:"#64748b", fontWeight:"600" }}>{c.fmt(c.prev)}</div>
                    </div>
                    <div style={{ fontSize:"18px", color:d&&d.up?"#4ade80":"#f87171", fontWeight:"700" }}>{d?(d.up?"+":"")+d.pct+"%":"--"}</div>
                    <div>
                      <div style={{ fontSize:"10px", color:"#475569", marginBottom:"2px" }}>Actual</div>
                      <div style={{ fontSize:"13px", color:c.color, fontWeight:"700" }}>{c.fmt(c.curr)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INSIGHTS AI
// ═══════════════════════════════════════════════════════════════


function InsightsAI({ spots, emisoras, semana }) {
  const [loading,setLoading]=useState(false);
  const [insights,setInsights]=useState(null);
  const [error,setError]=useState(null);
  const [lastRun,setLastRun]=useState(null);
  const TIPO_CFG = {
    continuar:{icon:"✅",color:"#4ade80",bg:"rgba(74,222,128,0.08)",border:"rgba(74,222,128,0.2)"},
    pausar:{icon:"🛑",color:"#f87171",bg:"rgba(248,113,113,0.08)",border:"rgba(248,113,113,0.2)"},
    incrementar:{icon:"📈",color:"#818cf8",bg:"rgba(129,140,248,0.08)",border:"rgba(129,140,248,0.2)"},
    ajustar:{icon:"🔧",color:"#fbbf24",bg:"rgba(251,191,36,0.08)",border:"rgba(251,191,36,0.2)"},
    alerta:{icon:"⚠️",color:"#fb923c",bg:"rgba(251,146,60,0.08)",border:"rgba(251,146,60,0.2)"},
  };
  const scoreColor = s=>s>=70?"#4ade80":s>=50?"#fbbf24":"#f87171";
  const runAnalysis = async () => {
    setLoading(true); setError(null); setInsights(null);
    try {
      const ss = spots.filter(s=>s.semana===semana.mon&&s.incidencia!=="no_salio");
      const emStats = emisoras.filter(e=>e.active).map(em=>{
        const es=ss.filter(s=>s.emisoraId===em.id);
        if(!es.length) return null;
        return {emisora:em.nombre,frecuencia:em.frecuencia,spots:es.length,costoNeto:es.reduce((a,s)=>a+Number(s.costo||0),0).toFixed(2),horarios:es.map(s=>s.hora).sort()};
      }).filter(Boolean);
      const hm={};
      ss.forEach(s=>{
        const h=parseInt(s.hora.split(":")[0]);
        const b=h<9?"Mañana (6-9am)":h<12?"Media mañana (9-12pm)":h<15?"Mediodía (12-3pm)":h<18?"Tarde (3-6pm)":"Noche (6-10pm)";
        if(!hm[b]) hm[b]={spots:0,costo:0};
        hm[b].spots++; hm[b].costo+=Number(s.costo||0);
      });
      const prompt=`Eres experto en marketing de radio para clubes vacacionales. Analiza los datos de pauta y genera recomendaciones en español.\nSEMANA:${semana.mon} al ${semana.sun}\nEMISORASTATS:${JSON.stringify(emStats)}\nHORARIOS:${JSON.stringify(hm)}\nCONTEXTO:Mini-vacs. Costo mercadeo ideal<35%. Conversión típica 15-25%.\nResponde SOLO JSON válido (sin markdown):\n{"resumen":"string","scoreGeneral":75,"recomendaciones":[{"tipo":"continuar|pausar|incrementar|ajustar|alerta","emisora":"string|null","titulo":"string","detalle":"string","impacto":"alto|medio|bajo","accion":"string"}],"mejorHorario":"string","peorHorario":"string","insight_vendedores":"string","proyeccion":"string"}`;
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      const text=data.content?.find(b=>b.type==="text")?.text||"";
      setInsights(JSON.parse(text.replace(/```json|```/g,"").trim()));
      setLastRun(new Date().toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}));
    } catch(e) { setError("No se pudo generar el análisis. Intenta de nuevo."); }
    setLoading(false);
  };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"24px" }}>
        <div>
          <div style={{ fontSize:"17px", fontWeight:"800", color:"#f1f5f9", marginBottom:"4px" }}>💡 Insights AI</div>
          <div style={{ fontSize:"12px", color:"#64748b" }}>Análisis inteligente · {fmtDate(semana.mon)} al {fmtDate(semana.sun)}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"5px" }}>
          <button style={{ ...S.btn("indigo"), opacity:loading?0.7:1 }} onClick={runAnalysis} disabled={loading}>{loading?"⏳ Analizando…":insights?"🔄 Actualizar":"✨ Generar análisis"}</button>
          {lastRun&&<div style={{ fontSize:"11px", color:"#475569" }}>Último: {lastRun}</div>}
        </div>
      </div>
      {!insights&&!loading&&!error&&(
        <div style={{ textAlign:"center", padding:"60px 40px", background:"rgba(255,255,255,0.02)", borderRadius:"16px", border:"2px dashed rgba(129,140,248,0.2)" }}>
          <div style={{ fontSize:"48px", marginBottom:"16px" }}>🤖</div>
          <div style={{ fontSize:"16px", fontWeight:"700", color:"#f1f5f9", marginBottom:"8px" }}>Análisis de pauta con IA</div>
          <div style={{ fontSize:"13px", color:"#64748b", maxWidth:"380px", margin:"0 auto", lineHeight:1.6 }}>Claude analiza cada emisora y horario para decirte qué pausar, qué incrementar y dónde está el retorno.</div>
          <button style={{ ...S.btn("indigo"), marginTop:"20px" }} onClick={runAnalysis}>✨ Generar análisis</button>
        </div>
      )}
      {loading&&<div style={{ textAlign:"center", padding:"60px" }}><div style={{ fontSize:"32px", marginBottom:"14px" }}>⚙️</div><div style={{ fontSize:"14px", fontWeight:"600", color:"#818cf8" }}>Analizando pauta…</div></div>}
      {error&&<div style={{ padding:"14px 18px", borderRadius:"12px", background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)", color:"#f87171", marginBottom:"16px" }}>⚠️ {error}</div>}
      {insights&&!loading&&(
        <>
          <div style={{ display:"flex", gap:"14px", marginBottom:"18px", flexWrap:"wrap" }}>
            <div style={{ padding:"18px 22px", borderRadius:"14px", background:`${scoreColor(insights.scoreGeneral)}0d`, border:`2px solid ${scoreColor(insights.scoreGeneral)}33`, display:"flex", alignItems:"center", gap:"16px", minWidth:"200px" }}>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:"40px", fontWeight:"900", color:scoreColor(insights.scoreGeneral), lineHeight:1 }}>{insights.scoreGeneral}</div>
                <div style={{ fontSize:"10px", color:scoreColor(insights.scoreGeneral), fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.08em" }}>Score</div>
              </div>
              <div style={{ flex:1, fontSize:"13px", color:"#94a3b8", lineHeight:1.6 }}>{insights.resumen}</div>
            </div>
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"8px", minWidth:"220px" }}>
              {insights.mejorHorario&&<div style={{ padding:"10px 14px", borderRadius:"10px", background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.2)" }}><div style={{ fontSize:"10px", fontWeight:"700", color:"#4ade80", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"2px" }}>⏰ Mejor horario</div><div style={{ fontSize:"12px", color:"#94a3b8" }}>{insights.mejorHorario}</div></div>}
              {insights.peorHorario&&<div style={{ padding:"10px 14px", borderRadius:"10px", background:"rgba(248,113,113,0.07)", border:"1px solid rgba(248,113,113,0.2)" }}><div style={{ fontSize:"10px", fontWeight:"700", color:"#f87171", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"2px" }}>⏰ A revisar</div><div style={{ fontSize:"12px", color:"#94a3b8" }}>{insights.peorHorario}</div></div>}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"18px" }}>
            {insights.proyeccion&&<div style={{ padding:"12px 16px", borderRadius:"10px", background:"rgba(99,102,241,0.07)", border:"1px solid rgba(99,102,241,0.2)" }}><div style={{ fontSize:"10px", fontWeight:"700", color:"#818cf8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"4px" }}>📊 Proyección</div><div style={{ fontSize:"12px", color:"#94a3b8", lineHeight:1.6 }}>{insights.proyeccion}</div></div>}
            {insights.insight_vendedores&&<div style={{ padding:"12px 16px", borderRadius:"10px", background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.2)" }}><div style={{ fontSize:"10px", fontWeight:"700", color:"#fbbf24", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"4px" }}>👥 Vendedores</div><div style={{ fontSize:"12px", color:"#94a3b8", lineHeight:1.6 }}>{insights.insight_vendedores}</div></div>}
          </div>
          <div style={S.sTitle}>🎯 Recomendaciones — {insights.recomendaciones?.length}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {insights.recomendaciones?.map((rec,i)=>{
              const tc=TIPO_CFG[rec.tipo]||TIPO_CFG.ajustar;
              return (
                <div key={i} style={{ padding:"16px 20px", borderRadius:"12px", background:tc.bg, border:`1px solid ${tc.border}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                      <span style={{ fontSize:"20px" }}>{tc.icon}</span>
                      <div>
                        <div style={{ fontSize:"14px", fontWeight:"700", color:"#f1f5f9" }}>{rec.titulo}</div>
                        {rec.emisora&&<div style={{ fontSize:"11px", color:tc.color, marginTop:"1px" }}>📻 {rec.emisora}</div>}
                      </div>
                    </div>
                    <span style={{ fontSize:"10px", padding:"2px 9px", borderRadius:"20px", fontWeight:"700", color:rec.impacto==="alto"?"#f87171":rec.impacto==="medio"?"#fbbf24":"#64748b", background:`${rec.impacto==="alto"?"#f87171":rec.impacto==="medio"?"#fbbf24":"#64748b"}15`, border:`1px solid ${rec.impacto==="alto"?"rgba(248,113,113,0.3)":rec.impacto==="medio"?"rgba(251,191,36,0.3)":"rgba(100,116,139,0.3)"}`, whiteSpace:"nowrap" }}>
                      {rec.impacto==="alto"?"Alto":rec.impacto==="medio"?"Medio":"Bajo"}
                    </span>
                  </div>
                  <div style={{ fontSize:"13px", color:"#94a3b8", lineHeight:1.6, marginBottom:"10px" }}>{rec.detalle}</div>
                  <div style={{ padding:"8px 12px", borderRadius:"8px", background:"rgba(0,0,0,0.2)", border:`1px solid ${tc.color}22` }}>
                    <span style={{ fontSize:"11px", fontWeight:"700", color:tc.color }}>→ ACCIÓN: </span>
                    <span style={{ fontSize:"12px", color:"#e2e8f0" }}>{rec.accion}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:"16px", padding:"10px 14px", borderRadius:"10px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", fontSize:"11px", color:"#374151", textAlign:"center" }}>Análisis generado por IA. Valida con tu criterio antes de tomar decisiones de pauta.</div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT — sin topbar propio, listo para el shell
// ═══════════════════════════════════════════════════════════════
export default function RadioModule({ isSupervisor = true }) {
  const [spots,    setSpots]    = useState(SEED_SPOTS);
  const [emisoras, setEmisoras] = useState(SEED_EMISORAS);
  const [tab,      setTab]      = useState("log");
  const [semana,   setSemana]   = useState(WEEK);
  const [modal,    setModal]    = useState(null);
  const [incModal, setIncModal] = useState(null);
  const [toast,    setToast]    = useState(null);
  const [dbReady,  setDbReady]  = useState(false);

  // ── Carga inicial desde Supabase ──────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [resE, resS] = await Promise.all([
        _sb.from("emisoras").select("*").order("nombre"),
        _sb.from("radio_spots").select("*, emisoras(nombre)").order("fecha", { ascending: false })
      ]);
      if (resE.data && resE.data.length > 0) {
        // Normalizar campos de Supabase al formato que usa el UI
        const emNorm = resE.data.map(e => ({
          id:          e.id,
          nombre:      e.nombre,
          frecuencia:  e.frecuencia  || "",
          ciudad:      e.ciudad      || "",
          contrato:    e.contrato    || "",
          active:      e.activo,
          vendedor:    e.vendedor    || "",
          telefono:    e.telefono    || "",
          email:       e.email       || "",
          tarifaBase:  Number(e.tarifa_base || 0),
          notas:       e.notas       || "",
        }));
        setEmisoras(emNorm);
      }
      if (resS.data && resS.data.length > 0) {
        const spNorm = resS.data.map(s => ({
          id:                   s.id,
          emisoraId:            s.emisora_id,
          dia:                  s.dia_semana  || "",
          fecha:                s.fecha       || "",
          hora:                 s.hora        || "",
          tipo:                 s.tipo        || "60seg",
          costo:                Number(s.costo   || 0),
          talento:              Number(s.talento || 0),
          contrato:             s.contrato    || "",
          status:               "confirmado",
          incidencia:           s.incidencia  || null,
          incidenciaNota:       s.incidencia_nota || "",
          precioEquipoOverride: s.precio_equipo_override != null ? Number(s.precio_equipo_override) : null,
          semana:               s.fecha ? getWeekRange(s.fecha).mon : WEEK.mon,
        }));
        setSpots(spNorm);
      }
      setDbReady(true);
    } catch(e) {
      console.error("[Radio] Error cargando Supabase, usando seed:", e);
      setDbReady(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const notify = (msg,ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };
  const isCurrentWeek = semana.mon===WEEK.mon;
  const prevWeek = () => { const d=new Date(semana.mon+"T12:00:00"); d.setDate(d.getDate()-7); setSemana(getWeekRange(d.toISOString().split("T")[0])); };
  const nextWeek = () => { const d=new Date(semana.mon+"T12:00:00"); d.setDate(d.getDate()+7); setSemana(getWeekRange(d.toISOString().split("T")[0])); };

  // ── Spots ─────────────────────────────────────────────────────
  const handleSaveSpot = async (draft) => {
    try {
      const row = {
        emisora_id:              draft.emisoraId,
        fecha:                   draft.fecha || dayOffset(semana.mon, draft.dia),
        dia_semana:              draft.dia,
        hora:                    draft.hora,
        tipo:                    draft.tipo,
        costo:                   Number(draft.costo   || 0),
        talento:                 Number(draft.talento || 0),
        contrato:                draft.contrato || "",
        incidencia:              draft.incidencia || null,
        incidencia_nota:         draft.incidenciaNota || "",
        precio_equipo_override:  draft.precioEquipoOverride != null ? Number(draft.precioEquipoOverride) : null,
      };
      if (modal?.spot) {
        // UPDATE
        await _sb.from("radio_spots").update(row).eq("id", draft.id);
        setSpots(p => p.map(s => s.id===draft.id ? {...draft} : s));
        notify("Spot actualizado");
      } else {
        // INSERT
        const { data } = await _sb.from("radio_spots").insert(row).select().single();
        const newSpot = { ...draft, id: data ? data.id : uid("SP"), incidencia:null, incidenciaNota:"" };
        setSpots(p => [...p, newSpot]);
        notify("Spot agregado");
      }
    } catch(e) {
      console.error("[Radio] handleSaveSpot:", e);
      // Fallback local si Supabase falla
      if (modal?.spot) { setSpots(p=>p.map(s=>s.id===draft.id?draft:s)); }
      else             { setSpots(p=>[...p,{...draft,id:uid("SP"),incidencia:null,incidenciaNota:""}]); }
      notify("Spot guardado (modo local)");
    }
    setModal(null);
  };

  const handleSaveIncidencia = async (updated) => {
    try {
      await _sb.from("radio_spots").update({
        incidencia:      updated.incidencia || null,
        incidencia_nota: updated.incidenciaNota || "",
      }).eq("id", updated.id);
    } catch(e) { console.error("[Radio] handleSaveIncidencia:", e); }
    setSpots(p => p.map(s => s.id===updated.id ? updated : s));
    notify(updated.incidencia ? "Incidencia registrada" : "Incidencia removida");
    setIncModal(null);
  };

  const handleDeleteSpot = async (id) => {
    try {
      await _sb.from("radio_spots").delete().eq("id", id);
    } catch(e) { console.error("[Radio] handleDeleteSpot:", e); }
    setSpots(p => p.filter(s => s.id !== id));
    notify("Spot eliminado");
  };

  // ── Emisoras ──────────────────────────────────────────────────
  const handleSaveEmisora = async (draft) => {
    try {
      const row = {
        nombre:       draft.nombre,
        frecuencia:   draft.frecuencia  || null,
        ciudad:       draft.ciudad      || null,
        contrato:     draft.contrato    || null,
        activo:       draft.active !== false,
        vendedor:     draft.vendedor    || null,
        telefono:     draft.telefono    || null,
        email:        draft.email       || null,
        tarifa_base:  Number(draft.tarifaBase || 0),
        notas:        draft.notas       || null,
      };
      if (modal?.emisora) {
        await _sb.from("emisoras").update(row).eq("id", draft.id);
        setEmisoras(p => p.map(e => e.id===draft.id ? {...draft} : e));
        notify("Emisora actualizada");
      } else {
        const { data } = await _sb.from("emisoras").insert(row).select().single();
        setEmisoras(p => [...p, { ...draft, id: data ? data.id : uid("E") }]);
        notify("Emisora agregada");
      }
    } catch(e) {
      console.error("[Radio] handleSaveEmisora:", e);
      if (modal?.emisora) { setEmisoras(p=>p.map(e=>e.id===draft.id?draft:e)); }
      else                { setEmisoras(p=>[...p,{...draft,id:uid("E")}]); }
      notify("Emisora guardada (modo local)");
    }
    setModal(null);
  };
  return (
    <div style={S.wrap}>
      {/* Header del módulo */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px", flexWrap:"wrap", gap:"12px" }}>
        <div>
          <div style={{ fontSize:"20px", fontWeight:"800", color:"#f1f5f9" }}>Radio</div>
          <div style={{ display:"flex", gap:"8px", alignItems:"center", marginTop:"2px" }}>
            <div style={{ fontSize:"12px", color:"#64748b" }}>Gestion de pauta, emisoras y analisis - X Travel Group - Miami, USA</div>
            <span style={{ fontSize:"10px", padding:"1px 8px", borderRadius:"20px", fontWeight:"700",
              background: dbReady ? "rgba(16,185,129,0.1)" : "rgba(251,191,36,0.1)",
              color:       dbReady ? "#10b981"              : "#fbbf24",
              border:      dbReady ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(251,191,36,0.25)" }}>
              {dbReady ? "Supabase" : "Seed local"}
            </span>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <button style={{ ...S.btn("ghost"), padding:"6px 10px" }} onClick={prevWeek}>←</button>
          <div style={{ textAlign:"center", minWidth:"180px" }}>
            <div style={{ fontSize:"12px", fontWeight:"600", color:"#e2e8f0" }}>{fmtDate(semana.mon)} — {fmtDate(semana.sun)}</div>
            {isCurrentWeek&&<div style={{ fontSize:"10px", color:"#818cf8", marginTop:"1px" }}>Semana actual</div>}
          </div>
          <button style={{ ...S.btn("ghost"), padding:"6px 10px", opacity:isCurrentWeek?0.35:1 }} onClick={nextWeek} disabled={isCurrentWeek}>→</button>
          {!isCurrentWeek&&<button style={{ ...S.btn("indigo"), padding:"5px 10px", fontSize:"11px" }} onClick={()=>setSemana(WEEK)}>Hoy</button>}
        </div>
      </div>
      {/* Tabs */}
      <div style={{ display:"flex", gap:"8px", borderBottom:"1px solid rgba(255,255,255,0.06)", marginBottom:"24px" }}>
        {[{id:"log",label:"Log semanal"},{id:"emisoras",label:"Emisoras"},{id:"finanzas",label:"Finanzas"},{id:"roi",label:"ROI Report"},{id:"insights",label:"Insights AI"}].map(t=>(
          <button key={t.id} style={S.tab(tab===t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab==="log"      && <LogSemanal spots={spots} emisoras={emisoras} semana={semana} onAddSpot={dia=>setModal({type:"spot",spot:null,diaDefault:dia})} onEditSpot={s=>setModal({type:"spot",spot:s})} onDeleteSpot={id=>{handleDeleteSpot(id);}} onIncidencia={setIncModal} isSupervisor={isSupervisor} />}
      {tab==="emisoras" && <CatalogoEmisoras emisoras={emisoras} spots={spots} onAddEmisora={()=>setModal({type:"emisora",emisora:null})} onEditEmisora={e=>setModal({type:"emisora",emisora:e})} onUpdateSpot={sp=>setSpots(p=>p.map(s=>s.id===sp.id?sp:s))} />}
      {tab==="finanzas" && <FinanzasTab spots={spots} emisoras={emisoras} semana={semana} />}
      {tab==="roi"      && <ROITab spots={spots} emisoras={emisoras} leads={SEED_LEADS_RADIO} semana={semana} />}
      {tab==="insights" && <InsightsAI spots={spots} emisoras={emisoras} semana={semana} />}
      {modal?.type==="spot"    && <SpotModal    spot={modal.spot}    diaDefault={modal.diaDefault} emisoras={emisoras} semana={semana} onClose={()=>setModal(null)} onSave={handleSaveSpot}    />}
      {modal?.type==="emisora" && <EmisoraModal emisora={modal.emisora}                            onClose={()=>setModal(null)} onSave={handleSaveEmisora} />}
      {incModal && <IncidenciaModal spot={incModal} emisora={emisoras.find(e=>e.id===incModal.emisoraId)} onClose={()=>setIncModal(null)} onSave={handleSaveIncidencia} />}
      {toast&&(
        <div style={{ position:"fixed", bottom:"24px", right:"24px", zIndex:999, padding:"12px 20px", borderRadius:"10px", background:toast.ok?"rgba(74,222,128,0.15)":"rgba(248,113,113,0.15)", border:`1px solid ${toast.ok?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)"}`, color:toast.ok?"#4ade80":"#f87171", fontSize:"13px", fontWeight:"600", boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
