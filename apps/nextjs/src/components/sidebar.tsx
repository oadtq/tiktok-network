"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { authClient } from "~/auth/client";

export interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

export interface SidebarProps {
  user: {
    name: string;
    email: string;
    role?: string;
  };
  title: string;
  logoIcon: React.ElementType;
  items: NavItem[];
  bottomContent?: React.ReactNode;
}

function NavItemComponent({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="size-5" />
        {item.label}
      </div>
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className={`flex size-5 items-center justify-center rounded-full text-xs font-medium ${
            isActive
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({
  user,
  title,
  logoIcon: LogoIcon,
  items,
  bottomContent,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="border-border bg-sidebar sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r">
      {/* Logo */}
      <div className="border-border flex h-16 items-center gap-3 border-b px-6">
        <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
          <LogoIcon className="text-primary-foreground size-4" />
        </div>
        <span className="text-lg font-semibold tracking-tight">{title}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            isActive={pathname === item.href}
          />
        ))}

        {bottomContent && (
          <>
            <div className="border-border my-4 border-t" />
            {bottomContent}
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="border-border border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-medium text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-foreground truncate text-sm font-medium">
              {user.name}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {user.role === "admin" ? "Admin" : user.email}
            </p>
          </div>
          <button
            onClick={() => {
              void authClient.signOut().then(() => {
                window.location.href = "/";
              });
            }}
            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-2 transition-colors"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
