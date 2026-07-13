"use client"

import { Box, Flex, Heading, Input, Text, Textarea, Button } from "@chakra-ui/react"
import { Icon } from "@chakra-ui/react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createGroup } from "@/lib/actions"

export function NewGroupForm() {
  return (
    <Flex minH="100vh" direction="column" bg="gray.50">
      {/* Header */}
      <Flex
        bg="white" px={6} py={3} borderBottom="1px" borderColor="gray.200"
        align="center" gap={3}
      >
        <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>
          <Icon as={ArrowLeft} boxSize={5} color="gray.500" />
        </Link>
        <Heading as="h1" size="lg">Novo grupo</Heading>
      </Flex>

      {/* Form */}
      <Box flex={1} maxW="480px" mx="auto" w="full" p={{ base: 4, md: 8 }}>
        <form action={createGroup} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={1.5}>
              Nome do grupo
            </Text>
            <Input
              name="name"
              placeholder="Ex: República, Viagem Japão..."
              required
              autoFocus
              borderRadius="button"
              px={4}
              py={3}
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              _focus={{ borderColor: "brand.500", boxShadow: "none" }}
            />
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={1.5}>
              Descrição (opcional)
            </Text>
            <Textarea
              name="description"
              rows={3}
              placeholder="Para que serve este grupo?"
              borderRadius="button"
              px={4}
              py={3}
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              resize="none"
              _focus={{ borderColor: "brand.500", boxShadow: "none" }}
            />
          </Box>

          <Button type="submit" colorPalette="green" size="lg" w="full">
            Criar grupo
          </Button>
        </form>
      </Box>
    </Flex>
  )
}
