import { useState, useMemo } from "react";

const SELLERS = [
  { id:"U05", name:"Carlos Vega",   avatar:"CV", target:5, commissionPct:0.05 },
  { id:"U06", name:"Ana Morales",   avatar:"AM", target:5, commissionPct:0.05 },
  { id:"U07", name:"Luis Ramos",    avatar:"LR", target:5, commissionPct:0.05 },
  { id:"U08", name:"Pedro Kuri",    avatar:"PK", target:5, commissionPct:0.05 },
  { id:"U09", name:"Diana Ortiz",   avatar:"DO", target:5, commissionPct:0.05 },
];

const RADIOS = [
  { id:"R1", name:"Radio Hits",  freq:"99.3 FM",  investment:9050, calls:62 },
  { id:"R2", name:"Banda 107",   freq:"107.7 FM", investment:4800, calls:21 },
  { id:"R3", name:"Stereo 94",   freq:"94.5 FM",  investment:2200, calls:14 },
  { id:"R4", name:"Exitos 102",  freq:"102.1 FM", investment:7200, calls:18 },
  { id:"R5", name:"Mix 88",      freq:"88.9 FM",  investment:1800, calls:9  },
];

const LEADS = [
  { id:"L01", nombre:"Maria Gonzalez",  sellerId:"U05", radioId:"R1", status:"verificacion", destinos:["Cancun"],         salePrice:4500, pagoInicial:900  },
  { id:"L02", nombre:"Roberto Diaz",    sellerId:"U06", radioId:"R1", status:"contactado",   destinos:[],                  salePrice:0,    pagoInicial:0    },
  { id:"L03", nombre:"Sofia Herrera",   sellerId:"U05", radioId:"R2", status:"nuevo",        destinos:["Riviera Maya"],    salePrice:0,    pagoInicial:0    },
  { id:"L04", nombre:"Miguel Torres",   sellerId:"U07", radioId:"R1", status:"venta",        destinos:["Los Cabos"],       salePrice:5200, pagoInicial:1100 },
  { id:"L05", nombre:"Elena Castro",    sellerId:"U06", radioId:"R4", status:"venta",        destinos:["Huatulco"],        salePrice:3800, pagoInicial:760  },
  { id:"L06", nombre:"Jorge Mendez",    sellerId:"U08", radioId:"R2", status:"no_interesado",destinos:[],                  salePrice:0,    pagoInicial:0    },
  { id:"L07", nombre:"Patricia Leal",   sellerId:"U09", radioId:"R5", status:"contactado",   destinos:["Huatulco"],        salePrice:0,    pagoInicial:0    },
  { id:"L08", nombre:"Andres Fuentes",  sellerId:"U07", radioId:"R2", status:"nuevo",        destinos:["Cancun"],          salePrice:0,    pagoInicial:0    },
  { id:"L09", nombre:"Laura Vidal",     sellerId:"U09", radioId:"R3", status:"venta",        destinos:["Cancun","Orlando"],salePrice:6800, pagoInicial:1360 },
  { id:"L10", nombre:"Fernando Reyes",  sellerId:"U05", radioId:"R1", status:"venta",        destinos:["Los Cabos"],       salePrice:4500, pagoInicial:900  },
  { id:"L11", nombre:"Patricia Sanchez",sellerId:"U06", radioId:"R2", status:"verificacion", destinos:["Riviera Maya"],   salePrice:7800, pagoInicial:1500 },
  { id:"L12", nombre:"Carlos Rios",     sellerId:"U08", radioId:"R4", status:"cita",         destinos:[],                  salePrice:0,    pagoInicial:0    },
  { id:"L13", nombre:"Marta Blanco",    sellerId:"U09", radioId:"R1", status:"venta",        destinos:["Las Vegas"],       salePrice:3200, pagoInicial:640  },
  { id:"L14", nombre:"Oscar Fuente",    sellerId:"U07", radioId:"R3", status:"interesado",   destinos:["Puerto Vallarta"], salePrice:0,    pagoInicial:0    },
  { id:"L15", nombre:"Gabi Soto",       sellerId:"U05", radioId:"R4", status:"cita",         destinos:[],                  salePrice:0,    pagoInicial:0    },
];

