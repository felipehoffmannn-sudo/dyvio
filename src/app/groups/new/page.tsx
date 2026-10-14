import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/data-cache"
import { householdPartners } from "@/lib/household-members"
import { NewGroupForm } from "./form"

export default async function NewGroupPage() {
  const user = await getSessionUser()
  if (!user) redirect("/auth/login")

  const partners = await householdPartners(user.id)
  return <NewGroupForm partnerNames={partners.map(p => p.name ?? "").filter(Boolean)} />
}
