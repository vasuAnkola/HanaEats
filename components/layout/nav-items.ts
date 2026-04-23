import type { UserRole } from "@/lib/auth";
import {
  LayoutDashboard,
  Building2,
  Globe,
  Users,
  Store,
  UtensilsCrossed,
  ShoppingCart,
  ChefHat,
  Package,
  BarChart3,
  Settings,
  Armchair,
  MonitorCheck,
  Banknote,
  Clock,
  Truck,
  FlaskConical,
  CalendarDays,
  QrCode,
  UserCircle,
  Tag,
  Megaphone,
  Users2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavItem[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const INVENTORY_CHILDREN: NavItem[] = [
  { label: "Ingredients", href: "/dashboard/inventory/ingredients", icon: FlaskConical },
  { label: "Purchase Orders", href: "/dashboard/inventory/purchase-orders", icon: ShoppingCart },
  { label: "Vendors", href: "/dashboard/inventory/vendors", icon: Truck },
  { label: "Recipes", href: "/dashboard/inventory/recipes", icon: ChefHat },
];

export function getNavGroups(role: UserRole): NavGroup[] {
  if (role === "super_admin") {
    return [
      {
        title: "Platform",
        items: [
          { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
          { label: "Tenants", href: "/dashboard/tenants", icon: Building2 },
          { label: "Countries", href: "/dashboard/countries", icon: Globe },
        ],
      },
    ];
  }

  if (role === "admin") {
    return [
      {
        title: "Business",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "Outlets", href: "/dashboard/outlets", icon: Store },
          { label: "Team", href: "/dashboard/users", icon: Users },
        ],
      },
      {
        title: "Operations",
        items: [
          { label: "Menu", href: "/dashboard/menu", icon: UtensilsCrossed },
          { label: "POS", href: "/dashboard/pos", icon: MonitorCheck },
          { label: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
          { label: "Tables", href: "/dashboard/tables", icon: Armchair },
          { label: "Reservations", href: "/dashboard/reservations", icon: CalendarDays },
          { label: "QR Codes", href: "/dashboard/qr", icon: QrCode },
          { label: "Payments", href: "/dashboard/payments", icon: Banknote },
          { label: "Shifts", href: "/dashboard/shifts", icon: Clock },
          { label: "Inventory", href: "/dashboard/inventory", icon: Package, children: INVENTORY_CHILDREN },
          { label: "Customers", href: "/dashboard/customers", icon: UserCircle },
          { label: "Vouchers", href: "/dashboard/vouchers", icon: Tag },
          { label: "Promotions", href: "/dashboard/promotions", icon: Megaphone },
          { label: "Staff", href: "/dashboard/staff", icon: Users2 },
          { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
        ],
      },
      {
        title: "System",
        items: [
          { label: "Settings", href: "/dashboard/settings", icon: Settings },
        ],
      },
    ];
  }

  if (role === "manager") {
    return [
      {
        title: "Operations",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "Menu", href: "/dashboard/menu", icon: UtensilsCrossed },
          { label: "POS", href: "/dashboard/pos", icon: MonitorCheck },
          { label: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
          { label: "Tables", href: "/dashboard/tables", icon: Armchair },
          { label: "Reservations", href: "/dashboard/reservations", icon: CalendarDays },
          { label: "QR Codes", href: "/dashboard/qr", icon: QrCode },
          { label: "Payments", href: "/dashboard/payments", icon: Banknote },
          { label: "Shifts", href: "/dashboard/shifts", icon: Clock },
          { label: "Inventory", href: "/dashboard/inventory", icon: Package, children: INVENTORY_CHILDREN },
          { label: "Customers", href: "/dashboard/customers", icon: UserCircle },
          { label: "Vouchers", href: "/dashboard/vouchers", icon: Tag },
          { label: "Promotions", href: "/dashboard/promotions", icon: Megaphone },
          { label: "Staff", href: "/dashboard/staff", icon: Users2 },
          { label: "Team", href: "/dashboard/users", icon: Users },
          { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
        ],
      },
    ];
  }

  if (role === "cashier") {
    return [
      {
        title: "POS",
        items: [
          { label: "New Order", href: "/dashboard/pos", icon: MonitorCheck },
          { label: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
          { label: "Tables", href: "/dashboard/tables", icon: Armchair },
          { label: "Payments", href: "/dashboard/payments", icon: Banknote },
          { label: "Shifts", href: "/dashboard/shifts", icon: Clock },
        ],
      },
    ];
  }

  if (role === "waiter") {
    return [
      {
        title: "Service",
        items: [
          { label: "New Order", href: "/dashboard/pos", icon: MonitorCheck },
          { label: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
          { label: "Tables", href: "/dashboard/tables", icon: Armchair },
        ],
      },
    ];
  }

  if (role === "kitchen") {
    return [
      {
        title: "Kitchen",
        items: [
          { label: "KDS", href: "/dashboard/kds", icon: ChefHat },
        ],
      },
    ];
  }

  return [];
}
