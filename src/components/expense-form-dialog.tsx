"use client"

import { useEffect, useState } from "react"
import {
  Box, Button, Dialog, Field, Flex, Grid, HStack, Icon, IconButton, Input, NativeSelect, Stack, Text,
} from "@chakra-ui/react"
import { Check, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { saveExpense } from "@/lib/expense-actions"
import { convertCurrency } from "@/lib/currency"
import { formatCurrency, toDateInputValue } from "@/lib/utils"

export interface ExpenseFormGroup { id: string; name: string; members: { id: string; name: string }[] }
export interface ExpenseFormCategory { id: string; name: string }
export interface ExpenseFormValues {
  id: string
  groupId: string
  title: string
  /** Cents in `currency`, as the user typed it. */
  originalAmount: number
  /** Cents in BRL. */
  amount: number
  currency: string
  paidBy: string
  categoryId: string | null
  expenseDate: string
  splitType: string
  /** `share` is in BRL cents. */
  participants: { userId: string; share: number; percentage: number | null }[]
}

type SplitType = "EQUAL" | "FIXED" | "PERCENT"
const SPLIT_OPTIONS: { value: SplitType; label: string }[] = [
  { value: "EQUAL", label: "Igual" },
  { value: "FIXED", label: "Por valor" },
  { value: "PERCENT", label: "Por %" },
]
const CURRENCIES = [
  { code: "BRL", label: "R$ · BRL" },
  { code: "USD", label: "US$ · USD" },
  { code: "EUR", label: "€ · EUR" },
]

const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",")
const parseCents = (value: string | undefined) => {
  const n = parseFloat((value ?? "").replace(",", "."))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}
const parsePct = (value: string | undefined) => {
  const n = parseFloat((value ?? "").replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

/** Splits `total` evenly, giving the leftover cents to the last person (same rule as the server). */
function evenSplit(total: number, count: number): number[] {
  if (count === 0) return []
  const base = Math.floor(total / count)
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? total - base * (count - 1) : base))
}

interface ExpenseFormDialogProps {
  open: boolean
  onClose: () => void
  groups: ExpenseFormGroup[]
  categories: ExpenseFormCategory[]
  currentUserId: string
  /** Present when editing. */
  expense?: ExpenseFormValues | null
  defaultGroupId?: string
}

