"use client"

import { useState } from "react"
import { Box, Flex, Heading, Text, Stack, Separator } from "@chakra-ui/react"
import { HStack, VStack } from "@chakra-ui/react"
import { Button } from "@chakra-ui/react"
import { CardRoot, CardHeader, CardBody, CardTitle } from "@chakra-ui/react"
import { AvatarRoot, AvatarFallback } from "@chakra-ui/react"
import { NativeSelect } from "@chakra-ui/react"
import { Icon } from "@chakra-ui/react"
import { Plus, Users, ChevronRight, LayoutDashboard, ArrowUpRight, ArrowDownRight } from "lucide-react"
import Link from "next/link"
import { formatCurrencyConverted } from "@/lib/currency"

interface Group {
  id: string; name: string; isArchived: boolean
  createdAt: string; memberCount: number
  balance: number; role: string
}

interface Props {
  user: { name: string; id: string }
  groups: Group[]
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

export default function GroupsClient({ user, groups }: Props) {
  const [selectedCurrency, setSelectedCurrency] = useState("BRL")
  const userInitials = user.name
    .split(" ")
    .map(n => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()

  // Group by month/year
  const grouped = groups.reduce<Record<string, Group[]>>((acc, group) => {
    const d = new Date(group.createdAt)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
    if (!acc[key]) acc[key] = []
    acc[key].push(group)
    return acc
  }, {})

  const groupEntries = Object.entries(grouped)

  return (
    <Flex minH="100vh" direction="column" bg="gray.50">
      {/* === TOP BAR === */}
      <Flex
        bg="white" px={{ base: 3, md: 6 }} py={3} borderBottom="1px" borderColor="border.card"
        align="center" justify="space-between" gap={{ base: 1, md: 0 }}
      >
        <HStack gap={2}>
          <Box w={{ base: 7, md: 8 }} h={{ base: 7, md: 8 }} bg="brand.500" borderRadius="lg" />
          <Heading size={{ base: "sm", md: "md" }} color="brand.600">Dyvio</Heading>
        </HStack>

        <HStack gap={{ base: 0.5, md: 1 }}>
          <Button variant="ghost" size="sm" fontWeight="medium" color="gray.600" px={{ base: 2, md: 3 }} py={1.5} borderRadius="button" asChild>
            <Link href="/dashboard">
              <Icon as={LayoutDashboard} boxSize={4} />
              <Box as="span" display={{ base: "none", md: "inline" }} ml={1}>Dashboard</Box>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" fontWeight={{ base: "normal", md: "semibold" }} color="brand.600" bg={{ base: "transparent", md: "brand.50" }} px={{ base: 2, md: 3 }} py={1.5} borderRadius="button" asChild>
            <Link href="/dashboard/groups">
              <Icon as={Users} boxSize={4} />
              <Box as="span" display={{ base: "none", md: "inline" }} ml={1}>Grupos</Box>
            </Link>
          </Button>
        </HStack>

        <HStack gap={{ base: 1, md: 3 }}>
          <NativeSelect.Root size="xs" w={{ base: "80px", md: "130px" }}>
            <NativeSelect.Field ps={{ base: 2, md: 3 }} pe={{ base: 5, md: 7 }} value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)}>
              <option value="BRL">BRL (R$)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Link href="/profile" style={{ color: "inherit", textDecoration: "none", display: "flex" }}>
            <AvatarRoot size={{ base: "xs", md: "sm" }} cursor="pointer" overflow="hidden" borderRadius="full">
              <AvatarFallback bg="brand.500" color="white" fontWeight="bold" w="full" h="full" display="flex" alignItems="center" justifyContent="center">
                {userInitials}
              </AvatarFallback>
            </AvatarRoot>
          </Link>
        </HStack>
      </Flex>

      {/* === MAIN CONTENT === */}
      <Box flex={1} maxW="800px" mx="auto" w="full" p={{ base: 4, md: 6 }}>
        {/* Header */}
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Heading size="xl" fontWeight="semibold">Grupos</Heading>
            <Text color="gray.500" mt={1} fontSize="md">
              {groups.length} grupo{groups.length !== 1 ? "s" : ""}
            </Text>
          </Box>
          <Button colorPalette="green" size="sm" px={4} py={2} borderRadius="button" asChild>
            <Link href="/groups/new">
              <Icon as={Plus} boxSize={4} />
              Novo Grupo
            </Link>
          </Button>
        </Flex>

        {groups.length === 0 ? (
          <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
            <CardBody>
              <Box p={8}>
                <VStack gap={4} textAlign="center">
                  <Box w={14} h={14} borderRadius="full" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                    <Icon as={Users} boxSize={7} color="gray.300" />
                  </Box>
                  <Box>
                    <Text fontWeight="semibold" fontSize="lg">Nenhum grupo</Text>
                    <Text color="gray.400" fontSize="sm" mt={1}>
                      Crie ou entre em um grupo para começar
                    </Text>
                  </Box>
                  <Stack direction="row" gap={3}>
                    <Button colorPalette="green" size="sm" px={4} py={2} borderRadius="button" asChild>
                      <Link href="/groups/new">
                        <Icon as={Plus} boxSize={4} />
                        Criar grupo
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" px={4} py={2} borderRadius="button" asChild>
                      <Link href="/invites">Tenho um convite</Link>
                    </Button>
                  </Stack>
                </VStack>
              </Box>
            </CardBody>
          </CardRoot>
        ) : (
          <Stack gap={8}>
            {groupEntries.map(([monthLabel, monthGroups]) => (
              <Box key={monthLabel}>
                <Text
                  fontSize="sm" fontWeight="semibold" color="gray.400"
                  textTransform="uppercase" letterSpacing="wider" mb={3}
                >
                  {monthLabel}
                </Text>
                <Stack gap={2}>
                  {monthGroups.map((group) => (
                    <Link key={group.id} href={`/groups/${group.id}`} style={{ textDecoration: "none" }}>
                      <CardRoot
                        borderRadius="card"
                        borderWidth="1px"
                        borderColor="gray.200"
                        bg="bg.card"
                        _hover={{ bg: "gray.50" }}
                        transition="background 0.15s"
                      >
                        <CardBody>
                          <Box p={4}>
                            <Flex align="center" justify="space-between">
                              <HStack gap={3}>
                                <Box w={10} h={10} borderRadius="lg" bg="brand.100" display="flex" alignItems="center" justifyContent="center">
                                  <Icon as={Users} boxSize={5} color="brand.600" />
                                </Box>
                                <Box>
                                  <HStack gap={2}>
                                    <Text fontWeight="medium">{group.name}</Text>
                                    {group.role === "OWNER" && (
                                      <Text fontSize="10px" px={1.5} py={0.5} borderRadius="full" bg="brand.50" color="brand.600" fontWeight="medium">
                                        admin
                                      </Text>
                                    )}
                                    {group.isArchived && (
                                      <Text fontSize="10px" px={1.5} py={0.5} borderRadius="full" bg="gray.100" color="gray.500">
                                        arquivado
                                      </Text>
                                    )}
                                  </HStack>
                                  <Text fontSize="xs" color="gray.400">
                                    {group.memberCount} membro{group.memberCount !== 1 ? "s" : ""}
                                  </Text>
                                </Box>
                              </HStack>
                              <HStack gap={2}>
                                <Text fontWeight="semibold" fontSize="sm" color={
                                  group.balance > 0 ? "green.600"
                                    : group.balance < 0 ? "red.500"
                                    : "gray.400"
                                }>
                                  {group.balance > 0
                                    ? `+${formatCurrencyConverted(Math.round(group.balance), selectedCurrency)}`
                                    : group.balance < 0
                                    ? `-${formatCurrencyConverted(Math.round(Math.abs(group.balance)), selectedCurrency)}`
                                    : formatCurrencyConverted(0, selectedCurrency)}
                                </Text>
                                <Icon as={ChevronRight} boxSize={4} color="gray.300" />
                              </HStack>
                            </Flex>
                          </Box>
                        </CardBody>
                      </CardRoot>
                    </Link>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Flex>
  )
}
