import { useState } from "react";
import HotelSearch from "./hotel-search.jsx";

var BRAND_DARK  = "#1a385a";
var BRAND_MID   = "#47718a";
var GREEN  = "#22c55e";
var AMBER  = "#f59e0b";
var RED    = "#ef4444";
var VIOLET = "#5b21b6";
var CORAL  = "#f97316";



var PLANES = ["Todo Incluido","Todo Incluido Premium","Solo Habitacion","Desayuno incluido","Media pension"];
var CATEGORIAS_HOTEL = ["3 estrellas","4 estrellas","5 estrellas","Boutique","Gran Lujo"];
var TIPO_CAMA = ["King","Queen","Doble","Matrimonial","Literas","Camarote"];
var VISTA_OPTS = ["Mar","Jardin","Piscina","Ciudad","Montana","Interior"];

var AMENIDADES_CATS = [
  {cat:"Agua y Playa",  col:"#0ea5a0", items:["Piscina","Piscina infinity","Playa privada","Bar swim-up","Jacuzzi","Deportes acuaticos","Kayak","Centro de buceo","Toboganes"]},
  {cat:"Bienestar",     col:"#5b21b6", items:["Spa","Gimnasio","Yoga","Sauna","Vapor","Masajes","Centro medico","Meditacion"]},
  {cat:"Gastronomia",   col:"#f59e0b", items:["Restaurante principal","Restaurantes tematicos","Bar","Snack bar","Room service 24h","Minibar","Buffet internacional","Chef privado"]},
  {cat:"Entretenimiento",col:"#f97316",items:["Shows nocturnos","Casino","Kids club","Teen club","Club nocturno","Teatro","Karaoke","Animacion diurna","Bingo"]},
  {cat:"Servicios",     col:"#47718a", items:["Butler service","Wi-Fi incluido","Estacionamiento","Lavanderia","Concierge","Transfer incluido","Caja fuerte","Guardabebe","Servicio de ninera"]},
  {cat:"Deportes",      col:"#22c55e", items:["Golf","Tenis","Padel","Ciclismo","Voleibol playa","Futbol","Basketball","Ping pong","Arco y flecha"]},
  {cat:"Parques",       col:"#6366f1", items:["Parque tematico","Parque acuatico","Zoologico","Aventura en selva","Cenotes privados"]},
  {cat:"Habitacion",    col:"#ec4899", items:["Smart TV","Netflix","Cafetera Nespresso","Terraza privada","Jacuzzi en hab.","Bano turco","Cama premium","Almohadas de plumas","Amenidades de lujo"]},
];

var AMENIDADES_HABITACION_CATS = [
  {cat:"Camas y descanso",  col:"#5b21b6", items:["Cama king size","Cama queen size","Cama matrimonial","Dos camas","Camas literas","Colchon premium","Almohadas de plumas","Sabanas de alta hebra"]},
  {cat:"Bano",              col:"#0ea5a0", items:["Banera","Regadera efecto lluvia","Jacuzzi en habitacion","Bano turco","Doble lavabo","Amenidades de lujo","Secador de cabello","Planchas"]},
  {cat:"Tecnologia",        col:"#47718a", items:["Smart TV","Netflix","Wi-Fi alta velocidad","Bluetooth speaker","iPad","Control inteligente","Caja fuerte digital","USB charging"]},
  {cat:"Vistas y terraza",  col:"#22c55e", items:["Terraza privada","Balcon","Vista al mar","Vista a la piscina","Vista al jardin","Vista a la ciudad","Vista a la montana"]},
  {cat:"Alimentos",         col:"#f59e0b", items:["Minibar","Cafetera Nespresso","Horno microondas","Nevera","Bar privado","Frutas de bienvenida","Chocolates de cortesia"]},
  {cat:"Servicios",         col:"#f97316", items:["Butler privado","Servicio de planchado","Room service 24h","Cama extra","Cuna de bebe","Cocina completa","Sala de estar"]},
];

var SEED_HOTELS = [
  {
    id:"HT001", nombre:"Grand Oasis Palm", destino:"Cancun", categoria:"5 estrellas",
    plan:"Todo Incluido", activo:true,
    descripcion:"El Grand Oasis Palm es un magnifico resort todo incluido en la Zona Hotelera de Cancun con acceso directo a la playa.",
    capacidad:{maxAdultos:2, permitirNinos:true, edadMinNino:0, edadMaxNino:12, maxNinos:2},
    restricciones:{edadMin:25, edadMax:60, estadoCivil:["Casado","Union libre","Soltero hombre","Soltera mujer"]},
    amenidades:["Piscina","Playa privada","Spa","Shows nocturnos","Bar swim-up","Restaurantes tematicos","Kids club"],
    habitaciones:[
      {id:"R001", nombre:"Habitacion Estandar Garden View", tipoCama:"Queen", vistas:["Jardin"], maxOcupantes:2, m2:38,
       amenidades:["Smart TV","Wi-Fi alta velocidad","Minibar","Caja fuerte digital","Secador de cabello","Amenidades de lujo"],
       activo:true, descripcion:"Habitacion con vista al jardin, cama queen y todas las comodidades."},
      {id:"R002", nombre:"Habitacion Superior Ocean View", tipoCama:"King", vistas:["Mar"], maxOcupantes:2, m2:44,
       amenidades:["Smart TV","Wi-Fi alta velocidad","Minibar","Terraza privada","Vista al mar","Amenidades de lujo","Cafetera Nespresso"],
       activo:true, descripcion:"Habitacion con vista al mar y terraza privada."},
      {id:"R003", nombre:"Junior Suite", tipoCama:"King", vistas:["Mar","Piscina"], maxOcupantes:3, m2:62,
       amenidades:["Smart TV","Netflix","Jacuzzi en habitacion","Terraza privada","Vista al mar","Butler privado","Minibar","Cafetera Nespresso"],
       activo:true, descripcion:"Suite con sala de estar separada, jacuzzi y vistas panoramicas."},
      {id:"R004", nombre:"Suite Familiar", tipoCama:"Doble", vistas:["Jardin","Piscina"], maxOcupantes:6, m2:85,
       amenidades:["Smart TV","Wi-Fi alta velocidad","Dos camas","Cocina completa","Sala de estar","Cuna de bebe"],
       activo:true, descripcion:"Suite para familias con 2 habitaciones y cocina equipada."},
    ],
    tarifas:{precioBase:180, moneda:"USD", notasTA:"Tarifa por persona por noche en ocupacion doble. Aplica temporada regular."},
    regalosHotel:["Cena romantica de bienvenida","Credito de resort $50"],
    imagenUrl:"", notas:"Acceso directo a playa. Check-in 3pm / Check-out 12pm.",
  },
  {
    id:"HT002", nombre:"Hyatt Zilara Cancun", destino:"Cancun", categoria:"Gran Lujo",
    plan:"Todo Incluido Premium", activo:true,
    descripcion:"Solo para adultos. Lujo y exclusividad en la Zona Hotelera con vistas espectaculares al Caribe.",
    capacidad:{maxAdultos:2, permitirNinos:false, edadMinNino:0, edadMaxNino:0, maxNinos:0},
    restricciones:{edadMin:18, edadMax:99, estadoCivil:["Casado","Union libre","Soltero hombre","Soltera mujer"]},
    amenidades:["Playa privada","Spa","Butler service","Restaurantes tematicos","Bar swim-up","Piscina infinity","Gimnasio","Yoga"],
    habitaciones:[
      {id:"R010", nombre:"Ocean View King", tipoCama:"King", vistas:["Mar"], maxOcupantes:2, m2:50,
       amenidades:["Smart TV","Netflix","Cafetera Nespresso","Vista al mar","Amenidades de lujo","USB charging","Balcon"],
       activo:true, descripcion:"Elegante habitacion con vistas al oceano y amenidades premium."},
      {id:"R011", nombre:"Luxury Suite", tipoCama:"King", vistas:["Mar"], maxOcupantes:2, m2:90,
       amenidades:["Smart TV","Netflix","Jacuzzi en habitacion","Terraza privada","Butler privado","Bar privado","Cafetera Nespresso","Amenidades de lujo"],
       activo:true, descripcion:"Suite de lujo con jacuzzi privado y servicio de mayordomo."},
    ],
    tarifas:{precioBase:320, moneda:"USD", notasTA:"Solo adultos. Tarifa por persona por noche."},
    regalosHotel:["Acceso spa (1 dia)","Clase de cocina"],
    imagenUrl:"", notas:"Solo adultos 18+. Adults-only resort.",
  },
  {
    id:"HT003", nombre:"Marquis Los Cabos", destino:"Los Cabos", categoria:"Gran Lujo",
    plan:"Todo Incluido Premium", activo:true,
    descripcion:"Arte, gastronomia y playa en un resort boutique de ultralujo en Los Cabos.",
    capacidad:{maxAdultos:2, permitirNinos:false, edadMinNino:0, edadMaxNino:0, maxNinos:0},
    restricciones:{edadMin:36, edadMax:99, estadoCivil:["Casado","Union libre"]},
    amenidades:["Playa privada","Spa","Butler service","Golf","Restaurantes tematicos","Gimnasio","Yoga","Piscina infinity"],
    habitaciones:[
      {id:"R020", nombre:"Junior Suite Ocean Front", tipoCama:"King", vistas:["Mar"], maxOcupantes:2, m2:68,
       amenidades:["Smart TV","Netflix","Terraza privada","Vista al mar","Jacuzzi en habitacion","Amenidades de lujo","Butler privado"],
       activo:true, descripcion:"Suite frente al oceano con jacuzzi privado y terraza."},
      {id:"R021", nombre:"Suite Presidencial", tipoCama:"King", vistas:["Mar"], maxOcupantes:2, m2:130,
       amenidades:["Smart TV","Netflix","Jacuzzi en habitacion","Terraza privada","Butler privado","Bar privado","Chef privado","Cafetera Nespresso"],
       activo:true, descripcion:"La maxima expresion de lujo con chef y butler privados."},
    ],
    tarifas:{precioBase:450, moneda:"USD", notasTA:"Parejas unicamente 36+. Tarifa por persona por noche."},
    regalosHotel:["Botella de champagne","Masaje 30 min para dos"],
    imagenUrl:"", notas:"Adults-only. Edad minima 36 anos.",
  },
];



