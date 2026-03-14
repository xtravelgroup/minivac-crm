import MiniVacShell from './minivac-crm-shell.jsx'
import ChatPublico from './chat-publico.jsx'
import ClientPortal from './client-portal.jsx'
import CapturaTarjeta from './captura-tarjeta.jsx'

export default function App() {
  const path = window.location.pathname;
  const search = window.location.search;
  
  // Ruta pública del chat: /chat?t=TOKEN
  if (path === '/chat' || path.startsWith('/chat/')) {
    return <ChatPublico />
  }

  if (path === '/portal' || path.startsWith('/portal')) {
    return <ClientPortal />
  }

  if (path === '/captura-tarjeta') {
    return <CapturaTarjeta />
  }
  
  return <MiniVacShell />
}
