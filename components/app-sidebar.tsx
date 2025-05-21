import { ChevronUp, CreditCard, Home, Inbox, LogOut, Logs, ShieldCheck, UserCheck } from "lucide-react"
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { auth, signOut } from "@/auth";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import AccountSetting from "./account-setting";


const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Servers",
    url: "/dashboard/servers",
    icon: Inbox,
  },
  {
    title: "Verified Members",
    url: "/dashboard/members",
    icon: UserCheck,
  },
  {
    title: "Backups",
    url: "/dashboard/backups",
    icon: ShieldCheck,
  },
  {
    title: "BlackList",
    url: "/dashboard/blacklist",
    icon: Logs,
  },
]

export async function AppSidebar() {
    const session = await auth();
  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="block font-bold text-2xl text-center transition-transform duration-300 ease-in-out transform hover:scale-105">Loggify</Link>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
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
      </SidebarContent>
        <Separator />
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <Avatar>
                        <AvatarImage src={session?.user?.image ?? "?"} />
                        <AvatarFallback>
                            {session?.user?.name?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="ml-2">{session?.user?.name}</span>
                    <ChevronUp className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-popper-anchor-width]"
                >
                  <DropdownMenuItem>
                    <AccountSetting />
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <p className="flex items-center"><span className="mr-2"><CreditCard /></span>Billing</p>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <form action={async () => {
                      "use server";
                      await signOut();
                    }}>
                      <button type="submit" className="flex items-center"><span className="mr-2"><LogOut /></span>Sign out</button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
  )
}
