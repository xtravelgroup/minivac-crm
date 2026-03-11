import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

// ─────────────────────────────────────────────────────────────
// registrarEvento — guarda un evento en lead_historial
// ─────────────────────────────────────────────────────────────
export async function registrarEvento(leadId, tipo, descripcion, detalle, usuario) {
  if (!leadId) return;
  var row = {
    lead_id:        leadId,
    tipo:           tipo,
    descripcion:    descripcion,
    detalle:        detalle || null,
    usuario_id:     usuario ? (usuario.auth_id || usuario.id || null) : null,
    usuario_nombre: usuario ? (usuario.nombre || usuario.name || "Sistema") : "Sistema",
  };
  var res = await supabase.from("lead_historial").insert(row);
  if (res.error) console.error("Error registrando evento:", res.error.message);
  return res;
}

// ─────────────────────────────────────────────────────────────
// useHistorial — hook para cargar historial de un lead
// ─────────────────────────────────────────────────────────────
export function useHistorial(leadId) {
  var [historial, setHistorial] = useState([]);
  var [loading,   setLoading]   = useState(false);

  function cargar() {
    if (!leadId) return;
    setLoading(true);
    supabase
      .from("lead_historial")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .then(function(res) {
        setLoading(false);
        if (res.data) setHistorial(res.data);
      });
  }

  useEffect(function() { cargar(); }, [leadId]);

  return { historial, loading, recargar: cargar };
}

// ─────────────────────────────────────────────────────────────
// ICONOS Y COLORES POR TIPO DE EVENTO
// ─────────────────────────────────────────────────────────────
export var TIPO_CONFIG = {
  status:  { icon: "🔄", label: "Status",   color: "#1565c0", bg: "#e8f0fe" },
  destino: { icon: "🗺️", label: "Destino",  color: "#1a7f3c", bg: "#edf7ee" },
  pago:    { icon: "💳", label: "Pago",     color: "#925c0a", bg: "#fffbe0" },
  nota:    { icon: "📝", label: "Nota",     color: "#6b7280", bg: "#f4f5f7" },
  datos:   { icon: "👤", label: "Datos",    color: "#7c3aed", bg: "#f3e8ff" },
  verif:   { icon: "✅", label: "Verif.",   color: "#1a7f3c", bg: "#edf7ee" },
  cobro:   { icon: "💰", label: "Cobro",    color: "#b91c1c", bg: "#fef2f2" },
  firma:   { icon: "✍️", label: "Firma",    color: "#0ea5e9", bg: "#e0f2fe" },
};

// ─────────────────────────────────────────────────────────────
// TablaHistorial — componente visual reutilizable
// ─────────────────────────────────────────────────────────────
export function TablaHistorial({ leadId, extraStyle }) {
  var { historial, loading } = useHistorial(leadId);

  var S = {
    wrap:  { background: "#ffffff", border: "1px solid #e3e6ea", borderRadius: 12, overflow: "hidden" },
    head:  { display: "grid", gridTemplateColumns: "90px 70px 1fr 100px", background: "#f4f5f7", padding: "8px 14px",
             fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em",
             borderBottom: "1px solid #e3e6ea" },
    row:   { display: "grid", gridTemplateColumns: "90px 70px 1fr 100px", padding: "9px 14px",
             borderBottom: "1px solid #f0f1f4", alignItems: "center", fontSize: 12 },
    pill:  function(tipo) {
      var c = TIPO_CONFIG[tipo] || { icon: "•", color: "#6b7280", bg: "#f4f5f7" };
      return { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20,
               fontSize: 10, fontWeight: 700, color: c.color, background: c.bg };
    },
    empty: { padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: 13 },
  };

  function fmtFecha(iso) {
    if (!iso) return "--";
    var d = new Date(iso);
    var dd = ("0" + d.getDate()).slice(-2);
    var mm = ("0" + (d.getMonth() + 1)).slice(-2);
    var hh = ("0" + d.getHours()).slice(-2);
    var mn = ("0" + d.getMinutes()).slice(-2);
    return dd + "/" + mm + " " + hh + ":" + mn;
  }

  return (
    <div style={Object.assign({}, S.wrap, extraStyle || {})}>
      {loading && <div style={S.empty}>Cargando historial...</div>}
      {!loading && historial.length === 0 && (
        <div style={S.empty}>Sin eventos registrados aún.</div>
      )}
      {!loading && historial.length > 0 && (
        <>
          <div style={S.head}>
            <span>Fecha</span>
            <span>Tipo</span>
            <span>Descripción</span>
            <span>Usuario</span>
          </div>
          {historial.map(function(ev) {
            var cfg = TIPO_CONFIG[ev.tipo] || TIPO_CONFIG.nota;
            return (
              <div key={ev.id} style={S.row}>
                <span style={{ color: "#9ca3af", fontSize: 11 }}>{fmtFecha(ev.created_at)}</span>
                <span>
                  <span style={S.pill(ev.tipo)}>{cfg.icon} {cfg.label}</span>
                </span>
                <span style={{ color: "#3d4554", lineHeight: 1.4 }}>{ev.descripcion}</span>
                <span style={{ color: "#9ca3af", fontSize: 11 }}>{ev.usuario_nombre || "—"}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
