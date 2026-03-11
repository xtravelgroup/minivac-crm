import { useState, useEffect } from "react";
import CommPanel, { useCommPanel, CommPanelTrigger } from "./comm-panel";
import { supabase as SB } from "./supabase";

var TODAY = new Date().toISOString().split("T")[0];
function addDays(d,n){ var dt=new Date(d+"T12:00:00"); dt.setDate(dt.getDate()+n); return dt.toISOString().split("T")[0]; }
function daysAgo(n){ var d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split("T")[0]; }
function daysFromNow(n){ var d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; }
function nbDays(a,b){ return Math.max(0,Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/(1000*60*60*24))); }
function fmtDate(d){ if(!d)return"--"; return new Date(d+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"}); }
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
function pad2(n){ return n<10?"0"+n:String(n); }
function dateDia(y,m,d){ return y+"-"+pad2(m+1)+"-"+pad2(d); }
function calcTempTotal(checkin,noches,temps){
  var s=0;
  for(var i=0;i<noches;i++){
    var dia=addDays(checkin,i);
    for(var j=0;j<(temps||[]).length;j++){
      if(dia>=temps[j].inicio&&dia<=temps[j].fin){ s+=temps[j].surcharge; break; }
    }
  }
  return s;
}

var INDIGO="#6366f1",TEAL="#0ea5a0",VIOLET="#5b21b6",RED="#b91c1c",GREEN="#1a7f3c",AMBER="#f59e0b",CORAL="#f97316",BLUE="#1565c0";

var STATUS = {
  solicitud:       {label:"Solicitud",       c:AMBER,  bg:"rgba(245,158,11,0.12)", br:"rgba(245,158,11,0.3)"},
  solicitada:      {label:"Solicitud",       c:AMBER,  bg:"rgba(245,158,11,0.12)", br:"rgba(245,158,11,0.3)"},
  en_proceso:      {label:"En proceso",      c:INDIGO, bg:"#ebeffe", br:"#aab4f5"},
  vlo_proceso:     {label:"VLO en proceso",  c:INDIGO, bg:"#ebeffe", br:"#aab4f5"},
  rechazado_hotel: {label:"Rechazado hotel", c:CORAL,  bg:"rgba(249,115,22,0.12)", br:"rgba(249,115,22,0.3)"},
  rechazada:       {label:"Rechazada",       c:CORAL,  bg:"rgba(249,115,22,0.12)", br:"rgba(249,115,22,0.3)"},
  confirmada:      {label:"Confirmada",      c:GREEN,  bg:"#eaf5ec", br:"#a3d9a5"},
  cancelada:       {label:"Cancelada",       c:RED,    bg:"#fef0f0", br:"#f5b8b8"},
  completada:      {label:"Completada",      c:"#9ca3af",bg:"rgba(100,116,139,0.1)",br:"rgba(100,116,139,0.3)"},
};

var DESTINOS = ["Cancun","Los Cabos","Riviera Maya","Puerto Vallarta","Huatulco","Las Vegas","Orlando"];
var REGIMENES = ["Solo habitacion","Desayuno incluido","Media pension","Todo incluido"];
var AGENTES = ["Jorge P.","Maria R.","Carlos V.","Ana L."];

// Hoteles se cargan desde Supabase en FormModal
function sbHotelesToMap(rows){
  // Convierte array de hoteles de Supabase a mapa por destino
  var map = {};
  (rows||[]).forEach(function(h){
    var dest = h.destino || "";
    if(!map[dest]) map[dest] = [];
    var regs = (h.plan) ? [h.plan] : ["Solo habitacion","Desayuno incluido","Todo incluido"];
    var habs = (h.habitaciones||[]).map(function(hab){
      return {
        id:   hab.id || hab.nombre,
        nombre: hab.nombre,
        base: (hab.upgrade||0)===0,
        up:   hab.upgrade||0,
      };
    });
    if(habs.length===0) habs = [{id:"std",nombre:"Estandar",base:true,up:0}];
    map[dest].push({
      id:          h.id,
      nombre:      h.nombre,
      cat:         (h.categoria||"").replace(" estrellas",""),
      fee:         h.fee||0,
      precioNoche: h.precio_noche||90,
      ageMin:      (h.restricciones||{}).edadMin||0,
      ageMax:      (h.restricciones||{}).edadMax||99,
      marital:     (h.restricciones||{}).estadoCivil||[],
      tipos:       ["qc","nq"],
      habs:        habs,
      regs:        regs,
      temps:       (h.temporadas||[]).map(function(t){
        return {id:t.id,nombre:t.nombre,inicio:t.inicio,fin:t.fin,surcharge:t.surcharge||0};
      }),
    });
  });
  return map;
}


var INDIGO="#6366f1",TEAL="#0ea5a0",VIOLET="#5b21b6",RED="#b91c1c",GREEN="#1a7f3c",AMBER="#f59e0b",CORAL="#f97316",BLUE="#1565c0";

var STATUS = {
  solicitud:       {label:"Solicitud",       c:AMBER,  bg:"rgba(245,158,11,0.12)", br:"rgba(245,158,11,0.3)"},
  solicitada:      {label:"Solicitud",       c:AMBER,  bg:"rgba(245,158,11,0.12)", br:"rgba(245,158,11,0.3)"},
  en_proceso:      {label:"En proceso",      c:INDIGO, bg:"#ebeffe", br:"#aab4f5"},
  vlo_proceso:     {label:"VLO en proceso",  c:INDIGO, bg:"#ebeffe", br:"#aab4f5"},
  rechazado_hotel: {label:"Rechazado hotel", c:CORAL,  bg:"rgba(249,115,22,0.12)", br:"rgba(249,115,22,0.3)"},
  rechazada:       {label:"Rechazada",       c:CORAL,  bg:"rgba(249,115,22,0.12)", br:"rgba(249,115,22,0.3)"},
  confirmada:      {label:"Confirmada",      c:GREEN,  bg:"#eaf5ec", br:"#a3d9a5"},
  cancelada:       {label:"Cancelada",       c:RED,    bg:"#fef0f0", br:"#f5b8b8"},
  completada:      {label:"Completada",      c:"#9ca3af",bg:"rgba(100,116,139,0.1)",br:"rgba(100,116,139,0.3)"},
};

var DESTINOS = ["Cancun","Los Cabos","Riviera Maya","Puerto Vallarta","Huatulco","Las Vegas","Orlando"];
var REGIMENES = ["Solo habitacion","Desayuno incluido","Media pension","Todo incluido"];
var AGENTES = ["Jorge P.","Maria R.","Carlos V.","Ana L."];

var INDIGO="#6366f1",TEAL="#0ea5a0",VIOLET="#5b21b6",RED="#b91c1c",GREEN="#1a7f3c",AMBER="#f59e0b",CORAL="#f97316",BLUE="#1565c0";

var STATUS = {
  solicitud:       {label:"Solicitud",       c:AMBER,  bg:"rgba(245,158,11,0.12)", br:"rgba(245,158,11,0.3)"},
  solicitada:      {label:"Solicitud",       c:AMBER,  bg:"rgba(245,158,11,0.12)", br:"rgba(245,158,11,0.3)"},
  en_proceso:      {label:"En proceso",      c:INDIGO, bg:"#ebeffe", br:"#aab4f5"},
  vlo_proceso:     {label:"VLO en proceso",  c:INDIGO, bg:"#ebeffe", br:"#aab4f5"},
  rechazado_hotel: {label:"Rechazado hotel", c:CORAL,  bg:"rgba(249,115,22,0.12)", br:"rgba(249,115,22,0.3)"},
  rechazada:       {label:"Rechazada",       c:CORAL,  bg:"rgba(249,115,22,0.12)", br:"rgba(249,115,22,0.3)"},
  confirmada:      {label:"Confirmada",      c:GREEN,  bg:"#eaf5ec", br:"#a3d9a5"},
  cancelada:       {label:"Cancelada",       c:RED,    bg:"#fef0f0", br:"#f5b8b8"},
  completada:      {label:"Completada",      c:"#9ca3af",bg:"rgba(100,116,139,0.1)",br:"rgba(100,116,139,0.3)"},
};

var DESTINOS = ["Cancun","Los Cabos","Riviera Maya","Puerto Vallarta","Huatulco","Las Vegas","Orlando"];
var REGIMENES = ["Solo habitacion","Desayuno incluido","Media pension","Todo incluido"];
var AGENTES = ["Jorge P.","Maria R.","Carlos V.","Ana L."];




var SEED = [
  {id:"RES-001",cFolio:"XT-1001",cliente:"Miguel Torres",destino:"Cancun",checkin:daysFromNow(45),checkout:addDays(daysFromNow(45),5),hotel:"Krystal Grand Cancun Resort",hab:"Deluxe Oceano King",reg:"Todo incluido",pax:2,nBase:5,nExtra:0,tipo:"qc",status:"confirmada",conf:"KGC-44821",fee:75,upg:75,temp:0,total:150,agente:"Jorge P.",creado:daysAgo(5),notasAgente:"Cliente pidio piso alto vista al mar.",notasHotel:"",hist:[{f:daysAgo(5),t:"Solicitud creada",a:"Jorge P."},{f:daysAgo(3),t:"VLO completado",a:"VLO"},{f:daysAgo(3),t:"Confirmada. No. KGC-44821",a:"Jorge P."}]},
  {id:"RES-002",cFolio:"XT-1002",cliente:"Patricia Sanchez",destino:"Los Cabos",checkin:daysFromNow(30),checkout:addDays(daysFromNow(30),4),hotel:"Melia Cabo Real Beach Golf",hab:"Superior Garden View",reg:"Desayuno incluido",pax:1,nBase:4,nExtra:0,tipo:"qc",status:"vlo_proceso",conf:"",fee:65,upg:0,temp:0,total:65,agente:"Maria R.",creado:daysAgo(2),notasAgente:"",notasHotel:"",hist:[{f:daysAgo(2),t:"Solicitud creada",a:"Maria R."},{f:daysAgo(1),t:"Enviada a VLO",a:"Jorge P."}]},
  {id:"RES-003",cFolio:"XT-1004",cliente:"Rosa Gutierrez",destino:"Riviera Maya",checkin:daysFromNow(60),checkout:addDays(daysFromNow(60),6),hotel:"Iberostar Paraiso Lindo",hab:"Superior",reg:"Todo incluido",pax:2,nBase:6,nExtra:0,tipo:"qc",status:"solicitud",conf:"",fee:85,upg:0,temp:0,total:85,agente:"Jorge P.",creado:TODAY,notasAgente:"Aniversario de bodas.",notasHotel:"",hist:[{f:TODAY,t:"Solicitud creada",a:"Jorge P."}]},
  {id:"RES-004",cFolio:"XT-1003",cliente:"Fernando Reyes",destino:"Puerto Vallarta",checkin:daysFromNow(20),checkout:addDays(daysFromNow(20),4),hotel:"Marriott Puerto Vallarta Resort",hab:"Deluxe",reg:"Desayuno incluido",pax:2,nBase:4,nExtra:0,tipo:"nq",status:"solicitud",conf:"",fee:70,upg:0,temp:0,total:70,agente:"Maria R.",creado:TODAY,notasAgente:"",notasHotel:"",hist:[{f:TODAY,t:"Solicitud creada",a:"Maria R."}]},
  {id:"RES-005",cFolio:"XT-1001",cliente:"Miguel Torres",destino:"Riviera Maya",checkin:daysAgo(90),checkout:addDays(daysAgo(90),6),hotel:"Grand Palladium Riviera Resort",hab:"Junior Suite",reg:"Todo incluido",pax:2,nBase:6,nExtra:0,tipo:"qc",status:"completada",conf:"GPR-88231",fee:70,upg:90,temp:0,total:160,agente:"Jorge P.",creado:daysAgo(95),notasAgente:"",notasHotel:"",hist:[{f:daysAgo(95),t:"Solicitud creada",a:"Jorge P."},{f:daysAgo(93),t:"Confirmada GPR-88231",a:"Jorge P."},{f:daysAgo(84),t:"Checkout completado",a:"Sistema"}]},
  {id:"RES-006",cFolio:"XT-1005",cliente:"Hector Jimenez",destino:"Cancun",checkin:daysFromNow(15),checkout:addDays(daysFromNow(15),5),hotel:"Hotel Emporio Cancun",hab:"Superior",reg:"Todo incluido",pax:1,nBase:5,nExtra:0,tipo:"nq",status:"rechazado_hotel",conf:"",fee:50,upg:30,temp:0,total:80,agente:"Maria R.",creado:daysAgo(3),notasAgente:"Viaje solo.",notasHotel:"Sin disponibilidad en las fechas.",hist:[{f:daysAgo(3),t:"Solicitud creada",a:"Maria R."},{f:daysAgo(2),t:"Hotel rechaza: sin disponibilidad.",a:"VLO"}]},
];

var S = {
  wrap:  {minHeight:"100vh",background:"#f4f5f7",color:"#1a1f2e",fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif",fontSize:"13px"},
  inp:   {width:"100%",background:"#ffffff",border:"1px solid #d8dbe0",borderRadius:"8px",padding:"8px 12px",color:"#1a1f2e",fontSize:"13px",outline:"none",boxSizing:"border-box",fontFamily:"inherit"},
  sel:   {width:"100%",background:"#ffffff",border:"1px solid #d8dbe0",borderRadius:"8px",padding:"8px 12px",color:"#1a1f2e",fontSize:"13px",outline:"none",cursor:"pointer",fontFamily:"inherit",boxSizing:"border-box"},
  ta:    {width:"100%",background:"#ffffff",border:"1px solid #d8dbe0",borderRadius:"8px",padding:"8px 12px",color:"#1a1f2e",fontSize:"13px",outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"},
  lbl:   {fontSize:"11px",color:"#6b7280",marginBottom:"4px",fontWeight:"600",letterSpacing:"0.06em",textTransform:"uppercase",display:"block"},
  stit:  {fontSize:"10px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"8px"},
  card:  {background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:"10px",padding:"14px 16px",marginBottom:"8px"},
  g2:    {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"},
  g3:    {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px"},
  modal: {position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"},
};
function mbox(wide){ return {background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:"14px",padding:"24px 28px",width:"100%",maxWidth:wide?"860px":"580px",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}; }
function btn(v){
  var m={primary:{bg:INDIGO,c:"#fff",br:INDIGO},teal:{bg:"rgba(14,165,160,0.15)",c:TEAL,br:"rgba(14,165,160,0.3)"},violet:{bg:"rgba(167,139,250,0.15)",c:VIOLET,br:"#c4b5fd"},success:{bg:"#e5f3e8",c:GREEN,br:"#a3d9a5"},danger:{bg:"#fdeaea",c:RED,br:"#f5b8b8"},warn:{bg:"rgba(245,158,11,0.15)",c:AMBER,br:"rgba(245,158,11,0.3)"},ghost:{bg:"#f6f7f9",c:"#6b7280",br:"#f0f1f4"},indigo:{bg:"#e5eafd",c:INDIGO,br:"#aab4f5"},coral:{bg:"rgba(249,115,22,0.15)",c:CORAL,br:"rgba(249,115,22,0.3)"},amber:{bg:"rgba(245,158,11,0.15)",c:AMBER,br:"rgba(245,158,11,0.3)"}};
  var s=m[v]||m.ghost;
  return {display:"inline-flex",alignItems:"center",gap:"5px",padding:"7px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:"600",background:s.bg,color:s.c,border:"1px solid "+s.br,whiteSpace:"nowrap",lineHeight:"1.2"};
}
function tabS(a,col){ var c=col||INDIGO; return {padding:"7px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:a?"600":"400",background:a?(c+"20"):"transparent",color:a?c:"#9ca3af",border:a?("1px solid "+c+"44"):"1px solid transparent",whiteSpace:"nowrap"}; }
function bdg(c,bg,br){ return {display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:"20px",fontSize:"11px",fontWeight:"600",color:c,background:bg,border:"1px solid "+br}; }
function stBdg(st){ var s=STATUS[st]||STATUS.solicitada||STATUS.solicitud; return bdg(s.c,s.bg,s.br); }

function MWrap(props){
  return (
    <div style={S.modal} onClick={props.onClose}>
      <div style={mbox(props.wide)} onClick={function(e){e.stopPropagation();}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
          <div>
            <div style={{fontSize:"15px",fontWeight:"700",color:props.color||TEAL}}>{props.title}</div>
            {props.sub&&<div style={{fontSize:"11px",color:"#9ca3af",marginTop:"2px"}}>{props.sub}</div>}
          </div>
          <button style={Object.assign({},btn("ghost"),{padding:"4px 10px",fontSize:"14px"})} onClick={props.onClose}>x</button>
        </div>
        {props.children}
      </div>
    </div>
  );
}

function Stepper(props){
  var steps=[{k:"solicitada",l:"Solicitud"},{k:"vlo_proceso",l:"VLO"},{k:"confirmada",l:"Confirmada"},{k:"completada",l:"Completada"}];
  var cur=props.status;
  var curIdx=-1;
  for(var i=0;i<steps.length;i++){ if(steps[i].k===cur){curIdx=i;break;} }
  if(cur==="cancelada"||cur==="rechazado_hotel") curIdx=-1;
  return (
    <div style={{display:"flex",alignItems:"center",marginBottom:"16px"}}>
      {steps.map(function(s,i){
        var done=curIdx>i;
        var active=curIdx===i;
        var col=active?TEAL:(done?GREEN:"#b0b8c4");
        var cirBg=active?TEAL:(done?"rgba(74,222,128,0.2)":"#f6f7f9");
        var cirBr=active?TEAL:(done?GREEN:"#b0b8c4");
        var cirCol=active?"#fff":(done?GREEN:"#9ca3af");
        return (
          <div key={s.k} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"none"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px"}}>
              <div style={{width:"20px",height:"20px",borderRadius:"50%",background:cirBg,border:"2px solid "+cirBr,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:"700",color:cirCol}}>
                {done?"v":i+1}
              </div>
              <div style={{fontSize:"9px",color:col,fontWeight:active?"700":"400",whiteSpace:"nowrap"}}>{s.l}</div>
            </div>
            {i<steps.length-1&&<div style={{flex:1,height:"2px",background:done?"rgba(74,222,128,0.4)":"#f4f5f7",margin:"0 4px",marginBottom:"14px"}}></div>}
          </div>
        );
      })}
      {(cur==="cancelada"||cur==="rechazado_hotel")&&(
        <div style={{marginLeft:"8px",fontSize:"11px",color:cur==="cancelada"?RED:CORAL,fontWeight:"600"}}>{cur==="cancelada"?"Cancelada":"Rechazado hotel"}</div>
      )}
    </div>
  );
}

function CostRow(props){
  var r=props.r;
  var total=(r.fee||0)+(r.upg||0)+(r.temp||0)+(r.nExtra||0)*90;
  return (
    <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"10px"}}>
      {r.fee>0&&<div style={{background:"#fafbfc",border:"1px solid #e3e6ea",borderRadius:"10px",padding:"7px 12px",flex:1,minWidth:"70px"}}><div style={S.lbl}>Fee base</div><div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>{fmtUSD(r.fee)}</div></div>}
      {r.upg>0&&<div style={{background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:"10px",padding:"7px 12px",flex:1,minWidth:"70px"}}><div style={S.lbl}>Upgrade</div><div style={{fontSize:"13px",fontWeight:"700",color:VIOLET}}>{fmtUSD(r.upg)}</div></div>}
      {r.temp>0&&<div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:"10px",padding:"7px 12px",flex:1,minWidth:"70px"}}><div style={S.lbl}>Temporada</div><div style={{fontSize:"13px",fontWeight:"700",color:AMBER}}>{fmtUSD(r.temp)}</div></div>}
      {(r.nExtra||0)>0&&<div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:"10px",padding:"7px 12px",flex:1,minWidth:"70px"}}><div style={S.lbl}>Noches extra</div><div style={{fontSize:"13px",fontWeight:"700",color:AMBER}}>{fmtUSD((r.nExtra||0)*90)}</div></div>}
      <div style={{background:"rgba(14,165,160,0.1)",border:"1px solid rgba(14,165,160,0.3)",borderRadius:"10px",padding:"7px 14px",flex:1,minWidth:"70px"}}><div style={S.lbl}>Total cliente</div><div style={{fontSize:"15px",fontWeight:"800",color:TEAL}}>{fmtUSD(total)}</div></div>
    </div>
  );
}


var CLIENTES_SEED = [
  {folio:"XT-1001",nombre:"Miguel Torres",tel:"33-1234-5678",email:"miguel@email.com",membresia:"Gold",vigencia:daysFromNow(365),saldo:0,estadoCivil:"Casado",coProp:"Sandra Torres",
   destinos:[{nombre:"Cancun",noches:5,tipo:"qc"},{nombre:"Riviera Maya",noches:6,tipo:"qc"}]},
  {folio:"XT-1002",nombre:"Patricia Sanchez",tel:"33-2345-6789",email:"patricia@email.com",membresia:"Silver",vigencia:daysFromNow(540),saldo:450,estadoCivil:"Soltera",coProp:null,
   destinos:[{nombre:"Los Cabos",noches:4,tipo:"qc"}]},
  {folio:"XT-1003",nombre:"Fernando Reyes",tel:"33-3456-7890",email:"fernando@email.com",membresia:"Gold",vigencia:daysFromNow(220),saldo:725,estadoCivil:"Casado",coProp:"Elena Reyes",
   destinos:[{nombre:"Cancun",noches:5,tipo:"qc"},{nombre:"Puerto Vallarta",noches:4,tipo:"nq"}]},
  {folio:"XT-1004",nombre:"Rosa Gutierrez",tel:"33-4567-8901",email:"rosa@email.com",membresia:"Platinum",vigencia:daysFromNow(80),saldo:0,estadoCivil:"Casada",coProp:"Jorge Gutierrez",
   destinos:[{nombre:"Riviera Maya",noches:6,tipo:"qc"}]},
  {folio:"XT-1005",nombre:"Hector Jimenez",tel:"33-5678-9012",email:"hector@email.com",membresia:"Silver",vigencia:daysFromNow(640),saldo:800,estadoCivil:"Soltero hombre",coProp:null,
   destinos:[{nombre:"Cancun",noches:5,tipo:"nq"},{nombre:"Huatulco",noches:5,tipo:"qc"}]},
];

function FormModal(props){
  var ex=props.res;
  var preCliente=props.cliente||null;
  var preDestino=props.destino||null;

  var MEMB_COL={Silver:"#6b7280",Gold:"#925c0a",Platinum:"#5b21b6"};

  var [hotelesDB,setHotelesDB]=useState(props.hotelesMap||{});
  useEffect(function(){
    SB.from("hoteles").select("*").eq("activo",true).then(function(r){
      if(!r.error){
        console.log("Hoteles Supabase:", r.data);
        var mapped = sbHotelesToMap(r.data);
        console.log("Hoteles mapeados:", mapped);
        setHotelesDB(mapped);
      } else {
        console.error("Error hoteles:", r.error);
      }
    });
  },[]);

  var [step,setStep]=useState(ex?2:(preCliente?1:0));
  var [busq,setBusq]=useState("");
  var [clienteSel,setClienteSel]=useState(preCliente||null);
  var [destinoSel,setDestinoSel]=useState(preDestino||null);

  var cliFiltrados=CLIENTES_SEED.filter(function(c){
    if(!busq) return true;
    var s=busq.toLowerCase();
    return c.nombre.toLowerCase().indexOf(s)>=0||c.folio.toLowerCase().indexOf(s)>=0;
  });

  var hotelesD=hotelesDB[(destinoSel?destinoSel.nombre:"Cancun")]||[];
  var hiEx=0;
  if(ex){ for(var xi=0;xi<hotelesD.length;xi++){ if(hotelesD[xi].nombre===ex.hotel){hiEx=xi;break;} } }

  var initDest=destinoSel?destinoSel.nombre:(ex?ex.destino:"Cancun");
  var [dest,setDest]=useState(initDest);
  var [checkin,setCheckin]=useState(ex?ex.checkin:daysFromNow(30));
  var [nBase,setNBase]=useState(destinoSel?destinoSel.noches:(ex?ex.nBase:5));
  var [nExtra,setNExtra]=useState(ex?(ex.nExtra||0):0);
  var [hIdx,setHIdx]=useState(hiEx);
  var [habNom,setHabNom]=useState(ex?ex.hab:"");
  var [reg,setReg]=useState(ex?ex.reg:"Todo incluido");
  var [pax,setPax]=useState(ex?ex.pax:2);
  var [tipo,setTipo]=useState(destinoSel?destinoSel.tipo:(ex?ex.tipo:"qc"));
  var [hIdxReset,setHIdxReset]=useState(0);
  var [notas,setNotas]=useState(ex?ex.notasAgente:"");
  var currentUser=props.currentUser||{nombre:"Sistema",rol:"agente"};
  var [agente,    setAgente]    = useState(ex?ex.agente:currentUser.nombre);
  var [ingresos,  setIngresos]  = useState(ex?ex.ingresos||"":"");
  var [profTit,   setProfTit]   = useState(ex?ex.profTit||"":"");
  var [profCo,    setProfCo]    = useState(ex?ex.profCo||"":"");

  var tipoFiltro=tipo;
  var hoteles=(hotelesDB[dest]||[]).filter(function(h){
    if(h.tipos&&h.tipos.indexOf(tipoFiltro)<0) return false;
    if(clienteSel){ var cal=calificaHotel(h,clienteSel); return cal.ok; }
    return true;
  });
  var hotelesNoCalif=(hotelesDB[dest]||[]).filter(function(h){
    if(h.tipos&&h.tipos.indexOf(tipoFiltro)<0) return true;
    if(clienteSel){ var cal=calificaHotel(h,clienteSel); return !cal.ok; }
    return false;
  });
  var hotel=hoteles[hIdx]||hoteles[0]||null;
  var habs=hotel?hotel.habs:[];
  var habObj=null;
  for(var hi=0;hi<habs.length;hi++){ if(habs[hi].nombre===habNom){habObj=habs[hi];break;} }
  if(!habObj&&habs.length>0) habObj=habs[0];
  var noches=(parseInt(nBase)||5)+(parseInt(nExtra)||0);
  var checkout=addDays(checkin,noches);
  var fee=hotel?hotel.fee:0;
  var upg=habObj&&!habObj.base?habObj.up:0;
  var temp=hotel?calcTempTotal(checkin,noches,hotel.temps):0;
  var upPerNight=habObj&&!habObj.base?habObj.up:0;
  var nochePrice=(hotel?hotel.precioNoche:90)+upPerNight;
  var total=fee+upg+temp+(parseInt(nExtra)||0)*nochePrice;
  var tempActiva=null;
  if(hotel){ for(var ti=0;ti<hotel.temps.length;ti++){ if(checkin>=hotel.temps[ti].inicio&&checkin<=hotel.temps[ti].fin){tempActiva=hotel.temps[ti];break;} } }

  function onDestChange(v){ setDest(v); setHIdx(0); setHabNom(""); var nh=(hotelesDB[v]||[])[0]; if(nh&&nh.regs&&nh.regs.length>0) setReg(nh.regs[0]); }
  function onHotelChange(v){ var ni=parseInt(v)||0; setHIdx(ni); setHabNom(""); var nh=(hotelesDB[dest]||[])[ni]||(hotelesDB[dest]||[])[0]; if(nh&&nh.regs&&nh.regs.length>0) setReg(nh.regs[0]); }

  function selCliente(c){
    setClienteSel(c);
    setStep(1);
    setBusq("");
  }
  function selDestino(d){
    setDestinoSel(d);
    setDest(d.nombre);
    setNBase(d.noches);
    setTipo(d.tipo);
    setHIdx(0);
    setHabNom("");
    setStep(2);
  }

  function save(){
    var cNombre=clienteSel?clienteSel.nombre:(ex?ex.cliente:"");
    var cFolio=clienteSel?clienteSel.folio:(ex?ex.cFolio:"");
    props.onSave({
      cFolio:cFolio,cliente:cNombre,destino:dest,
      checkin:checkin,checkout:checkout,
      hotel:hotel?hotel.nombre:"",hab:habNom||(habs[0]?habs[0].nombre:""),
      reg:reg,pax:parseInt(pax)||2,
      nBase:parseInt(nBase)||5,nExtra:parseInt(nExtra)||0,
      tipo:tipo,fee:fee,upg:upg,temp:temp,total:total,
      notasAgente:notas,agente:agente,
      ingresos:ingresos,profTit:profTit,profCo:profCo,
    });
    props.onClose();
  }

  var vigOk=clienteSel?new Date(clienteSel.vigencia+"T12:00:00")>=new Date():true;
  var tieneSaldo=clienteSel&&clienteSel.saldo>0;
  var ok=(clienteSel||ex)&&hotel&&checkin;

  var stepLabels=["Buscar cliente","Seleccionar destino","Datos de la reserva"];

  return (
    <MWrap title={ex?"Modificar reserva":"Nueva reserva"} sub={ex?ex.id:""} color={TEAL} onClose={props.onClose} wide>
      {!ex&&(
        <div style={{display:"flex",gap:"0",marginBottom:"20px"}}>
          {stepLabels.map(function(l,i){
            var done=step>i;
            var active=step===i;
            var col=active?TEAL:(done?GREEN:"#b0b8c4");
            return (
              <div key={i} style={{display:"flex",alignItems:"center",flex:i<stepLabels.length-1?1:"none"}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px"}}>
                  <div style={{width:"22px",height:"22px",borderRadius:"50%",background:active?TEAL:(done?"rgba(74,222,128,0.2)":"#f6f7f9"),border:"2px solid "+(active?TEAL:(done?GREEN:"#b0b8c4")),display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:"700",color:active?"#fff":(done?GREEN:"#9ca3af")}}>
                    {done?"v":i+1}
                  </div>
                  <div style={{fontSize:"9px",color:col,fontWeight:active?"700":"400",whiteSpace:"nowrap"}}>{l}</div>
                </div>
                {i<stepLabels.length-1&&<div style={{flex:1,height:"2px",background:done?"rgba(74,222,128,0.4)":"#f4f5f7",margin:"0 4px",marginBottom:"12px"}}></div>}
              </div>
            );
          })}
        </div>
      )}

      {step===0&&(
        <div>
          <input style={Object.assign({},S.inp,{marginBottom:"10px"})} value={busq} onChange={function(e){setBusq(e.target.value);}} autoFocus placeholder="Buscar por nombre o folio (ej: Miguel o XT-1001)..."/>
          {busq.length===0&&<div style={{fontSize:"11px",color:"#9ca3af",marginBottom:"8px"}}>Escribe al menos 2 caracteres para buscar</div>}
          {busq.length>0&&cliFiltrados.length===0&&<div style={{fontSize:"12px",color:"#9ca3af",padding:"16px 0",textAlign:"center"}}>Sin resultados para "{busq}"</div>}
          {busq.length>0&&cliFiltrados.map(function(c){
            var vOk=new Date(c.vigencia+"T12:00:00")>=new Date();
            var mCol=MEMB_COL[c.membresia]||"#6b7280";
            return (
              <div key={c.folio} onClick={function(){selCliente(c);}}
                style={{background:"#fafbfc",border:"1px solid #dde0e5",borderRadius:"12px",padding:"12px 14px",marginBottom:"6px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:"14px",fontWeight:"700",color:"#3d4554"}}>{c.nombre}</div>
                    <div style={{fontSize:"11px",color:"#9ca3af"}}>{c.folio} - <span style={{color:mCol,fontWeight:"600"}}>{c.membresia}</span>{c.coProp?" + "+c.coProp:""}</div>
                  </div>
                  <div style={{display:"flex",gap:"4px",flexDirection:"column",alignItems:"flex-end"}}>
                    {!vOk&&<span style={{fontSize:"10px",color:RED,fontWeight:"700"}}>Vigencia vencida</span>}
                    {c.saldo>0&&<span style={{fontSize:"10px",color:AMBER,fontWeight:"700"}}>Saldo: {fmtUSD(c.saldo)}</span>}
                  </div>
                </div>
                <div style={{marginTop:"6px",display:"flex",gap:"5px",flexWrap:"wrap"}}>
                  {c.destinos.map(function(d){
                    return <span key={d.nombre} style={{fontSize:"10px",padding:"2px 8px",borderRadius:"6px",background:d.tipo==="qc"?"#eef2ff":"rgba(245,158,11,0.1)",color:d.tipo==="qc"?INDIGO:AMBER,border:"1px solid "+(d.tipo==="qc"?"#aab4f5":"rgba(245,158,11,0.3)")}}>{d.nombre} {d.noches}n {d.tipo.toUpperCase()}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {step===1&&clienteSel&&(
        <div>
          <div style={Object.assign({},S.card,{marginBottom:"14px",borderColor:"rgba(14,165,160,0.25)"})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:"14px",fontWeight:"700",color:"#3d4554"}}>{clienteSel.nombre}{clienteSel.coProp?" + "+clienteSel.coProp:""}</div>
                <div style={{fontSize:"11px",color:"#9ca3af"}}>{clienteSel.folio} - <span style={{color:MEMB_COL[clienteSel.membresia]||"#6b7280",fontWeight:"600"}}>{clienteSel.membresia}</span></div>
                <div style={{fontSize:"11px",color:"#9ca3af",marginTop:"2px"}}>Vigencia: <span style={{color:vigOk?"#3d4554":RED,fontWeight:"600"}}>{fmtDate(clienteSel.vigencia)}</span>{tieneSaldo&&<span style={{color:AMBER,marginLeft:"10px"}}>Saldo pendiente: {fmtUSD(clienteSel.saldo)}</span>}</div>
              </div>
              <button style={Object.assign({},btn("ghost"),{fontSize:"11px"})} onClick={function(){setStep(0);setClienteSel(null);}}>Cambiar</button>
            </div>
          </div>
          {(!vigOk||tieneSaldo)&&(
            <div style={{padding:"10px 14px",borderRadius:"10px",background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.25)",marginBottom:"12px",fontSize:"12px",color:AMBER}}>
              {!vigOk&&<div>Atencion: La membresia de este cliente esta vencida.</div>}
              {tieneSaldo&&<div>Atencion: El cliente tiene saldo pendiente de {fmtUSD(clienteSel.saldo)}.</div>}
              <div style={{fontSize:"11px",color:"#6b7280",marginTop:"3px"}}>Puedes continuar con la reserva.</div>
            </div>
          )}
          <div style={S.stit}>Selecciona el destino a reservar</div>
          {clienteSel.destinos.map(function(d){
            var hotsDest=hotelesDB[d.nombre]||[];
            return (
              <div key={d.nombre} onClick={function(){selDestino(d);}}
                style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:"12px",background:"rgba(255,255,255,0.025)",border:"1px solid #dde0e5",marginBottom:"6px",cursor:"pointer"}}>
                <div>
                  <div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>{d.nombre}</div>
                  <div style={{fontSize:"11px",color:"#9ca3af"}}>{d.noches} noches incluidas - {hotsDest.length} hotel(es) disponible(s)</div>
                </div>
                <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                  <span style={{fontSize:"11px",padding:"3px 9px",borderRadius:"8px",background:d.tipo==="qc"?"#eef2ff":"rgba(245,158,11,0.1)",color:d.tipo==="qc"?INDIGO:AMBER,border:"1px solid "+(d.tipo==="qc"?"#aab4f5":"rgba(245,158,11,0.3)"),fontWeight:"600"}}>{d.tipo.toUpperCase()}</span>
                  <span style={{fontSize:"11px",color:TEAL}}>Reservar</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {step===2&&(
        <div>
          {clienteSel&&(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:"10px",background:"rgba(14,165,160,0.06)",border:"1px solid rgba(14,165,160,0.2)",marginBottom:"12px"}}>
              <div style={{fontSize:"12px",color:"#3d4554"}}><strong>{clienteSel.nombre}</strong> - {clienteSel.folio} - <span style={{color:MEMB_COL[clienteSel.membresia]||"#6b7280"}}>{clienteSel.membresia}</span></div>
              {destinoSel&&<div style={{fontSize:"12px",fontWeight:"700",color:TEAL}}>{destinoSel.nombre} {destinoSel.noches}n {destinoSel.tipo.toUpperCase()}</div>}
              {!ex&&<button style={Object.assign({},btn("ghost"),{fontSize:"10px",padding:"3px 8px"})} onClick={function(){setStep(1);}}>Cambiar destino</button>}
            </div>
          )}
          {(!vigOk||tieneSaldo)&&(
            <div style={{padding:"8px 12px",borderRadius:"8px",background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)",marginBottom:"10px",fontSize:"11px",color:AMBER}}>
              {!vigOk&&<span>Membresia vencida. </span>}
              {tieneSaldo&&<span>Saldo pendiente: {fmtUSD(clienteSel.saldo)}. </span>}
              Puedes continuar.
            </div>
          )}
          <div style={Object.assign({},S.g2,{marginBottom:"10px"})}>
            <div><label style={S.lbl}>Check-in</label><input style={S.inp} type="date" value={checkin} min={TODAY} onChange={function(e){setCheckin(e.target.value);}}/></div>
            <div><label style={S.lbl}>Noches del paquete</label><input style={S.inp} type="number" min="1" max="21" value={nBase} onChange={function(e){setNBase(e.target.value);}}/></div>
            <div><label style={S.lbl}>Noches extra (+$90/noche)</label><input style={S.inp} type="number" min="0" max="14" value={nExtra} onChange={function(e){setNExtra(e.target.value);}}/></div>
            <div><label style={S.lbl}>Personas</label><input style={S.inp} type="number" min="1" max="6" value={pax} onChange={function(e){setPax(e.target.value);}}/></div>
          </div>
          <div style={{padding:"7px 12px",borderRadius:"8px",background:"rgba(14,165,160,0.06)",border:"1px solid rgba(14,165,160,0.15)",marginBottom:"10px",display:"flex",gap:"14px",fontSize:"11px",flexWrap:"wrap"}}>
            <span style={{color:"#9ca3af"}}>Total noches: <strong style={{color:"#3d4554"}}>{noches}</strong></span>
            <span style={{color:"#9ca3af"}}>Checkout: <strong style={{color:"#3d4554"}}>{fmtDate(checkout)}</strong></span>
            {tempActiva&&<span style={{color:"#9ca3af"}}>Temporada: <strong style={{color:AMBER}}>{tempActiva.nombre}</strong></span>}
          </div>
          <div style={Object.assign({},S.g2,{marginBottom:"10px"})}>
            <div>
              <label style={S.lbl}>Hotel</label>
              <select style={S.sel} value={String(hIdx)} onChange={function(e){onHotelChange(e.target.value);}}>
                {hoteles.length===0&&<option value="">Sin hoteles disponibles para tipo {tipoFiltro.toUpperCase()}</option>}
              {hoteles.length===0&&<option value="">Sin hoteles calificados para este cliente</option>}
              {hoteles.map(function(h,i){return <option key={h.id} value={String(i)}>{h.nombre} ({h.cat} estrs)</option>;})}
              {hotelesNoCalif.length>0&&<option disabled value="">-- No califica --</option>}
              {hotelesNoCalif.map(function(h,i){
                var cal=calificaHotel(h,clienteSel);
                return <option key={h.id} value="" disabled>{h.nombre} - {cal.motivos[0]}</option>;
              })}
              </select>
            </div>
            <div>
              <label style={S.lbl}>Habitacion</label>
              <select style={S.sel} value={habNom} onChange={function(e){setHabNom(e.target.value);}}>
                <option value="">-- Seleccionar --</option>
                {habs.map(function(h){var np=(hotel?hotel.precioNoche:90)+(h.base?0:h.up); return <option key={h.id} value={h.nombre}>{h.nombre}{h.base?" (incluida | extra: "+fmtUSD(hotel?hotel.precioNoche:90)+"/n)":" (+"+fmtUSD(h.up)+" upg | extra: "+fmtUSD(np)+"/n)"}</option>;})}
              </select>
            </div>
            <div>
              <label style={S.lbl}>Regimen</label>
              <select style={S.sel} value={reg} onChange={function(e){setReg(e.target.value);}}>
                {(hotel?hotel.regs:REGIMENES).map(function(r){return <option key={r} value={r}>{r}</option>;})}
              </select>
            </div>
            <div>
              <label style={S.lbl}>Agente de reservas</label>
              <input style={S.inp} value={agente} onChange={function(e){setAgente(e.target.value);}} placeholder="Nombre del agente"/>
            </div>
          </div>

          {/* ── PERFIL DEL CLIENTE ── */}
          {clienteSel&&(
            <div style={{background:"#f8f9fb",border:"1px solid #e3e6ea",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Perfil del titular</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                <div><span style={{fontSize:11,color:"#9ca3af"}}>Estado civil</span><div style={{fontSize:12,fontWeight:600,color:"#1a1f2e"}}>{clienteSel.estadoCivil||"--"}</div></div>
                <div><span style={{fontSize:11,color:"#9ca3af"}}>Edad titular</span><div style={{fontSize:12,fontWeight:600,color:"#1a1f2e"}}>{clienteSel.edad||"--"}</div></div>
                {clienteSel.coProp&&<div><span style={{fontSize:11,color:"#9ca3af"}}>Co-propietario</span><div style={{fontSize:12,fontWeight:600,color:"#1a1f2e"}}>{clienteSel.coProp}</div></div>}
                {clienteSel.coPropEdad&&<div><span style={{fontSize:11,color:"#9ca3af"}}>Edad co-prop</span><div style={{fontSize:12,fontWeight:600,color:"#1a1f2e"}}>{clienteSel.coPropEdad}</div></div>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <div>
                  <label style={S.lbl}>Profesion titular</label>
                  <input style={S.inp} value={profTit} onChange={function(e){setProfTit(e.target.value);}} placeholder="Ej: Medico, Ingeniero..."/>
                </div>
                {clienteSel.coProp&&(
                  <div>
                    <label style={S.lbl}>Profesion co-prop</label>
                    <input style={S.inp} value={profCo} onChange={function(e){setProfCo(e.target.value);}} placeholder="Ej: Abogada, Maestra..."/>
                  </div>
                )}
                <div>
                  <label style={S.lbl}>Ingresos anuales combinados</label>
                  <input style={S.inp} value={ingresos} onChange={function(e){setIngresos(e.target.value);}} placeholder="Ej: $80,000"/>
                </div>
              </div>
            </div>
          )}

          {hotel&&(
            <div style={{padding:"8px 12px",borderRadius:"8px",background:"#fafbfc",border:"1px solid #e3e6ea",marginBottom:"10px",display:"flex",gap:"12px",flexWrap:"wrap",fontSize:"11px"}}>
              <span style={{color:"#9ca3af"}}>Fee: <strong style={{color:"#3d4554"}}>{fmtUSD(fee)}</strong></span>
              {upg>0&&<span style={{color:"#9ca3af"}}>Upgrade: <strong style={{color:VIOLET}}>{fmtUSD(upg)}</strong></span>}
              {temp>0&&<span style={{color:"#9ca3af"}}>Temporada: <strong style={{color:AMBER}}>{fmtUSD(temp)}</strong></span>}
              {(parseInt(nExtra)||0)>0&&<span style={{color:"#9ca3af"}}>Noches extra ({fmtUSD(nochePrice)}/noche): <strong style={{color:AMBER}}>{fmtUSD((parseInt(nExtra)||0)*nochePrice)}</strong></span>}
              <span style={{fontWeight:"700",color:TEAL}}>Total: {fmtUSD(total)}</span>
            </div>
          )}
          <div style={{marginBottom:"14px"}}>
            <label style={S.lbl}>Notas internas / solicitudes especiales</label>
            <textarea style={Object.assign({},S.ta,{minHeight:"55px"})} value={notas} onChange={function(e){setNotas(e.target.value);}} placeholder="Preferencias de piso, cama, celebraciones..."/>
          </div>
          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
            <button style={btn("ghost")} onClick={props.onClose}>Cancelar</button>
            <button style={btn("teal")} onClick={save} disabled={!ok}>{ex?"Guardar cambios":"Crear reserva"}</button>
          </div>
        </div>
      )}
    </MWrap>
  );
}


function VLOModal(props){
  var r=props.res;
  var [notasH,setNotasH]=useState(r.notasHotel||"");
  var [conf,setConf]=useState(r.conf||"");
  var [motivo,setMotivo]=useState("");
  var sc=STATUS[r.status]||STATUS.solicitud;
  return (
    <MWrap title={"VLO - "+r.id} sub={r.cliente+" | "+r.destino+" - "+r.hotel} color={AMBER} onClose={props.onClose} wide>
      <Stepper status={r.status}/>
      <div style={Object.assign({},S.g3,{marginBottom:"12px"})}>
        <div style={S.card}><div style={S.lbl}>Check-in</div><strong style={{color:"#3d4554"}}>{fmtDate(r.checkin)}</strong></div>
        <div style={S.card}><div style={S.lbl}>Check-out</div><strong style={{color:"#3d4554"}}>{fmtDate(r.checkout)}</strong></div>
        <div style={S.card}><div style={S.lbl}>Noches</div><strong style={{color:TEAL}}>{nbDays(r.checkin,r.checkout)}</strong></div>
        <div style={S.card}><div style={S.lbl}>Habitacion</div><span style={{fontSize:"12px",color:"#3d4554"}}>{r.hab}</span></div>
        <div style={S.card}><div style={S.lbl}>Regimen</div><span style={{fontSize:"12px",color:"#3d4554"}}>{r.reg}</span></div>
        <div style={S.card}><div style={S.lbl}>Personas</div><strong style={{color:"#3d4554"}}>{r.pax}</strong></div>
      </div>
      <CostRow r={r}/>
      {r.notasAgente&&(
        <div style={Object.assign({},S.card,{borderColor:"rgba(245,158,11,0.2)",marginBottom:"10px"})}>
          <div style={S.lbl}>Notas del agente</div>
          <div style={{fontSize:"12px",color:"#3d4554"}}>{r.notasAgente}</div>
        </div>
      )}
      {r.status==="rechazado_hotel"&&r.notasHotel&&(
        <div style={{padding:"10px 14px",borderRadius:"10px",background:"rgba(249,115,22,0.07)",border:"1px solid rgba(249,115,22,0.25)",marginBottom:"10px",fontSize:"12px",color:CORAL}}>
          Motivo rechazo: {r.notasHotel}
        </div>
      )}
      {(r.status==="solicitud"||r.status==="solicitada"||r.status==="vlo_proceso")&&(
        <div>
          <div style={{marginBottom:"10px"}}>
            <label style={S.lbl}>Notas del hotel / respuesta</label>
            <textarea style={Object.assign({},S.ta,{minHeight:"55px"})} value={notasH} onChange={function(e){setNotasH(e.target.value);}} placeholder="Respuesta o comentarios del hotel..."/>
          </div>
          <div style={{padding:"12px 14px",borderRadius:"10px",background:"rgba(14,165,160,0.06)",border:"1px solid rgba(14,165,160,0.2)",marginBottom:"10px"}}>
            <div style={S.lbl}>Confirmar con numero de hotel</div>
            <div style={{display:"flex",gap:"8px"}}>
              <input style={S.inp} value={conf} onChange={function(e){setConf(e.target.value);}} placeholder="No. confirmacion (ej: KGC-44821)"/>
              <button style={Object.assign({},btn("success"),{flexShrink:0})} disabled={!conf.trim()} onClick={function(){props.onConfirmar(r,conf,notasH);props.onClose();}}>Confirmar</button>
            </div>
          </div>
          <div style={{padding:"12px 14px",borderRadius:"10px",background:"rgba(249,115,22,0.06)",border:"1px solid rgba(249,115,22,0.2)",marginBottom:"10px"}}>
            <div style={S.lbl}>Rechazar (sin disponibilidad)</div>
            <div style={{display:"flex",gap:"8px"}}>
              <input style={S.inp} value={motivo} onChange={function(e){setMotivo(e.target.value);}} placeholder="Motivo del rechazo..."/>
              <button style={Object.assign({},btn("coral"),{flexShrink:0})} disabled={!(motivo.trim()||notasH.trim())} onClick={function(){props.onRechazar(r,motivo||notasH);props.onClose();}}>Rechazar</button>
            </div>
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={S.stit}>Historial</div>
        {(r.hist||[]).map(function(h,i){
          return (
            <div key={i} style={{display:"flex",gap:"10px",padding:"5px 0",borderBottom:"1px solid #edf0f3"}}>
              <div style={{fontSize:"10px",color:"#9ca3af",width:"90px",flexShrink:0}}>{fmtDate(h.f)}</div>
              <div style={{fontSize:"12px",color:"#3d4554",flex:1}}>{h.t}</div>
              <div style={{fontSize:"10px",color:"#9ca3af"}}>{h.a}</div>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:"8px",justifyContent:"space-between",marginTop:"8px",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:"6px"}}>
          <button style={btn("warn")} onClick={function(){props.onEditar(r);props.onClose();}}>Modificar datos</button>
          {r.status!=="cancelada"&&r.status!=="completada"&&(
            <button style={btn("danger")} onClick={function(){props.onCancelar(r);props.onClose();}}>Cancelar</button>
          )}
        </div>
        <button style={btn("ghost")} onClick={props.onClose}>Cerrar</button>
      </div>
    </MWrap>
  );
}

function ResCard(props){
  var r=props.res;
  var sc=STATUS[r.status]||STATUS.solicitud;
  var isSel=props.sel&&props.sel.id===r.id;
  var tipoBg=r.tipo==="qc"?"#eef2ff":"rgba(245,158,11,0.1)";
  var tipoBr=r.tipo==="qc"?"#aab4f5":"rgba(245,158,11,0.3)";
  var tipoC=r.tipo==="qc"?INDIGO:AMBER;
  return (
    <div onClick={props.onClick} style={{background:isSel?"rgba(14,165,160,0.08)":"rgba(255,255,255,0.025)",border:"1px solid "+(isSel?TEAL:sc.br),borderRadius:"12px",padding:"11px 13px",marginBottom:"6px",cursor:"pointer"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"5px"}}>
        <div>
          <div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>{r.cliente}</div>
          <div style={{fontSize:"10px",color:"#9ca3af"}}>{r.id} - {r.cFolio}</div>
        </div>
        <div style={{display:"flex",gap:"3px",flexShrink:0}}>
          <span style={bdg(tipoC,tipoBg,tipoBr)}>{r.tipo.toUpperCase()}</span>
          <span style={stBdg(r.status)}>{sc.label}</span>
        </div>
      </div>
      <div style={{fontSize:"11px",color:"#6b7280",marginBottom:"3px"}}>{r.destino} - {r.hotel}</div>
      <div style={{display:"flex",gap:"10px",fontSize:"11px",color:"#9ca3af",flexWrap:"wrap"}}>
        <span>Checkin: <strong style={{color:"#3d4554"}}>{fmtDate(r.checkin)}</strong></span>
        <span>Noches: <strong style={{color:TEAL}}>{nbDays(r.checkin,r.checkout)}</strong></span>
        {r.total>0&&<span>Total: <strong style={{color:AMBER}}>{fmtUSD(r.total)}</strong></span>}
      </div>
      {r.conf&&<div style={{marginTop:"4px",fontSize:"10px",color:GREEN}}>Conf: {r.conf}</div>}
    </div>
  );
}

function CatalogoView(){
  var [dest,setDest]=useState("Cancun");
  var [cat,setCat]=useState({});
  var [destinos,setDestinos]=useState([]);
  var [open,setOpen]=useState(null);

  useEffect(function(){
    SB.from("hoteles").select("*").eq("activo",true).then(function(r){
      if(!r.error){
        var map=sbHotelesToMap(r.data);
        setCat(map);
        setDestinos(Object.keys(map));
      }
    });
    SB.from("destinos_catalog").select("nombre").eq("activo",true).then(function(r){
      if(!r.error) setDestinos((r.data||[]).map(function(d){return d.nombre;}));
    });
  },[]);

  var hoteles=cat[dest]||[];
  return (
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"flex",gap:"5px",marginBottom:"16px",flexWrap:"wrap"}}>
        {destinos.map(function(d){ return <button key={d} style={tabS(d===dest,TEAL)} onClick={function(){setDest(d);}}>{d}</button>; })}
      </div>
      {hoteles.map(function(h){
        var isOpen=open===h.id;
        return (
          <div key={h.id} style={Object.assign({},S.card,{borderColor:isOpen?"rgba(14,165,160,0.3)":"#f2f3f6"})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isOpen?"12px":"0"}}>
              <div>
                <div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>{h.nombre}</div>
                <div style={{fontSize:"11px",color:"#9ca3af"}}>{h.cat} estrs - Fee: {fmtUSD(h.fee)} - {h.habs.length} hab. - {(h.temps||[]).length} temporadas</div>
              </div>
              <button style={btn(isOpen?"teal":"ghost")} onClick={function(){setOpen(isOpen?null:h.id);}}>{isOpen?"Cerrar":"Editar"}</button>
            </div>
            {isOpen&&(
              <div>
                <div style={Object.assign({},S.g2,{marginBottom:"12px"})}>
                  <div>
                    <label style={S.lbl}>Fee base (USD)</label>
                    <input style={S.inp} type="number" defaultValue={h.fee} onBlur={function(e){updHotel(h.id,"fee",parseFloat(e.target.value)||0);}}/>
                  </div>
                  <div>
                    <label style={S.lbl}>Categoria</label>
                    <select style={S.sel} value={h.cat} onChange={function(e){updHotel(h.id,"cat",e.target.value);}}>
                      <option value="3">3 estrellas</option>
                      <option value="4">4 estrellas</option>
                      <option value="5">5 estrellas</option>
                    </select>
                  </div>
                </div>
                <div style={{marginBottom:"12px"}}>
                  <div style={S.stit}>Habitaciones</div>
                  {h.habs.map(function(hab,hi){
                    return (
                      <div key={hab.id} style={{display:"grid",gridTemplateColumns:"1fr 90px 90px 70px",gap:"6px",marginBottom:"6px",alignItems:"center"}}>
                        <input style={S.inp} defaultValue={hab.nombre} onBlur={function(e){
                          var nh=h.habs.map(function(x,xi){return xi===hi?Object.assign({},x,{nombre:e.target.value}):x;});
                          updHab(h.id,nh);
                        }}/>
                        <select style={S.sel} value={String(hab.base)} onChange={function(e){
                          var nh=h.habs.map(function(x,xi){return xi===hi?Object.assign({},x,{base:e.target.value==="true"}):x;});
                          updHab(h.id,nh);
                        }}>
                          <option value="true">Incluida</option>
                          <option value="false">Upgrade</option>
                        </select>
                        <input style={S.inp} type="number" defaultValue={hab.up} placeholder="$upgrade" onBlur={function(e){
                          var nh=h.habs.map(function(x,xi){return xi===hi?Object.assign({},x,{up:parseFloat(e.target.value)||0}):x;});
                          updHab(h.id,nh);
                        }}/>
                        <button style={Object.assign({},btn("danger"),{padding:"6px 8px",fontSize:"11px"})} onClick={function(){
                          updHab(h.id,h.habs.filter(function(_,xi){return xi!==hi;}));
                        }}>Quitar</button>
                      </div>
                    );
                  })}
                  <button style={Object.assign({},btn("ghost"),{fontSize:"11px",marginTop:"4px"})} onClick={function(){
                    updHab(h.id,[].concat(h.habs,[{id:"n"+Date.now(),nombre:"Nueva habitacion",base:false,up:50}]));
                  }}>+ Habitacion</button>
                </div>
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                    <div style={S.stit}>Temporadas</div>
                    <button style={Object.assign({},btn("ghost"),{fontSize:"11px"})} onClick={function(){
                      updTemps(h.id,[].concat(h.temps||[],[{id:"tp"+Date.now(),nombre:"Nueva temporada",inicio:TODAY,fin:daysFromNow(7),surcharge:50}]));
                    }}>+ Agregar</button>
                  </div>
                  {(h.temps||[]).length===0&&<div style={{fontSize:"11px",color:"#9ca3af"}}>Sin temporadas configuradas</div>}
                  {(h.temps||[]).map(function(t,ti){
                    return (
                      <div key={t.id} style={{display:"grid",gridTemplateColumns:"1fr 120px 120px 90px 60px",gap:"6px",marginBottom:"6px",alignItems:"center"}}>
                        <input style={S.inp} defaultValue={t.nombre} onBlur={function(e){
                          var nt=h.temps.map(function(x,xi){return xi===ti?Object.assign({},x,{nombre:e.target.value}):x;});
                          updTemps(h.id,nt);
                        }}/>
                        <input style={S.inp} type="date" defaultValue={t.inicio} onBlur={function(e){
                          var nt=h.temps.map(function(x,xi){return xi===ti?Object.assign({},x,{inicio:e.target.value}):x;});
                          updTemps(h.id,nt);
                        }}/>
                        <input style={S.inp} type="date" defaultValue={t.fin} onBlur={function(e){
                          var nt=h.temps.map(function(x,xi){return xi===ti?Object.assign({},x,{fin:e.target.value}):x;});
                          updTemps(h.id,nt);
                        }}/>
                        <input style={S.inp} type="number" defaultValue={t.surcharge} placeholder="+$/noche" onBlur={function(e){
                          var nt=h.temps.map(function(x,xi){return xi===ti?Object.assign({},x,{surcharge:parseFloat(e.target.value)||0}):x;});
                          updTemps(h.id,nt);
                        }}/>
                        <button style={Object.assign({},btn("danger"),{padding:"5px 7px",fontSize:"11px"})} onClick={function(){
                          updTemps(h.id,h.temps.filter(function(_,xi){return xi!==ti;}));
                        }}>X</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CalView(props){
  var reservas=props.reservas;
  var now=new Date();
  var [anio,setAnio]=useState(now.getFullYear());
  var [mes,setMes]=useState(now.getMonth());
  var [selDia,setSelDia]=useState(TODAY);

  function prevMes(){ if(mes===0){setMes(11);setAnio(function(a){return a-1;});}else{setMes(function(m){return m-1;});} }
  function nextMes(){ if(mes===11){setMes(0);setAnio(function(a){return a+1;});}else{setMes(function(m){return m+1;});} }

  var mesNom=new Date(anio,mes,1).toLocaleDateString("es-MX",{month:"long",year:"numeric"});
  var primerDia=new Date(anio,mes,1).getDay();
  var diasMes=new Date(anio,mes+1,0).getDate();

  function diaStr(d){ return anio+"-"+pad2(mes+1)+"-"+pad2(d); }
  function resEnDia(d){
    var f=diaStr(d);
    var out=[];
    for(var i=0;i<reservas.length;i++){ if(f>=reservas[i].checkin&&f<reservas[i].checkout) out.push(reservas[i]); }
    return out;
  }

  var celdas=[];
  for(var i=0;i<primerDia;i++) celdas.push(0);
  for(var d=1;d<=diasMes;d++) celdas.push(d);

  var selRes=[];
  for(var ri=0;ri<reservas.length;ri++){
    if(selDia>=reservas[ri].checkin&&selDia<reservas[ri].checkout) selRes.push(reservas[ri]);
  }

  return (
    <div style={{display:"flex",gap:"16px",padding:"16px 24px",flexWrap:"wrap"}}>
      <div style={{flexShrink:0,flexGrow:0,flexBasis:"320px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <button style={btn("ghost")} onClick={prevMes}>{"<"}</button>
          <div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554",textTransform:"capitalize"}}>{mesNom}</div>
          <button style={btn("ghost")} onClick={nextMes}>{">"}</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px",marginBottom:"4px"}}>
          {["D","L","M","X","J","V","S"].map(function(d,i){
            return <div key={i} style={{textAlign:"center",fontSize:"10px",color:"#9ca3af",fontWeight:"700",padding:"3px 0"}}>{d}</div>;
          })}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px"}}>
          {celdas.map(function(d,i){
            if(!d) return <div key={"e"+i}/>;
            var f=diaStr(d);
            var rDia=resEnDia(d);
            var isToday=f===TODAY;
            var isSel=f===selDia;
            var tieneConf=rDia.some(function(r){return r.status==="confirmada";});
            var tienePend=rDia.some(function(r){return r.status==="solicitud"||r.status==="solicitada"||r.status==="vlo_proceso";});
            var dotCol=tieneConf?GREEN:(tienePend?AMBER:null);
            return (
              <div key={f} onClick={function(){setSelDia(f);}}
                style={{textAlign:"center",padding:"5px 2px",borderRadius:"7px",cursor:"pointer",background:isSel?"rgba(14,165,160,0.2)":(rDia.length>0?"rgba(99,102,241,0.08)":"transparent"),border:isToday?"1px solid rgba(14,165,160,0.4)":"1px solid transparent"}}>
                <div style={{fontSize:"12px",color:isSel?TEAL:(isToday?TEAL:"#3d4554"),fontWeight:isToday||isSel?"700":"400"}}>{d}</div>
                {dotCol&&<div style={{width:"5px",height:"5px",borderRadius:"50%",background:dotCol,margin:"1px auto 0"}}></div>}
              </div>
            );
          })}
        </div>
        <div style={{marginTop:"10px",display:"flex",gap:"10px",fontSize:"10px",color:"#9ca3af"}}>
          <span style={{display:"flex",alignItems:"center",gap:"3px"}}><span style={{width:"7px",height:"7px",borderRadius:"50%",background:GREEN,display:"inline-block"}}></span>Confirmada</span>
          <span style={{display:"flex",alignItems:"center",gap:"3px"}}><span style={{width:"7px",height:"7px",borderRadius:"50%",background:AMBER,display:"inline-block"}}></span>Pendiente</span>
        </div>
      </div>
      <div style={{flex:1,minWidth:"220px"}}>
        <div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554",marginBottom:"10px"}}>{fmtDate(selDia)}</div>
        {selRes.length===0&&<div style={{color:"#9ca3af",fontSize:"12px",padding:"20px 0"}}>Sin reservas activas este dia</div>}
        {selRes.map(function(r){
          var sc=STATUS[r.status]||STATUS.solicitud;
          return (
            <div key={r.id} style={Object.assign({},S.card,{cursor:"pointer",borderColor:sc.br})} onClick={function(){props.onSel(r);}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>{r.cliente}</div>
                  <div style={{fontSize:"11px",color:"#9ca3af"}}>{r.hotel} - {r.hab}</div>
                  <div style={{fontSize:"11px",color:"#9ca3af",marginTop:"2px"}}>{fmtDate(r.checkin)} al {fmtDate(r.checkout)}</div>
                </div>
                <span style={stBdg(r.status)}>{sc.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReservacionesModule(props){
  var [res,      setRes]      = useState([]);
  var [loading,  setLoading]  = useState(true);
  var [mainTab,  setMainTab]  = useState("reservaciones");
  var [view,     setView]     = useState("lista");
  var [rol,      setRol]      = useState("agente");
  var [fStatus,  setFStatus]  = useState("all");
  var [fDest,    setFDest]    = useState("all");
  var [fTipo,    setFTipo]    = useState("all");
  var [search,   setSearch]   = useState("");
  var [sel,      setSel]      = useState(null);
  var [formModal,setFormModal]= useState(null);
  var [vloModal, setVloModal] = useState(null);
  var [toast,    setToast]    = useState(null);
  var currentUser = props.currentUser || { nombre:"Agente", rol:"agente", id:null };
  var comm = useCommPanel();

  function notify(m){ setToast(m); setTimeout(function(){ setToast(null); }, 3000); }

  // ── Mapear fila de Supabase al formato interno
  function rvToLocal(rv) {
    return {
      id:          rv.id,
      folio:       rv.folio || rv.id,
      cFolio:      rv.lead_id || "",
      cliente:     rv.cliente_nombre || rv.agente_nombre || "",
      destino:     rv.destino_nombre || rv.destino_id || "",
      checkin:     rv.checkin  || "",
      checkout:    rv.checkout || "",
      hotel:       rv.hotel    || "",
      hab:         rv.habitacion || "",
      reg:         rv.regimen  || "",
      pax:         rv.adultos  || rv.pax || 2,
      adultos:     rv.adultos  || 2,
      ninos:       rv.ninos    || 0,
      nBase:       rv.noches_base  || 0,
      nExtra:      rv.noches_extra || 0,
      tipo:        rv.tipo     || "qc",
      status:      rv.status   || "solicitada",
      conf:        rv.num_confirmacion || "",
      fee:         rv.fee      || 0,
      upg:         rv.upgrade  || 0,
      temp:        rv.temporada_extra || 0,
      total:       rv.total    || 0,
      agente:      rv.agente_nombre || "",
      creado:      rv.created_at ? rv.created_at.split("T")[0] : TODAY,
      notasAgente: rv.notas_agente || "",
      notasHotel:  rv.notas_hotel  || "",
      hist:        rv.historial || [{f: rv.created_at ? rv.created_at.split("T")[0] : TODAY, t:"Reserva creada", a: rv.agente_nombre||"Sistema"}],
      lead_id:     rv.lead_id,
      ingresos:    rv.ingresos_anuales  || "",
      profTit:     rv.profesion_titular || "",
      profCo:      rv.profesion_coprop  || "",
    };
  }

  // ── Cargar desde Supabase
  function cargarReservas() {
    SB.from("reservaciones")
      .select("*, leads(nombre)")
      .order("created_at", { ascending: false })
      .then(function(r) {
        setLoading(false);
        if (r.error) { notify("Error al cargar: " + r.error.message); return; }
        var mapped = (r.data || []).map(function(rv) {
          var local = rvToLocal(rv);
          if (rv.leads && rv.leads.nombre) local.cliente = rv.leads.nombre;
          return local;
        });
        setRes(mapped);
      });
  }

  useEffect(function() {
    cargarReservas();
    var iv = setInterval(cargarReservas, 30000);
    return function() { clearInterval(iv); };
  }, []);

  function addHist(r, txt, autor) {
    return Object.assign({}, r, { hist: [{f:TODAY, t:txt, a:autor||"Sistema"}].concat(r.hist||[]) });
  }
  function upd(updated) {
    setRes(function(prev){ return prev.map(function(x){ return x.id===updated.id ? updated : x; }); });
    if (sel && sel.id===updated.id) setSel(updated);
  }

  function onNueva(data) {
    var folioNew = "RES-" + Math.random().toString(36).slice(2,8).toUpperCase();
    var dbData = {
      folio:          folioNew,
      lead_id:        data.lead_id || null,
      destino_nombre: data.destino || "",
      checkin:        data.checkin || null,
      checkout:       data.checkout || null,
      hotel:          data.hotel || "",
      habitacion:     data.hab || "",
      regimen:        data.reg || "",
      adultos:        data.pax || 2,
      pax:            data.pax || 2,
      tipo:           data.tipo || "qc",
      noches_base:    data.nBase || 0,
      noches_extra:   data.nExtra || 0,
      fee:            data.fee || 0,
      upgrade:        data.upg || 0,
      total:          data.total || 0,
      notas_agente:   data.notasAgente || "",
      agente_nombre:  data.agente || currentUser.nombre,
      status:         "solicitada",
      historial:      [{f:TODAY, t:"Solicitud creada", a:data.agente||currentUser.nombre}],
      ingresos_anuales: data.ingresos || null,
      profesion_titular: data.profTit || null,
      profesion_coprop:  data.profCo  || null,
    };
    SB.from("reservaciones").insert(dbData).then(function(r) {
      if (r.error) { notify("Error: " + r.error.message); return; }
      notify("Reserva " + folioNew + " creada");
      cargarReservas();
    });
  }

  function onEditar(data) {
    var updated = addHist(Object.assign({}, formModal, data), "Datos modificados", "Sistema");
    SB.from("reservaciones").update({
      destino_nombre: updated.destino,
      checkin:        updated.checkin,
      checkout:       updated.checkout,
      hotel:          updated.hotel,
      habitacion:     updated.hab,
      regimen:        updated.reg,
      adultos:        updated.pax,
      notas_agente:   updated.notasAgente,
      historial:      updated.hist,
    }).eq("id", updated.id).then(function(r) {
      if (r.error) { notify("Error: " + r.error.message); return; }
      upd(updated); setFormModal(null); notify("Actualizado");
    });
  }

  function onConfirmar(r, conf, notasH) {
    var updated = addHist(Object.assign({}, r, {status:"confirmada", conf:conf, notasHotel:notasH}), "Confirmada. No. "+conf, rol);
    SB.from("reservaciones").update({ status:"confirmada", num_confirmacion:conf, notas_hotel:notasH, historial:updated.hist }).eq("id", r.id)
    .then(function(res2) {
      if (res2.error) { notify("Error: " + res2.error.message); return; }
      upd(updated); notify("Confirmada");
    });
  }

  function onRechazar(r, motivo) {
    var updated = addHist(Object.assign({}, r, {status:"rechazado_hotel", notasHotel:motivo}), "Hotel rechaza: "+motivo, rol);
    SB.from("reservaciones").update({ status:"rechazado_hotel", motivo_rechazo:motivo, historial:updated.hist }).eq("id", r.id)
    .then(function(res2) {
      if (res2.error) { notify("Error: " + res2.error.message); return; }
      upd(updated); notify("Rechazada por hotel");
    });
  }

  function onCancelar(r) {
    var updated = addHist(Object.assign({}, r, {status:"cancelada"}), "Cancelada", "Sistema");
    SB.from("reservaciones").update({ status:"cancelada", historial:updated.hist }).eq("id", r.id)
    .then(function(res2) {
      if (res2.error) { notify("Error: " + res2.error.message); return; }
      upd(updated); notify("Cancelada");
    });
  }

  function onEnviarVLO(r) {
    var updated = addHist(Object.assign({}, r, {status:"vlo_proceso"}), "Enviada a VLO", rol);
    SB.from("reservaciones").update({ status:"vlo_proceso", historial:updated.hist }).eq("id", r.id)
    .then(function(res2) {
      if (res2.error) { notify("Error: " + res2.error.message); return; }
      upd(updated); notify("Enviada a VLO");
    });
  }

  var vloQ=res.filter(function(r){return r.status==="solicitud"||r.status==="solicitada"||r.status==="vlo_proceso";});
  var rechQ=res.filter(function(r){return r.status==="rechazado_hotel";});

  var esSupervisor = currentUser.rol === "supervisor" || currentUser.rol === "admin" || rol === "vlo" || rol === "supervisor";
  var filtered=res.filter(function(r){
    // Solo mis reservas, a menos que sea supervisor/vlo
    if (!esSupervisor && r.agente && currentUser.nombre && r.agente !== currentUser.nombre) return false;
    if(fStatus!=="all"&&r.status!==fStatus&&r.status!==(fStatus==="solicitud"?"solicitada":fStatus)) return false;
    if(fDest!=="all"&&r.destino!==fDest) return false;
    if(fTipo!=="all"&&r.tipo!==fTipo) return false;
    if(search){
      var s=search.toLowerCase();
      if(r.cliente.toLowerCase().indexOf(s)<0&&(r.folio||"").toLowerCase().indexOf(s)<0&&r.hotel.toLowerCase().indexOf(s)<0) return false;
    }
    return true;
  });

  var cnts={};
  Object.keys(STATUS).forEach(function(k){cnts[k]=res.filter(function(r){return r.status===k;}).length;});

  var ROLES=[{k:"agente",l:"Agente",alerta:rechQ.length},{k:"vlo",l:"VLO",alerta:vloQ.length},{k:"supervisor",l:"Supervisor",alerta:0}];

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#f4f5f7",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontSize:13,color:"#9ca3af"}}>Cargando reservaciones...</div>
    </div>
  );

  return (
    <div style={S.wrap}>
      {toast&&<div style={{position:"fixed",bottom:"24px",right:"24px",zIndex:9999,background:"rgba(14,165,160,0.95)",color:"#fff",padding:"10px 20px",borderRadius:"12px",fontSize:"13px",fontWeight:"600",boxShadow:"0 4px 20px rgba(0,0,0,0.5)"}}>{toast}</div>}
      {formModal==="nueva"&&<FormModal currentUser={currentUser} onClose={function(){setFormModal(null);}} onSave={onNueva}/>}
      {formModal&&formModal!=="nueva"&&<FormModal res={formModal} currentUser={currentUser} onClose={function(){setFormModal(null);}} onSave={onEditar}/>}
      {vloModal&&<VLOModal res={vloModal} onClose={function(){setVloModal(null);}} onConfirmar={onConfirmar} onRechazar={onRechazar} onCancelar={onCancelar} onEditar={function(r){setFormModal(r);}}/>}
      <CommPanel
        visible={comm.visible}
        cliente={comm.cliente}
        logs={comm.logs}
        currentUser={currentUser}
        onClose={comm.close}
        onLog={comm.addLog}
      />

      <div style={{padding:"10px 20px",background:"#fafbfc",borderBottom:"1px solid #e8eaed",display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
        <div style={{fontSize:"11px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.12em",textTransform:"uppercase"}}>Mini-Vac CRM</div>
        <div style={{width:"1px",height:"14px",background:"#f2f3f6"}}></div>
        <div style={{fontSize:"13px",fontWeight:"700",color:TEAL}}>Reservaciones</div>
        <div style={{flex:1}}></div>
        <div style={{display:"flex",gap:"4px"}}>
          <button style={tabS(mainTab==="reservaciones",TEAL)} onClick={function(){setMainTab("reservaciones");}}>Reservaciones</button>
          <button style={tabS(mainTab==="catalogo",INDIGO)} onClick={function(){setMainTab("catalogo");}}>Catalogo QC</button>
        </div>
        {mainTab==="reservaciones"&&(
          <div style={{display:"flex",gap:"4px"}}>
            {ROLES.map(function(r){
              return (
                <button key={r.k} style={tabS(rol===r.k,r.k==="vlo"?AMBER:INDIGO)} onClick={function(){setRol(r.k);}}>
                  {r.l}
                  {r.alerta>0&&<span style={{background:r.k==="vlo"?AMBER:CORAL,color:r.k==="vlo"?"#000":"#fff",borderRadius:"10px",padding:"1px 5px",fontSize:"10px",fontWeight:"800",marginLeft:"3px"}}>{r.alerta}</span>}
                </button>
              );
            })}
          </div>
        )}
        {mainTab==="reservaciones"&&(
          <div style={{display:"flex",gap:"4px"}}>
            <button style={tabS(view==="lista")} onClick={function(){setView("lista");}}>Lista</button>
            <button style={tabS(view==="calendario",TEAL)} onClick={function(){setView("calendario");}}>Calendario</button>
          </div>
        )}
      </div>

      {mainTab==="catalogo"&&<CatalogoView/>}
      {mainTab==="reservaciones"&&view==="calendario"&&<CalView reservas={res} onSel={function(r){setVloModal(r);}}/>}

      {mainTab==="reservaciones"&&view==="lista"&&(
        <div style={{display:"flex",height:"calc(100vh - 50px)"}}>

          {/* ─── COLUMNA IZQUIERDA: kanban por status ─── */}
          {!sel&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #e3e6ea",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",background:"#ffffff"}}>
                <input style={Object.assign({},S.inp,{maxWidth:260})} value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="Buscar cliente, folio..."/>
                <div style={{flex:1}}/>
                <button style={btn("teal")} onClick={function(){setFormModal("nueva");}}>+ Nueva reserva</button>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
                {[
                  {k:"solicitada",  l:"Solicitud",       c:"#f59e0b", bg:"rgba(245,158,11,0.08)"},
                  {k:"vlo_proceso", l:"VLO en proceso",  c:INDIGO,    bg:"#ebeffe"},
                  {k:"confirmada",  l:"Confirmada",       c:GREEN,     bg:"#eaf5ec"},
                  {k:"rechazado_hotel",l:"Rechazado hotel",c:CORAL,   bg:"rgba(249,115,22,0.08)"},
                  {k:"cancelada",   l:"Cancelada",        c:RED,       bg:"#fef0f0"},
                  {k:"completada",  l:"Completada",       c:"#9ca3af", bg:"#f4f5f7"},
                ].map(function(col){
                  var items = filtered.filter(function(r){ return r.status===col.k||(col.k==="solicitada"&&r.status==="solicitud"); });
                  if (items.length===0) return null;
                  return (
                    <div key={col.k} style={{marginBottom:18}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span style={{width:9,height:9,borderRadius:"50%",background:col.c,display:"inline-block",flexShrink:0}}/>
                        <span style={{fontSize:11,fontWeight:700,color:col.c,textTransform:"uppercase",letterSpacing:"0.08em"}}>{col.l}</span>
                        <span style={{background:col.bg,color:col.c,border:"1px solid "+col.c+"44",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{items.length}</span>
                      </div>
                      {items.map(function(r){
                        var sc = STATUS[r.status]||STATUS.solicitada;
                        var noches = nbDays(r.checkin, r.checkout);
                        return (
                          <div key={r.id} onClick={function(){setSel(r);}}
                            style={{background:"#ffffff",border:"1px solid #e3e6ea",borderLeft:"3px solid "+col.c,borderRadius:9,padding:"10px 14px",marginBottom:7,cursor:"pointer",transition:"box-shadow 0.15s"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                              <div style={{fontWeight:700,fontSize:13,color:"#1a1f2e"}}>{r.cliente||"Sin nombre"}</div>
                              <span style={{fontSize:10,color:"#9ca3af",fontWeight:500}}>{r.folio}</span>
                            </div>
                            <div style={{display:"flex",gap:10,fontSize:11,color:"#6b7280",flexWrap:"wrap"}}>
                              <span>&#127944; {r.destino||"--"}</span>
                              {r.checkin&&<span>&#128197; {fmtDate(r.checkin)}</span>}
                              {noches>0&&<span>{noches}n</span>}
                              {r.adultos>0&&<span>{r.adultos} adulto{r.adultos>1?"s":""}{r.ninos>0?", "+r.ninos+" nino"+(r.ninos>1?"s":""):""}</span>}
                            </div>
                            {r.notasAgente&&<div style={{fontSize:10,color:"#9ca3af",marginTop:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.notasAgente}</div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {filtered.length===0&&(
                  <div style={{textAlign:"center",padding:"48px 0",color:"#9ca3af"}}>
                    <div style={{fontSize:32,marginBottom:10}}>&#128197;</div>
                    <div style={{fontSize:13}}>No hay reservas asignadas</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── DETALLE derecha ─── */}
          {sel&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div style={{padding:"10px 16px",background:"#ffffff",borderBottom:"1px solid #e3e6ea",display:"flex",alignItems:"center",gap:8}}>
                <button style={btn("ghost")} onClick={function(){setSel(null);}}>&#8592; Reservas</button>
                <div style={{flex:1}}/>
                <CommPanelTrigger
                  cliente={{folio:sel.cFolio||sel.id,nombre:sel.cliente,membresia:sel.tipo||"",tel:"",whatsapp:"",email:""}}
                  onOpen={comm.open}
                />
                {(sel.status==="solicitada"||sel.status==="solicitud"||sel.status==="vlo_proceso")&&<button style={btn("indigo")} onClick={function(){setVloModal(sel);}}>Panel VLO</button>}
                {(sel.status==="solicitada"||sel.status==="solicitud"||sel.status==="rechazado_hotel")&&<button style={btn("warn")} onClick={function(){onEnviarVLO(sel);}}>Enviar a VLO</button>}
                {(sel.status==="solicitada"||sel.status==="solicitud"||sel.status==="rechazado_hotel")&&<button style={btn("teal")} onClick={function(){setFormModal(sel);}}>Modificar</button>}
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:18,fontWeight:800,color:"#1a1f2e"}}>{sel.cliente||"Sin nombre"}</div>
                  <div style={{fontSize:11,color:"#9ca3af"}}>{sel.folio}</div>
                </div>
                <Stepper status={sel.status}/>
                <CostRow r={sel}/>
                <div style={S.g2}>
                  <div style={S.card}>
                    <div style={S.stit}>Estancia</div>
                    {[["Destino",sel.destino],["Hotel",sel.hotel],["Habitacion",sel.hab],["Regimen",sel.reg],["Adultos",String(sel.adultos||sel.pax||0)],["Ninos",String(sel.ninos||0)],["Tipo",(sel.tipo||"").toUpperCase()]].map(function(row){
                      if(!row[1]) return null;
                      return <div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #edf0f3"}}><span style={{fontSize:11,color:"#9ca3af"}}>{row[0]}</span><span style={{fontSize:12,fontWeight:600,color:"#1a1f2e"}}>{row[1]}</span></div>;
                    })}
                  </div>
                  <div style={S.card}>
                    <div style={S.stit}>Fechas</div>
                    {[["Check-in",fmtDate(sel.checkin)],["Check-out",fmtDate(sel.checkout)],["Noches",String(nbDays(sel.checkin,sel.checkout))],["Agente",sel.agente],["Creada",fmtDate(sel.creado)]].map(function(row){
                      return <div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #edf0f3"}}><span style={{fontSize:11,color:"#9ca3af"}}>{row[0]}</span><span style={{fontSize:12,fontWeight:600,color:"#1a1f2e"}}>{row[1]}</span></div>;
                    })}
                  </div>
                </div>
                {sel.conf&&<div style={{padding:"9px 14px",borderRadius:9,background:"rgba(26,127,60,0.07)",border:"1px solid rgba(26,127,60,0.25)",marginBottom:8,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#9ca3af"}}>No. confirmacion:</span><span style={{fontSize:14,fontWeight:800,color:GREEN}}>{sel.conf}</span></div>}
                {sel.notasAgente&&<div style={Object.assign({},S.card,{borderColor:"rgba(245,158,11,0.2)"})}><div style={S.lbl}>Notas</div><div style={{fontSize:12,color:"#1a1f2e"}}>{sel.notasAgente}</div></div>}
                {sel.status==="rechazado_hotel"&&sel.notasHotel&&<div style={{padding:"9px 14px",borderRadius:9,background:"rgba(249,115,22,0.07)",border:"1px solid rgba(249,115,22,0.25)",marginBottom:8}}><div style={S.lbl}>Motivo rechazo</div><div style={{fontSize:12,color:CORAL}}>{sel.notasHotel}</div></div>}
                <div style={S.card}>
                  <div style={S.stit}>Historial</div>
                  {(sel.hist||[]).map(function(h,i){
                    return <div key={i} style={{display:"flex",gap:10,padding:"4px 0",borderBottom:"1px solid #edf0f3"}}><div style={{fontSize:10,color:"#9ca3af",width:88,flexShrink:0}}>{fmtDate(h.f)}</div><div style={{fontSize:11,color:"#1a1f2e",flex:1}}>{h.t}</div><div style={{fontSize:10,color:"#9ca3af"}}>{h.a}</div></div>;
                  })}
                </div>
                {sel.status!=="cancelada"&&sel.status!=="completada"&&(
                  <div style={{marginTop:8,textAlign:"right"}}>
                    <button style={btn("danger")} onClick={function(){onCancelar(sel);}}>Cancelar reserva</button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
