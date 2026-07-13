import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Toaster } from "sonner"

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
    <html lang="pt-BR" suppressHydrationWarning>
      <body style={{ fontFamily: "'Stack Sans Text', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif" }}>
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
