import { useState, useEffect } from "react";
import { supabase as SB } from "./supabase.js";

// --- HELPERS ---
const TODAY = new Date().toISOString().split("T")[0];

function getWeekRange(dateStr) {
  const d   = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { mon: mon.toISOString().split("T")[0], sun: sun.toISOString().split("T")[0] };
}

function inWeek(dateStr, week) { return dateStr >= week.mon && dateStr <= week.sun; }

function fmtUSD(n) {
  if (!n && n !== 0) return "--";
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits:0 });
}

function fmtDate(d) {
  if (!d) return "--";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday:"short", day:"2-digit", month:"short" });
}

function fmtPct(n) { return (Number(n)||0).toFixed(1) + "%"; }

const WEEK = getWeekRange(TODAY);

// --- SEED: USERS ---
const SEED_USERS = [
  { id:"U05", name:"Carlos Vega",   role:"vendedor",    commPct:10,  spiff:0,   active:true },
  { id:"U06", name:"Ana Morales",   role:"vendedor",    commPct:10,  spiff:150, active:true },
  { id:"U07", name:"Luis Ramos",    role:"vendedor",    commPct:10,  spiff:200, active:true },
  { id:"U09", name:"Diana Ortiz",   role:"vendedor",    commPct:10,  spiff:0,   active:true },
  { id:"U04", name:"Sofia Pena",    role:"verificador", commPct:2,   spiff:0,   active:true },
  { id:"U10", name:"Jorge Ibarra",  role:"verificador", commPct:1.5, spiff:0,   active:true },
];

// --- SEED: VENTAS ---
const SEED_VENTAS = [
  { id:"V001", folio:"L004", cliente:"Miguel Torres",     vendedorId:"U07", verificadorId:"U04", fechaVenta:TODAY,        salePrice:5200, cancelada:false, fechaCancelacion:null },
  { id:"V002", folio:"L007", cliente:"Patricia Sanchez",  vendedorId:"U06", verificadorId:"U04", fechaVenta:TODAY,        salePrice:7800, cancelada:false, fechaCancelacion:null },
  { id:"V003", folio:"L008", cliente:"Fernando Reyes",    vendedorId:"U05", verificadorId:"U10", fechaVenta:TODAY,        salePrice:4500, cancelada:false, fechaCancelacion:null },
  { id:"V004", folio:"L012", cliente:"Rosa Gutierrez",    vendedorId:"U07", verificadorId:"U04", fechaVenta:WEEK.mon,     salePrice:6100, cancelada:false, fechaCancelacion:null },
  { id:"V005", folio:"L015", cliente:"Hector Jimenez",    vendedorId:"U06", verificadorId:"U10", fechaVenta:WEEK.mon,     salePrice:3900, cancelada:false, fechaCancelacion:null },
  { id:"V006", folio:"L018", cliente:"Carmen Lopez",      vendedorId:"U05", verificadorId:"U04", fechaVenta:WEEK.mon,     salePrice:5500, cancelada:true,  fechaCancelacion:TODAY },
  { id:"V007", folio:"L021", cliente:"Pablo Mendoza",     vendedorId:"U09", verificadorId:"U04", fechaVenta:WEEK.mon,     salePrice:4700, cancelada:false, fechaCancelacion:null },
  { id:"V008", folio:"L025", cliente:"Laura Vasquez",     vendedorId:"U07", verificadorId:"U10", fechaVenta:WEEK.mon,     salePrice:6800, cancelada:true,  fechaCancelacion:TODAY },
  { id:"V009", folio:"L031", cliente:"Andres Mora",       vendedorId:"U05", verificadorId:"U04", fechaVenta:"2026-03-02", salePrice:4400, cancelada:false, fechaCancelacion:null },
  { id:"V010", folio:"L033", cliente:"Veronica Cruz",     vendedorId:"U06", verificadorId:"U10", fechaVenta:"2026-03-03", salePrice:7200, cancelada:false, fechaCancelacion:null },
];

// --- SEED: NUMEROS (leads recibidos) ---
const SEED_NUMEROS = [
  { vendedorId:"U05", fecha:TODAY,    count:8  },
  { vendedorId:"U06", fecha:TODAY,    count:11 },
  { vendedorId:"U07", fecha:TODAY,    count:9  },
  { vendedorId:"U09", fecha:TODAY,    count:7  },
  { vendedorId:"U05", fecha:WEEK.mon, count:6  },
  { vendedorId:"U06", fecha:WEEK.mon, count:10 },
  { vendedorId:"U07", fecha:WEEK.mon, count:8  },
  { vendedorId:"U09", fecha:WEEK.mon, count:5  },
];

// --- SEED: METAS/SPIFFS ---
const META_TIPOS = [
  { value:"ventas_dia",    label:"Ventas por dia",        desc:"Numero de ventas en un solo dia" },
  { value:"ventas_semana", label:"Ventas por semana",     desc:"Numero de ventas en la semana" },
  { value:"monto_total",   label:"Monto total de ventas", desc:"Monto acumulado vendido ($)" },
  { value:"primera_venta", label:"Primera venta del dia", desc:"Primer cierre del dia" },
  { value:"accion",        label:"Accion especifica",     desc:"Destino especial, producto, campana, etc." },
];

const SEED_METAS = [
  {
    id:"M001", titulo:"Meta Cancun Marzo", tipo:"accion",
    descripcion:"Bono por cerrar venta de destino Cancun durante marzo. El destino debe quedar confirmado en el expediente.",
    bono:"$150 USD en efectivo + certificado de regalo",
    vendedoresIds:["U06","U07"],
    fechaInicio:"2026-03-01", fechaFin:"2026-03-31",
    status:"aprobada", creadaPor:"Marco Silva", aprobadaPor:"Gabriela Montoya",
    fechaAprobacion:"2026-03-01", motivoRechazo:null,
  },
  {
    id:"M002", titulo:"Primera venta del dia - bono diario", tipo:"primera_venta",
    descripcion:"El primer vendedor que cierre una venta cada dia recibe el bono. Aplica de lunes a viernes.",
    bono:"$50 USD en efectivo",
    vendedoresIds:["U05","U06","U07","U09"],
    fechaInicio:"2026-03-09", fechaFin:"2026-03-31",
    status:"pendiente", creadaPor:"Marco Silva", aprobadaPor:null,
    fechaAprobacion:null, motivoRechazo:null,
  },
  {
    id:"M003", titulo:"Meta semanal - 4 ventas", tipo:"ventas_semana",
    descripcion:"Vendedor que cierre 4 o mas ventas en la semana recibe el spiff al cierre del domingo.",
    bono:"$200 USD en efectivo",
    vendedoresIds:["U05","U09"],
    fechaInicio:"2026-03-09", fechaFin:"2026-03-15",
    status:"rechazada", creadaPor:"Marco Silva", aprobadaPor:"Gabriela Montoya",
    fechaAprobacion:"2026-03-08", motivoRechazo:"Presupuesto excedido este periodo",
  },
];

const META_STATUS = {
  pendiente:  { label:"Pendiente aprobacion", color:"#925c0a", bg:"#fffbe0",  border:"#f3d88c"  },
  aprobada:   { label:"Aprobada - Activa",    color:"#1a7f3c", bg:"rgba(74,222,128,0.08)",  border:"#b0deb2"  },
  rechazada:  { label:"Rechazada",            color:"#b91c1c", bg:"rgba(248,113,113,0.08)", border:"#f7c0c0" },
  completada: { label:"Completada",           color:"#1565c0", bg:"rgba(96,165,250,0.08)",  border:"#b5cdf2"  },
};

