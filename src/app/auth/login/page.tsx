import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginForm } from "./login-form"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-[var(--bg-page)]">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[var(--text-primary)] flex items-center justify-center mx-auto">
            <span className="text-[var(--bg-surface)] text-xl font-bold">L</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Dyvio</h1>
          <p className="text-[14px] text-[var(--text-secondary)]">Entre para gerenciar suas despesas</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
