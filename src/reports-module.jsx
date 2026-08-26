import React, { useState, useEffect, useMemo } from "react";
import { supabase as SB } from "./supabase.js";

var SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
var SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxNTA0MiwiZXhwIjoyMDg4NTkxMDQyfQ.-P8KH6yhs6AJ1lUwBrwUpcoZV3KGvM7fDlFM3RsYKxw";
var HDR = { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, "Content-Type": "application/json" };

var C = {
  bg:"#f4f5f7", white:"#ffffff", border:"#e3e6ea", text:"#1a1f2e", sub:"#6b7280",
  muted:"#9ca3af", indigo:"#1565c0", teal:"#0ea5a0", green:"#1a7f3c", amber:"#f59e0b",
  red:"#b91c1c", violet:"#5b21b6",
};
var S = {
  root:  { background:C.bg, minHeight:"100vh", fontFamily:"'DM Sans',system-ui,sans-serif", color:C.text, fontSize:13 },
  page:  { padding:"20px 24px", display:"flex", flexDirection:"column", gap:16 },
  card:  { background:C.white, border:"1px solid "+C.border, borderRadius:10, padding:18 },
  ctit:  { fontSize:11, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14, paddingBottom:8, borderBottom:"1px solid "+C.border },
  th:    { background:"#f8f9fb", color:C.muted, padding:"8px 12px", textAlign:"left", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid "+C.border, whiteSpace:"nowrap" },
  thc:   { background:"#f8f9fb", color:C.muted, padding:"8px 12px", textAlign:"center", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid "+C.border, whiteSpace:"nowrap" },
  td:    { padding:"9px 12px", borderBottom:"1px solid #f4f5f7", verticalAlign:"middle" },
  tdc:   { padding:"9px 12px", borderBottom:"1px solid #f4f5f7", verticalAlign:"middle", textAlign:"center" },
  input: { padding:"8px 12px", border:"1px solid "+C.border, borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none" },
  btn:   function(bg,fg){ return { background:bg, color:fg||"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }; },
  tab:   function(active){ return { padding:"8px 16px", fontSize:12, fontWeight:700, border:"none", borderRadius:8, cursor:"pointer", background:active?C.indigo:"#eef2ff", color:active?"#fff":C.indigo }; },
};

function todayEST(){
  return new Date().toLocaleDateString("en-CA",{timeZone:"America/New_York"});
}

var STATUS_LABEL = {
  nuevo:"Nuevo", contactado:"Contactado", verificacion:"Verificacion",
  venta:"Venta", cancelado:"Cancelado", rechazado:"Rechazado", perdido:"Perdido",
};
var STATUS_COLOR = {
  nuevo:C.indigo, contactado:C.teal, verificacion:C.amber,
  venta:C.green, cancelado:C.red, rechazado:C.red, perdido:C.muted,
};

// ─────────────────────────────────────────────────────────────
// REPORTE: Leads por vendedor (por día)
// ─────────────────────────────────────────────────────────────
function LeadsPorVendedor(props) {
  var [fecha, setFecha] = useState(todayEST());
  var [fechaFin, setFechaFin] = useState("");   // opcional, rango
  var [leads, setLeads] = useState([]);
  var [usuarios, setUsuarios] = useState([]);
  var [loading, setLoading] = useState(false);
  var [selVendedor, setSelVendedor] = useState(null);

  useEffect(function(){
    SB.from("usuarios").select("id, nombre, rol, email").eq("activo", true).order("nombre")
      .then(function(r){ if(!r.error) setUsuarios(r.data||[]); });
  }, []);

  function cargar(){
    setLoading(true);
    setSelVendedor(null);
    var q = SB.from("leads")
      .select("id, folio, nombre, apellido, tel, whatsapp, email, emisora, status, vendedor_id, fecha, sale_price, created_at")
      .not("fecha","is",null)
      .limit(50000);
    q = q.gte("fecha", fecha);
    q = q.lte("fecha", fechaFin || fecha);
    q.then(function(r){
      setLoading(false);
      if(r.error){ alert("Error: "+r.error.message); return; }
      setLeads(r.data||[]);
    });
  }

  useEffect(function(){ cargar(); }, []);

  var usrMap = useMemo(function(){
    var m = {}; usuarios.forEach(function(u){ m[u.id] = u; }); return m;
  }, [usuarios]);

  var byVendedor = useMemo(function(){
    var groups = {};
    leads.forEach(function(l){
      var vid = l.vendedor_id || "SIN_ASIGNAR";
      if(!groups[vid]) groups[vid] = { vendedor_id: vid, leads: [], venta: 0, sale_price_total: 0, statusCounts: {} };
      groups[vid].leads.push(l);
      if(l.status === "venta") { groups[vid].venta++; groups[vid].sale_price_total += Number(l.sale_price)||0; }
      groups[vid].statusCounts[l.status] = (groups[vid].statusCounts[l.status]||0) + 1;
    });
    return Object.values(groups).sort(function(a,b){ return b.leads.length - a.leads.length; });
  }, [leads]);

  var totalLeads = leads.length;
  var totalVenta = leads.filter(function(l){return l.status==="venta";}).length;
  var totalMonto = leads.filter(function(l){return l.status==="venta";}).reduce(function(s,l){return s+(Number(l.sale_price)||0);},0);
  var conversion = totalLeads > 0 ? Math.round(totalVenta/totalLeads*100) : 0;

  var selectedRow = selVendedor ? byVendedor.find(function(g){return g.vendedor_id===selVendedor;}) : null;

  function exportCSV(){
    var rows = [["Vendedor","Rol","Email","Total Leads","Ventas","% Conv","Monto Ventas"]];
    byVendedor.forEach(function(g){
      var u = usrMap[g.vendedor_id];
      rows.push([
        u ? u.nombre : (g.vendedor_id==="SIN_ASIGNAR" ? "Sin asignar" : g.vendedor_id),
        u ? u.rol : "",
        u ? u.email : "",
        g.leads.length,
        g.venta,
        g.leads.length > 0 ? Math.round(g.venta/g.leads.length*100)+"%" : "0%",
        g.sale_price_total,
      ]);
    });
    var csv = rows.map(function(r){ return r.map(function(v){ return '"'+String(v).replace(/"/g,'""')+'"'; }).join(","); }).join("\n");
    var blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href=url; a.download="leads-"+fecha+(fechaFin?"_a_"+fechaFin:"")+".csv"; a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 100);
  }

  return (
    <div style={S.page}>
      {/* Filtros */}
      <div style={S.card}>
        <div style={{display:"flex",gap:12,alignItems:"end",flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4,textTransform:"uppercase"}}>Desde</div>
            <input type="date" style={S.input} value={fecha} onChange={function(e){setFecha(e.target.value);}} />
          </div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,marginBottom:4,textTransform:"uppercase"}}>Hasta (opcional)</div>
            <input type="date" style={S.input} value={fechaFin} onChange={function(e){setFechaFin(e.target.value);}} placeholder="Mismo día" />
          </div>
          <button style={S.btn(C.indigo)} onClick={cargar} disabled={loading}>{loading?"Cargando...":"Correr reporte"}</button>
          <button style={S.btn("#fff",C.indigo)} onClick={function(){var t=todayEST();setFecha(t);setFechaFin("");setTimeout(cargar,0);}}>Hoy</button>
          <button style={S.btn("#fff",C.indigo)} onClick={function(){
            var d=new Date();d.setDate(d.getDate()-7);
            setFecha(d.toLocaleDateString("en-CA",{timeZone:"America/New_York"}));
            setFechaFin(todayEST());
            setTimeout(cargar,0);
          }}>Últimos 7 días</button>
          <div style={{flex:1}}/>
          <button style={S.btn(C.green)} onClick={exportCSV} disabled={leads.length===0}>Exportar CSV</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[
          {l:"Total Leads", v:totalLeads, c:C.indigo},
          {l:"Ventas", v:totalVenta, c:C.green},
          {l:"% Conversion", v:conversion+"%", c:C.violet},
          {l:"Monto Ventas", v:"$"+totalMonto.toLocaleString("en-US"), c:C.teal},
        ].map(function(k,i){
          return <div key={i} style={{background:C.white,border:"1px solid "+C.border,borderRadius:10,padding:16}}>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>{k.l}</div>
            <div style={{fontSize:22,fontWeight:800,color:k.c}}>{k.v}</div>
          </div>;
        })}
      </div>

      <div style={{display:"grid",gridTemplateColumns:selectedRow?"1fr 1.4fr":"1fr",gap:12}}>
        {/* Tabla vendedores */}
        <div style={S.card}>
          <div style={S.ctit}>Leads por vendedor</div>
          {byVendedor.length === 0 && <div style={{textAlign:"center",padding:"40px 20px",color:C.muted,fontSize:12}}>Sin leads en el período seleccionado</div>}
          {byVendedor.length > 0 && <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={S.th}>Vendedor</th>
              <th style={S.thc}>Leads</th>
              <th style={S.thc}>Ventas</th>
              <th style={S.thc}>% Conv</th>
              <th style={S.thc}>Monto</th>
            </tr></thead>
            <tbody>
              {byVendedor.map(function(g){
                var u = usrMap[g.vendedor_id];
                var nombre = u ? u.nombre : (g.vendedor_id==="SIN_ASIGNAR"?"Sin asignar":"(desconocido)");
                var isSel = selVendedor === g.vendedor_id;
                var conv = g.leads.length > 0 ? Math.round(g.venta/g.leads.length*100) : 0;
                return <tr key={g.vendedor_id} onClick={function(){setSelVendedor(g.vendedor_id);}}
                  style={{cursor:"pointer", background:isSel?"rgba(21,101,192,0.08)":"transparent"}}>
                  <td style={S.td}>
                    <div style={{fontWeight:600,color:isSel?C.indigo:C.text}}>{nombre}</div>
                    {u && <div style={{fontSize:10,color:C.muted,marginTop:2}}>{u.rol}</div>}
                  </td>
                  <td style={{...S.tdc,fontWeight:700,color:C.indigo}}>{g.leads.length}</td>
                  <td style={{...S.tdc,fontWeight:700,color:g.venta>0?C.green:C.muted}}>{g.venta}</td>
                  <td style={S.tdc}>{conv}%</td>
                  <td style={{...S.tdc,fontWeight:700,color:C.teal}}>${g.sale_price_total.toLocaleString("en-US")}</td>
                </tr>;
              })}
            </tbody>
          </table>}
        </div>

        {/* Detalle de leads del vendedor seleccionado */}
        {selectedRow && (
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>
                {(usrMap[selVendedor] ? usrMap[selVendedor].nombre : (selVendedor==="SIN_ASIGNAR"?"Sin asignar":"Vendedor"))} · {selectedRow.leads.length} leads
              </div>
              <button style={S.btn("#fff",C.muted)} onClick={function(){setSelVendedor(null);}}>Cerrar</button>
            </div>
            <div style={{maxHeight:"70vh",overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>
                  <th style={S.th}>Nombre</th>
                  <th style={S.th}>Teléfono</th>
                  <th style={S.th}>Emisora</th>
                  <th style={S.th}>Status</th>
                  <th style={S.thc}>Monto</th>
                </tr></thead>
                <tbody>
                  {selectedRow.leads.map(function(l){
                    var nombreFull = ((l.nombre||"")+(l.apellido?" "+l.apellido:"")).trim() || "(sin nombre)";
                    return <tr key={l.id}
                      onClick={function(){ if(props.onVerLead) props.onVerLead(l.id); }}
                      style={{cursor:props.onVerLead?"pointer":"default"}}>
                      <td style={S.td}>
                        <div style={{fontWeight:600,color:C.indigo}}>{nombreFull}</div>
                        <div style={{fontSize:10,color:C.muted,marginTop:2}}>{l.folio||l.id.slice(0,8)}</div>
                      </td>
                      <td style={{...S.td,fontSize:11}}>{l.tel||l.whatsapp||"--"}</td>
                      <td style={{...S.td,fontSize:11,color:C.sub}}>{l.emisora||"--"}</td>
                      <td style={S.td}>
                        <span style={{display:"inline-block",padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700,color:STATUS_COLOR[l.status]||C.muted,background:(STATUS_COLOR[l.status]||C.muted)+"22"}}>
                          {STATUS_LABEL[l.status]||l.status||"--"}
                        </span>
                      </td>
                      <td style={{...S.tdc,fontWeight:700,color:l.sale_price>0?C.green:C.muted}}>
                        {l.sale_price>0 ? "$"+Number(l.sale_price).toLocaleString("en-US") : "--"}
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SHELL DE REPORTES (tabs — extensible para más reportes)
// ─────────────────────────────────────────────────────────────
export default function ReportsModule(props) {
  var [tab, setTab] = useState("leads");

  return (
    <div style={S.root}>
      <div style={{padding:"14px 24px 0",display:"flex",gap:8,borderBottom:"1px solid "+C.border,background:C.white}}>
        <button style={S.tab(tab==="leads")} onClick={function(){setTab("leads");}}>Leads por vendedor</button>
        {/* futuros tabs: ventas, reservas, radio, comisiones, welcome-calls, etc. */}
      </div>
      {tab === "leads" && <LeadsPorVendedor onVerLead={props.onVerLead} />}
    </div>
  );
}
