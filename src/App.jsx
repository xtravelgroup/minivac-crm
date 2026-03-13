import MiniVacShell from './minivac-crm-shell.jsx'
import ChatPublico from './chat-publico.jsx'

export default function App() {
  const path = window.location.pathname;
  const search = window.location.search;
  
  // Ruta pública del chat: /chat?t=TOKEN
  if (path === '/chat' || path.startsWith('/chat/')) {
    return <ChatPublico />
  }
  
  return <MiniVacShell />
}
