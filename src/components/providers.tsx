"use client"

import { SessionProvider } from "next-auth/react"
import { ChakraProvider, defaultConfig } from "@chakra-ui/react"
import { system } from "@/lib/theme"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ChakraProvider value={system}>
        {children}
      </ChakraProvider>
    </SessionProvider>
  )
}
