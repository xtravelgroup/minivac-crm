// email-panel.jsx — Componente compartido de emails para seller-crm y verification-module
// Uso: <EmailPanel lead={lead} currentUser={currentUser} sbAnonKey={SB_ANON_KEY} />

import { useState, useEffect } from "react";

const EDGE_URL   = "https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/resend-email";
const ANON_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";
const SB_URL     = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const FROM_NAME  = "X Travel Group";

// ── Templates de email ─────────────────────────────────────────────────────
function buildTemplates(lead) {
  const nombre   = lead.nombre || lead.name || "Estimado cliente";
  const precio   = lead.salePrice ? `$${lead.salePrice.toLocaleString()}` : "";
  const destinos = (lead.destinos || []).map(d => d.nombre || d.destId).filter(Boolean).join(", ") || "su destino";
  const firmaUrl = lead.firma_token
    ? `https://minivac-crm.vercel.app/firma.html?lead=${lead.id}&token=${lead.firma_token}`
    : null;

  return [
    {
      id:      "certificado",
      label:   "📄 Certificado de viaje",
      subject: "Su certificado de viaje - X Travel Group",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#222;">
          <div style="background:#1a3a5c;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">X Travel Group</h1>
          </div>
          <div style="background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;">
            <p>Estimado/a <strong>${nombre}</strong>,</p>
            <p>Es un placer confirmarle su membresía de viaje con X Travel Group.</p>
            <p>Por favor, haga clic en el siguiente botón para revisar y firmar su certificado de viaje:</p>
            <div style="text-align:center;margin:30px 0;">
              <a href="${firmaUrl || "#"}" style="background:#1a3a5c;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
                Ver y Firmar Certificado
              </a>
            </div>
            <p style="font-size:13px;color:#666;">Si el botón no funciona, copie este enlace: <br/><a href="${firmaUrl || "#"}">${firmaUrl || "Link no disponible"}</a></p>
            <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;"/>
            <p style="font-size:13px;color:#888;">X Travel Group · members@xtravelgroup.com</p>
          </div>
        </div>`,
      text: `Estimado/a ${nombre},\n\nPor favor firme su certificado de viaje en: ${firmaUrl || "Link no disponible"}\n\nX Travel Group`,
      disabled: !firmaUrl,
      disabledMsg: "Genera el link de firma primero en el tab de Pago",
    },
    {
      id:      "bienvenida",
      label:   "👋 Bienvenida",
      subject: "Bienvenido a X Travel Group",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#222;">
          <div style="background:#1a3a5c;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">X Travel Group</h1>
          </div>
          <div style="background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;">
            <p>Estimado/a <strong>${nombre}</strong>,</p>
            <p>¡Bienvenido/a a la familia X Travel Group! 🎉</p>
            <p>Nos complace informarle que su membresía de viaje ha sido procesada exitosamente.</p>
            <p>Pronto uno de nuestros especialistas se pondrá en contacto con usted para coordinar los detalles de su experiencia de viaje.</p>
            <p>Si tiene alguna pregunta, no dude en responder a este correo.</p>
            <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;"/>
            <p style="font-size:13px;color:#888;">X Travel Group · members@xtravelgroup.com</p>
          </div>
        </div>`,
      text: `Estimado/a ${nombre},\n\n¡Bienvenido/a a X Travel Group! Su membresía ha sido procesada. Pronto nos pondremos en contacto.\n\nX Travel Group`,
    },
    {
      id:      "seguimiento",
      label:   "📞 Seguimiento",
      subject: "Seguimiento de su membresía - X Travel Group",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#222;">
          <div style="background:#1a3a5c;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">X Travel Group</h1>
          </div>
          <div style="background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;">
            <p>Estimado/a <strong>${nombre}</strong>,</p>
            <p>Nos comunicamos para darle seguimiento a su membresía de viaje con X Travel Group.</p>
            <p>Queremos asegurarnos de que tenga toda la información necesaria y responder cualquier pregunta que pueda tener.</p>
            <p>No dude en responder a este correo o contactarnos directamente.</p>
            <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;"/>
            <p style="font-size:13px;color:#888;">X Travel Group · members@xtravelgroup.com</p>
          </div>
        </div>`,
      text: `Estimado/a ${nombre},\n\nNos comunicamos para darle seguimiento a su membresía. Por favor contáctenos si tiene preguntas.\n\nX Travel Group`,
    },
    {
      id:      "confirmacion",
      label:   "✅ Confirmación de venta",
      subject: `Confirmación de su membresía - X Travel Group`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#222;">
          <div style="background:#1a7f3c;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">✅ Membresía Confirmada</h1>
          </div>
          <div style="background:#f9f9f9;padding:30px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0;">
            <p>Estimado/a <strong>${nombre}</strong>,</p>
            <p>¡Felicitaciones! Su membresía de viaje con X Travel Group ha sido <strong>confirmada</strong>.</p>
            ${precio ? `<p><strong>Inversión total:</strong> ${precio}</p>` : ""}
            ${destinos ? `<p><strong>Destinos incluidos:</strong> ${destinos}</p>` : ""}
            <p>En los próximos días recibirá toda la documentación de su membresía.</p>
            <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;"/>
            <p style="font-size:13px;color:#888;">X Travel Group · members@xtravelgroup.com</p>
          </div>
        </div>`,
      text: `Estimado/a ${nombre},\n\n¡Felicitaciones! Su membresía ha sido confirmada.${precio ? " Inversión: "+precio+"." : ""}\n\nX Travel Group`,
    },
    {
      id:      "libre",
      label:   "✏️ Email libre",
      subject: "",
      html:    "",
      text:    "",
      isLibre: true,
    },
  ];
}

