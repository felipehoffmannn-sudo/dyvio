/**
 * LEIAUTE LEDGER ENGINE
 * 
 * Core financial engine responsible for:
 * - Calculating expense splits
 * - Updating balances between users
 * - Reversing expenses
 * - Debt simplification
 * - Balance auditing
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// ——— TYPES ———

export type SplitConfig = {
  type: "EQUAL" | "FIXED" | "PERCENT" | "SHARES" | "ITEMIZED" | "WEIGHT"
  participants: {
    userId: string
    fixedAmount?: number       // in cents, for FIXED
    percentage?: number        // 0-100, for PERCENT
    shares?: number            // for SHARES
    weight?: number            // for WEIGHT
    items?: { name: string; amount: number; quantity: number }[] // for ITEMIZED
  }[]
}

export type SplitResult = {
  userId: string
  shareAmount: number   // in cents
  sharePercentage?: number
  shares?: number
  weight?: number
}[]

// ——— SPLIT CALCULATORS ———

export function calculateSplits(
  totalAmountInCents: number,
  config: SplitConfig
): SplitResult {
  switch (config.type) {
    case "EQUAL":
      return calculateEqualSplit(totalAmountInCents, config.participants)
    case "FIXED":
      return calculateFixedSplit(totalAmountInCents, config.participants)
    case "PERCENT":
      return calculatePercentSplit(totalAmountInCents, config.participants)
    case "SHARES":
      return calculateSharesSplit(totalAmountInCents, config.participants)
    case "WEIGHT":
      return calculateWeightSplit(totalAmountInCents, config.participants)
    case "ITEMIZED":
      return calculateItemizedSplit(config.participants as ItemizedParticipant[])
    default:
      throw new Error(`Unknown split type: ${config.type}`)
  }
}

function calculateEqualSplit(totalCents: number, participants: SplitConfig["participants"]): SplitResult {
  const count = participants.length
  if (count === 0) return []

  // Base share: truncate to cent
  const baseShare = Math.floor(totalCents / count)
  // Remainder goes to last participant
  const remainder = totalCents - baseShare * count

  return participants.map((p, i) => ({
    userId: p.userId,
    shareAmount: i === count - 1 ? baseShare + remainder : baseShare,
  }))
}

function calculateFixedSplit(totalCents: number, participants: SplitConfig["participants"]): SplitResult {
  const sum = participants.reduce((acc, p) => acc + (p.fixedAmount || 0), 0)
  if (sum !== totalCents) {
    throw new Error(`Fixed split sum (${sum}) does not match total (${totalCents})`)
  }
  return participants.map(p => ({
    userId: p.userId,
    shareAmount: p.fixedAmount || 0,
  }))
}

function calculatePercentSplit(totalCents: number, participants: SplitConfig["participants"]): SplitResult {
  const totalPct = participants.reduce((acc, p) => acc + (p.percentage || 0), 0)
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error(`Percentages sum to ${totalPct}%, must be 100%`)
  }
  return participants.map(p => ({
    userId: p.userId,
    shareAmount: Math.round(totalCents * (p.percentage || 0) / 100),
    sharePercentage: p.percentage,
  }))
}

function calculateSharesSplit(totalCents: number, participants: SplitConfig["participants"]): SplitResult {
  const totalShares = participants.reduce((acc, p) => acc + (p.shares || 1), 0)
  const valuePerShare = totalCents / totalShares

  let distributed = 0
  const results = participants.map((p, i) => {
    const share = Math.floor(valuePerShare * (p.shares || 1))
    distributed += share
    return { userId: p.userId, shareAmount: share, shares: p.shares }
  })

  // Distribute rounding remainder
  let remainder = totalCents - distributed
  let idx = results.length - 1
  while (remainder > 0 && idx >= 0) {
    results[idx].shareAmount += 1
    remainder -= 1
    idx -= 1
  }

  return results
}

function calculateWeightSplit(totalCents: number, participants: SplitConfig["participants"]): SplitResult {
  const totalWeight = participants.reduce((acc, p) => acc + (p.weight || 1), 0)
  const valuePerWeight = totalCents / totalWeight

  let distributed = 0
  const results = participants.map((p, i) => {
    const share = Math.floor(valuePerWeight * (p.weight || 1))
    distributed += share
    return { userId: p.userId, shareAmount: share, weight: p.weight }
  })

  let remainder = totalCents - distributed
  let idx = results.length - 1
  while (remainder > 0 && idx >= 0) {
    results[idx].shareAmount += 1
    remainder -= 1
    idx -= 1
  }

  return results
}

type ItemizedParticipant = SplitConfig["participants"][number] & {
  items: { name: string; amount: number; quantity: number }[]
}

function calculateItemizedSplit(participants: ItemizedParticipant[]): SplitResult {
  // For each item, divide its amount among participants who share it
  // First, group items by name to find shared items
  const itemMap = new Map<string, { totalAmount: number; userIds: Set<string> }>()

  for (const p of participants) {
    for (const item of p.items || []) {
      const key = item.name
      if (!itemMap.has(key)) {
        itemMap.set(key, { totalAmount: item.amount, userIds: new Set() })
      }
      itemMap.get(key)!.userIds.add(p.userId)
    }
  }

  // Calculate each participant's share
  const userTotals = new Map<string, number>()
  for (const [itemName, itemData] of Array.from(itemMap.entries())) {
    const sharePerUser = Math.floor(itemData.totalAmount / itemData.userIds.size)
    const remainder = itemData.totalAmount - sharePerUser * itemData.userIds.size

    let i = 0
    for (const userId of Array.from(itemData.userIds)) {
      const current = userTotals.get(userId) || 0
      userTotals.set(userId, current + sharePerUser + (i === 0 ? remainder : 0))
      i++
    }
  }

  return Array.from(userTotals.entries()).map(([userId, shareAmount]) => ({
    userId,
    shareAmount,
  }))
}

// ——— LEDGER OPERATIONS ———

/**
 * Update ledger balances when an expense is created.
 * Each participant (except payer) owes their share to the payer.
 */
