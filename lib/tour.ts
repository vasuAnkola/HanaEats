"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { UserRole } from "@/lib/auth";

interface TourUser { userId: string; role: UserRole; }
const TourUserContext = createContext<TourUser>({ userId: "anon", role: "cashier" });
export const TourUserProvider = TourUserContext.Provider;
export function useTourUser() {
  return useContext(TourUserContext);
}

export interface TourSlide {
  title: string;
  body: string;
  emoji: string;
}

// One short welcome tour per role — shown once, re-openable from Settings.
const TOURS: Record<UserRole, TourSlide[]> = {
  super_admin: [
    { emoji: "🌏", title: "Welcome, Super Admin", body: "This is platform control — every business (tenant) that runs on HANAEats lives here." },
    { emoji: "🏢", title: "Onboard a business", body: "Go to Tenants → New Tenant. One form creates the business and its first admin login together." },
    { emoji: "🌐", title: "Countries set the rules", body: "Countries defines currency and tax per market — Singapore's GST, Malaysia's SST, and so on — applied automatically to every outlet in that country." },
  ],
  admin: [
    { emoji: "👋", title: "Welcome to your dashboard", body: "Everything for your business lives here — outlets, menu, staff, orders and reports, all in one place." },
    { emoji: "🏬", title: "Start with an outlet", body: "Outlets → New Outlet registers a physical branch. Everything else (menu, staff, tables) belongs to one outlet." },
    { emoji: "🍜", title: "Then build the menu", body: "Menu → pick the outlet → add a category, then items with prices, sizes and add-ons." },
    { emoji: "👥", title: "Invite your team", body: "Team → Invite creates logins for managers, cashiers, waiters and kitchen staff, scoped to one outlet each." },
    { emoji: "📊", title: "Watch it add up", body: "Reports and Insights update live as orders come in — revenue, top items, and a 7-day demand forecast." },
  ],
  manager: [
    { emoji: "👋", title: "Welcome back", body: "You run day-to-day operations for your outlet(s) — menu, stock, staff and takings." },
    { emoji: "🍜", title: "Keep the menu current", body: "Menu → toggle an item off the moment it sells out, no need to delete it." },
    { emoji: "📦", title: "Watch your stock", body: "Inventory flags low stock automatically once recipes are linked to menu items." },
    { emoji: "📊", title: "Check performance", body: "Reports shows revenue and top sellers for your outlet; Insights adds a demand forecast." },
  ],
  cashier: [
    { emoji: "🧾", title: "Welcome to the till", body: "Open your shift first — Shifts → Open Shift with a starting cash float." },
    { emoji: "🛒", title: "Take an order", body: "Tap menu items to add them to the cart, customize size/add-ons, then Place Order — it's on the kitchen screen instantly." },
    { emoji: "💳", title: "Collect payment", body: "Split across cash, card or e-wallet in one go — change is calculated for you." },
  ],
  waiter: [
    { emoji: "🍽️", title: "Welcome", body: "Take orders at the table and send them straight to the kitchen — no paper docket needed." },
    { emoji: "🪑", title: "Pick a table first", body: "For dine-in orders, choose the table before adding items, so the kitchen ticket shows where it's going." },
  ],
  kitchen: [
    { emoji: "👨‍🍳", title: "Welcome to the kitchen screen", body: "Every order — counter, table, or delivery app — lands here the moment it's placed." },
    { emoji: "✅", title: "Mark it as you go", body: "Tap an item when it's ready, then mark the whole order ready once everything's plated." },
  ],
};

export function getTourSlides(role: UserRole): TourSlide[] {
  return TOURS[role] ?? [];
}

// "Seen" is persisted server-side on the user's own row (see /api/account,
// welcome_tour_seen_at) rather than in localStorage, which resets on a cleared
// browser or a different device and made the tour reappear for accounts that
// had already dismissed it. `hasSeenTour` comes from the server-rendered layout.
export function useWelcomeTour(userId: string, hasSeenTour: boolean) {
  const [open, setOpen] = useState(!hasSeenTour);

  function close() {
    setOpen(false);
    fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ welcome_tour_seen: true }),
    }).catch(() => {});
  }

  function restart() {
    setOpen(true);
    fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ welcome_tour_seen: false }),
    }).catch(() => {});
  }

  return { open, close, restart };
}

function pageTourKey(pageId: string, userId: string) {
  return `hanaeats_pagetour_${pageId}_${userId}`;
}

/** Drives a button-by-button Joyride tour for one page: auto-runs once per user, restartable on demand. */
export function usePageTour(pageId: string, userId: string) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    let seen = true;
    try { seen = !!localStorage.getItem(pageTourKey(pageId, userId)); } catch {}
    if (seen) return;
    // Let the page's own data finish rendering before Joyride looks for targets.
    const timer = setTimeout(() => setRun(true), 700);
    return () => clearTimeout(timer);
  }, [pageId, userId]);

  function finish() {
    setRun(false);
    try { localStorage.setItem(pageTourKey(pageId, userId), "1"); } catch {}
  }

  function start() {
    setRun(true);
  }

  return { run, finish, start };
}
