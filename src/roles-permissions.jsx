import { useState } from "react";

var TEAL="#0ea5a0",INDIGO="#6366f1",VIOLET="#5b21b6",GREEN="#1a7f3c",AMBER="#f59e0b",RED="#b91c1c",CORAL="#f97316",BLUE="#1565c0";

var MODULOS=[
  {id:"dashboard",   label:"Dashboard Ejecutivo",  area:"Reportes",      color:INDIGO, acciones:[{id:"exportar_reporte",label:"Exportar reporte"},{id:"ver_financiero",label:"Ver datos financieros"}]},
  {id:"radio",       label:"Radio / Leads",         area:"Ventas",        color:CORAL,  acciones:[{id:"asignar_lead",label:"Asignar lead"},{id:"crear_campana",label:"Crear campana"},{id:"exportar_leads",label:"Exportar leads"}]},
  {id:"seller",      label:"Seller CRM",            area:"Ventas",        color:TEAL,   acciones:[{id:"cerrar_venta",label:"Cerrar venta"},{id:"reasignar_lead",label:"Reasignar lead"},{id:"ver_todos_leads",label:"Ver leads del equipo"}]},
  {id:"verificacion",label:"Verificacion",          area:"Operaciones",   color:BLUE,   acciones:[{id:"aprobar_venta",label:"Aprobar expediente"},{id:"rechazar_venta",label:"Rechazar expediente"},{id:"solicitar_docs",label:"Solicitar documentos"}]},
  {id:"cs",          label:"Customer Service",      area:"Operaciones",   color:VIOLET, acciones:[{id:"cancelar_membresia",label:"Cancelar membresia"},{id:"procesar_reembolso",label:"Procesar reembolso"},{id:"gestionar_cb",label:"Gestionar chargeback"}]},
  {id:"reservaciones",label:"Reservaciones",        area:"Operaciones",   color:GREEN,  acciones:[{id:"confirmar_reserva",label:"Confirmar reserva"},{id:"cancelar_reserva",label:"Cancelar reserva"},{id:"modificar_fechas",label:"Modificar fechas"}]},
  {id:"paquetes",    label:"Paquetes",              area:"Configuracion", color:AMBER,  acciones:[{id:"crear_paquete",label:"Crear paquete"},{id:"publicar_paquete",label:"Publicar/archivar"},{id:"editar_precios",label:"Editar precios"}]},
  {id:"comisiones",  label:"Comisiones",            area:"Admin",         color:GREEN,  acciones:[{id:"aprobar_spiff",label:"Aprobar spiff/meta"},{id:"crear_spiff",label:"Crear meta/spiff"},{id:"editar_pct",label:"Editar % comision"},{id:"ver_nomina",label:"Ver nomina"}]},
  {id:"portal",      label:"Portal Cliente",        area:"Operaciones",   color:TEAL,   acciones:[{id:"enviar_acceso",label:"Enviar acceso"},{id:"bloquear_acceso",label:"Bloquear acceso"}]},
  {id:"destinos",    label:"Destinos y Hoteles",    area:"Reservas",      color:TEAL,   acciones:[{id:"crear_destino",label:"Crear destino"},{id:"editar_destino",label:"Editar destino"},{id:"activar_destino",label:"Activar/desactivar destino"},{id:"editar_hoteles",label:"Editar hoteles"}]},
  {id:"usuarios",    label:"Usuarios y Roles",      area:"Admin",         color:RED,    acciones:[{id:"crear_usuario",label:"Crear usuario"},{id:"desactivar_usuario",label:"Activar/desactivar usuario"},{id:"cambiar_rol",label:"Cambiar rol"},{id:"gestionar_roles",label:"Crear/editar roles"}]},
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
  {id:"admin",      nombre:"Administrador", color:RED,    desc:"Acceso completo al sistema",               sistema:true,
   perms:buildPerms([],true)},
  {id:"director",   nombre:"Director",      color:VIOLET, desc:"Solo lectura en todos los modulos",         sistema:true,
   perms:(function(){var p=buildReadOnly(["dashboard","radio","seller","verificacion","cs","reservaciones","paquetes","comisiones","portal","usuarios"]);p["destinos"]={access:true,ver:true,crear:true,editar:true,eliminar:true,acciones:{crear_destino:true,editar_destino:true,activar_destino:true,editar_hoteles:true}};return p;})()},
  {id:"supervisor", nombre:"Supervisor",    color:BLUE,   desc:"Operacion completa salvo Admin y Usuarios", sistema:true,
   perms:(function(){
     var p=buildPerms(["dashboard","radio","seller","verificacion","cs","reservaciones","paquetes","comisiones","portal"],false);
     for(var i=0;i<MODULOS.length;i++){
       var m=MODULOS[i];
       if(["dashboard","radio","seller","verificacion","cs","reservaciones","paquetes","comisiones","portal"].indexOf(m.id)!==-1){
         p[m.id].access=true; p[m.id].ver=true; p[m.id].crear=true; p[m.id].editar=true; p[m.id].eliminar=false;
         for(var j=0;j<m.acciones.length;j++) p[m.id].acciones[m.acciones[j].id]=true;
       }
     }
     return p;
   })()},
  {id:"verificador",nombre:"Verificador",  color:TEAL,   desc:"Acceso al modulo de verificacion y CS",    sistema:true,
   perms:(function(){
     var p=buildReadOnly(["verificacion","cs","reservaciones"]);
     p.verificacion.crear=true; p.verificacion.editar=true;
     for(var j=0;j<MODULOS[3].acciones.length;j++) p.verificacion.acciones[MODULOS[3].acciones[j].id]=true;
     return p;
   })()},
  {id:"vendedor",   nombre:"Vendedor",     color:CORAL,  desc:"Acceso a radio, CRM propio y comisiones",  sistema:true,
   perms:(function(){
     var p=buildReadOnly(["radio","seller","comisiones"]);
     p.radio.crear=true; p.seller.crear=true; p.seller.editar=true;
     p.radio.acciones["asignar_lead"]=false;
     p.comisiones.acciones["ver_nomina"]=false;
     return p;
   })()},
];

