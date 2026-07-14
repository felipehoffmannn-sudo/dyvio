import { Box, Flex, SimpleGrid } from "@chakra-ui/react"

export default function GroupsLoading() {
  return (
    <Box p={[4, 6, 8]} maxW="1000px" mx="auto" w="full">
      <Box h="24px" w="120px" bg="gray.100" borderRadius="md" mb={6} />
      <SimpleGrid columns={[1, 2, 3]} gap={4}>
        {[1, 2, 3].map(i => (
          <Box key={i} p={5} bg="white" borderRadius="xl" borderWidth="1px">
            <Box h="16px" w="140px" bg="gray.100" borderRadius="md" mb={2} />
            <Box h="12px" w="80px" bg="gray.100" borderRadius="md" />
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  )
}
