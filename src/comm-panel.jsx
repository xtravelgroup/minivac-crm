import { useState, useRef, useEffect } from "react";

// ===============================================================
// COMM PANEL - Componente compartido de comunicaciones
// Mini-Vac Vacation Club CRM
//
// Uso:
//   import CommPanel, { useCommPanel } from "./comm-panel";
//   const comm = useCommPanel();
//   <button onClick={function(){ comm.open(cliente); }}>Contactar</button>
//   <CommPanel {...comm} currentUser={currentUser} onLog={handleLog} />
//
// Integraciones:
//   VONAGE   - llamadas y SMS (reemplaza VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_FROM)
//   RESEND   - email         (reemplaza RESEND_API_KEY, RESEND_FROM)
//   WHATSAPP - WhatsApp Biz  (reemplaza WA_TOKEN, WA_PHONE_ID cuando tengas Meta aprobado)
// ===============================================================

// ?? Credenciales (reemplazar con variables de entorno en produccion) ??
var VONAGE_API_KEY    = "TU_VONAGE_API_KEY";
var VONAGE_API_SECRET = "TU_VONAGE_API_SECRET";
var VONAGE_FROM       = "TU_NUMERO_VONAGE";       // ej: "15551234567"
var RESEND_API_KEY    = "TU_RESEND_API_KEY";
var RESEND_FROM       = "noreply@minivac.mx";
var WA_TOKEN          = "TU_WA_ACCESS_TOKEN";     // Meta Graph API token
var WA_PHONE_ID       = "TU_WA_PHONE_NUMBER_ID";  // ID del numero aprobado por Meta

// ?? Paleta (sincronizada con el resto del CRM) ??
var TEAL   = "#0ea5a0";
var INDIGO = "#6366f1";
var VIOLET = "#5b21b6";
var RED    = "#b91c1c";
var GREEN  = "#1a7f3c";
var AMBER  = "#f59e0b";
var BLUE   = "#1565c0";

// ?? Plantillas ??
var PLANTILLAS = {
  confirmacion_reserva: {
    label: "Confirmacion de reserva",
    canales: ["email","whatsapp","sms"],
    asunto: "Tu reserva en Mini-Vac esta confirmada",
    cuerpo: function(c,extra){
      return "Hola "+c.nombre+", tu reserva en Mini-Vac Vacation Club ha sido confirmada. "+(extra||"Pronto recibiras los detalles completos. Cualquier duda estamos a tus ordenes.");
    },
  },
  recordatorio_pago: {
    label: "Recordatorio de pago",
    canales: ["email","whatsapp","sms"],
    asunto: "Recordatorio de pago - Mini-Vac",
    cuerpo: function(c,extra){
      return "Hola "+c.nombre+", te recordamos que tienes un saldo pendiente en tu membresia Mini-Vac. "+(extra||"Comunicate con nosotros para coordinar tu pago.");
    },
  },
  bienvenida: {
    label: "Bienvenida al club",
    canales: ["email","whatsapp"],
    asunto: "Bienvenido a Mini-Vac Vacation Club",
    cuerpo: function(c,extra){
      return "Hola "+c.nombre+", bienvenido a Mini-Vac Vacation Club. Estamos emocionados de tenerte como miembro "+c.membresia+". "+(extra||"Pronto un asesor se pondra en contacto contigo para coordinar tu primer viaje.");
    },
  },
  seguimiento_visita: {
    label: "Seguimiento post-visita",
    canales: ["email","whatsapp","sms"],
    asunto: "Esperamos que hayas disfrutado tu viaje - Mini-Vac",
    cuerpo: function(c,extra){
      return "Hola "+c.nombre+", esperamos que hayas tenido una experiencia increible en tu viaje. "+(extra||"Nos encantaria conocer tu opinion. Cuando gustes coordinamos tu proximo destino.");
    },
  },
  oferta_especial: {
    label: "Oferta especial / promocion",
    canales: ["email","whatsapp","sms"],
    asunto: "Tenemos una oferta especial para ti - Mini-Vac",
    cuerpo: function(c,extra){
      return "Hola "+c.nombre+", tenemos una promocion exclusiva para nuestros miembros "+c.membresia+". "+(extra||"Contactanos hoy para conocer los detalles y aprovechar esta oferta limitada.");
    },
  },
  reactivacion: {
    label: "Reactivacion de cliente inactivo",
    canales: ["email","whatsapp","sms"],
    asunto: "Te extranamos en Mini-Vac",
    cuerpo: function(c,extra){
      return "Hola "+c.nombre+", hace tiempo que no sabemos de ti y queremos reconectarnos. "+(extra||"Tu membresia "+c.membresia+" sigue activa y tenemos destinos increibles esperandote. Hablemos.");
    },
  },
};

// ?? Llamadas via Vonage (Voice API) ??
async function iniciarLlamadaVonage(destino, callerNombre){
  try {
    var res = await fetch("https://api.nexmo.com/v1/calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(VONAGE_API_KEY + ":" + VONAGE_API_SECRET),
      },
      body: JSON.stringify({
        to: [{ type: "phone", number: destino.replace(/[^0-9]/g,"") }],
        from: { type: "phone", number: VONAGE_FROM },
        answer_url: ["https://minivac.mx/vonage/answer"],
        event_url:  ["https://minivac.mx/vonage/events"],
      }),
    });
    var data = await res.json();
    if(data.uuid) return { ok: true, uuid: data.uuid };
    return { ok: false, error: data.title||"Error al iniciar llamada" };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ?? SMS via Vonage (SMS API) ??
