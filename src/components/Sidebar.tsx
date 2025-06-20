import { Button } from "@/components/ui/button";
import { DashboardIcon, EventsIcon, LogoutIcon, ProfileIcon } from "@/components/ui/sidebar-icons";
import { cn } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/nextjs";
import { X } from "lucide-react";
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

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ onClose, isMobile = false }: SidebarProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className={cn(
      "h-screen bg-white-50",
      isMobile ? "p-4" : "p-6"
    )}>
      <div className={cn(
        "text-white flex flex-col h-full rounded-xl",
        isMobile ? "w-full" : "w-64"
      )} style={{ backgroundColor: '#36A2DB' }}>
        
        {/* Mobile close button */}
        {isMobile && onClose && (
          <div className="flex justify-end p-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 p-1"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Logo/Brand Section */}
        <div className={cn(
          "p-2",
          isMobile && "pt-0"
        )}>
          <SnapClickBangLogo className="w-full h-auto" />
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
                  <Link href={item.href} onClick={isMobile ? onClose : undefined}>
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
        <div className="border-t border-white/20"></div>

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