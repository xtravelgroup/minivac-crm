import React, { useState, useEffect, useRef, Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import KnowledgeBase from "./knowledge-base-module.jsx";
import CommunicationsHub from "./communications-hub.jsx";
import AgentStatusBar from "./agent-status-bar.jsx";
import useTwilioDevice from "./use-twilio-device.jsx";
import IncomingCallModal from "./incoming-call-modal.jsx";

var SB = createClient(
  "https://gsvnvahrjgswwejnuiyn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA"
);

const RadioModule        = React.lazy(() => import("./radio-module-v4.jsx"));
const SellerCRM          = React.lazy(() => import("./seller-crm-v3.jsx"));
const VerificationModule = React.lazy(() => import("./verification-module-v2.jsx"));
const Reservaciones      = React.lazy(() => import("./reservaciones-v2.jsx"));
const CSReservas         = React.lazy(() => import("./cs-reservas-v3.jsx"));
const ExecutiveSuite     = React.lazy(() => import("./executive-suite.jsx"));
const CommissionsModule  = React.lazy(() => import("./commissions-module.jsx"));
const DestinationsModule = React.lazy(() => import("./destinations-v6.jsx"));
const AutomationsModule  = React.lazy(() => import("./automations-module.jsx"));
const RolesPermissions   = React.lazy(() => import("./roles-permissions.jsx"));
const ClientPortal       = React.lazy(() => import("./client-portal.jsx"));
const HotelsModule       = React.lazy(() => import("./hotels-module.jsx"));
const WelcomeCalls       = React.lazy(() => import("./welcome-calls.jsx"));
const RetencionQueue     = React.lazy(() => import("./retencion-queue.jsx"));
const TelephonyMgmt     = React.lazy(() => import("./telephony-management.jsx"));
const AgentPhone        = React.lazy(() => import("./agent-phone.jsx"));

// ─── Constantes ───────────────────────────────────────────────
const SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";

// ─── Monitor global de mensajes de chat ───────────────────────
function useChatAlertas(user) {
  const [alertas, setAlertas] = useState([]);
  const prevRef = useRef({});

  useEffect(() => {
    if (!user) return;
    const poll = setInterval(async () => {
      try {
        const r = await fetch(
          `${SB_URL}/rest/v1/chats?usuario_id=eq.${user.id}&select=id,token,lead_id,leads(nombre)`,
          { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
        );
        const chats = await r.json();
        if (!Array.isArray(chats)) return;
        const nuevas = [];
        for (const ch of chats) {
          const r2 = await fetch(
            `${SB_URL}/rest/v1/chat_mensajes?chat_id=eq.${ch.id}&autor=eq.cliente&order=created_at.desc&limit=1`,
            { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
          );
          const msgs = await r2.json();
          if (!msgs?.length) continue;
          const ultimo = msgs[0];
          const prev = prevRef.current[ch.id];
          if (prev && prev !== ultimo.id) {
            nuevas.push({ chatId: ch.id, token: ch.token, leadNombre: ch.leads?.nombre || "Cliente", mensaje: ultimo.mensaje });
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("💬 " + (ch.leads?.nombre || "Cliente") + " escribió", { body: ultimo.mensaje?.substring(0, 80) });
            }
          }
          prevRef.current[ch.id] = ultimo.id;
        }
        if (nuevas.length) setAlertas(prev => [...prev, ...nuevas]);
      } catch (e) {}
    }, 5000);
    return () => clearInterval(poll);
  }, [user?.id]);

  return [alertas, () => setAlertas([])];
}

// ─── Design tokens ────────────────────────────────────────────
var T = {
  bg: "#f4f5f7", surface: "#ffffff", surfaceHov: "#f9fafb",
  border: "#e3e6ea", borderL: "#edf0f3",
  t1: "#1a1f2e", t2: "#3d4554", t3: "#6b7280", t4: "#9ca3af",
  brand: "#1a385a", brandHov: "#15304e", brandLt: "#eaf0f7", brandBd: "#b8cfe0", brandMid: "#2e5c8a",
  green: "#1a7f3c", greenBg: "#edf7ee", greenBd: "#a3d9a5",
  amber: "#925c0a", amberBg: "#fef9e7", amberBd: "#f0d080",
  red: "#b91c1c", redBg: "#fef2f2", redBd: "#f5b8b8",
  blue: "#1565c0", blueBg: "#e8f0fe", blueBd: "#aac4f0",
  shadowSm: "0 1px 3px rgba(0,0,0,0.06)", shadowMd: "0 4px 12px rgba(0,0,0,0.08)",
  font: "'DM Sans','Segoe UI',-apple-system,sans-serif", r: "6px",
};

var ROL_META = {
  admin:             { label: "Admin",        color: T.brand,   bg: T.brandLt,  bd: T.brandBd },
  director:          { label: "Director",     color: T.blue,    bg: T.blueBg,   bd: T.blueBd },
  supervisor:        { label: "Supervisor",   color: "#5b21b6", bg: "#ede9fe",  bd: "#c4b5fd" },
  verificador:       { label: "Verificador",  color: T.blue,    bg: T.blueBg,   bd: T.blueBd },
  cs_gerente:        { label: "CS Gerente",  color: T.blue,    bg: T.blueBg,   bd: T.blueBd },
  vendedor:          { label: "Vendedor",     color: T.green,   bg: T.greenBg,  bd: T.greenBd },
  cs:                { label: "CS",           color: T.amber,   bg: T.amberBg,  bd: T.amberBd },
  especialista_radio:{ label: "Radio",        color: "#5b21b6", bg: "#ede9fe",  bd: "#c4b5fd" },
  contador:          { label: "Contador",     color: "#0f766e", bg: "#f0fdfa",  bd: "#99f6e4" },
};

// ─── Íconos SVG ───────────────────────────────────────────────
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
  lock:         "M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4zm0 2a2 2 0 0 1 2 2v2h-4V6a2 2 0 0 1 2-2zm0 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",
  menu:         "M3 12h18M3 6h18M3 18h18",
  bell:         "M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9",
  search:       "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",
  grid:         "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
};

var MODULOS = [
  { id: "dashboard",    label: "Dashboard",      icon: "dashboard",    section: "Principal", roles: ["admin","director","supervisor","cs_gerente"] },
  { id: "radio",        label: "Radio",          icon: "radio",        section: "Principal", roles: ["admin","director","especialista_radio","contador"] },
  { id: "kb",           label: "Knowledge Base", icon: "grid",         section: "Principal", roles: ["admin","director"] },
  { id: "comms",        label: "Comunicaciones", icon: "cs",           section: "Principal", roles: ["admin","director","supervisor","vendedor","cs","cs_gerente","vlo","agente_reservas"] },
  { id: "seller",       label: "Ventas",     icon: "seller",       section: "Principal", roles: ["admin","director","supervisor","vendedor","verificador"] },
  { id: "verificacion", label: "Verificacion",   icon: "verificacion", section: "Principal", roles: ["admin","director","supervisor","verificador","cs","cs_gerente"] },
  { id: "cs",           label: "Membresias",     icon: "cs",           section: "Operacion", roles: ["admin","director","cs","cs_gerente","vlo","agente_reservas"] },
  { id: "welcome",     label: "Welcome Calls",  icon: "cs",           section: "Operacion", roles: ["admin","director","cs","cs_gerente"] },
  { id: "retencion",  label: "Retencion",      icon: "cs",           section: "Operacion", roles: ["admin","director","cs","cs_gerente"] },
  { id: "reservas",     label: "Reservaciones",  icon: "reservas",     section: "Operacion", roles: ["admin","director","cs","cs_gerente","vlo","agente_reservas"] },
  { id: "destinos",     label: "Destinos",       icon: "destinos",     section: "Catalogo",  roles: ["admin","director"] },
  { id: "hoteles",      label: "Hoteles",        icon: "hoteles",      section: "Catalogo",  roles: ["admin","director"] },

  { id: "comisiones",   label: "Comisiones",     icon: "comisiones",   section: "Finanzas",  roles: ["admin","director","supervisor","vendedor","contador","verificador"] },
  { id: "usuarios",     label: "Usuarios",       icon: "usuarios",     section: "Config",    roles: ["admin","director"] },
  { id: "telefonia",    label: "Gestion Llamadas", icon: "vonage",     section: "Operacion", roles: ["admin","director","supervisor","vendedor","cs","cs_gerente","vlo","agente_reservas","especialista_radio"] },
  { id: "telefono",     label: "Telefono",         icon: "vonage",     section: "Principal", roles: ["admin","director","supervisor","vendedor","cs","cs_gerente","vlo","agente_reservas","especialista_radio"] },
];

function tieneAcceso(user, modId) {
  var mod = MODULOS.find(m => m.id === modId);
  return mod ? mod.roles.includes(user.rol) : false;
}

function modulosDelRol(user) {
  return MODULOS.filter(m => m.roles.includes(user.rol));
}

// ─── Icon ─────────────────────────────────────────────────────
function Icon({ name, size = 16, color = "currentColor", w = 1.8, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
      style={style}>
      <path d={ICONS[name] || ICONS.grid} />
    </svg>
  );
}

// ─── Login ────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [pass, setPass]         = useState("");
  const [err, setErr]           = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  function doLogin() {
    if (!email.trim() || !pass) { setErr("Ingresa tu correo y contraseña"); return; }
    setLoading(true);
    setErr("");
    SB.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass })
      .then(res => {
        setLoading(false);
        if (res.error) { setErr("Credenciales incorrectas"); return; }
        SB.from("usuarios").select("*")
          .eq("auth_id", res.data.user.id)
          .eq("activo", true)
          .single()
          .then(perfil => {
            if (perfil.error || !perfil.data) {
              SB.auth.signOut();
              setErr("Usuario no encontrado o inactivo. Contacta al administrador.");
              return;
            }
            onLogin({ id: perfil.data.id, nombre: perfil.data.nombre, email: perfil.data.email || email.trim().toLowerCase(), rol: perfil.data.rol }, perfil.data.must_change_password === true);
          });
      });
  }

  const inp = { width: "100%", padding: "9px 12px", border: "1px solid " + T.border, borderRadius: T.r, fontSize: "13px", color: T.t1, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: T.font };
  const lbl = { display: "block", fontSize: "12px", fontWeight: "500", color: T.t3, marginBottom: "6px" };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font, padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: T.brand, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/logo.png" alt="TX" style={{ width: "38px", height: "38px", objectFit: "contain" }} />
          </div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: T.t1, marginBottom: "4px" }}>X Travel Group</div>
          <div style={{ fontSize: "13px", color: T.t3 }}>Sistema interno de gestión</div>
        </div>

        <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: "10px", padding: "28px", boxShadow: T.shadowSm }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: T.t1, marginBottom: "20px" }}>Iniciar sesión</div>

          <div style={{ marginBottom: "14px" }}>
            <label style={lbl}>Correo electrónico</label>
            <input style={inp} type="email" value={email} placeholder="usuario@xtravelgroup.com"
              onChange={e => { setEmail(e.target.value); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && doLogin()}
              onFocus={e => e.target.style.borderColor = T.brand}
              onBlur={e => e.target.style.borderColor = T.border} />
          </div>

          <div style={{ marginBottom: "20px", position: "relative" }}>
            <label style={lbl}>Contraseña</label>
            <input style={{ ...inp, paddingRight: "52px" }} type={showPass ? "text" : "password"} value={pass} placeholder="Contraseña"
              onChange={e => { setPass(e.target.value); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && doLogin()}
              onFocus={e => e.target.style.borderColor = T.brand}
              onBlur={e => e.target.style.borderColor = T.border} />
            <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: "10px", bottom: "9px", background: "none", border: "none", cursor: "pointer", fontSize: "10px", fontWeight: "600", color: T.t4, fontFamily: T.font }}>
              {showPass ? "OCULTAR" : "VER"}
            </button>
          </div>

          {err && <div style={{ padding: "9px 12px", background: T.redBg, border: "1px solid " + T.redBd, borderRadius: T.r, color: T.red, fontSize: "12px", marginBottom: "14px" }}>{err}</div>}

          <div style={{ textAlign:"right", marginBottom:"12px" }}>
            <button onClick={async ()=>{
              if (!email.trim()) { setErr("Ingresa tu correo primero"); return; }
              setLoading(true);
              const res = await SB.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin });
              setLoading(false);
              if (res.error) { setErr("Error: " + res.error.message); }
              else { setErr(""); alert("✅ Correo de recuperación enviado a " + email.trim()); }
            }} style={{ background:"none", border:"none", fontSize:"12px", color:T.brand, cursor:"pointer", fontFamily:T.font, textDecoration:"underline" }}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <button onClick={doLogin} disabled={loading} style={{ width: "100%", padding: "9px", background: loading ? T.t4 : T.brand, color: "#fff", border: "none", borderRadius: T.r, fontSize: "13px", fontWeight: "600", fontFamily: T.font, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({ user, activo, col, onNav, onToggleCol, onLogout, onCambiarClave }) {
  const mods = modulosDelRol(user);
  const sections = [...new Set(mods.map(m => m.section))];
  const meta = ROL_META[user.rol] || ROL_META.vendedor;

  return (
    <div style={{ width: col ? "216px" : "52px", minWidth: col ? "216px" : "52px", background: T.surface, borderRight: "1px solid " + T.border, display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.2s, min-width 0.2s", overflow: "hidden" }}>

      {/* Logo */}
      <div style={{ height: "52px", flexShrink: 0, padding: col ? "0 14px" : "0", display: "flex", alignItems: "center", justifyContent: col ? "flex-start" : "center", gap: "10px", borderBottom: "1px solid " + T.border }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: T.brand, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/logo.png" alt="TX" style={{ width: "24px", height: "24px", objectFit: "contain" }} />
        </div>
        {col && (
          <div>
            <div style={{ fontSize: "12px", fontWeight: "700", color: T.t1 }}>TRAVEL X GROUP</div>
            <div style={{ fontSize: "10px", color: T.t4 }}>Sistema interno</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
        {sections.map(sec => {
          const secMods = mods.filter(m => m.section === sec);
          return (
            <div key={sec} style={{ marginBottom: "4px" }}>
              {col && <div style={{ fontSize: "10px", fontWeight: "600", color: T.t4, letterSpacing: "0.08em", padding: "6px 8px 3px", textTransform: "uppercase" }}>{sec}</div>}
              {!col && sections.indexOf(sec) > 0 && <div style={{ height: "1px", background: T.borderL, margin: "4px 6px" }} />}
              {secMods.map(m => {
                const isA = activo === m.id;
                return (
                  <div key={m.id} onClick={() => onNav(m.id)} title={col ? "" : m.label}
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: col ? "7px 8px" : "8px", borderRadius: T.r, cursor: "pointer", marginBottom: "1px", background: isA ? T.brandLt : "transparent", justifyContent: col ? "flex-start" : "center", transition: "background 0.1s" }}
                    onMouseEnter={e => { if (!isA) e.currentTarget.style.background = T.bg; }}
                    onMouseLeave={e => { if (!isA) e.currentTarget.style.background = "transparent"; }}>
                    <Icon name={m.icon} size={15} color={isA ? T.brand : T.t3} w={isA ? 2 : 1.6} />
                    {col && <span style={{ fontSize: "13px", fontWeight: isA ? "600" : "400", color: isA ? T.brand : T.t2, whiteSpace: "nowrap", flex: 1 }}>{m.label}</span>}
                    {col && isA && <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: T.brand }} />}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid " + T.border, padding: "8px 6px" }}>
        {col && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", marginBottom: "2px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: T.brand, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "#fff" }}>
              {user.nombre.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.nombre}</div>
              <div style={{ fontSize: "10px", color: T.t3 }}>{meta.label}</div>
            </div>
          </div>
        )}

        <div onClick={onToggleCol} style={{ display: "flex", alignItems: "center", gap: "8px", padding: col ? "6px 8px" : "7px", borderRadius: T.r, cursor: "pointer", justifyContent: col ? "flex-start" : "center" }}
          onMouseEnter={e => e.currentTarget.style.background = T.bg}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <Icon name={col ? "chevLeft" : "chevRight"} size={14} color={T.t4} />
          {col && <span style={{ fontSize: "12px", color: T.t3 }}>Colapsar</span>}
        </div>

        <div onClick={onCambiarClave} style={{ display: "flex", alignItems: "center", gap: "8px", padding: col ? "6px 8px" : "7px", borderRadius: T.r, cursor: "pointer", justifyContent: col ? "flex-start" : "center" }}
          onMouseEnter={e => e.currentTarget.style.background = T.bg}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <Icon name="lock" size={14} color={T.t3} />
          {col && <span style={{ fontSize: "12px", color: T.t3, fontWeight: "500" }}>Cambiar contraseña</span>}
        </div>
        <div onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: "8px", padding: col ? "6px 8px" : "7px", borderRadius: T.r, cursor: "pointer", justifyContent: col ? "flex-start" : "center" }}
          onMouseEnter={e => e.currentTarget.style.background = T.redBg}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <Icon name="logout" size={14} color={T.red} />
          {col && <span style={{ fontSize: "12px", color: T.red, fontWeight: "500" }}>Cerrar sesión</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────
function Topbar({ user, activo, chatAlertas = [], setNotifPanel, agentStatusBar }) {
  const mod  = MODULOS.find(m => m.id === activo) || null;
  const meta = ROL_META[user.rol] || ROL_META.vendedor;

  return (
    <div style={{ height: "52px", background: T.surface, borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", padding: "0 20px", gap: "14px", flexShrink: 0 }}>

      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "12px", color: T.t4 }}>X Travel Group</span>
        {mod && <><span style={{ fontSize: "11px", color: T.t4 }}>/</span><span style={{ fontSize: "13px", fontWeight: "600", color: T.t1 }}>{mod.label}</span></>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {agentStatusBar}
        {/* Campana con badge */}
        <button onClick={() => setNotifPanel(p => !p)}
          style={{ width: "32px", height: "32px", borderRadius: T.r, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={e => e.currentTarget.style.background = T.bg}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <div style={{ position: "relative" }}>
            <Icon name="bell" size={15} color={chatAlertas.length > 0 ? "#ef4444" : T.t3} />
            {chatAlertas.length > 0 && (
              <div style={{ position: "absolute", top: "-5px", right: "-5px", background: "#ef4444", color: "#fff", borderRadius: "50%", width: "15px", height: "15px", fontSize: "9px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {chatAlertas.length}
              </div>
            )}
          </div>
        </button>
      </div>

      <div style={{ width: "1px", height: "22px", background: T.borderL }} />

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: T.t1 }}>{user.nombre}</div>
          <div style={{ fontSize: "10px", fontWeight: "600", color: meta.color, letterSpacing: "0.04em" }}>{meta.label.toUpperCase()}</div>
        </div>
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: T.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "#fff" }}>
          {user.nombre.split(" ").map(n => n[0]).slice(0, 2).join("")}
        </div>
      </div>
    </div>
  );
}

// ─── Bienvenida ───────────────────────────────────────────────
function Bienvenida({ user, onNav }) {
  const mods = modulosDelRol(user);
  const meta = ROL_META[user.rol] || ROL_META.vendedor;
  const hour = new Date().getHours();
  const sal  = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  const sections = [...new Set(mods.map(m => m.section))];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", paddingBottom: "20px", borderBottom: "1px solid " + T.borderL }}>
        <div>
          <div style={{ fontSize: "12px", color: T.t4, letterSpacing: "0.06em", marginBottom: "4px" }}>{sal.toUpperCase()}</div>
          <div style={{ fontSize: "22px", fontWeight: "700", color: T.t1 }}>{user.nombre}</div>
          <div style={{ fontSize: "13px", color: T.t3, marginTop: "3px" }}>Tienes acceso a {mods.length} módulo{mods.length !== 1 ? "s" : ""} del sistema</div>
        </div>
        <span style={{ fontSize: "11px", fontWeight: "600", color: meta.color, background: meta.bg, border: "1px solid " + meta.bd, padding: "4px 12px", borderRadius: "4px" }}>{meta.label.toUpperCase()}</span>
      </div>

      {sections.map(sec => {
        const secMods = mods.filter(m => m.section === sec);
        return (
          <div key={sec} style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: T.t4, letterSpacing: "0.08em", marginBottom: "10px", textTransform: "uppercase" }}>{sec}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "8px" }}>
              {secMods.map(m => (
                <div key={m.id} onClick={() => onNav(m.id)}
                  style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: "8px", padding: "16px 14px", cursor: "pointer", transition: "all 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.brand; e.currentTarget.style.boxShadow = T.shadowMd; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: T.brandLt, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" }}>
                    <Icon name={m.icon} size={16} color={T.brand} />
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: T.t1 }}>{m.label}</div>
                  <div style={{ fontSize: "11px", color: T.t4, marginTop: "2px" }}>{m.section}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Cambiar Clave Modal ──────────────────────────────────────
function CambiarClaveModal({ onClose, forzado }) {
  const [actual,   setActual]   = useState("");
  const [nueva,    setNueva]    = useState("");
  const [confirma, setConfirma] = useState("");
  const [err,      setErr]      = useState("");
  const [ok,       setOk]       = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [showA, setShowA] = useState(false);
  const [showN, setShowN] = useState(false);

  const inp = { width:"100%", padding:"9px 12px", border:"1px solid "+T.border, borderRadius:T.r, fontSize:"13px", color:T.t1, background:T.surface, outline:"none", boxSizing:"border-box", fontFamily:T.font };
  const lbl = { display:"block", fontSize:"12px", fontWeight:"500", color:T.t3, marginBottom:"6px" };

  async function handleGuardar() {
    if (!nueva || nueva.length < 8) { setErr("La nueva clave debe tener al menos 8 caracteres"); return; }
    if (nueva !== confirma) { setErr("Las claves no coinciden"); return; }
    setLoading(true); setErr("");
    const res = await SB.auth.updateUser({ password: nueva });
    if (res.error) { setErr("Error al cambiar la clave: " + res.error.message); setLoading(false); return; }
    // Marcar must_change_password = false
    const session = await SB.auth.getSession();
    if (session.data?.session) {
      await SB.from("usuarios").update({ must_change_password: false }).eq("auth_id", session.data.session.user.id);
    }
    setOk(true); setLoading(false);
    if (!forzado) setTimeout(onClose, 1500);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ background:T.surface, border:"1px solid "+T.border, borderRadius:"12px", padding:"28px", width:"100%", maxWidth:"380px", boxShadow:T.shadowSm }}>
        <div style={{ fontSize:"16px", fontWeight:"700", color:T.t1, marginBottom:"6px" }}>
          {forzado ? "🔐 Cambia tu contraseña" : "Cambiar contraseña"}
        </div>
        {forzado && <div style={{ fontSize:"12px", color:T.t3, marginBottom:"20px" }}>Por seguridad debes cambiar tu contraseña antes de continuar.</div>}
        {ok ? (
          <div style={{ padding:"14px", background:T.greenBg||"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:T.r, color:"#166534", fontSize:"13px", textAlign:"center" }}>
            ✅ Contraseña actualizada correctamente{forzado ? ". Cargando..." : ""}
          </div>
        ) : (
          <>
            <div style={{ marginBottom:"14px" }}>
              <label style={lbl}>Nueva contraseña</label>
              <div style={{ position:"relative" }}>
                <input style={{ ...inp, paddingRight:"52px" }} type={showN?"text":"password"} value={nueva}
                  placeholder="Mínimo 8 caracteres" onChange={e=>{ setNueva(e.target.value); setErr(""); }} />
                <button onClick={()=>setShowN(!showN)} style={{ position:"absolute", right:"10px", top:"9px", background:"none", border:"none", cursor:"pointer", fontSize:"10px", fontWeight:"600", color:T.t4, fontFamily:T.font }}>{showN?"OCULTAR":"VER"}</button>
              </div>
            </div>
            <div style={{ marginBottom:"20px" }}>
              <label style={lbl}>Confirmar contraseña</label>
              <input style={inp} type="password" value={confirma} placeholder="Repite la nueva contraseña"
                onChange={e=>{ setConfirma(e.target.value); setErr(""); }} />
            </div>
            {err && <div style={{ padding:"9px 12px", background:T.redBg, border:"1px solid "+T.redBd, borderRadius:T.r, color:T.red, fontSize:"12px", marginBottom:"14px" }}>{err}</div>}
            <div style={{ display:"flex", gap:"8px" }}>
              {!forzado && <button onClick={onClose} style={{ flex:1, padding:"9px", background:"none", border:"1px solid "+T.border, borderRadius:T.r, fontSize:"13px", color:T.t2, cursor:"pointer", fontFamily:T.font }}>Cancelar</button>}
              <button onClick={handleGuardar} disabled={loading} style={{ flex:2, padding:"9px", background:loading?T.t4:T.brand, color:"#fff", border:"none", borderRadius:T.r, fontSize:"13px", fontWeight:"600", fontFamily:T.font, cursor:loading?"not-allowed":"pointer" }}>
                {loading ? "Guardando..." : "Guardar contraseña"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Shell principal ──────────────────────────────────────────
const SUSPENSE_FB = <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Cargando módulo...</div>;

export default function MinivacShell() {
  const [user,       setUser]       = useState(null);
  const [activo,     setActivo]     = useState(null);
  const [col,        setCol]        = useState(true);
  const [checking,   setChecking]   = useState(true);
  const [mustChange, setMustChange] = useState(false);
  const [showCambiarClave, setShowCambiarClave] = useState(false);
  const [notifPanel, setNotifPanel] = useState(false);
  const initialLeadIdRef = useRef(null);
  const [verifLeadId, setVerifLeadId] = useState(null);
  const [chatAlertas, limpiarAlertas] = useChatAlertas(user);
  const [agentStatus, setAgentStatus] = useState("offline");
  const [newCallPhone, setNewCallPhone] = useState("");
  const CALL_ROLES = ["vendedor", "supervisor", "admin", "director", "especialista_radio", "cs", "cs_gerente", "vlo", "agente_reservas"];
  const canReceiveCalls = user && CALL_ROLES.includes(user.rol);
  const twilioEnabled = canReceiveCalls && (agentStatus === "available" || agentStatus === "on_call" || agentStatus === "paused");
  const twilio = useTwilioDevice(user ? user.id : null, twilioEnabled);

  // Sesión persistente
  useEffect(() => {
    SB.auth.getSession().then(res => {
      if (res.data?.session) {
        SB.from("usuarios").select("*")
          .eq("auth_id", res.data.session.user.id)
          .eq("activo", true)
          .single()
          .then(perfil => {
            if (perfil.data) {
              setUser({ id: perfil.data.id, nombre: perfil.data.nombre, email: perfil.data.email || res.data.session.user.email, rol: perfil.data.rol });
            }
            setChecking(false);
          });
      } else {
        setChecking(false);
      }
    });

    const sub = SB.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setUser(null); setActivo(null); }
    });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  function handleLogin(u, mustChangePwd) { setUser(u); setActivo(null); if (mustChangePwd) setMustChange(true); }
  function handleLogout() { SB.auth.signOut().then(() => { setUser(null); setActivo(null); }); }
  function handleNav(id) { if (user && tieneAcceso(user, id)) setActivo(id); }

  if (checking) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: T.font }}>
      <div style={{ fontSize: "13px", color: T.t4 }}>Cargando...</div>
    </div>
  );

  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (mustChange) return <CambiarClaveModal forzado={true} onClose={()=>{ setMustChange(false); }} />;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, fontSize: "13px", color: T.t2, display: "flex", flexDirection: "column" }}>

      {showCambiarClave && <CambiarClaveModal forzado={false} onClose={()=>setShowCambiarClave(false)} />}

      {/* Popup nuevo mensaje */}
      {chatAlertas.length > 0 && !notifPanel && (
        <div style={{ position: "fixed", top: "16px", right: "16px", zIndex: 9999, maxWidth: "320px" }}>
          {chatAlertas.slice(-1).map((a, i) => (
            <div key={i} onClick={() => { setActivo("comms"); limpiarAlertas(); }}
              style={{ background: "linear-gradient(135deg,#1a3a5c,#1e4d7b)", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", display: "flex", gap: "12px", alignItems: "flex-start", cursor: "pointer" }}>
              <span style={{ fontSize: "20px" }}>💬</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: "700", fontSize: "13px" }}>{a.leadNombre} escribió</div>
                <div style={{ color: "#93c5fd", fontSize: "12px", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.mensaje}</div>
                <div style={{ color: "#bfdbfe", fontSize: "11px", marginTop: "4px" }}>Toca para abrir →</div>
              </div>
              <button onClick={e => { e.stopPropagation(); limpiarAlertas(); }}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "6px", padding: "2px 8px", cursor: "pointer", fontSize: "11px" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Panel de notificaciones */}
      {notifPanel && (
        <div style={{ position: "fixed", top: "56px", right: "16px", zIndex: 9999, background: "#fff", borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.2)", width: "320px", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg,#1a3a5c,#0f2340)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#fff", fontWeight: "700", fontSize: "14px" }}>🔔 Notificaciones</span>
            <div style={{ display: "flex", gap: "8px" }}>
              {chatAlertas.length > 0 && <button onClick={limpiarAlertas} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", fontSize: "11px" }}>Limpiar</button>}
              <button onClick={() => setNotifPanel(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", fontSize: "11px" }}>✕</button>
            </div>
          </div>
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {chatAlertas.length === 0 && (
              <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🔕</div>Sin notificaciones
              </div>
            )}
            {chatAlertas.map((a, i) => (
              <div key={i} onClick={() => { setActivo("comms"); limpiarAlertas(); setNotifPanel(false); }}
                style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", display: "flex", gap: "12px", alignItems: "flex-start" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <span style={{ fontSize: "20px" }}>💬</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", fontSize: "13px", color: "#1a3a5c" }}>{a.leadNombre}</div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{a.mensaje}</div>
                  <div style={{ fontSize: "11px", color: "#3b82f6", marginTop: "3px" }}>Abrir en Comunicaciones →</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <IncomingCallModal
        incomingCall={twilio.incomingCall}
        activeCall={twilio.activeCall}
        callDuration={twilio.callDuration}
        onAccept={function () {
          twilio.acceptCall();
          // Check if caller is a new lead — open form with pre-filled phone
          // Skip for internal calls (agent-to-agent)
          var params = twilio.incomingCall ? twilio.incomingCall.parameters || {} : {};
          var callerNum = params.From || "";
          if (callerNum && !callerNum.startsWith("client:") && !callerNum.startsWith("agent_")) {
            var cleanNum = callerNum.replace(/[^\d+]/g, "");
            var searchNum = cleanNum.replace("+", "").slice(-10);
            fetch("https://gsvnvahrjgswwejnuiyn.supabase.co/rest/v1/leads?tel=ilike.*" + searchNum + "&select=id,nombre&limit=1", {
              headers: { apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxNTA0MiwiZXhwIjoyMDg4NTkxMDQyfQ.-P8KH6yhs6AJ1lUwBrwUpcoZV3KGvM7fDlFM3RsYKxw",
                Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxNTA0MiwiZXhwIjoyMDg4NTkxMDQyfQ.-P8KH6yhs6AJ1lUwBrwUpcoZV3KGvM7fDlFM3RsYKxw" }
            }).then(function (r) { return r.json(); }).then(function (data) {
              if (Array.isArray(data) && data.length > 0 && data[0].nombre && data[0].nombre.trim() !== "") {
                // Known lead — open their profile in seller CRM
                initialLeadIdRef.current = data[0].id;
                setActivo("seller");
              } else {
                // New or unnamed lead — open seller CRM with new lead form
                setNewCallPhone(callerNum);
                setActivo("seller");
              }
            });
          }
        }}
        onReject={twilio.rejectCall}
        onHangUp={twilio.hangUp}
        onMute={twilio.toggleMute}
        onTransfer={twilio.transferCall}
      />
      <Topbar user={user} activo={activo} chatAlertas={chatAlertas} setNotifPanel={setNotifPanel} agentStatusBar={canReceiveCalls ? <AgentStatusBar currentUser={user} onStatusChange={setAgentStatus} /> : null} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: "0" }}>
        <Sidebar user={user} activo={activo} col={col} onNav={handleNav} onToggleCol={() => setCol(!col)} onLogout={handleLogout} onCambiarClave={() => setShowCambiarClave(true)} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", background: T.bg, minHeight: "0" }}>
          {!activo && <Bienvenida user={user} onNav={handleNav} />}

          <Suspense fallback={SUSPENSE_FB}>
            {activo === "dashboard"    && <ExecutiveSuite currentUser={user} onVerLead={function(leadId){ setVerifLeadId(leadId); setActivo("verificacion"); }} />}
            {activo === "radio"        && <RadioModule isSupervisor={["admin","director","supervisor","especialista_radio"].includes(user.rol)} isReadOnly={user.rol === "contador"} />}
            {activo === "kb"           && <KnowledgeBase currentUser={user} />}
            {activo === "comms"        && <CommunicationsHub currentUser={user} destCatalog={[]} onVerLead={(lead) => { initialLeadIdRef.current = lead.id; setActivo("seller"); }} />}
            {activo === "seller"       && <SellerCRM currentUser={user} initialLeadId={initialLeadIdRef.current} newCallPhone={newCallPhone} />}
            {activo === "verificacion" && <VerificationModule currentUser={user} initialLeadId={verifLeadId} />}
            {activo === "reservas"     && <Reservaciones currentUser={user} />}
            {activo === "cs"           && <CSReservas currentUser={user} />}
            {activo === "welcome"     && <WelcomeCalls currentUser={user} />}
            {activo === "retencion"  && <RetencionQueue currentUser={user} />}
            {activo === "destinos"     && <DestinationsModule />}
            {activo === "hoteles"      && <HotelsModule />}
            {/* paquetes eliminado */}
            {activo === "comisiones"   && <CommissionsModule currentUser={user} />}
            {activo === "usuarios"     && <RolesPermissions currentUser={user} />}
            {activo === "telefonia"    && <TelephonyMgmt currentUser={user} />}
            {activo === "telefono"     && <AgentPhone currentUser={user} onMakeCall={twilio.makeCall} isRegistered={twilio.isRegistered} />}
            {activo === "automatizaciones" && <AutomationsModule />}
            {activo === "portal"       && <ClientPortal />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