var USUARIOS_SEED=[
  {id:"U01",nombre:"Ricardo Flores",  email:"admin@minivac.mx",      rol:"admin",       activo:true},
  {id:"U02",nombre:"Gabriela Montoya",email:"directora@minivac.mx",  rol:"director",    activo:true},
  {id:"U03",nombre:"Marco Silva",     email:"msuperviso@minivac.mx", rol:"supervisor",  activo:true},
  {id:"U04",nombre:"Sofia Pena",      email:"verificador@minivac.mx",rol:"verificador", activo:true},
  {id:"U05",nombre:"Carlos Vega",     email:"cvega@minivac.mx",      rol:"vendedor",    activo:true},
  {id:"U06",nombre:"Ana Morales",     email:"amorales@minivac.mx",   rol:"vendedor",    activo:true},
  {id:"U07",nombre:"Luis Ramos",      email:"lramos@minivac.mx",     rol:"vendedor",    activo:true},
  {id:"U08",nombre:"Pedro Kuri",      email:"pkuri@minivac.mx",      rol:"vendedor",    activo:false},
  {id:"U09",nombre:"Diana Ortiz",     email:"dortiz@minivac.mx",     rol:"vendedor",    activo:true},
];

var S={
  wrap:  {minHeight:"100vh",background:"#07090f",color:"#3d4554",fontFamily:"'DM Sans','Segoe UI',-apple-system,sans-serif",fontSize:"13px"},
  card:  {background:"rgba(255,255,255,0.025)",border:"1px solid #e3e6ea",borderRadius:"12px",padding:"14px 16px",marginBottom:"10px"},
  inp:   {width:"100%",background:"#f8f9fb",border:"1px solid #d8dbe0",borderRadius:"8px",padding:"8px 11px",color:"#3d4554",fontSize:"12px",outline:"none",boxSizing:"border-box",fontFamily:"inherit"},
  lbl:   {fontSize:"11px",color:"#9ca3af",marginBottom:"4px",fontWeight:"500",display:"block"},
  stit:  {fontSize:"10px",fontWeight:"700",color:"#9ca3af",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"8px"},
};
function btn(v,sm){
  var m={teal:{bg:"rgba(14,165,160,0.15)",c:TEAL,br:"rgba(14,165,160,0.3)"},ghost:{bg:"#f6f7f9",c:"#6b7280",br:"#f0f1f4"},indigo:{bg:"#e5eafd",c:INDIGO,br:"#aab4f5"},danger:{bg:"#fef0f0",c:RED,br:"#f7c0c0"},primary:{bg:TEAL,c:"#fff",br:TEAL}};
  var s=m[v]||m.ghost;
  var p=sm?"4px 10px":"7px 14px";
  return {display:"inline-flex",alignItems:"center",gap:"5px",padding:p,borderRadius:"7px",cursor:"pointer",fontSize:sm?"11px":"12px",fontWeight:"600",background:s.bg,color:s.c,border:"1px solid "+s.br,whiteSpace:"nowrap"};
}
function tabS(a,col){var c=col||TEAL; return {padding:"7px 14px",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:a?"700":"400",background:a?(c+"22"):"transparent",color:a?c:"#9ca3af",border:a?("1px solid "+c+"44"):"1px solid transparent",whiteSpace:"nowrap"};}
function bdg(c,bg,br){return {display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:"20px",fontSize:"10px",fontWeight:"700",color:c,background:bg,border:"1px solid "+br};}
function toggle(on,col){return {width:"36px",height:"20px",borderRadius:"10px",background:on?(col||TEAL):"#f0f1f4",border:"1px solid "+(on?(col||TEAL)+"88":"#eceff3"),cursor:"pointer",position:"relative",flexShrink:0,transition:"background 0.2s"};}
function toggleDot(on){return {position:"absolute",top:"2px",left:on?"18px":"2px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left 0.2s"};}

