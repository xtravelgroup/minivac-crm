import React, { useState, useEffect } from "react";
import { supabase as SB } from "./supabase.js";

var SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
var SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxNTA0MiwiZXhwIjoyMDg4NTkxMDQyfQ.-P8KH6yhs6AJ1lUwBrwUpcoZV3KGvM7fDlFM3RsYKxw";
var HDR = { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, "Content-Type": "application/json" };

var fmtUSD = function(n){ return "$" + Number(n||0).toLocaleString("en-US", {minimumFractionDigits:0}); };

var C = {
  bg:"#f4f5f7", white:"#ffffff", border:"#e3e6ea", text:"#1a1f2e", sub:"#6b7280",
  muted:"#9ca3af", indigo:"#1565c0", teal:"#0ea5a0", green:"#1a7f3c", amber:"#f59e0b",
  red:"#b91c1c", violet:"#5b21b6", coral:"#f97316",
};

var S = {
  root:  { background:C.bg, minHeight:"100vh", fontFamily:"'DM Sans',system-ui,sans-serif", color:C.text, fontSize:13 },
  page:  { padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 },
  card:  { background:C.white, border:"1px solid "+C.border, borderRadius:10, padding:18 },
  ctit:  { fontSize:10, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14, paddingBottom:8, borderBottom:"1px solid "+C.border },
  th:    { background:"#f8f9fb", color:C.muted, padding:"8px 12px", textAlign:"left", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid "+C.border, whiteSpace:"nowrap" },
  td:    { padding:"9px 12px", borderBottom:"1px solid #f4f5f7", verticalAlign:"middle" },
  tdc:   { padding:"9px 12px", borderBottom:"1px solid #f4f5f7", verticalAlign:"middle", textAlign:"center" },
  bdg:   function(c,bg){ return { display:"inline-block", padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700, color:c, background:bg }; },
  btn:   function(c,bg){ return { background:bg, color:c, border:"none", borderRadius:6, padding:"6px 12px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }; },
};

var RETRY_HOURS = [24, 72, 168];

var MOTIVOS = [
  "Problemas economicos",
  "No ha podido viajar",
  "Mala experiencia",
  "No entiende el producto",
  "Encontro mejor opcion",
  "Cambio de planes",
  "Otro",
];

function toEST(dateStr){
  if(!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-CA",{timeZone:"America/New_York"});
}

export default function RetencionQueue({ currentUser }) {
  var [leads, setLeads] = useState([]);
  var [usuarios, setUsuarios] = useState([]);
  var [loading, setLoading] = useState(true);
  var [toast, setToast] = useState(null);
  var [actionLead, setActionLead] = useState(null);
  var [motivo, setMotivo] = useState("");
  var [nota, setNota] = useState("");
  var [notaNueva, setNotaNueva] = useState("");

  function getNotas(l) {
    if (!l.retencion_nota) return [];
    try { var parsed = JSON.parse(l.retencion_nota); return Array.isArray(parsed) ? parsed : [{ texto: l.retencion_nota, fecha: l.retencion_created_at }]; }
    catch(e) { return l.retencion_nota ? [{ texto: l.retencion_nota, fecha: l.retencion_created_at }] : []; }
  }

  function buildNotas(lead, nuevaNota) {
    var existing = getNotas(lead);
    if (nuevaNota && nuevaNota.trim()) {
      existing.push({ texto: nuevaNota.trim(), fecha: new Date().toISOString(), usuario: currentUser?.nombre || "Sistema" });
    }
    return existing.length > 0 ? JSON.stringify(existing) : null;
  }

  function notify(msg, ok) {
    setToast({ msg:msg, ok:ok!==false });
    setTimeout(function(){ setToast(null); }, 3200);
  }

  function cargar() {
    Promise.all([
      SB.from("leads").select("id, nombre, apellido, tel, whatsapp, email, emisora, status, created_at, sale_price, pago_inicial, pagos_historial, vendedor_id, verificador_id, retencion_status, retencion_motivo, retencion_nota, retencion_attempts, retencion_next_at, retencion_created_at, retencion_completed_at, retencion_result")
        .not("retencion_status", "is", null)
        .order("retencion_created_at", { ascending: false }),
      SB.from("usuarios").select("id, nombre, rol"),
    ]).then(function(results){
      setLeads((!results[0].error && results[0].data) ? results[0].data : []);
      setUsuarios((!results[1].error && results[1].data) ? results[1].data : []);
      setLoading(false);
    });
  }

  useEffect(function(){ cargar(); var iv=setInterval(cargar,30000); return function(){clearInterval(iv);}; },[]);

  var usrMap = {};
  usuarios.forEach(function(u){ usrMap[u.id] = u.nombre; });

  var now = new Date();

  function getCobrado(l){
    var ini = Number(l.pago_inicial||0);
    var ab = (l.pagos_historial||[]).filter(function(p){return !p.programado;}).reduce(function(s,p){return s+Number(p.monto||0);},0);
    return ini+ab;
  }

  // Queue: pendientes listos para llamar
  var queue = leads.filter(function(l){
    if(l.retencion_status !== "pendiente" && l.retencion_status !== "no_contesta") return false;
    if(l.retencion_next_at && new Date(l.retencion_next_at) > now) return false;
    return true;
  });

  // Programados
  var programados = leads.filter(function(l){
    if(l.retencion_status !== "no_contesta") return false;
    if(l.retencion_next_at && new Date(l.retencion_next_at) > now) return true;
    return false;
  });

  // Retenidos (salvados)
  var retenidos = leads.filter(function(l){ return l.retencion_result === "retenido"; });

  // Cancelados (perdidos)
  var cancelados = leads.filter(function(l){ return l.retencion_result === "cancelado"; });

  function marcarNoContesta(lead) {
    var attempts = (lead.retencion_attempts || 0) + 1;
    var retryIdx = Math.min(attempts - 1, RETRY_HOURS.length - 1);
    var hoursDelay = RETRY_HOURS[retryIdx];
    var nextAt = new Date(Date.now() + hoursDelay * 3600000).toISOString();
    var notas = buildNotas(lead, notaNueva);

    SB.from("leads").update({
      retencion_status: "no_contesta",
      retencion_attempts: attempts,
      retencion_next_at: nextAt,
      retencion_nota: notas,
    }).eq("id", lead.id).then(function(res){
      if(res.error){ notify("Error: "+res.error.message, false); return; }
      notify("No contesta — reintentar en "+hoursDelay+"h (intento "+attempts+")");
      setNotaNueva(""); cargar(); setActionLead(null);
    });
  }

  function marcarRetenido(lead) {
    var notas = buildNotas(lead, notaNueva);
    SB.from("leads").update({
      retencion_status: "completado",
      retencion_result: "retenido",
      retencion_motivo: motivo || lead.retencion_motivo || null,
      retencion_nota: notas,
      retencion_completed_at: new Date().toISOString(),
    }).eq("id", lead.id).then(function(res){
      if(res.error){ notify("Error: "+res.error.message, false); return; }
      notify("Cliente retenido exitosamente");
      setMotivo(""); setNotaNueva(""); cargar(); setActionLead(null);
    });
  }

  function marcarCancelado(lead) {
    var notas = buildNotas(lead, notaNueva);
    SB.from("leads").update({
      retencion_status: "completado",
      retencion_result: "cancelado",
      retencion_motivo: motivo || lead.retencion_motivo || null,
      retencion_nota: notas,
      retencion_completed_at: new Date().toISOString(),
    }).eq("id", lead.id).then(function(res){
      if(res.error){ notify("Error: "+res.error.message, false); return; }
      notify("Cliente marcado como cancelado");
      setMotivo(""); setNotaNueva(""); cargar(); setActionLead(null);
    });
  }

  function agregarNota(lead) {
    if (!notaNueva.trim()) return;
    var notas = buildNotas(lead, notaNueva);
    SB.from("leads").update({ retencion_nota: notas }).eq("id", lead.id).then(function(res){
      if(res.error){ notify("Error: "+res.error.message, false); return; }
      notify("Nota agregada");
      setNotaNueva(""); cargar();
    });
  }

  function renderRow(l, showActions) {
    var isOpen = actionLead === l.id;
    var cobrado = getCobrado(l);
    var saldo = Math.max(0, (l.sale_price||0) - cobrado);
    return React.createElement("tr", {key:l.id, style:{background:isOpen?"rgba(185,28,28,0.03)":"transparent"}}, [
      React.createElement("td",{key:"f",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.sub}},toEST(l.retencion_created_at||l.created_at))),
      React.createElement("td",{key:"n",style:S.td}, React.createElement("span",{style:{fontWeight:600}},l.nombre||"--")),
      React.createElement("td",{key:"t",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.indigo}},l.whatsapp||l.tel||"--")),
      React.createElement("td",{key:"a",style:S.td}, React.createElement("span",{style:{fontSize:12}},usrMap[l.vendedor_id]||"--")),
      React.createElement("td",{key:"p",style:S.tdc}, React.createElement("span",{style:{fontWeight:700,color:C.violet}},fmtUSD(l.sale_price||0))),
      React.createElement("td",{key:"c",style:S.tdc}, React.createElement("span",{style:{fontWeight:700,color:C.green}},fmtUSD(cobrado))),
      React.createElement("td",{key:"s",style:S.tdc}, React.createElement("span",{style:{fontWeight:700,color:saldo>0?C.red:C.green}},fmtUSD(saldo))),
      React.createElement("td",{key:"att",style:S.tdc}, React.createElement("span",{style:S.bdg(l.retencion_attempts>0?C.amber:C.muted, l.retencion_attempts>0?"rgba(245,158,11,0.1)":"#f4f5f7")}, String(l.retencion_attempts||0))),
      showActions ? React.createElement("td",{key:"act",style:Object.assign({},S.tdc,{whiteSpace:"nowrap"})},
        isOpen
          ? React.createElement("div", {style:{display:"flex",flexDirection:"column",gap:6,alignItems:"stretch",padding:"4px 0",minWidth:220}}, [
              // Motivo (pre-loaded)
              React.createElement("select",{key:"mot",value:motivo,onChange:function(e){setMotivo(e.target.value);},style:{fontSize:11,padding:"4px 8px",borderRadius:6,border:"1px solid "+C.border,width:"100%"}},
                [React.createElement("option",{key:"",value:""},"-- Motivo --")].concat(MOTIVOS.map(function(m){ return React.createElement("option",{key:m,value:m},m); }))
              ),
              // Notas existentes
              (function(){
                var notas = getNotas(l);
                if(notas.length===0) return null;
                return React.createElement("div",{key:"notas-list",style:{background:"#f8f9fb",borderRadius:6,padding:"6px 8px",maxHeight:100,overflowY:"auto"}},
                  notas.map(function(n,i){
                    return React.createElement("div",{key:i,style:{fontSize:10,color:C.sub,marginBottom:i<notas.length-1?4:0}},
                      React.createElement("span",{style:{fontWeight:600,color:C.text}},n.usuario||""),
                      " ",
                      React.createElement("span",{style:{color:C.muted}},n.fecha?toEST(n.fecha):""),
                      ": ",
                      n.texto
                    );
                  })
                );
              })(),
              // Nueva nota
              React.createElement("div",{key:"nota-add",style:{display:"flex",gap:4}}, [
                React.createElement("input",{key:"inp",value:notaNueva,onChange:function(e){setNotaNueva(e.target.value);},placeholder:"Agregar nota...",style:{fontSize:11,padding:"4px 8px",borderRadius:6,border:"1px solid "+C.border,flex:1}}),
                React.createElement("button",{key:"add",style:S.btn("#fff",C.indigo),onClick:function(){agregarNota(l);}},"+"),
              ]),
              // Botones
              React.createElement("div",{key:"btns",style:{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}, [
                React.createElement("button",{key:"ret",style:S.btn("#fff",C.green),onClick:function(){marcarRetenido(l);}},"Retenido"),
                React.createElement("button",{key:"nc",style:S.btn("#fff",C.amber),onClick:function(){marcarNoContesta(l);}},"No Contesta"),
                React.createElement("button",{key:"can",style:S.btn("#fff",C.red),onClick:function(){marcarCancelado(l);}},"Cancelado"),
                React.createElement("button",{key:"x",style:S.btn(C.muted,"transparent"),onClick:function(){setActionLead(null);setMotivo("");setNotaNueva("");}}, "x"),
              ]),
            ].filter(Boolean))
          : React.createElement("button",{style:S.btn(C.red,"rgba(185,28,28,0.08)"),onClick:function(){setActionLead(l.id);setMotivo(l.retencion_motivo||"");setNotaNueva("");}}, "Gestionar")
      ) : null,
    ].filter(Boolean));
  }

  var headers = ["Fecha","Cliente","Telefono","Agente","Paquete","Pagado","Saldo","Intentos","Acciones"];
  var headersDone = ["Fecha","Cliente","Telefono","Agente","Paquete","Pagado","Saldo","Intentos"];

  if(loading) return React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",color:C.sub,fontSize:14}},"Cargando...");

  return React.createElement("div", {style:S.root}, [
    // Header
    React.createElement("div", {key:"hdr", style:{background:C.white, borderBottom:"1px solid "+C.border, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:52}}, [
      React.createElement("div", {key:"t", style:{fontWeight:800, fontSize:15, color:C.text}}, "Queue de Retencion"),
      React.createElement("div", {key:"stats", style:{display:"flex", gap:16, fontSize:12}}, [
        React.createElement("span", {key:"q", style:{color:C.red, fontWeight:700}}, "En queue: "+queue.length),
        React.createElement("span", {key:"p", style:{color:C.amber, fontWeight:700}}, "Programados: "+programados.length),
        React.createElement("span", {key:"r", style:{color:C.green, fontWeight:700}}, "Retenidos: "+retenidos.length),
        React.createElement("span", {key:"c", style:{color:C.muted, fontWeight:700}}, "Cancelados: "+cancelados.length),
      ]),
    ]),

    React.createElement("div", {key:"body", style:S.page}, [
      // Queue
      React.createElement("div", {key:"queue", style:Object.assign({},S.card,{borderLeft:"3px solid "+C.red})}, [
        React.createElement("div", {key:"t", style:S.ctit}, "Pendientes de llamar ("+queue.length+")"),
        queue.length===0
          ? React.createElement("div",{key:"empty",style:{textAlign:"center",padding:"24px",color:C.muted,fontSize:12}},"Sin clientes en retencion")
          : React.createElement("table", {key:"tbl", style:{width:"100%", borderCollapse:"collapse"}}, [
              React.createElement("thead", {key:"h"}, React.createElement("tr", {},
                headers.map(function(h){ return React.createElement("th",{key:h,style:S.th},h); })
              )),
              React.createElement("tbody", {key:"b"}, queue.map(function(l){ return renderRow(l, true); })),
            ]),
      ]),

      // Programados
      programados.length > 0 && React.createElement("div", {key:"prog", style:Object.assign({},S.card,{borderLeft:"3px solid "+C.amber})}, [
        React.createElement("div", {key:"t", style:S.ctit}, "Reintento programado ("+programados.length+")"),
        React.createElement("table", {key:"tbl", style:{width:"100%", borderCollapse:"collapse"}}, [
          React.createElement("thead", {key:"h"}, React.createElement("tr", {},
            ["Cliente","Telefono","Intentos","Proximo intento","Motivo"].map(function(h){ return React.createElement("th",{key:h,style:S.th},h); })
          )),
          React.createElement("tbody", {key:"b"},
            programados.map(function(l){
              var nextAt = new Date(l.retencion_next_at);
              var diffMs = nextAt - now;
              var diffH = Math.max(0, Math.floor(diffMs/3600000));
              var diffM = Math.max(0, Math.floor((diffMs%3600000)/60000));
              return React.createElement("tr", {key:l.id}, [
                React.createElement("td",{key:"n",style:S.td}, React.createElement("span",{style:{fontWeight:600}},l.nombre||"--")),
                React.createElement("td",{key:"t",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.indigo}},l.whatsapp||l.tel||"--")),
                React.createElement("td",{key:"a",style:S.tdc}, React.createElement("span",{style:S.bdg(C.amber,"rgba(245,158,11,0.1)")},String(l.retencion_attempts||0))),
                React.createElement("td",{key:"next",style:S.td}, React.createElement("span",{style:{fontSize:12,fontWeight:700,color:C.amber}},diffH+"h "+diffM+"m")),
                React.createElement("td",{key:"m",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.sub}},l.retencion_motivo||"--")),
              ]);
            })
          ),
        ]),
      ]),

      // Retenidos
      retenidos.length > 0 && React.createElement("div", {key:"ret", style:Object.assign({},S.card,{borderLeft:"3px solid "+C.green})}, [
        React.createElement("div", {key:"t", style:S.ctit}, "Retenidos ("+retenidos.length+")"),
        React.createElement("table", {key:"tbl", style:{width:"100%", borderCollapse:"collapse"}}, [
          React.createElement("thead", {key:"h"}, React.createElement("tr", {},
            headersDone.concat(["Motivo","Fecha"]).map(function(h){ return React.createElement("th",{key:h,style:S.th},h); })
          )),
          React.createElement("tbody", {key:"b"},
            retenidos.map(function(l){
              return React.createElement("tr", {key:l.id}, [
                renderRow(l, false).props.children.slice(0,8),
                React.createElement("td",{key:"m",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.sub}},l.retencion_motivo||"--")),
                React.createElement("td",{key:"d",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.green,fontWeight:600}},toEST(l.retencion_completed_at))),
              ].flat());
            })
          ),
        ]),
      ]),

      // Cancelados
      cancelados.length > 0 && React.createElement("div", {key:"can", style:Object.assign({},S.card,{borderLeft:"3px solid "+C.muted})}, [
        React.createElement("div", {key:"t", style:S.ctit}, "Cancelados ("+cancelados.length+")"),
        React.createElement("table", {key:"tbl", style:{width:"100%", borderCollapse:"collapse"}}, [
          React.createElement("thead", {key:"h"}, React.createElement("tr", {},
            headersDone.concat(["Motivo","Fecha"]).map(function(h){ return React.createElement("th",{key:h,style:S.th},h); })
          )),
          React.createElement("tbody", {key:"b"},
            cancelados.map(function(l){
              var cobrado = getCobrado(l);
              var saldo = Math.max(0, (l.sale_price||0) - cobrado);
              return React.createElement("tr", {key:l.id}, [
                React.createElement("td",{key:"f",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.sub}},toEST(l.retencion_created_at||l.created_at))),
                React.createElement("td",{key:"n",style:S.td}, React.createElement("span",{style:{fontWeight:600,color:C.muted}},l.nombre||"--")),
                React.createElement("td",{key:"t",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.muted}},l.whatsapp||l.tel||"--")),
                React.createElement("td",{key:"a",style:S.td}, React.createElement("span",{style:{fontSize:12,color:C.muted}},usrMap[l.vendedor_id]||"--")),
                React.createElement("td",{key:"p",style:S.tdc}, React.createElement("span",{style:{color:C.muted}},fmtUSD(l.sale_price||0))),
                React.createElement("td",{key:"c",style:S.tdc}, React.createElement("span",{style:{color:C.muted}},fmtUSD(cobrado))),
                React.createElement("td",{key:"s",style:S.tdc}, React.createElement("span",{style:{color:C.muted}},fmtUSD(saldo))),
                React.createElement("td",{key:"att",style:S.tdc}, React.createElement("span",{style:{fontSize:11,color:C.muted}},String(l.retencion_attempts||0))),
                React.createElement("td",{key:"m",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.muted}},l.retencion_motivo||"--")),
                React.createElement("td",{key:"d",style:S.td}, React.createElement("span",{style:{fontSize:11,color:C.muted}},toEST(l.retencion_completed_at))),
              ]);
            })
          ),
        ]),
      ]),
    ]),

    // Toast
    toast && React.createElement("div", {key:"toast", style:{position:"fixed",bottom:24,right:24,background:toast.ok?C.green:C.red,color:"#fff",padding:"10px 20px",borderRadius:8,fontSize:13,fontWeight:600,boxShadow:"0 4px 12px rgba(0,0,0,0.15)",zIndex:999}}, toast.msg),
  ]);
}
