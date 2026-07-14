import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatDateShort } from "@/lib/utils"
import Link from "next/link"
import { Flex, Box, Heading, Text, VStack, HStack, Button, CardRoot, CardBody } from "@chakra-ui/react"
import { getSessionUser } from "@/lib/data-cache"

export default async function InvitesPage() {
  const user = await getSessionUser()
  if (!user) redirect("/auth/login")

  const invites = await prisma.invite.findMany({
    where: { email: user.email, status: "PENDING" },
    include: {
      group: { select: { id: true, name: true, description: true } },
      inviter: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <Flex minH="100vh" direction="column" bg="gray.50">
      {/* Header */}
      <Flex
        bg="white"
        px={{ base: 4, md: 6 }}
        py={3}
        borderBottom="1px"
        borderColor="gray.200"
        align="center"
        gap={3}
      >
        <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none", flexShrink: 0 }}>
          <Text as="span" color="gray.500" fontSize="lg">←</Text>
        </Link>
        <Heading as="h1" size="lg">Convites</Heading>
      </Flex>

      <Box flex={1} maxW="520px" mx="auto" w="full" p={{ base: 4, md: 6 }}>
        {invites.length === 0 ? (
          <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
            <CardBody>
              <VStack py={10} gap={4} textAlign="center">
                <Box
                  w={14} h={14} borderRadius="full"
                  bg="blue.50"
                  display="flex" alignItems="center" justifyContent="center"
                >
                  <Text fontSize="2xl">📨</Text>
                </Box>
                <VStack gap={1}>
                  <Heading as="h3" size="md" fontWeight="semibold">Nenhum convite</Heading>
                  <Text fontSize="sm" color="gray.500">
                    Quando alguém te convidar para um grupo, o convite aparecerá aqui.
                  </Text>
                </VStack>
                <Link
                  href="/dashboard"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px 20px",
                    border: "1px solid #d4d4d4",
                    borderRadius: "8px",
                    backgroundColor: "white",
                    color: "#525252",
                    fontSize: "14px",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Ir para o início
                </Link>
              </VStack>
            </CardBody>
          </CardRoot>
        ) : (
          <VStack gap={3} align="stretch">
            {invites.map(invite => (
              <CardRoot key={invite.id} borderRadius="card" borderWidth="1px" borderColor="gray.200">
                <CardBody p={5}>
                  <VStack gap={3} align="stretch">
                    <HStack gap={3} align="flex-start">
                      <Box
                        w={10} h={10} borderRadius="xl"
                        bg="green.50"
                        display="flex" alignItems="center" justifyContent="center"
                        flexShrink={0}
                      >
                        <Text fontSize="lg">👥</Text>
                      </Box>
                      <Box flex={1} minW={0}>
                        <Text fontWeight="semibold" fontSize="md">{invite.group.name}</Text>
                        {invite.group.description && (
                          <Text fontSize="sm" color="gray.500" mt={0.5}>{invite.group.description}</Text>
                        )}
                        <Text fontSize="xs" color="gray.400" mt={1}>
                          Convidado por {invite.inviter.name} · {formatDateShort(invite.createdAt)}
                        </Text>
                      </Box>
                    </HStack>
                    <HStack gap={2}>
                      <Button colorPalette="green" w="full" size="sm" borderRadius="button" asChild>
                        <Link href={`/invite/${invite.token}`}>Aceitar</Link>
                      </Button>
                      <form action={async () => {
                        "use server"
                        const { prisma } = await import("@/lib/prisma")
                        const { revalidatePath } = await import("next/cache")
                        await prisma.invite.update({ where: { id: invite.id }, data: { status: "REJECTED" } })
                        revalidatePath("/invites")
                      }}>
                        <Button variant="ghost" size="sm" type="submit" colorPalette="red" borderRadius="button">
                          Recusar
                        </Button>
                      </form>
                    </HStack>
                  </VStack>
                </CardBody>
              </CardRoot>
            ))}
          </VStack>
        )}
      </Box>
    </Flex>
  )
}
