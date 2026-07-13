import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDateShort } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@chakra-ui/react"

export default async function InvitesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/auth/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) redirect("/auth/login")

  const invites = await prisma.invite.findMany({
    where: { email: user.email, status: "PENDING" },
    include: {
      group: { select: { id: true, name: true, description: true } },
      inviter: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="sticky top-0 z-40 bg-[var(--bg-page)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">←</Link>
          <h1 className="text-lg font-semibold">Convites</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {invites.length === 0 ? (
          <div className="card p-12 text-center space-y-4">
            <div className="text-4xl">📨</div>
            <div>
              <h3 className="font-semibold">Nenhum convite</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Quando alguém te convidar para um grupo, o convite aparecerá aqui.
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Ir para o início</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map(invite => (
              <div key={invite.id} className="card p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-lg shrink-0">
                    👥
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{invite.group.name}</h3>
                    {invite.group.description && (
                      <p className="text-sm text-[var(--text-secondary)] mt-0.5">{invite.group.description}</p>
                    )}
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      Convidado por {invite.inviter.name} · {formatDateShort(invite.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/invite/${invite.token}`} className="flex-1">
                    <Button colorPalette="green" w="full" size="sm">Aceitar</Button>
                  </Link>
                  <form action={async () => {
                    "use server"
                    const { prisma } = await import("@/lib/prisma")
                    const { revalidatePath } = await import("next/cache")
                    await prisma.invite.update({ where: { id: invite.id }, data: { status: "REJECTED" } })
                    revalidatePath("/invites")
                  }}>
                    <Button variant="ghost" size="sm" type="submit">Recusar</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
