import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Zap,
  Activity,
  Bot,
  UserPlus,
  Sparkles,
} from "lucide-react"
import { login, register } from "../api.js"

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "Kosong", color: "bg-slate-200" }
  let score = 0
  if (pw.length >= 6) score += 1
  if (pw.length >= 10) score += 1
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1
  if (score <= 1) return { score: 1, label: "Lemah", color: "bg-rose-500" }
  if (score === 2) return { score: 2, label: "Sedang", color: "bg-amber-500" }
  if (score === 3) return { score: 3, label: "Kuat", color: "bg-blue-600" }
  return { score: 4, label: "Sangat Kuat", color: "bg-emerald-600" }
}

function TabSwitch({ mode, onSwitch }: { mode: "login" | "register"; onSwitch: (m: "login" | "register") => void }) {
  return (
    <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-[280px]">
      <button
        type="button"
        onClick={() => onSwitch("login")}
        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
          mode === "login" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Masuk
      </button>
      <button
        type="button"
        onClick={() => onSwitch("register")}
        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
          mode === "register" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Daftar
      </button>
    </div>
  )
}

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate()
  const isRegister = mode === "register"

  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginShowPassword, setLoginShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [regUsername, setRegUsername] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regConfirmPassword, setRegConfirmPassword] = useState("")
  const [regInviteCode, setRegInviteCode] = useState("")
  const [regShowPassword, setRegShowPassword] = useState(false)
  const [regShowConfirmPassword, setRegShowConfirmPassword] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [loginStepText, setLoginStepText] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loginUserRef = useRef<HTMLInputElement>(null)
  const regUserRef = useRef<HTMLInputElement>(null)

  const switchMode = (newMode: "login" | "register") => {
    if (mode === newMode) return
    setErrorMessage(null)
    navigate(`/${newMode}`, { replace: true })
    requestAnimationFrame(() => {
      if (newMode === "login") loginUserRef.current?.focus()
      else regUserRef.current?.focus()
    })
  }

  const strength = getPasswordStrength(regPassword)

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    if (!loginUsername.trim()) {
      setErrorMessage("Username wajib diisi.")
      return
    }
    if (!loginPassword) {
      setErrorMessage("Password wajib diisi.")
      return
    }
    setIsLoading(true)
    setLoginStepText("Menginisialisasi sesi WhatsApp Bridge...")
    const stepTimer = setTimeout(() => setLoginStepText("Memverifikasi kunci enkripsi..."), 250)
    try {
      await login(loginUsername, loginPassword)
      navigate("/")
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
    } finally {
      clearTimeout(stepTimer)
      setIsLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    if (!regUsername.trim()) {
      setErrorMessage("Username wajib diisi.")
      return
    }
    if (regPassword.length < 6) {
      setErrorMessage("Password minimal harus 6 karakter.")
      return
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage("Password dan Konfirmasi Password tidak sama.")
      return
    }
    if (!regInviteCode.trim()) {
      setErrorMessage("Kode Pengurus wajib diisi.")
      return
    }
    setIsLoading(true)
    setLoginStepText("Mendaftarkan akun pengurus baru...")
    try {
      await register(regUsername, regPassword, regInviteCode.trim())
      navigate("/")
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen bg-blue-700 flex flex-col relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full h-full bg-white overflow-hidden relative z-10">
        {/* Desktop sliding layout */}
        <div className="relative w-full h-full min-h-[600px] hidden lg:block overflow-hidden">
          {/* Sliding hero panel */}
          <div
            className={`absolute top-0 bottom-0 w-1/2 bg-gradient-to-br from-blue-600 to-blue-700 p-10 xl:p-14 text-white flex flex-col overflow-hidden z-20 will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              isRegister ? "translate-x-full" : "translate-x-0"
            }`}
          >
            <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 shrink-0">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center font-black shadow-lg border border-white/20">
                    {isRegister ? (
                      <UserPlus className="w-5 h-5 text-white" />
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">
                      {isRegister ? "PENDAFTARAN PENGURUS" : "ASA BRIDGE"}
                    </h2>
                    <p className="text-[11px] text-blue-200 font-semibold tracking-wider uppercase">
                      {isRegister ? "Registrasi Akun Baru" : "Karang Taruna WhatsApp Bot"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-slate-200 border border-white/10 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Node 01 Online</span>
                </div>
              </div>
              <p className="text-sm text-blue-100 leading-relaxed font-normal max-w-md">
                {isRegister
                  ? "Daftarkan diri Anda untuk mendapatkan hak akses pengelolaan bot WhatsApp, penyiaran informasi resmi, dan rangkuman notulensi rapat otomatis."
                  : "Sistem jembatan komunikasi digital untuk koordinasi antar-dusun, broadcast pengumuman resmi, dan ekstraksi notulensi otomatis."}
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-center relative z-10 py-6">
              {isRegister ? (
                <div className="space-y-3.5">
                  <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-sm flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white/10 text-blue-100 shrink-0 mt-0.5 border border-white/10">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">AI Summary Rapat</h4>
                      <p className="text-xs text-blue-100/80 mt-0.5">
                        Rangkuman poin keputusan dan tindak lanjut dari ratusan percakapan secara otomatis.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-sm flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white/10 text-blue-100 shrink-0 mt-0.5 border border-white/10">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Multi Broadcast Terpadu</h4>
                      <p className="text-xs text-blue-100/80 mt-0.5">
                        Distribusi agenda dan pengumuman desa ke seluruh grup dusun secara serentak.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-sm flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white/10 text-blue-100 shrink-0 mt-0.5 border border-white/10">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Protokol Keamanan Terenkripsi</h4>
                      <p className="text-xs text-blue-100/80 mt-0.5">
                        Integrasi Baileys Multi-Device dengan perlindungan privasi data warga.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-md bg-white/10 text-blue-100 flex items-center justify-center text-[10px] font-bold border border-white/10">
                          WA
                        </div>
                        <span className="text-sm font-semibold text-white">Grup Dusun Krajan</span>
                      </div>
                      <span className="text-[11px] text-blue-100/70 font-mono">15:24 WIB</span>
                    </div>
                    <p className="text-sm text-blue-50 font-normal">
                      "Persiapan tirakatan malam 17-an sudah 85%, mohon kirimkan rundown terbaru ke ketua panitia."
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] bg-white/10 text-blue-100 px-2 py-0.5 rounded-md font-medium border border-white/10">
                        <Sparkles className="w-3 h-3" />
                        AI Summary Extracted
                      </span>
                      <span className="text-[11px] text-emerald-400 font-medium">Terverifikasi</span>
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-white/10 text-blue-100 border border-white/10">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">Auto Broadcast Engine</div>
                        <div className="text-[11px] text-blue-100/70">Pengumuman Beasiswa Desa disebarkan ke 9 grup</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-emerald-400 font-mono">9/9 Sukses</div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-200" />
                      <span className="text-sm font-medium text-blue-100">Live Traffic Stream</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1 bg-blue-200 rounded-full" style={{ height: "14px" }} />
                      <div className="w-1 bg-blue-200 rounded-full" style={{ height: "22px" }} />
                      <div className="w-1 bg-blue-200 rounded-full" style={{ height: "18px" }} />
                      <div className="w-1 bg-blue-200 rounded-full" style={{ height: "24px" }} />
                      <div className="w-1 bg-blue-200 rounded-full" style={{ height: "16px" }} />
                    </div>
                    <span className="text-[11px] font-mono text-blue-100/70">24ms avg</span>
                  </div>
                </div>
              )}

              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={() => switchMode(isRegister ? "login" : "register")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-700 text-xs font-bold shadow-sm hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <span>{isRegister ? "Masuk ke Akun" : "Daftar Akun Baru"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center gap-1.5 text-xs text-blue-100 font-medium relative z-10 shrink-0">
              <ShieldCheck className="w-4 h-4 text-blue-200" />
              <span>Multi-Device Protocol Enkripsi</span>
            </div>
          </div>

          {/* Register form panel (left) */}
          <div
            className={`absolute top-0 bottom-0 left-0 w-1/2 p-10 xl:p-14 flex flex-col bg-white z-10 transition-opacity duration-300 ${
              isRegister ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="flex items-center justify-end mb-5 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shrink-0">
                <UserPlus className="w-3.5 h-3.5 text-blue-700" />
                <span>Registrasi Pengurus</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-4">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Buat Akun Administrator</h1>
                <p className="text-sm text-slate-500 mt-1">Lengkapi data di bawah ini untuk mendaftarkan akun pengurus baru.</p>
              </div>

              {errorMessage && isRegister && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      ref={regUserRef}
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                      placeholder="username"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-sm text-slate-900 placeholder-slate-400 font-mono font-medium"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <input
                        type={regShowPassword ? "text" : "password"}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="min. 6 karakter"
                        className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-200 focus:border-blue-600 rounded-xl text-sm text-slate-900 font-medium font-mono"
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setRegShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {regShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Ulangi Sandi</label>
                    <div className="relative">
                      <input
                        type={regShowConfirmPassword ? "text" : "password"}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="ulangi sandi"
                        className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-200 focus:border-blue-600 rounded-xl text-sm text-slate-900 font-medium font-mono"
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setRegShowConfirmPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {regShowConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {regPassword && (
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Kekuatan Sandi:</span>
                      <span className="font-bold text-slate-700">{strength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`rounded-full transition-all duration-300 ${strength.score >= step ? strength.color : "bg-slate-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Kode Pengurus <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={regInviteCode}
                    onChange={(e) => setRegInviteCode(e.target.value)}
                    placeholder="dari ketua / pengurus pusat"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-sm text-slate-900 placeholder-slate-400 font-mono font-medium"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{loginStepText || "Mendaftarkan Akun..."}</span>
                      </div>
                    ) : (
                      <>
                        <span>Daftar &amp; Masuk Otomatis</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Login form panel (right) */}
          <div
            className={`absolute top-0 bottom-0 right-0 w-1/2 p-10 xl:p-14 flex flex-col bg-white z-10 transition-opacity duration-300 ${
              !isRegister ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="flex items-center justify-end mb-5 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                <span>Portal Admin</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-4">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Selamat Datang Kembali</h1>
                <p className="text-sm text-slate-500 mt-1">Masukkan akun admin untuk mengelola bot WhatsApp dan notulensi rapat.</p>
              </div>

              {errorMessage && !isRegister && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Username Akun</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      ref={loginUserRef}
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="admin.pusat"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-sm text-slate-900 placeholder-slate-400 font-medium"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => alert("Password akun demo: password123")}
                      className="text-[11px] text-blue-700 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                    >
                      Lupa Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={loginShowPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl text-sm text-slate-900 placeholder-slate-400 font-medium font-mono"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setLoginShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {loginShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-600 cursor-pointer"
                    />
                    <span className="text-sm text-slate-600 font-medium">Ingat saya di perangkat ini</span>
                  </label>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{loginStepText || "Memverifikasi Akun..."}</span>
                      </div>
                    ) : (
                      <>
                        <span>Masuk ke Dashboard</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden p-6 bg-white space-y-4 h-full overflow-y-auto">
          <TabSwitch mode={mode} onSwitch={switchMode} />

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!isRegister ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-70">
                {isLoading ? "Memverifikasi..." : "Masuk ke Dashboard"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ulangi Sandi</label>
                <input
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Pengurus</label>
                <input
                  type="text"
                  value={regInviteCode}
                  onChange={(e) => setRegInviteCode(e.target.value)}
                  placeholder="dari ketua / pengurus pusat"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
              {regPassword && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Kekuatan Sandi:</span>
                    <span className="font-bold text-slate-700">{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full transition-all duration-300 ${strength.score >= step ? strength.color : "bg-slate-200"}`}
                      />
                    ))}
                  </div>
                </div>
              )}
              <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-70">
                {isLoading ? "Mendaftarkan..." : "Daftar Sekarang"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
