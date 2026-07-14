"use client"

import { useState } from "react"
import { Box, Flex, Heading, Text, Stack, Separator, SimpleGrid, Input, Field } from "@chakra-ui/react"
import { Button } from "@chakra-ui/react"
import { Icon } from "@chakra-ui/react"
import { HStack, VStack } from "@chakra-ui/react"
import { NativeSelect } from "@chakra-ui/react"
import { Dialog } from "@chakra-ui/react"
import { ArrowLeft, Plus, Settings, ChevronRight, Receipt, LogOut, X, Pencil, Lightbulb } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import { formatCurrencyConverted, convertCurrency } from "@/lib/currency"
import { createExpenseFromDashboard, updateExpense } from "@/lib/expense-actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DeleteExpenseButton } from "./delete-button"

interface GroupData { id: string; name: string }
interface UserData { id: string; name: string; balance: number }
interface MemberData { id: string; name: string; initials: string; role: string; isCurrentUser: boolean }
interface ExpenseData {
  id: string; title: string; amount: number; expenseDate: string; createdAt: string; paidBy: string
  payer: { id: string; name: string; image: string | null }
  participants: { userId: string; shareAmount: number; user: { id: string; name: string } }[]
  category: { name: string; icon: string } | null
}
interface Settlement { fromUserId: string; toUserId: string; amount: number }

interface Props {
  group: GroupData; user: UserData; members: MemberData[]; isAdmin: boolean
  expenses: ExpenseData[]; userSettlements: Settlement[]
}

