"use client"

import { Flex, Heading, Icon, IconButton } from "@chakra-ui/react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PageHeaderProps {
  title: string
  backHref: string
  backLabel?: string
  actions?: React.ReactNode
}

/** Header for inner pages: back link, title and optional actions on the right. */
export function PageHeader({ title, backHref, backLabel = "Voltar", actions }: PageHeaderProps) {
  return (
    <Flex
      as="header"
      bg="bg.card" px={{ base: 2, md: 4 }} h={14}
      borderBottomWidth="1px" borderColor="border.card"
      align="center" gap={2}
    >
      <IconButton asChild aria-label={backLabel} variant="ghost" size="sm" w={10} h={10} borderRadius="button" color="fg.muted">
        <Link href={backHref}>
          <Icon as={ArrowLeft} boxSize={5} />
        </Link>
      </IconButton>
      <Heading as="h1" size="md" fontWeight="semibold" truncate flex={1} minW={0}>{title}</Heading>
      {actions}
    </Flex>
  )
}
