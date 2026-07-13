import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NewExpenseForm } from "./form"

export default async function NewExpensePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/auth/login")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) redirect("/auth/login")

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: { members: { where: { leftAt: null }, include: { user: { select: { id: true, name: true, email: true, image: true } } } } },
  })
  if (!group) redirect("/dashboard")
  if (!group.members.some(m => m.userId === user.id)) redirect("/dashboard")

  const categories = await prisma.category.findMany({ where: { isSystem: true } })

  return (
    <NewExpenseForm
      groupId={group.id}
      members={group.members.map(m => ({ id: m.user.id, name: m.user.name || m.user.email, image: m.user.image }))}
      currentUserId={user.id}
      categories={categories.map(c => ({ id: c.id, name: c.name, icon: c.icon || "" }))}
    />
  )
}
