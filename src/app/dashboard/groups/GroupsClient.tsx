"use client"

import { useState, useTransition } from "react"
import { Box, Flex, Heading, Text, Stack } from "@chakra-ui/react"
import { HStack, VStack } from "@chakra-ui/react"
import { Button } from "@chakra-ui/react"
import { CardRoot, CardBody } from "@chakra-ui/react"
import { Icon } from "@chakra-ui/react"
import { Plus, Users, ChevronRight } from "lucide-react"
import Link from "next/link"
import { formatCurrencyConverted } from "@/lib/currency"
import { AppHeader } from "@/components/app-header"
import { ExpenseMenu } from "@/components/expense-menu"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { deleteGroup } from "@/lib/actions"

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
  const [deleting, setDeleting] = useState<Group | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const confirmDelete = () => {
    if (!deleting) return
    const id = deleting.id
    startTransition(async () => {
      const result = await deleteGroup(id)
      if (result?.error) setDeleteError(result.error)
      setDeleting(null)
    })
  }

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
      <AppHeader active="groups" userName={user.name} currency={selectedCurrency} onCurrencyChange={setSelectedCurrency} />

      {/* === MAIN CONTENT === */}
      <Box flex={1} maxW="800px" mx="auto" w="full" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }}>
        {/* Header */}
        <Flex justify="space-between" align="center" mb={8}>
          <Box>
            <Heading as="h1" size="2xl" fontWeight="semibold" letterSpacing="tight">Grupos</Heading>
            <Text fontSize="sm" color="fg.muted" mt={1}>
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
                    <Text fontSize="sm" color="fg.subtle" mt={1}>
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
                  fontSize="sm" fontWeight="semibold" color="fg.subtle"
                  textTransform="uppercase" letterSpacing="wider" mb={3}
                >
                  {monthLabel}
                </Text>
                <Stack gap={2}>
                  {monthGroups.map((group) => (
                    <CardRoot
                      key={group.id}
                      borderRadius="card"
                      borderWidth="1px"
                      borderColor="gray.200"
                      bg="bg.card"
                      _hover={{ bg: "gray.50" }}
                      transition="background 0.15s"
                    >
                      <CardBody>
                        <Flex align="center" pr={3}>
                          <Link href={`/groups/${group.id}`} style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
                          <Box p={4}>
                            <Flex align="center" justify="space-between">
                              <HStack gap={3}>
                                <Box w={10} h={10} borderRadius="lg" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                                  <Icon as={Users} boxSize={4} color="fg.muted" />
                                </Box>
                                <Box>
                                  <HStack gap={2}>
                                    <Text fontWeight="medium">{group.name}</Text>
                                    {group.role === "OWNER" && (
                                      <Text fontSize="xs" px={1.5} borderRadius="full" borderWidth="1px" borderColor="border.card" color="fg.muted">
                                        admin
                                      </Text>
                                    )}
                                    {group.isArchived && (
                                      <Text fontSize="xs" px={1.5} borderRadius="full" bg="gray.100" color="fg.muted">
                                        arquivado
                                      </Text>
                                    )}
                                  </HStack>
                                  <Text fontSize="xs" color="fg.subtle">
                                    {group.memberCount} membro{group.memberCount !== 1 ? "s" : ""}
                                  </Text>
                                </Box>
                              </HStack>
                              <HStack gap={2}>
                                <Text fontWeight="medium" fontSize="sm" color={
                                  group.balance > 0 ? "positive"
                                    : group.balance < 0 ? "negative"
                                    : "fg.subtle"
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
                          </Link>
                          <ExpenseMenu title={group.name} onDelete={() => { setDeleteError(null); setDeleting(group) }} />
                        </Flex>
                      </CardBody>
                    </CardRoot>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
        {deleteError && <Text fontSize="sm" color="red.700" mt={4}>{deleteError}</Text>}
      </Box>

      <ConfirmDialog
        open={deleting !== null}
        title={`Excluir "${deleting?.name ?? ""}"?`}
        description="Todas as despesas, pagamentos e saldos deste grupo serão apagados para todos os membros. Não dá para desfazer."
        confirmLabel="Excluir grupo"
        destructive
        loading={pending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </Flex>
  )
}