// ── Estilos ────────────────────────────────────────────────────────────────
const S = {
  container: { padding: "4px 0" },
  section:   { marginBottom: "16px" },
  label:     { fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" },
  row:       { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" },
  tplBtn:    (disabled) => ({
    padding: "7px 12px", borderRadius: "6px", border: "1px solid #d1d5db",
    background: disabled ? "#f3f4f6" : "#fff", color: disabled ? "#9ca3af" : "#374151",
    fontSize: "12px", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 500,
    transition: "all 0.15s",
  }),
  input:    { width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px", boxSizing: "border-box", marginBottom: "8px" },
  textarea: { width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "13px", boxSizing: "border-box", minHeight: "120px", resize: "vertical", marginBottom: "8px" },
  sendBtn:  (sending) => ({
    padding: "9px 20px", borderRadius: "6px", background: sending ? "#6b7280" : "#1a3a5c",
    color: "#fff", border: "none", fontSize: "13px", fontWeight: 600, cursor: sending ? "not-allowed" : "pointer",
  }),
  emailRow: { padding: "10px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "8px", background: "#fff" },
  badge:    (dir) => ({
    display: "inline-block", padding: "2px 7px", borderRadius: "99px", fontSize: "10px", fontWeight: 700,
    background: dir === "outbound" ? "#dbeafe" : "#d1fae5",
    color:      dir === "outbound" ? "#1e40af" : "#065f46",
    marginRight: "6px",
  }),
  emptyMsg: { textAlign: "center", color: "#9ca3af", fontSize: "13px", padding: "24px 0" },
  toast:    (ok) => ({
    position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
    padding: "10px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
    background: ok ? "#1a7f3c" : "#dc2626", color: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  }),
};

// ── Componente principal ───────────────────────────────────────────────────
export default function EmailPanel({ lead, currentUser }) {
  const [emails,     setEmails]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selTpl,     setSelTpl]     = useState(null);  // template seleccionado
  const [subject,    setSubject]    = useState("");
  const [bodyText,   setBodyText]   = useState("");
  const [bodyHtml,   setBodyHtml]   = useState("");
  const [sending,    setSending]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const [showCompose,setShowCompose]= useState(false);

  const templates = buildTemplates(lead);

  function notify(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // Cargar historial de emails del lead
  async function cargarEmails() {
    if (!lead?.id) return;
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/emails?lead_id=eq.${lead.id}&order=created_at.desc&limit=30`,
        { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
      );
      const data = await res.json();
      if (Array.isArray(data)) setEmails(data);
    } catch (e) {
      console.error("Error cargando emails:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargarEmails(); }, [lead?.id]);

  function selectTemplate(tpl) {
    if (tpl.disabled) { notify(tpl.disabledMsg, false); return; }
    setSelTpl(tpl);
    setSubject(tpl.subject || "");
    setBodyText(tpl.text || "");
    setBodyHtml(tpl.html || "");
    setShowCompose(true);
  }

  async function enviarEmail() {
    if (!lead.email) { notify("El lead no tiene email registrado", false); return; }
    if (!subject.trim()) { notify("Escribe un asunto", false); return; }
    if (!bodyText.trim() && !bodyHtml.trim()) { notify("Escribe el contenido del email", false); return; }
    setSending(true);
    try {
      const res = await fetch(`${EDGE_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          to_email:   lead.email,
          to_name:    lead.nombre || lead.name || "",
          subject:    subject.trim(),
          body_text:  bodyText.trim(),
          body_html:  bodyHtml.trim() || `<p>${bodyText.trim().replace(/\n/g, "<br/>")}</p>`,
          lead_id:    lead.id,
          usuario_id: currentUser?.dbId || currentUser?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error enviando");
      notify("✉️ Email enviado correctamente");
      setShowCompose(false);
      setSelTpl(null);
      setSubject(""); setBodyText(""); setBodyHtml("");
      setTimeout(cargarEmails, 1000);
    } catch (err) {
      notify("Error: " + err.message, false);
    } finally {
      setSending(false);
    }
  }

  function fmtDate(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("es-MX", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
  }

  return (
    <div style={S.container}>
      {toast && <div style={S.toast(toast.ok)}>{toast.msg}</div>}

      {/* Email del lead */}
      {!lead.email && (
        <div style={{ padding: "10px 12px", background: "#fef3c7", borderRadius: "8px", fontSize: "12px", color: "#92400e", marginBottom: "12px" }}>
          ⚠️ Este lead no tiene email registrado. Agrégalo en el tab de Datos para poder enviar emails.
        </div>
      )}

      {/* Templates */}
      <div style={S.section}>
        <div style={S.label}>📨 Enviar email</div>
        <div style={S.row}>
          {templates.map(tpl => (
            <button key={tpl.id} style={S.tplBtn(tpl.disabled || !lead.email)} onClick={() => selectTemplate(tpl)}>
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compose */}
      {showCompose && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a5c" }}>
              {selTpl?.isLibre ? "✏️ Email libre" : selTpl?.label}
            </div>
            <button onClick={() => { setShowCompose(false); setSelTpl(null); }}
              style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280" }}>✕</button>
          </div>

          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px" }}>
            Para: <strong>{lead.nombre || lead.name}</strong> &lt;{lead.email}&gt;
          </div>

          <input
            style={S.input}
            placeholder="Asunto"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />

          <textarea
            style={S.textarea}
            placeholder="Contenido del email (texto plano)..."
            value={bodyText}
            onChange={e => setBodyText(e.target.value)}
          />

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => { setShowCompose(false); setSelTpl(null); }}
              style={{ padding: "9px 16px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#fff", fontSize: "13px", cursor: "pointer" }}>
              Cancelar
            </button>
            <button onClick={enviarEmail} disabled={sending} style={S.sendBtn(sending)}>
              {sending ? "Enviando..." : "✉️ Enviar"}
            </button>
          </div>
        </div>
      )}

      {/* Historial */}
      <div style={S.section}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div style={S.label}>🕒 Historial de emails</div>
          <button onClick={cargarEmails} style={{ background: "none", border: "none", fontSize: "12px", color: "#6b7280", cursor: "pointer" }}>↻ Actualizar</button>
        </div>

        {loading ? (
          <div style={S.emptyMsg}>Cargando...</div>
        ) : emails.length === 0 ? (
          <div style={S.emptyMsg}>No hay emails enviados a este lead</div>
        ) : (
          emails.map(em => (
            <div key={em.id} style={S.emailRow}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={S.badge(em.direction)}>{em.direction === "outbound" ? "Enviado" : "Recibido"}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#111" }}>{em.subject}</span>
                </div>
                <span style={{ fontSize: "11px", color: "#9ca3af", whiteSpace: "nowrap" }}>{fmtDate(em.created_at)}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                {em.direction === "outbound" ? `→ ${em.to_email}` : `← ${em.from_email}`}
              </div>
              {em.body_text && (
                <div style={{ fontSize: "12px", color: "#374151", marginTop: "6px", padding: "8px", background: "#f3f4f6", borderRadius: "6px", whiteSpace: "pre-wrap" }}>
                  {em.body_text.slice(0, 200)}{em.body_text.length > 200 ? "..." : ""}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
