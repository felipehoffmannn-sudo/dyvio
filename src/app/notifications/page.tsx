import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatRelativeTime } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@chakra-ui/react"
import { Bell, Users, Receipt, HandCoins } from "lucide-react"

const typeIcons: Record<string, any> = {
  EXPENSE_CREATED: Receipt,
  EXPENSE_DELETED: Receipt,
  PAYMENT_RECEIVED: HandCoins,
  INVITE: Users,
  MEMBER_JOINED: Users,
  MEMBER_LEFT: Users,
}

const typeLabels: Record<string, string> = {
  EXPENSE_CREATED: "Nova despesa",
  EXPENSE_DELETED: "Despesa removida",
  PAYMENT_RECEIVED: "Pagamento recebido",
  INVITE: "Convite",
  MEMBER_JOINED: "Novo membro",
  MEMBER_LEFT: "Membro saiu",
}

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/auth/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) redirect("/auth/login")

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const invites = await prisma.invite.findMany({
    where: { email: user.email, status: "PENDING" },
    include: {
      group: { select: { id: true, name: true } },
      inviter: { select: { name: true } },
    },
  })

  return (
    <div className="min-h-screen bg-[var(--bg-page)] pb-20">
      <header className="sticky top-0 z-40 bg-[var(--bg-page)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">←</Link>
          <h1 className="text-lg font-semibold">Notificações</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Invites */}
        {invites.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Convites pendentes</h2>
            <div className="space-y-2">
              {invites.map(invite => (
                <div key={invite.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{invite.group.name}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                        {invite.inviter.name} te convidou
                      </p>
                    </div>
                    <form action={`/api/invites/${invite.token}/accept`} method="POST">
                      <Link href={`/invite/${invite.token}`}>
                        <Button colorPalette="green" size="sm">Ver convite</Button>
                      </Link>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notifications */}
        <section>
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Atividades</h2>
          {notifications.length === 0 ? (
            <div className="card p-12 text-center space-y-4">
              <div className="text-4xl"><Bell className="w-10 h-10 mx-auto text-[var(--text-tertiary)]" /></div>
              <div>
                <h3 className="font-semibold">Nenhuma notificação</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Novidades do seus grupos aparecerão aqui.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map(notif => {
                const Icon = typeIcons[notif.type] || Bell
                return (
                  <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--bg-surface)] transition-colors">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                      notif.isRead ? "bg-[var(--bg-page)]" : "bg-[var(--accent-soft)]"
                    )}>
                      <Icon className={cn("w-4 h-4", notif.isRead ? "text-[var(--text-tertiary)]" : "text-[var(--accent)]")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", !notif.isRead && "font-medium")}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{notif.body}</p>
                      )}
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">{formatRelativeTime(notif.createdAt)}</p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function cn(...args: any[]) { return args.filter(Boolean).join(" ") }
