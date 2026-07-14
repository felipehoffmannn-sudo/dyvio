import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

/**
 * Cache de sessão + usuário para evitar repetir as mesmas queries
 * em Server Components que chamam getServerSession + prisma.user.findUnique
 */
export const getSessionUser = cache(async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  return user
})
