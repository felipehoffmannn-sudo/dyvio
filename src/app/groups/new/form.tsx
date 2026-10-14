"use client"

import { Box, Flex, Input, Text, Textarea, Button } from "@chakra-ui/react"
import { createGroup } from "@/lib/actions"
import { PageHeader } from "@/components/page-header"

export function NewGroupForm({ partnerNames }: { partnerNames: string[] }) {
  return (
    <Flex minH="100vh" direction="column" bg="bg.page">
      <PageHeader title="Novo grupo" backHref="/dashboard/groups" backLabel="Voltar para grupos" />

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

          {partnerNames.length > 0 && (
            <Text fontSize="sm" color="fg.muted">
              {partnerNames.join(" e ")} {partnerNames.length > 1 ? "entram" : "entra"} no grupo automaticamente.
            </Text>
          )}

          <Button type="submit" colorPalette="green" size="lg" w="full">
            Criar grupo
          </Button>
        </form>
      </Box>
    </Flex>
  )
}
