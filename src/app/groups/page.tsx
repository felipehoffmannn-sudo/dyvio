import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getNetBalanceInGroup } from "@/lib/ledger-engine"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@chakra-ui/react"
import { Plus, Users } from "lucide-react"

export default async function GroupsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/auth/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) redirect("/auth/login")

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, leftAt: null },
    include: {
      group: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { group: { updatedAt: "desc" } },
  })

  const groupsWithBalances = await Promise.all(
    memberships.map(async (m) => {
      const balance = await getNetBalanceInGroup(user.id, m.group.id)
      return {
        ...m.group,
        memberCount: m.group._count.members,
        balance: Math.round(balance * 100) / 100,
        role: m.role,
      }
    })
  )

  return (
    <div className="min-h-screen bg-[var(--bg-page)] pb-20">
      <header className="sticky top-0 z-40 bg-[var(--bg-page)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Grupos</h1>
          <Link href="/groups/new">
            <Button variant="ghost" size="sm">
              Novo
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {groupsWithBalances.length === 0 ? (
          <div className="card p-12 text-center space-y-4">
            <div className="text-4xl">📋</div>
            <div>
              <h3 className="font-semibold text-lg">Nenhum grupo</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Crie ou entre em um grupo para começar
              </p>
            </div>
            <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
              <Link href="/groups/new">
                <Button colorPalette="green" w="full">
                  Criar grupo
                </Button>
              </Link>
              <Link href="/invites">
                <Button variant="outline" w="full">
                  🔗 Tenho um convite
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {groupsWithBalances.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <div className="card-hover p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
                        <Users className="w-5 h-5 text-[var(--accent)]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{group.name}</p>
                          {group.role === "OWNER" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                              admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          {group.memberCount} membros
                          {group.isArchived && " · Arquivado"}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-mono font-medium ${
                      group.balance > 0
                        ? "text-[var(--success)]"
                        : group.balance < 0
                        ? "text-[var(--danger)]"
                        : "text-[var(--text-tertiary)]"
                    }`}>
                      {group.balance > 0
                        ? `+${formatCurrency(Math.round(group.balance * 100))}`
                        : group.balance < 0
                        ? `-${formatCurrency(Math.round(Math.abs(group.balance) * 100))}`
                        : "R$ 0,00"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Nav (same as dashboard) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--bg-surface)] border-t border-[var(--border)] md:hidden">
        <div className="flex items-center justify-around h-14">
          <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-[var(--text-tertiary)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px]">Início</span>
          </Link>
          <Link href="/groups" className="flex flex-col items-center gap-0.5 text-[var(--accent)]">
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Grupos</span>
          </Link>
          <Link href="/groups/new" className="flex flex-col items-center gap-0.5 text-[var(--text-tertiary)]">
            <div className="w-8 h-8 rounded-full bg-[var(--text-primary)] text-[var(--bg-surface)] flex items-center justify-center -mt-3">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[10px]">Nova</span>
          </Link>
          <Link href="/history" className="flex flex-col items-center gap-0.5 text-[var(--text-tertiary)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px]">Histórico</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-0.5 text-[var(--text-tertiary)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px]">Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
