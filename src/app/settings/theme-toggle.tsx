"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon, Monitor } from "lucide-react"
import { HStack, Icon, Text } from "@chakra-ui/react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <HStack w="120px" h="32px" />

  const options = [
    { value: "light", icon: Sun, label: "Claro" },
    { value: "dark", icon: Moon, label: "Escuro" },
    { value: "system", icon: Monitor, label: "Auto" },
  ]

  return (
    <HStack gap={0.5} bg="gray.50" borderRadius="md" borderWidth="1px" borderColor="gray.200" p={0.5}>
      {options.map(({ value, icon: IconComp, label }) => {
        const isActive = theme === value
        return (
          <HStack
            key={value}
            as="button"
            type="button"
            gap={1.5}
            px={2.5}
            py={1}
            borderRadius="md"
            fontSize="xs"
            fontWeight="medium"
            bg={isActive ? "white" : "transparent"}
            color={isActive ? "gray.900" : "gray.400"}
            boxShadow={isActive ? "sm" : "none"}
            _hover={!isActive ? { color: "gray.600" } : undefined}
            onClick={() => setTheme(value)}
            cursor="pointer"
            border="none"
            transition="all 0.15s"
          >
            <Icon as={IconComp} boxSize={3.5} />
            <Text as="span" display={{ base: "none", sm: "inline" }}>{label}</Text>
          </HStack>
        )
      })}
    </HStack>
  )
}
