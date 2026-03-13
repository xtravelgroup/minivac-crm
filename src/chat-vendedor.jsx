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

export default function ChatVendedor({ lead, currentUser }) {
  const [chat, setChat]           = useState(null);
  const [mensajes, setMensajes]   = useState([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const [loadingSug, setLoadingSug]   = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  useEffect(() => {
    if (lead?.id) cargarChat();
    return () => clearInterval(pollRef.current);
  }, [lead?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  async function cargarChat() {
    const chats = await sbGet(`chats?lead_id=eq.${lead.id}&select=*&limit=1`);
    if (chats?.length) {
      setChat(chats[0]);
      const msgs = await sbGet(`chat_mensajes?chat_id=eq.${chats[0].id}&order=created_at.asc`);
      setMensajes(msgs || []);
      pollRef.current = setInterval(() => recargarMensajes(chats[0].id), 4000);
    }
  }

  async function recargarMensajes(chatId) {
    const msgs = await sbGet(`chat_mensajes?chat_id=eq.${chatId}&order=created_at.asc`);
    if (msgs) setMensajes(msgs);
  }

  async function iniciarChat() {
    setIniciando(true);
    try {
      const nuevo = await sbPost("chats", {
        lead_id: lead.id,
        usuario_id: currentUser?.id || null
      });
      const c = Array.isArray(nuevo) ? nuevo[0] : nuevo;
      setChat(c);
      setMensajes([]);
      pollRef.current = setInterval(() => recargarMensajes(c.id), 4000);
    } catch(e) {}
    setIniciando(false);
  }

  async function pedirSugerencias() {
    if (!chat || loadingSug) return;
    setLoadingSug(true);
    setSugerencias([]);
    try {
      const r = await fetch(`${EDGE_URL}/chat-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ chat_id: chat.id, lead_id: lead.id, historial: mensajes, modo: "sugerencias" })
      });
      const data = await r.json();
      if (data.sugerencias) setSugerencias(data.sugerencias);
    } catch(e) {}
    setLoadingSug(false);
  }

  async function enviar(texto) {
    const msg = texto || input.trim();
    if (!msg || sending || !chat) return;
    setSending(true);
    setInput("");
    setSugerencias([]);
    try {
      await sbPost("chat_mensajes", { chat_id: chat.id, autor: "vendedor", mensaje: msg });
      await recargarMensajes(chat.id);
    } catch(e) {}
    setSending(false);
  }

  const chatUrl = chat ? `https://minivac-crm.vercel.app/chat?t=${chat.token}` : null;
  const nombreCliente = lead?.nombre || lead?.name || "Cliente";

  if (!chat) return (
    <div style={{padding:"24px",textAlign:"center"}}>
      <div style={{fontSize:"48px",marginBottom:"12px"}}>💬</div>
      <div style={{fontWeight:"700",fontSize:"16px",color:"#1a3a5c",marginBottom:"8px"}}>Chat con {nombreCliente}</div>
      <div style={{color:"#666",fontSize:"13px",marginBottom:"20px"}}>Inicie un chat — el cliente recibirá un link único para chatear con usted en tiempo real con asistencia de IA.</div>
      <button onClick={iniciarChat} disabled={iniciando} style={{background:"linear-gradient(135deg,#1a3a5c,#1e4d7b)",color:"#fff",border:"none",borderRadius:"8px",padding:"12px 24px",fontWeight:"700",cursor:"pointer",fontSize:"14px"}}>
        {iniciando ? "Iniciando..." : "🚀 Iniciar Chat"}
      </button>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",height:"500px",background:"#f8fafc",borderRadius:"8px",overflow:"hidden",border:"1px solid #e2e8f0"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#1a3a5c,#0f2340)",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{color:"#fff",fontWeight:"700",fontSize:"14px"}}>💬 Chat con {nombreCliente}</div>
          <div style={{color:"#93c5fd",fontSize:"11px"}}>{mensajes.length} mensajes</div>
        </div>
        {chatUrl && (
          <button
            onClick={() => navigator.clipboard.writeText(chatUrl)}
            style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:"6px",padding:"6px 10px",fontSize:"11px",cursor:"pointer",fontWeight:"600"}}
          >
            📋 Copiar link del cliente
          </button>
        )}
      </div>

      {/* Link del cliente */}
      {chatUrl && (
        <div style={{background:"#dbeafe",padding:"8px 14px",fontSize:"11px",color:"#1d4ed8",borderBottom:"1px solid #bfdbfe",display:"flex",alignItems:"center",gap:"8px"}}>
          <span style={{fontWeight:"700"}}>Link cliente:</span>
          <span style={{fontFamily:"monospace",fontSize:"10px",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{chatUrl}</span>
        </div>
      )}

      {/* Mensajes */}
      <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:"10px"}}>
        {mensajes.length === 0 && (
          <div style={{textAlign:"center",color:"#94a3b8",fontSize:"13px",marginTop:"40px"}}>
            <div style={{fontSize:"32px",marginBottom:"8px"}}>🤖</div>
            <div>La IA saludará al cliente cuando abra el link</div>
          </div>
        )}
        {mensajes.map((m) => (
          <div key={m.id} style={{display:"flex",justifyContent:m.autor==="vendedor"?"flex-end":"flex-start"}}>
            <div style={{
              maxWidth:"75%",
              background: m.autor==="vendedor" ? "linear-gradient(135deg,#1a3a5c,#1e4d7b)" : "#fff",
              color: m.autor==="vendedor" ? "#fff" : "#1a1a1a",
              borderRadius: m.autor==="vendedor" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              padding:"10px 14px",
              fontSize:"13px",
              lineHeight:"1.5",
              boxShadow:"0 1px 4px rgba(0,0,0,0.1)"
            }}>
              {m.autor === "vendedor" && <div style={{fontSize:"10px",opacity:0.7,marginBottom:"3px"}}>🤖 Asesor AI</div>}
              {m.autor === "cliente" && <div style={{fontSize:"10px",color:"#64748b",marginBottom:"3px"}}>👤 {nombreCliente}</div>}
              {m.mensaje}
              <div style={{fontSize:"10px",opacity:0.5,marginTop:"3px",textAlign:"right"}}>
                {new Date(m.created_at).toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"})}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Sugerencias AI */}
      {sugerencias.length > 0 && (
        <div style={{background:"#f0f9ff",borderTop:"1px solid #bae6fd",padding:"10px 14px"}}>
          <div style={{fontSize:"11px",color:"#0369a1",fontWeight:"700",marginBottom:"6px"}}>🤖 Sugerencias de IA:</div>
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            {sugerencias.map((s,i) => (
              <button key={i} onClick={() => { setInput(s); setSugerencias([]); }}
                style={{background:"#fff",border:"1px solid #bae6fd",borderRadius:"8px",padding:"8px 12px",fontSize:"12px",color:"#1a3a5c",cursor:"pointer",textAlign:"left",lineHeight:"1.4"}}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{background:"#fff",padding:"12px 14px",borderTop:"1px solid #e5e7eb",display:"flex",gap:"8px",alignItems:"flex-end"}}>
        <button
          onClick={pedirSugerencias}
          disabled={loadingSug}
          title="Pedir sugerencias a la IA"
          style={{width:"38px",height:"38px",borderRadius:"8px",background:loadingSug?"#e5e7eb":"#f0f9ff",border:"1px solid #bae6fd",cursor:"pointer",fontSize:"16px",flexShrink:0}}
        >
          {loadingSug ? "⏳" : "🤖"}
        </button>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); enviar(); }}}
          placeholder="Escribir respuesta..."
          rows={1}
          style={{flex:1,border:"1px solid #d1d5db",borderRadius:"8px",padding:"8px 12px",fontSize:"13px",resize:"none",outline:"none",fontFamily:"inherit"}}
        />
        <button
          onClick={() => enviar()}
          disabled={sending || !input.trim()}
          style={{width:"38px",height:"38px",borderRadius:"8px",background:input.trim()?"linear-gradient(135deg,#1a3a5c,#1e4d7b)":"#e5e7eb",border:"none",cursor:input.trim()?"pointer":"default",flexShrink:0}}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{margin:"auto",display:"block"}}>
            <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke={input.trim()?"#fff":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
