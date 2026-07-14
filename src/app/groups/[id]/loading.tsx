import { Box, Flex, VStack } from "@chakra-ui/react"

export default function GroupDetailLoading() {
  return (
    <Box p={[4, 6, 8]} maxW="1000px" mx="auto" w="full">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <Flex align="center" gap={3}>
          <Box w="32px" h="32px" bg="gray.100" borderRadius="md" />
          <Box h="24px" w="180px" bg="gray.100" borderRadius="md" />
        </Flex>
        <Box h="36px" w="120px" bg="gray.100" borderRadius="lg" />
      </Flex>

      {/* Balance card */}
      <Box p={6} bg="white" borderRadius="xl" borderWidth="1px" mb={6}>
        <Box h="12px" w="80px" bg="gray.100" borderRadius="md" mb={2} />
        <Box h="32px" w="140px" bg="gray.100" borderRadius="md" mb={2} />
        <Box h="12px" w="180px" bg="gray.100" borderRadius="md" />
      </Box>

      {/* Expense list skeleton */}
      <Box>
        <Box h="20px" w="120px" bg="gray.100" borderRadius="md" mb={4} />
        {[1, 2, 3, 4].map(i => (
          <Flex key={i} justify="space-between" p={4} bg="white" borderRadius="xl" borderWidth="1px" mb={3}>
            <Flex align="center" gap={3}>
              <Box w="40px" h="40px" bg="gray.100" borderRadius="full" />
              <Box>
                <Box h="14px" w="140px" bg="gray.100" borderRadius="md" mb={1} />
                <Box h="12px" w="90px" bg="gray.100" borderRadius="md" />
              </Box>
            </Flex>
            <Box h="14px" w="60px" bg="gray.100" borderRadius="md" />
          </Flex>
        ))}
      </Box>
    </Box>
  )
}
