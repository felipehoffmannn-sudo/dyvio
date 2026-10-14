import {
  Car, Gamepad2, Gift, GraduationCap, HeartPulse, Home, Lightbulb, Monitor, PawPrint,
  Plane, Receipt, Shirt, ShoppingCart, Tag, Utensils, Wrench, type LucideIcon,
} from "lucide-react"

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Moradia": Home,
  "Alimentação": Utensils,
  "Transporte": Car,
  "Lazer": Gamepad2,
  "Contas": Lightbulb,
  "Supermercado": ShoppingCart,
  "Saúde": HeartPulse,
  "Educação": GraduationCap,
  "Viagem": Plane,
  "Vestuário": Shirt,
  "Presentes": Gift,
  "Pets": PawPrint,
  "Manutenção": Wrench,
  "Tecnologia": Monitor,
  "Outros": Tag,
}

export function getCategoryIcon(categoryName?: string | null): LucideIcon {
  return CATEGORY_ICONS[categoryName || ""] || Receipt
}
