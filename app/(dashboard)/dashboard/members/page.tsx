import { auth } from "@/auth"
import { createClient } from "@supabase/supabase-js";
import { UserData } from "@/lib/types/userdata";
import { Separator } from "@/components/ui/separator";
import { columns } from "@/components/dashboard/members/columns";
import { DataTable } from "@/components/dashboard/members/data-table";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

async function getUsers() {
    const { data, error } = await supabase
      .from("log")
      .select("*")
    if (error) {
      console.log("Error fetching members:", error)
      return []
    }
    return data
}

export default async function Members() {
    const users: UserData[] = await getUsers()
    return (
      <main>
        <div className="pl-20 pb-10">
          <h1 className="text-3xl font-bold ">Verified Members</h1>
          <p className="text-muted-foreground">Moderate and manage your verified members.</p>
          <p className="text-muted-foreground">Total members: {users.length}</p>
        </div>
        <Separator />
        <div className="px-20 mx-auto py-10">
          <DataTable columns={columns} data={users} />
        </div>
      </main>
    )
}
