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
  var activeQueue = props.activeQueue || "ventas";
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
      body: JSON.stringify({ usuario_id: adding, activo: true, prioridad: 5, queue: activeQueue }),
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

  // Split queue into queued/ringing vs active (answered)
  var waiting = acdQueue.filter(function (q) { return q.status === "queued" || q.status === "ringing"; });
  var active = acdQueue.filter(function (q) { return q.status === "answered"; });

  var thStyle = { padding: "10px 12px", fontSize: 11, fontWeight: 700, color: C.t4, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left", borderBottom: "2px solid " + C.border };
  var tdStyle = { padding: "10px 12px", fontSize: 13, color: C.t1, borderBottom: "1px solid " + C.borderL };

  var statusBadge = function (s) {
    if (s === "queued") return { bg: C.amberBg, color: C.amber, label: "En espera" };
    if (s === "ringing") return { bg: C.blueBg, color: C.blue, label: "Timbrando" };
    if (s === "answered") return { bg: C.greenBg, color: C.green, label: "En llamada" };
    return { bg: C.grayBg, color: C.gray, label: s };
  };

  return (
    <div>
      {/* Waiting / Ringing */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.amberDot, animation: "pulse 1.5s infinite" }} />
          En espera / Timbrando ({waiting.length})
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
              {waiting.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: C.t4, fontSize: 13 }}>Sin llamadas en espera</td></tr>
              )}
              {waiting.map(function (q) {
                var sb = statusBadge(q.status);
                return (
                  <tr key={q.id}>
                    <td style={tdStyle}><span style={{ fontWeight: 600 }}>{q.from_number || "--"}</span></td>
                    <td style={tdStyle}>
                      <span style={{ padding: "3px 10px", borderRadius: 12, background: sb.bg, color: sb.color, fontSize: 11, fontWeight: 600 }}>{sb.label}</span>
                    </td>
                    <td style={tdStyle}>{getAgentName(q.current_agent_id)}</td>
                    <td style={tdStyle}>{q.attempt_count || 0}</td>
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

      {/* Active calls (in-progress) */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.greenDot }} />
          Llamadas activas ({active.length})
        </div>
        <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={thStyle}>Numero</th>
                <th style={thStyle}>Agente</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {active.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: C.t4, fontSize: 13 }}>Sin llamadas activas</td></tr>
              )}
              {active.map(function (q) {
                return (
                  <tr key={q.id}>
                    <td style={tdStyle}><span style={{ fontWeight: 600 }}>{q.from_number || "--"}</span></td>
                    <td style={tdStyle}>{getAgentName(q.current_agent_id)}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: "3px 10px", borderRadius: 12, background: C.greenBg, color: C.green, fontSize: 11, fontWeight: 600 }}>En llamada</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", color: C.green, fontWeight: 700 }}>{fmtElapsed(q.ring_started_at || q.created_at)}</span>
                    </td>
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

// ─── RECORDING PLAYER ───────────────────────────────────────
function RecordingPlayer(props) {
  var recordingUrl = props.url;
  var [blobUrl, setBlobUrl] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(false);

  useEffect(function () {
    if (!recordingUrl) return;
    setLoading(true);
    setError(false);
    var proxyUrl = SB_URL + "/functions/v1/twilio-recording-proxy?url=" + encodeURIComponent(recordingUrl);
    fetch(proxyUrl)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.blob();
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setLoading(false);
      })
      .catch(function () {
        setError(true);
        setLoading(false);
      });
    return function () {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [recordingUrl]);

  if (loading) return <div style={{ fontSize: 12, color: C.t3, padding: "8px 0" }}>Cargando grabacion...</div>;
  if (error) return <div style={{ fontSize: 12, color: C.red, padding: "8px 0" }}>Error al cargar grabacion</div>;
  return <audio controls preload="auto" style={{ width: "100%" }} src={blobUrl} />;
}

// ─── SCORE BAR COMPONENT ────────────────────────────────────
function ScoreBar(props) {
  var label = props.label;
  var score = props.score;
  var max = props.max || 10;
  var obs = props.observacion;
  var pct = Math.round((score / max) * 100);
  var color = pct >= 70 ? C.green : pct >= 40 ? C.amber : C.red;
  var bg = pct >= 70 ? C.greenBg : pct >= 40 ? C.amberBg : C.redBg;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.t2 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: color }}>{score}/{max}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", borderRadius: 3, background: color, transition: "width 0.5s ease" }} />
      </div>
      {obs && <div style={{ fontSize: 11, color: C.t3, marginTop: 3, lineHeight: 1.4 }}>{obs}</div>}
    </div>
  );
}

