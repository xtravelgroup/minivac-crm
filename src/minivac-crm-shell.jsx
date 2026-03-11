import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import RadioModule          from "./radio-module-v4.jsx";

var SB = createClient(
  "https://gsvnvahrjgswwejnuiyn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA"
);
import SellerCRM            from "./seller-crm-v3.jsx";
import VerificationModule   from "./verification-module-v2.jsx";
import Reservaciones        from "./reservaciones-v2.jsx";
import CSReservas           from "./cs-reservas-v2.jsx";
import ExecutiveSuite       from "./executive-suite.jsx";
import CommissionsModule    from "./commissions-module.jsx";
import PackagesModule       from "./packages-module.jsx";
import DestinationsModule   from "./destinations-v6.jsx";
import VonageModule         from "./vonage-module.jsx";
import AutomationsModule    from "./automations-module.jsx";
import RolesPermissions     from "./roles-permissions.jsx";
import ClientPortal         from "./client-portal.jsx";
import HotelsModule         from "./hotels-module.jsx";

// 
// DESIGN TOKENS - Zoho-style: blanco, gris neutro, azul marino
// 
var T = {
  // Superficies
  bg:          "#f4f5f7",
  surface:     "#ffffff",
  surfaceHov:  "#f9fafb",

  // Bordes
  border:      "#e3e6ea",
  borderL:     "#edf0f3",

  // Texto
  t1: "#1a1f2e",
  t2: "#3d4554",
  t3: "#6b7280",
  t4: "#9ca3af",

  // Brand - azul marino
  brand:    "#1a385a",
  brandHov: "#15304e",
  brandLt:  "#eaf0f7",
  brandBd:  "#b8cfe0",
  brandMid: "#2e5c8a",

  // Semaforo
  green:   "#1a7f3c",  greenBg: "#edf7ee",  greenBd: "#a3d9a5",
  amber:   "#925c0a",  amberBg: "#fef9e7",  amberBd: "#f0d080",
  red:     "#b91c1c",  redBg:   "#fef2f2",  redBd:   "#f5b8b8",
  blue:    "#1565c0",  blueBg:  "#e8f0fe",  blueBd:  "#aac4f0",

  // Sombras
  shadowSm: "0 1px 3px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08)",

  font: "'DM Sans','Segoe UI',-apple-system,sans-serif",
  r: "6px",
};

// Usuarios cargados desde Supabase Auth + tabla usuarios

var ROL_META = {
  admin:             {label:"Admin",        color:T.brand,   bg:T.brandLt,  bd:T.brandBd},
  director:          {label:"Director",     color:T.blue,    bg:T.blueBg,   bd:T.blueBd},
  supervisor:        {label:"Supervisor",   color:"#5b21b6", bg:"#ede9fe",  bd:"#c4b5fd"},
  verificador:       {label:"Verificador",  color:T.blue,    bg:T.blueBg,   bd:T.blueBd},
  vendedor:          {label:"Vendedor",     color:T.green,   bg:T.greenBg,  bd:T.greenBd},
  cs:                {label:"CS",           color:T.amber,   bg:T.amberBg,  bd:T.amberBd},
  especialista_radio:{label:"Radio",        color:"#5b21b6", bg:"#ede9fe",  bd:"#c4b5fd"},
  contador:          {label:"Contador",     color:"#0f766e", bg:"#f0fdfa",  bd:"#99f6e4"},
};

