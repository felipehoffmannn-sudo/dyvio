"use client"

import { useState } from "react"
import { Box, Flex, Heading, Text, Stack, Separator, Grid } from "@chakra-ui/react"
import { Button, IconButton } from "@chakra-ui/react"
import { Icon } from "@chakra-ui/react"
import { HStack, VStack } from "@chakra-ui/react"
import { Dialog } from "@chakra-ui/react"
import { CheckCircle2, Plus, Receipt, Settings } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import { getCategoryIcon } from "@/lib/category-icons"
import { deleteExpense, registerPayment, markPaymentReceived, confirmPayment, rejectPayment } from "@/lib/expense-actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { ExpenseMenu } from "@/components/expense-menu"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ExpenseFormDialog, type ExpenseFormCategory, type ExpenseFormValues } from "@/components/expense-form-dialog"

interface GroupData { id: string; name: string }
interface UserData { id: string; name: string; balance: number }
interface MemberData { id: string; name: string; initials: string; role: string; isCurrentUser: boolean }
interface ExpenseData {
  id: string; title: string; amount: number; originalAmount: number; currency: string; splitType: string
  expenseDate: string; createdAt: string; paidBy: string; payerName: string
  category: { id: string; name: string } | null
  participants: { userId: string; share: number; percentage: number | null }[]
}
interface Settlement { fromUserId: string; toUserId: string; amount: number }
interface PaymentData {
  id: string; fromUserId: string; toUserId: string; amount: number
  status: string; createdAt: string; updatedAt: string
}

interface Props {
  group: GroupData; user: UserData; members: MemberData[]; isAdmin: boolean
  categories: ExpenseFormCategory[]
  expenses: ExpenseData[]; settlements: Settlement[]; payments: PaymentData[]
  /** My ledger balance with each counterparty, in cents: > 0 I owe them, < 0 they owe me. */
  pairBalances: Record<string, number>
}

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Aguardando confirmação", color: "fg.muted" },
  CONFIRMED: { label: "Confirmado", color: "positive" },
  REJECTED: { label: "Não recebido", color: "negative" },
}

/** "pay": I owe and mark it (receiver confirms). "receive": I'm owed and confirm it myself. */
interface PaymentIntent extends Settlement { mode: "pay" | "receive" }

