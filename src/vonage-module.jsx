import { useState } from "react";

// ================================================================
// VONAGE MODULE - Mini-Vac Vacation Club CRM
//
// Tabs:
//   1. Dashboard    - stats del dia, actividad por agente
//   2. Log          - historial filtrable de llamadas y SMS
//   3. Configuracion- credenciales, test de conexion, webhooks
//   4. Plantillas   - vista de plantillas activas en CommPanel
// ================================================================

var TODAY = new Date().toISOString().split("T")[0];

function daysAgo(n){
  var d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function fmtTime(iso){
  if(!iso) return "--";
  var d = new Date(iso);
  var h = d.getHours(); var m = d.getMinutes();
  var ampm = h>=12?"PM":"AM";
  return (h%12||12)+":"+("0"+m).slice(-2)+" "+ampm;
}
function fmtDur(s){
  if(!s&&s!==0) return "--";
  var m = Math.floor(s/60);
  return m>0?(m+"m "+("0"+(s%60)).slice(-2)+"s"):(s+"s");
}

// -- Seed de actividad --
var SEED = [
  { id:"L001", fecha:TODAY+"T09:14:00",      canal:"llamada", agente:"Carlos Vega",  cliente:"Miguel Torres",    numero:"305-1234-5678", duracion:187, resultado:"Contesto - resuelto",  estado:"completed" },
  { id:"L002", fecha:TODAY+"T09:32:00",      canal:"sms",     agente:"Carlos Vega",  cliente:"Patricia Sanchez", numero:"305-2345-6789", duracion:0,   resultado:"",                     estado:"delivered",  msg:"Hola Patricia, te recordamos que tienes un saldo pendiente en tu membresia Mini-Vac." },
  { id:"L003", fecha:TODAY+"T10:05:00",      canal:"llamada", agente:"Ana Morales",  cliente:"Fernando Reyes",   numero:"305-3456-7890", duracion:43,  resultado:"No contesto",           estado:"completed" },
  { id:"L004", fecha:TODAY+"T10:18:00",      canal:"llamada", agente:"Ana Morales",  cliente:"Rosa Gutierrez",   numero:"305-4567-8901", duracion:312, resultado:"Contesto - pendiente",  estado:"completed" },
  { id:"L005", fecha:TODAY+"T10:45:00",      canal:"sms",     agente:"Luis Ramos",   cliente:"Hector Jimenez",   numero:"305-5678-9012", duracion:0,   resultado:"",                     estado:"delivered",  msg:"Hola Hector, confirmamos tu cita para manana a las 10am. Mini-Vac Vacation Club." },
  { id:"L006", fecha:TODAY+"T11:02:00",      canal:"llamada", agente:"Luis Ramos",   cliente:"Carmen Lopez",     numero:"305-6789-0123", duracion:528, resultado:"Contesto - resuelto",   estado:"completed" },
  { id:"L007", fecha:TODAY+"T11:30:00",      canal:"llamada", agente:"Diana Ortiz",  cliente:"Pablo Mendoza",    numero:"305-7890-1234", duracion:0,   resultado:"Buzon de voz",          estado:"completed" },
  { id:"L008", fecha:TODAY+"T11:48:00",      canal:"sms",     agente:"Diana Ortiz",  cliente:"Laura Vasquez",    numero:"305-8901-2345", duracion:0,   resultado:"",                     estado:"failed",     msg:"Recordatorio de pago Mini-Vac." },
  { id:"L009", fecha:TODAY+"T12:15:00",      canal:"llamada", agente:"Carlos Vega",  cliente:"Andres Mora",      numero:"305-9012-3456", duracion:95,  resultado:"Contesto - pendiente",  estado:"completed" },
  { id:"L010", fecha:TODAY+"T13:00:00",      canal:"llamada", agente:"Ana Morales",  cliente:"Veronica Cruz",    numero:"305-0123-4567", duracion:221, resultado:"Contesto - resuelto",   estado:"completed" },
  { id:"L011", fecha:daysAgo(1)+"T09:10:00", canal:"llamada", agente:"Carlos Vega",  cliente:"Miguel Torres",    numero:"305-1234-5678", duracion:145, resultado:"Contesto - resuelto",   estado:"completed" },
  { id:"L012", fecha:daysAgo(1)+"T10:20:00", canal:"sms",     agente:"Ana Morales",  cliente:"Fernando Reyes",   numero:"305-3456-7890", duracion:0,   resultado:"",                     estado:"delivered",  msg:"Seguimiento post-visita - Mini-Vac." },
  { id:"L013", fecha:daysAgo(1)+"T11:05:00", canal:"llamada", agente:"Luis Ramos",   cliente:"Rosa Gutierrez",   numero:"305-4567-8901", duracion:67,  resultado:"Numero equivocado",     estado:"completed" },
  { id:"L014", fecha:daysAgo(1)+"T14:30:00", canal:"llamada", agente:"Diana Ortiz",  cliente:"Pablo Mendoza",    numero:"305-7890-1234", duracion:398, resultado:"Contesto - resuelto",   estado:"completed" },
  { id:"L015", fecha:daysAgo(2)+"T09:45:00", canal:"sms",     agente:"Carlos Vega",  cliente:"Andres Mora",      numero:"305-9012-3456", duracion:0,   resultado:"",                     estado:"delivered",  msg:"Bienvenida al club Mini-Vac Vacation Club." },
];

var AGENTES = ["Todos","Carlos Vega","Ana Morales","Luis Ramos","Diana Ortiz"];

// -- Colores --
var TEAL   = "#0ea5a0";
var BLUE   = "#1565c0";
var GREEN  = "#1a7f3c";
var AMBER  = "#f59e0b";
var RED    = "#b91c1c";
var VIOLET = "#5b21b6";
var INDIGO = "#6366f1";

// -- Estilos base --
var S = {
  wrap:   { minHeight:"100vh", background:"#f4f5f7", color:"#3d4554", fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif" },
  topbar: { padding:"12px 24px", background:"#ffffff", borderBottom:"1px solid #e3e6ea", display:"flex", alignItems:"center", gap:"12px" },
  page:   { padding:"24px 28px", maxWidth:"1100px", margin:"0 auto" },
  card:   { background:"#ffffff", border:"1px solid #e3e6ea", borderRadius:"12px", padding:"18px 20px", marginBottom:"14px" },
  inp:    { width:"100%", background:"#f8f9fb", border:"1px solid #d8dbe0", borderRadius:"8px", padding:"9px 12px", color:"#3d4554", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  lbl:    { fontSize:"10px", color:"#9ca3af", marginBottom:"4px", fontWeight:"600", display:"block", textTransform:"uppercase", letterSpacing:"0.07em" },
  sTitle: { fontSize:"11px", fontWeight:"700", color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"12px" },
};

function tabStyle(active){
  return { padding:"6px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:active?"700":"500", background:active?"rgba(14,165,160,0.12)":"#f9fafb", color:active?TEAL:"#9ca3af", border:active?"1px solid rgba(14,165,160,0.3)":"1px solid rgba(255,255,255,0.06)", transition:"all 0.12s" };
}
function btnStyle(bg, color){
  return { padding:"8px 16px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:"600", background:bg, color:color||"#fff", border:"none", display:"inline-flex", alignItems:"center", gap:"6px", transition:"all 0.15s" };
}
function badgeStyle(color, bg, br){
  return { fontSize:"10px", fontWeight:"700", padding:"2px 8px", borderRadius:"20px", color:color, background:bg, border:"1px solid "+(br||"transparent") };
}
function statCard(color){
  return { flex:1, minWidth:"120px", padding:"16px 18px", borderRadius:"12px", background:color+"09", border:"1px solid "+color+"20" };
}

// -- Tab: Dashboard --
function DashboardTab(props){
  var logs = props.logs;
  var hoy     = logs.filter(function(l){ return l.fecha.startsWith(TODAY); });
  var llHoy   = hoy.filter(function(l){ return l.canal==="llamada"; });
  var smsHoy  = hoy.filter(function(l){ return l.canal==="sms"; });
  var contHoy = llHoy.filter(function(l){ return l.resultado&&l.resultado.indexOf("Contesto")===0; });
  var durTotal= llHoy.reduce(function(acc,l){ return acc+(l.duracion||0); },0);
  var durProm = llHoy.length?Math.round(durTotal/llHoy.length):0;
  var tasa    = llHoy.length?Math.round(contHoy.length/llHoy.length*100):0;

  var STATS = [
    { label:"Llamadas hoy",      val:llHoy.length,              color:BLUE   },
    { label:"SMS hoy",           val:smsHoy.length,             color:GREEN  },
    { label:"Contactados",       val:contHoy.length,            color:TEAL   },
    { label:"Tasa contacto",     val:tasa+"%",                  color:VIOLET },
    { label:"Duracion total",    val:fmtDur(durTotal),          color:AMBER  },
    { label:"Duracion promedio", val:fmtDur(durProm),           color:INDIGO },
  ];

  var porAgente = {};
  hoy.forEach(function(l){
    if(!porAgente[l.agente]) porAgente[l.agente]={n:l.agente,ll:0,sms:0,cont:0,dur:0};
    if(l.canal==="llamada"){
      porAgente[l.agente].ll++;
      porAgente[l.agente].dur+=l.duracion||0;
      if(l.resultado&&l.resultado.indexOf("Contesto")===0) porAgente[l.agente].cont++;
    } else {
      porAgente[l.agente].sms++;
    }
  });
  var lista = Object.values(porAgente).sort(function(a,b){ return (b.ll+b.sms)-(a.ll+a.sms); });

  return (
    <div>
      <div style={{display:"flex",gap:"10px",marginBottom:"18px",flexWrap:"wrap"}}>
        {STATS.map(function(s){
          return (
            <div key={s.label} style={statCard(s.color)}>
              <div style={{fontSize:"9px",fontWeight:"700",color:s.color,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"4px",opacity:0.8}}>{s.label}</div>
              <div style={{fontSize:"22px",fontWeight:"800",color:s.color}}>{s.val}</div>
            </div>
          );
        })}
      </div>

      <div style={S.card}>
        <div style={S.sTitle}>Actividad por agente - hoy</div>
        {lista.length===0&&<div style={{fontSize:"12px",color:"#9ca3af",textAlign:"center",padding:"20px"}}>Sin actividad registrada hoy</div>}
        {lista.map(function(a){
          return (
            <div key={a.n} style={{padding:"10px 12px",borderRadius:"9px",background:"#f9fafb",border:"1px solid #e3e6ea",marginBottom:"6px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
              <div style={{width:"32px",height:"32px",borderRadius:"50%",background:"rgba(14,165,160,0.15)",border:"1px solid rgba(14,165,160,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:"13px",fontWeight:"700",color:TEAL}}>{a.n.charAt(0)}</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:"13px",fontWeight:"600",color:"#3d4554",marginBottom:"3px"}}>{a.n}</div>
                <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
                  <span style={{fontSize:"11px",color:BLUE}}>{a.ll} llamada{a.ll!==1?"s":""}</span>
                  <span style={{fontSize:"11px",color:GREEN}}>{a.sms} SMS</span>
                  <span style={{fontSize:"11px",color:TEAL}}>{a.cont} contactados</span>
                  {a.dur>0&&<span style={{fontSize:"11px",color:AMBER}}>{fmtDur(a.dur)}</span>}
                </div>
              </div>
              <div style={{fontSize:"20px",fontWeight:"800",color:"#b0b8c4"}}>{a.ll+a.sms}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- Tab: Log --
function LogTab(props){
  var logs = props.logs;
  var [fCanal,  setFCanal]  = useState("todos");
  var [fAgente, setFAgente] = useState("Todos");
  var [fFecha,  setFFecha]  = useState("hoy");
  var [search,  setSearch]  = useState("");

  var filtered = logs.filter(function(l){
    if(fCanal!=="todos"&&l.canal!==fCanal) return false;
    if(fAgente!=="Todos"&&l.agente!==fAgente) return false;
    if(fFecha==="hoy"&&!l.fecha.startsWith(TODAY)) return false;
    if(fFecha==="ayer"&&!l.fecha.startsWith(daysAgo(1))) return false;
    if(search){
      var s = search.toLowerCase();
      if(l.cliente.toLowerCase().indexOf(s)<0&&l.agente.toLowerCase().indexOf(s)<0&&l.numero.indexOf(s)<0) return false;
    }
    return true;
  }).sort(function(a,b){ return b.fecha.localeCompare(a.fecha); });

  var ECFG = {
    completed: { label:"Completada", color:GREEN,  bg:"#edf7ee",  br:"#b0deb2"  },
    delivered:  { label:"Entregado",  color:TEAL,   bg:"rgba(14,165,160,0.1)",  br:"rgba(14,165,160,0.25)"  },
    failed:     { label:"Fallido",    color:RED,    bg:"#fef2f2", br:"#f7c0c0" },
  };
  var CCFG = {
    llamada: { color:BLUE,  bg:"#e8f0fe",  br:"#b5cdf2",  label:"Llamada" },
    sms:     { color:GREEN, bg:"#edf7ee",  br:"#b0deb2",  label:"SMS"     },
  };

  var inpSm = Object.assign({},S.inp,{maxWidth:"220px",width:"auto"});
  var selSm = Object.assign({},S.inp,{maxWidth:"160px",width:"auto",cursor:"pointer",background:"#f8f9fb"});

  return (
    <div>
      <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap",alignItems:"center"}}>
        <input style={inpSm} placeholder="Buscar..." value={search} onChange={function(e){setSearch(e.target.value);}}/>
        <select style={selSm} value={fCanal} onChange={function(e){setFCanal(e.target.value);}}>
          <option value="todos">Todos los canales</option>
          <option value="llamada">Solo llamadas</option>
          <option value="sms">Solo SMS</option>
        </select>
        <select style={selSm} value={fAgente} onChange={function(e){setFAgente(e.target.value);}}>
          {AGENTES.map(function(a){ return <option key={a}>{a}</option>; })}
        </select>
        <select style={selSm} value={fFecha} onChange={function(e){setFFecha(e.target.value);}}>
          <option value="hoy">Hoy</option>
          <option value="ayer">Ayer</option>
          <option value="todos">Todo</option>
        </select>
        <span style={{fontSize:"11px",color:"#9ca3af",marginLeft:"auto"}}>{filtered.length} registro{filtered.length!==1?"s":""}</span>
      </div>

      {filtered.length===0&&(
        <div style={{textAlign:"center",padding:"40px",color:"#9ca3af",fontSize:"13px"}}>Sin registros para los filtros seleccionados</div>
      )}

      {filtered.map(function(l){
        var cc = CCFG[l.canal]||CCFG.llamada;
        var ec = ECFG[l.estado]||ECFG.completed;
        return (
          <div key={l.id} style={{padding:"12px 14px",borderRadius:"10px",background:"#f9fafb",border:"1px solid #e3e6ea",marginBottom:"6px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"5px",flexWrap:"wrap",gap:"6px"}}>
              <div style={{display:"flex",gap:"6px",alignItems:"center",flexWrap:"wrap"}}>
                <span style={badgeStyle(cc.color,cc.bg,cc.br)}>{cc.label}</span>
                <span style={{fontSize:"13px",fontWeight:"600",color:"#3d4554"}}>{l.cliente}</span>
                <span style={{fontSize:"11px",color:"#9ca3af"}}>{l.numero}</span>
              </div>
              <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                <span style={badgeStyle(ec.color,ec.bg,ec.br)}>{ec.label}</span>
                <span style={{fontSize:"10px",color:"#9ca3af"}}>{fmtTime(l.fecha)}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
              <span style={{fontSize:"11px",color:"#9ca3af"}}>Agente: <span style={{color:"#6b7280",fontWeight:"600"}}>{l.agente}</span></span>
              {l.canal==="llamada"&&l.duracion>0&&<span style={{fontSize:"11px",color:"#9ca3af"}}>Duracion: <span style={{color:AMBER,fontWeight:"600"}}>{fmtDur(l.duracion)}</span></span>}
              {l.resultado&&<span style={{fontSize:"11px",color:"#9ca3af"}}>Resultado: <span style={{color:"#6b7280"}}>{l.resultado}</span></span>}
              {l.msg&&<span style={{fontSize:"11px",color:"#9ca3af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"280px"}}>Mensaje: <span style={{color:"#6b7280"}}>{l.msg}</span></span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Tab: Configuracion --
function ConfigTab(){
  var saved_key = "";
  var saved_sec = "";
  var saved_num = "";
  try { saved_key = localStorage.getItem("vonage_api_key")||""; } catch(e){}
  try { saved_sec = localStorage.getItem("vonage_api_secret")||""; } catch(e){}
  try { saved_num = localStorage.getItem("vonage_from")||""; } catch(e){}

  var [apiKey,    setApiKey]    = useState(saved_key);
  var [apiSecret, setApiSecret] = useState(saved_sec);
  var [fromNum,   setFromNum]   = useState(saved_num);
  var [showSec,   setShowSec]   = useState(false);
  var [testing,   setTesting]   = useState(false);
  var [testRes,   setTestRes]   = useState(null);
  var [msg,       setMsg]       = useState("");

  function guardar(){
    try {
      localStorage.setItem("vonage_api_key",    apiKey.trim());
      localStorage.setItem("vonage_api_secret", apiSecret.trim());
      localStorage.setItem("vonage_from",       fromNum.trim().replace(/[^0-9]/g,""));
    } catch(e){}
    setMsg("Credenciales guardadas");
    setTimeout(function(){setMsg("");},3000);
  }

  function testConexion(){
    if(!apiKey.trim()||!apiSecret.trim()){ setTestRes({ok:false,error:"Ingresa API Key y API Secret primero"}); return; }
    setTesting(true); setTestRes(null);
    fetch("https://rest.nexmo.com/account/get-balance?api_key="+encodeURIComponent(apiKey.trim())+"&api_secret="+encodeURIComponent(apiSecret.trim()))
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data.value!==undefined){
          setTestRes({ok:true, balance:data.value.toFixed(2), autoReload:data["auto-reload"]});
        } else {
          setTestRes({ok:false, error:data.message||data.error_text||"Credenciales invalidas"});
        }
        setTesting(false);
      })
      .catch(function(e){
        setTestRes({ok:false, error:e.message});
        setTesting(false);
      });
  }

  var completo = apiKey.trim()&&apiSecret.trim()&&fromNum.trim();

  var WEBHOOKS = [
    { label:"Answer URL (llamadas entrantes)", url:"https://minivac.mx/vonage/answer"       },
    { label:"Event URL (estado de llamadas)",  url:"https://minivac.mx/vonage/events"       },
    { label:"SMS Inbound URL",                 url:"https://minivac.mx/vonage/sms/inbound"  },
    { label:"SMS Status URL",                  url:"https://minivac.mx/vonage/sms/status"   },
  ];

  return (
    <div>
      <div style={S.card}>
        <div style={S.sTitle}>Credenciales de API Vonage</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"16px"}}>
          <div style={{gridColumn:"1/-1"}}>
            <label style={S.lbl}>API Key</label>
            <input style={S.inp} value={apiKey} onChange={function(e){setApiKey(e.target.value);setTestRes(null);}} placeholder="Ej: a1b2c3d4"/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={S.lbl}>API Secret</label>
            <div style={{position:"relative"}}>
              <input style={S.inp} type={showSec?"text":"password"} value={apiSecret} onChange={function(e){setApiSecret(e.target.value);setTestRes(null);}} placeholder="Tu API Secret de Vonage"/>
              <button onClick={function(){setShowSec(!showSec);}} style={{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:"11px",padding:"2px 6px"}}>
                {showSec?"Ocultar":"Mostrar"}
              </button>
            </div>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={S.lbl}>Numero de origen (solo digitos con codigo de pais)</label>
            <input style={S.inp} value={fromNum} onChange={function(e){setFromNum(e.target.value);setTestRes(null);}} placeholder="Ej: 15551234567"/>
            <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"4px"}}>Aparece como remitente en llamadas y SMS</div>
          </div>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
          <button style={btnStyle(completo?TEAL:"#f6f7f9",completo?"#fff":"#9ca3af")} onClick={testConexion} disabled={testing}>
            {testing?"Probando...":"Probar conexion"}
          </button>
          <button style={btnStyle(completo?INDIGO:"#f6f7f9",completo?"#fff":"#9ca3af")} onClick={guardar} disabled={!completo}>
            Guardar credenciales
          </button>
          {msg&&<span style={{fontSize:"11px",color:GREEN,fontWeight:"600"}}>{msg}</span>}
        </div>

        {testRes&&(
          <div style={{marginTop:"14px",padding:"14px 16px",borderRadius:"10px",background:testRes.ok?"rgba(74,222,128,0.07)":"rgba(248,113,113,0.07)",border:"1px solid "+(testRes.ok?"#b0deb2":"#f7c0c0")}}>
            {testRes.ok?(
              <div>
                <div style={{fontSize:"13px",fontWeight:"700",color:GREEN,marginBottom:"8px"}}>Conexion exitosa</div>
                <div style={{display:"flex",gap:"16px",flexWrap:"wrap"}}>
                  <span style={{fontSize:"12px",color:"#6b7280"}}>Balance: <span style={{color:GREEN,fontWeight:"700"}}>${testRes.balance} EUR</span></span>
                  <span style={{fontSize:"12px",color:"#6b7280"}}>Auto-recarga: <span style={{color:"#3d4554",fontWeight:"600"}}>{testRes.autoReload?"Activada":"Desactivada"}</span></span>
                </div>
              </div>
            ):(
              <div>
                <div style={{fontSize:"13px",fontWeight:"700",color:RED,marginBottom:"4px"}}>Error de conexion</div>
                <div style={{fontSize:"12px",color:"#6b7280"}}>{testRes.error}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={S.card}>
        <div style={S.sTitle}>Como obtener tus credenciales</div>
        <ol style={{padding:"0 0 0 18px",margin:0,display:"flex",flexDirection:"column",gap:"8px"}}>
          {[
            "Ve a dashboard.nexmo.com e inicia sesion en tu cuenta",
            "En la pantalla principal encontraras tu API Key y API Secret",
            "Para el numero: ve a Numbers, luego Your Numbers",
            "Copia el numero en formato internacional sin + ni espacios (ej: 15551234567)",
            "Pega los tres valores arriba y haz clic en Probar conexion",
          ].map(function(step,i){
            return <li key={i} style={{fontSize:"12px",color:"#6b7280",lineHeight:"1.7"}}>{step}</li>;
          })}
        </ol>
        <div style={{marginTop:"12px",padding:"10px 12px",borderRadius:"8px",background:"rgba(96,165,250,0.06)",border:"1px solid rgba(96,165,250,0.2)"}}>
          <div style={{fontSize:"11px",color:BLUE,fontWeight:"700",marginBottom:"3px"}}>Nota de produccion</div>
          <div style={{fontSize:"11px",color:"#9ca3af"}}>Las credenciales se guardan en localStorage. Para produccion en Vercel, agrega variables de entorno: VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_FROM y actualiza comm-panel.jsx.</div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.sTitle}>Webhooks - Configuralos en Vonage Dashboard</div>
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {WEBHOOKS.map(function(wh){
            return (
              <div key={wh.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderRadius:"8px",background:"#f9fafb",border:"1px solid #e3e6ea"}}>
                <div>
                  <div style={{fontSize:"10px",color:"#9ca3af",marginBottom:"2px"}}>{wh.label}</div>
                  <div style={{fontSize:"12px",color:"#3d4554",fontFamily:"monospace"}}>{wh.url}</div>
                </div>
                <button
                  style={Object.assign({},btnStyle("#f6f7f9","#6b7280"),{border:"1px solid #dde0e5",fontSize:"11px",padding:"5px 12px"})}
                  onClick={function(){
                    try { navigator.clipboard.writeText(wh.url); } catch(e){}
                  }}
                >
                  Copiar
                </button>
              </div>
            );
          })}
        </div>
        <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"10px"}}>Ve a tu dashboard Vonage, luego Settings, luego API settings para configurar estos webhooks.</div>
      </div>
    </div>
  );
}

// -- Tab: Plantillas --
function TemplatesTab(){
  var PLANTS = [
    { id:"confirmacion_reserva", label:"Confirmacion de reserva",     canales:["Email","WhatsApp","SMS"], usos:47 },
    { id:"recordatorio_pago",    label:"Recordatorio de pago",        canales:["Email","WhatsApp","SMS"], usos:83 },
    { id:"bienvenida",           label:"Bienvenida al club",          canales:["Email","WhatsApp"],       usos:31 },
    { id:"seguimiento_visita",   label:"Seguimiento post-visita",     canales:["Email","WhatsApp","SMS"], usos:29 },
    { id:"oferta_especial",      label:"Oferta especial / promocion", canales:["Email","WhatsApp","SMS"], usos:22 },
    { id:"reactivacion",         label:"Reactivacion de inactivo",    canales:["Email","WhatsApp","SMS"], usos:15 },
  ];
  var CH = { Email:VIOLET, WhatsApp:"#25D366", SMS:GREEN };

  return (
    <div>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
          <div style={S.sTitle}>Plantillas activas en CommPanel</div>
          <span style={{fontSize:"11px",color:"#9ca3af"}}>6 plantillas</span>
        </div>
        {PLANTS.map(function(t){
          return (
            <div key={t.id} style={{padding:"11px 13px",borderRadius:"9px",background:"#f9fafb",border:"1px solid #e3e6ea",marginBottom:"6px",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:"13px",fontWeight:"600",color:"#3d4554",marginBottom:"4px"}}>{t.label}</div>
                <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                  {t.canales.map(function(ch){
                    return <span key={ch} style={badgeStyle(CH[ch]||BLUE,"#f9fafb","#eceff3")}>{ch}</span>;
                  })}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:"18px",fontWeight:"800",color:TEAL}}>{t.usos}</div>
                <div style={{fontSize:"9px",color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em"}}>usos</div>
              </div>
            </div>
          );
        })}
        <div style={{marginTop:"12px",padding:"10px 12px",borderRadius:"8px",background:"#f9fafb",border:"1px solid #e3e6ea"}}>
          <div style={{fontSize:"11px",color:"#9ca3af"}}>Para modificar plantillas edita el objeto <span style={{color:TEAL,fontFamily:"monospace"}}>PLANTILLAS</span> en <span style={{color:TEAL,fontFamily:"monospace"}}>comm-panel.jsx</span> lineas 30-85.</div>
        </div>
      </div>
    </div>
  );
}

// -- COMPONENTE PRINCIPAL --
export default function VonageModule(){
  var [tab, setTab] = useState("dashboard");
  var [logs]        = useState(SEED);

  var TABS = [
    { id:"dashboard", label:"Dashboard"        },
    { id:"log",       label:"Log de actividad" },
    { id:"config",    label:"Configuracion"    },
    { id:"templates", label:"Plantillas"       },
  ];

  var fallidosHoy = logs.filter(function(l){ return l.estado==="failed"&&l.fecha.startsWith(TODAY); }).length;

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={{fontSize:"12px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.12em",textTransform:"uppercase"}}>Mini-Vac CRM</div>
        <div style={{width:"1px",height:"18px",background:"#eff1f4"}}></div>
        <div style={{fontSize:"14px",fontWeight:"600",color:TEAL}}>Vonage - Llamadas y SMS</div>
        <div style={{flex:1}}></div>
        {fallidosHoy>0&&(
          <span style={badgeStyle(AMBER,"rgba(245,158,11,0.08)","rgba(245,158,11,0.25)")}>{fallidosHoy} fallido{fallidosHoy!==1?"s":""} hoy</span>
        )}
        <span style={badgeStyle(GREEN,"rgba(74,222,128,0.08)","rgba(74,222,128,0.2)")}>Vonage API</span>
      </div>

      <div style={S.page}>
        <div style={{display:"flex",gap:"6px",marginBottom:"20px",flexWrap:"wrap"}}>
          {TABS.map(function(t){
            return <button key={t.id} style={tabStyle(tab===t.id)} onClick={function(){setTab(t.id);}}>{t.label}</button>;
          })}
        </div>

        {tab==="dashboard" &&<DashboardTab logs={logs}/>}
        {tab==="log"       &&<LogTab       logs={logs}/>}
        {tab==="config"    &&<ConfigTab/>}
        {tab==="templates" &&<TemplatesTab/>}
      </div>
    </div>
  );
}
