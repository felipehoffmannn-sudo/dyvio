"use client"

import { useState } from "react"
import { Box, Flex, Heading, Text, Grid, Separator, Dialog, Tooltip } from "@chakra-ui/react"
import { HStack, VStack, Stack } from "@chakra-ui/react"
import { Button } from "@chakra-ui/react"
import { CardRoot, CardHeader, CardBody, CardTitle } from "@chakra-ui/react"
import { Icon } from "@chakra-ui/react"
import { deleteExpense, registerPayment, markPaymentReceived } from "@/lib/expense-actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Check, CheckCircle2, Clock, Receipt } from "lucide-react"
import { formatCurrencyConverted } from "@/lib/currency"
import { formatCurrency, formatDateShort } from "@/lib/utils"
import { getCategoryIcon } from "@/lib/category-icons"
import { AppHeader } from "@/components/app-header"
import { ExpenseMenu } from "@/components/expense-menu"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ExpenseFormDialog, type ExpenseFormCategory, type ExpenseFormValues } from "@/components/expense-form-dialog"

interface Group { id: string; name: string; balance: number; isAdmin: boolean; memberIds: string[]; members: { id: string; name: string }[] }
interface Expense {
  id: string; description: string; amount: number; originalAmount: number; expenseDate: string; createdAt: string
  currency: string; splitType: string
  group: { id: string; name: string }; payer: { id: string; name: string };
  category?: { id: string; name: string; icon: string } | null;
  participants: { userId: string; name: string; share: number; percentage: number | null }[];
}

/** "pay": I owe and mark it (receiver confirms). "receive": I'm owed and confirm it myself. */
interface PaymentIntent {
  mode: "pay" | "receive"
  groupId: string
  groupName: string
  otherUserId: string
  otherName: string
  amount: number
  expense: { title: string; total: number; splitCount: number; share: number }
}

interface Props {
  user: { name: string; id: string }
  groupsWithBalances: Group[]
  netBalance: number
  totalOwe: number
  totalOwed: number
  totalGroupExpense: number
  recentExpenses: Expense[]
  categories: ExpenseFormCategory[]
  monthlyTotal: number
  dailyMap: Record<number, number>
  daysInMonth: number
  maxDaily: number
  currentMonthName: string
  now: Date
  /** Keyed by `${groupId}:${otherUserId}`, in cents. */
  debts: Record<string, number>
  owedToMe: Record<string, number>
  pendingOut: string[]
  pendingIn: Record<string, number>
}

