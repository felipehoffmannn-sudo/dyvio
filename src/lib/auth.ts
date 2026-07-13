import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null

      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      })

      if (!user || !user.passwordHash) return null

      const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
      if (!isValid) return null

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      }
    },
  }),
]

// Only add Google provider if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    newUser: "/onboarding",
  },
  providers,
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
}
