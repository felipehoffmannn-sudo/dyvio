"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { calculateSplits, updateLedgerOnCreate, updateLedgerOnDelete, type SplitConfig } from "@/lib/ledger-engine"

async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Error("Não autenticado")
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) throw new Error("Usuário não encontrado")
  return user
}

// ——— EXPENSE ACTIONS ———

export async function createExpense(formData: FormData) {
  const user = await getCurrentUser()

  const groupId = formData.get("groupId") as string
  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const amountStr = formData.get("amount") as string
  const splitType = formData.get("splitType") as string
  const paidBy = formData.get("paidBy") as string
  const expenseDate = formData.get("expenseDate") as string
  const categoryId = formData.get("categoryId") as string
  const participantIds = formData.getAll("participants") as string[]

  const amountInCents = Math.round(parseFloat(amountStr) * 100)

  if (!title || !amountInCents || amountInCents <= 0) {
    return { error: "Título e valor são obrigatórios." }
  }

  if (!groupId || !paidBy) {
    return { error: "Grupo e pagador são obrigatórios." }
  }

  const allParticipantIds = Array.from(new Set([...participantIds, paidBy]))

  // Calculate splits based on type
  let config: SplitConfig

  switch (splitType) {
    case "FIXED":
      config = {
        type: "FIXED",
        participants: allParticipantIds.map(id => ({
          userId: id,
          fixedAmount: Math.round(parseFloat((formData.get(`fixed_${id}`) as string) || "0") * 100),
        })),
      }
      break
    case "PERCENT":
      config = {
        type: "PERCENT",
        participants: allParticipantIds.map(id => ({
          userId: id,
          percentage: parseFloat((formData.get(`pct_${id}`) as string) || "0"),
        })),
      }
      break
    case "SHARES":
      config = {
        type: "SHARES",
        participants: allParticipantIds.map(id => ({
          userId: id,
          shares: parseInt((formData.get(`shares_${id}`) as string) || "1"),
        })),
      }
      break
    default:
      config = {
        type: splitType as SplitConfig["type"],
        participants: allParticipantIds.map(id => ({ userId: id })),
      }
  }

  const splits = calculateSplits(amountInCents, config)

  // Create expense with participants
  const expense = await prisma.expense.create({
    data: {
      groupId,
      title,
      description: description || null,
      amount: amountInCents,
      currency: "BRL",
      splitType: splitType as any,
      categoryId: categoryId || null,
      paidBy,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      participants: {
        create: splits.map(s => ({
          userId: s.userId,
          shareAmount: s.shareAmount,
          sharePercentage: s.sharePercentage || null,
          shares: s.shares || 1,
          weight: s.weight || 1,
          isPayer: s.userId === paidBy,
        })),
      },
    },
  })

  // Update ledger
  await updateLedgerOnCreate(expense.id, groupId, paidBy, splits)

  // Create activity log
  await prisma.activityLog.create({
    data: {
      groupId,
      userId: user.id,
      action: "EXPENSE_CREATED",
      payload: JSON.stringify({ expenseId: expense.id, title, amount: amountInCents }),
    },
  })

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/dashboard")
  redirect(`/groups/${groupId}`)
}

