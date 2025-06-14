"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Dialog, Transition } from "@headlessui/react";
import {
  X,
  Database,
  TestTube,
  LayoutDashboard,
  Settings,
  LogOut,
  User,
  Mail,
  FileText,
  Brain,
  Paperclip,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AutoSendrLogo } from "@/components/autosendr-logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Single Email Sender", href: "/single-email-sender", icon: TestTube },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    submenu: [
      { name: "Email Setup", href: "/email-setup", icon: Mail },
      { name: "Templates", href: "/templates", icon: FileText },
      { name: "AI Rules", href: "/ai-rules", icon: Brain },
      { name: "Attachments", href: "/attachments", icon: Paperclip },
      { name: "API Keys", href: "/api-keys", icon: Key },
    ],
  },
  { name: "Database", href: "/database", icon: Database },
];

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const UserSection = () => (
    <div className="mt-auto border-t border-border/50 pt-4">
      {session?.user && (
        <div className="flex items-center gap-x-3 px-2 py-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={session.user.image || ""}
              alt={session.user.name || ""}
            />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {session.user.name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {session.user.email}
            </p>
          </div>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-foreground"
        onClick={() => signOut({ callbackUrl: "/auth/signin" })}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );

  // Helper function to check if a submenu item is active
  const isSubmenuActive = (submenu: any[]) => {
    return submenu.some((item) => pathname === item.href);
  };

  const NavigationItems = ({ mobile = false }) => (
    <>
      {navigation.map((item) => {
        if (item.submenu) {
          // Settings section with submenu
          const isActive =
            pathname === item.href || isSubmenuActive(item.submenu);
          return (
            <li key={item.name}>
              <div className="space-y-1">
                {/* Settings Header - Now clickable */}
                <Link
                  href={item.href}
                  className={cn(
                    "group flex gap-x-3 items-center rounded-lg p-3 text-sm leading-6 font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  onClick={mobile ? () => setOpen(false) : undefined}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-all duration-200",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                  {pathname === item.href && (
                    <div className="ml-auto h-2 w-2 bg-primary-foreground rounded-full"></div>
                  )}
                </Link>

                {/* Submenu items */}
                <ul className="ml-6 space-y-1">
                  {item.submenu.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        href={subItem.href}
                        className={cn(
                          pathname === subItem.href
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                          "group flex gap-x-3 items-center rounded-lg p-2 pl-3 text-sm leading-6 font-medium"
                        )}
                        onClick={mobile ? () => setOpen(false) : undefined}
                      >
                        <subItem.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-all duration-200",
                            pathname === subItem.href
                              ? "text-primary-foreground"
                              : "text-muted-foreground group-hover:text-foreground"
                          )}
                          aria-hidden="true"
                        />
                        {subItem.name}
                        {pathname === subItem.href && (
                          <div className="ml-auto h-2 w-2 bg-primary-foreground rounded-full"></div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        } else {
          // Regular navigation item
          return (
            <li key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  pathname === item.href
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  "group flex gap-x-3 items-center rounded-lg p-3 text-sm leading-6 font-medium"
                )}
                onClick={mobile ? () => setOpen(false) : undefined}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-all duration-200",
                    pathname === item.href
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
                {item.name}
                {pathname === item.href && (
                  <div className="ml-auto h-2 w-2 bg-primary-foreground rounded-full"></div>
                )}
              </Link>
            </li>
          );
        }
      })}
    </>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5 transition-colors hover:bg-muted rounded-md"
                    onClick={() => setOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <X className="h-6 w-6 text-foreground" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border/50 bg-card/95 backdrop-blur-xl px-6 pb-4 shadow-2xl">
                  <div className="flex h-16 shrink-0 items-center">
                    <AutoSendrLogo size="md" />
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-2">
                          <NavigationItems mobile={true} />
                        </ul>
                      </li>
                    </ul>
                    <UserSection />
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border/50 bg-card/95 backdrop-blur-xl px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <AutoSendrLogo size="md" />
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-2">
                  <NavigationItems />
                </ul>
              </li>
            </ul>
            <UserSection />
          </nav>
        </div>
      </div>
    </>
  );
}
