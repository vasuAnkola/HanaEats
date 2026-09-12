"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  tenants: "Tenants",
  outlets: "Outlets",
  users: "Users",
  countries: "Countries",
  menu: "Menu",
  pos: "POS",
  orders: "Orders",
  tables: "Tables",
  payments: "Payments",
  shifts: "Shifts",
  inventory: "Inventory",
  ingredients: "Ingredients",
  "purchase-orders": "Purchase Orders",
  vendors: "Vendors",
  recipes: "Recipes",
  reports: "Reports",
  settings: "Settings",
  kds: "KDS",
  new: "New",
  edit: "Edit",
};

function getLabel(segment: string): string {
  return SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

function isId(segment: string): boolean {
  return /^\d+$/.test(segment) || /^[0-9a-f-]{36}$/i.test(segment);
}

// Segments that only ever appear as part of a deeper route (e.g. .../items/new,
// .../items/[itemId]) and have no listing page of their own to link to.
const NON_NAVIGABLE_SEGMENTS = new Set(["items"]);

export function AppBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Build crumb list — skip numeric IDs as standalone crumbs
  const crumbs: { label: string; href: string; navigable: boolean }[] = [];
  let path = "";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    path += `/${seg}`;

    if (isId(seg)) {
      // Merge ID into previous crumb label as "(#id)" or skip
      continue;
    }

    crumbs.push({ label: getLabel(seg), href: path, navigable: !NON_NAVIGABLE_SEGMENTS.has(seg) });
  }

  if (crumbs.length <= 1) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={crumb.href} className="flex items-center gap-1.5">
              <BreadcrumbItem>
                {isLast || !crumb.navigable ? (
                  <BreadcrumbPage className={isLast ? "text-gray-900 font-medium text-sm" : "text-gray-400 text-sm"}>
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={<Link href={crumb.href} />}
                    className="text-gray-400 hover:text-gray-700 text-sm transition-colors"
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="text-gray-300" />}
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
