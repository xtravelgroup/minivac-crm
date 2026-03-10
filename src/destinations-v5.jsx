import { useState } from "react";

var TEAL="#0ea5a0",INDIGO="#1a385a",VIOLET="#5b21b6",GREEN="#22c55e",AMBER="#f59e0b",RED="#ef4444",CORAL="#f97316",BLUE="#47718a";

var MARITAL_OPTS=["Casado","Union libre","Soltero hombre","Soltera mujer"];
var CAPACITY_OPTS=["Parejas","Familias","Grupos","Solo adultos"];
var PLAN_OPTS=["Todo Incluido","Solo Habitacion","Desayuno incluido","Media pension","Todo Incluido Premium"];

var AMENITY_CATS=[
  {cat:"Agua y Playa",   col:"#0ea5a0", items:["Piscina","Playa privada","Bar swim-up","Centro de buceo","Jacuzzi","Kayak","Deportes acuaticos"]},
  {cat:"Bienestar",      col:"#5b21b6", items:["Spa","Gimnasio","Yoga","Sauna","Centro medico"]},
  {cat:"Gastronomia",    col:"#f59e0b", items:["Restaurantes multiples","Buffet","Bar","Room service 24h","Cocina gourmet"]},
  {cat:"Entretenimiento",col:"#f97316", items:["Shows nocturnos","Casino","Kids club","Club nocturno","Teatro","Karaoke"]},
  {cat:"Servicios",      col:"#47718a", items:["Butler service","Wi-Fi incluido","Estacionamiento","Lavanderia","Concierge","Transfer incluido"]},
  {cat:"Deportes",       col:"#22c55e", items:["Golf","Tenis","Ciclismo","Voleibol playa","Futbol","Basketball"]},
  {cat:"Parques",        col:"#6366f1", items:["Acceso a parque tematico","Parque acuatico","Zoologico","Aventura en la selva"]},
];

var ROOM_TYPES_DEFAULT=[
  {id:"RT1",nombre:"Habitacion Estandar",  descripcion:"Cama doble o dos camas individuales, vista garden.",  maxOcupantes:2,activo:true},
  {id:"RT2",nombre:"Habitacion Superior",  descripcion:"Cama king, amenidades premium, vista parcial al mar.",maxOcupantes:2,activo:true},
  {id:"RT3",nombre:"Junior Suite",         descripcion:"Suite con sala de estar separada y vista al mar.",    maxOcupantes:3,activo:true},
  {id:"RT4",nombre:"Suite Presidencial",   descripcion:"Suite de lujo con terraza, jacuzzi y mayordomo.",    maxOcupantes:4,activo:true},
  {id:"RT5",nombre:"Suite Familiar",       descripcion:"2 habitaciones y sala de estar para familias.",       maxOcupantes:6,activo:true},
];
var INCLUDED_GIFTS_SEED=[
  {id:"IG01",label:"Traslado aeropuerto-hotel", activo:true},
  {id:"IG02",label:"Traslado hotel-aeropuerto", activo:true},
  {id:"IG03",label:"Traslado redondo",           activo:true},
  {id:"IG04",label:"Certificado Spa",            activo:true},
  {id:"IG05",label:"All-Inclusive",              activo:true},
  {id:"IG06",label:"Desayunos incluidos",        activo:true},
  {id:"IG07",label:"Cena romantica",             activo:true},
  {id:"IG08",label:"Decoracion de habitacion",   activo:true},
  {id:"IG09",label:"Late check-out",             activo:true},
  {id:"IG10",label:"Early check-in",             activo:true},
  {id:"IG11",label:"Entradas a atraccion",       activo:true},
  {id:"IG12",label:"Credito de resort",          activo:true},
  {id:"IG13",label:"Actividad acuatica",         activo:true},
  {id:"IG14",label:"Green fee / golf",           activo:true},
  {id:"IG15",label:"Botella de champagne",       activo:true},
];
var REGION_OPTS=[
  {val:"internacional",label:"Internacional",color:VIOLET},
  {val:"nacional",    label:"Nacional (USA)",color:BLUE},
];

