"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const result = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (result?.error) { setError("Email ou senha inválidos."); return }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium mb-1.5 text-[var(--text-secondary)]">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com" required autoComplete="email"
            className="input" />
        </div>
        <div>
          <label className="block text-[13px] font-medium mb-1.5 text-[var(--text-secondary)]">Senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password"
            className="input" />
        </div>
        {error && <p className="text-[13px] text-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 rounded-xl">{error}</p>}
        <button type="submit" disabled={loading}
          className="btn-primary w-full py-3 text-[15px]">{loading ? "Entrando..." : "Entrar"}</button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border)]" /></div>
        <div className="relative flex justify-center text-xs"><span className="px-3 bg-[var(--bg-page)] text-[var(--text-muted)]">ou</span></div>
      </div>

      <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="btn-secondary w-full py-3 text-[15px]">
        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continuar com Google
      </button>

      <p className="text-center text-[13px] text-[var(--text-secondary)]">
        Não tem conta?{" "}
        <Link href="/auth/register" className="text-[var(--accent)] hover:underline font-medium">Cadastre-se</Link>
      </p>
    </div>
  )
}
