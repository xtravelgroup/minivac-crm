// email-panel.jsx — Componente compartido de emails para seller-crm y verification-module
// Uso: <EmailPanel lead={lead} currentUser={currentUser} sbAnonKey={SB_ANON_KEY} />

import { useState, useEffect } from "react";

const EDGE_URL   = "https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/resend-email";
const ANON_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";
const SB_URL     = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const FROM_NAME  = "X Travel Group";

// ── Templates de email ─────────────────────────────────────────────────────
// ── Construye el HTML del email de presentación de paquete ──────────────────
function buildPaqueteHtml(lead, hotelesPorDest, aiTexts) {
  const nombre  = lead.nombre || lead.name || "Estimado cliente";
  const destinos = lead.destinos || [];
  const aiData  = aiTexts || {};

  const estrellasHtml = (n) => "⭐".repeat(Math.min(n || 4, 5));

  const destinosHtml = destinos.map(function(d) {
    const hoteles    = (hotelesPorDest[d.destId] || []).slice(0, 3);
    const nombreDest = d.nombre || d.destId;
    const noches     = d.noches || 4;
    const dias       = noches + 1;
    const ai         = aiData[d.destId] || {};

    const hotelesHtml = hoteles.length > 0
      ? hoteles.map(h => `
          <div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:flex-start;gap:12px;">
            <div style="font-size:24px;line-height:1;">🏨</div>
            <div>
              <div style="font-weight:700;font-size:14px;color:#1a3a5c;">${h.nombre}</div>
              <div style="font-size:12px;color:#666;margin-top:2px;">${estrellasHtml(h.estrellas)} ${h.tipo_hab || ""} ${h.regimen ? "· " + h.regimen : ""}</div>
            </div>
          </div>`).join("")
      : `<div style="font-size:13px;color:#888;padding:8px 0;">Hoteles de categoría superior incluidos</div>`;

    const tituloHtml = ai.titulo_paquete
      ? `<div style="font-size:15px;font-weight:800;color:#1a3a5c;margin-bottom:10px;">${ai.titulo_paquete}</div>`
      : `<div style="font-size:15px;font-weight:800;color:#1a3a5c;margin-bottom:10px;">${dias} Días / ${noches} Noches en ${nombreDest}</div>`;

    const highlightsHtml = (ai.highlights || []).length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
          ${ai.highlights.map(h => `<span style="background:#dbeafe;color:#1e40af;padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600;">${h}</span>`).join("")}
        </div>`
      : "";

    const descHtml = ai.descripcion
      ? `<p style="font-size:14px;color:#374151;line-height:1.75;margin:0 0 14px 0;">${ai.descripcion}</p>`
      : "";

    const queIncluyeHtml = (ai.que_incluye || []).length > 0
      ? `<div style="margin-bottom:14px;">
          <div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">✅ Qué incluye</div>
          ${ai.que_incluye.map(item => `<div style="font-size:13px;color:#374151;padding:4px 0;border-bottom:1px solid #f0fdf4;">✔ ${item}</div>`).join("")}
        </div>`
      : "";

    const queHacerHtml = (ai.que_hacer || []).length > 0
      ? `<div style="margin-bottom:14px;">
          <div style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">🎯 Experiencias imperdibles</div>
          ${ai.que_hacer.map(item => `<div style="font-size:13px;color:#374151;padding:4px 0;">→ ${item}</div>`).join("")}
        </div>`
      : "";

    return `
      <div style="border:1px solid #bfdbfe;border-radius:12px;overflow:hidden;margin-bottom:20px;">
        <div style="background:linear-gradient(135deg,#1a3a5c,#1e4d7b);padding:18px 20px;">
          ${tituloHtml.replace('style="font-size:15px;font-weight:800;color:#1a3a5c;margin-bottom:10px;"', 'style="font-size:17px;font-weight:800;color:#fff;margin-bottom:6px;"')}
          <div style="font-size:12px;color:#93c5fd;">para hasta 4 personas</div>
        </div>
        <div style="background:#f0f7ff;padding:20px;">
          ${highlightsHtml}
          ${descHtml}
          ${queHacerHtml}
          ${queIncluyeHtml}
        </div>
      </div>`;
  }).join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#222;">

      <!-- Header con logo -->
      <div style="background:linear-gradient(135deg,#1a3a5c 0%,#0f2340 100%);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
        <img src="https://minivac-crm.vercel.app/logo.png" alt="X Travel Group" style="height:60px;object-fit:contain;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;" onerror="this.style.display='none'" />
        <div style="display:inline-block;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:8px 20px;margin-bottom:14px;">
          <span style="font-size:13px;color:#93c5fd;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">✈ X TRAVEL GROUP</span>
        </div>
        <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;line-height:1.3;">Su paquete de viaje exclusivo</h1>
        <div style="color:#bfdbfe;font-size:14px;margin-top:10px;">Preparado especialmente para <strong style="color:#fff;">${nombre}</strong></div>
      </div>

      <!-- Saludo -->
      <div style="background:#fff;padding:28px 24px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
        <p style="font-size:16px;margin:0 0 16px 0;">Estimado/a <strong>${nombre}</strong>,</p>
        <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px 0;">
          Ha sido seleccionado/a para acceder a una <strong>oportunidad exclusiva de viaje</strong> a través de X Travel Group.
          Hemos preparado un paquete personalizado con los destinos que más se adaptan a su perfil.
        </p>
      </div>

      <!-- Destinos -->
      <div style="background:#f8faff;padding:24px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">🗺️ Sus destinos incluidos</div>
        ${destinosHtml || '<p style="color:#888;">Destinos por confirmar con su asesor</p>'}
      </div>

      <!-- Por qué X Travel -->
      <div style="background:#fff;padding:24px;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">🏆 ¿Por qué elegir X Travel Group?</div>

        <div style="display:grid;gap:12px;">
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:24px;line-height:1;">💎</div>
            <div>
              <div style="font-weight:700;font-size:14px;color:#1a3a5c;">Precios que nadie puede igualar</div>
              <div style="font-size:13px;color:#555;margin-top:3px;line-height:1.6;">Trabajamos directamente con cadenas hoteleras y aerolineas, eliminando intermediarios. Lo que otros cobran a precio de lista, nosotros lo ofrecemos a precio de miembro — hasta un 70% menos.</div>
            </div>
          </div>

          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:24px;line-height:1;">🤝</div>
            <div>
              <div style="font-weight:700;font-size:14px;color:#1a3a5c;">Años de confianza</div>
              <div style="font-size:13px;color:#555;margin-top:3px;line-height:1.6;">X Travel Group lleva muchos años haciendo realidad los sueños de viaje de miles de familias. Somos una empresa establecida, con respaldo legal y compromisos reales.</div>
            </div>
          </div>

          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:24px;line-height:1;">✈️</div>
            <div>
              <div style="font-weight:700;font-size:14px;color:#1a3a5c;">Flexibilidad total</div>
              <div style="font-size:13px;color:#555;margin-top:3px;line-height:1.6;">Viaje cuando quiera, a los destinos incluidos en su paquete. Sin fechas forzadas, sin restricciones absurdas. Su tiempo de viaje, sus reglas.</div>
            </div>
          </div>

          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:24px;line-height:1;">🛡️</div>
            <div>
              <div style="font-weight:700;font-size:14px;color:#1a3a5c;">Garantía de satisfacción</div>
              <div style="font-size:13px;color:#555;margin-top:3px;line-height:1.6;">Si por cualquier razón no está 100% satisfecho, nuestro equipo de servicio al cliente está disponible para resolverlo. Su experiencia es nuestra prioridad.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div style="background:linear-gradient(135deg,#1a7f3c 0%,#14532d 100%);padding:28px 24px;text-align:center;border-radius:0 0 12px 12px;">
        <div style="color:#bbf7d0;font-size:14px;margin-bottom:8px;">¿Listo para hacer realidad su viaje?</div>
        <div style="color:#fff;font-weight:800;font-size:20px;margin-bottom:16px;">Hable hoy con su asesor de X Travel Group</div>
        <div style="color:#86efac;font-size:13px;">Responda a este email o comuníquese directamente con nosotros</div>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.2);margin:20px 0;"/>
        <div style="font-size:12px;color:#86efac;">X Travel Group · members@xtravelgroup.com</div>
      </div>

    </div>`;

  const text = `Estimado/a ${nombre},\n\nHemos preparado un paquete de viaje exclusivo para usted.\n\nDestinos incluidos: ${destinos.map(d => (d.nombre||d.destId) + " (" + (d.noches||4) + " noches)").join(", ") || "Por confirmar"}\n\nEn X Travel Group llevamos 20+ años haciendo realidad sueños de viaje con precios hasta 70% menores al mercado.\n\nResponda este email para más información.\n\nX Travel Group`;

  return {
    subject: `Su paquete de viaje exclusivo — X Travel Group`,
    html,
    text,
  };
}

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
      id:      "paquete",
      label:   "🗺️ Presentación de paquete",
      subject: "",
      html:    "",
      text:    "",
      isPaquete: true,
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
export default function EmailPanel({ lead, currentUser, destCatalog }) {
  const [emails,     setEmails]     = useState([]);
  const [hotelesPorDest, setHotelesPorDest] = useState({});
  const [loadingPaquete, setLoadingPaquete] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [selTpl,     setSelTpl]     = useState(null);  // template seleccionado
  const [subject,    setSubject]    = useState("");
  const [bodyText,   setBodyText]   = useState("");
  const [bodyHtml,   setBodyHtml]   = useState("");
  const [sending,    setSending]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const [showCompose,setShowCompose]= useState(false);

  // Enriquecer destinos con nombres del catálogo
  const leadConNombres = {
    ...lead,
    destinos: (lead.destinos || []).map(d => {
      const cat = (destCatalog || []).find(c => c.id === d.destId);
      return { ...d, nombre: cat?.nombre || cat?.label || d.nombre || d.destId };
    })
  };

  const templates = buildTemplates(leadConNombres);

  function notify(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // Cargar hoteles por destino para el template de paquete
  async function cargarHoteles(destIds) {
    if (!destIds || destIds.length === 0) return {};
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/hoteles?destino_id=in.(${destIds.join(",")})&activo=eq.true&select=*`,
        { headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` } }
      );
      const data = await res.json();
      const byDest = {};
      if (Array.isArray(data)) {
        data.forEach(h => {
          if (!byDest[h.destino_id]) byDest[h.destino_id] = [];
          byDest[h.destino_id].push(h);
        });
      }
      return byDest;
    } catch(e) {
      console.error("Error cargando hoteles:", e);
      return {};
    }
  }

  // Generar textos AI para cada destino via Claude API
  async function generateAITexts(lead, hotelesPorDest) {
    const destinos = (lead.destinos || []);
    if (destinos.length === 0) return {};

    const nombre = lead.nombre || lead.name || "el cliente";
    const edad   = lead.edad || "";
    const ec     = lead.estadoCivil || "";

    const destinosInfo = destinos.map(d => {
      const hoteles = (hotelesPorDest[d.destId] || []).slice(0, 3).map(h => h.nombre).join(", ");
      return `- ${d.nombre || d.destId} (${d.noches || 4} noches)${hoteles ? ", hoteles posibles: " + hoteles : ""}`;
    }).join("\n");

    const prompt = `Eres el mejor copywriter de viajes del mundo. Tu misión es escribir textos que hagan que ${nombre} sienta que NECESITA este viaje ahora mismo. Emoción pura, sin frases genéricas.

CLIENTE:
- Nombre: ${nombre}${edad ? "\n- Edad: " + edad + " años" : ""}${ec ? "\n- Estado civil: " + ec : ""}

PAQUETE:
${destinosInfo}

Para CADA destino genera en español:

1. "titulo_paquete": Título irresistible con duración y destino. Ej: "4 Días y 3 Noches en el Mágico Orlando — Para Toda la Familia". Sin avión ni emojis.

2. "descripcion": 3-4 oraciones que EMOCIONEN. Habla de sensaciones, olores, colores, momentos únicos. Personalizado para ${nombre} según su perfil. Que sienta que ya está ahí. Sin mencionar precios ni "membresía".

3. "que_hacer": Array de 4-5 experiencias concretas e irresistibles del destino. Específicas, no genéricas. Ej en vez de "visitar playas" → "Nadar en el agua turquesa de las playas de arena blanca de Cancún". Que den ganas de ir.

4. "que_incluye": Array de 4-5 beneficios incluidos en el paquete. Concretos y valiosos. Ej: ["Alojamiento en hotel de categoría superior", "Traslados aeropuerto↔hotel incluidos", "Acceso completo a las amenidades del resort"].

5. "highlights": Array de 3 frases cortas (máx 3 palabras) que capturan la esencia del destino. Ej: ["Mar cristalino", "Cultura viva", "Sabores únicos"].

Responde SOLO con JSON válido, sin texto adicional, sin backticks:
{
  "destinos": {
    "ID_DESTINO": {
      "titulo_paquete": "...",
      "descripcion": "...",
      "que_hacer": ["...", "..."],
      "que_incluye": ["...", "..."],
      "highlights": ["...", "..."]
    }
  }
}

IDs exactos: ${destinos.map(d => d.destId).join(", ")}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = (data.content || []).find(b => b.type === "text")?.text || "{}";
      const parsed = JSON.parse(text);
      return parsed.destinos || {};
    } catch(e) {
      console.error("Error generando textos AI:", e);
      return {};
    }
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

  async function selectTemplate(tpl) {
    if (tpl.disabled) { notify(tpl.disabledMsg, false); return; }
    setSelTpl(tpl);
    setShowCompose(true);

    if (tpl.id === "paquete") {
      setLoadingPaquete(true);
      const destIds = (leadConNombres.destinos || []).map(d => d.destId).filter(Boolean);
      const hoteles = await cargarHoteles(destIds);
      setHotelesPorDest(hoteles);
      const aiTextsWithHoteles = await generateAITexts(leadConNombres, hoteles);
      const built = buildPaqueteHtml(leadConNombres, hoteles, aiTextsWithHoteles);
      setSubject(built.subject);
      setBodyText(built.text);
      setBodyHtml(built.html);
      setLoadingPaquete(false);
    } else {
      setSubject(tpl.subject || "");
      setBodyText(tpl.text || "");
      setBodyHtml(tpl.html || "");
    }
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
              {selTpl?.id === "paquete" ? "🗺️ Presentación de paquete" : selTpl?.isLibre ? "✏️ Email libre" : selTpl?.label}
            </div>
            <button onClick={() => { setShowCompose(false); setSelTpl(null); }}
              style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280" }}>✕</button>
          </div>

          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px" }}>
            Para: <strong>{lead.nombre || lead.name}</strong> &lt;{lead.email}&gt;
          </div>

          {loadingPaquete && (
            <div style={{ padding:"16px", textAlign:"center", color:"#6b7280", fontSize:"13px" }}>
              ✨ La IA está redactando su email personalizado...
            </div>
          )}
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
