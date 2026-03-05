"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Bot,
    Settings2,
    Settings,
    Zap,
    LogOut,
    LogIn,
    UserPlus,
    User,
} from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "AI Assistant", href: "/ai", icon: Bot },
    { label: "Config", href: "/config", icon: Settings2 },
    { label: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
    const pathname = usePathname();

    return (
        <Sidebar collapsible="offcanvas" className="border-r border-border">
            {/* ── Brand Header ── */}
            <SidebarHeader className="pb-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Zap className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold text-sm">Power Monitor</span>
                                    <span className="text-xs text-muted-foreground">LANSUB PMU</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarSeparator />

            {/* ── Navigation ── */}
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarMenu>
                        {navItems.map(({ label, href, icon: Icon }) => {
                            const isActive = pathname === href || pathname.startsWith(href + "/");
                            return (
                                <SidebarMenuItem key={href}>
                                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                                        <Link href={href}>
                                            <Icon className="size-4" />
                                            <span>{label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator />

            {/* ── User Profile Footer ── */}
            <SidebarFooter className="pb-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent"
                                    tooltip="User Profile"
                                >
                                    <Avatar className="size-8 rounded-lg">
                                        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                                            AR
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col gap-0.5 leading-none text-left">
                                        <span className="font-semibold text-sm">Arish</span>
                                        <span className="text-xs text-muted-foreground">arish@lansub.com</span>
                                    </div>
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                side="top"
                                align="start"
                                className="w-56 mb-1"
                            >
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-sm font-medium">Arish</p>
                                        <p className="text-xs text-muted-foreground">arish@lansub.com</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <User className="size-4 mr-2" />
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <UserPlus className="size-4 mr-2" />
                                    Sign Up
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <LogIn className="size-4 mr-2" />
                                    Log In
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                    <LogOut className="size-4 mr-2" />
                                    Log Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
