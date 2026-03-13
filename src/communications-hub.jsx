import { useState, useEffect, useRef } from "react";
import EmailPanel from "./email-panel.jsx";
import ChatVendedor from "./chat-vendedor.jsx";

const SB_URL   = "https://gsvnvahrjgswwejnuiyn.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzdm52YWhyamdzd3dlam51aXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTUwNDIsImV4cCI6MjA4ODU5MTA0Mn0.xceJjgUnkAu7Jzeo0IY1EmBjRqgyybtPf4odcg1WFeA";

async function sbGet(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}` }
  });
  return r.json();
}

const CANAL_ICONS = { chat: "💬", email: "✉️", whatsapp: "📱", kixie: "📞" };
const CANAL_COLORS = { chat: "#0891b2", email: "#6d28d9", whatsapp: "#16a34a", kixie: "#d97706" };

export default function CommunicationsHub({ currentUser, destCatalog, onVerLead }) {
  const [leads, setLeads]         = useState([]);
  const [selLead, setSelLead]     = useState(null);
  const [canal, setCanal]         = useState("chat");
  const [loading, setLoading]     = useState(true);
  const [busqueda, setBusqueda]   = useState("");
  const [resumen, setResumen]     = useState({}); // { leadId: { chat: n, email: n } }
  const pollRef = useRef(null);

  useEffect(() => {
    cargar();
    pollRef.current = setInterval(cargarResumen, 8000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function cargar() {
    setLoading(true);
    try {
      // Traer leads del vendedor o todos si admin
      const isAdmin = ["admin","director","supervisor"].includes(currentUser?.role || currentUser?.rol);
      const query = isAdmin
        ? `leads?select=id,nombre,email,tel,whatsapp,status,destinos,vendedor_id&order=updated_at.desc&limit=100`
        : `leads?select=id,nombre,email,tel,whatsapp,status,destinos,vendedor_id&vendedor_id=eq.${currentUser?.id}&order=updated_at.desc&limit=100`;
      const data = await sbGet(query);
      const leadsArr = Array.isArray(data) ? data : [];
      // Fetch vendedores
      const usrs = await sbGet('usuarios?select=id,nombre&order=nombre');
      console.log("usuarios fetch:", usrs);
      const usrMap = {};
      (Array.isArray(usrs) ? usrs : []).forEach(u => { usrMap[u.id] = u.nombre; });
      // Attach vendedor nombre to each lead
      const leadsConVendedor = leadsArr.map(l => ({...l, vendedorNombre: usrMap[l.vendedor_id] || null}));
      setLeads(leadsConVendedor);
      await cargarResumen(data);
    } catch(e) {}
    setLoading(false);
  }

  async function cargarResumen(leadsData) {
    const ls = leadsData || leads;
    if (!ls.length) return;
    const ids = ls.map(l => l.id);
    try {
      // Contar emails por lead
      const emails = await sbGet(`emails?lead_id=in.(${ids.join(",")})&select=lead_id,direction`);
      // Contar mensajes de chat por lead
      const chats = await sbGet(`chats?lead_id=in.(${ids.join(",")})&select=id,lead_id`);
      const chatIds = (chats||[]).map(c => c.id);
      let chatMsgs = [];
      if (chatIds.length) {
        chatMsgs = await sbGet(`chat_mensajes?chat_id=in.(${chatIds.join(",")})&autor=eq.cliente&select=chat_id`);
      }

      const res = {};
      ls.forEach(l => {
        const em = (emails||[]).filter(e => e.lead_id === l.id).length;
        const ch = (chats||[]).find(c => c.lead_id === l.id);
        const cm = ch ? (chatMsgs||[]).filter(m => m.chat_id === ch.id).length : 0;
        res[l.id] = { email: em, chat: cm };
      });
      setResumen(res);
    } catch(e) {}
  }

  const leadsFiltrados = leads.filter(l => {
    const q = busqueda.toLowerCase();
    return !q || (l.nombre||"").toLowerCase().includes(q) || (l.email||"").toLowerCase().includes(q);
  });

  const S = {
    container: { display:"flex", height:"calc(100vh - 80px)", fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#f1f5f9" },
    sidebar: { width:"300px", flexShrink:0, background:"#fff", borderRight:"1px solid #e2e8f0", display:"flex", flexDirection:"column" },
    main: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  };

  return (
    <div style={S.container}>
      {/* Sidebar — lista de clientes */}
      <div style={S.sidebar}>
        {/* Header sidebar */}
        <div style={{padding:"16px",borderBottom:"1px solid #e2e8f0"}}>
          <div style={{fontWeight:"800",fontSize:"16px",color:"#1a3a5c",marginBottom:"10px"}}>📡 Comunicaciones</div>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar cliente..."
            style={{width:"100%",border:"1px solid #d1d5db",borderRadius:"8px",padding:"8px 12px",fontSize:"13px",outline:"none",boxSizing:"border-box"}}
          />
        </div>

        {/* Lista leads */}
        <div style={{flex:1,overflowY:"auto"}}>
          {loading && <div style={{padding:"24px",textAlign:"center",color:"#94a3b8",fontSize:"13px"}}>Cargando...</div>}
          {!loading && leadsFiltrados.length === 0 && (
            <div style={{padding:"24px",textAlign:"center",color:"#94a3b8",fontSize:"13px"}}>No hay clientes</div>
          )}
          {leadsFiltrados.map(lead => {
            const r = resumen[lead.id] || {};
            const total = (r.email||0) + (r.chat||0);
            const isSelected = selLead?.id === lead.id;
            return (
              <div key={lead.id}
                onClick={() => { setSelLead(lead); setCanal("chat"); }}
                style={{padding:"12px 16px",borderBottom:"1px solid #f1f5f9",cursor:"pointer",background:isSelected?"#eff6ff":"#fff",borderLeft:isSelected?"3px solid #1a3a5c":"3px solid transparent",transition:"all 0.15s"}}
              >
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"4px"}}>
                  <div style={{fontWeight:"700",fontSize:"14px",color:"#1a3a5c",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{lead.nombre||"Sin nombre"}</div>
                  {total > 0 && <span style={{background:"#1a3a5c",color:"#fff",borderRadius:"20px",padding:"1px 7px",fontSize:"10px",fontWeight:"700",flexShrink:0,marginLeft:"6px"}}>{total}</span>}
                </div>
                <div style={{fontSize:"12px",color:"#64748b",marginBottom:"6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lead.email||lead.tel||"Sin contacto"}</div>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{background:"#f1f5f9",color:"#475569",borderRadius:"20px",padding:"2px 8px",fontSize:"10px",fontWeight:"600"}}>{lead.status||"nuevo"}</span>
                  {lead.vendedorNombre && <span style={{background:"#fef3c7",color:"#92400e",borderRadius:"20px",padding:"2px 8px",fontSize:"10px",fontWeight:"600"}}>👤 {lead.usuarios.nombre}</span>}
                  {r.chat > 0 && <span style={{background:"#e0f2fe",color:"#0369a1",borderRadius:"20px",padding:"2px 7px",fontSize:"10px",fontWeight:"700"}}>💬 {r.chat}</span>}
                  {r.email > 0 && <span style={{background:"#ede9fe",color:"#6d28d9",borderRadius:"20px",padding:"2px 7px",fontSize:"10px",fontWeight:"700"}}>✉️ {r.email}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel principal */}
      <div style={S.main}>
        {!selLead ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"12px",color:"#94a3b8"}}>
            <div style={{fontSize:"64px"}}>📡</div>
            <div style={{fontWeight:"700",fontSize:"18px",color:"#64748b"}}>Selecciona un cliente</div>
            <div style={{fontSize:"14px"}}>para ver todas sus comunicaciones</div>
          </div>
        ) : (
          <>
            {/* Header cliente */}
            <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"16px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                <div style={{width:"44px",height:"44px",borderRadius:"50%",background:"linear-gradient(135deg,#1a3a5c,#3b82f6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"800",fontSize:"18px",flexShrink:0}}>
                  {(selLead.nombre||"?").charAt(0)}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:"800",fontSize:"16px",color:"#1a3a5c"}}>{selLead.nombre}</div>
                  <div style={{fontSize:"12px",color:"#64748b",display:"flex",gap:"12px",marginTop:"2px"}}>
                    {selLead.email && <span>✉️ {selLead.email}</span>}
                    {selLead.tel   && <span>📞 {selLead.tel}</span>}
                    {selLead.whatsapp && <span>📱 {selLead.whatsapp}</span>}
                  </div>
                </div>
                <span style={{background:"#f1f5f9",color:"#475569",borderRadius:"20px",padding:"4px 12px",fontSize:"12px",fontWeight:"700"}}>{selLead.status||"nuevo"}</span>
                {onVerLead && <button onClick={()=>onVerLead(selLead)} style={{background:"#1a3a5c",color:"#fff",border:"none",borderRadius:"20px",padding:"4px 12px",fontSize:"12px",fontWeight:"700",cursor:"pointer"}}>📋 Ver Lead</button>}
              </div>

              {/* Tabs de canal */}
              <div style={{display:"flex",gap:"4px",marginTop:"14px",borderBottom:"none"}}>
                {[
                  { id:"chat",     label:"💬 Chat" },
                  { id:"email",    label:"✉️ Email" },
                  { id:"whatsapp", label:"📱 WhatsApp" },
                  { id:"kixie",    label:"📞 Llamadas" },
                ].map(t => (
                  <button key={t.id} onClick={() => setCanal(t.id)}
                    style={{padding:"8px 14px",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"13px",fontWeight:canal===t.id?"700":"500",
                      background:canal===t.id?CANAL_COLORS[t.id]:"#f1f5f9",
                      color:canal===t.id?"#fff":"#475569",transition:"all 0.15s"}}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contenido del canal */}
            <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
              {canal === "chat" && (
                <ChatVendedor lead={selLead} currentUser={currentUser} />
              )}
              {canal === "email" && (
                <EmailPanel lead={selLead} currentUser={currentUser} destCatalog={destCatalog||[]} />
              )}
              {canal === "whatsapp" && (
                <div style={{background:"#fff",borderRadius:"12px",padding:"32px",textAlign:"center",border:"1px solid #e2e8f0"}}>
                  <div style={{fontSize:"48px",marginBottom:"12px"}}>📱</div>
                  <div style={{fontWeight:"700",fontSize:"16px",color:"#1a3a5c",marginBottom:"8px"}}>WhatsApp</div>
                  {selLead.whatsapp ? (
                    <>
                      <div style={{color:"#64748b",fontSize:"13px",marginBottom:"16px"}}>{selLead.whatsapp}</div>
                      <a href={`https://wa.me/${selLead.whatsapp.replace(/\D/g,"")}`} target="_blank"
                        style={{display:"inline-block",background:"#16a34a",color:"#fff",borderRadius:"8px",padding:"10px 24px",fontWeight:"700",fontSize:"14px",textDecoration:"none"}}>
                        Abrir WhatsApp
                      </a>
                    </>
                  ) : (
                    <div style={{color:"#94a3b8",fontSize:"13px"}}>No hay número de WhatsApp registrado</div>
                  )}
                </div>
              )}
              {canal === "kixie" && (
                <div style={{background:"#fff",borderRadius:"12px",padding:"32px",textAlign:"center",border:"1px solid #e2e8f0"}}>
                  <div style={{fontSize:"48px",marginBottom:"12px"}}>📞</div>
                  <div style={{fontWeight:"700",fontSize:"16px",color:"#1a3a5c",marginBottom:"8px"}}>Llamadas y SMS</div>
                  {selLead.tel ? (
                    <>
                      <div style={{color:"#64748b",fontSize:"13px",marginBottom:"16px"}}>{selLead.tel}</div>
                      <a href={`tel:${selLead.tel}`}
                        style={{display:"inline-block",background:"#d97706",color:"#fff",borderRadius:"8px",padding:"10px 24px",fontWeight:"700",fontSize:"14px",textDecoration:"none"}}>
                        Llamar ahora
                      </a>
                    </>
                  ) : (
                    <div style={{color:"#94a3b8",fontSize:"13px"}}>No hay teléfono registrado</div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
