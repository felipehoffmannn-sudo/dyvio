"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { calculateSplits, updateLedgerOnCreate, updateLedgerOnDelete, type SplitConfig, type SplitResult } from "@/lib/ledger-engine"
import { convertCurrency, EXCHANGE_RATES } from "@/lib/currency"
import { formatCurrency, parseDateInput } from "@/lib/utils"

async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Error("Não autenticado")
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) throw new Error("Usuário não encontrado")
  return user
}

function parseMoney(value: FormDataEntryValue | null): number {
  const n = parseFloat(String(value ?? "").replace(",", "."))
  return Number.isFinite(n) ? Math.round(n * 100) : 0
}

/** Rescales splits computed in the original currency to BRL, keeping the exact total. */
function scaleSplits(splits: SplitResult, fromTotal: number, toTotal: number): SplitResult {
  if (fromTotal === toTotal) return splits
  let distributed = 0
  return splits.map((s, i) => {
    const shareAmount = i === splits.length - 1
      ? toTotal - distributed
      : Math.round((s.shareAmount * toTotal) / fromTotal)
    distributed += shareAmount
    return { ...s, shareAmount }
  })
}

// ——— EXPENSE ACTIONS ———

const SPLIT_TYPES = ["EQUAL", "FIXED", "PERCENT"] as const

/** Creates or (with `expenseId`) updates an expense. Never throws on bad input. */
export async function saveExpense(formData: FormData): Promise<{ success: true } | { error: string }> {
  const user = await getCurrentUser()

  const expenseId = (formData.get("expenseId") as string) || null
  const groupId = formData.get("groupId") as string
  const title = ((formData.get("title") as string) || "").trim()
  const currency = (formData.get("currency") as string) || "BRL"
  const paidBy = (formData.get("paidBy") as string) || user.id
  const categoryId = (formData.get("categoryId") as string) || null
  const splitType = (formData.get("splitType") as string) || "EQUAL"
  const participantIds = Array.from(new Set(formData.getAll("participants") as string[]))
  const originalAmount = parseMoney(formData.get("amount"))

  if (!groupId) return { error: "Escolha um grupo." }
  if (!title) return { error: "Dê um nome para a despesa." }
  if (originalAmount <= 0) return { error: "Informe um valor maior que zero." }
  if (!(currency in EXCHANGE_RATES)) return { error: "Moeda não suportada." }
  if (!SPLIT_TYPES.includes(splitType as (typeof SPLIT_TYPES)[number])) return { error: "Tipo de divisão inválido." }
  if (participantIds.length === 0) return { error: "Escolha quem divide a despesa." }

  const members = await prisma.groupMember.findMany({
    where: { groupId, leftAt: null },
    select: { userId: true, role: true },
  })
  const memberIds = new Set(members.map(m => m.userId))
  const membership = members.find(m => m.userId === user.id)
  if (!membership) return { error: "Você não faz parte deste grupo." }
  if (!memberIds.has(paidBy) || participantIds.some(id => !memberIds.has(id))) {
    return { error: "Quem pagou e quem divide precisam ser membros do grupo." }
  }

  let config: SplitConfig
  if (splitType === "FIXED") {
    const parts = participantIds.map(id => ({ userId: id, fixedAmount: parseMoney(formData.get(`fixed_${id}`)) }))
    const sum = parts.reduce((acc, p) => acc + p.fixedAmount, 0)
    if (sum !== originalAmount) {
      return { error: `Os valores somam ${formatCurrency(sum, currency)}, mas o total é ${formatCurrency(originalAmount, currency)}.` }
    }
    config = { type: "FIXED", participants: parts }
  } else if (splitType === "PERCENT") {
    const parts = participantIds.map(id => ({
      userId: id,
      percentage: parseFloat(String(formData.get(`pct_${id}`) ?? "0").replace(",", ".")) || 0,
    }))
    const sum = parts.reduce((acc, p) => acc + p.percentage, 0)
    if (Math.abs(sum - 100) > 0.01) return { error: `As porcentagens somam ${sum}%, precisam somar 100%.` }
    config = { type: "PERCENT", participants: parts }
  } else {
    config = { type: "EQUAL", participants: participantIds.map(id => ({ userId: id })) }
  }

  const amount = convertCurrency(originalAmount, currency, "BRL")
  const splits = scaleSplits(calculateSplits(originalAmount, config), originalAmount, amount)
  const participantRows = splits.map(s => ({
    userId: s.userId,
    shareAmount: s.shareAmount,
    sharePercentage: s.sharePercentage ?? null,
    shares: 1,
    weight: 1,
    isPayer: s.userId === paidBy,
  }))

  const fields = {
    title,
    amount,
    currency,
    originalAmount,
    splitType,
    categoryId,
    paidBy,
    expenseDate: parseDateInput(formData.get("expenseDate") as string),
  }

  if (expenseId) {
    const expense = await prisma.expense.findUnique({ where: { id: expenseId }, include: { participants: true } })
    if (!expense || expense.groupId !== groupId) return { error: "Despesa não encontrada." }
    if (expense.status !== "ACTIVE") return { error: "Esta despesa já foi removida." }
    const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN"
    if (!isAdmin && expense.paidBy !== user.id) return { error: "Só quem pagou pode editar esta despesa." }

    await updateLedgerOnDelete(
      groupId,
      expense.paidBy,
      expense.participants.map(p => ({ userId: p.userId, shareAmount: Number(p.shareAmount) })),
    )
    await prisma.$transaction([
      prisma.expenseParticipant.deleteMany({ where: { expenseId } }),
      prisma.expense.update({
        where: { id: expenseId },
        data: { ...fields, participants: { create: participantRows } },
      }),
    ])
    await updateLedgerOnCreate(expenseId, groupId, paidBy, splits)
    await prisma.activityLog.create({
      data: {
        groupId,
        userId: user.id,
        action: "EXPENSE_UPDATED",
        payload: JSON.stringify({ expenseId, title, amount, currency, originalAmount, splitType, paidBy, participants: participantIds }),
      },
    })
  } else {
    const expense = await prisma.expense.create({
      data: { groupId, ...fields, participants: { create: participantRows } },
    })
    await updateLedgerOnCreate(expense.id, groupId, paidBy, splits)
    await prisma.activityLog.create({
      data: {
        groupId,
        userId: user.id,
        action: "EXPENSE_CREATED",
        payload: JSON.stringify({ expenseId: expense.id, title, amount, currency, originalAmount }),
      },
    })
  }

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/dashboard")
  return { success: true }
}

