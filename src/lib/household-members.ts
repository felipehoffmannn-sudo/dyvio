import { prisma } from "@/lib/prisma"
import { isHouseholdMode } from "@/lib/household"

const SYSTEM_ADMIN_EMAIL = "admin@leiaute.app"

/** In household mode, every active user except the system admin and `userId` joins new groups automatically. */
export async function householdPartners(userId: string) {
  if (!isHouseholdMode()) return []
  return prisma.user.findMany({
    where: { id: { not: userId }, deletedAt: null, email: { not: SYSTEM_ADMIN_EMAIL } },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  })
}
