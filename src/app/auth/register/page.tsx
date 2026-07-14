import { registerUser } from "@/lib/actions"
import { Box, Flex, Heading, Text, Input, Button, VStack, Field } from "@chakra-ui/react"
import Link from "next/link"

interface Props {
  searchParams: { callbackUrl?: string }
}

export default function RegisterPage({ searchParams }: Props) {
  const callbackUrl = searchParams.callbackUrl || ""

  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50" px={4}>
      <Box w="full" maxW="400px">
        <VStack gap={8} align="stretch">
          <VStack gap={2} textAlign="center">
            <Heading as="h1" size="3xl" fontWeight="bold">Criar conta</Heading>
            <Text color="fg.muted">Comece a dividir despesas de forma inteligente</Text>
          </VStack>

          <form action={registerUser} style={{ width: "100%" }}>
            <VStack gap={4}>
              {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
              <Field.Root required>
                <Field.Label color="gray.500" fontSize="13px">Nome</Field.Label>
                <Input name="name" placeholder="Seu nome" autoComplete="name"
                  size="lg" px={4} py={3} bg="white" borderWidth="1px" borderColor="gray.200"
                  _focus={{ borderColor: "brand.500", boxShadow: "none" }}
                />
              </Field.Root>
              <Field.Root required>
                <Field.Label color="gray.500" fontSize="13px">Email</Field.Label>
                <Input name="email" type="email" placeholder="seu@email.com" autoComplete="email"
                  size="lg" px={4} py={3} bg="white" borderWidth="1px" borderColor="gray.200"
                  _focus={{ borderColor: "brand.500", boxShadow: "none" }}
                />
              </Field.Root>
              <Field.Root required>
                <Field.Label color="gray.500" fontSize="13px">Senha</Field.Label>
                <Input name="password" type="password" placeholder="Mínimo 8 caracteres" minLength={8} autoComplete="new-password"
                  size="lg" px={4} py={3} bg="white" borderWidth="1px" borderColor="gray.200"
                  _focus={{ borderColor: "brand.500", boxShadow: "none" }}
                />
              </Field.Root>
              <Button type="submit" colorPalette="green" size="lg" w="full" py={3}>
                Criar conta
              </Button>
            </VStack>
          </form>

          <Text textAlign="center" fontSize="sm" color="gray.500">
            Já tem conta?{" "}
            <Link href={`/auth/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} style={{ color: "#5CC5A7", fontWeight: 500 }}>
              Fazer login
            </Link>
          </Text>
        </VStack>
      </Box>
    </Flex>
  )
}
