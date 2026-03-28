import { useState, useEffect } from "react";

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

  var [ringTime, setRingTime] = useState(0);

  // Ring timer
  useEffect(function () {
    if (!incomingCall) { setRingTime(0); return; }
    var iv = setInterval(function () { setRingTime(function (p) { return p + 1; }); }, 1000);
    return function () { clearInterval(iv); };
  }, [incomingCall]);

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
  var callerNumber = callerParams.From || "Número desconocido";

  // ── INCOMING CALL (ringing)
  if (incomingCall && !activeCall) {
    return (
      <div style={overlay}>
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📞</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
            Llamada entrante
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1f2e", marginBottom: 4 }}>
            {callerNumber}
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
            }}>✕</button>
            <button onClick={onAccept} style={{
              width: 60, height: 60, borderRadius: "50%", border: "none",
              background: "#22c55e", color: "#fff", fontSize: 24, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(34,197,94,0.4)",
            }}>✓</button>
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
          background: "#1a1f2e", borderRadius: 16, padding: "16px 24px", minWidth: 280,
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
            {callerNumber}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={onMute} style={{
              width: 44, height: 44, borderRadius: "50%", border: "none",
              background: isMuted ? "#f59e0b" : "#374151", color: "#fff",
              fontSize: 16, cursor: "pointer",
            }}>{isMuted ? "🔇" : "🎤"}</button>
            <button onClick={onHangUp} style={{
              width: 44, height: 44, borderRadius: "50%", border: "none",
              background: "#ef4444", color: "#fff", fontSize: 16, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(239,68,68,0.4)",
            }}>📵</button>
          </div>

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