export async function updateLedgerOnCreate(
  expenseId: string,
  groupId: string,
  payerId: string,
  splits: SplitResult
) {
  const operations: Prisma.PrismaPromise<any>[] = []

  for (const split of splits) {
    if (split.userId === payerId) continue

    const amount = split.shareAmount

    // Participant owes money to payer
    operations.push(
      prisma.ledgerEntry.upsert({
        where: {
          groupId_userId_counterpartyId: {
            groupId,
            userId: split.userId,
            counterpartyId: payerId,
          },
        },
        create: {
          groupId,
          userId: split.userId,
          counterpartyId: payerId,
          balance: amount, // positive = owes
        },
        update: {
          balance: { increment: amount },
          calculatedAt: new Date(),
        },
      })
    )

    // Payer is owed by participant (inverse)
    operations.push(
      prisma.ledgerEntry.upsert({
        where: {
          groupId_userId_counterpartyId: {
            groupId,
            userId: payerId,
            counterpartyId: split.userId,
          },
        },
        create: {
          groupId,
          userId: payerId,
          counterpartyId: split.userId,
          balance: -amount, // negative = is owed
        },
        update: {
          balance: { decrement: amount },
          calculatedAt: new Date(),
        },
      })
    )
  }

  await prisma.$transaction(operations)
}

/**
 * Reverse a deleted expense — invert all its ledger entries.
 */
export async function updateLedgerOnDelete(
  groupId: string,
  payerId: string,
  splits: SplitResult
) {
  const operations: Prisma.PrismaPromise<any>[] = []

  for (const split of splits) {
    if (split.userId === payerId) continue

    const amount = split.shareAmount

    operations.push(
      prisma.ledgerEntry.upsert({
        where: {
          groupId_userId_counterpartyId: {
            groupId,
            userId: split.userId,
            counterpartyId: payerId,
          },
        },
        create: {
          groupId,
          userId: split.userId,
          counterpartyId: payerId,
          balance: -amount,
        },
        update: {
          balance: { decrement: amount },
          calculatedAt: new Date(),
        },
      })
    )

    operations.push(
      prisma.ledgerEntry.upsert({
        where: {
          groupId_userId_counterpartyId: {
            groupId,
            userId: payerId,
            counterpartyId: split.userId,
          },
        },
        create: {
          groupId,
          userId: payerId,
          counterpartyId: split.userId,
          balance: amount,
        },
        update: {
          balance: { increment: amount },
          calculatedAt: new Date(),
        },
      })
    )
  }

  await prisma.$transaction(operations)
}

// ——— BALANCE QUERIES ———

/**
 * Get net balance for a user in a group.
 * Positive = user is owed money (net creditor)
 * Negative = user owes money (net debtor)
 *
 * The ledger always stores TWO entries per pair (A, B):
 *   { userId: A, counterpartyId: B, balance: +X }  →  A owes B X cents
 *   { userId: B, counterpartyId: A, balance: -X }  →  B is owed X cents by A
 *
 * To get user's net position we only query one direction (userId = this user).
 *   - balance > 0 → user owes counterparty → negative for user
 *   - balance < 0 → counterparty owes user → positive for user
 *   - net = -sum(balance)
 */
export async function getNetBalanceInGroup(userId: string, groupId: string): Promise<number> {
  const entries = await prisma.ledgerEntry.findMany({
    where: { groupId, userId, isCurrent: true },
    select: { balance: true },
  })

  const totalBalance = entries.reduce((sum, e) => sum + Number(e.balance), 0)
  return -totalBalance
}

