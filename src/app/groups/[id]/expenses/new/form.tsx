"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createExpense } from "@/lib/expense-actions"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { Box, Flex, Heading, Text, SimpleGrid, Input, Button, NativeSelect, Icon, HStack } from "@chakra-ui/react"
import { FileText, DollarSign, User, BarChart3, Users, Lightbulb, Equal, Hash, Percent, Share2, X, Check, ArrowLeft } from "lucide-react"
import Link from "next/link"

type Member = { id: string; name: string; image: string | null }
type Category = { id: string; name: string; icon: string }
type SplitType = "EQUAL" | "FIXED" | "PERCENT" | "SHARES"

const splitTypeInfo: Record<SplitType, { icon: any; label: string }> = {
  EQUAL: { icon: Equal, label: "Igual" },
  FIXED: { icon: Hash, label: "Fixo" },
  PERCENT: { icon: Percent, label: "%" },
  SHARES: { icon: Share2, label: "Partes" },
}

export function NewExpenseForm({ groupId, members, currentUserId, categories }: {
  groupId: string; members: Member[]; currentUserId: string; categories: Category[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [amountStr, setAmountStr] = useState("")
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [splitType, setSplitType] = useState<SplitType>("EQUAL")
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set(members.map(m => m.id)))
  const [categoryId, setCategoryId] = useState("")
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fixedAmounts, setFixedAmounts] = useState<Record<string, string>>({})
  const [percentages, setPercentages] = useState<Record<string, number>>({})
  const [shares, setShares] = useState<Record<string, number>>({})

  const amountInCents = useMemo(() => {
    const num = parseFloat(amountStr.replace(",", "."))
    return isNaN(num) ? 0 : Math.round(num * 100)
  }, [amountStr])

  const activeParticipants = useMemo(() => members.filter(m => selectedParticipants.has(m.id)), [members, selectedParticipants])

  const allSplitParticipants = useMemo(() => {
    const ids = activeParticipants.map(p => p.id)
    if (!ids.includes(paidBy)) ids.push(paidBy)
    return members.filter(m => ids.includes(m.id))
  }, [activeParticipants, paidBy, members])

  function toggleParticipant(userId: string) {
    setSelectedParticipants(prev => {
      const next = new Set(prev)
      if (next.has(userId)) { if (next.size <= 1) return prev; next.delete(userId) }
      else next.add(userId)
      return next
    })
  }

  const splitPreview = useMemo(() => {
    if (amountInCents <= 0 || allSplitParticipants.length === 0) return null
    const count = allSplitParticipants.length
    switch (splitType) {
      case "EQUAL": {
        const base = Math.floor(amountInCents / count)
        const remainder = amountInCents - base * count
        return allSplitParticipants.map((p, i) => ({ userId: p.id, amount: i === count - 1 ? base + remainder : base }))
      }
      case "FIXED":
        return allSplitParticipants.map(p => {
          const val = parseFloat((fixedAmounts[p.id] || "0").replace(",", "."))
          return { userId: p.id, amount: isNaN(val) ? 0 : Math.round(val * 100) }
        })
      case "PERCENT":
        return allSplitParticipants.map(p => ({ userId: p.id, amount: Math.round(amountInCents * (percentages[p.id] || 0) / 100) }))
      case "SHARES": {
        const totalShares = allSplitParticipants.reduce((sum, p) => sum + (shares[p.id] || 1), 0)
        const vps = amountInCents / totalShares
        let dist = 0
        const r = allSplitParticipants.map((p) => { const s = Math.floor(vps * (shares[p.id] || 1)); dist += s; return { userId: p.id, amount: s } })
        let rem = amountInCents - dist
        for (let i = r.length - 1; i >= 0 && rem > 0; i--) { r[i].amount++; rem-- }
        return r
      }
      default: return null
    }
  }, [amountInCents, allSplitParticipants, splitType, fixedAmounts, percentages, shares])

  const fixedTotal = useMemo(() => allSplitParticipants.reduce((sum, p) => {
    const val = parseFloat((fixedAmounts[p.id] || "0").replace(",", "."))
    return sum + (isNaN(val) ? 0 : Math.round(val * 100))
  }, 0), [allSplitParticipants, fixedAmounts])

  const percentTotal = useMemo(() => allSplitParticipants.reduce((sum, p) => sum + (percentages[p.id] || 0), 0), [allSplitParticipants, percentages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("")
    if (!title.trim()) { setError("Informe uma descrição."); return }
    if (amountInCents <= 0) { setError("Informe um valor válido."); return }
    if (allSplitParticipants.length < 1) { setError("Selecione pelo menos 1 participante."); return }
    if (splitType === "FIXED" && fixedTotal !== amountInCents) { setError(`Soma (${formatCurrency(fixedTotal)}) ≠ Total (${formatCurrency(amountInCents)}).`); return }
    if (splitType === "PERCENT" && percentTotal !== 100) { setError(`Soma das porcentagens = ${percentTotal}%. Deve ser 100%.`); return }

    const formData = new FormData()
    formData.set("groupId", groupId); formData.set("title", title.trim())
    formData.set("amount", (amountInCents / 100).toFixed(2)); formData.set("splitType", splitType)
    formData.set("paidBy", paidBy); formData.set("expenseDate", expenseDate)
    if (categoryId) formData.set("categoryId", categoryId)
    allSplitParticipants.forEach(p => formData.append("participants", p.id))
    if (splitType === "FIXED") allSplitParticipants.forEach(p => { const val = parseFloat((fixedAmounts[p.id] || "0").replace(",", ".")); formData.append(`fixed_${p.id}`, (isNaN(val) ? 0 : val).toString()) })
    if (splitType === "PERCENT") allSplitParticipants.forEach(p => formData.append(`pct_${p.id}`, (percentages[p.id] || 0).toString()))
    if (splitType === "SHARES") allSplitParticipants.forEach(p => formData.append(`shares_${p.id}`, (shares[p.id] || 1).toString()))

    setLoading(true)
    try { await createExpense(formData); toast.success("Despesa criada!"); router.refresh() }
    catch (err: any) { setError(err.message || "Erro ao criar despesa."); setLoading(false) }
  }

  function memberName(m: Member) { return m.id === currentUserId ? "Você" : m.name.split(" ")[0] }

  return (
    <Flex minH="100vh" direction="column" bg="gray.50">
      <Flex bg="white" px={6} py={3} borderBottom="1px" borderColor="gray.200" align="center" gap={3}>
        <Link href={`/groups/${groupId}`} style={{ color: "inherit", textDecoration: "none" }}>
          <Icon as={ArrowLeft} boxSize={5} color="gray.500" />
        </Link>
        <Heading as="h1" size="lg">Nova despesa</Heading>
      </Flex>

      <Box flex={1} maxW="480px" mx="auto" w="full" p={{ base: 4, md: 6 }}>
        <Box as="form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Descrição */}
          <Box>
            <HStack gap={1.5} mb={1.5}>
              <Icon as={FileText} boxSize={4} color="gray.600" />
              <Text fontSize="sm" fontWeight="medium" color="gray.600">Descrição</Text>
            </HStack>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Aluguel, Mercado..." required autoFocus borderRadius="button" px={4} py={3} bg="white" borderWidth="1px" borderColor="gray.200" _focus={{ borderColor: "brand.500", boxShadow: "none" }} />
          </Box>

          {/* Valor */}
          <Box>
            <HStack gap={1.5} mb={1.5}>
              <Icon as={DollarSign} boxSize={4} color="gray.600" />
              <Text fontSize="sm" fontWeight="medium" color="gray.600">Valor</Text>
            </HStack>
            <Box position="relative">
              <Text position="absolute" left={4} top="50%" transform="translateY(-50%)" color="gray.500" zIndex={1}>R$</Text>
              <Input type="text" inputMode="decimal" placeholder="0,00" required value={amountStr} onChange={e => setAmountStr(e.target.value)} pl={12} pr={4} py={3} borderRadius="button" bg="white" borderWidth="1px" borderColor="gray.200" fontSize="lg" fontFamily="mono" _focus={{ borderColor: "brand.500", boxShadow: "none" }} />
            </Box>
          </Box>

          {/* Pago por */}
          <Box>
            <HStack gap={1.5} mb={1.5}>
              <Icon as={User} boxSize={4} color="gray.600" />
              <Text fontSize="sm" fontWeight="medium" color="gray.600">Pago por</Text>
            </HStack>
            <NativeSelect.Root size="lg">
              <NativeSelect.Field value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                {members.map(m => <option key={m.id} value={m.id}>{m.id === currentUserId ? "Você" : m.name}</option>)}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Box>

          {/* Tipo de divisão */}
          <Box>
            <HStack gap={1.5} mb={2}>
              <Icon as={BarChart3} boxSize={4} color="gray.600" />
              <Text fontSize="sm" fontWeight="medium" color="gray.600">Tipo de divisão</Text>
            </HStack>
            <SimpleGrid columns={4} gap={2}>
              {(Object.entries(splitTypeInfo) as [SplitType, typeof splitTypeInfo[SplitType]][]).map(([type, info]) => {
                const IconEl = info.icon
                const active = splitType === type
                return (
                  <Box key={type} as="button" type="button" onClick={() => setSplitType(type)}
                    display="flex" flexDirection="column" alignItems="center" gap={1} p={3}
                    borderRadius="button" borderWidth="1px" cursor="pointer"
                    borderColor={active ? "brand.500" : "gray.200"}
                    bg={active ? "brand.50" : "white"}
                    color={active ? "brand.600" : "gray.600"}
                    _hover={!active ? { borderColor: "gray.300" } : {}}
                    transition="all 0.15s"
                  >
                    <Icon as={IconEl} boxSize={5} />
                    <Text fontSize="xs" fontWeight="medium">{info.label}</Text>
                  </Box>
                )
              })}
            </SimpleGrid>
          </Box>

          {/* Dividido com */}
          <Box>
            <HStack gap={1.5} mb={2}>
              <Icon as={Users} boxSize={4} color="gray.600" />
              <Text fontSize="sm" fontWeight="medium" color="gray.600">Dividido com</Text>
            </HStack>
            <Flex direction="column" gap={1}>
              {members.map(m => {
                const sel = selectedParticipants.has(m.id)
                return (
                  <Flex key={m.id} as="button" type="button" onClick={() => toggleParticipant(m.id)}
                    align="center" gap={3} px={4} py={2.5} borderRadius="button" borderWidth="1px"
                    borderColor={sel ? "brand.500" : "gray.200"} bg={sel ? "brand.50" : "white"}
                    _hover={!sel ? { borderColor: "gray.300" } : {}} transition="all 0.15s" cursor="pointer"
                  >
                    <Box w={5} h={5} borderRadius="md" borderWidth="2px" borderColor={sel ? "brand.500" : "gray.300"} bg={sel ? "brand.500" : "transparent"} display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                      {sel && <Icon as={Check} boxSize={3} color="white" />}
                    </Box>
                    <Box w={6} h={6} borderRadius="full" bg="brand.100" display="flex" alignItems="center" justifyContent="center" fontSize="xs" fontWeight="medium" flexShrink={0}>
                      {m.name[0]?.toUpperCase()}
                    </Box>
                    <Text fontSize="sm">{memberName(m)}</Text>
                    {m.id === paidBy && <Text ml="auto" fontSize="10px" px={1.5} py={0.5} borderRadius="full" bg="gray.100" color="gray.500">pagou</Text>}
                  </Flex>
                )
              })}
            </Flex>
          </Box>

          {/* Pré-visualização */}
          {amountInCents > 0 && allSplitParticipants.length > 0 && (
            <Box p={4} borderRadius="card" borderWidth="1px" borderColor="gray.200" bg="white">
              <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                <Icon as={Lightbulb} boxSize={4} color="gray.500" /> {splitType === "EQUAL" ? "Pré-visualização" : splitType === "FIXED" ? "Valor por pessoa" : splitType === "PERCENT" ? "Porcentagem" : "Partes"}
              </Text>
              <Flex direction="column" gap={2}>
                {splitType === "EQUAL" && splitPreview?.map(p => (
                  <Flex key={p.userId} justify="space-between" fontSize="sm">
                    <Text>{memberName(members.find(m => m.id === p.userId)!)}</Text>
                    <Text fontFamily="mono" fontWeight="medium">{formatCurrency(p.amount)}</Text>
                  </Flex>
                ))}
                {splitType === "FIXED" && allSplitParticipants.map(p => (
                  <Flex key={p.id} align="center" gap={3}>
                    <Text fontSize="sm" w="80px" truncate>{memberName(p)}</Text>
                    <Box position="relative" flex={1}>
                      <Text position="absolute" left={3} top="50%" transform="translateY(-50%)" fontSize="xs" color="gray.400" zIndex={1}>R$</Text>
                      <Input type="text" inputMode="decimal" placeholder="0,00" value={fixedAmounts[p.id] || ""}
                        onChange={e => setFixedAmounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                        pl={10} pr={3} py={1.5} fontSize="sm" borderRadius="md" bg="gray.50" borderWidth="1px" borderColor="gray.200" fontFamily="mono" _focus={{ borderColor: "brand.500", boxShadow: "none" }} />
                    </Box>
                  </Flex>
                ))}
                {splitType === "FIXED" && (
                  <Text fontSize="xs" pt={2} borderTop="1px" borderColor="gray.100" color={fixedTotal === amountInCents ? "green.600" : "red.500"}>
                    Soma: {formatCurrency(fixedTotal)} / {formatCurrency(amountInCents)}
                    {fixedTotal !== amountInCents && ` (${fixedTotal > amountInCents ? "sobrando" : "faltando"} ${formatCurrency(Math.abs(fixedTotal - amountInCents))})`}
                  </Text>
                )}
                {splitType === "PERCENT" && allSplitParticipants.map(p => (
                  <Flex key={p.id} align="center" gap={3}>
                    <Text fontSize="sm" w="80px" truncate>{memberName(p)}</Text>
                    <Input type="range" min={0} max={100} value={percentages[p.id] || 0} flex={1} h="6px" accentColor="brand.500"
                      onChange={e => setPercentages(prev => ({ ...prev, [p.id]: parseInt(e.target.value) }))} />
                    <Text fontSize="sm" fontFamily="mono" w="48px" textAlign="right">{percentages[p.id] || 0}%</Text>
                  </Flex>
                ))}
                {splitType === "PERCENT" && (
                  <Text fontSize="xs" pt={2} borderTop="1px" borderColor="gray.100" color={percentTotal === 100 ? "green.600" : "red.500"}>
                    Total: {percentTotal}% {percentTotal !== 100 && "(deve ser 100%)"}
                  </Text>
                )}
                {splitType === "SHARES" && allSplitParticipants.map(p => (
                  <Flex key={p.id} align="center" gap={3}>
                    <Text fontSize="sm" w="80px" truncate>{memberName(p)}</Text>
                    <Flex align="center" gap={2}>
                      <Box as="button" type="button" onClick={() => setShares(prev => ({ ...prev, [p.id]: Math.max(1, (prev[p.id] || 1) - 1) }))}
                        w={7} h={7} borderRadius="md" borderWidth="1px" borderColor="gray.200" display="flex" alignItems="center" justifyContent="center" fontSize="sm" _hover={{ bg: "gray.50" }}>-</Box>
                      <Text fontSize="sm" fontFamily="mono" w={6} textAlign="center">{shares[p.id] || 1}</Text>
                      <Box as="button" type="button" onClick={() => setShares(prev => ({ ...prev, [p.id]: (prev[p.id] || 1) + 1 }))}
                        w={7} h={7} borderRadius="md" borderWidth="1px" borderColor="gray.200" display="flex" alignItems="center" justifyContent="center" fontSize="sm" _hover={{ bg: "gray.50" }}>+</Box>
                    </Flex>
                    {splitPreview && (
                      <Text fontSize="sm" fontFamily="mono" color="gray.500" ml="auto">{formatCurrency(splitPreview.find(s => s.userId === p.id)?.amount || 0)}</Text>
                    )}
                  </Flex>
                ))}
              </Flex>
            </Box>
          )}

          {/* Categoria */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>🏷 Categoria</Text>
            <Flex flexWrap="wrap" gap={2}>
              <Box as="button" type="button" onClick={() => setCategoryId("")}
                px={3} py={1.5} borderRadius="full" borderWidth="1px" fontSize="sm" cursor="pointer"
                borderColor={!categoryId ? "brand.500" : "gray.200"} bg={!categoryId ? "brand.50" : "white"} color={!categoryId ? "brand.600" : "gray.600"}
                _hover={categoryId ? { borderColor: "gray.300" } : {}} transition="all 0.15s"
              >Nenhuma</Box>
              {categories.map(cat => (
                <Box key={cat.id} as="button" type="button" onClick={() => setCategoryId(cat.id)}
                  px={3} py={1.5} borderRadius="full" borderWidth="1px" fontSize="sm" cursor="pointer"
                  borderColor={categoryId === cat.id ? "brand.500" : "gray.200"} bg={categoryId === cat.id ? "brand.50" : "white"} color={categoryId === cat.id ? "brand.600" : "gray.600"}
                  _hover={categoryId !== cat.id ? { borderColor: "gray.300" } : {}} transition="all 0.15s"
                >{cat.icon} {cat.name}</Box>
              ))}
            </Flex>
          </Box>

          {/* Data */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={1.5}>📅 Data</Text>
            <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} borderRadius="button" px={4} py={3} bg="white" borderWidth="1px" borderColor="gray.200" _focus={{ borderColor: "brand.500", boxShadow: "none" }} />
          </Box>

          {error && (
            <Flex align="center" gap={2} fontSize="sm" color="red.600" bg="red.50" px={4} py={3} borderRadius="button">
              <Icon as={X} boxSize={4} flexShrink={0} />{error}
            </Flex>
          )}

          <Button type="submit" variant="primary" size="lg" w="full" loading={loading}>💾 Salvar despesa</Button>
        </Box>
      </Box>
    </Flex>
  )
}
