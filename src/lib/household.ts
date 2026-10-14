/** Uso pessoal / casal — entrada sem senha via /dev-login */
export function isHouseholdMode(): boolean {
  return process.env.DYVIO_HOUSEHOLD === "true"
}

export function isPasswordlessEntryEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || isHouseholdMode()
}

export function passwordlessLoginPath(): string {
  return "/dev-login"
}

export function signInPath(): string {
  return isPasswordlessEntryEnabled() ? passwordlessLoginPath() : "/auth/login"
}

/** Em produção com modo casal, opcional: HOUSEHOLD_SECRET na URL (?key=...) */
export function isHouseholdEntryAuthorized(key: string | null): boolean {
  if (!isPasswordlessEntryEnabled()) return false
  if (process.env.NODE_ENV !== "production") return true

  const secret = process.env.HOUSEHOLD_SECRET
  if (!secret) return true
  return key === secret
}

export function householdQuerySuffix(): string {
  const secret = process.env.HOUSEHOLD_SECRET
  if (!secret || process.env.NODE_ENV !== "production") return ""
  return `&key=${encodeURIComponent(secret)}`
}
