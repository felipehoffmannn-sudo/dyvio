import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LoginForm } from "./login-form"
import { Flex, Box, Heading, Text, VStack } from "@chakra-ui/react"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <Flex minH="100vh" align="center" justify="center" px={5}>
      <Box w="full" maxW="sm">
        <VStack gap={8} textAlign="center">
          <VStack gap={2}>
            <Box w={12} h={12} borderRadius="xl" bg="gray.900" display="flex" alignItems="center" justifyContent="center" mx="auto">
              <Text color="white" fontSize="xl" fontWeight="bold">L</Text>
            </Box>
            <Heading as="h1" size="2xl" fontWeight="bold" letterSpacing="tight">Dyvio</Heading>
            <Text fontSize="14px" color="gray.500">Entre para gerenciar suas despesas</Text>
          </VStack>
          <LoginForm />
        </VStack>
      </Box>
    </Flex>
  )
}
