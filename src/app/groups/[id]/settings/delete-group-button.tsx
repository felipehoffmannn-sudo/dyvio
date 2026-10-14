"use client"

import { useState, useTransition } from "react"
import { Button, Text } from "@chakra-ui/react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { deleteGroup } from "@/lib/actions"

export function DeleteGroupButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const confirm = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteGroup(groupId)
      if (result?.error) {
        setError(result.error)
        setOpen(false)
      }
    })
  }

  return (
    <>
      <Button colorPalette="red" w="full" onClick={() => setOpen(true)}>Excluir grupo</Button>
      {error && <Text fontSize="sm" color="red.700">{error}</Text>}
      <ConfirmDialog
        open={open}
        title={`Excluir "${groupName}"?`}
        description="Todas as despesas, pagamentos e saldos deste grupo serão apagados para todos os membros. Não dá para desfazer."
        confirmLabel="Excluir grupo"
        destructive
        loading={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
