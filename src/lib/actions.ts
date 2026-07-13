"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

// ——— HELPERS ———

async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Error("Não autenticado")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) throw new Error("Usuário não encontrado")
  return user
}

// ——— AUTH ACTIONS ———

export async function registerUser(formData: FormData): Promise<void> {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!name || !email || !password) {
    throw new Error("Todos os campos são obrigatórios.")
  }

  if (password.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.")
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new Error("Este email já está cadastrado.")
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  })

  redirect("/auth/login?registered=true")
}

// ——— GROUP ACTIONS ———

export async function createGroup(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  const name = formData.get("name") as string
  const description = formData.get("description") as string

  if (!name || name.trim().length === 0) {
    throw new Error("Nome do grupo é obrigatório.")
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      createdBy: user.id,
      members: {
        create: [
          { userId: user.id, role: "OWNER" },
          { userId: "user2_test", role: "MEMBER" },
        ],
      },
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/groups")
  redirect(`/groups/${group.id}`)
}

export async function inviteMember(groupId: string, email: string) {
  const user = await getCurrentUser()

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: user.id, leftAt: null },
  })
  if (!membership || membership.role === "MEMBER") {
    return { error: "Você não tem permissão para convidar membros." }
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias

  await prisma.invite.create({
    data: {
      groupId,
      email,
      token,
      invitedBy: user.id,
      expiresAt,
    },
  })

  // TODO: Send email notification

  revalidatePath(`/groups/${groupId}`)
  return { success: true, token }
}

export async function createShareableInvite(groupId: string) {
  const user = await getCurrentUser()

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: user.id, leftAt: null },
  })
  if (!membership || membership.role === "MEMBER") {
    return { error: "Você não tem permissão para convidar membros." }
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.invite.create({
    data: {
      groupId,
      email: "",
      token,
      invitedBy: user.id,
      expiresAt,
    },
  })

  revalidatePath(`/groups/${groupId}`)
  return { success: true, token }
}

export async function removeMember(groupId: string, memberId: string) {
  const user = await getCurrentUser()

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: user.id, leftAt: null },
  })
  if (!membership || membership.role === "MEMBER") {
    return { error: "Você não tem permissão para remover membros." }
  }

  const target = await prisma.groupMember.findFirst({
    where: { groupId, userId: memberId, leftAt: null },
  })
  if (!target) return { error: "Membro não encontrado." }
  if (target.role === "OWNER") return { error: "Não é possível remover o dono do grupo." }

  await prisma.groupMember.update({
    where: { id: target.id },
    data: { leftAt: new Date() },
  })

  revalidatePath(`/groups/${groupId}`)
  return { success: true }
}

export async function leaveGroup(groupId: string) {
  const user = await getCurrentUser()

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: user.id, leftAt: null },
  })
  if (!membership) return { error: "Você não é membro deste grupo." }
  if (membership.role === "OWNER") {
    return { error: "O dono do grupo não pode sair. Transfira a propriedade primeiro." }
  }

  await prisma.groupMember.update({
    where: { id: membership.id },
    data: { leftAt: new Date() },
  })

  revalidatePath(`/groups/${groupId}`)
  redirect("/dashboard")
}

export async function deleteGroup(groupId: string) {
  const user = await getCurrentUser()

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: user.id, leftAt: null, role: "OWNER" },
  })
  if (!membership) return { error: "Apenas o dono pode excluir o grupo." }

  // Delete all related records first
  await prisma.$transaction([
    prisma.expenseParticipant.deleteMany({ where: { expense: { groupId } } }),
    prisma.expense.deleteMany({ where: { groupId } }),
    prisma.ledgerEntry.deleteMany({ where: { groupId } }),
    prisma.invite.deleteMany({ where: { groupId } }),
    prisma.groupMember.deleteMany({ where: { groupId } }),
    prisma.group.delete({ where: { id: groupId } }),
  ])

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/groups")
  redirect("/dashboard")
}

export async function archiveGroup(groupId: string) {
  const user = await getCurrentUser()

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: user.id, leftAt: null, role: "OWNER" },
  })
  if (!membership) return { error: "Apenas o dono pode arquivar o grupo." }

  await prisma.group.update({
    where: { id: groupId },
    data: { isArchived: true, archivedAt: new Date() },
  })

  revalidatePath("/dashboard")
  revalidatePath(`/groups/${groupId}`)
  redirect("/dashboard")
}
