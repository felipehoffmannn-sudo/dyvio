"use client"

import { signOut } from "next-auth/react"
import { Button, Icon } from "@chakra-ui/react"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  return (
    <Button
      variant="outline"
      w="full"
      onClick={() => signOut({ callbackUrl: "/auth/login" })}
    >
      <Icon as={LogOut} boxSize={4} mr={1} /> Sair da conta
    </Button>
  )
}
