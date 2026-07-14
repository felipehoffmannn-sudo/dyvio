import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import Link from "next/link"
import { getSessionUser } from "@/lib/data-cache"

export default async function HistoryPage() {
  const user = await getSessionUser()
  if (!user) redirect("/auth/login")

  const expenses = await prisma.expense.findMany({
    where: {
      participants: { some: { userId: user.id } },
      status: "ACTIVE",
    },
    orderBy: { expenseDate: "desc" },
    take: 100,
    include: {
      group: { select: { id: true, name: true } },
      payer: { select: { id: true, name: true } },
      participants: {
        where: { userId: user.id },
        select: { shareAmount: true },
      },
      category: { select: { name: true, icon: true } },
    },
  })

  return (
    <div className="min-h-screen bg-[var(--bg-page)] pb-20">
      <header className="sticky top-0 z-40 bg-[var(--bg-page)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">←</Link>
          <h1 className="text-lg font-semibold">Histórico</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {expenses.length === 0 ? (
          <div className="card p-12 text-center space-y-4">
            <div className="text-4xl">📭</div>
            <div>
              <h3 className="font-semibold">Nenhuma despesa</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Suas despesas aparecerão aqui.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map(expense => {
              const myShare = Number(expense.participants[0]?.shareAmount || 0)
              const isPayer = expense.paidBy === user.id

              return (
                <Link key={expense.id} href={`/groups/${expense.group.id}`}>
                  <div className="card-hover p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-[var(--text-tertiary)]">{formatDateShort(expense.expenseDate)}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-page)] border border-[var(--border)]">
                            {expense.group.name}
                          </span>
                          {expense.category && (
                            <span className="text-xs">{expense.category.icon} {expense.category.name}</span>
                          )}
                        </div>
                        <p className="font-medium truncate">{expense.title}</p>
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                          {isPayer ? "Você pagou" : `${expense.payer.name?.split(" ")[0]} pagou`} {formatCurrency(Number(expense.amount))}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-mono font-semibold">{formatCurrency(Number(expense.amount))}</span>
                        {!isPayer && myShare > 0 && (
                          <p className="text-xs text-[var(--danger)] mt-0.5">-{formatCurrency(myShare)}</p>
                        )}
                        {isPayer && (
                          <p className="text-xs text-[var(--success)] mt-0.5">
                            +{formatCurrency(Number(expense.amount) - myShare)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
