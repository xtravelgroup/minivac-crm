import { useState, useEffect } from "react";

// ================================================================
// AGENT PHONE — Softphone for internal/external calls
//
// Features:
//   - Agent directory (call any online agent)
//   - Dial pad for external phone numbers
//   - Recent calls list
// ================================================================

var SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
var SVC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxNTA0MiwiZXhwIjoyMDg4NTkxMDQyfQ.-P8KH6yhs6AJ1lUwBrwUpcoZV3KGvM7fDlFM3RsYKxw";
var HDR = { apikey: SVC_KEY, Authorization: "Bearer " + SVC_KEY, "Content-Type": "application/json" };

var C = {
  bg: "#f4f5f7", surface: "#fff", border: "#e3e6ea", borderL: "#edf0f3",
  t1: "#1a1f2e", t2: "#3d4554", t3: "#6b7280", t4: "#9ca3af",
  brand: "#1a385a", brandLt: "#eaf0f7",
  green: "#1a7f3c", greenBg: "#edf7ee", greenDot: "#22c55e",
  red: "#b91c1c", redBg: "#fef2f2", redDot: "#ef4444",
  amber: "#925c0a", amberBg: "#fef9e7", amberDot: "#f59e0b",
  blue: "#1565c0", blueBg: "#e8f0fe",
  gray: "#9ca3af", grayBg: "#f4f5f7",
  font: "'DM Sans','Segoe UI',-apple-system,sans-serif",
  r: "8px",
};

var STATUS_MAP = {
  available: { label: "Disponible", dot: "#22c55e" },
  on_call: { label: "En llamada", dot: "#ef4444" },
  paused: { label: "Pausa", dot: "#f59e0b" },
  offline: { label: "Desconectado", dot: "#9ca3af" },
};

