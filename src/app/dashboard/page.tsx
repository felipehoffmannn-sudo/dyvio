import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getNetBalanceInGroup } from "@/lib/ledger-engine"
import DashboardClient from "./DashboardClient"
import { getSessionUser } from "@/lib/data-cache"

export default async function DashboardPage() {
  const user = await getSessionUser()
  if (!user) redirect("/auth/login")

  // 1. Buscar memberships (essencial para tudo)
  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, leftAt: null },
    include: { group: { select: { id: true, name: true, isArchived: true, updatedAt: true } } },
    orderBy: { group: { updatedAt: "desc" } },
  })

  const activeGroups = memberships.filter(m => !m.group.isArchived)
  const groupIds = activeGroups.map(m => m.groupId)

  if (groupIds.length === 0) {
    // Sem grupos: retorna imediatamente sem queries extras
    const now = new Date()
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    return (
      <DashboardClient
        user={{ name: user.name ?? "", id: user.id }}
        groupsWithBalances={[]}
        netBalance={0}
        totalOwe={0}
        totalOwed={0}
        totalGroupExpense={0}
        recentExpenses={[]}
        monthlyTotal={0}
        dailyMap={{}}
        daysInMonth={new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}
        maxDaily={1}
        currentMonthName={monthNames[now.getMonth()]}
        now={now}
      />
    )
  }

  // 2. Paralelizar TODAS as queries restantes
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

  const [
    allGroupMembers,
    totalExpensesResult,
    recentExpenses,
    monthlyExpenses,
    dailyTotals,
  ] = await Promise.all([
    // Membros dos grupos
    prisma.groupMember.findMany({
      where: { groupId: { in: groupIds }, leftAt: null },
      select: { groupId: true, userId: true, user: { select: { name: true } } },
    }),
    // Total geral
    prisma.expense.aggregate({
      where: { groupId: { in: groupIds }, status: "ACTIVE", deletedAt: null },
      _sum: { amount: true },
    }),
    // Despesas recentes
    prisma.expense.findMany({
      where: { groupId: { in: groupIds }, status: "ACTIVE", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        group: { select: { name: true } },
        payer: { select: { name: true } },
        category: { select: { id: true, name: true, icon: true } },
      },
    }),
    // Total do mês
    prisma.expense.aggregate({
      where: { groupId: { in: groupIds }, status: "ACTIVE", deletedAt: null, expenseDate: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
    // Diário do mês
    prisma.expense.groupBy({
      by: ["expenseDate"],
      where: { groupId: { in: groupIds }, status: "ACTIVE", deletedAt: null, expenseDate: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    }),
  ])

  // 3. Montar mapas de membros
  const groupMemberMap: Record<string, string[]> = {}
  const groupMemberNames: Record<string, { id: string; name: string }[]> = {}
  allGroupMembers.forEach(m => {
    if (!groupMemberMap[m.groupId]) groupMemberMap[m.groupId] = []
    groupMemberMap[m.groupId].push(m.userId)
    if (!groupMemberNames[m.groupId]) groupMemberNames[m.groupId] = []
    groupMemberNames[m.groupId].push({ id: m.userId, name: m.user.name ?? "" })
  })

  // 4. Calcular saldos (ainda paralelizado)
  const groupsWithBalances = await Promise.all(
    activeGroups.map(async (m) => {
      const balance = await getNetBalanceInGroup(user.id, m.group.id)
      return {
        id: m.group.id,
        name: m.group.name,
        balance: Math.round(balance * 100) / 100,
        memberIds: groupMemberMap[m.group.id] || [],
        members: groupMemberNames[m.group.id] || [],
      }
    })
  )

  const netBalance = groupsWithBalances.reduce((sum, g) => sum + g.balance, 0)
  const totalOwe = groupsWithBalances.filter(g => g.balance < 0).reduce((sum, g) => sum + Math.abs(g.balance), 0)
  const totalOwed = groupsWithBalances.filter(g => g.balance > 0).reduce((sum, g) => sum + g.balance, 0)
  const totalGroupExpense = totalExpensesResult._sum.amount || 0

  const mappedExpenses = recentExpenses.map(e => ({
    id: e.id,
    description: e.title,
    amount: Number(e.amount),
    expenseDate: e.expenseDate.toISOString(),
    currency: e.currency,
    group: { id: e.groupId, name: e.group.name },
    payer: { id: e.paidBy, name: e.payer.name },
    category: e.category ? { id: e.category.id, name: e.category.name, icon: e.category.icon } : null,
  }))

  const daysInMonth = endOfMonth.getDate()
  const dailyMap: Record<number, number> = {}
  dailyTotals.forEach(d => { dailyMap[new Date(d.expenseDate).getDate()] = d._sum.amount || 0 })
  const maxDaily = Math.max(...Object.values(dailyMap), 1)

  return (
    <DashboardClient
      user={{ name: user.name ?? "", id: user.id }}
      groupsWithBalances={groupsWithBalances}
      netBalance={netBalance}
      totalOwe={totalOwe}
      totalOwed={totalOwed}
      totalGroupExpense={totalGroupExpense}
      recentExpenses={JSON.parse(JSON.stringify(mappedExpenses))}
      monthlyTotal={monthlyExpenses._sum.amount || 0}
      dailyMap={dailyMap}
      daysInMonth={daysInMonth}
      maxDaily={maxDaily}
      currentMonthName={monthNames[now.getMonth()]}
      now={now}
    />
  )
}


