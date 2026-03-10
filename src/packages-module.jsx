import { useState } from "react";

const TODAY = new Date().toISOString().split("T")[0];
const MEMBRESIA_MESES = 18;

function addMonths(dateStr, months) {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr + "T12:00:00") - new Date()) / 86400000);
}
function daysAgo(n) { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split("T")[0]; }
function daysFromNow(n) { const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; }
function fmtDate(d) { if(!d) return "--"; return new Date(d+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"}); }
function fmtUSD(n) { return "$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function maskCard(n) { if(!n) return "**** **** **** ****"; return "**** **** **** "+String(n).slice(-4); }

const PKG_STATUS = {
  activo:    { label:"Activo",      color:"#1a7f3c", bg:"#edf7ee",  border:"#b0deb2"  },
  pendiente: { label:"Pago pend.",  color:"#925c0a", bg:"#fef9e7",  border:"#f3d88c"  },
  congelado: { label:"Congelado",   color:"#1565c0", bg:"#e8f0fe",  border:"#b5cdf2"  },
  cancelado: { label:"Cancelado",   color:"#b91c1c", bg:"#fef2f2", border:"#f7c0c0" },
  vencido:   { label:"Vencido",     color:"#6b7280", bg:"rgba(148,163,184,0.1)", border:"rgba(148,163,184,0.25)" },
};

const CANCEL_TIPOS = {
  reembolso_parcial: { label:"Reembolso parcial + ajuste", icon:"", color:"#925c0a" },
  forfeit:           { label:"Cancelacion sin reembolso",  icon:"", color:"#b91c1c" },
  congelamiento:     { label:"Congelamiento temporal",      icon:"", color:"#1565c0" },
  cambio_titular:    { label:"Cambio de titular",           icon:"", color:"#1565c0" },
};

const DESTINOS_MAP = { D01:"Cancun", D02:"Los Cabos", D03:"Riviera Maya", D04:"Puerto Vallarta", D05:"Huatulco" };

const SEED_PACKAGES = [
  { id:"PKG001", folio:"XT-1001", titular:{nombre:"Miguel Torres",   tel:"33-1234-5678", email:"miguel@email.com",   edad:42}, coProp:{nombre:"Sandra Torres",   edad:39}, vendedor:"Carlos Vega",  verificador:"Lucia Mendoza",  fechaVenta:daysAgo(120), fechaVencimiento:addMonths(daysAgo(120),MEMBRESIA_MESES), destinos:[{id:"D01",tipo:"qc",noches:5},{id:"D03",tipo:"qc",noches:6}],           precioTotal:4800, enganche:800,  cardLast4:"4521", cardBanco:"BBVA",        cardTipo:"Visa",       pagos:[{id:"P001",fecha:daysAgo(120),monto:800, tipo:"enganche",   status:"aprobado",ref:"TXN-001"},{id:"P002",fecha:daysAgo(90),monto:1000,tipo:"abono",status:"aprobado",ref:"TXN-002"},{id:"P003",fecha:daysAgo(60),monto:1000,tipo:"abono",status:"aprobado",ref:"TXN-003"}], status:"pendiente", notas:[], congelado:false, cancelado:false },
  { id:"PKG002", folio:"XT-1002", titular:{nombre:"Patricia Sanchez",tel:"33-2345-6789", email:"patricia@email.com", edad:35}, coProp:null,                           vendedor:"Ana Morales",  verificador:"Roberto Cruz",   fechaVenta:daysAgo(60),  fechaVencimiento:addMonths(daysAgo(60),MEMBRESIA_MESES),  destinos:[{id:"D02",tipo:"qc",noches:4}],                                         precioTotal:2200, enganche:2200, cardLast4:"9834", cardBanco:"Banorte",     cardTipo:"Mastercard", pagos:[{id:"P010",fecha:daysAgo(60),monto:2200,tipo:"pago_unico",status:"aprobado",ref:"TXN-010"}],                                                                                                                                                                                           status:"activo",   notas:["Cliente satisfecha, referidos potenciales"], congelado:false, cancelado:false },
  { id:"PKG003", folio:"XT-1003", titular:{nombre:"Fernando Reyes",  tel:"33-3456-7890", email:"fernando@email.com", edad:51}, coProp:{nombre:"Elena Reyes",     edad:48}, vendedor:"Luis Ramos",   verificador:"Lucia Mendoza",  fechaVenta:daysAgo(200), fechaVencimiento:addMonths(daysAgo(200),MEMBRESIA_MESES), destinos:[{id:"D01",tipo:"qc",noches:5},{id:"D04",tipo:"nq",noches:4},{id:"D05",tipo:"qc",noches:5}], precioTotal:6500, enganche:1500, cardLast4:"7723", cardBanco:"HSBC",        cardTipo:"Visa",       pagos:[{id:"P020",fecha:daysAgo(200),monto:1500,tipo:"enganche",status:"aprobado",ref:"TXN-020"},{id:"P021",fecha:daysAgo(170),monto:1000,tipo:"abono",status:"aprobado",ref:"TXN-021"},{id:"P022",fecha:daysAgo(140),monto:1000,tipo:"abono",status:"aprobado",ref:"TXN-022"},{id:"P023",fecha:daysAgo(110),monto:1000,tipo:"abono",status:"aprobado",ref:"TXN-023"},{id:"P024",fecha:daysAgo(80),monto:1000,tipo:"abono",status:"aprobado",ref:"TXN-024"},{id:"P025",fecha:daysAgo(50),monto:1000,tipo:"abono",status:"aprobado",ref:"TXN-025"}], status:"activo",   notas:[], congelado:false, cancelado:false },
  { id:"PKG004", folio:"XT-1004", titular:{nombre:"Rosa Gutierrez",  tel:"33-4567-8901", email:"rosa@email.com",    edad:44}, coProp:{nombre:"Jorge Gutierrez", edad:47}, vendedor:"Diana Ortiz",  verificador:"Roberto Cruz",   fechaVenta:daysAgo(30),  fechaVencimiento:addMonths(daysAgo(30),MEMBRESIA_MESES),  destinos:[{id:"D03",tipo:"qc",noches:6}],                                         precioTotal:3100, enganche:500,  cardLast4:"2290", cardBanco:"Santander",   cardTipo:"Visa",       pagos:[{id:"P030",fecha:daysAgo(30),monto:500,tipo:"enganche",status:"aprobado",ref:"TXN-030"}],                                                                                                                                                                                             status:"pendiente", notas:["Cliente solicito esperar para siguiente cobro"], congelado:false, cancelado:false },
  { id:"PKG005", folio:"XT-1005", titular:{nombre:"Hector Jimenez",  tel:"33-5678-9012", email:"hector@email.com",  edad:38}, coProp:null,                           vendedor:"Carlos Vega",  verificador:"Lucia Mendoza",  fechaVenta:daysAgo(300), fechaVencimiento:addMonths(daysAgo(300),MEMBRESIA_MESES), destinos:[{id:"D01",tipo:"nq",noches:5}],                                         precioTotal:1800, enganche:1800, cardLast4:"6612", cardBanco:"BBVA",        cardTipo:"Mastercard", pagos:[{id:"P040",fecha:daysAgo(300),monto:1800,tipo:"pago_unico",status:"aprobado",ref:"TXN-040"}],                                                                                                                                                                                         status:"congelado", notas:["Congelado por viaje al extranjero"], congelado:true, cancelado:false, congeladoDesde:daysAgo(15), congeladoHasta:daysFromNow(45) },
  { id:"PKG006", folio:"XT-1006", titular:{nombre:"Carmen Lopez",    tel:"33-6789-0123", email:"carmen@email.com",  edad:55}, coProp:{nombre:"Alberto Lopez",   edad:58}, vendedor:"Ana Morales",  verificador:"Roberto Cruz",   fechaVenta:daysAgo(550), fechaVencimiento:addMonths(daysAgo(550),MEMBRESIA_MESES), destinos:[{id:"D02",tipo:"qc",noches:4},{id:"D05",tipo:"qc",noches:5}],           precioTotal:4200, enganche:4200, cardLast4:"3341", cardBanco:"Citibanamex", cardTipo:"Visa",       pagos:[{id:"P050",fecha:daysAgo(550),monto:4200,tipo:"pago_unico",status:"aprobado",ref:"TXN-050"}],                                                                                                                                                                                         status:"vencido",  notas:[], congelado:false, cancelado:false },
];

const S = {
  wrap:     { minHeight:"100vh", background:"#07090f", color:"#3d4554", fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif" },
  topbar:   { background:"rgba(10,14,26,0.97)", backdropFilter:"blur(16px)", borderBottom:"1px solid #e8eaed", padding:"12px 24px", display:"flex", alignItems:"center", gap:"12px", position:"sticky", top:0, zIndex:100 },
  body:     { padding:"24px" },
  card:     { background:"#fafbfc", border:"1px solid #e3e6ea", borderRadius:"14px", padding:"18px 20px", marginBottom:"12px" },
  label:    { fontSize:"11px", color:"#9ca3af", marginBottom:"4px", fontWeight:"500" },
  sTitle:   { fontSize:"10px", fontWeight:"700", color:"#9ca3af", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"10px" },
  input:    { width:"100%", background:"#f8f9fb", border:"1px solid #d4d8de", borderRadius:"8px", padding:"8px 12px", color:"#3d4554", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  select:   { width:"100%", background:"#ffffff", border:"1px solid #d4d8de", borderRadius:"8px", padding:"8px 12px", color:"#3d4554", fontSize:"13px", outline:"none", cursor:"pointer", fontFamily:"inherit", boxSizing:"border-box" },
  modal:    { position:"fixed", inset:0, background:"rgba(15,20,30,0.5)", backdropFilter:"blur(2px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" },
  modalBox: { background:"#ffffff", border:"1px solid #d8dbe0", borderRadius:"16px", padding:"24px", maxWidth:"600px", width:"100%", maxHeight:"92vh", overflowY:"auto" },
  tab:      (a,c="#1565c0") => ({ padding:"7px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:a?"600":"400", background:a?`${c}20`:"transparent", color:a?c:"#9ca3af", border:a?`1px solid ${c}35`:"1px solid transparent", transition:"all 0.15s", whiteSpace:"nowrap" }),
  badge:    (color,bg,border) => ({ display:"inline-flex", alignItems:"center", gap:"4px", padding:"2px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:"600", color, background:bg, border:`1px solid ${border}` }),
  btn:      (v="ghost") => { const m={primary:{bg:"#1a385a",color:"#fff",border:"transparent"},success:{bg:"#e5f3e8",color:"#1a7f3c",border:"#a3d9a5"},danger:{bg:"#fdeaea",color:"#b91c1c",border:"#f5b8b8"},warning:{bg:"#fffbeb",color:"#925c0a",border:"#f0d080"},ghost:{bg:"#f6f7f9",color:"#6b7280",border:"#eceff3"},indigo:{bg:"#e5eafd",color:"#1565c0",border:"#aab4f5"},ice:{bg:"rgba(96,165,250,0.15)",color:"#1565c0",border:"#aac4f0"}}; const s=m[v]||m.ghost; return {display:"inline-flex",alignItems:"center",gap:"6px",padding:"7px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:"600",background:s.bg,color:s.color,border:`1px solid ${s.border}`,transition:"all 0.15s",whiteSpace:"nowrap"}; },
  g2:       { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" },
};

function ProgressBar({ pagado, total, color="#1a7f3c" }) {
  const pct = total>0?Math.min((pagado/total)*100,100):0;
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
        <span style={{ fontSize:"11px", color:"#9ca3af" }}>Pagado</span>
        <span style={{ fontSize:"11px", fontWeight:"600", color }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height:"6px", borderRadius:"3px", background:"#f6f7f9" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:"3px", transition:"width 0.4s" }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:"4px" }}>
        <span style={{ fontSize:"11px", color:"#9ca3af" }}>{fmtUSD(pagado)}</span>
        <span style={{ fontSize:"11px", color:"#374151" }}>de {fmtUSD(total)}</span>
      </div>
    </div>
  );
}

function VigenciaBar({ fechaVenta, fechaVencimiento }) {
  const totalMs = new Date(fechaVencimiento+"T12:00:00") - new Date(fechaVenta+"T12:00:00");
  const pasadoMs = new Date() - new Date(fechaVenta+"T12:00:00");
  const pct = Math.min(Math.max((pasadoMs/totalMs)*100,0),100);
  const dias = daysUntil(fechaVencimiento);
  const color = dias===null?"#6b7280":dias>90?"#1a7f3c":dias>30?"#925c0a":"#b91c1c";
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
        <span style={{ fontSize:"11px", color:"#9ca3af" }}>Vigencia {MEMBRESIA_MESES} meses</span>
        <span style={{ fontSize:"11px", fontWeight:"600", color }}>{dias===null?"--":dias>0?`${dias}d restantes`:"Vencida"}</span>
      </div>
      <div style={{ height:"6px", borderRadius:"3px", background:"#f6f7f9" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:"3px" }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:"4px" }}>
        <span style={{ fontSize:"11px", color:"#374151" }}>Inicio: {fmtDate(fechaVenta)}</span>
        <span style={{ fontSize:"11px", color:"#374151" }}>Vence: {fmtDate(fechaVencimiento)}</span>
      </div>
    </div>
  );
}

function CobroModal({ pkg, saldo, onClose, onSave }) {
  const [monto,   setMonto]   = useState(Math.min(saldo,500));
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const handleCobrar = async () => {
    if (!monto||monto<=0) return;
    setLoading(true);
    await new Promise(r=>setTimeout(r,1800));
    const ok = Math.random()>0.15;
    const ref = "TXN-"+Date.now().toString().slice(-6);
    setResult({ok,ref,msg:ok?"Pago procesado exitosamente":"Tarjeta declinada. Intenta con otra tarjeta."});
    if (ok) {
      const newPago = {id:"P"+Date.now(),fecha:TODAY,monto:Number(monto),tipo:"abono",status:"aprobado",metodo:"tarjeta",ref};
      const newSaldo = saldo-Number(monto);
      onSave({...pkg,pagos:[...pkg.pagos,newPago],status:newSaldo<=0?"activo":"pendiente"});
    }
    setLoading(false);
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{...S.modalBox,maxWidth:"420px"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:"17px",fontWeight:"700",color:"#1a1f2e",marginBottom:"4px"}}> Procesar cobro</div>
        <div style={{fontSize:"13px",color:"#9ca3af",marginBottom:"20px"}}>{pkg.titular.nombre} - {pkg.folio}</div>
        {!result ? (
          <>
            <div style={{padding:"14px 16px",borderRadius:"12px",background:"#fafbfc",border:"1px solid #dde0e5",marginBottom:"18px"}}>
              <div style={{fontSize:"10px",color:"#9ca3af",marginBottom:"6px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.08em"}}>Tarjeta en archivo</div>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{fontSize:"24px"}}></div>
                <div>
                  <div style={{fontSize:"14px",fontWeight:"600",color:"#3d4554",fontFamily:"monospace"}}>{maskCard(pkg.cardLast4)}</div>
                  <div style={{fontSize:"11px",color:"#9ca3af"}}>{pkg.cardBanco} - {pkg.cardTipo}</div>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:"12px",marginBottom:"18px"}}>
              <div style={{flex:1,padding:"12px",borderRadius:"10px",background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.2)",textAlign:"center"}}>
                <div style={{fontSize:"10px",color:"#b91c1c",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"3px"}}>Saldo pendiente</div>
                <div style={{fontSize:"20px",fontWeight:"800",color:"#b91c1c"}}>{fmtUSD(saldo)}</div>
              </div>
            </div>
            <div style={{marginBottom:"14px"}}>
              <div style={S.label}>Monto a cobrar (USD)</div>
              <input style={{...S.input,fontSize:"18px",fontWeight:"700",textAlign:"center"}} type="number" min="1" max={saldo} step="1" value={monto} onChange={e=>setMonto(e.target.value)} />
              <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
                {[250,500,1000].map(v=>(
                  <button key={v} style={{...S.btn("ghost"),flex:1,justifyContent:"center",fontSize:"11px"}} onClick={()=>setMonto(Math.min(v,saldo))}>{fmtUSD(v)}</button>
                ))}
                <button style={{...S.btn("ghost"),flex:1,justifyContent:"center",fontSize:"11px"}} onClick={()=>setMonto(saldo)}>Todo</button>
              </div>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <button style={{...S.btn("ghost"),flex:1}} onClick={onClose}>Cancelar</button>
              <button style={{...S.btn("success"),flex:2,justifyContent:"center",opacity:loading?0.7:1}} onClick={handleCobrar} disabled={loading||!monto||monto<=0}>
                {loading?" Procesando...":` Cobrar ${fmtUSD(monto)}`}
              </button>
            </div>
          </>
        ) : (
          <div style={{textAlign:"center",padding:"16px 0"}}>
            <div style={{fontSize:"48px",marginBottom:"14px"}}>{result.ok?"":""}</div>
            <div style={{fontSize:"16px",fontWeight:"700",color:result.ok?"#1a7f3c":"#b91c1c",marginBottom:"8px"}}>{result.msg}</div>
            {result.ok&&<div style={{fontSize:"12px",color:"#9ca3af",marginBottom:"20px"}}>Referencia: {result.ref}</div>}
            <button style={{...S.btn(result.ok?"success":"ghost"),padding:"9px 24px"}} onClick={onClose}>{result.ok?" Listo":"Cerrar"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModModal({ pkg, pagado, onClose, onSave }) {
  const [tipo,          setTipo]          = useState("reembolso_parcial");
  const [montoReemb,    setMontoReemb]    = useState(0);
  const [ajusteDesc,    setAjusteDesc]    = useState("");
  const [hasta,         setHasta]         = useState(daysFromNow(30));
  const [nuevoTitular,  setNuevoTitular]  = useState("");
  const [nota,          setNota]          = useState("");
  const [confirm,       setConfirm]       = useState(false);
  const tc = CANCEL_TIPOS[tipo];

  const handleSave = () => {
    let updates = {notas:[...pkg.notas,`[${TODAY}] ${tc.label}: ${nota}`]};
    if (tipo==="reembolso_parcial") {
      const rp = {id:"P"+Date.now(),fecha:TODAY,monto:-Number(montoReemb),tipo:"reembolso",status:"aprobado",metodo:"tarjeta",ref:"REF-"+Date.now().toString().slice(-6)};
      updates = {...updates,pagos:[...pkg.pagos,rp],status:"activo"};
    } else if (tipo==="forfeit") {
      updates = {...updates,status:"cancelado",cancelado:true};
    } else if (tipo==="congelamiento") {
      updates = {...updates,status:"congelado",congelado:true,congeladoDesde:TODAY,congeladoHasta:hasta};
    } else if (tipo==="cambio_titular") {
      updates = {...updates,titular:{...pkg.titular,nombre:nuevoTitular||pkg.titular.nombre}};
    }
    onSave({...pkg,...updates});
    onClose();
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:"17px",fontWeight:"700",color:"#1a1f2e",marginBottom:"4px"}}> Modificar paquete</div>
        <div style={{fontSize:"13px",color:"#9ca3af",marginBottom:"20px"}}>{pkg.titular.nombre} - {pkg.folio}</div>
        <div style={{marginBottom:"18px"}}>
          <div style={S.label}>Tipo de modificacion</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"6px"}}>
            {Object.entries(CANCEL_TIPOS).map(([k,v])=>(
              <div key={k} onClick={()=>setTipo(k)} style={{padding:"12px",borderRadius:"10px",cursor:"pointer",textAlign:"center",border:`2px solid ${tipo===k?v.color:"#f0f1f4"}`,background:tipo===k?`${v.color}0d`:"transparent",transition:"all 0.15s"}}>
                <div style={{fontSize:"18px",marginBottom:"3px"}}>{v.icon}</div>
                <div style={{fontSize:"11px",fontWeight:"600",color:tipo===k?v.color:"#9ca3af",lineHeight:1.3}}>{v.label}</div>
              </div>
            ))}
          </div>
        </div>
        {tipo==="reembolso_parcial" && (
          <div>
            <div style={{padding:"12px 14px",borderRadius:"10px",background:"#fffce5",border:"1px solid rgba(251,191,36,0.2)",marginBottom:"14px"}}>
              <div style={{fontSize:"11px",color:"#925c0a",fontWeight:"600",marginBottom:"3px"}}>Total pagado por el cliente</div>
              <div style={{fontSize:"18px",fontWeight:"800",color:"#925c0a"}}>{fmtUSD(pagado)}</div>
            </div>
            <div style={{...S.g2,marginBottom:"14px"}}>
              <div>
                <div style={S.label}>Monto a reembolsar (USD)</div>
                <input style={S.input} type="number" min="0" max={pagado} value={montoReemb} onChange={e=>setMontoReemb(e.target.value)} />
              </div>
              <div>
                <div style={S.label}>Quedaria en su cuenta</div>
                <div style={{...S.input,color:"#1a7f3c",fontWeight:"700",display:"flex",alignItems:"center"}}>{fmtUSD(pagado-Number(montoReemb))}</div>
              </div>
            </div>
            <div style={{marginBottom:"14px"}}>
              <div style={S.label}>Ajuste al paquete</div>
              <textarea style={{...S.input,minHeight:"70px",resize:"vertical"}} placeholder="Ej: Se elimina destino Los Cabos, se reduce a 1 destino..." value={ajusteDesc} onChange={e=>setAjusteDesc(e.target.value)} />
            </div>
          </div>
        )}
        {tipo==="congelamiento" && (
          <div style={{...S.g2,marginBottom:"14px"}}>
            <div>
              <div style={S.label}>Congelado desde</div>
              <div style={{...S.input,color:"#1565c0",display:"flex",alignItems:"center"}}>{fmtDate(TODAY)}</div>
            </div>
            <div>
              <div style={S.label}>Congelado hasta</div>
              <input style={S.input} type="date" value={hasta} onChange={e=>setHasta(e.target.value)} />
            </div>
          </div>
        )}
        {tipo==="cambio_titular" && (
          <div style={{marginBottom:"14px"}}>
            <div style={S.label}>Nombre del nuevo titular</div>
            <input style={S.input} placeholder="Nombre completo..." value={nuevoTitular} onChange={e=>setNuevoTitular(e.target.value)} />
            <div style={{fontSize:"11px",color:"#9ca3af",marginTop:"4px"}}>Titular actual: {pkg.titular.nombre}</div>
          </div>
        )}
        {tipo==="forfeit" && !confirm && (
          <div style={{padding:"12px 14px",borderRadius:"10px",background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.3)",marginBottom:"14px"}}>
            <div style={{fontSize:"12px",color:"#b91c1c",fontWeight:"600"}}> Esta accion cancelara el paquete sin reembolso. El cliente perdera todos sus beneficios.</div>
          </div>
        )}
        <div style={{marginBottom:"18px"}}>
          <div style={S.label}>Nota / Motivo</div>
          <textarea style={{...S.input,minHeight:"60px",resize:"vertical"}} placeholder="Explica el motivo..." value={nota} onChange={e=>setNota(e.target.value)} />
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          <button style={{...S.btn("ghost"),flex:1}} onClick={onClose}>Cancelar</button>
          {tipo==="forfeit"&&!confirm
            ? <button style={{...S.btn("danger"),flex:2,justifyContent:"center"}} onClick={()=>setConfirm(true)}>Entiendo, continuar -></button>
            : <button style={{...S.btn(tipo==="forfeit"?"danger":"warning"),flex:2,justifyContent:"center"}} onClick={handleSave}>{tc.icon} Confirmar {tc.label}</button>
          }
        </div>
      </div>
    </div>
  );
}

function PackageDetail({ pkg, onClose, onUpdate }) {
  const [tab,        setTab]        = useState("resumen");
  const [cobroModal, setCobroModal] = useState(false);
  const [modModal,   setModModal]   = useState(false);
  const [newNota,    setNewNota]    = useState("");

  const pagado   = pkg.pagos.filter(p=>p.status==="aprobado"&&p.monto>0).reduce((a,p)=>a+p.monto,0);
  const reemb    = pkg.pagos.filter(p=>p.monto<0).reduce((a,p)=>a+Math.abs(p.monto),0);
  const saldo    = Math.max(pkg.precioTotal-pagado+reemb,0);
  const st       = PKG_STATUS[pkg.status]||PKG_STATUS.activo;

  const addNota = () => {
    if (!newNota.trim()) return;
    onUpdate({...pkg,notas:[...pkg.notas,`[${TODAY}] ${newNota.trim()}`]});
    setNewNota("");
  };

  return (
    <div style={S.modal} onClick={onClose}>
      <div style={{...S.modalBox,maxWidth:"640px"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px"}}>
          <div>
            <div style={{fontSize:"18px",fontWeight:"800",color:"#1a1f2e"}}>{pkg.titular.nombre}</div>
            <div style={{fontSize:"12px",color:"#9ca3af",marginTop:"2px"}}>{pkg.folio} - {pkg.vendedor} - {pkg.verificador}</div>
          </div>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            <span style={S.badge(st.color,st.bg,st.border)}>{st.label}</span>
            <button style={{...S.btn("ghost"),padding:"5px 10px"}} onClick={onClose}>x</button>
          </div>
        </div>
        <div style={{display:"flex",gap:"5px",marginBottom:"18px",overflowX:"auto"}}>
          {["resumen","pagos","destinos","notas"].map(t=>(
            <button key={t} style={S.tab(tab===t)} onClick={()=>setTab(t)}>
              {t==="resumen"?" Resumen":t==="pagos"?" Pagos":t==="destinos"?" Destinos":" Notas"}
            </button>
          ))}
        </div>

        {tab==="resumen" && (
          <div>
            <div style={{...S.card,marginBottom:"14px"}}>
              <div style={S.sTitle}>Vigencia de membresia</div>
              <VigenciaBar fechaVenta={pkg.fechaVenta} fechaVencimiento={pkg.fechaVencimiento} />
            </div>
            <div style={{...S.card,marginBottom:"14px"}}>
              <div style={S.sTitle}>Estado financiero</div>
              <ProgressBar pagado={pagado-reemb} total={pkg.precioTotal} color={saldo>0?"#925c0a":"#1a7f3c"} />
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginTop:"14px"}}>
                {[{l:"Precio total",v:fmtUSD(pkg.precioTotal),c:"#3d4554"},{l:"Cobrado",v:fmtUSD(pagado-reemb),c:"#1a7f3c"},{l:"Saldo",v:fmtUSD(saldo),c:saldo>0?"#b91c1c":"#1a7f3c"}].map(s=>(
                  <div key={s.l} style={{textAlign:"center"}}>
                    <div style={{fontSize:"9px",color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.l}</div>
                    <div style={{fontSize:"16px",fontWeight:"800",color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{...S.card,marginBottom:"14px"}}>
              <div style={S.sTitle}>Titular</div>
              <div style={S.g2}>
                <div><div style={S.label}>Nombre</div><div style={{fontSize:"13px",color:"#3d4554",fontWeight:"600"}}>{pkg.titular.nombre}</div></div>
                <div><div style={S.label}>Edad</div><div style={{fontSize:"13px",color:"#3d4554"}}>{pkg.titular.edad} anos</div></div>
                <div><div style={S.label}>Telefono</div><div style={{fontSize:"13px",color:"#3d4554"}}>{pkg.titular.tel}</div></div>
                <div><div style={S.label}>Email</div><div style={{fontSize:"13px",color:"#3d4554"}}>{pkg.titular.email}</div></div>
              </div>
              {pkg.coProp&&<div style={{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid #e3e6ea"}}>
                <div style={{fontSize:"11px",color:"#9ca3af",fontWeight:"600",marginBottom:"4px"}}>Co-propietario</div>
                <div style={{fontSize:"13px",color:"#6b7280"}}>{pkg.coProp.nombre} - {pkg.coProp.edad} anos</div>
              </div>}
            </div>
            <div style={S.card}>
              <div style={S.sTitle}>Tarjeta en archivo</div>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{fontSize:"24px"}}></div>
                <div>
                  <div style={{fontSize:"14px",fontWeight:"600",color:"#3d4554",fontFamily:"monospace"}}>{maskCard(pkg.cardLast4)}</div>
                  <div style={{fontSize:"11px",color:"#9ca3af"}}>{pkg.cardBanco} - {pkg.cardTipo}</div>
                </div>
              </div>
            </div>
            {pkg.congelado&&<div style={{padding:"12px 16px",borderRadius:"12px",background:"rgba(96,165,250,0.08)",border:"1px solid rgba(96,165,250,0.25)",marginTop:"12px"}}>
              <div style={{fontSize:"12px",color:"#1565c0",fontWeight:"600",marginBottom:"3px"}}> Paquete congelado</div>
              <div style={{fontSize:"12px",color:"#6b7280"}}>Desde {fmtDate(pkg.congeladoDesde)} hasta {fmtDate(pkg.congeladoHasta)}</div>
            </div>}
          </div>
        )}

        {tab==="pagos" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
              <div style={S.sTitle}>Historial de pagos ({pkg.pagos.length})</div>
              {saldo>0&&!pkg.cancelado&&<button style={S.btn("success")} onClick={()=>setCobroModal(true)}> Procesar cobro</button>}
            </div>
            <div style={{borderRadius:"12px",overflow:"hidden",border:"1px solid #e3e6ea"}}>
              <div style={{display:"grid",gridTemplateColumns:"100px 1fr 100px 90px 110px",background:"#fafbfc",borderBottom:"2px solid #e3e6ea",padding:"8px 14px"}}>
                {["Fecha","Tipo","Monto","Status","Referencia"].map(h=><div key={h} style={{fontSize:"10px",fontWeight:"700",color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</div>)}
              </div>
              {pkg.pagos.map((p,i)=>(
                <div key={p.id} style={{display:"grid",gridTemplateColumns:"100px 1fr 100px 90px 110px",padding:"10px 14px",borderBottom:"1px solid #edf0f3",background:i%2===0?"rgba(255,255,255,0.01)":"transparent",alignItems:"center"}}>
                  <div style={{fontSize:"12px",color:"#9ca3af"}}>{fmtDate(p.fecha)}</div>
                  <div style={{fontSize:"12px",color:"#3d4554"}}>{p.tipo==="enganche"?"Enganche":p.tipo==="pago_unico"?"Pago unico":p.tipo==="reembolso"?"Reembolso":"Abono"}</div>
                  <div style={{fontSize:"13px",fontWeight:"700",color:p.monto<0?"#b91c1c":"#1a7f3c"}}>{p.monto<0?"-":""}{fmtUSD(Math.abs(p.monto))}</div>
                  <div><span style={{fontSize:"10px",padding:"2px 8px",borderRadius:"8px",background:p.status==="aprobado"?"#edf7ee":"#fef2f2",color:p.status==="aprobado"?"#1a7f3c":"#b91c1c",border:`1px solid ${p.status==="aprobado"?"#a3d9a5":"#f5b8b8"}`,fontWeight:"600"}}>{p.status==="aprobado"?"OK OK":"Dec. Dec."}</span></div>
                  <div style={{fontSize:"11px",color:"#9ca3af",fontFamily:"monospace"}}>{p.ref}</div>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"100px 1fr 100px 90px 110px",padding:"10px 14px",background:"rgba(74,222,128,0.05)",borderTop:"2px solid rgba(74,222,128,0.15)"}}>
                <div style={{fontSize:"11px",fontWeight:"700",color:"#1a7f3c",gridColumn:"1/3"}}>TOTAL COBRADO</div>
                <div style={{fontSize:"14px",fontWeight:"800",color:"#1a7f3c"}}>{fmtUSD(pagado-reemb)}</div>
              </div>
            </div>
            {saldo>0&&<div style={{marginTop:"12px",padding:"12px 16px",borderRadius:"10px",background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.25)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"13px",color:"#b91c1c",fontWeight:"600"}}>Saldo pendiente</div>
              <div style={{fontSize:"18px",fontWeight:"800",color:"#b91c1c"}}>{fmtUSD(saldo)}</div>
            </div>}
          </div>
        )}

        {tab==="destinos" && (
          <div>
            <div style={S.sTitle}>Destinos del paquete</div>
            {pkg.destinos.map((d,i)=>(
              <div key={i} style={{padding:"14px 16px",borderRadius:"12px",background:"#fafbfc",border:"1px solid #dde0e5",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                <div>
                  <div style={{fontSize:"14px",fontWeight:"700",color:"#1a1f2e"}}> {DESTINOS_MAP[d.id]||d.id}</div>
                  <div style={{fontSize:"12px",color:"#9ca3af",marginTop:"3px"}}>{d.noches} noches - {d.tipo==="qc"?"Qualified Couple":"Non-Qualified"}</div>
                </div>
                <span style={{fontSize:"11px",padding:"3px 10px",borderRadius:"20px",fontWeight:"600",background:d.tipo==="qc"?"rgba(129,140,248,0.1)":"rgba(148,163,184,0.1)",color:d.tipo==="qc"?"#1565c0":"#6b7280",border:`1px solid ${d.tipo==="qc"?"rgba(129,140,248,0.3)":"rgba(148,163,184,0.3)"}`}}>{d.tipo.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}

        {tab==="notas" && (
          <div>
            <div style={S.sTitle}>Historial de notas</div>
            <div style={{maxHeight:"260px",overflowY:"auto",marginBottom:"12px"}}>
              {!pkg.notas.length
                ? <div style={{fontSize:"12px",color:"#374151",padding:"12px 0"}}>Sin notas</div>
                : pkg.notas.map((n,i)=><div key={i} style={{fontSize:"12px",color:"#6b7280",padding:"8px 0",borderBottom:"1px solid #edf0f3",lineHeight:1.5}}>{n}</div>)
              }
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              <input style={{...S.input,flex:1}} placeholder="Agregar nota..." value={newNota} onChange={e=>setNewNota(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNota()} />
              <button style={{...S.btn("indigo"),padding:"7px 12px"}} onClick={addNota}>+</button>
            </div>
          </div>
        )}

        {!pkg.cancelado&&(
          <div style={{display:"flex",gap:"8px",marginTop:"18px",paddingTop:"16px",borderTop:"1px solid #e3e6ea"}}>
            {saldo>0&&<button style={S.btn("success")} onClick={()=>setCobroModal(true)}> Cobrar</button>}
            <button style={S.btn("warning")} onClick={()=>setModModal(true)}> Modificar paquete</button>
            <div style={{flex:1}} />
            <button style={S.btn("ghost")} onClick={onClose}>Cerrar</button>
          </div>
        )}
      </div>
      {cobroModal&&<CobroModal pkg={pkg} saldo={saldo} onClose={()=>setCobroModal(false)} onSave={p=>{onUpdate(p);setCobroModal(false);}} />}
      {modModal&&<ModModal pkg={pkg} pagado={pagado-reemb} onClose={()=>setModModal(false)} onSave={p=>onUpdate(p)} />}
    </div>
  );
}

function PackageCard({ pkg, onClick }) {
  const dias = daysUntil(pkg.fechaVencimiento);
  const st   = PKG_STATUS[pkg.status]||PKG_STATUS.activo;
  const vColor = dias===null?"#6b7280":dias>90?"#1a7f3c":dias>30?"#925c0a":"#b91c1c";

  return (
    <div onClick={onClick} style={{padding:"14px 18px",borderRadius:"14px",cursor:"pointer",background:"#fafbfc",border:"1px solid #e3e6ea",transition:"border-color 0.15s",marginBottom:"8px",display:"grid",gridTemplateColumns:"1fr auto",gap:"12px",alignItems:"center"}}
      onMouseEnter={e=>e.currentTarget.style.borderColor="#e4e7eb"}
      onMouseLeave={e=>e.currentTarget.style.borderColor="#f2f3f6"}>
      <div>
        {/* Row 1: nombre + folio */}
        <div style={{display:"flex",alignItems:"baseline",gap:"10px",marginBottom:"5px"}}>
          <div style={{fontSize:"15px",fontWeight:"700",color:"#1a1f2e"}}>{pkg.titular.nombre}</div>
          <div style={{fontSize:"11px",color:"#9ca3af",fontFamily:"monospace"}}>{pkg.folio}</div>
          {pkg.coProp&&<div style={{fontSize:"11px",color:"#9ca3af"}}>+ {pkg.coProp.nombre.split(" ")[0]}</div>}
        </div>
        {/* Row 2: tel */}
        <div style={{fontSize:"12px",color:"#9ca3af",marginBottom:"6px"}}> {pkg.titular.tel}</div>
        {/* Row 3: destinos chips */}
        <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
          {pkg.destinos.map((d,i)=>(
            <span key={i} style={{fontSize:"10px",padding:"2px 8px",borderRadius:"8px",background:"rgba(129,140,248,0.1)",color:"#1565c0",border:"1px solid rgba(129,140,248,0.2)",fontWeight:"600"}}>
               {DESTINOS_MAP[d.id]||d.id} - {d.noches}n
            </span>
          ))}
        </div>
      </div>
      {/* Right: status + vigencia */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"6px"}}>
        <span style={S.badge(st.color,st.bg,st.border)}>{st.label}</span>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:"9px",color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.08em"}}>Vigencia</div>
          <div style={{fontSize:"12px",fontWeight:"700",color:vColor}}>{dias===null?"--":dias>0?`${dias}d`:"Vencida"}</div>
        </div>
      </div>
    </div>
  );
}

export default function PackagesModule() {
  const [packages, setPackages] = useState(SEED_PACKAGES);
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState("");
  const [fStatus,  setFStatus]  = useState("all");
  const [fSaldo,   setFSaldo]   = useState(false);
  const [toast,    setToast]    = useState(null);

  const notify = (msg,ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };

  const handleUpdate = updated => {
    setPackages(p=>p.map(x=>x.id===updated.id?updated:x));
    if (selected?.id===updated.id) setSelected(updated);
    notify(" Paquete actualizado");
  };

  const getSaldo = p => { const pag=p.pagos.filter(x=>x.status==="aprobado"&&x.monto>0).reduce((a,x)=>a+x.monto,0); const rem=p.pagos.filter(x=>x.monto<0).reduce((a,x)=>a+Math.abs(x.monto),0); return Math.max(p.precioTotal-pag+rem,0); };

  const filtered = packages.filter(p=>
    (!search||p.titular.nombre.toLowerCase().includes(search.toLowerCase())||p.folio.toLowerCase().includes(search.toLowerCase()))&&
    (fStatus==="all"||p.status===fStatus)&&
    (!fSaldo||getSaldo(p)>0)
  );

  const totalCobrado  = packages.reduce((a,p)=>a+p.pagos.filter(x=>x.status==="aprobado"&&x.monto>0).reduce((s,x)=>s+x.monto,0),0);
  const totalReemb    = packages.reduce((a,p)=>a+p.pagos.filter(x=>x.monto<0).reduce((s,x)=>s+Math.abs(x.monto),0),0);
  const totalPendiente= packages.reduce((a,p)=>a+getSaldo(p),0);

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={{fontSize:"12px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.12em",textTransform:"uppercase"}}>Mini-Vac CRM</div>
        <div style={{width:"1px",height:"16px",background:"#eff1f4"}} />
        <div style={{fontSize:"14px",fontWeight:"600",color:"#1a7f3c"}}> Paquetes Activos + Cobranza</div>
        <div style={{flex:1}} />
        <div style={{fontSize:"12px",color:"#9ca3af"}}>{packages.length} miembros - {MEMBRESIA_MESES} meses - USD</div>
      </div>

      <div style={S.body}>
        {/* Stats */}
        <div style={{display:"flex",gap:"10px",marginBottom:"22px",flexWrap:"wrap"}}>
          {[
            {l:"Activos",    v:packages.filter(p=>p.status==="activo").length,   c:"#1a7f3c"},
            {l:"Con saldo",  v:packages.filter(p=>getSaldo(p)>0&&!p.cancelado).length, c:"#b91c1c"},
            {l:"Total cobrado", v:fmtUSD(totalCobrado-totalReemb), c:"#1565c0"},
            {l:"Por cobrar",    v:fmtUSD(totalPendiente),          c:"#925c0a"},
            {l:"Congelados", v:packages.filter(p=>p.status==="congelado").length, c:"#1565c0"},
          ].map(s=>(
            <div key={s.l} style={{flex:1,minWidth:"130px",padding:"14px 16px",borderRadius:"12px",background:`${s.c}09`,border:`1px solid ${s.c}20`}}>
              <div style={{fontSize:"9px",fontWeight:"700",color:s.c,letterSpacing:"0.1em",textTransform:"uppercase",opacity:0.8,marginBottom:"5px"}}>{s.l}</div>
              <div style={{fontSize:"20px",fontWeight:"800",color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:"8px",marginBottom:"16px",flexWrap:"wrap",alignItems:"center"}}>
          <input style={{...S.input,maxWidth:"240px"}} placeholder=" Nombre o folio..." value={search} onChange={e=>setSearch(e.target.value)} />
          <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
            <button style={S.tab(fStatus==="all")} onClick={()=>setFStatus("all")}>Todos</button>
            {Object.entries(PKG_STATUS).map(([k,v])=>(
              <button key={k} style={S.tab(fStatus===k,v.color)} onClick={()=>setFStatus(k)}>{v.label}</button>
            ))}
          </div>
          <button style={S.tab(fSaldo,"#b91c1c")} onClick={()=>setFSaldo(p=>!p)}>{fSaldo?"x ":""}Con saldo</button>
          <div style={{flex:1}} />
          <span style={{fontSize:"12px",color:"#9ca3af"}}>{filtered.length} resultados</span>
        </div>

        {/* List */}
        {!filtered.length
          ? <div style={{textAlign:"center",padding:"40px",color:"#9ca3af"}}>Sin resultados</div>
          : filtered.map(p=><PackageCard key={p.id} pkg={p} onClick={()=>setSelected(p)} />)
        }
      </div>

      {selected&&<PackageDetail pkg={selected} onClose={()=>setSelected(null)} onUpdate={handleUpdate} />}

      {toast&&(
        <div style={{position:"fixed",bottom:"24px",right:"24px",zIndex:999,padding:"12px 20px",borderRadius:"10px",background:toast.ok?"#e5f3e8":"#fdeaea",border:`1px solid ${toast.ok?"#a3d9a5":"#f5b8b8"}`,color:toast.ok?"#1a7f3c":"#b91c1c",fontSize:"14px",fontWeight:"600",boxShadow:"0 4px 16px rgba(0,0,0,0.1)"}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
