import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { createGroup } from "@/lib/actions"
import { NewGroupForm } from "./form"

export default async function NewGroupPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/login")

  return <NewGroupForm />
}
