import { useState, useEffect } from "react";
import { supabase as SB } from "./supabase";
import HotelSearch from "./hotel-search.jsx";

var BRAND_DARK = "#1a385a";
var BRAND_MID  = "#47718a";
var GREEN  = "#1a7f3c";
var AMBER  = "#f59e0b";
var RED    = "#b91c1c";
var VIOLET = "#5b21b6";
var CORAL  = "#f97316";
var TEAL   = "#0ea5a0";
var INDIGO = "#6366f1";

// Destinos se cargan desde Supabase (destinos_catalog)
var CATEGORIAS    = ["3 estrellas","4 estrellas","5 estrellas","Boutique","Gran Lujo"];
var PLANES        = ["Todo Incluido","Todo Incluido Premium","Solo Habitacion","Desayuno incluido","Media pension"];
var TIPO_CAMA     = ["King","Queen","Doble","Matrimonial","Literas"];
var ESTADOS_CIVIL = ["Soltero Hombre","Soltera Mujer","Casado(a)","Union Libre"];

var AMENIDADES_CATS = [
  {cat:"Agua y Playa",   col:TEAL,    items:["Piscina","Piscina infinity","Playa privada","Bar swim-up","Jacuzzi","Deportes acuaticos","Kayak","Centro de buceo","Toboganes"]},
  {cat:"Bienestar",      col:VIOLET,  items:["Spa","Gimnasio","Yoga","Sauna","Vapor","Masajes","Centro medico","Meditacion"]},
  {cat:"Gastronomia",    col:AMBER,   items:["Restaurante principal","Restaurantes tematicos","Bar","Snack bar","Room service 24h","Minibar","Buffet internacional","Chef privado"]},
  {cat:"Entretenimiento",col:CORAL,   items:["Shows nocturnos","Casino","Kids club","Teen club","Club nocturno","Teatro","Karaoke","Animacion diurna"]},
  {cat:"Servicios",      col:BRAND_MID,items:["Butler service","Wi-Fi incluido","Estacionamiento","Lavanderia","Concierge","Transfer incluido","Caja fuerte","Guardabebe"]},
  {cat:"Deportes",       col:GREEN,   items:["Golf","Tenis","Padel","Ciclismo","Voleibol playa","Futbol","Basketball","Ping pong"]},
];

