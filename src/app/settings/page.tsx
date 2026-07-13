"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Box, Flex, Heading, Text, VStack, Separator, Icon } from "@chakra-ui/react"
import { CardRoot, CardBody } from "@chakra-ui/react"
import { HStack } from "@chakra-ui/react"
import { ChevronRight, Download, Trash2 } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { toast } from "sonner"

export default function SettingsPage() {
  const { data: session, status } = useSession()
  if (status === "loading") return null
  if (status === "unauthenticated") redirect("/auth/login")

  return (
    <Flex minH="100vh" direction="column" bg="gray.50">
      {/* Header */}
      <Flex bg="white" px={6} py={3} borderBottom="1px" borderColor="gray.200" align="center" gap={4}>
        <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
          <Text color="gray.500" _hover={{ color: "gray.700" }}>←</Text>
        </Link>
        <Heading as="h1" size="lg">Configurações</Heading>
      </Flex>

      <Box flex={1} maxW="520px" mx="auto" w="full" p={{ base: 4, md: 8 }}>
        <VStack gap={8} align="stretch">
          {/* Appearance */}
          <VStack gap={3} align="stretch">
            <Heading size="sm" fontWeight="medium" color="gray.500">Aparência</Heading>
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
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
            <Heading size="sm" fontWeight="medium" color="gray.500">Conta</Heading>
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
              <CardBody p={0}>
                <SettingsLink href="/profile" label="Editar perfil" />
                <Separator />
                <SettingsLink href="/invites" label="Convites pendentes" />
                <Separator />
                <SettingsLink href="/notifications" label="Notificações" />
              </CardBody>
            </CardRoot>
          </VStack>

          {/* Data */}
          <VStack gap={3} align="stretch">
            <Heading size="sm" fontWeight="medium" color="gray.500">Dados</Heading>
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
              <CardBody p={0}>
                <SettingsButton
                  icon={Download}
                  label="Exportar meus dados"
                  onClick={() => toast.info("Exportação de dados será implementada em breve.")}
                />
                <Separator />
                <SettingsButton
                  icon={Trash2}
                  label="Solicitar exclusão da conta"
                  color="red.500"
                  onClick={() => toast.info("Solicitação de exclusão será implementada em breve.")}
                />
              </CardBody>
            </CardRoot>
          </VStack>

          {/* About */}
          <VStack gap={3} align="stretch">
            <Heading size="sm" fontWeight="medium" color="gray.500">Sobre</Heading>
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
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
      <HStack justify="space-between" px={4} py={3} _hover={{ bg: "gray.50" }} transition="all 0.15s">
        <Text fontSize="sm">{label}</Text>
        <Icon as={ChevronRight} boxSize={4} color="gray.400" />
      </HStack>
    </Link>
  )
}

function SettingsButton({ icon, label, color, onClick }: { icon: any; label: string; color?: string; onClick: () => void }) {
  return (
    <HStack
      as="button"
      type="button"
      w="full"
      justify="space-between"
      px={4}
      py={3}
      _hover={{ bg: "gray.50" }}
      transition="all 0.15s"
      onClick={onClick}
      cursor="pointer"
      border="none"
      bg="transparent"
    >
      <HStack gap={2}>
        {icon && <Icon as={icon} boxSize={4} color={color || "gray.500"} />}
        <Text fontSize="sm" color={color || "inherit"}>{label}</Text>
      </HStack>
      <Icon as={ChevronRight} boxSize={4} color="gray.400" />
    </HStack>
  )
}