// --- STYLES ---
const S = {
  wrap:    { minHeight:"100vh", background:"#f4f5f7", color:"#3d4554", fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif" },
  topbar:  { background:"#ffffff", borderBottom:"1px solid #e3e6ea", padding:"0 24px", display:"flex", alignItems:"center", gap:14, position:"sticky", top:0, zIndex:100, minHeight:52 },
  logo:    { fontSize:12, fontWeight:700, color:"#9ca3af", letterSpacing:"0.1em", textTransform:"uppercase" },
  tab:     (a) => ({ padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:a?"700":"400", background:"transparent", color:a?"#1565c0":"#9ca3af", borderBottom:"2px solid " + (a?"#1565c0":"transparent"), border:"none", transition:"all 0.15s", whiteSpace:"nowrap", fontFamily:"'DM Sans','Segoe UI',sans-serif" }),
  card:    { background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:12, padding:20, marginBottom:14, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" },
  label:   { fontSize:11, color:"#9ca3af", marginBottom:3, fontWeight:600 },
  sTitle:  { fontSize:10, fontWeight:700, color:"#9ca3af", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 },
  divider: { height:1, background:"#e3e6ea", margin:"14px 0" },
  badge:   (color, bg, border) => ({ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, color, background:bg, border:"1px solid " + border }),
  input:   { background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:8, padding:"8px 12px", color:"#1a1f2e", fontSize:13, outline:"none", fontFamily:"inherit" },
  modal:   { position:"fixed", inset:0, background:"rgba(15,20,30,0.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
  modalBox:{ background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:14, padding:28, maxWidth:520, width:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 8px 32px rgba(0,0,0,0.10)" },
  btn:     (v="primary") => {
    const m = {
      primary: { bg:"#1a385a",  color:"#fff",    border:"transparent"   },
      success: { bg:"#edf7ee",  color:"#1a7f3c", border:"#a3d9a5"       },
      danger:  { bg:"#fef2f2",  color:"#b91c1c", border:"#f5b8b8"       },
      warning: { bg:"#fef9e7",  color:"#925c0a", border:"#f0d080"       },
      ghost:   { bg:"#f4f5f7",  color:"#6b7280", border:"#e3e6ea"       },
      indigo:  { bg:"#e8f0fe",  color:"#1565c0", border:"#aac4f0"       },
      purple:  { bg:"#f3e8ff",  color:"#5b21b6", border:"#d8b4fe"       },
    };
    const s = m[v] || m.primary;
    return { display:"inline-flex", alignItems:"center", gap:7, padding:"9px 18px", borderRadius:9, cursor:"pointer", fontSize:13, fontWeight:600, background:s.bg, color:s.color, border:"1px solid " + s.border, transition:"all 0.18s", whiteSpace:"nowrap" };
  },
};

// --- STAT BOX ---
function StatBox({ label, today, week, color }) {
  return (
    <div style={{ flex:1, minWidth:140, padding:"16px 18px", borderRadius:13, background:color+"14", border:"1px solid "+color+"30" }}>
      <div style={{ fontSize:10, fontWeight:700, color, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10, opacity:0.8 }}>{label}</div>
      <div style={{ display:"flex", gap:16, alignItems:"flex-end" }}>
        <div>
          <div style={{ fontSize:9, color:"#9ca3af", marginBottom:2 }}>HOY</div>
          <div style={{ fontSize:22, fontWeight:800, color, lineHeight:1 }}>{today}</div>
        </div>
        <div>
          <div style={{ fontSize:9, color:"#9ca3af", marginBottom:2 }}>SEMANA</div>
          <div style={{ fontSize:17, fontWeight:700, color, opacity:0.75, lineHeight:1 }}>{week}</div>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ pct, color }) {
  return (
    <div style={{ height:6, borderRadius:3, background:"#f6f7f9", marginTop:5, overflow:"hidden" }}>
      <div style={{ height:"100%", width:Math.min(pct,100)+"%", background:color, borderRadius:3, transition:"width 0.5s ease" }} />
    </div>
  );
}

// --- CONFIG MODAL ---
function ConfigModal({ user, onClose, onSave }) {
  const [spiff,   setSpiff]   = useState(String(user.spiff || 0));
  const [commPct, setCommPct] = useState(String(user.commPct || 10));
  const isVend = user.role === "vendedor";
  const isVerif = user.role === "verificador";

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, maxWidth:380 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:18, fontWeight:700, color:"#1a1f2e", marginBottom:4 }}>Configurar comisiones</div>
        <div style={{ fontSize:13, color:"#9ca3af", marginBottom:22 }}>{user.name}</div>

        {isVerif && (
          <div style={{ marginBottom:18 }}>
            <div style={S.label}>Porcentaje de comision (%) - rango 1.5% a 2.5%</div>
            <input style={{ ...S.input, width:"100%", boxSizing:"border-box" }}
              type="number" min="1.5" max="2.5" step="0.1"
              value={commPct} onChange={e => setCommPct(e.target.value)} />
            <div style={{ marginTop:10, padding:"10px 14px", borderRadius:9, background:"#fffce5", border:"1px solid rgba(251,191,36,0.2)", fontSize:12, color:"#925c0a" }}>
              Ejemplo: venta de $5,000 &rarr; comision {fmtUSD(5000 * Number(commPct||0) / 100)}
            </div>
          </div>
        )}

        {isVend && (
          <>
            <div style={{ marginBottom:16, padding:"12px 14px", borderRadius:10, background:"rgba(74,222,128,0.07)", border:"1px solid rgba(74,222,128,0.15)", fontSize:12, color:"#1a7f3c", fontWeight:600 }}>
              Comision base: 10% fija sobre precio de venta
            </div>
            <div style={{ marginBottom:18 }}>
              <div style={S.label}>Spiff semanal (USD)</div>
              <div style={{ fontSize:12, color:"#9ca3af", marginBottom:7 }}>Bono adicional para esta semana. 0 = sin spiff.</div>
              <input style={{ ...S.input, width:"100%", boxSizing:"border-box" }}
                type="number" min="0" step="50"
                value={spiff} onChange={e => setSpiff(e.target.value)} />
              <div style={{ marginTop:10, padding:"10px 14px", borderRadius:9, background:"rgba(192,132,252,0.07)", border:"1px solid rgba(192,132,252,0.2)", fontSize:12, color:"#5b21b6" }}>
                Total semana: comision 10% + {fmtUSD(Number(spiff)||0)} spiff
              </div>
            </div>
          </>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <button style={{ ...S.btn("ghost"), flex:1 }} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn("success"), flex:2, justifyContent:"center" }}
            onClick={() => onSave({ ...user, spiff:Number(spiff)||0, commPct:Number(commPct)||user.commPct })}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- VENDEDOR CARD ---
function VendedorCard({ user, ventas, pagos, numeros, week, isAdmin, onConfig }) {
  const ventasHoy    = ventas.filter(v => v.vendedorId===user.id && v.fechaVenta===TODAY && !v.cancelada);
  const ventasSem    = ventas.filter(v => v.vendedorId===user.id && inWeek(v.fechaVenta, week) && !v.cancelada);
  const cancelSem    = ventas.filter(v => v.vendedorId===user.id && v.cancelada && inWeek(v.fechaCancelacion||v.fechaVenta, week));
  const numHoy       = numeros.filter(n => n.vendedorId===user.id && n.fecha===TODAY).reduce((a,b) => a+b.count, 0);
  const numSem       = numeros.filter(n => n.vendedorId===user.id && inWeek(n.fecha, week)).reduce((a,b) => a+b.count, 0);

  // Cobrado hoy = enganche de ventas cerradas hoy + abonos registrados hoy en cualquier venta del vendedor
  const engancheHoy  = ventasHoy.reduce((a,v) => a + v.pagoInicial, 0);
  const abonosHoy    = ventasSem.reduce((a,v) => {
    var hist = v.pagosHistorial || [];
    return a + hist.filter(p => (p.fecha||"").slice(0,10) === TODAY)
                   .reduce((s,p) => s + Number(p.monto||0), 0);
  }, 0);
  const cobradoHoy   = engancheHoy + abonosHoy;

  // Cobrado semana = enganches semana + todos los abonos de la semana
  const engancheSem  = ventasSem.reduce((a,v) => a + v.pagoInicial, 0);
  const abonosSem    = ventasSem.reduce((a,v) => {
    var hist = v.pagosHistorial || [];
    return a + hist.filter(p => inWeek((p.fecha||"").slice(0,10), week))
                   .reduce((s,p) => s + Number(p.monto||0), 0);
  }, 0);
  const cobradoSem   = engancheSem + abonosSem;

  const commHoy      = (engancheHoy + abonosHoy) * user.commPct / 100;
  const commSem      = (engancheSem + abonosSem) * user.commPct / 100;
  const descCancel   = cancelSem.reduce((a,v) => a + v.pagoInicial * user.commPct/100, 0);
  const totalSem     = commSem - descCancel + (user.spiff||0);
  const cierreHoy    = numHoy > 0 ? (ventasHoy.length / numHoy * 100) : 0;
  const cierreSem    = numSem > 0 ? (ventasSem.length / numSem * 100) : 0;

  return (
    <div style={S.card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:"#1a1f2e" }}>{user.name}</div>
          <div style={{ fontSize:12, color:"#9ca3af", marginTop:1 }}>Vendedor - Comision {user.commPct}%</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {user.spiff > 0 && (
            <span style={S.badge("#5b21b6","rgba(192,132,252,0.1)","rgba(192,132,252,0.25)")}>Spiff {fmtUSD(user.spiff)}</span>
          )}
          {isAdmin && (
            <button style={{ ...S.btn("ghost"), padding:"5px 10px", fontSize:12 }} onClick={() => onConfig(user)}>Config</button>
          )}
        </div>
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <StatBox label="Numeros recibidos" today={numHoy}              week={numSem}             color="#1565c0" />
        <StatBox label="Ventas"            today={ventasHoy.length}    week={ventasSem.length}   color="#1a7f3c" />
        <StatBox label="Cobrado"           today={fmtUSD(cobradoHoy)}  week={fmtUSD(cobradoSem)} color="#925c0a" />
        <StatBox label="Cobranza"          today={fmtUSD(abonosHoy)}   week={fmtUSD(abonosSem)}  color="#925c0a" />
      </div>

      {/* KPIs destacados: Ventas y Cobranza */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        <div style={{ padding:"14px 16px", borderRadius:12, background:"rgba(26,127,60,0.07)", border:"1px solid rgba(26,127,60,0.2)" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#1a7f3c", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10, opacity:0.8 }}>Ventas</div>
          <div style={{ display:"flex", gap:24, alignItems:"flex-end" }}>
            <div>
              <div style={{ fontSize:9, color:"#9ca3af", marginBottom:2 }}>HOY</div>
              <div style={{ fontSize:22, fontWeight:800, color:"#1a7f3c", lineHeight:1 }}>{fmtUSD(engancheHoy)}</div>
            </div>
            <div>
              <div style={{ fontSize:9, color:"#9ca3af", marginBottom:2 }}>SEMANA</div>
              <div style={{ fontSize:17, fontWeight:700, color:"#1a7f3c", opacity:0.75, lineHeight:1 }}>{fmtUSD(engancheSem)}</div>
            </div>
          </div>
        </div>

      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <div style={{ flex:1, minWidth:140, padding:"14px 16px", borderRadius:12, background:"rgba(129,140,248,0.08)", border:"1px solid rgba(129,140,248,0.2)" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#1565c0", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8, opacity:0.8 }}>% de cierre</div>
          <div style={{ display:"flex", gap:20, alignItems:"flex-end" }}>
            <div>
              <div style={{ fontSize:9, color:"#9ca3af", marginBottom:2 }}>HOY</div>
              <div style={{ fontSize:22, fontWeight:800, color:"#1565c0", lineHeight:1 }}>{fmtPct(cierreHoy)}</div>
              <MiniBar pct={cierreHoy} color="#1565c0" />
            </div>
            <div>
              <div style={{ fontSize:9, color:"#9ca3af", marginBottom:2 }}>SEMANA</div>
              <div style={{ fontSize:17, fontWeight:700, color:"#1565c0", opacity:0.75, lineHeight:1 }}>{fmtPct(cierreSem)}</div>
              <MiniBar pct={cierreSem} color="#1565c0" />
            </div>
          </div>
        </div>

        <div style={{ flex:1, minWidth:140, padding:"14px 16px", borderRadius:12, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#b91c1c", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8, opacity:0.8 }}>Cancelaciones semana</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#b91c1c", lineHeight:1 }}>{cancelSem.length}</div>
          {cancelSem.length > 0 && (
            <div style={{ fontSize:12, color:"#b91c1c", opacity:0.7, marginTop:4 }}>-{fmtUSD(descCancel)} de comision</div>
          )}
          {cancelSem.map(v => (
            <div key={v.id} style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>
              {v.cliente} (-{fmtUSD(Number(v.salePrice)*user.commPct/100)})
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"14px 16px", borderRadius:12, background:"#f9fafb", border:"1px solid #e3e6ea" }}>
        <div style={S.sTitle}>Comision semana ({fmtDate(week.mon)} - {fmtDate(week.sun)})</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
            <span style={{ color:"#6b7280" }}>Base (cobrado {fmtUSD(cobradoSem)} x {user.commPct}%)</span>
            <span style={{ color:"#1a7f3c", fontWeight:600 }}>{fmtUSD(commSem)}</span>
          </div>
          {descCancel > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:"#6b7280" }}>Descuento cancelaciones ({cancelSem.length})</span>
              <span style={{ color:"#b91c1c", fontWeight:600 }}>-{fmtUSD(descCancel)}</span>
            </div>
          )}
          {user.spiff > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:"#6b7280" }}>Spiff semanal</span>
              <span style={{ color:"#5b21b6", fontWeight:600 }}>+{fmtUSD(user.spiff)}</span>
            </div>
          )}
          <div style={S.divider} />
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:14, fontWeight:700, color:"#3d4554" }}>Total a pagar</span>
            <span style={{ fontSize:18, fontWeight:800, color:"#925c0a" }}>{fmtUSD(totalSem)}</span>
          </div>
        </div>
      </div>

      {/* Lista ventas semana */}
      {ventasSem.length > 0 && (
        <div style={{ marginTop:10, padding:"12px 14px", borderRadius:10, background:"#fff", border:"1px solid #e3e6ea" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Ventas de la semana</div>
          {ventasSem.map(function(v,i){ return (
            <div key={i} style={{ display:"flex", gap:8, fontSize:12, padding:"4px 0", borderBottom:"1px solid #f0f0f0", alignItems:"center" }}>
              <span style={{ color:"#9ca3af", minWidth:80 }}>{v.fechaVenta}</span>
              <span style={{ color:"#3d4554", flex:1 }}>{v.cliente}</span>
              <span style={{ color:"#1a7f3c", fontWeight:600 }}>{fmtUSD(v.pagoInicial)}</span>
            </div>
          ); })}
        </div>
      )}

      {/* Lista cobranza semana - pagos adicionales al balance */}
      {(function(){
        var abonosSem = [];
        ventasSem.forEach(function(v){
          (v.pagosHistorial||[]).forEach(function(p){
            if (inWeek((p.fecha||"").slice(0,10), week)) {
              abonosSem.push({ cliente:v.cliente, fecha:p.fecha?p.fecha.slice(0,10):"", monto:Number(p.monto||0) });
            }
          });
        });
        if (abonosSem.length === 0) return null;
        return (
          <div style={{ marginTop:8, padding:"12px 14px", borderRadius:10, background:"#fff", border:"1px solid #e3e6ea" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Cobranza adicional semana</div>
            {abonosSem.map(function(p,i){ return (
              <div key={i} style={{ display:"flex", gap:8, fontSize:12, padding:"4px 0", borderBottom:"1px solid #f0f0f0", alignItems:"center" }}>
                <span style={{ color:"#9ca3af", minWidth:80 }}>{p.fecha}</span>
                <span style={{ color:"#3d4554", flex:1 }}>{p.cliente}</span>
                <span style={{ color:"#925c0a", fontWeight:600 }}>{fmtUSD(p.monto)}</span>
              </div>
            ); })}
          </div>
        );
      })()}
    </div>
  );
}

// --- VERIFICADOR CARD ---
function VerificadorCard({ user, ventas, week, isAdmin, onConfig }) {
  const ventasSem  = ventas.filter(v => v.verificadorId===user.id && inWeek(v.fechaVenta, week) && !v.cancelada);
  const cancelSem  = ventas.filter(v => v.verificadorId===user.id && v.cancelada && inWeek(v.fechaCancelacion||v.fechaVenta, week));
  const ventasHoy  = ventas.filter(v => v.verificadorId===user.id && v.fechaVenta===TODAY && !v.cancelada);
  const montoSem    = ventasSem.reduce((a,v) => a+Number(v.salePrice), 0);
  const montoHoy    = ventasHoy.reduce((a,v) => a+Number(v.salePrice), 0);
  const upsaleSem   = ventasSem.reduce((a,v) => a+Number(v.upsaleMonto||0), 0);
  const upsaleHoy   = ventasHoy.reduce((a,v) => a+Number(v.upsaleMonto||0), 0);
  const baseCommSem = montoSem * user.commPct / 100;
  const baseCommHoy = montoHoy * user.commPct / 100;
  const upCommSem   = upsaleSem * (10 + user.commPct) / 100;
  const upCommHoy   = upsaleHoy * (10 + user.commPct) / 100;
  const commSem     = baseCommSem + upCommSem;
  const commHoy     = baseCommHoy + upCommHoy;
  const descCancel  = cancelSem.reduce((a,v) => a+Number(v.salePrice)*user.commPct/100, 0);
  const totalSem    = commSem - descCancel;

  return (
    <div style={S.card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:"#1a1f2e" }}>{user.name}</div>
          <div style={{ fontSize:12, color:"#9ca3af", marginTop:1 }}>Verificador - Comision {user.commPct}%</div>
        </div>
        {isAdmin && (
          <button style={{ ...S.btn("ghost"), padding:"5px 10px", fontSize:12 }} onClick={() => onConfig(user)}>Config</button>
        )}
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14 }}>
        <StatBox label="Verificadas"     today={ventasHoy.length}   week={ventasSem.length}  color="#1a7f3c"  />
        <StatBox label="Monto verificado" today={fmtUSD(montoHoy)}  week={fmtUSD(montoSem)}  color="#925c0a"  />
        <StatBox label="Comision"         today={fmtUSD(commHoy)}   week={fmtUSD(commSem)}   color="#1565c0"  />
      </div>

      {cancelSem.length > 0 && (
        <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#b91c1c", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Cancelaciones esta semana</div>
          {cancelSem.map(v => (
            <div key={v.id} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6b7280", marginBottom:3 }}>
              <span>{v.cliente}</span>
              <span style={{ color:"#b91c1c" }}>-{fmtUSD(Number(v.salePrice)*user.commPct/100)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding:"14px 16px", borderRadius:12, background:"#f9fafb", border:"1px solid #e3e6ea" }}>
        <div style={S.sTitle}>Comision semana</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
            <span style={{ color:"#6b7280" }}>Base ({ventasSem.length} verif. x {user.commPct}%)</span>
            <span style={{ color:"#1a7f3c", fontWeight:600 }}>{fmtUSD(baseCommSem)}</span>
          </div>
          {upCommSem > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:"#6b7280" }}>Upsale ({fmtUSD(upsaleSem)} x {10+user.commPct}%)</span>
              <span style={{ color:"#1565c0", fontWeight:600 }}>{fmtUSD(upCommSem)}</span>
            </div>
          )}
          {descCancel > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span style={{ color:"#6b7280" }}>Descuento cancelaciones</span>
              <span style={{ color:"#b91c1c", fontWeight:600 }}>-{fmtUSD(descCancel)}</span>
            </div>
          )}
          <div style={S.divider} />
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:14, fontWeight:700, color:"#3d4554" }}>Total a pagar</span>
            <span style={{ fontSize:18, fontWeight:800, color:"#925c0a" }}>{fmtUSD(totalSem)}</span>
          </div>
        </div>
      </div>

      {/* Lista ventas semana */}
      {ventasSem.length > 0 && (
        <div style={{ marginTop:10, padding:"12px 14px", borderRadius:10, background:"#fff", border:"1px solid #e3e6ea" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Ventas de la semana</div>
          {ventasSem.map(function(v,i){ return (
            <div key={i} style={{ display:"flex", gap:8, fontSize:12, padding:"4px 0", borderBottom:"1px solid #f0f0f0", alignItems:"center" }}>
              <span style={{ color:"#9ca3af", minWidth:80 }}>{v.fechaVenta}</span>
              <span style={{ color:"#3d4554", flex:1 }}>{v.cliente}</span>
              <span style={{ color:"#1a7f3c", fontWeight:600 }}>{fmtUSD(v.pagoInicial)}</span>
            </div>
          ); })}
        </div>
      )}

      {/* Lista upsales */}
      {ventasSem.filter(function(v){ return (v.upsaleMonto||0)>0; }).length > 0 && (
        <div style={{ marginTop:8, padding:"12px 14px", borderRadius:10, background:"#fff", border:"1px solid #e3e6ea" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Upsales de la semana</div>
          {ventasSem.filter(function(v){ return (v.upsaleMonto||0)>0; }).map(function(v,i){ return (
            <div key={i} style={{ display:"flex", gap:8, fontSize:12, padding:"4px 0", borderBottom:"1px solid #f0f0f0", alignItems:"center" }}>
              <span style={{ color:"#9ca3af", minWidth:80 }}>{v.fechaVenta}</span>
              <span style={{ color:"#3d4554", flex:1 }}>{v.cliente}</span>
              <span style={{ color:"#1565c0", fontWeight:600 }}>Upsale: {fmtUSD(v.upsaleMonto)}</span>
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}

// --- META MODAL ---
function MetaModal({ meta, users, onClose, onSave }) {
  const vendedores = users.filter(u => u.role==="vendedor" && u.active);
  const esNueva = !meta;
  const [form, setForm] = useState(meta || {
    titulo:"", tipo:"ventas_semana", descripcion:"", bono:"",
    vendedoresIds:[], fechaInicio:TODAY, fechaFin:"", status:"pendiente", creadaPor:"Marco Silva",
  });

  const toggleVend = (id) => setForm(p => ({
    ...p,
    vendedoresIds: p.vendedoresIds.includes(id) ? p.vendedoresIds.filter(v=>v!==id) : [...p.vendedoresIds, id]
  }));

  const handleSave = () => {
    if (!form.titulo || !form.bono || !form.fechaInicio || !form.fechaFin || form.vendedoresIds.length===0) return;
    onSave({ ...form, id: meta?.id || "M"+Date.now(), status:"pendiente" });
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, maxWidth:540 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:18, fontWeight:700, color:"#1a1f2e", marginBottom:4 }}>
          {esNueva ? "Nueva Meta / Spiff" : "Editar Meta"}
        </div>
        <div style={{ fontSize:13, color:"#9ca3af", marginBottom:22 }}>Se enviara al gerente para aprobacion</div>

        <div style={{ marginBottom:14 }}>
          <div style={S.label}>Titulo *</div>
          <input style={{ ...S.input, width:"100%", boxSizing:"border-box" }}
            placeholder="ej. Meta Cancun Marzo, Primera venta del dia..."
            value={form.titulo} onChange={e => setForm(p=>({...p,titulo:e.target.value}))} />
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={S.label}>Tipo de meta *</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginTop:6 }}>
            {META_TIPOS.map(t => (
              <button key={t.value}
                style={{ padding:"6px 12px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600,
                  background:form.tipo===t.value?"rgba(192,132,252,0.2)":"#f8f9fb",
                  color:form.tipo===t.value?"#5b21b6":"#9ca3af",
                  border:form.tipo===t.value?"1px solid rgba(192,132,252,0.4)":"1px solid rgba(255,255,255,0.08)" }}
                onClick={() => setForm(p=>({...p,tipo:t.value}))}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop:7, fontSize:12, color:"#9ca3af" }}>{META_TIPOS.find(t=>t.value===form.tipo)?.desc}</div>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={S.label}>Descripcion / Condiciones *</div>
          <textarea style={{ ...S.input, width:"100%", boxSizing:"border-box", minHeight:72, resize:"vertical" }}
            placeholder="Explica que debe hacer el vendedor para ganar este spiff..."
            value={form.descripcion} onChange={e => setForm(p=>({...p,descripcion:e.target.value}))} />
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={S.label}>Premio / Bono *</div>
          <input style={{ ...S.input, width:"100%", boxSizing:"border-box" }}
            placeholder="ej. $150 USD en efectivo, Gift card $100, Dia libre..."
            value={form.bono} onChange={e => setForm(p=>({...p,bono:e.target.value}))} />
        </div>

        <div style={{ display:"flex", gap:12, marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <div style={S.label}>Fecha inicio *</div>
            <input style={{ ...S.input, width:"100%", boxSizing:"border-box" }} type="date"
              value={form.fechaInicio} onChange={e => setForm(p=>({...p,fechaInicio:e.target.value}))} />
          </div>
          <div style={{ flex:1 }}>
            <div style={S.label}>Fecha fin *</div>
            <input style={{ ...S.input, width:"100%", boxSizing:"border-box" }} type="date"
              value={form.fechaFin} onChange={e => setForm(p=>({...p,fechaFin:e.target.value}))} />
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={S.label}>Aplica a estos vendedores *</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginTop:8 }}>
            {vendedores.map(u => (
              <button key={u.id}
                style={{ padding:"6px 13px", borderRadius:20, cursor:"pointer", fontSize:12, fontWeight:600,
                  background:form.vendedoresIds.includes(u.id)?"#e5f3e8":"#f8f9fb",
                  color:form.vendedoresIds.includes(u.id)?"#1a7f3c":"#9ca3af",
                  border:form.vendedoresIds.includes(u.id)?"1px solid rgba(74,222,128,0.35)":"1px solid rgba(255,255,255,0.08)" }}
                onClick={() => toggleVend(u.id)}>
                {form.vendedoresIds.includes(u.id)?"+ ":""}{u.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button style={{ ...S.btn("ghost"), flex:1 }} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn("warning"), flex:2, justifyContent:"center" }} onClick={handleSave}>
            Enviar a aprobacion
          </button>
        </div>
      </div>
    </div>
  );
}

// --- APROBACION MODAL ---
function AprobacionModal({ meta, users, onClose, onDecision }) {
  const [motivo, setMotivo] = useState("");
  const vendedores = users.filter(u => meta.vendedoresIds.includes(u.id));
  const tipo = META_TIPOS.find(t => t.value===meta.tipo);

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{ ...S.modalBox, maxWidth:480 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:18, fontWeight:700, color:"#1a1f2e", marginBottom:2 }}>Aprobacion de Meta</div>
        <div style={{ fontSize:12, color:"#9ca3af", marginBottom:20 }}>Vista del Gerente</div>

        <div style={{ padding:16, borderRadius:12, background:"#fafbfc", border:"1px solid #dde0e5", marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#1a1f2e", marginBottom:8 }}>{meta.titulo}</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
            <span style={S.badge("#5b21b6","rgba(192,132,252,0.1)","rgba(192,132,252,0.25)")}>{tipo?.label||meta.tipo}</span>
            <span style={{ fontSize:12, color:"#9ca3af", alignSelf:"center" }}>Creada por {meta.creadaPor}</span>
          </div>
          <div style={{ fontSize:13, color:"#6b7280", marginBottom:10, lineHeight:1.5 }}>{meta.descripcion}</div>
          <div style={{ display:"flex", gap:16, fontSize:12 }}>
            <div><span style={{ color:"#9ca3af" }}>Premio: </span><span style={{ color:"#5b21b6", fontWeight:700 }}>{meta.bono}</span></div>
            <div><span style={{ color:"#9ca3af" }}>Periodo: </span><span style={{ color:"#3d4554" }}>{fmtDate(meta.fechaInicio)} - {fmtDate(meta.fechaFin)}</span></div>
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Vendedores incluidos</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {vendedores.map(u => (
              <span key={u.id} style={S.badge("#1a7f3c","rgba(74,222,128,0.08)","#b0deb2")}>{u.name}</span>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:18 }}>
          <div style={S.label}>Motivo / Comentario (requerido para rechazo)</div>
          <textarea style={{ ...S.input, width:"100%", boxSizing:"border-box", minHeight:60, resize:"vertical" }}
            placeholder="Comentario del gerente..."
            value={motivo} onChange={e => setMotivo(e.target.value)} />
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button style={{ ...S.btn("ghost"), flex:1 }} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn("danger"), flex:1, justifyContent:"center" }}
            onClick={() => { if(!motivo.trim()){alert("Escribe el motivo de rechazo");return;} onDecision("rechazada", motivo); }}>
            Rechazar
          </button>
          <button style={{ ...S.btn("success"), flex:1, justifyContent:"center" }}
            onClick={() => onDecision("aprobada", motivo)}>
            Aprobar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- SPIFF PANEL ---
function SpiffPanel({ users, week, notify, role }) {
  const vendedores = users.filter(u => u.role==="vendedor" && u.active);
  const [metas,       setMetas]       = useState(SEED_METAS);
  const [showCreate,  setShowCreate]  = useState(false);
  const [editMeta,    setEditMeta]    = useState(null);
  const [aprobModal,  setAprobModal]  = useState(null);
  const [filtro,      setFiltro]      = useState("todas");

  const esSupervisor = role==="supervisor" || role==="admin";
  const esGerente    = role==="admin" || role==="director";
  const pendientes   = metas.filter(m => m.status==="pendiente").length;
  const activas      = metas.filter(m => m.status==="aprobada").length;
  const metasFiltradas = metas.filter(m => filtro==="todas" ? true : m.status===filtro);

  const handleSave = (nueva) => {
    setMetas(p => {
      const existe = p.find(m => m.id===nueva.id);
      return existe ? p.map(m => m.id===nueva.id?{...nueva,status:"pendiente"}:m) : [nueva,...p];
    });
    setShowCreate(false); setEditMeta(null);
    notify("Meta enviada al gerente para aprobacion");
  };

  const handleDecision = (meta, decision, motivo) => {
    setMetas(p => p.map(m => m.id===meta.id ? {
      ...m, status:decision,
      aprobadaPor:"Gabriela Montoya",
      fechaAprobacion:TODAY,
      motivoRechazo: decision==="rechazada" ? motivo : null,
    } : m));
    setAprobModal(null);
    notify(decision==="aprobada" ? "Meta aprobada y activa" : "Meta rechazada");
  };

  return (
    <div>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:18 }}>
        <div style={{ flex:1, minWidth:160, padding:"18px 20px", borderRadius:14, background:"rgba(192,132,252,0.08)", border:"1px solid rgba(192,132,252,0.22)" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#5b21b6", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6 }}>Metas activas</div>
          <div style={{ fontSize:30, fontWeight:800, color:"#5b21b6" }}>{activas}</div>
        </div>
        <div style={{ flex:1, minWidth:160, padding:"18px 20px", borderRadius:14, background:"#fffbe0", border:"1px solid rgba(251,191,36,0.22)" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#925c0a", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6 }}>Pendientes aprobacion</div>
          <div style={{ fontSize:30, fontWeight:800, color:"#925c0a" }}>{pendientes}</div>
        </div>
        <div style={{ flex:1, minWidth:160, padding:"18px 20px", borderRadius:14, background:"rgba(99,102,241,0.07)", border:"1px solid rgba(99,102,241,0.2)" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#1565c0", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6 }}>Semana activa</div>
          <div style={{ fontSize:13, fontWeight:700, color:"#1565c0", lineHeight:1.4 }}>{fmtDate(week.mon)}<br/>al {fmtDate(week.sun)}</div>
        </div>
        {esSupervisor && (
          <div style={{ display:"flex", alignItems:"center" }}>
            <button style={{ ...S.btn("indigo"), padding:"13px 22px" }} onClick={() => setShowCreate(true)}>+ Nueva Meta</button>
          </div>
        )}
      </div>

      {esGerente && pendientes > 0 && (
        <div style={{ padding:"14px 18px", borderRadius:12, background:"#fffbe0", border:"1px solid rgba(251,191,36,0.25)", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:13, color:"#925c0a", fontWeight:600 }}>{pendientes} meta(s) esperando tu aprobacion</span>
          <button style={{ ...S.btn("warning"), padding:"6px 14px", fontSize:12 }} onClick={() => setFiltro("pendiente")}>Ver pendientes</button>
        </div>
      )}

      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {["todas","pendiente","aprobada","rechazada","completada"].map(s => (
          <button key={s} style={{ ...S.btn(filtro===s?"indigo":"ghost"), padding:"5px 13px", fontSize:11 }} onClick={() => setFiltro(s)}>
            {s==="todas"?"Todas":META_STATUS[s]?.label}{s==="pendiente"&&pendientes>0?` (${pendientes})`:""}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {metasFiltradas.length === 0 && (
          <div style={{ padding:32, textAlign:"center", color:"#9ca3af", fontSize:14, background:"#f9fafb", borderRadius:14, border:"1px solid #e3e6ea" }}>Sin metas en esta categoria</div>
        )}
        {metasFiltradas.map(meta => {
          const st   = META_STATUS[meta.status] || META_STATUS.pendiente;
          const tipo = META_TIPOS.find(t => t.value===meta.tipo);
          const vendsMeta = users.filter(u => meta.vendedoresIds.includes(u.id));
          return (
            <div key={meta.id} style={{ ...S.card, margin:0, border:"1px solid "+st.border, background:st.bg }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:"#1a1f2e", marginBottom:4 }}>{meta.titulo}</div>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                    <span style={S.badge(st.color, st.bg, st.border)}>{st.label}</span>
                    <span style={S.badge("#1565c0","rgba(129,140,248,0.08)","rgba(129,140,248,0.2)")}>{tipo?.label||meta.tipo}</span>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  {esGerente && meta.status==="pendiente" && (
                    <button style={{ ...S.btn("warning"), padding:"5px 12px", fontSize:11 }} onClick={() => setAprobModal(meta)}>Revisar</button>
                  )}
                  {esSupervisor && (meta.status==="pendiente"||meta.status==="rechazada") && (
                    <button style={{ ...S.btn("ghost"), padding:"5px 10px", fontSize:11 }} onClick={() => setEditMeta(meta)}>Editar</button>
                  )}
                </div>
              </div>
              <div style={{ fontSize:13, color:"#6b7280", marginBottom:12, lineHeight:1.5, padding:"10px 12px", background:"rgba(0,0,0,0.2)", borderRadius:8 }}>{meta.descripcion}</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:12, alignItems:"center" }}>
                <div style={{ padding:"8px 16px", borderRadius:10, background:"rgba(192,132,252,0.12)", border:"1px solid rgba(192,132,252,0.3)" }}>
                  <div style={{ fontSize:10, color:"#5b21b6", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Premio</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#5b21b6" }}>{meta.bono}</div>
                </div>
                <div style={{ fontSize:12, color:"#9ca3af" }}>{fmtDate(meta.fechaInicio)} - {fmtDate(meta.fechaFin)}</div>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                <span style={{ fontSize:11, color:"#9ca3af" }}>Vendedores:</span>
                {vendsMeta.map(u => <span key={u.id} style={S.badge("#1a7f3c","rgba(74,222,128,0.07)","rgba(74,222,128,0.2)")}>{u.name}</span>)}
              </div>
              {(meta.aprobadaPor || meta.motivoRechazo) && (
                <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #e3e6ea", fontSize:11, color:"#9ca3af" }}>
                  {meta.status==="aprobada" && <>Aprobada por {meta.aprobadaPor} - {fmtDate(meta.fechaAprobacion)}</>}
                  {meta.status==="rechazada" && <><span style={{ color:"#b91c1c" }}>Rechazada: </span>{meta.motivoRechazo}</>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(showCreate||editMeta) && <MetaModal meta={editMeta||null} users={users} onClose={() => { setShowCreate(false); setEditMeta(null); }} onSave={handleSave} />}
      {aprobModal && <AprobacionModal meta={aprobModal} users={users} onClose={() => setAprobModal(null)} onDecision={(d,m) => handleDecision(aprobModal,d,m)} />}
    </div>
  );
}

// --- RESUMEN EJECUTIVO ---
function ResumenEjecutivo({ users, ventas, week }) {
  const ventasSem  = ventas.filter(v => inWeek(v.fechaVenta, week) && !v.cancelada);
  const cancelSem  = ventas.filter(v => v.cancelada && inWeek(v.fechaCancelacion||v.fechaVenta, week));
  const ventasHoy  = ventas.filter(v => v.fechaVenta===TODAY && !v.cancelada);
  const montoHoy   = ventasHoy.reduce((a,v) => a+Number(v.salePrice), 0);
  const montoSem   = ventasSem.reduce((a,v) => a+Number(v.salePrice), 0);
  const vendedores = users.filter(u => u.role==="vendedor");
  const verificadores = users.filter(u => u.role==="verificador");

  const calcComm = (u, tipoId, tipoVerif) => {
    const field  = tipoId==="vendedor" ? "vendedorId" : "verificadorId";
    const vs = ventas.filter(v => v[field]===u.id && inWeek(v.fechaVenta,week) && !v.cancelada);
    const cs = ventas.filter(v => v[field]===u.id && v.cancelada && inWeek(v.fechaCancelacion||v.fechaVenta,week));
    const base = vs.reduce((a,v) => a+Number(v.salePrice)*u.commPct/100, 0);
    const desc = cs.reduce((a,v) => a+Number(v.salePrice)*u.commPct/100, 0);
    return base - desc + (tipoId==="vendedor" ? (u.spiff||0) : 0);
  };

  const totalCommVend  = vendedores.reduce((a,u) => a+calcComm(u,"vendedor"), 0);
  const totalCommVerif = verificadores.reduce((a,u) => a+calcComm(u,"verificador"), 0);

  return (
    <div style={S.card}>
      <div style={S.sTitle}>Resumen Ejecutivo - Semana {fmtDate(week.mon)} al {fmtDate(week.sun)}</div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
        {[
          { label:"Ventas hoy",     val:ventasHoy.length,      color:"#1a7f3c" },
          { label:"Ventas semana",  val:ventasSem.length,      color:"#1a7f3c" },
          { label:"Cancelaciones",  val:cancelSem.length,      color:"#b91c1c" },
          { label:"Monto hoy",      val:fmtUSD(montoHoy),      color:"#925c0a" },
          { label:"Monto semana",   val:fmtUSD(montoSem),      color:"#925c0a" },
        ].map((k,i) => (
          <div key={i} style={{ flex:1, minWidth:130, padding:"16px 18px", borderRadius:13, background:k.color+"14", border:"1px solid "+k.color+"30" }}>
            <div style={{ fontSize:9, fontWeight:700, color:k.color, letterSpacing:"0.1em", textTransform:"uppercase", opacity:0.8, marginBottom:6 }}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:k.color, lineHeight:1 }}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:"14px 16px", borderRadius:12, background:"#f9fafb", border:"1px solid #e3e6ea" }}>
        <div style={S.sTitle}>Nomina de comisiones semana</div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
          <span style={{ color:"#6b7280" }}>Comisiones vendedores ({vendedores.length})</span>
          <span style={{ color:"#1a7f3c", fontWeight:600 }}>{fmtUSD(totalCommVend)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
          <span style={{ color:"#6b7280" }}>Comisiones verificadores ({verificadores.length})</span>
          <span style={{ color:"#1565c0", fontWeight:600 }}>{fmtUSD(totalCommVerif)}</span>
        </div>
        <div style={S.divider} />
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:15, fontWeight:700, color:"#3d4554" }}>Total comisiones a pagar</span>
          <span style={{ fontSize:20, fontWeight:800, color:"#925c0a" }}>{fmtUSD(totalCommVend+totalCommVerif)}</span>
        </div>
      </div>
    </div>
  );
}

// --- TABLA DE VENTAS ---
function TablaVentas({ ventas, users, week }) {
  const [filtro, setFiltro] = useState("semana");
  const ventasFiltradas = ventas.filter(v => {
    if (filtro==="hoy")    return v.fechaVenta===TODAY;
    if (filtro==="semana") return inWeek(v.fechaVenta, week);
    return true;
  });
  const getUser = (id) => users.find(u => u.id===id);

  return (
    <div style={S.card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={S.sTitle}>Detalle de ventas</div>
        <div style={{ display:"flex", gap:6 }}>
          {["hoy","semana","todo"].map(f => (
            <button key={f} style={{ ...S.btn(filtro===f?"indigo":"ghost"), padding:"5px 12px", fontSize:11 }} onClick={() => setFiltro(f)}>
              {f==="hoy"?"Hoy":f==="semana"?"Esta semana":"Todo"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:"1px solid #dde0e5" }}>
              {["Fecha","Cliente","Vendedor","Verificador","Precio venta","Enganche","Comis. Vend.","Comis. Verif.","Status"].map(h => (
                <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:"#9ca3af", fontWeight:600, fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ventasFiltradas.map(v => {
              const vend  = getUser(v.vendedorId);
              const verif = getUser(v.verificadorId);
              const commV = vend  ? Number(v.pagoInicial||0)*vend.commPct/100  : 0;
              const commR = verif ? Number(v.pagoInicial||0)*verif.commPct/100 : 0;
              return (
                <tr key={v.id} style={{ borderBottom:"1px solid #edf0f3", opacity:v.cancelada?0.5:1 }}>
                  <td style={{ padding:"9px 10px", color:"#6b7280", whiteSpace:"nowrap" }}>{fmtDate(v.fechaVenta)}</td>
                  <td style={{ padding:"9px 10px", color:"#3d4554", fontWeight:500 }}>{v.cliente}</td>
                  <td style={{ padding:"9px 10px", color:"#6b7280" }}>{vend?.name||"--"}</td>
                  <td style={{ padding:"9px 10px", color:"#6b7280" }}>{verif?.name||"--"}</td>
                  <td style={{ padding:"9px 10px", color:"#1565c0", fontWeight:600 }}>{fmtUSD(v.salePrice)}</td>
                  <td style={{ padding:"9px 10px", color:"#925c0a", fontWeight:600 }}>{fmtUSD(v.pagoInicial||0)}</td>
                  <td style={{ padding:"9px 10px", color:v.cancelada?"#b91c1c":"#925c0a", fontWeight:600 }}>{v.cancelada?"-":""}{fmtUSD(commV)}</td>
                  <td style={{ padding:"9px 10px", color:v.cancelada?"#b91c1c":"#1565c0", fontWeight:600 }}>{v.cancelada?"-":""}{fmtUSD(commR)}</td>
                  <td style={{ padding:"9px 10px" }}>
                    {v.cancelada
                      ? <span style={{ fontSize:11, padding:"2px 8px", borderRadius:10, background:"#fef2f2", color:"#b91c1c", border:"1px solid rgba(248,113,113,0.2)" }}>Cancelada</span>
                      : <span style={{ fontSize:11, padding:"2px 8px", borderRadius:10, background:"#edf7ee", color:"#1a7f3c", border:"1px solid rgba(74,222,128,0.2)" }}>Venta</span>
                    }
                  </td>
                </tr>
              );
            })}
            {ventasFiltradas.length === 0 && (
              <tr><td colSpan={8} style={{ padding:24, textAlign:"center", color:"#9ca3af" }}>Sin ventas en este periodo</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- ROOT ---
export default function CommissionsModule({ currentUser: shellUser }) {
  console.log("CommissionsModule montado, shellUser:", shellUser && shellUser.nombre);
  const [users,       setUsers]       = useState(SEED_USERS);
  const [ventas,      setVentas]      = useState([]);
  const [pagos,       setPagos]       = useState([]);
  const [numeros,     setNumeros]     = useState(SEED_NUMEROS);
  const [configModal, setConfigModal] = useState(null);
  const [toast,       setToast]       = useState(null);

  // Cargar ventas reales de Supabase
  function cargarNumeros() {
    SB.from("leads")
      .select("id, vendedor_id, created_at")
      .order("created_at", { ascending: false })
      .then(function(res) {
        if (!res.error && res.data) {
          var grouped = {};
          res.data.forEach(function(r) {
            var vid = r.vendedor_id;
            var fecha = (r.created_at||"").slice(0,10);
            if (!vid || !fecha) return;
            var key = vid + "|" + fecha;
            if (!grouped[key]) grouped[key] = { vendedorId: vid, fecha: fecha, count: 0 };
            grouped[key].count++;
          });
          setNumeros(Object.values(grouped));
        }
      });
  }

  function cargarVentas() {
    SB.from("leads")
      .select("*")
      .eq("status", "venta")
      .order("updated_at", { ascending: false })
      .then(function(res) {
        if (!res.error && res.data) {
          var mapped = res.data.map(function(r) {
            return {
              id:               r.id,
              folio:            r.folio || r.id.slice(0,8),
              cliente:          (r.nombre || "") + " " + (r.apellido || ""),
              vendedorId:       r.vendedor_id || "",
              verificadorId:    r.verificador_id || "",
              fechaVenta:       (r.updated_at || r.created_at || TODAY).split("T")[0],
              salePrice:        Number(r.sale_price) || 0,
              upsaleMonto:      Number(r.upsale_monto) || 0,
              verificadorId:    r.verificador_id || "",
              pagoInicial:      Number(r.pago_inicial) || 0,
              pagosHistorial:   Array.isArray(r.pagos_historial) ? r.pagos_historial : [],
              cancelada:        false,
              fechaCancelacion: null,
            };
          });
          setVentas(mapped);
        }
      });
  }

  // Cargar usuarios reales de Supabase
  function cargarUsers() {
    SB.from("usuarios")
      .select("*")
      .then(function(res) {
        if (res.data && res.data.length > 0) {
          var mapped = res.data.map(function(u) {
            return {
              id:       u.id,
              auth_id:  u.auth_id,
              name:     u.nombre || "",
              nombre:   u.nombre || "",
              role:     u.rol || "vendedor",
              active:   u.activo !== false,
              commPct:  u.comision_pct || 10,
              spiffAmt: u.spiff || 0,
            };
          });
          console.log("cargarUsers:", JSON.stringify(mapped.map(function(u){ return { id: u.id, name: u.name, role: u.role }; })));
          setUsers(mapped);
        }
      });
  }

  function cargarVentasDebug(mapped) {
    console.log("cargarVentas:", JSON.stringify(mapped.map(function(v){ return { id: v.id, vendedorId: v.vendedorId, cliente: v.cliente, fecha: v.fechaVenta }; })));
  }

  useEffect(function() {
    console.log("CommissionsModule useEffect ejecutando");
    try { cargarVentas(); cargarNumeros(); } catch(e) { console.error("cargarVentas error:", e); }
    try { cargarUsers(); } catch(e) { console.error("cargarUsers error:", e); }
    var interval = setInterval(cargarVentas, 30000);
    return function() { clearInterval(interval); };
  }, []);

  // Derivar rol desde el usuario real del shell
  var rolShell = shellUser && shellUser.rol ? shellUser.rol : "vendedor";
  var isAdmin  = rolShell === "admin" || rolShell === "director" || rolShell === "supervisor";
  var isVerif  = rolShell === "verificador";
  var isVend   = rolShell === "vendedor";

  // Tab inicial segun rol
  var tabInicial = isVerif ? "verificadores" : "vendedores";
  const [tab, setTab] = useState(tabInicial);

  const notify = function(msg) { setToast(msg); setTimeout(function(){ setToast(null); }, 3000); };
  var week        = WEEK;
  var vendedores    = users.filter(function(u){ return u.role==="vendedor"    && u.active; });
  var verificadores = users.filter(function(u){ return u.role==="verificador" && u.active; });

  const handleSaveConfig = function(updated) {
    setUsers(function(p){ return p.map(function(u){ return u.id===updated.id ? updated : u; }); });
    notify("Configuracion guardada");
    setConfigModal(null);
  };

  // Si es vendedor/verificador, construir su propia card con su nombre real
  // No usar datos de otro vendedor del seed - mostrar sus propios numeros (cero hasta conectar Supabase)
  var myVendCard = null;
  if (isVend && shellUser) {
    var found = users.find(function(u){
      return u.auth_id === (shellUser.auth_id || shellUser.id);
    }) || users.find(function(u){
      return u.name && shellUser.nombre && u.name.toLowerCase() === shellUser.nombre.toLowerCase();
    });
    myVendCard = found || {
      id: shellUser.auth_id || "me",
      name: shellUser.nombre || "Mi cuenta",
      role: "vendedor",
      commPct: 10,
      spiff: 0,
      active: true,
    };
  }
  var myVerifCard = null;
  if (isVerif && shellUser) {
    var foundV = users.find(function(u){
      return u.name && shellUser.nombre && u.name.toLowerCase() === shellUser.nombre.toLowerCase();
    });
    myVerifCard = foundV || {
      id: shellUser.auth_id || "me",
      name: shellUser.nombre || "Mi cuenta",
      role: "verificador",
      commPct: 2,
      spiff: 0,
      active: true,
    };
  }

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={S.logo}>Mini-Vac CRM</div>
        <div style={{ width:1, height:18, background:"#e3e6ea" }} />
        <div style={{ fontSize:14, fontWeight:600, color:"#1a385a" }}>Reportes y Comisiones</div>
        <div style={{ flex:1 }} />
        <div style={{ fontSize:12, color:"#9ca3af" }}>
          {shellUser ? shellUser.nombre : ""}
        </div>
      </div>

      <div style={{ padding:"0 24px", display:"flex", gap:4, borderBottom:"1px solid #e3e6ea", background:"#ffffff" }}>
        {(isAdmin || isVend)  && <button style={S.tab(tab==="vendedores")}    onClick={function(){ setTab("vendedores"); }}>Vendedores</button>}
        {(isAdmin || isVerif) && <button style={S.tab(tab==="verificadores")} onClick={function(){ setTab("verificadores"); }}>Verificadores</button>}
        {isAdmin              && <button style={S.tab(tab==="spiffs")}        onClick={function(){ setTab("spiffs"); }}>Metas y Spiffs</button>}
        {isAdmin              && <button style={S.tab(tab==="resumen")}       onClick={function(){ setTab("resumen"); }}>Resumen ejecutivo</button>}
        {isAdmin              && <button style={S.tab(tab==="detalle")}       onClick={function(){ setTab("detalle"); }}>Detalle ventas</button>}
      </div>

      <div style={{ padding:"24px 28px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ marginBottom:18, display:"flex", alignItems:"center", gap:10 }}>
          <span style={S.badge("#1565c0","#e8f0fe","#aac4f0")}>
            {"Semana: " + fmtDate(week.mon) + " - " + fmtDate(week.sun)}
          </span>
          <span style={{ fontSize:12, color:"#9ca3af" }}>Lunes a Domingo - Comisiones calculadas al cierre del domingo</span>
        </div>

        {tab==="vendedores" && (
          isVend
            ? <VendedorCard user={myVendCard} ventas={ventas} pagos={pagos} numeros={numeros} week={week} isAdmin={false} onConfig={function(){}} />
            : vendedores.map(function(u){ return <VendedorCard key={u.id} user={u} ventas={ventas} pagos={pagos} numeros={numeros} week={week} isAdmin={isAdmin} onConfig={setConfigModal} />; })
        )}

        {tab==="verificadores" && (
          isVerif
            ? <VerificadorCard user={myVerifCard} ventas={ventas} week={week} isAdmin={false} onConfig={function(){}} />
            : verificadores.map(function(u){ return <VerificadorCard key={u.id} user={u} ventas={ventas} week={week} isAdmin={isAdmin} onConfig={setConfigModal} />; })
        )}

        {tab==="spiffs"       && isAdmin && <SpiffPanel users={users} week={week} notify={notify} role={rolShell} />}
        {tab==="resumen"      && isAdmin && <ResumenEjecutivo users={users} ventas={ventas} week={week} />}
        {tab==="detalle"      && isAdmin && <TablaVentas ventas={ventas} users={users} week={week} />}
      </div>

      {configModal && <ConfigModal user={configModal} onClose={function(){ setConfigModal(null); }} onSave={handleSaveConfig} />}

      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:999, padding:"12px 20px", borderRadius:10,
          background:"#edf7ee", border:"1px solid #a3d9a5", color:"#1a7f3c", fontSize:14, fontWeight:600,
          boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