function uid(){ return "H"+Date.now()+Math.floor(Math.random()*9999); }

function S(){
  return {
    wrap: {height:"100%",display:"flex",flexDirection:"column",fontFamily:"'Poppins','DM Sans','Segoe UI',sans-serif",background:"#1a1f2e",color:"#1a1f2e"},
    card: {background:"#fff",borderRadius:"14px",border:"1px solid #e2e8f0",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},
    inp:  {width:"100%",padding:"8px 11px",borderRadius:"8px",border:"1px solid #e2e8f0",fontSize:"13px",color:"#1a1f2e",background:"#ffffff",outline:"none",boxSizing:"border-box",fontFamily:"inherit"},
    lbl:  {fontSize:"11px",fontWeight:"600",color:"#9ca3af",marginBottom:"4px",display:"block"},
    g2:   {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"},
    g3:   {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px"},
  };
}

function Btn(props){
  var v=props.v||"primary"; var sm=props.sm;
  var styles={
    primary:{background:"linear-gradient(135deg,"+BRAND_DARK+","+BRAND_MID+")",color:"#fff",border:"none"},
    ghost:  {background:"#1a1f2e",color:"#9ca3af",border:"1px solid #e2e8f0"},
    danger: {background:"#fef2f2",color:RED,border:"1px solid #fecaca"},
    success:{background:"#f0fdf4",color:GREEN,border:"1px solid #bbf7d0"},
    amber:  {background:"#fffbeb",color:AMBER,border:"1px solid #fde68a"},
  };
  var st=styles[v]||styles.primary;
  return (
    <button onClick={props.onClick} disabled={props.disabled}
      style={Object.assign({},st,{padding:sm?"5px 12px":"8px 16px",borderRadius:"8px",cursor:"pointer",
        fontSize:sm?"11px":"12px",fontWeight:"600",display:"inline-flex",alignItems:"center",gap:"4px",
        opacity:props.disabled?0.5:1,whiteSpace:"nowrap",fontFamily:"inherit"})}>
      {props.children}
    </button>
  );
}

function Badge(props){
  var colors={
    activo: {bg:"#f0fdf4",color:GREEN,   border:"#bbf7d0"},
    inactivo:{bg:"#fef2f2",color:RED,    border:"#fecaca"},
    "Todo Incluido":        {bg:"#f0fdf4",color:GREEN,  border:"#bbf7d0"},
    "Todo Incluido Premium":{bg:"#faf5ff",color:VIOLET, border:"#e9d5ff"},
    "Solo Habitacion":      {bg:"#eff6ff",color:BRAND_MID,border:"#bfdbfe"},
    "Desayuno incluido":    {bg:"#fffbeb",color:AMBER,  border:"#fde68a"},
    "Media pension":        {bg:"#fff7ed",color:CORAL,  border:"#fed7aa"},
    default:{bg:"#1a1f2e",color:"#9ca3af",border:"#3d4554"},
  };
  var c=colors[props.v]||colors.default;
  return (
    <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:"20px",
      fontSize:"10px",fontWeight:"700",color:c.color,background:c.bg,border:"1px solid "+c.border,
      whiteSpace:"nowrap"}}>
      {props.v}
    </span>
  );
}

