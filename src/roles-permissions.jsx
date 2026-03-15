import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

var SB = createClient(
  "https://gsvnvahrjgswwejnuiyn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA"
);
var SB_ADMIN = createClient(
  "https://gsvnvahrjgswwejnuiyn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxNTA0MiwiZXhwIjoyMDg4NTkxMDQyfQ.-P8KH6yhs6AJ1lUwBrwUpcoZV3KGvM7fDlFM3RsYKxw"
);

var TEAL="#0ea5a0",INDIGO="#6366f1",VIOLET="#5b21b6",GREEN="#1a7f3c",AMBER="#f59e0b",RED="#b91c1c",CORAL="#f97316",BLUE="#1565c0";

var MODULOS=[
  {id:"dashboard",   label:"Dashboard Ejecutivo", area:"Reportes",      color:INDIGO, acciones:[{id:"exportar_reporte",label:"Exportar reporte"},{id:"ver_financiero",label:"Ver datos financieros"}]},
  {id:"radio",       label:"Radio / Leads",        area:"Ventas",        color:CORAL,  acciones:[{id:"asignar_lead",label:"Asignar lead"},{id:"crear_campana",label:"Crear campana"},{id:"exportar_leads",label:"Exportar leads"}]},
  {id:"seller",      label:"Seller CRM",           area:"Ventas",        color:TEAL,   acciones:[{id:"cerrar_venta",label:"Cerrar venta"},{id:"reasignar_lead",label:"Reasignar lead"},{id:"ver_todos_leads",label:"Ver leads del equipo"}]},
  {id:"verificacion",label:"Verificacion",         area:"Operaciones",   color:BLUE,   acciones:[{id:"aprobar_venta",label:"Aprobar expediente"},{id:"rechazar_venta",label:"Rechazar expediente"},{id:"solicitar_docs",label:"Solicitar documentos"}]},
  {id:"cs",          label:"Customer Service",     area:"Operaciones",   color:VIOLET, acciones:[{id:"cancelar_membresia",label:"Cancelar membresia"},{id:"procesar_reembolso",label:"Procesar reembolso"},{id:"gestionar_cb",label:"Gestionar chargeback"}]},
  {id:"reservaciones",label:"Reservaciones",       area:"Operaciones",   color:GREEN,  acciones:[{id:"confirmar_reserva",label:"Confirmar reserva"},{id:"cancelar_reserva",label:"Cancelar reserva"},{id:"modificar_fechas",label:"Modificar fechas"}]},
  {id:"paquetes",    label:"Paquetes",             area:"Configuracion", color:AMBER,  acciones:[{id:"crear_paquete",label:"Crear paquete"},{id:"publicar_paquete",label:"Publicar/archivar"},{id:"editar_precios",label:"Editar precios"}]},
  {id:"comisiones",  label:"Comisiones",           area:"Admin",         color:GREEN,  acciones:[{id:"aprobar_spiff",label:"Aprobar spiff/meta"},{id:"crear_spiff",label:"Crear meta/spiff"},{id:"editar_pct",label:"Editar % comision"},{id:"ver_nomina",label:"Ver nomina"}]},
  {id:"portal",      label:"Portal Cliente",       area:"Operaciones",   color:TEAL,   acciones:[{id:"enviar_acceso",label:"Enviar acceso"},{id:"bloquear_acceso",label:"Bloquear acceso"}]},
  {id:"destinos",    label:"Destinos y Hoteles",   area:"Reservas",      color:TEAL,   acciones:[{id:"crear_destino",label:"Crear destino"},{id:"editar_destino",label:"Editar destino"},{id:"activar_destino",label:"Activar/desactivar destino"},{id:"editar_hoteles",label:"Editar hoteles"}]},
  {id:"usuarios",    label:"Usuarios y Roles",     area:"Admin",         color:RED,    acciones:[{id:"crear_usuario",label:"Crear usuario"},{id:"desactivar_usuario",label:"Activar/desactivar usuario"},{id:"cambiar_rol",label:"Cambiar rol"},{id:"gestionar_roles",label:"Crear/editar roles"}]},
];

var AREAS=["Ventas","Operaciones","Reservas","Reportes","Configuracion","Admin"];

function buildPerms(modIds,fullAccess){
  var p={};
  for(var i=0;i<MODULOS.length;i++){
    var m=MODULOS[i];
    var on=fullAccess||modIds.indexOf(m.id)!==-1;
    var acc={access:on,ver:on,crear:fullAccess,editar:fullAccess,eliminar:fullAccess,acciones:{}};
    for(var j=0;j<m.acciones.length;j++) acc.acciones[m.acciones[j].id]=fullAccess;
    p[m.id]=acc;
  }
  return p;
}
function buildReadOnly(modIds){
  var p={};
  for(var i=0;i<MODULOS.length;i++){
    var m=MODULOS[i];
    var on=modIds.indexOf(m.id)!==-1;
    var acc={access:on,ver:on,crear:false,editar:false,eliminar:false,acciones:{}};
    for(var j=0;j<m.acciones.length;j++) acc.acciones[m.acciones[j].id]=false;
    p[m.id]=acc;
  }
  return p;
}

