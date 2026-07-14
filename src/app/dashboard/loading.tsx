import { Box, Flex, Heading, Text, SimpleGrid, VStack } from "@chakra-ui/react"

export default function DashboardLoading() {
  return (
    <Box p={[4, 6, 8]} maxW="1200px" mx="auto" w="full">
      {/* Header skeleton */}
      <Flex justify="space-between" align="flex-start" mb={8} flexDir={["column", "row"]} gap={4}>
        <Box>
          <Box h="28px" w="280px" bg="gray.100" borderRadius="md" mb={2} />
          <Box h="16px" w="200px" bg="gray.100" borderRadius="md" />
        </Box>
        <Box h="40px" w="160px" bg="gray.100" borderRadius="lg" />
      </Flex>

      {/* Cards skeleton */}
      <SimpleGrid columns={[1, 2, 4]} gap={4} mb={8}>
        {[1, 2, 3, 4].map(i => (
          <Box key={i} p={5} bg="white" borderRadius="xl" borderWidth="1px">
            <Box h="12px" w="100px" bg="gray.100" borderRadius="md" mb={3} />
            <Box h="28px" w="120px" bg="gray.100" borderRadius="md" />
          </Box>
        ))}
      </SimpleGrid>

      {/* Content skeleton */}
      <SimpleGrid columns={[1, null, 2]} gap={6}>
        <Box p={5} bg="white" borderRadius="xl" borderWidth="1px">
          <Box h="20px" w="150px" bg="gray.100" borderRadius="md" mb={4} />
          {[1, 2, 3].map(i => (
            <Flex key={i} justify="space-between" py={3} borderBottomWidth={i < 3 ? "1px" : "0"}>
              <Box>
                <Box h="14px" w="120px" bg="gray.100" borderRadius="md" mb={1} />
                <Box h="12px" w="80px" bg="gray.100" borderRadius="md" />
              </Box>
              <Box h="14px" w="60px" bg="gray.100" borderRadius="md" />
            </Flex>
          ))}
        </Box>
        <Box p={5} bg="white" borderRadius="xl" borderWidth="1px">
          <Box h="20px" w="100px" bg="gray.100" borderRadius="md" mb={4} />
          {[1, 2].map(i => (
            <Box key={i} py={3}>
              <Box h="14px" w="80px" bg="gray.100" borderRadius="md" mb={1} />
              <Box h="20px" w="100px" bg="gray.100" borderRadius="md" />
            </Box>
          ))}
        </Box>
      </SimpleGrid>
    </Box>
  )
}
