"use client"

import { useState } from "react"
import { Box, Flex, Heading, Text, SimpleGrid, Grid, Separator, Input, Dialog, Field, Tooltip } from "@chakra-ui/react"
import { HStack, VStack, Stack } from "@chakra-ui/react"
import { Button } from "@chakra-ui/react"
import { CardRoot, CardHeader, CardBody, CardTitle } from "@chakra-ui/react"
import { AvatarRoot, AvatarFallback } from "@chakra-ui/react"
import { NativeSelect } from "@chakra-ui/react"
import { Icon } from "@chakra-ui/react"
import { createExpenseFromDashboard, deleteExpense, updateExpense } from "@/lib/expense-actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Plus, ArrowUpRight, ArrowDownRight, CheckCircle2,
  TrendingUp, Receipt, Wallet, LayoutDashboard, Users, X, Calendar,
  Pencil, Trash2, Home, Utensils, Car, Gamepad2, Lightbulb,
  ShoppingCart, Heart, Plane, Monitor, MoreHorizontal,
} from "lucide-react"
import Link from "next/link"
import { formatCurrencyConverted, convertCurrency } from "@/lib/currency"

interface Group { id: string; name: string; balance: number; memberIds: string[]; members: { id: string; name: string }[] }
interface Expense {
  id: string; description: string; amount: number; expenseDate: string; currency: string;
  group: { id: string; name: string }; payer: { id: string; name: string };
  category?: { id: string; name: string; icon: string } | null;}

interface Props {
  user: { name: string; id: string }
  groupsWithBalances: Group[]
  netBalance: number
  totalOwe: number
  totalOwed: number
  totalGroupExpense: number
  recentExpenses: Expense[]
  monthlyTotal: number
  dailyMap: Record<number, number>
  daysInMonth: number
  maxDaily: number
  currentMonthName: string
  now: Date
}