var ROLES_SEED=[
  {id:"admin",      nombre:"Administrador",       color:RED,    desc:"Acceso completo al sistema",                sistema:true,
   perms:buildPerms([],true)},
  {id:"director",   nombre:"Director",            color:VIOLET, desc:"Solo lectura en todos los modulos",          sistema:true,
   perms:(function(){var p=buildReadOnly(["dashboard","radio","seller","verificacion","cs","reservaciones","paquetes","comisiones","portal","usuarios"]);p["destinos"]={access:true,ver:true,crear:true,editar:true,eliminar:true,acciones:{crear_destino:true,editar_destino:true,activar_destino:true,editar_hoteles:true}};return p;})()},
  {id:"supervisor", nombre:"Supervisor",          color:BLUE,   desc:"Operacion completa salvo Admin y Usuarios",  sistema:true,
   perms:(function(){
     var ids=["dashboard","radio","seller","verificacion","cs","reservaciones","paquetes","comisiones","portal"];
     var p=buildPerms(ids,false);
     for(var i=0;i<MODULOS.length;i++){
       var m=MODULOS[i];
       if(ids.indexOf(m.id)!==-1){
         p[m.id].access=true;p[m.id].ver=true;p[m.id].crear=true;p[m.id].editar=true;p[m.id].eliminar=false;
         for(var j=0;j<m.acciones.length;j++) p[m.id].acciones[m.acciones[j].id]=true;
       }
     }
     return p;
   })()},
  {id:"verificador",nombre:"Verificador",         color:TEAL,   desc:"Acceso al modulo de verificacion y CS",     sistema:true,
   perms:(function(){
     var p=buildReadOnly(["verificacion","cs","reservaciones"]);
     p.verificacion.crear=true;p.verificacion.editar=true;
     for(var j=0;j<MODULOS[3].acciones.length;j++) p.verificacion.acciones[MODULOS[3].acciones[j].id]=true;
     return p;
   })()},
  {id:"vendedor",   nombre:"Vendedor",            color:CORAL,  desc:"Acceso a radio, CRM propio y comisiones",   sistema:true,
   perms:(function(){
     var p=buildReadOnly(["radio","seller","comisiones"]);
     p.radio.crear=true;p.seller.crear=true;p.seller.editar=true;
     p.radio.acciones["asignar_lead"]=false;
     p.comisiones.acciones["ver_nomina"]=false;
     return p;
   })()},
  {id:"especialista_radio",nombre:"Especialista Radio",color:CORAL,desc:"Acceso completo al modulo Radio/Leads",  sistema:true,
   perms:(function(){
     var p=buildPerms(["radio"],false);
     p.radio.access=true;p.radio.ver=true;p.radio.crear=true;p.radio.editar=true;p.radio.eliminar=false;
     for(var j=0;j<MODULOS[1].acciones.length;j++) p.radio.acciones[MODULOS[1].acciones[j].id]=true;
     return p;
   })()},
  {id:"cs",         nombre:"CS",                  color:VIOLET, desc:"Acceso a Customer Service y Reservaciones",  sistema:true,
   perms:(function(){
     var p=buildReadOnly(["cs","reservaciones","portal"]);
     p.cs.crear=true;p.cs.editar=true;
     for(var j=0;j<MODULOS[4].acciones.length;j++) p.cs.acciones[MODULOS[4].acciones[j].id]=true;
     return p;
   })()},
  {id:"contador",   nombre:"Contador",            color:GREEN,  desc:"Acceso a comisiones y reportes",             sistema:true,
   perms:(function(){
     var p=buildReadOnly(["comisiones","dashboard"]);
     p.comisiones.acciones["ver_nomina"]=true;
     return p;
   })()},
];

var T={
  bg:"#f4f5f7",surface:"#ffffff",border:"#e3e6ea",borderL:"#edf0f3",
  t1:"#1a1f2e",t2:"#3d4554",t3:"#6b7280",t4:"#9ca3af",
  green:"#1a7f3c",greenBg:"#edf7ee",greenBd:"#a3d9a5",
  red:"#b91c1c",redBg:"#fef2f2",redBd:"#f5b8b8",
  font:"'DM Sans','Segoe UI',-apple-system,sans-serif",
};

var ROLES_META=[
  {id:"admin",             label:"Admin",             color:RED,    bg:RED+"18",    bd:RED+"44"},
  {id:"director",          label:"Director",          color:VIOLET, bg:VIOLET+"18", bd:VIOLET+"44"},
  {id:"supervisor",        label:"Supervisor",        color:BLUE,   bg:BLUE+"18",   bd:BLUE+"44"},
  {id:"verificador",       label:"Verificador",       color:TEAL,   bg:TEAL+"18",   bd:TEAL+"44"},
  {id:"vendedor",          label:"Vendedor",          color:CORAL,  bg:CORAL+"18",  bd:CORAL+"44"},
  {id:"especialista_radio",label:"Especialista Radio",color:CORAL,  bg:CORAL+"18",  bd:CORAL+"44"},
  {id:"cs",                label:"CS",                color:VIOLET, bg:VIOLET+"18", bd:VIOLET+"44"},
  {id:"contador",          label:"Contador",          color:GREEN,  bg:GREEN+"18",  bd:GREEN+"44"},
];

