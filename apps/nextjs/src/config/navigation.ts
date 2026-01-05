import {
  BarChart3,
  Home,
  Smartphone,
  Users,
  Video,
} from "lucide-react";

export const adminNavItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: Home,
  },
  {
    label: "TikTok Accounts",
    href: "/admin/tiktok-accounts",
    icon: Video,
  },
  {
    label: "Cloud Phones",
    href: "/admin/cloud-phones",
    icon: Smartphone,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Statistics",
    href: "/admin/statistics",
    icon: BarChart3,
  },
];

export const creatorNavItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Statistics",
    href: "/dashboard/statistics",
    icon: BarChart3,
  },
];