export async function deleteExpense(expenseId: string, groupId: string) {
  const user = await getCurrentUser()

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { participants: true },
  })

  if (!expense) return { error: "Despesa não encontrada." }
  if (expense.status !== "ACTIVE") return { error: "Despesa já foi removida." }

  // Check 24h window or admin role
  const hoursSinceCreation = (Date.now() - expense.createdAt.getTime()) / (1000 * 60 * 60)
  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: user.id, leftAt: null },
  })

  const isAdmin = membership?.role === "OWNER" || membership?.role === "ADMIN"
  const isWithin24h = hoursSinceCreation <= 24

  if (!isAdmin && (!isWithin24h || expense.paidBy !== user.id)) {
    return { error: "Você não pode deletar esta despesa." }
  }

  // Reverse ledger entries
  const splits = expense.participants.map(p => ({
    userId: p.userId,
    shareAmount: Number(p.shareAmount),
  }))
  await updateLedgerOnDelete(groupId, expense.paidBy, splits)

  // Soft delete
  await prisma.expense.update({
    where: { id: expenseId },
    data: { status: "DELETED", deletedAt: new Date() },
  })

  // Activity log
  await prisma.activityLog.create({
    data: {
      groupId,
      userId: user.id,
      action: "EXPENSE_DELETED",
      payload: JSON.stringify({ expenseId, title: expense.title }),
    },
  })

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/dashboard")
  return { success: true }
}

// ——— PAYMENT ACTIONS ———

export async function registerPayment(formData: FormData) {
  const user = await getCurrentUser()

  const groupId = formData.get("groupId") as string
  const toUserId = formData.get("toUserId") as string
  const amountInCents = Math.round(Number(formData.get("amountInCents")))

  if (!groupId || !toUserId || toUserId === user.id || !Number.isFinite(amountInCents) || amountInCents <= 0) {
    return { error: "Dados inválidos." }
  }

  const activeMembers = await prisma.groupMember.count({
    where: { groupId, leftAt: null, userId: { in: [user.id, toUserId] } },
  })
  if (activeMembers !== 2) return { error: "Vocês precisam ser membros do grupo." }

  const alreadyPending = await prisma.payment.count({
    where: { groupId, fromUserId: user.id, toUserId, status: "PENDING" },
  })
  if (alreadyPending > 0) return { error: "Já existe um pagamento aguardando confirmação." }

  const debt = await prisma.ledgerEntry.findUnique({
    where: { groupId_userId_counterpartyId: { groupId, userId: user.id, counterpartyId: toUserId } },
  })
  if (!debt || Math.round(debt.balance) < amountInCents) {
    return { error: "O valor é maior do que a dívida atual." }
  }

  // The balance only moves when the receiver confirms (confirmPayment).
  await prisma.payment.create({
    data: {
      fromUserId: user.id,
      toUserId,
      groupId,
      amount: amountInCents,
      currency: "BRL",
      method: "MANUAL",
      status: "PENDING",
      paidAt: new Date(),
    },
  })

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/dashboard")
  return { success: true }
}