export default function AgentPhone(props) {
  var currentUser = props.currentUser;
  var onMakeCall = props.onMakeCall; // function(to) — "agent_xxx" or phone number
  var isRegistered = props.isRegistered;

  var [view, setView] = useState("agents"); // "agents" | "dialpad" | "recents"
  var [agents, setAgents] = useState([]);
  var [recents, setRecents] = useState([]);
  var [dialNumber, setDialNumber] = useState("");
  var [search, setSearch] = useState("");
  var [calling, setCalling] = useState(false);

  // Load agents with status
  useEffect(function () {
    loadAgents();
    var iv = setInterval(loadAgents, 15000); // refresh every 15s
    return function () { clearInterval(iv); };
  }, []);

  function loadAgents() {
    // Get all active agents with their status
    Promise.all([
      fetch(SB_URL + "/rest/v1/usuarios?activo=eq.true&select=id,nombre,rol&order=nombre", { headers: HDR }).then(function (r) { return r.json(); }),
      fetch(SB_URL + "/rest/v1/agent_status?select=usuario_id,status,last_heartbeat", { headers: HDR }).then(function (r) { return r.json(); }),
    ]).then(function (results) {
      var users = results[0];
      var statuses = results[1];
      if (!Array.isArray(users)) return;

      var freshnessWindow = Date.now() - 5 * 60 * 1000;
      var merged = users
        .filter(function (u) { return currentUser && u.id !== currentUser.id; }) // exclude self
        .map(function (u) {
          var st = Array.isArray(statuses) ? statuses.find(function (s) { return s.usuario_id === u.id; }) : null;
          var isOnline = st && st.last_heartbeat && new Date(st.last_heartbeat).getTime() > freshnessWindow;
          return {
            id: u.id,
            nombre: u.nombre,
            rol: u.rol,
            status: isOnline ? (st.status || "offline") : "offline",
          };
        })
        .sort(function (a, b) {
          // Online first, then by name
          var order = { available: 0, on_call: 1, paused: 2, offline: 3 };
          var oa = order[a.status] !== undefined ? order[a.status] : 3;
          var ob = order[b.status] !== undefined ? order[b.status] : 3;
          if (oa !== ob) return oa - ob;
          return a.nombre.localeCompare(b.nombre);
        });
      setAgents(merged);
    });
  }

  // Load recent calls
  useEffect(function () {
    if (!currentUser) return;
    fetch(SB_URL + "/rest/v1/call_log?or=(agent_id.eq." + currentUser.id + ",from_number.ilike.*" + currentUser.id + "*)&order=started_at.desc&limit=20", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (data) { if (Array.isArray(data)) setRecents(data); });
  }, [currentUser]);

  function callAgent(agent) {
    if (!onMakeCall || calling) return;
    if (agent.status === "offline") {
      alert(agent.nombre + " esta desconectado.");
      return;
    }
    setCalling(true);
    onMakeCall("agent_" + agent.id);
    setTimeout(function () { setCalling(false); }, 2000);
  }

  function callNumber() {
    if (!onMakeCall || !dialNumber.trim() || calling) return;
    setCalling(true);
    onMakeCall(dialNumber.trim());
    setTimeout(function () { setCalling(false); setDialNumber(""); }, 2000);
  }

  function addDigit(d) {
    setDialNumber(function (prev) { return prev + d; });
  }

  // Filter agents by search
  var filteredAgents = agents.filter(function (a) {
    if (!search) return true;
    var s = search.toLowerCase();
    return a.nombre.toLowerCase().includes(s) || a.rol.toLowerCase().includes(s);
  });

  var onlineCount = agents.filter(function (a) { return a.status !== "offline"; }).length;

  var tabBtn = function (id, label) {
    var active = view === id;
    return (
      <button key={id} onClick={function () { setView(id); }}
        style={{
          flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer",
          background: active ? C.brand : "transparent", color: active ? "#fff" : C.t3,
          border: "none", borderRadius: 6, fontFamily: C.font,
        }}>
        {label}
      </button>
    );
  };

  if (!isRegistered) {
    return (
      <div style={{ padding: 24, fontFamily: C.font, color: C.t1 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Telefono</h1>
        <div style={{ background: C.amberBg, border: "1px solid " + C.amberDot, borderRadius: C.r, padding: 16, color: C.amber, fontSize: 13 }}>
          El telefono no esta activo. Cambia tu estado a <b>Disponible</b> para activar el dispositivo.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: C.font, color: C.t1, maxWidth: 500 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Telefono</h1>
        <p style={{ fontSize: 13, color: C.t3, margin: 0 }}>
          {onlineCount} agente{onlineCount !== 1 ? "s" : ""} en linea
        </p>
      </div>

      {/* View tabs */}
      <div style={{ display: "flex", gap: 4, background: C.grayBg, borderRadius: 8, padding: 3, marginBottom: 16 }}>
        {tabBtn("agents", "Agentes")}
        {tabBtn("dialpad", "Teclado")}
        {tabBtn("recents", "Recientes")}
      </div>

      {/* ── AGENTS VIEW ── */}
      {view === "agents" && (
        <div>
          <input
            type="text" placeholder="Buscar agente..."
            value={search} onChange={function (e) { setSearch(e.target.value); }}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid " + C.border, borderRadius: C.r, fontSize: 13, fontFamily: C.font, marginBottom: 12, boxSizing: "border-box" }}
          />
          <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, overflow: "hidden", maxHeight: 400, overflowY: "auto" }}>
            {filteredAgents.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: C.t4, fontSize: 13 }}>No se encontraron agentes</div>
            )}
            {filteredAgents.map(function (a) {
              var st = STATUS_MAP[a.status] || STATUS_MAP.offline;
              var isOffline = a.status === "offline";
              return (
                <div key={a.id}
                  onClick={function () { callAgent(a); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                    borderBottom: "1px solid " + C.borderL, cursor: isOffline ? "default" : "pointer",
                    opacity: isOffline ? 0.5 : 1,
                  }}
                  onMouseEnter={function (e) { if (!isOffline) e.currentTarget.style.background = C.brandLt; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = ""; }}>
                  {/* Avatar */}
                  <div style={{ position: "relative" }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", background: C.brandLt,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 700, color: C.brand,
                    }}>
                      {a.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div style={{
                      position: "absolute", bottom: 0, right: 0, width: 12, height: 12,
                      borderRadius: "50%", background: st.dot, border: "2px solid #fff",
                    }} />
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.t1 }}>{a.nombre}</div>
                    <div style={{ fontSize: 11, color: C.t4 }}>{a.rol} - {st.label}</div>
                  </div>
                  {/* Call button */}
                  {!isOffline && (
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", background: C.greenBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, cursor: "pointer",
                    }}>
                      {"\u{1F4DE}"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DIALPAD VIEW ── */}
      {view === "dialpad" && (
        <div>
          {/* Number display */}
          <div style={{
            background: C.surface, border: "1px solid " + C.border, borderRadius: C.r,
            padding: "16px 20px", marginBottom: 16, textAlign: "center",
          }}>
            <input
              type="text" value={dialNumber} onChange={function (e) { setDialNumber(e.target.value); }}
              placeholder="Numero de telefono"
              style={{
                width: "100%", border: "none", outline: "none", fontSize: 24, fontWeight: 700,
                textAlign: "center", fontFamily: "monospace", color: C.t1, background: "transparent",
              }}
            />
          </div>

          {/* Digit grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16, maxWidth: 280, margin: "0 auto 16px" }}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(function (d) {
              return (
                <button key={d} onClick={function () { addDigit(d); }}
                  style={{
                    width: "100%", height: 52, borderRadius: 12, border: "1px solid " + C.border,
                    background: C.surface, fontSize: 20, fontWeight: 600, cursor: "pointer",
                    fontFamily: C.font, color: C.t1,
                  }}
                  onMouseEnter={function (e) { e.currentTarget.style.background = C.grayBg; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = C.surface; }}>
                  {d}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={function () { setDialNumber(function (p) { return p.slice(0, -1); }); }}
              style={{
                width: 52, height: 52, borderRadius: "50%", border: "1px solid " + C.border,
                background: C.surface, fontSize: 18, cursor: "pointer", color: C.t3,
              }}>
              {"\u232B"}
            </button>
            <button onClick={callNumber} disabled={!dialNumber.trim() || calling}
              style={{
                width: 64, height: 64, borderRadius: "50%", border: "none",
                background: dialNumber.trim() ? C.greenDot : C.gray, color: "#fff",
                fontSize: 24, cursor: dialNumber.trim() ? "pointer" : "not-allowed",
                boxShadow: dialNumber.trim() ? "0 4px 12px rgba(34,197,94,0.4)" : "none",
              }}>
              {"\u{1F4DE}"}
            </button>
            <button onClick={function () { setDialNumber(""); }}
              style={{
                width: 52, height: 52, borderRadius: "50%", border: "1px solid " + C.border,
                background: C.surface, fontSize: 14, cursor: "pointer", color: C.t3, fontFamily: C.font,
              }}>
              AC
            </button>
          </div>
        </div>
      )}

      {/* ── RECENTS VIEW ── */}
      {view === "recents" && (
        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, overflow: "hidden", maxHeight: 450, overflowY: "auto" }}>
          {recents.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: C.t4, fontSize: 13 }}>Sin llamadas recientes</div>
          )}
          {recents.map(function (c) {
            var isMissed = c.status === "no-answer" || c.status === "canceled" || c.status === "busy";
            var isInternal = c.direction === "internal";
            var displayNum = c.direction === "inbound" ? c.from_number : (c.to_number || "--");
            var dirIcon = c.direction === "inbound" ? "\u2B07\uFE0F" : (c.direction === "outbound" ? "\u2B06\uFE0F" : "\u{1F504}");
            var durSecs = c.duration_secs || 0;
            var durStr = durSecs > 0 ? (Math.floor(durSecs / 60) + "m " + (durSecs % 60) + "s") : "--";
            var timeStr = c.started_at ? new Date(c.started_at).toLocaleString() : "--";

            return (
              <div key={c.id}
                onClick={function () {
                  if (displayNum && onMakeCall) {
                    if (isInternal && c.to_number && c.to_number.startsWith("agent_")) {
                      onMakeCall(c.to_number);
                    } else if (displayNum !== "--") {
                      onMakeCall(displayNum);
                    }
                  }
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  borderBottom: "1px solid " + C.borderL, cursor: "pointer",
                }}
                onMouseEnter={function (e) { e.currentTarget.style.background = C.brandLt; }}
                onMouseLeave={function (e) { e.currentTarget.style.background = ""; }}>
                <div style={{ fontSize: 18, width: 24, textAlign: "center" }}>{dirIcon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isMissed ? C.red : C.t1 }}>{displayNum}</div>
                  <div style={{ fontSize: 11, color: C.t4 }}>{timeStr} {isInternal ? "- Interna" : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: isMissed ? C.red : C.t2, fontWeight: 600 }}>
                    {isMissed ? "Perdida" : durStr}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