export default function DashboardClient(props: Props) {
  const {
    user, groupsWithBalances, totalGroupExpense, netBalance, totalOwe, totalOwed,
    recentExpenses, monthlyTotal, dailyMap, daysInMonth, maxDaily, currentMonthName,
  } = props
  const router = useRouter()
  const barMaxHeight = 80

  // Modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseDesc, setExpenseDesc] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [expenseGroupId, setExpenseGroupId] = useState(groupsWithBalances[0]?.id || "")
  const [expenseSaving, setExpenseSaving] = useState(false)
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0])
  const [expenseCategory, setExpenseCategory] = useState("")
  const [expenseCurrency, setExpenseCurrency] = useState("BRL")

  // Currency state
  const [selectedCurrency, setSelectedCurrency] = useState("BRL")

  // Auto-select all members of the current group for splitting
  const currentGroup = groupsWithBalances.find(g => g.id === expenseGroupId)
  const [expenseParticipants, setExpenseParticipants] = useState<Set<string>>(
    new Set(currentGroup?.members.map(m => m.id) || [])
  )

  // Edit modal state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editDesc, setEditDesc] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  function openEditModal(exp: Expense) {
    setEditingExpense(exp)
    setEditDesc(exp.description)
    setEditAmount((exp.amount / 100).toFixed(2).replace(".", ","))
    setEditDate(exp.expenseDate.split("T")[0])
    setEditCategory(exp.category?.id || "")
    setShowExpenseModal(false) // Close add modal if open
  }

  async function handleUpdateExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!editingExpense) return
    if (!editDesc.trim() || !editAmount) return

    setEditSaving(true)
    const formData = new FormData()
    formData.set("expenseId", editingExpense.id)
    formData.set("groupId", editingExpense.group.id)
    formData.set("title", editDesc.trim())
    formData.set("amount", editAmount.replace(",", "."))
    formData.set("expenseDate", editDate)
    if (editCategory) formData.set("categoryId", editCategory)

    try {
      const result = await updateExpense(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Despesa atualizada!")
        setEditingExpense(null)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar despesa")
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteExpense(exp: Expense) {
    if (!confirm(`Tem certeza que deseja excluir "${exp.description}"?`)) return

    const result = await deleteExpense(exp.id, exp.group.id)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Despesa excluída!")
      router.refresh()
    }
  }

  // Update participants when group changes
  function updateGroupId(id: string) {
    setExpenseGroupId(id)
    const g = groupsWithBalances.find(gr => gr.id === id)
    if (g) setExpenseParticipants(new Set(g.members.map(m => m.id)))
  }

  async function handleQuickExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!expenseDesc.trim() || !expenseAmount || !expenseGroupId) return
    const amountInCents = Math.round(parseFloat(expenseAmount.replace(",", ".")) * 100)
    // Convert from selected currency to BRL for storage
    const brlAmount = expenseCurrency === "BRL" ? amountInCents : convertCurrency(amountInCents, expenseCurrency, "BRL")
    if (amountInCents <= 0) return

    setExpenseSaving(true)
    const formData = new FormData()
    formData.set("groupId", expenseGroupId)
    formData.set("title", expenseDesc.trim())
    formData.set("amount", (brlAmount / 100).toFixed(2))
    formData.set("splitType", "EQUAL")
    formData.set("paidBy", user.id)
    formData.set("expenseDate", expenseDate)
    formData.set("currency", expenseCurrency)
    if (expenseCategory) formData.set("categoryId", expenseCategory)

    // Include selected participants for proper split
    expenseParticipants.forEach(id => formData.append("participants", id))

    try {
      const result = await createExpenseFromDashboard(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Despesa adicionada!")
        setShowExpenseModal(false)
        setExpenseDesc("")
        setExpenseAmount("")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar despesa")
    } finally {
      setExpenseSaving(false)
    }
  }

  const userInitials = user.name
    .split(" ")
    .map(n => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()

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
          <Button variant="ghost" size="sm" fontWeight={{ base: "normal", md: "semibold" }} color="brand.600" bg={{ base: "transparent", md: "brand.50" }} px={{ base: 2, md: 3 }} py={1.5} borderRadius="button" asChild>
            <Link href="/dashboard">
              <Icon as={LayoutDashboard} boxSize={4} />
              <Box as="span" display={{ base: "none", md: "inline" }} ml={1}>Dashboard</Box>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" fontWeight="medium" color="gray.600" px={{ base: 2, md: 3 }} py={1.5} borderRadius="button" asChild>
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
      <Box flex={1} maxW="1160px" mx="auto" w="full" p={{ base: 4, md: 6 }}>
        {/* Greeting + Add Expense Button */}
        <Flex justify="space-between" align="flex-start" mb={6} gap={4} direction={{ base: "column", sm: "row" }}>
          <Box>
            <Heading as="h1" size={{ base: "xl", md: "4xl" }} fontWeight="semibold">
              Tudo bem, {user.name}?
            </Heading>
            <Text color="gray.500" mt={1} fontSize={{ base: "sm", md: "md" }}>
              Aqui está seu panorama financeiro atual.
            </Text>
          </Box>
          <Button colorPalette="green" size="md" flexShrink={0} px={5} py={2} borderRadius="button" onClick={() => setShowExpenseModal(true)}>
            <Icon as={Plus} boxSize={4} mr={1} />
            Adicionar despesa
          </Button>
        </Flex>

        {/* Summary Cards */}
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4} mb={8}>
          <SummaryCard
            title="GASTO DO GRUPO"
            value={formatCurrencyConverted(totalGroupExpense, selectedCurrency)}
            icon={TrendingUp}
            color="rose"
          />
          <SummaryCard
            title="SALDO TOTAL"
            value={(netBalance >= 0 ? "+" : "") + formatCurrencyConverted(Math.round(Math.abs(netBalance)), selectedCurrency)}
            icon={Wallet}
            color="brand"
          />
          <SummaryCard
            title="A RECEBER"
            value={formatCurrencyConverted(Math.round(totalOwed), selectedCurrency)}
            icon={ArrowUpRight}
            color="green"
          />
          <SummaryCard
            title="A PAGAR"
            value={formatCurrencyConverted(Math.round(totalOwe), selectedCurrency)}
            icon={ArrowDownRight}
            color="red"
          />
        </SimpleGrid>

        {/* Two-column layout */}
        <Grid templateColumns={{ base: "1fr", lg: "1fr 360px" }} gap={6}>
          {/* === LEFT: Atividade Recente === */}
          <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
            <CardHeader>
              <Box p={5} pb={0}>
                <CardTitle fontSize="lg">Atividade recente</CardTitle>
              </Box>
            </CardHeader>
            <CardBody>
              <Box p={5} pt={3}>
                {recentExpenses.length === 0 ? (
                  <VStack py={10} gap={4} textAlign="center">
                    <Box w={12} h={12} borderRadius="full" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                      <Icon as={Receipt} boxSize={6} color="gray.300" />
                    </Box>
                    <Text color="gray.400">Nenhuma despesa registrada</Text>
                    <Button colorPalette="green" size="sm" px={4} py={2} borderRadius="button" onClick={() => setShowExpenseModal(true)}>
                      <Icon as={Plus} boxSize={4} mr={1} />
                      Adicionar Primeira Despesa
                    </Button>
                  </VStack>
                ) : (
                  <Stack gap={0}>
                    {recentExpenses.map((exp, i) => {
                      const isPayer = exp.payer.name === user.name || exp.payer.name === "Admin"
                      const CategoryIcon = getCategoryIcon(exp.category?.name)
                      return (
                        <Box key={exp.id}>
                          {i > 0 && <Separator />}
                          <HStack py={4} gap={3} role="group">
                            <Box
                              w={10} h={10} borderRadius="lg"
                              bg={isPayer ? "orange.100" : "blue.100"}
                              display="flex" alignItems="center" justifyContent="center"
                              flexShrink={0}
                            >
                              <Icon as={CategoryIcon} boxSize={4} color={isPayer ? "orange.600" : "blue.600"} />
                            </Box>
                            <Box flex={1} minW={0}>
                              <Text fontWeight="semibold" truncate fontSize="sm">{exp.description || "Sem descrição"}</Text>
                              <HStack gap={1.5} mt={1} flexWrap="wrap" alignItems="center">
                                <Text fontSize="xs" px={1.5} py={0.5} borderRadius="full" bg="brand.50" color="brand.600" fontWeight="medium">
                                  {exp.group.name}
                                </Text>
                                {exp.category && (
                                  <HStack gap={0.5} fontSize="xs" px={1.5} py={0.5} borderRadius="full" bg="gray.100" color="gray.600">
                                    <Icon as={getCategoryIcon(exp.category.name)} boxSize={3} />
                                    <Text as="span">{exp.category.name}</Text>
                                  </HStack>
                                )}
                                <Text fontSize="xs" color="gray.400">
                                  {isPayer ? "pago por você" : `pago por ${exp.payer.name}`}
                                </Text>
                              </HStack>
                            </Box>
                            <HStack gap={1} flexShrink={0}>
                              <Box
                                as="button"
                                type="button"
                                onClick={() => openEditModal(exp)}
                                w={7} h={7} borderRadius="md"
                                display="flex" alignItems="center" justifyContent="center"
                                _hover={{ bg: "gray.100" }}
                                transition="all 0.15s"
                                title="Editar despesa"
                              >
                                <Icon as={Pencil} boxSize={3.5} color="gray.400" />
                              </Box>
                              <Box
                                as="button"
                                type="button"
                                onClick={() => handleDeleteExpense(exp)}
                                w={7} h={7} borderRadius="md"
                                display="flex" alignItems="center" justifyContent="center"
                                _hover={{ bg: "red.50" }}
                                transition="all 0.15s"
                                title="Excluir despesa"
                              >
                                <Icon as={Trash2} boxSize={3.5} color="gray.400" />
                              </Box>
                              <Text fontWeight="semibold" color={isPayer ? "orange.600" : "red.500"} fontSize="sm" minW="70px" textAlign="right">
                                {formatCurrencyConverted(exp.amount, selectedCurrency)}
                                {exp.currency && exp.currency !== selectedCurrency && (
                                  <Text as="span" fontSize="10px" color="gray.400" display="block">
                                    {formatCurrencyConverted(exp.amount, exp.currency)}
                                  </Text>
                                )}
                              </Text>
                            </HStack>
                          </HStack>
                        </Box>
                      )
                    })}
                  </Stack>
                )}
              </Box>
            </CardBody>
          </CardRoot>

          {/* === RIGHT: Acertos + Visão Geral Mensal === */}
          <Stack gap={6}>
            {/* Acertos */}
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
              <CardHeader>
                <Box p={5} pb={0}>
                  <CardTitle fontSize="lg">Acertos</CardTitle>
                </Box>
              </CardHeader>
              <CardBody>
                <Box p={5} pt={3}>
                  {totalOwe === 0 && totalOwed === 0 ? (
                    <VStack py={4} gap={3} textAlign="center">
                      <Box w={12} h={12} borderRadius="full" bg="green.50" display="flex" alignItems="center" justifyContent="center">
                        <Icon as={CheckCircle2} boxSize={6} color="green.500" />
                      </Box>
                      <Text color="gray.500" fontWeight="medium">
                        Todas as dívidas estão quitadas!
                      </Text>
                    </VStack>
                  ) : (
                    <VStack py={4} gap={3}>
                      {totalOwe > 0 && (
                        <HStack w="full" justify="space-between">
                          <Text fontSize="sm" fontWeight="medium" color="gray.600">A pagar</Text>
                          <Text fontSize="sm" fontWeight="bold" color="red.500">
                            {formatCurrencyConverted(Math.round(totalOwe), selectedCurrency)}
                          </Text>
                        </HStack>
                      )}
                      {totalOwed > 0 && (
                        <HStack w="full" justify="space-between">
                          <Text fontSize="sm" fontWeight="medium" color="gray.600">A receber</Text>
                          <Text fontSize="sm" fontWeight="bold" color="green.600">
                            {formatCurrencyConverted(Math.round(totalOwed), selectedCurrency)}
                          </Text>
                        </HStack>
                      )}
                      <Separator w="full" />
                      <HStack w="full" justify="space-between">
                        <Text fontSize="sm" fontWeight="semibold" color="gray.700">Saldo líquido</Text>
                        <Text fontSize="sm" fontWeight="bold" color={netBalance >= 0 ? "green.600" : "red.500"}>
                          {(netBalance >= 0 ? "+" : "")}{formatCurrencyConverted(Math.round(Math.abs(netBalance)), selectedCurrency)}
                        </Text>
                      </HStack>
                    </VStack>
                  )}
                </Box>
              </CardBody>
            </CardRoot>

            {/* Visão Geral Mensal */}
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="gray.200">
              <CardHeader>
                <Box p={5} pb={0}>
                  <CardTitle fontSize="lg">Visão Geral Mensal</CardTitle>
                  <Text color="gray.500" fontSize="sm" mt={1}>
                    Seu Gasto Total{" "}
                    <Text as="span" fontWeight="bold">{formatCurrencyConverted(monthlyTotal, selectedCurrency)}</Text>
                  </Text>
                </Box>
              </CardHeader>
              <CardBody>
                <Box p={5} pt={3}>
                  {/* Bar chart */}
                  <Flex align="flex-end" gap="2px" h={`${barMaxHeight + 24}px`} mb={2}>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1
                      const val = dailyMap[day] || 0
                      const height = maxDaily > 0 ? (val / maxDaily) * barMaxHeight : 0
                      const isToday = day === new Date().getDate()
                      return (
                        <Box
                          key={day}
                          flex={1}
                          display="flex"
                          flexDirection="column"
                          alignItems="center"
                          justifyContent="flex-end"
                          h="full"
                        >
                          <Tooltip.Root positioning={{ placement: "top" }}>
                            <Tooltip.Trigger asChild>
                              <Box
                                w="full"
                                h={`${Math.max(height, 2)}px`}
                                borderRadius="md"
                                bg={isToday ? "brand.500" : "brand.200"}
                                _hover={{ bg: isToday ? "brand.600" : "brand.300" }}
                                transition="all 0.15s"
                                cursor="pointer"
                              />
                            </Tooltip.Trigger>
                            <Tooltip.Positioner>
                              <Tooltip.Content px={3} py={2}>
                                <Tooltip.Arrow />
                                <Text fontWeight="bold">{formatCurrencyConverted(val, selectedCurrency)}</Text>
                                <Text fontSize="xs" color="gray.400">Dia {day}</Text>
                              </Tooltip.Content>
                            </Tooltip.Positioner>
                          </Tooltip.Root>
                        </Box>
                      )
                    })}
                  </Flex>
                  {/* Chart labels */}
                  <Flex justify="space-between" mt={1}>
                    <Text fontSize="10px" color="gray.400">1</Text>
                    <Text fontSize="10px" color="gray.400">{currentMonthName}</Text>
                    <Text fontSize="10px" color="gray.400">{daysInMonth}</Text>
                  </Flex>
                </Box>
              </CardBody>
            </CardRoot>
          </Stack>
        </Grid>
      </Box>

      {/* Quick Expense Modal */}
      <Dialog.Root open={showExpenseModal} onOpenChange={(e) => setShowExpenseModal(e.open)}>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner alignItems="center" px={{ base: 2, md: 0 }}>
          <Dialog.Content bg="bg.panel" borderRadius="card" maxW={{ base: "100%", md: "480px" }} maxH="85vh" overflowY="auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <Flex align="center" justify="space-between" p={6} pb={2}>
              <Heading size="md" fontWeight="semibold">Adicionar uma despesa</Heading>
              <Flex gap={2}>
                <Dialog.CloseTrigger asChild>
                  <Box w={8} h={8} borderRadius="full" display="flex" alignItems="center" justifyContent="center" cursor="pointer" _hover={{ bg: "gray.100" }}>
                    <Icon as={X} boxSize={5} color="gray.500" />
                  </Box>
                </Dialog.CloseTrigger>
              </Flex>
            </Flex>

            <Box as="form" onSubmit={handleQuickExpense} p={6} pt={4}>
              {/* Grupo */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Grupo</Field.Label>
                <NativeSelect.Root size="lg">
                  <NativeSelect.Field ps="5" pe="10" value={expenseGroupId} onChange={e => updateGroupId(e.target.value)}>
                    {groupsWithBalances.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              {/* Descrição */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Descrição</Field.Label>
                <Input value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)}
                  placeholder="ex: Jantar Japonês, Conta de Luz" required autoFocus
                  size="lg" px="5" bg="white" borderWidth="1px" borderColor="border"
                  _focus={{ borderColor: "brand.500", boxShadow: "none" }} />
              </Field.Root>

              {/* Valor */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Valor</Field.Label>
                <Flex gap={2}>
                  <NativeSelect.Root size="lg" w="120px" flexShrink={0}>
                    <NativeSelect.Field ps="4" pe="8" value={expenseCurrency} onChange={e => setExpenseCurrency(e.target.value)}>
                      <option value="BRL">BRL (R$)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                  <Input type="text" inputMode="decimal" placeholder="0,00" required flex={1}
                    value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)}
                    size="lg" px="5" bg="white" borderWidth="1px" borderColor="border"
                    _focus={{ borderColor: "brand.500", boxShadow: "none" }} />
                </Flex>
              </Field.Root>

              {/* Data */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Data</Field.Label>
                <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
                  size="lg" px="5" bg="white" borderWidth="1px" borderColor="border"
                  _focus={{ borderColor: "brand.500", boxShadow: "none" }} />
              </Field.Root>

              {/* Categoria */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Categoria</Field.Label>
                <NativeSelect.Root size="lg">
                  <NativeSelect.Field ps="5" pe="10" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                    <option value="">Geral</option>
                    <option value="cat-moradia">Moradia</option>
                    <option value="cat-alimentação">Alimentação</option>
                    <option value="cat-transporte">Transporte</option>
                    <option value="cat-lazer">Lazer</option>
                    <option value="cat-contas">Contas</option>
                    <option value="cat-supermercado">Supermercado</option>
                    <option value="cat-saúde">Saúde</option>
                    <option value="cat-viagem">Viagem</option>
                    <option value="cat-tecnologia">Tecnologia</option>
                    <option value="cat-outros">Outros</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              {/* Dividir com */}
              <Field.Root mb={6}>
                <Field.Label color="fg.muted">Dividir com</Field.Label>
                <Flex flexWrap="wrap" gap={2}>
                  {(() => {
                    const g = groupsWithBalances.find(gr => gr.id === expenseGroupId)
                    return g ? g.members.map(m => {
                      const selected = expenseParticipants.has(m.id)
                      return (
                        <Box
                          key={m.id}
                          as="button"
                          type="button"
                          onClick={() => {
                            const next = new Set(expenseParticipants)
                            if (next.has(m.id)) next.delete(m.id)
                            else next.add(m.id)
                            setExpenseParticipants(next)
                          }}
                          px={3} py={1.5}
                          borderRadius="full"
                          borderWidth="1px"
                          fontSize="sm"
                          borderColor={selected ? "brand.500" : "gray.200"}
                          bg={selected ? "brand.50" : "white"}
                          color={selected ? "brand.600" : "gray.600"}
                          fontWeight={selected ? "medium" : "normal"}
                          cursor="pointer"
                          _hover={{ borderColor: selected ? "brand.500" : "gray.300" }}
                          transition="all 0.15s"
                        >
                          {m.id === user.id ? "Você" : m.name.split(" ")[0]}
                        </Box>
                      )
                    }) : null
                  })()}
                </Flex>
                <Text fontSize="xs" color="gray.400" mt={1}>
                  Dividido igualmente entre {expenseParticipants.size} pessoa{expenseParticipants.size !== 1 ? "s" : ""}.
                </Text>
              </Field.Root>

              {/* Submit */}
              <Button type="submit" colorPalette="green" borderRadius="button" w="full" size="lg" py={3} loading={expenseSaving}>
                Salvar despesa
              </Button>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Edit Expense Modal */}
      <Dialog.Root open={editingExpense !== null} onOpenChange={(e) => { if (!e.open) setEditingExpense(null) }}>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner alignItems="center" px={{ base: 2, md: 0 }}>
          <Dialog.Content bg="bg.panel" borderRadius="card" maxW={{ base: "100%", md: "480px" }} maxH="85vh" overflowY="auto" onClick={(e) => e.stopPropagation()}>
            <Flex align="center" justify="space-between" p={6} pb={2}>
              <Heading size="md" fontWeight="semibold">Editar despesa</Heading>
              <Dialog.CloseTrigger asChild>
                <Box w={8} h={8} borderRadius="full" display="flex" alignItems="center" justifyContent="center" cursor="pointer" _hover={{ bg: "gray.100" }}>
                  <Icon as={X} boxSize={5} color="gray.500" />
                </Box>
              </Dialog.CloseTrigger>
            </Flex>

            <Box as="form" onSubmit={handleUpdateExpense} p={6} pt={4}>
              {/* Grupo (read-only) */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Grupo</Field.Label>
                <Text fontSize="md" fontWeight="medium" color="gray.700">
                  {editingExpense?.group.name || ""}
                </Text>
              </Field.Root>

              {/* Descrição */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Descrição</Field.Label>
                <Input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  placeholder="ex: Jantar Japonês" required size="lg" px="5"
                  bg="white" borderWidth="1px" borderColor="border"
                  _focus={{ borderColor: "brand.500", boxShadow: "none" }} />
              </Field.Root>

              {/* Valor */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Valor</Field.Label>
                <Input type="text" inputMode="decimal" placeholder="0,00" required
                  value={editAmount} onChange={e => setEditAmount(e.target.value)}
                  size="lg" px="5" bg="white" borderWidth="1px" borderColor="border"
                  _focus={{ borderColor: "brand.500", boxShadow: "none" }} />
              </Field.Root>

              {/* Data */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Data</Field.Label>
                <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  size="lg" px="5" bg="white" borderWidth="1px" borderColor="border"
                  _focus={{ borderColor: "brand.500", boxShadow: "none" }} />
              </Field.Root>

              {/* Categoria */}
              <Field.Root mb={6}>
                <Field.Label color="fg.muted">Categoria</Field.Label>
                <NativeSelect.Root size="lg">
                  <NativeSelect.Field ps="5" pe="10" value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                    <option value="">Geral</option>
                    <option value="cat-moradia">Moradia</option>
                    <option value="cat-alimentação">Alimentação</option>
                    <option value="cat-transporte">Transporte</option>
                    <option value="cat-lazer">Lazer</option>
                    <option value="cat-contas">Contas</option>
                    <option value="cat-supermercado">Supermercado</option>
                    <option value="cat-saúde">Saúde</option>
                    <option value="cat-viagem">Viagem</option>
                    <option value="cat-tecnologia">Tecnologia</option>
                    <option value="cat-outros">Outros</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              {/* Buttons */}
              <VStack gap={3}>
                <Button type="submit" colorPalette="green" borderRadius="button" w="full" size="lg" py={3} loading={editSaving}>
                  Salvar alterações
                </Button>
                <Button type="button" variant="outline" borderRadius="button" w="full" size="lg" py={3} onClick={() => setEditingExpense(null)}>
                  Cancelar
                </Button>
              </VStack>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

    </Flex>
  )
}

/* ─── Category Icon Map ─── */
function getCategoryIcon(categoryName?: string | null): React.ElementType {
  const map: Record<string, React.ElementType> = {
    "Moradia": Home,
    "Alimentação": Utensils,
    "Transporte": Car,
    "Lazer": Gamepad2,
    "Contas": Lightbulb,
    "Supermercado": ShoppingCart,
    "Saúde": Heart,
    "Viagem": Plane,
    "Tecnologia": Monitor,
  }
  return map[categoryName || ""] || Receipt
}

/* ─── Summary Card ─── */
function SummaryCard({ title, value, icon: IconEl, color }: {
  title: string; value: string; icon: React.ElementType; color: string
}) {
  const colorMap: Record<string, { iconBg: string; iconColor: string }> = {
    brand:  { iconBg: "brand.50",  iconColor: "brand.600" },
    red:    { iconBg: "red.50",    iconColor: "red.500" },
    green:  { iconBg: "green.50",  iconColor: "green.600" },
    rose:   { iconBg: "rose.50", iconColor: "rose.500" },
  }
  const c = colorMap[color] || colorMap.brand

  return (
    <CardRoot
      borderRadius="card"
      borderWidth="1px"
      borderColor="gray.200"
      bg="bg.card"
    >
      <CardBody>
        <Box p={5}>
          <Flex justify="space-between" align="flex-start" gap={3}>
            <Box>
              <Text fontSize="xs" color="gray.400" fontWeight="semibold" letterSpacing="wider">
                {title}
              </Text>
              <Heading size="xl" mt={1} fontWeight="bold">{value}</Heading>
            </Box>
            <Box
              w={10} h={10} borderRadius="xl" bg={c.iconBg}
              display="flex" alignItems="center" justifyContent="center"
              flexShrink={0}
            >
              <Icon as={IconEl} boxSize={5} color={c.iconColor} />
            </Box>
          </Flex>
        </Box>
      </CardBody>
    </CardRoot>
  )
}