// 
// ICONOS SVG - trazo limpio estilo Feather/Lucide
// 
var ICONS = {
  dashboard:    "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 3h2v-2h2v2h2v2h-2v2h-2v-2h-2z",
  radio:        "M12 3a9 9 0 0 1 9 9h-2a7 7 0 0 0-7-7V3zm0 4a5 5 0 0 1 5 5h-2a3 3 0 0 0-3-3V7zM3 18l3-3h12l3 3H3zm2 1h14v2H5z",
  seller:       "M17 20H7v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2zm-5-6a4 4 0 1 1 0-8 4 4 0 0 1 0 8z",
  verificacion: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9c0-1.042-.133-2.052-.382-3.016z",
  reservas:     "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z",
  cs:           "M18 9h-2v2h2V9zm-4 0h-2v2h2V9zm-4 0H8v2h2V9zm8-7H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14l4 4V4a2 2 0 0 0-2-2z",
  destinos:     "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z",
  hoteles:      "M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z",
  paquetes:     "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  comisiones:   "M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6",
  usuarios:     "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
  vonage:       "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  chevLeft:     "M15 18l-6-6 6-6",
  chevRight:    "M9 18l6-6-6-6",
  logout:       "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1",
  menu:         "M3 12h18M3 6h18M3 18h18",
  bell:         "M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9",
  search:       "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",
  grid:         "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
};

var MODULOS = [
  {id:"dashboard",   label:"Dashboard",      icon:"dashboard",    section:"Principal", roles:["admin","director","supervisor"]},
  {id:"radio",       label:"Radio",          icon:"radio",        section:"Principal", roles:["admin","director","supervisor","especialista_radio","contador"]},
  {id:"seller",      label:"Vendedores",     icon:"seller",       section:"Principal", roles:["admin","director","supervisor","vendedor"]},
  {id:"verificacion",label:"Verificacion",   icon:"verificacion", section:"Principal", roles:["admin","director","supervisor","verificador"]},
  {id:"reservas",    label:"Reservaciones",  icon:"reservas",     section:"Operacion", roles:["admin","director","supervisor","cs"]},
  {id:"cs",          label:"CS + Reservas",  icon:"cs",           section:"Operacion", roles:["admin","director","supervisor","cs","verificador"]},
  {id:"destinos",    label:"Destinos",       icon:"destinos",     section:"Catalogo",  roles:["admin","director"]},
  {id:"hoteles",     label:"Hoteles",        icon:"hoteles",      section:"Catalogo",  roles:["admin","director"]},
  {id:"paquetes",    label:"Paquetes",       icon:"paquetes",     section:"Catalogo",  roles:["admin","director","supervisor"]},
  {id:"comisiones",  label:"Comisiones",     icon:"comisiones",   section:"Finanzas",  roles:["admin","director","supervisor","vendedor","contador"]},
  {id:"usuarios",    label:"Usuarios",       icon:"usuarios",     section:"Config",    roles:["admin","director"]},
  {id:"vonage",      label:"Comunicaciones", icon:"vonage",       section:"Config",    roles:["admin","director","supervisor"]},
];

function tieneAcceso(user, modId) {
  for (var i = 0; i < MODULOS.length; i++) {
    if (MODULOS[i].id === modId) {
      for (var j = 0; j < MODULOS[i].roles.length; j++) {
        if (MODULOS[i].roles[j] === user.rol) return true;
      }
      return false;
    }
  }
  return false;
}

function modulosDelRol(user) {
  return MODULOS.filter(function(m) {
    for (var j = 0; j < m.roles.length; j++) {
      if (m.roles[j] === user.rol) return true;
    }
    return false;
  });
}

// 
// ICON COMPONENT
// 
function Icon(props) {
  var path  = ICONS[props.name] || ICONS.grid;
  var size  = props.size  || 16;
  var color = props.color || "currentColor";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={props.w || 1.8}
      strokeLinecap="round" strokeLinejoin="round"
      style={props.style || {}}>
      <path d={path}/>
    </svg>
  );
}

