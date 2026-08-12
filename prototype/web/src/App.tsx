import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "./components/Layout.js"
import { Dashboard } from "./pages/Dashboard.js"
import { Messages } from "./pages/Messages.js"
import { Riwayat } from "./pages/Riwayat.js"
import { Summaries } from "./pages/Summaries.js"
import { Groups } from "./pages/Groups.js"
import { Infografis } from "./pages/Infografis.js"
import { Send } from "./pages/Send.js"
import { Digest } from "./pages/Digest.js"
import { InformasiBaru } from "./pages/InformasiBaru.js"
import { PengingatAgenda } from "./pages/PengingatAgenda.js"
import { SpamAlerts } from "./pages/SpamAlerts.js"
import { QA } from "./pages/QA.js"
import { AntrianIde } from "./pages/AntrianIde.js"
import { LoginPage } from "./pages/Login.js"
import { RegisterPage } from "./pages/Register.js"
import { isLoggedIn } from "./api.js"
import "./App.css"

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="messages" element={<Messages />} />
          <Route path="riwayat" element={<Riwayat />} />
          <Route path="summaries" element={<Summaries />} />
          <Route path="groups" element={<Groups />} />
          <Route path="infografis" element={<Infografis />} />
          <Route path="send" element={<Send />} />
          <Route path="digest" element={<Digest />} />
          <Route path="informasi-baru" element={<InformasiBaru />} />
          <Route path="pengingat-agenda" element={<PengingatAgenda />} />
          <Route path="spam-alerts" element={<SpamAlerts />} />
          <Route path="qa" element={<QA />} />
          <Route path="antrian-ide" element={<AntrianIde />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