var SEED=[
  {id:"D01",nombre:"Cancun",       estado:"Quintana Roo",     region:"internacional",activo:true,
   desc:"La Zona Hotelera mas famosa de Mexico con playas de arena blanca y mar turquesa.",
   personas:{adultosMin:2,adultosMax:4,ninosPermitidos:true,ninosEdadMin:0,ninosEdadMax:12,ninosMax:2},
   regalosIncluidos:["IG01","IG04","IG05"],regalosExtras:[],
   qc:{noches:5,ageMin:25,ageMax:65,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],
       hoteles:[
         {id:"H001",nombre:"Grand Oasis Palm",      plan:"Todo Incluido",        capacity:["Parejas","Familias"],    ageMin:25,ageMax:60,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],activo:true,amenidades:["Piscina","Playa privada","Spa","Shows nocturnos","Bar swim-up"],hotelGifts:[]},
         {id:"H002",nombre:"Hyatt Zilara Cancun",   plan:"Todo Incluido Premium",capacity:["Parejas","Solo adultos"],ageMin:18,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],activo:true,amenidades:["Playa privada","Spa","Butler service","Restaurantes multiples","Bar swim-up"],hotelGifts:["Cena romantica de bienvenida","Acceso spa (1 dia)"]},
         {id:"H003",nombre:"Moon Palace Golf & Spa",plan:"Todo Incluido",        capacity:["Familias","Grupos"],     ageMin:25,ageMax:65,marital:["Casado","Union libre"],activo:true,amenidades:["Golf","Piscina","Spa","Kids club","Casino"],hotelGifts:["Credito de golf $50"]},
       ],
       regalosOpcionales:{habilitado:true,maxElecciones:1,items:[
         {id:"G001",nombre:"Tour a Chichen Itza",      activo:true},
         {id:"G002",nombre:"Tour snorkel Isla Mujeres",activo:true},
         {id:"G004",nombre:"Gift Card $75 USD",        activo:true},
       ]}},
   nq:{habilitado:true,noches:4,label:"Cancun Esencial",
       hoteles:[
         {id:"N001",nombre:"Crown Paradise Club",plan:"Todo Incluido",capacity:["Parejas","Familias","Grupos"],activo:true,amenidades:["Piscina","Playa privada"],hotelGifts:[]},
         {id:"N002",nombre:"Krystal Cancun",    plan:"Todo Incluido",capacity:["Parejas","Familias"],        activo:true,amenidades:["Piscina","Spa"],hotelGifts:[]},
       ]}},
  {id:"D02",nombre:"Los Cabos",    estado:"Baja California Sur",region:"internacional",activo:true,
   desc:"El Arco iconico, desierto y mar. Destino de lujo en el extremo de Baja California.",
   personas:{adultosMin:2,adultosMax:2,ninosPermitidos:false,ninosEdadMin:0,ninosEdadMax:12,ninosMax:0},
   regalosIncluidos:["IG01","IG05"],regalosExtras:[],
   qc:{noches:4,ageMin:36,ageMax:99,marital:["Casado","Union libre"],
       hoteles:[
         {id:"H005",nombre:"Marquis Los Cabos",plan:"Todo Incluido Premium",capacity:["Parejas"],         ageMin:36,ageMax:99,marital:["Casado"],             activo:true,amenidades:["Playa privada","Spa","Butler service","Golf","Restaurantes multiples"],hotelGifts:["Botella de champagne","Masaje 30 min"]},
         {id:"H006",nombre:"One&Only Palmilla",plan:"Solo Habitacion",      capacity:["Parejas","Grupos"],ageMin:30,ageMax:99,marital:["Casado","Union libre"],activo:true,amenidades:["Playa privada","Golf","Spa","Butler service"],hotelGifts:[]},
       ],
       regalosOpcionales:{habilitado:true,maxElecciones:1,items:[
         {id:"G006",nombre:"Cena romantica en la playa",activo:true},
         {id:"G007",nombre:"Tour en lancha al Arco",   activo:true},
         {id:"G008",nombre:"Gift Card $75 USD",        activo:true},
       ]}},
   nq:{habilitado:false,noches:3,label:"",hoteles:[]}},
  {id:"D03",nombre:"Riviera Maya",estado:"Quintana Roo",region:"internacional",activo:true,
   desc:"Cenotes, ruinas mayas y playas paradisiacas.",
   personas:{adultosMin:2,adultosMax:4,ninosPermitidos:true,ninosEdadMin:2,ninosEdadMax:12,ninosMax:2},
   regalosIncluidos:["IG01","IG05","IG07"],regalosExtras:[],
   qc:{noches:6,ageMin:25,ageMax:60,marital:["Casado","Union libre"],
       hoteles:[
         {id:"H007",nombre:"Iberostar Paraiso",       plan:"Todo Incluido",        capacity:["Familias","Grupos"],  ageMin:25,ageMax:55,marital:["Casado","Union libre"],activo:true,amenidades:["Piscina","Playa privada","Kids club","Shows nocturnos","Restaurantes multiples"],hotelGifts:[]},
         {id:"H008",nombre:"Grand Velas Riviera Maya",plan:"Todo Incluido Premium",capacity:["Parejas","Familias"],ageMin:28,ageMax:60,marital:["Casado","Union libre"],             activo:true,amenidades:["Butler service","Spa","Playa privada","Restaurantes multiples","Wi-Fi incluido"],hotelGifts:["Acceso spa","Clase de cocina mexicana"]},
       ],
       regalosOpcionales:{habilitado:true,maxElecciones:1,items:[
         {id:"G009",nombre:"Tour Tulum + Cenote",activo:true},
         {id:"G010",nombre:"Snorkel en arrecife",activo:true},
         {id:"G011",nombre:"Gift Card $75 USD",  activo:true},
       ]}},
   nq:{habilitado:true,noches:4,label:"Riviera Maya Basico",
       hoteles:[
         {id:"N003",nombre:"Bahia Principe Akumal",plan:"Todo Incluido",capacity:["Familias","Parejas","Grupos"],activo:true,amenidades:["Piscina","Playa privada","Kids club"],hotelGifts:[]},
         {id:"N004",nombre:"Grand Bahia Principe", plan:"Todo Incluido",capacity:["Familias","Grupos"],         activo:true,amenidades:["Piscina","Shows nocturnos"],hotelGifts:[]},
       ]}},
  {id:"D04",nombre:"Las Vegas",   estado:"Nevada",  region:"nacional",activo:true,
   desc:"La capital del entretenimiento. Shows, casinos y gastronomia de clase mundial.",
   personas:{adultosMin:2,adultosMax:4,ninosPermitidos:false,ninosEdadMin:0,ninosEdadMax:0,ninosMax:0},
   regalosIncluidos:["IG01","IG09"],regalosExtras:[],
   qc:{noches:3,ageMin:21,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],
       hoteles:[
         {id:"H020",nombre:"MGM Grand",plan:"Solo Habitacion",capacity:["Parejas","Grupos","Solo adultos"],ageMin:21,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],activo:true,amenidades:["Casino","Piscina","Spa","Shows nocturnos","Restaurantes multiples","Gimnasio"],hotelGifts:["Credito de casino $50"]},
         {id:"H021",nombre:"Bellagio", plan:"Solo Habitacion",capacity:["Parejas","Solo adultos"],          ageMin:21,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],            activo:true,amenidades:["Casino","Spa","Restaurantes multiples","Shows nocturnos"],hotelGifts:["Credito de casino $75","Acceso spa (1 sesion)"]},
       ],
       regalosOpcionales:{habilitado:true,maxElecciones:1,items:[
         {id:"G020",nombre:"$50 credito casino",      activo:true},
         {id:"G021",nombre:"Show ticket (2 personas)",activo:true},
         {id:"G022",nombre:"Gift Card $100 USD",      activo:true},
       ]}},
   nq:{habilitado:false,noches:3,label:"",hoteles:[]}},
  {id:"D05",nombre:"Orlando",     estado:"Florida", region:"nacional",activo:true,
   desc:"El reino de la magia. Disney, Universal, parques acuaticos y mas.",
   personas:{adultosMin:2,adultosMax:4,ninosPermitidos:true,ninosEdadMin:3,ninosEdadMax:17,ninosMax:3},
   regalosIncluidos:["IG01","IG06"],regalosExtras:[],
   qc:{noches:4,ageMin:25,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],
       hoteles:[
         {id:"H022",nombre:"Disney's Grand Floridian",plan:"Solo Habitacion",  capacity:["Familias","Parejas"],ageMin:18,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],activo:true,amenidades:["Piscina","Acceso a parque tematico","Kids club","Restaurantes multiples","Wi-Fi incluido"],hotelGifts:["Acceso Disney 1 dia"]},
         {id:"H023",nombre:"Universal's Cabana Bay",  plan:"Desayuno incluido",capacity:["Familias","Grupos"],ageMin:18,ageMax:99,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],activo:true,amenidades:["Piscina","Acceso a parque tematico","Wi-Fi incluido"],hotelGifts:[]},
       ],
       regalosOpcionales:{habilitado:true,maxElecciones:1,items:[
         {id:"G023",nombre:"Gift Card $100 USD",        activo:true},
         {id:"G024",nombre:"2 entradas parque de agua", activo:true},
         {id:"G025",nombre:"2 entradas Disney (1 dia)", activo:true},
       ]}},
   nq:{habilitado:false,noches:3,label:"",hoteles:[]}},
  {id:"D06",nombre:"Puerto Vallarta",estado:"Jalisco",region:"internacional",activo:true,
   desc:"El malecon y las playas del Pacifico. Ambiente romantico.",
   personas:{adultosMin:2,adultosMax:2,ninosPermitidos:false,ninosEdadMin:0,ninosEdadMax:12,ninosMax:0},
   regalosIncluidos:["IG01","IG07"],regalosExtras:[],
   qc:{noches:4,ageMin:25,ageMax:60,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],
       hoteles:[
         {id:"H010",nombre:"Secrets Vallarta Bay",plan:"Todo Incluido Premium",capacity:["Parejas","Solo adultos"],ageMin:25,ageMax:65,marital:["Casado","Union libre","Soltero hombre","Soltera mujer"],activo:true,amenidades:["Playa privada","Spa","Bar swim-up","Restaurantes multiples","Shows nocturnos"],hotelGifts:["Cena en la playa para dos"]},
         {id:"H011",nombre:"Garza Blanca Resort",plan:"Solo Habitacion",      capacity:["Parejas"],               ageMin:30,ageMax:70,marital:["Casado","Union libre"],            activo:true,amenidades:["Playa privada","Spa","Golf","Butler service"],hotelGifts:[]},
       ],
       regalosOpcionales:{habilitado:true,maxElecciones:1,items:[
         {id:"G030",nombre:"Tour en barco Bahia Banderas",activo:true},
         {id:"G031",nombre:"Gift Card $50 USD",           activo:true},
       ]}},
   nq:{habilitado:true,noches:3,label:"PV Basico",hoteles:[]}},
  {id:"D07",nombre:"Huatulco",    estado:"Oaxaca",  region:"internacional",activo:true,
   desc:"9 bahias de aguas cristalinas en la costa oaxaquena.",
   personas:{adultosMin:2,adultosMax:4,ninosPermitidos:true,ninosEdadMin:0,ninosEdadMax:12,ninosMax:2},
   regalosIncluidos:["IG01","IG06"],regalosExtras:[],
   qc:{noches:5,ageMin:25,ageMax:65,marital:["Casado","Union libre"],
       hoteles:[
         {id:"H012",nombre:"Las Brisas Huatulco", plan:"Desayuno incluido",capacity:["Parejas"],         ageMin:30,ageMax:65,marital:["Casado","Union libre"],           activo:true,amenidades:["Playa privada","Piscina","Spa","Golf"],hotelGifts:[]},
         {id:"H013",nombre:"Camino Real Zaashila",plan:"Solo Habitacion",  capacity:["Parejas","Familias"],ageMin:25,ageMax:70,marital:["Casado","Union libre"],activo:true,amenidades:["Piscina","Playa privada","Restaurantes multiples"],hotelGifts:[]},
       ],
       regalosOpcionales:{habilitado:true,maxElecciones:1,items:[
         {id:"G013",nombre:"Tour en catamaran bahias",activo:true},
         {id:"G014",nombre:"Gift Card $50 USD",       activo:true},
       ]}},
   nq:{habilitado:true,noches:3,label:"Huatulco Express",
       hoteles:[
         {id:"N005",nombre:"Barcelo Huatulco",plan:"Todo Incluido",capacity:["Parejas","Familias","Grupos"],activo:true,amenidades:["Piscina","Playa privada"],hotelGifts:[]},
       ]}},
];

function uid(){ return "X"+Date.now()+Math.floor(Math.random()*9999); }