export async function createExpenseFromDashboard(formData: FormData) {
  const user = await getCurrentUser()

  const groupId = formData.get("groupId") as string
  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const amountStr = formData.get("amount") as string
  const splitType = (formData.get("splitType") as string) || "EQUAL"
  const paidBy = (formData.get("paidBy") as string) || user.id
  const expenseDate = (formData.get("expenseDate") as string) || new Date().toISOString().split("T")[0]

  const amountInCents = Math.round(parseFloat(amountStr) * 100)
  if (!title || !amountInCents || amountInCents <= 0) return { error: "Título e valor são obrigatórios." }
  if (!groupId || !paidBy) return { error: "Grupo e pagador são obrigatórios." }

  const participantIds = formData.getAll("participants") as string[]
  const allParticipantIds = Array.from(new Set([...participantIds, paidBy]))

  const categoryId = formData.get("categoryId") as string
  const expenseCurrency = (formData.get("currency") as string) || "BRL"

  const splits = calculateSplits(amountInCents, { type: splitType as any, participants: allParticipantIds.map(id => ({ userId: id })) })

  const expense = await prisma.expense.create({
    data: {
      groupId, title, description: description || null, amount: amountInCents, currency: expenseCurrency,
      splitType: splitType as any, categoryId: categoryId || null, paidBy,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      participants: { create: splits.map(s => ({ userId: s.userId, shareAmount: s.shareAmount, sharePercentage: s.sharePercentage || null, shares: s.shares || 1, weight: s.weight || 1, isPayer: s.userId === paidBy })) },
    },
  })

  await updateLedgerOnCreate(expense.id, groupId, paidBy, splits)
  await prisma.activityLog.create({
    data: { groupId, userId: user.id, action: "EXPENSE_CREATED", payload: JSON.stringify({ expenseId: expense.id, title, amount: amountInCents }) },
  })

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

export async function updateExpense(formData: FormData) {
  const user = await getCurrentUser()

  const expenseId = formData.get("expenseId") as string
  const groupId = formData.get("groupId") as string
  const title = formData.get("title") as string
  const amountStr = formData.get("amount") as string
  const expenseDate = formData.get("expenseDate") as string
  const categoryId = formData.get("categoryId") as string

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { participants: true },
  })
  if (!expense) return { error: "Despesa não encontrada." }
  if (expense.status !== "ACTIVE") return { error: "Despesa já foi removida." }

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: user.id, leftAt: null },
  })
  const isAdmin = membership?.role === "OWNER" || membership?.role === "ADMIN"
  if (!isAdmin && expense.paidBy !== user.id) {
    return { error: "Você não pode editar esta despesa." }
  }

  const amountInCents = amountStr ? Math.round(parseFloat(amountStr) * 100) : Number(expense.amount)
  if (!title?.trim() || amountInCents <= 0) return { error: "Título e valor são obrigatórios." }

  const oldAmount = Number(expense.amount)

  // If amount changed, recalculate splits and update ledger
  if (oldAmount !== amountInCents) {
    const oldSplits = expense.participants.map(p => ({
      userId: p.userId,
      shareAmount: Number(p.shareAmount),
    }))

    // Reverse old ledger entries
    await updateLedgerOnDelete(groupId, expense.paidBy, oldSplits)

    // Calculate new splits (keep same split type and participants)
    const allParticipantIds = expense.participants.map(p => p.userId)
    const newSplits = calculateSplits(amountInCents, {
      type: expense.splitType as any,
      participants: allParticipantIds.map(id => ({ userId: id })),
    })

    // Update expense participants
    for (const s of newSplits) {
      await prisma.expenseParticipant.updateMany({
        where: { expenseId, userId: s.userId },
        data: { shareAmount: s.shareAmount, sharePercentage: s.sharePercentage || null },
      })
    }

    // Create new ledger entries
    await updateLedgerOnCreate(expense.id, groupId, expense.paidBy, newSplits)
  }

  // Update expense fields
  await prisma.expense.update({
    where: { id: expenseId },
    data: {
      title: title.trim(),
      amount: amountInCents,
      expenseDate: expenseDate ? new Date(expenseDate) : undefined,
      categoryId: categoryId || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      groupId,
      userId: user.id,
      action: "EXPENSE_UPDATED",
      payload: JSON.stringify({ expenseId, title: title.trim(), amount: amountInCents }),
    },
  })

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/dashboard")
  return { success: true }
}

export async function registerPayment(formData: FormData) {
  const user = await getCurrentUser()

  const groupId = formData.get("groupId") as string
  const toUserId = formData.get("toUserId") as string
  const amountStr = formData.get("amount") as string
  const amountInCents = Math.round(parseFloat(amountStr) * 100)

  if (!toUserId || !amountInCents || amountInCents <= 0) {
    return { error: "Dados inválidos." }
  }

  await prisma.payment.create({
    data: {
      fromUserId: user.id,
      toUserId,
      groupId,
      amount: amountInCents,
      currency: "BRL",
      method: "MANUAL",
      status: "CONFIRMED",
      paidAt: new Date(),
    },
  })

  // Update ledger: payment reduces the debt
  await prisma.ledgerEntry.upsert({
    where: {
      groupId_userId_counterpartyId: {
        groupId,
        userId: user.id,
        counterpartyId: toUserId,
      },
    },
    create: {
      groupId,
      userId: user.id,
      counterpartyId: toUserId,
      balance: -amountInCents, // Payment reduces what user owes
    },
    update: {
      balance: { decrement: amountInCents },
      calculatedAt: new Date(),
    },
  })

  revalidatePath(`/groups/${groupId}`)
  return { success: true }
}
