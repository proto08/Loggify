"use client";
import { ColumnDef } from "@tanstack/react-table";
import { UserData } from "@/lib/types/userdata";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import UserInfo from "@/components/dashboard/user-info";
import { Button } from "@/components/ui/button";

export const columns: ColumnDef<UserData>[] = [
  {
    accessorKey: "global_name",
    header: "Global Name",
    cell: ({ row }) => row.original.global_name || "-",
    enableColumnFilter: true,
  },
  {
    accessorKey: "user_name",
    header: "User Name",
    cell: ({ row }) => row.original.user_name || "-",
    enableColumnFilter: true,
  },
  {
    accessorKey: "user_id",
    header: "User ID",
    cell: ({ row }) => row.original.user_id || "-",
    enableColumnFilter: true,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email || "-",
    enableColumnFilter: true,
  },
  {
    accessorKey: "ip",
    header: "IP Address",
    cell: ({ row }) => row.original.ip || "-",
    enableColumnFilter: true,
  },
  {
    id: "more",
    header: "More",
    cell: ({ row }) => (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon"><Info size={18} /></Button>
        </PopoverTrigger>
        <PopoverContent className="w-120 h-130 mx-auto flex justify-center items-center mr-20" align="center" side="top">
          <UserInfo user={row.original} />
        </PopoverContent>
      </Popover>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
]; 