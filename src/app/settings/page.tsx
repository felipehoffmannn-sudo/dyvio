"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Box, Flex, Heading, Text, VStack, Separator, Icon } from "@chakra-ui/react"
import { CardRoot, CardBody } from "@chakra-ui/react"
import { HStack } from "@chakra-ui/react"
import { ChevronRight } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { PageHeader } from "@/components/page-header"

export default function SettingsPage() {
  const { status } = useSession()
  if (status === "loading") return null
  if (status === "unauthenticated") redirect("/auth/login")

  return (
    <Flex minH="100vh" direction="column" bg="bg.page">
      <PageHeader title="Configurações" backHref="/dashboard" backLabel="Voltar para o início" />

      <Box flex={1} maxW="520px" mx="auto" w="full" p={{ base: 4, md: 8 }}>
        <VStack gap={8} align="stretch">
          {/* Appearance */}
          <VStack gap={3} align="stretch">
            <Heading as="h2" size="sm" fontWeight="medium" color="fg.muted">Aparência</Heading>
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card">
              <CardBody p={4}>
                <HStack justify="space-between">
                  <Box>
                    <Text fontSize="sm" fontWeight="medium">Tema</Text>
                    <Text fontSize="xs" color="fg.muted">Claro, escuro ou sistema</Text>
                  </Box>
                  <ThemeToggle />
                </HStack>
              </CardBody>
            </CardRoot>
          </VStack>

          {/* Account */}
          <VStack gap={3} align="stretch">
            <Heading as="h2" size="sm" fontWeight="medium" color="fg.muted">Conta</Heading>
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card">
              <CardBody p={0}>
                <SettingsLink href="/profile" label="Editar perfil" />
                <Separator />
                <SettingsLink href="/invites" label="Convites pendentes" />
              </CardBody>
            </CardRoot>
          </VStack>

          {/* About */}
          <VStack gap={3} align="stretch">
            <Heading as="h2" size="sm" fontWeight="medium" color="fg.muted">Sobre</Heading>
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card">
              <CardBody p={4}>
                <HStack justify="space-between">
                  <Text fontSize="sm">Versão</Text>
                  <Text fontSize="sm" color="fg.muted" fontFamily="mono">0.2.0-beta</Text>
                </HStack>
              </CardBody>
            </CardRoot>
          </VStack>
        </VStack>
      </Box>
    </Flex>
  )
}

function SettingsLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <HStack justify="space-between" px={4} minH={12} _hover={{ bg: "gray.50" }} transition="background-color 0.15s">
        <Text fontSize="sm">{label}</Text>
        <Icon as={ChevronRight} boxSize={4} color="fg.muted" />
      </HStack>
    </Link>
  )
}
