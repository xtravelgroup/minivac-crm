import { useState, useEffect, useRef } from "react";

var CHAT_KEY="minivac_chats";
function storageGet(){ return window.storage.get(CHAT_KEY,true).then(function(r){ return r?JSON.parse(r.value):{chats:{}}; }).catch(function(){return {chats:{}};}); }
function storageSave(data){ return window.storage.set(CHAT_KEY,JSON.stringify(data),true).catch(function(){}); }
function genId(){ return Date.now()+""+Math.floor(Math.random()*9999); }

var TODAY = new Date().toISOString().split("T")[0];
function fmtDate(d){ if(!d)return"--"; return new Date(d+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit",month:"long",year:"numeric"}); }
function fmtUSD(n){ return "$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function daysUntil(d){ if(!d)return null; return Math.ceil((new Date(d+"T12:00:00")-new Date())/86400000); }
function daysAgo(n){ var d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split("T")[0]; }
function daysFromNow(n){ var d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; }

var TEAL="#1a385a",INDIGO="#47718a",VIOLET="#282828",GREEN="#065f46",AMBER="#b45309",RED="#991b1b",CORAL="#47718a",BLUE="#1a385a";

var DEMO_ACCOUNTS = {
  "miguel@email.com":{
    password:"demo1234",folio:"XT-1001",titular:"Miguel Torres",coProp:"Sandra Torres",
    tel:"33-1234-5678",email:"miguel@email.com",
    fechaVenta:daysAgo(365),fechaVencimiento:daysFromNow(365),
    precioTotal:4800,pagado:2800,
    cardLast4:"4521",cardBanco:"BBVA",cardTipo:"Visa",
    destinos:[
      {id:"D01",nombre:"Cancun",noches:5,tipo:"qc",
       img:"https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=600&q=80",
       desc:"Playas de arena blanca y aguas turquesa en el Caribe mexicano."},
      {id:"D03",nombre:"Riviera Maya",noches:6,tipo:"qc",
       img:"https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=600&q=80",
       desc:"Cenotes, selva y resorts de lujo a lo largo de la costa."},
    ],
    pagos:[
      {fecha:daysAgo(365),monto:800,tipo:"Enganche",status:"aprobado",ref:"TXN-001"},
      {fecha:daysAgo(200),monto:1000,tipo:"Abono",status:"aprobado",ref:"TXN-002"},
      {fecha:daysAgo(90),monto:1000,tipo:"Abono",status:"aprobado",ref:"TXN-003"},
    ],
    reservaciones:[
      {id:"R001",destino:"Cancun",fechaViaje:daysFromNow(45),personas:2,
       status:"confirmada",notas:"Preferencia hab. con vista al mar",
       hotel:{nombre:"Krystal Grand Cancun Resort",conf:"KGC-44821",hab:"Deluxe Oceano King",reg:"Todo incluido",
              img:"https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80"}},
      {id:"R002",destino:"Riviera Maya",fechaViaje:daysFromNow(120),personas:2,
       status:"en_proceso",notas:"Zona tranquila preferible",hotel:null},
    ],
    status:"activo",
  },
  "patricia@email.com":{
    password:"demo1234",folio:"XT-1002",titular:"Patricia Sanchez",coProp:null,
    tel:"33-2345-6789",email:"patricia@email.com",
    fechaVenta:daysAgo(180),fechaVencimiento:daysFromNow(540),
    precioTotal:2200,pagado:2200,
    cardLast4:"9834",cardBanco:"Banorte",cardTipo:"Mastercard",
    destinos:[
      {id:"D02",nombre:"Los Cabos",noches:4,tipo:"qc",
       img:"https://images.unsplash.com/photo-1503917988258-f87a78e3c995?w=600&q=80",
       desc:"Donde el desierto se encuentra con el mar. El Arco y aguas cristalinas."},
    ],
    pagos:[
      {fecha:daysAgo(180),monto:2200,tipo:"Pago unico",status:"aprobado",ref:"TXN-010"},
    ],
    reservaciones:[],
    status:"activo",
  },
};

var REGALOS_CATALOG = {
  "Cancun":   {incluidos:["Traslado aeropuerto","Certificado Spa","All-Inclusive"],opcionales:["Tour Chichen Itza","Tour snorkel Isla Mujeres","Gift Card $75 USD"]},
  "Riviera Maya":{incluidos:["Traslado aeropuerto","All-Inclusive","Cena romantica"],opcionales:["Tour Tulum + Cenote","Snorkel en arrecife","Gift Card $75 USD"]},
  "Los Cabos":{incluidos:["Traslado aeropuerto","All-Inclusive"],opcionales:["Cena romantica en la playa","Tour en lancha al Arco","Gift Card $75 USD"]},
  "Puerto Vallarta":{incluidos:["Traslado aeropuerto","Cena romantica"],opcionales:["Tour Bahia Banderas","Gift Card $50 USD"]},
  "Huatulco": {incluidos:["Traslado aeropuerto","Desayunos incluidos"],opcionales:["Tour catamaran bahias","Gift Card $50 USD"]},
  "Las Vegas": {incluidos:["Traslado aeropuerto","Late check-out"],opcionales:["$50 credito casino","Show ticket (2 personas)","Gift Card $100 USD"]},
  "Orlando":   {incluidos:["Traslado aeropuerto","Desayunos incluidos"],opcionales:["Gift Card $100 USD","2 entradas parque de agua","2 entradas Disney (1 dia)"]},
};

var S={
  wrap:  {minHeight:"100vh",background:"#f0f2f5",color:"#282828",fontFamily:"'Poppins','Segoe UI',sans-serif",fontSize:"13px"},
  card:  {background:"#fff",border:"1px solid #e5e7eb",boxShadow:"0 1px 3px rgba(26,56,90,0.06)",borderRadius:"14px",padding:"16px 18px",marginBottom:"10px"},
  inp:   {width:"100%",background:"#fff",border:"1px solid #d0d5dd",borderRadius:"8px",padding:"9px 12px",color:"#282828",fontSize:"13px",outline:"none",boxSizing:"border-box",fontFamily:"inherit"},
  lbl:   {fontSize:"11px",color:"#6b7280",marginBottom:"4px",fontWeight:"500",display:"block"},
  stit:  {fontSize:"10px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"8px"},
  g2:    {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"},
};
function btn(v){
  var m={primary:{bg:TEAL,c:"#fff",br:TEAL},teal:{bg:"rgba(14,165,160,0.15)",c:TEAL,br:"rgba(14,165,160,0.3)"},ghost:{bg:"#f6f7f9",c:"#6b7280",br:"#f0f1f4"},indigo:{bg:"#e5eafd",c:INDIGO,br:"#aab4f5"},danger:{bg:"#fdeaea",c:RED,br:"#f5b8b8"},amber:{bg:"rgba(245,158,11,0.15)",c:AMBER,br:"rgba(245,158,11,0.3)"}};
  var s=m[v]||m.ghost;
  return {display:"inline-flex",alignItems:"center",gap:"5px",padding:"8px 16px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:"600",background:s.bg,color:s.c,border:"1px solid "+s.br,whiteSpace:"nowrap"};
}
function btnSm(v){
  var m={primary:{bg:TEAL,c:"#fff",br:TEAL},teal:{bg:"rgba(14,165,160,0.15)",c:TEAL,br:"rgba(14,165,160,0.3)"},ghost:{bg:"#f6f7f9",c:"#6b7280",br:"#f0f1f4"},indigo:{bg:"#e5eafd",c:INDIGO,br:"#aab4f5"},danger:{bg:"#fdeaea",c:RED,br:"#f5b8b8"},amber:{bg:"rgba(245,158,11,0.15)",c:AMBER,br:"rgba(245,158,11,0.3)"}};
  var s=m[v]||m.ghost;
  return {display:"inline-flex",alignItems:"center",gap:"5px",padding:"5px 11px",borderRadius:"8px",cursor:"pointer",fontSize:"11px",fontWeight:"600",background:s.bg,color:s.c,border:"1px solid "+s.br,whiteSpace:"nowrap"};
}
function tabS(a,col){var c=col||TEAL; return {padding:"8px 16px",borderRadius:"9px",cursor:"pointer",fontSize:"12px",fontWeight:a?"700":"400",background:a?(c+"22"):"transparent",color:a?c:"#9ca3af",border:a?("1px solid "+c+"44"):"1px solid transparent",whiteSpace:"nowrap"};}
function bdg(c,bg,br){return {display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:"20px",fontSize:"11px",fontWeight:"600",color:c,background:bg,border:"1px solid "+br};}

var RES_STATUS={
  confirmada: {label:"Confirmada",  c:GREEN, bg:"#edf7ee",  br:"#a3d9a5"},
  en_proceso: {label:"En proceso",  c:AMBER, bg:"rgba(245,158,11,0.1)", br:"rgba(245,158,11,0.3)"},
  solicitud:  {label:"Solicitud",   c:BLUE,  bg:"#e8f0fe",  br:"#aac4f0"},
  cancelada:  {label:"Cancelada",   c:RED,   bg:"#fef2f2", br:"#f5b8b8"},
  completada: {label:"Completada",  c:"#9ca3af",bg:"rgba(100,116,139,0.1)",br:"rgba(100,116,139,0.25)"},
};

function LoginScreen(props){
  var [email,setEmail]=useState("miguel@email.com");
  var [pass,setPass]=useState("demo1234");
  var [err,setErr]=useState("");
  function doLogin(){
    var acc=DEMO_ACCOUNTS[email.trim().toLowerCase()];
    if(!acc||acc.password!==pass){ setErr("Email o contrasena incorrectos"); return; }
    props.onLogin(acc);
  }
  return (
    <div style={{minHeight:"100vh",background:"#f0f2f5",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{width:"100%",maxWidth:"380px"}}>
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div style={{fontSize:"18px",fontWeight:"700",color:"#1a385a",letterSpacing:"-0.3px"}}>TRAVEL<span style={{color:"#47718a"}}>X</span><span style={{fontWeight:"300",fontSize:"14px"}}> GROUP</span></div>
          <div style={{fontSize:"12px",color:"#9ca3af",marginTop:"4px"}}>Portal del Socio</div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:"16px",padding:"24px 22px",boxShadow:"0 4px 16px rgba(26,56,90,0.1)"}}>
          <div style={{marginBottom:"14px"}}>
            <label style={S.lbl}>Correo electronico</label>
            <input style={S.inp} value={email} onChange={function(e){setEmail(e.target.value);setErr("");}} placeholder="tucorreo@email.com"/>
          </div>
          <div style={{marginBottom:"18px"}}>
            <label style={S.lbl}>Contrasena</label>
            <input style={S.inp} type="password" value={pass} onChange={function(e){setPass(e.target.value);setErr("");}} placeholder="********"/>
          </div>
          {err&&<div style={{fontSize:"12px",color:RED,marginBottom:"12px",padding:"8px 12px",background:"rgba(248,113,113,0.08)",borderRadius:"8px",border:"1px solid rgba(248,113,113,0.2)"}}>{err}</div>}
          <button style={Object.assign({},btn("primary"),{width:"100%",justifyContent:"center",padding:"10px"})} onClick={doLogin}>Entrar</button>
          <div style={{marginTop:"14px",padding:"10px 12px",background:"rgba(14,165,160,0.06)",borderRadius:"8px",border:"1px solid rgba(14,165,160,0.15)"}}>
            <div style={{fontSize:"10px",color:"#9ca3af",fontWeight:"700",marginBottom:"4px"}}>Cuentas demo:</div>
            <div style={{fontSize:"11px",color:"#9ca3af"}}>miguel@email.com / demo1234</div>
            <div style={{fontSize:"11px",color:"#9ca3af"}}>patricia@email.com / demo1234</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabInicio(props){
  var u=props.user;
  var saldo=u.precioTotal-u.pagado;
  var pct=Math.round((u.pagado/u.precioTotal)*100);
  var dias=daysUntil(u.fechaVencimiento);
  var vigOk=dias>0;
  var proxRes=null;
  for(var i=0;i<u.reservaciones.length;i++){
    var r=u.reservaciones[i];
    if(r.status==="confirmada"&&r.fechaViaje>=TODAY){
      if(!proxRes||r.fechaViaje<proxRes.fechaViaje) proxRes=r;
    }
  }
  return (
    <div>
      <div style={{background:"linear-gradient(135deg,#1a385a,#47718a)",border:"none",borderRadius:"16px",padding:"20px 22px",marginBottom:"12px"}}>
        <div style={{fontSize:"11px",color:"rgba(255,255,255,0.65)",fontWeight:"600",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"6px"}}>Bienvenido de regreso</div>
        <div style={{fontSize:"20px",fontWeight:"700",color:"#fff",marginBottom:"4px"}}>{u.titular}{u.coProp?" + "+u.coProp:""}</div>
        <div style={{fontSize:"11px",color:"rgba(255,255,255,0.65)"}}>Folio: <span style={{color:"#fff",fontWeight:"600"}}>{u.folio}</span> - {u.destinos.length} destino{u.destinos.length>1?"s":""} incluido{u.destinos.length>1?"s":""}</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"12px"}}>
        <div style={Object.assign({},S.card,{borderColor:"rgba(14,165,160,0.2)"})}>
          <div style={S.lbl}>Saldo pendiente</div>
          <div style={{fontSize:"20px",fontWeight:"800",color:saldo>0?AMBER:GREEN}}>{fmtUSD(saldo)}</div>
          <div style={{marginTop:"8px",height:"5px",background:"#e5e7eb",borderRadius:"4px",overflow:"hidden"}}>
            <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#1a385a,#47718a)",borderRadius:"4px"}}></div>
          </div>
          <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"4px"}}>{pct}% pagado ({fmtUSD(u.pagado)} de {fmtUSD(u.precioTotal)})</div>
        </div>
        <div style={Object.assign({},S.card,{borderColor:vigOk?"rgba(74,222,128,0.2)":"rgba(248,113,113,0.2)"})}>
          <div style={S.lbl}>Vigencia</div>
          <div style={{fontSize:"16px",fontWeight:"700",color:vigOk?GREEN:RED}}>{fmtDate(u.fechaVencimiento)}</div>
          <div style={{fontSize:"11px",color:vigOk?GREEN:RED,marginTop:"4px"}}>{vigOk?dias+" dias restantes":"Vencida"}</div>
        </div>
      </div>

      {proxRes&&(
        <div style={Object.assign({},S.card,{borderColor:"rgba(14,165,160,0.25)",marginBottom:"12px"})}>
          <div style={S.stit}>Proximo viaje</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"8px"}}>
            <div>
              <div style={{fontSize:"15px",fontWeight:"700",color:"#3d4554"}}>{proxRes.destino}</div>
              <div style={{fontSize:"12px",color:"#9ca3af",marginTop:"2px"}}>{fmtDate(proxRes.fechaViaje)} - {proxRes.personas} persona{proxRes.personas>1?"s":""}</div>
              {proxRes.hotel&&<div style={{fontSize:"11px",color:TEAL,marginTop:"2px"}}>{proxRes.hotel.nombre} - Conf. {proxRes.hotel.conf}</div>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <span style={bdg(GREEN,"#edf7ee","#a3d9a5")}>Confirmada</span>
              <div style={{fontSize:"13px",fontWeight:"700",color:TEAL}}>{daysUntil(proxRes.fechaViaje)} dias</div>
            </div>
          </div>
        </div>
      )}

      <div style={S.card}>
        <div style={S.stit}>Mis destinos</div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
          {u.destinos.map(function(d){
            var resD=null;
            for(var ri=0;ri<u.reservaciones.length;ri++){
              if(u.reservaciones[ri].destino===d.nombre&&u.reservaciones[ri].status!=="cancelada"){resD=u.reservaciones[ri];break;}
            }
            return (
              <div key={d.id} onClick={function(){props.onTabChange("destinos");}} style={{flex:"1 1 140px",cursor:"pointer",background:"#f9fafb",border:"1px solid #e3e6ea",borderRadius:"12px",overflow:"hidden"}}>
                <div style={{height:"70px",background:"url("+d.img+") center/cover",position:"relative"}}>
                  <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.35)"}}></div>
                  <div style={{position:"absolute",bottom:"6px",left:"10px",fontSize:"12px",fontWeight:"700",color:"#fff"}}>{d.nombre}</div>
                </div>
                <div style={{padding:"8px 10px"}}>
                  <div style={{fontSize:"11px",color:"#9ca3af"}}>{d.noches} noches - {d.tipo.toUpperCase()}</div>
                  {resD&&(function(){
                    var sc3=RES_STATUS[resD.status];
                    return <div style={{fontSize:"10px",color:sc3?sc3.c:AMBER,marginTop:"2px"}}>{sc3?sc3.label:resD.status}</div>;
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TabDestinos(props){
  var u=props.user;
  var [sel,setSel]=useState(null);
  var [regalosSel,setRegalosSel]=useState({});
  var [confirmado,setConfirmado]=useState({});
  var dest=sel||u.destinos[0];
  var regalos=REGALOS_CATALOG[dest.nombre]||{incluidos:[],opcionales:[]};
  var resD=null;
  for(var ri=0;ri<u.reservaciones.length;ri++){
    if(u.reservaciones[ri].destino===dest.nombre&&u.reservaciones[ri].status!=="cancelada"){resD=u.reservaciones[ri];break;}
  }
  var regKey=dest.nombre;
  var selActual=regalosSel[regKey]||null;
  var yaConfirmado=confirmado[regKey]||false;
  function selRegalo(r){
    if(yaConfirmado) return;
    setRegalosSel(function(prev){ return Object.assign({},prev,{[regKey]:r}); });
  }
  function confirmarRegalo(){
    if(!selActual) return;
    setConfirmado(function(prev){ return Object.assign({},prev,{[regKey]:true}); });
  }
  return (
    <div>
      {u.destinos.length>1&&(
        <div style={{display:"flex",gap:"5px",marginBottom:"14px"}}>
          {u.destinos.map(function(d){
            var isA=dest.id===d.id;
            return <button key={d.id} style={tabS(isA,TEAL)} onClick={function(){setSel(d);}}>{d.nombre}</button>;
          })}
        </div>
      )}
      <div style={{borderRadius:"16px",overflow:"hidden",marginBottom:"12px",position:"relative",height:"160px"}}>
        <img src={dest.img} alt={dest.nombre} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(7,9,15,0.85),transparent)"}}></div>
        <div style={{position:"absolute",bottom:"14px",left:"16px"}}>
          <div style={{fontSize:"20px",fontWeight:"800",color:"#1a1f2e"}}>{dest.nombre}</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.7)"}}>{dest.noches} noches - {dest.tipo.toUpperCase()}</div>
        </div>
      </div>
      <div style={{fontSize:"12px",color:"#6b7280",marginBottom:"12px",lineHeight:"1.6"}}>{dest.desc}</div>

      {resD&&(
        <div style={Object.assign({},S.card,{borderColor:RES_STATUS[resD.status]?RES_STATUS[resD.status].br:"#f2f3f6",marginBottom:"12px"})}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={S.stit}>Reserva activa</div>
              <div style={{fontSize:"13px",fontWeight:"600",color:"#3d4554"}}>{fmtDate(resD.fechaViaje)} - {resD.personas} persona{resD.personas>1?"s":""}</div>
              {resD.hotel&&<div style={{fontSize:"11px",color:TEAL,marginTop:"3px"}}>{resD.hotel.nombre}{resD.hotel.conf?" - Conf: "+resD.hotel.conf:""}</div>}
              {resD.hotel&&<div style={{fontSize:"11px",color:"#9ca3af",marginTop:"2px"}}>{resD.hotel.hab} - {resD.hotel.reg}</div>}
              {!resD.hotel&&<div style={{fontSize:"11px",color:AMBER,marginTop:"3px"}}>Hotel en proceso de confirmacion</div>}
            </div>
            {(function(){
              var sc2=RES_STATUS[resD.status];
              var bdgS=sc2?bdg(sc2.c,sc2.bg,sc2.br):bdg(AMBER,"rgba(245,158,11,0.1)","rgba(245,158,11,0.3)");
              return <span style={bdgS}>{sc2?sc2.label:resD.status}</span>;
            })()}
          </div>
        </div>
      )}
      {!resD&&(
        <div style={{padding:"14px 16px",borderRadius:"12px",background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.2)",marginBottom:"12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:"12px",color:"#6b7280"}}>Sin reserva activa para este destino</div>
          <button style={btnSm("indigo")}>Solicitar reserva</button>
        </div>
      )}

      <div style={S.card}>
        <div style={S.stit}>Beneficios incluidos</div>
        {regalos.incluidos.map(function(r,i){
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"5px 0",borderBottom:"1px solid #edf0f3"}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:TEAL,flexShrink:0}}></div>
              <div style={{fontSize:"12px",color:"#3d4554"}}>{r}</div>
            </div>
          );
        })}
      </div>

      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
          <div style={S.stit}>Elige tu regalo opcional</div>
          {yaConfirmado&&<span style={bdg(GREEN,"#edf7ee","#a3d9a5")}>Confirmado</span>}
        </div>
        {yaConfirmado&&(
          <div style={{padding:"10px 12px",borderRadius:"10px",background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.2)",fontSize:"12px",color:GREEN}}>
            Tu regalo elegido: <strong>{selActual}</strong>. Nuestro equipo lo coordinara para tu llegada.
          </div>
        )}
        {!yaConfirmado&&(
          <div>
            <div style={{fontSize:"11px",color:"#9ca3af",marginBottom:"10px"}}>Selecciona uno de los siguientes regalos para tu viaje a {dest.nombre}:</div>
            {regalos.opcionales.map(function(r,i){
              var isSel=selActual===r;
              var rowBg=isSel?"rgba(14,165,160,0.08)":"transparent";
              var rowBr=isSel?"rgba(14,165,160,0.35)":"#f8f9fb";
              return (
                <div key={i} onClick={function(){selRegalo(r);}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:"10px",marginBottom:"5px",cursor:"pointer",background:rowBg,border:"1px solid "+rowBr}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <div style={{width:"8px",height:"8px",borderRadius:"50%",background:isSel?TEAL:"#e4e7eb",border:"2px solid "+(isSel?TEAL:"rgba(255,255,255,0.2)"),flexShrink:0}}></div>
                    <div style={{fontSize:"12px",color:isSel?"#3d4554":"#6b7280",fontWeight:isSel?"600":"400"}}>{r}</div>
                  </div>
                  {isSel&&<span style={{fontSize:"10px",color:TEAL,fontWeight:"700"}}>Seleccionado</span>}
                </div>
              );
            })}
            <div style={{marginTop:"12px",display:"flex",justifyContent:"flex-end"}}>
              <button style={selActual?btnSm("teal"):Object.assign({},btnSm("ghost"),{opacity:"0.4",cursor:"not-allowed"})} onClick={confirmarRegalo} disabled={!selActual}>Confirmar regalo</button>
            </div>
            {!selActual&&<div style={{fontSize:"10px",color:"#9ca3af",textAlign:"right",marginTop:"4px"}}>Selecciona un regalo para continuar</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function TabReservas(props){
  var u=props.user;
  if(u.reservaciones.length===0){
    return (
      <div style={{textAlign:"center",padding:"40px 20px"}}>
        <div style={{fontSize:"32px",marginBottom:"10px"}}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div style={{fontSize:"13px",color:"#9ca3af",marginBottom:"12px"}}>Sin reservaciones aun</div>
        <button style={btn("teal")}>Solicitar mi primera reserva</button>
      </div>
    );
  }
  return (
    <div>
      {u.reservaciones.map(function(r){
        var sc=RES_STATUS[r.status]||RES_STATUS.solicitud;
        return (
          <div key={r.id} style={Object.assign({},S.card,{borderColor:sc.br})}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
              <div>
                <div style={{fontSize:"14px",fontWeight:"700",color:"#3d4554"}}>{r.destino}</div>
                <div style={{fontSize:"11px",color:"#9ca3af"}}>{fmtDate(r.fechaViaje)} - {r.personas} persona{r.personas>1?"s":""}</div>
              </div>
              <span style={bdg(sc.c,sc.bg,sc.br)}>{sc.label}</span>
            </div>
            {r.hotel&&(
              <div style={{display:"flex",gap:"10px",alignItems:"flex-start"}}>
                <img src={r.hotel.img} alt={r.hotel.nombre} style={{width:"64px",height:"48px",objectFit:"cover",borderRadius:"8px",flexShrink:0}}/>
                <div>
                  <div style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>{r.hotel.nombre}</div>
                  <div style={{fontSize:"11px",color:"#9ca3af",marginTop:"1px"}}>{r.hotel.hab} - {r.hotel.reg}</div>
                  {r.hotel.conf&&<div style={{fontSize:"11px",color:GREEN,marginTop:"1px",fontWeight:"600"}}>Conf: {r.hotel.conf}</div>}
                </div>
              </div>
            )}
            {!r.hotel&&r.status==="en_proceso"&&(
              <div style={{fontSize:"11px",color:AMBER,padding:"6px 10px",background:"rgba(245,158,11,0.08)",borderRadius:"7px",border:"1px solid rgba(245,158,11,0.2)"}}>Nuestro equipo esta gestionando tu hotel. Te notificaremos pronto.</div>
            )}
            {r.notas&&<div style={{marginTop:"8px",fontSize:"11px",color:"#9ca3af"}}>Nota: {r.notas}</div>}
          </div>
        );
      })}
    </div>
  );
}

function TabPagos(props){
  var u=props.user;
  var saldo=u.precioTotal-u.pagado;
  var pct=Math.round((u.pagado/u.precioTotal)*100);
  var [showPago,setShowPago]=useState(false);
  var [monto,setMonto]=useState("");
  var [metodo,setMetodo]=useState("Tarjeta");
  var [ref2,setRef2]=useState("");
  var [pagos,setPagos]=useState(u.pagos);
  var [success,setSuccess]=useState(false);

  function registrarPago(){
    var m=parseFloat(monto)||0;
    if(m<=0) return;
    var np={fecha:TODAY,monto:m,tipo:"Abono",status:"pendiente",ref:ref2||"MANUAL-"+Date.now()};
    setPagos(function(prev){return [np].concat(prev);});
    setSuccess(true);
    setShowPago(false);
    setMonto(""); setRef2("");
    setTimeout(function(){setSuccess(false);},3000);
  }

  var bannerStyle={padding:"10px 14px",borderRadius:"10px",background:"#edf7ee",border:"1px solid rgba(74,222,128,0.3)",marginBottom:"10px",fontSize:"12px",color:GREEN};
  var successBanner=success?<div style={bannerStyle}>Pago registrado. Nuestro equipo lo validara en breve.</div>:null;
  return (
    <div>
      {successBanner}
      <div style={Object.assign({},S.card,{borderColor:"rgba(14,165,160,0.2)",marginBottom:"12px"})}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px"}}>
          <div>
            <div style={S.lbl}>Resumen financiero</div>
            <div style={{fontSize:"11px",color:"#9ca3af"}}>Total: {fmtUSD(u.precioTotal)} - Pagado: {fmtUSD(u.pagado)}</div>
          </div>
          {saldo>0&&<button style={btnSm("teal")} onClick={function(){setShowPago(true);}}>+ Registrar pago</button>}
        </div>
        <div style={{height:"6px",background:"#f6f7f9",borderRadius:"6px",overflow:"hidden",marginBottom:"6px"}}>
          <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,#1a385a,#47718a)",borderRadius:"6px"}}></div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px"}}>
          <span style={{color:"#9ca3af"}}>{pct}% cubierto</span>
          {saldo>0?<span style={{color:AMBER,fontWeight:"600"}}>Saldo: {fmtUSD(saldo)}</span>:<span style={{color:GREEN,fontWeight:"600"}}>Liquidado</span>}
        </div>
      </div>

      {showPago&&(
        <div style={Object.assign({},S.card,{borderColor:"rgba(14,165,160,0.3)",marginBottom:"12px"})}>
          <div style={{fontSize:"13px",fontWeight:"700",color:TEAL,marginBottom:"12px"}}>Registrar abono</div>
          <div style={Object.assign({},S.g2,{marginBottom:"10px"})}>
            <div>
              <label style={S.lbl}>Monto (USD)</label>
              <input style={S.inp} type="number" value={monto} onChange={function(e){setMonto(e.target.value);}} placeholder="0.00"/>
            </div>
            <div>
              <label style={S.lbl}>Metodo de pago</label>
              <select style={Object.assign({},S.inp,{cursor:"pointer"})} value={metodo} onChange={function(e){setMetodo(e.target.value);}}>
                <option>Tarjeta</option>
                <option>Transferencia</option>
                <option>Efectivo</option>
              </select>
            </div>
          </div>
          <div style={{marginBottom:"12px"}}>
            <label style={S.lbl}>Referencia / No. de operacion</label>
            <input style={S.inp} value={ref2} onChange={function(e){setRef2(e.target.value);}} placeholder="Opcional"/>
          </div>
          <div style={{display:"flex",gap:"7px",justifyContent:"flex-end"}}>
            <button style={btnSm("ghost")} onClick={function(){setShowPago(false);}}>Cancelar</button>
            <button style={btnSm("teal")} onClick={registrarPago} disabled={!monto}>Enviar</button>
          </div>
        </div>
      )}

      <div style={S.stit}>Historial de pagos</div>
      {pagos.map(function(p,i){
        var isOk=p.status==="aprobado";
        var isPend=p.status==="pendiente";
        return (
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            <div>
              <div style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>{p.tipo}</div>
              <div style={{fontSize:"10px",color:"#9ca3af"}}>{fmtDate(p.fecha)}{p.ref?" - "+p.ref:""}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:"13px",fontWeight:"700",color:isOk?GREEN:(isPend?AMBER:"#3d4554")}}>{fmtUSD(p.monto)}</div>
              {(function(){
                var pc=isOk?GREEN:(isPend?AMBER:"#9ca3af");
                var pb=isOk?"rgba(74,222,128,0.08)":(isPend?"rgba(245,158,11,0.08)":"rgba(100,116,139,0.1)");
                var pbr=isOk?"rgba(74,222,128,0.2)":(isPend?"rgba(245,158,11,0.2)":"rgba(100,116,139,0.2)");
                var pl=isOk?"Aprobado":(isPend?"Pendiente":"Rechazado");
                return <span style={bdg(pc,pb,pbr)}>{pl}</span>;
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabPerfil(props){
  var u=props.user;
  var [edit,setEdit]=useState(false);
  var [tel,setTel]=useState(u.tel);
  var [email,setEmail]=useState(u.email);
  return (
    <div>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
          <div style={S.stit}>Datos del titular</div>
          <button style={edit?btnSm("teal"):btnSm("ghost")} onClick={function(){setEdit(!edit);}}>{edit?"Guardar":"Editar"}</button>
        </div>
        {[["Nombre",u.titular],["Copropietario",u.coProp||"--"],["Folio",u.folio]].map(function(row){
          return <div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #edf0f3"}}><span style={{fontSize:"11px",color:"#9ca3af"}}>{row[0]}</span><span style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>{row[1]}</span></div>;
        })}
        <div style={{padding:"5px 0",borderBottom:"1px solid #edf0f3",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:"11px",color:"#9ca3af"}}>Telefono</span>
          {edit?<input style={Object.assign({},S.inp,{width:"160px",padding:"4px 8px",fontSize:"12px"})} value={tel} onChange={function(e){setTel(e.target.value);}}/>:<span style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>{tel}</span>}
        </div>
        <div style={{padding:"5px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:"11px",color:"#9ca3af"}}>Email</span>
          {edit?<input style={Object.assign({},S.inp,{width:"190px",padding:"4px 8px",fontSize:"12px"})} value={email} onChange={function(e){setEmail(e.target.value);}}/>:<span style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>{email}</span>}
        </div>
      </div>

      <div style={S.card}>
        <div style={S.stit}>Membresia</div>
        {[["Fecha de compra",fmtDate(u.fechaVenta)],["Fecha de vencimiento",fmtDate(u.fechaVencimiento)],["Destinos incluidos",u.destinos.length+" destino"+(u.destinos.length>1?"s":"")]].map(function(row){
          return <div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #edf0f3"}}><span style={{fontSize:"11px",color:"#9ca3af"}}>{row[0]}</span><span style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>{row[1]}</span></div>;
        })}
      </div>

      <div style={S.card}>
        <div style={S.stit}>Metodo de pago registrado</div>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:"40px",height:"26px",background:"#e5eafd",border:"1px solid rgba(99,102,241,0.3)",borderRadius:"5px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:"700",color:INDIGO}}>{u.cardTipo}</div>
          <div>
            <div style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>{u.cardBanco} {u.cardTipo} ****{u.cardLast4}</div>
            <div style={{fontSize:"10px",color:"#9ca3af"}}>Tarjeta principal</div>
          </div>
        </div>
      </div>

      <button style={Object.assign({},btn("danger"),{width:"100%",justifyContent:"center",marginTop:"6px"})} onClick={props.onLogout}>Cerrar sesion</button>
    </div>
  );
}


function TabChat(props){
  var u=props.user;
  var saldo=u.precioTotal-u.pagado;

  var SISTEMA="Eres el asistente virtual de Mini-Vac Vacation Club. Responde en espanol, amable y conciso (max 3 oraciones). Datos del cliente:\nNombre: "+u.titular+(u.coProp?" + "+u.coProp:"")+" | Folio: "+u.folio+"\nDestinos: "+u.destinos.map(function(d){return d.nombre+" "+d.noches+"n "+d.tipo.toUpperCase();}).join(", ")+"\nReservas: "+(u.reservaciones.length>0?u.reservaciones.map(function(r){return r.destino+" "+r.status+" "+fmtDate(r.fechaViaje);}).join("; "):"ninguna")+"\nTotal paquete: "+fmtUSD(u.precioTotal)+" | Pagado: "+fmtUSD(u.pagado)+" | Saldo: "+fmtUSD(saldo)+"\nVigencia: "+fmtDate(u.fechaVencimiento)+"\n\nPuedes iniciar tramites:\n- TRAMITE_RESERVA: cuando el cliente quiere solicitar una reserva. Responde con TRAMITE_RESERVA al inicio.\n- TRAMITE_PAGO: cuando el cliente quiere registrar un pago. Responde con TRAMITE_PAGO al inicio.\n- ESCALAR: si no puedes resolver algo o el cliente pide agente humano. Responde con ESCALAR al inicio.\nEn cualquier otro caso responde directo sin prefijo.";

  var initMsg={id:1,from:"bot",texto:"Hola "+u.titular.split(" ")[0]+"! Soy el asistente de Mini-Vac. Puedo ayudarte con tu paquete, reservas, pagos y mas, o puedo conectarte con un agente. Como te puedo ayudar?",ts:new Date()};

  var [vistaAgente,setVistaAgente]=useState(false);
  var [msgs,setMsgs]=useState([initMsg]);
  var [input,setInput]=useState("");
  var [inputAgente,setInputAgente]=useState("");
  var [loading,setLoading]=useState(false);
  var [modoControl,setModoControl]=useState(false);
  var [tramite,setTramite]=useState(null);
  var [tramiteData,setTramiteData]=useState({});
  var [solicitudes,setSolicitudes]=useState([]);
  var [chatId]=useState(function(){ return u.folio+"-"+Date.now(); });
  var msgsRef=useRef(msgs);
  msgsRef.current=msgs;

  useEffect(function(){
    var interval=setInterval(function(){
      storageGet().then(function(data){
        var chat=data.chats&&data.chats[u.folio];
        if(!chat) return;
        var stored=chat.msgs||[];
        var cur=msgsRef.current;
        if(stored.length>cur.length){
          setMsgs(stored.map(function(m){return Object.assign({},m,{ts:new Date(m.ts)});}));
          if(chat.modoControl!==undefined) setModoControl(chat.modoControl);
        }
      });
    },2000);
    return function(){ clearInterval(interval); };
  },[]);

  function addMsg(from,texto,extra){
    var m=Object.assign({id:genId(),from:from,texto:texto,ts:new Date().toISOString()},extra||{});
    setMsgs(function(prev){
      var next=prev.concat([m]);
      storageGet().then(function(data){
        var chats=data.chats||{};
        var existing=chats[u.folio]||{msgs:[],modoControl:false,cliente:u.titular,folio:u.folio,status:"abierto"};
        existing.msgs=next.map(function(x){return Object.assign({},x,{ts:typeof x.ts==="string"?x.ts:x.ts.toISOString()});});
        existing.ultimoMsg=m.texto.substring(0,60);
        existing.ts=new Date().toISOString();
        chats[u.folio]=existing;
        storageSave({chats:chats});
      });
      return next;
    });
    return m;
  }

  function scrollChat(){
    setTimeout(function(){
      var el=document.getElementById("chat-msgs-"+u.folio);
      if(el) el.scrollTop=el.scrollHeight;
    },60);
  }

  function buildHist(lista){
    var hist=[];
    for(var i=1;i<lista.length;i++){
      var m=lista[i];
      if(m.from==="user") hist.push({role:"user",content:m.texto});
      if(m.from==="bot") hist.push({role:"assistant",content:m.texto});
    }
    return hist;
  }

  function enviarCliente(){
    var txt=input.trim();
    if(!txt||loading) return;
    setInput("");
    var newMsgs=msgs.concat([{id:genId(),from:"user",texto:txt,ts:new Date().toISOString()}]);
    setMsgs(function(){
      storageGet().then(function(data){
        var chats=data.chats||{};
        var existing=chats[u.folio]||{msgs:[],modoControl:false,cliente:u.titular,folio:u.folio,status:"abierto"};
        existing.msgs=newMsgs;
        existing.ultimoMsg=txt.substring(0,60);
        existing.ts=new Date().toISOString();
        chats[u.folio]=existing;
        storageSave({chats:chats});
      });
      return newMsgs;
    });
    scrollChat();
    if(modoControl){ scrollChat(); return; }
    setLoading(true);
    var hist=buildHist(newMsgs);
    fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:300,system:SISTEMA,messages:hist})
    }).then(function(r){return r.json();}).then(function(data){
      setLoading(false);
      var resp=(data.content&&data.content[0]&&data.content[0].text)||"Disculpa, hubo un error. Intenta de nuevo.";
      if(resp.indexOf("TRAMITE_RESERVA")===0){
        var msg=resp.replace("TRAMITE_RESERVA","").trim();
        addMsg("bot",msg||"Con gusto te ayudo a solicitar una reserva. Necesito algunos datos:");
        setTramite("reserva");
        setTramiteData({destino:u.destinos[0]?u.destinos[0].nombre:"",fecha:"",personas:"2",notas:""});
      } else if(resp.indexOf("TRAMITE_PAGO")===0){
        var msg2=resp.replace("TRAMITE_PAGO","").trim();
        addMsg("bot",msg2||"Claro, te ayudo a registrar tu pago:");
        setTramite("pago");
        setTramiteData({monto:"",metodo:"Tarjeta",ref:""});
      } else if(resp.indexOf("ESCALAR")===0){
        var msg3=resp.replace("ESCALAR","").trim();
        addMsg("bot",msg3);
        addMsg("system","Conectando con un agente de CS o Reservas...");
        setTimeout(function(){
          setModoControl(true);
          addMsg("agente","Hola "+u.titular.split(" ")[0]+"! Soy Maria de CS. Ya revise tu caso, estoy aqui para ayudarte.");
          storageGet().then(function(data){var chats=data.chats||{};if(chats[u.folio]){chats[u.folio].modoControl=true;chats[u.folio].status="escalado";}storageSave({chats:chats});});
          scrollChat();
        },1800);
      } else {
        addMsg("bot",resp);
      }
      scrollChat();
    }).catch(function(){
      setLoading(false);
      addMsg("bot","Error de conexion. Intenta de nuevo.");
    });
  }

  function enviarAgente(){
    var txt=inputAgente.trim();
    if(!txt) return;
    setInputAgente("");
    addMsg("agente",txt);
    scrollChat();
  }

  function tomarControl(){
    setModoControl(true);
    addMsg("system","El agente ha tomado control del chat.");
    storageGet().then(function(data){var chats=data.chats||{};if(chats[u.folio])chats[u.folio].modoControl=true;storageSave({chats:chats});});
    scrollChat();
  }
  function devolverBot(){
    setModoControl(false);
    addMsg("system","El bot ha retomado el chat.");
    storageGet().then(function(data){var chats=data.chats||{};if(chats[u.folio])chats[u.folio].modoControl=false;storageSave({chats:chats});});
    scrollChat();
  }

  function submitTramiteReserva(){
    var d=tramiteData;
    if(!d.destino||!d.fecha) return;
    var sol={id:"SOL-"+Date.now(),tipo:"reserva",folio:u.folio,cliente:u.titular,destino:d.destino,fecha:d.fecha,personas:parseInt(d.personas)||2,notas:d.notas,status:"pendiente",ts:new Date()};
    setSolicitudes(function(prev){return [sol].concat(prev);});
    setTramite(null);
    setTramiteData({});
    addMsg("bot","Listo! Tu solicitud de reserva para "+d.destino+" el "+fmtDate(d.fecha)+" ha sido enviada. El equipo de reservas te confirmara en 3-5 dias habiles.");
    addMsg("system","Solicitud de reserva generada: "+d.destino+" - "+fmtDate(d.fecha)+" - "+d.personas+" personas.");
    storageGet().then(function(data){
      var chats=data.chats||{};
      var ex=chats[u.folio]||{};
      ex.solicitudes=(ex.solicitudes||[]).concat([sol]);
      ex.status="solicitud_reserva";
      chats[u.folio]=ex;
      storageSave({chats:chats});
    });
    scrollChat();
  }

  function submitTramitePago(){
    var d=tramiteData;
    if(!d.monto) return;
    var sol={id:"PAG-"+Date.now(),tipo:"pago",folio:u.folio,cliente:u.titular,monto:parseFloat(d.monto),metodo:d.metodo,ref:d.ref,status:"pendiente",ts:new Date()};
    setSolicitudes(function(prev){return [sol].concat(prev);});
    setTramite(null);
    setTramiteData({});
    addMsg("bot","Tu pago de "+fmtUSD(parseFloat(d.monto)||0)+" ha sido registrado. Lo validaremos en las proximas horas.");
    addMsg("system","Pago registrado: "+fmtUSD(parseFloat(d.monto)||0)+" via "+d.metodo+(d.ref?" - Ref: "+d.ref:"")+".");
    storageGet().then(function(data){
      var chats=data.chats||{};
      var ex=chats[u.folio]||{};
      ex.solicitudes=(ex.solicitudes||[]).concat([sol]);
      ex.status="solicitud_pago";
      chats[u.folio]=ex;
      storageSave({chats:chats});
    });
    scrollChat();
  }

  function cancelTramite(){ setTramite(null); setTramiteData({}); addMsg("bot","Entendido, cancelado. Hay algo mas en lo que pueda ayudarte?"); scrollChat(); }

  function onKey(e){ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();enviarCliente();} }
  function onKeyA(e){ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();enviarAgente();} }

  var PURPLE="#5b21b6";

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0 10px",borderBottom:"1px solid #e8eaed",marginBottom:"8px"}}>
        <div>
          <div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>Soporte Mini-Vac</div>
          <div style={{fontSize:"11px",color:modoControl?PURPLE:TEAL}}>{modoControl?"Agente humano en control":"Bot AI activo"}</div>
        </div>
        <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
          <button style={btnSm(vistaAgente?"teal":"ghost")} onClick={function(){setVistaAgente(!vistaAgente);}}>
            {vistaAgente?"Vista cliente":"Vista agente"}
          </button>
        </div>
      </div>

      {vistaAgente&&(
        <div style={{background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:"12px",padding:"12px 14px",marginBottom:"10px"}}>
          <div style={{fontSize:"11px",fontWeight:"700",color:PURPLE,marginBottom:"8px"}}>Panel del Agente - {u.titular} ({u.folio})</div>
          <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
            {!modoControl&&<button style={btnSm("indigo")} onClick={tomarControl}>Tomar control del chat</button>}
            {modoControl&&<button style={btnSm("ghost")} onClick={devolverBot}>Devolver al bot</button>}
          </div>
          {solicitudes.length>0&&(
            <div>
              <div style={{fontSize:"10px",fontWeight:"700",color:"#9ca3af",marginBottom:"5px"}}>SOLICITUDES RECIBIDAS</div>
              {solicitudes.map(function(s){
                return (
                  <div key={s.id} style={{background:"#fafbfc",border:"1px solid #e3e6ea",borderRadius:"8px",padding:"7px 10px",marginBottom:"4px",fontSize:"11px"}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontWeight:"700",color:s.tipo==="reserva"?TEAL:AMBER}}>{s.tipo==="reserva"?"Reserva":"Pago"} - {s.id}</span>
                      <span style={bdg(AMBER,"rgba(245,158,11,0.1)","rgba(245,158,11,0.25)")}>Pendiente</span>
                    </div>
                    {s.tipo==="reserva"&&<div style={{color:"#6b7280",marginTop:"3px"}}>{s.destino} - {fmtDate(s.fecha)} - {s.personas} pax</div>}
                    {s.tipo==="pago"&&<div style={{color:"#6b7280",marginTop:"3px"}}>{fmtUSD(s.monto)} via {s.metodo}{s.ref?" - "+s.ref:""}</div>}
                  </div>
                );
              })}
            </div>
          )}
          {modoControl&&(
            <div style={{marginTop:"8px"}}>
              <div style={{fontSize:"10px",fontWeight:"700",color:"#9ca3af",marginBottom:"5px"}}>RESPONDER COMO AGENTE</div>
              <div style={{display:"flex",gap:"6px"}}>
                <input style={Object.assign({},S.inp,{flex:1,padding:"7px 10px",fontSize:"12px"})} value={inputAgente} onChange={function(e){setInputAgente(e.target.value);}} onKeyDown={onKeyA} placeholder="Escribe como agente..."/>
                <button style={btnSm("indigo")} onClick={enviarAgente} disabled={!inputAgente.trim()}>Enviar</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div id={"chat-msgs-"+u.folio} style={{height:"340px",overflowY:"auto",display:"flex",flexDirection:"column",gap:"7px",padding:"4px 2px",marginBottom:"10px"}}>
        {msgs.map(function(m){
          var isUser=m.from==="user";
          var isSystem=m.from==="system";
          var isAgente=m.from==="agente";
          if(isSystem){
            return <div key={m.id} style={{textAlign:"center",padding:"4px 12px",fontSize:"10px",color:"#9ca3af",fontStyle:"italic"}}>{m.texto}</div>;
          }
          var bg=isUser?"#1a385a":(isAgente?"#eef2f7":"#eef2f7");
          var br=isUser?"#1a385a":(isAgente?"rgba(71,113,138,0.3)":"#e5e7eb");
          var nc=isUser?"#1a385a":(isAgente?"#47718a":"#47718a");
          var nl=isUser?u.titular.split(" ")[0]:(isAgente?"Agente CS":"Bot Mini-Vac");
          var rad=isUser?"14px 14px 4px 14px":"14px 14px 14px 4px";
          return (
            <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:isUser?"flex-end":"flex-start",gap:"2px"}}>
              <div style={{fontSize:"10px",color:nc,fontWeight:"600",paddingLeft:isUser?"0":"2px",paddingRight:isUser?"2px":"0"}}>{nl}</div>
              <div style={{maxWidth:"84%",padding:"9px 13px",borderRadius:rad,background:bg,border:"1px solid "+br,fontSize:"13px",color:isUser?"#fff":"#282828",lineHeight:"1.5"}}>{m.texto}</div>
            </div>
          );
        })}
        {loading&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"2px"}}>
            <div style={{fontSize:"10px",color:"#9ca3af",fontWeight:"600"}}>Bot Mini-Vac</div>
            <div style={{padding:"9px 14px",borderRadius:"14px 14px 14px 4px",background:"#f9fafb",border:"1px solid #e3e6ea",display:"flex",gap:"4px",alignItems:"center"}}>
              <div style={{width:"5px",height:"5px",borderRadius:"50%",background:TEAL}}></div>
              <div style={{width:"5px",height:"5px",borderRadius:"50%",background:TEAL,opacity:"0.5"}}></div>
              <div style={{width:"5px",height:"5px",borderRadius:"50%",background:TEAL,opacity:"0.2"}}></div>
            </div>
          </div>
        )}
      </div>

      {tramite==="reserva"&&(
        <div style={{background:"rgba(14,165,160,0.06)",border:"1px solid rgba(14,165,160,0.25)",borderRadius:"12px",padding:"14px",marginBottom:"10px"}}>
          <div style={{fontSize:"12px",fontWeight:"700",color:TEAL,marginBottom:"10px"}}>Solicitud de reserva</div>
          <div style={Object.assign({},S.g2,{marginBottom:"8px"})}>
            <div>
              <label style={S.lbl}>Destino</label>
              <select style={Object.assign({},S.inp,{cursor:"pointer"})} value={tramiteData.destino} onChange={function(e){setTramiteData(function(p){return Object.assign({},p,{destino:e.target.value});});}}>
                {u.destinos.map(function(d){return <option key={d.id} value={d.nombre}>{d.nombre} ({d.noches}n {d.tipo.toUpperCase()})</option>;})}
              </select>
            </div>
            <div>
              <label style={S.lbl}>Fecha de viaje</label>
              <input style={S.inp} type="date" value={tramiteData.fecha} onChange={function(e){setTramiteData(function(p){return Object.assign({},p,{fecha:e.target.value});});}}/>
            </div>
            <div>
              <label style={S.lbl}>Personas</label>
              <input style={S.inp} type="number" min="1" max="6" value={tramiteData.personas} onChange={function(e){setTramiteData(function(p){return Object.assign({},p,{personas:e.target.value});});}}/>
            </div>
          </div>
          <div style={{marginBottom:"10px"}}>
            <label style={S.lbl}>Solicitudes especiales (opcional)</label>
            <input style={S.inp} value={tramiteData.notas} onChange={function(e){setTramiteData(function(p){return Object.assign({},p,{notas:e.target.value});});}} placeholder="Vista al mar, piso alto, celebracion..."/>
          </div>
          <div style={{display:"flex",gap:"6px",justifyContent:"flex-end"}}>
            <button style={btnSm("ghost")} onClick={cancelTramite}>Cancelar</button>
            <button style={btnSm("teal")} onClick={submitTramiteReserva} disabled={!tramiteData.destino||!tramiteData.fecha}>Enviar solicitud</button>
          </div>
        </div>
      )}

      {tramite==="pago"&&(
        <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:"12px",padding:"14px",marginBottom:"10px"}}>
          <div style={{fontSize:"12px",fontWeight:"700",color:AMBER,marginBottom:"10px"}}>Registrar pago</div>
          <div style={Object.assign({},S.g2,{marginBottom:"8px"})}>
            <div>
              <label style={S.lbl}>Monto (USD)</label>
              <input style={S.inp} type="number" value={tramiteData.monto} onChange={function(e){setTramiteData(function(p){return Object.assign({},p,{monto:e.target.value});});}} placeholder="0.00"/>
            </div>
            <div>
              <label style={S.lbl}>Metodo</label>
              <select style={Object.assign({},S.inp,{cursor:"pointer"})} value={tramiteData.metodo} onChange={function(e){setTramiteData(function(p){return Object.assign({},p,{metodo:e.target.value});});}}>
                <option>Tarjeta</option><option>Transferencia</option><option>Efectivo</option>
              </select>
            </div>
          </div>
          <div style={{marginBottom:"10px"}}>
            <label style={S.lbl}>Referencia / No. de operacion</label>
            <input style={S.inp} value={tramiteData.ref} onChange={function(e){setTramiteData(function(p){return Object.assign({},p,{ref:e.target.value});});}} placeholder="Opcional"/>
          </div>
          <div style={{display:"flex",gap:"6px",justifyContent:"flex-end"}}>
            <button style={btnSm("ghost")} onClick={cancelTramite}>Cancelar</button>
            <button style={btnSm("amber")} onClick={submitTramitePago} disabled={!tramiteData.monto}>Registrar pago</button>
          </div>
        </div>
      )}

      {!modoControl&&(
        <div style={{display:"flex",gap:"6px",alignItems:"flex-end"}}>
          <textarea style={Object.assign({},S.inp,{flex:1,minHeight:"40px",maxHeight:"90px",resize:"none",lineHeight:"1.4"})} value={input} onChange={function(e){setInput(e.target.value);}} onKeyDown={onKey} placeholder="Escribe tu mensaje..." rows="1"/>
          <button style={Object.assign({},btn("teal"),{flexShrink:0,padding:"9px 16px"})} onClick={enviarCliente} disabled={!input.trim()||loading}>Enviar</button>
        </div>
      )}
      {modoControl&&(
        <div style={{padding:"8px 12px",borderRadius:"10px",background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.2)",fontSize:"11px",color:PURPLE,textAlign:"center"}}>
          Un agente esta atendiendo esta conversacion. Usa el panel de agente arriba para responder.
        </div>
      )}
    </div>
  );
}



export default function ClientPortal(){
  var [user,setUser]=useState(null);
  var [tab,setTab]=useState("inicio");

  var TABS=[
    {k:"inicio",   l:"Inicio"},
    {k:"destinos", l:"Mis destinos"},
    {k:"reservas", l:"Reservas"},
    {k:"pagos",    l:"Pagos"},
    {k:"chat",     l:"Chat"},
    {k:"perfil",   l:"Perfil"},
  ];

  if(!user) return <LoginScreen onLogin={function(u){setUser(u);setTab("inicio");}}/>;

  return (
    <div style={S.wrap}>
      <div style={{background:"#1a385a",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontSize:"14px",fontWeight:"700",color:"#fff",letterSpacing:"-0.3px"}}>TRAVEL<span style={{color:"#47718a"}}>X</span><span style={{fontWeight:"300",fontSize:"12px"}}> GROUP</span></div>
          <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",borderLeft:"1px solid rgba(255,255,255,0.2)",paddingLeft:"8px",marginLeft:"4px"}}>Portal del Socio</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:"12px",fontWeight:"600",color:"#fff"}}>{user.titular}</div>
          <div style={{fontSize:"10px",color:"#8aacca"}}>{user.folio}</div>
        </div>
      </div>

      <div style={{display:"flex",gap:"2px",padding:"6px 12px",overflowX:"auto",borderBottom:"1px solid #e5e7eb",background:"#fff"}}>
        {TABS.map(function(t){
          return <button key={t.k} style={tabS(tab===t.k,TEAL)} onClick={function(){setTab(t.k);}}>{t.l}</button>;
        })}
      </div>

      <div style={{padding:tab==="chat"?"0 16px":"14px 16px",maxWidth:"600px",margin:"0 auto"}}>
        {tab==="inicio"&&<TabInicio user={user} onTabChange={setTab}/>}
        {tab==="destinos"&&<TabDestinos user={user}/>}
        {tab==="reservas"&&<TabReservas user={user}/>}
        {tab==="pagos"&&<TabPagos user={user}/>}
        {tab==="chat"&&<TabChat user={user}/>}
        {tab==="perfil"&&<TabPerfil user={user} onLogout={function(){setUser(null);setTab("inicio");}}/>}
      </div>
    </div>
  );
}
