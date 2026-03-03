"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Rss,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/feed", label: "Feed", icon: Rss },
];

const STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  }

  return (
    <aside
      className="flex-shrink-0 flex flex-col border-r overflow-hidden transition-[width] duration-200"
      style={{
        width: collapsed ? 52 : 200,
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className={`flex items-center pt-2 ${collapsed ? 'justify-center' : 'justify-end px-2'}`}>
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center rounded transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>
      </div>

      <hr className="mt-2" style={{ borderColor: "var(--border-subtle)" }} />

      <nav className="flex flex-col gap-0.5 p-2 pt-1 flex-1">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="flex items-center rounded py-2 text-sm transition-colors"
              style={{
                gap: collapsed ? 0 : "0.625rem",
                justifyContent: collapsed ? "center" : undefined,
                paddingLeft: collapsed ? 0 : "0.75rem",
                paddingRight: collapsed ? 0 : "0.75rem",
                color: isActive
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                backgroundColor: isActive
                  ? "var(--bg-elevated)"
                  : "transparent",
                borderLeft: isActive
                  ? "2px solid var(--accent-blue)"
                  : "2px solid transparent",
              }}
            >
              <Icon size={15} strokeWidth={isActive ? 2 : 1.5} />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
