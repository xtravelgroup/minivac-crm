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

var T = {
  bg:"#f4f5f7", surface:"#ffffff", border:"#e3e6ea", borderL:"#edf0f3",
  t1:"#1a1f2e", t2:"#3d4554", t3:"#6b7280", t4:"#9ca3af",
  brand:"#1a385a", brandLt:"#eaf0f7", brandBd:"#b8cfe0",
  green:"#1a7f3c", greenBg:"#edf7ee", greenBd:"#a3d9a5",
  amber:"#925c0a", amberBg:"#fef9e7", amberBd:"#f0d080",
  red:"#b91c1c",   redBg:"#fef2f2",   redBd:"#f5b8b8",
  blue:"#1565c0",  blueBg:"#e8f0fe",  blueBd:"#aac4f0",
  purple:"#5b21b6",purpleBg:"#ede9fe",purpleBd:"#c4b5fd",
  font:"'DM Sans','Segoe UI',-apple-system,sans-serif",
};

var ROLES=[
  {id:"admin",             label:"Admin",              color:T.brand,  bg:T.brandLt,  bd:T.brandBd},
  {id:"director",          label:"Director",           color:T.blue,   bg:T.blueBg,   bd:T.blueBd},
  {id:"supervisor",        label:"Supervisor",         color:T.purple, bg:T.purpleBg, bd:T.purpleBd},
  {id:"verificador",       label:"Verificador",        color:T.blue,   bg:T.blueBg,   bd:T.blueBd},
  {id:"vendedor",          label:"Vendedor",           color:T.green,  bg:T.greenBg,  bd:T.greenBd},
  {id:"cs",                label:"CS",                 color:T.amber,  bg:T.amberBg,  bd:T.amberBd},
  {id:"especialista_radio",label:"Especialista Radio", color:T.purple, bg:T.purpleBg, bd:T.purpleBd},
  {id:"contador",          label:"Contador",           color:"#0f766e",bg:"#f0fdfa",  bd:"#99f6e4"},
];

function rolMeta(rolId){
  for(var i=0;i<ROLES.length;i++){if(ROLES[i].id===rolId)return ROLES[i];}
  return {label:rolId,color:T.t3,bg:T.bg,bd:T.border};
}
function fmtFecha(str){
  if(!str)return "-";
  return new Date(str).toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"});
}

function Badge(props){
  var m=props.meta||{};
  return(
    <span style={{display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:"20px",
      fontSize:"10px",fontWeight:"700",color:m.color||T.t3,background:m.bg||T.bg,
      border:"1px solid "+(m.bd||T.border),whiteSpace:"nowrap"}}>
      {props.children||m.label}
    </span>
  );
}

function Btn(props){
  var v=props.v||"ghost";
  var S={primary:{bg:T.brand,color:"#fff",bd:"transparent"},ghost:{bg:T.bg,color:T.t2,bd:T.border},
    danger:{bg:T.redBg,color:T.red,bd:T.redBd}};
  var s=S[v]||S.ghost;
  return(
    <button onClick={props.onClick} disabled={props.disabled} style={{
      display:"inline-flex",alignItems:"center",gap:"5px",
      padding:props.sm?"5px 11px":"8px 16px",border:"1px solid "+s.bd,borderRadius:"7px",
      cursor:props.disabled?"not-allowed":"pointer",fontSize:props.sm?"11px":"13px",fontWeight:"600",
      background:s.bg,color:s.color,whiteSpace:"nowrap",fontFamily:T.font,opacity:props.disabled?0.5:1,
    }}>
      {props.children}
    </button>
  );
}

function Inp(props){
  return(
    <input type={props.type||"text"} value={props.value} onChange={props.onChange}
      placeholder={props.placeholder||""} disabled={props.disabled}
      style={Object.assign({width:"100%",padding:"8px 11px",
        border:"1.5px solid "+(props.error?T.red:T.border),borderRadius:"7px",
        fontSize:"13px",color:T.t1,background:props.disabled?T.bg:T.surface,
        outline:"none",boxSizing:"border-box",fontFamily:T.font},props.style||{})}/>
  );
}