// ─── Helpers ──────────────────────────────────────────────
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function S(){
  return {
    wrap: {height:"100%",display:"flex",flexDirection:"column",fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif",background:"#f4f5f7",color:"#1a1f2e"},
    card: {background:"#ffffff",borderRadius:"12px",border:"1px solid #e3e6ea"},
    inp:  {width:"100%",padding:"8px 11px",borderRadius:"8px",border:"1px solid #d8dbe0",fontSize:"13px",color:"#1a1f2e",background:"#ffffff",outline:"none",boxSizing:"border-box",fontFamily:"inherit"},
    sel:  {width:"100%",padding:"8px 11px",borderRadius:"8px",border:"1px solid #d8dbe0",fontSize:"13px",color:"#1a1f2e",background:"#ffffff",outline:"none",cursor:"pointer",boxSizing:"border-box",fontFamily:"inherit"},
    ta:   {width:"100%",padding:"8px 11px",borderRadius:"8px",border:"1px solid #d8dbe0",fontSize:"13px",color:"#1a1f2e",background:"#ffffff",outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"},
    lbl:  {fontSize:"11px",fontWeight:"600",color:"#6b7280",marginBottom:"4px",display:"block",textTransform:"uppercase",letterSpacing:"0.05em"},
    g2:   {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"},
    g3:   {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px"},
    stit: {fontSize:"10px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"10px"},
  };
}
function Btn(props){
  var v=props.v||"primary"; var sm=props.sm;
  var styles={
    primary:{background:BRAND_DARK,color:"#fff",border:"none"},
    teal:   {background:"rgba(14,165,160,0.1)",color:TEAL,border:"1px solid rgba(14,165,160,0.3)"},
    ghost:  {background:"#f6f7f9",color:"#6b7280",border:"1px solid #e3e6ea"},
    danger: {background:"#fef2f2",color:RED,border:"1px solid #fecaca"},
    indigo: {background:"#eef2ff",color:INDIGO,border:"1px solid #c7d2fe"},
  };
  var st=styles[v]||styles.primary;
  return (
    <button onClick={props.onClick} disabled={props.disabled}
      style={Object.assign({},st,{padding:sm?"4px 10px":"7px 14px",borderRadius:"8px",cursor:"pointer",
        fontSize:sm?"11px":"12px",fontWeight:"600",display:"inline-flex",alignItems:"center",gap:"4px",
        opacity:props.disabled?0.5:1,whiteSpace:"nowrap",fontFamily:"inherit"})}>
      {props.children}
    </button>
  );
}
function Modal(props){
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(3px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={props.onClose}>
      <div style={{background:"#ffffff",borderRadius:14,padding:"24px 28px",width:"100%",maxWidth:props.wide?"820px":"520px",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.15)"}}
        onClick={function(e){e.stopPropagation();}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{fontSize:15,fontWeight:700,color:BRAND_DARK}}>{props.title}</div>
          <button onClick={props.onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9ca3af"}}>✕</button>
        </div>
        {props.children}
      </div>
    </div>
  );
}

// ─── MODAL CADENA ─────────────────────────────────────────
function CadenaModal(props){
  var s=S(); var isNew=!props.cadena;
  var blank={nombre:"",descripcion:"",logo_url:"",activo:true};
  var [form,setForm]=useState(isNew?blank:Object.assign({},props.cadena));
  function set(k,v){ setForm(function(p){ return Object.assign({},p,{[k]:v}); }); }
  return (
    <Modal title={isNew?"Nueva cadena hotelera":"Editar cadena"} onClose={props.onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={s.lbl}>Nombre de la cadena *</label>
          <input style={s.inp} value={form.nombre} onChange={function(e){set("nombre",e.target.value);}} placeholder="Ej: RIU Hotels, Barcelo, Marriott..."/>
        </div>
        <div><label style={s.lbl}>Descripcion</label>
          <textarea style={Object.assign({},s.ta,{minHeight:70})} value={form.descripcion} onChange={function(e){set("descripcion",e.target.value);}} placeholder="Descripcion de la cadena..."/>
        </div>
        <div><label style={s.lbl}>URL del logo (opcional)</label>
          <input style={s.inp} value={form.logo_url} onChange={function(e){set("logo_url",e.target.value);}} placeholder="https://..."/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <input type="checkbox" checked={form.activo} onChange={function(e){set("activo",e.target.checked);}} id="cad-activo"/>
          <label htmlFor="cad-activo" style={{fontSize:13,color:"#1a1f2e"}}>Cadena activa</label>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          {!isNew&&<Btn v="danger" onClick={function(){props.onDelete(props.cadena.id);}}>Eliminar</Btn>}
          <Btn v="ghost" onClick={props.onClose}>Cancelar</Btn>
          <Btn onClick={function(){props.onSave(form);}} disabled={!form.nombre.trim()}>
            {isNew?"Crear cadena":"Guardar cambios"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── MODAL HOTEL ──────────────────────────────────────────
function HotelModal(props){
  var DESTINOS_OPTS = props.destinosOpts || [];
  var s=S(); var isNew=!props.hotel;
  var blank={
    nombre:"",destino:"",categoria:"5 estrellas",plan:"Todo Incluido",activo:true,descripcion:"",
    fee:0,precio_noche:90,
    capacidad:{maxAdultos:2,permitirNinos:false,edadMinNino:0,edadMaxNino:12,maxNinos:2},
    restricciones:{edadMin:25,edadMax:99,estadoCivil:[]},
    amenidades:[],habitaciones:[],temporadas:[],
    cadena_id:props.cadenaId||null,
  };
  var [form,setForm]=useState(isNew?blank:JSON.parse(JSON.stringify(props.hotel)));
  var [tab,setTab]=useState("info");
  function set(k,v){ setForm(function(p){ return Object.assign({},p,{[k]:v}); }); }
  function setCap(k,v){ setForm(function(p){ return Object.assign({},p,{capacidad:Object.assign({},p.capacidad,{[k]:v})}); }); }
  function setRes(k,v){ setForm(function(p){ return Object.assign({},p,{restricciones:Object.assign({},p.restricciones,{[k]:v})}); }); }

  // Amenidades toggle
  function toggleAmen(a){
    var arr=form.amenidades||[];
    var has=arr.indexOf(a)>=0;
    set("amenidades",has?arr.filter(function(x){return x!==a;}):arr.concat([a]));
  }
  // Estado civil toggle
  function toggleEC(ec){
    var arr=form.restricciones.estadoCivil||[];
    var has=arr.indexOf(ec)>=0;
    setRes("estadoCivil",has?arr.filter(function(x){return x!==ec;}):arr.concat([ec]));
  }
  // Habitaciones
  function addHab(){
    var hab={id:uid(),nombre:"",tipoCama:"King",vistas:[],maxOcupantes:2,m2:0,amenidades:[],activo:true,descripcion:"",upgrade:0};
    set("habitaciones",(form.habitaciones||[]).concat([hab]));
  }
  function updateHab(i,k,v){
    var habs=form.habitaciones.slice();
    habs[i]=Object.assign({},habs[i],{[k]:v});
    set("habitaciones",habs);
  }
  function removeHab(i){
    set("habitaciones",form.habitaciones.filter(function(_,j){return j!==i;}));
  }
  // Temporadas
  function addTemp(){
    var t={id:uid(),nombre:"",inicio:"",fin:"",surcharge:0};
    set("temporadas",(form.temporadas||[]).concat([t]));
  }
  function updateTemp(i,k,v){
    var ts=form.temporadas.slice();
    ts[i]=Object.assign({},ts[i],{[k]:v});
    set("temporadas",ts);
  }
  function removeTemp(i){
    set("temporadas",form.temporadas.filter(function(_,j){return j!==i;}));
  }

  var TABS=[{k:"info",l:"Info general"},{k:"califica",l:"Calificacion"},{k:"habs",l:"Habitaciones"},{k:"amenidades",l:"Amenidades"},{k:"temporadas",l:"Temporadas"}];

  return (
    <Modal title={isNew?"Nuevo hotel":"Editar hotel"} onClose={props.onClose} wide>
      {/* Tabs */}
      <div style={{display:"flex",gap:0,borderBottom:"1px solid #e3e6ea",marginBottom:16,overflowX:"auto"}}>
        {TABS.map(function(t){
          var active=tab===t.k;
          return <button key={t.k} onClick={function(){setTab(t.k);}} style={{padding:"7px 14px",border:"none",borderBottom:active?"2px solid "+BRAND_DARK:"2px solid transparent",background:"none",cursor:"pointer",fontSize:12,fontWeight:active?700:400,color:active?BRAND_DARK:"#6b7280",whiteSpace:"nowrap"}}>{t.l}</button>;
        })}
      </div>

      {tab==="info"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={s.g2}>
            <div><label style={s.lbl}>Nombre del hotel *</label><input style={s.inp} value={form.nombre} onChange={function(e){set("nombre",e.target.value);}} placeholder="Ej: Grand Oasis Palm"/></div>
            <div><label style={s.lbl}>Destino *</label>
              <select style={s.sel} value={form.destino||""} onChange={function(e){set("destino",e.target.value);}}>
                <option value="">-- Seleccionar --</option>
                {DESTINOS_OPTS.map(function(d){return <option key={d} value={d}>{d}</option>;})}
              </select>
            </div>
            <div><label style={s.lbl}>Categoria</label>
              <select style={s.sel} value={form.categoria} onChange={function(e){set("categoria",e.target.value);}}>
                {CATEGORIAS.map(function(c){return <option key={c}>{c}</option>;})}
              </select>
            </div>
            <div><label style={s.lbl}>Plan</label>
              <select style={s.sel} value={form.plan} onChange={function(e){set("plan",e.target.value);}}>
                {PLANES.map(function(p){return <option key={p}>{p}</option>;})}
              </select>
            </div>
            <div><label style={s.lbl}>Fee base (USD)</label><input style={s.inp} type="number" value={form.fee} onChange={function(e){set("fee",Number(e.target.value));}}/></div>
            <div><label style={s.lbl}>Precio por noche extra (USD)</label><input style={s.inp} type="number" value={form.precio_noche} onChange={function(e){set("precio_noche",Number(e.target.value));}}/></div>
          </div>
          <div><label style={s.lbl}>Descripcion</label><textarea style={Object.assign({},s.ta,{minHeight:70})} value={form.descripcion} onChange={function(e){set("descripcion",e.target.value);}}/></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <input type="checkbox" checked={form.activo} onChange={function(e){set("activo",e.target.checked);}} id="h-activo"/>
            <label htmlFor="h-activo" style={{fontSize:13}}>Hotel activo</label>
          </div>
        </div>
      )}

      {tab==="califica"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={s.stit}>Restricciones de calificacion</div>
          <div style={s.g3}>
            <div><label style={s.lbl}>Edad minima</label><input style={s.inp} type="number" value={form.restricciones.edadMin} onChange={function(e){setRes("edadMin",Number(e.target.value));}}/></div>
            <div><label style={s.lbl}>Edad maxima</label><input style={s.inp} type="number" value={form.restricciones.edadMax} onChange={function(e){setRes("edadMax",Number(e.target.value));}}/></div>
          </div>
          <div>
            <label style={s.lbl}>Estados civiles aceptados (dejar vacio = todos)</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
              {ESTADOS_CIVIL.map(function(ec){
                var sel=(form.restricciones.estadoCivil||[]).indexOf(ec)>=0;
                return <button key={ec} onClick={function(){toggleEC(ec);}} style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",background:sel?BRAND_DARK:"#f4f5f7",color:sel?"#fff":"#6b7280",border:sel?"1px solid "+BRAND_DARK:"1px solid #e3e6ea"}}>{ec}</button>;
              })}
            </div>
          </div>
          <div style={s.stit}>Capacidad</div>
          <div style={s.g3}>
            <div><label style={s.lbl}>Max adultos</label><input style={s.inp} type="number" value={form.capacidad.maxAdultos} onChange={function(e){setCap("maxAdultos",Number(e.target.value));}}/></div>
            <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:20}}>
              <input type="checkbox" checked={form.capacidad.permitirNinos} onChange={function(e){setCap("permitirNinos",e.target.checked);}} id="h-ninos"/>
              <label htmlFor="h-ninos" style={{fontSize:13}}>Permite ninos</label>
            </div>
          </div>
          {form.capacidad.permitirNinos&&(
            <div style={s.g3}>
              <div><label style={s.lbl}>Max ninos</label><input style={s.inp} type="number" value={form.capacidad.maxNinos} onChange={function(e){setCap("maxNinos",Number(e.target.value));}}/></div>
              <div><label style={s.lbl}>Edad min nino</label><input style={s.inp} type="number" value={form.capacidad.edadMinNino} onChange={function(e){setCap("edadMinNino",Number(e.target.value));}}/></div>
              <div><label style={s.lbl}>Edad max nino</label><input style={s.inp} type="number" value={form.capacidad.edadMaxNino} onChange={function(e){setCap("edadMaxNino",Number(e.target.value));}}/></div>
            </div>
          )}
        </div>
      )}

      {tab==="habs"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={s.stit}>Tipos de habitacion</div>
            <Btn v="teal" sm onClick={addHab}>+ Agregar habitacion</Btn>
          </div>
          {(form.habitaciones||[]).length===0&&<div style={{textAlign:"center",padding:"24px",color:"#9ca3af",fontSize:12}}>Sin habitaciones — agrega la primera</div>}
          {(form.habitaciones||[]).map(function(h,i){
            return (
              <div key={h.id||i} style={{background:"#f8f9fb",border:"1px solid #e3e6ea",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
                <div style={s.g3}>
                  <div><label style={s.lbl}>Nombre</label><input style={s.inp} value={h.nombre} onChange={function(e){updateHab(i,"nombre",e.target.value);}} placeholder="Ej: Suite Junior"/></div>
                  <div><label style={s.lbl}>Tipo cama</label>
                    <select style={s.sel} value={h.tipoCama} onChange={function(e){updateHab(i,"tipoCama",e.target.value);}}>
                      {TIPO_CAMA.map(function(t){return <option key={t}>{t}</option>;})}
                    </select>
                  </div>
                  <div><label style={s.lbl}>Max ocupantes</label><input style={s.inp} type="number" value={h.maxOcupantes} onChange={function(e){updateHab(i,"maxOcupantes",Number(e.target.value));}}/></div>
                  <div><label style={s.lbl}>M2</label><input style={s.inp} type="number" value={h.m2} onChange={function(e){updateHab(i,"m2",Number(e.target.value));}}/></div>
                  <div><label style={s.lbl}>Cargo upgrade (USD)</label><input style={s.inp} type="number" value={h.upgrade||0} onChange={function(e){updateHab(i,"upgrade",Number(e.target.value));}}/></div>
                  <div style={{display:"flex",alignItems:"center",gap:6,paddingTop:18}}>
                    <input type="checkbox" checked={h.activo!==false} onChange={function(e){updateHab(i,"activo",e.target.checked);}} id={"hact"+i}/>
                    <label htmlFor={"hact"+i} style={{fontSize:12}}>Activa</label>
                  </div>
                </div>
                <div style={{marginTop:8}}><label style={s.lbl}>Descripcion</label><input style={s.inp} value={h.descripcion||""} onChange={function(e){updateHab(i,"descripcion",e.target.value);}}/></div>
                <div style={{marginTop:6,textAlign:"right"}}>
                  <Btn v="danger" sm onClick={function(){removeHab(i);}}>Eliminar</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab==="amenidades"&&(
        <div>
          <div style={s.stit}>Selecciona las amenidades del hotel</div>
          {AMENIDADES_CATS.map(function(cat){
            return (
              <div key={cat.cat} style={{marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:cat.col,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>{cat.cat}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {cat.items.map(function(a){
                    var sel=(form.amenidades||[]).indexOf(a)>=0;
                    return <button key={a} onClick={function(){toggleAmen(a);}} style={{padding:"4px 10px",borderRadius:16,fontSize:11,fontWeight:500,cursor:"pointer",background:sel?cat.col:"#f4f5f7",color:sel?"#fff":"#6b7280",border:sel?"1px solid "+cat.col:"1px solid #e3e6ea"}}>{a}</button>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab==="temporadas"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={s.stit}>Temporadas con cargo adicional</div>
            <Btn v="teal" sm onClick={addTemp}>+ Agregar temporada</Btn>
          </div>
          {(form.temporadas||[]).length===0&&<div style={{textAlign:"center",padding:"24px",color:"#9ca3af",fontSize:12}}>Sin temporadas especiales</div>}
          {(form.temporadas||[]).map(function(t,i){
            return (
              <div key={t.id||i} style={{background:"#f8f9fb",border:"1px solid #e3e6ea",borderRadius:10,padding:"12px 14px",marginBottom:8}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr auto",gap:8,alignItems:"end"}}>
                  <div><label style={s.lbl}>Nombre</label><input style={s.inp} value={t.nombre} onChange={function(e){updateTemp(i,"nombre",e.target.value);}} placeholder="Ej: Semana Santa"/></div>
                  <div><label style={s.lbl}>Inicio</label><input style={s.inp} type="date" value={t.inicio} onChange={function(e){updateTemp(i,"inicio",e.target.value);}}/></div>
                  <div><label style={s.lbl}>Fin</label><input style={s.inp} type="date" value={t.fin} onChange={function(e){updateTemp(i,"fin",e.target.value);}}/></div>
                  <div><label style={s.lbl}>Cargo/noche (USD)</label><input style={s.inp} type="number" value={t.surcharge} onChange={function(e){updateTemp(i,"surcharge",Number(e.target.value));}}/></div>
                  <Btn v="danger" sm onClick={function(){removeTemp(i);}}>✕</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20,paddingTop:16,borderTop:"1px solid #e3e6ea"}}>
        {!isNew&&<Btn v="danger" onClick={function(){props.onDelete(props.hotel.id);}}>Eliminar hotel</Btn>}
        <Btn v="ghost" onClick={props.onClose}>Cancelar</Btn>
        <Btn onClick={function(){props.onSave(form);}} disabled={!form.nombre.trim()||!form.destino}>
          {isNew?"Crear hotel":"Guardar cambios"}
        </Btn>
      </div>
    </Modal>
  );
}

// ─── VISTA HOTELES DE UNA CADENA ──────────────────────────
function CadenaDetalle(props){
  var DESTINOS_OPTS = props.destinosOpts || [];
  var s=S();
  var cadena=props.cadena;
  var hotels=props.hotels;
  var [buscar,setBuscar]=useState("");
  var [filtroDestino,setFiltroDestino]=useState("todos");
  var [hotelModal,setHotelModal]=useState(null);
  var [hotelDetalle,setHotelDetalle]=useState(null);
  var [googleSearch,setGoogleSearch]=useState(false);
  var [preloadData,setPreloadData]=useState(null);

  var destinos=["todos"].concat(Array.from(new Set(hotels.map(function(h){return h.destino;}))));
  var vis=hotels.filter(function(h){
    var mb=!buscar||h.nombre.toLowerCase().indexOf(buscar.toLowerCase())>=0||h.destino.toLowerCase().indexOf(buscar.toLowerCase())>=0;
    var md=filtroDestino==="todos"||h.destino===filtroDestino;
    return mb&&md;
  });

  function handleGoogleImport(data){
    // Mapear datos de Google al formato HotelModal
    var preload = {
      nombre:       data.nombre || "",
      destino:      data.destino || "",
      descripcion:  data.descripcion || "",
      categoria:    data.categoria || "5 estrellas",
      plan:         data.plan || "Todo Incluido",
      activo:       true,
      fee:          0,
      precio_noche: 90,
      amenidades:   data.amenidades || [],
      habitaciones: (data.habitaciones||[]).map(function(h){
        return {id:h.id||("H"+Date.now()+Math.random().toString(36).slice(2,5)),nombre:h.nombre,tipoCama:h.tipoCama||"King",vistas:[],maxOcupantes:h.maxOcupantes||2,m2:h.m2||0,amenidades:[],activo:true,descripcion:h.descripcion||"",upgrade:0};
      }),
      temporadas:   [],
      capacidad:    data.capacidad || {maxAdultos:2,permitirNinos:false,edadMinNino:0,edadMaxNino:12,maxNinos:0},
      restricciones:data.restricciones || {edadMin:25,edadMax:99,estadoCivil:[]},
      cadena_id:    cadena.id,
      // meta Google
      fotos:        data.fotos || [],
      telefono:     data.telefono || "",
      website:      data.website || "",
      rating:       data.rating || 0,
    };
    setPreloadData(preload);
    setGoogleSearch(false);
    setHotelModal({hotel:null});
  }

  if(hotelDetalle){
    var hotelActual=hotels.find(function(h){return h.id===hotelDetalle.id;})||hotelDetalle;
    return (
      <div style={s.wrap}>
        {/* Topbar hotel detalle */}
        <div style={{background:"#ffffff",borderBottom:"1px solid #e3e6ea",padding:"0 20px",display:"flex",alignItems:"center",gap:10,minHeight:52,flexShrink:0}}>
          <button onClick={function(){setHotelDetalle(null);}} style={{background:"none",border:"none",cursor:"pointer",color:"#6b7280",fontSize:13,display:"flex",alignItems:"center",gap:4}}>← {cadena.nombre}</button>
          <div style={{width:1,height:16,background:"#e3e6ea"}}/>
          <div style={{fontWeight:700,fontSize:14,color:BRAND_DARK}}>{hotelActual.nombre}</div>
          <span style={{fontSize:11,color:"#9ca3af"}}>{hotelActual.destino}</span>
          <div style={{flex:1}}/>
          <Btn v="ghost" sm onClick={function(){setHotelModal({hotel:hotelActual});}}>Editar hotel</Btn>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          {/* Info general */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
            {[["Destino",hotelActual.destino],["Categoria",hotelActual.categoria],["Plan",hotelActual.plan],["Fee base","$"+(hotelActual.fee||0)],["Precio noche","$"+(hotelActual.precio_noche||0)],["Status",hotelActual.activo?"Activo":"Inactivo"]].map(function(row){
              return <div key={row[0]} style={{background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:10,padding:"10px 14px"}}>
                <div style={{fontSize:10,color:"#9ca3af",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{row[0]}</div>
                <div style={{fontSize:13,fontWeight:700,color:"#1a1f2e"}}>{row[1]}</div>
              </div>;
            })}
          </div>
          {/* Calificacion */}
          <div style={{background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Calificacion requerida</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap",fontSize:12}}>
              <span style={{color:"#6b7280"}}>Edad: <strong style={{color:"#1a1f2e"}}>{(hotelActual.restricciones||{}).edadMin||25} - {(hotelActual.restricciones||{}).edadMax||99} años</strong></span>
              <span style={{color:"#6b7280"}}>Ninos: <strong style={{color:"#1a1f2e"}}>{(hotelActual.capacidad||{}).permitirNinos?"Si":"No"}</strong></span>
              {((hotelActual.restricciones||{}).estadoCivil||[]).length>0&&(
                <span style={{color:"#6b7280"}}>EC: <strong style={{color:"#1a1f2e"}}>{hotelActual.restricciones.estadoCivil.join(", ")}</strong></span>
              )}
            </div>
          </div>
          {/* Habitaciones */}
          {(hotelActual.habitaciones||[]).length>0&&(
            <div style={{background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Habitaciones ({hotelActual.habitaciones.length})</div>
              {hotelActual.habitaciones.map(function(h){
                return <div key={h.id} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f0f1f4",fontSize:12}}>
                  <span style={{fontWeight:600,color:"#1a1f2e"}}>{h.nombre}</span>
                  <span style={{color:"#9ca3af"}}>{h.tipoCama} · {h.maxOcupantes} pax{h.upgrade>0?" · +$"+h.upgrade+" upg":""}</span>
                </div>;
              })}
            </div>
          )}
          {/* Amenidades */}
          {(hotelActual.amenidades||[]).length>0&&(
            <div style={{background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:10,padding:"14px 16px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Amenidades ({hotelActual.amenidades.length})</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {hotelActual.amenidades.map(function(a){
                  return <span key={a} style={{background:"#f4f5f7",border:"1px solid #e3e6ea",borderRadius:16,padding:"3px 10px",fontSize:11,color:"#1a1f2e"}}>{a}</span>;
                })}
              </div>
            </div>
          )}
          {/* Temporadas */}
          {(hotelActual.temporadas||[]).length>0&&(
            <div style={{background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:10,padding:"14px 16px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Temporadas especiales</div>
              {hotelActual.temporadas.map(function(t){
                return <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f0f1f4",fontSize:12}}>
                  <span style={{fontWeight:600,color:"#1a1f2e"}}>{t.nombre}</span>
                  <span style={{color:"#9ca3af"}}>{t.inicio} → {t.fin}</span>
                  <span style={{color:AMBER,fontWeight:600}}>+${t.surcharge}/noche</span>
                </div>;
              })}
            </div>
          )}
        </div>
        {hotelModal&&<HotelModal hotel={hotelModal.hotel} cadenaId={cadena.id} onSave={function(f){props.onSaveHotel(f);setHotelModal(null);setHotelDetalle(f);}} onDelete={function(id){props.onDeleteHotel(id);setHotelModal(null);setHotelDetalle(null);}} onClose={function(){setHotelModal(null);}} destinosOpts={DESTINOS_OPTS}/>}
      </div>
    );
  }

  if(googleSearch){
    return (
      <div style={s.wrap}>
        <HotelSearch
          onImport={handleGoogleImport}
          onClose={function(){setGoogleSearch(false);}}
        />
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      {/* Topbar */}
      <div style={{background:"#ffffff",borderBottom:"1px solid #e3e6ea",padding:"0 20px",display:"flex",alignItems:"center",gap:10,minHeight:52,flexShrink:0}}>
        <button onClick={props.onBack} style={{background:"none",border:"none",cursor:"pointer",color:"#6b7280",fontSize:13,display:"flex",alignItems:"center",gap:4}}>← Cadenas</button>
        <div style={{width:1,height:16,background:"#e3e6ea"}}/>
        <div style={{fontWeight:700,fontSize:14,color:BRAND_DARK}}>{cadena.nombre}</div>
        <span style={{fontSize:11,color:"#9ca3af"}}>{hotels.length} hotel{hotels.length!==1?"es":""}</span>
        <div style={{flex:1}}/>
        <Btn v="ghost" sm onClick={props.onEditCadena}>Editar cadena</Btn>
        <Btn v="ghost" sm onClick={function(){setHotelModal({hotel:null});}}>+ Manual</Btn>
        <Btn sm onClick={function(){setGoogleSearch(true);}}>+ Buscar en Google</Btn>
      </div>
      {/* Filtros */}
      <div style={{padding:"10px 20px",background:"#ffffff",borderBottom:"1px solid #e3e6ea",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
        <input style={Object.assign({},s.inp,{maxWidth:220})} value={buscar} onChange={function(e){setBuscar(e.target.value);}} placeholder="Buscar hotel..."/>
        <select style={Object.assign({},s.sel,{maxWidth:160})} value={filtroDestino} onChange={function(e){setFiltroDestino(e.target.value);}}>
          {destinos.map(function(d){return <option key={d} value={d}>{d==="todos"?"Todos los destinos":d}</option>;})}
        </select>
        <div style={{marginLeft:"auto",fontSize:12,color:"#9ca3af"}}>{vis.length} resultado(s)</div>
      </div>
      {/* Lista hoteles */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        {vis.length===0&&(
          <div style={{textAlign:"center",padding:"60px 20px",background:"#ffffff",borderRadius:12,border:"2px dashed #e3e6ea"}}>
            <div style={{fontSize:32,marginBottom:10}}>🏨</div>
            <div style={{fontSize:14,fontWeight:700,color:"#6b7280",marginBottom:4}}>{hotels.length===0?"Sin hoteles en esta cadena":"Sin resultados"}</div>
            {hotels.length===0&&(
              <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:8}}>
                <Btn v="ghost" onClick={function(){setHotelModal({hotel:null});}}>+ Agregar manualmente</Btn>
                <Btn onClick={function(){setGoogleSearch(true);}}>+ Buscar en Google</Btn>
              </div>
            )}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {vis.map(function(h){
            return (
              <div key={h.id} onClick={function(){setHotelDetalle(h);}} style={{background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:12,padding:"14px 16px",cursor:"pointer",transition:"box-shadow 0.15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#1a1f2e"}}>{h.nombre}</div>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:h.activo?"#eaf5ec":"#fef0f0",color:h.activo?GREEN:RED,border:"1px solid "+(h.activo?"#a3d9a5":"#f5b8b8"),fontWeight:600}}>{h.activo?"Activo":"Inactivo"}</span>
                </div>
                <div style={{fontSize:11,color:"#6b7280",marginBottom:6}}>📍 {h.destino} · {h.categoria}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,background:"#f4f5f7",border:"1px solid #e3e6ea",borderRadius:8,padding:"2px 8px",color:"#6b7280"}}>{h.plan}</span>
                  {(h.habitaciones||[]).length>0&&<span style={{fontSize:10,background:"#eef2ff",border:"1px solid #c7d2fe",borderRadius:8,padding:"2px 8px",color:INDIGO}}>{h.habitaciones.length} hab</span>}
                  {(h.amenidades||[]).length>0&&<span style={{fontSize:10,background:"rgba(14,165,160,0.08)",border:"1px solid rgba(14,165,160,0.3)",borderRadius:8,padding:"2px 8px",color:TEAL}}>{h.amenidades.length} amenidades</span>}
                  <span style={{fontSize:10,background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"2px 8px",color:AMBER}}>Fee ${h.fee}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {hotelModal&&<HotelModal hotel={preloadData||hotelModal.hotel} cadenaId={cadena.id} onSave={function(f){props.onSaveHotel(f);setHotelModal(null);setPreloadData(null);}} onDelete={function(id){props.onDeleteHotel(id);setHotelModal(null);setPreloadData(null);}} onClose={function(){setHotelModal(null);setPreloadData(null);}} destinosOpts={DESTINOS_OPTS}/>}
    </div>
  );
}

// ─── MÓDULO PRINCIPAL ─────────────────────────────────────
export default function HotelsModule(){
  var s=S();
  var [cadenas,  setCadenas]  = useState([]);
  var [hotels,   setHotels]   = useState([]);
  var [destinos, setDestinos] = useState([]);
  var [loading,  setLoading]  = useState(true);
  var [cadSel,   setCadSel]   = useState(null);
  var [cadModal, setCadModal] = useState(null);
  var [buscar,   setBuscar]   = useState("");

  function cargar(){
    Promise.all([
      SB.from("cadenas_hoteleras").select("*").order("nombre",{ascending:true}),
      SB.from("hoteles").select("*").order("nombre",{ascending:true}),
      SB.from("destinos_catalog").select("id,nombre").eq("activo",true).order("nombre",{ascending:true}),
    ]).then(function(results){
      setLoading(false);
      if(!results[0].error) setCadenas(results[0].data||[]);
      if(!results[1].error) setHotels(results[1].data||[]);
      if(!results[2].error) setDestinos((results[2].data||[]).map(function(d){return d.nombre;}));
    });
  }
  useEffect(function(){ cargar(); },[]);

  function saveCadena(form){
    var isNew=!form.id||!cadenas.some(function(c){return c.id===form.id;});
    if(isNew){
      var ins=Object.assign({},form); delete ins.id;
      SB.from("cadenas_hoteleras").insert(ins).then(function(r){if(!r.error){cargar();setCadModal(null);}else alert(r.error.message);});
    } else {
      SB.from("cadenas_hoteleras").update(form).eq("id",form.id).then(function(r){if(!r.error){cargar();setCadModal(null);}else alert(r.error.message);});
    }
  }
  function deleteCadena(id){
    SB.from("cadenas_hoteleras").delete().eq("id",id).then(function(r){if(!r.error){cargar();setCadModal(null);setCadSel(null);}else alert(r.error.message);});
  }
  function saveHotel(form){
    var isNew=!form.id||!hotels.some(function(h){return h.id===form.id;});
    if(isNew){
      var ins=Object.assign({},form); delete ins.id;
      SB.from("hoteles").insert(ins).then(function(r){if(!r.error)cargar();else alert(r.error.message);});
    } else {
      SB.from("hoteles").update(form).eq("id",form.id).then(function(r){if(!r.error)cargar();else alert(r.error.message);});
    }
  }
  function deleteHotel(id){
    SB.from("hoteles").delete().eq("id",id).then(function(r){if(!r.error)cargar();else alert(r.error.message);});
  }

  if(loading) return (
    <div style={{minHeight:"100vh",background:"#f4f5f7",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontSize:13,color:"#9ca3af"}}>Cargando hoteles...</div>
    </div>
  );

  if(cadSel){
    var cadenaActual=cadenas.find(function(c){return c.id===cadSel;})||null;
    if(!cadenaActual){setCadSel(null);return null;}
    var hotelsDeCadena=hotels.filter(function(h){return h.cadena_id===cadSel;});
    return (
      <CadenaDetalle
        cadena={cadenaActual}
        hotels={hotelsDeCadena}
        destinosOpts={destinos}
        onBack={function(){setCadSel(null);}}
        onEditCadena={function(){setCadModal({cadena:cadenaActual});}}
        onSaveHotel={saveHotel}
        onDeleteHotel={deleteHotel}
      />
    );
  }

  var cadenasVis=cadenas.filter(function(c){
    return !buscar||c.nombre.toLowerCase().indexOf(buscar.toLowerCase())>=0;
  });

  return (
    <div style={s.wrap}>
      {/* Topbar */}
      <div style={{background:"#ffffff",borderBottom:"1px solid #e3e6ea",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",minHeight:52,flexShrink:0}}>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:BRAND_DARK}}>Cadenas hoteleras</div>
          <div style={{fontSize:11,color:"#6b7280"}}>{cadenas.length} cadenas · {hotels.length} hoteles registrados</div>
        </div>
        <Btn onClick={function(){setCadModal({cadena:null});}}>+ Nueva cadena</Btn>
      </div>
      {/* Buscar */}
      <div style={{padding:"10px 20px",background:"#ffffff",borderBottom:"1px solid #e3e6ea",flexShrink:0}}>
        <input style={Object.assign({},s.inp,{maxWidth:280})} value={buscar} onChange={function(e){setBuscar(e.target.value);}} placeholder="Buscar cadena..."/>
      </div>
      {/* Lista cadenas */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        {cadenasVis.length===0&&(
          <div style={{textAlign:"center",padding:"60px 20px",background:"#ffffff",borderRadius:12,border:"2px dashed #e3e6ea"}}>
            <div style={{fontSize:40,marginBottom:10}}>🏨</div>
            <div style={{fontSize:14,fontWeight:700,color:"#6b7280",marginBottom:6}}>{cadenas.length===0?"Sin cadenas registradas":"Sin resultados"}</div>
            {cadenas.length===0&&<Btn onClick={function(){setCadModal({cadena:null});}}>+ Agregar primera cadena</Btn>}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {cadenasVis.map(function(c){
            var hCount=hotels.filter(function(h){return h.cadena_id===c.id;}).length;
            var destsUniq=Array.from(new Set(hotels.filter(function(h){return h.cadena_id===c.id;}).map(function(h){return h.destino;})));
            return (
              <div key={c.id} onClick={function(){setCadSel(c.id);}}
                style={{background:"#ffffff",border:"1px solid #e3e6ea",borderRadius:12,padding:"16px 18px",cursor:"pointer",transition:"box-shadow 0.15s",position:"relative"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#1a1f2e"}}>{c.nombre}</div>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:c.activo?"#eaf5ec":"#fef0f0",color:c.activo?GREEN:RED,border:"1px solid "+(c.activo?"#a3d9a5":"#f5b8b8"),fontWeight:600}}>{c.activo?"Activa":"Inactiva"}</span>
                </div>
                {c.descripcion&&<div style={{fontSize:11,color:"#9ca3af",marginBottom:10,lineHeight:1.4}}>{c.descripcion.slice(0,80)}{c.descripcion.length>80?"...":""}</div>}
                <div style={{display:"flex",gap:8,alignItems:"center",fontSize:12}}>
                  <span style={{background:"#eef2ff",border:"1px solid #c7d2fe",borderRadius:8,padding:"3px 10px",color:INDIGO,fontWeight:600}}>{hCount} hotel{hCount!==1?"es":""}</span>
                  {destsUniq.slice(0,2).map(function(d){return <span key={d} style={{background:"#f4f5f7",border:"1px solid #e3e6ea",borderRadius:8,padding:"3px 8px",color:"#6b7280",fontSize:10}}>{d}</span>;})}
                  {destsUniq.length>2&&<span style={{fontSize:10,color:"#9ca3af"}}>+{destsUniq.length-2} más</span>}
                </div>
                <div style={{position:"absolute",bottom:14,right:14,fontSize:11,color:"#9ca3af"}}>Ver hoteles →</div>
              </div>
            );
          })}
        </div>
      </div>
      {cadModal&&<CadenaModal cadena={cadModal.cadena} onSave={saveCadena} onDelete={deleteCadena} onClose={function(){setCadModal(null);}}/>}
    </div>
  );
}
