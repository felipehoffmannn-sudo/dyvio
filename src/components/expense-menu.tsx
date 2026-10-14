"use client"

import { Icon, IconButton, Menu, Portal } from "@chakra-ui/react"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

interface ExpenseMenuProps {
  title: string
  onEdit?: () => void
  onDelete?: () => void
}

/** Edit/delete actions for an expense row. Renders nothing when neither action is allowed. */
export function ExpenseMenu({ title, onEdit, onDelete }: ExpenseMenuProps) {
  if (!onEdit && !onDelete) return null
  return (
    <Menu.Root positioning={{ placement: "bottom-end" }}>
      <Menu.Trigger asChild>
        <IconButton aria-label={`Ações de ${title}`} variant="ghost" size="sm" w={10} h={10} minW={10} borderRadius="button" color="fg.muted" mr={-2}>
          <Icon as={MoreHorizontal} boxSize={4} />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="160px" borderRadius="lg" py={1}>
            {onEdit && (
              <Menu.Item value="edit" onClick={onEdit} px={3} py={2} fontSize="sm" gap={2}>
                <Icon as={Pencil} boxSize={4} color="fg.muted" aria-hidden />
                Editar
              </Menu.Item>
            )}
            {onDelete && (
              <Menu.Item value="delete" onClick={onDelete} px={3} py={2} fontSize="sm" gap={2} color="negative">
                <Icon as={Trash2} boxSize={4} aria-hidden />
                Excluir
              </Menu.Item>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
