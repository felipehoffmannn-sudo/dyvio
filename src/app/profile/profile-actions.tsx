"use client"

import { Button, Icon } from "@chakra-ui/react"
import { Settings } from "lucide-react"
import Link from "next/link"
import { LogoutButton } from "./logout-button"
import { VStack } from "@chakra-ui/react"

export function ProfileActions() {
  return (
    <VStack gap={2}>
      <LogoutButton />
      <Link href="/settings" style={{ width: "100%" }}>
        <Button variant="outline" w="full">
          <Icon as={Settings} boxSize={4} mr={1} /> Configurações
        </Button>
      </Link>
    </VStack>
  )
}
