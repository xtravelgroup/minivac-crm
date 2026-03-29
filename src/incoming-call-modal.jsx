import { useState, useEffect } from "react";

var SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
var SVC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxNTA0MiwiZXhwIjoyMDg4NTkxMDQyfQ.-P8KH6yhs6AJ1lUwBrwUpcoZV3KGvM7fDlFM3RsYKxw";
var HDR = { apikey: SVC_KEY, Authorization: "Bearer " + SVC_KEY, "Content-Type": "application/json" };

function fmtTime(secs) {
  var m = Math.floor(secs / 60);
  var s = secs % 60;
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

export default function IncomingCallModal(props) {
  var incomingCall = props.incomingCall;
  var activeCall = props.activeCall;
  var callDuration = props.callDuration || 0;
  var onAccept = props.onAccept;
  var onReject = props.onReject;
  var onHangUp = props.onHangUp;
  var onMute = props.onMute;
  var onTransfer = props.onTransfer;

  var [ringTime, setRingTime] = useState(0);
  var [showTransfer, setShowTransfer] = useState(false);
  var [agents, setAgents] = useState([]);
  var [transferring, setTransferring] = useState(false);

  // Ring timer
  useEffect(function () {
    if (!incomingCall) { setRingTime(0); return; }
    var iv = setInterval(function () { setRingTime(function (p) { return p + 1; }); }, 1000);
    return function () { clearInterval(iv); };
  }, [incomingCall]);

  // Load agents when transfer panel opens
  useEffect(function () {
    if (!showTransfer) return;
    // Fetch active agents (available or on_call)
    fetch(SB_URL + "/rest/v1/agent_status?status=in.(available,on_call,paused)&select=usuario_id,status", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (statuses) {
        if (!Array.isArray(statuses)) return;
        // Fetch user names
        var ids = statuses.map(function (s) { return s.usuario_id; });
        if (ids.length === 0) { setAgents([]); return; }
        fetch(SB_URL + "/rest/v1/usuarios?id=in.(" + ids.join(",") + ")&activo=eq.true&select=id,nombre,rol", { headers: HDR })
          .then(function (r) { return r.json(); })
          .then(function (users) {
            if (!Array.isArray(users)) return;
            var merged = users.map(function (u) {
              var st = statuses.find(function (s) { return s.usuario_id === u.id; });
              return { id: u.id, nombre: u.nombre, rol: u.rol, status: st ? st.status : "offline" };
            });
            setAgents(merged);
          });
      });
  }, [showTransfer]);

  // Reset transfer state when call ends
  useEffect(function () {
    if (!activeCall) {
      setShowTransfer(false);
      setTransferring(false);
    }
  }, [activeCall]);

  if (!incomingCall && !activeCall) return null;

  var overlay = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)", zIndex: 99999,
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  var card = {
    background: "#fff", borderRadius: 20, padding: "30px 36px", minWidth: 320,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center",
  };

  var callerParams = incomingCall ? incomingCall.parameters || {} : {};
  var callerNumber = callerParams.From || "Numero desconocido";
  var isInternal = callerNumber.startsWith("client:agent_");

  // For active call, try to get the remote party info
  if (activeCall && !incomingCall) {
    var activeParams = activeCall.parameters || {};
    callerNumber = activeParams.From || activeParams.To || callerNumber;
    isInternal = callerNumber.startsWith("client:agent_");
  }

  // Resolve internal caller name
  var [internalName, setInternalName] = useState("");
  useEffect(function () {
    if (!isInternal) { setInternalName(""); return; }
    var userId = callerNumber.replace("client:agent_", "");
    if (!userId) return;
    fetch(SB_URL + "/rest/v1/usuarios?id=eq." + userId + "&select=nombre,rol&limit=1", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          setInternalName(data[0].nombre || "Agente");
        }
      })
      .catch(function () {});
  }, [callerNumber, isInternal]);

  var displayName = isInternal ? (internalName || "Agente") : callerNumber;

  var statusDot = function (s) {
    if (s === "available") return "#22c55e";
    if (s === "on_call") return "#ef4444";
    if (s === "paused") return "#f59e0b";
    return "#9ca3af";
  };

  var statusLabel = function (s) {
    if (s === "available") return "Disponible";
    if (s === "on_call") return "En llamada";
    if (s === "paused") return "Pausa";
    return "Desconectado";
  };

  function doTransfer(agent) {
    if (!onTransfer || transferring) return;
    setTransferring(true);
    var identity = "agent_" + agent.id;
    onTransfer(identity, agent.nombre);
  }

  // ── INCOMING CALL (ringing)
  if (incomingCall && !activeCall) {
    return (
      <div style={overlay}>
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{"\u{1F4DE}"}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
            {isInternal ? "Llamada interna" : "Llamada entrante"}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1f2e", marginBottom: 4 }}>
            {displayName}
          </div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 24 }}>
            Sonando... {ringTime}s
          </div>

          {/* Ring animation */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
            {[0, 1, 2].map(function (i) {
              return <div key={i} style={{
                width: 10, height: 10, borderRadius: "50%", background: "#22c55e",
                animation: "pulse 1.2s ease-in-out infinite",
                animationDelay: (i * 0.2) + "s",
              }} />;
            })}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={onReject} style={{
              width: 60, height: 60, borderRadius: "50%", border: "none",
              background: "#ef4444", color: "#fff", fontSize: 24, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(239,68,68,0.4)",
            }}>{"\u2715"}</button>
            <button onClick={onAccept} style={{
              width: 60, height: 60, borderRadius: "50%", border: "none",
              background: "#22c55e", color: "#fff", fontSize: 24, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(34,197,94,0.4)",
            }}>{"\u2713"}</button>
          </div>

          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.3; transform: scale(0.8); }
              50% { opacity: 1; transform: scale(1.2); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // ── ACTIVE CALL (in progress)
  if (activeCall) {
    var isMuted = activeCall.isMuted ? activeCall.isMuted() : false;
    return (
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 99999 }}>
        <div style={{
          background: "#1a1f2e", borderRadius: 16, padding: "16px 24px", minWidth: 300,
          boxShadow: "0 8px 30px rgba(0,0,0,0.3)", color: "#fff",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>En llamada</span>
            <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", marginLeft: "auto" }}>
              {fmtTime(callDuration)}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14 }}>
            {displayName}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={onMute} title={isMuted ? "Activar mic" : "Silenciar"} style={{
              width: 44, height: 44, borderRadius: "50%", border: "none",
              background: isMuted ? "#f59e0b" : "#374151", color: "#fff",
              fontSize: 16, cursor: "pointer",
            }}>{isMuted ? "\u{1F507}" : "\u{1F3A4}"}</button>
            {onTransfer && (
              <button onClick={function () { setShowTransfer(!showTransfer); }} title="Transferir" style={{
                width: 44, height: 44, borderRadius: "50%", border: "none",
                background: showTransfer ? "#3b82f6" : "#374151", color: "#fff",
                fontSize: 16, cursor: "pointer",
              }}>{"\u{1F504}"}</button>
            )}
            <button onClick={onHangUp} title="Colgar" style={{
              width: 44, height: 44, borderRadius: "50%", border: "none",
              background: "#ef4444", color: "#fff", fontSize: 16, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(239,68,68,0.4)",
            }}>{"\u{1F4F5}"}</button>
          </div>

          {/* Transfer panel */}
          {showTransfer && (
            <div style={{ marginTop: 14, borderTop: "1px solid #374151", paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Transferir a:
              </div>
              {agents.length === 0 && (
                <div style={{ fontSize: 12, color: "#6b7280", padding: "8px 0" }}>Cargando agentes...</div>
              )}
              <div style={{ maxHeight: 180, overflowY: "auto" }}>
                {agents.map(function (a) {
                  return (
                    <div key={a.id} onClick={function () { doTransfer(a); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                        borderRadius: 8, cursor: transferring ? "not-allowed" : "pointer",
                        opacity: transferring ? 0.5 : 1,
                      }}
                      onMouseEnter={function (e) { if (!transferring) e.currentTarget.style.background = "#262d3d"; }}
                      onMouseLeave={function (e) { e.currentTarget.style.background = ""; }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusDot(a.status) }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{a.nombre}</div>
                        <div style={{ fontSize: 10, color: "#6b7280" }}>{a.rol} - {statusLabel(a.status)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {transferring && (
                <div style={{ fontSize: 12, color: "#3b82f6", marginTop: 8, fontWeight: 600 }}>Transfiriendo...</div>
              )}
            </div>
          )}

          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return null;
}
