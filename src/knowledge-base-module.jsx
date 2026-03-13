import { useState, useEffect } from "react";

const SB_URL   = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";

const SECCIONES_DEFAULT = [
  { key: "empresa",    label: "🏢 Sobre X Travel Group", placeholder: "Describe la empresa, misión, años de experiencia..." },
  { key: "como_funciona", label: "⚙️ Cómo Funciona", placeholder: "Explica el proceso: invitación, visita, presentación, beneficios..." },
  { key: "destinos",   label: "🗺️ Destinos y Hoteles", placeholder: "Lista los destinos disponibles, hoteles, noches incluidas..." },
  { key: "precios",    label: "💰 Precios y Paquetes", placeholder: "Rangos de precios, qué incluye cada paquete..." },
  { key: "politicas",  label: "📋 Políticas", placeholder: "Políticas de cancelación, cambios, requisitos..." },
  { key: "faq",        label: "❓ Preguntas Frecuentes", placeholder: "¿Hay obligación de compra? ¿Qué incluye la estadía?..." },
  { key: "tono",       label: "🎯 Instrucciones para la AI", placeholder: "Cómo debe hablar la AI: tono, qué decir, qué NO decir..." },
];

async function cargarKB() {
  const r = await fetch(`${SB_URL}/rest/v1/knowledge_base?select=*`, {
    headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
  });
  return r.json();
}

async function guardarSeccion(key, contenido) {
  // Upsert por key
  const r = await fetch(`${SB_URL}/rest/v1/knowledge_base`, {
    method: "POST",
    headers: {
      "apikey": ANON_KEY,
      "Authorization": `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({ key, contenido, updated_at: new Date().toISOString() })
  });
  return r.json();
}

export default function KnowledgeBaseModule({ currentUser }) {
  const [datos, setDatos]         = useState({});
  const [editando, setEditando]   = useState(null);
  const [borrador, setBorrador]   = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [preview, setPreview]     = useState(false);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      const rows = await cargarKB();
      const d = {};
      (rows || []).forEach(r => { d[r.key] = r.contenido; });
      setDatos(d);
    } catch(e) {}
    setLoading(false);
  }

  function editar(key) {
    setEditando(key);
    setBorrador(datos[key] || "");
    setGuardado(false);
  }

  async function guardar() {
    if (!editando) return;
    setGuardando(true);
    try {
      await guardarSeccion(editando, borrador);
      setDatos(prev => ({ ...prev, [editando]: borrador }));
      setGuardado(true);
      setTimeout(() => { setGuardado(false); setEditando(null); }, 1200);
    } catch(e) {}
    setGuardando(false);
  }

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "director";

  const totalCaracteres = Object.values(datos).join("").length;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#1a3a5c" }}>🧠 Knowledge Base</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
            La AI usa esta información para responder en el chat y generar emails · {totalCaracteres.toLocaleString()} caracteres cargados
          </p>
        </div>
        <button
          onClick={() => setPreview(!preview)}
          style={{ background: preview ? "#1a3a5c" : "#f1f5f9", color: preview ? "#fff" : "#475569", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
        >
          {preview ? "✏️ Editar" : "👁️ Vista AI"}
        </button>
      </div>

      {/* Vista previa de lo que ve la AI */}
      {preview && (
        <div style={{ background: "#0f172a", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
          <div style={{ color: "#64748b", fontSize: "11px", fontWeight: "700", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            📡 Contexto que recibe la AI en cada mensaje
          </div>
          <pre style={{ color: "#e2e8f0", fontSize: "12px", lineHeight: "1.7", margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
{SECCIONES_DEFAULT.map(s => datos[s.key] ? `=== ${s.label.replace(/[^\w\s]/g,"")} ===\n${datos[s.key]}\n` : "").filter(Boolean).join("\n")}
          </pre>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>Cargando...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {SECCIONES_DEFAULT.map(sec => (
            <div key={sec.key} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              {/* Sección header */}
              <div
                onClick={() => editando === sec.key ? setEditando(null) : editar(sec.key)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", cursor: "pointer", background: editando === sec.key ? "#f0f7ff" : "#fff", borderBottom: editando === sec.key ? "1px solid #bfdbfe" : "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "16px" }}>{sec.label.split(" ")[0]}</span>
                  <span style={{ fontWeight: "700", fontSize: "14px", color: "#1a3a5c" }}>{sec.label.substring(sec.label.indexOf(" ")+1)}</span>
                  {datos[sec.key] && (
                    <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: "10px", fontWeight: "700", borderRadius: "20px", padding: "2px 8px" }}>
                      ✓ {datos[sec.key].length} chars
                    </span>
                  )}
                  {!datos[sec.key] && (
                    <span style={{ background: "#fef3c7", color: "#d97706", fontSize: "10px", fontWeight: "700", borderRadius: "20px", padding: "2px 8px" }}>
                      Vacío
                    </span>
                  )}
                </div>
                <span style={{ color: "#94a3b8", fontSize: "18px" }}>{editando === sec.key ? "▲" : "▼"}</span>
              </div>

              {/* Editor */}
              {editando === sec.key && (
                <div style={{ padding: "16px 18px" }}>
                  <textarea
                    value={borrador}
                    onChange={e => setBorrador(e.target.value)}
                    placeholder={sec.placeholder}
                    rows={8}
                    style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "12px", fontSize: "13px", lineHeight: "1.6", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", color: "#1a1a1a" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>{borrador.length} caracteres</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => setEditando(null)}
                        style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={guardar}
                        disabled={guardando}
                        style={{ background: guardado ? "#16a34a" : "linear-gradient(135deg,#1a3a5c,#1e4d7b)", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 20px", cursor: "pointer", fontWeight: "700", fontSize: "13px" }}
                      >
                        {guardando ? "Guardando..." : guardado ? "✓ Guardado" : "💾 Guardar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview del contenido si no está editando */}
              {editando !== sec.key && datos[sec.key] && (
                <div style={{ padding: "10px 18px 14px", fontSize: "13px", color: "#475569", lineHeight: "1.6", whiteSpace: "pre-wrap", maxHeight: "80px", overflow: "hidden", background: "#fafafa", position: "relative" }}>
                  {datos[sec.key]}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30px", background: "linear-gradient(transparent, #fafafa)" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
