import { redirect } from "next/navigation"

// Expenses are created from the group page dialog.
export default function NewExpensePage({ params }: { params: { id: string } }) {
  redirect(`/groups/${params.id}`)
}
