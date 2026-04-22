import type { UserRole } from "@/lib/auth";

const ROLE_LEVEL: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  manager: 60,
  cashier: 40,
  waiter: 30,
  kitchen: 20,
};

export function hasRole(userRole: UserRole, required: UserRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[required];
}

export function isSuperAdmin(role: UserRole) {
  return role === "super_admin";
}

export function canManageMenu(role: UserRole) {
  return hasRole(role, "manager");
}

export function canManageUsers(role: UserRole) {
  return hasRole(role, "admin");
}

export function canAccessPOS(role: UserRole) {
  return hasRole(role, "cashier");
}

export function canViewKDS(role: UserRole) {
  return hasRole(role, "kitchen");
}
