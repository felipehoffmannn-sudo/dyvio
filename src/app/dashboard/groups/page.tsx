import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getNetBalanceInGroup } from "@/lib/ledger-engine"
import GroupsClient from "./GroupsClient"

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
    orderBy: { group: { createdAt: "desc" } },
  })

  const groupsWithBalances = await Promise.all(
    memberships.map(async (m) => {
      const balance = await getNetBalanceInGroup(user.id, m.group.id)
      return {
        id: m.group.id,
        name: m.group.name,
        isArchived: m.group.isArchived,
        createdAt: m.group.createdAt,
        memberCount: m.group._count.members,
        balance: Math.round(balance),
        role: m.role,
      }
    })
  )

  return (
    <GroupsClient
      user={{ name: user.name, id: user.id }}
      groups={JSON.parse(JSON.stringify(groupsWithBalances))}
    />
  )
}
