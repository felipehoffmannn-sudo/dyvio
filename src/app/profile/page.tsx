import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Box, Flex, Heading, Text, VStack, HStack, SimpleGrid, Separator } from "@chakra-ui/react"
import { CardRoot, CardBody } from "@chakra-ui/react"
import { AvatarRoot, AvatarFallback } from "@chakra-ui/react"
import Link from "next/link"
import { LogoutButton } from "./logout-button"
import { ProfileActions } from "./profile-actions"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/auth/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) redirect("/auth/login")

  const groupCount = await prisma.groupMember.count({
    where: { userId: user.id, leftAt: null },
  })
  const expenseCount = await prisma.expenseParticipant.count({
    where: { userId: user.id },
  })

  return (
    <Flex minH="100vh" direction="column" bg="gray.50">
      <Flex bg="white" px={6} py={3} borderBottom="1px" borderColor="gray.200" align="center" gap={4}>
        <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
          <Text color="gray.500" _hover={{ color: "gray.700" }}>←</Text>
        </Link>
        <Heading as="h1" size="lg">Perfil</Heading>
      </Flex>

      <Box flex={1} maxW="520px" mx="auto" w="full" p={{ base: 4, md: 8 }}>
        <VStack gap={8} align="stretch">
          {/* Avatar & Name */}
          <VStack gap={3} textAlign="center">
            <AvatarRoot size="xl" w="96px" h="96px" borderRadius="full" overflow="hidden">
              <AvatarFallback
                bg="brand.500"
                color="white"
                w="full"
                h="full"
                fontSize="4xl"
                fontWeight="bold"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {user.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </AvatarRoot>
            <Box>
              <Heading size="xl" fontWeight="semibold">{user.name}</Heading>
              <Text color="fg.muted" fontSize="sm">{user.email}</Text>
            </Box>
          </VStack>

          {/* Stats */}
          <SimpleGrid columns={2} gap={3}>
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
              <CardBody p={4} textAlign="center">
                <Heading size="2xl" fontWeight="bold">{groupCount}</Heading>
                <Text fontSize="sm" color="fg.muted">Grupos</Text>
              </CardBody>
            </CardRoot>
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
              <CardBody p={4} textAlign="center">
                <Heading size="2xl" fontWeight="bold">{expenseCount}</Heading>
                <Text fontSize="sm" color="fg.muted">Despesas</Text>
              </CardBody>
            </CardRoot>
          </SimpleGrid>

          {/* Preferences */}
          <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
            <CardBody p={4}>
              <VStack gap={3} align="stretch">
                <Heading size="sm" fontWeight="medium">Preferências</Heading>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="fg.muted">Moeda padrão</Text>
                  <Text fontSize="sm" fontWeight="medium">{user.defaultCurrency}</Text>
                </HStack>
                <Separator />
                <HStack justify="space-between">
                  <Text fontSize="sm" color="fg.muted">Idioma</Text>
                  <Text fontSize="sm" fontWeight="medium">{user.locale === "pt-BR" ? "Português" : user.locale}</Text>
                </HStack>
              </VStack>
            </CardBody>
          </CardRoot>

          {/* Actions */}
          <ProfileActions />
        </VStack>
      </Box>
    </Flex>
  )
}
