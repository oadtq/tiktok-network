import {
  BarChart3,
  Bot,
  FileVideo,
  Shield,
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
    label: "Proxies",
    href: "/admin/proxies",
    icon: Shield,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "All Clips",
    href: "/admin/clips",
    icon: FileVideo,
  },
  {
    label: "Automations",
    href: "/admin/automations",
    icon: Bot,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
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
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
];
