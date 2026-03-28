import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ================================================================
// TELEPHONY MANAGEMENT MODULE — Mini-Vac Vacation Club CRM
//
// Tabs:
//   1. Agentes     — Gestion de cola, prioridad, habilitar/deshabilitar
//   2. Cola en vivo — Llamadas en espera y activas en tiempo real
//   3. Reportes    — Historial, KPIs, exportar CSV
// ================================================================

var SB_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co";
var ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";
var SVC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAxNTA0MiwiZXhwIjoyMDg4NTkxMDQyfQ.-P8KH6yhs6AJ1lUwBrwUpcoZV3KGvM7fDlFM3RsYKxw";
var HDR = { apikey: SVC_KEY, Authorization: "Bearer " + SVC_KEY, "Content-Type": "application/json" };
var SB = createClient(SB_URL, ANON_KEY);

// ─── Helpers ─────────────────────────────────────────────────
function today() { return new Date().toISOString().split("T")[0]; }
function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; }

function fmtTime(iso) {
  if (!iso) return "--";
  var d = new Date(iso);
  var h = d.getHours(), m = d.getMinutes();
  var ap = h >= 12 ? "PM" : "AM";
  return (h % 12 || 12) + ":" + ("0" + m).slice(-2) + " " + ap;
}
function fmtDur(s) {
  if (!s && s !== 0) return "--";
  var m = Math.floor(s / 60);
  return m > 0 ? (m + "m " + ("0" + (s % 60)).slice(-2) + "s") : (s + "s");
}
function fmtElapsed(iso) {
  if (!iso) return "--";
  var secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 0) secs = 0;
  var h = Math.floor(secs / 3600);
  var m = Math.floor((secs % 3600) / 60);
  var s = secs % 60;
  if (h > 0) return h + "h " + ("0" + m).slice(-2) + "m";
  if (m > 0) return m + "m " + ("0" + s).slice(-2) + "s";
  return s + "s";
}

// ─── Colors / Styles ─────────────────────────────────────────
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
  r: "8px", shadow: "0 1px 3px rgba(0,0,0,0.06)",
};

var STATUS_MAP = {
  available: { label: "Disponible", color: C.green, bg: C.greenBg, dot: C.greenDot },
  on_call:   { label: "En llamada", color: C.red, bg: C.redBg, dot: C.redDot },
  paused:    { label: "Pausa", color: C.amber, bg: C.amberBg, dot: C.amberDot },
  offline:   { label: "Desconectado", color: C.gray, bg: C.grayBg, dot: C.gray },
};

function StatusBadge(props) {
  var s = STATUS_MAP[props.status] || STATUS_MAP.offline;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 12, background: s.bg, fontSize: 11, fontWeight: 600, color: s.color }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
}

function StatCard(props) {
  return (
    <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, padding: "16px 20px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: C.t4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{props.label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: props.color || C.t1 }}>{props.value}</div>
      {props.sub && <div style={{ fontSize: 11, color: C.t4, marginTop: 2 }}>{props.sub}</div>}
    </div>
  );
}

