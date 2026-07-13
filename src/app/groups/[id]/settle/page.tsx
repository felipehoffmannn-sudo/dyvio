import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { computeSettlement } from "@/lib/ledger-engine"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { RegisterPaymentButton } from "./register-payment-button"

export default async function SettlementPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/auth/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) redirect("/auth/login")

  const group = await prisma.group.findUnique({ where: { id: params.id } })
  if (!group) redirect("/dashboard")

  const settlement = await computeSettlement(group.id)

  // Get member names
  const userIds = new Set<string>()
  settlement.forEach(s => {
    userIds.add(s.fromUserId)
    userIds.add(s.toUserId)
  })

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true, email: true },
  })

  const userMap = new Map(users.map(u => [u.id, u.name || u.email]))

  const mySettlements = settlement.filter(
    s => s.fromUserId === user.id || s.toUserId === user.id
  )
  const otherSettlements = settlement.filter(
    s => s.fromUserId !== user.id && s.toUserId !== user.id
  )

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="sticky top-0 z-40 bg-[var(--bg-page)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href={`/groups/${group.id}`} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ←
          </Link>
          <h1 className="text-lg font-semibold">Liquidação</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {settlement.length === 0 ? (
          <div className="card p-12 text-center space-y-4">
            <div className="text-4xl">✅</div>
            <div>
              <h3 className="font-semibold">Tudo quitado!</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Não há pagamentos pendentes neste grupo.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* My settlements */}
            {mySettlements.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                  Seus pagamentos
                </h2>
                <div className="space-y-2">
                  {mySettlements.map((s, i) => {
                    const isPaying = s.fromUserId === user.id
                    return (
                      <div key={i} className="card p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm">
                              {isPaying
                                ? `Você → ${userMap.get(s.toUserId)}`
                                : `${userMap.get(s.fromUserId)} → Você`}
                            </p>
                            <p className="text-lg font-semibold font-mono mt-1">
                              {formatCurrency(Math.round(s.amount * 100))}
                            </p>
                          </div>
                          {isPaying && (
                            <RegisterPaymentButton
                              groupId={group.id}
                              toUserId={s.toUserId}
                              amount={s.amount}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Other settlements */}
            {otherSettlements.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                  Outras transações
                </h2>
                <div className="space-y-2 opacity-60">
                  {otherSettlements.map((s, i) => (
                    <div key={i} className="card p-4">
                      <p className="text-sm">
                        {userMap.get(s.fromUserId)} → {userMap.get(s.toUserId)}
                      </p>
                      <p className="text-sm font-mono mt-1">
                        {formatCurrency(Math.round(s.amount * 100))}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
