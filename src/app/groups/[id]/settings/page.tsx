import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Box, Flex, Heading, Text, Button, VStack, HStack, Separator, Avatar, Badge } from "@chakra-ui/react"
import Link from "next/link"
import { removeMember, archiveGroup, deleteGroup } from "@/lib/actions"

export default async function GroupSettingsPage({
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

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      members: { where: { leftAt: null }, include: { user: { select: { id: true, name: true, email: true, image: true } } } },
    },
  })

  if (!group) redirect("/dashboard")

  const membership = group.members.find(m => m.userId === user.id)
  const isOwner = membership?.role === "OWNER"
  const isAdmin = isOwner || membership?.role === "ADMIN"

  if (!isAdmin) redirect(`/groups/${group.id}`)

  return (
    <Flex minH="100vh" direction="column" bg="gray.50">
      <Flex bg="white" px={6} py={3} borderBottom="1px" borderColor="gray.200" align="center" gap={4}>
        <Link href={`/groups/${group.id}`} style={{ color: "inherit", textDecoration: "none" }}>
          <Text color="gray.500" _hover={{ color: "gray.700" }}>←</Text>
        </Link>
        <Heading as="h1" size="lg">Configurações</Heading>
      </Flex>

      <Box flex={1} maxW="520px" mx="auto" w="full" p={{ base: 4, md: 6 }}>
        <VStack gap={8} align="stretch">
          {/* Group info */}
          <Box p={4} borderRadius="card" borderWidth="1px" borderColor="gray.200" bg="white">
            <VStack gap={2} align="stretch">
              <Heading size="sm" fontWeight="medium">{group.name}</Heading>
              {group.description && <Text fontSize="sm" color="fg.muted">{group.description}</Text>}
              <Text fontSize="xs" color="fg.muted">
                {group.members.length} membros · Criado em {new Date(group.createdAt).toLocaleDateString("pt-BR")}
              </Text>
            </VStack>
          </Box>

          {/* Members */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={3}>Gerenciar membros</Text>
            <VStack gap={1} align="stretch">
              {group.members.map(m => (
                <HStack key={m.id} justify="space-between" px={4} py={3} borderRadius="lg" bg="white" borderWidth="1px" borderColor="gray.200">
                  <HStack gap={3}>
                    <Avatar.Root size="sm">
                      <Avatar.Fallback bg="brand.100" color="brand.600" fontWeight="medium">
                        {m.user.name?.[0]?.toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium">
                        {m.user.name} {m.userId === user.id && "(você)"}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {m.role === "OWNER" ? "Dono" : m.role === "ADMIN" ? "Admin" : "Membro"}
                      </Text>
                    </Box>
                  </HStack>
                  {isOwner && m.role !== "OWNER" && (
                    <form action={async () => {
                      "use server"
                      await removeMember(params.id, m.userId)
                    }}>
                      <Button variant="ghost" size="sm" type="submit" colorPalette="red">Remover</Button>
                    </form>
                  )}
                </HStack>
              ))}
            </VStack>
            <Link href={`/groups/${group.id}/invite`}>
              <Button variant="outline" w="full" mt={3}>+ Convidar mais membros</Button>
            </Link>
          </Box>

          <Separator />

          {/* Danger zone */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="red.500" mb={3}>Zona de perigo</Text>
            <VStack gap={3} align="stretch">
              {isOwner && (
                <form action={async () => {
                  "use server"
                  await archiveGroup(params.id)
                }}>
                  <Button colorPalette="red" variant="outline" type="submit" w="full">Arquivar grupo</Button>
                </form>
              )}
              {isOwner && (
                <form action={async () => {
                  "use server"
                  await deleteGroup(params.id)
                }}>
                  <Button colorPalette="red" type="submit" w="full">Excluir grupo permanentemente</Button>
                </form>
              )}
              {!isOwner && (
                <form action={async () => {
                  "use server"
                  const { leaveGroup } = await import("@/lib/actions")
                  await leaveGroup(params.id)
                }}>
                  <Button colorPalette="red" variant="outline" type="submit" w="full">Sair do grupo</Button>
                </form>
              )}
            </VStack>
          </Box>
        </VStack>
      </Box>
    </Flex>
  )
}