var S={
  wrap:{minHeight:"100vh",background:"#1a1f2e",color:"#1a1f2e",fontFamily:"'Poppins','DM Sans','Segoe UI',sans-serif",fontSize:"13px"},
  card:{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"12px",padding:"14px 16px",marginBottom:"8px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},
  inp: {width:"100%",background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:"8px",padding:"8px 11px",color:"#1a1f2e",fontSize:"12px",outline:"none",boxSizing:"border-box",fontFamily:"inherit"},
  lbl: {fontSize:"11px",color:"#9ca3af",marginBottom:"4px",fontWeight:"600",display:"block"},
  stit:{fontSize:"10px",fontWeight:"700",color:"#6b7280",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"8px"},
  g2:  {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"},
  g3:  {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px"},
};
function btn(v,sm){
  var base={padding:sm?"5px 12px":"7px 16px",borderRadius:"8px",cursor:"pointer",fontSize:sm?"11px":"12px",fontWeight:"600",border:"none",fontFamily:"inherit"};
  if(v==="primary")  return Object.assign({},base,{background:INDIGO,color:"#fff"});
  if(v==="teal")     return Object.assign({},base,{background:TEAL,color:"#fff"});
  if(v==="danger")   return Object.assign({},base,{background:"#fef2f2",color:RED,border:"1px solid #fecaca"});
  if(v==="ghost")    return Object.assign({},base,{background:"#1a1f2e",color:"#9ca3af",border:"1px solid #e2e8f0"});
  return Object.assign({},base,{background:"#1a1f2e",color:"#9ca3af",border:"1px solid #e2e8f0"});
}
function tabS(a,col){var c=col||INDIGO;return {padding:"7px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:a?"700":"400",background:a?(c+"18"):"transparent",color:a?c:"#9ca3af",border:a?("1px solid "+c+"33"):"1px solid transparent",whiteSpace:"nowrap"};}
function bdg(c,bg,br){return {display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:"20px",fontSize:"10px",fontWeight:"700",color:c,background:bg,border:"1px solid "+br};}
function chip(on,col,sm){var c=col||INDIGO;return {padding:sm?"3px 10px":"5px 12px",borderRadius:"20px",cursor:"pointer",fontSize:sm?"10px":"11px",fontWeight:"600",background:on?(c+"18"):"#1a1f2e",color:on?c:"#9ca3af",border:"1px solid "+(on?(c+"44"):"#3d4554"),userSelect:"none",transition:"all 0.12s"};}


function MultiCheck(props){
  var opts=props.opts; var val=props.val; var onChange=props.onChange; var col=props.col||TEAL;
  function toggle(o){
    var next=val.indexOf(o)===-1?val.concat([o]):val.filter(function(x){return x!==o;});
    onChange(next);
  }
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
      {opts.map(function(o){
        var on=val.indexOf(o)!==-1;
        return <div key={o} style={chip(on,col,true)} onClick={function(){toggle(o);}}>{o}</div>;
      })}
    </div>
  );
}

function NumInput(props){
  return (
    <div>
      <label style={S.lbl}>{props.label}</label>
      <input style={S.inp} type="number" min={props.min||0} max={props.max||99} value={props.value}
        onChange={function(e){props.onChange(parseInt(e.target.value)||0);}}/>
    </div>
  );
}

function personasLabel(p){
  if(!p) return "";
  var s="Hasta "+p.adultosMax+" adulto"+(p.adultosMax!==1?"s":"");
  if(p.ninosPermitidos&&p.ninosMax>0) s=s+" + hasta "+p.ninosMax+" nino"+(p.ninosMax!==1?"s":"")+" (hasta "+p.ninosEdadMax+" anos)";
  else s=s+" - Sin ninos";
  return s;
}

function DestCard(props){
  var d=props.dest;
  var regCol=d.region==="nacional"?BLUE:VIOLET;
  return (
    <div style={Object.assign({},S.card,{borderColor:d.activo?"#f2f3f6":"#f9fafb",opacity:d.activo?1:0.55,cursor:"pointer"})} onClick={props.onEdit}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
        <div>
          <div style={{fontSize:"14px",fontWeight:"700",color:"#3d4554",marginBottom:"2px"}}>{d.nombre}</div>
          <div style={{fontSize:"11px",color:"#9ca3af"}}>{d.estado}</div>
        </div>
        <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
          <span style={bdg(regCol,regCol+"18",regCol+"33")}>{d.region==="nacional"?"USA":"Intl"}</span>
          <div onClick={function(e){e.stopPropagation();props.onToggle(d.id);}}
            style={{width:"32px",height:"18px",borderRadius:"9px",background:d.activo?TEAL:"#f0f1f4",border:"1px solid "+(d.activo?"rgba(14,165,160,0.5)":"#eceff3"),cursor:"pointer",position:"relative",flexShrink:0}}>
            <div style={{position:"absolute",top:"2px",left:d.activo?"16px":"2px",width:"12px",height:"12px",borderRadius:"50%",background:"#fff",transition:"left 0.15s"}}></div>
          </div>
        </div>
      </div>
      {d.personas&&(
        <div style={{fontSize:"11px",color:"#9ca3af",marginBottom:"6px",padding:"4px 8px",background:"#fafbfc",borderRadius:"6px",border:"1px solid #e8eaed"}}>{personasLabel(d.personas)}</div>
      )}
      <div style={{display:"flex",gap:"10px",fontSize:"11px",color:"#9ca3af",marginBottom:"6px"}}>
        <span>QC: {d.qc.noches}n - {d.qc.hoteles.length} hotel{d.qc.hoteles.length!==1?"es":""}</span>
        {d.nq.habilitado&&<span style={{color:AMBER}}>NQ: {d.nq.noches}n ({d.nq.label})</span>}
        {!d.nq.habilitado&&<span style={{color:"#b0b8c4"}}>Sin NQ</span>}
      </div>
      {(d.regalosIncluidos.length>0||(d.regalosExtras||[]).length>0)&&<div style={{fontSize:"10px",color:"#b0b8c4",marginBottom:"3px",fontWeight:"600"}}>Regalos QC incluidos:</div>}
      <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
        {d.regalosIncluidos.map(function(gid){
          var g=null; var igList=props.includedGifts||[]; for(var i=0;i<igList.length;i++){if(igList[i].id===gid){g=igList[i];break;}}
          return g?<span key={gid} style={{fontSize:"10px",color:"#9ca3af",background:"#f9fafb",border:"1px solid #e3e6ea",padding:"1px 6px",borderRadius:"4px"}}>{g.label}</span>:null;
        })}
        {(d.regalosExtras||[]).map(function(re,i){
          return <span key={"re"+i} style={{fontSize:"10px",color:"#9ca3af",background:"#f9fafb",border:"1px solid #e3e6ea",padding:"1px 6px",borderRadius:"4px"}}>{re}</span>;
        })}
      </div>
    </div>
  );
}

function CatalogTab(props){
  var dests=props.dests;
  var [filtro,setFiltro]=useState("todos");
  var filtros=[{k:"todos",l:"Todos"},{k:"activo",l:"Activos"},{k:"inactivo",l:"Inactivos"},{k:"nacional",l:"USA"},{k:"internacional",l:"Internacional"}];
  var vis=dests.filter(function(d){
    if(filtro==="activo") return d.activo;
    if(filtro==="inactivo") return !d.activo;
    if(filtro==="nacional") return d.region==="nacional";
    if(filtro==="internacional") return d.region==="internacional";
    return true;
  });
  return (
    <div style={{padding:"16px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
        <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
          {filtros.map(function(f){return <button key={f.k} style={tabS(filtro===f.k,TEAL)} onClick={function(){setFiltro(f.k);}}>{f.l}</button>;})}
        </div>
        <button style={btn("teal",true)} onClick={props.onNuevo}>+ Nuevo destino</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"8px"}}>
        {vis.map(function(d){
          return <DestCard key={d.id} dest={d} includedGifts={props.includedGifts} onEdit={function(){props.onEdit(d);}} onToggle={props.onToggle}/>;
        })}
      </div>
    </div>
  );
}

function DescIA(props){
  var nombre=props.nombre; var estado=props.estado; var region=props.region;
  var onChange=props.onChange;
  var [loading,setLoading]=useState(false);

  async function generarDesc(){
    if(!nombre) return;
    setLoading(true);
    try {
      var prompt="Escribe una descripcion atractiva y concisa (2-3 oraciones) para un destino de mini-vacaciones llamado "+nombre+(estado?", "+estado:"")+(region==="nacional"?" (USA)":" (Internacional)")+". Usa tono entusiasta pero profesional. Solo la descripcion, sin comillas.";
      var res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
      var data=await res.json();
      var txt=data.content&&data.content[0]&&data.content[0].text?data.content[0].text:"";
      if(txt) onChange(txt.trim());
    } catch(e){ console.error(e); }
    setLoading(false);
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
        <label style={S.lbl}>Descripcion</label>
        <button style={btn("violet",true)} onClick={generarDesc} disabled={loading||!nombre}>
          {loading?"Generando...":"Generar con IA"}
        </button>
      </div>
      <textarea style={Object.assign({},S.inp,{minHeight:"70px",resize:"vertical"})} value={props.value} onChange={function(e){onChange(e.target.value);}} placeholder="Descripcion del destino..."/>
    </div>
  );
}

function PersonasEditor(props){
  var p=props.personas; var onChange=props.onChange;
  function set(key,val){ onChange(Object.assign({},p,{[key]:val})); }
  return (
    <div style={{padding:"12px 14px",background:"#f9fafb",borderRadius:"10px",border:"1px solid #e3e6ea"}}>
      <div style={S.stit}>Personas por viaje</div>
      <div style={Object.assign({},S.g2,{marginBottom:"10px"})}>
        <NumInput label="Max adultos" value={p.adultosMax} min={1} max={10} onChange={function(v){set("adultosMax",v);}}/>
        <div style={{display:"flex",alignItems:"flex-end",paddingBottom:"2px"}}>
          <div>
            <label style={S.lbl}>Ninos permitidos</label>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginTop:"6px"}}>
              <div style={{width:"36px",height:"20px",borderRadius:"10px",background:p.ninosPermitidos?TEAL:"#f0f1f4",border:"1px solid "+(p.ninosPermitidos?"rgba(14,165,160,0.5)":"#eceff3"),cursor:"pointer",position:"relative",flexShrink:0}} onClick={function(){set("ninosPermitidos",!p.ninosPermitidos);}}>
                <div style={{position:"absolute",top:"2px",left:p.ninosPermitidos?"18px":"2px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left 0.15s"}}></div>
              </div>
              <span style={{fontSize:"12px",color:p.ninosPermitidos?"#3d4554":"#9ca3af"}}>{p.ninosPermitidos?"Si":"No"}</span>
            </div>
          </div>
        </div>
      </div>
      {p.ninosPermitidos&&(
        <div style={S.g2}>
          <NumInput label="Max ninos" value={p.ninosMax} min={0} max={6} onChange={function(v){set("ninosMax",v);}}/>
          <NumInput label="Edad max ninos" value={p.ninosEdadMax} min={0} max={17} onChange={function(v){set("ninosEdadMax",v);}}/>
        </div>
      )}
    </div>
  );
}

function RegalosIncluidos(props){
  var sel=props.sel; var extras=props.extras; var onSel=props.onSel; var onExtras=props.onExtras; var catalogoBase=props.catalogoBase||[];
  var [nuevoExtra,setNuevoExtra]=useState("");

  function addExtra(){
    var t=nuevoExtra.trim();
    if(!t||extras.indexOf(t)!==-1) return;
    onExtras(extras.concat([t]));
    setNuevoExtra("");
  }
  function removeExtra(i){ onExtras(extras.filter(function(_,idx){return idx!==i;})); }

  return (
    <div>
      <div style={S.stit}>Del catalogo base (solo viaje QC)</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginBottom:"14px"}}>
        {catalogoBase.filter(function(g){return g.activo;}).map(function(g){
          var on=sel.indexOf(g.id)!==-1;
          return (
            <div key={g.id} style={chip(on,TEAL,true)} onClick={function(){
              onSel(on?sel.filter(function(x){return x!==g.id;}):sel.concat([g.id]));
            }}>{g.label}</div>
          );
        })}
      </div>
      <div style={S.stit}>Regalos adicionales (manual)</div>
      <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
        <input style={Object.assign({},S.inp,{flex:1})} value={nuevoExtra} onChange={function(e){setNuevoExtra(e.target.value);}} placeholder="Ej: Botella de tequila, Acceso a cenote..." onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();addExtra();}}}/>
        <button style={btn("teal",true)} onClick={addExtra} disabled={!nuevoExtra.trim()}>Agregar</button>
      </div>
      {extras.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
          {extras.map(function(re,i){
            return (
              <div key={i} style={{display:"inline-flex",alignItems:"center",gap:"5px",padding:"3px 8px",borderRadius:"6px",background:"rgba(14,165,160,0.12)",border:"1px solid rgba(14,165,160,0.3)",fontSize:"11px",color:TEAL}}>
                <span>{re}</span>
                <span style={{cursor:"pointer",color:"#9ca3af",fontWeight:"700"}} onClick={function(){removeExtra(i);}}>x</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DestModal(props){
  var d=props.dest;
  var isNew=!d;
  var blankPersonas={adultosMin:2,adultosMax:4,ninosPermitidos:false,ninosEdadMin:0,ninosEdadMax:12,ninosMax:0};
  var blank={id:uid(),nombre:"",estado:"",region:"internacional",activo:true,desc:"",personas:blankPersonas,
    regalosIncluidos:[],regalosExtras:[],
    qc:{noches:5,ageMin:25,ageMax:65,marital:["Casado","Union libre"],hoteles:[],regalosOpcionales:{habilitado:true,maxElecciones:1,items:[]}},
    nq:{habilitado:false,noches:3,label:"",hoteles:[]}};
  var [form,setForm]=useState(isNew?blank:JSON.parse(JSON.stringify(d)));
  var [sec,setSec]=useState("info");

  function setF(key,val){ setForm(function(p){return Object.assign({},p,{[key]:val});}); }
  function setQC(key,val){ setForm(function(p){return Object.assign({},p,{qc:Object.assign({},p.qc,{[key]:val})});}); }
  function setNQ(key,val){ setForm(function(p){return Object.assign({},p,{nq:Object.assign({},p.nq,{[key]:val})});}); }
  function setPersonas(val){ setF("personas",val); }

  function addHotel(tipo){
    var h={id:uid(),nombre:"",plan:"Todo Incluido",capacity:[],ageMin:25,ageMax:65,marital:[],activo:true,amenidades:[],hotelGifts:[]};
    if(tipo==="qc") setQC("hoteles",form.qc.hoteles.concat([h]));
    else setNQ("hoteles",form.nq.hoteles.concat([h]));
  }
  function removeHotel(tipo,hid){
    if(tipo==="qc") setQC("hoteles",form.qc.hoteles.filter(function(h){return h.id!==hid;}));
    else setNQ("hoteles",form.nq.hoteles.filter(function(h){return h.id!==hid;}));
  }
  function setHotel(tipo,hid,key,val){
    function upd(list){return list.map(function(h){return h.id===hid?Object.assign({},h,{[key]:val}):h;});}
    if(tipo==="qc") setQC("hoteles",upd(form.qc.hoteles));
    else setNQ("hoteles",upd(form.nq.hoteles));
  }
  function addGiftOpc(){
    var g={id:uid(),nombre:"",activo:true};
    setQC("regalosOpcionales",Object.assign({},form.qc.regalosOpcionales,{items:form.qc.regalosOpcionales.items.concat([g])}));
  }
  function removeGiftOpc(gid){
    setQC("regalosOpcionales",Object.assign({},form.qc.regalosOpcionales,{items:form.qc.regalosOpcionales.items.filter(function(g){return g.id!==gid;})}));
  }
  function setGiftOpc(gid,key,val){
    setQC("regalosOpcionales",Object.assign({},form.qc.regalosOpcionales,{items:form.qc.regalosOpcionales.items.map(function(g){return g.id===gid?Object.assign({},g,{[key]:val}):g;})}));
  }

  var SECS=[{k:"info",l:"Info general"},{k:"personas",l:"Personas"},{k:"qc",l:"Viaje QC"},{k:"nq",l:"Viaje NQ"},{k:"regalos",l:"Regalos QC"}];

  function HotelEditor(hprops){
    var h=hprops.h; var tipo=hprops.tipo;
    var [open,setOpen]=useState(false);
    var [htab,setHtab]=useState("general");

    function updHotel(key,val){ setHotel(tipo,h.id,key,val); }

    function addHabitacion(){
      var rooms=h.habitaciones||[];
      var nueva={id:uid(),nombre:"",descripcion:"",maxOcupantes:2,activo:true};
      updHotel("habitaciones",rooms.concat([nueva]));
    }
    function removeHabitacion(rid){
      updHotel("habitaciones",(h.habitaciones||[]).filter(function(r){return r.id!==rid;}));
    }
    function setHab(rid,key,val){
      updHotel("habitaciones",(h.habitaciones||[]).map(function(r){return r.id===rid?Object.assign({},r,{[key]:val}):r;}));
    }
    function addHabitacionDesdeTemplate(tmpl){
      var rooms=h.habitaciones||[];
      var nueva=Object.assign({},tmpl,{id:uid()});
      updHotel("habitaciones",rooms.concat([nueva]));
    }
    function toggleAmenidad(a){
      var cur=h.amenidades||[];
      var next=cur.indexOf(a)===-1?cur.concat([a]):cur.filter(function(x){return x!==a;});
      updHotel("amenidades",next);
    }

    var amenCount=(h.amenidades||[]).length;
    var habCount=(h.habitaciones||[]).length;

    var HTABS=[
      {k:"general",l:"General"},
      {k:"habitaciones",l:"Habitaciones ("+habCount+")"},
      {k:"amenidades",l:"Amenidades ("+amenCount+")"},
    ];
    if(tipo==="qc") HTABS.push({k:"reglas",l:"Reglas"});

    return (
      <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"14px",marginBottom:"10px",overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>

        {/* Header tarjeta hotel */}
        <div onClick={function(){setOpen(!open);}}
          style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",cursor:"pointer",background:open?"#ffffff":"#fff",borderBottom:open?"1px solid #e2e8f0":"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"36px",height:"36px",borderRadius:"10px",background:INDIGO+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>
              H
            </div>
            <div>
              <div style={{fontSize:"13px",fontWeight:"700",color:INDIGO}}>{h.nombre||"Hotel sin nombre"}</div>
              <div style={{display:"flex",gap:"6px",marginTop:"2px",alignItems:"center"}}>
                <span style={bdg(TEAL,TEAL+"18",TEAL+"44")}>{h.plan}</span>
                {amenCount>0&&<span style={bdg("#9ca3af","#1a1f2e","#3d4554")}>{amenCount} amenidades</span>}
                {habCount>0&&<span style={bdg(VIOLET,VIOLET+"18",VIOLET+"44")}>{habCount} tipos habitacion</span>}
                {!h.activo&&<span style={bdg(RED,"#fef2f2","#fecaca")}>Inactivo</span>}
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <button style={btn("danger",true)} onClick={function(e){e.stopPropagation();removeHotel(tipo,h.id);}}>Quitar</button>
            <div style={{fontSize:"12px",color:"#6b7280"}}>{open?"v":">"}</div>
          </div>
        </div>

        {/* Contenido expandible */}
        {open&&(
          <div style={{padding:"0"}}>
            {/* Sub-tabs del hotel */}
            <div style={{display:"flex",gap:"4px",padding:"10px 16px",borderBottom:"1px solid #f1f5f9",background:"#fafafa",overflowX:"auto"}}>
              {HTABS.map(function(t){
                return <button key={t.k} style={tabS(htab===t.k,INDIGO)} onClick={function(){setHtab(t.k);}}>{t.l}</button>;
              })}
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"6px"}}>
                <span style={{fontSize:"11px",color:"#6b7280"}}>Activo</span>
                <div onClick={function(){updHotel("activo",!h.activo);}}
                  style={{width:"36px",height:"20px",borderRadius:"10px",background:h.activo?TEAL:"#3d4554",cursor:"pointer",position:"relative",transition:"background 0.15s"}}>
                  <div style={{position:"absolute",top:"2px",left:h.activo?"18px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)",transition:"left 0.15s"}}></div>
                </div>
              </div>
            </div>

            <div style={{padding:"16px"}}>

              {/* TAB GENERAL */}
              {htab==="general"&&(
                <div>
                  <div style={Object.assign({},S.g2,{marginBottom:"12px"})}>
                    <div>
                      <label style={S.lbl}>Nombre del hotel</label>
                      <input style={S.inp} value={h.nombre} placeholder="Ej: Grand Oasis Palm" onChange={function(e){updHotel("nombre",e.target.value);}}/>
                    </div>
                    <div>
                      <label style={S.lbl}>Plan incluido</label>
                      <select style={Object.assign({},S.inp,{cursor:"pointer"})} value={h.plan} onChange={function(e){updHotel("plan",e.target.value);}}>
                        {PLAN_OPTS.map(function(p){return <option key={p}>{p}</option>;})}
                      </select>
                    </div>
                  </div>
                  <div style={{marginBottom:"12px"}}>
                    <label style={S.lbl}>Tipo de viajero</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                      {CAPACITY_OPTS.map(function(o){
                        var on=(h.capacity||[]).indexOf(o)!==-1;
                        return <div key={o} style={chip(on,TEAL,true)} onClick={function(){
                          var cur=h.capacity||[];
                          updHotel("capacity",on?cur.filter(function(x){return x!==o;}):cur.concat([o]));
                        }}>{o}</div>;
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={S.lbl}>Regalos especiales del hotel</label>
                    {(h.hotelGifts||[]).map(function(g,i){
                      return (
                        <div key={i} style={{display:"flex",gap:"6px",marginBottom:"5px",alignItems:"center"}}>
                          <input style={Object.assign({},S.inp,{flex:1})} value={g}
                            onChange={function(e){
                              var ng=h.hotelGifts.slice();ng[i]=e.target.value;updHotel("hotelGifts",ng);
                            }} placeholder="Ej: Cena romantica de bienvenida"/>
                          <button style={btn("danger",true)} onClick={function(){
                            updHotel("hotelGifts",h.hotelGifts.filter(function(_,j){return j!==i;}));
                          }}>X</button>
                        </div>
                      );
                    })}
                    <button style={btn("ghost",true)} onClick={function(){updHotel("hotelGifts",(h.hotelGifts||[]).concat([""]));}}>+ Agregar regalo</button>
                  </div>
                </div>
              )}

              {/* TAB HABITACIONES */}
              {htab==="habitaciones"&&(
                <div>
                  {(h.habitaciones||[]).length===0&&(
                    <div style={{padding:"20px",textAlign:"center",background:"#ffffff",borderRadius:"10px",border:"2px dashed #e2e8f0",marginBottom:"12px"}}>
                      <div style={{fontSize:"13px",color:"#6b7280",marginBottom:"4px"}}>Sin tipos de habitacion</div>
                      <div style={{fontSize:"11px",color:"#3d4554"}}>Agrega tipos manualmente o usa las plantillas</div>
                    </div>
                  )}
                  {(h.habitaciones||[]).map(function(r){
                    return (
                      <div key={r.id} style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:"10px",padding:"12px",marginBottom:"8px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
                          <div style={{flex:1,marginRight:"8px"}}>
                            <input style={Object.assign({},S.inp,{fontWeight:"600",marginBottom:"6px"})} value={r.nombre}
                              onChange={function(e){setHab(r.id,"nombre",e.target.value);}} placeholder="Nombre del tipo de habitacion"/>
                            <textarea style={Object.assign({},S.inp,{minHeight:"50px",resize:"vertical"})} value={r.descripcion}
                              onChange={function(e){setHab(r.id,"descripcion",e.target.value);}} placeholder="Descripcion, vista, cama, etc."/>
                          </div>
                          <button style={btn("danger",true)} onClick={function(){removeHabitacion(r.id);}}>X</button>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                            <span style={S.lbl}>Max ocupantes:</span>
                            <input style={Object.assign({},S.inp,{width:"60px"})} type="number" min="1" max="10" value={r.maxOcupantes}
                              onChange={function(e){setHab(r.id,"maxOcupantes",parseInt(e.target.value)||1);}}/>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                            <span style={S.lbl}>Activa</span>
                            <div onClick={function(){setHab(r.id,"activo",!r.activo);}}
                              style={{width:"32px",height:"18px",borderRadius:"9px",background:r.activo?TEAL:"#3d4554",cursor:"pointer",position:"relative"}}>
                              <div style={{position:"absolute",top:"2px",left:r.activo?"16px":"2px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left 0.15s"}}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"8px"}}>
                    <button style={btn("primary",true)} onClick={addHabitacion}>+ Nueva habitacion</button>
                    <div style={{fontSize:"11px",color:"#6b7280",display:"flex",alignItems:"center"}}>o usa plantilla:</div>
                    {ROOM_TYPES_DEFAULT.map(function(tmpl){
                      return (
                        <button key={tmpl.id} style={btn("ghost",true)} onClick={function(){addHabitacionDesdeTemplate(tmpl);}}>
                          {tmpl.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB AMENIDADES */}
              {htab==="amenidades"&&(
                <div>
                  {(h.amenidades||[]).length>0&&(
                    <div style={{marginBottom:"14px",padding:"10px 14px",background:TEAL+"0d",borderRadius:"10px",border:"1px solid "+TEAL+"33"}}>
                      <div style={S.stit}>Amenidades seleccionadas</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                        {(h.amenidades||[]).map(function(a){
                          return <span key={a} style={Object.assign({},chip(true,TEAL,true),{cursor:"default"})}>{a}</span>;
                        })}
                      </div>
                    </div>
                  )}
                  {AMENITY_CATS.map(function(cat){
                    return (
                      <div key={cat.cat} style={{marginBottom:"14px"}}>
                        <div style={{fontSize:"11px",fontWeight:"700",color:cat.col,marginBottom:"6px",display:"flex",alignItems:"center",gap:"6px"}}>
                          <div style={{width:"8px",height:"8px",borderRadius:"50%",background:cat.col}}></div>
                          {cat.cat}
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                          {cat.items.map(function(item){
                            var on=(h.amenidades||[]).indexOf(item)!==-1;
                            return (
                              <div key={item} style={chip(on,cat.col,true)} onClick={function(){toggleAmenidad(item);}}>
                                {on&&<span style={{marginRight:"3px"}}>ok</span>}
                                {item}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB REGLAS (solo QC) */}
              {htab==="reglas"&&tipo==="qc"&&(
                <div>
                  <div style={Object.assign({},S.g2,{marginBottom:"12px"})}>
                    <div>
                      <label style={S.lbl}>Edad minima</label>
                      <input style={S.inp} type="number" value={h.ageMin||25}
                        onChange={function(e){updHotel("ageMin",parseInt(e.target.value)||0);}}/>
                    </div>
                    <div>
                      <label style={S.lbl}>Edad maxima</label>
                      <input style={S.inp} type="number" value={h.ageMax||99}
                        onChange={function(e){updHotel("ageMax",parseInt(e.target.value)||99);}}/>
                    </div>
                  </div>
                  <div>
                    <label style={S.lbl}>Estado civil permitido</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                      {MARITAL_OPTS.map(function(o){
                        var on=(h.marital||[]).indexOf(o)!==-1;
                        return <div key={o} style={chip(on,INDIGO,true)} onClick={function(){
                          var cur=h.marital||[];
                          updHotel("marital",on?cur.filter(function(x){return x!==o;}):cur.concat([o]));
                        }}>{o}</div>;
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"16px"}}>
      <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"20px",width:"100%",maxWidth:"760px",maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:"linear-gradient(135deg,"+INDIGO+","+BLUE+")"}}>
          <div style={{fontSize:"14px",fontWeight:"600",color:"#1a1f2e"}}>{isNew?"Nuevo destino":form.nombre}</div>
          <div style={{display:"flex",gap:"6px"}}>
            {!isNew&&<button style={Object.assign({},btn("danger",true),{background:"#eaecf0",color:"#fff",border:"1px solid rgba(255,255,255,0.2)"})} onClick={function(){props.onDelete(d.id);}}>Eliminar</button>}
            <button style={Object.assign({},btn("ghost",true),{background:"#eff1f4",color:"#fff",border:"1px solid rgba(255,255,255,0.2)"})} onClick={props.onClose}>Cancelar</button>
            <button style={Object.assign({},btn("primary",true),{background:"#fff",color:INDIGO})} onClick={function(){props.onSave(form);}}>Guardar</button>
          </div>
        </div>
        <div style={{display:"flex",gap:"4px",padding:"10px 16px",borderBottom:"1px solid #e2e8f0",flexShrink:0,flexWrap:"wrap",background:"#fafafa"}}>
          {SECS.map(function(s){return <button key={s.k} style={tabS(sec===s.k,INDIGO)} onClick={function(){setSec(s.k);}}>{s.l}</button>;})}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>

          {sec==="info"&&(
            <div>
              <div style={Object.assign({},S.g2,{marginBottom:"10px"})}>
                <div><label style={S.lbl}>Nombre del destino</label><input style={S.inp} value={form.nombre} onChange={function(e){setF("nombre",e.target.value);}}/></div>
                <div><label style={S.lbl}>Estado / Region geografica</label><input style={S.inp} value={form.estado} onChange={function(e){setF("estado",e.target.value);}}/></div>
              </div>
              <div style={{marginBottom:"10px"}}>
                <label style={S.lbl}>Region</label>
                <div style={{display:"flex",gap:"6px"}}>
                  {REGION_OPTS.map(function(r){
                    var on=form.region===r.val;
                    return <div key={r.val} style={chip(on,r.color,false)} onClick={function(){setF("region",r.val);}}>{r.label}</div>;
                  })}
                </div>
              </div>
              <DescIA value={form.desc} nombre={form.nombre} estado={form.estado} region={form.region} onChange={function(v){setF("desc",v);}}/>
            </div>
          )}

          {sec==="personas"&&(
            <PersonasEditor personas={form.personas||blankPersonas} onChange={setPersonas}/>
          )}

          {sec==="qc"&&(
            <div>
              <div style={Object.assign({},S.g2,{marginBottom:"10px"})}>
                <div><label style={S.lbl}>Noches QC</label><input style={S.inp} type="number" min="1" value={form.qc.noches} onChange={function(e){setQC("noches",parseInt(e.target.value)||1);}}/></div>
                <div>
                  <label style={S.lbl}>Edad min / max</label>
                  <div style={{display:"flex",gap:"6px"}}>
                    <input style={Object.assign({},S.inp,{flex:1})} type="number" value={form.qc.ageMin} onChange={function(e){setQC("ageMin",parseInt(e.target.value)||0);}} placeholder="Min"/>
                    <input style={Object.assign({},S.inp,{flex:1})} type="number" value={form.qc.ageMax} onChange={function(e){setQC("ageMax",parseInt(e.target.value)||99);}} placeholder="Max"/>
                  </div>
                </div>
              </div>
              <div style={{marginBottom:"12px"}}>
                <label style={S.lbl}>Estado civil QC (destino)</label>
                <MultiCheck opts={MARITAL_OPTS} val={form.qc.marital} onChange={function(v){setQC("marital",v);}} col={TEAL}/>
              </div>
              <div style={S.stit}>Hoteles QC ({form.qc.hoteles.length})</div>
              {form.qc.hoteles.map(function(h){return <HotelEditor key={h.id} h={h} tipo="qc"/>;})}
              <button style={Object.assign({},btn("ghost",true),{marginTop:"4px"})} onClick={function(){addHotel("qc");}}>+ Agregar hotel QC</button>
              <div style={{marginTop:"16px",borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:"12px"}}>
                <div style={S.stit}>Regalos opcionales QC ({form.qc.regalosOpcionales.items.length})</div>
                {form.qc.regalosOpcionales.items.map(function(g){
                  return (
                    <div key={g.id} style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"5px"}}>
                      <input style={Object.assign({},S.inp,{flex:1})} value={g.nombre} onChange={function(e){setGiftOpc(g.id,"nombre",e.target.value);}} placeholder="Nombre del regalo opcional"/>
                      <button style={btn("danger",true)} onClick={function(){removeGiftOpc(g.id);}}>X</button>
                    </div>
                  );
                })}
                <button style={Object.assign({},btn("teal",true),{marginTop:"4px"})} onClick={addGiftOpc}>+ Agregar regalo opcional</button>
              </div>
            </div>
          )}

          {sec==="nq"&&(
            <div>
              <div style={{padding:"8px 12px",borderRadius:"8px",background:"rgba(71,85,105,0.08)",border:"1px solid rgba(71,85,105,0.2)",fontSize:"11px",color:"#9ca3af",marginBottom:"12px"}}>Los viajes NQ no incluyen regalos del catalogo.</div>
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
                <div style={{width:"36px",height:"20px",borderRadius:"10px",background:form.nq.habilitado?TEAL:"#f0f1f4",border:"1px solid "+(form.nq.habilitado?"rgba(14,165,160,0.5)":"#eceff3"),cursor:"pointer",position:"relative"}} onClick={function(){setNQ("habilitado",!form.nq.habilitado);}}>
                  <div style={{position:"absolute",top:"2px",left:form.nq.habilitado?"18px":"2px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left 0.15s"}}></div>
                </div>
                <div style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>Viaje NQ habilitado</div>
              </div>
              {form.nq.habilitado&&(
                <div>
                  <div style={Object.assign({},S.g2,{marginBottom:"10px"})}>
                    <div><label style={S.lbl}>Noches NQ</label><input style={S.inp} type="number" min="1" value={form.nq.noches} onChange={function(e){setNQ("noches",parseInt(e.target.value)||1);}}/></div>
                    <div><label style={S.lbl}>Etiqueta NQ</label><input style={S.inp} value={form.nq.label} onChange={function(e){setNQ("label",e.target.value);}} placeholder="Ej: Cancun Esencial"/></div>
                  </div>
                  <div style={S.stit}>Hoteles NQ ({form.nq.hoteles.length})</div>
                  {form.nq.hoteles.map(function(h){return <HotelEditor key={h.id} h={h} tipo="nq"/>;})}
                  <button style={Object.assign({},btn("ghost",true),{marginTop:"4px"})} onClick={function(){addHotel("nq");}}>+ Agregar hotel NQ</button>
                </div>
              )}
            </div>
          )}

          {sec==="regalos"&&(
            <div>
            <div style={{padding:"8px 12px",background:"rgba(14,165,160,0.06)",border:"1px solid rgba(14,165,160,0.2)",borderRadius:"8px",fontSize:"11px",color:TEAL,marginBottom:"12px"}}>Estos regalos son exclusivos del viaje QC. El viaje NQ no incluye regalos.</div>
            <RegalosIncluidos
              sel={form.regalosIncluidos}
              extras={form.regalosExtras||[]}
              catalogoBase={props.includedGifts||[]}
              onSel={function(v){setF("regalosIncluidos",v);}}
              onExtras={function(v){setF("regalosExtras",v);}}
            />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function ReglaRow(props){
  var d=props.dest;
  var regCol=d.region==="nacional"?BLUE:VIOLET;
  return (
    <div style={Object.assign({},S.card,{padding:"12px 14px"})}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"6px"}}>
        <div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>{d.nombre}</div>
        <span style={bdg(regCol,regCol+"18",regCol+"33")}>{d.region==="nacional"?"USA":"Internacional"}</span>
      </div>
      {d.personas&&(
        <div style={{fontSize:"11px",color:"#9ca3af",marginBottom:"6px"}}>{personasLabel(d.personas)}</div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",fontSize:"11px"}}>
        <div>
          <div style={{color:"#9ca3af",marginBottom:"3px",fontWeight:"600"}}>QC</div>
          <div style={{color:"#6b7280"}}>{d.qc.noches} noches - Edad {d.qc.ageMin}-{d.qc.ageMax}</div>
          <div style={{color:"#9ca3af",marginTop:"2px"}}>{d.qc.marital.join(", ")}</div>
          <div style={{color:"#9ca3af",marginTop:"2px"}}>{d.qc.hoteles.length} hotel{d.qc.hoteles.length!==1?"es":""}</div>
        </div>
        <div>
          <div style={{color:"#9ca3af",marginBottom:"3px",fontWeight:"600"}}>NQ</div>
          {d.nq.habilitado
            ? <div><div style={{color:AMBER}}>{d.nq.noches} noches - {d.nq.label}</div><div style={{color:"#9ca3af",marginTop:"2px"}}>{d.nq.hoteles.length} hotel{d.nq.hoteles.length!==1?"es":""}</div></div>
            : <div style={{color:"#b0b8c4"}}>No habilitado</div>
          }
        </div>
      </div>
    </div>
  );
}


// =====================================================================
// SEED REGALOS OPCIONALES - con costo estimado
// (en produccion vive en Supabase; aqui en state del modulo)
// =====================================================================
var SEED_REGALOS_OPC = [
  {id:"G001",nombre:"Tour a Chichen Itza",          costoEst:45,  categoria:"Tour",      activo:true},
  {id:"G002",nombre:"Tour snorkel Isla Mujeres",    costoEst:35,  categoria:"Tour",      activo:true},
  {id:"G004",nombre:"Gift Card $75 USD",             costoEst:75,  categoria:"Gift Card", activo:true},
  {id:"G006",nombre:"Cena romantica en la playa",   costoEst:80,  categoria:"Experiencia",activo:true},
  {id:"G007",nombre:"Tour en lancha al Arco",       costoEst:40,  categoria:"Tour",      activo:true},
  {id:"G008",nombre:"Gift Card $75 USD",             costoEst:75,  categoria:"Gift Card", activo:true},
  {id:"G009",nombre:"Tour Tulum + Cenote",          costoEst:55,  categoria:"Tour",      activo:true},
  {id:"G010",nombre:"Snorkel en arrecife",          costoEst:30,  categoria:"Tour",      activo:true},
  {id:"G011",nombre:"Gift Card $75 USD",             costoEst:75,  categoria:"Gift Card", activo:true},
  {id:"G013",nombre:"Tour en catamaran bahias",     costoEst:60,  categoria:"Tour",      activo:true},
  {id:"G014",nombre:"Gift Card $50 USD",             costoEst:50,  categoria:"Gift Card", activo:true},
  {id:"G020",nombre:"$50 credito casino",           costoEst:50,  categoria:"Credito",   activo:true},
  {id:"G021",nombre:"Show ticket (2 personas)",     costoEst:90,  categoria:"Experiencia",activo:true},
  {id:"G022",nombre:"Gift Card $100 USD",            costoEst:100, categoria:"Gift Card", activo:true},
  {id:"G023",nombre:"Gift Card $100 USD",            costoEst:100, categoria:"Gift Card", activo:true},
  {id:"G024",nombre:"2 entradas parque de agua",    costoEst:70,  categoria:"Entradas",  activo:true},
  {id:"G025",nombre:"2 entradas Disney (1 dia)",    costoEst:220, categoria:"Entradas",  activo:true},
  {id:"G030",nombre:"Tour en barco Bahia Banderas", costoEst:50,  categoria:"Tour",      activo:true},
  {id:"G031",nombre:"Gift Card $50 USD",             costoEst:50,  categoria:"Gift Card", activo:true},
];

var CATEGORIAS_REGALO = ["Tour","Gift Card","Experiencia","Credito","Entradas","Otro"];

// =====================================================================
// MODAL REGALO OPCIONAL
// =====================================================================
function RegaloModal(props){
  var regalo=props.regalo; var onSave=props.onSave; var onClose=props.onClose;
  var isNew=!regalo;
  var [form,setForm]=useState(regalo
    ? Object.assign({},regalo)
    : {id:"G"+uid(),nombre:"",costoEst:0,categoria:"Tour",activo:true}
  );
  function set(k,v){ setForm(function(p){return Object.assign({},p,{[k]:v});}); }
  var valid=form.nombre.trim().length>0 && form.costoEst>=0;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(6px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={onClose}>
      <div style={{background:"#ffffff",border:"1px solid #d8dbe0",borderRadius:"16px",padding:"24px",width:"100%",maxWidth:"420px"}} onClick={function(e){e.stopPropagation();}}>
        <div style={{fontSize:"15px",fontWeight:"700",color:"#1a1f2e",marginBottom:"18px"}}>{isNew?"Nuevo regalo opcional":"Editar regalo opcional"}</div>
        <div style={{marginBottom:"12px"}}>
          <label style={S.lbl}>Nombre del regalo *</label>
          <input style={S.inp} value={form.nombre} onChange={function(e){set("nombre",e.target.value);}} placeholder="Ej. Tour a Tulum + Cenote"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
          <div>
            <label style={S.lbl}>Costo estimado (USD) *</label>
            <input style={S.inp} type="number" min="0" step="1" value={form.costoEst} onChange={function(e){set("costoEst",parseFloat(e.target.value)||0);}}/>
          </div>
          <div>
            <label style={S.lbl}>Categoria</label>
            <select style={Object.assign({},S.inp,{cursor:"pointer",background:"#ffffff"})} value={form.categoria} onChange={function(e){set("categoria",e.target.value);}}>
              {CATEGORIAS_REGALO.map(function(c){ return <option key={c} value={c}>{c}</option>; })}
            </select>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"20px"}}>
          <div style={{width:"34px",height:"20px",borderRadius:"10px",background:form.activo?TEAL:"#f0f1f4",border:"1px solid "+(form.activo?"rgba(14,165,160,0.4)":"#eceff3"),cursor:"pointer",position:"relative",flexShrink:0}} onClick={function(){set("activo",!form.activo);}}>
            <div style={{position:"absolute",top:"2px",left:form.activo?"16px":"2px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left 0.15s"}}></div>
          </div>
          <span style={{fontSize:"12px",color:"#6b7280"}}>Regalo activo (disponible para asignar a destinos)</span>
        </div>
        <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
          <button style={btn("ghost")} onClick={onClose}>Cancelar</button>
          <button style={btn("teal")} onClick={function(){if(valid) onSave(form);}} disabled={!valid}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// MODAL REGALO INCLUIDO (IG)
// =====================================================================
function IGModal(props){
  var gift=props.gift; var onSave=props.onSave; var onClose=props.onClose;
  var isNew=!gift;
  var [label,setLabel]=useState(gift?gift.label:"");
  var [activo,setActivo]=useState(gift?gift.activo:true);
  var valid=label.trim().length>0;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",backdropFilter:"blur(6px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}} onClick={onClose}>
      <div style={{background:"#ffffff",border:"1px solid #d8dbe0",borderRadius:"16px",padding:"24px",width:"100%",maxWidth:"380px"}} onClick={function(e){e.stopPropagation();}}>
        <div style={{fontSize:"15px",fontWeight:"700",color:"#1a1f2e",marginBottom:"18px"}}>{isNew?"Nuevo regalo incluido QC":"Editar regalo incluido QC"}</div>
        <div style={{marginBottom:"12px"}}>
          <label style={S.lbl}>Nombre *</label>
          <input style={S.inp} value={label} onChange={function(e){setLabel(e.target.value);}} placeholder="Ej. Traslado aeropuerto-hotel" autoFocus/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"20px"}}>
          <div style={{width:"34px",height:"20px",borderRadius:"10px",background:activo?INDIGO:"#f0f1f4",border:"1px solid "+(activo?"rgba(99,102,241,0.4)":"#eceff3"),cursor:"pointer",position:"relative",flexShrink:0}} onClick={function(){setActivo(function(p){return !p;});}}>
            <div style={{position:"absolute",top:"2px",left:activo?"16px":"2px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left 0.15s"}}></div>
          </div>
          <span style={{fontSize:"12px",color:"#6b7280"}}>Activo (aparece al configurar destinos)</span>
        </div>
        <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
          <button style={btn("ghost")} onClick={onClose}>Cancelar</button>
          <button style={btn("indigo")} onClick={function(){if(valid) onSave(Object.assign({},gift||{id:"IG"+uid()},{label:label.trim(),activo:activo}));}} disabled={!valid}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// REGALOS CONFIG TAB - 3 sub-tabs
// =====================================================================
function RegalosConfigTab(props){
  var gifts=props.gifts;           // regalos incluidos IG
  var onGifts=props.onGifts;
  var regalosOpc=props.regalosOpc; // catalogo global de opcionales
  var onRegalosOpc=props.onRegalosOpc;
  var dests=props.dests;
  var onDests=props.onDests;

  var [sub,setSub]=useState("opcionales");
  var [modalOpc,setModalOpc]=useState(null);   // null | {regalo} | {nuevo}
  var [modalIG,setModalIG]=useState(null);     // null | {gift} | {nuevo}
  var [filtCat,setFiltCat]=useState("Todas");
  var [searchOpc,setSearchOpc]=useState("");

  // -- helpers regalos opcionales --
  function saveOpc(form){
    onRegalosOpc(function(prev){
      var exists=prev.some(function(r){return r.id===form.id;});
      return exists?prev.map(function(r){return r.id===form.id?form:r;}):prev.concat([form]);
    });
    setModalOpc(null);
  }
  function toggleOpc(id){
    onRegalosOpc(function(prev){return prev.map(function(r){return r.id===id?Object.assign({},r,{activo:!r.activo}):r;});});
  }
  function deleteOpc(id){
    onRegalosOpc(function(prev){return prev.filter(function(r){return r.id!==id;});});
    // Quitar de destinos si estaba asignado
    onDests(function(prev){
      return prev.map(function(d){
        var items=(d.qc.regalosOpcionales.items||[]).filter(function(g){return g.id!==id;});
        return Object.assign({},d,{qc:Object.assign({},d.qc,{regalosOpcionales:Object.assign({},d.qc.regalosOpcionales,{items:items})})});
      });
    });
  }

  // -- helpers regalos incluidos IG --
  function saveIG(form){
    onGifts(function(prev){
      var exists=prev.some(function(g){return g.id===form.id;});
      return exists?prev.map(function(g){return g.id===form.id?form:g;}):prev.concat([form]);
    });
    setModalIG(null);
  }
  function toggleIG(id){
    onGifts(function(prev){return prev.map(function(g){return g.id===id?Object.assign({},g,{activo:!g.activo}):g;});});
  }
  function deleteIG(id){
    onGifts(function(prev){return prev.filter(function(g){return g.id!==id;});});
    onDests(function(prev){
      return prev.map(function(d){
        return Object.assign({},d,{regalosIncluidos:(d.regalosIncluidos||[]).filter(function(x){return x!==id;})});
      });
    });
  }

  // -- helpers asignacion a destinos --
  function toggleAsign(destId, regaloId){
    onDests(function(prev){
      return prev.map(function(d){
        if(d.id!==destId) return d;
        var items=d.qc.regalosOpcionales.items||[];
        var yaEsta=items.some(function(g){return g.id===regaloId;});
        var reg=regalosOpc.find(function(r){return r.id===regaloId;});
        var newItems=yaEsta
          ? items.filter(function(g){return g.id!==regaloId;})
          : items.concat([{id:reg.id,nombre:reg.nombre,activo:true}]);
        return Object.assign({},d,{qc:Object.assign({},d.qc,{regalosOpcionales:Object.assign({},d.qc.regalosOpcionales,{items:newItems})})});
      });
    });
  }
  function setMaxElecciones(destId,val){
    onDests(function(prev){
      return prev.map(function(d){
        if(d.id!==destId) return d;
        return Object.assign({},d,{qc:Object.assign({},d.qc,{regalosOpcionales:Object.assign({},d.qc.regalosOpcionales,{maxElecciones:val})})});
      });
    });
  }

  // -- filtros opcionales --
  var cats=["Todas"].concat(CATEGORIAS_REGALO);
  var opcFilt=regalosOpc.filter(function(r){
    var catOk=filtCat==="Todas"||r.categoria===filtCat;
    var searchOk=!searchOpc||r.nombre.toLowerCase().indexOf(searchOpc.toLowerCase())!==-1;
    return catOk&&searchOk;
  });

  // -- stats --
  var totalOpcActivos=regalosOpc.filter(function(r){return r.activo;}).length;
  var costoPromedioOpc=regalosOpc.length>0?Math.round(regalosOpc.reduce(function(a,r){return a+Number(r.costoEst||0);},0)/regalosOpc.length):0;
  var totalIGActivos=gifts.filter(function(g){return g.activo;}).length;

  var CAT_COLOR={
    "Tour":"#1565c0","Gift Card":"#1a7f3c","Experiencia":"#f59e0b",
    "Credito":"#5b21b6","Entradas":"#f97316","Otro":"#6b7280"
  };

  function Toggle(tprops){
    var on=tprops.on; var onChange=tprops.onChange; var col=tprops.col||TEAL;
    return (
      <div style={{width:"32px",height:"18px",borderRadius:"9px",background:on?col:"#f0f1f4",border:"1px solid "+(on?col+"66":"#eceff3"),cursor:"pointer",position:"relative",flexShrink:0}} onClick={onChange}>
        <div style={{position:"absolute",top:"2px",left:on?"16px":"2px",width:"12px",height:"12px",borderRadius:"50%",background:"#fff",transition:"left 0.15s"}}></div>
      </div>
    );
  }

  var subTabs=[
    {k:"opcionales",l:"Opcionales (vendedor)"},
    {k:"incluidos", l:"Incluidos QC"},
    {k:"asignacion",l:"Asignacion a destinos"},
  ];

  return (
    <div style={{padding:"0"}}>
      {/* Sub-tabs */}
      <div style={{display:"flex",gap:"4px",padding:"12px 16px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",marginBottom:"16px"}}>
        {subTabs.map(function(t){
          return <button key={t.k} style={tabS(sub===t.k,VIOLET)} onClick={function(){setSub(t.k);}}>{t.l}</button>;
        })}
      </div>

      {/* ========== SUB: OPCIONALES ========== */}
      {sub==="opcionales"&&(
        <div style={{padding:"0 16px 16px"}}>
          {/* Stats */}
          <div style={{display:"flex",gap:"10px",marginBottom:"14px",flexWrap:"wrap"}}>
            {[
              {l:"Total",v:String(regalosOpc.length),c:VIOLET},
              {l:"Activos",v:String(totalOpcActivos),c:GREEN},
              {l:"Costo promedio",v:"$"+costoPromedioOpc+" USD",c:AMBER},
              {l:"Categorias",v:String(new Set(regalosOpc.map(function(r){return r.categoria;})).size),c:BLUE},
            ].map(function(s){
              return (
                <div key={s.l} style={{padding:"10px 14px",borderRadius:"10px",background:s.c+"09",border:"1px solid "+s.c+"20",minWidth:"110px"}}>
                  <div style={{fontSize:"9px",fontWeight:"700",color:s.c,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"3px"}}>{s.l}</div>
                  <div style={{fontSize:"17px",fontWeight:"800",color:s.c}}>{s.v}</div>
                </div>
              );
            })}
          </div>
          {/* Toolbar */}
          <div style={{display:"flex",gap:"8px",marginBottom:"12px",flexWrap:"wrap",alignItems:"center"}}>
            <input style={Object.assign({},S.inp,{flex:1,minWidth:"180px"})} value={searchOpc} onChange={function(e){setSearchOpc(e.target.value);}} placeholder="Buscar regalo..."/>
            <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
              {cats.map(function(c){
                return <button key={c} style={tabS(filtCat===c,CAT_COLOR[c]||VIOLET)} onClick={function(){setFiltCat(c);}}>{c}</button>;
              })}
            </div>
            <button style={btn("violet")} onClick={function(){setModalOpc({nuevo:true});}}>+ Nuevo regalo</button>
          </div>
          {/* Tabla */}
          <div style={{background:"#f9fafb",borderRadius:"12px",border:"1px solid #e3e6ea",overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 110px 100px 80px 60px 120px",padding:"7px 14px",borderBottom:"1px solid #e8eaed",fontSize:"10px",fontWeight:"700",color:"#b0b8c4",textTransform:"uppercase",letterSpacing:"0.08em"}}>
              <div>Regalo</div>
              <div style={{textAlign:"center"}}>Categoria</div>
              <div style={{textAlign:"right"}}>Costo est.</div>
              <div style={{textAlign:"center"}}>Destinos</div>
              <div style={{textAlign:"center"}}>Activo</div>
              <div style={{textAlign:"right"}}>Acciones</div>
            </div>
            {opcFilt.length===0&&(
              <div style={{padding:"28px",textAlign:"center",fontSize:"12px",color:"#9ca3af"}}>Sin resultados</div>
            )}
            {opcFilt.map(function(r,idx){
              var destCount=dests.filter(function(d){
                return (d.qc.regalosOpcionales.items||[]).some(function(g){return g.id===r.id;});
              }).length;
              var catCol=CAT_COLOR[r.categoria]||"#6b7280";
              return (
                <div key={r.id} style={{display:"grid",gridTemplateColumns:"1fr 110px 100px 80px 60px 120px",padding:"10px 14px",borderBottom:"1px solid #edf0f3",background:idx%2===0?"rgba(255,255,255,0.01)":"transparent",alignItems:"center",opacity:r.activo?1:0.45}}>
                  <div>
                    <div style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>{r.nombre}</div>
                    <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"1px"}}>{r.id}</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <span style={{padding:"2px 8px",borderRadius:"20px",fontSize:"10px",fontWeight:"700",color:catCol,background:catCol+"14",border:"1px solid "+catCol+"30"}}>{r.categoria}</span>
                  </div>
                  <div style={{textAlign:"right",fontSize:"13px",fontWeight:"700",color:AMBER}}>${r.costoEst} USD</div>
                  <div style={{textAlign:"center"}}>
                    <span style={{fontSize:"12px",fontWeight:"700",color:destCount>0?BLUE:"#b0b8c4"}}>{destCount}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"center"}}>
                    <Toggle on={r.activo} onChange={function(){toggleOpc(r.id);}}/>
                  </div>
                  <div style={{display:"flex",gap:"4px",justifyContent:"flex-end"}}>
                    <button style={btn("ghost",true)} onClick={function(){setModalOpc({regalo:r});}}>Editar</button>
                    <button style={btn("danger",true)} onClick={function(){if(window.confirm("Eliminar este regalo y quitarlo de todos los destinos?")) deleteOpc(r.id);}}>Quitar</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== SUB: INCLUIDOS QC ========== */}
      {sub==="incluidos"&&(
        <div style={{padding:"0 16px 16px"}}>
          <div style={{padding:"9px 13px",background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.15)",borderRadius:"10px",fontSize:"11px",color:"#1565c0",marginBottom:"14px"}}>
            Regalos fijos que se incluyen en todo viaje QC segun el destino (traslados, all-inclusive, etc.). No son elegibles por el vendedor.
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
            <div style={{fontSize:"12px",color:"#9ca3af"}}>{totalIGActivos} activos de {gifts.length} total</div>
            <button style={btn("indigo")} onClick={function(){setModalIG({nuevo:true});}}>+ Nuevo</button>
          </div>
          <div style={{background:"#f9fafb",borderRadius:"12px",border:"1px solid #e3e6ea",overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"60px 1fr 80px 110px",padding:"7px 14px",borderBottom:"1px solid #e8eaed",fontSize:"10px",fontWeight:"700",color:"#b0b8c4",textTransform:"uppercase",letterSpacing:"0.08em"}}>
              <div>ID</div><div>Regalo</div><div style={{textAlign:"center"}}>Activo</div><div style={{textAlign:"right"}}>Acciones</div>
            </div>
            {gifts.map(function(g,idx){
              var usadoEn=dests.filter(function(d){return (d.regalosIncluidos||[]).indexOf(g.id)!==-1;}).length;
              return (
                <div key={g.id} style={{display:"grid",gridTemplateColumns:"60px 1fr 80px 110px",padding:"9px 14px",borderBottom:"1px solid #edf0f3",background:idx%2===0?"rgba(255,255,255,0.01)":"transparent",alignItems:"center",opacity:g.activo?1:0.45}}>
                  <div style={{fontSize:"10px",color:"#9ca3af",fontWeight:"600"}}>{g.id}</div>
                  <div>
                    <div style={{fontSize:"12px",color:"#3d4554",fontWeight:"600"}}>{g.label}</div>
                    <div style={{fontSize:"10px",color:"#b0b8c4",marginTop:"1px"}}>Usado en {usadoEn} destino{usadoEn!==1?"s":""}</div>
                  </div>
                  <div style={{display:"flex",justifyContent:"center"}}>
                    <Toggle on={g.activo} onChange={function(){toggleIG(g.id);}} col={INDIGO}/>
                  </div>
                  <div style={{display:"flex",gap:"4px",justifyContent:"flex-end"}}>
                    <button style={btn("ghost",true)} onClick={function(){setModalIG({gift:g});}}>Editar</button>
                    <button style={btn("danger",true)} onClick={function(){if(window.confirm("Eliminar y quitar de todos los destinos?")) deleteIG(g.id);}}>Quitar</button>
                  </div>
                </div>
              );
            })}
            {gifts.length===0&&<div style={{padding:"24px",textAlign:"center",fontSize:"12px",color:"#9ca3af"}}>Sin regalos incluidos</div>}
          </div>
        </div>
      )}

      {/* ========== SUB: ASIGNACION ========== */}
      {sub==="asignacion"&&(
        <div style={{padding:"0 16px 16px"}}>
          <div style={{padding:"9px 13px",background:"rgba(167,139,250,0.07)",border:"1px solid rgba(167,139,250,0.15)",borderRadius:"10px",fontSize:"11px",color:VIOLET,marginBottom:"16px"}}>
            Define que regalos opcionales aparecen en cada destino QC y cuantos puede elegir el vendedor. Solo se muestran regalos activos.
          </div>
          {dests.filter(function(d){return d.activo;}).map(function(d){
            var asignados=(d.qc.regalosOpcionales.items||[]).map(function(g){return g.id;});
            var maxEl=d.qc.regalosOpcionales.maxElecciones||1;
            var costoTotal=regalosOpc.filter(function(r){return asignados.indexOf(r.id)!==-1;}).reduce(function(a,r){return a+Number(r.costoEst||0);},0);
            var actOpc=regalosOpc.filter(function(r){return r.activo;});
            return (
              <div key={d.id} style={{background:"#f9fafb",border:"1px solid #e3e6ea",borderRadius:"12px",padding:"14px 16px",marginBottom:"10px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:"700",color:"#3d4554"}}>{d.nombre}</div>
                    <div style={{fontSize:"10px",color:"#9ca3af",marginTop:"2px"}}>{asignados.length} regalos asignados . Costo max: ${costoTotal} USD</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{fontSize:"11px",color:"#6b7280"}}>Max a elegir:</span>
                    <div style={{display:"flex",gap:"2px"}}>
                      {[1,2,3].map(function(n){
                        return <button key={n} style={tabS(maxEl===n,VIOLET)} onClick={function(){setMaxElecciones(d.id,n);}}>{n}</button>;
                      })}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                  {actOpc.map(function(r){
                    var on=asignados.indexOf(r.id)!==-1;
                    var catCol=CAT_COLOR[r.categoria]||"#6b7280";
                    return (
                      <div key={r.id} style={{display:"flex",alignItems:"center",gap:"6px",padding:"5px 10px",borderRadius:"8px",cursor:"pointer",background:on?"#ebe6fd":"#fafbfc",border:"1px solid "+(on?"rgba(167,139,250,0.35)":"#f0f1f4"),transition:"all 0.15s"}} onClick={function(){toggleAsign(d.id,r.id);}}>
                        <div style={{width:"8px",height:"8px",borderRadius:"50%",background:on?VIOLET:"#b0b8c4",flexShrink:0}}></div>
                        <span style={{fontSize:"11px",fontWeight:"600",color:on?"#c4b5fd":"#9ca3af"}}>{r.nombre}</span>
                        <span style={{fontSize:"10px",color:catCol,background:catCol+"14",padding:"1px 5px",borderRadius:"4px",fontWeight:"700"}}>${r.costoEst}</span>
                      </div>
                    );
                  })}
                  {actOpc.length===0&&<span style={{fontSize:"11px",color:"#b0b8c4"}}>No hay regalos opcionales activos en el catalogo.</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpc&&<RegaloModal regalo={modalOpc.regalo||null} onSave={saveOpc} onClose={function(){setModalOpc(null);}}/>}
      {modalIG&&<IGModal gift={modalIG.gift||null} onSave={saveIG} onClose={function(){setModalIG(null);}}/>}
    </div>
  );
}

function ReglasTab(props){
  return (
    <div style={{padding:"16px 20px"}}>
      <div style={{fontSize:"12px",color:"#9ca3af",marginBottom:"14px",padding:"10px 14px",background:"rgba(99,102,241,0.06)",borderRadius:"10px",border:"1px solid rgba(99,102,241,0.15)"}}>
        Vista de referencia de reglas de calificacion. Para editar ve al catalogo.
      </div>
      {props.dests.filter(function(d){return d.activo;}).map(function(d){
        return <ReglaRow key={d.id} dest={d}/>;
      })}
    </div>
  );
}

export default function DestinationsModule(){
  var [dests,setDests]=useState(SEED);
  var [includedGifts,setIncludedGifts]=useState(INCLUDED_GIFTS_SEED);
  var [regalosOpc,setRegalosOpc]=useState(SEED_REGALOS_OPC);
  var [tab,setTab]=useState("catalogo");
  var [modal,setModal]=useState(null);
  var TABS=[
    {k:"catalogo",   l:"Catalogo"},
    {k:"reglas",     l:"Reglas QC/NQ"},
    {k:"regalos",    l:"Regalos Config"},
  ];

  function handleSave(form){
    setDests(function(prev){
      var exists=prev.some(function(d){return d.id===form.id;});
      return exists?prev.map(function(d){return d.id===form.id?form:d;}):prev.concat([form]);
    });
    setModal(null);
  }
  function handleDelete(id){ setDests(function(prev){return prev.filter(function(d){return d.id!==id;});}); setModal(null); }
  function handleToggle(id){ setDests(function(prev){return prev.map(function(d){return d.id===id?Object.assign({},d,{activo:!d.activo}):d;});}); }

  return (
    <div style={S.wrap}>
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",minHeight:"52px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
        <div style={{display:"flex",gap:"4px"}}>
          {TABS.map(function(t){return <button key={t.k} style={tabS(tab===t.k,INDIGO)} onClick={function(){setTab(t.k);}}>{t.l}</button>;})}
        </div>
        <div style={{fontSize:"11px",color:"#9ca3af",fontWeight:"600"}}>{dests.filter(function(d){return d.activo;}).length} destinos activos</div>
      </div>
      {tab==="catalogo"&&<CatalogTab dests={dests} includedGifts={includedGifts} onEdit={function(d){setModal({dest:d});}} onToggle={handleToggle} onNuevo={function(){setModal({dest:null});}}/>}
      {tab==="reglas"&&<ReglasTab dests={dests}/>}
      {tab==="regalos"&&<RegalosConfigTab gifts={includedGifts} onGifts={setIncludedGifts} regalosOpc={regalosOpc} onRegalosOpc={setRegalosOpc} dests={dests} onDests={setDests}/>}
      {modal&&<DestModal dest={modal.dest} includedGifts={includedGifts} onSave={handleSave} onDelete={handleDelete} onClose={function(){setModal(null);}}/>}
    </div>
  );
}