function Toggle(props){
  var on=props.on;
  return (
    <div onClick={props.onChange} style={{display:"inline-flex",alignItems:"center",gap:"8px",cursor:"pointer"}}>
      <div style={{width:"38px",height:"20px",borderRadius:"10px",background:on?BRAND_MID:"#3d4554",
        position:"relative",transition:"background 0.2s",flexShrink:0}}>
        <div style={{position:"absolute",top:"2px",left:on?"20px":"2px",width:"16px",height:"16px",
          borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
      </div>
      {props.label&&<span style={{fontSize:"12px",color:"#9ca3af",fontWeight:"500"}}>{props.label}</span>}
    </div>
  );
}

function MultiChip(props){
  var sel=props.sel||[]; var col=props.col||BRAND_MID;
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
      {props.opts.map(function(o){
        var on=sel.indexOf(o)>-1;
        return (
          <div key={o} onClick={function(){
            var next=on?sel.filter(function(x){return x!==o;}):sel.concat([o]);
            props.onChange(next);
          }} style={{padding:"3px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"11px",fontWeight:"600",
            background:on?(col+"18"):"#ffffff",color:on?col:"#6b7280",
            border:"1px solid "+(on?(col+"44"):"#3d4554"),userSelect:"none",transition:"all 0.12s"}}>
            {o}
          </div>
        );
      })}
    </div>
  );
}



function HotelCard(props){
  var h=props.hotel;
  var s=S();
  return (
    <div style={Object.assign({},s.card,{padding:"16px",cursor:"pointer",transition:"box-shadow 0.15s",
      borderLeft:"3px solid "+(h.activo?BRAND_MID:"#3d4554")})}
      onClick={props.onClick}
      onMouseEnter={function(e){e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.08)";}}
      onMouseLeave={function(e){e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)";}}
    >
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
        <div>
          <div style={{fontSize:"14px",fontWeight:"700",color:BRAND_DARK,marginBottom:"2px"}}>{h.nombre}</div>
          <div style={{fontSize:"11px",color:"#6b7280"}}>{h.destino} &bull; {h.categoria}</div>
        </div>
        <div style={{display:"flex",gap:"4px",flexDirection:"column",alignItems:"flex-end"}}>
          <Badge v={h.activo?"activo":"inactivo"}/>
          <Badge v={h.plan}/>
        </div>
      </div>
      <div style={{fontSize:"12px",color:"#9ca3af",marginBottom:"10px",lineHeight:"1.5",
        overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
        {h.descripcion||"Sin descripcion."}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
          <span style={{fontSize:"11px",color:BRAND_MID,fontWeight:"600"}}>
            {h.habitaciones.length} tipo(s) hab.
          </span>
          <span style={{color:"#3d4554"}}>|</span>
          <span style={{fontSize:"11px",color:"#6b7280"}}>
            {h.amenidades.length} amenidades
          </span>
          {h.tarifas.precioBase>0&&(
            <span style={{color:"#3d4554"}}>|</span>
          )}
          {h.tarifas.precioBase>0&&(
            <span style={{fontSize:"11px",color:AMBER,fontWeight:"600"}}>
              {"Desde $"+h.tarifas.precioBase+" "+h.tarifas.moneda}
            </span>
          )}
        </div>
        <div style={{fontSize:"11px",color:"#6b7280",fontWeight:"500",
          background:BRAND_DARK+"0f",padding:"2px 8px",borderRadius:"6px",
          border:"1px solid "+BRAND_DARK+"22"}}>
          Ver detalle
        </div>
      </div>
    </div>
  );
}



function AmenidadesEditor(props){
  var sel=props.sel||[];
  var cats=props.cats||AMENIDADES_CATS;
  var [catActiva,setCatActiva]=useState(cats[0].cat);
  var catObj=null;
  for(var i=0;i<cats.length;i++){if(cats[i].cat===catActiva){catObj=cats[i];break;}}
  var s=S();
  return (
    <div>
      <div style={{display:"flex",gap:"4px",flexWrap:"wrap",marginBottom:"12px"}}>
        {cats.map(function(c){
          var cnt=c.items.filter(function(it){return sel.indexOf(it)>-1;}).length;
          var isA=catActiva===c.cat;
          return (
            <button key={c.cat} onClick={function(){setCatActiva(c.cat);}}
              style={{padding:"5px 11px",borderRadius:"8px",cursor:"pointer",fontSize:"11px",fontWeight:"600",
                background:isA?(c.col+"18"):"#ffffff",color:isA?c.col:"#6b7280",
                border:"1px solid "+(isA?(c.col+"44"):"#3d4554"),fontFamily:"inherit"}}>
              {c.cat}{cnt>0?" ("+cnt+")":""}
            </button>
          );
        })}
      </div>
      {catObj&&(
        <div style={{background:catObj.col+"08",border:"1px solid "+catObj.col+"22",borderRadius:"10px",padding:"12px"}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
            {catObj.items.map(function(it){
              var on=sel.indexOf(it)>-1;
              return (
                <div key={it} onClick={function(){
                  var next=on?sel.filter(function(x){return x!==it;}):sel.concat([it]);
                  props.onChange(next);
                }} style={{padding:"5px 11px",borderRadius:"7px",cursor:"pointer",fontSize:"12px",fontWeight:"600",
                  background:on?(catObj.col+"20"):"#fff",color:on?catObj.col:"#9ca3af",
                  border:"1px solid "+(on?(catObj.col+"44"):"#3d4554"),userSelect:"none",transition:"all 0.12s"}}>
                  {on?"+ "+it:it}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {sel.length>0&&(
        <div style={{marginTop:"10px"}}>
          <div style={{fontSize:"11px",color:"#6b7280",marginBottom:"6px",fontWeight:"600"}}>
            {"Seleccionadas ("+sel.length+"):"}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
            {sel.map(function(a){
              return (
                <div key={a} onClick={function(){props.onChange(sel.filter(function(x){return x!==a;}));}}
                  style={{padding:"3px 9px",borderRadius:"6px",cursor:"pointer",fontSize:"11px",fontWeight:"600",
                    background:BRAND_MID+"18",color:BRAND_MID,border:"1px solid "+BRAND_MID+"44"}}>
                  {a+" x"}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}



function HabModal(props){
  var hab=props.hab;
  var isNew=!hab;
  var blank={id:uid(),nombre:"",tipoCama:"King",vistas:[],maxOcupantes:2,m2:0,
    amenidades:[],activo:true,descripcion:""};
  var [form,setForm]=useState(isNew?blank:JSON.parse(JSON.stringify(hab)));
  var [sec,setSec]=useState("info");
  var s=S();

  function setF(k,v){setForm(function(p){return Object.assign({},p,{[k]:v});});}

  var SECS=[{k:"info",l:"Informacion"},{k:"amenidades",l:"Amenidades"},{k:"detalles",l:"Detalles"}];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",
      justifyContent:"center",zIndex:200,padding:"16px"}}>
      <div style={{background:"#fff",borderRadius:"16px",width:"100%",maxWidth:"620px",maxHeight:"90vh",
        display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid #e2e8f0",display:"flex",
          justifyContent:"space-between",alignItems:"center",flexShrink:0,
          background:"linear-gradient(135deg,"+BRAND_DARK+","+BRAND_MID+")"}}>
          <div style={{fontSize:"14px",fontWeight:"700",color:"#fff"}}>
            {isNew?"Nueva habitacion":form.nombre||"Habitacion"}
          </div>
          <div style={{display:"flex",gap:"6px"}}>
            {!isNew&&<Btn v="danger" sm onClick={function(){props.onDelete(hab.id);}}>Eliminar</Btn>}
            <button onClick={props.onClose} style={{background:"#eaecf0",border:"1px solid rgba(255,255,255,0.3)",
              borderRadius:"7px",color:"#fff",padding:"4px 12px",cursor:"pointer",fontSize:"11px",fontFamily:"inherit"}}>
              Cancelar
            </button>
            <button onClick={function(){props.onSave(form);}} style={{background:"#fff",border:"none",
              borderRadius:"7px",color:BRAND_DARK,padding:"4px 12px",cursor:"pointer",fontSize:"11px",
              fontWeight:"700",fontFamily:"inherit"}}>
              Guardar
            </button>
          </div>
        </div>
        <div style={{display:"flex",gap:"3px",padding:"8px 16px",borderBottom:"1px solid #f1f5f9",
          flexShrink:0,background:"#fafbfc"}}>
          {SECS.map(function(sv){
            return (
              <button key={sv.k} onClick={function(){setSec(sv.k);}}
                style={{padding:"5px 13px",borderRadius:"7px",cursor:"pointer",fontSize:"12px",fontWeight:"600",
                  background:sec===sv.k?(BRAND_MID+"18"):"transparent",color:sec===sv.k?BRAND_MID:"#6b7280",
                  border:sec===sv.k?("1px solid "+BRAND_MID+"44"):"1px solid transparent",fontFamily:"inherit"}}>
                {sv.l}
              </button>
            );
          })}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>

          {sec==="info"&&(
            <div>
              <div style={{marginBottom:"12px"}}>
                <label style={s.lbl}>Nombre del tipo de habitacion</label>
                <input style={s.inp} value={form.nombre}
                  onChange={function(e){setF("nombre",e.target.value);}}
                  placeholder="Ej: Junior Suite Ocean View"/>
              </div>
              <div style={Object.assign({},s.g3,{marginBottom:"12px"})}>
                <div>
                  <label style={s.lbl}>Tipo de cama</label>
                  <select style={Object.assign({},s.inp,{cursor:"pointer"})} value={form.tipoCama}
                    onChange={function(e){setF("tipoCama",e.target.value);}}>
                    {TIPO_CAMA.map(function(t){return <option key={t}>{t}</option>;})}
                  </select>
                </div>
                <div>
                  <label style={s.lbl}>Max ocupantes</label>
                  <input style={s.inp} type="number" min="1" max="10" value={form.maxOcupantes}
                    onChange={function(e){setF("maxOcupantes",parseInt(e.target.value)||1);}}/>
                </div>
                <div>
                  <label style={s.lbl}>Metros cuadrados</label>
                  <input style={s.inp} type="number" min="0" value={form.m2}
                    onChange={function(e){setF("m2",parseInt(e.target.value)||0);}} placeholder="38"/>
                </div>
              </div>
              <div style={{marginBottom:"12px"}}>
                <label style={s.lbl}>Vistas disponibles</label>
                <MultiChip opts={VISTA_OPTS} sel={form.vistas} onChange={function(v){setF("vistas",v);}} col={BRAND_MID}/>
              </div>
              <div style={{marginBottom:"12px"}}>
                <label style={s.lbl}>Descripcion</label>
                <textarea style={Object.assign({},s.inp,{minHeight:"80px",resize:"vertical"})}
                  value={form.descripcion} onChange={function(e){setF("descripcion",e.target.value);}}
                  placeholder="Describe las caracteristicas principales de este tipo de habitacion..."/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <Toggle on={form.activo} onChange={function(){setF("activo",!form.activo);}} label="Habitacion activa"/>
              </div>
            </div>
          )}

          {sec==="amenidades"&&(
            <div>
              <div style={{fontSize:"12px",color:"#9ca3af",marginBottom:"12px",
                padding:"8px 12px",background:"#ffffff",borderRadius:"8px",border:"1px solid #e2e8f0"}}>
                Selecciona las comodidades incluidas en este tipo de habitacion.
              </div>
              <AmenidadesEditor sel={form.amenidades} cats={AMENIDADES_HABITACION_CATS}
                onChange={function(v){setF("amenidades",v);}}/>
            </div>
          )}

          {sec==="detalles"&&(
            <div>
              <div style={{padding:"12px",background:"#ffffff",borderRadius:"10px",border:"1px solid #e2e8f0"}}>
                <div style={{fontSize:"12px",fontWeight:"700",color:BRAND_DARK,marginBottom:"8px"}}>Resumen</div>
                <div style={{fontSize:"12px",color:"#9ca3af",lineHeight:"1.8"}}>
                  <div><b>Nombre:</b> {form.nombre||"Sin nombre"}</div>
                  <div><b>Cama:</b> {form.tipoCama}</div>
                  <div><b>Ocupantes:</b> {form.maxOcupantes}</div>
                  <div><b>Metros:</b> {form.m2>0?form.m2+" m2":"No especificado"}</div>
                  <div><b>Vistas:</b> {form.vistas.length>0?form.vistas.join(", "):"Sin definir"}</div>
                  <div><b>Amenidades:</b> {form.amenidades.length}</div>
                  <div><b>Estado:</b> {form.activo?"Activa":"Inactiva"}</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}



function HotelModal(props){
  var h=props.hotel;
  var isNew=!h;
  var blank={
    id:uid(), nombre:"", destino:"", categoria:"4 estrellas",
    plan:"Todo Incluido", activo:true, descripcion:"",
    capacidad:{maxAdultos:2,permitirNinos:false,edadMinNino:0,edadMaxNino:12,maxNinos:2},
    restricciones:{edadMin:25,edadMax:65,estadoCivil:["Casado","Union libre"]},
    amenidades:[], habitaciones:[],
    tarifas:{precioBase:0,moneda:"USD",notasTA:""},
    regalosHotel:[], imagenUrl:"", notas:"",
  };
  var [form,setForm]=useState(isNew?blank:JSON.parse(JSON.stringify(h)));
  var [sec,setSec]=useState("info");
  var [habModal,setHabModal]=useState(null);
  var [nuevoRegalo,setNuevoRegalo]=useState("");
  var s=S();

  function setF(k,v){setForm(function(p){return Object.assign({},p,{[k]:v});});}
  function setCap(k,v){setForm(function(p){return Object.assign({},p,{capacidad:Object.assign({},p.capacidad,{[k]:v})});});}
  function setRes(k,v){setForm(function(p){return Object.assign({},p,{restricciones:Object.assign({},p.restricciones,{[k]:v})});});}
  function setTar(k,v){setForm(function(p){return Object.assign({},p,{tarifas:Object.assign({},p.tarifas,{[k]:v})});});}

  function saveHab(hab){
    var exists=form.habitaciones.some(function(r){return r.id===hab.id;});
    setF("habitaciones",exists
      ?form.habitaciones.map(function(r){return r.id===hab.id?hab:r;})
      :form.habitaciones.concat([hab]));
    setHabModal(null);
  }
  function deleteHab(hid){
    setF("habitaciones",form.habitaciones.filter(function(r){return r.id!==hid;}));
    setHabModal(null);
  }
  function addRegalo(){
    if(!nuevoRegalo.trim()) return;
    setF("regalosHotel",form.regalosHotel.concat([nuevoRegalo.trim()]));
    setNuevoRegalo("");
  }
  function removeRegalo(idx){
    setF("regalosHotel",form.regalosHotel.filter(function(_,i){return i!==idx;}));
  }

  var SECS=[
    {k:"info",     l:"Informacion"},
    {k:"amenidades",l:"Amenidades del hotel"},
    {k:"habitaciones",l:"Habitaciones ("+form.habitaciones.length+")"},
    {k:"restricciones",l:"Restricciones"},
    {k:"tarifas",  l:"Tarifas y notas"},
    {k:"regalos",  l:"Regalos del hotel"},
  ];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",
      justifyContent:"center",zIndex:100,padding:"16px"}}>
      <div style={{background:"#fff",borderRadius:"18px",width:"100%",maxWidth:"780px",maxHeight:"92vh",
        display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,0.18)"}}>

        {/* Header */}
        <div style={{padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",
          flexShrink:0,background:"linear-gradient(135deg,"+BRAND_DARK+","+BRAND_MID+")"}}>
          <div>
            <div style={{fontSize:"14px",fontWeight:"600",color:"#1a1f2e"}}>
              {isNew?"Nuevo hotel":form.nombre||"Hotel"}
            </div>
            {!isNew&&<div style={{fontSize:"11px",color:"#9ca3af",marginTop:"1px"}}>
              {form.destino} &bull; {form.categoria}
            </div>}
          </div>
          <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
            <Toggle on={form.activo} onChange={function(){setF("activo",!form.activo);}}/>
            <span style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",marginRight:"6px"}}>
              {form.activo?"Activo":"Inactivo"}
            </span>
            {!isNew&&<Btn v="danger" sm onClick={function(){props.onDelete(h.id);}}>Eliminar</Btn>}
            <button onClick={props.onClose} style={{background:"#eaecf0",border:"1px solid rgba(255,255,255,0.3)",
              borderRadius:"7px",color:"#fff",padding:"5px 14px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>
              Cancelar
            </button>
            <button onClick={function(){props.onSave(form);}} style={{background:"#fff",border:"none",
              borderRadius:"7px",color:BRAND_DARK,padding:"5px 14px",cursor:"pointer",fontSize:"12px",
              fontWeight:"700",fontFamily:"inherit"}}>
              Guardar hotel
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:"2px",padding:"6px 16px",borderBottom:"1px solid #e2e8f0",
          flexShrink:0,background:"#fafbfc",overflowX:"auto"}}>
          {SECS.map(function(sv){
            return (
              <button key={sv.k} onClick={function(){setSec(sv.k);}}
                style={{padding:"5px 13px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:"600",
                  background:sec===sv.k?(BRAND_MID+"18"):"transparent",color:sec===sv.k?BRAND_MID:"#6b7280",
                  border:sec===sv.k?("1px solid "+BRAND_MID+"44"):"1px solid transparent",
                  whiteSpace:"nowrap",fontFamily:"inherit"}}>
                {sv.l}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"20px"}}>

          {/* INFO */}
          {sec==="info"&&(
            <div>
              <div style={Object.assign({},s.g2,{marginBottom:"12px"})}>
                <div>
                  <label style={s.lbl}>Nombre del hotel</label>
                  <input style={s.inp} value={form.nombre}
                    onChange={function(e){setF("nombre",e.target.value);}}
                    placeholder="Ej: Grand Oasis Palm"/>
                </div>
                <div>
                  <label style={s.lbl}>Destino</label>
                  <input style={s.inp} value={form.destino}
                    onChange={function(e){setF("destino",e.target.value);}}
                    placeholder="Ej: Cancun"/>
                </div>
              </div>
              <div style={Object.assign({},s.g2,{marginBottom:"12px"})}>
                <div>
                  <label style={s.lbl}>Categoria</label>
                  <select style={Object.assign({},s.inp,{cursor:"pointer"})} value={form.categoria}
                    onChange={function(e){setF("categoria",e.target.value);}}>
                    {CATEGORIAS_HOTEL.map(function(c){return <option key={c}>{c}</option>;})}
                  </select>
                </div>
                <div>
                  <label style={s.lbl}>Plan</label>
                  <select style={Object.assign({},s.inp,{cursor:"pointer"})} value={form.plan}
                    onChange={function(e){setF("plan",e.target.value);}}>
                    {PLANES.map(function(p){return <option key={p}>{p}</option>;})}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:"12px"}}>
                <label style={s.lbl}>Descripcion del hotel</label>
                <textarea style={Object.assign({},s.inp,{minHeight:"90px",resize:"vertical"})}
                  value={form.descripcion} onChange={function(e){setF("descripcion",e.target.value);}}
                  placeholder="Describe el hotel: ubicacion, estilo, ambiente, que lo hace especial..."/>
              </div>
              <div style={{marginBottom:"12px"}}>
                <label style={s.lbl}>Notas internas</label>
                <textarea style={Object.assign({},s.inp,{minHeight:"60px",resize:"vertical"})}
                  value={form.notas} onChange={function(e){setF("notas",e.target.value);}}
                  placeholder="Notas para el equipo: check-in, politicas, requisitos especiales..."/>
              </div>
            </div>
          )}

          {/* AMENIDADES */}
          {sec==="amenidades"&&(
            <div>
              <div style={{fontSize:"12px",color:"#9ca3af",marginBottom:"14px",
                padding:"10px 14px",background:"#ffffff",borderRadius:"8px",border:"1px solid #e2e8f0",lineHeight:"1.5"}}>
                Estas son las amenidades generales del hotel. Para amenidades dentro de cada tipo de habitacion, ve a la seccion Habitaciones.
              </div>
              <AmenidadesEditor sel={form.amenidades} cats={AMENIDADES_CATS}
                onChange={function(v){setF("amenidades",v);}}/>
            </div>
          )}

          {/* HABITACIONES */}
          {sec==="habitaciones"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <div>
                  <div style={{fontSize:"13px",fontWeight:"700",color:BRAND_DARK}}>Tipos de habitacion</div>
                  <div style={{fontSize:"11px",color:"#6b7280",marginTop:"2px"}}>
                    {form.habitaciones.length>0
                      ?form.habitaciones.length+" tipos registrados"
                      :"Aun no hay tipos de habitacion"}
                  </div>
                </div>
                <Btn onClick={function(){setHabModal({hab:null});}}>+ Nueva habitacion</Btn>
              </div>

              {form.habitaciones.length===0&&(
                <div style={{textAlign:"center",padding:"40px 20px",
                  background:"#ffffff",borderRadius:"12px",border:"2px dashed #e2e8f0"}}>
                  <div style={{fontSize:"32px",marginBottom:"8px"}}></div>
                  <div style={{fontSize:"13px",fontWeight:"600",color:"#6b7280",marginBottom:"4px"}}>
                    Sin tipos de habitacion
                  </div>
                  <div style={{fontSize:"12px",color:"#3d4554",marginBottom:"14px"}}>
                    Agrega los tipos de habitacion disponibles en este hotel
                  </div>
                  <Btn onClick={function(){setHabModal({hab:null});}}>+ Agregar habitacion</Btn>
                </div>
              )}

              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {form.habitaciones.map(function(r){
                  return (
                    <div key={r.id} style={{background:"#ffffff",borderRadius:"12px",
                      border:"1px solid #e2e8f0",padding:"14px",
                      borderLeft:"3px solid "+(r.activo?BRAND_MID:"#3d4554")}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"6px"}}>
                        <div>
                          <div style={{fontSize:"13px",fontWeight:"700",color:BRAND_DARK}}>{r.nombre}</div>
                          <div style={{fontSize:"11px",color:"#6b7280",marginTop:"1px"}}>
                            {r.tipoCama} &bull; Max {r.maxOcupantes} personas
                            {r.m2>0?" &bull; "+r.m2+" m2":""}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
                          <Badge v={r.activo?"activo":"inactivo"}/>
                          <Btn v="ghost" sm onClick={function(){setHabModal({hab:r});}}>Editar</Btn>
                        </div>
                      </div>
                      {r.vistas.length>0&&(
                        <div style={{marginBottom:"6px",display:"flex",gap:"4px",flexWrap:"wrap"}}>
                          {r.vistas.map(function(v){
                            return (
                              <span key={v} style={{fontSize:"10px",padding:"2px 7px",borderRadius:"5px",
                                background:BRAND_MID+"12",color:BRAND_MID,border:"1px solid "+BRAND_MID+"30",fontWeight:"600"}}>
                                {v}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {r.descripcion&&(
                        <div style={{fontSize:"12px",color:"#9ca3af",marginBottom:"6px",lineHeight:"1.4"}}>
                          {r.descripcion}
                        </div>
                      )}
                      {r.amenidades.length>0&&(
                        <div style={{display:"flex",gap:"3px",flexWrap:"wrap"}}>
                          {r.amenidades.slice(0,6).map(function(a){
                            return (
                              <span key={a} style={{fontSize:"10px",padding:"2px 6px",borderRadius:"4px",
                                background:"#1a1f2e",color:"#9ca3af",border:"1px solid #e2e8f0"}}>
                                {a}
                              </span>
                            );
                          })}
                          {r.amenidades.length>6&&(
                            <span style={{fontSize:"10px",padding:"2px 6px",borderRadius:"4px",
                              background:"#1a1f2e",color:"#6b7280",border:"1px solid #e2e8f0"}}>
                              {"+"+(r.amenidades.length-6)+" mas"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RESTRICCIONES */}
          {sec==="restricciones"&&(
            <div>
              <div style={{marginBottom:"16px",padding:"10px 14px",background:"#eff6ff",
                borderRadius:"8px",border:"1px solid #bfdbfe",fontSize:"12px",color:BRAND_MID,lineHeight:"1.5"}}>
                Estas restricciones se usan para filtrar que clientes califican para este hotel durante la verificacion.
              </div>
              <div style={{marginBottom:"16px"}}>
                <div style={{fontSize:"13px",fontWeight:"700",color:BRAND_DARK,marginBottom:"10px"}}>Capacidad</div>
                <div style={Object.assign({},s.g2,{marginBottom:"10px"})}>
                  <div>
                    <label style={s.lbl}>Max adultos</label>
                    <input style={s.inp} type="number" min="1" max="10" value={form.capacidad.maxAdultos}
                      onChange={function(e){setCap("maxAdultos",parseInt(e.target.value)||1);}}/>
                  </div>
                  <div style={{display:"flex",alignItems:"flex-end",paddingBottom:"2px"}}>
                    <Toggle on={form.capacidad.permitirNinos}
                      onChange={function(){setCap("permitirNinos",!form.capacidad.permitirNinos);}}
                      label="Permitir ninos"/>
                  </div>
                </div>
                {form.capacidad.permitirNinos&&(
                  <div style={s.g3}>
                    <div>
                      <label style={s.lbl}>Edad min nino</label>
                      <input style={s.inp} type="number" min="0" value={form.capacidad.edadMinNino}
                        onChange={function(e){setCap("edadMinNino",parseInt(e.target.value)||0);}}/>
                    </div>
                    <div>
                      <label style={s.lbl}>Edad max nino</label>
                      <input style={s.inp} type="number" max="17" value={form.capacidad.edadMaxNino}
                        onChange={function(e){setCap("edadMaxNino",parseInt(e.target.value)||12);}}/>
                    </div>
                    <div>
                      <label style={s.lbl}>Max ninos</label>
                      <input style={s.inp} type="number" min="0" value={form.capacidad.maxNinos}
                        onChange={function(e){setCap("maxNinos",parseInt(e.target.value)||0);}}/>
                    </div>
                  </div>
                )}
              </div>
              <div style={{marginBottom:"16px"}}>
                <div style={{fontSize:"13px",fontWeight:"700",color:BRAND_DARK,marginBottom:"10px"}}>Edad del cliente</div>
                <div style={s.g2}>
                  <div>
                    <label style={s.lbl}>Edad minima</label>
                    <input style={s.inp} type="number" min="0" value={form.restricciones.edadMin}
                      onChange={function(e){setRes("edadMin",parseInt(e.target.value)||0);}}/>
                  </div>
                  <div>
                    <label style={s.lbl}>Edad maxima</label>
                    <input style={s.inp} type="number" max="99" value={form.restricciones.edadMax}
                      onChange={function(e){setRes("edadMax",parseInt(e.target.value)||99);}}/>
                  </div>
                </div>
              </div>
              <div>
                <div style={{fontSize:"13px",fontWeight:"700",color:BRAND_DARK,marginBottom:"10px"}}>Estado civil permitido</div>
                <MultiChip opts={["Casado","Union libre","Soltero hombre","Soltera mujer","Divorciado","Viudo"]}
                  sel={form.restricciones.estadoCivil}
                  onChange={function(v){setRes("estadoCivil",v);}} col={BRAND_MID}/>
              </div>
            </div>
          )}

          {/* TARIFAS */}
          {sec==="tarifas"&&(
            <div>
              <div style={{marginBottom:"16px"}}>
                <div style={{fontSize:"13px",fontWeight:"700",color:BRAND_DARK,marginBottom:"10px"}}>Tarifa de referencia</div>
                <div style={Object.assign({},s.g2,{marginBottom:"10px"})}>
                  <div>
                    <label style={s.lbl}>Precio base (por persona/noche)</label>
                    <input style={s.inp} type="number" min="0" value={form.tarifas.precioBase}
                      onChange={function(e){setTar("precioBase",parseInt(e.target.value)||0);}}
                      placeholder="180"/>
                  </div>
                  <div>
                    <label style={s.lbl}>Moneda</label>
                    <select style={Object.assign({},s.inp,{cursor:"pointer"})} value={form.tarifas.moneda}
                      onChange={function(e){setTar("moneda",e.target.value);}}>
                      <option>USD</option>
                      <option>MXN</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={s.lbl}>Notas sobre tarifas / temporadas</label>
                  <textarea style={Object.assign({},s.inp,{minHeight:"100px",resize:"vertical"})}
                    value={form.tarifas.notasTA}
                    onChange={function(e){setTar("notasTA",e.target.value);}}
                    placeholder="Ej: Tarifa por persona por noche en ocupacion doble. Temporada alta: dic-ene-mar. Aplica suplemento single..."/>
                </div>
              </div>
            </div>
          )}

          {/* REGALOS */}
          {sec==="regalos"&&(
            <div>
              <div style={{fontSize:"12px",color:"#9ca3af",marginBottom:"14px",
                padding:"10px 14px",background:"#ffffff",borderRadius:"8px",border:"1px solid #e2e8f0",lineHeight:"1.5"}}>
                Regalos o beneficios especificos que ofrece este hotel (adicionales a los regalos del destino).
                Ejemplos: cena romantica de bienvenida, credito de spa, botella de champagne, etc.
              </div>
              <div style={{display:"flex",gap:"8px",marginBottom:"14px"}}>
                <input style={Object.assign({},s.inp,{flex:1})} value={nuevoRegalo}
                  onChange={function(e){setNuevoRegalo(e.target.value);}}
                  onKeyDown={function(e){if(e.key==="Enter") addRegalo();}}
                  placeholder="Ej: Cena romantica en la playa para dos"/>
                <Btn onClick={addRegalo}>Agregar</Btn>
              </div>
              {form.regalosHotel.length===0&&(
                <div style={{textAlign:"center",padding:"30px",background:"#ffffff",
                  borderRadius:"10px",border:"2px dashed #e2e8f0"}}>
                  <div style={{fontSize:"24px",marginBottom:"6px"}}></div>
                  <div style={{fontSize:"12px",color:"#6b7280"}}>Sin regalos del hotel aun</div>
                </div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {form.regalosHotel.map(function(r,i){
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",
                      padding:"10px 14px",background:"#fff",borderRadius:"9px",
                      border:"1px solid #e2e8f0"}}>
                      <div style={{width:"24px",height:"24px",borderRadius:"50%",
                        background:GREEN+"18",display:"flex",alignItems:"center",
                        justifyContent:"center",fontSize:"12px",flexShrink:0}}>
                        {"*"}
                      </div>
                      <div style={{flex:1,fontSize:"13px",color:"#1a1f2e"}}>{r}</div>
                      <Btn v="danger" sm onClick={function(){removeRegalo(i);}}>Quitar</Btn>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {habModal&&(
        <HabModal hab={habModal.hab} onSave={saveHab} onDelete={deleteHab}
          onClose={function(){setHabModal(null);}}/>
      )}
    </div>
  );
}



function HotelDetalle(props){
  var h=props.hotel;
  var s=S();
  var [tab,setTab]=useState("overview");
  var TABS=[{k:"overview",l:"General"},{k:"habitaciones",l:"Habitaciones"},{k:"amenidades",l:"Amenidades"},{k:"restricciones",l:"Restricciones"}];

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      {/* Header detalle */}
      <div style={{background:"linear-gradient(135deg,"+BRAND_DARK+","+BRAND_MID+")",padding:"20px 24px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <button onClick={props.onBack} style={{background:"#eaecf0",border:"1px solid rgba(255,255,255,0.3)",
              borderRadius:"7px",color:"rgba(255,255,255,0.8)",padding:"4px 12px",cursor:"pointer",
              fontSize:"11px",marginBottom:"10px",fontFamily:"inherit"}}>
              Volver a hoteles
            </button>
            <div style={{fontSize:"20px",fontWeight:"700",color:"#fff"}}>{h.nombre}</div>
            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.65)",marginTop:"2px"}}>
              {h.destino} &bull; {h.categoria} &bull; <Badge v={h.plan}/>
            </div>
          </div>
          <div style={{display:"flex",gap:"6px"}}>
            <Badge v={h.activo?"activo":"inactivo"}/>
            <Btn v="ghost" sm onClick={props.onEdit}>Editar hotel</Btn>
          </div>
        </div>
      </div>

      <div style={{display:"flex",gap:"3px",padding:"6px 16px",borderBottom:"1px solid #e2e8f0",
        background:"#fafbfc",flexShrink:0}}>
        {TABS.map(function(t){
          return (
            <button key={t.k} onClick={function(){setTab(t.k);}}
              style={{padding:"5px 13px",borderRadius:"7px",cursor:"pointer",fontSize:"11px",fontWeight:"600",
                background:tab===t.k?(BRAND_MID+"18"):"transparent",color:tab===t.k?BRAND_MID:"#6b7280",
                border:tab===t.k?("1px solid "+BRAND_MID+"44"):"1px solid transparent",fontFamily:"inherit"}}>
              {t.l}
            </button>
          );
        })}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>

        {tab==="overview"&&(
          <div>
            <div style={Object.assign({},s.card,{padding:"16px",marginBottom:"14px"})}>
              <div style={{fontSize:"13px",fontWeight:"700",color:BRAND_DARK,marginBottom:"6px"}}>Descripcion</div>
              <div style={{fontSize:"13px",color:"#9ca3af",lineHeight:"1.6"}}>
                {h.descripcion||"Sin descripcion."}
              </div>
            </div>
            {h.notas&&(
              <div style={{padding:"12px 16px",background:"#fffbeb",borderRadius:"10px",
                border:"1px solid #fde68a",marginBottom:"14px"}}>
                <div style={{fontSize:"11px",fontWeight:"700",color:AMBER,marginBottom:"4px"}}>NOTAS INTERNAS</div>
                <div style={{fontSize:"12px",color:"#78350f",lineHeight:"1.5"}}>{h.notas}</div>
              </div>
            )}
            <div style={Object.assign({},s.g3,{marginBottom:"14px"})}>
              <div style={Object.assign({},s.card,{padding:"14px",textAlign:"center"})}>
                <div style={{fontSize:"22px",fontWeight:"800",color:BRAND_DARK}}>{h.habitaciones.length}</div>
                <div style={{fontSize:"11px",color:"#6b7280",marginTop:"2px"}}>Tipos de hab.</div>
              </div>
              <div style={Object.assign({},s.card,{padding:"14px",textAlign:"center"})}>
                <div style={{fontSize:"22px",fontWeight:"800",color:BRAND_MID}}>{h.amenidades.length}</div>
                <div style={{fontSize:"11px",color:"#6b7280",marginTop:"2px"}}>Amenidades</div>
              </div>
              <div style={Object.assign({},s.card,{padding:"14px",textAlign:"center"})}>
                <div style={{fontSize:"20px",fontWeight:"800",color:AMBER}}>
                  {h.tarifas.precioBase>0?"$"+h.tarifas.precioBase+" "+h.tarifas.moneda:"N/D"}
                </div>
                <div style={{fontSize:"11px",color:"#6b7280",marginTop:"2px"}}>Tarifa base</div>
              </div>
            </div>
            {h.regalosHotel.length>0&&(
              <div style={Object.assign({},s.card,{padding:"14px"})}>
                <div style={{fontSize:"12px",fontWeight:"700",color:BRAND_DARK,marginBottom:"8px"}}>
                  Regalos del hotel
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"5px"}}>
                  {h.regalosHotel.map(function(r,i){
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"12px",color:"#9ca3af"}}>
                        <div style={{width:"6px",height:"6px",borderRadius:"50%",background:GREEN,flexShrink:0}}/>
                        {r}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==="habitaciones"&&(
          <div>
            {h.habitaciones.length===0&&(
              <div style={{textAlign:"center",padding:"50px",background:"#ffffff",
                borderRadius:"12px",border:"2px dashed #e2e8f0"}}>
                <div style={{fontSize:"36px",marginBottom:"8px"}}></div>
                <div style={{fontSize:"13px",fontWeight:"600",color:"#6b7280"}}>Sin habitaciones registradas</div>
                <div style={{fontSize:"12px",color:"#3d4554",marginTop:"4px"}}>Edita el hotel para agregar tipos de habitacion</div>
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              {h.habitaciones.map(function(r){
                return (
                  <div key={r.id} style={Object.assign({},s.card,{padding:"16px",
                    borderLeft:"3px solid "+(r.activo?BRAND_MID:"#3d4554")})}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
                      <div>
                        <div style={{fontSize:"14px",fontWeight:"700",color:BRAND_DARK}}>{r.nombre}</div>
                        <div style={{fontSize:"11px",color:"#6b7280",marginTop:"2px"}}>
                          {r.tipoCama+" &bull; Max "+r.maxOcupantes+" personas"}
                          {r.m2>0?" &bull; "+r.m2+" m2":""}
                        </div>
                      </div>
                      <Badge v={r.activo?"activo":"inactivo"}/>
                    </div>
                    {r.descripcion&&(
                      <div style={{fontSize:"12px",color:"#9ca3af",marginBottom:"8px",lineHeight:"1.5"}}>{r.descripcion}</div>
                    )}
                    {r.vistas.length>0&&(
                      <div style={{marginBottom:"8px",display:"flex",gap:"4px",alignItems:"center"}}>
                        <span style={{fontSize:"11px",color:"#6b7280",marginRight:"2px"}}>Vistas:</span>
                        {r.vistas.map(function(v){
                          return (
                            <span key={v} style={{fontSize:"10px",padding:"2px 7px",borderRadius:"5px",
                              background:BRAND_MID+"12",color:BRAND_MID,border:"1px solid "+BRAND_MID+"30",fontWeight:"600"}}>
                              {v}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {r.amenidades.length>0&&(
                      <div>
                        <div style={{fontSize:"11px",color:"#6b7280",marginBottom:"5px"}}>Amenidades incluidas:</div>
                        <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
                          {r.amenidades.map(function(a){
                            return (
                              <span key={a} style={{fontSize:"10px",padding:"3px 8px",borderRadius:"5px",
                                background:"#1a1f2e",color:"#9ca3af",border:"1px solid #e2e8f0"}}>
                                {a}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="amenidades"&&(
          <div>
            {AMENIDADES_CATS.map(function(cat){
              var presentes=h.amenidades.filter(function(a){return cat.items.indexOf(a)>-1;});
              if(presentes.length===0) return null;
              return (
                <div key={cat.cat} style={Object.assign({},s.card,{padding:"14px",marginBottom:"10px"})}>
                  <div style={{fontSize:"12px",fontWeight:"700",color:cat.col,marginBottom:"8px"}}>{cat.cat}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                    {presentes.map(function(a){
                      return (
                        <span key={a} style={{fontSize:"11px",padding:"4px 10px",borderRadius:"6px",fontWeight:"600",
                          background:cat.col+"12",color:cat.col,border:"1px solid "+cat.col+"30"}}>
                          {a}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {h.amenidades.length===0&&(
              <div style={{textAlign:"center",padding:"40px",background:"#ffffff",
                borderRadius:"12px",border:"2px dashed #e2e8f0"}}>
                <div style={{fontSize:"13px",color:"#6b7280"}}>Sin amenidades registradas</div>
              </div>
            )}
          </div>
        )}

        {tab==="restricciones"&&(
          <div>
            <div style={Object.assign({},s.card,{padding:"16px",marginBottom:"10px"})}>
              <div style={{fontSize:"12px",fontWeight:"700",color:BRAND_DARK,marginBottom:"10px"}}>Restricciones de edad</div>
              <div style={s.g2}>
                <div style={{padding:"12px",background:"#ffffff",borderRadius:"8px",border:"1px solid #e2e8f0",textAlign:"center"}}>
                  <div style={{fontSize:"22px",fontWeight:"800",color:BRAND_DARK}}>{h.restricciones.edadMin}</div>
                  <div style={{fontSize:"11px",color:"#6b7280"}}>Edad minima</div>
                </div>
                <div style={{padding:"12px",background:"#ffffff",borderRadius:"8px",border:"1px solid #e2e8f0",textAlign:"center"}}>
                  <div style={{fontSize:"22px",fontWeight:"800",color:BRAND_MID}}>{h.restricciones.edadMax}</div>
                  <div style={{fontSize:"11px",color:"#6b7280"}}>Edad maxima</div>
                </div>
              </div>
            </div>
            <div style={Object.assign({},s.card,{padding:"16px",marginBottom:"10px"})}>
              <div style={{fontSize:"12px",fontWeight:"700",color:BRAND_DARK,marginBottom:"8px"}}>Estado civil permitido</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                {h.restricciones.estadoCivil.map(function(ec){
                  return (
                    <span key={ec} style={{fontSize:"11px",padding:"4px 11px",borderRadius:"6px",fontWeight:"600",
                      background:BRAND_MID+"12",color:BRAND_MID,border:"1px solid "+BRAND_MID+"30"}}>
                      {ec}
                    </span>
                  );
                })}
              </div>
            </div>
            <div style={Object.assign({},s.card,{padding:"16px"})}>
              <div style={{fontSize:"12px",fontWeight:"700",color:BRAND_DARK,marginBottom:"8px"}}>Politica de ninos</div>
              <div style={{fontSize:"13px",color:"#9ca3af"}}>
                {h.capacidad.permitirNinos
                  ?("Ninos permitidos de "+h.capacidad.edadMinNino+" a "+h.capacidad.edadMaxNino+" anos. Max "+h.capacidad.maxNinos+" ninos.")
                  :"No se permiten ninos en este hotel."}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}



export default function HotelsModule(){
  var [hotels,setHotels]=useState(SEED_HOTELS);
  var [modal,setModal]=useState(null);
  var [detalle,setDetalle]=useState(null);
  var [buscar,setBuscar]=useState("");
  var [filtroDestino,setFiltroDestino]=useState("todos");
  var [filtroActivo,setFiltroActivo]=useState("todos");
  var [showSearch,setShowSearch]=useState(false);
  var s=S();

  var destinos=["todos"].concat(Array.from(new Set(hotels.map(function(h){return h.destino;}))));

  var vis=hotels.filter(function(h){
    var matchB=!buscar||h.nombre.toLowerCase().indexOf(buscar.toLowerCase())>-1||h.destino.toLowerCase().indexOf(buscar.toLowerCase())>-1;
    var matchD=filtroDestino==="todos"||h.destino===filtroDestino;
    var matchA=filtroActivo==="todos"||(filtroActivo==="activo"?h.activo:!h.activo);
    return matchB&&matchD&&matchA;
  });

  function saveHotel(form){
    var exists=hotels.some(function(h){return h.id===form.id;});
    setHotels(exists
      ?hotels.map(function(h){return h.id===form.id?form:h;})
      :hotels.concat([form]));
    setModal(null);
    if(detalle&&detalle.id===form.id) setDetalle(form);
  }
  function importHotel(form){
    setHotels(hotels.concat([form]));
    setShowSearch(false);
    setDetalle(form);
  }
  function deleteHotel(id){
    setHotels(hotels.filter(function(h){return h.id!==id;}));
    setModal(null);
    setDetalle(null);
  }

  if(showSearch){
    return (
      <div style={s.wrap}>
        <HotelSearch
          onImport={importHotel}
          onClose={function(){setShowSearch(false);}}/>
      </div>
    );
  }

  if(detalle){
    var hotelActual=null;
    for(var i=0;i<hotels.length;i++){if(hotels[i].id===detalle.id){hotelActual=hotels[i];break;}}
    if(!hotelActual){setDetalle(null);return null;}
    return (
      <div style={s.wrap}>
        <HotelDetalle hotel={hotelActual}
          onBack={function(){setDetalle(null);}}
          onEdit={function(){setModal({hotel:hotelActual});}}/>
        {modal&&(
          <HotelModal hotel={modal.hotel} onSave={saveHotel} onDelete={deleteHotel}
            onClose={function(){setModal(null);}}/>
        )}
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      {/* Topbar */}
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"0 20px",
        display:"flex",alignItems:"center",justifyContent:"space-between",minHeight:"52px",flexShrink:0}}>
        <div>
          <div style={{fontSize:"15px",fontWeight:"700",color:BRAND_DARK}}>Hoteles</div>
          <div style={{fontSize:"11px",color:"#6b7280"}}>{hotels.filter(function(h){return h.activo;}).length+" activos de "+hotels.length+" hoteles"}</div>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          <Btn v="ghost" onClick={function(){setShowSearch(true);}}>Importar desde Google</Btn>
          <Btn onClick={function(){setModal({hotel:null});}}>+ Nuevo hotel</Btn>
        </div>
      </div>

      {/* Filtros */}
      <div style={{padding:"12px 20px",background:"#fff",borderBottom:"1px solid #f1f5f9",
        display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
        <input style={Object.assign({},s.inp,{maxWidth:"220px"})} value={buscar}
          onChange={function(e){setBuscar(e.target.value);}}
          placeholder="Buscar hotel o destino..."/>
        <select style={Object.assign({},s.inp,{maxWidth:"160px",cursor:"pointer"})}
          value={filtroDestino} onChange={function(e){setFiltroDestino(e.target.value);}}>
          {destinos.map(function(d){
            return <option key={d} value={d}>{d==="todos"?"Todos los destinos":d}</option>;
          })}
        </select>
        <select style={Object.assign({},s.inp,{maxWidth:"130px",cursor:"pointer"})}
          value={filtroActivo} onChange={function(e){setFiltroActivo(e.target.value);}}>
          <option value="todos">Todos</option>
          <option value="activo">Solo activos</option>
          <option value="inactivo">Solo inactivos</option>
        </select>
        {(buscar||filtroDestino!=="todos"||filtroActivo!=="todos")&&(
          <Btn v="ghost" sm onClick={function(){setBuscar("");setFiltroDestino("todos");setFiltroActivo("todos");}}>
            Limpiar filtros
          </Btn>
        )}
        <div style={{marginLeft:"auto",fontSize:"12px",color:"#6b7280"}}>
          {vis.length+" resultado(s)"}
        </div>
      </div>

      {/* Lista */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        {vis.length===0&&(
          <div style={{textAlign:"center",padding:"60px 20px",background:"#fff",
            borderRadius:"14px",border:"2px dashed #e2e8f0"}}>
            <div style={{fontSize:"40px",marginBottom:"10px"}}></div>
            <div style={{fontSize:"14px",fontWeight:"700",color:"#6b7280",marginBottom:"4px"}}>
              {hotels.length===0?"Sin hoteles registrados":"Sin resultados"}
            </div>
            <div style={{fontSize:"12px",color:"#3d4554",marginBottom:"16px"}}>
              {hotels.length===0?"Agrega el primer hotel del catalogo":"Prueba con otros filtros"}
            </div>
            {hotels.length===0&&<Btn onClick={function(){setModal({hotel:null});}}>+ Agregar hotel</Btn>}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
          {vis.map(function(h){
            return (
              <HotelCard key={h.id} hotel={h}
                onClick={function(){setDetalle(h);}}/>
            );
          })}
        </div>
      </div>

      {modal&&(
        <HotelModal hotel={modal.hotel} onSave={saveHotel} onDelete={deleteHotel}
          onClose={function(){setModal(null);}}/>
      )}
    </div>
  );
}
