"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Lock, BarChart3, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import type { User } from 'firebase/auth'

interface UserProfile {
  displayName?: string;
  email?: string;
}

interface NavigationMobileProps {
  user: User | null;
  userProfile: UserProfile | null;
  masterPasswordVerified: boolean;
  handleDashboardAccess: () => void;
  handleLogout: () => void;
  isScrolled: boolean;
}

export function NavigationMobile({ 
  user, 
  userProfile, 
  masterPasswordVerified, 
  handleDashboardAccess, 
  handleLogout,
  isScrolled 
}: NavigationMobileProps) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  const navigationLinks = [
    { href: "#features", label: "Features" },
    { href: "#privacy", label: "Privacy Proof" },
    { href: "#about", label: "About" },
  ];

  const handleNavClick = (href: string) => {
    setOpen(false);
    if (href.startsWith('#')) {
      // Smooth scroll to section
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="md:hidden flex items-center space-x-2">
      <ThemeToggle />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              isScrolled ? "h-8 w-8" : "h-10 w-10"
            )}
          >
            <Menu className={cn("text-gray-600 dark:text-gray-400", isScrolled ? "h-4 w-4" : "h-5 w-5")} />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full max-w-[300px] sm:w-[300px]">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center space-x-3 pb-6 border-b">
              <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                CryptLock
              </span>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-4 py-6">
              {navigationLinks.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "text-left text-sm transition-colors hover:text-blue-600 dark:hover:text-blue-400 py-2",
                    pathname === item.href
                      ? "text-blue-600 dark:text-blue-400 font-medium"
                      : "text-gray-600 dark:text-gray-400"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* User Section */}
            <div className="mt-auto pt-6 border-t space-y-4">
              {user ? (
                <>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Welcome, {userProfile?.displayName || user.email?.split('@')[0]}
                  </div>
                  <Button 
                    onClick={() => {
                      handleDashboardAccess();
                      setOpen(false);
                    }}
                    variant="outline"
                    className="w-full justify-start border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    {masterPasswordVerified ? 'Dashboard' : 'Sign In'}
                  </Button>
                  <Button 
                    onClick={() => {
                      handleLogout();
                      setOpen(false);
                    }}
                    variant="ghost"
                    className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/register" onClick={() => setOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                      Get Started Free
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
} 