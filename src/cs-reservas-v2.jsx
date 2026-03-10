import { useState, useMemo, useEffect, useRef } from "react";
import CommPanel, { useCommPanel, CommPanelTrigger } from "./comm-panel";

var CHAT_KEY="minivac_chats";

var REGALOS_POR_DESTINO={
  "Cancun":        [{id:"G001",label:"Tour Chichen Itza"},{id:"G002",label:"Snorkel Isla Mujeres"},{id:"G004",label:"Gift Card $75 USD"}],
  "Los Cabos":     [{id:"G006",label:"Cena romantica en la playa"},{id:"G007",label:"Tour en lancha al Arco"},{id:"G008",label:"Gift Card $75 USD"}],
  "Riviera Maya":  [{id:"G009",label:"Tour Tulum + Cenote"},{id:"G010",label:"Snorkel en arrecife"},{id:"G011",label:"Gift Card $75 USD"}],
  "Las Vegas":     [{id:"G012",label:"$50 credito casino"},{id:"G013",label:"Show ticket (2 personas)"}],
  "Orlando":       [{id:"G014",label:"Gift Card $100 USD"},{id:"G024",label:"2 entradas parque de agua"}],
  "Puerto Vallarta":[{id:"G030",label:"Tour en barco Bahia Banderas"},{id:"G031",label:"Gift Card $50 USD"}],
  "Huatulco":      [{id:"G013",label:"Tour en catamaran bahias"},{id:"G014",label:"Gift Card $50 USD"}],
};

function csStorageGet(){ return window.storage.get(CHAT_KEY,true).then(function(r){ return r?JSON.parse(r.value):{chats:{}}; }).catch(function(){return {chats:{}};}); }
function csStorageSave(data){ return window.storage.set(CHAT_KEY,JSON.stringify(data),true).catch(function(){}); }

