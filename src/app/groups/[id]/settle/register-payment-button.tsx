"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { registerPayment } from "@/lib/expense-actions"
import { Button } from "@chakra-ui/react"
import { toast } from "sonner"

export function RegisterPaymentButton({
  groupId,
  toUserId,
  amount,
}: {
  groupId: string
  toUserId: string
  amount: number
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClick() {
    setLoading(true)
    const formData = new FormData()
    formData.set("groupId", groupId)
    formData.set("toUserId", toUserId)
    formData.set("amount", amount.toString())

    const result = await registerPayment(formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Pagamento registrado!")
      router.refresh()
    }
  }

  return (
    <Button
      variant="success"
      size="sm"
      onClick={handleClick}
      loading={loading}
    >
      Marcar como pago
    </Button>
  )
}
