import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Button } from "@chakra-ui/react"
import Link from "next/link"

export default async function InvitePage({
  params,
}: {
  params: { token: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect(`/auth/login?callbackUrl=/invite/${params.token}`)

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) redirect("/auth/login")

  const invite = await prisma.invite.findUnique({
    where: { token: params.token },
    include: {
      group: { select: { id: true, name: true, description: true } },
      inviter: { select: { name: true } },
    },
  })

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-4xl">🔗</div>
          <h1 className="text-xl font-semibold">Convite inválido</h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Este convite não existe ou já expirou.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Ir para o início</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (invite.status !== "PENDING" || new Date() > invite.expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-4xl">⏰</div>
          <h1 className="text-xl font-semibold">Convite expirado</h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Este convite não está mais disponível.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Ir para o início</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Check if user is already a member
  const existingMember = await prisma.groupMember.findFirst({
    where: { groupId: invite.groupId, userId: user.id, leftAt: null },
  })

  if (existingMember) {
    redirect(`/groups/${invite.group.id}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center mx-auto text-2xl">
            👥
          </div>
          <h1 className="text-2xl font-semibold">Convite para grupo</h1>
          <p className="text-[var(--text-secondary)]">
            <strong>{invite.inviter.name}</strong> te convidou para participar do grupo
          </p>
        </div>

        <div className="card p-6 text-center space-y-2">
          <h2 className="text-xl font-semibold">{invite.group.name}</h2>
          {invite.group.description && (
            <p className="text-sm text-[var(--text-secondary)]">{invite.group.description}</p>
          )}
        </div>

        <form
          action={async () => {
            "use server"
            const { prisma } = await import("@/lib/prisma")
            const { getServerSession } = await import("next-auth")
            const { authOptions } = await import("@/lib/auth")
            const { redirect } = await import("next/navigation")

            const session = await getServerSession(authOptions)
            const u = await prisma.user.findUnique({ where: { email: session!.user!.email! } })

            await prisma.groupMember.create({
              data: { groupId: invite.groupId, userId: u!.id, role: "MEMBER" },
            })

            await prisma.invite.update({
              where: { id: invite.id },
              data: { status: "ACCEPTED" },
            })

            await prisma.activityLog.create({
              data: {
                groupId: invite.groupId,
                userId: u!.id,
                action: "MEMBER_JOINED",
                payload: JSON.stringify({ invitedBy: invite.invitedBy }),
              },
            })

            redirect(`/groups/${invite.group.id}`)
          }}
        >
          <Button type="submit" colorPalette="green" size="lg" w="full">
            ✅ Aceitar convite
          </Button>
        </form>

        <Link href="/dashboard" className="block text-center">
          <Button variant="ghost" size="sm">
            Recusar
          </Button>
        </Link>
      </div>
    </div>
  )
}
