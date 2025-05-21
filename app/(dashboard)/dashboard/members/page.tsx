
import { auth } from "@/auth"
import { createClient } from "@supabase/supabase-js";
import { UserData } from "@/lib/types/userdata";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import UserInfo from "@/components/dashboard/user-info";


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
    console.log(users)
    const session = await auth();
    console.log(session)
  return (
    <main>
        <div className="pl-20">
            <h1 className="text-3xl font-bold ">Verified Members</h1>
            <p className="text-muted-foreground">Moderate and manage your verified members.</p>
            <p className="text-muted-foreground">Total members: {users.length}</p>
        </div>
        <div className="mt-10 p-20 mx-auto">
            <div className="rounded-md border">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-muted/50">
                            <th className="py-3 px-4 text-left font-medium">User Name</th>  
                            <th className="py-3 px-4 text-left font-medium">User ID</th>
                            <th className="py-3 px-4 text-left font-medium">Email</th>
                            <th className="py-3 px-4 text-left font-medium">IP Address</th>
                            <th className="py-3 px-4 text-left font-medium">More</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, index) => (
                            <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                                <td className="py-3 px-4 hover:underline">{`${user.global_name} (${user.user_name})`}</td>
                                <td className="py-3 px-4 hover:underline">{user.user_id}</td>
                                <td className="py-3 px-4 hover:underline">{user.email}</td>
                                <td className="py-3 px-4 hover:underline">{user.ip}</td>
                                <td className="py-3 px-4">
                                <Popover>
                                    <PopoverTrigger className="p-3 text-center hover:bg-muted/50 rounded-md">
                                        <div className="flex items-center justify-center">
                                            <Info className="text-center cursor-pointer" size={20}/>
                                        </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-120 h-200 mx-auto flex justify-center items-cente mr-20" align="center" side="top">
                                        <UserInfo user={user} />
                                    </PopoverContent>
                                </Popover>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </main>
  )
}
