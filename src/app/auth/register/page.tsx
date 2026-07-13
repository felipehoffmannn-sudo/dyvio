import { registerUser } from "@/lib/actions"
import { Box, Flex, Heading, Text, Input, Button, VStack, Field } from "@chakra-ui/react"
import Link from "next/link"

export default function RegisterPage() {
  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50" px={4}>
      <Box w="full" maxW="400px">
        <VStack gap={8} align="stretch">
          <VStack gap={2} textAlign="center">
            <Heading as="h1" size="3xl" fontWeight="bold">Criar conta</Heading>
            <Text color="fg.muted">Comece a dividir despesas de forma inteligente</Text>
          </VStack>

          <Box as="form" action={registerUser}>
            <VStack gap={4}>
              <Field.Root required>
                <Field.Label>Nome</Field.Label>
                <Input name="name" placeholder="Seu nome" autoComplete="name" size="lg" />
              </Field.Root>
              <Field.Root required>
                <Field.Label>Email</Field.Label>
                <Input name="email" type="email" placeholder="seu@email.com" autoComplete="email" size="lg" />
              </Field.Root>
              <Field.Root required>
                <Field.Label>Senha</Field.Label>
                <Input name="password" type="password" placeholder="Mínimo 8 caracteres" minLength={8} autoComplete="new-password" size="lg" />
              </Field.Root>
              <Button type="submit" colorPalette="green" size="lg" w="full">Criar conta</Button>
            </VStack>
          </Box>

          <Text textAlign="center" fontSize="sm" color="fg.muted">
            Já tem conta?{" "}
            <Link href="/auth/login" style={{ color: "#5cc5a7", fontWeight: 500 }}>
              Fazer login
            </Link>
          </Text>
        </VStack>
      </Box>
    </Flex>
  )
}
