"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users2,
  UserCog,
  ShieldCheck,
  ListChecks,
  Inbox,
  Target,
  BarChart3,
  Settings,
  ChevronDown,
  Eye,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils/cn";
import { t } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth.store";
import {
  hasAnyPermission,
  PERMISSIONS,
  type Permission,
} from "@/constants/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Exact match instead of prefix match. */
  exact?: boolean;
  /** Hide this item unless the user holds at least one of these permissions. */
  requiredAnyPermission?: Permission[];
  /** Sub-pages (e.g. View / Add) revealed when the group is expanded. */
  children?: NavItem[];
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

function buildGroups(): NavGroup[] {
  const viewAdd = (listHref: string, newHref: string): NavItem[] => [
    { href: listHref, label: t("dashboard.viewAll"), icon: Eye, exact: true },
    { href: newHref, label: t("dashboard.addNew"), icon: Plus },
  ];

  return [
    {
      label: null,
      items: [
        {
          href: ROUTES.DASHBOARD,
          label: t("dashboard.overview"),
          icon: LayoutDashboard,
          exact: true,
        },
      ],
    },
    {
      label: t("dashboard.navProperty"),
      items: [
        {
          href: ROUTES.DASHBOARD_LISTINGS,
          label: t("dashboard.listings"),
          icon: Building2,
          children: viewAdd(
            ROUTES.DASHBOARD_LISTINGS,
            ROUTES.DASHBOARD_LISTING_NEW,
          ),
        },
      ],
    },
    {
      label: t("dashboard.navCrm"),
      items: [
        {
          href: ROUTES.DASHBOARD_LEADS,
          label: t("dashboard.leads"),
          icon: Users2,
          children: viewAdd(ROUTES.DASHBOARD_LEADS, ROUTES.DASHBOARD_LEAD_NEW),
        },
        {
          href: ROUTES.DASHBOARD_LEADS_ARRIVED,
          label: t("dashboard.leadsArrived"),
          icon: Inbox,
          exact: true,
        },
        {
          href: ROUTES.DASHBOARD_MATCHED_LEADS,
          label: t("dashboard.matchedLeads"),
          icon: Target,
          exact: true,
          requiredAnyPermission: [
            PERMISSIONS.VIEW_MATCHED_LEADS,
            PERMISSIONS.MANAGE_LEADS,
          ],
        },
        {
          href: ROUTES.DASHBOARD_TASKS,
          label: t("dashboard.tasks"),
          icon: ListChecks,
        },
      ],
    },
    {
      label: t("dashboard.navTeam"),
      items: [
        {
          href: ROUTES.DASHBOARD_EMPLOYEES,
          label: t("dashboard.employees"),
          icon: UserCog,
          children: viewAdd(
            ROUTES.DASHBOARD_EMPLOYEES,
            ROUTES.DASHBOARD_EMPLOYEE_NEW,
          ),
        },
        {
          href: ROUTES.DASHBOARD_EMPLOYEE_PERMISSIONS,
          label: t("dashboard.permissionGroupsNav"),
          icon: ShieldCheck,
        },
      ],
    },
    {
      label: t("dashboard.navInsights"),
      items: [
        {
          href: ROUTES.DASHBOARD_KPI,
          label: t("dashboard.kpi"),
          icon: BarChart3,
        },
        {
          href: ROUTES.DASHBOARD_SETTINGS,
          label: t("dashboard.settings"),
          icon: Settings,
        },
      ],
    },
  ];
}

function matches(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  // Employees vs Permission Groups stay mutually exclusive.
  if (item.href === ROUTES.DASHBOARD_EMPLOYEES) {
    return (
      pathname === item.href ||
      (pathname.startsWith(`${item.href}/`) &&
        !pathname.startsWith(ROUTES.DASHBOARD_EMPLOYEE_PERMISSIONS))
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const baseRow =
  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";

function itemClasses(active: boolean): string {
  return cn(
    baseRow,
    active
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

export function DashboardSidebar() {
  const pathname = usePathname() || "";
  const permissions = useAuthStore((s) => s.user?.permissions);
  const groups = React.useMemo(() => {
    return buildGroups()
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            !item.requiredAnyPermission ||
            hasAnyPermission(permissions, item.requiredAnyPermission),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [permissions]);
  // Manual expand overrides; undefined => follow active state.
  const [overrides, setOverrides] = React.useState<Record<string, boolean>>({});

  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {groups.map((group, gi) => (
        <div key={group.label ?? `g-${gi}`} className="flex flex-col gap-1">
          {group.label && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = matches(pathname, item);

            if (!item.children) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  aria-current={active ? "page" : undefined}
                  className={itemClasses(active)}
                >
                  <Icon
                    className="h-[18px] w-[18px] shrink-0"
                    aria-hidden
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            }

            const expanded = overrides[item.href] ?? active;

            return (
              <div key={item.href}>
                <div className={cn(itemClasses(active), "pe-1")}>
                  <Link
                    href={item.href}
                    prefetch
                    aria-current={active ? "page" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <Icon
                      className="h-[18px] w-[18px] shrink-0"
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                  <button
                    type="button"
                    aria-label={
                      expanded ? t("dashboard.closeMenu") : t("dashboard.openMenu")
                    }
                    aria-expanded={expanded}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOverrides((prev) => ({
                        ...prev,
                        [item.href]: !expanded,
                      }));
                    }}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        expanded && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                </div>

                {expanded && (
                  <div className="mt-1 flex flex-col gap-1 ps-9">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = matches(pathname, child);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          prefetch
                          aria-current={childActive ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                            childActive
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <ChildIcon
                            className="h-4 w-4 shrink-0"
                            aria-hidden
                          />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
