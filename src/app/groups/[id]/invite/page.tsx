import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Box, Flex, Heading, Text, Input, Button, VStack, HStack, Separator, Badge } from "@chakra-ui/react"
import { CardRoot, CardBody } from "@chakra-ui/react"
import { inviteMember } from "@/lib/actions"
import Link from "next/link"
import { InviteIcon } from "./invite-icon"

export default async function InviteMemberPage({
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
      members: { where: { leftAt: null }, include: { user: { select: { name: true, email: true } } } },
      invites: { where: { status: "PENDING" }, include: { inviter: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  })

  if (!group) redirect("/dashboard")

  const membership = group.members.find(m => m.userId === user.id)
  const isAdmin = membership?.role === "OWNER" || membership?.role === "ADMIN"
  if (!isAdmin) redirect(`/groups/${group.id}`)

  return (
    <Flex minH="100vh" direction="column" bg="gray.50">
      <Flex bg="white" px={{ base: 4, md: 6 }} py={3} borderBottom="1px" borderColor="gray.200" align="center" gap={4}>
        <Link href={`/groups/${group.id}`} style={{ color: "inherit", textDecoration: "none" }}>
          <Text color="gray.500" _hover={{ color: "gray.700" }}>←</Text>
        </Link>
        <Heading as="h1" size="lg">Convidar membros</Heading>
      </Flex>

      <Box flex={1} maxW="520px" mx="auto" w="full" p={{ base: 4, md: 6 }}>
        <VStack gap={6} align="stretch">
          {/* Invite form */}
          <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
            <CardBody p={4}>
              <Box as="form" action={async (formData: FormData) => {
                "use server"
                const email = formData.get("email") as string
                if (!email) return
                await inviteMember(params.id, email)
              }}>
                <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={3}>
                  Convidar por email
                </Text>
                <HStack gap={2}>
                  <Input
                    name="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    required
                    flex={1}
                    size="lg"
                    px={4}
                    bg="white"
                    borderWidth="1px"
                    borderColor="border"
                    _focus={{ borderColor: "brand.500", boxShadow: "none" }}
                  />
                  <Button type="submit" colorPalette="green" size="lg" px={5} borderRadius="button">
                    Convidar
                  </Button>
                </HStack>
              </Box>
            </CardBody>
          </CardRoot>

          <Separator />

          {/* Members */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={3}>
              Membros ({group.members.length})
            </Text>
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
              <CardBody p={0}>
                <VStack gap={0} align="stretch">
                  {group.members.map((m, i) => (
                    <Box key={m.id}>
                      {i > 0 && <Separator />}
                      <HStack gap={3} px={4} py={3}>
                        <Box
                          w={8} h={8} borderRadius="full"
                          bg="brand.100" color="brand.600"
                          display="flex" alignItems="center" justifyContent="center"
                          fontSize="sm" fontWeight="bold" flexShrink={0}
                        >
                          {m.user.name?.[0]?.toUpperCase() || "?"}
                        </Box>
                        <Box flex={1} minW={0}>
                          <Text fontSize="sm" fontWeight="medium" truncate>
                            {m.user.name} {m.userId === user.id && <Text as="span" color="fg.muted">(você)</Text>}
                          </Text>
                          <Text fontSize="xs" color="fg.muted" truncate>{m.user.email}</Text>
                        </Box>
                        <Badge
                          variant="subtle"
                          colorPalette={m.role === "OWNER" ? "green" : "gray"}
                          size="sm"
                          px={2}
                          py={0.5}
                          borderRadius="full"
                          flexShrink={0}
                        >
                          {m.role === "OWNER" ? "Dono" : m.role === "ADMIN" ? "Admin" : "Membro"}
                        </Badge>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </CardBody>
            </CardRoot>
          </Box>

          {/* Pending invites */}
          {group.invites.length > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={3}>
                Convites pendentes ({group.invites.length})
              </Text>
              <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
                <CardBody p={0}>
                  <VStack gap={0} align="stretch">
                    {group.invites.map((inv, i) => (
                      <Box key={inv.id}>
                        {i > 0 && <Separator />}
                        <HStack gap={3} px={4} py={3}>
                          <Box
                            w={8} h={8} borderRadius="full"
                            bg="orange.100"
                            display="flex" alignItems="center" justifyContent="center"
                            flexShrink={0}
                          >
                            <InviteIcon />
                          </Box>
                          <Box flex={1} minW={0}>
                            <Text fontSize="sm" truncate>
                              {inv.email || "Link compartilhável"}
                            </Text>
                            <Text fontSize="xs" color="fg.muted">Convidado por {inv.inviter.name}</Text>
                          </Box>
                          <Badge
                            variant="subtle"
                            colorPalette="orange"
                            size="sm"
                            px={2}
                            py={0.5}
                            borderRadius="full"
                            flexShrink={0}
                          >
                            Pendente
                          </Badge>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </CardBody>
              </CardRoot>
            </Box>
          )}
        </VStack>
      </Box>
    </Flex>
  )
}
