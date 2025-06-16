import { Button } from "@/components/ui/button";
import { DashboardIcon, EventsIcon, LogoutIcon, ProfileIcon } from "@/components/ui/sidebar-icons";
import { cn } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";



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
    <div className="w-64 text-white flex flex-col h-screen" style={{ backgroundColor: '#36A2DB' }}>
      {/* Logo/Brand Section */}
      <div className="p-6 border-b border-blue-300/30">
        
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
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
                      "w-full justify-start text-left text-white hover:bg-white/20 hover:text-white",
                      isActive && "bg-white/30 text-white font-semibold"
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-blue-300/30">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-left text-white hover:bg-white/20 hover:text-white"
        >
          <LogoutIcon className="mr-3 h-5 w-5" />
          Log out
        </Button>
      </div>
    </div>
  );
} 