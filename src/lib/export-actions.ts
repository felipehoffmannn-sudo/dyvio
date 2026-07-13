"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function exportGroupCSV(groupId: string): Promise<string> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Error("Não autenticado")

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) throw new Error("Usuário não encontrado")

  const expenses = await prisma.expense.findMany({
    where: { groupId, status: "ACTIVE" },
    orderBy: { expenseDate: "desc" },
    include: {
      payer: { select: { name: true } },
      participants: { include: { user: { select: { name: true, email: true } } } },
      category: { select: { name: true } },
    },
  })

  const headers = [
    "Data",
    "Descrição",
    "Categoria",
    "Valor Total (R$)",
    "Pago por",
    "Tipo de Divisão",
    "Participantes",
    "Valor por Pessoa (R$)",
  ]

  const rows = expenses.map(expense => {
    const participantsStr = expense.participants
      .map(p => `${p.user.name || p.user.email}: ${(Number(p.shareAmount) / 100).toFixed(2)}`)
      .join(" | ")

    return [
      expense.expenseDate.toISOString().split("T")[0],
      `"${expense.title.replace(/"/g, '""')}"`,
      expense.category?.name || "",
      (Number(expense.amount) / 100).toFixed(2),
      expense.payer.name || "",
      expense.splitType,
      `"${participantsStr.replace(/"/g, '""')}"`,
      "",
    ]
  })

  const totals = [
    "",
    "TOTAL",
    "",
    (expenses.reduce((sum, e) => sum + Number(e.amount), 0) / 100).toFixed(2),
    "",
    "",
    "",
    "",
  ]

  const csv = [headers, ...rows, totals]
    .map(row => row.join(","))
    .join("\n")

  return csv
}