export default function GroupDetailClient({
  group, user, members, isAdmin, categories, expenses, settlements, payments, pairBalances,
}: Props) {
  const router = useRouter()

  const firstName = (id: string) => {
    const m = members.find(m => m.id === id)
    return m?.isCurrentUser ? "Você" : m?.name.split(" ")[0] || "Alguém"
  }
  const involvesMe = (p: { fromUserId: string; toUserId: string }) => p.fromUserId === user.id || p.toUserId === user.id
  const mySettlements = settlements.filter(involvesMe)
  const otherSettlements = settlements.filter(s => !involvesMe(s))
  const myPendingPayments = payments.filter(p => p.status === "PENDING" && involvesMe(p))
  const pendingFor = (fromUserId: string, toUserId: string) =>
    myPendingPayments.find(p => p.fromUserId === fromUserId && p.toUserId === toUserId)
  const pendingWithoutSettlement = myPendingPayments.filter(
    p => !mySettlements.some(s => s.fromUserId === p.fromUserId && s.toUserId === p.toUserId)
  )
  const settlementRows: { fromUserId: string; toUserId: string; amount: number; pending?: PaymentData }[] = [
    ...mySettlements.map(s => ({ ...s, pending: pendingFor(s.fromUserId, s.toUserId) })),
    ...pendingWithoutSettlement.map(p => ({ fromUserId: p.fromUserId, toUserId: p.toUserId, amount: p.amount, pending: p })),
  ]

  const formGroups = [{ id: group.id, name: group.name, members: members.map(m => ({ id: m.id, name: m.name })) }]
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseFormValues | null>(null)
  const [deleting, setDeleting] = useState<ExpenseData | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [paying, setPaying] = useState<PaymentIntent | null>(null)
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [resolvingPaymentId, setResolvingPaymentId] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(exp: ExpenseData) {
    setEditing({
      id: exp.id,
      groupId: group.id,
      title: exp.title,
      originalAmount: exp.originalAmount,
      amount: exp.amount,
      currency: exp.currency,
      paidBy: exp.paidBy,
      categoryId: exp.category?.id ?? null,
      expenseDate: exp.expenseDate,
      splitType: exp.splitType,
      participants: exp.participants,
    })
    setFormOpen(true)
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteSaving(true)
    try {
      const result = await deleteExpense(deleting.id, group.id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Despesa excluída")
        setDeleting(null)
        router.refresh()
      }
    } finally {
      setDeleteSaving(false)
    }
  }

  async function handleResolvePayment(paymentId: string, accept: boolean) {
    setResolvingPaymentId(paymentId)
    try {
      const result = accept ? await confirmPayment(paymentId) : await rejectPayment(paymentId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(accept ? "Recebimento confirmado" : "Pagamento marcado como não recebido")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar pagamento")
    } finally {
      setResolvingPaymentId(null)
    }
  }

  async function handleMarkPaid() {
    if (!paying) return
    setPaymentSaving(true)
    const formData = new FormData()
    formData.set("groupId", group.id)
    formData.set("amountInCents", String(paying.amount))
    try {
      let result
      if (paying.mode === "pay") {
        formData.set("toUserId", paying.toUserId)
        result = await registerPayment(formData)
      } else {
        formData.set("fromUserId", paying.fromUserId)
        result = await markPaymentReceived(formData)
      }
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(paying.mode === "pay"
          ? `Pagamento marcado. ${firstName(paying.toUserId)} precisa confirmar.`
          : `Recebimento de ${firstName(paying.fromUserId)} confirmado.`)
        setPaying(null)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar pagamento")
    } finally {
      setPaymentSaving(false)
    }
  }

  const otherName = paying ? firstName(paying.mode === "pay" ? paying.toUserId : paying.fromUserId) : ""

  return (
    <Flex minH="100vh" direction="column" bg="bg.page">
      <PageHeader
        title={group.name}
        backHref="/dashboard"
        backLabel="Voltar para o início"
        actions={(
          <IconButton asChild aria-label="Configurações do grupo" variant="ghost" size="sm" w={10} h={10} borderRadius="button" color="fg.muted">
            <Link href={`/groups/${group.id}/settings`}>
              <Icon as={Settings} boxSize={5} />
            </Link>
          </IconButton>
        )}
      />

      <Box flex={1} maxW="640px" mx="auto" w="full" p={{ base: 4, md: 6 }}>
        <Stack gap={6}>
          {/* Balance Card */}
          <Box p={5} borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card">
            <Text fontSize="sm" color="fg.muted" mb={1}>Seu saldo no grupo</Text>
            <Text fontSize="3xl" fontWeight="semibold" letterSpacing="tight" color={
              user.balance > 0 ? "positive" : user.balance < 0 ? "negative" : "fg"
            }>
              {user.balance > 0 ? "+" : user.balance < 0 ? "−" : ""}
              {formatCurrency(Math.round(Math.abs(user.balance)))}
            </Text>
            <Text fontSize="sm" color="fg.subtle" mt={1}>
              {user.balance > 0 ? "Você tem a receber" : user.balance < 0 ? "Você deve neste grupo" : "Tudo quitado"}
            </Text>
          </Box>

          {/* Members */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={2}>Membros</Text>
            <Flex flexWrap="wrap" gap={2}>
              {members.map(m => (
                <Flex key={m.id} align="center" gap={2} px={3} h={9} borderRadius="full" borderWidth="1px" borderColor="border.card" bg="bg.card">
                  <Box w={6} h={6} borderRadius="full" bg="gray.900" color="white" display="flex" alignItems="center" justifyContent="center" fontSize="11px" fontWeight="semibold" aria-hidden>
                    {m.initials}
                  </Box>
                  <Text fontSize="sm">{m.isCurrentUser ? "Você" : m.name.split(" ")[0]}</Text>
                  {m.role === "OWNER" && <Text fontSize="xs" color="fg.muted">admin</Text>}
                </Flex>
              ))}
              {isAdmin && (
                <>
                  <Button variant="outline" size="sm" h={9} px={4} borderRadius="button" asChild>
                    <Link href={`/groups/${group.id}/invite`}>
                      Convidar
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" h={9} px={4} borderRadius="button" onClick={async () => {
                      const { createShareableInvite } = await import("@/lib/actions")
                      const result = await createShareableInvite(group.id)
                      if (result?.error) {
                        toast.error(result.error)
                      } else if (result?.token) {
                        const link = `${window.location.origin}/invite/${result.token}`
                        await navigator.clipboard.writeText(link)
                        toast.success("Link de convite copiado!")
                      }
                    }}
                  >
                    Copiar link
                  </Button>
                </>
              )}
            </Flex>
          </Box>

          {/* Settlements */}
          {(settlements.length > 0 || settlementRows.length > 0) && (
            <Box px={5} py={4} borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card">
              <Text fontSize="sm" fontWeight="medium" mb={1}>Acertos pendentes</Text>
              <Text fontSize="xs" color="fg.muted" mb={2}>A forma com menos transferências para zerar o grupo.</Text>
              <Stack gap={0}>
                {settlementRows.map((s, i) => {
                  const isPaying = s.fromUserId === user.id
                  const pending = s.pending
                  return (
                    <Box key={`${s.fromUserId}-${s.toUserId}`}>
                      {i > 0 && <Separator />}
                      <Flex py={3} justify="space-between" align={{ base: "stretch", sm: "center" }} gap={3} direction={{ base: pending && !isPaying ? "column" : "row", sm: "row" }}>
                        <Box minW={0}>
                          <Text fontSize="sm">
                            {pending
                              ? isPaying
                                ? `Você marcou como pago para ${firstName(s.toUserId)}`
                                : `${firstName(s.fromUserId)} marcou como pago`
                              : isPaying ? `Você deve a ${firstName(s.toUserId)}` : `${firstName(s.fromUserId)} deve a você`}
                          </Text>
                          <Text fontSize="md" fontWeight="semibold" color={pending ? "fg" : isPaying ? "negative" : "positive"}>
                            {formatCurrency(pending ? pending.amount : s.amount)}
                          </Text>
                          {pending && (
                            <Text fontSize="xs" color="fg.muted" mt={0.5}>
                              {isPaying
                                ? `Aguardando ${firstName(s.toUserId)} confirmar o recebimento`
                                : "Confira se o valor chegou antes de confirmar"}
                            </Text>
                          )}
                        </Box>
                        {pending ? (
                          isPaying ? null : (
                            <HStack gap={2} flexShrink={0}>
                              <Button variant="ghost" size="sm" px={3} borderRadius="button" disabled={resolvingPaymentId !== null} onClick={() => handleResolvePayment(pending.id, false)}>
                                Não recebi
                              </Button>
                              <Button colorPalette="green" size="sm" px={4} borderRadius="button" loading={resolvingPaymentId === pending.id} disabled={resolvingPaymentId !== null} onClick={() => handleResolvePayment(pending.id, true)}>
                                Confirmar recebimento
                              </Button>
                            </HStack>
                          )
                        ) : (
                          <Button
                            variant="outline" size="sm" px={4} borderRadius="button" flexShrink={0}
                            onClick={() => setPaying({ ...s, mode: isPaying ? "pay" : "receive" })}
                          >
                            Marcar como pago
                          </Button>
                        )}
                      </Flex>
                    </Box>
                  )
                })}
                {otherSettlements.length > 0 && (
                  <Box pt={settlementRows.length > 0 ? 3 : 0} mt={settlementRows.length > 0 ? 1 : 0} borderTopWidth={settlementRows.length > 0 ? "1px" : "0"} borderColor="border.card">
                    <Text fontSize="xs" color="fg.muted" mb={1}>Entre outros membros</Text>
                    {otherSettlements.map(s => (
                      <Flex key={`${s.fromUserId}-${s.toUserId}`} py={1.5} justify="space-between" fontSize="sm" color="fg.muted">
                        <Text>{firstName(s.fromUserId)} → {firstName(s.toUserId)}</Text>
                        <Text>{formatCurrency(s.amount)}</Text>
                      </Flex>
                    ))}
                  </Box>
                )}
              </Stack>
            </Box>
          )}

          {/* Payment history */}
          {payments.length > 0 && (
            <Box px={5} py={4} borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card">
              <Text fontSize="sm" fontWeight="medium" mb={2}>Pagamentos</Text>
              <Stack gap={0}>
                {payments.map((p, i) => {
                  const status = PAYMENT_STATUS[p.status] ?? { label: p.status, color: "fg.muted" }
                  return (
                    <Box key={p.id}>
                      {i > 0 && <Separator />}
                      <Flex py={2.5} justify="space-between" align="center" gap={3}>
                        <Box minW={0}>
                          <Text fontSize="sm">
                            {p.fromUserId === user.id
                              ? `Você pagou ${firstName(p.toUserId)}`
                              : p.toUserId === user.id
                                ? `${firstName(p.fromUserId)} pagou você`
                                : `${firstName(p.fromUserId)} pagou ${firstName(p.toUserId)}`}
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            {formatDateShort(p.createdAt)} · <Text as="span" color={status.color}>{status.label}</Text>
                          </Text>
                        </Box>
                        <Text fontSize="sm" fontWeight="medium" flexShrink={0} color={p.status === "REJECTED" ? "fg.muted" : "fg"} textDecoration={p.status === "REJECTED" ? "line-through" : undefined}>
                          {formatCurrency(p.amount)}
                        </Text>
                      </Flex>
                    </Box>
                  )
                })}
              </Stack>
            </Box>
          )}

          {/* Expenses */}
          <Box>
            <Flex justify="space-between" align="center" mb={3}>
              <Heading as="h2" size="md">Despesas</Heading>
              <Button colorPalette="green" size="sm" px={4} borderRadius="button" onClick={openCreate}>
                <Icon as={Plus} boxSize={4} aria-hidden />
                Nova despesa
              </Button>
            </Flex>

            {expenses.length === 0 ? (
              <VStack p={10} gap={2} borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card" textAlign="center">
                <Icon as={Receipt} boxSize={6} color="fg.subtle" strokeWidth={1.5} />
                <Text fontWeight="medium">Nenhuma despesa ainda</Text>
                <Text fontSize="sm" color="fg.muted">Use “Nova despesa” para adicionar a primeira.</Text>
              </VStack>
            ) : (
              <Box px={5} borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card">
                {expenses.map((expense, i) => {
                  const isPayer = expense.paidBy === user.id
                  const myShare = expense.participants.find(p => p.userId === user.id)?.share ?? 0
                  const others = expense.participants.filter(p => p.userId !== expense.paidBy && p.share > 0)
                  const lent = others.reduce((acc, p) => acc + p.share, 0)
                  const settled = isPayer
                    ? others.every(p => (pairBalances[p.userId] ?? 0) >= 0)
                    : (pairBalances[expense.paidBy] ?? 0) <= 0
                  const canEdit = isAdmin || isPayer
                  const canDelete = isAdmin || (isPayer && Date.now() - new Date(expense.createdAt).getTime() <= 24 * 60 * 60 * 1000)
                  const foreign = expense.currency !== "BRL"
                  const CategoryIcon = getCategoryIcon(expense.category?.name)

                  let status: { text: string; color: string } | null = null
                  if (isPayer && lent > 0) {
                    status = settled
                      ? { text: `Você emprestou ${formatCurrency(lent)} · recebido`, color: "fg.muted" }
                      : { text: `Você emprestou ${formatCurrency(lent)}`, color: "positive" }
                  } else if (!isPayer && myShare > 0) {
                    status = settled
                      ? { text: `Sua parte ${formatCurrency(myShare)} · quitada`, color: "fg.muted" }
                      : { text: `Sua parte ${formatCurrency(myShare)}`, color: "negative" }
                  }

                  return (
                    <Grid
                      key={expense.id} templateColumns="40px minmax(0, 1fr) auto auto" columnGap={3} alignItems="center"
                      py={4} borderTopWidth={i > 0 ? "1px" : 0} borderColor="border.card"
                    >
                      <Box w={10} h={10} borderRadius="lg" bg="gray.100" display="flex" alignItems="center" justifyContent="center">
                        <Icon as={CategoryIcon} boxSize={4} color="fg.muted" strokeWidth={1.75} aria-hidden />
                      </Box>
                      <Box minW={0}>
                        <Text fontSize="sm" fontWeight="medium" truncate>{expense.title}</Text>
                        <Text fontSize="xs" color="fg.muted" mt={0.5}>
                          {formatDateShort(expense.expenseDate)} · {isPayer ? "você pagou" : `${expense.payerName.split(" ")[0] || "Alguém"} pagou`}
                          {expense.category && ` · ${expense.category.name}`}
                        </Text>
                        {status && (
                          <HStack gap={1} mt={0.5} fontSize="xs" fontWeight="medium" color={status.color}>
                            {settled && <Icon as={CheckCircle2} boxSize={3.5} color="positive" aria-hidden />}
                            <Text>{status.text}</Text>
                          </HStack>
                        )}
                      </Box>
                      <Box textAlign="right">
                        <Text fontSize="sm" fontWeight="semibold" whiteSpace="nowrap">
                          {formatCurrency(foreign ? expense.originalAmount : expense.amount, expense.currency)}
                        </Text>
                        {foreign && <Text fontSize="xs" color="fg.muted" mt={0.5} whiteSpace="nowrap">≈ {formatCurrency(expense.amount)}</Text>}
                      </Box>
                      <ExpenseMenu
                        title={expense.title}
                        onEdit={canEdit ? () => openEdit(expense) : undefined}
                        onDelete={canDelete ? () => setDeleting(expense) : undefined}
                      />
                    </Grid>
                  )
                })}
              </Box>
            )}
          </Box>
        </Stack>
      </Box>

      <ExpenseFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        groups={formGroups}
        categories={categories}
        currentUserId={user.id}
        expense={editing}
        defaultGroupId={group.id}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir despesa?"
        description={deleting ? `"${deleting.title}" sai da lista e o saldo de quem dividiu é recalculado.` : ""}
        confirmLabel="Excluir despesa"
        destructive
        loading={deleteSaving}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      {/* Mark as paid confirmation */}
      <Dialog.Root
        role="alertdialog"
        open={paying !== null}
        onOpenChange={(e) => { if (!e.open && !paymentSaving) setPaying(null) }}
      >
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner alignItems="center" px={{ base: 2, md: 0 }}>
          <Dialog.Content bg="bg.panel" borderRadius="card" maxW={{ base: "100%", md: "400px" }} p={6}>
            <Dialog.Title fontSize="lg" fontWeight="semibold">
              {paying?.mode === "receive" ? `${otherName} já pagou você?` : "Marcar como pago"}
            </Dialog.Title>
            <Dialog.Description fontSize="sm" color="fg.muted" mt={2}>
              {paying?.mode === "receive"
                ? "Confirme só se o dinheiro já chegou para você."
                : `Use quando você já pagou ${otherName} por fora do app (Pix, dinheiro, transferência).`}
            </Dialog.Description>
            <Text fontSize="3xl" fontWeight="semibold" letterSpacing="tight" mt={5}>
              {paying ? formatCurrency(paying.amount) : ""}
            </Text>
            <Text fontSize="sm" color="fg.muted" mt={2}>
              {paying?.mode === "receive"
                ? "Como é você quem recebe, o saldo de vocês é atualizado na hora."
                : `${otherName} confere e confirma o recebimento. Até lá, o acerto continua na lista como aguardando confirmação.`}
            </Text>
            <VStack gap={2} mt={6}>
              <Button colorPalette="green" borderRadius="button" w="full" size="lg" loading={paymentSaving} onClick={handleMarkPaid}>
                {paying?.mode === "receive" ? "Confirmar que recebi" : "Marcar como pago"}
              </Button>
              <Button variant="ghost" borderRadius="button" w="full" size="lg" disabled={paymentSaving} onClick={() => setPaying(null)}>
                Cancelar
              </Button>
            </VStack>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Flex>
  )
}
