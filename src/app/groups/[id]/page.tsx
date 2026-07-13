import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getNetBalanceInGroup, computeSettlement } from "@/lib/ledger-engine"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import Link from "next/link"
import { DeleteExpenseButton } from "./delete-button"
import GroupDetailClient from "./client"

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/auth/login")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
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

  const userBalance = await getNetBalanceInGroup(user.id, group.id)
  const settlement = await computeSettlement(group.id)
  const userSettlements = settlement.filter(s => s.fromUserId === user.id || s.toUserId === user.id)

  const expenses = await prisma.expense.findMany({
    where: { groupId: group.id, status: "ACTIVE" },
    orderBy: { expenseDate: "desc" },
    include: {
      payer: { select: { id: true, name: true, image: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
      category: { select: { name: true, icon: true } },
    },
  })

  const currentMembership = group.members.find(m => m.userId === user.id)
  const isAdmin = currentMembership?.role === "OWNER" || currentMembership?.role === "ADMIN"

  return (
    <GroupDetailClient
      group={{ id: group.id, name: group.name }}
      user={{ id: user.id, name: user.name || "", balance: Math.round(userBalance * 100) / 100 }}
      members={group.members.map(m => ({
        id: m.user.id,
        name: m.user.name || m.user.email,
        initials: (m.user.name || "?")[0].toUpperCase(),
        role: m.role,
        isCurrentUser: m.userId === user.id,
      }))}
      isAdmin={isAdmin}
      expenses={JSON.parse(JSON.stringify(expenses))}
      userSettlements={userSettlements}
    />
  )
}