async function enviarSMSVonage(destino, texto){
  try {
    var params = new URLSearchParams({
      api_key:    VONAGE_API_KEY,
      api_secret: VONAGE_API_SECRET,
      to:         destino.replace(/[^0-9]/g,""),
      from:       VONAGE_FROM,
      text:       texto,
    });
    var res = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    var data = await res.json();
    var msg = (data.messages||[])[0]||{};
    if(msg.status==="0") return { ok: true, msgId: msg["message-id"] };
    return { ok: false, error: msg["error-text"]||"Error SMS" };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ?? Email via Resend ??
async function enviarEmailResend(destinoEmail, asunto, cuerpo, nombreCliente){
  try {
    var res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Mini-Vac Vacation Club <" + RESEND_FROM + ">",
        to:   [destinoEmail],
        subject: asunto,
        html: "<div style='font-family:sans-serif;max-width:600px;margin:auto;padding:32px;'>"
            + "<div style='background:#0ea5a0;padding:16px 24px;border-radius:8px 8px 0 0;'>"
            + "<h2 style='color:#fff;margin:0;font-size:18px;'>Mini-Vac Vacation Club</h2>"
            + "</div>"
            + "<div style='background:#f8fafc;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;'>"
            + "<p style='color:#1e293b;font-size:15px;line-height:1.7;margin:0;'>"
            + cuerpo.replace(/\n/g,"<br/>")
            + "</p>"
            + "<hr style='border:none;border-top:1px solid #e2e8f0;margin:20px 0;'/>"
            + "<p style='color:#94a3b8;font-size:12px;margin:0;'>Mini-Vac Vacation Club &bull; Miami, FL &bull; Este mensaje fue enviado a "
            + nombreCliente + "</p>"
            + "</div></div>",
      }),
    });
    var data = await res.json();
    if(data.id) return { ok: true, emailId: data.id };
    return { ok: false, error: (data.message||data.name||"Error email") };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ?? WhatsApp via Twilio ??
var TWILIO_EDGE = "https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/send-whatsapp";
var SB_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxNTA0MiwiZXhwIjoyMDg4NTkxMDQyfQ.-P8KH6yhs6AJ1lUwBrwUpcoZV3KGvM7fDlFM3RsYKxw";
async function enviarWhatsApp(destino, texto, leadId){
  try {
    var res = await fetch(TWILIO_EDGE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SB_SERVICE_KEY, "apikey": SB_SERVICE_KEY },
      body: JSON.stringify({ to: destino, mensaje: texto, lead_id: leadId || null, service_key: SB_SERVICE_KEY }),
    });
    var data = await res.json();
    if(data.ok) return { ok: true, waId: data.sid };
    return { ok: false, error: data.error || "Error WhatsApp" };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ?? Hook para usar desde cualquier modulo ??
export function useCommPanel(){
  var [visible, setVisible]   = useState(false);
  var [cliente, setCliente]   = useState(null);
  var [canalInicial, setCanalInicial] = useState(null);
  var [logs,    setLogs]      = useState([]);

  function open(c, canal){
    setCliente(c);
    if(canal) setCanalInicial(canal);
    setVisible(true);
  }
  function close(){
    setVisible(false);
  }
  function addLog(entry){
    setLogs(function(prev){ return [entry,...prev]; });
  }

  return { visible, cliente, logs, open, close, addLog, setLogs, canalInicial };
}

// ?? Estilos internos ??
var SI = {
  inp: { width:"100%", background:"#f8f9fb", border:"1px solid #d8dbe0", borderRadius:"8px", padding:"8px 12px", color:"#3d4554", fontSize:"13px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  ta:  { width:"100%", background:"#f8f9fb", border:"1px solid #d8dbe0", borderRadius:"8px", padding:"8px 12px", color:"#3d4554", fontSize:"13px", outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", minHeight:"72px" },
  sel: { width:"100%", background:"rgba(10,13,25,0.98)", border:"1px solid #d8dbe0", borderRadius:"8px", padding:"8px 12px", color:"#3d4554", fontSize:"13px", outline:"none", cursor:"pointer", fontFamily:"inherit", boxSizing:"border-box" },
  lbl: { fontSize:"10px", color:"#9ca3af", marginBottom:"4px", fontWeight:"600", display:"block", textTransform:"uppercase", letterSpacing:"0.07em" },
  row: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" },
  btn: function(c,bg,br){ return { padding:"8px 14px", borderRadius:"8px", cursor:"pointer", fontSize:"12px", fontWeight:"600", background:bg, color:c, border:"1px solid "+br, transition:"all 0.15s", display:"inline-flex", alignItems:"center", gap:"5px", whiteSpace:"nowrap" }; },
  card: { background:"rgba(255,255,255,0.025)", border:"1px solid #e3e6ea", borderRadius:"10px", padding:"12px 14px", marginBottom:"8px" },
};

// ?? Icono SVG inline ??
function Icon(props){
  var icons = {
    phone: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
    sms:   "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
    wa:    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.535 5.945L0 24l6.233-1.512A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z",
    email: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    spin:  "M12 2a10 10 0 0 1 10 10",
    copy:  "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
    hist:  "M13 3a9 9 0 1 0 .001 18.001A9 9 0 0 0 13 3zm-1 14v-6l5 3-5 3zm0-8V5l3 2-3 2z",
  };
  var d = icons[props.name]||"";
  var sz = props.size||16;
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill={props.fill||"currentColor"} style={props.style||{}}>
      <path d={d}/>
    </svg>
  );
}

