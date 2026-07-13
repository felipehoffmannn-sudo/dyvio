"use client"

import { Button as ChakraButton } from "@chakra-ui/react"
import type { ReactNode } from "react"

interface ButtonProps {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
  type?: "button" | "submit"
  onClick?: () => void
  loading?: boolean
  className?: string
  w?: string
}

export function Button({ children, variant = "primary", size = "md", type = "button", onClick, loading, className, w, ...rest }: ButtonProps) {
  const colorPalette = variant === "primary" ? "green" : variant === "danger" ? "red" : "gray"
  const chakraVariant = variant === "primary" ? "solid" : variant === "secondary" ? "outline" : variant === "ghost" ? "ghost" : "solid"

  return (
    <ChakraButton
      colorPalette={colorPalette}
      variant={chakraVariant}
      size={size}
      w={w}
      type={type}
      onClick={onClick}
      loading={loading}
      borderRadius="button"
      px={size === "lg" ? 6 : size === "sm" ? 3 : 4}
      py={size === "lg" ? 3 : size === "sm" ? 1.5 : 2}
      className={className}
      {...rest}
    >
      {children}
    </ChakraButton>
  )
}
