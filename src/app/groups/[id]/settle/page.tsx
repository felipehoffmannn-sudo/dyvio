import { redirect } from "next/navigation"

export default function SettlementPage({ params }: { params: { id: string } }) {
  redirect(`/groups/${params.id}`)
}
