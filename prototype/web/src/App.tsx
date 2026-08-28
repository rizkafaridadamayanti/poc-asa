import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { Layout } from "./components/Layout.js"
import { Dashboard } from "./pages/Dashboard.js"
import { Messages } from "./pages/Messages.js"
import { Summaries } from "./pages/Summaries.js"
import { Groups } from "./pages/Groups.js"
import { Infografis } from "./pages/Infografis.js"
import { InformasiBaru } from "./pages/InformasiBaru.js"
import { PengingatAgenda } from "./pages/PengingatAgenda.js"
import { SpamAlerts } from "./pages/SpamAlerts.js"
import { AntrianIde } from "./pages/AntrianIde.js"
import { AuthPage } from "./pages/AuthPage.js"
import { isLoggedIn } from "./api.js"

// AuthPage is rendered directly here (not inside a <Route>) so that switching
// between /login and /register keeps the same component instance mounted —
// its sliding-panel CSS transition animates only if React doesn't remount it,
// which a per-path <Route> would otherwise force.
function AppShell() {
  const location = useLocation()

  if (location.pathname === "/login") return <AuthPage mode="login" />
  if (location.pathname === "/register") return <AuthPage mode="register" />
  if (!isLoggedIn()) return <Navigate to="/login" replace />

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="messages" element={<Messages />} />
        <Route path="summaries" element={<Summaries />} />
        <Route path="groups" element={<Groups />} />
        <Route path="infografis" element={<Infografis />} />
        <Route path="informasi-baru" element={<InformasiBaru />} />
        <Route path="pengingat-agenda" element={<PengingatAgenda />} />
        <Route path="spam-alerts" element={<SpamAlerts />} />
        <Route path="antrian-ide" element={<AntrianIde />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App
