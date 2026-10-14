import type { Metadata } from "next"
import { Onest } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Toaster } from "sonner"

const onest = Onest({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Dyvio — Gestão de Despesas Compartilhadas",
  description: "Divida despesas com amigos de forma simples e inteligente.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={onest.variable} suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "#fff",
                color: "#0A0A0A",
                border: "1px solid #E8E8E8",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
