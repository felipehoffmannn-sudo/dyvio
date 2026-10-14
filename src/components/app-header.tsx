"use client"

import { Box, Flex, HStack, Icon, NativeSelect, Text } from "@chakra-ui/react"
import { AvatarRoot, AvatarFallback } from "@chakra-ui/react"
import { LayoutDashboard, Users } from "lucide-react"
import Link from "next/link"

const navItems = [
  { key: "dashboard", href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { key: "groups", href: "/dashboard/groups", label: "Grupos", icon: Users },
] as const

interface AppHeaderProps {
  active: (typeof navItems)[number]["key"]
  userName: string
  currency: string
  onCurrencyChange: (currency: string) => void
}

export function AppHeader({ active, userName, currency, onCurrencyChange }: AppHeaderProps) {
  const initials = userName
    .split(" ")
    .map(n => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <Flex
      as="header"
      bg="bg.card" px={{ base: 3, md: 6 }} h={14}
      borderBottomWidth="1px" borderColor="border.card"
      align="center" justify="space-between" gap={2}
    >
      <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit" }}>
        <Text fontSize="lg" fontWeight="semibold" letterSpacing="tight" color="fg">
          Dyvio
        </Text>
      </Link>

      <HStack as="nav" gap={1}>
        {navItems.map(item => {
          const isActive = item.key === active
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              style={{ textDecoration: "none" }}
            >
              <HStack
                gap={1.5} px={3} h={9} borderRadius="button"
                fontSize="sm" fontWeight="medium"
                color={isActive ? "fg" : "fg.muted"}
                bg={isActive ? "gray.100" : "transparent"}
                _hover={{ color: "fg", bg: "gray.100" }}
                transition="background-color 0.15s, color 0.15s"
              >
                <Icon as={item.icon} boxSize={4} />
                <Box as="span" display={{ base: "none", md: "inline" }}>{item.label}</Box>
              </HStack>
            </Link>
          )
        })}
      </HStack>

      <HStack gap={{ base: 1, md: 3 }}>
        <NativeSelect.Root size="xs" w={{ base: "80px", md: "110px" }}>
          <NativeSelect.Field
            aria-label="Moeda de exibição"
            ps={{ base: 2, md: 3 }} pe={{ base: 5, md: 7 }}
            value={currency} onChange={e => onCurrencyChange(e.target.value)}
          >
            <option value="BRL">BRL (R$)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Link href="/profile" aria-label="Perfil" style={{ color: "inherit", textDecoration: "none", display: "flex" }}>
          <AvatarRoot size="sm" overflow="hidden" borderRadius="full">
            <AvatarFallback
              bg="gray.900" color="white" fontSize="xs" fontWeight="semibold"
              w="full" h="full" display="flex" alignItems="center" justifyContent="center"
            >
              {initials}
            </AvatarFallback>
          </AvatarRoot>
        </Link>
      </HStack>
    </Flex>
  )
}