function Toggle(props){
  return (
    <div style={toggle(props.on,props.col)} onClick={props.disabled?null:props.onChange}>
      <div style={toggleDot(props.on)}></div>
    </div>
  );
}

function uid(){ return "R"+Date.now()+Math.floor(Math.random()*999); }

function PermisosEditor(props){
  var rol=props.rol;
  var perms=props.perms;
  var onChange=props.onChange;
  var readOnly=props.readOnly||rol.sistema;
  var [areaFiltro,setAreaFiltro]=useState("Todos");

  var areas=["Todos"].concat(AREAS);
  var modsVis=MODULOS.filter(function(m){ return areaFiltro==="Todos"||m.area===areaFiltro; });

  function setModPerm(modId,key,val){
    if(readOnly) return;
    var np=JSON.parse(JSON.stringify(perms));
    np[modId][key]=val;
    if(key==="access"&&!val){ np[modId].ver=false; np[modId].crear=false; np[modId].editar=false; np[modId].eliminar=false; for(var a in np[modId].acciones) np[modId].acciones[a]=false; }
    if(key==="ver"&&val) np[modId].access=true;
    onChange(np);
  }
  function setAccion(modId,acId,val){
    if(readOnly) return;
    var np=JSON.parse(JSON.stringify(perms));
    np[modId].acciones[acId]=val;
    if(val) np[modId].access=true;
    onChange(np);
  }
  function toggleAll(modId,val){
    if(readOnly) return;
    var np=JSON.parse(JSON.stringify(perms));
    np[modId].access=val; np[modId].ver=val; np[modId].crear=val; np[modId].editar=val; np[modId].eliminar=val;
    var mod=null; for(var i=0;i<MODULOS.length;i++){if(MODULOS[i].id===modId){mod=MODULOS[i];break;}}
    if(mod){ for(var j=0;j<mod.acciones.length;j++) np[modId].acciones[mod.acciones[j].id]=val; }
    onChange(np);
  }

  var CRUD=[{k:"ver",l:"Ver"},{k:"crear",l:"Crear"},{k:"editar",l:"Editar"},{k:"eliminar",l:"Eliminar"}];

  return (
    <div>
      <div style={{display:"flex",gap:"4px",marginBottom:"14px",flexWrap:"wrap"}}>
        {areas.map(function(a){
          return <button key={a} style={tabS(areaFiltro===a,INDIGO)} onClick={function(){setAreaFiltro(a);}}>{a}</button>;
        })}
      </div>
      {readOnly&&(
        <div style={{padding:"8px 12px",borderRadius:"8px",background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)",fontSize:"11px",color:AMBER,marginBottom:"12px"}}>
          Los roles del sistema no se pueden editar. Duplica el rol para crear una version personalizada.
        </div>
      )}
      {modsVis.map(function(m){
        var mp=perms[m.id]||{access:false,ver:false,crear:false,editar:false,eliminar:false,acciones:{}};
        var totalAcc=m.acciones.length;
        var onAcc=Object.values(mp.acciones||{}).filter(Boolean).length;
        return (
          <div key={m.id} style={Object.assign({},S.card,{borderColor:mp.access?(m.color+"33"):"#f6f7f9",marginBottom:"8px"})}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:mp.access?"10px":"0"}}>
              <Toggle on={mp.access} col={m.color} onChange={function(){toggleAll(m.id,!mp.access);}} disabled={readOnly}/>
              <div style={{flex:1}}>
                <div style={{fontSize:"12px",fontWeight:"600",color:mp.access?"#3d4554":"#9ca3af"}}>{m.label}</div>
                <div style={{fontSize:"10px",color:"#b0b8c4"}}>{m.area}</div>
              </div>
              {mp.access&&(
                <div style={{display:"flex",gap:"4px"}}>
                  {CRUD.map(function(c){
                    var on=mp[c.k];
                    return (
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
              <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:"8px"}}>
                <div style={{fontSize:"10px",color:"#b0b8c4",marginBottom:"5px",fontWeight:"600"}}>Acciones ({onAcc}/{totalAcc})</div>
                <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
                  {m.acciones.map(function(a){
                    var on=mp.acciones&&mp.acciones[a.id];
                    return (
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

function PanelRoles(props){
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

  function iniciarEdicion(){
    setDraftPerms(JSON.parse(JSON.stringify(rol.perms)));
    setDraftNombre(rol.nombre);
    setDraftDesc(rol.desc);
    setEditando(true);
  }
  function cancelarEdicion(){ setEditando(false); setDraftPerms(null); }
  function guardarEdicion(){
    setRoles(function(prev){
      return prev.map(function(r){ return r.id===selId?Object.assign({},r,{perms:draftPerms,nombre:draftNombre,desc:draftDesc}):r; });
    });
    setEditando(false); setDraftPerms(null);
  }
  function crearRol(){
    if(!nuevoNombre.trim()) return;
    var base=null;
    for(var i=0;i<roles.length;i++){if(roles[i].id===clonarDe){base=roles[i];break;}}
    var nr={id:"custom_"+uid(),nombre:nuevoNombre.trim(),color:INDIGO,desc:nuevoDesc.trim()||"Rol personalizado",sistema:false,perms:base?JSON.parse(JSON.stringify(base.perms)):buildPerms([],false)};
    setRoles(function(prev){return prev.concat([nr]);});
    setSelId(nr.id); setShowNuevo(false); setNuevoNombre(""); setNuevoDesc("");
  }
  function duplicarRol(){
    var nr={id:"custom_"+uid(),nombre:rol.nombre+" (copia)",color:INDIGO,desc:rol.desc,sistema:false,perms:JSON.parse(JSON.stringify(rol.perms))};
    setRoles(function(prev){return prev.concat([nr]);});
    setSelId(nr.id);
  }
  function eliminarRol(){
    if(rol.sistema) return;
    setRoles(function(prev){return prev.filter(function(r){return r.id!==selId;});});
    setSelId("admin");
  }

  var modosSistema=roles.filter(function(r){return r.sistema;});
  var modsCustom=roles.filter(function(r){return !r.sistema;});

  return (
    <div style={{display:"flex",gap:"0",height:"100%"}}>
      <div style={{width:"220px",borderRight:"1px solid #e3e6ea",padding:"12px 8px",overflowY:"auto",flexShrink:0}}>
        <div style={{fontSize:"10px",fontWeight:"700",color:"#b0b8c4",letterSpacing:"0.1em",textTransform:"uppercase",padding:"0 6px",marginBottom:"6px"}}>Sistema</div>
        {modosSistema.map(function(r){
          var isA=selId===r.id;
          return (
            <div key={r.id} onClick={function(){setSelId(r.id);setEditando(false);}}
              style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",borderRadius:"9px",cursor:"pointer",marginBottom:"2px",background:isA?"#f8f9fb":"transparent",border:isA?"1px solid rgba(255,255,255,0.08)":"1px solid transparent"}}>
              <div style={{width:"8px",height:"8px",borderRadius:"50%",background:r.color,flexShrink:0}}></div>
              <div style={{fontSize:"12px",fontWeight:isA?"600":"400",color:isA?"#3d4554":"#9ca3af"}}>{r.nombre}</div>
            </div>
          );
        })}
        {modsCustom.length>0&&(
          <div>
            <div style={{fontSize:"10px",fontWeight:"700",color:"#b0b8c4",letterSpacing:"0.1em",textTransform:"uppercase",padding:"8px 6px 4px"}}>Personalizados</div>
            {modsCustom.map(function(r){
              var isA=selId===r.id;
              return (
                <div key={r.id} onClick={function(){setSelId(r.id);setEditando(false);}}
                  style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 10px",borderRadius:"9px",cursor:"pointer",marginBottom:"2px",background:isA?"#f8f9fb":"transparent",border:isA?"1px solid rgba(255,255,255,0.08)":"1px solid transparent"}}>
                  <div style={{width:"8px",height:"8px",borderRadius:"50%",background:r.color,flexShrink:0}}></div>
                  <div style={{fontSize:"12px",fontWeight:isA?"600":"400",color:isA?"#3d4554":"#9ca3af"}}>{r.nombre}</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{marginTop:"8px",borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:"8px"}}>
          <button style={Object.assign({},btn("teal",true),{width:"100%",justifyContent:"center"})} onClick={function(){setShowNuevo(!showNuevo);}}>+ Nuevo rol</button>
          {showNuevo&&(
            <div style={{marginTop:"8px",padding:"10px",background:"rgba(14,165,160,0.06)",borderRadius:"9px",border:"1px solid rgba(14,165,160,0.2)"}}>
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
                  ? <input style={Object.assign({},S.inp,{fontSize:"16px",fontWeight:"700",width:"260px",marginBottom:"4px"})} value={draftNombre} onChange={function(e){setDraftNombre(e.target.value);}}/>
                  : <div style={{fontSize:"16px",fontWeight:"700",color:"#3d4554",marginBottom:"2px"}}>{rol.nombre}</div>
                }
                {editando
                  ? <input style={Object.assign({},S.inp,{fontSize:"11px",width:"340px"})} value={draftDesc} onChange={function(e){setDraftDesc(e.target.value);}}/>
                  : <div style={{fontSize:"11px",color:"#9ca3af"}}>{rol.desc}</div>
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
            {rol.sistema&&!editando&&(
              <div style={{padding:"8px 12px",borderRadius:"8px",background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.15)",fontSize:"11px",color:INDIGO,marginBottom:"14px"}}>
                Rol del sistema. Duplicalo para crear una version editable con permisos personalizados.
              </div>
            )}
            <PermisosEditor
              rol={rol}
              perms={editando?draftPerms:rol.perms}
              onChange={function(p){setDraftPerms(p);}}
              readOnly={!editando||rol.sistema}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PanelUsuarios(props){
  var [usuarios,setUsuarios]=useState(USUARIOS_SEED);
  var [roles]=useState(ROLES_SEED);
  var [busqueda,setBusqueda]=useState("");
  var [filtroRol,setFiltroRol]=useState("todos");
  var [showNuevo,setShowNuevo]=useState(false);
  var [nuevoNombre,setNuevoNombre]=useState("");
  var [nuevoEmail,setNuevoEmail]=useState("");
  var [nuevoRol,setNuevoRol]=useState("vendedor");
  var [editId,setEditId]=useState(null);
  var [editRol,setEditRol]=useState("");

  var usFiltrados=usuarios.filter(function(u){
    var matchB=busqueda===""||u.nombre.toLowerCase().indexOf(busqueda.toLowerCase())!==-1||u.email.toLowerCase().indexOf(busqueda.toLowerCase())!==-1;
    var matchR=filtroRol==="todos"||u.rol===filtroRol;
    return matchB&&matchR;
  });

  function toggleActivo(id){
    setUsuarios(function(prev){return prev.map(function(u){return u.id===id?Object.assign({},u,{activo:!u.activo}):u;});});
  }
  function guardarRol(id){
    setUsuarios(function(prev){return prev.map(function(u){return u.id===id?Object.assign({},u,{rol:editRol}):u;});});
    setEditId(null);
  }
  function crearUsuario(){
    if(!nuevoNombre.trim()||!nuevoEmail.trim()) return;
    var nu={id:"U"+Date.now(),nombre:nuevoNombre.trim(),email:nuevoEmail.trim(),rol:nuevoRol,activo:true};
    setUsuarios(function(prev){return prev.concat([nu]);});
    setShowNuevo(false); setNuevoNombre(""); setNuevoEmail("");
  }

  var rolColor={admin:RED,director:VIOLET,supervisor:BLUE,verificador:TEAL,vendedor:CORAL};
  var activos=usuarios.filter(function(u){return u.activo;}).length;

  return (
    <div style={{padding:"16px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
        <div>
          <div style={{fontSize:"14px",fontWeight:"700",color:"#3d4554"}}>Usuarios del sistema</div>
          <div style={{fontSize:"11px",color:"#9ca3af"}}>{activos} activos de {usuarios.length} total</div>
        </div>
        <button style={btn("teal",true)} onClick={function(){setShowNuevo(!showNuevo);}}>+ Nuevo usuario</button>
      </div>

      {showNuevo&&(
        <div style={Object.assign({},S.card,{borderColor:"rgba(14,165,160,0.3)",marginBottom:"14px"})}>
          <div style={{fontSize:"12px",fontWeight:"700",color:TEAL,marginBottom:"10px"}}>Nuevo usuario</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"10px"}}>
            <div><label style={S.lbl}>Nombre completo</label><input style={S.inp} value={nuevoNombre} onChange={function(e){setNuevoNombre(e.target.value);}} placeholder="Nombre Apellido"/></div>
            <div><label style={S.lbl}>Email</label><input style={S.inp} value={nuevoEmail} onChange={function(e){setNuevoEmail(e.target.value);}} placeholder="usuario@minivac.mx"/></div>
            <div>
              <label style={S.lbl}>Rol</label>
              <select style={Object.assign({},S.inp,{cursor:"pointer"})} value={nuevoRol} onChange={function(e){setNuevoRol(e.target.value);}}>
                {roles.map(function(r){return <option key={r.id} value={r.id}>{r.nombre}</option>;})}
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:"6px",justifyContent:"flex-end"}}>
            <button style={btn("ghost",true)} onClick={function(){setShowNuevo(false);}}>Cancelar</button>
            <button style={btn("teal",true)} onClick={crearUsuario} disabled={!nuevoNombre.trim()||!nuevoEmail.trim()}>Crear usuario</button>
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:"8px",marginBottom:"12px",flexWrap:"wrap"}}>
        <input style={Object.assign({},S.inp,{flex:1,minWidth:"180px",maxWidth:"280px"})} value={busqueda} onChange={function(e){setBusqueda(e.target.value);}} placeholder="Buscar por nombre o email..."/>
        <select style={Object.assign({},S.inp,{width:"160px",cursor:"pointer"})} value={filtroRol} onChange={function(e){setFiltroRol(e.target.value);}}>
          <option value="todos">Todos los roles</option>
          {roles.map(function(r){return <option key={r.id} value={r.id}>{r.nombre}</option>;})}
        </select>
      </div>

      <div style={{background:"#f9fafb",borderRadius:"12px",border:"1px solid #e3e6ea",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 1.5fr 80px 100px",gap:"0",padding:"8px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",fontSize:"10px",fontWeight:"700",color:"#b0b8c4",textTransform:"uppercase",letterSpacing:"0.08em"}}>
          <div>Nombre</div><div>Email</div><div>Rol</div><div style={{textAlign:"center"}}>Estado</div><div style={{textAlign:"right"}}>Acciones</div>
        </div>
        {usFiltrados.map(function(u){
          var rc=rolColor[u.rol]||TEAL;
          var isEdit=editId===u.id;
          return (
            <div key={u.id} style={{display:"grid",gridTemplateColumns:"2fr 2fr 1.5fr 80px 100px",gap:"0",padding:"10px 14px",borderBottom:"1px solid #edf0f3",alignItems:"center",opacity:u.activo?1:0.5}}>
              <div style={{fontSize:"12px",fontWeight:"600",color:"#3d4554"}}>{u.nombre}</div>
              <div style={{fontSize:"11px",color:"#9ca3af"}}>{u.email}</div>
              <div>
                {isEdit
                  ? <select style={Object.assign({},S.inp,{padding:"3px 7px",fontSize:"11px",cursor:"pointer",width:"130px"})} value={editRol} onChange={function(e){setEditRol(e.target.value);}}>
                      {roles.map(function(r){return <option key={r.id} value={r.id}>{r.nombre}</option>;})}
                    </select>
                  : <span style={bdg(rc,rc+"18",rc+"33")}>{u.rol}</span>
                }
              </div>
              <div style={{textAlign:"center"}}>
                <Toggle on={u.activo} col={GREEN} onChange={function(){toggleActivo(u.id);}}/>
              </div>
              <div style={{display:"flex",gap:"4px",justifyContent:"flex-end"}}>
                {!isEdit&&<button style={btn("ghost",true)} onClick={function(){setEditId(u.id);setEditRol(u.rol);}}>Editar</button>}
                {isEdit&&<button style={btn("ghost",true)} onClick={function(){setEditId(null);}}>X</button>}
                {isEdit&&<button style={btn("teal",true)} onClick={function(){guardarRol(u.id);}}>OK</button>}
              </div>
            </div>
          );
        })}
        {usFiltrados.length===0&&(
          <div style={{padding:"24px",textAlign:"center",fontSize:"12px",color:"#9ca3af"}}>Sin resultados</div>
        )}
      </div>
    </div>
  );
}

export default function RolesPermissions(){
  var [tab,setTab]=useState("roles");
  var TABS=[{k:"roles",l:"Roles y permisos"},{k:"usuarios",l:"Usuarios"}];
  return (
    <div style={Object.assign({},S.wrap,{display:"flex",flexDirection:"column"})}>
      <div style={{background:"#fafbfc",borderBottom:"1px solid #e8eaed",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,minHeight:"48px"}}>
        <div style={{display:"flex",gap:"4px"}}>
          {TABS.map(function(t){
            return <button key={t.k} style={tabS(tab===t.k,TEAL)} onClick={function(){setTab(t.k);}}>{t.l}</button>;
          })}
        </div>
        <div style={{fontSize:"11px",color:"#b0b8c4"}}>Mini-Vac CRM</div>
      </div>
      <div style={{flex:1,overflow:"hidden",display:"flex"}}>
        {tab==="roles"&&<PanelRoles/>}
        {tab==="usuarios"&&<PanelUsuarios/>}
      </div>
    </div>
  );
}
