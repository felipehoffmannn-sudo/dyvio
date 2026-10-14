import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Flex, Box, Heading, Text, VStack } from "@chakra-ui/react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function DevLoginPage() {
  if (process.env.NODE_ENV === "production") redirect("/auth/login")

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
    orderBy: { createdAt: "asc" },
  })

  return (
    <Flex minH="100vh" align="center" justify="center" px={5} bg="gray.50">
      <Box w="full" maxW="md">
        <VStack gap={6} align="stretch">
          <Box textAlign="center">
            <Heading size="lg">🔧 Dev Login</Heading>
            <Text fontSize="sm" color="gray.500" mt={2}>
              Entre sem senha. Somente disponível em desenvolvimento.
            </Text>
          </Box>
          <VStack gap={3} align="stretch">
            {users.map(u => (
              <Link
                key={u.id}
                href={`/api/dev-login?email=${encodeURIComponent(u.email)}`}
                style={{ textDecoration: "none" }}
              >
                <Box
                  p={4}
                  bg="white"
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor="gray.200"
                  _hover={{ borderColor: "brand.500" }}
                  transition="all 0.15s"
                >
                  <Text fontWeight="medium">{u.name || "Sem nome"}</Text>
                  <Text fontSize="sm" color="gray.500">{u.email}</Text>
                </Box>
              </Link>
            ))}
          </VStack>
        </VStack>
      </Box>
    </Flex>
  )
}
