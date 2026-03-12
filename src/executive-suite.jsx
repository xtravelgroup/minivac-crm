import React, { useState, useEffect } from "react";
import { supabase as SB } from "./supabase.js";

var fmtUSD = function(n){ return "$" + Number(n||0).toLocaleString("en-US", {minimumFractionDigits:0}); };
var fmtPct = function(a,b){ return b>0 ? ((a/b)*100).toFixed(1)+"%" : "0%"; };

// ── Tema Zoho gris claro ──
var C = {
  bg:       "#f4f5f7",
  white:    "#ffffff",
  border:   "#e3e6ea",
  text:     "#1a1f2e",
  sub:      "#6b7280",
  muted:    "#9ca3af",
  indigo:   "#1565c0",
  teal:     "#0ea5a0",
  green:    "#1a7f3c",
  amber:    "#f59e0b",
  red:      "#b91c1c",
  violet:   "#5b21b6",
  coral:    "#f97316",
};

var S = {
  root:   { background: C.bg, minHeight:"100vh", fontFamily:"'DM Sans',system-ui,sans-serif", color:C.text, fontSize:13 },
  topbar: { background:C.white, borderBottom:"1px solid "+C.border, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:52, flexShrink:0 },
  page:   { padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 },
  card:   { background:C.white, border:"1px solid "+C.border, borderRadius:10, padding:18 },
  ctit:   { fontSize:10, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14, paddingBottom:8, borderBottom:"1px solid "+C.border },
  tab:    function(on){ return { background:"none", border:"none", borderBottom:"2px solid "+(on?C.indigo:"transparent"), color:on?C.indigo:C.sub, padding:"14px 16px", cursor:"pointer", fontSize:12, fontWeight:on?700:500, whiteSpace:"nowrap" }; },
  kpi:    function(color){ return { background:C.white, border:"1px solid "+C.border, borderTop:"3px solid "+color, borderRadius:10, padding:"14px 16px", textAlign:"left" }; },
  bar:    { background:"#f0f1f3", borderRadius:4, height:6, overflow:"hidden" },
  th:     { background:"#f8f9fb", color:C.muted, padding:"8px 12px", textAlign:"left", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid "+C.border, whiteSpace:"nowrap" },
  thc:    { background:"#f8f9fb", color:C.muted, padding:"8px 12px", textAlign:"center", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid "+C.border, whiteSpace:"nowrap" },
  td:     { padding:"9px 12px", borderBottom:"1px solid #f4f5f7", verticalAlign:"middle" },
  tdc:    { padding:"9px 12px", borderBottom:"1px solid #f4f5f7", verticalAlign:"middle", textAlign:"center" },
  bdg:    function(c,bg){ return { display:"inline-block", padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, color:c, background:bg }; },
  ava:    function(color){ return { width:34, height:34, borderRadius:"50%", background:color||C.indigo, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:12, flexShrink:0 }; },
};

var STATUS_CFG = {
  nuevo:         { l:"Nuevo",         c:C.teal,   bg:"rgba(14,165,160,0.08)"  },
  contactado:    { l:"Contactado",    c:C.indigo, bg:"rgba(21,101,192,0.08)"  },
  interesado:    { l:"Interesado",    c:C.violet, bg:"rgba(91,33,182,0.08)"   },
  cita:          { l:"Cita",          c:C.amber,  bg:"rgba(245,158,11,0.08)"  },
  verificacion:  { l:"Verificacion",  c:C.coral,  bg:"rgba(249,115,22,0.08)"  },
  venta:         { l:"Venta",         c:C.green,  bg:"rgba(26,127,60,0.08)"   },
  no_interesado: { l:"No interesado", c:C.muted,  bg:"#f4f5f7"                },
};

function Bdg(props){
  var cfg = STATUS_CFG[props.status] || {l:props.status, c:C.muted, bg:"#f4f5f7"};
  return React.createElement("span", {style: S.bdg(cfg.c, cfg.bg)}, cfg.l);
}

function KpiCard(props){
  return React.createElement("div", {style: S.kpi(props.color)}, [
    React.createElement("div", {key:"v", style:{fontSize:22, fontWeight:800, color:props.color, letterSpacing:-0.5}}, props.value),
    React.createElement("div", {key:"l", style:{fontSize:12, color:C.text, fontWeight:600, marginTop:4}}, props.label),
    props.sub && React.createElement("div", {key:"s", style:{fontSize:11, color:C.muted, marginTop:2}}, props.sub),
  ]);
}

function BarRow(props){
  var pct = props.total > 0 ? Math.min((props.value / props.total)*100, 100) : 0;
  return React.createElement("div", {style:{marginBottom:10}}, [
    React.createElement("div", {key:"top", style:{display:"flex", justifyContent:"space-between", marginBottom:4}}, [
      React.createElement("span", {key:"l", style:{fontSize:12, color:C.text, fontWeight:500}}, props.label),
      React.createElement("span", {key:"v", style:{fontSize:12, fontWeight:700, color:props.color||C.indigo}}, props.display||props.value),
    ]),
    React.createElement("div", {key:"bar", style:S.bar}, [
      React.createElement("div", {key:"fill", style:{width:pct+"%", height:"100%", background:props.color||C.indigo, borderRadius:4, transition:"width 0.5s"}}),
    ]),
  ]);
}

// ── Tabs ──
var TABS = [
  {id:"resumen",    l:"Resumen"},
  {id:"ventas",     l:"Ventas"},
  {id:"reservas",   l:"Reservas"},
  {id:"cobranza",   l:"Cobranza"},
  {id:"vendedores", l:"Vendedores"},
  {id:"radios",     l:"Radios / ROI"},
];

export default function ExecutiveSuite() {
  var [tab, setTab] = useState("resumen");
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function(){
    // Cargar datos en paralelo
    Promise.all([
      SB.from("leads").select("id, nombre, estado_civil, status, emisora_id, emisora, created_at, sale_price, pago_inicial"),
      SB.from("reservaciones").select("id, folio, status, total, fee, checkin, checkout, agente_nombre, created_at, destino_nombre, hotel"),
      SB.from("radio_spots").select("id, emisora_id, costo, talento, fecha, semana, dia_semana, hora, duracion, tipo, incidencia"),
      SB.from("emisoras").select("id, nombre"),
      SB.from("leads").select("id, nombre, emisora, emisora_id, created_at, status, sale_price"),
    ]).then(function(results){
      var leads      = (!results[0].error && results[0].data) ? results[0].data : [];
      var reservas   = (!results[1].error && results[1].data) ? results[1].data : [];
      var spots      = (!results[2].error && results[2].data) ? results[2].data : [];
      var emisoras   = (!results[3].error && results[3].data) ? results[3].data : [];
      var leadsRadio = (!results[4].error && results[4].data) ? results[4].data : [];
      if(results[2].error) console.error("radio_spots error:", results[2].error.message);
      if(results[3].error) console.error("emisoras error:", results[3].error.message);
      setData({ leads: leads, reservas: reservas, profiles: [], spots: spots, emisoras: emisoras, leadsRadio: leadsRadio });
      setLoading(false);
    }).catch(function(err){
      console.error("Dashboard error:", err);
      setData({ leads:[], reservas:[], profiles:[], spots:[], emisoras:[], leadsRadio:[] });
      setLoading(false);
    });
  },[]);

  if(loading) return React.createElement("div", {style:{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",color:C.sub,fontSize:14}}, "Cargando dashboard...");
  if(!data) return null;

  return React.createElement("div", {style:S.root}, [
    // Topbar
    React.createElement("div", {key:"top", style:S.topbar}, [
      React.createElement("div", {key:"brand", style:{fontWeight:800, fontSize:15, color:C.text, letterSpacing:0.5}}, "Dashboard Ejecutivo"),
      React.createElement("div", {key:"tabs", style:{display:"flex"}},
        TABS.map(function(t){
          return React.createElement("button", {key:t.id, style:S.tab(tab===t.id), onClick:function(){setTab(t.id);}}, t.l);
        })
      ),
      React.createElement("div", {key:"date", style:{fontSize:11,color:C.muted}}, new Date().toLocaleDateString("es-US",{day:"numeric",month:"long",year:"numeric"})),
    ]),
    // Contenido
    React.createElement("div", {key:"body"},
      tab==="resumen"    && React.createElement(TabResumen,    {data:data}) ||
      tab==="ventas"     && React.createElement(TabVentas,     {data:data}) ||
      tab==="reservas"   && React.createElement(TabReservas,   {data:data}) ||
      tab==="cobranza"   && React.createElement(TabCobranza,   {data:data}) ||
      tab==="vendedores" && React.createElement(TabVendedores, {data:data}) ||
      tab==="radios"     && React.createElement(TabRadios,     {data:data})
    ),
  ]);
}

// ── TAB RESUMEN ──
function TabResumen(props){
  var leads    = props.data.leads;
  var reservas = props.data.reservas;

  var ventas       = leads.filter(function(l){ return l.status==="venta"||l.status==="verificacion"; });
  var totalIngPag  = leads.reduce(function(s,l){
    var ph = []||[];
    return s + ph.reduce(function(a,p){ return a+(p.monto||0); },0);
  },0);
  var totalPaq     = totalIngPag;
  var resActivas   = reservas.filter(function(r){ return r.status==="en_reserva"||r.status==="vlo_proceso"||r.status==="confirmada"; });
  var resCompletadas = reservas.filter(function(r){ return r.status==="completada"; });

  var funnelKeys = ["nuevo","contactado","interesado","cita","verificacion","venta","no_interesado"];

  var kpis = [
    {l:"Total Leads",        v:leads.length,           c:C.indigo, s:"en el sistema"},
    {l:"Ventas / Verif.",    v:ventas.length,           c:C.green,  s:"cerradas"},
    {l:"Conversion",         v:fmtPct(ventas.length, leads.length), c:C.teal, s:"leads a venta"},
    {l:"Ingresos Cobrados",  v:fmtUSD(totalIngPag),    c:C.green,  s:"pagos recibidos"},
    {l:"Valor Contratos",    v:fmtUSD(totalPaq),       c:C.violet, s:"precio paquetes"},
    {l:"Reservas Activas",   v:resActivas.length,       c:C.amber,  s:"en proceso"},
    {l:"Reservas Completadas",v:resCompletadas.length,  c:C.teal,   s:"viajes realizados"},
  ];

  return React.createElement("div", {style:S.page}, [
    // KPIs
    React.createElement("div", {key:"kpis", style:{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:12}},
      kpis.map(function(k,i){
        return React.createElement(KpiCard, {key:i, label:k.l, value:k.v, color:k.c, sub:k.s});
      })
    ),
    // Fila 2: Embudo + Reservas por status
    React.createElement("div", {key:"row2", style:{display:"grid", gridTemplateColumns:"280px 1fr", gap:16}}, [
      // Embudo
      React.createElement("div", {key:"funnel", style:S.card}, [
        React.createElement("div", {key:"t", style:S.ctit}, "Embudo de Ventas"),
        funnelKeys.map(function(k){
          var cfg = STATUS_CFG[k] || {l:k, c:C.muted};
          var cnt = leads.filter(function(l){ return l.status===k; }).length;
          return React.createElement(BarRow, {key:k, label:cfg.l, value:cnt, total:leads.length, display:String(cnt)+" ("+fmtPct(cnt,leads.length)+")", color:cfg.c});
        }),
      ]),
      // Reservas por status
      React.createElement("div", {key:"res", style:S.card}, [
        React.createElement("div", {key:"t", style:S.ctit}, "Pipeline de Reservas"),
        React.createElement("div", {key:"g", style:{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:10}},
          [
            {k:"solicitada",      l:"Solicitud",   c:C.amber},
            {k:"en_reserva",      l:"En Reserva",  c:C.indigo},
            {k:"vlo_proceso",     l:"VLO",         c:C.violet},
            {k:"confirmada",      l:"Confirmada",  c:C.green},
            {k:"rechazado_hotel", l:"Rechazado",   c:C.coral},
            {k:"cancelada",       l:"Cancelada",   c:C.red},
            {k:"completada",      l:"Completada",  c:C.teal},
          ].map(function(col){
            var cnt = reservas.filter(function(r){ return r.status===col.k||(col.k==="solicitada"&&r.status==="solicitud"); }).length;
            return React.createElement("div", {key:col.k, style:{background:C.white, border:"1px solid "+C.border, borderTop:"3px solid "+col.c, borderRadius:9, padding:"14px 10px", textAlign:"center"}}, [
              React.createElement("div", {key:"n", style:{fontSize:26, fontWeight:800, color:col.c}}, cnt),
              React.createElement("div", {key:"l", style:{fontSize:11, color:C.sub, fontWeight:600, marginTop:3}}, col.l),
            ]);
          })
        ),
        // Tabla ultimas reservas
        React.createElement("div", {key:"rt", style:{marginTop:16}}, [
          React.createElement("div", {key:"tit", style:{fontSize:11, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10}}, "Ultimas reservas"),
          React.createElement("table", {key:"tbl", style:{width:"100%", borderCollapse:"collapse"}}, [
            React.createElement("thead", {key:"h"}, React.createElement("tr", {},
              ["Folio","Cliente/Hotel","Destino","Checkin","Status"].map(function(h){
                return React.createElement("th", {key:h, style:S.th}, h);
              })
            )),
            React.createElement("tbody", {key:"b"},
              reservas.slice(0,5).map(function(r){
                var sc = {solicitada:C.amber,solicitud:C.amber,en_reserva:C.indigo,vlo_proceso:C.violet,confirmada:C.green,rechazado_hotel:C.coral,cancelada:C.red,completada:C.teal}[r.status]||C.muted;
                return React.createElement("tr", {key:r.id}, [
                  React.createElement("td", {key:"f", style:S.td}, React.createElement("span",{style:{fontWeight:600,color:C.indigo,fontSize:11}},r.folio)),
                  React.createElement("td", {key:"h", style:S.td}, React.createElement("div",{style:{fontSize:12,color:C.text}},r.hotel||"--")),
                  React.createElement("td", {key:"d", style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.sub}},r.destino_nombre||"--")),
                  React.createElement("td", {key:"c", style:S.tdc}, React.createElement("span",{style:{fontSize:11,color:C.sub}},r.checkin||"--")),
                  React.createElement("td", {key:"s", style:S.tdc}, React.createElement("span",{style:S.bdg(sc,"rgba(0,0,0,0.04)")},r.status||"--")),
                ]);
              })
            ),
          ]),
        ]),
      ]),
    ]),
  ]);
}

// ── TAB VENTAS ──
function TabVentas(props){
  var leads = props.data.leads;
  var porEstado = ["nuevo","contactado","interesado","cita","verificacion","venta","no_interesado"].map(function(k){
    var items = leads.filter(function(l){ return l.status===k; });
    var ingresos = items.reduce(function(s,l){ var ph=[]||[]; return s+ph.reduce(function(a,p){return a+(p.monto||0);},0); },0);
    return {k:k, items:items, ingresos:ingresos};
  });
  var totalPag = leads.reduce(function(s,l){ var ph=[]||[]; return s+ph.reduce(function(a,p){return a+(p.monto||0);},0); },0);
  var totalPaq = leads.reduce(function(s,l){ return s+(Number(l.sale_price)||0); },0);

  return React.createElement("div", {style:S.page}, [
    React.createElement("div", {key:"kpis", style:{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12}}, [
      React.createElement(KpiCard, {key:"a", label:"Total Leads", value:leads.length, color:C.indigo}),
      React.createElement(KpiCard, {key:"b", label:"Ventas Cerradas", value:leads.filter(function(l){return l.status==="venta";}).length, color:C.green}),
      React.createElement(KpiCard, {key:"c", label:"Ingresos Cobrados", value:fmtUSD(totalPag), color:C.green}),
      React.createElement(KpiCard, {key:"d", label:"Valor Total Contratos", value:fmtUSD(totalPaq), color:C.violet}),
    ]),
    React.createElement("div", {key:"card", style:S.card}, [
      React.createElement("div", {key:"t", style:S.ctit}, "Leads por Estado"),
      React.createElement("table", {key:"tbl", style:{width:"100%", borderCollapse:"collapse"}}, [
        React.createElement("thead", {key:"h"}, React.createElement("tr", {},
          ["Estado","Cantidad","% del total","Ingresos cobrados"].map(function(h){ return React.createElement("th",{key:h,style:S.th},h); })
        )),
        React.createElement("tbody", {key:"b"},
          porEstado.map(function(row){
            var cfg = STATUS_CFG[row.k]||{l:row.k,c:C.muted,bg:"#f4f5f7"};
            return React.createElement("tr", {key:row.k}, [
              React.createElement("td", {key:"e", style:S.td}, React.createElement("span",{style:S.bdg(cfg.c,cfg.bg)},cfg.l)),
              React.createElement("td", {key:"c", style:S.tdc}, React.createElement("span",{style:{fontWeight:700,fontSize:14,color:cfg.c}},row.items.length)),
              React.createElement("td", {key:"p", style:S.tdc}, [
                React.createElement("div",{key:"bar",style:Object.assign({},S.bar,{display:"inline-block",width:80,verticalAlign:"middle",marginRight:6})},
                  React.createElement("div",{style:{width:fmtPct(row.items.length,leads.length),height:"100%",background:cfg.c,borderRadius:4}})
                ),
                React.createElement("span",{key:"pct",style:{fontSize:11}},fmtPct(row.items.length,leads.length)),
              ]),
              React.createElement("td", {key:"i", style:S.tdc}, row.ingresos>0?React.createElement("span",{style:{color:C.green,fontWeight:700}},fmtUSD(row.ingresos)):"--"),
            ]);
          })
        ),
      ]),
    ]),
    // Tabla leads recientes
    React.createElement("div", {key:"rec", style:S.card}, [
      React.createElement("div", {key:"t", style:S.ctit}, "Leads Recientes"),
      React.createElement("table", {key:"tbl", style:{width:"100%", borderCollapse:"collapse"}}, [
        React.createElement("thead", {key:"h"}, React.createElement("tr", {},
          ["Cliente","Vendedor","Estado","Paquete","Pagado","Fecha"].map(function(h){return React.createElement("th",{key:h,style:S.th},h);})
        )),
        React.createElement("tbody", {key:"b"},
          leads.slice(0,15).map(function(l){
            var cfg = STATUS_CFG[l.estado]||{l:l.estado,c:C.muted,bg:"#f4f5f7"};
            var pagado = ([]||[]).reduce(function(s,p){return s+(p.monto||0);},0);
            return React.createElement("tr", {key:l.id}, [
              React.createElement("td",{key:"n",style:S.td},React.createElement("span",{style:{fontWeight:600}},l.nombre||"--")),
              React.createElement("td",{key:"v",style:S.td},React.createElement("span",{style:{fontSize:11,color:C.sub}},l.emisora||"--")),
              React.createElement("td",{key:"e",style:S.td},React.createElement("span",{style:S.bdg(cfg.c,cfg.bg)},cfg.l)),
              React.createElement("td",{key:"p",style:S.tdc},l.sale_price?React.createElement("span",{style:{color:C.violet}},fmtUSD(l.sale_price)):"--"),
              React.createElement("td",{key:"m",style:S.tdc},pagado>0?React.createElement("span",{style:{color:C.green,fontWeight:700}},fmtUSD(pagado)):"--"),
              React.createElement("td",{key:"f",style:S.tdc},React.createElement("span",{style:{fontSize:11,color:C.muted}},(l.created_at||"").split("T")[0]||"--")),
            ]);
          })
        ),
      ]),
    ]),
  ]);
}

// ── TAB RESERVAS ──
function TabReservas(props){
  var reservas = props.data.reservas;
  var activas = reservas.filter(function(r){return r.status==="en_reserva"||r.status==="vlo_proceso";});
  var confirmadas = reservas.filter(function(r){return r.status==="confirmada";});
  var completadas = reservas.filter(function(r){return r.status==="completada";});
  var totalFee = reservas.reduce(function(s,r){return s+(r.fee||0);},0);
  var totalTotal = reservas.reduce(function(s,r){return s+(r.total||0);},0);

  return React.createElement("div", {style:S.page}, [
    React.createElement("div", {key:"kpis", style:{display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12}}, [
      React.createElement(KpiCard, {key:"a", label:"Total Reservas", value:reservas.length, color:C.indigo}),
      React.createElement(KpiCard, {key:"b", label:"En Proceso", value:activas.length, color:C.amber}),
      React.createElement(KpiCard, {key:"c", label:"Confirmadas", value:confirmadas.length, color:C.green}),
      React.createElement(KpiCard, {key:"d", label:"Completadas", value:completadas.length, color:C.teal}),
      React.createElement(KpiCard, {key:"e", label:"Ingresos Reservas", value:fmtUSD(totalTotal), color:C.green}),
    ]),
    React.createElement("div", {key:"tbl", style:S.card}, [
      React.createElement("div", {key:"t", style:S.ctit}, "Todas las Reservas"),
      React.createElement("table", {key:"table", style:{width:"100%", borderCollapse:"collapse"}}, [
        React.createElement("thead", {key:"h"}, React.createElement("tr", {},
          ["Folio","Hotel","Destino","Checkin","Agente","Fee","Total","Status"].map(function(h){return React.createElement("th",{key:h,style:S.th},h);})
        )),
        React.createElement("tbody", {key:"b"},
          reservas.map(function(r){
            var sc = {solicitada:C.amber,solicitud:C.amber,en_reserva:C.indigo,vlo_proceso:C.violet,confirmada:C.green,rechazado_hotel:C.coral,cancelada:C.red,completada:C.teal}[r.status]||C.muted;
            return React.createElement("tr", {key:r.id}, [
              React.createElement("td",{key:"f",style:S.td},React.createElement("span",{style:{fontWeight:700,color:C.indigo,fontSize:11}},r.folio||"--")),
              React.createElement("td",{key:"h",style:S.td},React.createElement("span",{style:{fontWeight:600,fontSize:12}},r.hotel||"--")),
              React.createElement("td",{key:"d",style:S.td},React.createElement("span",{style:{fontSize:11,color:C.sub}},r.destino_nombre||"--")),
              React.createElement("td",{key:"c",style:S.tdc},React.createElement("span",{style:{fontSize:11}},r.checkin||"--")),
              React.createElement("td",{key:"a",style:S.td},React.createElement("span",{style:{fontSize:11,color:C.sub}},r.agente_nombre||"--")),
              React.createElement("td",{key:"fee",style:S.tdc},r.fee?React.createElement("span",{style:{color:C.indigo}},fmtUSD(r.fee)):"--"),
              React.createElement("td",{key:"tot",style:S.tdc},r.total?React.createElement("span",{style:{color:C.green,fontWeight:700}},fmtUSD(r.total)):"--"),
              React.createElement("td",{key:"s",style:S.tdc},React.createElement("span",{style:S.bdg(sc,"rgba(0,0,0,0.04)")},r.status||"--")),
            ]);
          })
        ),
      ]),
    ]),
  ]);
}

// ── TAB COBRANZA ──
function TabCobranza(props){
  var leads = props.data.leads;
  // Leads con saldo pendiente
  var conSaldo = leads.filter(function(l){
    var ph = []||[];
    var pagado = ph.reduce(function(s,p){return s+(p.monto||0);},0);
    return l.sale_price && pagado < l.sale_price;
  });
  var totalPagado = leads.reduce(function(s,l){ return s+([]||[]).reduce(function(a,p){return a+(p.monto||0);},0); },0);
  var totalContratos = leads.reduce(function(s,l){ return s+(l.sale_price||0); },0);
  var totalPendiente = totalContratos - totalPagado;

  return React.createElement("div", {style:S.page}, [
    React.createElement("div", {key:"kpis", style:{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12}}, [
      React.createElement(KpiCard, {key:"a", label:"Total Contratos", value:fmtUSD(totalContratos), color:C.indigo}),
      React.createElement(KpiCard, {key:"b", label:"Total Cobrado", value:fmtUSD(totalPagado), color:C.green}),
      React.createElement(KpiCard, {key:"c", label:"Saldo Pendiente", value:fmtUSD(totalPendiente), color:C.red}),
      React.createElement(KpiCard, {key:"d", label:"Clientes con Saldo", value:conSaldo.length, color:C.amber}),
    ]),
    React.createElement("div", {key:"barra", style:S.card}, [
      React.createElement("div", {key:"t", style:S.ctit}, "Cobranza Global"),
      React.createElement("div", {key:"label", style:{display:"flex",justifyContent:"space-between",marginBottom:6}}, [
        React.createElement("span",{key:"a",style:{fontSize:12,color:C.sub}},"Cobrado: "+fmtUSD(totalPagado)),
        React.createElement("span",{key:"b",style:{fontSize:12,color:C.sub}},"Pendiente: "+fmtUSD(totalPendiente)),
        React.createElement("span",{key:"c",style:{fontSize:12,fontWeight:700,color:C.green}},fmtPct(totalPagado, totalContratos)),
      ]),
      React.createElement("div",{key:"bar",style:Object.assign({},S.bar,{height:16,borderRadius:8})},
        React.createElement("div",{style:{width:fmtPct(totalPagado,totalContratos),height:"100%",background:C.green,borderRadius:8,transition:"width 0.6s"}})
      ),
    ]),
    React.createElement("div", {key:"tbl", style:S.card}, [
      React.createElement("div", {key:"t", style:S.ctit}, "Clientes con Saldo Pendiente"),
      conSaldo.length===0
        ? React.createElement("div",{key:"empty",style:{textAlign:"center",padding:"24px",color:C.muted}},"Sin saldos pendientes")
        : React.createElement("table", {key:"table", style:{width:"100%", borderCollapse:"collapse"}}, [
            React.createElement("thead",{key:"h"},React.createElement("tr",{},
              ["Cliente","Vendedor","Paquete","Pagado","Pendiente","% Pagado"].map(function(h){return React.createElement("th",{key:h,style:S.th},h);})
            )),
            React.createElement("tbody",{key:"b"},
              conSaldo.map(function(l){
                var pagado = ([]||[]).reduce(function(s,p){return s+(p.monto||0);},0);
                var pendiente = (l.sale_price||0) - pagado;
                var pct2 = l.sale_price>0 ? Math.round((pagado/l.sale_price)*100) : 0;
                return React.createElement("tr",{key:l.id},[
                  React.createElement("td",{key:"n",style:S.td},React.createElement("span",{style:{fontWeight:600}},l.nombre||"--")),
                  React.createElement("td",{key:"v",style:S.td},React.createElement("span",{style:{fontSize:11,color:C.sub}},l.emisora||"--")),
                  React.createElement("td",{key:"p",style:S.tdc},l.sale_price?React.createElement("span",{style:{color:C.violet}},fmtUSD(l.sale_price)):"--"),
                  React.createElement("td",{key:"c",style:S.tdc},React.createElement("span",{style:{color:C.green,fontWeight:700}},fmtUSD(pagado))),
                  React.createElement("td",{key:"pe",style:S.tdc},React.createElement("span",{style:{color:C.red,fontWeight:700}},fmtUSD(pendiente))),
                  React.createElement("td",{key:"pc",style:S.tdc},[
                    React.createElement("div",{key:"bar",style:Object.assign({},S.bar,{display:"inline-block",width:60,verticalAlign:"middle",marginRight:6})},
                      React.createElement("div",{style:{width:pct2+"%",height:"100%",background:pct2>75?C.green:pct2>40?C.amber:C.red,borderRadius:4}})
                    ),
                    React.createElement("span",{key:"pct",style:{fontSize:11}},pct2+"%"),
                  ]),
                ]);
              })
            ),
          ]),
    ]),
  ]);
}

// ── TAB VENDEDORES ──
function TabVendedores(props){
  var leads = props.data.leads;
  var profiles = props.data.profiles;

  // Agrupar leads por vendedor
  var vendedores = {};
  leads.forEach(function(l){
    var v = l.emisora || "Sin asignar";
    if(!vendedores[v]) vendedores[v] = {nombre:v, leads:[], ventas:0, pagado:0};
    vendedores[v].leads.push(l);
    if(l.status==="venta"||l.status==="verificacion") vendedores[v].ventas++;
    vendedores[v].pagado += ([]||[]).reduce(function(s,p){return s+(p.monto||0);},0);
  });
  var vList = Object.values(vendedores).sort(function(a,b){return b.ventas-a.ventas;});

  return React.createElement("div", {style:S.page}, [
    React.createElement("div", {key:"kpis", style:{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12}}, [
      React.createElement(KpiCard, {key:"a", label:"Vendedores Activos", value:vList.length, color:C.indigo}),
      React.createElement(KpiCard, {key:"b", label:"Total Ventas", value:vList.reduce(function(s,v){return s+v.ventas;},0), color:C.green}),
      React.createElement(KpiCard, {key:"c", label:"Total Cobrado", value:fmtUSD(vList.reduce(function(s,v){return s+v.pagado;},0)), color:C.green}),
    ]),
    React.createElement("div", {key:"tbl", style:S.card}, [
      React.createElement("div", {key:"t", style:S.ctit}, "Rendimiento por Vendedor"),
      React.createElement("table", {key:"table", style:{width:"100%", borderCollapse:"collapse"}}, [
        React.createElement("thead",{key:"h"},React.createElement("tr",{},
          ["#","Vendedor","Leads","Ventas","Conv.","Cobrado"].map(function(h){return React.createElement("th",{key:h,style:S.th},h);})
        )),
        React.createElement("tbody",{key:"b"},
          vList.map(function(v,i){
            var conv = v.leads.length>0 ? Math.round((v.ventas/v.leads.length)*100) : 0;
            var avatarColors = [C.indigo,C.teal,C.violet,C.amber,C.coral];
            var color = avatarColors[i % avatarColors.length];
            return React.createElement("tr",{key:v.nombre},[
              React.createElement("td",{key:"r",style:S.tdc},
                React.createElement("div",{style:Object.assign({},S.ava(color),{width:28,height:28,fontSize:11,margin:"auto"})},String(i+1))
              ),
              React.createElement("td",{key:"n",style:S.td},[
                React.createElement("div",{key:"nm",style:{fontWeight:700,color:C.text}},v.nombre),
                React.createElement("div",{key:"l",style:{fontSize:10,color:C.muted}},v.leads.length+" leads"),
              ]),
              React.createElement("td",{key:"le",style:S.tdc},React.createElement("span",{style:{fontWeight:700}},v.leads.length)),
              React.createElement("td",{key:"ve",style:S.tdc},React.createElement("span",{style:{fontWeight:800,color:C.green,fontSize:15}},v.ventas)),
              React.createElement("td",{key:"co",style:S.tdc},[
                React.createElement("div",{key:"bar",style:Object.assign({},S.bar,{width:60,display:"inline-block",verticalAlign:"middle",marginRight:6})},
                  React.createElement("div",{style:{width:conv+"%",height:"100%",background:conv>30?C.green:conv>15?C.amber:C.red,borderRadius:4}})
                ),
                React.createElement("span",{key:"pct",style:{fontSize:11}},conv+"%"),
              ]),
              React.createElement("td",{key:"pa",style:S.tdc},v.pagado>0?React.createElement("span",{style:{color:C.green,fontWeight:700}},fmtUSD(v.pagado)):"--"),
            ]);
          })
        ),
      ]),
    ]),
  ]);
}

// ── TAB RADIOS / ROI ──
function lunesDe(dateStr){
  var d=new Date(dateStr+"T12:00:00"); var day=d.getDay();
  var mon=new Date(d); mon.setDate(d.getDate()-(day===0?6:day-1));
  return mon.toISOString().split("T")[0];
}
function domingoDe(lunesStr){
  var d=new Date(lunesStr+"T12:00:00"); d.setDate(d.getDate()+6);
  return d.toISOString().split("T")[0];
}
function addDiasR(dateStr,n){
  var d=new Date(dateStr+"T12:00:00"); d.setDate(d.getDate()+n);
  return d.toISOString().split("T")[0];
}
function hoyStrR(){ return new Date().toISOString().split("T")[0]; }
function fmtDiaR(str){
  if(!str) return "-";
  var d=new Date(str+"T12:00:00");
  return d.toLocaleDateString("es-US",{weekday:"long",month:"short",day:"numeric"});
}
function capFirst(s){ return s?s.charAt(0).toUpperCase()+s.slice(1):s; }

var DIAS_SEMANA_R = ["Lunes","Martes","Miercoles","Jueves","Viernes","Sabado","Domingo"];

function fechaDeDiaR(lunesStr, dia) {
  var idx = DIAS_SEMANA_R.indexOf(dia);
  if(idx < 0) return lunesStr;
  var d = new Date(lunesStr + "T12:00:00");
  d.setDate(d.getDate() + idx);
  return d.toISOString().split("T")[0];
}

function TabRadios(props){
  var spots    = props.data.spots    || [];
  var emisoras = props.data.emisoras || [];
  var leads    = props.data.leadsRadio || props.data.leads || [];

  var hoy = hoyStrR();
  var [diaActual, setDiaActual] = useState(hoy);
  var [vistaLog, setVistaLog] = useState(true);
  var lunes   = lunesDe(diaActual);
  var domingo = domingoDe(lunes);

  var fmtUSD = function(n){ return "$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:0}); };
  function roiColor(r){ return r>100?"#1a7f3c":r>0?"#1565c0":"#b91c1c"; }
  function invSpot(s){ return (Number(s.costo||0)*1.15)+Number(s.talento||0); }

  var emMap = {};
  emisoras.forEach(function(em){ emMap[em.id]=em.nombre; });

  // Spots del dia y de la semana
  var spotsDia    = spots.filter(function(s){ return s.fecha===diaActual; });
  var spotsSemana = spots.filter(function(s){ var f=s.fecha||""; return f>=lunes&&f<=domingo&&invSpot(s)>0; });

  // Leads
  var leadsDia = leads.filter(function(l){ return (l.created_at||"").slice(0,10)===diaActual; });
  var leadsSem = leads.filter(function(l){ var f=(l.created_at||"").slice(0,10); return f>=lunes&&f<=domingo; });

  var invDia = spotsDia.reduce(function(t,s){ return t+invSpot(s); },0);
  var invSem = spotsSemana.reduce(function(t,s){ return t+invSpot(s); },0);

  // Resumen semanal por emisora (solo con inversion)
  var semRows = {};
  spotsSemana.forEach(function(s){
    var eid=s.emisora_id||"?"; var enm=emMap[eid]||"Sin emisora";
    if(!semRows[eid]) semRows[eid]={nombre:enm,spots:0,inversion:0,leads:0,ventas:0,ingresos:0};
    semRows[eid].spots+=1; semRows[eid].inversion+=invSpot(s);
  });
  leadsSem.forEach(function(l){
    var eid=l.emisora_id||"?";
    if(semRows[eid]){
      semRows[eid].leads+=1;
      if(l.status==="venta"){ semRows[eid].ventas+=1; semRows[eid].ingresos+=Number(l.sale_price||0); }
    }
  });
  var rowsSem = Object.values(semRows);
  var totInvS=rowsSem.reduce(function(t,r){return t+r.inversion;},0);
  var totLeadsS=rowsSem.reduce(function(t,r){return t+r.leads;},0);
  var totVentasS=rowsSem.reduce(function(t,r){return t+r.ventas;},0);
  var totIngS=rowsSem.reduce(function(t,r){return t+r.ingresos;},0);
  var roiS=totInvS>0?((totIngS-totInvS)/totInvS)*100:0;

  // Spots del dia ordenados por hora
  var spotsDiaOrdenados = spotsDia.slice().sort(function(a,b){ return (a.hora||"").localeCompare(b.hora||""); });

  var thS={fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",padding:"7px 10px",textAlign:"left",borderBottom:"2px solid "+C.border,background:"#f8f9fb"};
  var tdS=function(color,right){ return {fontSize:12,padding:"7px 10px",color:color||C.text,textAlign:right?"right":"left",borderBottom:"1px solid "+C.border}; };

  return React.createElement("div",{style:{padding:"16px 20px"}},[

    // ── Navegador de semana ──
    React.createElement("div",{key:"nav",style:{display:"flex",alignItems:"center",gap:10,marginBottom:16,background:C.white,border:"1px solid "+C.border,borderRadius:10,padding:"10px 16px"}},[
      React.createElement("button",{key:"prev",onClick:function(){setDiaActual(addDiasR(diaActual,-7));},style:{background:"none",border:"1px solid "+C.border,borderRadius:6,padding:"4px 14px",cursor:"pointer",fontSize:16,color:C.text}},"‹"),
      React.createElement("div",{key:"info",style:{flex:1,textAlign:"center"}},[
        React.createElement("div",{key:"d",style:{fontWeight:700,fontSize:15,color:C.text}},"Semana del "+capFirst(fmtDiaR(lunes))+" al "+capFirst(fmtDiaR(domingo))),
        React.createElement("div",{key:"s",style:{fontSize:11,color:C.muted,marginTop:2}},spotsSemana.length+" spots · "+fmtUSD(invSem)+" inversión"),
      ]),
      React.createElement("button",{key:"next",onClick:function(){setDiaActual(addDiasR(diaActual,7));},style:{background:"none",border:"1px solid "+C.border,borderRadius:6,padding:"4px 14px",cursor:"pointer",fontSize:16,color:C.text}},"›"),
      diaActual!==hoy&&React.createElement("button",{key:"hoy",onClick:function(){setDiaActual(hoy);},style:{background:C.indigo,color:"#fff",border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:600}},"Esta semana"),
    ]),

    // ── Toggle Log / Emisoras ──
    React.createElement("div",{key:"toggle",style:{display:"flex",gap:8,marginBottom:16}},[
      React.createElement("button",{key:"log",onClick:function(){setVistaLog(true);},style:{padding:"6px 16px",borderRadius:20,border:"1px solid "+(vistaLog?C.indigo:C.border),background:vistaLog?C.indigo:"#fff",color:vistaLog?"#fff":C.text,fontSize:12,fontWeight:600,cursor:"pointer"}},"📋 Log por día"),
      React.createElement("button",{key:"em",onClick:function(){setVistaLog(false);},style:{padding:"6px 16px",borderRadius:20,border:"1px solid "+((!vistaLog)?C.indigo:C.border),background:(!vistaLog)?C.indigo:"#fff",color:(!vistaLog)?"#fff":C.text,fontSize:12,fontWeight:600,cursor:"pointer"}},"📊 Por emisora"),
    ]),

    // ── KPIs semana ──
    React.createElement("div",{key:"kpis-sem",style:{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}},[
      React.createElement(KpiCard,{key:"sp", label:"Spots semana",    value:String(spotsSemana.length), color:C.indigo}),
      React.createElement(KpiCard,{key:"iv", label:"Inversion",       value:fmtUSD(invSem),             color:"#b91c1c"}),
      React.createElement(KpiCard,{key:"ld", label:"Leads de radio",  value:String(totLeadsS),          color:C.green}),
      React.createElement(KpiCard,{key:"vt", label:"Ventas",          value:String(totVentasS),         color:C.green}),
      React.createElement(KpiCard,{key:"ro", label:"ROI semana",      value:roiS.toFixed(1)+"%",        color:roiColor(roiS)}),
    ]),

    // ── VISTA: LOG POR DÍA ──
    vistaLog && React.createElement("div",{key:"log-dias"},
      DIAS_SEMANA_R.map(function(dia,di){
        var fechaDia = fechaDeDiaR(lunes, dia);
        var esHoy    = fechaDia === hoy;
        var delDia   = spots.filter(function(s){
          // Soporta tanto dia_semana como fecha directa
          return s.fecha === fechaDia || s.dia_semana === dia;
        }).sort(function(a,b){ return (a.hora||"").localeCompare(b.hora||""); });

        var leadsDelDia = leads.filter(function(l){ return (l.created_at||"").slice(0,10) === fechaDia; });
        var ventasDelDia = leadsDelDia.filter(function(l){ return l.status==="venta"; });
        var invDelDia = delDia.reduce(function(t,s){ return t+invSpot(s); }, 0);
        var ingDelDia = ventasDelDia.reduce(function(t,l){ return t+Number(l.sale_price||0); }, 0);
        var roiDia = invDelDia > 0 ? ((ingDelDia - invDelDia) / invDelDia) * 100 : null;

        return React.createElement("div",{key:dia,style:{
          background:C.white,
          border:"1px solid "+(esHoy?C.indigo:C.border),
          borderRadius:10,
          overflow:"hidden",
          marginBottom:10,
          boxShadow: esHoy?"0 0 0 2px "+C.indigo+"33":"none",
        }},[

          // Header del día
          React.createElement("div",{key:"hdr",style:{
            padding:"10px 16px",
            background: esHoy?"linear-gradient(135deg,#1565c0,#1976d2)":C.bg,
            display:"flex",justifyContent:"space-between",alignItems:"center",
            borderBottom:"1px solid "+(esHoy?C.indigo+"44":C.border),
          }},[
            React.createElement("div",{key:"left",style:{display:"flex",alignItems:"center",gap:10}},[
              React.createElement("div",{key:"d",style:{fontWeight:700,fontSize:13,color:esHoy?"#fff":C.text}},dia),
              React.createElement("div",{key:"f",style:{fontSize:11,color:esHoy?"rgba(255,255,255,0.7)":C.muted}},capFirst(fmtDiaR(fechaDia))),
              esHoy&&React.createElement("span",{key:"hoy",style:{background:"rgba(255,255,255,0.25)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,border:"1px solid rgba(255,255,255,0.4)"}},"HOY"),
            ]),
            React.createElement("div",{key:"right",style:{display:"flex",alignItems:"center",gap:14,fontSize:12}},[
              React.createElement("span",{key:"sp",style:{color:esHoy?"rgba(255,255,255,0.8)":C.muted}},delDia.length+" spot"+(delDia.length!==1?"s":"")),
              invDelDia>0&&React.createElement("span",{key:"inv",style:{color:esHoy?"#ffcdd2":"#b91c1c",fontWeight:600}},fmtUSD(invDelDia)),
              leadsDelDia.length>0&&React.createElement("span",{key:"ld",style:{color:esHoy?"#c8e6c9":C.green,fontWeight:600}},leadsDelDia.length+" lead"+(leadsDelDia.length!==1?"s":"")),
              roiDia!==null&&React.createElement("span",{key:"roi",style:{color:esHoy?"#fff":roiColor(roiDia),fontWeight:700,fontSize:11}},roiDia.toFixed(0)+"% ROI"),
            ]),
          ]),

          // Columnas header
          delDia.length>0&&React.createElement("div",{key:"cols",style:{
            display:"grid",
            gridTemplateColumns:"70px 1fr 70px 90px 90px 110px",
            padding:"5px 16px",
            background:"#fafbfc",
            borderBottom:"1px solid "+C.border,
          }},["Hora","Emisora","Tipo","Costo","Talento","Total"].map(function(h,i){
            return React.createElement("div",{key:i,style:{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",textAlign:i>1?"right":"left"}},h);
          })),

          // Spots del día
          delDia.length===0
            ? React.createElement("div",{key:"empty",style:{padding:"14px 16px",textAlign:"center",fontSize:12,color:C.muted}},"Sin spots registrados")
            : React.createElement("div",{key:"spots"},delDia.map(function(s,si){
                var inv = invSpot(s);
                return React.createElement("div",{key:s.id||si,style:{
                  display:"grid",
                  gridTemplateColumns:"70px 1fr 70px 90px 90px 110px",
                  padding:"8px 16px",
                  background:si%2===0?"#fff":"#fafbfc",
                  borderBottom:"1px solid "+C.border,
                  alignItems:"center",
                }},[
                  React.createElement("div",{key:"h",style:{fontSize:12,color:C.indigo,fontWeight:600}},s.hora||"--"),
                  React.createElement("div",{key:"e",style:{fontSize:12,color:C.text,fontWeight:500}},emMap[s.emisora_id]||"--"),
                  React.createElement("div",{key:"t",style:{fontSize:11,color:C.muted,textAlign:"right"}},s.tipo||"comercial"),
                  React.createElement("div",{key:"c",style:{fontSize:12,color:"#b91c1c",textAlign:"right"}},fmtUSD(s.costo||0)),
                  React.createElement("div",{key:"tk",style:{fontSize:12,color:C.amber,textAlign:"right"}},s.talento>0?fmtUSD(s.talento):"--"),
                  React.createElement("div",{key:"i",style:{fontSize:12,fontWeight:700,color:C.text,textAlign:"right"}},fmtUSD(inv)),
                ]);
              })),

          // Footer del día con leads
          leadsDelDia.length>0&&React.createElement("div",{key:"leads-footer",style:{
            padding:"8px 16px",
            background:"rgba(26,127,60,0.04)",
            borderTop:"1px solid "+C.border,
            display:"flex",gap:16,alignItems:"center",fontSize:11,color:C.muted,
          }},[
            React.createElement("span",{key:"l",style:{color:C.green,fontWeight:600}},leadsDelDia.length+" leads de radio"),
            ventasDelDia.length>0&&React.createElement("span",{key:"v",style:{color:C.green,fontWeight:700}},ventasDelDia.length+" venta"+(ventasDelDia.length!==1?"s":"")),
            ingDelDia>0&&React.createElement("span",{key:"ing",style:{color:C.green,fontWeight:700}},fmtUSD(ingDelDia)+" ingresos"),
          ]),
        ]);
      })
    ),

    // ── VISTA: POR EMISORA (tabla semana) ──
    !vistaLog && React.createElement("div",{key:"tsem",style:{background:C.white,border:"1px solid "+C.border,borderRadius:10,overflow:"hidden"}},[
      React.createElement("div",{key:"hdr",style:{padding:"10px 14px",borderBottom:"1px solid "+C.border,fontWeight:700,fontSize:13,color:C.text}},"Por emisora esta semana"),
      rowsSem.length===0
        ? React.createElement("div",{key:"empty",style:{textAlign:"center",padding:28,color:C.muted,fontSize:12}},"Sin inversion registrada esta semana")
        : React.createElement("table",{key:"tbl",style:{width:"100%",borderCollapse:"collapse"}},[
            React.createElement("thead",{key:"th"},React.createElement("tr",{},[
              React.createElement("th",{key:"n",style:thS},"Emisora"),
              React.createElement("th",{key:"s",style:Object.assign({},thS,{textAlign:"right"})},"Spots"),
              React.createElement("th",{key:"i",style:Object.assign({},thS,{textAlign:"right"})},"Costo"),
              React.createElement("th",{key:"l",style:Object.assign({},thS,{textAlign:"right"})},"Leads"),
              React.createElement("th",{key:"v",style:Object.assign({},thS,{textAlign:"right"})},"Ventas"),
              React.createElement("th",{key:"mc",style:Object.assign({},thS,{textAlign:"right"})},"% Mkt Cost"),
            ])),
            React.createElement("tbody",{key:"tb"},[
              rowsSem.map(function(r,i){
                var mktCost = r.ingresos>0 ? (r.inversion/r.ingresos)*100 : null;
                var mktColor = mktCost===null?"--":mktCost<35?C.green:mktCost<=45?C.amber:"#b91c1c";
                return React.createElement("tr",{key:i,style:{background:i%2===0?"#fff":"#f9fafb"}},[
                  React.createElement("td",{key:"n",style:tdS(null)},r.nombre),
                  React.createElement("td",{key:"s",style:tdS(C.muted,true)},r.spots),
                  React.createElement("td",{key:"i",style:tdS("#b91c1c",true)},fmtUSD(r.inversion)),
                  React.createElement("td",{key:"l",style:tdS(C.indigo,true)},r.leads),
                  React.createElement("td",{key:"v",style:tdS(C.green,true)},r.ventas),
                  React.createElement("td",{key:"mc",style:Object.assign({},tdS(null,true),{fontWeight:700,color:mktCost!==null?mktColor:C.muted})},mktCost!==null?mktCost.toFixed(1)+"%":"--"),
                ]);
              }),
              React.createElement("tr",{key:"tot",style:{background:"#f0f2f5",fontWeight:700}},[
                React.createElement("td",{key:"n",style:tdS(null)},"TOTAL"),
                React.createElement("td",{key:"s",style:tdS(null,true)},spotsSemana.length),
                React.createElement("td",{key:"i",style:tdS("#b91c1c",true)},fmtUSD(totInvS)),
                React.createElement("td",{key:"l",style:tdS(C.indigo,true)},totLeadsS),
                React.createElement("td",{key:"v",style:tdS(C.green,true)},totVentasS),
                React.createElement("td",{key:"mc",style:Object.assign({},tdS(null,true),{fontWeight:700,color:totIngS>0?(totInvS/totIngS)*100<35?C.green:(totInvS/totIngS)*100<=45?C.amber:"#b91c1c":C.muted})},totIngS>0?((totInvS/totIngS)*100).toFixed(1)+"%":"--"),
              ]),
            ]),
          ]),
    ]),
  ]);
}