export default function GroupDetailClient({ group, user, members, isAdmin, expenses, userSettlements }: Props) {
  const router = useRouter()

  // Quick expense modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseDesc, setExpenseDesc] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0])
  const [expenseCategory, setExpenseCategory] = useState("")
  const [expenseCurrency, setExpenseCurrency] = useState("BRL")
  const [expenseSaving, setExpenseSaving] = useState(false)
  const [expenseParticipants, setExpenseParticipants] = useState<Set<string>>(
    new Set(members.map(m => m.id))
  )

  const groupMembers = members.map(m => ({ id: m.id, name: m.name }))

  async function handleQuickExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!expenseDesc.trim() || !expenseAmount || !group.id) return
    const amountInCents = Math.round(parseFloat(expenseAmount.replace(",", ".")) * 100)
    const brlAmount = expenseCurrency === "BRL" ? amountInCents : convertCurrency(amountInCents, expenseCurrency, "BRL")
    if (amountInCents <= 0) return

    setExpenseSaving(true)
    const formData = new FormData()
    formData.set("groupId", group.id)
    formData.set("title", expenseDesc.trim())
    formData.set("amount", (brlAmount / 100).toFixed(2))
    formData.set("splitType", "EQUAL")
    formData.set("paidBy", user.id)
    formData.set("expenseDate", expenseDate)
    formData.set("currency", expenseCurrency)
    if (expenseCategory) formData.set("categoryId", expenseCategory)
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

  // Edit modal state
  const [editingExpense, setEditingExpense] = useState<ExpenseData | null>(null)
  const [editDesc, setEditDesc] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editSaving, setEditSaving] = useState(false)
  const [editParticipants, setEditParticipants] = useState<Set<string>>(new Set())
  const [editPaidBy, setEditPaidBy] = useState("")

  function openEditModal(exp: ExpenseData) {
    setEditingExpense(exp)
    setEditDesc(exp.title)
    setEditAmount((exp.amount / 100).toFixed(2).replace(".", ","))
    setEditDate(exp.expenseDate.split("T")[0])
    setEditCategory("")
    setEditPaidBy(exp.paidBy)
    setEditParticipants(new Set(exp.participants.map(p => p.userId)))
  }

  async function handleUpdateExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!editingExpense) return
    if (!editDesc.trim() || !editAmount) return

    setEditSaving(true)
    const formData = new FormData()
    formData.set("expenseId", editingExpense.id)
    formData.set("groupId", group.id)
    formData.set("title", editDesc.trim())
    formData.set("amount", editAmount.replace(",", "."))
    formData.set("expenseDate", editDate)
    formData.set("splitType", "EQUAL")
    formData.set("paidBy", editPaidBy)
    if (editCategory) formData.set("categoryId", editCategory)
    editParticipants.forEach(id => formData.append("participants", id))

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

  return (
    <Flex minH="100vh" direction="column" bg="gray.50">
      {/* Header */}
      <Flex bg="white" px={{ base: 4, md: 6 }} py={3} borderBottom="1px" borderColor="gray.200" align="center" justify="space-between">
        <Flex align="center" gap={3} minW={0} flex={1}>
          <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none", flexShrink: 0 }}>
            <Icon as={ArrowLeft} boxSize={5} color="gray.500" />
          </Link>
          <Heading as="h1" size={{ base: "md", md: "lg" }} truncate maxW={{ base: "180px", md: "300px" }}>{group.name}</Heading>
        </Flex>
        {isAdmin && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/groups/${group.id}/settings`}>
              <Settings size={16} />
            </Link>
          </Button>
        )}
      </Flex>

      {/* Content */}
      <Box flex={1} maxW="640px" mx="auto" w="full" p={{ base: 4, md: 6 }}>
        <Stack gap={6}>
          {/* Balance Card */}
          <Box p={5} borderRadius="card" borderWidth="1px" borderColor="gray.200" bg="white">
            <Text fontSize="sm" color="gray.500" mb={1}>Seu saldo no grupo</Text>
            <Text fontSize="2xl" fontWeight="bold" color={
              user.balance > 0 ? "green.600" : user.balance < 0 ? "red.500" : "gray.500"
            }>
              {user.balance > 0 ? "+ " : user.balance < 0 ? "- " : ""}
              {formatCurrency(Math.round(Math.abs(user.balance)))}
            </Text>
            <Link href={`/groups/${group.id}/settle`} style={{ textDecoration: "none" }}>
              <Text fontSize="sm" color="brand.600" mt={1} _hover={{ textDecoration: "underline" }}>
                Ver liquidação →
              </Text>
            </Link>
          </Box>

          {/* Members */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="gray.500" mb={2}>Membros</Text>
            <Flex flexWrap="wrap" gap={2}>
              {members.map(m => (
                <Flex key={m.id} align="center" gap={2} px={3} py={1.5} borderRadius="full" borderWidth="1px" borderColor="gray.200" bg="white">
                  <Box w={5} h={5} borderRadius="full" bg="brand.100" display="flex" alignItems="center" justifyContent="center" fontSize="10px" fontWeight="medium">
                    {m.initials}
                  </Box>
                  <Text fontSize="sm">{m.isCurrentUser ? "Você" : m.name.split(" ")[0]}</Text>
                  {m.role === "OWNER" && <Text fontSize="10px" color="gray.400">admin</Text>}
                </Flex>
              ))}
              {isAdmin && (
                <>
                  <Button variant="outline" size="sm" px={4} py={1.5} borderRadius="button" asChild>
                    <Link href={`/groups/${group.id}/invite`}>
                      Convidar
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" px={4} py={1.5} borderRadius="button" onClick={async () => {
                      const { createShareableInvite } = await import("@/lib/actions")
                      const result = await createShareableInvite(group.id)
                      if (result?.error) {
                        const { toast } = await import("sonner")
                        toast.error(result.error)
                      } else if (result?.token) {
                        const link = `${window.location.origin}/invite/${result.token}`
                        await navigator.clipboard.writeText(link)
                        const { toast } = await import("sonner")
                        toast.success("Link de convite copiado!")
                      }
                    }}
                  >
                    Compartilhar
                  </Button>
                </>
              )}
            </Flex>
          </Box>

          {/* Settlements */}
          {userSettlements.length > 0 && (
            <Box p={4} borderRadius="card" borderWidth="1px" borderColor="gray.200" bg="white">
              <Text fontSize="sm" fontWeight="medium" color="gray.500" mb={2}>Acertos pendentes</Text>
              <Stack gap={0}>
                {userSettlements.map((s, i) => (
                  <Box key={i}>
                    {i > 0 && <Separator />}
                    <Flex py={3} justify="space-between" align="center">
                      <Text fontSize="sm">
                        {s.fromUserId === user.id
                          ? `Você deve ${members.find(m => m.id === s.toUserId)?.name.split(" ")[0] || "alguém"}`
                          : `${members.find(m => m.id === s.fromUserId)?.name.split(" ")[0] || "Alguém"} deve você`}
                      </Text>
                      <Text fontWeight="semibold" fontSize="sm" color={s.fromUserId === user.id ? "red.500" : "green.600"}>
                        {formatCurrency(Math.abs(Math.round(s.amount)))}
                      </Text>
                    </Flex>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Expenses */}
          <Box>
            <Flex justify="space-between" align="center" mb={3}>
              <Heading size="md">Despesas</Heading>
              <Button colorPalette="green" size="sm" px={4} py={2} borderRadius="button" onClick={() => setShowExpenseModal(true)}>
                Nova
              </Button>
            </Flex>

            {expenses.length === 0 ? (
              <Box p={12} borderRadius="card" borderWidth="1px" borderColor="gray.200" bg="white" textAlign="center">
                <Icon as={Receipt} boxSize={10} color="gray.300" />
                <Text fontWeight="semibold">Nenhuma despesa ainda</Text>
                <Text fontSize="sm" color="gray.500" mt={1}>Toque no + para adicionar a primeira despesa</Text>
              </Box>
            ) : (
              <Stack gap={2}>
                {expenses.map(expense => {
                  const userParticipant = expense.participants.find(p => p.userId === user.id)
                  const userShare = userParticipant ? Number(userParticipant.shareAmount) : 0
                  const isPayer = expense.paidBy === user.id
                  const canDelete = isAdmin || (expense.paidBy === user.id && (Date.now() - new Date(expense.createdAt).getTime()) / (1000 * 60 * 60) <= 24)

                  return (
                    <Box key={expense.id} p={4} borderRadius="card" borderWidth="1px" borderColor="gray.200" bg="white" _hover={{ bg: "gray.50" }} transition="background 0.15s" role="group">
                      <Flex justify="space-between" align="flex-start" gap={3}>
                        <Box flex={1} minW={0}>
                          <Flex align="center" gap={2} mb={1}>
                            <Text fontSize="xs" color="gray.400">{formatDateShort(expense.expenseDate)}</Text>
                            {expense.category && (
                              <Text fontSize="xs" px={2} py={0.5} borderRadius="full" bg="gray.50" borderWidth="1px" borderColor="gray.200">
                                {expense.category.icon} {expense.category.name}
                              </Text>
                            )}
                          </Flex>
                          <Text fontWeight="medium" truncate>{expense.title}</Text>
                          <Text fontSize="sm" color="gray.500" mt={0.5}>
                            {isPayer
                              ? `Você pagou ${formatCurrency(Number(expense.amount))}`
                              : `${expense.payer.name?.split(" ")[0]} pagou ${formatCurrency(Number(expense.amount))}`}
                          </Text>
                          {!isPayer && userShare > 0 && (
                            <Text fontSize="sm" fontWeight="medium" color="red.500" mt={0.5}>
                              Você deve {formatCurrency(userShare)}
                            </Text>
                          )}
                          {isPayer && userShare > 0 && (
                            <Text fontSize="sm" fontWeight="medium" color="green.600" mt={0.5}>
                              Você emprestou {formatCurrency(Number(expense.amount) - userShare)}
                            </Text>
                          )}
                        </Box>
                        <Flex align="center" gap={2} flexShrink={0}>
                          <Text fontSize="sm" fontWeight="semibold">{formatCurrency(Number(expense.amount))}</Text>
                          <Box
                            as="button"
                            onClick={() => openEditModal(expense)}
                            w={7} h={7} borderRadius="md"
                            display="flex" alignItems="center" justifyContent="center"
                            _hover={{ bg: "gray.100" }}
                            transition="all 0.15s"
                            title="Editar despesa"
                          >
                            <Icon as={Pencil} boxSize={3.5} color="gray.400" />
                          </Box>
                          <DeleteExpenseButton expenseId={expense.id} groupId={group.id} canDelete={canDelete} />
                        </Flex>
                      </Flex>

                      {/* Participants preview */}
                      <Flex align="center" gap={1} mt={2}>
                        {expense.participants.slice(0, 4).map(p => (
                          <Box key={p.userId} w={5} h={5} borderRadius="full" bg="brand.100" display="flex" alignItems="center" justifyContent="center" fontSize="9px" title={p.user.name || ""}>
                            {p.user.name?.[0]?.toUpperCase()}
                          </Box>
                        ))}
                        {expense.participants.length > 4 && (
                          <Text fontSize="xs" color="gray.400">+{expense.participants.length - 4}</Text>
                        )}
                      </Flex>
                    </Box>
                  )
                })}
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>

      {/* Quick Expense Modal */}
      <Dialog.Root open={showExpenseModal} onOpenChange={(e) => setShowExpenseModal(e.open)}>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner alignItems="center" px={{ base: 2, md: 0 }}>
          <Dialog.Content bg="bg.panel" borderRadius="card" maxW={{ base: "100%", md: "480px" }} maxH="85vh" overflowY="auto" onClick={(e) => e.stopPropagation()}>
            <Flex align="center" justify="space-between" p={6} pb={2}>
              <Heading size="md" fontWeight="semibold">Adicionar despesa</Heading>
              <Dialog.CloseTrigger asChild>
                <Box w={8} h={8} borderRadius="full" display="flex" alignItems="center" justifyContent="center" cursor="pointer" _hover={{ bg: "gray.100" }}>
                  <Icon as={X} boxSize={5} color="gray.500" />
                </Box>
              </Dialog.CloseTrigger>
            </Flex>

            <form onSubmit={handleQuickExpense} style={{ padding: "24px 24px 16px" }}>
              {/* Grupo (read-only) */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Grupo</Field.Label>
                <Text fontSize="md" fontWeight="medium" color="gray.700">{group.name}</Text>
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
                  {groupMembers.map(m => {
                    const selected = expenseParticipants.has(m.id)
                    return (
                      <Box
                        key={m.id}
                        as="button"
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
                  })}
                </Flex>
                <Text fontSize="xs" color="gray.400" mt={1}>
                  Dividido igualmente entre {expenseParticipants.size} pessoa{expenseParticipants.size !== 1 ? "s" : ""}.
                </Text>
              </Field.Root>

              {/* Submit */}
              <Button type="submit" colorPalette="green" borderRadius="button" w="full" size="lg" py={3} loading={expenseSaving}>
                Salvar despesa
              </Button>
            </form>
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

            <form onSubmit={handleUpdateExpense} style={{ padding: "24px 24px 16px" }}>
              {/* Grupo (read-only) */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Grupo</Field.Label>
                <Text fontSize="md" fontWeight="medium" color="gray.700">{group.name}</Text>
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
              <Field.Root mb={4}>
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

              {/* Pago por */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Pago por</Field.Label>
                <NativeSelect.Root size="lg">
                  <NativeSelect.Field ps="5" pe="10" value={editPaidBy} onChange={e => setEditPaidBy(e.target.value)}>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.isCurrentUser ? "Você" : m.name.split(" ")[0]}</option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              {/* Dividir com */}
              <Field.Root mb={4}>
                <Field.Label color="fg.muted">Dividir com</Field.Label>
                <Flex flexWrap="wrap" gap={2}>
                  {groupMembers.map(m => {
                    const selected = editParticipants.has(m.id)
                    return (
                      <Box
                        key={m.id}
                        as="button"
                        onClick={() => {
                          const next = new Set(editParticipants)
                          if (next.has(m.id)) next.delete(m.id)
                          else next.add(m.id)
                          setEditParticipants(next)
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
                  })}
                </Flex>
                <Text fontSize="xs" color="gray.400" mt={1}>
                  Dividido igualmente entre {editParticipants.size} pessoa{editParticipants.size !== 1 ? "s" : ""}.
                </Text>
              </Field.Root>

              {/* Split Preview */}
              {(() => {
                const amountNum = parseFloat(editAmount.replace(",", "."))
                const amountCents = isNaN(amountNum) ? 0 : Math.round(amountNum * 100)
                if (amountCents <= 0 || editParticipants.size === 0) return null
                const participantsList = groupMembers.filter(m => editParticipants.has(m.id))

                const count = participantsList.length
                const base = Math.floor(amountCents / count)
                const rem = amountCents - base * count
                const preview = participantsList.map((p, i) => ({ userId: p.id, amount: i === count - 1 ? base + rem : base }))

                return (
                  <Box p={4} borderRadius="card" borderWidth="1px" borderColor="gray.200" bg="white" mb={4}>
                    <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                      <Icon as={Lightbulb} boxSize={4} /> Pré-visualização
                    </Text>
                    <Flex direction="column" gap={2}>
                      {preview.map(p => (
                        <Flex key={p.userId} justify="space-between" fontSize="sm">
                          <Text>{groupMembers.find(m => m.id === p.userId)?.name?.split(" ")[0] || "Alguém"}</Text>
                          <Text fontFamily="mono" fontWeight="medium">{formatCurrency(p.amount)}</Text>
                        </Flex>
                      ))}
                    </Flex>
                  </Box>
                )
              })()}

              {/* Buttons */}
              <VStack gap={3}>
                <Button type="submit" colorPalette="green" borderRadius="button" w="full" size="lg" py={3} loading={editSaving}>
                  Salvar alterações
                </Button>
                <Button type="button" variant="outline" borderRadius="button" w="full" size="lg" py={3} onClick={() => setEditingExpense(null)}>
                  Cancelar
                </Button>
              </VStack>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Flex>
  )
}
