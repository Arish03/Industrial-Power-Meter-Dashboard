"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, Settings, Sliders, Zap, User, LayoutDashboard, BotMessageSquare, Server, Network } from "lucide-react"

import { fetchDevices } from "@/lib/api"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
    navMain: [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Fleet View",
            url: "/fleet",
            icon: Network,
        },
        {
            title: "History",
            url: "/history",
            icon: Activity,
        },
        {
            title: "AI Assistant",
            url: "/ai",
            icon: BotMessageSquare,
        },
        {
            title: "Configuration",
            url: "/config",
            icon: Sliders,
        },
        {
            title: "Settings",
            url: "/settings",
            icon: Settings,
        },
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const [sites, setSites] = useState<Record<string, any[]>>({})

    useEffect(() => {
        fetchDevices()
            .then(data => { if (data) setSites(data) })
            .catch(err => console.error("Sidebar couldn't load devices", err))
    }, [])

    return (
        <Sidebar collapsible="icon" {...props} className="border-r">
            <SidebarHeader className="h-16 flex items-center justify-center border-b px-6">
                <div className="flex items-center gap-2 overflow-hidden w-full font-semibold">
                    <Activity className="h-6 w-6 text-primary shrink-0" />
                    <span className="truncate group-data-[collapsible=icon]:hidden">
                        Power Dashboard
                    </span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Application</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {data.navMain.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={pathname === item.url || (item.url === '/dashboard' && pathname.startsWith('/dashboard'))} tooltip={item.title}>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Sites</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {Object.keys(sites).length === 0 ? (
                                <div className="px-4 py-2 text-xs text-muted-foreground">Loading sites...</div>
                            ) : (
                                Object.entries(sites).map(([siteId, assets]) => (
                                    <SidebarMenuItem key={siteId}>
                                        <SidebarMenuButton className="font-semibold text-primary/80">
                                            <Server className="mr-2 h-4 w-4" />
                                            {siteId}
                                        </SidebarMenuButton>
                                        <div className="ml-4 mt-1 border-l pl-2 flex flex-col gap-1">
                                            {assets.map((asset) => {
                                                const href = `/dashboard/${siteId}/${asset.asset_id}`
                                                return (
                                                    <SidebarMenuButton
                                                        key={asset.asset_id}
                                                        asChild
                                                        isActive={pathname === href}
                                                        size="sm"
                                                    >
                                                        <Link href={href}>
                                                            <Zap className="h-3 w-3 mr-1" />
                                                            <span>{asset.asset_id}</span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                )
                                            })}
                                        </div>
                                    </SidebarMenuItem>
                                ))
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Profile">
                            <User />
                            <span>Admin User</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
