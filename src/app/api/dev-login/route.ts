import { NextRequest, NextResponse } from "next/server"
import { encode } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { isHouseholdEntryAuthorized, isPasswordlessEntryEnabled } from "@/lib/household"

/**
 * Entrada sem senha (dev ou DYVIO_HOUSEHOLD=true).
 *
 * Uso: /api/dev-login?email=felipe@casa.local
 * Sem email: entra com o primeiro usuário do banco.
 */
export async function GET(req: NextRequest) {
  if (!isPasswordlessEntryEnabled()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const key = req.nextUrl.searchParams.get("key")
  if (!isHouseholdEntryAuthorized(key)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email = req.nextUrl.searchParams.get("email")

  const user = email
    ? await prisma.user.findFirst({ where: { email, deletedAt: null } })
    : await prisma.user.findFirst({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } })

  if (!user) {
    return NextResponse.json({ error: "Nenhum usuário encontrado no banco." }, { status: 404 })
  }

  const token = await encode({
    token: {
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.image,
    },
    secret: process.env.NEXTAUTH_SECRET!,
  })

  const dest = req.nextUrl.searchParams.get("callbackUrl") || "/dashboard"
  const res = NextResponse.redirect(new URL(dest, req.nextUrl.origin))

  // next-auth v4 reads the __Secure- prefixed cookie on HTTPS
  const secure = req.nextUrl.protocol === "https:"
  res.cookies.set(secure ? "__Secure-next-auth.session-token" : "next-auth.session-token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })

  return res
}
