import type { Step } from "react-joyride";
import type { UserRole } from "@/lib/auth";

const base: Partial<Step> = { skipBeacon: true };

export const SIDEBAR_STEPS: Record<UserRole, Step[]> = {
  super_admin: [
    { ...base, target: '[data-tour="nav-dashboard-tenants"]', title: "Tenants", content: "Every business running on HANAEats lives here. Click New Tenant to onboard one, which also creates its first admin login." },
    { ...base, target: '[data-tour="nav-dashboard-countries"]', title: "Countries", content: "Currency and tax rate per market — set once here, applied automatically to every outlet in that country." },
  ],
  admin: [
    { ...base, target: '[data-tour="nav-dashboard-outlets"]', title: "Outlets", content: "Register each physical branch here first — everything else (menu, staff, tables) belongs to one outlet." },
    { ...base, target: '[data-tour="nav-dashboard-users"]', title: "Team", content: "Invite managers, cashiers, waiters and kitchen staff, each scoped to one outlet." },
    { ...base, target: '[data-tour="nav-dashboard-menu"]', title: "Menu", content: "Build categories, items, sizes and add-ons for each outlet." },
    { ...base, target: '[data-tour="nav-dashboard-pos"]', title: "POS", content: "Where staff actually take orders — dine-in, takeaway, delivery or drive-thru." },
    { ...base, target: '[data-tour="nav-dashboard-reports"]', title: "Reports", content: "Revenue, top items and peak hours, any date range, exportable as CSV or PDF." },
    { ...base, target: '[data-tour="nav-dashboard-insights"]', title: "Insights", content: "Demand forecasting, upsell suggestions and margin alerts, built from your own order history." },
  ],
  manager: [
    { ...base, target: '[data-tour="nav-dashboard-menu"]', title: "Menu", content: "Add items and toggle availability the moment something sells out." },
    { ...base, target: '[data-tour="nav-dashboard-inventory"]', title: "Inventory", content: "Stock tracked automatically once recipes are linked to menu items — low-stock alerts included." },
    { ...base, target: '[data-tour="nav-dashboard-reports"]', title: "Reports", content: "Your outlet's performance — revenue, top sellers, and a 7-day demand forecast." },
  ],
  cashier: [
    { ...base, target: '[data-tour="nav-dashboard-pos"]', title: "New Order", content: "Your home screen — take an order and send it straight to the kitchen." },
    { ...base, target: '[data-tour="nav-dashboard-shifts"]', title: "Shifts", content: "Open your shift with a cash float before taking any payment, close it at the end of the day." },
    { ...base, target: '[data-tour="nav-dashboard-payments"]', title: "Payments", content: "Every payment you've taken, searchable by order." },
  ],
  waiter: [
    { ...base, target: '[data-tour="nav-dashboard-pos"]', title: "New Order", content: "Take a table's order here and send it to the kitchen instantly." },
    { ...base, target: '[data-tour="nav-dashboard-tables"]', title: "Tables", content: "See which tables are free, occupied or reserved at a glance." },
  ],
  kitchen: [
    { ...base, target: '[data-tour="nav-dashboard-kds"]', title: "Kitchen Display", content: "Every ticket — counter, table or delivery app — lands here the moment it's placed." },
  ],
};

export const POS_STEPS: Step[] = [
  { ...base, target: '[data-tour="pos-outlet"]', title: "Pick the outlet", content: "Switch outlets here if you work at more than one branch — the menu and tables update to match." },
  { ...base, target: '[data-tour="pos-categories"]', title: "Browse by category", content: "Tap a category to filter the menu grid below it." },
  { ...base, target: '[data-tour="pos-menu-grid"]', title: "Add an item", content: "Tap any dish to add it to the order. Items with sizes or add-ons open a quick customization popup first." },
  { ...base, target: '[data-tour="pos-order-type"]', title: "Choose the order type", content: "Dine-in prompts you to pick a table; takeaway, delivery and drive-thru skip straight to the cart." },
  { ...base, target: '[data-tour="pos-cart"]', title: "Review the order", content: "Everything added shows up here with the running total, tax included." },
  { ...base, target: '[data-tour="pos-place-order"]', title: "Send it to the kitchen", content: "One tap sends the order — it appears on the Kitchen Display screen immediately." },
];

export const OUTLETS_STEPS: Step[] = [
  { ...base, target: '[data-tour="outlets-add"]', title: "Add a branch", content: "Click here to register a new outlet — name, address, and it's ready to take orders." },
  { ...base, target: '[data-tour="outlets-table"]', title: "Manage existing outlets", content: "Every branch you've added shows up here — click one to edit its details or deactivate it." },
];

export const USERS_STEPS: Step[] = [
  { ...base, target: '[data-tour="users-add"]', title: "Invite a staff member", content: "Create a login for a manager, cashier, waiter or kitchen account, scoped to one outlet." },
  { ...base, target: '[data-tour="users-table"]', title: "Manage your team", content: "See everyone's role and status here — deactivate an account the moment someone leaves." },
];

export const KDS_STEPS: Step[] = [
  { ...base, target: '[data-tour="kds-pending"]', title: "New tickets land here", content: "The moment an order is placed — at the counter, at a table, or through a delivery app — it appears in this column." },
  { ...base, target: '[data-tour="kds-preparing"]', title: "Start cooking", content: "Tap “Start Preparing” on a ticket and it moves here, so everyone can see what's already underway." },
  { ...base, target: '[data-tour="kds-ready"]', title: "Ready to serve", content: "Mark it ready once it's plated — the cashier or waiter sees the update immediately." },
];