export function ExpenseFormDialog({
  open, onClose, groups, categories, currentUserId, expense, defaultGroupId,
}: ExpenseFormDialogProps) {
  const router = useRouter()
  const isEdit = Boolean(expense)

  const [groupId, setGroupId] = useState("")
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("BRL")
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [date, setDate] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [splitType, setSplitType] = useState<SplitType>("EQUAL")
  const [participants, setParticipants] = useState<Set<string>>(new Set())
  const [fixed, setFixed] = useState<Record<string, string>>({})
  const [pct, setPct] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (expense) {
      const ratio = expense.amount > 0 ? expense.originalAmount / expense.amount : 1
      const fixedValues: Record<string, string> = {}
      const pctValues: Record<string, string> = {}
      expense.participants.forEach(p => {
        fixedValues[p.userId] = centsToInput(Math.round(p.share * ratio))
        pctValues[p.userId] = p.percentage != null ? String(p.percentage).replace(".", ",") : ""
      })
      setGroupId(expense.groupId)
      setTitle(expense.title)
      setAmount(centsToInput(expense.originalAmount))
      setCurrency(expense.currency)
      setPaidBy(expense.paidBy)
      setDate(toDateInputValue(expense.expenseDate))
      setCategoryId(expense.categoryId ?? "")
      setSplitType((["EQUAL", "FIXED", "PERCENT"].includes(expense.splitType) ? expense.splitType : "EQUAL") as SplitType)
      setParticipants(new Set(expense.participants.map(p => p.userId)))
      setFixed(fixedValues)
      setPct(pctValues)
    } else {
      const g = groups.find(gr => gr.id === defaultGroupId) ?? groups[0]
      setGroupId(g?.id ?? "")
      setTitle("")
      setAmount("")
      setCurrency("BRL")
      setPaidBy(currentUserId)
      setDate(toDateInputValue())
      setCategoryId("")
      setSplitType("EQUAL")
      setParticipants(new Set(g?.members.map(m => m.id) ?? []))
      setFixed({})
      setPct({})
    }
    // Reset only when the dialog opens; parents re-create `groups`/`expense` on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id])

  const group = groups.find(g => g.id === groupId)
  const members = group?.members ?? []
  const nameOf = (id: string) => id === currentUserId ? "Você" : members.find(m => m.id === id)?.name.split(" ")[0] || "Alguém"
  const selected = members.filter(m => participants.has(m.id))
  const total = parseCents(amount)
  const money = (cents: number) => formatCurrency(cents, currency)

  const shares: number[] = splitType === "FIXED"
    ? selected.map(m => parseCents(fixed[m.id]))
    : splitType === "PERCENT"
      ? selected.map(m => Math.round((total * parsePct(pct[m.id])) / 100))
      : evenSplit(total, selected.length)
  const fixedGap = total - shares.reduce((a, b) => a + b, 0)
  const pctGap = 100 - selected.reduce((acc, m) => acc + parsePct(pct[m.id]), 0)

  let problem: string | null = null
  if (selected.length === 0) problem = "Escolha quem divide a despesa."
  else if (total > 0 && splitType === "FIXED" && fixedGap !== 0) {
    problem = fixedGap > 0 ? `Faltam ${money(fixedGap)} para fechar o total.` : `Passou ${money(-fixedGap)} do total.`
  } else if (splitType === "PERCENT" && Math.abs(pctGap) > 0.01) {
    const gap = Math.round(Math.abs(pctGap) * 100) / 100
    problem = pctGap > 0 ? `Faltam ${gap}% para fechar 100%.` : `Passou ${gap}% de 100%.`
  }

  function changeGroup(id: string) {
    const g = groups.find(gr => gr.id === id)
    setGroupId(id)
    setParticipants(new Set(g?.members.map(m => m.id) ?? []))
    if (!g?.members.some(m => m.id === paidBy)) setPaidBy(currentUserId)
  }

  function toggleParticipant(id: string) {
    const next = new Set(participants)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setParticipants(next)
  }

  function changeSplitType(type: SplitType) {
    const ids = selected.map(m => m.id)
    if (type === "FIXED" && ids.every(id => !fixed[id])) {
      const even = evenSplit(total, ids.length)
      setFixed(Object.fromEntries(ids.map((id, i) => [id, centsToInput(even[i])])))
    }
    if (type === "PERCENT" && ids.every(id => !pct[id])) {
      const even = evenSplit(10000, ids.length)
      setPct(Object.fromEntries(ids.map((id, i) => [id, String(even[i] / 100).replace(".", ",")])))
    }
    setSplitType(type)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (problem) return
    setSaving(true)
    const formData = new FormData()
    if (expense) formData.set("expenseId", expense.id)
    formData.set("groupId", groupId)
    formData.set("title", title)
    formData.set("amount", amount)
    formData.set("currency", currency)
    formData.set("paidBy", paidBy)
    formData.set("expenseDate", date)
    formData.set("splitType", splitType)
    if (categoryId) formData.set("categoryId", categoryId)
    selected.forEach(m => {
      formData.append("participants", m.id)
      if (splitType === "FIXED") formData.set(`fixed_${m.id}`, fixed[m.id] ?? "0")
      if (splitType === "PERCENT") formData.set(`pct_${m.id}`, pct[m.id] ?? "0")
    })
    try {
      const result = await saveExpense(formData)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(isEdit ? "Despesa atualizada" : "Despesa adicionada")
      onClose()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Não foi possível salvar a despesa")
    } finally {
      setSaving(false)
    }
  }

  const inputProps = {
    size: "lg" as const, px: "4", bg: "bg.card", borderWidth: "1px", borderColor: "border",
    _focus: { borderColor: "brand.500", boxShadow: "none" },
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => { if (!e.open && !saving) onClose() }}>
      <Dialog.Backdrop bg="blackAlpha.600" />
      <Dialog.Positioner alignItems="center" px={{ base: 2, md: 0 }}>
        <Dialog.Content bg="bg.panel" borderRadius="card" maxW={{ base: "100%", md: "520px" }} maxH="90vh" display="flex" flexDirection="column">
          <Flex align="center" justify="space-between" px={6} pt={5} pb={3}>
            <Dialog.Title fontSize="lg" fontWeight="semibold">{isEdit ? "Editar despesa" : "Nova despesa"}</Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <IconButton aria-label="Fechar" variant="ghost" size="sm" borderRadius="full" mr={-2} disabled={saving}>
                <Icon as={X} boxSize={5} />
              </IconButton>
            </Dialog.CloseTrigger>
          </Flex>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Stack gap={4} px={6} pb={4} overflowY="auto">
              {!isEdit && groups.length > 1 && (
                <Field.Root>
                  <Field.Label color="fg.muted">Grupo</Field.Label>
                  <NativeSelect.Root size="lg">
                    <NativeSelect.Field ps="4" pe="10" bg="bg.card" value={groupId} onChange={e => changeGroup(e.target.value)}>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>
              )}

              <Field.Root required>
                <Field.Label color="fg.muted">Descrição</Field.Label>
                <Input {...inputProps} value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: Mercado, Conta de luz" autoFocus={!isEdit} />
              </Field.Root>

              <Field.Root required>
                <Field.Label color="fg.muted">Valor</Field.Label>
                <Grid templateColumns="128px 1fr" gap={2} w="full">
                  <NativeSelect.Root size="lg">
                    <NativeSelect.Field ps="4" pe="8" bg="bg.card" aria-label="Moeda" value={currency} onChange={e => setCurrency(e.target.value)}>
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                  <Input {...inputProps} type="text" inputMode="decimal" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} />
                </Grid>
                {currency !== "BRL" && total > 0 && (
                  <Field.HelperText color="fg.muted">
                    ≈ {formatCurrency(convertCurrency(total, currency, "BRL"))} no saldo, pela cotação aproximada do app.
                  </Field.HelperText>
                )}
              </Field.Root>

              <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={4}>
                <Field.Root>
                  <Field.Label color="fg.muted">Pago por</Field.Label>
                  <NativeSelect.Root size="lg">
                    <NativeSelect.Field ps="4" pe="10" bg="bg.card" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                      {members.map(m => <option key={m.id} value={m.id}>{nameOf(m.id)}</option>)}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label color="fg.muted">Data</Field.Label>
                  <Input {...inputProps} type="date" value={date} onChange={e => setDate(e.target.value)} />
                </Field.Root>
              </Grid>

              <Field.Root>
                <Field.Label color="fg.muted">Categoria</Field.Label>
                <NativeSelect.Root size="lg">
                  <NativeSelect.Field ps="4" pe="10" bg="bg.card" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                    <option value="">Sem categoria</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>

              <Box>
                <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={2} id="split-with-label">Dividir entre</Text>
                <Flex flexWrap="wrap" gap={2} role="group" aria-labelledby="split-with-label">
                  {members.map(m => {
                    const on = participants.has(m.id)
                    return (
                      <Button
                        key={m.id} type="button" size="sm" h={9} px={3} borderRadius="full"
                        variant="outline" aria-pressed={on} onClick={() => toggleParticipant(m.id)}
                        borderColor={on ? "brand.500" : "border"} bg={on ? "brand.50" : "bg.card"}
                        color={on ? "brand.700" : "fg.muted"} fontWeight={on ? "medium" : "normal"}
                      >
                        {on && <Icon as={Check} boxSize={3.5} aria-hidden />}
                        {nameOf(m.id)}
                      </Button>
                    )
                  })}
                </Flex>
              </Box>

              {selected.length > 0 && (
                <Box borderRadius="lg" borderWidth="1px" borderColor="border.card" bg="bg.card">
                  <HStack gap={1} p={1} borderBottomWidth="1px" borderColor="border.card" role="group" aria-label="Como dividir">
                    {SPLIT_OPTIONS.map(opt => (
                      <Button
                        key={opt.value} type="button" flex={1} size="sm" h={8} borderRadius="md"
                        variant="ghost" aria-pressed={splitType === opt.value} onClick={() => changeSplitType(opt.value)}
                        bg={splitType === opt.value ? "gray.100" : "transparent"}
                        color={splitType === opt.value ? "fg" : "fg.muted"}
                        fontWeight={splitType === opt.value ? "semibold" : "normal"}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </HStack>
                  <Stack gap={0} px={4} py={1}>
                    {selected.map((m, i) => (
                      <Flex key={m.id} align="center" justify="space-between" gap={3} py={2} borderTopWidth={i > 0 ? "1px" : 0} borderColor="border.card" minH={12}>
                        <Text fontSize="sm">{nameOf(m.id)}{m.id === paidBy && <Text as="span" color="fg.muted"> · pagou</Text>}</Text>
                        {splitType === "EQUAL" && <Text fontSize="sm" fontWeight="medium">{money(shares[i])}</Text>}
                        {splitType === "FIXED" && (
                          <Input
                            size="sm" w="120px" textAlign="right" px={3} bg="bg.panel" inputMode="decimal"
                            aria-label={`Valor de ${nameOf(m.id)}`} placeholder="0,00"
                            value={fixed[m.id] ?? ""} onChange={e => setFixed({ ...fixed, [m.id]: e.target.value })}
                          />
                        )}
                        {splitType === "PERCENT" && (
                          <HStack gap={3}>
                            <Text fontSize="sm" color="fg.muted">{money(shares[i])}</Text>
                            <HStack gap={1}>
                              <Input
                                size="sm" w="72px" textAlign="right" px={3} bg="bg.panel" inputMode="decimal"
                                aria-label={`Porcentagem de ${nameOf(m.id)}`} placeholder="0"
                                value={pct[m.id] ?? ""} onChange={e => setPct({ ...pct, [m.id]: e.target.value })}
                              />
                              <Text fontSize="sm" color="fg.muted">%</Text>
                            </HStack>
                          </HStack>
                        )}
                      </Flex>
                    ))}
                  </Stack>
                </Box>
              )}
              {problem && <Text fontSize="sm" color="negative" role="status">{problem}</Text>}
            </Stack>

            <Flex gap={2} px={6} py={4} borderTopWidth="1px" borderColor="border.card" justify="flex-end">
              <Button type="button" variant="ghost" borderRadius="button" size="lg" px={5} disabled={saving} onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" colorPalette="green" borderRadius="button" size="lg" px={6} loading={saving} disabled={Boolean(problem) || !title.trim() || total <= 0}>
                {isEdit ? "Salvar alterações" : "Adicionar despesa"}
              </Button>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