// ?? Tabs de canal ??
var CANALES = [
  { id:"llamada",  label:"Llamada",  color:BLUE,   bg:"#e5eefe",  br:"#aac4f0",  icon:"phone"  },
  { id:"sms",      label:"SMS",      color:GREEN,  bg:"#eaf5ec",  br:"#a3d9a5",  icon:"sms"    },
  { id:"whatsapp", label:"WhatsApp", color:"#25D366", bg:"rgba(37,211,102,0.12)", br:"rgba(37,211,102,0.3)", icon:"wa"   },

];

function fmtTime(iso){
  if(!iso) return "";
  var d = new Date(iso);
  var h = d.getHours(); var m = d.getMinutes();
  var ampm = h>=12?"PM":"AM";
  var hh = h%12||12;
  var mm = ("0"+m).slice(-2);
  return hh+":"+mm+" "+ampm+" - "+d.toLocaleDateString("es-MX",{day:"2-digit",month:"short"});
}

// ?? Panel de Llamada ??
function PanelLlamada(props){
  var c = props.cliente;
  var [estado,    setEstado]    = useState("idle");
  var [duracion,  setDuracion]  = useState(0);
  var [resultado, setResultado] = useState("");
  var [nota,      setNota]      = useState("");
  var [numDest,   setNumDest]   = useState(c.whatsapp||c.tel||"");
  var [error,     setError]     = useState("");
  var timerRef = useRef(null);

  var RESULTADOS = ["Contesto - resuelto","Contesto - pendiente","No contesto","Buzon de voz","Numero equivocado","Lllamar despues"];

  function iniciarLlamada(){
    if(!numDest.trim()){ setError("Ingresa un numero"); return; }
    setError("");
    setEstado("llamando");
    iniciarLlamadaVonage(numDest, c.nombre).then(function(r){
      if(r.ok){
        setEstado("en_llamada");
        var t0 = Date.now();
        timerRef.current = setInterval(function(){
          setDuracion(Math.floor((Date.now()-t0)/1000));
        },1000);
      } else {
        setEstado("idle");
        setError(r.error||"Error al conectar");
      }
    });
  }

  function colgarLlamada(){
    clearInterval(timerRef.current);
    setEstado("registrar");
  }

  function guardarLog(){
    if(!resultado){ setError("Selecciona el resultado"); return; }
    var mins = Math.floor(duracion/60);
    var segs = duracion%60;
    var durStr = mins>0?(mins+"m "+("0"+segs).slice(-2)+"s"):segs+"s";
    props.onLog({
      canal:"llamada", tipo:"llamada",
      texto:"Llamada a "+numDest+" ("+durStr+") - "+resultado+(nota?". "+nota:""),
      autor:props.currentUser.nombre,
      fecha:new Date().toISOString(),
      resultado:resultado,
    });
    setEstado("done");
  }

  function fmtDur(s){ var m=Math.floor(s/60); return (m>0?m+"m ":"")+("0"+(s%60)).slice(-2)+"s"; }

  if(estado==="done"){
    return (
      <div style={{textAlign:"center",padding:"32px 16px"}}>
        <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"#e5f3e8",border:"1px solid rgba(74,222,128,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
          <Icon name="check" fill={GREEN} size={24}/>
        </div>
        <div style={{fontSize:"13px",fontWeight:"600",color:GREEN,marginBottom:"4px"}}>Llamada registrada</div>
        <div style={{fontSize:"11px",color:"#9ca3af"}}>{resultado}</div>
        <button style={Object.assign({},SI.btn("#6b7280","#f6f7f9","#f0f1f4"),{marginTop:"16px"})} onClick={function(){setEstado("idle");setDuracion(0);setResultado("");setNota("");}}>Nueva llamada</button>
      </div>
    );
  }

  return (
    <div style={{padding:"4px 0"}}>
      {error&&<div style={{padding:"8px 12px",borderRadius:"8px",background:"#fef2f2",border:"1px solid rgba(248,113,113,0.3)",color:RED,fontSize:"12px",marginBottom:"12px"}}>{error}</div>}

      {(estado==="idle"||estado==="llamando")&&(
        <div>
          <div style={{marginBottom:"10px"}}>
            <label style={SI.lbl}>Numero a marcar</label>
            <div style={{display:"flex",gap:"6px"}}>
              <input style={SI.inp} value={numDest} onChange={function(e){setNumDest(e.target.value);}} placeholder="+52 33 1234 5678"/>
            </div>
            {c.tel&&c.tel!==numDest&&(
              <button style={{marginTop:"5px",fontSize:"10px",color:BLUE,background:"none",border:"none",cursor:"pointer",padding:0}} onClick={function(){setNumDest(c.tel);}}>Usar tel: {c.tel}</button>
            )}
          </div>
          <button
            style={Object.assign({},SI.btn("#fff",BLUE,"transparent"),{width:"100%",justifyContent:"center",padding:"12px",fontSize:"14px",opacity:estado==="llamando"?0.7:1})}
            onClick={iniciarLlamada}
            disabled={estado==="llamando"}
          >
            <Icon name="phone" fill="#fff" size={18}/>
            {estado==="llamando"?"Conectando...":"Iniciar llamada"}
          </button>
          <div style={{fontSize:"10px",color:"#9ca3af",textAlign:"center",marginTop:"6px"}}>Via Vonage Voice API</div>
        </div>
      )}

      {estado==="en_llamada"&&(
        <div style={{textAlign:"center"}}>
          <div style={{padding:"20px",background:"rgba(96,165,250,0.06)",borderRadius:"12px",border:"1px solid rgba(96,165,250,0.2)",marginBottom:"14px"}}>
            <div style={{fontSize:"11px",color:BLUE,marginBottom:"6px",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.08em"}}>En llamada con</div>
            <div style={{fontSize:"15px",fontWeight:"700",color:"#3d4554",marginBottom:"2px"}}>{c.nombre}</div>
            <div style={{fontSize:"12px",color:"#9ca3af",marginBottom:"10px"}}>{numDest}</div>
            <div style={{fontSize:"28px",fontWeight:"800",color:BLUE,fontVariantNumeric:"tabular-nums"}}>{fmtDur(duracion)}</div>
          </div>
          <button style={Object.assign({},SI.btn("#fff","rgba(248,113,113,0.9)","transparent"),{width:"100%",justifyContent:"center",padding:"12px",fontSize:"14px"})} onClick={colgarLlamada}>
            Colgar
          </button>
        </div>
      )}

      {estado==="registrar"&&(
        <div>
          <div style={{padding:"10px 12px",borderRadius:"9px",background:"rgba(255,255,255,0.025)",border:"1px solid #e3e6ea",marginBottom:"14px",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:"12px",color:"#9ca3af"}}>Duracion</span>
            <span style={{fontSize:"12px",fontWeight:"700",color:"#3d4554"}}>{fmtDur(duracion)}</span>
          </div>
          <div style={{marginBottom:"10px"}}>
            <label style={SI.lbl}>Resultado de la llamada</label>
            <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
              {RESULTADOS.map(function(r){
                var active = resultado===r;
                return (
                  <button key={r} onClick={function(){setResultado(r);setError("");}} style={Object.assign({},SI.btn(active?"#3d4554":BLUE,active?"rgba(96,165,250,0.15)":"#f9fafb",active?"rgba(96,165,250,0.4)":"#f2f3f6"),{justifyContent:"flex-start",fontSize:"12px"})}>
                    {active&&<Icon name="check" fill="#3d4554" size={12}/>}
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{marginBottom:"12px"}}>
            <label style={SI.lbl}>Nota adicional (opcional)</label>
            <textarea style={SI.ta} value={nota} onChange={function(e){setNota(e.target.value);}} placeholder="Detalles de la conversacion..."/>
          </div>
          <button style={Object.assign({},SI.btn("#fff",INDIGO,"transparent"),{width:"100%",justifyContent:"center",padding:"11px"})} onClick={guardarLog}>
            <Icon name="check" fill="#fff" size={14}/>
            Guardar registro
          </button>
        </div>
      )}
    </div>
  );
}

// ?? Panel SMS ??
function PanelSMS(props){
  var c = props.cliente;
  var [plantillaId, setPlantillaId] = useState("");
  var [texto,       setTexto]       = useState("");
  var [numDest,     setNumDest]     = useState(c.whatsapp||c.tel||"");
  var [estado,      setEstado]      = useState("idle");
  var [error,       setError]       = useState("");

  var plantsSMS = Object.entries(PLANTILLAS).filter(function(e){ return e[1].canales.indexOf("sms")>=0; });

  function aplicarPlantilla(id){
    setPlantillaId(id);
    if(id&&PLANTILLAS[id]) setTexto(PLANTILLAS[id].cuerpo(c,""));
  }

  function enviar(){
    if(!texto.trim()){ setError("Escribe un mensaje"); return; }
    if(!numDest.trim()){ setError("Ingresa un numero"); return; }
    setError("");
    setEstado("enviando");
    enviarSMSVonage(numDest, texto).then(function(r){
      if(r.ok){
        props.onLog({ canal:"sms", tipo:"sms", texto:"SMS enviado a "+numDest+": "+texto.slice(0,60)+(texto.length>60?"...":""), autor:props.currentUser.nombre, fecha:new Date().toISOString() });
        setEstado("done");
      } else {
        setError(r.error||"Error al enviar SMS");
        setEstado("idle");
      }
    });
  }

  if(estado==="done"){
    return (
      <div style={{textAlign:"center",padding:"32px 16px"}}>
        <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"#e5f3e8",border:"1px solid rgba(74,222,128,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
          <Icon name="check" fill={GREEN} size={24}/>
        </div>
        <div style={{fontSize:"13px",fontWeight:"600",color:GREEN,marginBottom:"4px"}}>SMS enviado</div>
        <div style={{fontSize:"11px",color:"#9ca3af"}}>Mensaje entregado via Vonage</div>
        <button style={Object.assign({},SI.btn("#6b7280","#f6f7f9","#f0f1f4"),{marginTop:"16px"})} onClick={function(){setEstado("idle");setTexto("");setPlantillaId("");}}>Nuevo SMS</button>
      </div>
    );
  }

  return (
    <div style={{padding:"4px 0"}}>
      {error&&<div style={{padding:"8px 12px",borderRadius:"8px",background:"#fef2f2",border:"1px solid rgba(248,113,113,0.3)",color:RED,fontSize:"12px",marginBottom:"12px"}}>{error}</div>}
      <div style={{marginBottom:"10px"}}>
        <label style={SI.lbl}>Numero destino</label>
        <input style={SI.inp} value={numDest} onChange={function(e){setNumDest(e.target.value);}} placeholder="+52 33 1234 5678"/>
      </div>
      <div style={{marginBottom:"10px"}}>
        <label style={SI.lbl}>Plantilla (opcional)</label>
        <select style={SI.sel} value={plantillaId} onChange={function(e){aplicarPlantilla(e.target.value);}}>
          <option value="">-- Mensaje libre --</option>
          {plantsSMS.map(function(e){ return <option key={e[0]} value={e[0]}>{e[1].label}</option>; })}
        </select>
      </div>
      <div style={{marginBottom:"12px"}}>
        <label style={SI.lbl}>Mensaje ({texto.length}/160 chars)</label>
        <textarea style={SI.ta} value={texto} onChange={function(e){setTexto(e.target.value);}} placeholder="Escribe tu mensaje SMS..."/>
        {texto.length>160&&<div style={{fontSize:"10px",color:AMBER,marginTop:"3px"}}>Mensaje largo: se enviara en multiples partes</div>}
      </div>
      <button style={Object.assign({},SI.btn("#fff",GREEN,"transparent"),{width:"100%",justifyContent:"center",padding:"11px",opacity:estado==="enviando"?0.7:1})} onClick={enviar} disabled={estado==="enviando"}>
        <Icon name="sms" fill="#fff" size={14}/>
        {estado==="enviando"?"Enviando...":"Enviar SMS"}
      </button>
      <div style={{fontSize:"10px",color:"#9ca3af",textAlign:"center",marginTop:"6px"}}>Via Vonage SMS API</div>
    </div>
  );
}

// ?? Panel WhatsApp ??
function PanelWhatsApp(props){
  var c = props.cliente;
  var [plantillaId, setPlantillaId] = useState("");
  var [texto,       setTexto]       = useState("");
  var [numDest,     setNumDest]     = useState(c.whatsapp||c.tel||"");
  var [estado,      setEstado]      = useState("idle");
  var [error,       setError]       = useState("");

  var plantsWA = Object.entries(PLANTILLAS).filter(function(e){ return e[1].canales.indexOf("whatsapp")>=0; });

  function aplicarPlantilla(id){
    setPlantillaId(id);
    if(id&&PLANTILLAS[id]) setTexto(PLANTILLAS[id].cuerpo(c,""));
  }

  function enviar(){
    if(!texto.trim()){ setError("Escribe un mensaje"); return; }
    if(!numDest.trim()){ setError("Ingresa un numero"); return; }
    setError("");
    setEstado("enviando");
    enviarWhatsApp(numDest, texto, c.id||c.leadId||null).then(function(r){
      if(r.ok){
        props.onLog({ canal:"whatsapp", tipo:"whatsapp", texto:"WhatsApp a "+numDest+": "+texto.slice(0,60)+(texto.length>60?"...":""), autor:props.currentUser.nombre, fecha:new Date().toISOString() });
        setEstado("done");
      } else {
        setError(r.error||"Error al enviar WhatsApp");
        setEstado("idle");
      }
    });
  }

  if(estado==="done"){
    return (
      <div style={{textAlign:"center",padding:"32px 16px"}}>
        <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"rgba(37,211,102,0.15)",border:"1px solid rgba(37,211,102,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
          <Icon name="check" fill="#25D366" size={24}/>
        </div>
        <div style={{fontSize:"13px",fontWeight:"600",color:"#25D366",marginBottom:"4px"}}>WhatsApp enviado</div>
        <button style={Object.assign({},SI.btn("#6b7280","#f6f7f9","#f0f1f4"),{marginTop:"16px"})} onClick={function(){setEstado("idle");setTexto("");setPlantillaId("");}}>Nuevo mensaje</button>
      </div>
    );
  }

  return (
    <div style={{padding:"4px 0"}}>

      {error&&<div style={{padding:"8px 12px",borderRadius:"8px",background:"#fef2f2",border:"1px solid rgba(248,113,113,0.3)",color:RED,fontSize:"12px",marginBottom:"12px"}}>{error}</div>}
      <div style={{marginBottom:"10px"}}>
        <label style={SI.lbl}>Numero WhatsApp</label>
        <input style={SI.inp} value={numDest} onChange={function(e){setNumDest(e.target.value);}} placeholder="+52 33 1234 5678"/>
      </div>
      <div style={{marginBottom:"10px"}}>
        <label style={SI.lbl}>Plantilla (opcional)</label>
        <select style={SI.sel} value={plantillaId} onChange={function(e){aplicarPlantilla(e.target.value);}}>
          <option value="">-- Mensaje libre --</option>
          {plantsWA.map(function(e){ return <option key={e[0]} value={e[0]}>{e[1].label}</option>; })}
        </select>
      </div>
      <div style={{marginBottom:"12px"}}>
        <label style={SI.lbl}>Mensaje</label>
        <textarea style={SI.ta} value={texto} onChange={function(e){setTexto(e.target.value);}} placeholder="Escribe tu mensaje..."/>
      </div>
      <button style={Object.assign({},SI.btn("#fff","#25D366","transparent"),{width:"100%",justifyContent:"center",padding:"11px",opacity:estado==="enviando"?0.7:1})} onClick={enviar} disabled={estado==="enviando"}>
        <Icon name="wa" fill="#fff" size={14}/>
        {estado==="enviando"?"Enviando...":"Enviar por WhatsApp"}
      </button>
      <div style={{fontSize:"10px",color:"#9ca3af",textAlign:"center",marginTop:"6px"}}>Via Meta Graph API (WhatsApp Business)</div>
    </div>
  );
}

// ?? Panel Email ??
function PanelEmail(props){
  var c = props.cliente;
  var [plantillaId, setPlantillaId] = useState("");
  var [asunto,      setAsunto]      = useState("");
  var [cuerpo,      setCuerpo]      = useState("");
  var [emailDest,   setEmailDest]   = useState(c.email||"");
  var [estado,      setEstado]      = useState("idle");
  var [error,       setError]       = useState("");

  var plantsEmail = Object.entries(PLANTILLAS).filter(function(e){ return e[1].canales.indexOf("email")>=0; });

  function aplicarPlantilla(id){
    setPlantillaId(id);
    if(id&&PLANTILLAS[id]){
      setAsunto(PLANTILLAS[id].asunto);
      setCuerpo(PLANTILLAS[id].cuerpo(c,""));
    }
  }

  function enviar(){
    if(!asunto.trim()){ setError("Escribe el asunto"); return; }
    if(!cuerpo.trim()){ setError("Escribe el cuerpo del email"); return; }
    if(!emailDest.trim()){ setError("Ingresa el email destino"); return; }
    setError("");
    setEstado("enviando");
    enviarEmailResend(emailDest, asunto, cuerpo, c.nombre).then(function(r){
      if(r.ok){
        props.onLog({ canal:"email", tipo:"email", texto:"Email enviado a "+emailDest+" - "+asunto, autor:props.currentUser.nombre, fecha:new Date().toISOString() });
        setEstado("done");
      } else {
        setError(r.error||"Error al enviar email");
        setEstado("idle");
      }
    });
  }

  if(estado==="done"){
    return (
      <div style={{textAlign:"center",padding:"32px 16px"}}>
        <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"rgba(167,139,250,0.15)",border:"1px solid rgba(167,139,250,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
          <Icon name="check" fill={VIOLET} size={24}/>
        </div>
        <div style={{fontSize:"13px",fontWeight:"600",color:VIOLET,marginBottom:"4px"}}>Email enviado</div>
        <div style={{fontSize:"11px",color:"#9ca3af"}}>Entregado via Resend</div>
        <button style={Object.assign({},SI.btn("#6b7280","#f6f7f9","#f0f1f4"),{marginTop:"16px"})} onClick={function(){setEstado("idle");setAsunto("");setCuerpo("");setPlantillaId("");}}>Nuevo email</button>
      </div>
    );
  }

  return (
    <div style={{padding:"4px 0"}}>
      {error&&<div style={{padding:"8px 12px",borderRadius:"8px",background:"#fef2f2",border:"1px solid rgba(248,113,113,0.3)",color:RED,fontSize:"12px",marginBottom:"12px"}}>{error}</div>}
      <div style={{marginBottom:"10px"}}>
        <label style={SI.lbl}>Email destino</label>
        <input style={SI.inp} value={emailDest} onChange={function(e){setEmailDest(e.target.value);}} placeholder="cliente@email.com" type="email"/>
      </div>
      <div style={{marginBottom:"10px"}}>
        <label style={SI.lbl}>Plantilla (opcional)</label>
        <select style={SI.sel} value={plantillaId} onChange={function(e){aplicarPlantilla(e.target.value);}}>
          <option value="">-- Redactar libre --</option>
          {plantsEmail.map(function(e){ return <option key={e[0]} value={e[0]}>{e[1].label}</option>; })}
        </select>
      </div>
      <div style={{marginBottom:"10px"}}>
        <label style={SI.lbl}>Asunto</label>
        <input style={SI.inp} value={asunto} onChange={function(e){setAsunto(e.target.value);}} placeholder="Asunto del correo..."/>
      </div>
      <div style={{marginBottom:"12px"}}>
        <label style={SI.lbl}>Cuerpo del mensaje</label>
        <textarea style={Object.assign({},SI.ta,{minHeight:"100px"})} value={cuerpo} onChange={function(e){setCuerpo(e.target.value);}} placeholder="Redacta tu mensaje..."/>
        <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"3px"}}>Se enviara con el branding de Mini-Vac desde {RESEND_FROM}</div>
      </div>
      <button style={Object.assign({},SI.btn("#fff",VIOLET,"transparent"),{width:"100%",justifyContent:"center",padding:"11px",opacity:estado==="enviando"?0.7:1})} onClick={enviar} disabled={estado==="enviando"}>
        <Icon name="email" fill="#fff" size={14}/>
        {estado==="enviando"?"Enviando...":"Enviar email"}
      </button>
      <div style={{fontSize:"10px",color:"#9ca3af",textAlign:"center",marginTop:"6px"}}>Via Resend API</div>
    </div>
  );
}

// ?? Historial de contactos ??
function PanelHistorial(props){
  var logs = props.logs||[];
  var logsCliente = logs.filter(function(l){ return l.clienteFolio===props.cliente.folio; });

  var CANAL_CFG = {
    llamada:  { color:BLUE,   bg:"#e5eefe",   br:"#aac4f0",   label:"Llamada"  },
    sms:      { color:GREEN,  bg:"#eaf5ec",   br:"#a3d9a5",   label:"SMS"      },
    whatsapp: { color:"#25D366", bg:"rgba(37,211,102,0.12)",br:"rgba(37,211,102,0.3)",   label:"WhatsApp" },
    email:    { color:VIOLET, bg:"#ebe6fd",  br:"#c4b5fd",  label:"Email"    },
  };

  if(logsCliente.length===0){
    return (
      <div style={{textAlign:"center",padding:"40px 16px",color:"#9ca3af"}}>
        <Icon name="hist" fill="#b0b8c4" size={32}/>
        <div style={{fontSize:"12px",marginTop:"10px"}}>Sin historial de contacto para este cliente</div>
      </div>
    );
  }

  return (
    <div style={{padding:"4px 0"}}>
      {logsCliente.map(function(l,i){
        var cfg = CANAL_CFG[l.canal]||CANAL_CFG.llamada;
        return (
          <div key={i} style={{marginBottom:"8px",padding:"10px 12px",borderRadius:"9px",background:"rgba(255,255,255,0.025)",border:"1px solid #e3e6ea"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
              <span style={{fontSize:"10px",fontWeight:"700",padding:"2px 8px",borderRadius:"20px",background:cfg.bg,color:cfg.color,border:"1px solid "+cfg.br}}>{cfg.label}</span>
              <span style={{fontSize:"10px",color:"#9ca3af"}}>{fmtTime(l.fecha)}</span>
            </div>
            <div style={{fontSize:"12px",color:"#3d4554",lineHeight:"1.5",marginBottom:"3px"}}>{l.texto}</div>
            <div style={{fontSize:"10px",color:"#9ca3af"}}>{l.autor}</div>
          </div>
        );
      })}
    </div>
  );
}

// ==================================================================
// COMPONENTE PRINCIPAL - CommPanel
// ==================================================================
export default function CommPanel(props){
  var visible     = props.visible;
  var cliente     = props.cliente;
  var currentUser = props.currentUser||{nombre:"Agente"};
  var onClose     = props.onClose||function(){};
  var onLog       = props.onLog||function(){};
  var logs        = props.logs||[];

  var [canal, setCanal] = useState("llamada");

  useEffect(function(){
    if(visible) setCanal(props.canalInicial || "llamada");
  },[visible, cliente]);

  if(!visible||!cliente) return null;

  var canalCfg = CANALES.find(function(ch){ return ch.id===canal; })||CANALES[0];

  function handleLog(entry){
    var full = Object.assign({},entry,{ clienteFolio: cliente.folio, clienteNombre: cliente.nombre });
    onLog(full);
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:800,pointerEvents:"none"}}>

      <div
        style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)",pointerEvents:"auto",backdropFilter:"blur(2px)"}}
        onClick={onClose}
      />

      <div style={{
        position:"absolute",top:0,right:0,bottom:0,
        width:"360px",
        background:"#0a0d19",
        borderLeft:"1px solid rgba(255,255,255,0.08)",
        display:"flex",flexDirection:"column",
        pointerEvents:"auto",
        boxShadow:"-24px 0 64px rgba(0,0,0,0.5)",
        fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif",
      }}>

        <div style={{padding:"16px 20px",borderBottom:"1px solid #e3e6ea",background:"rgba(255,255,255,0.012)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
            <div>
              <div style={{fontSize:"14px",fontWeight:"700",color:"#3d4554"}}>{cliente.nombre}</div>
              <div style={{fontSize:"11px",color:"#9ca3af"}}>{cliente.folio} - {cliente.membresia}</div>
            </div>
            <button onClick={onClose} style={{background:"#f8f9fb",border:"1px solid #dde0e5",borderRadius:"7px",padding:"5px",cursor:"pointer",color:"#9ca3af",display:"flex",alignItems:"center"}}>
              <Icon name="close" fill="#9ca3af" size={16}/>
            </button>
          </div>

          <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
            {CANALES.map(function(ch){
              var active = canal===ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={function(){setCanal(ch.id);}}
                  style={{
                    display:"flex",alignItems:"center",gap:"5px",
                    padding:"5px 10px",borderRadius:"7px",
                    fontSize:"11px",fontWeight:active?"700":"500",
                    cursor:"pointer",
                    background:active?ch.bg:"#f9fafb",
                    color:active?ch.color:"#9ca3af",
                    border:active?"1px solid "+ch.br:"1px solid rgba(255,255,255,0.06)",
                    transition:"all 0.12s",
                  }}
                >
                  <Icon name={ch.icon} fill={active?ch.color:"#9ca3af"} size={12}/>
                  {ch.label}
                </button>
              );
            })}
            <button
              onClick={function(){setCanal("historial");}}
              style={{
                display:"flex",alignItems:"center",gap:"5px",
                padding:"5px 10px",borderRadius:"7px",
                fontSize:"11px",fontWeight:canal==="historial"?"700":"500",
                cursor:"pointer",
                background:canal==="historial"?"rgba(100,116,139,0.15)":"#f9fafb",
                color:canal==="historial"?"#6b7280":"#9ca3af",
                border:canal==="historial"?"1px solid rgba(100,116,139,0.3)":"1px solid rgba(255,255,255,0.06)",
                transition:"all 0.12s",
              }}
            >
              <Icon name="hist" fill={canal==="historial"?"#6b7280":"#9ca3af"} size={12}/>
              Historial
            </button>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
          {canal==="llamada"  &&<PanelLlamada  cliente={cliente} currentUser={currentUser} onLog={handleLog}/>}
          {canal==="sms"      &&<PanelSMS      cliente={cliente} currentUser={currentUser} onLog={handleLog}/>}
          {canal==="whatsapp" &&<PanelWhatsApp cliente={cliente} currentUser={currentUser} onLog={handleLog}/>}
          {canal==="email"    &&<PanelEmail    cliente={cliente} currentUser={currentUser} onLog={handleLog}/>}
          {canal==="historial"&&<PanelHistorial cliente={cliente} logs={logs}/>}
        </div>

        <div style={{padding:"10px 20px",borderTop:"1px solid #e3e6ea",background:"rgba(255,255,255,0.008)",flexShrink:0}}>
          <div style={{fontSize:"10px",color:"#b0b8c4",textAlign:"center"}}>
            Mini-Vac CRM - Vonage SMS/Voice + Resend Email + WhatsApp Business
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// BOTON DE ACCESO RAPIDO - para usar en cualquier perfil de cliente
// Uso: <CommPanelTrigger cliente={c} onOpen={comm.open}/>
// ==================================================================
export function CommPanelTrigger(props){
  var c = props.cliente;
  var onOpen = props.onOpen||function(){};
  var [open, setOpen] = useState(false);
  var ref = useRef(null);

  useEffect(function(){
    function handler(e){ if(ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return function(){ document.removeEventListener("mousedown", handler); };
  }, []);

  var opciones = [
    { canal:"phone", color:BLUE,      icon:"phone",  label:"Llamar",   href:function(){ return "tel:"+c.tel; } },
    { canal:"sms",   color:GREEN,     icon:"sms",    label:"SMS",      href:function(){ return "sms:"+c.tel; } },
    { canal:"wa",    color:"#25D366", icon:"wa",     label:"WhatsApp", href:null, onClick:function(){ setOpen(false); onOpen(c, "whatsapp"); } },
    { canal:"email", color:VIOLET,    icon:"email",  label:"Email",    href:function(){ return "mailto:"+(c.email||""); } },
  ];

  return (
    <div ref={ref} style={{position:"relative"}}>
      <button
        onClick={function(){ setOpen(function(v){ return !v; }); }}
        style={{
          display:"flex",alignItems:"center",gap:5,
          padding:"5px 12px",borderRadius:7,
          fontSize:11,fontWeight:600,cursor:"pointer",
          background:"#e8f0fe",color:BLUE,
          border:"1px solid #aac4f0",
          fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif",
        }}
      >
        <Icon name="phone" fill={BLUE} size={12}/>
        Comunicar
        <span style={{fontSize:9,marginLeft:2}}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:999,
          background:"#ffffff",border:"1px solid #e3e6ea",
          borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",
          minWidth:160,overflow:"hidden",
        }}>
          {opciones.map(function(op){
            return (
              <a
                key={op.canal}
                href={op.href ? op.href() : undefined}
                target={op.canal==="wa" ? "_blank" : undefined}
                rel="noreferrer"
                onClick={function(e){ if(op.onClick){ e.preventDefault(); op.onClick(); } else { setOpen(false); onOpen(c, op.canal); } }}
                style={{
                  display:"flex",alignItems:"center",gap:10,
                  padding:"9px 14px",textDecoration:"none",
                  color:op.color,fontSize:12,fontWeight:600,
                  borderBottom:"1px solid #f0f1f4",
                  fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif",
                  cursor:"pointer",
                }}
              >
                <Icon name={op.icon} fill={op.color} size={14}/>
                {op.label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
