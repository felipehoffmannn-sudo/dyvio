import { Box, Flex, VStack } from "@chakra-ui/react"

export default function InvitesLoading() {
  return (
    <Box minH="100vh" bg="gray.50">
      <Flex bg="white" px={[4, 6]} py={3} borderBottom="1px" borderColor="gray.200" align="center" gap={3}>
        <Box w="24px" h="24px" bg="gray.100" borderRadius="md" />
        <Box h="24px" w="100px" bg="gray.100" borderRadius="md" />
      </Flex>
      <Box flex={1} maxW="520px" mx="auto" w="full" p={[4, 6]}>
        {[1, 2].map(i => (
          <Box key={i} p={5} bg="white" borderRadius="xl" borderWidth="1px" mb={4}>
            <Box h="14px" w="140px" bg="gray.100" borderRadius="md" mb={2} />
            <Box h="12px" w="90px" bg="gray.100" borderRadius="md" mb={3} />
            <Box h="36px" w="full" bg="gray.100" borderRadius="lg" />
          </Box>
        ))}
      </Box>
    </Box>
  )
}
