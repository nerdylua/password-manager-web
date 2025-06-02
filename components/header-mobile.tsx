"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Menu, Lock, BarChart3, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
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
    { href: "#extension", label: "Extension" },
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
        <SheetContent side="right" className="w-full max-w-[320px] sm:w-[320px] p-0">
          <VisuallyHidden>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center space-x-3 p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                CryptLock
              </span>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col px-6 py-4">
              <div className="space-y-1">
                {navigationLinks.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleNavClick(item.href)}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-lg text-sm transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium",
                      pathname === item.href
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* User Section */}
            <div className="mt-auto p-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              {user ? (
                <>
                  <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Welcome back</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {userProfile?.displayName || user.email?.split('@')[0]}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      onClick={() => {
                        handleDashboardAccess();
                        setOpen(false);
                      }}
                      variant="outline"
                      className="w-full justify-start h-11 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium"
                    >
                      <BarChart3 className="mr-3 h-4 w-4" />
                      {masterPasswordVerified ? 'Dashboard' : 'Sign In'}
                    </Button>
                    <Button 
                      onClick={() => {
                        handleLogout();
                        setOpen(false);
                      }}
                      variant="ghost"
                      className="w-full justify-start h-11 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <Link href="/auth/login" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full h-11 font-medium border-gray-300 dark:border-gray-600">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/register" onClick={() => setOpen(false)}>
                    <Button className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200">
                      Get Started Free
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
} 