export async function confirmPayment(paymentId: string) {
  const user = await getCurrentUser()

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || !payment.groupId || payment.toUserId !== user.id) {
    return { error: "Só quem recebe pode confirmar este pagamento." }
  }
  if (payment.status !== "PENDING") return { error: "Este pagamento já foi resolvido." }

  const { groupId, fromUserId, toUserId } = payment
  const amount = payment.amount

  const confirmed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: { status: "CONFIRMED" },
    })
    if (count === 0) return false

    // The ledger keeps both directions of each pair; a payment must move both.
    await tx.ledgerEntry.upsert({
      where: { groupId_userId_counterpartyId: { groupId, userId: fromUserId, counterpartyId: toUserId } },
      create: { groupId, userId: fromUserId, counterpartyId: toUserId, balance: -amount },
      update: { balance: { decrement: amount }, calculatedAt: new Date() },
    })
    await tx.ledgerEntry.upsert({
      where: { groupId_userId_counterpartyId: { groupId, userId: toUserId, counterpartyId: fromUserId } },
      create: { groupId, userId: toUserId, counterpartyId: fromUserId, balance: amount },
      update: { balance: { increment: amount }, calculatedAt: new Date() },
    })
    return true
  })
  if (!confirmed) return { error: "Este pagamento já foi resolvido." }

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/dashboard")
  return { success: true }
}

/** The receiver records a payment they already got, so it is confirmed on the spot. */
export async function markPaymentReceived(formData: FormData) {
  const user = await getCurrentUser()

  const groupId = formData.get("groupId") as string
  const fromUserId = formData.get("fromUserId") as string
  const amountInCents = Math.round(Number(formData.get("amountInCents")))

  if (!groupId || !fromUserId || fromUserId === user.id || !Number.isFinite(amountInCents) || amountInCents <= 0) {
    return { error: "Dados inválidos." }
  }

  const activeMembers = await prisma.groupMember.count({
    where: { groupId, leftAt: null, userId: { in: [user.id, fromUserId] } },
  })
  if (activeMembers !== 2) return { error: "Vocês precisam ser membros do grupo." }

  const pending = await prisma.payment.findFirst({
    where: { groupId, fromUserId, toUserId: user.id, status: "PENDING" },
  })
  if (pending) return confirmPayment(pending.id)

  const debt = await prisma.ledgerEntry.findUnique({
    where: { groupId_userId_counterpartyId: { groupId, userId: fromUserId, counterpartyId: user.id } },
  })
  if (!debt || Math.round(debt.balance) < amountInCents) {
    return { error: "O valor é maior do que a dívida atual." }
  }

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        fromUserId,
        toUserId: user.id,
        groupId,
        amount: amountInCents,
        currency: "BRL",
        method: "MANUAL",
        status: "CONFIRMED",
        paidAt: new Date(),
      },
    }),
    prisma.ledgerEntry.upsert({
      where: { groupId_userId_counterpartyId: { groupId, userId: fromUserId, counterpartyId: user.id } },
      create: { groupId, userId: fromUserId, counterpartyId: user.id, balance: -amountInCents },
      update: { balance: { decrement: amountInCents }, calculatedAt: new Date() },
    }),
    prisma.ledgerEntry.upsert({
      where: { groupId_userId_counterpartyId: { groupId, userId: user.id, counterpartyId: fromUserId } },
      create: { groupId, userId: user.id, counterpartyId: fromUserId, balance: amountInCents },
      update: { balance: { increment: amountInCents }, calculatedAt: new Date() },
    }),
  ])

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/dashboard")
  return { success: true }
}

export async function rejectPayment(paymentId: string) {
  const user = await getCurrentUser()

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || !payment.groupId || payment.toUserId !== user.id) {
    return { error: "Só quem recebe pode recusar este pagamento." }
  }

  const { count } = await prisma.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "REJECTED" },
  })
  if (count === 0) return { error: "Este pagamento já foi resolvido." }

  revalidatePath(`/groups/${payment.groupId}`)
  revalidatePath("/dashboard")
  return { success: true }
}
