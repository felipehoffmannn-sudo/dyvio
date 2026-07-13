"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteExpense } from "@/lib/expense-actions"
import { IconButton, Icon } from "@chakra-ui/react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

export function DeleteExpenseButton({
  expenseId, groupId, canDelete,
}: { expenseId: string; groupId: string; canDelete: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (!canDelete) return null

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja remover esta despesa?")) return
    setLoading(true)
    const result = await deleteExpense(expenseId, groupId)
    setLoading(false)
    if (result?.error) { toast.error(result.error) }
    else { toast.success("Despesa removida"); router.refresh() }
  }

  return (
    <IconButton
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      loading={loading}
      borderRadius="button"
      aria-label="Excluir despesa"
    >
      <Icon as={Trash2} boxSize={4} />
    </IconButton>
  )
}
