"use client"

import { Button, Dialog, VStack } from "@chakra-ui/react"

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, description, confirmLabel, destructive, loading, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root role="alertdialog" open={open} onOpenChange={(e) => { if (!e.open && !loading) onCancel() }}>
      <Dialog.Backdrop bg="blackAlpha.600" />
      <Dialog.Positioner alignItems="center" px={{ base: 2, md: 0 }}>
        <Dialog.Content bg="bg.panel" borderRadius="card" maxW={{ base: "100%", md: "400px" }} p={6}>
          <Dialog.Title fontSize="lg" fontWeight="semibold">{title}</Dialog.Title>
          <Dialog.Description fontSize="sm" color="fg.muted" mt={2}>{description}</Dialog.Description>
          <VStack gap={2} mt={6}>
            <Button
              colorPalette={destructive ? "red" : "green"}
              borderRadius="button" w="full" size="lg"
              loading={loading} onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
            <Button variant="ghost" borderRadius="button" w="full" size="lg" disabled={loading} onClick={onCancel}>
              Cancelar
            </Button>
          </VStack>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
