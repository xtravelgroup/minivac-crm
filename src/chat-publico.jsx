import { useState, useEffect, useRef } from "react";

const SB_URL  = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";
const EDGE_URL = "https://gsvnvahrjgswwejnuiyn.supabase.co/functions/v1/resend-email";

async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
  });
  return r.json();
}

async function sbPost(path, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" },
    body: JSON.stringify(body)
  });
  return r.json();
}

export default function ChatPublico() {
  const token = new URLSearchParams(window.location.search).get("t") ||
                window.location.pathname.split("/chat/")[1]?.split("/")[0];

  const [chat, setChat]         = useState(null);
  const [lead, setLead]         = useState(null);
  const [vendedor, setVendedor] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [error, setError]       = useState(null);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  useEffect(() => {
    if (!token) { setError("Link inválido"); setLoading(false); return; }
    init();
    return () => clearInterval(pollRef.current);
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, aiTyping]);

  async function init() {
    setLoading(true);
    try {
      const chats = await sbGet(`chats?token=eq.${token}&select=*`);
      if (!chats?.length) { setError("Este link no es válido o ya expiró."); setLoading(false); return; }
      const c = chats[0];
      setChat(c);

      const [leads, msgs] = await Promise.all([
        sbGet(`leads?id=eq.${c.lead_id}&select=*`),
        sbGet(`chat_mensajes?chat_id=eq.${c.id}&order=created_at.asc`)
      ]);
      const l = leads?.[0];
      setLead(l);
      setMensajes(msgs || []);

      if (c.usuario_id) {
        const us = await sbGet(`usuarios?id=eq.${c.usuario_id}&select=id,nombre,rol`);
        setVendedor(us?.[0] || null);
      }

      // Si no hay mensajes, la AI saluda
      if (!msgs?.length) {
        setTimeout(() => enviarMensajeAI(c, l, []), 800);
      }

      // Polling cada 4 segundos
      pollRef.current = setInterval(() => cargarMensajes(c.id), 4000);
    } catch(e) {
      setError("Error cargando el chat. Intente de nuevo.");
    }
    setLoading(false);
  }

  async function cargarMensajes(chatId) {
    const msgs = await sbGet(`chat_mensajes?chat_id=eq.${chatId}&order=created_at.asc`);
    if (msgs) setMensajes(msgs);
  }

  async function enviarMensajeAI(c, l, historial) {
    setAiTyping(true);
    try {
      const r = await fetch(`${EDGE_URL}/chat-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ chat_id: c.id, lead_id: c.lead_id, historial, modo: "auto" })
      });
      const data = await r.json();
      if (data.mensaje) {
        await sbPost("chat_mensajes", { chat_id: c.id, autor: "vendedor", mensaje: data.mensaje });
        await cargarMensajes(c.id);
      }
    } catch(e) {}
    setAiTyping(false);
  }

  async function enviar() {
    if (!input.trim() || sending || !chat) return;
    setSending(true);
    const texto = input.trim();
    setInput("");
    try {
      await sbPost("chat_mensajes", { chat_id: chat.id, autor: "cliente", mensaje: texto });
      const msgs = await sbGet(`chat_mensajes?chat_id=eq.${chat.id}&order=created_at.asc`);
      setMensajes(msgs || []);
      // AI responde automáticamente
      setTimeout(() => enviarMensajeAI(chat, lead, msgs || []), 500);
    } catch(e) {}
    setSending(false);
  }

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f0f4f8"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"32px",marginBottom:"12px"}}>✈️</div>
        <div style={{color:"#1a3a5c",fontWeight:"700",fontSize:"18px"}}>Cargando su chat...</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f0f4f8"}}>
      <div style={{textAlign:"center",background:"#fff",padding:"40px",borderRadius:"16px",boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}>
        <div style={{fontSize:"48px",marginBottom:"16px"}}>😕</div>
        <div style={{color:"#1a3a5c",fontWeight:"700",fontSize:"20px",marginBottom:"8px"}}>Link no válido</div>
        <div style={{color:"#666",fontSize:"14px"}}>{error}</div>
      </div>
    </div>
  );

  const nombreCliente = lead?.nombre || lead?.name || "Cliente";
  const nombreVendedor = vendedor?.nombre || "Su Asesor X Travel";

  return (
    <div style={{minHeight:"100vh",background:"#f0f4f8",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',Arial,sans-serif"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#1a3a5c,#0f2340)",padding:"16px 20px",display:"flex",alignItems:"center",gap:"14px",boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
        <div style={{width:"48px",height:"48px",borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",fontWeight:"800",color:"#fff",flexShrink:0}}>
          {nombreVendedor.charAt(0)}
        </div>
        <div style={{flex:1}}>
          <div style={{color:"#fff",fontWeight:"700",fontSize:"16px"}}>{nombreVendedor}</div>
          <div style={{color:"#93c5fd",fontSize:"12px"}}>Asesor de Viajes · X Travel Group</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.1)",borderRadius:"20px",padding:"4px 12px"}}>
          <span style={{color:"#4ade80",fontSize:"10px",fontWeight:"700"}}>● EN LÍNEA</span>
        </div>
      </div>

      {/* Destinos del lead */}
      {lead?.destinos?.length > 0 && (
        <div style={{background:"#dbeafe",borderBottom:"1px solid #bfdbfe",padding:"10px 20px",display:"flex",alignItems:"center",gap:"8px",overflowX:"auto"}}>
          <span style={{color:"#1d4ed8",fontSize:"12px",fontWeight:"700",whiteSpace:"nowrap"}}>🗺️ Su paquete:</span>
          {(lead.destinos).map((d,i) => (
            <span key={i} style={{background:"#1a3a5c",color:"#fff",borderRadius:"20px",padding:"3px 12px",fontSize:"12px",fontWeight:"600",whiteSpace:"nowrap"}}>
              {d.nombre || d.destId}
            </span>
          ))}
        </div>
      )}

      {/* Mensajes */}
      <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:"12px"}}>
        {mensajes.map((m) => (
          <div key={m.id} style={{display:"flex",justifyContent:m.autor==="cliente"?"flex-end":"flex-start"}}>
            {m.autor === "vendedor" && (
              <div style={{width:"32px",height:"32px",borderRadius:"50%",background:"linear-gradient(135deg,#1a3a5c,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:"800",color:"#fff",flexShrink:0,marginRight:"8px",alignSelf:"flex-end"}}>
                {nombreVendedor.charAt(0)}
              </div>
            )}
            <div style={{
              maxWidth:"70%",
              background: m.autor==="cliente" ? "linear-gradient(135deg,#1a3a5c,#1e4d7b)" : "#fff",
              color: m.autor==="cliente" ? "#fff" : "#1a1a1a",
              borderRadius: m.autor==="cliente" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding:"12px 16px",
              fontSize:"14px",
              lineHeight:"1.5",
              boxShadow:"0 2px 8px rgba(0,0,0,0.1)"
            }}>
              {m.mensaje}
              <div style={{fontSize:"10px",opacity:0.6,marginTop:"4px",textAlign:"right"}}>
                {new Date(m.created_at).toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"})}
              </div>
            </div>
          </div>
        ))}

        {aiTyping && (
          <div style={{display:"flex",alignItems:"flex-end",gap:"8px"}}>
            <div style={{width:"32px",height:"32px",borderRadius:"50%",background:"linear-gradient(135deg,#1a3a5c,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:"800",color:"#fff",flexShrink:0}}>
              {nombreVendedor.charAt(0)}
            </div>
            <div style={{background:"#fff",borderRadius:"18px 18px 18px 4px",padding:"14px 18px",boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>
              <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
                <span style={{width:"8px",height:"8px",borderRadius:"50%",background:"#94a3b8",animation:"bounce 1s infinite"}}></span>
                <span style={{width:"8px",height:"8px",borderRadius:"50%",background:"#94a3b8",animation:"bounce 1s infinite 0.2s"}}></span>
                <span style={{width:"8px",height:"8px",borderRadius:"50%",background:"#94a3b8",animation:"bounce 1s infinite 0.4s"}}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{background:"#fff",padding:"16px 20px",borderTop:"1px solid #e5e7eb",display:"flex",gap:"12px",alignItems:"flex-end"}}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); enviar(); }}}
          placeholder="Escriba su mensaje..."
          rows={1}
          style={{flex:1,border:"1px solid #d1d5db",borderRadius:"24px",padding:"12px 16px",fontSize:"14px",resize:"none",outline:"none",fontFamily:"inherit",lineHeight:"1.4"}}
        />
        <button
          onClick={enviar}
          disabled={sending || !input.trim()}
          style={{width:"48px",height:"48px",borderRadius:"50%",background:input.trim()?"linear-gradient(135deg,#1a3a5c,#1e4d7b)":"#e5e7eb",border:"none",cursor:input.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke={input.trim()?"#fff":"#9ca3af"} strokeWidth="2" strokeLinecap="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input.trim()?"#fff":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Footer */}
      <div style={{background:"#1a3a5c",padding:"8px",textAlign:"center"}}>
        <span style={{color:"#64a0d4",fontSize:"11px"}}>Powered by X Travel Group · members@xtravelgroup.com</span>
      </div>

      <style>{`
        @keyframes bounce {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)}
        }
      `}</style>
    </div>
  );
}
