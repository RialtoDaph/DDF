import type { UserRole } from "@/lib/database.types";
import {
  LayoutDashboard,
  Package,
  Sunrise,
  Moon,
  CalendarDays,
  CalendarRange,
  ListChecks,
  Truck,
  BookOpenText,
  BookMarked,
  BarChart3,
  Users,
  GraduationCap,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Uebersicht", icon: LayoutDashboard, roles: ["owner", "manager", "staff"] },
  { href: "/inventory", label: "Inventar", icon: Package, roles: ["owner", "manager", "staff"] },
  { href: "/checklists/opening", label: "Opening", icon: Sunrise, roles: ["owner", "manager", "staff"] },
  { href: "/checklists/closing", label: "Closing", icon: Moon, roles: ["owner", "manager", "staff"] },
  { href: "/checklists/weekly", label: "Wochencheck", icon: CalendarDays, roles: ["owner", "manager", "staff"] },
  { href: "/checklists/monthly", label: "Monatscheck", icon: CalendarRange, roles: ["owner", "manager", "staff"] },
  { href: "/tasks", label: "Aufgaben", icon: ListChecks, roles: ["owner", "manager", "staff"] },
  { href: "/suppliers", label: "Lieferanten", icon: Truck, roles: ["owner", "manager"] },
  { href: "/menu", label: "Menue & Rezepte", icon: BookOpenText, roles: ["owner", "manager"] },
  { href: "/reports", label: "Berichte", icon: BarChart3, roles: ["owner", "manager"] },
  { href: "/handbuch", label: "Handbuch", icon: BookMarked, roles: ["owner", "manager", "staff"] },
  { href: "/training", label: "Training", icon: GraduationCap, roles: ["owner", "manager", "staff"] },
  { href: "/users", label: "Benutzer", icon: Users, roles: ["owner", "manager"] },
  { href: "/audit-log", label: "Audit-Log", icon: ScrollText, roles: ["owner", "manager"] },
  { href: "/settings/checklists", label: "Einstellungen", icon: Settings, roles: ["owner", "manager"] },
];

export function navForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
