"use client"

import { Box, Input as ChakraInput, Text } from "@chakra-ui/react"

interface InputProps {
  name: string
  label?: string
  placeholder?: string
  required?: boolean
  autoFocus?: boolean
  type?: string
  defaultValue?: string
}

export function Input({ name, label, placeholder, required, autoFocus, type = "text", defaultValue }: InputProps) {
  return (
    <Box w="full">
      {label && (
        <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={1.5}>
          {label}
        </Text>
      )}
      <ChakraInput
        name={name}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        type={type}
        defaultValue={defaultValue}
        borderRadius="button"
        px={4}
        py={3}
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        _focus={{ borderColor: "brand.500", boxShadow: "none" }}
      />
    </Box>
  )
}