// 
// LOGIN SCREEN - Supabase Auth real
// 
function LoginScreen(props) {
  var [email,    setEmail]    = useState("");
  var [pass,     setPass]     = useState("");
  var [err,      setErr]      = useState("");
  var [showPass, setShowPass] = useState(false);
  var [loading,  setLoading]  = useState(false);

  function doLogin() {
    if (!email.trim() || !pass) { setErr("Ingresa tu correo y contrasena"); return; }
    setLoading(true);
    setErr("");
    SB.auth.signInWithPassword({email: email.trim().toLowerCase(), password: pass})
      .then(function(res) {
        setLoading(false);
        if (res.error) {
          setErr("Credenciales incorrectas");
          return;
        }
        // Cargar perfil desde tabla usuarios
        SB.from("usuarios").select("*")
          .eq("auth_id", res.data.user.id)
          .eq("activo", true)
          .single()
          .then(function(perfil) {
            if (perfil.error || !perfil.data) {
              SB.auth.signOut();
              setErr("Usuario no encontrado o inactivo. Contacta al administrador.");
              return;
            }
            props.onLogin({
              id:     perfil.data.id,
              nombre: perfil.data.nombre,
              email:  perfil.data.email || email.trim().toLowerCase(),
              rol:    perfil.data.rol,
            });
          });
      });
  }
  function onKey(e) { if (e.key === "Enter") doLogin(); }

  var inputStyle = {
    width: "100%", padding: "9px 12px",
    border: "1px solid " + T.border,
    borderRadius: T.r, fontSize: "13px", color: T.t1,
    background: T.surface, outline: "none",
    boxSizing: "border-box", fontFamily: T.font,
    transition: "border-color 0.15s",
  };
  var labelStyle = {
    display: "block", fontSize: "12px", fontWeight: "500",
    color: T.t3, marginBottom: "6px",
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: T.font, padding: "24px",
    }}>
      <div style={{width: "100%", maxWidth: "400px"}}>

        {/* Logo + nombre */}
        <div style={{textAlign: "center", marginBottom: "32px"}}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "12px",
            background: T.brand, margin: "0 auto 14px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img src="/logo.png" alt="TX" style={{width:"38px",height:"38px",objectFit:"contain"}}/>
          </div>
          <div style={{fontSize: "18px", fontWeight: "700", color: T.t1, marginBottom: "4px"}}>
            Travel X Group
          </div>
          <div style={{fontSize: "13px", color: T.t3}}>
            Sistema interno de gestion
          </div>
        </div>

        {/* Card del formulario */}
        <div style={{
          background: T.surface, border: "1px solid " + T.border,
          borderRadius: "10px", padding: "28px 28px 24px",
          boxShadow: T.shadowSm,
        }}>
          <div style={{fontSize: "14px", fontWeight: "600", color: T.t1, marginBottom: "20px"}}>
            Iniciar sesion
          </div>

          <div style={{marginBottom: "14px"}}>
            <label style={labelStyle}>Correo electronico</label>
            <input style={inputStyle} type="email" value={email}
              onChange={function(e){setEmail(e.target.value);setErr("");}}
              onKeyDown={onKey} placeholder="usuario@xtravelgroup.com"
              onFocus={function(e){e.target.style.borderColor=T.brand;}}
              onBlur={function(e){e.target.style.borderColor=T.border;}}/>
          </div>

          <div style={{marginBottom: "20px", position: "relative"}}>
            <label style={labelStyle}>Contrasena</label>
            <input style={Object.assign({},inputStyle,{paddingRight:"52px"})}
              type={showPass ? "text" : "password"} value={pass}
              onChange={function(e){setPass(e.target.value);setErr("");}}
              onKeyDown={onKey} placeholder="Contrasena"
              onFocus={function(e){e.target.style.borderColor=T.brand;}}
              onBlur={function(e){e.target.style.borderColor=T.border;}}/>
            <button onClick={function(){setShowPass(!showPass);}} style={{
              position:"absolute", right:"10px", bottom:"9px",
              background:"none", border:"none", cursor:"pointer",
              fontSize:"10px", fontWeight:"600", color:T.t4, fontFamily:T.font,
              letterSpacing:"0.04em",
            }}>
              {showPass ? "OCULTAR" : "VER"}
            </button>
          </div>

          {err && (
            <div style={{
              padding: "9px 12px", background: T.redBg,
              border: "1px solid " + T.redBd, borderRadius: T.r,
              color: T.red, fontSize: "12px", marginBottom: "14px",
            }}>
              {err}
            </div>
          )}

          <button onClick={doLogin} disabled={loading} style={{
            width: "100%", padding: "9px",
            background: loading ? T.t4 : T.brand,
            color: "#fff", border: "none", borderRadius: T.r,
            fontSize: "13px", fontWeight: "600", fontFamily: T.font,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}>
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </div>

      </div>
    </div>
  );
}