function Lbl(props){
  return <div style={{fontSize:"11px",fontWeight:"600",color:T.t3,marginBottom:"5px"}}>{props.children}</div>;
}

function Card(props){
  return(
    <div style={Object.assign({background:T.surface,borderRadius:"10px",
      border:"1px solid "+T.border,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"},props.style||{})}>
      {props.children}
    </div>
  );
}

var INP_S={width:"100%",padding:"8px 11px",border:"1.5px solid "+T.border,borderRadius:"7px",
  fontSize:"13px",color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:T.font};

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
    setSaving(true); setApiErr("");
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
    <div style={{position:"fixed",inset:0,background:"rgba(10,15,25,0.5)",zIndex:300,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:T.surface,borderRadius:"12px",width:"100%",maxWidth:"500px",
        boxShadow:"0 4px 24px rgba(0,0,0,0.12)",border:"1px solid "+T.border}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.border,
          background:"#f8f9fb",borderRadius:"12px 12px 0 0",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:"14px",fontWeight:"700",color:T.t1}}>Nuevo usuario</div>
          <Btn v="ghost" sm onClick={props.onClose}>Cancelar</Btn>
        </div>
        <div style={{padding:"18px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"12px"}}>
            <div>
              <Lbl>Nombre completo *</Lbl>
              <Inp value={nombre} onChange={function(e){setNombre(e.target.value);}} error={errs.nombre} placeholder="Nombre Apellido"/>
              {errs.nombre&&<div style={{fontSize:"11px",color:T.red,marginTop:"3px"}}>{errs.nombre}</div>}
            </div>
            <div>
              <Lbl>Rol *</Lbl>
              <select value={rol} onChange={function(e){setRol(e.target.value);}} style={Object.assign({},INP_S,{cursor:"pointer"})}>
                {ROLES.map(function(r){return <option key={r.id} value={r.id}>{r.label}</option>;})}
              </select>
            </div>
          </div>
          <div style={{marginBottom:"12px"}}>
            <Lbl>Correo electronico *</Lbl>
            <Inp value={email} onChange={function(e){setEmail(e.target.value);}} error={errs.email} placeholder="usuario@xtravelgroup.com"/>
            {errs.email&&<div style={{fontSize:"11px",color:T.red,marginTop:"3px"}}>{errs.email}</div>}
          </div>
          <div style={{marginBottom:"16px"}}>
            <Lbl>Contrasena inicial *</Lbl>
            <Inp type="password" value={pass} onChange={function(e){setPass(e.target.value);}} error={errs.pass} placeholder="Minimo 6 caracteres"/>
            {errs.pass&&<div style={{fontSize:"11px",color:T.red,marginTop:"3px"}}>{errs.pass}</div>}
            <div style={{fontSize:"11px",color:T.t4,marginTop:"4px"}}>El usuario podra cambiarla despues</div>
          </div>
          {apiErr&&(
            <div style={{padding:"9px 12px",background:T.redBg,border:"1px solid "+T.redBd,
              borderRadius:"8px",color:T.red,fontSize:"12px",marginBottom:"12px"}}>
              {apiErr}
            </div>
          )}
          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
            <Btn v="ghost" onClick={props.onClose}>Cancelar</Btn>
            <Btn v="primary" onClick={save} disabled={saving}>{saving?"Creando...":"Crear usuario"}</Btn>
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
  var [saving,setSaving]=useState(false);
  var [apiErr,setApiErr]=useState("");

  function save(){
    if(!nombre.trim())return;
    setSaving(true); setApiErr("");
    SB.from("usuarios").update({nombre:nombre.trim(),rol:rol,activo:activo})
      .eq("id",u.id).then(function(res){
        setSaving(false);
        if(res.error){setApiErr(res.error.message);return;}
        props.onGuardado(Object.assign({},u,{nombre:nombre.trim(),rol:rol,activo:activo}));
      });
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(10,15,25,0.5)",zIndex:300,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:T.surface,borderRadius:"12px",width:"100%",maxWidth:"460px",
        boxShadow:"0 4px 24px rgba(0,0,0,0.12)",border:"1px solid "+T.border}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.border,
          background:"#f8f9fb",borderRadius:"12px 12px 0 0",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:"14px",fontWeight:"700",color:T.t1}}>Editar usuario</div>
            <div style={{fontSize:"11px",color:T.t3,marginTop:"1px"}}>{u.email}</div>
          </div>
          <Btn v="ghost" sm onClick={props.onClose}>Cancelar</Btn>
        </div>
        <div style={{padding:"18px"}}>
          <div style={{marginBottom:"12px"}}>
            <Lbl>Nombre</Lbl>
            <Inp value={nombre} onChange={function(e){setNombre(e.target.value);}} placeholder="Nombre completo"/>
          </div>
          <div style={{marginBottom:"12px"}}>
            <Lbl>Rol</Lbl>
            <select value={rol} onChange={function(e){setRol(e.target.value);}} style={Object.assign({},INP_S,{cursor:"pointer"})}>
              {ROLES.map(function(r){return <option key={r.id} value={r.id}>{r.label}</option>;})}
            </select>
          </div>
          <div style={{marginBottom:"16px",display:"flex",alignItems:"center",gap:"10px",
            padding:"10px 12px",background:T.bg,borderRadius:"8px",border:"1px solid "+T.borderL}}>
            <div style={{flex:1}}>
              <div style={{fontSize:"12px",fontWeight:"600",color:T.t2}}>Estado</div>
              <div style={{fontSize:"11px",color:T.t4}}>{activo?"Activo - puede iniciar sesion":"Inactivo - sin acceso"}</div>
            </div>
            <div onClick={function(){setActivo(!activo);}}
              style={{width:"40px",height:"22px",borderRadius:"11px",cursor:"pointer",
                background:activo?T.green:"#d1d5db",position:"relative",transition:"background 0.2s",flexShrink:0}}>
              <div style={{position:"absolute",top:"3px",left:activo?"21px":"3px",
                width:"16px",height:"16px",borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
            </div>
          </div>
          {apiErr&&(
            <div style={{padding:"9px 12px",background:T.redBg,border:"1px solid "+T.redBd,
              borderRadius:"8px",color:T.red,fontSize:"12px",marginBottom:"12px"}}>
              {apiErr}
            </div>
          )}
          <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
            <Btn v="ghost" onClick={props.onClose}>Cancelar</Btn>
            <Btn v="primary" onClick={save} disabled={saving}>{saving?"Guardando...":"Guardar cambios"}</Btn>
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
          <div style={{fontSize:"12px",color:T.t4,marginTop:"2px"}}>
            {loading?"Cargando...":(activos+" activos de "+usuarios.length+" total")}
          </div>
        </div>
        <Btn v="primary" onClick={function(){setModal({type:"nuevo"});}}>+ Nuevo usuario</Btn>
      </div>

      <div style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap"}}>
        <input value={busqueda} onChange={function(e){setBusqueda(e.target.value);}}
          placeholder="Buscar por nombre o email..."
          style={{flex:1,minWidth:"180px",maxWidth:"300px",padding:"8px 11px",
            border:"1px solid "+T.border,borderRadius:"7px",fontSize:"13px",
            color:T.t1,background:T.surface,outline:"none",fontFamily:T.font}}/>
        <select value={filtroRol} onChange={function(e){setFiltroRol(e.target.value);}}
          style={{padding:"8px 11px",border:"1px solid "+T.border,borderRadius:"7px",
            fontSize:"13px",color:T.t2,background:T.surface,outline:"none",cursor:"pointer",fontFamily:T.font}}>
          <option value="todos">Todos los roles</option>
          {ROLES.map(function(r){return <option key={r.id} value={r.id}>{r.label}</option>;})}
        </select>
      </div>

      <Card style={{overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 1.5fr 100px 90px",
          padding:"8px 16px",background:"#f8f9fb",borderBottom:"1px solid "+T.border}}>
          {["Nombre","Email","Rol","Estado",""].map(function(h,i){
            return <div key={i} style={{fontSize:"10px",fontWeight:"700",color:T.t4,
              textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</div>;
          })}
        </div>

        {loading&&<div style={{padding:"32px",textAlign:"center",fontSize:"13px",color:T.t4}}>Cargando...</div>}

        {!loading&&filtrados.length===0&&(
          <div style={{padding:"32px",textAlign:"center",fontSize:"13px",color:T.t4}}>
            {busqueda||filtroRol!=="todos"?"Sin resultados":"No hay usuarios registrados"}
          </div>
        )}

        {!loading&&filtrados.map(function(u,idx){
          var rm=rolMeta(u.rol);
          return(
            <div key={u.id} style={{display:"grid",gridTemplateColumns:"2fr 2fr 1.5fr 100px 90px",
              padding:"10px 16px",alignItems:"center",
              background:idx%2===0?T.surface:"#fafbfc",
              borderBottom:"1px solid "+T.borderL,
              opacity:u.activo?1:0.5}}>
              <div>
                <div style={{fontSize:"13px",fontWeight:"600",color:T.t1}}>{u.nombre}</div>
                <div style={{fontSize:"10px",color:T.t4,marginTop:"1px"}}>{fmtFecha(u.created_at)}</div>
              </div>
              <div style={{fontSize:"12px",color:T.t3}}>{u.email}</div>
              <div><Badge meta={rm}/></div>
              <div>
                <span style={{fontSize:"11px",fontWeight:"600",
                  color:u.activo?T.green:T.t4,
                  background:u.activo?T.greenBg:T.bg,
                  border:"1px solid "+(u.activo?T.greenBd:T.border),
                  padding:"2px 9px",borderRadius:"20px"}}>
                  {u.activo?"Activo":"Inactivo"}
                </span>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <Btn v="ghost" sm onClick={function(){setModal({type:"editar",usuario:u});}}>Editar</Btn>
              </div>
            </div>
          );
        })}
      </Card>

      {modal&&modal.type==="nuevo"&&(
        <ModalNuevoUsuario
          onCreado={function(u){
            setUsuarios(function(p){return p.concat([u]);});
            setModal(null);
            notify("Usuario "+u.nombre+" creado correctamente");
          }}
          onClose={function(){setModal(null);}}/>
      )}

      {modal&&modal.type==="editar"&&(
        <ModalEditarUsuario
          usuario={modal.usuario}
          onGuardado={function(u){
            setUsuarios(function(p){return p.map(function(x){return x.id===u.id?u:x;});});
            setModal(null);
            notify("Usuario actualizado");
          }}
          onClose={function(){setModal(null);}}/>
      )}

      {toast&&(
        <div style={{position:"fixed",bottom:"24px",right:"24px",zIndex:999,
          padding:"11px 18px",borderRadius:"10px",
          background:toast.ok?T.greenBg:T.redBg,
          border:"1px solid "+(toast.ok?T.greenBd:T.redBd),
          color:toast.ok?T.green:T.red,
          fontSize:"13px",fontWeight:"600",
          boxShadow:"0 4px 20px rgba(0,0,0,0.12)",fontFamily:T.font}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default function RolesPermissions(props){
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",fontFamily:T.font,background:T.bg}}>
      <div style={{background:T.surface,borderBottom:"1px solid "+T.border,
        padding:"0 20px",minHeight:"52px",display:"flex",alignItems:"center"}}>
        <div>
          <div style={{fontSize:"14px",fontWeight:"700",color:T.t1}}>Usuarios</div>
          <div style={{fontSize:"11px",color:T.t4}}>Gestion de accesos y roles</div>
        </div>
      </div>
      <PanelUsuarios currentUser={props.currentUser}/>
    </div>
  );
}
