import type { UserRole } from "@/lib/database.types";
import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  ListChecks,
  MessageCircle,
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

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const NAV_GROUPS_ALL: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Uebersicht", icon: LayoutDashboard, roles: ["owner", "manager", "staff"] }],
  },
  {
    label: "Heute",
    items: [
      { href: "/checklists/opening", label: "Checklisten", icon: ClipboardCheck, roles: ["owner", "manager", "staff"] },
      { href: "/tasks", label: "Aufgaben", icon: ListChecks, roles: ["owner", "manager", "staff"] },
      { href: "/chat", label: "Chat", icon: MessageCircle, roles: ["owner", "manager", "staff"] },
    ],
  },
  {
    label: "Bestand",
    items: [
      { href: "/inventory", label: "Inventar", icon: Package, roles: ["owner", "manager", "staff"] },
      { href: "/suppliers", label: "Lieferanten", icon: Truck, roles: ["owner", "manager"] },
      { href: "/menu", label: "Menue & Rezepte", icon: BookOpenText, roles: ["owner", "manager"] },
    ],
  },
  {
    label: "Wissen",
    items: [
      { href: "/handbuch", label: "Handbuch", icon: BookMarked, roles: ["owner", "manager", "staff"] },
      { href: "/training", label: "Training", icon: GraduationCap, roles: ["owner", "manager", "staff"] },
    ],
  },
  {
    label: "Verwaltung",
    items: [
      { href: "/reports", label: "Berichte", icon: BarChart3, roles: ["owner", "manager"] },
      { href: "/users", label: "Benutzer", icon: Users, roles: ["owner", "manager"] },
      { href: "/audit-log", label: "Audit-Log", icon: ScrollText, roles: ["owner", "manager"] },
      { href: "/settings/checklists", label: "Einstellungen", icon: Settings, roles: ["owner", "manager"] },
    ],
  },
];

export function navForRole(role: UserRole): NavGroup[] {
  return NAV_GROUPS_ALL.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}