function rolMeta(rolId){
  for(var i=0;i<ROLES_META.length;i++){if(ROLES_META[i].id===rolId)return ROLES_META[i];}
  return {label:rolId,color:T.t3,bg:T.bg,bd:T.border};
}
function fmtFecha(str){
  if(!str)return "-";
  return new Date(str).toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"});
}
function uid(){return "R"+Date.now()+Math.floor(Math.random()*999);}

var S={
  wrap:  {minHeight:"100vh",background:T.bg,color:T.t2,fontFamily:T.font,fontSize:"13px"},
  card:  {background:T.surface,border:"1px solid "+T.border,borderRadius:"12px",padding:"14px 16px",marginBottom:"10px"},
  inp:   {width:"100%",background:T.surface,border:"1px solid "+T.border,borderRadius:"8px",padding:"8px 11px",color:T.t1,fontSize:"12px",outline:"none",boxSizing:"border-box",fontFamily:T.font},
  lbl:   {fontSize:"11px",color:T.t4,marginBottom:"4px",fontWeight:"500",display:"block"},
  stit:  {fontSize:"10px",fontWeight:"700",color:T.t4,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"8px"},
};
function btn(v,sm){
  var m={teal:{bg:TEAL+"22",c:TEAL,br:TEAL+"44"},ghost:{bg:T.bg,c:T.t2,br:T.border},indigo:{bg:"#e5eafd",c:INDIGO,br:"#aab4f5"},danger:{bg:T.redBg,c:RED,br:T.redBd},primary:{bg:TEAL,c:"#fff",br:TEAL}};
  var s=m[v]||m.ghost;
  var p=sm?"4px 10px":"7px 14px";
  return {display:"inline-flex",alignItems:"center",gap:"5px",padding:p,borderRadius:"7px",cursor:"pointer",fontSize:sm?"11px":"12px",fontWeight:"600",background:s.bg,color:s.c,border:"1px solid "+s.br,whiteSpace:"nowrap",fontFamily:T.font};
}
function tabS(a,col){var c=col||TEAL;return {padding:"7px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:a?"700":"400",background:a?(c+"22"):"transparent",color:a?c:T.t4,border:a?("1px solid "+c+"44"):"1px solid transparent",whiteSpace:"nowrap"};}
function bdg(c,bg,br){return {display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:"20px",fontSize:"10px",fontWeight:"700",color:c,background:bg,border:"1px solid "+br};}
function toggle(on,col){return {width:"36px",height:"20px",borderRadius:"10px",background:on?(col||TEAL):"#f0f1f4",border:"1px solid "+(on?(col||TEAL)+"88":"#eceff3"),cursor:"pointer",position:"relative",flexShrink:0,transition:"background 0.2s"};}
function toggleDot(on){return {position:"absolute",top:"2px",left:on?"18px":"2px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left 0.2s"};}

function Toggle(props){
  return(
    <div style={toggle(props.on,props.col)} onClick={props.disabled?null:props.onChange}>
      <div style={toggleDot(props.on)}></div>
    </div>
  );
}

function PermisosEditor(props){
  var rol=props.rol;
  var perms=props.perms;
  var onChange=props.onChange;
  var readOnly=props.readOnly||rol.sistema;
  var [areaFiltro,setAreaFiltro]=useState("Todos");
  var areas=["Todos"].concat(AREAS);
  var modsVis=MODULOS.filter(function(m){return areaFiltro==="Todos"||m.area===areaFiltro;});

  function setModPerm(modId,key,val){
    if(readOnly)return;
    var np=JSON.parse(JSON.stringify(perms));
    np[modId][key]=val;
    if(key==="access"&&!val){np[modId].ver=false;np[modId].crear=false;np[modId].editar=false;np[modId].eliminar=false;for(var a in np[modId].acciones)np[modId].acciones[a]=false;}
    if(key==="ver"&&val)np[modId].access=true;
    onChange(np);
  }
  function setAccion(modId,acId,val){
    if(readOnly)return;
    var np=JSON.parse(JSON.stringify(perms));
    np[modId].acciones[acId]=val;
    if(val)np[modId].access=true;
    onChange(np);
  }
  function toggleAll(modId,val){
    if(readOnly)return;
    var np=JSON.parse(JSON.stringify(perms));
    np[modId].access=val;np[modId].ver=val;np[modId].crear=val;np[modId].editar=val;np[modId].eliminar=val;
    var mod=null;for(var i=0;i<MODULOS.length;i++){if(MODULOS[i].id===modId){mod=MODULOS[i];break;}}
    if(mod){for(var j=0;j<mod.acciones.length;j++)np[modId].acciones[mod.acciones[j].id]=val;}
    onChange(np);
  }
  var CRUD=[{k:"ver",l:"Ver"},{k:"crear",l:"Crear"},{k:"editar",l:"Editar"},{k:"eliminar",l:"Eliminar"}];

  return(
    <div>
      <div style={{display:"flex",gap:"4px",marginBottom:"14px",flexWrap:"wrap"}}>
        {areas.map(function(a){return <button key={a} style={tabS(areaFiltro===a,INDIGO)} onClick={function(){setAreaFiltro(a);}}>{a}</button>;})}
      </div>
      {readOnly&&(
        <div style={{padding:"8px 12px",borderRadius:"8px",background:AMBER+"11",border:"1px solid "+AMBER+"33",fontSize:"11px",color:AMBER,marginBottom:"12px"}}>
          Los roles del sistema no se pueden editar. Duplica el rol para crear una version personalizada.
        </div>
      )}
      {modsVis.map(function(m){
        var mp=perms[m.id]||{access:false,ver:false,crear:false,editar:false,eliminar:false,acciones:{}};
        var totalAcc=m.acciones.length;
        var onAcc=Object.values(mp.acciones||{}).filter(Boolean).length;
        return(
          <div key={m.id} style={Object.assign({},S.card,{borderColor:mp.access?(m.color+"33"):"#f6f7f9",marginBottom:"8px"})}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:mp.access?"10px":"0"}}>
              <Toggle on={mp.access} col={m.color} onChange={function(){toggleAll(m.id,!mp.access);}} disabled={readOnly}/>
              <div style={{flex:1}}>
                <div style={{fontSize:"12px",fontWeight:"600",color:mp.access?T.t2:T.t4}}>{m.label}</div>
                <div style={{fontSize:"10px",color:"#b0b8c4"}}>{m.area}</div>
              </div>
              {mp.access&&(
                <div style={{display:"flex",gap:"4px"}}>
                  {CRUD.map(function(c){
                    var on=mp[c.k];
                    return(
                      <div key={c.k} onClick={function(){setModPerm(m.id,c.k,!on);}}
                        style={{padding:"3px 8px",borderRadius:"5px",fontSize:"10px",fontWeight:"600",cursor:readOnly?"default":"pointer",background:on?(m.color+"20"):"#f8f9fb",color:on?m.color:"#b0b8c4",border:"1px solid "+(on?(m.color+"44"):"#f4f5f7"),userSelect:"none"}}>
                        {c.l}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {mp.access&&m.acciones.length>0&&(
              <div style={{borderTop:"1px solid rgba(0,0,0,0.05)",paddingTop:"8px"}}>
                <div style={{fontSize:"10px",color:"#b0b8c4",marginBottom:"5px",fontWeight:"600"}}>Acciones ({onAcc}/{totalAcc})</div>
                <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                  {m.acciones.map(function(a){
                    var on=mp.acciones&&mp.acciones[a.id];
                    return(
                      <div key={a.id} onClick={function(){setAccion(m.id,a.id,!on);}}
                        style={{padding:"3px 9px",borderRadius:"5px",fontSize:"10px",fontWeight:"600",cursor:readOnly?"default":"pointer",background:on?(m.color+"18"):"#f9fafb",color:on?m.color:"#b0b8c4",border:"1px solid "+(on?(m.color+"33"):"#f6f7f9"),userSelect:"none"}}>
                        {a.label}
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

function PanelRoles(){
  var [roles,setRoles]=useState(ROLES_SEED);
  var [selId,setSelId]=useState("admin");
  var [editando,setEditando]=useState(false);
  var [draftPerms,setDraftPerms]=useState(null);
  var [draftNombre,setDraftNombre]=useState("");
  var [draftDesc,setDraftDesc]=useState("");
  var [showNuevo,setShowNuevo]=useState(false);
  var [nuevoNombre,setNuevoNombre]=useState("");
  var [nuevoDesc,setNuevoDesc]=useState("");
  var [clonarDe,setClonarDe]=useState("supervisor");

  var rol=null;
  for(var i=0;i<roles.length;i++){if(roles[i].id===selId){rol=roles[i];break;}}

  function iniciarEdicion(){setDraftPerms(JSON.parse(JSON.stringify(rol.perms)));setDraftNombre(rol.nombre);setDraftDesc(rol.desc);setEditando(true);}
  function cancelarEdicion(){setEditando(false);setDraftPerms(null);}
  function guardarEdicion(){
    setRoles(function(prev){return prev.map(function(r){return r.id===selId?Object.assign({},r,{perms:draftPerms,nombre:draftNombre,desc:draftDesc}):r;});});
    setEditando(false);setDraftPerms(null);
  }
  function crearRol(){
    if(!nuevoNombre.trim())return;
    var base=null;
    for(var i=0;i<roles.length;i++){if(roles[i].id===clonarDe){base=roles[i];break;}}
    var nr={id:"custom_"+uid(),nombre:nuevoNombre.trim(),color:INDIGO,desc:nuevoDesc.trim()||"Rol personalizado",sistema:false,perms:base?JSON.parse(JSON.stringify(base.perms)):buildPerms([],false)};
    setRoles(function(prev){return prev.concat([nr]);});
    setSelId(nr.id);setShowNuevo(false);setNuevoNombre("");setNuevoDesc("");
  }
  function duplicarRol(){
    var nr={id:"custom_"+uid(),nombre:rol.nombre+" (copia)",color:INDIGO,desc:rol.desc,sistema:false,perms:JSON.parse(JSON.stringify(rol.perms))};
    setRoles(function(prev){return prev.concat([nr]);});
    setSelId(nr.id);
  }
  function eliminarRol(){
    if(rol.sistema)return;
    setRoles(function(prev){return prev.filter(function(r){return r.id!==selId;});});
    setSelId("admin");
  }

  var modosSistema=roles.filter(function(r){return r.sistema;});
  var modsCustom=roles.filter(function(r){return !r.sistema;});

  return(
    <div style={{display:"flex",gap:"0",height:"100%"}}>
      <div style={{width:"220px",borderRight:"1px solid "+T.border,padding:"12px 8px",overflowY:"auto",flexShrink:0,background:T.surface}}>
        <div style={Object.assign({},S.stit,{padding:"0 6px",marginBottom:"6px"})}>Sistema</div>
        {modosSistema.map(function(r){
          var isA=selId===r.id;
          return(
            <div key={r.id} onClick={function(){setSelId(r.id);setEditando(false);}}
              style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",borderRadius:"9px",cursor:"pointer",marginBottom:"2px",background:isA?T.bg:"transparent",border:isA?"1px solid "+T.border:"1px solid transparent"}}>
              <div style={{width:"8px",height:"8px",borderRadius:"50%",background:r.color,flexShrink:0}}></div>
              <div style={{fontSize:"12px",fontWeight:isA?"600":"400",color:isA?T.t1:T.t4}}>{r.nombre}</div>
            </div>
          );
        })}
        {modsCustom.length>0&&(
          <div>
            <div style={Object.assign({},S.stit,{padding:"8px 6px 4px"})}>Personalizados</div>
            {modsCustom.map(function(r){
              var isA=selId===r.id;
              return(
                <div key={r.id} onClick={function(){setSelId(r.id);setEditando(false);}}
                  style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",borderRadius:"9px",cursor:"pointer",marginBottom:"2px",background:isA?T.bg:"transparent",border:isA?"1px solid "+T.border:"1px solid transparent"}}>
                  <div style={{width:"8px",height:"8px",borderRadius:"50%",background:r.color,flexShrink:0}}></div>
                  <div style={{fontSize:"12px",fontWeight:isA?"600":"400",color:isA?T.t1:T.t4}}>{r.nombre}</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{marginTop:"8px",borderTop:"1px solid "+T.borderL,paddingTop:"8px"}}>
          <button style={Object.assign({},btn("teal",true),{width:"100%",justifyContent:"center"})} onClick={function(){setShowNuevo(!showNuevo);}}>+ Nuevo rol</button>
          {showNuevo&&(
            <div style={{marginTop:"8px",padding:"10px",background:TEAL+"0a",borderRadius:"9px",border:"1px solid "+TEAL+"33"}}>
              <div style={{marginBottom:"6px"}}>
                <label style={S.lbl}>Nombre</label>
                <input style={S.inp} value={nuevoNombre} onChange={function(e){setNuevoNombre(e.target.value);}} placeholder="Nombre del rol"/>
              </div>
              <div style={{marginBottom:"6px"}}>
                <label style={S.lbl}>Descripcion</label>
                <input style={S.inp} value={nuevoDesc} onChange={function(e){setNuevoDesc(e.target.value);}} placeholder="Descripcion"/>
              </div>
              <div style={{marginBottom:"8px"}}>
                <label style={S.lbl}>Clonar desde</label>
                <select style={Object.assign({},S.inp,{cursor:"pointer"})} value={clonarDe} onChange={function(e){setClonarDe(e.target.value);}}>
                  {roles.map(function(r){return <option key={r.id} value={r.id}>{r.nombre}</option>;})}
                </select>
              </div>
              <div style={{display:"flex",gap:"4px"}}>
                <button style={btn("ghost",true)} onClick={function(){setShowNuevo(false);}}>Cancelar</button>
                <button style={btn("teal",true)} onClick={crearRol} disabled={!nuevoNombre.trim()}>Crear</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
        {rol&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
              <div>
                {editando
                  ?<input style={Object.assign({},S.inp,{fontSize:"16px",fontWeight:"700",width:"260px",marginBottom:"4px"})} value={draftNombre} onChange={function(e){setDraftNombre(e.target.value);}}/>
                  :<div style={{fontSize:"16px",fontWeight:"700",color:T.t1,marginBottom:"2px"}}>{rol.nombre}</div>
                }
                {editando
                  ?<input style={Object.assign({},S.inp,{fontSize:"11px",width:"340px"})} value={draftDesc} onChange={function(e){setDraftDesc(e.target.value);}}/>
                  :<div style={{fontSize:"11px",color:T.t4}}>{rol.desc}</div>
                }
              </div>
              <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                {!editando&&!rol.sistema&&<button style={btn("danger",true)} onClick={eliminarRol}>Eliminar</button>}
                <button style={btn("ghost",true)} onClick={duplicarRol}>Duplicar</button>
                {!editando&&<button style={btn("teal",true)} onClick={iniciarEdicion}>{rol.sistema?"Ver permisos":"Editar permisos"}</button>}
                {editando&&<button style={btn("ghost",true)} onClick={cancelarEdicion}>Cancelar</button>}
                {editando&&<button style={btn("primary",true)} onClick={guardarEdicion}>Guardar cambios</button>}
              </div>
            </div>
            <PermisosEditor rol={rol} perms={editando?draftPerms:rol.perms} onChange={function(p){setDraftPerms(p);}} readOnly={!editando||rol.sistema}/>
          </div>
        )}
      </div>
    </div>
  );
}

var INP_S={width:"100%",padding:"8px 11px",border:"1.5px solid "+T.border,borderRadius:"7px",fontSize:"12px",color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:T.font};

function ModalNuevoUsuario(props){
  var [nombre,setNombre]=useState("");
  var [email,setEmail]=useState("");
  var [pass,setPass]=useState("");
  var [rol,setRol]=useState("vendedor");
  var [errs,setErrs]=useState({});
  var [saving,setSaving]=useState(false);
  var [apiErr,setApiErr]=useState("");

  function save(){
    var e={};
    if(!nombre.trim()) e.nombre="Requerido";
    if(!email.trim())  e.email="Requerido";
    if(pass.length<6)  e.pass="Minimo 6 caracteres";
    if(Object.keys(e).length){setErrs(e);return;}
    setSaving(true);setApiErr("");
    SB_ADMIN.auth.admin.createUser({
      email:email.trim().toLowerCase(),
      password:pass,
      email_confirm:true,
    }).then(function(res){
      if(res.error){setSaving(false);setApiErr(res.error.message||"Error en Auth");return;}
      SB.from("usuarios").insert({
        auth_id:res.data.user.id,
        nombre:nombre.trim(),
        email:email.trim().toLowerCase(),
        rol:rol,
        activo:true,
      }).select().single().then(function(resU){
        setSaving(false);
        if(resU.error){setApiErr("Auth OK, error en tabla: "+resU.error.message);return;}
        props.onCreado(resU.data);
      });
    });
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,15,25,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:T.surface,borderRadius:"12px",width:"100%",maxWidth:"500px",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",border:"1px solid "+T.border}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.border,background:"#f8f9fb",borderRadius:"12px 12px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:"14px",fontWeight:"700",color:T.t1}}>Nuevo usuario</div>
          <button style={btn("ghost",true)} onClick={props.onClose}>Cancelar</button>
        </div>
        <div style={{padding:"18px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"12px"}}>
            <div>
              <label style={S.lbl}>Nombre completo *</label>
              <input style={Object.assign({},INP_S,{borderColor:errs.nombre?RED:T.border})} value={nombre} onChange={function(e){setNombre(e.target.value);}} placeholder="Nombre Apellido"/>
              {errs.nombre&&<div style={{fontSize:"11px",color:RED,marginTop:"3px"}}>{errs.nombre}</div>}
            </div>
            <div>
              <label style={S.lbl}>Rol *</label>
              <select value={rol} onChange={function(e){setRol(e.target.value);}} style={Object.assign({},INP_S,{cursor:"pointer"})}>
                {ROLES_META.map(function(r){return <option key={r.id} value={r.id}>{r.label}</option>;})}
              </select>
            </div>
          </div>
          <div style={{marginBottom:"12px"}}>
            <label style={S.lbl}>Correo electronico *</label>
            <input style={Object.assign({},INP_S,{borderColor:errs.email?RED:T.border})} value={email} onChange={function(e){setEmail(e.target.value);}} placeholder="usuario@xtravelgroup.com"/>
            {errs.email&&<div style={{fontSize:"11px",color:RED,marginTop:"3px"}}>{errs.email}</div>}
          </div>
          <div style={{marginBottom:"16px"}}>
            <label style={S.lbl}>Contrasena inicial *</label>
            <input type="password" style={Object.assign({},INP_S,{borderColor:errs.pass?RED:T.border})} value={pass} onChange={function(e){setPass(e.target.value);}} placeholder="Minimo 6 caracteres"/>
            {errs.pass&&<div style={{fontSize:"11px",color:RED,marginTop:"3px"}}>{errs.pass}</div>}
            <div style={{fontSize:"11px",color:T.t4,marginTop:"4px"}}>El usuario podra cambiarla despues</div>
          </div>
          {apiErr&&<div style={{padding:"9px 12px",background:T.redBg,border:"1px solid "+T.redBd,borderRadius:"8px",color:RED,fontSize:"12px",marginBottom:"12px"}}>{apiErr}</div>}
          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
            <button style={btn("ghost")} onClick={props.onClose}>Cancelar</button>
            <button style={btn("primary")} onClick={save} disabled={saving}>{saving?"Creando...":"Crear usuario"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalEditarUsuario(props){
  var u=props.usuario;
  var [nombre,setNombre]=useState(u.nombre);
  var [rol,setRol]=useState(u.rol);
  var [activo,setActivo]=useState(u.activo);
  var [comPct,setComPct]=useState(u.comision_pct||10);
  var [saving,setSaving]=useState(false);
  var [apiErr,setApiErr]=useState("");

  function save(){
    if(!nombre.trim())return;
    setSaving(true);setApiErr("");
    SB.from("usuarios").update({nombre:nombre.trim(),rol:rol,activo:activo,comision_pct:comPct}).eq("id",u.id).then(function(res){
      setSaving(false);
      if(res.error){setApiErr(res.error.message);return;}
      props.onGuardado(Object.assign({},u,{nombre:nombre.trim(),rol:rol,activo:activo}));
    });
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,15,25,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:T.surface,borderRadius:"12px",width:"100%",maxWidth:"460px",boxShadow:"0 4px 24px rgba(0,0,0,0.12)",border:"1px solid "+T.border}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.border,background:"#f8f9fb",borderRadius:"12px 12px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:"14px",fontWeight:"700",color:T.t1}}>Editar usuario</div>
            <div style={{fontSize:"11px",color:T.t4,marginTop:"1px"}}>{u.email}</div>
          </div>
          <button style={btn("ghost",true)} onClick={props.onClose}>Cancelar</button>
        </div>
        <div style={{padding:"18px"}}>
          <div style={{marginBottom:"12px"}}>
            <label style={S.lbl}>Nombre</label>
            <input style={INP_S} value={nombre} onChange={function(e){setNombre(e.target.value);}} placeholder="Nombre completo"/>
          </div>
          <div style={{marginBottom:"12px"}}>
            <label style={S.lbl}>Rol</label>
            <select value={rol} onChange={function(e){setRol(e.target.value);}} style={Object.assign({},INP_S,{cursor:"pointer"})}>
              {ROLES_META.map(function(r){return <option key={r.id} value={r.id}>{r.label}</option>;})}
            </select>
          </div>
          {(rol==="vendedor"||rol==="verificador")&&(
            <div style={{marginBottom:"12px"}}>
              <label style={S.lbl}>% Comisión</label>
              <input style={INP_S} type="number" min="0" max="100" step="0.5" value={comPct} onChange={function(e){setComPct(Number(e.target.value));}} placeholder="10"/>
            </div>
          )}
          <div style={{marginBottom:"16px",display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",background:T.bg,borderRadius:"8px",border:"1px solid "+T.borderL}}>
            <div style={{flex:1}}>
              <div style={{fontSize:"12px",fontWeight:"600",color:T.t2}}>Estado</div>
              <div style={{fontSize:"11px",color:T.t4}}>{activo?"Activo - puede iniciar sesion":"Inactivo - sin acceso"}</div>
            </div>
            <Toggle on={activo} col={GREEN} onChange={function(){setActivo(!activo);}}/>
          </div>
          {apiErr&&<div style={{padding:"9px 12px",background:T.redBg,border:"1px solid "+T.redBd,borderRadius:"8px",color:RED,fontSize:"12px",marginBottom:"12px"}}>{apiErr}</div>}
          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
            <button style={btn("ghost")} onClick={props.onClose}>Cancelar</button>
            <button style={btn("primary")} onClick={save} disabled={saving}>{saving?"Guardando...":"Guardar cambios"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelUsuarios(){
  var [usuarios,setUsuarios]=useState([]);
  var [loading,setLoading]=useState(true);
  var [busqueda,setBusqueda]=useState("");
  var [filtroRol,setFiltroRol]=useState("todos");
  var [modal,setModal]=useState(null);
  var [toast,setToast]=useState(null);

  function notify(msg,ok){
    setToast({msg:msg,ok:ok!==false});
    setTimeout(function(){setToast(null);},3000);
  }
  function cargar(){
    setLoading(true);
    SB.from("usuarios").select("*").order("nombre").then(function(res){
      setLoading(false);
      if(res.error){console.error(res.error);return;}
      setUsuarios(res.data||[]);
    });
  }
  useEffect(function(){cargar();},[]);

  var filtrados=usuarios.filter(function(u){
    var b=busqueda.toLowerCase();
    var mB=b===""||
      (u.nombre||"").toLowerCase().indexOf(b)!==-1||
      (u.email||"").toLowerCase().indexOf(b)!==-1;
    var mR=filtroRol==="todos"||u.rol===filtroRol;
    return mB&&mR;
  });
  var activos=usuarios.filter(function(u){return u.activo;}).length;

  return(
    <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px"}}>
        <div>
          <div style={{fontSize:"15px",fontWeight:"700",color:T.t1}}>Usuarios del sistema</div>
          <div style={{fontSize:"12px",color:T.t4,marginTop:"2px"}}>{loading?"Cargando...":(activos+" activos de "+usuarios.length+" total")}</div>
        </div>
        <button style={btn("teal")} onClick={function(){setModal({type:"nuevo"});}}>+ Nuevo usuario</button>
      </div>

      <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap"}}>
        <input value={busqueda} onChange={function(e){setBusqueda(e.target.value);}} placeholder="Buscar por nombre o email..."
          style={{flex:1,minWidth:"180px",maxWidth:"300px",padding:"8px 11px",border:"1px solid "+T.border,borderRadius:"7px",fontSize:"12px",color:T.t1,background:T.surface,outline:"none",fontFamily:T.font}}/>
        <select value={filtroRol} onChange={function(e){setFiltroRol(e.target.value);}}
          style={{padding:"8px 11px",border:"1px solid "+T.border,borderRadius:"7px",fontSize:"12px",color:T.t2,background:T.surface,outline:"none",cursor:"pointer",fontFamily:T.font}}>
          <option value="todos">Todos los roles</option>
          {ROLES_META.map(function(r){return <option key={r.id} value={r.id}>{r.label}</option>;})}
        </select>
      </div>

      <div style={{background:T.surface,borderRadius:"10px",border:"1px solid "+T.border,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 1.5fr 100px 90px",padding:"8px 16px",background:"#f8f9fb",borderBottom:"1px solid "+T.border}}>
          {["Nombre","Email","Rol","Estado",""].map(function(h,i){
            return <div key={i} style={{fontSize:"10px",fontWeight:"700",color:T.t4,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</div>;
          })}
        </div>
        {loading&&<div style={{padding:"32px",textAlign:"center",fontSize:"12px",color:T.t4}}>Cargando...</div>}
        {!loading&&filtrados.length===0&&(
          <div style={{padding:"32px",textAlign:"center",fontSize:"12px",color:T.t4}}>
            {busqueda||filtroRol!=="todos"?"Sin resultados":"No hay usuarios registrados"}
          </div>
        )}
        {!loading&&filtrados.map(function(u,idx){
          var rm=rolMeta(u.rol);
          return(
            <div key={u.id} style={{display:"grid",gridTemplateColumns:"2fr 2fr 1.5fr 100px 90px",padding:"10px 16px",alignItems:"center",background:idx%2===0?T.surface:"#fafbfc",borderBottom:"1px solid "+T.borderL,opacity:u.activo?1:0.5}}>
              <div>
                <div style={{fontSize:"12px",fontWeight:"600",color:T.t1}}>{u.nombre}</div>
                <div style={{fontSize:"10px",color:T.t4,marginTop:"1px"}}>{fmtFecha(u.created_at)}</div>
              </div>
              <div style={{fontSize:"12px",color:T.t3}}>{u.email}</div>
              <div><span style={bdg(rm.color,rm.bg,rm.bd)}>{rm.label}</span></div>
              <div>
                <span style={{fontSize:"10px",fontWeight:"700",color:u.activo?T.green:T.t4,background:u.activo?T.greenBg:T.bg,border:"1px solid "+(u.activo?T.greenBd:T.border),padding:"2px 9px",borderRadius:"20px"}}>
                  {u.activo?"Activo":"Inactivo"}
                </span>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <button style={btn("ghost",true)} onClick={function(){setModal({type:"editar",usuario:u});}}>Editar</button>
              </div>
            </div>
          );
        })}
      </div>

      {modal&&modal.type==="nuevo"&&(
        <ModalNuevoUsuario
          onCreado={function(u){setUsuarios(function(p){return p.concat([u]);});setModal(null);notify("Usuario "+u.nombre+" creado");}}
          onClose={function(){setModal(null);}}/>
      )}
      {modal&&modal.type==="editar"&&(
        <ModalEditarUsuario
          usuario={modal.usuario}
          onGuardado={function(u){setUsuarios(function(p){return p.map(function(x){return x.id===u.id?u:x;});});setModal(null);notify("Usuario actualizado");}}
          onClose={function(){setModal(null);}}/>
      )}

      {toast&&(
        <div style={{position:"fixed",bottom:"24px",right:"24px",zIndex:999,padding:"11px 18px",borderRadius:"10px",background:toast.ok?T.greenBg:T.redBg,border:"1px solid "+(toast.ok?T.greenBd:T.redBd),color:toast.ok?T.green:RED,fontSize:"12px",fontWeight:"600",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",fontFamily:T.font}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default function RolesPermissions(props){
  var [tab,setTab]=useState("usuarios");
  var TABS=[{k:"usuarios",l:"Usuarios"},{k:"roles",l:"Roles y permisos"}];
  return(
    <div style={Object.assign({},S.wrap,{display:"flex",flexDirection:"column"})}>
      <div style={{background:T.surface,borderBottom:"1px solid "+T.border,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,minHeight:"48px"}}>
        <div style={{display:"flex",gap:"4px"}}>
          {TABS.map(function(t){return <button key={t.k} style={tabS(tab===t.k,TEAL)} onClick={function(){setTab(t.k);}}>{t.l}</button>;})}
        </div>
        <div style={{fontSize:"11px",color:T.t4}}>Mini-Vac CRM</div>
      </div>
      <div style={{flex:1,overflow:"hidden",display:"flex"}}>
        {tab==="usuarios"&&<PanelUsuarios/>}
        {tab==="roles"&&<PanelRoles/>}
      </div>
    </div>
  );
}
