import { Button } from "@/components/ui/button";
import { DashboardIcon, EventsIcon, LogoutIcon, ProfileIcon } from "@/components/ui/sidebar-icons";
import { cn } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SnapClickBangLogo from "./ui/snapclickbang-logo";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: DashboardIcon,
  },
  {
    name: "Events",
    href: "/dashboard/events",
    icon: EventsIcon,
  },
  {
    name: "Profile",
    href: "/dashboard/profile",
    icon: ProfileIcon,
  },
];

export default function Sidebar() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="h-screen w-64 flex-shrink-0">
      <div className="w-full text-white flex flex-col h-full rounded-xl" style={{ backgroundColor: '#36A2DB' }}>
        {/* Logo/Brand Section */}
        <div className="p-4">
          <SnapClickBangLogo className="w-full h-auto max-w-full" />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-left text-base font-medium hover:bg-white/20 hover:text-white py-3 gap-3 font-inter",
                        isActive && "bg-white/30 font-semibold"
                      )}
                      style={{ color: '#FFFFFF', fontSize: '16px' }}
                    >
                      <Icon className="h-6 w-6 flex-shrink-0" />
                      <span>{item.name}</span>
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Divider */}
        <div className="border-t border-white/20 mx-3"></div>

        {/* User Info & Logout */}
        <div className="p-3">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-left text-base font-medium hover:bg-white/20 hover:text-white py-3 gap-3 font-inter"
            style={{ color: '#FFFFFF', fontSize: '16px' }}
          >
            <LogoutIcon className="h-6 w-6 flex-shrink-0" />
            <span>Log out</span>
          </Button>
        </div>
      </div>
    </div>
  );
} 