// ─── AI ANALYSIS PANEL ──────────────────────────────────────
function AnalysisPanel(props) {
  var callId = props.callId;
  var hasRecording = props.hasRecording;
  var queue = props.queue;
  var [analysis, setAnalysis] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");
  var [showTranscript, setShowTranscript] = useState(false);
  var [transcript, setTranscript] = useState("");

  // Check for existing analysis on mount
  useEffect(function () {
    fetch(SB_URL + "/rest/v1/call_analysis?call_log_id=eq." + callId + "&select=*", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (Array.isArray(d) && d.length > 0) {
          setAnalysis(d[0].analysis);
          setTranscript(d[0].transcript || "");
        }
      })
      .catch(function () {});
  }, [callId]);

  function runAnalysis() {
    setLoading(true);
    setError("");
    fetch(SB_URL + "/functions/v1/call-analysis", {
      method: "POST",
      headers: HDR,
      body: JSON.stringify({ call_id: callId }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setAnalysis(d.analysis);
        setTranscript(d.transcript || "");
        setLoading(false);
      })
      .catch(function (e) { setError("Error de conexion: " + e.message); setLoading(false); });
  }

  if (!hasRecording) return null;

  // Only show for ventas queue
  if (queue && queue !== "ventas") return null;

  var ETAPA_LABELS = {
    apertura: "01 - Apertura",
    pivot: "02 - Pivot de Expectativa",
    calificacion: "03 - Calificacion",
    presentacion_paquete: "04 - Presentacion del Paquete",
    presentacion_precio: "05 - Presentacion del Precio",
    manejo_objeciones: "06 - Manejo de Objeciones",
    cierre: "07 - Cierre y Confirmacion",
  };

  var TONO_LABELS = {
    ideal: { label: "Ideal", color: C.green },
    profesional: { label: "Profesional", color: C.green },
    demasiado_emocionado: { label: "Demasiado emocionado", color: C.amber },
    frio: { label: "Frio", color: C.amber },
    agresivo: { label: "Agresivo", color: C.red },
    inseguro: { label: "Inseguro", color: C.red },
  };

  var RESULTADO_LABELS = {
    venta: { label: "Venta", color: C.green, bg: C.greenBg },
    no_venta: { label: "No venta", color: C.red, bg: C.redBg },
    callback: { label: "Callback", color: C.amber, bg: C.amberBg },
    no_califica: { label: "No califica", color: C.t3, bg: C.grayBg },
    "colgó": { label: "Colgo", color: C.red, bg: C.redBg },
  };

  // No analysis yet — show button
  if (!analysis) {
    return (
      <div style={{ marginTop: 16, padding: "16px", background: "#f8f4ff", borderRadius: C.r, border: "1px solid #c4b5fd" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#6d28d9", marginBottom: 8 }}>Analisis AI de Venta</div>
        {error && <div style={{ fontSize: 12, color: C.red, marginBottom: 8 }}>{error}</div>}
        <button onClick={runAnalysis} disabled={loading}
          style={{
            padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            background: loading ? "#ddd6fe" : "#7c3aed", color: "#fff", border: "none", borderRadius: 6,
            fontFamily: C.font, opacity: loading ? 0.7 : 1,
          }}>
          {loading ? "Analizando... (30-60 seg)" : "Analizar Llamada con AI"}
        </button>
        <div style={{ fontSize: 11, color: "#8b5cf6", marginTop: 6 }}>Transcribe y evalua la llamada segun el Guion Maestro de 7 Etapas</div>
      </div>
    );
  }

  // Has analysis — display it
  var a = analysis;
  var totalScore = a.puntaje_total || 0;
  var scoreColor = totalScore >= 70 ? C.green : totalScore >= 40 ? C.amber : C.red;
  var scoreBg = totalScore >= 70 ? C.greenBg : totalScore >= 40 ? C.amberBg : C.redBg;
  var tonoInfo = TONO_LABELS[a.tono_general] || { label: a.tono_general || "--", color: C.t3 };
  var resultInfo = RESULTADO_LABELS[a.resultado_llamada] || { label: a.resultado_llamada || "--", color: C.t3, bg: C.grayBg };

  return (
    <div style={{ marginTop: 16 }}>
      {/* Score header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: "16px 20px", background: scoreBg, borderRadius: C.r, border: "1px solid " + scoreColor + "33" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff", border: "3px solid " + scoreColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: scoreColor }}>{totalScore}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, marginBottom: 4 }}>Puntaje de Venta</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: resultInfo.bg, color: resultInfo.color }}>{resultInfo.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#f3f4f6", color: tonoInfo.color }}>Tono: {tonoInfo.label}</span>
            {a.duracion_efectiva && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "#f3f4f6", color: a.duracion_efectiva === "buena" ? C.green : C.amber }}>
                Duracion: {a.duracion_efectiva === "buena" ? "Buena" : a.duracion_efectiva === "muy_corta" ? "Muy corta" : "Muy larga"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {a.resumen && (
        <div style={{ fontSize: 13, color: C.t2, marginBottom: 16, lineHeight: 1.5, padding: "0 4px" }}>{a.resumen}</div>
      )}

      {/* Etapas breakdown */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 10 }}>Desglose por Etapa</div>
        {a.etapas && Object.keys(ETAPA_LABELS).map(function (key) {
          var etapa = a.etapas[key];
          if (!etapa) return null;
          return <ScoreBar key={key} label={ETAPA_LABELS[key]} score={etapa.puntaje || 0} observacion={etapa.observacion} />;
        })}
      </div>

      {/* Strengths & improvements */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {a.fortalezas && a.fortalezas.length > 0 && (
          <div style={{ padding: 12, background: C.greenBg, borderRadius: C.r, border: "1px solid " + C.green + "22" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 6, textTransform: "uppercase" }}>Fortalezas</div>
            {a.fortalezas.map(function (f, i) {
              return <div key={i} style={{ fontSize: 12, color: C.t2, marginBottom: 4, lineHeight: 1.4 }}>+ {f}</div>;
            })}
          </div>
        )}
        {a.areas_mejora && a.areas_mejora.length > 0 && (
          <div style={{ padding: 12, background: C.amberBg, borderRadius: C.r, border: "1px solid " + C.amber + "22" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 6, textTransform: "uppercase" }}>Areas de Mejora</div>
            {a.areas_mejora.map(function (f, i) {
              return <div key={i} style={{ fontSize: 12, color: C.t2, marginBottom: 4, lineHeight: 1.4 }}>- {f}</div>;
            })}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {a.recomendaciones && a.recomendaciones.length > 0 && (
        <div style={{ padding: 12, background: "#f8f4ff", borderRadius: C.r, border: "1px solid #c4b5fd", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6d28d9", marginBottom: 6, textTransform: "uppercase" }}>Recomendaciones</div>
          {a.recomendaciones.map(function (r, i) {
            return <div key={i} style={{ fontSize: 12, color: C.t2, marginBottom: 4, lineHeight: 1.4 }}>{i + 1}. {r}</div>;
          })}
        </div>
      )}

      {/* Supervisor analysis */}
      {a.analisis_supervisor && (
        <div style={{ padding: 12, background: C.blueBg, borderRadius: C.r, border: "1px solid " + C.blue + "33", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 6, textTransform: "uppercase" }}>Analisis para Supervisor</div>
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{a.analisis_supervisor}</div>
        </div>
      )}

      {/* Transcript toggle */}
      {transcript && (
        <div>
          <button onClick={function () { setShowTranscript(!showTranscript); }}
            style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: "none", border: "1px solid " + C.border, borderRadius: 6, color: C.t3, fontFamily: C.font }}>
            {showTranscript ? "Ocultar Transcripcion" : "Ver Transcripcion"}
          </button>
          {showTranscript && (
            <pre style={{ marginTop: 8, padding: 12, background: "#f9fafb", borderRadius: C.r, border: "1px solid " + C.border, fontSize: 11, color: C.t2, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>
              {transcript}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CALL DETAIL MODAL ──────────────────────────────────────
function CallDetailModal(props) {
  var call = props.call;
  var usuarios = props.usuarios;
  var onClose = props.onClose;
  if (!call) return null;

  function getAgentName(id) {
    var u = usuarios.find(function (x) { return x.id === id; });
    return u ? u.nombre : id || "--";
  }

  // Parse routing history from notes
  var history = [];
  try {
    if (call.notes) {
      var parsed = JSON.parse(call.notes);
      if (Array.isArray(parsed)) history = parsed;
    }
  } catch (_) {}

  var statusLabel = function (s) {
    if (s === "completed") return "Completada";
    if (s === "no-answer") return "Perdida";
    if (s === "canceled") return "Cancelada";
    if (s === "busy") return "Ocupado";
    if (s === "failed") return "Fallida";
    if (s === "ringing") return "Timbrando";
    if (s === "in-progress") return "En curso";
    return s || "--";
  };

  var resultDot = function (r) {
    if (r === "answered") return C.greenDot;
    return C.redDot;
  };
  var resultLabel = function (r) {
    if (r === "answered") return "Contestó";
    if (r === "no-answer") return "No contestó";
    if (r === "busy") return "Ocupado";
    return r || "Sin respuesta";
  };

  var overlay = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  var modal = {
    background: "#fff", borderRadius: 12, padding: 28, width: "90%", maxWidth: 600, maxHeight: "85vh", overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)", fontFamily: C.font,
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={function (e) { e.stopPropagation(); }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.t1 }}>Detalle de Llamada</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.t3 }}>✕</button>
        </div>

        {/* Call info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: C.t4, fontWeight: 600, marginBottom: 2 }}>ESTADO</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: call.status === "completed" ? C.green : call.status === "no-answer" ? C.red : C.t1 }}>{statusLabel(call.status)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.t4, fontWeight: 600, marginBottom: 2 }}>DURACIÓN</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{fmtDur(call.duration_secs)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.t4, fontWeight: 600, marginBottom: 2 }}>DE</div>
            <div style={{ fontSize: 14, color: C.t1 }}>{call.from_number || "--"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.t4, fontWeight: 600, marginBottom: 2 }}>PARA</div>
            <div style={{ fontSize: 14, color: C.t1 }}>{call.to_number || "--"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.t4, fontWeight: 600, marginBottom: 2 }}>INICIO</div>
            <div style={{ fontSize: 14, color: C.t1 }}>{call.started_at ? new Date(call.started_at).toLocaleString() : "--"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.t4, fontWeight: 600, marginBottom: 2 }}>AGENTE FINAL</div>
            <div style={{ fontSize: 14, color: C.t1 }}>{getAgentName(call.agent_id)}</div>
          </div>
        </div>

        {/* Recording player */}
        {call.recording_url && (
          <div style={{ marginBottom: 20, padding: "12px 16px", background: C.blueBg, borderRadius: C.r, border: "1px solid " + C.blue + "33" }}>
            <div style={{ fontSize: 11, color: C.blue, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Grabacion</div>
            <RecordingPlayer url={call.recording_url} />
          </div>
        )}

        {/* AI Analysis */}
        <AnalysisPanel callId={call.id} hasRecording={!!call.recording_url} queue={call.queue} />

        {/* Routing history timeline */}
        {history.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 12 }}>Historial de Enrutamiento ({history.length} intento{history.length > 1 ? "s" : ""})</div>
            <div style={{ position: "relative", paddingLeft: 24 }}>
              {/* Vertical line */}
              <div style={{ position: "absolute", left: 8, top: 6, bottom: 6, width: 2, background: C.border }} />
              {history.map(function (h, i) {
                return (
                  <div key={i} style={{ position: "relative", marginBottom: 16 }}>
                    {/* Dot */}
                    <div style={{ position: "absolute", left: -20, top: 4, width: 12, height: 12, borderRadius: "50%", background: resultDot(h.result), border: "2px solid #fff", boxShadow: "0 0 0 1px " + C.border }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>
                      {getAgentName(h.agent_id)}
                      <span style={{ fontWeight: 400, color: C.t3, marginLeft: 8 }}>{resultLabel(h.result)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.t4, marginTop: 2 }}>
                      {h.at ? new Date(h.at).toLocaleTimeString() : ""}
                      {h.duration > 0 ? " · " + fmtDur(h.duration) : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {history.length === 0 && (
          <div style={{ fontSize: 13, color: C.t4, fontStyle: "italic", marginTop: 16 }}>Sin historial de enrutamiento disponible</div>
        )}
      </div>
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
  var [selectedCall, setSelectedCall] = useState(null);
  var [scoreMap, setScoreMap] = useState({});

  // Load AI scores for all calls
  useEffect(function () {
    if (callLogs.length === 0) return;
    var ids = callLogs.filter(function (c) { return c.recording_url; }).map(function (c) { return c.id; });
    if (ids.length === 0) return;
    // Fetch in batches of 50 using call_log_id filter
    var batchSize = 50;
    var promises = [];
    for (var i = 0; i < ids.length; i += batchSize) {
      var batch = ids.slice(i, i + batchSize);
      var url = SB_URL + "/rest/v1/call_analysis?call_log_id=in.(" + batch.join(",") + ")&select=call_log_id,analysis";
      promises.push(fetch(url, { headers: HDR }).then(function (r) { return r.json(); }));
    }
    Promise.all(promises).then(function (results) {
      var map = {};
      results.forEach(function (arr) {
        if (Array.isArray(arr)) {
          arr.forEach(function (a) {
            if (a.analysis && a.analysis.puntaje_total !== undefined) {
              map[a.call_log_id] = a.analysis.puntaje_total;
            }
          });
        }
      });
      setScoreMap(map);
    });
  }, [callLogs]);

  function getAgentName(id) {
    var u = usuarios.find(function (x) { return x.id === id; });
    return u ? u.nombre : "--";
  }

  function getAttempts(c) {
    try {
      if (c.notes) {
        var parsed = JSON.parse(c.notes);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch (_) {}
    return 0;
  }

  var statusLabel = function (s) {
    if (s === "completed") return "Completada";
    if (s === "no-answer") return "Perdida";
    if (s === "canceled") return "Cancelada";
    if (s === "busy") return "Ocupado";
    if (s === "failed") return "Fallida";
    if (s === "ringing") return "Timbrando";
    if (s === "in-progress") return "En curso";
    return s || "--";
  };

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
    var header = "Fecha,Hora,Direccion,De,Para,Agente,Estado,Duracion(s),Intentos\n";
    var rows = callLogs.map(function (c) {
      var d = c.started_at ? new Date(c.started_at) : null;
      return [
        d ? d.toISOString().split("T")[0] : "",
        d ? fmtTime(c.started_at) : "",
        c.direction || "",
        c.from_number || "",
        c.to_number || "",
        getAgentName(c.agent_id),
        statusLabel(c.status),
        c.duration_secs || 0,
        getAttempts(c),
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
              <th style={thStyle}>Intentos</th>
              <th style={thStyle}>Duracion</th>
            </tr>
          </thead>
          <tbody>
            {callLogs.length === 0 && !loading && (
              <tr><td colSpan={8} style={{ padding: 30, textAlign: "center", color: C.t4, fontSize: 13 }}>Sin registros</td></tr>
            )}
            {callLogs.map(function (c) {
              var sc = statusColor(c.status);
              var attempts = getAttempts(c);
              return (
                <tr key={c.id} onClick={function () { setSelectedCall(c); }} style={{ cursor: "pointer" }}
                  onMouseEnter={function (e) { e.currentTarget.style.background = "#f8f9fb"; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = ""; }}>
                  <td style={tdStyle}>
                    <div>{c.started_at ? new Date(c.started_at).toLocaleDateString() : "--"}</div>
                    <div style={{ fontSize: 11, color: C.t4 }}>{fmtTime(c.started_at)}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 16 }}>{c.direction === "inbound" ? "\u{1F4DE}" : "\u{1F4F1}"}</span>
                    <span style={{ fontSize: 11, color: C.t3, marginLeft: 4 }}>{c.direction === "inbound" ? "Entrada" : "Salida"}</span>
                  </td>
                  <td style={tdStyle}>{c.from_number || "--"}</td>
                  <td style={tdStyle}>{c.to_number || "--"}</td>
                  <td style={tdStyle}>{getAgentName(c.agent_id)}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: "3px 8px", borderRadius: 10, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600 }}>{statusLabel(c.status)}</span>
                    {scoreMap[c.id] !== undefined && (
                      <span style={{ marginLeft: 6, padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 800,
                        background: scoreMap[c.id] >= 70 ? C.greenBg : scoreMap[c.id] >= 40 ? C.amberBg : C.redBg,
                        color: scoreMap[c.id] >= 70 ? C.green : scoreMap[c.id] >= 40 ? C.amber : C.red,
                      }}>{scoreMap[c.id]}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: attempts > 1 ? C.amber : C.t2 }}>{attempts || "--"}</span>
                  </td>
                  <td style={tdStyle}>{fmtDur(c.duration_secs)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Call detail modal */}
      {selectedCall && <CallDetailModal call={selectedCall} usuarios={usuarios} onClose={function () { setSelectedCall(null); }} />}
    </div>
  );
}

// ─── PERDIDAS TAB ───────────────────────────────────────────
function PerdidasTab(props) {
  var usuarios = props.usuarios;
  var activeQueue = props.activeQueue || "ventas";
  var [missedCalls, setMissedCalls] = useState([]);
  var [loading, setLoading] = useState(true);
  var [selectedCall, setSelectedCall] = useState(null);
  var [dateRange, setDateRange] = useState({ desde: daysAgo(30), hasta: today() });

  useEffect(function () {
    setLoading(true);
    var url = SB_URL + "/rest/v1/call_log?queue=eq." + activeQueue + "&status=eq.no-answer&direction=eq.inbound&order=started_at.desc&limit=500";
    if (dateRange.desde) url += "&started_at=gte." + dateRange.desde + "T00:00:00";
    if (dateRange.hasta) url += "&started_at=lte." + dateRange.hasta + "T23:59:59";

    fetch(url, { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) { setMissedCalls([]); setLoading(false); return; }

        // For each missed call, check if the same number called back and was answered
        var allNumbers = data.map(function (c) { return c.from_number; }).filter(Boolean);
        var uniqueNumbers = allNumbers.filter(function (n, i) { return allNumbers.indexOf(n) === i; });

        if (uniqueNumbers.length === 0) {
          setMissedCalls(data.map(function (c) { return Object.assign({}, c, { _resolved: false }); }));
          setLoading(false);
          return;
        }

        // Fetch completed inbound calls from these numbers
        var numbersParam = uniqueNumbers.map(function (n) { return '"' + n + '"'; }).join(",");
        fetch(SB_URL + "/rest/v1/call_log?status=eq.completed&direction=eq.inbound&from_number=in.(" + numbersParam + ")&duration_secs=gt.0&order=started_at.desc&limit=1000", { headers: HDR })
          .then(function (r) { return r.json(); })
          .then(function (completedData) {
            var resolvedNumbers = {};
            if (Array.isArray(completedData)) {
              completedData.forEach(function (c) {
                if (c.from_number) resolvedNumbers[c.from_number] = true;
              });
            }
            var enriched = data.map(function (c) {
              return Object.assign({}, c, { _resolved: !!resolvedNumbers[c.from_number] });
            });
            setMissedCalls(enriched);
            setLoading(false);
          });
      })
      .catch(function () { setLoading(false); });
  }, [dateRange, activeQueue]);

  function getAgentName(id) {
    var u = usuarios.find(function (x) { return x.id === id; });
    return u ? u.nombre : "--";
  }

  function getAttempts(c) {
    try {
      if (c.notes) {
        var parsed = JSON.parse(c.notes);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch (_) {}
    return 0;
  }

  var unresolved = missedCalls.filter(function (c) { return !c._resolved; });
  var resolved = missedCalls.filter(function (c) { return c._resolved; });

  var thStyle = { padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.t4, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left", borderBottom: "2px solid " + C.border };
  var tdStyle = { padding: "8px 10px", fontSize: 12, color: C.t1, borderBottom: "1px solid " + C.borderL };

  function renderTable(calls, emptyMsg) {
    return (
      <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={thStyle}>Fecha/Hora</th>
              <th style={thStyle}>Numero</th>
              <th style={thStyle}>Intentos</th>
              <th style={thStyle}>Agentes intentados</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: "center", color: C.t4, fontSize: 13 }}>{emptyMsg}</td></tr>
            )}
            {calls.map(function (c) {
              var attempts = getAttempts(c);
              return (
                <tr key={c.id} onClick={function () { setSelectedCall(c); }} style={{ cursor: "pointer" }}
                  onMouseEnter={function (e) { e.currentTarget.style.background = "#f8f9fb"; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = ""; }}>
                  <td style={tdStyle}>
                    <div>{c.started_at ? new Date(c.started_at).toLocaleDateString() : "--"}</div>
                    <div style={{ fontSize: 11, color: C.t4 }}>{fmtTime(c.started_at)}</div>
                  </td>
                  <td style={tdStyle}><span style={{ fontWeight: 600 }}>{c.from_number || "--"}</span></td>
                  <td style={tdStyle}><span style={{ fontWeight: 600, color: C.amber }}>{attempts || "--"}</span></td>
                  <td style={tdStyle}>{getAgentName(c.agent_id)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Total perdidas" value={missedCalls.length} color={C.red} />
        <StatCard label="Sin resolver" value={unresolved.length} color={C.red} sub="Cliente no volvio a llamar" />
        <StatCard label="Resueltas" value={resolved.length} color={C.green} sub="Cliente volvio y fue atendido" />
      </div>

      {/* Date filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "flex-end" }}>
        <div>
          <label style={{ fontSize: 11, color: C.t4, display: "block", marginBottom: 3 }}>Desde</label>
          <input type="date" value={dateRange.desde} onChange={function (e) { setDateRange(Object.assign({}, dateRange, { desde: e.target.value })); }}
            style={{ padding: "6px 10px", border: "1px solid " + C.border, borderRadius: C.r, fontSize: 13, fontFamily: C.font }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: C.t4, display: "block", marginBottom: 3 }}>Hasta</label>
          <input type="date" value={dateRange.hasta} onChange={function (e) { setDateRange(Object.assign({}, dateRange, { hasta: e.target.value })); }}
            style={{ padding: "6px 10px", border: "1px solid " + C.border, borderRadius: C.r, fontSize: 13, fontFamily: C.font }} />
        </div>
      </div>

      {loading && <div style={{ padding: 20, textAlign: "center", color: C.t4 }}>Cargando...</div>}

      {!loading && (
        <div>
          {/* Unresolved */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.redDot }} />
              Sin resolver ({unresolved.length})
            </div>
            {renderTable(unresolved, "No hay llamadas perdidas sin resolver")}
          </div>

          {/* Resolved */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.greenDot }} />
              Resueltas ({resolved.length})
            </div>
            {renderTable(resolved, "No hay llamadas perdidas resueltas")}
          </div>
        </div>
      )}

      {/* Call detail modal */}
      {selectedCall && <CallDetailModal call={selectedCall} usuarios={usuarios} onClose={function () { setSelectedCall(null); }} />}
    </div>
  );
}

// ─── RENDIMIENTO AI TAB ─────────────────────────────────────
function RendimientoTab(props) {
  var usuarios = props.usuarios;
  var activeQueue = props.activeQueue;
  var [fecha, setFecha] = useState(today());
  var [analyses, setAnalyses] = useState([]);
  var [callLogs, setCallLogs] = useState([]);
  var [loading, setLoading] = useState(false);
  var [selectedCall, setSelectedCall] = useState(null);

  useEffect(function () {
    setLoading(true);
    // Load call logs for the date with recordings
    var dayStart = fecha + "T00:00:00";
    var dayEnd = fecha + "T23:59:59";
    var logUrl = SB_URL + "/rest/v1/call_log?queue=eq." + activeQueue + "&started_at=gte." + dayStart + "&started_at=lte." + dayEnd + "&status=eq.completed&order=started_at.desc&limit=200";

    Promise.all([
      fetch(logUrl, { headers: HDR }).then(function (r) { return r.json(); }),
      fetch(SB_URL + "/rest/v1/call_analysis?select=*&order=created_at.desc&limit=500", { headers: HDR }).then(function (r) { return r.json(); }),
    ]).then(function (results) {
      var logs = Array.isArray(results[0]) ? results[0] : [];
      var allAnalyses = Array.isArray(results[1]) ? results[1] : [];
      setCallLogs(logs);
      // Filter analyses to match the day's call IDs
      var logIds = {};
      logs.forEach(function (l) { logIds[l.id] = true; });
      setAnalyses(allAnalyses.filter(function (a) { return logIds[a.call_log_id]; }));
      setLoading(false);
    }).catch(function () { setLoading(false); });
  }, [fecha, activeQueue]);

  function getAgentName(id) {
    var u = usuarios.find(function (x) { return x.id === id; });
    return u ? u.nombre : id ? id.slice(0, 8) + "..." : "--";
  }

  // Build per-agent stats from analyses
  var agentMap = {};
  analyses.forEach(function (a) {
    var call = callLogs.find(function (c) { return c.id === a.call_log_id; });
    if (!call || !call.agent_id) return;
    var aid = call.agent_id;
    if (!agentMap[aid]) agentMap[aid] = { calls: 0, totalScore: 0, scores: [], ventas: 0, analyses: [] };
    var score = a.analysis && a.analysis.puntaje_total ? a.analysis.puntaje_total : 0;
    agentMap[aid].calls++;
    agentMap[aid].totalScore += score;
    agentMap[aid].scores.push(score);
    if (a.analysis && a.analysis.resultado_llamada === "venta") agentMap[aid].ventas++;
    agentMap[aid].analyses.push({ analysis: a, call: call });
  });

  var agentStats = Object.keys(agentMap).map(function (aid) {
    var d = agentMap[aid];
    return {
      id: aid,
      name: getAgentName(aid),
      calls: d.calls,
      avg: Math.round(d.totalScore / d.calls),
      best: Math.max.apply(null, d.scores),
      worst: Math.min.apply(null, d.scores),
      ventas: d.ventas,
      analyses: d.analyses,
    };
  }).sort(function (a, b) { return b.avg - a.avg; });

  var totalAnalyzed = analyses.length;
  var totalCalls = callLogs.filter(function (c) { return c.recording_url; }).length;
  var avgScore = totalAnalyzed > 0 ? Math.round(analyses.reduce(function (s, a) { return s + (a.analysis && a.analysis.puntaje_total ? a.analysis.puntaje_total : 0); }, 0) / totalAnalyzed) : 0;
  var totalVentas = analyses.filter(function (a) { return a.analysis && a.analysis.resultado_llamada === "venta"; }).length;

  return (
    <div>
      {/* Date picker */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.t2 }}>Fecha:</label>
        <input type="date" value={fecha} onChange={function (e) { setFecha(e.target.value); }}
          style={{ padding: "6px 12px", border: "1px solid " + C.border, borderRadius: 6, fontSize: 13, fontFamily: C.font }} />
      </div>

      {loading && <div style={{ fontSize: 13, color: C.t3, padding: 20 }}>Cargando...</div>}

      {!loading && (
        <>
          {/* Summary KPIs */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="Llamadas con grabacion" value={totalCalls} />
            <StatCard label="Analizadas por AI" value={totalAnalyzed} color={totalAnalyzed > 0 ? "#7c3aed" : C.t3} />
            <StatCard label="Puntaje promedio" value={avgScore > 0 ? avgScore + "/100" : "--"} color={avgScore >= 70 ? C.green : avgScore >= 40 ? C.amber : avgScore > 0 ? C.red : C.t3} />
            <StatCard label="Ventas detectadas" value={totalVentas} color={C.green} />
          </div>

          {/* Per-agent performance table */}
          {agentStats.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 12 }}>Rendimiento por Vendedor</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid " + C.border }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: C.t4, fontWeight: 600, fontSize: 11 }}>VENDEDOR</th>
                    <th style={{ textAlign: "center", padding: "8px 12px", color: C.t4, fontWeight: 600, fontSize: 11 }}>LLAMADAS</th>
                    <th style={{ textAlign: "center", padding: "8px 12px", color: C.t4, fontWeight: 600, fontSize: 11 }}>PROMEDIO</th>
                    <th style={{ textAlign: "center", padding: "8px 12px", color: C.t4, fontWeight: 600, fontSize: 11 }}>MEJOR</th>
                    <th style={{ textAlign: "center", padding: "8px 12px", color: C.t4, fontWeight: 600, fontSize: 11 }}>PEOR</th>
                    <th style={{ textAlign: "center", padding: "8px 12px", color: C.t4, fontWeight: 600, fontSize: 11 }}>VENTAS</th>
                  </tr>
                </thead>
                <tbody>
                  {agentStats.map(function (ag) {
                    var avgColor = ag.avg >= 70 ? C.green : ag.avg >= 40 ? C.amber : C.red;
                    return (
                      <tr key={ag.id} style={{ borderBottom: "1px solid " + C.borderL }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: C.t1 }}>{ag.name}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: C.t2 }}>{ag.calls}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <span style={{ fontWeight: 800, color: avgColor, fontSize: 15 }}>{ag.avg}</span>
                          <span style={{ color: C.t4, fontSize: 11 }}>/100</span>
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: C.green, fontWeight: 600 }}>{ag.best}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: C.red, fontWeight: 600 }}>{ag.worst}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: C.green, fontWeight: 700 }}>{ag.ventas}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Individual analyzed calls */}
          {analyses.length > 0 && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 12 }}>Llamadas Analizadas</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {analyses.map(function (a) {
                  var call = callLogs.find(function (c) { return c.id === a.call_log_id; });
                  if (!call) return null;
                  var score = a.analysis ? a.analysis.puntaje_total || 0 : 0;
                  var scoreColor = score >= 70 ? C.green : score >= 40 ? C.amber : C.red;
                  var scoreBg = score >= 70 ? C.greenBg : score >= 40 ? C.amberBg : C.redBg;
                  var resultado = a.analysis ? a.analysis.resultado_llamada || "--" : "--";
                  var resultLabels = { venta: "Venta", no_venta: "No venta", callback: "Callback", no_califica: "No califica", "colgó": "Colgo" };
                  return (
                    <div key={a.id} onClick={function () { setSelectedCall(call); }}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: C.surface, border: "1px solid " + C.border, borderRadius: C.r, cursor: "pointer", transition: "box-shadow 0.15s" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: scoreBg, border: "2px solid " + scoreColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 900, color: scoreColor }}>{score}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{getAgentName(call.agent_id)}</div>
                        <div style={{ fontSize: 11, color: C.t3 }}>
                          {call.from_number || "--"} · {fmtDur(call.duration_secs)} · {fmtTime(call.started_at)}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 4, background: scoreBg, color: scoreColor }}>
                        {resultLabels[resultado] || resultado}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No data state */}
          {totalCalls === 0 && !loading && (
            <div style={{ textAlign: "center", padding: 40, color: C.t4 }}>
              <div style={{ fontSize: 14 }}>No hay llamadas con grabacion para esta fecha</div>
            </div>
          )}

          {totalCalls > 0 && totalAnalyzed === 0 && !loading && (
            <div style={{ textAlign: "center", padding: 40, color: C.t4 }}>
              <div style={{ fontSize: 14, marginBottom: 8 }}>Hay {totalCalls} llamadas con grabacion pero ninguna ha sido analizada</div>
              <div style={{ fontSize: 12 }}>Abre una llamada en Reportes y haz click en "Analizar Llamada con AI"</div>
            </div>
          )}
        </>
      )}

      {selectedCall && <CallDetailModal call={selectedCall} usuarios={usuarios} onClose={function () { setSelectedCall(null); }} />}
    </div>
  );
}

// ─── MAIN MODULE ─────────────────────────────────────────────
export default function TelephonyManagement(props) {
  var currentUser = props.currentUser;
  var ADMIN_ROLES = ["admin", "director", "supervisor", "cs_gerente"];
  var isAdmin = currentUser && ADMIN_ROLES.includes(currentUser.rol);

  var ALL_QUEUES = [
    { id: "ventas", label: "Sala A - Ventas" },
    { id: "cs", label: "Customer Service" },
    { id: "reservas", label: "Reservaciones" },
  ];

  // Queue access by role
  var rol = currentUser ? currentUser.rol : "";
  var QUEUES = ALL_QUEUES.filter(function (q) {
    if (rol === "admin" || rol === "director") return true;
    if (rol === "cs_gerente") return q.id === "ventas" || q.id === "cs";
    if (rol === "supervisor") return q.id === "ventas";
    return false;
  });

  var [activeQueue, setActiveQueue] = useState(QUEUES.length > 0 ? QUEUES[0].id : "ventas");
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
    // Queue agents — filtered by activeQueue
    fetch(SB_URL + "/rest/v1/queue_agents?queue=eq." + activeQueue + "&order=prioridad.asc", { headers: HDR })
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

    // ACD queue — filtered by activeQueue
    fetch(SB_URL + "/rest/v1/acd_queue?queue=eq." + activeQueue + "&status=in.(queued,ringing,answered)&order=created_at.asc", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (Array.isArray(d)) setAcdQueue(d); });

    // Active calls — filtered by activeQueue
    fetch(SB_URL + "/rest/v1/call_log?queue=eq." + activeQueue + "&status=in.(in-progress,ringing)&order=started_at.desc", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (Array.isArray(d)) setActiveCalls(d); });

    // Calls today per agent — filtered by activeQueue
    var todayStart = today() + "T00:00:00";
    fetch(SB_URL + "/rest/v1/call_log?queue=eq." + activeQueue + "&started_at=gte." + todayStart + "&status=eq.completed&select=agent_id", { headers: HDR })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!Array.isArray(d)) return;
        var counts = {};
        d.forEach(function (c) { if (c.agent_id) counts[c.agent_id] = (counts[c.agent_id] || 0) + 1; });
        setCallCounts(counts);
      });
  }, [activeQueue]);

  useEffect(function () { loadData(); }, [loadData]);

  // ── Load call logs for reports ──
  useEffect(function () {
    setLoadingLogs(true);
    var url = SB_URL + "/rest/v1/call_log?queue=eq." + activeQueue + "&order=started_at.desc&limit=500";
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
  }, [filters, isAdmin, activeQueue]);

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
        { id: "perdidas", label: "Perdidas" },
        { id: "rendimiento", label: "Rendimiento AI" },
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: C.t1 }}>
              {isAdmin ? "Gestion de Telefonia" : "Mis Llamadas"}
            </h1>
            <p style={{ fontSize: 13, color: C.t3, margin: "4px 0 0" }}>
              {isAdmin ? "Administra la cola de llamadas, agentes y reportes" : "Historial de tus llamadas"}
            </p>
          </div>
          {isAdmin && (
            <div style={{ display: "flex", gap: 4, background: C.grayBg, borderRadius: 8, padding: 3 }}>
              {QUEUES.map(function (q) {
                var isActive = activeQueue === q.id;
                return (
                  <button key={q.id} onClick={function () { setActiveQueue(q.id); }}
                    style={{
                      padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: C.font,
                      border: "none", borderRadius: 6,
                      background: isActive ? C.brand : "transparent",
                      color: isActive ? "#fff" : C.t3,
                      transition: "all 0.15s ease",
                    }}>
                    {q.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
          activeQueue={activeQueue}
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

      {tab === "perdidas" && isAdmin && (
        <PerdidasTab
          usuarios={usuarios}
          activeQueue={activeQueue}
        />
      )}

      {tab === "rendimiento" && isAdmin && (
        <RendimientoTab
          usuarios={usuarios}
          activeQueue={activeQueue}
        />
      )}
    </div>
  );
}
