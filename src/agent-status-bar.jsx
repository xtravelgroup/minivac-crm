import { useState, useEffect } from "react";
import { supabase as SB } from "./supabase";

var SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
var SVC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxNTA0MiwiZXhwIjoyMDg4NTkxMDQyfQ.-P8KH6yhs6AJ1lUwBrwUpcoZV3KGvM7fDlFM3RsYKxw";
var HDR = { apikey: SVC_KEY, Authorization: "Bearer " + SVC_KEY, "Content-Type": "application/json" };

var STATUS_CFG = {
  available: { label: "Disponible", color: "#1a7f3c", bg: "#eaf5ec", dot: "#22c55e" },
  on_call:   { label: "En llamada", color: "#dc2626", bg: "#fef0f0", dot: "#ef4444" },
  paused:    { label: "Pausa",      color: "#d97706", bg: "#fef9e7", dot: "#f59e0b" },
  offline:   { label: "Desconectado", color: "#9ca3af", bg: "#f4f5f7", dot: "#9ca3af" },
};

export default function AgentStatusBar(props) {
  var user = props.currentUser;
  if (!user || !user.id) return null;

  var [status, setStatus] = useState("offline");
  var [open, setOpen] = useState(false);
  var cfg = STATUS_CFG[status] || STATUS_CFG.offline;

  // Load current status
  useEffect(function () {
    fetch(SB_URL + "/rest/v1/agent_status?usuario_id=eq." + user.id + "&limit=1", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          setStatus(data[0].status || "offline");
        }
      });

    // Subscribe to realtime changes
    var channel = SB.channel("agent_status_" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_status", filter: "usuario_id=eq." + user.id }, function (payload) {
        if (payload.new && payload.new.status) {
          setStatus(payload.new.status);
        }
      })
      .subscribe();

    return function () { SB.removeChannel(channel); };
  }, [user.id]);

  function changeStatus(newStatus) {
    setOpen(false);
    setStatus(newStatus);

    fetch(SB_URL + "/rest/v1/agent_status?usuario_id=eq." + user.id, {
      method: "PATCH", headers: HDR,
      body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString(), last_heartbeat: new Date().toISOString() }),
    }).then(function (r) {
      if (!r.ok) {
        // Row doesn't exist, insert
        fetch(SB_URL + "/rest/v1/agent_status", {
          method: "POST", headers: Object.assign({}, HDR, { Prefer: "resolution=merge-duplicates" }),
          body: JSON.stringify({ usuario_id: user.id, status: newStatus, last_heartbeat: new Date().toISOString() }),
        });
      }
    });

    if (props.onStatusChange) props.onStatusChange(newStatus);
  }

  // Set offline on unmount
  useEffect(function () {
    function handleUnload() {
      navigator.sendBeacon && navigator.sendBeacon(
        SB_URL + "/rest/v1/agent_status?usuario_id=eq." + user.id,
        new Blob([JSON.stringify({ status: "offline", updated_at: new Date().toISOString() })], { type: "application/json" })
      );
    }
    window.addEventListener("beforeunload", handleUnload);
    return function () {
      window.removeEventListener("beforeunload", handleUnload);
      // Also try to set offline on component unmount
      fetch(SB_URL + "/rest/v1/agent_status?usuario_id=eq." + user.id, {
        method: "PATCH", headers: HDR,
        body: JSON.stringify({ status: "offline", updated_at: new Date().toISOString() }),
      });
    };
  }, [user.id]);

  var btnStyle = {
    display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
    border: "1px solid " + cfg.color + "44", borderRadius: 20, background: cfg.bg,
    cursor: "pointer", fontSize: 11, fontWeight: 600, color: cfg.color, position: "relative",
  };

  var dotStyle = { width: 8, height: 8, borderRadius: "50%", background: cfg.dot };

  var dropStyle = {
    position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#fff",
    border: "1px solid #e3e6ea", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
    padding: 4, zIndex: 9999, minWidth: 150,
  };

  var optStyle = function (s) {
    var c = STATUS_CFG[s];
    return {
      display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
      borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 600,
      color: c.color, background: status === s ? c.bg : "transparent",
    };
  };

  return (
    <div style={{ position: "relative" }}>
      <button style={btnStyle} onClick={function () { setOpen(!open); }}>
        <span style={dotStyle}></span>
        {cfg.label}
        <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
      </button>
      {open && (
        <div style={dropStyle}>
          {["available", "paused", "offline"].map(function (s) {
            var c = STATUS_CFG[s];
            return (
              <div key={s} style={optStyle(s)}
                onMouseEnter={function (e) { e.currentTarget.style.background = c.bg; }}
                onMouseLeave={function (e) { e.currentTarget.style.background = status === s ? c.bg : "transparent"; }}
                onClick={function () { changeStatus(s); }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot }}></span>
                {c.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