const STATUS_CFG = {
  nuevo:         { label:"Nuevo",         color:"#4fc3f7", bg:"rgba(79,195,247,0.12)"   },
  contactado:    { label:"Contactado",    color:"#fff176", bg:"rgba(255,241,118,0.12)"  },
  interesado:    { label:"Interesado",    color:"#ce93d8", bg:"rgba(206,147,216,0.12)"  },
  cita:          { label:"Cita",          color:"#ffcc80", bg:"rgba(255,204,128,0.12)"  },
  verificacion:  { label:"Verificacion",  color:"#925c0a", bg:"#fef8e5"   },
  venta:         { label:"Venta",         color:"#1a7f3c", bg:"#eaf5ec"   },
  no_interesado: { label:"No interesado", color:"#6b7280", bg:"rgba(148,163,184,0.12)"  },
};

const fmtUSD = (n) => "$" + Number(n||0).toLocaleString("en-US", { minimumFractionDigits:0 });
const pct    = (a, b) => b > 0 ? ((a/b)*100).toFixed(1) : "0";

const S = {
  root:      { display:"flex", flexDirection:"column", minHeight:"100vh", background:"#070c1b", fontFamily:"'DM Sans',system-ui,sans-serif", color:"#cfd8dc", fontSize:13 },
  header:    { background:"#040915", borderBottom:"1px solid #111d33", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", minHeight:58 },
  brandName: { fontSize:15, fontWeight:900, color:"#fff", letterSpacing:2 },
  brandSub:  { fontSize:10, color:"#546e7a", marginTop:2 },
  tabRow:    { display:"flex", gap:0 },
  tab:       { background:"none", border:"none", borderBottom:"2px solid transparent", color:"#546e7a", padding:"18px 16px", cursor:"pointer", fontSize:12, fontWeight:600, whiteSpace:"nowrap", transition:"all 0.15s" },
  tabOn:     { color:"#4fc3f7", borderBottomColor:"#4fc3f7" },
  page:      { padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 },
  card:      { background:"#0b1324", border:"1px solid #111d33", borderRadius:10, padding:18 },
  cardTitle: { fontSize:10, fontWeight:700, color:"#4fc3f7", textTransform:"uppercase", letterSpacing:1.5, marginBottom:14, paddingBottom:8, borderBottom:"1px solid #111d33" },
  kpiCard:   { background:"#0b1324", border:"1px solid", borderRadius:10, padding:"14px 10px", textAlign:"center" },
  barBg:     { background:"#111d33", borderRadius:4, height:6, overflow:"hidden" },
  badge:     (color, bg) => ({ display:"inline-block", padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, color, background:bg }),
  table:     { width:"100%", borderCollapse:"collapse" },
  th:        { background:"#060c1a", color:"#546e7a", padding:"8px 10px", textAlign:"left", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1, borderBottom:"1px solid #111d33", whiteSpace:"nowrap" },
  thC:       { background:"#060c1a", color:"#546e7a", padding:"8px 10px", textAlign:"center", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:1, borderBottom:"1px solid #111d33", whiteSpace:"nowrap" },
  td:        { padding:"8px 10px", borderBottom:"1px solid #0b1324", verticalAlign:"middle" },
  tdC:       { padding:"8px 10px", borderBottom:"1px solid #0b1324", verticalAlign:"middle", textAlign:"center" },
  ava:       { width:36, height:36, borderRadius:"50%", background:"#1565c0", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:12, flexShrink:0 },
  btnSec:    { background:"#111d33", color:"#90caf9", border:"1px solid #1e3a5f", borderRadius:7, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" },
  btnPrimary:{ background:"#1565c0", color:"#fff", border:"none", borderRadius:7, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer" },
  inp:       { background:"#060c1a", border:"1px solid #1e3a5f", borderRadius:7, color:"#fff", padding:"8px 11px", fontSize:13, outline:"none", display:"block", fontFamily:"inherit" },
  alert:     (color) => ({ display:"flex", gap:10, padding:"9px 10px", background:"#060c1a", borderRadius:8, marginBottom:8, borderLeft:"3px solid " + color }),
};

function useStats(targets) {
  return useMemo(() => {
    const totalInv   = RADIOS.reduce((s,r) => s + r.investment, 0);
    const totalCalls = RADIOS.reduce((s,r) => s + r.calls, 0);
    const ventas     = LEADS.filter(l => l.status === "venta");
    const totalRev   = ventas.reduce((s,l) => s + l.pagoInicial, 0);
    const roi        = totalInv > 0 ? (((totalRev - totalInv) / totalInv) * 100).toFixed(1) : 0;
    const cpl        = LEADS.length > 0 ? Math.round(totalInv / LEADS.length) : 0;
    const cpa        = ventas.length > 0 ? Math.round(totalInv / ventas.length) : 0;

    const sellerStats = SELLERS.map(s => {
      const sLeads = LEADS.filter(l => l.sellerId === s.id);
      const sSales = sLeads.filter(l => l.status === "venta");
      const rev    = sSales.reduce((sum, l) => sum + l.pagoInicial, 0);
      const tgt    = targets[s.id] || s.target;
      const metaPct= Math.min(Math.round((sSales.length / tgt) * 100), 100);
      return {
        ...s,
        target: tgt,
        leads:  sLeads.length,
        verif:  sLeads.filter(l => l.status === "verificacion").length,
        citas:  sLeads.filter(l => l.status === "cita").length,
        sales:  sSales.length,
        revenue:rev,
        commission: rev * s.commissionPct,
        conv:   sLeads.length > 0 ? ((sSales.length / sLeads.length) * 100).toFixed(0) : "0",
        metaPct,
        metaDone: sSales.length >= tgt,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const radioStats = RADIOS.map(r => {
      const rLeads = LEADS.filter(l => l.radioId === r.id);
      const rSales = rLeads.filter(l => l.status === "venta");
      const rev    = rSales.reduce((s, l) => s + l.pagoInicial, 0);
      return {
        ...r,
        leads:  rLeads.length,
        sales:  rSales.length,
        revenue:rev,
        cpl:    rLeads.length > 0 ? Math.round(r.investment / rLeads.length) : null,
        roi:    r.investment > 0 ? (((rev - r.investment) / r.investment) * 100).toFixed(0) : null,
        conv:   r.calls > 0 ? ((rLeads.length / r.calls) * 100).toFixed(1) : "0",
      };
    }).sort((a, b) => b.leads - a.leads);

    return { totalInv, totalCalls, totalRev, roi, cpl, cpa, ventas, sellerStats, radioStats };
  }, [targets]);
}

export default function ExecutiveSuite() {
  const [tab,     setTab]     = useState("dashboard");
  const [targets, setTargets] = useState(Object.fromEntries(SELLERS.map(s => [s.id, s.target])));
  const stats = useStats(targets);

  const TABS = [
    { id:"dashboard", label:"Dashboard" },
    { id:"vendedores", label:"Vendedores" },
    { id:"radios",    label:"Radios" },
    { id:"pipeline",  label:"Pipeline" },
  ];

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0" }}>
          <div>
            <div style={S.brandName}>MINI-VAC VACATION CLUB</div>
            <div style={S.brandSub}>Suite Ejecutiva  {new Date().toLocaleDateString("en-US",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          </div>
        </div>
        <div style={S.tabRow}>
          {TABS.map(t => (
            <button key={t.id} style={{ ...S.tab, ...(tab===t.id ? S.tabOn : {}) }} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto" }}>
        {tab === "dashboard"  && <TabDashboard  stats={stats} />}
        {tab === "vendedores" && <TabVendedores stats={stats} targets={targets} setTargets={setTargets} />}
        {tab === "radios"     && <TabRadios     stats={stats} />}
        {tab === "pipeline"   && <TabPipeline   stats={stats} />}
      </div>
    </div>
  );
}

// --- DASHBOARD ---
function TabDashboard({ stats }) {
  const { totalInv, totalCalls, totalRev, roi, cpl, cpa, ventas, sellerStats, radioStats } = stats;

  const kpis = [
    { label:"Inversion Radio",   value:fmtUSD(totalInv),     sub:"esta semana",         color:"#b91c1c" },
    { label:"Llamadas Recibidas",value:totalCalls,            sub:"todas las emisoras",  color:"#925c0a" },
    { label:"Leads Captados",    value:LEADS.length,          sub:"periodo actual",      color:"#4fc3f7" },
    { label:"En Verificacion",   value:LEADS.filter(l=>l.status==="verificacion").length, sub:"pendientes cobro", color:"#925c0a" },
    { label:"Ventas Cerradas",   value:ventas.length,         sub:"periodo actual",      color:"#1a7f3c" },
    { label:"Ingresos (pagos)",  value:fmtUSD(totalRev),      sub:"enganche total",      color:"#1a7f3c" },
    { label:"ROI Global",        value:roi + "%",             sub:"inversion vs ingreso",color:Number(roi)>0?"#1a7f3c":"#b91c1c" },
    { label:"Costo por Lead",    value:fmtUSD(cpl),           sub:"inversion / leads",   color:"#4fc3f7" },
    { label:"Costo por Venta",   value:fmtUSD(cpa),           sub:"inversion / ventas",  color:"#925c0a" },
  ];

  const funnelKeys = ["nuevo","contactado","interesado","cita","verificacion","venta","no_interesado"];

  return (
    <div style={S.page}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(9,1fr)", gap:10 }}>
        {kpis.map((k,i) => (
          <div key={i} style={{ ...S.kpiCard, borderColor:k.color }}>
            <div style={{ fontSize:22, fontWeight:900, color:k.color, letterSpacing:-1 }}>{k.value}</div>
            <div style={{ fontSize:11, color:"#cfd8dc", fontWeight:600, marginTop:4 }}>{k.label}</div>
            <div style={{ fontSize:10, color:"#546e7a", marginTop:2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 2: Funnel + Radio */}
      <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:16 }}>
        {/* Funnel */}
        <div style={S.card}>
          <div style={S.cardTitle}>Embudo de Ventas</div>
          {funnelKeys.map(k => {
            const cfg = STATUS_CFG[k];
            const count = LEADS.filter(l => l.status === k).length;
            const w = LEADS.length > 0 ? (count / LEADS.length) * 100 : 0;
            return (
              <div key={k} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={S.badge(cfg.color, cfg.bg)}>{cfg.label}</span>
                  <span style={{ fontWeight:700, color:"#fff" }}>{count} <span style={{ color:"#546e7a", fontSize:11 }}>({w.toFixed(0)}%)</span></span>
                </div>
                <div style={S.barBg}>
                  <div style={{ width:w + "%", height:"100%", background:cfg.color, borderRadius:4, transition:"width 0.6s", minWidth:count>0?4:0 }} />
                </div>
              </div>
            );
          })}
          <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid #111d33", display:"flex", justifyContent:"space-around" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:800, color:"#1a7f3c" }}>{pct(ventas.length, LEADS.length)}%</div>
              <div style={{ fontSize:10, color:"#546e7a" }}>Conv. Global</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:800, color:"#925c0a" }}>{pct(LEADS.length, totalCalls)}%</div>
              <div style={{ fontSize:10, color:"#546e7a" }}>Llam. a Lead</div>
            </div>
          </div>
        </div>

        {/* Radio table */}
        <div style={S.card}>
          <div style={S.cardTitle}>Rendimiento por Emisora</div>
          <table style={S.table}>
            <thead>
              <tr>
                {["Emisora","Inversion","Llamadas","Leads","Ventas","Conv%","CPL","ROI"].map(h => (
                  <th key={h} style={h==="Emisora"?S.th:S.thC}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.radioStats.map(r => (
                <tr key={r.id}>
                  <td style={S.td}>
                    <div style={{ fontWeight:700, color:"#fff" }}>{r.name}</div>
                    <div style={{ fontSize:10, color:"#546e7a" }}>{r.freq}</div>
                  </td>
                  <td style={S.tdC}><span style={{ color:"#b91c1c" }}>{fmtUSD(r.investment)}</span></td>
                  <td style={S.tdC}><span style={{ color:"#925c0a" }}>{r.calls}</span></td>
                  <td style={S.tdC}>{r.leads}</td>
                  <td style={S.tdC}><span style={{ color:"#1a7f3c", fontWeight:700 }}>{r.sales}</span></td>
                  <td style={S.tdC}>
                    <div style={{ display:"flex", alignItems:"center", gap:5, justifyContent:"center" }}>
                      <div style={{ ...S.barBg, width:44, height:5 }}>
                        <div style={{ width:Math.min(Number(r.conv),100) + "%", height:"100%", background:Number(r.conv)>15?"#1a7f3c":Number(r.conv)>7?"#925c0a":"#b91c1c", borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:11 }}>{r.conv}%</span>
                    </div>
                  </td>
                  <td style={S.tdC}>{r.cpl != null ? fmtUSD(r.cpl) : "--"}</td>
                  <td style={S.tdC}>
                    {r.roi != null
                      ? <span style={{ color:Number(r.roi)>0?"#1a7f3c":"#b91c1c", fontWeight:700 }}>{r.roi}%</span>
                      : <span style={{ color:"#546e7a" }}>--</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: Ranking + Alertas */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Ranking */}
        <div style={S.card}>
          <div style={S.cardTitle}>Ranking Vendedores</div>
          {sellerStats.map((s, i) => (
            <div key={s.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 8px", borderRadius:8, borderLeft:"3px solid " + (i===0?"#1565c0":"#111d33"), marginBottom:8 }}>
              <div style={{ width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0, fontWeight:700, color:"#fff", background:i===0?"#b8860b":i===1?"#607d8b":i===2?"#5d4037":"#111d33" }}>
                {i===0?"1":i===1?"2":i===2?"3":"#"+(i+1)}
              </div>
              <div style={S.ava}>{s.avatar}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, color:"#fff", fontSize:13 }}>{s.name}</div>
                <div style={{ fontSize:11, color:"#546e7a" }}>{s.leads} leads - {s.conv}% conv</div>
                <div style={{ ...S.barBg, marginTop:5, height:4 }}>
                  <div style={{ width:s.metaPct + "%", height:"100%", background:s.metaDone?"#1a7f3c":"#1565c0", borderRadius:3 }} />
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:16, fontWeight:800, color:s.metaDone?"#1a7f3c":"#925c0a" }}>{s.sales} <span style={{ fontSize:11, color:"#546e7a" }}>/ {s.target}</span></div>
                <div style={{ fontSize:12, color:"#1a7f3c" }}>{fmtUSD(s.revenue)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alertas */}
        <div style={S.card}>
          <div style={S.cardTitle}>Alertas del Sistema</div>
          {LEADS.filter(l => l.status==="verificacion").length > 0 && (
            <div style={S.alert("#925c0a")}>
              <span style={{ fontSize:11, color:"#cfd8dc", lineHeight:1.4 }}>{LEADS.filter(l=>l.status==="verificacion").length} lead(s) en verificacion pendientes de cobro</span>
            </div>
          )}
          {sellerStats.filter(s => !s.metaDone).map(s => (
            <div key={s.id} style={S.alert("#925c0a")}>
              <span style={{ fontSize:11, color:"#cfd8dc", lineHeight:1.4 }}>{s.name}: {s.sales}/{s.target} ventas - faltan {s.target - s.sales} para meta</span>
            </div>
          ))}
          {sellerStats.filter(s => s.metaDone).map(s => (
            <div key={s.id} style={S.alert("#1a7f3c")}>
              <span style={{ fontSize:11, color:"#cfd8dc", lineHeight:1.4 }}>{s.name} cumplio su meta - comision: {fmtUSD(s.commission)}</span>
            </div>
          ))}
          {stats.radioStats.filter(r => r.leads === 0).map(r => (
            <div key={r.id} style={S.alert("#b91c1c")}>
              <span style={{ fontSize:11, color:"#cfd8dc", lineHeight:1.4 }}>{r.name}: sin leads captados este periodo</span>
            </div>
          ))}
          {(() => {
            const best = stats.radioStats.filter(r => r.cpl !== null).sort((a,b) => a.cpl-b.cpl)[0];
            return best ? (
              <div style={S.alert("#4fc3f7")}>
                <span style={{ fontSize:11, color:"#cfd8dc", lineHeight:1.4 }}>Mejor CPL: {best.name} a {fmtUSD(best.cpl)} por lead</span>
              </div>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
}

// --- VENDEDORES ---
function TabVendedores({ stats, targets, setTargets }) {
  const { sellerStats } = stats;
  const [selected,   setSelected]   = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [tmpTarget,  setTmpTarget]  = useState("");

  const seller      = selected ? sellerStats.find(s => s.id === selected) : null;
  const sellerLeads = selected ? LEADS.filter(l => l.sellerId === selected) : [];

  return (
    <div style={S.page}>
      {/* Team KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {[
          { label:"Total Ventas",      value:sellerStats.reduce((a,s)=>a+s.sales,0) + " ventas",      color:"#1a7f3c" },
          { label:"Total Ingresos",    value:fmtUSD(sellerStats.reduce((a,s)=>a+s.revenue,0)),         color:"#1a7f3c" },
          { label:"Top Vendedor",      value:sellerStats[0]?.name || "--",                             color:"#925c0a" },
          { label:"Comisiones Total",  value:fmtUSD(sellerStats.reduce((a,s)=>a+s.commission,0)),      color:"#1565c0" },
        ].map((k,i) => (
          <div key={i} style={{ ...S.kpiCard, borderColor:k.color, padding:"18px 16px" }}>
            <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:12, color:"#cfd8dc", fontWeight:600, marginTop:4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:16 }}>
        {/* Lista */}
        <div style={S.card}>
          <div style={S.cardTitle}>Vendedores</div>
          {sellerStats.map(s => (
            <div key={s.id}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 8px", borderRadius:8, marginBottom:8, cursor:"pointer", border:"1px solid " + (selected===s.id?"#1565c0":"transparent"), background:selected===s.id?"rgba(21,101,192,0.2)":"transparent", transition:"all 0.15s" }}
              onClick={() => setSelected(s.id === selected ? null : s.id)}>
              <div style={{ position:"relative" }}>
                <div style={S.ava}>{s.avatar}</div>
                <div style={{ position:"absolute", bottom:0, right:0, width:10, height:10, borderRadius:"50%", background:s.metaDone?"#1a7f3c":"#b91c1c", border:"2px solid #0b1324" }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:700, color:"#fff", fontSize:13 }}>{s.name}</span>
                  <span style={{ fontSize:11, color:s.metaDone?"#1a7f3c":"#925c0a", fontWeight:700 }}>{s.sales}/{s.target}</span>
                </div>
                <div style={{ fontSize:11, color:"#546e7a", marginBottom:5 }}>{s.conv}% conv - {fmtUSD(s.revenue)}</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ ...S.barBg, flex:1, height:5 }}>
                    <div style={{ width:s.metaPct + "%", height:"100%", background:s.metaDone?"#1a7f3c":"#1565c0", borderRadius:3, transition:"width 0.5s" }} />
                  </div>
                  <span style={{ fontSize:10, color:"#546e7a" }}>{s.metaPct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detalle */}
        {seller ? (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ ...S.card, background:"linear-gradient(135deg,#0b1324,#0d1a2e)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
                <div style={{ ...S.ava, width:52, height:52, fontSize:18, background:"#1565c0" }}>{seller.avatar}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:20, fontWeight:900, color:"#fff" }}>{seller.name}</div>
                  <div style={{ fontSize:12, color:"#546e7a" }}>Comision: {(seller.commissionPct*100).toFixed(0)}% - {seller.leads} leads asignados</div>
                </div>
                {editTarget === seller.id ? (
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:12, color:"#90caf9" }}>Meta:</span>
                    <input style={{ ...S.inp, width:60, padding:"4px 8px", textAlign:"center" }} type="number" value={tmpTarget}
                      onChange={e => setTmpTarget(e.target.value)} />
                    <button style={S.btnPrimary} onClick={() => { setTargets(p => ({ ...p, [seller.id]:Number(tmpTarget)||seller.target })); setEditTarget(null); }}>Guardar</button>
                    <button style={S.btnSec} onClick={() => setEditTarget(null)}>Cancelar</button>
                  </div>
                ) : (
                  <button style={S.btnSec} onClick={() => { setEditTarget(seller.id); setTmpTarget(String(seller.target)); }}>Editar Meta</button>
                )}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:16 }}>
                {[
                  { label:"Leads",    value:seller.leads,              color:"#4fc3f7" },
                  { label:"Citas",    value:seller.citas,              color:"#925c0a" },
                  { label:"Verif.",   value:seller.verif,              color:"#925c0a" },
                  { label:"Ventas",   value:seller.sales,              color:"#1a7f3c" },
                  { label:"Ingresos", value:fmtUSD(seller.revenue),    color:"#1a7f3c" },
                  { label:"Comision", value:fmtUSD(seller.commission), color:"#1565c0" },
                ].map((k,i) => (
                  <div key={i} style={{ background:"#060c1a", borderRadius:8, padding:"10px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{k.value}</div>
                    <div style={{ fontSize:10, color:"#546e7a", marginTop:2 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:12, color:"#90caf9", fontWeight:600 }}>Meta ({seller.sales}/{seller.target} ventas)</span>
                  <span style={{ fontSize:12, color:seller.metaDone?"#1a7f3c":"#925c0a", fontWeight:700 }}>{seller.metaPct}%</span>
                </div>
                <div style={{ ...S.barBg, height:12, borderRadius:6 }}>
                  <div style={{ width:seller.metaPct + "%", height:"100%", background:seller.metaDone?"linear-gradient(90deg,#2e7d32,#4ade80)":"linear-gradient(90deg,#1565c0,#4fc3f7)", borderRadius:6, transition:"width 0.6s" }} />
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>Leads de {seller.name}</div>
              {sellerLeads.length === 0
                ? <div style={{ textAlign:"center", color:"#546e7a", padding:"24px 0" }}>Sin leads asignados</div>
                : (
                  <table style={S.table}>
                    <thead><tr>{["Cliente","Emisora","Status","Destinos","Pago hoy"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {sellerLeads.map(l => {
                        const sc = STATUS_CFG[l.status];
                        const radio = RADIOS.find(r => r.id === l.radioId);
                        return (
                          <tr key={l.id}>
                            <td style={S.td}><div style={{ fontWeight:600, color:"#fff" }}>{l.nombre}</div></td>
                            <td style={S.tdC}><span style={{ color:"#4fc3f7", fontSize:12 }}>{radio?.name}</span></td>
                            <td style={S.tdC}><span style={S.badge(sc.color, sc.bg)}>{sc.label}</span></td>
                            <td style={S.td}><span style={{ color:"#ce93d8", fontSize:12 }}>{l.destinos.join(", ")||"--"}</span></td>
                            <td style={S.tdC}>{l.pagoInicial > 0 ? <span style={{ color:"#1a7f3c", fontWeight:700 }}>{fmtUSD(l.pagoInicial)}</span> : "--"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        ) : (
          <div style={{ ...S.card, display:"flex", alignItems:"center", justifyContent:"center", color:"#546e7a", fontSize:14, flexDirection:"column", gap:12, minHeight:300 }}>
            <div style={{ fontSize:40 }}>--</div>
            Selecciona un vendedor para ver su detalle
          </div>
        )}
      </div>
    </div>
  );
}

// --- RADIOS ---
function TabRadios({ stats }) {
  const { radioStats, totalInv, totalCalls } = stats;
  const totalRev = radioStats.reduce((s,r) => s + r.revenue, 0);

  return (
    <div style={S.page}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {[
          { label:"Inversion Total",   value:fmtUSD(totalInv),   color:"#b91c1c" },
          { label:"Total Llamadas",    value:totalCalls,           color:"#925c0a" },
          { label:"Total Leads",       value:LEADS.length,         color:"#4fc3f7" },
          { label:"Ingresos vs Radio", value:fmtUSD(totalRev),    color:totalRev>totalInv?"#1a7f3c":"#b91c1c" },
        ].map((k,i) => (
          <div key={i} style={{ ...S.kpiCard, borderColor:k.color, padding:"18px 16px" }}>
            <div style={{ fontSize:20, fontWeight:800, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:12, color:"#cfd8dc", fontWeight:600, marginTop:4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Detalle por Emisora</div>
        <table style={S.table}>
          <thead>
            <tr>{["Emisora","Inversion","Llamadas","Leads","Conv%","Ventas","Ingresos","CPL","ROI"].map(h => (
              <th key={h} style={h==="Emisora"?S.th:S.thC}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {radioStats.map(r => (
              <tr key={r.id}>
                <td style={S.td}>
                  <div style={{ fontWeight:700, color:"#fff", fontSize:13 }}>{r.name}</div>
                  <div style={{ fontSize:10, color:"#546e7a" }}>{r.freq}</div>
                </td>
                <td style={S.tdC}><span style={{ color:"#b91c1c" }}>{fmtUSD(r.investment)}</span></td>
                <td style={S.tdC}><span style={{ color:"#925c0a" }}>{r.calls}</span></td>
                <td style={S.tdC}>{r.leads}</td>
                <td style={S.tdC}>
                  <div style={{ display:"flex", alignItems:"center", gap:5, justifyContent:"center" }}>
                    <div style={{ ...S.barBg, width:50, height:6 }}>
                      <div style={{ width:Math.min(Number(r.conv),100)+"%", height:"100%", background:Number(r.conv)>15?"#1a7f3c":Number(r.conv)>7?"#925c0a":"#b91c1c", borderRadius:3 }} />
                    </div>
                    <span>{r.conv}%</span>
                  </div>
                </td>
                <td style={S.tdC}><span style={{ color:"#1a7f3c", fontWeight:700 }}>{r.sales}</span></td>
                <td style={S.tdC}><span style={{ color:"#1a7f3c" }}>{fmtUSD(r.revenue)}</span></td>
                <td style={S.tdC}>{r.cpl!=null ? fmtUSD(r.cpl) : "--"}</td>
                <td style={S.tdC}>
                  {r.roi!=null
                    ? <span style={{ color:Number(r.roi)>0?"#1a7f3c":"#b91c1c", fontWeight:700 }}>{r.roi}%</span>
                    : <span style={{ color:"#546e7a" }}>--</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bar chart de inversion vs ingresos por radio */}
      <div style={S.card}>
        <div style={S.cardTitle}>Inversion vs Ingresos por Emisora</div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {radioStats.map(r => {
            const maxVal = Math.max(...radioStats.map(x => x.investment));
            const invW   = maxVal > 0 ? (r.investment / maxVal) * 100 : 0;
            const revW   = maxVal > 0 ? (r.revenue    / maxVal) * 100 : 0;
            return (
              <div key={r.id}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontWeight:600, color:"#fff" }}>{r.name}</span>
                  <span style={{ fontSize:12, color:"#546e7a" }}>{r.sales} venta(s)</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:10, color:"#b91c1c", width:70 }}>Inversion</span>
                    <div style={{ ...S.barBg, flex:1, height:8 }}>
                      <div style={{ width:invW+"%", height:"100%", background:"#b91c1c", borderRadius:4 }} />
                    </div>
                    <span style={{ fontSize:11, color:"#b91c1c", width:60, textAlign:"right" }}>{fmtUSD(r.investment)}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:10, color:"#1a7f3c", width:70 }}>Ingresos</span>
                    <div style={{ ...S.barBg, flex:1, height:8 }}>
                      <div style={{ width:revW+"%", height:"100%", background:"#1a7f3c", borderRadius:4 }} />
                    </div>
                    <span style={{ fontSize:11, color:"#1a7f3c", width:60, textAlign:"right" }}>{fmtUSD(r.revenue)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- PIPELINE ---
function TabPipeline({ stats }) {
  const cols = ["nuevo","contactado","interesado","cita","verificacion","venta","no_interesado"];

  return (
    <div style={S.page}>
      {/* Resumen numerico */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:10 }}>
        {cols.map(k => {
          const cfg   = STATUS_CFG[k];
          const items = LEADS.filter(l => l.status === k);
          const rev   = items.reduce((s,l) => s + l.pagoInicial, 0);
          return (
            <div key={k} style={{ ...S.card, textAlign:"center", borderTop:"3px solid " + cfg.color }}>
              <div style={{ fontSize:24, fontWeight:900, color:cfg.color }}>{items.length}</div>
              <div style={{ fontSize:11, color:cfg.color, fontWeight:600, marginTop:2 }}>{cfg.label}</div>
              {rev > 0 && <div style={{ fontSize:11, color:"#546e7a", marginTop:4 }}>{fmtUSD(rev)}</div>}
            </div>
          );
        })}
      </div>

      {/* Tabla completa de leads */}
      <div style={S.card}>
        <div style={S.cardTitle}>Todos los Leads</div>
        <table style={S.table}>
          <thead>
            <tr>{["Cliente","Vendedor","Emisora","Status","Destinos","Precio total","Pago hoy"].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {LEADS.map(l => {
              const sc     = STATUS_CFG[l.status];
              const seller = SELLERS.find(s => s.id === l.sellerId);
              const radio  = RADIOS.find(r => r.id === l.radioId);
              return (
                <tr key={l.id}>
                  <td style={S.td}><div style={{ fontWeight:600, color:"#fff" }}>{l.nombre}</div></td>
                  <td style={S.td}><span style={{ fontSize:12, color:"#6b7280" }}>{seller?.name}</span></td>
                  <td style={S.td}><span style={{ fontSize:12, color:"#4fc3f7" }}>{radio?.name}</span></td>
                  <td style={S.td}><span style={S.badge(sc.color, sc.bg)}>{sc.label}</span></td>
                  <td style={S.td}><span style={{ fontSize:12, color:"#ce93d8" }}>{l.destinos.join(", ")||"--"}</span></td>
                  <td style={S.td}>{l.salePrice > 0 ? <span style={{ color:"#3d4554" }}>{fmtUSD(l.salePrice)}</span> : "--"}</td>
                  <td style={S.td}>{l.pagoInicial > 0 ? <span style={{ color:"#1a7f3c", fontWeight:700 }}>{fmtUSD(l.pagoInicial)}</span> : "--"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