/**
 * Get all pairwise balances for a group.
 * Returns simplified view: for each pair, who owes whom.
 */
export async function getGroupBalances(groupId: string) {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      groupId,
      isCurrent: true,
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      counterparty: { select: { id: true, name: true, email: true, image: true } },
    },
  })

  // Simplify: for each pair (A,B), compute net
  // If A owes B 50 and B owes A 30, net: A owes B 20
  const pairMap = new Map<string, typeof entries[0]>()

  for (const entry of entries) {
    const key = [entry.userId, entry.counterpartyId].sort().join(":")
    pairMap.set(key, entry)
  }

  return entries
    .filter(e => {
      const key = [e.userId, e.counterpartyId].sort().join(":")
      return e.userId < e.counterpartyId || pairMap.get(key) === e
    })
    .map(e => ({
      user: e.user,
      counterparty: e.counterparty,
      netBalance: Number(e.balance),
      // If balance > 0: user owes counterparty
      // If balance < 0: counterparty owes user
    }))
}

// ——— DEBT SIMPLIFICATION (SETTLEMENT) ———

export type SettlementTransaction = {
  fromUserId: string
  toUserId: string
  amount: number // in cents
}

/**
 * Compute optimal settlement for a group.
 * Uses greedy algorithm to minimize number of transactions.
 */
export async function computeSettlement(groupId: string): Promise<SettlementTransaction[]> {
  const members = await prisma.groupMember.findMany({
    where: { groupId, leftAt: null },
    select: { userId: true },
  })

  const userIds = members.map(m => m.userId)

  // Compute net balance for each member
  const netBalances: { userId: string; balance: number }[] = []

  for (const userId of userIds) {
    const net = await getNetBalanceInGroup(userId, groupId)
    netBalances.push({ userId, balance: Math.round(net * 100) / 100 })
  }

  return simplifyDebts(netBalances)
}

function simplifyDebts(balances: { userId: string; balance: number }[]): SettlementTransaction[] {
  // Positive = is owed, Negative = owes
  const creditors = balances
    .filter(b => b.balance > 0.01)
    .sort((a, b) => b.balance - a.balance)
    .map(b => ({ ...b }))

  const debtors = balances
    .filter(b => b.balance < -0.01)
    .sort((a, b) => a.balance - b.balance)
    .map(b => ({ ...b, balance: Math.abs(b.balance) }))

  const transactions: SettlementTransaction[] = []
  let i = 0, j = 0

  while (i < creditors.length && j < debtors.length) {
    const creditAmount = creditors[i].balance
    const debtAmount = debtors[j].balance
    const settled = Math.min(creditAmount, debtAmount)

    transactions.push({
      fromUserId: debtors[j].userId,
      toUserId: creditors[i].userId,
      amount: Math.round(settled * 100) / 100,
    })

    creditors[i].balance -= settled
    debtors[j].balance -= settled

    if (creditors[i].balance < 0.01) i++
    if (debtors[j].balance < 0.01) j++
  }

  return transactions
}

// ——— AUDIT ———

/**
 * Verify group ledger consistency.
 * Returns any discrepancy found.
 */
export async function auditGroup(groupId: string): Promise<{ consistent: boolean; discrepancy: number }> {
  const result = await prisma.expense.aggregate({
    where: { groupId, status: "ACTIVE" },
    _sum: { amount: true },
  })

  const totalPaid = Number(result._sum.amount || 0)

  const participants = await prisma.expenseParticipant.findMany({
    where: {
      expense: { groupId, status: "ACTIVE" },
    },
    select: { shareAmount: true },
  })

  const totalShared = participants.reduce((sum, p) => sum + Number(p.shareAmount), 0)

  return {
    consistent: Math.abs(totalPaid - totalShared) < 0.01,
    discrepancy: totalPaid - totalShared,
  }
}

/**
 * Full recalculation of a group's ledger.
 * Zeros all entries and reapplies every active expense chronologically.
 */
export async function fullRecalc(groupId: string) {
  // Mark all current entries as not current
  await prisma.ledgerEntry.updateMany({
    where: { groupId, isCurrent: true },
    data: { isCurrent: false },
  })

  // Get all active expenses in chronological order
  const expenses = await prisma.expense.findMany({
    where: { groupId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    include: {
      participants: true,
    },
  })

  // Reapply each expense
  for (const expense of expenses) {
    const splits: SplitResult = expense.participants.map(p => ({
      userId: p.userId,
      shareAmount: Number(p.shareAmount),
      sharePercentage: p.sharePercentage ? Number(p.sharePercentage) : undefined,
      shares: p.shares,
      weight: Number(p.weight),
    }))

    await updateLedgerOnCreate(expense.id, groupId, expense.paidBy, splits)
  }
}
