import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const defaultCategories = [
  { name: "Moradia", icon: "🏠", color: "#2563EB", isSystem: true },
  { name: "Alimentação", icon: "🍕", color: "#DC2626", isSystem: true },
  { name: "Transporte", icon: "🚗", color: "#D97706", isSystem: true },
  { name: "Lazer", icon: "🎉", color: "#7C3AED", isSystem: true },
  { name: "Contas", icon: "💡", color: "#F59E0B", isSystem: true },
  { name: "Supermercado", icon: "🛒", color: "#059669", isSystem: true },
  { name: "Saúde", icon: "💊", color: "#EC4899", isSystem: true },
  { name: "Educação", icon: "📚", color: "#6366F1", isSystem: true },
  { name: "Viagem", icon: "✈️", color: "#0891B2", isSystem: true },
  { name: "Vestuário", icon: "👕", color: "#F43F5E", isSystem: true },
  { name: "Presentes", icon: "🎁", color: "#F97316", isSystem: true },
  { name: "Pets", icon: "🐾", color: "#84CC16", isSystem: true },
  { name: "Manutenção", icon: "🔧", color: "#64748B", isSystem: true },
  { name: "Tecnologia", icon: "💻", color: "#0EA5E9", isSystem: true },
  { name: "Outros", icon: "➕", color: "#78716C", isSystem: true },
]

async function main() {
  console.log("🌱 Seeding database...")

  // Create admin user
  const passwordHash = await bcrypt.hash("admin", 12)
  const admin = await prisma.user.upsert({
    where: { email: "admin@leiaute.app" },
    update: {},
    create: {
      email: "admin@leiaute.app",
      name: "Admin",
      passwordHash,
      emailVerified: new Date(),
    },
  })
  console.log(`✅ Admin user created: ${admin.email} (senha: admin)`)

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { id: `cat-${cat.name.toLowerCase()}` },
      update: {},
      create: {
        id: `cat-${cat.name.toLowerCase()}`,
        ...cat,
      },
    })
  }

  console.log("✅ Default categories created")
  console.log("🌱 Seed complete!")
  console.log("")
  console.log("🔑 Login credentials:")
  console.log("   Email: admin@leiaute.app")
  console.log("   Senha: admin")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
