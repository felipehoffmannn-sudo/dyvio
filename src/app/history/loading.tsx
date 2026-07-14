import { Box, Flex, VStack } from "@chakra-ui/react"

export default function HistoryLoading() {
  return (
    <Box p={[4, 6, 8]} maxW="1000px" mx="auto" w="full">
      <Box h="24px" w="140px" bg="gray.100" borderRadius="md" mb={6} />
      {[1, 2, 3, 4, 5].map(i => (
        <Flex key={i} justify="space-between" p={4} bg="white" borderRadius="xl" borderWidth="1px" mb={3}>
          <Box>
            <Box h="14px" w="160px" bg="gray.100" borderRadius="md" mb={1} />
            <Box h="12px" w="100px" bg="gray.100" borderRadius="md" />
          </Box>
          <Box h="14px" w="60px" bg="gray.100" borderRadius="md" />
        </Flex>
      ))}
    </Box>
  )
}