// 
// SIDEBAR - Zoho style: blanco, texto gris, item activo azul marino
// 
function Sidebar(props) {
  var user  = props.user;
  var mods  = modulosDelRol(user);
  var col   = props.col;

  var sections = [];
  var seen = {};
  mods.forEach(function(m) {
    if (!seen[m.section]) { seen[m.section] = true; sections.push(m.section); }
  });

  return (
    <div style={{
      width: col ? "216px" : "52px",
      minWidth: col ? "216px" : "52px",
      background: T.surface,
      borderRight: "1px solid " + T.border,
      display: "flex", flexDirection: "column",
      flexShrink: 0, transition: "width 0.2s, min-width 0.2s",
      overflow: "hidden",
    }}>

      {/* Logo */}
      <div style={{
        height: "52px", flexShrink: 0, padding: col ? "0 14px" : "0",
        display: "flex", alignItems: "center", justifyContent: col ? "flex-start" : "center",
        gap: "10px", borderBottom: "1px solid " + T.border,
      }}>
        <div style={{
          width:"32px", height:"32px", borderRadius:"8px",
          background:T.brand, flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <img src="/logo.png" alt="TX" style={{width:"24px",height:"24px",objectFit:"contain"}}/>
        </div>
        {col && (
          <div>
            <div style={{fontSize:"12px",fontWeight:"700",color:T.t1,letterSpacing:"0.01em"}}>
              TRAVEL X GROUP
            </div>
            <div style={{fontSize:"10px",color:T.t4,marginTop:"1px"}}>
              Sistema interno
            </div>
          </div>
        )}
      </div>

      {/* Navegacion */}
      <div style={{flex:1, overflowY:"auto", padding:"8px 6px"}}>
        {sections.map(function(sec) {
          var secMods = mods.filter(function(m){return m.section===sec;});
          return (
            <div key={sec} style={{marginBottom:"4px"}}>
              {col && (
                <div style={{
                  fontSize:"10px", fontWeight:"600", color:T.t4,
                  letterSpacing:"0.08em", padding:"6px 8px 3px",
                  textTransform:"uppercase",
                }}>
                  {sec}
                </div>
              )}
              {!col && sections.indexOf(sec) > 0 && (
                <div style={{height:"1px",background:T.borderL,margin:"4px 6px 4px"}}/>
              )}
              {secMods.map(function(m) {
                var isA = props.activo === m.id;
                return (
                  <div key={m.id}
                    onClick={function(){props.onNav(m.id);}}
                    title={col ? "" : m.label}
                    style={{
                      display:"flex", alignItems:"center",
                      gap:"8px", padding: col ? "7px 8px" : "8px",
                      borderRadius:T.r, cursor:"pointer", marginBottom:"1px",
                      background: isA ? T.brandLt : "transparent",
                      justifyContent: col ? "flex-start" : "center",
                      transition:"background 0.1s",
                    }}
                    onMouseEnter={function(e){if(!isA)e.currentTarget.style.background=T.bg;}}
                    onMouseLeave={function(e){if(!isA)e.currentTarget.style.background="transparent";}}
                  >
                    <Icon name={m.icon} size={15}
                      color={isA ? T.brand : T.t3}
                      w={isA ? 2 : 1.6}/>
                    {col && (
                      <span style={{
                        fontSize:"13px", fontWeight: isA ? "600" : "400",
                        color: isA ? T.brand : T.t2, whiteSpace:"nowrap",
                        flex:1,
                      }}>
                        {m.label}
                      </span>
                    )}
                    {col && isA && (
                      <div style={{
                        width:"5px", height:"5px", borderRadius:"50%",
                        background:T.brand, flexShrink:0,
                      }}/>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer sidebar */}
      <div style={{borderTop:"1px solid "+T.border, padding:"8px 6px"}}>

        {col && (
          <div style={{
            display:"flex", alignItems:"center", gap:"8px",
            padding:"8px", marginBottom:"2px",
          }}>
            <div style={{
              width:"30px", height:"30px", borderRadius:"50%",
              background:T.brand, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"11px", fontWeight:"700", color:"#fff",
            }}>
              {props.user.nombre.split(" ").map(function(n){return n[0];}).slice(0,2).join("")}
            </div>
            <div style={{overflow:"hidden", flex:1}}>
              <div style={{
                fontSize:"12px", fontWeight:"600", color:T.t1,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              }}>
                {props.user.nombre}
              </div>
              <div style={{fontSize:"10px",color:T.t3}}>
                {(ROL_META[props.user.rol]||{label:"---"}).label}
              </div>
            </div>
          </div>
        )}

        <div onClick={props.onToggleCol}
          style={{
            display:"flex", alignItems:"center", gap:"8px",
            padding: col ? "6px 8px" : "7px",
            borderRadius:T.r, cursor:"pointer",
            justifyContent: col ? "flex-start" : "center",
          }}
          onMouseEnter={function(e){e.currentTarget.style.background=T.bg;}}
          onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}
        >
          <Icon name={col ? "chevLeft" : "chevRight"} size={14} color={T.t4}/>
          {col && <span style={{fontSize:"12px",color:T.t3}}>Colapsar</span>}
        </div>

        <div onClick={props.onLogout}
          style={{
            display:"flex", alignItems:"center", gap:"8px",
            padding: col ? "6px 8px" : "7px",
            borderRadius:T.r, cursor:"pointer",
            justifyContent: col ? "flex-start" : "center",
          }}
          onMouseEnter={function(e){e.currentTarget.style.background=T.redBg;}}
          onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}
        >
          <Icon name="logout" size={14} color={T.red}/>
          {col && <span style={{fontSize:"12px",color:T.red,fontWeight:"500"}}>Cerrar sesion</span>}
        </div>
      </div>
    </div>
  );
}

// 
// TOPBAR - Zoho style: blanco, borde sutil, breadcrumb + usuario
// 
function Topbar(props) {
  var user = props.user;
  var mod  = null;
  for (var i = 0; i < MODULOS.length; i++) {
    if (MODULOS[i].id === props.activo) { mod = MODULOS[i]; break; }
  }
  var meta = ROL_META[user.rol] || ROL_META.vendedor;

  return (
    <div style={{
      height:"52px", background:T.surface,
      borderBottom:"1px solid "+T.border,
      display:"flex", alignItems:"center",
      padding:"0 20px", gap:"14px", flexShrink:0,
    }}>

      {/* Breadcrumb */}
      <div style={{flex:1, display:"flex", alignItems:"center", gap:"8px"}}>
        <span style={{fontSize:"12px",color:T.t4}}>Travel X Group</span>
        {mod && (
          <>
            <span style={{fontSize:"11px",color:T.t4}}>/</span>
            <span style={{fontSize:"13px",fontWeight:"600",color:T.t1}}>{mod.label}</span>
          </>
        )}
      </div>

      {/* Acciones topbar */}
      <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
        <button style={{
          width:"32px",height:"32px",borderRadius:T.r,
          background:"transparent",border:"none",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
          color:T.t3,
        }}
          onMouseEnter={function(e){e.currentTarget.style.background=T.bg;}}
          onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}
        >
          <Icon name="search" size={15} color={T.t3}/>
        </button>
        <button style={{
          width:"32px",height:"32px",borderRadius:T.r,
          background:"transparent",border:"none",cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
        }}
          onMouseEnter={function(e){e.currentTarget.style.background=T.bg;}}
          onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}
        >
          <Icon name="bell" size={15} color={T.t3}/>
        </button>
      </div>

      <div style={{width:"1px",height:"22px",background:T.borderL}}/>

      {/* Usuario */}
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:"12px",fontWeight:"600",color:T.t1}}>
            {user.nombre}
          </div>
          <div style={{
            fontSize:"10px",fontWeight:"600",
            color:meta.color,letterSpacing:"0.04em",
          }}>
            {meta.label.toUpperCase()}
          </div>
        </div>
        <div style={{
          width:"32px",height:"32px",borderRadius:"50%",
          background:T.brand,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:"11px",fontWeight:"700",color:"#fff",
          letterSpacing:"-0.3px",
        }}>
          {user.nombre.split(" ").map(function(n){return n[0];}).slice(0,2).join("")}
        </div>
      </div>
    </div>
  );
}

// 
// BIENVENIDA - grid de modulos estilo Zoho apps
// 
function Bienvenida(props) {
  var user = props.user;
  var mods = modulosDelRol(user);
  var meta = ROL_META[user.rol] || ROL_META.vendedor;
  var hour = new Date().getHours();
  var sal  = hour < 12 ? "Buenos dias" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  var sections = [];
  var seen = {};
  mods.forEach(function(m){
    if (!seen[m.section]) { seen[m.section]=true; sections.push(m.section); }
  });

  return (
    <div style={{flex:1, overflowY:"auto", padding:"28px 28px"}}>

      {/* Header */}
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:"28px", paddingBottom:"20px", borderBottom:"1px solid "+T.borderL,
      }}>
        <div>
          <div style={{fontSize:"12px",color:T.t4,letterSpacing:"0.06em",marginBottom:"4px"}}>
            {sal.toUpperCase()}
          </div>
          <div style={{fontSize:"22px",fontWeight:"700",color:T.t1,letterSpacing:"-0.3px"}}>
            {user.nombre}
          </div>
          <div style={{fontSize:"13px",color:T.t3,marginTop:"3px"}}>
            {"Tienes acceso a " + mods.length + " modulo" + (mods.length!==1?"s":"") + " del sistema"}
          </div>
        </div>
        <span style={{
          fontSize:"11px",fontWeight:"600",
          color:meta.color, background:meta.bg,
          border:"1px solid "+meta.bd,
          padding:"4px 12px", borderRadius:"4px",
          letterSpacing:"0.04em",
        }}>
          {meta.label.toUpperCase()}
        </span>
      </div>

      {/* Secciones de modulos */}
      {sections.map(function(sec){
        var secMods = mods.filter(function(m){return m.section===sec;});
        return (
          <div key={sec} style={{marginBottom:"24px"}}>
            <div style={{
              fontSize:"11px",fontWeight:"600",color:T.t4,
              letterSpacing:"0.08em",marginBottom:"10px",
              textTransform:"uppercase",
            }}>
              {sec}
            </div>
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))",
              gap:"8px",
            }}>
              {secMods.map(function(m){
                return (
                  <div key={m.id}
                    onClick={function(){props.onNav(m.id);}}
                    style={{
                      background:T.surface,
                      border:"1px solid "+T.border,
                      borderRadius:"8px",
                      padding:"16px 14px",
                      cursor:"pointer",
                      transition:"all 0.12s",
                    }}
                    onMouseEnter={function(e){
                      e.currentTarget.style.borderColor=T.brand;
                      e.currentTarget.style.boxShadow=T.shadowMd;
                    }}
                    onMouseLeave={function(e){
                      e.currentTarget.style.borderColor=T.border;
                      e.currentTarget.style.boxShadow="none";
                    }}
                  >
                    <div style={{
                      width:"34px",height:"34px",borderRadius:"8px",
                      background:T.brandLt,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      marginBottom:"10px",
                    }}>
                      <Icon name={m.icon} size={16} color={T.brand}/>
                    </div>
                    <div style={{fontSize:"13px",fontWeight:"600",color:T.t1}}>
                      {m.label}
                    </div>
                    <div style={{fontSize:"11px",color:T.t4,marginTop:"2px"}}>
                      {m.section}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 
// APP ROOT
// 
export default function MinivacShell() {
  var [user,    setUser]    = useState(null);
  var [activo,  setActivo]  = useState(null);
  var [col,     setCol]     = useState(true);
  var [checking,setChecking]= useState(true);

  // Sesion persistente - al recargar la pagina se restaura automaticamente
  useEffect(function() {
    SB.auth.getSession().then(function(res) {
      if (res.data && res.data.session) {
        SB.from("usuarios").select("*")
          .eq("auth_id", res.data.session.user.id)
          .eq("activo", true)
          .single()
          .then(function(perfil) {
            if (perfil.data) {
              setUser({
                id:     perfil.data.id,
                nombre: perfil.data.nombre,
                email:  perfil.data.email || res.data.session.user.email,
                rol:    perfil.data.rol,
              });
            }
            setChecking(false);
          });
      } else {
        setChecking(false);
      }
    });

    var sub = SB.auth.onAuthStateChange(function(event, session) {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setActivo(null);
      }
    });
    return function() { sub.data.subscription.unsubscribe(); };
  }, []);

  function handleLogin(u) {
    setUser(u);
    setActivo(null);
  }
  function handleLogout() {
    SB.auth.signOut().then(function() {
      setUser(null);
      setActivo(null);
    });
  }
  function handleNav(id) {
    if (!user || !tieneAcceso(user, id)) return;
    setActivo(id);
  }

  if (checking) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",
        justifyContent:"center",background:T.bg,fontFamily:T.font}}>
        <div style={{fontSize:"13px",color:T.t4}}>Cargando...</div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin}/>;

  return (
    <div style={{
      minHeight:"100vh", background:T.bg,
      fontFamily:T.font, fontSize:"13px", color:T.t2,
      display:"flex", flexDirection:"column",
    }}>
      <Topbar user={user} activo={activo}/>
      <div style={{flex:1, display:"flex", overflow:"hidden", minHeight:"0"}}>
        <Sidebar
          user={user} activo={activo} col={col}
          onNav={handleNav}
          onToggleCol={function(){setCol(!col);}}
          onLogout={handleLogout}
        />
        <div style={{
          flex:1, display:"flex", flexDirection:"column",
          overflow:"auto", background:T.bg, minHeight:"0",
        }}>
          {!activo && <Bienvenida user={user} onNav={handleNav}/>}
          {activo==="dashboard"    && <ExecutiveSuite/>}
          {activo==="radio"        && <RadioModule
            isSupervisor={user.rol==="admin"||user.rol==="director"||user.rol==="supervisor"||user.rol==="especialista_radio"}
            isReadOnly={user.rol==="contador"}/>}
          {activo==="seller"       && <SellerCRM currentUser={user}/>}
          {activo==="verificacion" && <VerificationModule currentUser={user}/>}
          {activo==="reservas"     && <Reservaciones currentUser={user}/>}
          {activo==="cs"           && <CSReservas currentUser={user}/>}
          {activo==="destinos"     && <DestinationsModule/>}
          {activo==="hoteles"      && <HotelsModule/>}
          {activo==="paquetes"     && <PackagesModule/>}
          {activo==="comisiones"   && <CommissionsModule currentUser={user}/>}
          {activo==="usuarios"     && <RolesPermissions currentUser={user}/>}
          {activo==="vonage"       && <VonageModule/>}
          {activo==="automatizaciones" && <AutomationsModule/>}
          {activo==="portal"       && <ClientPortal/>}
        </div>
      </div>
    </div>
  );
}
// updated