export default function DashboardClient(props: Props) {
  const {
    user, groupsWithBalances, totalGroupExpense, netBalance, totalOwe, totalOwed,
    recentExpenses, categories, monthlyTotal, dailyMap, daysInMonth, maxDaily, currentMonthName,
    debts, owedToMe, pendingOut, pendingIn,
  } = props
  const router = useRouter()
  const barMaxHeight = 80

  const [selectedCurrency, setSelectedCurrency] = useState("BRL")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseFormValues | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [paying, setPaying] = useState<PaymentIntent | null>(null)
  const [paymentSaving, setPaymentSaving] = useState(false)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(exp: Expense) {
    setEditing({
      id: exp.id,
      groupId: exp.group.id,
      title: exp.description,
      originalAmount: exp.originalAmount,
      amount: exp.amount,
      currency: exp.currency,
      paidBy: exp.payer.id,
      categoryId: exp.category?.id ?? null,
      expenseDate: exp.expenseDate,
      splitType: exp.splitType,
      participants: exp.participants.map(p => ({ userId: p.userId, share: p.share, percentage: p.percentage })),
    })
    setFormOpen(true)
  }

  async function handleDelete() {
    if (!deleting) return
    setDeleteSaving(true)
    try {
      const result = await deleteExpense(deleting.id, deleting.group.id)
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

  async function handleMarkPaid() {
    if (!paying) return
    setPaymentSaving(true)
    const formData = new FormData()
    formData.set("groupId", paying.groupId)
    formData.set(paying.mode === "pay" ? "toUserId" : "fromUserId", paying.otherUserId)
    formData.set("amountInCents", String(paying.amount))
    try {
      const result = paying.mode === "pay" ? await registerPayment(formData) : await markPaymentReceived(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(paying.mode === "pay"
          ? `Pagamento marcado. ${paying.otherName} precisa confirmar.`
          : `Recebimento de ${paying.otherName} confirmado.`)
        setPaying(null)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao marcar pagamento")
    } finally {
      setPaymentSaving(false)
    }
  }

  const balanceLabel = netBalance > 0 ? "Você tem a receber" : netBalance < 0 ? "Você deve no total" : "Tudo quitado"

  return (
    <Flex minH="100vh" direction="column" bg="bg.page">
      <AppHeader active="dashboard" userName={user.name} currency={selectedCurrency} onCurrencyChange={setSelectedCurrency} />

      {/* === MAIN CONTENT === */}
      <Box flex={1} maxW="1120px" mx="auto" w="full" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }}>
        {/* Greeting + Add Expense Button */}
        <Flex justify="space-between" align={{ base: "stretch", sm: "flex-end" }} mb={8} gap={4} direction={{ base: "column", sm: "row" }}>
          <Box>
            <Text fontSize="sm" color="fg.muted">Olá, {user.name.split(" ")[0]}</Text>
            <Heading as="h1" size={{ base: "2xl", md: "3xl" }} fontWeight="semibold" letterSpacing="tight" mt={1}>
              Seu panorama financeiro
            </Heading>
          </Box>
          {groupsWithBalances.length > 0 && (
            <Button colorPalette="green" size="md" flexShrink={0} px={5} borderRadius="button" onClick={openCreate}>
              <Icon as={Plus} boxSize={4} />
              Adicionar despesa
            </Button>
          )}
        </Flex>

        {/* Balance summary */}
        <CardRoot borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card" mb={6}>
          <CardBody>
            <Grid templateColumns={{ base: "1fr", md: "1.4fr 1fr 1fr 1fr" }} gap={0}>
              <Box p={{ base: 5, md: 6 }}>
                <Text fontSize="sm" color="fg.muted">Saldo total</Text>
                <Text
                  fontSize={{ base: "3xl", md: "4xl" }} fontWeight="semibold" letterSpacing="tight" lineHeight="1.1" mt={2}
                  color={netBalance > 0 ? "positive" : netBalance < 0 ? "negative" : "fg"}
                >
                  {(netBalance > 0 ? "+" : netBalance < 0 ? "−" : "") + formatCurrencyConverted(Math.round(Math.abs(netBalance)), selectedCurrency)}
                </Text>
                <Text fontSize="sm" color="fg.subtle" mt={1}>{balanceLabel}</Text>
              </Box>
              <SummaryFigure label="A receber" value={formatCurrencyConverted(Math.round(totalOwed), selectedCurrency)} />
              <SummaryFigure label="A pagar" value={formatCurrencyConverted(Math.round(totalOwe), selectedCurrency)} />
              <SummaryFigure label="Gasto do grupo" value={formatCurrencyConverted(totalGroupExpense, selectedCurrency)} />
            </Grid>
          </CardBody>
        </CardRoot>

        {/* Two-column layout */}
        <Grid templateColumns={{ base: "1fr", lg: "1fr 360px" }} gap={6}>
          {/* === LEFT: Atividade Recente === */}
          <CardRoot borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card">
            <CardHeader>
              <Box p={5} pb={0}>
                <CardTitle fontSize="md" fontWeight="semibold">Atividade recente</CardTitle>
              </Box>
            </CardHeader>
            <CardBody>
              <Box p={5} pt={3}>
                {recentExpenses.length === 0 ? (
                  <VStack py={8} gap={3} textAlign="center">
                    <Icon as={Receipt} boxSize={6} color="fg.subtle" strokeWidth={1.5} />
                    <Box>
                      <Text fontWeight="medium">Nenhuma despesa ainda</Text>
                      <Text fontSize="sm" color="fg.muted" mt={1}>
                        {groupsWithBalances.length > 0
                          ? "As despesas dos seus grupos aparecem aqui."
                          : "Crie um grupo para começar a dividir despesas."}
                      </Text>
                    </Box>
                    {groupsWithBalances.length > 0 ? (
                      <Button variant="outline" size="sm" px={4} borderRadius="button" onClick={openCreate}>
                        <Icon as={Plus} boxSize={4} />
                        Adicionar a primeira
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" px={4} borderRadius="button" onClick={() => router.push("/groups/new")}>
                        <Icon as={Plus} boxSize={4} />
                        Criar grupo
                      </Button>
                    )}
                  </VStack>
                ) : (
                  <Stack gap={0}>
                    {recentExpenses.map((exp, i) => {
                      const isPayer = exp.payer.id === user.id
                      const groupInfo = groupsWithBalances.find(g => g.id === exp.group.id)
                      const canEdit = isPayer || Boolean(groupInfo?.isAdmin)
                      const canDelete = Boolean(groupInfo?.isAdmin) ||
                        (isPayer && Date.now() - new Date(exp.createdAt).getTime() <= 24 * 60 * 60 * 1000)
                      const CategoryIcon = getCategoryIcon(exp.category?.name)
                      const firstNameOf = (name: string) => name.split(" ")[0] || "Alguém"
                      const sharers = exp.participants.filter(p => p.share > 0)
                      const equalSplit = sharers.length > 1 && sharers.every(p => Math.abs(p.share - sharers[0].share) <= 1)
                      const money = (cents: number) => formatCurrencyConverted(cents, selectedCurrency)
                      const foreign = exp.currency !== selectedCurrency
                      const expenseInfo = { title: exp.description || "Sem descrição", total: exp.amount, splitCount: sharers.length }
                      // A payment settles the whole debt between two people, so the action lives on their latest expense only.
                      const isLatestWith = (otherId: string) => recentExpenses.findIndex(e =>
                        e.group.id === exp.group.id && (isPayer
                          ? e.payer.id === user.id && e.participants.some(p => p.userId === otherId && p.share > 0)
                          : e.payer.id === otherId && e.participants.some(p => p.userId === user.id && p.share > 0))
                      ) === i

                      // What's still open between me and the other people on this expense.
                      const tasks: SettlementTask[] = []
                      let settled = false
                      if (isPayer) {
                        sharers.filter(p => p.userId !== user.id).forEach(p => {
                          const key = `${exp.group.id}:${p.userId}`
                          const name = firstNameOf(p.name)
                          const pending = pendingIn[key]
                          const outstanding = pending ?? owedToMe[key] ?? 0
                          if (outstanding <= 0) { settled = true; return }
                          if (!isLatestWith(p.userId)) return
                          tasks.push({
                            key: p.userId,
                            text: pending
                              ? <>{name} marcou <Strong>{money(outstanding)}</Strong> como pago</>
                              : <>{name} te deve <Strong color="positive">{money(outstanding)}</Strong></>,
                            pending: Boolean(pending),
                            action: {
                              label: pending ? "Confirmar recebimento" : "Marcar como pago",
                              emphasis: Boolean(pending),
                              onClick: () => setPaying({
                                mode: "receive", groupId: exp.group.id, groupName: exp.group.name,
                                otherUserId: p.userId, otherName: name, amount: outstanding,
                                expense: { ...expenseInfo, share: p.share },
                              }),
                            },
                          })
                        })
                      } else {
                        const mine = sharers.find(p => p.userId === user.id)
                        const key = `${exp.group.id}:${exp.payer.id}`
                        const name = firstNameOf(exp.payer.name || "")
                        const owed = debts[key] ?? 0
                        if (mine && owed <= 0) settled = true
                        if (mine && owed > 0 && isLatestWith(exp.payer.id)) {
                          const waiting = pendingOut.includes(key)
                          tasks.push({
                            key: "me",
                            text: waiting
                              ? <>Aguardando {name} confirmar seu pagamento</>
                              : <>Você deve <Strong color="negative">{money(owed)}</Strong> a {name}</>,
                            pending: waiting,
                            action: waiting ? undefined : {
                              label: "Marcar como pago",
                              emphasis: false,
                              onClick: () => setPaying({
                                mode: "pay", groupId: exp.group.id, groupName: exp.group.name,
                                otherUserId: exp.payer.id, otherName: name, amount: owed,
                                expense: { ...expenseInfo, share: mine.share },
                              }),
                            },
                          })
                        }
                      }
                      const splitLabel = sharers.length < 2
                        ? null
                        : equalSplit
                          ? `${sharers.length} pessoas · ${money(sharers[0].share)} cada`
                          : `dividido entre ${sharers.length} pessoas`

                      return (
                        <Box key={exp.id} py={4} borderTopWidth={i > 0 ? "1px" : 0} borderColor="border.card">
                          <Grid templateColumns="40px minmax(0, 1fr) auto auto" columnGap={3} alignItems="center">
                            <Box
                              w={10} h={10} borderRadius="lg" bg="gray.100"
                              display="flex" alignItems="center" justifyContent="center"
                            >
                              <Icon as={CategoryIcon} boxSize={4} color="fg.muted" strokeWidth={1.75} aria-hidden />
                            </Box>
                            <Box minW={0}>
                              <Text fontSize="sm" fontWeight="medium" truncate>{exp.description || "Sem descrição"}</Text>
                              <HStack gap={1.5} mt={0.5} fontSize="xs" color="fg.muted" minW={0} flexWrap="wrap" rowGap={0.5}>
                                <Text>
                                  {exp.group.name} · {isPayer ? "você pagou" : `${firstNameOf(exp.payer.name || "")} pagou`}
                                  <Text as="span" display={{ base: "none", sm: "inline" }}> · {formatDateShort(exp.expenseDate)}</Text>
                                </Text>
                                {settled && tasks.length === 0 && (
                                  <HStack gap={1} color="positive" flexShrink={0}>
                                    <Icon as={CheckCircle2} boxSize={3.5} aria-hidden />
                                    <Text fontWeight="medium">Quitado</Text>
                                  </HStack>
                                )}
                              </HStack>
                              {splitLabel && (
                                <Text fontSize="xs" color="fg.muted" mt={0.5} display={{ base: "block", sm: "none" }}>
                                  {equalSplit ? `${sharers.length} × ${money(sharers[0].share)}` : splitLabel}
                                </Text>
                              )}
                            </Box>
                            <Box textAlign="right">
                              <Text fontSize="sm" fontWeight="semibold" whiteSpace="nowrap">
                                {foreign ? formatCurrency(exp.originalAmount, exp.currency) : money(exp.amount)}
                              </Text>
                              {foreign ? (
                                <Text fontSize="xs" color="fg.muted" mt={0.5} whiteSpace="nowrap">≈ {money(exp.amount)}</Text>
                              ) : splitLabel && (
                                <Text fontSize="xs" color="fg.muted" mt={0.5} whiteSpace="nowrap" display={{ base: "none", sm: "block" }}>{splitLabel}</Text>
                              )}
                            </Box>
                            <ExpenseMenu
                              title={exp.description || "despesa"}
                              onEdit={canEdit ? () => openEdit(exp) : undefined}
                              onDelete={canDelete ? () => setDeleting(exp) : undefined}
                            />
                          </Grid>

                          {tasks.length > 0 && (
                            <Stack gap={2} mt={3} ml={{ base: 0, sm: "52px" }}>
                              {tasks.map(t => (
                                <Flex
                                  key={t.key}
                                  align="center" justify="space-between" gap={3} wrap="wrap"
                                  bg="gray.50" borderRadius="lg" px={3} py={2} minH={11}
                                >
                                  <HStack gap={2} fontSize="sm" color="fg.muted" minW={0}>
                                    {t.pending && <Icon as={Clock} boxSize={4} flexShrink={0} aria-hidden />}
                                    <Text>{t.text}</Text>
                                  </HStack>
                                  {t.action && (
                                    <Button
                                      size="sm" h={9} px={3} borderRadius="button" flexShrink={0} w={{ base: "full", sm: "auto" }}
                                      colorPalette="green" variant={t.action.emphasis ? "solid" : "outline"}
                                      bg={t.action.emphasis ? undefined : "bg.card"}
                                      onClick={t.action.onClick}
                                    >
                                      <Icon as={Check} boxSize={4} aria-hidden />
                                      {t.action.label}
                                    </Button>
                                  )}
                                </Flex>
                              ))}
                            </Stack>
                          )}
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
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card">
              <CardHeader>
                <Box p={5} pb={0}>
                  <CardTitle fontSize="md" fontWeight="semibold">Acertos</CardTitle>
                </Box>
              </CardHeader>
              <CardBody>
                <Box p={5} pt={3}>
                  {totalOwe === 0 && totalOwed === 0 ? (
                    <HStack py={2} gap={2}>
                      <Icon as={CheckCircle2} boxSize={4} color="positive" />
                      <Text fontSize="sm" color="fg.muted">
                        Todas as dívidas estão quitadas.
                      </Text>
                    </HStack>
                  ) : (
                    <VStack py={4} gap={3}>
                      {totalOwe > 0 && (
                        <HStack w="full" justify="space-between">
                          <Text fontSize="sm" fontWeight="medium" color="fg.muted">A pagar</Text>
                          <Text fontSize="sm" fontWeight="bold" color="negative">
                            {formatCurrencyConverted(Math.round(totalOwe), selectedCurrency)}
                          </Text>
                        </HStack>
                      )}
                      {totalOwed > 0 && (
                        <HStack w="full" justify="space-between">
                          <Text fontSize="sm" fontWeight="medium" color="fg.muted">A receber</Text>
                          <Text fontSize="sm" fontWeight="bold" color="positive">
                            {formatCurrencyConverted(Math.round(totalOwed), selectedCurrency)}
                          </Text>
                        </HStack>
                      )}
                      <Separator w="full" />
                      <HStack w="full" justify="space-between">
                        <Text fontSize="sm" fontWeight="semibold">Saldo líquido</Text>
                        <Text fontSize="sm" fontWeight="bold" color={netBalance >= 0 ? "positive" : "negative"}>
                          {(netBalance >= 0 ? "+" : "−")}{formatCurrencyConverted(Math.round(Math.abs(netBalance)), selectedCurrency)}
                        </Text>
                      </HStack>
                    </VStack>
                  )}
                </Box>
              </CardBody>
            </CardRoot>

            {/* Visão Geral Mensal */}
            <CardRoot borderRadius="card" borderWidth="1px" borderColor="border.card" bg="bg.card">
              <CardHeader>
                <Box p={5} pb={0}>
                  <CardTitle fontSize="md" fontWeight="semibold">Visão geral do mês</CardTitle>
                  <Text fontSize="sm" color="fg.muted" mt={1}>
                    Gasto dos seus grupos{" "}
                    <Text as="span" fontWeight="bold" color="fg">{formatCurrencyConverted(monthlyTotal, selectedCurrency)}</Text>
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
                                borderRadius="sm"
                                bg={isToday ? "green.600" : val > 0 ? "gray.300" : "gray.100"}
                                _hover={{ bg: isToday ? "green.700" : "gray.400" }}
                                transition="background-color 0.15s"
                                cursor="pointer"
                              />
                            </Tooltip.Trigger>
                            <Tooltip.Positioner>
                              <Tooltip.Content px={3} py={2}>
                                <Tooltip.Arrow />
                                <Text fontWeight="bold">{formatCurrencyConverted(val, selectedCurrency)}</Text>
                                <Text fontSize="xs" color="fg.subtle">Dia {day}</Text>
                              </Tooltip.Content>
                            </Tooltip.Positioner>
                          </Tooltip.Root>
                        </Box>
                      )
                    })}
                  </Flex>
                  {/* Chart labels */}
                  <Flex justify="space-between" mt={1}>
                    <Text fontSize="xs" color="fg.subtle">1</Text>
                    <Text fontSize="xs" color="fg.subtle">{currentMonthName}</Text>
                    <Text fontSize="xs" color="fg.subtle">{daysInMonth}</Text>
                  </Flex>
                </Box>
              </CardBody>
            </CardRoot>
          </Stack>
        </Grid>
      </Box>

      <ExpenseFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        groups={groupsWithBalances}
        categories={categories}
        currentUserId={user.id}
        expense={editing}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir despesa?"
        description={deleting
          ? `"${deleting.description || "Sem descrição"}" sai da lista e o saldo de quem dividiu é recalculado.`
          : ""}
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
            {paying && (
              <>
                <Dialog.Title fontSize="lg" fontWeight="semibold">
                  {paying.mode === "pay" ? "Marcar como pago" : `${paying.otherName} já pagou você?`}
                </Dialog.Title>
                <Dialog.Description fontSize="sm" color="fg.muted" mt={2}>
                  {paying.mode === "pay"
                    ? `Pagamento feito por fora do app (Pix, dinheiro, transferência) para ${paying.otherName}.`
                    : `Confirme só se o dinheiro já chegou para você.`}
                </Dialog.Description>

                <Box mt={5} borderRadius="lg" bg="gray.50" borderWidth="1px" borderColor="border.card" px={4} py={3}>
                  <Flex justify="space-between" fontSize="sm" gap={3}>
                    <Text color="fg.muted" truncate>{paying.expense.title}</Text>
                    <Text>{formatCurrency(paying.expense.total)}</Text>
                  </Flex>
                  <Flex justify="space-between" fontSize="sm" gap={3} mt={1.5}>
                    <Text color="fg.muted">
                      {paying.mode === "pay" ? "Sua parte" : `Parte de ${paying.otherName}`}
                      {paying.expense.splitCount > 1 && ` (÷ ${paying.expense.splitCount})`}
                    </Text>
                    <Text>{formatCurrency(paying.expense.share)}</Text>
                  </Flex>
                  <Separator my={3} />
                  <Flex justify="space-between" align="baseline" gap={3}>
                    <Text fontSize="sm" fontWeight="medium">
                      {paying.mode === "pay" ? `Total a pagar a ${paying.otherName}` : `Total a receber de ${paying.otherName}`}
                    </Text>
                    <Text fontSize="2xl" fontWeight="semibold" letterSpacing="tight">{formatCurrency(paying.amount)}</Text>
                  </Flex>
                  {paying.amount !== paying.expense.share && (
                    <Text fontSize="xs" color="fg.subtle" mt={1}>
                      Inclui tudo o que está em aberto entre vocês em {paying.groupName}.
                    </Text>
                  )}
                </Box>

                <Text fontSize="sm" color="fg.subtle" mt={4}>
                  {paying.mode === "pay"
                    ? `${paying.otherName} confere e confirma o recebimento. Até lá, fica como aguardando confirmação.`
                    : "Como é você quem recebe, o saldo de vocês é atualizado na hora."}
                </Text>
              </>
            )}
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

interface SettlementTask {
  key: string
  text: React.ReactNode
  pending: boolean
  action?: { label: string; emphasis: boolean; onClick: () => void }
}

function Strong({ children, color = "fg" }: { children: React.ReactNode; color?: string }) {
  return <Text as="span" fontWeight="semibold" color={color} whiteSpace="nowrap">{children}</Text>
}

function SummaryFigure({ label, value }: { label: string; value: string }) {
  return (
    <Box
      p={{ base: 5, md: 6 }}
      borderTopWidth={{ base: "1px", md: "0" }}
      borderLeftWidth={{ base: "0", md: "1px" }}
      borderColor="border.card"
    >
      <Text fontSize="sm" color="fg.muted">{label}</Text>
      <Text fontSize="xl" fontWeight="medium" letterSpacing="tight" mt={2}>{value}</Text>
    </Box>
  )
}
