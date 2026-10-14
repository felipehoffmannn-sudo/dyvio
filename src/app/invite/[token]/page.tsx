import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react"
import { Clock, Link2Off, Users } from "lucide-react"
import Link from "next/link"

function InviteMessage({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Flex minH="100vh" align="center" justify="center" px={5} bg="bg.page">
      <VStack gap={4} maxW="sm" textAlign="center">
        <Box w={12} h={12} borderRadius="xl" bg="gray.100" color="fg.muted" display="flex" alignItems="center" justifyContent="center">
          {icon}
        </Box>
        <Heading as="h1" size="lg" fontWeight="semibold">{title}</Heading>
        <Text fontSize="sm" color="fg.muted">{text}</Text>
        <Button asChild variant="outline" borderRadius="button" px={5}>
          <Link href="/dashboard">Ir para o início</Link>
        </Button>
      </VStack>
    </Flex>
  )
}

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
    return <InviteMessage icon={<Link2Off size={20} aria-hidden />} title="Convite inválido" text="Este convite não existe ou o link está incompleto." />
  }

  if (invite.status !== "PENDING" || new Date() > invite.expiresAt) {
    return <InviteMessage icon={<Clock size={20} aria-hidden />} title="Convite expirado" text="Este convite não está mais disponível. Peça um novo link a quem convidou você." />
  }

  const existingMember = await prisma.groupMember.findFirst({
    where: { groupId: invite.groupId, userId: user.id, leftAt: null },
  })
  if (existingMember) redirect(`/groups/${invite.group.id}`)

  async function acceptInvite() {
    "use server"
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) redirect(`/auth/login?callbackUrl=/invite/${params.token}`)
    const u = await prisma.user.findUnique({ where: { email: session.user.email } })
    const current = await prisma.invite.findUnique({ where: { token: params.token } })
    if (!u || !current || current.status !== "PENDING" || new Date() > current.expiresAt) {
      redirect(`/invite/${params.token}`)
    }

    const alreadyMember = await prisma.groupMember.findFirst({
      where: { groupId: current.groupId, userId: u.id, leftAt: null },
    })
    if (!alreadyMember) {
      await prisma.groupMember.create({ data: { groupId: current.groupId, userId: u.id, role: "MEMBER" } })
      await prisma.activityLog.create({
        data: {
          groupId: current.groupId,
          userId: u.id,
          action: "MEMBER_JOINED",
          payload: JSON.stringify({ invitedBy: current.invitedBy }),
        },
      })
    }
    // Email invites are single use; shareable links (no email) stay open for others.
    if (current.email) {
      await prisma.invite.update({ where: { id: current.id }, data: { status: "ACCEPTED" } })
    }
    redirect(`/groups/${current.groupId}`)
  }

  return (
    <Flex minH="100vh" align="center" justify="center" px={5} bg="bg.page">
      <VStack gap={8} w="full" maxW="sm">
        <VStack gap={3} textAlign="center">
          <Box w={12} h={12} borderRadius="xl" bg="gray.900" color="white" display="flex" alignItems="center" justifyContent="center">
            <Users size={20} aria-hidden />
          </Box>
          <Heading as="h1" size="xl" fontWeight="semibold" letterSpacing="tight">Convite para grupo</Heading>
          <Text fontSize="sm" color="fg.muted">
            <Text as="strong" color="fg" fontWeight="semibold">{invite.inviter.name}</Text> convidou você para dividir despesas no grupo
          </Text>
        </VStack>

        <Box w="full" p={6} borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card" textAlign="center">
          <Heading as="h2" size="lg" fontWeight="semibold">{invite.group.name}</Heading>
          {invite.group.description && <Text fontSize="sm" color="fg.muted" mt={1}>{invite.group.description}</Text>}
        </Box>

        <VStack gap={2} w="full">
          <form action={acceptInvite} style={{ width: "100%" }}>
            <Button type="submit" colorPalette="green" size="lg" w="full" borderRadius="button">
              Entrar no grupo
            </Button>
          </form>
          <Button asChild variant="ghost" size="lg" w="full" borderRadius="button">
            <Link href="/dashboard">Agora não</Link>
          </Button>
        </VStack>
      </VStack>
    </Flex>
  )
}