function PanelChats(props){
  var currentUser=props.currentUser||{nombre:"Agente CS"};
  var [chats,setChats]=useState({});
  var [selFolio,setSelFolio]=useState(null);
  var [reply,setReply]=useState("");
  var chatsRef=useRef(chats);
  chatsRef.current=chats;

  useEffect(function(){
    csStorageGet().then(function(data){ setChats(data.chats||{}); if(!selFolio){var ks=Object.keys(data.chats||{}); if(ks.length>0) setSelFolio(ks[0]);} });
    var iv=setInterval(function(){
      csStorageGet().then(function(data){ setChats(data.chats||{}); });
    },2000);
    return function(){ clearInterval(iv); };
  },[]);

  var lista=Object.values(chats).sort(function(a,b){ return (b.ts||"")>(a.ts||"")?1:-1; });
  var selChat=selFolio?chats[selFolio]:null;
  var msgs=selChat?(selChat.msgs||[]):[];

  var STATUS_COLOR={abierto:"#1565c0",escalado:"#f97316",solicitud_reserva:"#0ea5a0",solicitud_pago:"#f59e0b",cerrado:"#9ca3af"};

  function sendReply(){
    var txt=reply.trim();
    if(!txt||!selFolio) return;
    setReply("");
    csStorageGet().then(function(data){
      var d=data.chats||{};
      var chat=d[selFolio]||{msgs:[]};
      var newMsg={id:Date.now()+"r",from:"agente",texto:txt,autor:currentUser.nombre,ts:new Date().toISOString()};
      chat.msgs=(chat.msgs||[]).concat([newMsg]);
      chat.modoControl=true;
      chat.ts=new Date().toISOString();
      d[selFolio]=chat;
      csStorageSave({chats:d}).then(function(){ csStorageGet().then(function(data2){ setChats(data2.chats||{}); }); });
    });
  }

  function tomarControl(){
    if(!selFolio) return;
    csStorageGet().then(function(data){
      var d=data.chats||{};
      if(d[selFolio]){ d[selFolio].modoControl=true; d[selFolio].status="escalado"; }
      csStorageSave({chats:d}).then(function(){ csStorageGet().then(function(data2){ setChats(data2.chats||{}); }); });
    });
  }

  function cerrarChat(){
    if(!selFolio) return;
    csStorageGet().then(function(data){
      var d=data.chats||{};
      if(d[selFolio]){ d[selFolio].status="cerrado"; d[selFolio].modoControl=false; }
      csStorageSave({chats:d}).then(function(){ csStorageGet().then(function(data2){ setChats(data2.chats||{}); }); });
    });
  }

  function onKey(e){ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendReply();} }

  if(lista.length===0){
    return (
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"8px",color:"#9ca3af"}}>
        <div style={{fontSize:"28px"}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div style={{fontSize:"12px"}}>Sin chats activos del portal</div>
        <div style={{fontSize:"11px",color:"#b0b8c4"}}>Los clientes que escriban desde el portal apareceran aqui</div>
      </div>
    );
  }

  return (
    <div style={{flex:1,display:"flex",overflow:"hidden",gap:"0"}}>
      <div style={{width:"220px",borderRight:"1px solid #e3e6ea",overflowY:"auto",flexShrink:0}}>
        <div style={{padding:"10px 12px",fontSize:"10px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>Chats del portal ({lista.length})</div>
        {lista.map(function(c){
          var isSel=c.folio===selFolio;
          var sc=STATUS_COLOR[c.status]||"#9ca3af";
          var unread=c.status==="escalado"||c.status==="solicitud_reserva"||c.status==="solicitud_pago";
          return (
            <div key={c.folio} onClick={function(){setSelFolio(c.folio);}} style={{padding:"10px 12px",borderBottom:"1px solid #edf0f3",cursor:"pointer",background:isSel?"rgba(14,165,160,0.08)":"transparent",borderLeft:isSel?"3px solid #0ea5a0":"3px solid transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"4px"}}>
                <div style={{fontSize:"12px",fontWeight:unread?"700":"500",color:isSel?"#3d4554":"#6b7280"}}>{c.cliente||c.folio}</div>
                {unread&&<div style={{width:"7px",height:"7px",borderRadius:"50%",background:sc,flexShrink:0,marginTop:"3px"}}></div>}
              </div>
              <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"1px"}}>{c.folio}</div>
              <div style={{fontSize:"10px",color:sc,marginTop:"2px",fontWeight:"600"}}>{c.status||"abierto"}</div>
              {c.ultimoMsg&&<div style={{fontSize:"10px",color:"#b0b8c4",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"170px"}}>{c.ultimoMsg}</div>}
            </div>
          );
        })}
      </div>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {!selChat&&<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af",fontSize:"12px"}}>Selecciona un chat</div>}
        {selChat&&(
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"10px 14px",borderBottom:"1px solid #e8eaed",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <div>
                <div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>{selChat.cliente} <span style={{fontSize:"10px",color:"#9ca3af",fontWeight:"400"}}>{selChat.folio}</span></div>
                <div style={{fontSize:"10px",color:STATUS_COLOR[selChat.status]||"#9ca3af",fontWeight:"600"}}>{selChat.status||"abierto"}{selChat.modoControl?" - Agente en control":""}</div>
              </div>
              <div style={{display:"flex",gap:"5px"}}>
                {!selChat.modoControl&&<button style={{padding:"4px 10px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:"600",background:"rgba(14,165,160,0.12)",color:"#0ea5a0",border:"1px solid rgba(14,165,160,0.3)"}} onClick={tomarControl}>Tomar control</button>}
                {selChat.status!=="cerrado"&&<button style={{padding:"4px 10px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:"600",background:"rgba(100,116,139,0.1)",color:"#9ca3af",border:"1px solid rgba(100,116,139,0.2)"}} onClick={cerrarChat}>Cerrar</button>}
              </div>
            </div>

            {(selChat.solicitudes||[]).length>0&&(
              <div style={{padding:"8px 12px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(245,158,11,0.04)",flexShrink:0}}>
                <div style={{fontSize:"10px",fontWeight:"700",color:"#f59e0b",marginBottom:"4px"}}>SOLICITUDES</div>
                {(selChat.solicitudes||[]).map(function(s){
                  return (
                    <div key={s.id} style={{fontSize:"11px",color:"#6b7280",padding:"3px 0"}}>
                      {s.tipo==="reserva"?"Reserva: "+s.destino+" - "+fmtDate(s.fecha)+" - "+s.personas+" pax":"Pago: "+fmtUSD(s.monto)+" via "+(s.metodo||"")}
                    </div>
                  );
                })}
              </div>
            )}

            <div id="cs-chat-msgs" style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:"7px"}}>
              {msgs.map(function(m){
                var isUser=m.from==="user";
                var isSystem=m.from==="system";
                var isAgente=m.from==="agente";
                if(isSystem) return <div key={m.id} style={{textAlign:"center",fontSize:"10px",color:"#9ca3af",fontStyle:"italic",padding:"2px 0"}}>{m.texto}</div>;
                var bg=isUser?"rgba(14,165,160,0.1)":(isAgente?"#ede9fe":"#f8f9fb");
                var br=isUser?"rgba(14,165,160,0.25)":(isAgente?"rgba(167,139,250,0.25)":"#f2f3f6");
                var nc=isUser?"#0ea5a0":(isAgente?"#5b21b6":"#9ca3af");
                var nl=isUser?(selChat.cliente||"Cliente"):(isAgente?"Agente CS":"Bot");
                var rad=isUser?"12px 12px 4px 12px":"12px 12px 12px 4px";
                return (
                  <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:isUser?"flex-end":"flex-start",gap:"2px"}}>
                    <div style={{fontSize:"10px",color:nc,fontWeight:"600"}}>{nl}</div>
                    <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:rad,background:bg,border:"1px solid "+br,fontSize:"12px",color:"#3d4554",lineHeight:"1.5"}}>{m.texto}</div>
                  </div>
                );
              })}
            </div>

            <div style={{padding:"10px 12px",borderTop:"1px solid #e3e6ea",display:"flex",gap:"6px",flexShrink:0}}>
              <input style={{flex:1,background:"#f8f9fb",border:"1px solid #d8dbe0",borderRadius:"8px",padding:"8px 12px",color:"#3d4554",fontSize:"12px",outline:"none"}} value={reply} onChange={function(e){setReply(e.target.value);}} onKeyDown={onKey} placeholder={selChat.modoControl?"Responder al cliente...":"Toma control para responder..."}/>
              <button style={{padding:"8px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:"600",background:"rgba(14,165,160,0.15)",color:"#0ea5a0",border:"1px solid rgba(14,165,160,0.3)"}} onClick={sendReply} disabled={!reply.trim()}>Enviar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



const TODAY = new Date().toISOString().split("T")[0];
function addDays(d,n){ var dt=new Date(d+"T12:00:00"); dt.setDate(dt.getDate()+n); return dt.toISOString().split("T")[0]; }
function daysAgo(n){ var d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split("T")[0]; }
function daysFromNow(n){ var d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; }
function daysBetween(a,b){ return Math.max(0,Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/(1000*60*60*24))); }
function daysSince(d){ return Math.floor((Date.now()-new Date((d||TODAY)+"T12:00:00").getTime())/(1000*60*60*24)); }
function fmtDate(d){ if(!d)return"--"; return new Date(d+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"}); }
function fmtTime(ts){ if(!ts)return""; var d=new Date(ts); return d.toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"2-digit"})+" "+d.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}); }
function fmtUSD(n){ return "$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function calificaHotel(h,cliente){
  if(!cliente) return {ok:true,motivos:[]};
  var motivos=[];
  var edad=parseInt(cliente.edad)||0;
  var ec=(cliente.estadoCivil||"").toLowerCase();
  if(h.ageMin&&edad>0&&edad<h.ageMin) motivos.push("Edad min "+h.ageMin+" (cliente "+edad+")");
  if(h.ageMax&&edad>0&&edad>h.ageMax) motivos.push("Edad max "+h.ageMax+" (cliente "+edad+")");
  if(h.marital&&h.marital.length>0&&ec){
    var found=false;
    for(var i=0;i<h.marital.length;i++){ if(h.marital[i].toLowerCase()===ec){found=true;break;} }
    if(!found) motivos.push("Estado civil: "+h.marital.join(", "));
  }
  return {ok:motivos.length===0,motivos:motivos};
}
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function getPenalidad(dias){
  if(dias<=30) return {pct:100,label:"0-30 dias"};
  if(dias<=90) return {pct:80,label:"31-90 dias"};
  if(dias<=180) return {pct:60,label:"91-180 dias"};
  if(dias<=365) return {pct:40,label:"181-365 dias"};
  return {pct:20,label:"+1 ano"};
}


var INDIGO="#6366f1",TEAL="#0ea5a0",VIOLET="#5b21b6",RED="#b91c1c",GREEN="#1a7f3c",AMBER="#f59e0b",CORAL="#f97316",ORANGE="#925c0a",BLUE="#1565c0";


var ROLES = {
  cs: {
    label:"Customer Service",
    color:VIOLET,
    permisos:{
      verReservas:true, crearReserva:false, modificarReserva:false, cancelarReserva:false, confirmarReserva:false,
      verHistorial:true, crearNota:true, crearCaso:true, crearOperacion:true,
      verFinanciero:true, verContacto:true,
      iniciarRetencion:true, enviarEmail:true, enviarWhatsapp:true,
    }
  },
  reservas: {
    label:"Reservas",
    color:TEAL,
    permisos:{
      verReservas:true, crearReserva:true, modificarReserva:true, cancelarReserva:true, confirmarReserva:true,
      verHistorial:true, crearNota:true, crearCaso:false, crearOperacion:false,
      verFinanciero:false, verContacto:true,
      iniciarRetencion:false, enviarEmail:true, enviarWhatsapp:true,
    }
  },
  supervisor: {
    label:"Supervisor",
    color:AMBER,
    permisos:{
      verReservas:true, crearReserva:true, modificarReserva:true, cancelarReserva:true, confirmarReserva:true,
      verHistorial:true, crearNota:true, crearCaso:true, crearOperacion:true,
      verFinanciero:true, verContacto:true,
      iniciarRetencion:true, enviarEmail:true, enviarWhatsapp:true,
    }
  },
};


var RES_STATUS = {
  solicitud:       {label:"Solicitud",       color:AMBER,  bg:"rgba(245,158,11,0.12)", br:"rgba(245,158,11,0.3)"},
  vlo_proceso:     {label:"VLO en proceso",  color:INDIGO, bg:"#ebeffe", br:"#aab4f5"},
  rechazado_hotel: {label:"Rechazado hotel", color:CORAL,  bg:"rgba(249,115,22,0.12)", br:"rgba(249,115,22,0.3)"},
  confirmada:      {label:"Confirmada",      color:GREEN,  bg:"#eaf5ec", br:"#a3d9a5"},
  cancelada:       {label:"Cancelada",       color:RED,    bg:"#fef0f0",br:"#f5b8b8"},
  completada:      {label:"Completada",      color:"#9ca3af",bg:"rgba(100,116,139,0.12)",br:"rgba(100,116,139,0.3)"},
};
var CLIENT_STATUS = {
  activo:     {label:"Activo",    color:GREEN, bg:"#edf7ee", br:"#a3d9a5"},
  retencion:  {label:"Retencion", color:RED,   bg:"#fef2f2",br:"#f5b8b8"},
  chargeback: {label:"Chargeback",color:ORANGE,bg:"#fef9e7", br:"#f0d080"},
  cancelado:  {label:"Cancelado", color:"#9ca3af",bg:"rgba(100,116,139,0.1)",br:"rgba(100,116,139,0.3)"},
};
var CASO_STATUS = {
  abierto:    {label:"Abierto",    color:RED,   bg:"#fef0f0",br:"#f5b8b8"},
  en_proceso: {label:"En proceso", color:AMBER, bg:"rgba(245,158,11,0.12)", br:"rgba(245,158,11,0.3)"},
  resuelto:   {label:"Resuelto",   color:GREEN, bg:"#eaf5ec", br:"#a3d9a5"},
};
var OP_TIPOS = {
  cancelacion:       {label:"Cancelacion",        color:RED,   bg:"#fef2f2",br:"#f5b8b8"},
  extension:         {label:"Extension vigencia", color:AMBER, bg:"rgba(245,158,11,0.1)", br:"rgba(245,158,11,0.3)"},
  reembolso:         {label:"Reembolso",          color:GREEN, bg:"#edf7ee", br:"#a3d9a5"},
  cambio_destino:    {label:"Cambio de destinos", color:BLUE,  bg:"#e8f0fe", br:"#aac4f0"},
  descuento_credito: {label:"Descuento/Credito",  color:VIOLET,bg:"#ede9fe",br:"#c4b5fd"},
};
var OP_STATUS = {
  pendiente: {label:"Pend. aprobacion", color:AMBER,bg:"rgba(245,158,11,0.1)",  br:"rgba(245,158,11,0.3)"},
  aprobado:  {label:"Aprobado",         color:GREEN,bg:"#edf7ee",  br:"#a3d9a5"},
  rechazado: {label:"Rechazado",        color:RED,  bg:"#fef2f2", br:"#f5b8b8"},
};
var CANALES = {
  llamada:   {label:"Llamada",    color:BLUE,  bg:"#e5eefe",  br:"#aac4f0"},
  whatsapp:  {label:"WhatsApp",   color:GREEN, bg:"#eaf5ec",  br:"#a3d9a5"},
  email:     {label:"Email",      color:VIOLET,bg:"#ebe6fd", br:"#c4b5fd"},
  sistema:   {label:"Sistema",    color:"#9ca3af",bg:"rgba(100,116,139,0.12)",br:"rgba(100,116,139,0.3)"},
  presencial:{label:"Presencial", color:AMBER, bg:"rgba(245,158,11,0.12)",  br:"rgba(245,158,11,0.3)"},
};
var EVENTO_LABELS = {
  compra:"Compra",pago:"Pago",reserva_creada:"Reserva creada",reserva_confirmada:"Reserva confirmada",
  reserva_cancelada:"Reserva cancelada",reserva_modificada:"Reserva modificada",checkout:"Checkout",
  nota:"Nota",caso:"Caso CS",operacion:"Operacion",retencion:"Retencion iniciada",
  retencion_ganada:"Retencion ganada",email_enviado:"Email enviado",whatsapp:"WhatsApp enviado",
  survey:"Encuesta",verificacion:"Verificacion",llamada_ventas:"Llamada ventas",
};
var CATEGORIAS_CASO = ["Cambio de fecha","Cancelacion","Queja del servicio","Informacion del paquete","Problema con reservacion","Solicitud especial","Cobro / facturacion","Modificacion de paquete","Otro"];
var HOTELES_CATALOG = {
  "Cancun":[
    {id:"H101",nombre:"Krystal Grand Cancun Resort",cat:"5",fee:75,precioNoche:120,ageMin:25,ageMax:65,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc"],habs:[{id:"a",nombre:"Superior",base:true,up:0},{id:"b",nombre:"Deluxe",base:false,up:40},{id:"c",nombre:"Deluxe Oceano King",base:false,up:75},{id:"d",nombre:"Suite Junior",base:false,up:130}],regs:["Solo habitacion","Desayuno incluido","Todo incluido"],temps:[{id:"t1",nombre:"Semana Santa",inicio:"2026-03-28",fin:"2026-04-05",surcharge:60}]},
    {id:"H102",nombre:"Hotel Emporio Cancun",cat:"4",fee:50,precioNoche:90,ageMin:25,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Estandar",base:true,up:0},{id:"b",nombre:"Superior",base:false,up:30},{id:"c",nombre:"Deluxe",base:false,up:55}],regs:["Solo habitacion","Desayuno incluido","Todo incluido"],temps:[]},
    {id:"H103",nombre:"Live Aqua Beach Resort",cat:"5",fee:100,precioNoche:180,ageMin:30,ageMax:60,marital:["Casado","Union libre"],tipos:["qc"],habs:[{id:"a",nombre:"Aqua Room",base:true,up:0},{id:"b",nombre:"Aqua Suite",base:false,up:150}],regs:["Todo incluido"],temps:[]},
  ],
  "Los Cabos":[
    {id:"H201",nombre:"Riu Palace Cabo San Lucas",cat:"5",fee:80,precioNoche:140,ageMin:36,ageMax:99,marital:["Casado","Union libre"],tipos:["qc"],habs:[{id:"a",nombre:"Deluxe",base:true,up:0},{id:"b",nombre:"Junior Suite",base:false,up:100},{id:"c",nombre:"Suite Premium",base:false,up:200}],regs:["Todo incluido"],temps:[]},
    {id:"H202",nombre:"Melia Cabo Real Beach Golf",cat:"5",fee:65,precioNoche:110,ageMin:25,ageMax:99,marital:["Casado","Union libre"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Superior Garden View",base:true,up:0},{id:"b",nombre:"Deluxe Sea View",base:false,up:60}],regs:["Solo habitacion","Desayuno incluido","Todo incluido"],temps:[]},
  ],
  "Riviera Maya":[
    {id:"H301",nombre:"Iberostar Paraiso Lindo",cat:"5",fee:85,precioNoche:150,ageMin:25,ageMax:60,marital:["Casado","Union libre"],tipos:["qc"],habs:[{id:"a",nombre:"Superior",base:true,up:0},{id:"b",nombre:"Premium",base:false,up:80},{id:"c",nombre:"Suite Oceanfront",base:false,up:180}],regs:["Todo incluido"],temps:[]},
    {id:"H302",nombre:"Grand Palladium Riviera Resort",cat:"5",fee:70,precioNoche:120,ageMin:25,ageMax:70,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Junior Suite",base:true,up:0},{id:"b",nombre:"Suite",base:false,up:90}],regs:["Todo incluido"],temps:[]},
  ],
  "Puerto Vallarta":[
    {id:"H401",nombre:"Marriott Puerto Vallarta Resort",cat:"5",fee:70,precioNoche:115,ageMin:25,ageMax:60,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Deluxe",base:true,up:0},{id:"b",nombre:"Deluxe Marina View",base:false,up:60},{id:"c",nombre:"Suite Junior",base:false,up:140}],regs:["Solo habitacion","Desayuno incluido","Todo incluido"],temps:[]},
  ],
  "Huatulco":[
    {id:"H501",nombre:"Dreams Huatulco Resort Spa",cat:"5",fee:60,precioNoche:100,ageMin:25,ageMax:65,marital:["Casado","Union libre"],tipos:["qc"],habs:[{id:"a",nombre:"Deluxe",base:true,up:0},{id:"b",nombre:"Preferred Club",base:false,up:90}],regs:["Todo incluido"],temps:[]},
    {id:"H502",nombre:"Barcelo Huatulco",cat:"4",fee:50,precioNoche:80,ageMin:25,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Estandar",base:true,up:0},{id:"b",nombre:"Superior",base:false,up:40}],regs:["Todo incluido"],temps:[]},
  ],
  "Las Vegas":[
    {id:"H601",nombre:"MGM Grand",cat:"4",fee:60,precioNoche:95,ageMin:21,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Deluxe",base:true,up:0},{id:"b",nombre:"Strip View",base:false,up:50}],regs:["Solo habitacion"],temps:[]},
    {id:"H602",nombre:"Bellagio Hotel Casino",cat:"5",fee:90,precioNoche:160,ageMin:25,ageMax:70,marital:["Casado","Union libre"],tipos:["qc"],habs:[{id:"a",nombre:"Deluxe",base:true,up:0},{id:"b",nombre:"Fountain View",base:false,up:80}],regs:["Solo habitacion"],temps:[]},
  ],
  "Orlando":[
    {id:"H701",nombre:"Walt Disney World Swan",cat:"4",fee:70,precioNoche:110,ageMin:25,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],tipos:["qc","nq"],habs:[{id:"a",nombre:"Standard",base:true,up:0},{id:"b",nombre:"Lake View",base:false,up:50}],regs:["Solo habitacion","Desayuno incluido"],temps:[]},
  ],
};
var REGIMENES = ["Solo habitacion","Desayuno incluido","Media pension","Todo incluido"];


var SEED_CLIENTS = [
  {folio:"XT-1001",nombre:"Miguel Torres",coProp:"Sandra Torres",coPropEdad:36,coPropTel:"33-1234-9999",coPropEmail:"sandra@email.com",estadoCivil:"Casado",edad:38,tel:"33-1234-5678",whatsapp:"33-1234-5678",email:"miguel@email.com",telFijo:"",direccion:"Av. Patria 1250, Zapopan, Jalisco",membresia:"Gold",vendedor:"Ramon H.",comisionPct:10,compra:daysAgo(365),vigencia:daysFromNow(365),precioPaquete:3200,pagoInicial:1600,saldoPendiente:0,statusCliente:"activo",motivoRetencion:null,destinos:[{id:"D01",nombre:"Cancun",noches:5,tipo:"qc",regalo:{id:"G001",label:"Tour Chichen Itza"}},{id:"D03",nombre:"Riviera Maya",noches:6,tipo:"qc",regalo:null}],pagos:[{id:"P1",fecha:daysAgo(365),monto:1600,concepto:"Pago inicial",metodo:"Tarjeta",referencia:"TXN-88421"},{id:"P2",fecha:daysAgo(330),monto:800,concepto:"2do pago",metodo:"Transferencia",referencia:"SPEI-44231"},{id:"P3",fecha:daysAgo(295),monto:800,concepto:"Saldo final",metodo:"Transferencia",referencia:"SPEI-55891"}]},
  {folio:"XT-1002",nombre:"Patricia Sanchez",coProp:null,coPropEdad:null,coPropTel:null,coPropEmail:null,estadoCivil:"Soltera",edad:32,tel:"33-2345-6789",whatsapp:"33-2345-6789",email:"patricia@email.com",telFijo:"",direccion:"Calle Morelos 88, Guadalajara",membresia:"Silver",vendedor:"Lucia V.",comisionPct:10,compra:daysAgo(180),vigencia:daysFromNow(540),precioPaquete:1800,pagoInicial:900,saldoPendiente:450,statusCliente:"activo",motivoRetencion:null,destinos:[{id:"D02",nombre:"Los Cabos",noches:4,tipo:"qc",regalo:{id:"G008",label:"Gift Card $75 USD"}}],pagos:[{id:"P4",fecha:daysAgo(180),monto:900,concepto:"Pago inicial",metodo:"Tarjeta",referencia:"TXN-12349"},{id:"P5",fecha:daysAgo(90),monto:450,concepto:"2do pago",metodo:"Transferencia",referencia:"SPEI-88120"}]},
  {folio:"XT-1003",nombre:"Fernando Reyes",coProp:"Elena Reyes",coPropEdad:42,coPropTel:"33-3456-1111",coPropEmail:"elena@email.com",estadoCivil:"Casado",edad:45,tel:"33-3456-7890",whatsapp:"33-3456-7890",email:"fernando@email.com",telFijo:"33-3456-0000",direccion:"Blvd. Puerta de Hierro 2, Zapopan",membresia:"Gold",vendedor:"Ramon H.",comisionPct:10,compra:daysAgo(500),vigencia:daysFromNow(220),precioPaquete:2900,pagoInicial:1450,saldoPendiente:725,statusCliente:"retencion",motivoRetencion:"Cliente insatisfecho. Solicita cancelacion por cambio laboral.",destinos:[{id:"D01",nombre:"Cancun",noches:5,tipo:"qc"},{id:"D04",nombre:"Puerto Vallarta",noches:4,tipo:"nq"}],pagos:[{id:"P6",fecha:daysAgo(500),monto:1450,concepto:"Pago inicial",metodo:"Tarjeta",referencia:"TXN-55001"},{id:"P7",fecha:daysAgo(440),monto:725,concepto:"2do pago",metodo:"Transferencia",referencia:"SPEI-22110"}]},
  {folio:"XT-1004",nombre:"Rosa Gutierrez",coProp:"Jorge Gutierrez",coPropEdad:44,coPropTel:"33-4567-2222",coPropEmail:"jorge@email.com",estadoCivil:"Casado",edad:41,tel:"33-4567-8901",whatsapp:"33-4567-8901",email:"rosa@email.com",telFijo:"",direccion:"Av. Americas 1500, Guadalajara",membresia:"Platinum",vendedor:"Carlos P.",comisionPct:12,compra:daysAgo(700),vigencia:daysFromNow(80),precioPaquete:4500,pagoInicial:2250,saldoPendiente:0,statusCliente:"activo",motivoRetencion:null,destinos:[{id:"D03",nombre:"Riviera Maya",noches:6,tipo:"qc"}],pagos:[{id:"P8",fecha:daysAgo(700),monto:2250,concepto:"Pago inicial",metodo:"Tarjeta",referencia:"TXN-77700"},{id:"P9",fecha:daysAgo(640),monto:1125,concepto:"2do pago",metodo:"Transferencia",referencia:"SPEI-33400"},{id:"P10",fecha:daysAgo(580),monto:1125,concepto:"Saldo final",metodo:"Transferencia",referencia:"SPEI-44500"}]},
  {folio:"XT-1005",nombre:"Hector Jimenez",coProp:null,coPropEdad:null,coPropTel:null,coPropEmail:null,estadoCivil:"Soltero hombre",edad:29,tel:"33-5678-9012",whatsapp:"33-5678-9012",email:"hector@email.com",telFijo:"",direccion:"Calle Lopez Cotilla 890, Guadalajara",membresia:"Silver",vendedor:"Lucia V.",comisionPct:10,compra:daysAgo(90),vigencia:daysFromNow(640),precioPaquete:1600,pagoInicial:800,saldoPendiente:800,statusCliente:"activo",motivoRetencion:null,destinos:[{id:"D01",nombre:"Cancun",noches:5,tipo:"nq"},{id:"D05",nombre:"Huatulco",noches:5,tipo:"qc"}],pagos:[{id:"P11",fecha:daysAgo(90),monto:800,concepto:"Pago inicial",metodo:"Tarjeta",referencia:"TXN-66321"}]},
];
var SEED_RESERVAS = [
  {id:"RES-001",folio:"RES-001",clienteFolio:"XT-1001",destino:"Cancun",checkin:daysFromNow(45),checkout:addDays(daysFromNow(45),5),hotel:"Krystal Grand Cancun Resort",habitacion:"Deluxe Oceano King",regimen:"Todo incluido",personas:2,nochesIncluidas:5,nochesExtra:0,status:"confirmada",confirmacion:"KGC-44821",totalCobrado:150,tipo:"qc",agente:"Jorge P. (Reservas)",creadoEn:daysAgo(5),notasInternas:"Cliente pidio piso alto.",historial:[{fecha:daysAgo(5),texto:"Reserva creada",autor:"Jorge P. (Reservas)"},{fecha:daysAgo(3),texto:"Confirmada por hotel. No. KGC-44821",autor:"Jorge P. (Reservas)"}]},
  {id:"RES-002",folio:"RES-002",clienteFolio:"XT-1002",destino:"Los Cabos",checkin:daysFromNow(30),checkout:addDays(daysFromNow(30),4),hotel:"Melia Cabo Real Beach & Golf",habitacion:"Superior Garden View",regimen:"Desayuno incluido",personas:1,nochesIncluidas:4,nochesExtra:0,status:"vlo_proceso",confirmacion:"",totalCobrado:65,tipo:"qc",agente:"Maria R. (Reservas)",creadoEn:daysAgo(2),notasInternas:"",historial:[{fecha:daysAgo(2),texto:"Reserva creada, VLO en proceso",autor:"Maria R. (Reservas)"}]},
  {id:"RES-003",folio:"RES-003",clienteFolio:"XT-1004",destino:"Riviera Maya",checkin:daysFromNow(60),checkout:addDays(daysFromNow(60),6),hotel:"Iberostar Paraiso Lindo",habitacion:"Superior",regimen:"Todo incluido",personas:2,nochesIncluidas:6,nochesExtra:0,status:"solicitud",confirmacion:"",totalCobrado:85,tipo:"qc",agente:"Jorge P. (Reservas)",creadoEn:TODAY,notasInternas:"Aniversario de bodas.",historial:[{fecha:TODAY,texto:"Solicitud creada",autor:"Jorge P. (Reservas)"}]},
  {id:"RES-004",folio:"RES-004",clienteFolio:"XT-1003",destino:"Puerto Vallarta",checkin:daysFromNow(20),checkout:addDays(daysFromNow(20),4),hotel:"Marriott Puerto Vallarta Resort",habitacion:"Deluxe",regimen:"Desayuno incluido",personas:2,nochesIncluidas:4,nochesExtra:0,status:"solicitud",confirmacion:"",totalCobrado:70,tipo:"nq",agente:"Maria R. (Reservas)",creadoEn:TODAY,notasInternas:"",historial:[{fecha:TODAY,texto:"Solicitud creada",autor:"Maria R. (Reservas)"}]},
  {id:"RES-005",folio:"RES-005",clienteFolio:"XT-1001",destino:"Riviera Maya",checkin:daysAgo(90),checkout:addDays(daysAgo(90),6),hotel:"Grand Palladium Riviera Resort",habitacion:"Junior Suite",regimen:"Todo incluido",personas:2,nochesIncluidas:6,nochesExtra:0,status:"completada",confirmacion:"GPR-88231",totalCobrado:70,tipo:"qc",agente:"Jorge P. (Reservas)",creadoEn:daysAgo(95),notasInternas:"",historial:[{fecha:daysAgo(95),texto:"Creada",autor:"Jorge P. (Reservas)"},{fecha:daysAgo(93),texto:"Confirmada - GPR-88231",autor:"Jorge P. (Reservas)"},{fecha:daysAgo(84),texto:"Checkout completado",autor:"Sistema"}]},
];
var SEED_INTERACCIONES = [
  {id:"I001",clienteFolio:"XT-1001",tipo:"compra",canal:"presencial",autor:"Sistema",fecha:new Date(Date.now()-86400000*365).toISOString(),texto:"Compra Gold $3,200. Cancun 5n QC + Riviera Maya 6n QC."},
  {id:"I002",clienteFolio:"XT-1001",tipo:"pago",canal:"sistema",autor:"Sistema",fecha:new Date(Date.now()-86400000*364).toISOString(),texto:"Pago inicial $1,600 - TXN-88421"},
  {id:"I003",clienteFolio:"XT-1001",tipo:"reserva_creada",canal:"sistema",autor:"Jorge P. (Reservas)",fecha:new Date(Date.now()-86400000*95).toISOString(),texto:"RES-005 creada: Riviera Maya, Grand Palladium, 6n, Todo incluido."},
  {id:"I004",clienteFolio:"XT-1001",tipo:"reserva_confirmada",canal:"sistema",autor:"Jorge P. (Reservas)",fecha:new Date(Date.now()-86400000*93).toISOString(),texto:"RES-005 confirmada. No. GPR-88231."},
  {id:"I005",clienteFolio:"XT-1001",tipo:"checkout",canal:"sistema",autor:"Sistema",fecha:new Date(Date.now()-86400000*84).toISOString(),texto:"Checkout completado: Riviera Maya."},
  {id:"I006",clienteFolio:"XT-1001",tipo:"survey",canal:"email",autor:"Sistema",fecha:new Date(Date.now()-86400000*83).toISOString(),texto:"Survey post-estancia: 5/5 estrellas. 'Experiencia increible, volveremos'."},
  {id:"I007",clienteFolio:"XT-1001",tipo:"reserva_creada",canal:"sistema",autor:"Jorge P. (Reservas)",fecha:new Date(Date.now()-86400000*5).toISOString(),texto:"RES-001 creada: Cancun, Krystal Grand, 5n, Todo incluido."},
  {id:"I008",clienteFolio:"XT-1001",tipo:"nota",canal:"llamada",autor:"Ana Lopez (CS)",fecha:new Date(Date.now()-86400000*2).toISOString(),texto:"Llama para confirmar RES-001. Muy emocionado, es su aniversario."},
  {id:"I009",clienteFolio:"XT-1002",tipo:"compra",canal:"presencial",autor:"Sistema",fecha:new Date(Date.now()-86400000*180).toISOString(),texto:"Compra Silver $1,800. Los Cabos 4n QC."},
  {id:"I010",clienteFolio:"XT-1002",tipo:"pago",canal:"sistema",autor:"Sistema",fecha:new Date(Date.now()-86400000*180).toISOString(),texto:"Pago inicial $900 - TXN-12349"},
  {id:"I011",clienteFolio:"XT-1002",tipo:"reserva_creada",canal:"sistema",autor:"Maria R. (Reservas)",fecha:new Date(Date.now()-86400000*2).toISOString(),texto:"RES-002 creada: Los Cabos, Melia Cabo Real, 4n, Desayuno incluido."},
  {id:"I012",clienteFolio:"XT-1003",tipo:"compra",canal:"presencial",autor:"Sistema",fecha:new Date(Date.now()-86400000*500).toISOString(),texto:"Compra Gold $2,900. Cancun 5n QC + Puerto Vallarta 4n NQ."},
  {id:"I013",clienteFolio:"XT-1003",tipo:"retencion",canal:"llamada",autor:"Ana Lopez (CS)",fecha:new Date(Date.now()-86400000*4).toISOString(),texto:"Retencion iniciada. Motivo: cambio laboral, no podra usar el paquete."},
  {id:"I014",clienteFolio:"XT-1003",tipo:"reserva_creada",canal:"sistema",autor:"Maria R. (Reservas)",fecha:new Date(Date.now()-86400000*1).toISOString(),texto:"RES-004 creada: Puerto Vallarta, Marriott, 4n NQ."},
  {id:"I015",clienteFolio:"XT-1004",tipo:"compra",canal:"presencial",autor:"Sistema",fecha:new Date(Date.now()-86400000*700).toISOString(),texto:"Compra Platinum $4,500. Riviera Maya 6n QC."},
  {id:"I016",clienteFolio:"XT-1004",tipo:"reserva_creada",canal:"sistema",autor:"Jorge P. (Reservas)",fecha:new Date(Date.now()-86400000*0).toISOString(),texto:"RES-003 creada: Riviera Maya, Iberostar Paraiso, 6n, Todo incluido."},
  {id:"I017",clienteFolio:"XT-1005",tipo:"compra",canal:"presencial",autor:"Sistema",fecha:new Date(Date.now()-86400000*90).toISOString(),texto:"Compra Silver $1,600. Cancun 5n NQ + Huatulco 5n QC."},
];
var SEED_CASOS = [
  {id:"C001",clienteFolio:"XT-1001",folio:"CASO-001",titulo:"Cambio de fecha Cancun",categoria:"Cambio de fecha",status:"resuelto",canal:"whatsapp",autor:"Ana Lopez (CS)",creado:new Date(Date.now()-86400000*5).toISOString(),resolucion:"Cambio aprobado sin costo adicional."},
  {id:"C002",clienteFolio:"XT-1002",folio:"CASO-002",titulo:"Confirmacion de reserva no recibida",categoria:"Problema con reservacion",status:"en_proceso",canal:"email",autor:"Carlos M. (CS)",creado:new Date(Date.now()-86400000*1).toISOString(),resolucion:""},
];
var SEED_OPERACIONES = [
  {id:"OP001",clienteFolio:"XT-1003",tipo:"cancelacion",folio:"OP-001",status:"pendiente",autor:"Ana Lopez (CS)",creado:new Date(Date.now()-86400000*3).toISOString(),notaCS:"Cliente solicita cancelacion por cambio de trabajo, no puede viajar.",detalle:{motivo:"Cambio laboral",diasDesdeCompra:daysSince(daysAgo(500)),pct:getPenalidad(daysSince(daysAgo(500))).pct,montoOriginal:2900,montoReembolso:Math.round(2900*getPenalidad(daysSince(daysAgo(500))).pct/100)}},
];


var S = {
  wrap:  {minHeight:"100vh",background:"#07090f",color:"#3d4554",fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif",fontSize:"13px"},
  inp:   {width:"100%",background:"#f8f9fb",border:"1px solid #d8dbe0",borderRadius:"8px",padding:"8px 12px",color:"#3d4554",fontSize:"13px",outline:"none",boxSizing:"border-box",fontFamily:"inherit"},
  sel:   {width:"100%",background:"rgba(12,15,25,0.98)",border:"1px solid #d8dbe0",borderRadius:"8px",padding:"8px 12px",color:"#3d4554",fontSize:"13px",outline:"none",cursor:"pointer",fontFamily:"inherit",boxSizing:"border-box"},
  ta:    {width:"100%",background:"#f9fafb",border:"1px solid #d8dbe0",borderRadius:"8px",padding:"8px 12px",color:"#3d4554",fontSize:"13px",outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"},
  label: {fontSize:"11px",color:"#9ca3af",marginBottom:"4px",fontWeight:"500",display:"block"},
  stit:  {fontSize:"10px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"8px"},
  modal: {position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",backdropFilter:"blur(6px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"},
  mbox:  function(wide){ return {background:"#0c0f1a",border:"1px solid #dde0e5",borderRadius:"18px",padding:"24px 28px",width:"100%",maxWidth:wide?"800px":"560px",maxHeight:"92vh",overflowY:"auto"}; },
  card:  {background:"rgba(255,255,255,0.025)",border:"1px solid #e3e6ea",borderRadius:"12px",padding:"14px 16px",marginBottom:"8px"},
  g2:    {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"},
  g3:    {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px"},
  btn: function(v){
    var m = {
      primary: {bg:INDIGO,    c:"#fff",   br:INDIGO},
      teal:    {bg:"rgba(14,165,160,0.15)",  c:TEAL,   br:"rgba(14,165,160,0.3)"},
      violet:  {bg:"rgba(167,139,250,0.15)", c:VIOLET, br:"#c4b5fd"},
      success: {bg:"#e5f3e8",  c:GREEN,  br:"#a3d9a5"},
      danger:  {bg:"#fdeaea", c:RED,    br:"#f5b8b8"},
      warn:    {bg:"rgba(245,158,11,0.15)",  c:AMBER,  br:"rgba(245,158,11,0.3)"},
      ghost:   {bg:"#f6f7f9", c:"#6b7280",br:"#f0f1f4"},
      indigo:  {bg:"#e5eafd",  c:INDIGO, br:"#aab4f5"},
      orange:  {bg:"rgba(251,146,60,0.15)",  c:ORANGE, br:"#f0d080"},
      blue:    {bg:"rgba(96,165,250,0.15)",  c:BLUE,   br:"#aac4f0"},
    };
    var s = m[v]||m.ghost;
    return {display:"inline-flex",alignItems:"center",gap:"5px",padding:"7px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:"600",background:s.bg,color:s.c,border:"1px solid "+s.br,transition:"all 0.15s",whiteSpace:"nowrap",lineHeight:"1.2"};
  },
  tab: function(a,col){
    var c = col||INDIGO;
    return {padding:"7px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:a?"600":"400",background:a?(c+"20"):"transparent",color:a?c:"#9ca3af",border:a?("1px solid "+c+"44"):"1px solid transparent",transition:"all 0.15s",whiteSpace:"nowrap"};
  },
  bdg: function(c,bg,br){ return {display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:"20px",fontSize:"11px",fontWeight:"600",color:c,background:bg,border:"1px solid "+br}; },
};


function Bdg(props){
  var cfg = props.cfg||{};
  return <span style={S.bdg(cfg.color||"#6b7280",cfg.bg||"#f6f7f9",cfg.br||"#eceff3")}>{cfg.label||props.s}</span>;
}
function LockedBtn(props){
  return (
    <div style={{position:"relative",display:"inline-flex"}}>
      <button style={Object.assign({},S.btn("ghost"),{opacity:0.4,cursor:"not-allowed"})} disabled>{props.label}</button>
      <span style={{position:"absolute",top:"-4px",right:"-4px",fontSize:"9px",background:"rgba(248,113,113,0.9)",color:"#fff",borderRadius:"4px",padding:"1px 4px",fontWeight:"700"}}>CS</span>
    </div>
  );
}
function ModalWrap(props){
  return (
    <div style={S.modal} onClick={props.onClose}>
      <div style={S.mbox(props.wide)} onClick={function(e){e.stopPropagation();}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
          <div>
            <div style={{fontSize:"15px",fontWeight:"700",color:props.color||CORAL}}>{props.title}</div>
            {props.sub&&<div style={{fontSize:"11px",color:"#9ca3af",marginTop:"2px"}}>{props.sub}</div>}
          </div>
          <button style={Object.assign({},S.btn("ghost"),{padding:"4px 10px",fontSize:"15px",lineHeight:"1"})} onClick={props.onClose}>x</button>
        </div>
        {props.children}
      </div>
    </div>
  );
}
function EjecutivoSel(props){
  var opts = ["Ana Lopez (CS)","Carlos M. (CS)","Maria R. (Reservas)","Jorge P. (Reservas)","Marco Silva (Supervisor)"];
  return <select style={S.sel} value={props.value} onChange={props.onChange}>{opts.map(function(o){return <option key={o} value={o}>{o}</option>;})}</select>;
}
function Dot(props){
  var label = EVENTO_LABELS[props.tipo]||props.tipo;
  var canal = CANALES[props.canal]||CANALES.sistema;
  var col = props.col||"#9ca3af";
  return (
    <div style={{display:"flex",gap:"10px",marginBottom:"8px"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"16px",flexShrink:0}}>
        <div style={{width:"6px",height:"6px",borderRadius:"50%",background:col,marginTop:"5px",flexShrink:0,boxShadow:"0 0 4px "+col}}></div>
        <div style={{width:"1px",flex:1,background:"#f9fafb",marginTop:"3px"}}></div>
      </div>
      <div style={{flex:1,paddingBottom:"6px"}}>
        <div style={{display:"flex",gap:"4px",marginBottom:"3px",flexWrap:"wrap"}}>
          <span style={S.bdg(col,col+"18",col+"44")}>{label}</span>
          <span style={S.bdg(canal.color,canal.bg,canal.br)}>{canal.label}</span>
        </div>
        <div style={{fontSize:"12px",color:"#3d4554",lineHeight:"1.5"}}>{props.texto}</div>
        <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"2px"}}>{fmtTime(props.fecha)} - {props.autor}</div>
      </div>
    </div>
  );
}
function Lock(props){
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 16px",gap:"8px"}}>
      <div style={{fontSize:"20px",opacity:0.3}}>--</div>
      <div style={{fontSize:"12px",color:"#9ca3af",textAlign:"center"}}>Sin acceso: {props.rol==="cs"?"solo el equipo de Reservas puede ver esto":"solo CS puede ver esto"}</div>
    </div>
  );
}


function ReservaFormModal(props){
  var cliente = props.cliente;
  var res = props.reserva;
  var preDestino = props.destino||null;
  var isEdit = !!res;
  var currentUser = props.currentUser||{nombre:"Sistema"};
  var initDest = res?res.destino:(preDestino?preDestino.nombre:(cliente.destinos&&cliente.destinos[0]?cliente.destinos[0].nombre:""));
  var [destino,setDestino] = useState(initDest);
  var [checkin,setCheckin] = useState(res?res.checkin:daysFromNow(30));
  var [hotel,setHotel] = useState(res?res.hotel:"");
  var [habitacion,setHabitacion] = useState(res?res.habitacion:"");
  var [regimen,setRegimen] = useState(res?res.regimen:"Todo incluido");
  var [personas,setPersonas] = useState(res?String(res.personas):"2");
  var [nochesExtra,setNochesExtra] = useState(res?String(res.nochesExtra||0):"0");
  var [notas,setNotas] = useState(res?res.notasInternas:"");
  var [agente] = useState(res?res.agente:currentUser.nombre);
  var destinoObj = (cliente.destinos||[]).find(function(d){return d.nombre===destino;});
  var nBase = destinoObj?destinoObj.noches:0;
  var nExtra = parseInt(nochesExtra)||0;
  var totalN = nBase+nExtra;
  var checkout = addDays(checkin,totalN);
  var tipoDestino = destinoObj?destinoObj.tipo:"qc";
  var hotelesOpts = (HOTELES_CATALOG[destino]||[]).filter(function(h){
    if(h.tipos&&h.tipos.indexOf(tipoDestino)<0) return false;
    var cal=calificaHotel(h,cliente); return cal.ok;
  });
  var hotelesNoCalif = (HOTELES_CATALOG[destino]||[]).filter(function(h){
    if(h.tipos&&h.tipos.indexOf(tipoDestino)<0) return true;
    var cal=calificaHotel(h,cliente); return !cal.ok;
  });
  var hotelObj = (HOTELES_CATALOG[destino]||[]).find(function(h){return h.nombre===hotel;})||null;
  var habObj2 = hotelObj?(hotelObj.habs.find(function(h){return h.nombre===habitacion;})||hotelObj.habs[0]||null):null;
  var upPerNight2 = habObj2&&!habObj2.base?habObj2.up:0;
  var nochePrice = (hotelObj?hotelObj.precioNoche:90)+upPerNight2;
  var costoExtra = nExtra*nochePrice;
  var ok = destino&&hotel&&checkin&&habitacion;
  function handleSave(){
    props.onSave({destino:destino,checkin:checkin,checkout:checkout,hotel:hotel,habitacion:habitacion,regimen:regimen,personas:parseInt(personas)||2,nochesIncluidas:nBase,nochesExtra:nExtra,totalCobrado:costoExtra,tipo:tipoDestino,notasInternas:notas,agente:agente});
    props.onClose();
  }
  return (
    <ModalWrap title={isEdit?"Modificar reserva":"Nueva reserva"} sub={cliente.nombre+" - "+cliente.folio} color={TEAL} onClose={props.onClose} wide>
      <div style={Object.assign({},S.g2,{marginBottom:"12px"})}>
        <div>
          <label style={S.label}>Destino</label>
          <select style={S.sel} value={destino} onChange={function(e){setDestino(e.target.value);setHotel("");setHabitacion("");var nh=(HOTELES_CATALOG[e.target.value]||[])[0];if(nh&&nh.regs&&nh.regs.length>0)setRegimen(nh.regs[0]);}}>
            <option value="">-- Seleccionar --</option>
            {(cliente.destinos||[]).map(function(d){return <option key={d.id} value={d.nombre}>{d.nombre} - {d.noches}n {d.tipo.toUpperCase()}</option>;})}
          </select>
        </div>
        <div>
          <label style={S.label}>Check-in</label>
          <input style={S.inp} type="date" value={checkin} min={TODAY} onChange={function(e){setCheckin(e.target.value);}}/>
        </div>
      </div>
      {destino&&(
        <div style={{padding:"10px 14px",borderRadius:"10px",background:"rgba(14,165,160,0.06)",border:"1px solid rgba(14,165,160,0.2)",marginBottom:"12px",display:"flex",gap:"20px",fontSize:"12px",flexWrap:"wrap"}}>
          <span style={{color:"#9ca3af"}}>Noches incluidas: <strong style={{color:"#3d4554"}}>{nBase}</strong></span>
          <span style={{color:"#9ca3af"}}>Noches extra: <strong style={{color:AMBER}}>{nExtra}</strong></span>
          <span style={{color:"#9ca3af"}}>Total: <strong style={{color:TEAL}}>{totalN}n</strong></span>
          <span style={{color:"#9ca3af"}}>Checkout: <strong style={{color:"#3d4554"}}>{fmtDate(checkout)}</strong></span>
          {costoExtra>0&&<span style={{color:"#9ca3af"}}>Noches extra ({fmtUSD(nochePrice)}/noche): <strong style={{color:AMBER}}>{fmtUSD(costoExtra)}</strong></span>}
        </div>
      )}
      <div style={Object.assign({},S.g2,{marginBottom:"12px"})}>
        <div>
          <label style={S.label}>Hotel</label>
          <select style={S.sel} value={hotel} onChange={function(e){setHotel(e.target.value);}}>
            <option value="">-- Seleccionar hotel --</option>
            {hotelesOpts.length===0&&<option value="">Sin hoteles calificados</option>}
            {hotelesOpts.map(function(h){return <option key={h.id} value={h.nombre}>{h.nombre} ({h.cat} estrs)</option>;})}
            {hotelesNoCalif.length>0&&<option disabled value="">-- No califica --</option>}
            {hotelesNoCalif.map(function(h){var cal=calificaHotel(h,cliente); return <option key={h.id} disabled value="">{h.nombre} - {cal.motivos[0]}</option>;})}
          </select>
        </div>
        <div>
          <label style={S.label}>Habitacion</label>
          <select style={S.sel} value={habitacion} onChange={function(e){setHabitacion(e.target.value);}}>
            <option value="">-- Seleccionar --</option>
            {(hotelObj?hotelObj.habs:[]).map(function(h){var np=(hotelObj?hotelObj.precioNoche:90)+(h.base?0:h.up); return <option key={h.id} value={h.nombre}>{h.nombre}{h.base?" (incluida | extra: "+fmtUSD(hotelObj?hotelObj.precioNoche:90)+"/n)":" (+"+fmtUSD(h.up)+" upg | extra: "+fmtUSD(np)+"/n)"}</option>;})}
          </select>
        </div>
        <div>
          <label style={S.label}>Regimen</label>
          <select style={S.sel} value={regimen} onChange={function(e){setRegimen(e.target.value);}}>
            {REGIMENES.map(function(r){return <option key={r} value={r}>{r}</option>;})}
          </select>
        </div>
        <div>
          <label style={S.label}>Personas</label>
          <input style={S.inp} type="number" min="1" max="6" value={personas} onChange={function(e){setPersonas(e.target.value);}}/>
        </div>
        <div>
          <label style={S.label}>Noches extra (cargo adicional)</label>
          <input style={S.inp} type="number" min="0" max="30" value={nochesExtra} onChange={function(e){setNochesExtra(e.target.value);}}/>
        </div>
        <div>
          <label style={S.label}>Agente de reservas</label>
          <div style={{padding:"8px 12px",background:"#fafbfc",border:"1px solid #e3e6ea",borderRadius:"8px",fontSize:"13px",color:"#3d4554"}}>{agente}</div>
        </div>
      </div>
      <div style={{marginBottom:"18px"}}>
        <label style={S.label}>Notas internas / solicitudes especiales</label>
        <textarea style={Object.assign({},S.ta,{minHeight:"64px"})} value={notas} onChange={function(e){setNotas(e.target.value);}} placeholder="Preferencias de piso, cama, celebraciones..."/>
      </div>
      <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
        <button style={S.btn("ghost")} onClick={props.onClose}>Cancelar</button>
        <button style={S.btn("teal")} onClick={handleSave} disabled={!ok}>{isEdit?"Guardar cambios":"Crear reserva"}</button>
      </div>
    </ModalWrap>
  );
}


function ReservaDetailModal(props){
  var res = props.reserva;
  var perms = props.perms;
  var sc = RES_STATUS[res.status]||RES_STATUS.solicitud;
  var pasada = new Date(res.checkin+"T12:00:00") < new Date();
  var [conf,setConf] = useState(res.confirmacion||"");
  return (
    <ModalWrap title={res.folio+" - "+res.destino} sub={res.hotel} color={sc.color} onClose={props.onClose} wide>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"16px"}}>
        <span style={S.bdg(sc.color,sc.bg,sc.br)}>{sc.label}</span>
        <span style={S.bdg(res.tipo==="qc"?INDIGO:AMBER,res.tipo==="qc"?"#eef2ff":"rgba(245,158,11,0.1)",res.tipo==="qc"?"#aab4f5":"rgba(245,158,11,0.3)")}>{res.tipo.toUpperCase()}</span>
        {pasada&&res.status!=="cancelada"&&<span style={S.bdg("#9ca3af","rgba(100,116,139,0.1)","rgba(100,116,139,0.2)")}>Viaje pasado</span>}
      </div>
      <div style={Object.assign({},S.g3,{marginBottom:"14px"})}>
        <div style={S.card}><div style={S.label}>Check-in</div><strong style={{color:"#3d4554"}}>{fmtDate(res.checkin)}</strong></div>
        <div style={S.card}><div style={S.label}>Check-out</div><strong style={{color:"#3d4554"}}>{fmtDate(res.checkout)}</strong></div>
        <div style={S.card}><div style={S.label}>Noches</div><strong style={{color:TEAL}}>{daysBetween(res.checkin,res.checkout)}</strong></div>
        <div style={S.card}><div style={S.label}>Habitacion</div><span style={{color:"#3d4554"}}>{res.habitacion||"--"}</span></div>
        <div style={S.card}><div style={S.label}>Regimen</div><span style={{color:"#3d4554"}}>{res.regimen||"--"}</span></div>
        <div style={S.card}><div style={S.label}>Personas</div><strong style={{color:"#3d4554"}}>{res.personas}</strong></div>
        <div style={S.card}><div style={S.label}>Cargo adicional</div><strong style={{color:res.totalCobrado>0?AMBER:GREEN}}>{res.totalCobrado>0?fmtUSD(res.totalCobrado):"Sin cargo"}</strong></div>
        <div style={S.card}><div style={S.label}>Agente</div><span style={{color:"#3d4554"}}>{res.agente}</span></div>
        <div style={S.card}><div style={S.label}>Creada</div><span style={{color:"#3d4554"}}>{fmtDate(res.creadoEn)}</span></div>
      </div>
      {res.confirmacion&&<div style={{padding:"8px 14px",borderRadius:"9px",background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.25)",fontSize:"12px",color:GREEN,marginBottom:"12px"}}>No. de confirmacion del hotel: <strong>{res.confirmacion}</strong></div>}
      {res.notasInternas&&<div style={Object.assign({},S.card,{marginBottom:"12px",borderColor:"rgba(245,158,11,0.2)"})}><div style={S.label}>Notas internas</div><div style={{fontSize:"12px",color:"#3d4554"}}>{res.notasInternas}</div></div>}
      {perms.confirmarReserva&&(res.status==="solicitud"||res.status==="vlo_proceso")&&!pasada&&(
        <div style={{padding:"12px 14px",borderRadius:"10px",background:"rgba(14,165,160,0.06)",border:"1px solid rgba(14,165,160,0.2)",marginBottom:"14px"}}>
          <div style={S.label}>Marcar como confirmada</div>
          <div style={{display:"flex",gap:"8px"}}>
            <input style={S.inp} value={conf} onChange={function(e){setConf(e.target.value);}} placeholder="No. de confirmacion del hotel (ej: KGC-44821)"/>
            <button style={Object.assign({},S.btn("teal"),{flexShrink:0})} onClick={function(){props.onConfirmar(res.id,conf);props.onClose();}} disabled={!conf.trim()}>Confirmar</button>
          </div>
        </div>
      )}
      <div style={{marginBottom:"14px"}}>
        <div style={S.stit}>Historial de la reserva</div>
        {(res.historial||[]).map(function(h,i){
          return <div key={i} style={{display:"flex",gap:"10px",padding:"5px 0",borderBottom:"1px solid #edf0f3"}}><div style={{fontSize:"10px",color:"#9ca3af",width:"90px",flexShrink:0}}>{fmtDate(h.fecha)}</div><div style={{fontSize:"12px",color:"#3d4554",flex:1}}>{h.texto}</div><div style={{fontSize:"10px",color:"#9ca3af"}}>{h.autor}</div></div>;
        })}
      </div>
      <div style={{display:"flex",gap:"8px",justifyContent:"space-between",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:"8px"}}>
          {perms.modificarReserva&&res.status!=="cancelada"&&res.status!=="completada"&&(
            <button style={S.btn("warn")} onClick={function(){props.onEditar(res);props.onClose();}}>Modificar</button>
          )}
          {perms.cancelarReserva&&res.status!=="cancelada"&&res.status!=="completada"&&(
            <button style={S.btn("danger")} onClick={function(){props.onCancelar(res.id);props.onClose();}}>Cancelar reserva</button>
          )}
        </div>
        <button style={S.btn("ghost")} onClick={props.onClose}>Cerrar</button>
      </div>
    </ModalWrap>
  );
}


function NotaModal(props){
  var [txt,setTxt] = useState("");
  var [canal,setCanal] = useState("llamada");
  var [autor,setAutor] = useState("Ana Lopez (CS)");
  return (
    <ModalWrap title="Nota rapida" sub={props.cliente.nombre} color={VIOLET} onClose={props.onClose}>
      <div style={{marginBottom:"10px"}}><label style={S.label}>Canal de contacto</label><select style={S.sel} value={canal} onChange={function(e){setCanal(e.target.value);}}>{Object.keys(CANALES).map(function(k){return <option key={k} value={k}>{CANALES[k].label}</option>;})}</select></div>
      <div style={{marginBottom:"10px"}}><label style={S.label}>Nota</label><textarea style={Object.assign({},S.ta,{minHeight:"100px"})} value={txt} onChange={function(e){setTxt(e.target.value);}} placeholder="Detalle de la interaccion..."/></div>
      <div style={{marginBottom:"18px"}}><label style={S.label}>Ejecutivo</label><EjecutivoSel value={autor} onChange={function(e){setAutor(e.target.value);}}/></div>
      <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
        <button style={S.btn("ghost")} onClick={props.onClose}>Cancelar</button>
        <button style={S.btn("primary")} onClick={function(){props.onSave(txt,canal,autor);props.onClose();}} disabled={!txt.trim()}>Guardar nota</button>
      </div>
    </ModalWrap>
  );
}


function CasoModal(props){
  var [titulo,setTitulo] = useState("");
  var [categoria,setCategoria] = useState(CATEGORIAS_CASO[0]);
  var [canal,setCanal] = useState("llamada");
  var [desc,setDesc] = useState("");
  var [autor,setAutor] = useState("Ana Lopez (CS)");
  return (
    <ModalWrap title="Nuevo caso CS" sub={props.cliente.nombre} color={INDIGO} onClose={props.onClose}>
      <div style={{marginBottom:"10px"}}><label style={S.label}>Titulo del caso</label><input style={S.inp} value={titulo} onChange={function(e){setTitulo(e.target.value);}} placeholder="Resumen del caso..."/></div>
      <div style={Object.assign({},S.g2,{marginBottom:"10px"})}>
        <div><label style={S.label}>Categoria</label><select style={S.sel} value={categoria} onChange={function(e){setCategoria(e.target.value);}}>{CATEGORIAS_CASO.map(function(c){return <option key={c} value={c}>{c}</option>;})}</select></div>
        <div><label style={S.label}>Canal</label><select style={S.sel} value={canal} onChange={function(e){setCanal(e.target.value);}}>{Object.keys(CANALES).map(function(k){return <option key={k} value={k}>{CANALES[k].label}</option>;})}</select></div>
      </div>
      <div style={{marginBottom:"10px"}}><label style={S.label}>Descripcion</label><textarea style={Object.assign({},S.ta,{minHeight:"80px"})} value={desc} onChange={function(e){setDesc(e.target.value);}} placeholder="Detalle del caso..."/></div>
      <div style={{marginBottom:"18px"}}><label style={S.label}>Asignado a</label><EjecutivoSel value={autor} onChange={function(e){setAutor(e.target.value);}}/></div>
      <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
        <button style={S.btn("ghost")} onClick={props.onClose}>Cancelar</button>
        <button style={S.btn("primary")} onClick={function(){props.onSave({titulo:titulo,categoria:categoria,canal:canal,desc:desc,autor:autor});props.onClose();}} disabled={!titulo.trim()}>Crear caso</button>
      </div>
    </ModalWrap>
  );
}


function OpModal(props){
  var c = props.cliente;
  var [tipo,setTipo] = useState("");
  var [nota,setNota] = useState("");
  var [autor,setAutor] = useState("Ana Lopez (CS)");
  var [meses,setMeses] = useState("6");
  var [motivo,setMotivo] = useState("");
  var dias = daysSince(c.compra);
  var pen = getPenalidad(dias);
  var reembolso = Math.round((c.precioPaquete||0)*pen.pct/100);
  return (
    <ModalWrap title="Nueva operacion" sub={c.nombre+" - "+c.folio} color={AMBER} onClose={props.onClose}>
      <div style={{marginBottom:"10px"}}><label style={S.label}>Tipo de operacion</label><select style={S.sel} value={tipo} onChange={function(e){setTipo(e.target.value);}}>
        <option value="">-- Seleccionar --</option>
        {Object.entries(OP_TIPOS).map(function(e){return <option key={e[0]} value={e[0]}>{e[1].label}</option>;})}
      </select></div>
      {tipo==="cancelacion"&&(
        <div style={{padding:"12px 14px",borderRadius:"10px",background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.25)",marginBottom:"12px"}}>
          <div style={{fontSize:"11px",fontWeight:"700",color:RED,marginBottom:"8px"}}>Calculadora de cancelacion</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",fontSize:"12px",marginBottom:"10px"}}>
            <div><div style={S.label}>Dias desde compra</div><strong style={{color:"#3d4554"}}>{dias}d</strong></div>
            <div><div style={S.label}>Politica aplicable</div><strong style={{color:AMBER}}>{pen.pct}%</strong></div>
            <div><div style={S.label}>Precio original</div><strong style={{color:"#3d4554"}}>{fmtUSD(c.precioPaquete)}</strong></div>
            <div><div style={S.label}>Reembolso estimado</div><strong style={{color:GREEN}}>{fmtUSD(reembolso)}</strong></div>
          </div>
          <div><label style={S.label}>Motivo del cliente</label><textarea style={Object.assign({},S.ta,{minHeight:"56px"})} value={motivo} onChange={function(e){setMotivo(e.target.value);}} placeholder="Razon de cancelacion..."/></div>
        </div>
      )}
      {tipo==="extension"&&(
        <div style={{padding:"12px 14px",borderRadius:"10px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.25)",marginBottom:"12px"}}>
          <div style={S.g2}>
            <div><div style={S.label}>Vigencia actual</div><div style={{fontSize:"13px",color:"#3d4554"}}>{fmtDate(c.vigencia)}</div></div>
            <div><label style={S.label}>Meses a extender</label><input style={S.inp} type="number" min="1" max="24" value={meses} onChange={function(e){setMeses(e.target.value);}}/></div>
          </div>
          <div style={{marginTop:"8px",fontSize:"12px",color:GREEN}}>Nueva vigencia estimada: {fmtDate(addDays(c.vigencia||TODAY,parseInt(meses||1)*30))}</div>
        </div>
      )}
      <div style={{marginBottom:"10px"}}><label style={S.label}>Nota CS</label><textarea style={Object.assign({},S.ta,{minHeight:"64px"})} value={nota} onChange={function(e){setNota(e.target.value);}} placeholder="Contexto o detalles adicionales..."/></div>
      <div style={{marginBottom:"18px"}}><label style={S.label}>Ejecutivo CS</label><EjecutivoSel value={autor} onChange={function(e){setAutor(e.target.value);}}/></div>
      <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
        <button style={S.btn("ghost")} onClick={props.onClose}>Cancelar</button>
        <button style={S.btn("warn")} onClick={function(){props.onSave({tipo:tipo,notaCS:nota,autor:autor,detalle:{dias:dias,pct:pen.pct,montoOriginal:c.precioPaquete,montoReembolso:reembolso,motivo:motivo,meses:parseInt(meses)}});props.onClose();}} disabled={!tipo}>Enviar a aprobacion</button>
      </div>
    </ModalWrap>
  );
}



function TabContacto(props){
  var c = props.cliente;
  var [editando,setEditando] = useState(false);
  var [form,setForm] = useState({tel:c.tel||"",whatsapp:c.whatsapp||"",telFijo:c.telFijo||"",email:c.email||"",direccion:c.direccion||"",edad:String(c.edad||""),coProp:c.coProp||"",coPropEdad:String(c.coPropEdad||""),coPropTel:c.coPropTel||"",coPropEmail:c.coPropEmail||""});
  function set(k,v){ setForm(function(p){return Object.assign({},p,{[k]:v});}); }
  function handleSave(){
    props.onUpdate(c.folio,{tel:form.tel,whatsapp:form.whatsapp||form.tel,telFijo:form.telFijo,email:form.email,direccion:form.direccion,edad:parseInt(form.edad)||c.edad,coProp:form.coProp||null,coPropEdad:parseInt(form.coPropEdad)||null,coPropTel:form.coPropTel||null,coPropEmail:form.coPropEmail||null});
    setEditando(false);
  }
  var F = editando ? S.inp : {fontSize:"13px",fontWeight:"500",color:"#3d4554",background:"transparent",border:"none",padding:0,width:"100%"};
  return (
    <div>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div style={S.stit}>Titular</div>
          {!editando
            ? <button style={S.btn("ghost")} onClick={function(){setEditando(true);}}>Editar</button>
            : <div style={{display:"flex",gap:"6px"}}><button style={S.btn("ghost")} onClick={function(){setEditando(false);}}>Cancelar</button><button style={S.btn("primary")} onClick={handleSave}>Guardar</button></div>
          }
        </div>
        <div style={S.g2}>
          <div><div style={S.label}>Nombre completo</div><div style={{fontSize:"13px",fontWeight:"600",color:"#3d4554"}}>{c.nombre}</div></div>
          <div><div style={S.label}>Edad</div>{editando?<input style={S.inp} type="number" value={form.edad} onChange={function(e){set("edad",e.target.value);}}/>:<div style={{fontSize:"13px",color:"#3d4554"}}>{c.edad} anos</div>}</div>
          <div><div style={S.label}>Celular / WhatsApp</div>{editando?<input style={S.inp} value={form.tel} onChange={function(e){set("tel",e.target.value);}}/>:<div style={{fontSize:"13px",fontWeight:"600",color:BLUE}}>{c.tel}</div>}</div>
          <div><div style={S.label}>Tel. fijo</div>{editando?<input style={S.inp} value={form.telFijo} onChange={function(e){set("telFijo",e.target.value);}} placeholder="--"/>:<div style={{fontSize:"13px",color:"#3d4554"}}>{c.telFijo||"--"}</div>}</div>
          <div><div style={S.label}>Email</div>{editando?<input style={S.inp} value={form.email} onChange={function(e){set("email",e.target.value);}}/>:<div style={{fontSize:"13px",color:VIOLET}}>{c.email}</div>}</div>
          <div><div style={S.label}>Estado civil</div><div style={{fontSize:"13px",color:"#3d4554"}}>{c.estadoCivil||"--"}</div></div>
          <div style={{gridColumn:"1 / -1"}}><div style={S.label}>Direccion</div>{editando?<input style={S.inp} value={form.direccion} onChange={function(e){set("direccion",e.target.value);}} placeholder="Direccion completa"/>:<div style={{fontSize:"13px",color:"#3d4554"}}>{c.direccion||"--"}</div>}</div>
        </div>
      </div>
      <div style={Object.assign({},S.card,{borderColor:"rgba(167,139,250,0.2)"})}>
        <div style={S.stit}>Copropietario / Pareja</div>
        <div style={S.g2}>
          <div><div style={S.label}>Nombre</div>{editando?<input style={S.inp} value={form.coProp} onChange={function(e){set("coProp",e.target.value);}} placeholder="Nombre copropietario"/>:<div style={{fontSize:"13px",fontWeight:"600",color:"#3d4554"}}>{c.coProp||"--"}</div>}</div>
          <div><div style={S.label}>Edad</div>{editando?<input style={S.inp} type="number" value={form.coPropEdad} onChange={function(e){set("coPropEdad",e.target.value);}} placeholder="--"/>:<div style={{fontSize:"13px",color:"#3d4554"}}>{c.coPropEdad?c.coPropEdad+" anos":"--"}</div>}</div>
          <div><div style={S.label}>Celular</div>{editando?<input style={S.inp} value={form.coPropTel} onChange={function(e){set("coPropTel",e.target.value);}} placeholder="--"/>:<div style={{fontSize:"13px",color:BLUE}}>{c.coPropTel||"--"}</div>}</div>
          <div><div style={S.label}>Email</div>{editando?<input style={S.inp} value={form.coPropEmail} onChange={function(e){set("coPropEmail",e.target.value);}} placeholder="--"/>:<div style={{fontSize:"13px",color:VIOLET}}>{c.coPropEmail||"--"}</div>}</div>
        </div>
      </div>
    </div>
  );
}

function TabPaquete(props){
  var c = props.cliente;
  var reservas = props.reservas||[];
  var MEMBCOLOR = {Silver:"#6b7280",Gold:"#925c0a",Platinum:"#5b21b6"};
  var MEMB_OPTS = ["Silver","Gold","Platinum"];
  var TIPO_OPTS = ["qc","nq"];
  var NOCHES_QC = {Cancun:5,LosCabos:4,RivieraMaya:6,PuertoVallarta:4,Huatulco:5,LasVegas:3,Orlando:4};
  var TODOS_DESTINOS = ["Cancun","Los Cabos","Riviera Maya","Puerto Vallarta","Huatulco","Las Vegas","Orlando"];
  var [editPaquete,setEditPaquete] = useState(false);
  var [editDestinos,setEditDestinos] = useState(false);
  var [form,setForm] = useState({membresia:c.membresia||"Gold",vigencia:c.vigencia||TODAY,vendedor:c.vendedor||""});
  var [destinos,setDestinos] = useState((c.destinos||[]).map(function(d){return Object.assign({},d);}));
  var [nuevoNombre,setNuevoNombre] = useState("");
  var [nuevoTipo,setNuevoTipo] = useState("qc");
  var [nuevoNoches,setNuevoNoches] = useState("5");
  function setF(k,v){ setForm(function(p){return Object.assign({},p,{[k]:v});}); }
  var vigOk = new Date((c.vigencia||TODAY)+"T12:00:00") >= new Date();

  function handleSavePaquete(){
    props.onUpdate(c.folio,{membresia:form.membresia,vigencia:form.vigencia,vendedor:form.vendedor});
    setEditPaquete(false);
  }
  function handleSaveDestinos(){
    props.onUpdate(c.folio,{destinos:destinos});
    setEditDestinos(false);
  }
  function updateDestino(idx,key,val){
    setDestinos(function(prev){
      var next = prev.map(function(d){return Object.assign({},d);});
      next[idx][key] = key==="noches"?parseInt(val)||1:val;
      return next;
    });
  }
  function removeDestino(idx){
    var res = reservas.find(function(r){return r.destino===destinos[idx].nombre&&r.status!=="cancelada"&&r.status!=="completada";});
    if(res){ alert("No se puede quitar "+destinos[idx].nombre+": tiene una reserva activa ("+res.folio+")."); return; }
    setDestinos(function(prev){return prev.filter(function(_,i){return i!==idx;});});
  }
  function addDestino(){
    if(!nuevoNombre) return;
    if(destinos.find(function(d){return d.nombre===nuevoNombre;})){ alert("Ya existe este destino en el paquete."); return; }
    setDestinos(function(prev){return [...prev,{id:"D"+Date.now(),nombre:nuevoNombre,tipo:nuevoTipo,noches:parseInt(nuevoNoches)||5}];});
    setNuevoNombre(""); setNuevoTipo("qc"); setNuevoNoches("5");
  }

  return (
    <div>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div style={S.stit}>Datos del paquete</div>
          {!editPaquete
            ? <button style={S.btn("ghost")} onClick={function(){setEditPaquete(true);}}>Editar</button>
            : <div style={{display:"flex",gap:"6px"}}><button style={S.btn("ghost")} onClick={function(){setEditPaquete(false);}}>Cancelar</button><button style={S.btn("primary")} onClick={handleSavePaquete}>Guardar</button></div>
          }
        </div>
        <div style={S.g2}>
          <div><div style={S.label}>Folio</div><div style={{fontSize:"13px",fontWeight:"700",color:INDIGO}}>{c.folio}</div></div>
          <div>
            <div style={S.label}>Membresia</div>
            {editPaquete
              ? <select style={S.sel} value={form.membresia} onChange={function(e){setF("membresia",e.target.value);}}>{MEMB_OPTS.map(function(m){return <option key={m} value={m}>{m}</option>;})}</select>
              : <div style={{fontSize:"13px",fontWeight:"700",color:MEMBCOLOR[c.membresia]||"#6b7280"}}>{c.membresia}</div>
            }
          </div>
          <div>
            <div style={S.label}>Vendedor</div>
            {editPaquete
              ? <input style={S.inp} value={form.vendedor} onChange={function(e){setF("vendedor",e.target.value);}}/>
              : <div style={{fontSize:"13px",color:"#3d4554"}}>{c.vendedor||"--"}</div>
            }
          </div>
          <div><div style={S.label}>Fecha de compra</div><div style={{fontSize:"13px",color:"#3d4554"}}>{fmtDate(c.compra)}</div></div>
          <div>
            <div style={S.label}>Vigencia hasta</div>
            {editPaquete
              ? <input style={S.inp} type="date" value={form.vigencia} onChange={function(e){setF("vigencia",e.target.value);}}/>
              : <div style={{fontSize:"13px",color:vigOk?"#3d4554":RED,fontWeight:vigOk?"400":"700"}}>{fmtDate(c.vigencia)}</div>
            }
          </div>
          <div><div style={S.label}>Precio del paquete</div><div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>{fmtUSD(c.precioPaquete)}</div></div>
        </div>
      </div>

      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div style={S.stit}>Destinos del paquete</div>
          {!editDestinos
            ? <button style={S.btn("ghost")} onClick={function(){setEditDestinos(true);setDestinos((c.destinos||[]).map(function(d){return Object.assign({},d);}));}}>Editar destinos</button>
            : <div style={{display:"flex",gap:"6px"}}><button style={S.btn("ghost")} onClick={function(){setEditDestinos(false);}}>Cancelar</button><button style={S.btn("primary")} onClick={handleSaveDestinos}>Guardar</button></div>
          }
        </div>

        {!editDestinos && (c.destinos||[]).map(function(d,di){
          var resActiva = reservas.find(function(r){return r.destino===d.nombre&&r.status!=="cancelada"&&r.status!=="completada";});
          var regalosDisp=d.tipo==="qc"?(REGALOS_POR_DESTINO[d.nombre]||[]):[];
          function setRegaloDestino(r){
            var nd=(c.destinos||[]).map(function(x,xi){return xi===di?Object.assign({},x,{regalo:r}):x;});
            props.onUpdate(c.folio,{destinos:nd});
          }
          return (
            <div key={d.id||d.nombre} style={{padding:"8px 0",borderBottom:"1px solid #edf0f3"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:regalosDisp.length>0?"6px":"0"}}>
                <div>
                  <div style={{fontSize:"13px",fontWeight:"600",color:"#3d4554"}}>{d.nombre}</div>
                  <div style={{fontSize:"11px",color:"#9ca3af"}}>{d.noches} noches</div>
                </div>
                <div style={{display:"flex",gap:"5px",alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                  <span style={S.bdg(d.tipo==="qc"?INDIGO:AMBER,d.tipo==="qc"?"#eef2ff":"rgba(245,158,11,0.1)",d.tipo==="qc"?"#aab4f5":"rgba(245,158,11,0.3)")}>{d.tipo.toUpperCase()}</span>
                  {resActiva&&<span style={S.bdg(GREEN,"#edf7ee","#a3d9a5")}>Res. activa</span>}
                  {!resActiva&&props.onReservar&&<button style={{padding:"3px 10px",borderRadius:"7px",fontSize:"11px",fontWeight:"600",background:"rgba(14,165,160,0.12)",color:TEAL,border:"1px solid rgba(14,165,160,0.3)",cursor:"pointer"}} onClick={function(){props.onReservar(c,d);}}>+ Reservar</button>}
                </div>
              </div>
              {d.tipo==="qc"&&regalosDisp.length>0&&(
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}>
                    <div style={{fontSize:"10px",color:"#9ca3af",fontWeight:"600"}}>Regalo QC (max 1):</div>
                    {resActiva&&<span style={{fontSize:"10px",color:AMBER,fontWeight:"600"}}>Bloqueado - hay reserva activa</span>}
                  </div>
                  {resActiva
                    ? <div style={{fontSize:"11px",color:"#9ca3af",fontStyle:"italic"}}>{d.regalo?d.regalo.label:"Sin regalo asignado"}</div>
                    : <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
                        <div onClick={function(){setRegaloDestino(null);}} style={{padding:"3px 9px",borderRadius:"6px",cursor:"pointer",fontSize:"11px",fontWeight:"600",background:!d.regalo?"#f0f1f4":"#f9fafb",color:!d.regalo?"#3d4554":"#9ca3af",border:"1px solid "+(!d.regalo?"rgba(255,255,255,0.2)":"#f4f5f7")}}>
                          Sin regalo
                        </div>
                        {regalosDisp.map(function(r){
                          var sel=d.regalo&&d.regalo.id===r.id;
                          return <div key={r.id} onClick={function(){setRegaloDestino(r);}} style={{padding:"3px 9px",borderRadius:"6px",cursor:"pointer",fontSize:"11px",fontWeight:sel?"700":"400",background:sel?"rgba(251,191,36,0.12)":"#f9fafb",color:sel?"#925c0a":"#9ca3af",border:"1px solid "+(sel?"rgba(251,191,36,0.4)":"#f4f5f7")}}>{r.label}{sel?" *":""}</div>;
                        })}
                      </div>
                  }
                </div>
              )}
            </div>
          );
        })}

        {editDestinos && (
          <div>
            {destinos.map(function(d,i){
              var resActiva = reservas.find(function(r){return r.destino===d.nombre&&r.status!=="cancelada"&&r.status!=="completada";});
              return (
                <div key={d.id||d.nombre+i} style={{display:"grid",gridTemplateColumns:"1fr 80px 70px auto",gap:"6px",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #edf0f3"}}>
                  <div style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>{d.nombre}</div>
                  {resActiva
                    ? <div style={{fontSize:"11px",color:"#9ca3af"}}>{d.tipo.toUpperCase()}</div>
                    : <select style={Object.assign({},S.sel,{padding:"5px 8px",fontSize:"11px"})} value={d.tipo} onChange={function(e){updateDestino(i,"tipo",e.target.value);}}>
                        <option value="qc">QC</option>
                        <option value="nq">NQ</option>
                      </select>
                  }
                  {resActiva
                    ? <div style={{fontSize:"11px",color:"#9ca3af"}}>{d.noches}n</div>
                    : <input style={Object.assign({},S.inp,{padding:"5px 8px",fontSize:"11px"})} type="number" min="1" max="14" value={d.noches} onChange={function(e){updateDestino(i,"noches",e.target.value);}} placeholder="Noches"/>
                  }
                  <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
                    {resActiva
                      ? <span style={{fontSize:"10px",color:AMBER,fontWeight:"600"}}>Bloqueado</span>
                      : <button style={Object.assign({},S.btn("danger"),{padding:"4px 8px",fontSize:"11px"})} onClick={function(){removeDestino(i);}}>Quitar</button>
                    }
                  </div>
                </div>
              );
            })}
            <div style={{display:"grid",gridTemplateColumns:"1fr 80px 70px auto",gap:"6px",alignItems:"center",marginTop:"10px",paddingTop:"10px",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
              <select style={Object.assign({},S.sel,{padding:"5px 8px",fontSize:"11px"})} value={nuevoNombre} onChange={function(e){setNuevoNombre(e.target.value);}}>
                <option value="">+ Destino</option>
                {TODOS_DESTINOS.filter(function(dn){return !destinos.find(function(d){return d.nombre===dn;});}).map(function(dn){return <option key={dn} value={dn}>{dn}</option>;})}
              </select>
              <select style={Object.assign({},S.sel,{padding:"5px 8px",fontSize:"11px"})} value={nuevoTipo} onChange={function(e){setNuevoTipo(e.target.value);}}>
                <option value="qc">QC</option>
                <option value="nq">NQ</option>
              </select>
              <input style={Object.assign({},S.inp,{padding:"5px 8px",fontSize:"11px"})} type="number" min="1" max="14" value={nuevoNoches} onChange={function(e){setNuevoNoches(e.target.value);}} placeholder="Noches"/>
              <button style={Object.assign({},S.btn("teal"),{padding:"5px 10px",fontSize:"11px"})} onClick={addDestino} disabled={!nuevoNombre}>Agregar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FichaCliente(props){
  var c = props.cliente;
  var perms = props.perms;
  var rol = props.rol;
  var reservas = props.reservas;
  var interacciones = props.interacciones;
  var casos = props.casos;
  var ops = props.ops;
  var [tab,setTab] = useState("contacto");

  var stCfg = CLIENT_STATUS[c.statusCliente]||CLIENT_STATUS.activo;
  var vigOk = new Date((c.vigencia||TODAY)+"T12:00:00") >= new Date();
  var totalPagado = (c.pagos||[]).reduce(function(s,p){return s+p.monto;},0);
  var resCliente = reservas.filter(function(r){return r.clienteFolio===c.folio;});
  var resActivas = resCliente.filter(function(r){return r.status!=="cancelada"&&r.status!=="completada";});
  var casosCliente = casos.filter(function(x){return x.clienteFolio===c.folio;});
  var opsCliente = ops.filter(function(x){return x.clienteFolio===c.folio;});
  var historial = interacciones.filter(function(x){return x.clienteFolio===c.folio;}).sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);});

  var MEMBCOLOR = {Silver:"#6b7280",Gold:"#925c0a",Platinum:"#5b21b6"};
  var rolCfg = ROLES[rol]||ROLES.cs;

  var TABS = [
    {id:"contacto",   label:"Contacto",            show:perms.verContacto},
    {id:"paquete",    label:"Paquete",              show:true},
    {id:"historial",  label:"Historial",            show:perms.verHistorial},
    {id:"casos",      label:"Casos"+(casosCliente.length?" ("+casosCliente.length+")":""), show:perms.crearCaso||perms.verHistorial},
    {id:"financiero", label:"Financiero",           show:perms.verFinanciero},
    {id:"reservas",   label:"Reservas"+(resCliente.length?" ("+resCliente.length+")":""),  show:true},
    {id:"ops",        label:"Operaciones"+(opsCliente.length?" ("+opsCliente.length+")":""),show:perms.crearOperacion||perms.verHistorial},
  ].filter(function(t){return t.show;});

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>


      <div style={{padding:"10px 20px",background:"#fafbfc",borderBottom:"1px solid #e8eaed",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,"+INDIGO+","+TEAL+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"800",color:"#fff",flexShrink:0}}>
              {c.nombre.charAt(0)}
            </div>
            <div>
              <div style={{fontSize:"15px",fontWeight:"800",color:"#3d4554",lineHeight:"1.2"}}>{c.nombre}{c.coProp?" + "+c.coProp:""}</div>
              <div style={{fontSize:"10px",color:"#9ca3af"}}>{c.folio} - <span style={{color:MEMBCOLOR[c.membresia]||"#6b7280",fontWeight:"600"}}>{c.membresia}</span> - {c.estadoCivil}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
            <span style={S.bdg(stCfg.color,stCfg.bg,stCfg.br)}>{stCfg.label}</span>
            {!vigOk&&<span style={S.bdg(RED,"#fef2f2","#f5b8b8")}>Vencida</span>}
            {c.saldoPendiente>0&&<span style={S.bdg(AMBER,"rgba(245,158,11,0.1)","rgba(245,158,11,0.3)")}>Saldo</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center",flexWrap:"wrap",marginBottom:"8px"}}>
          <span style={{fontSize:"11px",color:"#9ca3af"}}>Paquete: <strong style={{color:"#3d4554"}}>{fmtUSD(c.precioPaquete)}</strong></span>
          <span style={{color:"#eceff3"}}>|</span>
          <span style={{fontSize:"11px",color:"#9ca3af"}}>Pagado: <strong style={{color:GREEN}}>{fmtUSD(totalPagado)}</strong></span>
          {c.saldoPendiente>0&&<span style={{fontSize:"11px",color:"#9ca3af"}}>Saldo: <strong style={{color:RED}}>{fmtUSD(c.saldoPendiente)}</strong></span>}
          <span style={{color:"#eceff3"}}>|</span>
          <span style={{fontSize:"11px",color:"#9ca3af"}}>Vigencia: <strong style={{color:vigOk?"#3d4554":RED}}>{fmtDate(c.vigencia)}</strong></span>
          <span style={{color:"#eceff3"}}>|</span>
          <span style={{fontSize:"11px",color:"#9ca3af"}}>Reservas activas: <strong style={{color:resActivas.length>0?TEAL:"#9ca3af"}}>{resActivas.length}</strong></span>
        </div>
        <div style={{display:"flex",gap:"5px",flexWrap:"wrap",alignItems:"center"}}>
          {perms.crearReserva
            ? <button style={S.btn("teal")} onClick={function(){props.onNuevaReserva(c);}}>+ Reserva</button>
            : <div style={{position:"relative",display:"inline-flex"}}>
                <button style={Object.assign({},S.btn("ghost"),{opacity:0.5,cursor:"not-allowed"})} disabled>+ Reserva</button>
                <span style={{position:"absolute",top:"-5px",right:"-5px",fontSize:"8px",background:CORAL,color:"#fff",borderRadius:"4px",padding:"1px 4px",fontWeight:"700"}}>Reservas</span>
              </div>
          }
          {perms.crearNota&&<button style={S.btn("ghost")} onClick={function(){props.onNota(c);}}>+ Nota</button>}
          {perms.crearCaso&&<button style={S.btn("indigo")} onClick={function(){props.onCaso(c);}}>+ Caso</button>}
          {perms.crearOperacion&&<button style={S.btn("warn")} onClick={function(){props.onOp(c);}}>+ Op</button>}
          <div style={{width:"1px",height:"16px",background:"#f2f3f6",margin:"0 1px"}}></div>
          {(perms.enviarEmail||perms.enviarWhatsapp)&&(
            <CommPanelTrigger cliente={c} onOpen={props.onComm}/>
          )}
          {perms.iniciarRetencion&&c.statusCliente!=="retencion"&&c.statusCliente!=="chargeback"&&(
            <button style={S.btn("danger")} onClick={function(){props.onRetencion(c);}}>Retencion</button>
          )}
          {c.statusCliente==="retencion"&&c.motivoRetencion&&(
            <span style={{fontSize:"10px",color:RED,padding:"3px 8px",borderRadius:"6px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)"}}>En retencion</span>
          )}
        </div>
      </div>


      <div style={{padding:"10px 24px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",gap:"4px",overflowX:"auto",flexShrink:0,background:"rgba(255,255,255,0.008)"}}>
        {TABS.map(function(t){
          return <button key={t.id} style={S.tab(tab===t.id)} onClick={function(){setTab(t.id);}}>{t.label}</button>;
        })}
      </div>


      <div style={{flex:1,overflowY:"auto",padding:"18px 24px"}}>

        {tab==="reservas"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
              <div style={S.stit}>Reservas del cliente ({resCliente.length})</div>
              {perms.crearReserva&&<button style={S.btn("teal")} onClick={function(){props.onNuevaReserva(c);}}>+ Nueva reserva</button>}
            </div>
            {resCliente.length===0&&<div style={{textAlign:"center",padding:"40px",color:"#9ca3af",fontSize:"13px"}}>Sin reservas registradas</div>}
            {resCliente.sort(function(a,b){return new Date(b.creadoEn||b.checkin)-new Date(a.creadoEn||a.checkin);}).map(function(r){
              var sc = RES_STATUS[r.status]||RES_STATUS.solicitud;
              var pasada = new Date(r.checkin+"T12:00:00") < new Date();
              return (
                <div key={r.id} onClick={function(){props.onVerReserva(r);}} style={{background:"rgba(255,255,255,0.025)",border:"1px solid "+(pasada?"#f6f7f9":sc.br),borderRadius:"12px",padding:"14px 16px",marginBottom:"8px",cursor:"pointer",transition:"border-color 0.15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
                    <div>
                      <div style={{fontSize:"14px",fontWeight:"700",color:"#3d4554"}}>{r.destino}</div>
                      <div style={{fontSize:"12px",color:"#9ca3af",marginTop:"2px"}}>{r.hotel}</div>
                    </div>
                    <div style={{display:"flex",gap:"5px",flexShrink:0}}>
                      <span style={Object.assign({},S.bdg(r.tipo==="qc"?INDIGO:AMBER,r.tipo==="qc"?"#eef2ff":"rgba(245,158,11,0.1)",r.tipo==="qc"?"#aab4f5":"rgba(245,158,11,0.3)"),{fontSize:"10px"})}>{r.tipo.toUpperCase()}</span>
                      <span style={S.bdg(sc.color,sc.bg,sc.br)}>{sc.label}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:"14px",fontSize:"12px",color:"#6b7280",flexWrap:"wrap"}}>
                    <span>Check-in: <strong style={{color:"#3d4554"}}>{fmtDate(r.checkin)}</strong></span>
                    <span>Check-out: <strong style={{color:"#3d4554"}}>{fmtDate(r.checkout)}</strong></span>
                    <span>Noches: <strong style={{color:TEAL}}>{daysBetween(r.checkin,r.checkout)}</strong></span>
                    <span>Personas: <strong style={{color:"#3d4554"}}>{r.personas}</strong></span>
                    {r.totalCobrado>0&&<span>Cargo extra: <strong style={{color:AMBER}}>{fmtUSD(r.totalCobrado)}</strong></span>}
                  </div>
                  {r.confirmacion&&<div style={{marginTop:"6px",fontSize:"11px",color:GREEN}}>Confirmacion: {r.confirmacion}</div>}
                  {r.habitacion&&<div style={{marginTop:"4px",fontSize:"11px",color:"#9ca3af"}}>{r.habitacion} - {r.regimen}</div>}
                  {r.notasInternas&&<div style={{marginTop:"6px",fontSize:"11px",color:AMBER}}>Nota: {r.notasInternas}</div>}
                </div>
              );
            })}
          </div>
        )}

        {tab==="contacto"&&<TabContacto cliente={c} onUpdate={props.onUpdateCliente}/>}

        {tab==="paquete"&&<TabPaquete cliente={c} reservas={resCliente} onUpdate={props.onUpdateCliente} onReservar={props.onNuevaReserva}/>}

        {tab==="historial"&&(
          <div>
            {historial.length===0&&<div style={{textAlign:"center",padding:"40px",color:"#9ca3af"}}>Sin interacciones registradas</div>}
            {historial.map(function(item){
              var ev = EVENTO_LABELS[item.tipo]||item.tipo;
              var cols = {compra:GREEN,pago:GREEN,reserva_creada:TEAL,reserva_confirmada:GREEN,reserva_cancelada:RED,reserva_modificada:AMBER,checkout:GREEN,nota:"#9ca3af",caso:INDIGO,operacion:AMBER,retencion:RED,retencion_ganada:GREEN,email_enviado:VIOLET,whatsapp:GREEN,survey:AMBER};
              var col = cols[item.tipo]||"#9ca3af";
              return <Dot key={item.id} tipo={item.tipo} canal={item.canal} texto={item.texto} fecha={item.fecha} autor={item.autor} col={col}/>;
            })}
          </div>
        )}

        {tab==="financiero"&&(
          perms.verFinanciero ? (
            <div>
              <div style={S.card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                  <span style={{fontSize:"13px",color:"#6b7280"}}>Precio del paquete</span>
                  <span style={{fontSize:"16px",fontWeight:"700",color:"#3d4554"}}>{fmtUSD(c.precioPaquete)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}><span style={{fontSize:"12px",color:GREEN}}>Total pagado</span><span style={{fontSize:"13px",fontWeight:"600",color:GREEN}}>{fmtUSD(totalPagado)}</span></div>
                {c.saldoPendiente>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}><span style={{fontSize:"12px",color:RED}}>Saldo pendiente</span><span style={{fontSize:"13px",fontWeight:"600",color:RED}}>{fmtUSD(c.saldoPendiente)}</span></div>}
                <div style={{height:"5px",background:"#f6f7f9",borderRadius:"3px",overflow:"hidden",marginTop:"8px"}}>
                  <div style={{height:"100%",width:(Math.min(100,Math.round(totalPagado/(c.precioPaquete||1)*100)))+"%",background:c.saldoPendiente>0?AMBER:GREEN,borderRadius:"3px",transition:"width 0.5s"}}></div>
                </div>
              </div>
              <div style={S.stit}>Historial de pagos</div>
              {(c.pagos||[]).map(function(p){
                return <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #edf0f3"}}><div><div style={{fontSize:"12px",color:"#3d4554"}}>{p.concepto}</div><div style={{fontSize:"10px",color:"#9ca3af"}}>{fmtDate(p.fecha)} - {p.metodo} - {p.referencia}</div></div><span style={{fontSize:"13px",fontWeight:"600",color:GREEN}}>{fmtUSD(p.monto)}</span></div>;
              })}
            </div>
          ) : <Lock rol={rol}/>
        )}

        {tab==="casos"&&(
          <div>
            {casosCliente.length===0&&<div style={{textAlign:"center",padding:"40px",color:"#9ca3af"}}>Sin casos registrados</div>}
            {casosCliente.map(function(x){
              var st = CASO_STATUS[x.status]||CASO_STATUS.abierto;
              return (
                <div key={x.id} style={S.card}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}><div style={{fontSize:"13px",fontWeight:"600",color:"#3d4554"}}>{x.titulo}</div><span style={S.bdg(st.color,st.bg,st.br)}>{st.label}</span></div>
                  <div style={{fontSize:"11px",color:"#9ca3af"}}>{x.categoria} - {x.folio} - {fmtDate(x.creado)} - {x.autor}</div>
                  {x.resolucion&&<div style={{fontSize:"12px",color:"#6b7280",marginTop:"6px"}}>{x.resolucion}</div>}
                </div>
              );
            })}
          </div>
        )}

        {tab==="ops"&&(
          <div>
            {opsCliente.length===0&&<div style={{textAlign:"center",padding:"40px",color:"#9ca3af"}}>Sin operaciones</div>}
            {opsCliente.map(function(o){
              var cfg = OP_TIPOS[o.tipo];
              var st = OP_STATUS[o.status];
              return (
                <div key={o.id} style={S.card}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                    <div>{cfg&&<span style={S.bdg(cfg.color,cfg.bg,cfg.br)}>{cfg.label}</span>}&nbsp;<span style={{fontSize:"12px",color:"#9ca3af"}}>{o.folio}</span></div>
                    {st&&<span style={S.bdg(st.color,st.bg,st.br)}>{st.label}</span>}
                  </div>
                  <div style={{fontSize:"11px",color:"#9ca3af"}}>{fmtDate(o.creado)} - {o.autor}</div>
                  {o.notaCS&&<div style={{fontSize:"12px",color:"#6b7280",marginTop:"5px"}}>{o.notaCS}</div>}
                  {o.detalle&&o.tipo==="cancelacion"&&(
                    <div style={{marginTop:"8px",display:"flex",gap:"14px",fontSize:"11px",color:"#9ca3af"}}>
                      <span>Dias: <strong style={{color:"#3d4554"}}>{o.detalle.dias}d</strong></span>
                      <span>Politica: <strong style={{color:AMBER}}>{o.detalle.pct}%</strong></span>
                      <span>Reembolso estimado: <strong style={{color:GREEN}}>{fmtUSD(o.detalle.montoReembolso)}</strong></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}


function ListaClientes(props){
  var [q,setQ] = useState("");
  var [filtro,setFiltro] = useState("todos");
  var MEMB = {Silver:"#6b7280",Gold:"#925c0a",Platinum:"#5b21b6"};
  var filtrados = useMemo(function(){
    var r = props.clientes;
    if(filtro!=="todos") r = r.filter(function(c){return c.statusCliente===filtro;});
    if(q.trim()){ var lq=q.toLowerCase(); r = r.filter(function(c){return c.nombre.toLowerCase().includes(lq)||c.folio.toLowerCase().includes(lq)||(c.email||"").toLowerCase().includes(lq)||(c.tel||"").includes(lq);}); }
    return r;
  },[props.clientes,filtro,q]);
  return (
    <div style={{width:"260px",flexShrink:0,borderRight:"1px solid #e3e6ea",display:"flex",flexDirection:"column",background:"rgba(255,255,255,0.008)"}}>
      <div style={{padding:"12px 12px 8px"}}>
        <div style={{fontSize:"10px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"7px"}}>Clientes</div>
        <input style={Object.assign({},S.inp,{marginBottom:"7px"})} placeholder="Buscar nombre, folio, tel..." value={q} onChange={function(e){setQ(e.target.value);}}/>
        <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
          {[["todos","Todos"],["activo","Activos"],["retencion","Retencion"]].map(function(f){
            return <button key={f[0]} style={Object.assign({},S.tab(filtro===f[0]),{fontSize:"10px",padding:"3px 8px"})} onClick={function(){setFiltro(f[0]);}}>{f[1]}</button>;
          })}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {filtrados.length===0&&<div style={{fontSize:"12px",color:"#9ca3af",textAlign:"center",padding:"20px"}}>Sin resultados</div>}
        {filtrados.map(function(c){
          var stCfg = CLIENT_STATUS[c.statusCliente]||CLIENT_STATUS.activo;
          var sel = props.selected&&props.selected.folio===c.folio;
          return (
            <div key={c.folio} onClick={function(){props.onSelect(c);}} style={{padding:"10px 12px",cursor:"pointer",borderLeft:"2px solid "+(sel?TEAL:"transparent"),background:sel?"rgba(14,165,160,0.06)":"transparent",borderBottom:"1px solid #edf0f3",transition:"all 0.1s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"2px"}}>
                <div style={{fontSize:"13px",fontWeight:"600",color:sel?"#3d4554":"#3d4554",lineHeight:"1.3"}}>{c.nombre}</div>
                <span style={Object.assign({},S.bdg(stCfg.color,stCfg.bg,stCfg.br),{fontSize:"9px",padding:"1px 6px"})}>{stCfg.label}</span>
              </div>
              <div style={{fontSize:"10px",color:"#9ca3af",marginBottom:"2px"}}>{c.folio}</div>
              <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                <span style={{fontSize:"10px",fontWeight:"600",color:MEMB[c.membresia]||"#6b7280"}}>{c.membresia}</span>
                <span style={{fontSize:"10px",color:"#9ca3af"}}>{(c.destinos||[]).map(function(d){return d.nombre;}).join(", ")}</span>
              </div>
              {c.saldoPendiente>0&&<div style={{fontSize:"9px",color:AMBER,marginTop:"2px"}}>Saldo: {fmtUSD(c.saldoPendiente)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}


var OFERTAS_RET = [
  {id:"ext_vigencia", label:"Extension de membresia sin costo",  color:TEAL,   bg:"rgba(14,165,160,0.1)",  br:"rgba(14,165,160,0.3)"},
  {id:"precio_menor", label:"Precio de cierre menor (descuento)", color:GREEN,  bg:"#edf7ee",  br:"#a3d9a5"},
  {id:"gift_card",    label:"Gift Card $100 USD",                 color:AMBER,  bg:"rgba(245,158,11,0.1)",  br:"rgba(245,158,11,0.3)"},
  {id:"otro",         label:"Otro",                               color:"#6b7280",bg:"rgba(148,163,184,0.1)",br:"rgba(148,163,184,0.3)"},
];

var RET_RESULTADO = {
  retuvo:    {label:"Retuvo",     color:GREEN,  bg:"#edf7ee",  br:"#a3d9a5"},
  cancelo:   {label:"Cancelo",    color:RED,    bg:"#fef2f2", br:"#f5b8b8"},
  pendiente: {label:"Pendiente",  color:AMBER,  bg:"rgba(245,158,11,0.1)",  br:"rgba(245,158,11,0.3)"},
  escalo:    {label:"Escalo",     color:INDIGO, bg:"#eef2ff",  br:"#aab4f5"},
};

var SEED_RETENCIONES = [
  {id:"RET-001",clienteFolio:"XT-1003",clienteNombre:"Fernando Reyes",membresia:"Gold",paquete:2900,motivo:"Cliente insatisfecho. Solicita cancelacion por cambio laboral.",origen:"manual",agente:"Ana M. (CS)",creadoEn:daysAgo(3),resultado:null,intentos:[
    {id:"A1",fecha:daysAgo(3),nota:"Primer contacto. Cliente muy molesto. Solicita tiempo para pensarlo.",oferta:null,ofertaId:null,autor:"Ana M. (CS)"},
    {id:"A2",fecha:daysAgo(1),nota:"Segundo contacto. Ofrecimos extension de vigencia 6 meses sin costo. Cliente dice que consultara con esposa.",oferta:"Extension de membresia sin costo",ofertaId:"ext_vigencia",autor:"Ana M. (CS)"},
  ]},
  {id:"RET-002",clienteFolio:"XT-1005",clienteNombre:"Hector Jimenez",membresia:"Silver",paquete:1600,motivo:"Llamada entrante: cliente quiere cancelar por falta de tiempo para viajar.",origen:"automatico",agente:"Jorge P. (CS)",creadoEn:daysAgo(1),resultado:null,intentos:[
    {id:"B1",fecha:daysAgo(1),nota:"Cliente llamo directo. Se nego a escuchar ofertas. Se agendo llamada de seguimiento.",oferta:null,ofertaId:null,autor:"Jorge P. (CS)"},
  ]},
];

function ModalCerrarRetencion(props){
  var sel = props.sel;
  var clientes = props.clientes||[];
  var cli = sel ? clientes.find(function(c){return c.folio===sel.clienteFolio;})||null : null;
  var paquete = sel ? (sel.paquete||0) : 0;
  var comisionPct = cli ? (cli.comisionPct||10) : 10;
  var vendedor = cli ? (cli.vendedor||"--") : "--";
  var [paso,setPaso] = useState("resultado");
  var [montoStr,setMontoStr] = useState(String(paquete));

  var monto = parseFloat(montoStr)||0;
  var descomision = Math.round(monto*(comisionPct/100)*100)/100;

  function handleResultado(rk){
    if(rk==="cancelo"){
      setPaso("reembolso");
    } else {
      props.onConfirmar(rk,null);
    }
  }

  function handleConfirmarCancelacion(){
    var data = {
      monto:monto,
      comisionPct:comisionPct,
      descomision:descomision,
      vendedor:vendedor,
      aprobadoPor:"CS - "+new Date().toLocaleString("es-MX",{dateStyle:"short",timeStyle:"short"}),
      fecha:new Date().toISOString(),
    };
    props.onConfirmar("cancelo",data);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,20,30,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
      <div style={{background:"#0f1628",border:"1px solid #d8dbe0",borderRadius:"16px",padding:"28px",width:"440px",boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}>

        {paso==="resultado"&&(
          <div>
            <div style={{fontSize:"15px",fontWeight:"800",color:"#3d4554",marginBottom:"4px"}}>Cerrar caso de retencion</div>
            <div style={{fontSize:"11px",color:"#9ca3af",marginBottom:"20px"}}>{sel&&sel.clienteNombre} - {sel&&sel.id}</div>
            <div style={{fontSize:"10px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"10px"}}>Selecciona el resultado</div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"20px"}}>
              {Object.entries(RET_RESULTADO).map(function(e){
                var rk=e[0]; var rv=e[1];
                return (
                  <button key={rk} onClick={function(){handleResultado(rk);}} style={{padding:"12px 16px",borderRadius:"10px",cursor:"pointer",textAlign:"left",background:rv.bg,color:rv.color,border:"1px solid "+rv.br,fontSize:"13px",fontWeight:"700"}}>
                    {rv.label}
                    {rk==="cancelo"&&<span style={{fontSize:"10px",fontWeight:"400",opacity:0.7,marginLeft:"8px"}}>(requiere reembolso)</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={props.onClose} style={S.btn("ghost")}>Cancelar</button>
          </div>
        )}

        {paso==="reembolso"&&(
          <div>
            <div style={{fontSize:"15px",fontWeight:"800",color:RED,marginBottom:"4px"}}>Cancelacion de paquete</div>
            <div style={{fontSize:"11px",color:"#9ca3af",marginBottom:"18px"}}>{sel&&sel.clienteNombre} - {sel&&sel.id}</div>

            <div style={{padding:"12px 14px",borderRadius:"10px",background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.2)",marginBottom:"16px"}}>
              <div style={{fontSize:"10px",fontWeight:"700",color:RED,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"8px"}}>Lo que ocurrira al confirmar</div>
              <div style={{fontSize:"11px",color:"#6b7280",lineHeight:"1.8"}}>
                <div>Paquete <strong style={{color:"#3d4554"}}>{sel&&sel.clienteFolio}</strong> marcado como cancelado</div>
                <div>Reservas activas del cliente canceladas automaticamente</div>
                <div>Reembolso registrado por el monto ingresado</div>
                <div>Comision del vendedor descontada proporcionalmente</div>
              </div>
            </div>

            <div style={{marginBottom:"14px"}}>
              <label style={S.label}>Monto a reembolsar (USD)</label>
              <input
                style={Object.assign({},S.inp,{fontSize:"18px",fontWeight:"700",color:GREEN})}
                type="number"
                min="0"
                max={paquete}
                step="0.01"
                value={montoStr}
                onChange={function(e){setMontoStr(e.target.value);}}
                placeholder="0.00"
              />
              <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"4px"}}>Precio del paquete: <strong style={{color:"#3d4554"}}>{fmtUSD(paquete)}</strong></div>
            </div>

            <div style={{padding:"12px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.025)",border:"1px solid #e3e6ea",marginBottom:"18px"}}>
              <div style={{fontSize:"10px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"10px"}}>Calculo de comision a descontar</div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                <span style={{fontSize:"12px",color:"#9ca3af"}}>Vendedor</span>
                <span style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>{vendedor}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                <span style={{fontSize:"12px",color:"#9ca3af"}}>% Comision</span>
                <span style={{fontSize:"12px",fontWeight:"600",color:AMBER}}>{comisionPct}%</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                <span style={{fontSize:"12px",color:"#9ca3af"}}>Monto reembolsado</span>
                <span style={{fontSize:"12px",fontWeight:"600",color:GREEN}}>{fmtUSD(monto)}</span>
              </div>
              <div style={{height:"1px",background:"#f4f5f7",margin:"8px 0"}}></div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>Descuento comision</span>
                <span style={{fontSize:"15px",fontWeight:"800",color:RED}}>{fmtUSD(descomision)}</span>
              </div>
              <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"4px",textAlign:"right"}}>{comisionPct}% x {fmtUSD(monto)} = {fmtUSD(descomision)}</div>
            </div>

            <div style={{display:"flex",gap:"8px",justifyContent:"space-between"}}>
              <button onClick={function(){setPaso("resultado");}} style={S.btn("ghost")}>Atras</button>
              <div style={{display:"flex",gap:"8px"}}>
                <button onClick={props.onClose} style={S.btn("ghost")}>Cancelar</button>
                <button
                  onClick={handleConfirmarCancelacion}
                  disabled={monto<=0}
                  style={Object.assign({},S.btn("danger"),{opacity:monto<=0?0.5:1,cursor:monto<=0?"not-allowed":"pointer"})}
                >
                  Confirmar cancelacion
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function QueueRetencion(props){
  var currentUser = props.currentUser||{nombre:"Agente CS"};
  var [retenciones,setRetenciones] = useState(props.retencionesSeed||[]);
  var [selId,setSelId] = useState(retenciones.length>0?retenciones[0].id:null);
  var [nota,setNota] = useState("");
  var [oferta,setOferta] = useState("");
  var [ofertaOtro,setOfertaOtro] = useState("");
  var [modalRet,setModalRet] = useState(null);
  var [filtro,setFiltro] = useState("activos");

  var sel = selId?retenciones.find(function(r){return r.id===selId;}):null;

  var lista = retenciones.filter(function(r){
    if(filtro==="activos") return !r.resultado;
    if(filtro==="cerrados") return !!r.resultado;
    return true;
  }).sort(function(a,b){return new Date(b.creadoEn)-new Date(a.creadoEn);});

  function addNota(){
    var txt = nota.trim();
    if(!txt||!selId) return;
    var ofertaLabel = oferta ? (oferta==="otro" ? (ofertaOtro.trim()||"Otro") : (OFERTAS_RET.find(function(o){return o.id===oferta;})||{label:oferta}).label) : null;
    setNota("");
    setOferta("");
    setOfertaOtro("");
    setRetenciones(function(prev){return prev.map(function(r){
      if(r.id!==selId) return r;
      var nuevo = {id:"A"+Date.now(),fecha:new Date().toISOString(),nota:txt,oferta:ofertaLabel,ofertaId:oferta||null,autor:currentUser.nombre};
      return Object.assign({},r,{intentos:(r.intentos||[]).concat([nuevo])});
    });});
  }

  function cerrarCaso(resultado,reembolsoData){
    setRetenciones(function(prev){return prev.map(function(r){
      if(r.id!==selId) return r;
      var extra = reembolsoData ? {reembolso:reembolsoData} : {};
      return Object.assign({},r,extra,{resultado:resultado,cerradoEn:new Date().toISOString(),cerradoPor:currentUser.nombre});
    });});
    setModalRet(null);
    if(props.onCerrarRetencion) props.onCerrarRetencion(selId,resultado,reembolsoData);
  }

  function agregarManual(datos){
    var nuevo = {
      id:"RET-"+Date.now().toString(36).toUpperCase(),
      clienteFolio:datos.folio,clienteNombre:datos.nombre,membresia:datos.membresia||"Gold",
      paquete:datos.paquete||0,motivo:datos.motivo,origen:"manual",
      agente:currentUser.nombre,creadoEn:new Date().toISOString(),resultado:null,intentos:[],
    };
    setRetenciones(function(prev){return [nuevo,...prev];});
    setSelId(nuevo.id);
    setModalRet(null);
  }

  var activos = retenciones.filter(function(r){return !r.resultado;}).length;
  var retuvoCount = retenciones.filter(function(r){return r.resultado==="retuvo";}).length;
  var canceloCount = retenciones.filter(function(r){return r.resultado==="cancelo";}).length;

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

      <div style={{padding:"10px 20px",borderBottom:"1px solid #e8eaed",background:"#fff8f8",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:"16px",flexWrap:"wrap"}}>
          <div style={{fontSize:"13px",fontWeight:"700",color:RED}}>Queue de Retencion</div>
          <div style={{display:"flex",gap:"10px"}}>
            <div style={{fontSize:"11px",color:"#9ca3af"}}>En proceso: <strong style={{color:AMBER}}>{activos}</strong></div>
            <div style={{fontSize:"11px",color:"#9ca3af"}}>Retuvo: <strong style={{color:GREEN}}>{retuvoCount}</strong></div>
            <div style={{fontSize:"11px",color:"#9ca3af"}}>Cancelo: <strong style={{color:RED}}>{canceloCount}</strong></div>
          </div>
          <div style={{flex:1}}/>
          <div style={{display:"flex",gap:"4px"}}>
            {[["activos","Activos"],["cerrados","Cerrados"],["todos","Todos"]].map(function(f){
              return (
                <button key={f[0]} onClick={function(){setFiltro(f[0]);}} style={{padding:"4px 10px",borderRadius:"7px",fontSize:"11px",fontWeight:filtro===f[0]?"700":"400",cursor:"pointer",background:filtro===f[0]?"#fdeaea":"#f8f9fb",color:filtro===f[0]?RED:"#9ca3af",border:filtro===f[0]?"1px solid rgba(248,113,113,0.3)":"1px solid rgba(255,255,255,0.07)"}}>
                  {f[1]}
                </button>
              );
            })}
          </div>
          <button onClick={function(){setModalRet({tipo:"nuevo"});}} style={{padding:"5px 12px",borderRadius:"8px",fontSize:"11px",fontWeight:"700",cursor:"pointer",background:"#fdeaea",color:RED,border:"1px solid rgba(248,113,113,0.3)"}}>
            + Agregar caso
          </button>
        </div>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        <div style={{width:"270px",flexShrink:0,borderRight:"1px solid #e3e6ea",overflowY:"auto",background:"rgba(255,255,255,0.008)"}}>
          {lista.length===0&&(
            <div style={{padding:"32px 16px",textAlign:"center",color:"#9ca3af",fontSize:"12px"}}>Sin casos en este filtro</div>
          )}
          {lista.map(function(r){
            var rCfg = r.resultado?RET_RESULTADO[r.resultado]:null;
            var active = selId===r.id;
            return (
              <div key={r.id} onClick={function(){setSelId(r.id);}} style={{padding:"12px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",cursor:"pointer",background:active?"rgba(248,113,113,0.07)":"transparent",borderLeft:active?"3px solid "+RED:"3px solid transparent",transition:"background 0.1s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"4px"}}>
                  <div style={{fontSize:"12px",fontWeight:"700",color:"#3d4554"}}>{r.clienteNombre}</div>
                  {rCfg
                    ? <span style={{fontSize:"9px",fontWeight:"700",padding:"2px 6px",borderRadius:"5px",background:rCfg.bg,color:rCfg.color,border:"1px solid "+rCfg.br,flexShrink:0}}>{rCfg.label}</span>
                    : <span style={{fontSize:"9px",fontWeight:"700",padding:"2px 6px",borderRadius:"5px",background:"rgba(245,158,11,0.1)",color:AMBER,border:"1px solid rgba(245,158,11,0.3)",flexShrink:0}}>Activo</span>
                  }
                </div>
                <div style={{fontSize:"10px",color:"#9ca3af",marginBottom:"4px"}}>{r.id} - {r.membresia} - {fmtDate(r.creadoEn)}</div>
                <div style={{fontSize:"10px",color:"#6b7280",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.motivo}</div>
                <div style={{display:"flex",gap:"6px",marginTop:"5px",alignItems:"center"}}>
                  <span style={{fontSize:"9px",color:"#9ca3af"}}>{r.origen==="manual"?"Manual":"Automatico"}</span>
                  <span style={{color:"#f0f1f4"}}>|</span>
                  <span style={{fontSize:"9px",color:"#9ca3af"}}>{r.intentos.length} nota{r.intentos.length!==1?"s":""}</span>
                </div>
              </div>
            );
          })}
        </div>

        {sel ? (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

            <div style={{padding:"14px 20px",borderBottom:"1px solid #e8eaed",background:"rgba(255,255,255,0.012)",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
                <div>
                  <div style={{fontSize:"15px",fontWeight:"800",color:"#3d4554",marginBottom:"2px"}}>{sel.clienteNombre}</div>
                  <div style={{fontSize:"11px",color:"#9ca3af"}}>{sel.id} - {sel.clienteFolio} - {sel.membresia} - Paquete: <strong style={{color:"#3d4554"}}>{fmtUSD(sel.paquete)}</strong></div>
                </div>
                <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                  {sel.resultado
                    ? <span style={S.bdg(RET_RESULTADO[sel.resultado].color,RET_RESULTADO[sel.resultado].bg,RET_RESULTADO[sel.resultado].br)}>{RET_RESULTADO[sel.resultado].label}</span>
                    : (
                      <button onClick={function(){setModalRet({tipo:"cerrar"});}} style={{padding:"5px 12px",borderRadius:"8px",fontSize:"11px",fontWeight:"700",cursor:"pointer",background:"#e5eafd",color:INDIGO,border:"1px solid rgba(99,102,241,0.3)"}}>
                        Cerrar caso
                      </button>
                    )
                  }
                </div>
              </div>
              <div style={{padding:"10px 12px",borderRadius:"9px",background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.2)"}}>
                <div style={{fontSize:"10px",fontWeight:"700",color:RED,marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Motivo</div>
                <div style={{fontSize:"12px",color:"#3d4554"}}>{sel.motivo}</div>
              </div>
              <div style={{display:"flex",gap:"14px",marginTop:"8px",fontSize:"11px",color:"#9ca3af"}}>
                <span>Origen: <strong style={{color:"#6b7280"}}>{sel.origen==="manual"?"Manual":"Automatico"}</strong></span>
                <span>Agente: <strong style={{color:"#6b7280"}}>{sel.agente}</strong></span>
                <span>Creado: <strong style={{color:"#6b7280"}}>{fmtDate(sel.creadoEn)}</strong></span>
                {sel.cerradoEn&&<span>Cerrado: <strong style={{color:"#6b7280"}}>{fmtDate(sel.cerradoEn)}</strong></span>}
              </div>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
              {sel.resultado==="cancelo"&&sel.reembolso&&(
                <div style={{marginBottom:"16px",padding:"14px 16px",borderRadius:"12px",background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.25)"}}>
                  <div style={{fontSize:"10px",fontWeight:"700",color:RED,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"10px"}}>Reembolso registrado</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"8px"}}>
                    <div>
                      <div style={S.label}>Monto reembolsado</div>
                      <div style={{fontSize:"16px",fontWeight:"800",color:GREEN}}>{fmtUSD(sel.reembolso.monto)}</div>
                    </div>
                    <div>
                      <div style={S.label}>Descuento comision ({sel.reembolso.comisionPct}%)</div>
                      <div style={{fontSize:"16px",fontWeight:"800",color:RED}}>{fmtUSD(sel.reembolso.descomision)}</div>
                    </div>
                    <div>
                      <div style={S.label}>Vendedor afectado</div>
                      <div style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>{sel.reembolso.vendedor}</div>
                    </div>
                    <div>
                      <div style={S.label}>Aprobado por</div>
                      <div style={{fontSize:"12px",color:"#6b7280"}}>{sel.reembolso.aprobadoPor}</div>
                    </div>
                  </div>
                  <div style={{fontSize:"10px",color:"#9ca3af",borderTop:"1px solid rgba(248,113,113,0.2)",paddingTop:"8px",marginTop:"4px"}}>
                    Formula: {sel.reembolso.comisionPct}% comision x {fmtUSD(sel.reembolso.monto)} reembolsado = {fmtUSD(sel.reembolso.descomision)} descontado
                  </div>
                </div>
              )}
              <div style={{fontSize:"11px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"12px"}}>
                Historial de intentos ({sel.intentos.length})
              </div>
              {sel.intentos.length===0&&(
                <div style={{textAlign:"center",padding:"32px",color:"#9ca3af",fontSize:"12px"}}>Sin notas todavia. Agrega el primer intento.</div>
              )}
              {[...sel.intentos].reverse().map(function(it){
                var ofCfg = it.ofertaId ? OFERTAS_RET.find(function(o){return o.id===it.ofertaId;}) : null;
                return (
                  <div key={it.id} style={{marginBottom:"10px",padding:"12px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.025)",border:"1px solid #e3e6ea"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px",alignItems:"flex-start",gap:"8px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                        <span style={{fontSize:"11px",fontWeight:"600",color:VIOLET}}>{it.autor}</span>
                        {it.oferta&&(
                          <span style={{fontSize:"9px",fontWeight:"700",padding:"2px 7px",borderRadius:"5px",background:ofCfg?ofCfg.bg:"rgba(148,163,184,0.1)",color:ofCfg?ofCfg.color:"#6b7280",border:"1px solid "+(ofCfg?ofCfg.br:"rgba(148,163,184,0.3)")}}>
                            {it.oferta}
                          </span>
                        )}
                      </div>
                      <span style={{fontSize:"10px",color:"#9ca3af",flexShrink:0}}>{fmtDate(it.fecha)}</span>
                    </div>
                    <div style={{fontSize:"12px",color:"#3d4554",lineHeight:"1.5"}}>{it.nota}</div>
                  </div>
                );
              })}
            </div>

            {!sel.resultado&&(
              <div style={{padding:"12px 20px",borderTop:"1px solid #e3e6ea",background:"rgba(255,255,255,0.008)",flexShrink:0}}>
                <div style={{fontSize:"10px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"8px"}}>Registrar intento</div>
                <div style={{marginBottom:"8px"}}>
                  <div style={{fontSize:"10px",color:"#9ca3af",marginBottom:"5px"}}>Oferta realizada al cliente (opcional)</div>
                  <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                    {OFERTAS_RET.map(function(o){
                      var active = oferta===o.id;
                      return (
                        <button key={o.id} onClick={function(){setOferta(active?"":o.id);}} style={{padding:"4px 10px",borderRadius:"7px",fontSize:"10px",fontWeight:active?"700":"500",cursor:"pointer",background:active?o.bg:"#f8f9fb",color:active?o.color:"#9ca3af",border:active?"1px solid "+o.br:"1px solid rgba(255,255,255,0.07)",transition:"all 0.12s"}}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  {oferta==="otro"&&(
                    <input style={Object.assign({},S.inp,{marginTop:"6px",fontSize:"11px"})} placeholder="Especifica la oferta..." value={ofertaOtro} onChange={function(e){setOfertaOtro(e.target.value);}}/>
                  )}
                </div>
                <div style={{display:"flex",gap:"8px"}}>
                  <textarea
                    value={nota}
                    onChange={function(e){setNota(e.target.value);}}
                    onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addNota();}}}
                    placeholder="Describe el resultado del contacto con el cliente..."
                    style={Object.assign({},S.ta,{flex:1,minHeight:"52px",resize:"none"})}
                  />
                  <button onClick={addNota} disabled={!nota.trim()} style={{padding:"0 14px",borderRadius:"9px",fontSize:"11px",fontWeight:"700",cursor:nota.trim()?"pointer":"not-allowed",background:nota.trim()?"#fdeaea":"#f8f9fb",color:nota.trim()?RED:"#9ca3af",border:nota.trim()?"1px solid rgba(248,113,113,0.3)":"1px solid rgba(255,255,255,0.07)",alignSelf:"stretch",flexShrink:0}}>
                    Guardar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af",fontSize:"13px"}}>
            Selecciona un caso del queue
          </div>
        )}
      </div>

      {modalRet&&modalRet.tipo==="cerrar"&&(
        <ModalCerrarRetencion
          sel={sel}
          clientes={props.clientes||[]}
          onClose={function(){setModalRet(null);}}
          onConfirmar={cerrarCaso}
        />
      )}

      {modalRet&&modalRet.tipo==="nuevo"&&(
        <NuevoCasoRetModal onClose={function(){setModalRet(null);}} onSave={agregarManual} clientes={props.clientes||[]}/>
      )}
    </div>
  );
}

function NuevoCasoRetModal(props){
  var clientes = props.clientes||[];
  var [folioSel,setFolioSel] = useState(clientes.length>0?clientes[0].folio:"");
  var [motivo,setMotivo] = useState("");
  var cli = clientes.find(function(c){return c.folio===folioSel;})||null;

  function handleSave(){
    if(!cli||!motivo.trim()) return;
    props.onSave({folio:cli.folio,nombre:cli.nombre,membresia:cli.membresia,paquete:cli.precioPaquete,motivo:motivo.trim()});
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
      <div style={{background:"#0f1628",border:"1px solid #d8dbe0",borderRadius:"16px",padding:"28px",width:"420px",boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}>
        <div style={{fontSize:"15px",fontWeight:"800",color:"#3d4554",marginBottom:"18px"}}>Agregar caso al queue</div>
        <div style={{marginBottom:"12px"}}>
          <div style={S.label}>Cliente</div>
          <select style={S.inp} value={folioSel} onChange={function(e){setFolioSel(e.target.value);}}>
            {clientes.map(function(c){return <option key={c.folio} value={c.folio}>{c.nombre} - {c.folio}</option>;})}
          </select>
        </div>
        {cli&&(
          <div style={{padding:"8px 12px",borderRadius:"8px",background:"#f9fafb",border:"1px solid #e3e6ea",marginBottom:"12px",fontSize:"11px",color:"#9ca3af"}}>
            {cli.membresia} - Paquete: <strong style={{color:"#3d4554"}}>{fmtUSD(cli.precioPaquete)}</strong> - Status: <strong style={{color:"#6b7280"}}>{cli.statusCliente}</strong>
          </div>
        )}
        <div style={{marginBottom:"18px"}}>
          <div style={S.label}>Motivo de retencion</div>
          <textarea style={Object.assign({},S.ta,{minHeight:"72px"})} value={motivo} onChange={function(e){setMotivo(e.target.value);}} placeholder="Describe el motivo por el que el cliente quiere cancelar..."/>
        </div>
        <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
          <button style={S.btn("ghost")} onClick={props.onClose}>Cancelar</button>
          <button style={S.btn("danger")} disabled={!motivo.trim()||!cli} onClick={handleSave}>Agregar al queue</button>
        </div>
      </div>
    </div>
  );
}

export default function CsReservasUnificado(){
  var currentUser = {nombre:"Jorge P.",rol:"agente"};
  var [rolActual,setRolActual] = useState("cs");
  var [clientes,setClientes] = useState(SEED_CLIENTS);
  var [reservas,setReservas] = useState(SEED_RESERVAS);
  var [interacciones,setInteracciones] = useState(SEED_INTERACCIONES);
  var [casos,setCasos] = useState(SEED_CASOS);
  var [operaciones,setOperaciones] = useState(SEED_OPERACIONES);
  var [selected,setSelected] = useState(SEED_CLIENTS[0]);
  var [modal,setModal] = useState(null);
  var [vistaChat,setVistaChat] = useState(false);
  var [vistaRetencion,setVistaRetencion] = useState(false);

  var perms = (ROLES[rolActual]||ROLES.cs).permisos;
  var rolCfg = ROLES[rolActual]||ROLES.cs;
  var comm = useCommPanel();

  function closeModal(){ setModal(null); }
  function addEvento(clienteFolio,tipo,canal,texto,autor){
    setInteracciones(function(prev){return [{id:uid(),clienteFolio:clienteFolio,tipo:tipo,canal:canal,texto:texto,autor:autor,fecha:new Date().toISOString()},...prev];});
  }

  function handleNuevaReserva(c,d){ if(perms.crearReserva) setModal({tipo:"nueva_res",cliente:c,destino:d||null}); }
  function handleVerReserva(r){ setModal({tipo:"ver_res",reserva:r}); }
  function handleEditarReserva(r){ if(perms.modificarReserva) setModal({tipo:"editar_res",reserva:r}); }
  function handleNota(c){ setModal({tipo:"nota",cliente:c}); }
  function handleCaso(c){ setModal({tipo:"caso",cliente:c}); }
  function handleOp(c){ setModal({tipo:"op",cliente:c}); }
  function handleEmail(c){ addEvento(c.folio,"email_enviado","email","Correo enviado al cliente.","Sistema"); }
  function handleWhatsapp(c){ addEvento(c.folio,"whatsapp","whatsapp","Mensaje WhatsApp enviado al cliente.","Sistema"); }
  function handleRetencion(c){
    setInteracciones(function(prev){return [{id:uid(),clienteFolio:c.folio,tipo:"retencion",canal:"sistema",texto:"Proceso de retencion iniciado.",autor:rolCfg.label,fecha:new Date().toISOString()},...prev];});
  }

  function handleCerrarRetencion(retId,resultado,reembolsoData){
    if(resultado==="cancelo"&&reembolsoData){
      var retItem = null;
      setClientes(function(prev){
        retItem = prev.find(function(c){return c.folio===(retItem?retItem.clienteFolio:null);})||null;
        return prev.map(function(c){
          var esCliente = false;
          var ret = SEED_RETENCIONES.find(function(r){return r.id===retId;});
          if(ret&&c.folio===ret.clienteFolio) esCliente=true;
          if(!esCliente) return c;
          return Object.assign({},c,{statusCliente:"cancelado"});
        });
      });
      setReservas(function(prev){return prev.map(function(r){
        var ret2 = SEED_RETENCIONES.find(function(x){return x.id===retId;});
        var folio = ret2?ret2.clienteFolio:null;
        if(r.clienteFolio!==folio) return r;
        if(r.status==="cancelada"||r.status==="completada") return r;
        return Object.assign({},r,{status:"cancelada",historial:[...(r.historial||[]),{fecha:TODAY,texto:"Cancelada por cancelacion de paquete via retencion.",autor:rolCfg.label}]});
      });});
      addEvento(null,"nota","sistema","Paquete cancelado. Reembolso: "+fmtUSD(reembolsoData.monto)+". Descuento comision "+reembolsoData.vendedor+": "+fmtUSD(reembolsoData.descomision)+".",rolCfg.label);
    }
  }

  function saveReserva(clienteFolio,datos,esEdit,resId){
    var folio = esEdit?resId:("RES-"+uid().toUpperCase().slice(0,6));
    var obj = Object.assign({},datos,{id:folio,folio:folio,clienteFolio:clienteFolio,status:"solicitud",confirmacion:"",agente:datos.agente||"Jorge P. (Reservas)",creadoEn:TODAY,historial:[{fecha:TODAY,texto:esEdit?"Reserva modificada":"Reserva creada - solicitud enviada",autor:datos.agente||"Jorge P. (Reservas)"}]});
    if(esEdit){ setReservas(function(p){return p.map(function(r){return r.id===resId?obj:r;});}); }
    else { setReservas(function(p){return [obj,...p];}); }
    addEvento(clienteFolio,esEdit?"reserva_modificada":"reserva_creada","sistema",(esEdit?"Reserva "+resId+" modificada":"Reserva "+folio+" creada")+": "+datos.destino+" - "+datos.hotel+" | Check-in "+fmtDate(datos.checkin)+" ("+datos.totalNoches+"n)",datos.agente||"Sistema");
  }

  function confirmarReserva(resId,numConf){
    setReservas(function(p){return p.map(function(r){
      if(r.id!==resId) return r;
      return Object.assign({},r,{status:"confirmada",confirmacion:numConf,historial:[...(r.historial||[]),{fecha:TODAY,texto:"Confirmada. No. "+numConf,autor:rolCfg.label}]});
    });});
    var res = reservas.find(function(r){return r.id===resId;});
    if(res) addEvento(res.clienteFolio,"reserva_confirmada","sistema","Reserva "+resId+" confirmada. No. "+numConf,rolCfg.label);
  }

  function cancelarReserva(resId){
    setReservas(function(p){return p.map(function(r){
      if(r.id!==resId) return r;
      return Object.assign({},r,{status:"cancelada",historial:[...(r.historial||[]),{fecha:TODAY,texto:"Reserva cancelada.",autor:rolCfg.label}]});
    });});
    var res = reservas.find(function(r){return r.id===resId;});
    if(res) addEvento(res.clienteFolio,"reserva_cancelada","sistema","Reserva "+resId+" cancelada.",rolCfg.label);
  }

  function saveNota(txt,canal,autor){ addEvento(selected.folio,"nota",canal,txt,autor); }
  function saveCaso(datos){
    var folio = "CASO-"+uid().slice(0,5).toUpperCase();
    setCasos(function(p){return [{id:uid(),clienteFolio:selected.folio,folio:folio,titulo:datos.titulo,categoria:datos.categoria,status:"abierto",canal:datos.canal,autor:datos.autor,creado:new Date().toISOString(),resolucion:""},...p];});
    addEvento(selected.folio,"caso",datos.canal,folio+": "+datos.titulo+" ("+datos.categoria+")",datos.autor);
  }
  function saveOp(datos){
    var folio = "OP-"+uid().slice(0,5).toUpperCase();
    setOperaciones(function(p){return [{id:uid(),clienteFolio:selected.folio,tipo:datos.tipo,folio:folio,status:"pendiente",autor:datos.autor,creado:new Date().toISOString(),notaCS:datos.notaCS,detalle:datos.detalle},...p];});
    addEvento(selected.folio,"operacion","sistema",folio+" - "+OP_TIPOS[datos.tipo].label+" - Pendiente aprobacion. "+datos.notaCS,datos.autor);
  }

  function handleUpdateCliente(folio,cambios){
    setClientes(function(prev){return prev.map(function(c){
      if(c.folio!==folio) return c;
      var updated = Object.assign({},c,cambios);
      return updated;
    });});
    if(selected&&selected.folio===folio){
      setSelected(function(prev){return Object.assign({},prev,cambios);});
    }
    addEvento(folio,"nota","sistema","Datos del cliente actualizados: "+Object.keys(cambios).join(", ")+".",rolCfg.label);
  }

  var fichaProps = {
    currentUser:currentUser,
    perms:perms,rol:rolActual,reservas:reservas,interacciones:interacciones,casos:casos,ops:operaciones,
    onUpdateCliente:handleUpdateCliente,
    onNuevaReserva:handleNuevaReserva,onVerReserva:handleVerReserva,
    onNota:handleNota,onCaso:handleCaso,onOp:handleOp,
    onEmail:handleEmail,onWhatsapp:handleWhatsapp,onRetencion:handleRetencion,
    onComm:comm.open,
    commLogs:comm.logs,
  };

  return (
    <div style={S.wrap}>
      <div style={{height:"100vh",display:"flex",flexDirection:"column"}}>


        <div style={{padding:"10px 20px",borderBottom:"1px solid #e8eaed",display:"flex",alignItems:"center",gap:"12px",background:"rgba(255,255,255,0.012)",flexShrink:0}}>
          <div style={{width:"30px",height:"30px",borderRadius:"9px",background:"linear-gradient(135deg,"+TEAL+","+INDIGO+")",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"900",color:"#fff",fontSize:"14px",flexShrink:0}}>X</div>
          <div>
            <div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>CS + Reservas</div>
            <div style={{fontSize:"10px",color:"#9ca3af"}}>Mini-Vac Vacation Club</div>
          </div>
          <div style={{flex:1}}/>

          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{fontSize:"11px",color:"#9ca3af"}}>Simulando rol:</span>
            {Object.entries(ROLES).map(function(e){
              var rk=e[0]; var rv=e[1];
              var active = rolActual===rk;
              return (
                <button key={rk} onClick={function(){setRolActual(rk);}} style={{padding:"5px 12px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:active?"700":"400",background:active?(rv.color+"22"):"transparent",color:active?rv.color:"#9ca3af",border:active?("1px solid "+rv.color+"44"):"1px solid transparent",transition:"all 0.15s"}}>
                  {rv.label}
                </button>
              );
            })}
            <div style={{padding:"5px 12px",borderRadius:"7px",background:rolCfg.color+"15",border:"1px solid "+rolCfg.color+"44",fontSize:"11px",fontWeight:"700",color:rolCfg.color}}>
              {rolCfg.label}
            </div>
          </div>
          <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
            <button onClick={function(){setVistaRetencion(false);setVistaChat(!vistaChat);}} style={{padding:"5px 11px",borderRadius:"8px",cursor:"pointer",fontSize:"11px",fontWeight:"600",background:vistaChat?"rgba(14,165,160,0.15)":"#f6f7f9",color:vistaChat?"#0ea5a0":"#6b7280",border:vistaChat?"1px solid rgba(14,165,160,0.3)":"1px solid rgba(255,255,255,0.08)"}}>
              Chat Portal
            </button>
            <button onClick={function(){setVistaChat(false);setVistaRetencion(!vistaRetencion);}} style={{padding:"5px 11px",borderRadius:"8px",cursor:"pointer",fontSize:"11px",fontWeight:"600",background:vistaRetencion?"#fdeaea":"#f6f7f9",color:vistaRetencion?RED:"#6b7280",border:vistaRetencion?"1px solid rgba(248,113,113,0.3)":"1px solid rgba(255,255,255,0.08)"}}>
              Retencion
            </button>
            <div style={{fontSize:"10px",color:"#9ca3af"}}>{fmtDate(TODAY)}</div>
          </div>
        </div>


        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {vistaChat
            ? <PanelChats currentUser={currentUser}/>
            : vistaRetencion
            ? <QueueRetencion currentUser={currentUser} retencionesSeed={SEED_RETENCIONES} clientes={clientes} onCerrarRetencion={handleCerrarRetencion}/>
            : (
              <div style={{flex:1,display:"flex",overflow:"hidden"}}>
                <ListaClientes clientes={clientes} selected={selected} onSelect={setSelected}/>
                {selected
                  ? <FichaCliente key={selected.folio} cliente={selected} {...fichaProps}/>
                  : <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#9ca3af"}}>Selecciona un cliente</div>
                }
              </div>
            )
          }
        </div>
      </div>

      {modal&&modal.tipo==="nueva_res"&&<ReservaFormModal cliente={modal.cliente} destino={modal.destino||null} currentUser={props.currentUser} reserva={null} onClose={closeModal} onSave={function(d){saveReserva(modal.cliente.folio,d,false,null);}}/>}
      {modal&&modal.tipo==="editar_res"&&<ReservaFormModal cliente={selected} reserva={modal.reserva} onClose={closeModal} onSave={function(d){saveReserva(selected.folio,d,true,modal.reserva.id);}}/>}
      {modal&&modal.tipo==="ver_res"&&<ReservaDetailModal reserva={modal.reserva} perms={perms} onClose={closeModal} onConfirmar={confirmarReserva} onEditar={function(r){setModal({tipo:"editar_res",reserva:r});}} onCancelar={cancelarReserva}/>}
      {modal&&modal.tipo==="nota"&&<NotaModal cliente={modal.cliente} onClose={closeModal} onSave={saveNota}/>}
      {modal&&modal.tipo==="caso"&&<CasoModal cliente={modal.cliente} onClose={closeModal} onSave={saveCaso}/>}
      {modal&&modal.tipo==="op"&&<OpModal cliente={modal.cliente} onClose={closeModal} onSave={saveOp}/>}
      <CommPanel
        visible={comm.visible}
        cliente={comm.cliente}
        logs={comm.logs}
        currentUser={currentUser}
        onClose={comm.close}
        onLog={function(entry){
          comm.addLog(entry);
          if(entry.clienteFolio) addEvento(entry.clienteFolio,entry.tipo,entry.canal,entry.texto,entry.autor);
        }}
      />
    </div>
  );
}
