import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// =====================================================================
// SUPABASE CLIENT
// =====================================================================
var SUPABASE_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";

var supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// =====================================================================
// ROLES CONFIG
// =====================================================================
var ROLES = {
  admin:       { label:"Administrador", color:"#f87171", bg:"rgba(248,113,113,0.1)",  border:"rgba(248,113,113,0.25)" },
  director:    { label:"Director",      color:"#c084fc", bg:"rgba(192,132,252,0.1)",  border:"rgba(192,132,252,0.25)" },
  supervisor:  { label:"Supervisor",    color:"#fbbf24", bg:"rgba(251,191,36,0.1)",   border:"rgba(251,191,36,0.25)"  },
  verificador: { label:"Verificador",   color:"#818cf8", bg:"rgba(129,140,248,0.1)",  border:"rgba(129,140,248,0.25)" },
  vendedor:    { label:"Vendedor",      color:"#4ade80", bg:"rgba(74,222,128,0.1)",   border:"rgba(74,222,128,0.25)"  },
  cs:          { label:"CS",            color:"#60a5fa", bg:"rgba(96,165,250,0.1)",   border:"rgba(96,165,250,0.25)"  },
};

// =====================================================================
// STYLES
// =====================================================================
var S = {
  wrap:  { minHeight:"100vh", background:"#07090f", color:"#e2e8f0", fontFamily:"'DM Sans','Segoe UI',sans-serif" },
  label: { fontSize:"11px", color:"#64748b", marginBottom:"4px", fontWeight:"500" },
  input: { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"9px", padding:"10px 14px", color:"#e2e8f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
  card:  { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"20px", padding:"32px", boxShadow:"0 24px 64px rgba(0,0,0,0.4)" },
  sTitle:{ fontSize:"10px", fontWeight:"700", color:"#475569", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"12px" },
};

function btnS(v) {
  v = v || "primary";
  var m = {
    primary: { bg:"#4f46e5",               color:"#fff",    br:"transparent"           },
    ghost:   { bg:"rgba(255,255,255,0.05)", color:"#94a3b8", br:"rgba(255,255,255,0.1)" },
    danger:  { bg:"rgba(248,113,113,0.15)", color:"#f87171", br:"rgba(248,113,113,0.3)" },
    success: { bg:"rgba(74,222,128,0.15)",  color:"#4ade80", br:"rgba(74,222,128,0.3)"  },
  };
  var s = m[v] || m.primary;
  return { display:"inline-flex", alignItems:"center", gap:"7px", padding:"9px 18px", borderRadius:"9px", cursor:"pointer", fontSize:"13px", fontWeight:"600", background:s.bg, color:s.color, border:"1px solid "+s.br, transition:"all 0.18s", whiteSpace:"nowrap" };
}

// =====================================================================
// LOGIN SCREEN
// =====================================================================
function LoginScreen(props) {
  var onLogin  = props.onLogin;
  var onForgot = props.onForgot;
  var [email,    setEmail]    = useState("");
  var [password, setPassword] = useState("");
  var [error,    setError]    = useState("");
  var [loading,  setLoading]  = useState(false);
  var [showPw,   setShowPw]   = useState(false);

  async function handleLogin() {
    setError("");
    if (!email || !password) { setError("Completa todos los campos"); return; }
    setLoading(true);
    try {
      var authRes = await supabase.auth.signInWithPassword({ email: email, password: password });
      if (authRes.error) {
        setError("Correo o contrasena incorrectos");
        setLoading(false);
        return;
      }
      var perfilRes = await supabase
        .from("usuarios")
        .select("*")
        .eq("auth_id", authRes.data.user.id)
        .single();

      if (!perfilRes.data) {
        await supabase.auth.signOut();
        setError("Usuario sin perfil. Contacta al administrador.");
        setLoading(false);
        return;
      }
      if (!perfilRes.data.activo) {
        await supabase.auth.signOut();
        setError("Cuenta desactivada. Contacta al administrador.");
        setLoading(false);
        return;
      }
      var p = perfilRes.data;
      onLogin({ id:p.id, name:p.nombre, email:p.email, role:p.rol, active:p.activo, supervisorId:p.supervisor_id, createdAt:p.created_at?p.created_at.slice(0,10):"" });
    } catch(e) {
      setError("Error de conexion. Verifica tu internet.");
    }
    setLoading(false);
  }

  function handleKey(e) { if (e.key === "Enter") handleLogin(); }

  return (
    <div style={{minHeight:"100vh", background:"#07090f", display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'DM Sans','Segoe UI',sans-serif", padding:"20px", position:"relative", overflow:"hidden"}}>
      <div style={{position:"absolute", top:"-10%", left:"-5%", width:"500px", height:"500px", borderRadius:"50%",
        background:"radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)", pointerEvents:"none"}}/>
      <div style={{position:"absolute", bottom:"-10%", right:"-5%", width:"400px", height:"400px", borderRadius:"50%",
        background:"radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 70%)", pointerEvents:"none"}}/>

      <div style={{width:"100%", maxWidth:"400px", position:"relative", zIndex:1}}>
        <div style={{textAlign:"center", marginBottom:"36px"}}>
          <div style={{display:"inline-flex", alignItems:"center", justifyContent:"center",
            width:"64px", height:"64px", borderRadius:"20px", marginBottom:"16px",
            background:"linear-gradient(135deg,#4f46e5,#818cf8)",
            boxShadow:"0 8px 32px rgba(79,70,229,0.35)", fontSize:"22px", fontWeight:"900", color:"#fff"}}>MV</div>
          <div style={{fontSize:"26px", fontWeight:"800", color:"#f1f5f9", letterSpacing:"-0.02em"}}>Mini-Vac CRM</div>
          <div style={{fontSize:"13px", color:"#475569", marginTop:"4px"}}>Club Vacacional - Sistema Interno</div>
        </div>

        <div style={S.card}>
          <div style={{fontSize:"16px", fontWeight:"700", color:"#f1f5f9", marginBottom:"22px"}}>Iniciar sesion</div>

          <div style={{marginBottom:"14px"}}>
            <div style={S.label}>Correo electronico</div>
            <input style={S.input} type="email" placeholder="usuario@minivac.mx"
              value={email} onChange={function(e){setEmail(e.target.value);}} onKeyDown={handleKey} autoComplete="email"/>
          </div>

          <div style={{marginBottom:"20px"}}>
            <div style={S.label}>Contrasena</div>
            <div style={{position:"relative"}}>
              <input style={Object.assign({},S.input,{paddingRight:"52px"})}
                type={showPw?"text":"password"} placeholder="********"
                value={password} onChange={function(e){setPassword(e.target.value);}} onKeyDown={handleKey} autoComplete="current-password"/>
              <button onClick={function(){setShowPw(function(p){return !p;});}}
                style={{position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#475569", fontSize:"11px", fontWeight:"600", padding:"4px"}}>
                {showPw?"OCULTAR":"VER"}
              </button>
            </div>
          </div>

          {error&&(
            <div style={{padding:"10px 14px", borderRadius:"9px", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", color:"#f87171", fontSize:"13px", marginBottom:"16px"}}>
              {error}
            </div>
          )}

          <button style={Object.assign({},btnS("primary"),{width:"100%", justifyContent:"center", padding:"12px", fontSize:"14px", opacity:loading?0.7:1})}
            onClick={handleLogin} disabled={loading}>
            {loading?"Verificando...":"Ingresar"}
          </button>

          <button style={{background:"none", border:"none", cursor:"pointer", color:"#475569", fontSize:"12px", width:"100%", textAlign:"center", marginTop:"12px", padding:"4px", textDecoration:"underline"}}
            onClick={onForgot}>
            Olvidaste tu contrasena?
          </button>
        </div>

        <div style={{marginTop:"20px", padding:"14px 16px", borderRadius:"12px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{fontSize:"10px", fontWeight:"700", color:"#475569", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"8px"}}>Cuentas demo - click para autocompletar</div>
          {[
            ["admin@minivac.mx",       "Admin123!", "Admin"],
            ["directora@minivac.mx",   "Dir123!",   "Director"],
            ["msuperviso@minivac.mx",  "Super123!", "Supervisor"],
            ["verificador@minivac.mx", "Verif123!", "Verificador"],
            ["cvega@minivac.mx",       "Vend123!",  "Vendedor"],
          ].map(function(row){
            return (
              <div key={row[0]} style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"5px", cursor:"pointer", padding:"3px 0"}}
                onClick={function(){setEmail(row[0]); setPassword(row[1]);}}>
                <span style={{fontSize:"11px", color:"#64748b", fontFamily:"monospace"}}>{row[0]}</span>
                <span style={{fontSize:"10px", color:"#475569", background:"rgba(255,255,255,0.05)", padding:"1px 7px", borderRadius:"20px"}}>{row[2]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// FORGOT PASSWORD
// =====================================================================
function ForgotPassword(props) {
  var onBack    = props.onBack;
  var [step,    setStep]    = useState("email");
  var [email,   setEmail]   = useState("");
  var [error,   setError]   = useState("");
  var [loading, setLoading] = useState(false);

  async function handleSendReset() {
    setError("");
    if (!email) { setError("Ingresa tu correo"); return; }
    setLoading(true);
    try {
      var res = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/?reset=1"
      });
      if (res.error) { setError(res.error.message); }
      else { setStep("sent"); }
    } catch(e) { setError("Error de conexion."); }
    setLoading(false);
  }

  var cardStyle = { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"20px", padding:"32px", boxShadow:"0 24px 64px rgba(0,0,0,0.4)" };

  return (
    <div style={{minHeight:"100vh", background:"#07090f", display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'DM Sans','Segoe UI',sans-serif", padding:"20px"}}>
      <div style={{width:"100%", maxWidth:"400px"}}>
        <div style={{textAlign:"center", marginBottom:"32px"}}>
          <div style={{display:"inline-flex", alignItems:"center", justifyContent:"center",
            width:"64px", height:"64px", borderRadius:"20px", marginBottom:"16px",
            background:"linear-gradient(135deg,#4f46e5,#818cf8)", boxShadow:"0 8px 32px rgba(79,70,229,0.35)",
            fontSize:"22px", fontWeight:"900", color:"#fff"}}>MV</div>
          <div style={{fontSize:"24px", fontWeight:"800", color:"#f1f5f9"}}>Mini-Vac CRM</div>
          <div style={{fontSize:"13px", color:"#475569", marginTop:"4px"}}>Recuperar contrasena</div>
        </div>

        {step==="email"&&(
          <div style={cardStyle}>
            <div style={{fontSize:"16px", fontWeight:"700", color:"#f1f5f9", marginBottom:"6px"}}>Olvidaste tu contrasena?</div>
            <div style={{fontSize:"13px", color:"#64748b", marginBottom:"22px", lineHeight:1.6}}>
              Ingresa tu correo y te enviaremos un link para restablecerla.
            </div>
            <div style={{marginBottom:"16px"}}>
              <div style={S.label}>Correo electronico</div>
              <input style={S.input} type="email" placeholder="usuario@minivac.mx"
                value={email} onChange={function(e){setEmail(e.target.value);}}
                onKeyDown={function(e){if(e.key==="Enter")handleSendReset();}} autoFocus/>
            </div>
            {error&&<div style={{padding:"10px 14px", borderRadius:"9px", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.25)", color:"#f87171", fontSize:"13px", marginBottom:"14px"}}>{error}</div>}
            <button style={Object.assign({},btnS("primary"),{width:"100%", justifyContent:"center", padding:"12px", opacity:loading?0.7:1})}
              onClick={handleSendReset} disabled={loading}>
              {loading?"Enviando...":"Enviar link de recuperacion"}
            </button>
            <button style={Object.assign({},btnS("ghost"),{width:"100%", justifyContent:"center", marginTop:"10px"})} onClick={onBack}>
              Volver al login
            </button>
          </div>
        )}

        {step==="sent"&&(
          <div style={cardStyle}>
            <div style={{textAlign:"center", padding:"10px 0"}}>
              <div style={{width:"56px", height:"56px", borderRadius:"50%", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:"22px", fontWeight:"700", color:"#10b981"}}>OK</div>
              <div style={{fontSize:"16px", fontWeight:"700", color:"#f1f5f9", marginBottom:"8px"}}>Revisa tu correo</div>
              <div style={{fontSize:"13px", color:"#64748b", lineHeight:1.7, marginBottom:"24px"}}>
                Enviamos un link a <strong style={{color:"#818cf8"}}>{email}</strong>.<br/>
                Haz click en el link para restablecer tu contrasena.
              </div>
              <button style={Object.assign({},btnS("ghost"),{width:"100%", justifyContent:"center"})} onClick={onBack}>
                Volver al login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// SESSION PANEL
// =====================================================================
function SessionPanel(props) {
  var currentUser = props.currentUser;
  var onLogout    = props.onLogout;
  var r = ROLES[currentUser.role] || ROLES.vendedor;

  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  return (
    <div style={S.wrap}>
      <div style={{background:"rgba(10,14,26,0.97)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(255,255,255,0.06)",
        padding:"14px 28px", display:"flex", alignItems:"center", gap:"14px", position:"sticky", top:0, zIndex:100}}>
        <div style={{width:"32px", height:"32px", borderRadius:"9px", display:"flex", alignItems:"center", justifyContent:"center",
          background:r.bg, border:"1px solid "+r.border, fontSize:"13px", fontWeight:"700", color:r.color}}>
          {currentUser.name.charAt(0)}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:"13px", fontWeight:"600", color:"#f1f5f9"}}>{currentUser.name}</div>
          <div style={{fontSize:"11px", color:r.color}}>{r.label}</div>
        </div>
        <div style={{fontSize:"11px", padding:"3px 10px", borderRadius:"20px", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", color:"#10b981"}}>
          Conectado a Supabase
        </div>
        <button style={Object.assign({},btnS("ghost"),{padding:"6px 12px", fontSize:"12px"})} onClick={handleLogout}>
          Cerrar sesion
        </button>
      </div>

      <div style={{padding:"40px 28px", maxWidth:"600px", margin:"0 auto"}}>
        <div style={{marginBottom:"32px"}}>
          <div style={{fontSize:"22px", fontWeight:"800", color:"#f1f5f9", marginBottom:"4px"}}>
            Bienvenido, {currentUser.name.split(" ")[0]}
          </div>
          <div style={{fontSize:"13px", color:"#64748b"}}>
            Sesion activa como <span style={{color:r.color, fontWeight:"600"}}>{r.label}</span>
          </div>
        </div>

        <div style={{background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"20px", marginBottom:"16px"}}>
          <div style={S.sTitle}>Datos de sesion</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px"}}>
            <div><div style={S.label}>Nombre</div><div style={{fontSize:"14px",color:"#e2e8f0",fontWeight:"500"}}>{currentUser.name}</div></div>
            <div>
              <div style={S.label}>Rol</div>
              <span style={{display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:"600", color:r.color, background:r.bg, border:"1px solid "+r.border}}>
                {r.label}
              </span>
            </div>
            <div><div style={S.label}>Email</div><div style={{fontSize:"14px",color:"#e2e8f0",fontWeight:"500"}}>{currentUser.email}</div></div>
            <div><div style={S.label}>ID</div><div style={{fontSize:"10px",color:"#475569",fontFamily:"monospace"}}>{currentUser.id}</div></div>
          </div>
        </div>

        <div style={{padding:"12px 16px", borderRadius:"10px", background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.2)", fontSize:"12px", color:"#10b981"}}>
          Login real via Supabase Auth. La sesion se mantiene activa aunque cierres el navegador.
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// ROOT
// =====================================================================
export default function AuthModule() {
  var [currentUser, setCurrentUser] = useState(null);
  var [screen,      setScreen]      = useState("login");

  if (!currentUser && screen === "forgot") {
    return <ForgotPassword onBack={function(){setScreen("login");}}/>;
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={function(u){setCurrentUser(u);}}
        onForgot={function(){setScreen("forgot");}}
      />
    );
  }

  return (
    <SessionPanel
      currentUser={currentUser}
      onLogout={function(){setCurrentUser(null); setScreen("login");}}
    />
  );
}