// ─── AGENTES TAB ─────────────────────────────────────────────
function AgentesTab(props) {
  var queueAgents = props.queueAgents;
  var agentStatuses = props.agentStatuses;
  var usuarios = props.usuarios;
  var callCounts = props.callCounts;
  var onRefresh = props.onRefresh;
  var [adding, setAdding] = useState("");
  var [saving, setSaving] = useState(false);
  var tickRef = useRef(0);
  var [, setTick] = useState(0);

  // Tick every second to update elapsed time
  useEffect(function () {
    var iv = setInterval(function () { tickRef.current++; setTick(tickRef.current); }, 1000);
    return function () { clearInterval(iv); };
  }, []);

  // Agents NOT in queue
  var queueIds = queueAgents.map(function (q) { return q.usuario_id; });
  var available = usuarios.filter(function (u) { return u.activo && !queueIds.includes(u.id); });

  function addAgent() {
    if (!adding) return;
    setSaving(true);
    fetch(SB_URL + "/rest/v1/queue_agents", {
      method: "POST", headers: HDR,
      body: JSON.stringify({ usuario_id: adding, activo: true, prioridad: 5 }),
    }).then(function () { setSaving(false); setAdding(""); onRefresh(); });
  }

  function toggleActivo(qa) {
    fetch(SB_URL + "/rest/v1/queue_agents?id=eq." + qa.id, {
      method: "PATCH", headers: HDR,
      body: JSON.stringify({ activo: !qa.activo, updated_at: new Date().toISOString() }),
    }).then(function () { onRefresh(); });
  }

  function setPrioridad(qa, val) {
    fetch(SB_URL + "/rest/v1/queue_agents?id=eq." + qa.id, {
      method: "PATCH", headers: HDR,
      body: JSON.stringify({ prioridad: parseInt(val) || 5, updated_at: new Date().toISOString() }),
    }).then(function () { onRefresh(); });
  }

  function removeAgent(qa) {
    if (!confirm("Remover " + (qa._nombre || "agente") + " de la cola?")) return;
    fetch(SB_URL + "/rest/v1/queue_agents?id=eq." + qa.id, {
      method: "DELETE", headers: HDR,
    }).then(function () { onRefresh(); });
  }

  // Merge data
  var merged = queueAgents.map(function (qa) {
    var u = usuarios.find(function (x) { return x.id === qa.usuario_id; });
    var st = agentStatuses.find(function (x) { return x.usuario_id === qa.usuario_id; });
    return Object.assign({}, qa, {
      _nombre: u ? u.nombre : "?",
      _rol: u ? u.rol : "",
      _status: st ? st.status : "offline",
      _heartbeat: st ? st.last_heartbeat : null,
      _statusUpdated: st ? st.updated_at : null,
      _calls: callCounts[qa.usuario_id] || 0,
    });
  }).sort(function (a, b) { return a.prioridad - b.prioridad; });

  var thStyle = { padding: "10px 12px", fontSize: 11, fontWeight: 700, color: C.t4, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left", borderBottom: "2px solid " + C.border };
  var tdStyle = { padding: "10px 12px", fontSize: 13, color: C.t1, borderBottom: "1px solid " + C.borderL };

  return (
    <div>
      {/* Add agent */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
        <select value={adding} onChange={function (e) { setAdding(e.target.value); }} style={{ padding: "7px 10px", border: "1px solid " + C.border, borderRadius: C.r, fontSize: 13, flex: 1, maxWidth: 300, fontFamily: C.font }}>
          <option value="">Agregar agente a la cola...</option>
          {available.map(function (u) {
            return <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>;
          })}
        </select>
        <button onClick={addAgent} disabled={!adding || saving} style={{ padding: "7px 16px", background: adding ? C.brand : C.t4, color: "#fff", border: "none", borderRadius: C.r, fontSize: 13, fontWeight: 600, cursor: adding ? "pointer" : "not-allowed", fontFamily: C.font }}>
          + Agregar
        </button>
      </div>

      {/* Table */}
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={thStyle}>Prioridad</th>
              <th style={thStyle}>Agente</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Tiempo en estado</th>
              <th style={thStyle}>Llamadas hoy</th>
              <th style={thStyle}>Habilitado</th>
              <th style={thStyle}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {merged.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: C.t4, fontSize: 13 }}>No hay agentes en la cola. Agrega uno arriba.</td></tr>
            )}
            {merged.map(function (a) {
              return (
                <tr key={a.id} style={{ opacity: a.activo ? 1 : 0.5 }}>
                  <td style={tdStyle}>
                    <select value={a.prioridad} onChange={function (e) { setPrioridad(a, e.target.value); }} style={{ padding: "4px 8px", border: "1px solid " + C.border, borderRadius: 4, fontSize: 13, fontFamily: C.font, width: 60 }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return <option key={n} value={n}>{n}</option>; })}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{a._nombre}</div>
                    <div style={{ fontSize: 11, color: C.t4 }}>{a._rol}</div>
                  </td>
                  <td style={tdStyle}><StatusBadge status={a._status} /></td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 13, fontFamily: "monospace", color: C.t2 }}>{fmtElapsed(a._statusUpdated)}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{a._calls}</span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={function () { toggleActivo(a); }} style={{
                      padding: "4px 14px", borderRadius: 12, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: C.font,
                      background: a.activo ? C.greenBg : C.grayBg, color: a.activo ? C.green : C.gray,
                    }}>
                      {a.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={function () { removeAgent(a); }} style={{ padding: "4px 10px", background: "none", border: "1px solid " + C.redDot, borderRadius: 4, color: C.red, fontSize: 11, cursor: "pointer", fontFamily: C.font }}>
                      Remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── COLA EN VIVO TAB ────────────────────────────────────────
function ColaVivaTab(props) {
  var acdQueue = props.acdQueue;
  var activeCalls = props.activeCalls;
  var usuarios = props.usuarios;
  var tickRef = useRef(0);
  var [, setTick] = useState(0);

  useEffect(function () {
    var iv = setInterval(function () { tickRef.current++; setTick(tickRef.current); }, 1000);
    return function () { clearInterval(iv); };
  }, []);

  function getAgentName(id) {
    var u = usuarios.find(function (x) { return x.id === id; });
    return u ? u.nombre : "--";
  }

  var thStyle = { padding: "10px 12px", fontSize: 11, fontWeight: 700, color: C.t4, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left", borderBottom: "2px solid " + C.border };
  var tdStyle = { padding: "10px 12px", fontSize: 13, color: C.t1, borderBottom: "1px solid " + C.borderL };

  return (
    <div>
      {/* Ringing / Waiting */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.amberDot, animation: "pulse 1.5s infinite" }} />
          En espera / Timbrando ({acdQueue.length})
        </div>
        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={thStyle}>Numero</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Agente asignado</th>
                <th style={thStyle}>Intentos</th>
                <th style={thStyle}>Tiempo esperando</th>
              </tr>
            </thead>
            <tbody>
              {acdQueue.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: C.t4, fontSize: 13 }}>Sin llamadas en espera</td></tr>
              )}
              {acdQueue.map(function (q) {
                return (
                  <tr key={q.id}>
                    <td style={tdStyle}><span style={{ fontWeight: 600 }}>{q.from_number || "--"}</span></td>
                    <td style={tdStyle}>
                      <span style={{ padding: "3px 10px", borderRadius: 12, background: C.amberBg, color: C.amber, fontSize: 11, fontWeight: 600 }}>{q.status}</span>
                    </td>
                    <td style={tdStyle}>{getAgentName(q.current_agent_id)}</td>
                    <td style={tdStyle}>{q.attempt_count || 1}</td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace" }}>{fmtElapsed(q.ring_started_at || q.created_at)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active calls */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.greenDot }} />
          Llamadas activas ({activeCalls.length})
        </div>
        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={thStyle}>Numero</th>
                <th style={thStyle}>Agente</th>
                <th style={thStyle}>Duracion</th>
                <th style={thStyle}>Inicio</th>
              </tr>
            </thead>
            <tbody>
              {activeCalls.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: C.t4, fontSize: 13 }}>Sin llamadas activas</td></tr>
              )}
              {activeCalls.map(function (c) {
                return (
                  <tr key={c.id}>
                    <td style={tdStyle}><span style={{ fontWeight: 600 }}>{c.from_number || "--"}</span></td>
                    <td style={tdStyle}>{getAgentName(c.agent_id)}</td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", color: C.green, fontWeight: 700 }}>{fmtElapsed(c.answered_at || c.started_at)}</span>
                    </td>
                    <td style={tdStyle}>{fmtTime(c.started_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }`}</style>
    </div>
  );
}

// ─── REPORTES TAB ────────────────────────────────────────────
function ReportesTab(props) {
  var callLogs = props.callLogs;
  var usuarios = props.usuarios;
  var filters = props.filters;
  var setFilters = props.setFilters;
  var loading = props.loading;
  var isAdmin = props.isAdmin;

  function getAgentName(id) {
    var u = usuarios.find(function (x) { return x.id === id; });
    return u ? u.nombre : "--";
  }

  // KPIs
  var total = callLogs.length;
  var answered = callLogs.filter(function (c) { return c.status === "completed" && c.duration_secs > 0; }).length;
  var missed = callLogs.filter(function (c) { return c.status === "no-answer" || c.status === "canceled" || c.status === "busy"; }).length;
  var totalDur = callLogs.reduce(function (s, c) { return s + (c.duration_secs || 0); }, 0);
  var avgDur = answered > 0 ? Math.round(totalDur / answered) : 0;

  // Per-agent breakdown
  var agentMap = {};
  callLogs.forEach(function (c) {
    if (!c.agent_id) return;
    if (!agentMap[c.agent_id]) agentMap[c.agent_id] = { total: 0, answered: 0, dur: 0 };
    agentMap[c.agent_id].total++;
    if (c.status === "completed" && c.duration_secs > 0) {
      agentMap[c.agent_id].answered++;
      agentMap[c.agent_id].dur += (c.duration_secs || 0);
    }
  });

  function exportCSV() {
    var header = "Fecha,Hora,Direccion,De,Para,Agente,Estado,Duracion(s)\n";
    var rows = callLogs.map(function (c) {
      var d = c.started_at ? new Date(c.started_at) : null;
      return [
        d ? d.toISOString().split("T")[0] : "",
        d ? fmtTime(c.started_at) : "",
        c.direction || "",
        c.from_number || "",
        c.to_number || "",
        getAgentName(c.agent_id),
        c.status || "",
        c.duration_secs || 0,
      ].join(",");
    }).join("\n");
    var blob = new Blob([header + rows], { type: "text/csv" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "llamadas_" + today() + ".csv";
    a.click();
  }

  var STATUS_OPTS = ["", "completed", "no-answer", "canceled", "busy", "failed", "ringing", "in-progress"];
  var thStyle = { padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.t4, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left", borderBottom: "2px solid " + C.border };
  var tdStyle = { padding: "8px 10px", fontSize: 12, color: C.t1, borderBottom: "1px solid " + C.borderL };

  var statusColor = function (s) {
    if (s === "completed") return { bg: C.greenBg, color: C.green };
    if (s === "no-answer" || s === "canceled" || s === "busy") return { bg: C.redBg, color: C.red };
    if (s === "in-progress" || s === "ringing") return { bg: C.amberBg, color: C.amber };
    return { bg: C.grayBg, color: C.gray };
  };

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Total llamadas" value={total} />
        <StatCard label="Contestadas" value={answered} color={C.green} />
        <StatCard label="Perdidas" value={missed} color={C.red} />
        <StatCard label="Duracion promedio" value={fmtDur(avgDur)} color={C.blue} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <label style={{ fontSize: 11, color: C.t4, display: "block", marginBottom: 3 }}>Desde</label>
          <input type="date" value={filters.desde} onChange={function (e) { setFilters(Object.assign({}, filters, { desde: e.target.value })); }}
            style={{ padding: "6px 10px", border: "1px solid " + C.border, borderRadius: C.r, fontSize: 13, fontFamily: C.font }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: C.t4, display: "block", marginBottom: 3 }}>Hasta</label>
          <input type="date" value={filters.hasta} onChange={function (e) { setFilters(Object.assign({}, filters, { hasta: e.target.value })); }}
            style={{ padding: "6px 10px", border: "1px solid " + C.border, borderRadius: C.r, fontSize: 13, fontFamily: C.font }} />
        </div>
        {isAdmin && (
          <div>
            <label style={{ fontSize: 11, color: C.t4, display: "block", marginBottom: 3 }}>Agente</label>
            <select value={filters.agent_id || ""} onChange={function (e) { setFilters(Object.assign({}, filters, { agent_id: e.target.value })); }}
              style={{ padding: "6px 10px", border: "1px solid " + C.border, borderRadius: C.r, fontSize: 13, fontFamily: C.font }}>
              <option value="">Todos</option>
              {usuarios.filter(function (u) { return u.activo; }).map(function (u) {
                return <option key={u.id} value={u.id}>{u.nombre}</option>;
              })}
            </select>
          </div>
        )}
        <div>
          <label style={{ fontSize: 11, color: C.t4, display: "block", marginBottom: 3 }}>Estado</label>
          <select value={filters.status || ""} onChange={function (e) { setFilters(Object.assign({}, filters, { status: e.target.value })); }}
            style={{ padding: "6px 10px", border: "1px solid " + C.border, borderRadius: C.r, fontSize: 13, fontFamily: C.font }}>
            <option value="">Todos</option>
            {STATUS_OPTS.filter(Boolean).map(function (s) { return <option key={s} value={s}>{s}</option>; })}
          </select>
        </div>
        <div style={{ marginLeft: "auto", alignSelf: "flex-end" }}>
          <button onClick={exportCSV} style={{ padding: "7px 16px", background: C.brand, color: "#fff", border: "none", borderRadius: C.r, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: C.font }}>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Per-agent breakdown (admin only) */}
      {isAdmin && Object.keys(agentMap).length > 0 && (
        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 10 }}>Desglose por agente</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.keys(agentMap).map(function (aid) {
              var a = agentMap[aid];
              var avgD = a.answered > 0 ? Math.round(a.dur / a.answered) : 0;
              return (
                <div key={aid} style={{ background: C.brandLt, borderRadius: C.r, padding: "10px 16px", minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.brand, marginBottom: 4 }}>{getAgentName(aid)}</div>
                  <div style={{ fontSize: 12, color: C.t2 }}>
                    Total: <b>{a.total}</b> · Contest: <b>{a.answered}</b> · Prom: <b>{fmtDur(avgD)}</b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Call log table */}
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, overflow: "hidden" }}>
        {loading && <div style={{ padding: 20, textAlign: "center", color: C.t4 }}>Cargando...</div>}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={thStyle}>Fecha/Hora</th>
              <th style={thStyle}>Dir.</th>
              <th style={thStyle}>De</th>
              <th style={thStyle}>Para</th>
              <th style={thStyle}>Agente</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Duracion</th>
            </tr>
          </thead>
          <tbody>
            {callLogs.length === 0 && !loading && (
              <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: C.t4, fontSize: 13 }}>Sin registros</td></tr>
            )}
            {callLogs.map(function (c) {
              var sc = statusColor(c.status);
              return (
                <tr key={c.id}>
                  <td style={tdStyle}>
                    <div>{c.started_at ? new Date(c.started_at).toLocaleDateString() : "--"}</div>
                    <div style={{ fontSize: 11, color: C.t4 }}>{fmtTime(c.started_at)}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 16 }}>{c.direction === "inbound" ? "📞" : "📱"}</span>
                    <span style={{ fontSize: 11, color: C.t3, marginLeft: 4 }}>{c.direction === "inbound" ? "Entrada" : "Salida"}</span>
                  </td>
                  <td style={tdStyle}>{c.from_number || "--"}</td>
                  <td style={tdStyle}>{c.to_number || "--"}</td>
                  <td style={tdStyle}>{getAgentName(c.agent_id)}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: "3px 8px", borderRadius: 10, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600 }}>{c.status}</span>
                  </td>
                  <td style={tdStyle}>{fmtDur(c.duration_secs)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MAIN MODULE ─────────────────────────────────────────────
export default function TelephonyManagement(props) {
  var currentUser = props.currentUser;
  var ADMIN_ROLES = ["admin", "director", "supervisor"];
  var isAdmin = currentUser && ADMIN_ROLES.includes(currentUser.rol);

  var [tab, setTab] = useState("agentes");
  var [queueAgents, setQueueAgents] = useState([]);
  var [agentStatuses, setAgentStatuses] = useState([]);
  var [usuarios, setUsuarios] = useState([]);
  var [acdQueue, setAcdQueue] = useState([]);
  var [activeCalls, setActiveCalls] = useState([]);
  var [callLogs, setCallLogs] = useState([]);
  var [callCounts, setCallCounts] = useState({});
  var [loadingLogs, setLoadingLogs] = useState(false);
  var [filters, setFilters] = useState({ desde: daysAgo(7), hasta: today(), agent_id: "", status: "" });

  // If not admin, force to reportes tab and lock agent filter to self
  useEffect(function () {
    if (!isAdmin) {
      setTab("reportes");
      setFilters(function (f) { return Object.assign({}, f, { agent_id: currentUser.id }); });
    }
  }, [isAdmin]);

  // ── Load base data ──
  var loadData = useCallback(function () {
    // Queue agents
    fetch(SB_URL + "/rest/v1/queue_agents?order=prioridad.asc", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (Array.isArray(d)) setQueueAgents(d); });

    // Agent statuses
    fetch(SB_URL + "/rest/v1/agent_status?select=*", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (Array.isArray(d)) setAgentStatuses(d); });

    // Usuarios
    fetch(SB_URL + "/rest/v1/usuarios?activo=eq.true&order=nombre", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (Array.isArray(d)) setUsuarios(d); });

    // ACD queue (ringing/waiting)
    fetch(SB_URL + "/rest/v1/acd_queue?status=in.(ringing,waiting)&order=created_at.asc", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (Array.isArray(d)) setAcdQueue(d); });

    // Active calls (in-progress or ringing)
    fetch(SB_URL + "/rest/v1/call_log?status=in.(in-progress,ringing)&order=started_at.desc", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (Array.isArray(d)) setActiveCalls(d); });

    // Calls today per agent
    var todayStart = today() + "T00:00:00";
    fetch(SB_URL + "/rest/v1/call_log?started_at=gte." + todayStart + "&status=eq.completed&select=agent_id", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!Array.isArray(d)) return;
        var counts = {};
        d.forEach(function (c) { if (c.agent_id) counts[c.agent_id] = (counts[c.agent_id] || 0) + 1; });
        setCallCounts(counts);
      });
  }, []);

  useEffect(function () { loadData(); }, [loadData]);

  // ── Load call logs for reports ──
  useEffect(function () {
    setLoadingLogs(true);
    var url = SB_URL + "/rest/v1/call_log?order=started_at.desc&limit=500";
    if (filters.desde) url += "&started_at=gte." + filters.desde + "T00:00:00";
    if (filters.hasta) url += "&started_at=lte." + filters.hasta + "T23:59:59";
    if (filters.agent_id) url += "&agent_id=eq." + filters.agent_id;
    if (filters.status) url += "&status=eq." + filters.status;

    // If not admin, only show own calls
    if (!isAdmin && currentUser) {
      url += "&agent_id=eq." + currentUser.id;
    }

    fetch(url, { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (Array.isArray(d)) setCallLogs(d); setLoadingLogs(false); })
      .catch(function () { setLoadingLogs(false); });
  }, [filters, isAdmin]);

  // ── Realtime subscriptions ──
  useEffect(function () {
    var ch1 = SB.channel("tel_agent_status")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_status" }, function () { loadData(); })
      .subscribe();
    var ch2 = SB.channel("tel_acd_queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "acd_queue" }, function () { loadData(); })
      .subscribe();
    var ch3 = SB.channel("tel_call_log")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_log" }, function () { loadData(); })
      .subscribe();
    var ch4 = SB.channel("tel_queue_agents")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_agents" }, function () { loadData(); })
      .subscribe();

    return function () {
      SB.removeChannel(ch1);
      SB.removeChannel(ch2);
      SB.removeChannel(ch3);
      SB.removeChannel(ch4);
    };
  }, [loadData]);

  // ── Tabs config ──
  var TABS = isAdmin
    ? [
        { id: "agentes", label: "Agentes en Cola" },
        { id: "cola", label: "Cola en Vivo" },
        { id: "reportes", label: "Reportes" },
      ]
    : [
        { id: "reportes", label: "Mis Llamadas" },
      ];

  var tabStyle = function (id) {
    var active = tab === id;
    return {
      padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
      background: active ? C.brand : "transparent", color: active ? "#fff" : C.t3,
      border: "none", borderRadius: "6px 6px 0 0", fontFamily: C.font,
      borderBottom: active ? "2px solid " + C.brand : "2px solid transparent",
    };
  };

  return (
    <div style={{ padding: 24, fontFamily: C.font, color: C.t1 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: C.t1 }}>
          {isAdmin ? "Gestion de Telefonia" : "Mis Llamadas"}
        </h1>
        <p style={{ fontSize: 13, color: C.t3, margin: "4px 0 0" }}>
          {isAdmin ? "Administra la cola de llamadas, agentes y reportes" : "Historial de tus llamadas"}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid " + C.border, marginBottom: 20 }}>
        {TABS.map(function (t) {
          return <button key={t.id} style={tabStyle(t.id)} onClick={function () { setTab(t.id); }}>{t.label}</button>;
        })}
      </div>

      {/* Content */}
      {tab === "agentes" && isAdmin && (
        <AgentesTab
          queueAgents={queueAgents}
          agentStatuses={agentStatuses}
          usuarios={usuarios}
          callCounts={callCounts}
          onRefresh={loadData}
        />
      )}

      {tab === "cola" && isAdmin && (
        <ColaVivaTab
          acdQueue={acdQueue}
          activeCalls={activeCalls}
          usuarios={usuarios}
        />
      )}

      {tab === "reportes" && (
        <ReportesTab
          callLogs={callLogs}
          usuarios={usuarios}
          filters={filters}
          setFilters={setFilters}
          loading={loadingLogs}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
