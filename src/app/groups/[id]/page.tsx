import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getNetBalanceInGroup, computeSettlement } from "@/lib/ledger-engine"
import GroupDetailClient from "./client"
import { getSessionUser } from "@/lib/data-cache"

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser()
  if (!user) redirect("/auth/login")

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      members: {
        where: { leftAt: null },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  })

  if (!group || !group.members.some(m => m.userId === user.id)) redirect("/dashboard")

  const [userBalance, settlement, expenses, payments, myLedger, categories] = await Promise.all([
    getNetBalanceInGroup(user.id, group.id),
    computeSettlement(group.id),
    prisma.expense.findMany({
      where: { groupId: group.id, status: "ACTIVE" },
      orderBy: { expenseDate: "desc" },
      include: {
        payer: { select: { id: true, name: true } },
        participants: { select: { userId: true, shareAmount: true, sharePercentage: true } },
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.payment.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, fromUserId: true, toUserId: true, amount: true, status: true, createdAt: true, updatedAt: true },
    }),
    // balance > 0 → I owe the counterparty; balance < 0 → they owe me
    prisma.ledgerEntry.findMany({
      where: { groupId: group.id, userId: user.id },
      select: { counterpartyId: true, balance: true },
    }),
    prisma.category.findMany({ where: { parentId: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  const currentMembership = group.members.find(m => m.userId === user.id)
  const isAdmin = currentMembership?.role === "OWNER" || currentMembership?.role === "ADMIN"

  return (
    <GroupDetailClient
      group={{ id: group.id, name: group.name }}
      user={{ id: user.id, name: user.name || "", balance: Math.round(userBalance * 100) / 100 }}
      members={group.members.map(m => ({
        id: m.user.id,
        name: m.user.name || m.user.email,
        initials: (m.user.name || m.user.email || "?")[0].toUpperCase(),
        role: m.role,
        isCurrentUser: m.userId === user.id,
      }))}
      isAdmin={isAdmin}
      categories={categories}
      expenses={expenses.map(e => ({
        id: e.id,
        title: e.title,
        amount: Math.round(e.amount),
        originalAmount: Math.round(e.originalAmount ?? e.amount),
        currency: e.currency,
        splitType: e.splitType,
        expenseDate: e.expenseDate.toISOString(),
        createdAt: e.createdAt.toISOString(),
        paidBy: e.paidBy,
        payerName: e.payer.name || "",
        category: e.category,
        participants: e.participants.map(p => ({
          userId: p.userId,
          share: Math.round(p.shareAmount),
          percentage: p.sharePercentage,
        })),
      }))}
      pairBalances={Object.fromEntries(myLedger.map(l => [l.counterpartyId, Math.round(l.balance)]))}
      settlements={settlement.map(s => ({ ...s, amount: Math.round(s.amount) }))}
      payments={payments.map(p => ({
        ...p,
        amount: Math.round(p.amount),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))}
    />
  )
}
