
import { auth } from "@/auth"
import { createClient } from "@supabase/supabase-js";
import UserInfo from "@/components/dashboard/user-info"
import { UserData } from "@/lib/types/userdata";


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
    const session = await auth();
    console.log(session)
  return (
    <main>
        <div className="pl-20">
            <h1 className="text-3xl font-bold ">Verified Members</h1>
            <p className="text-muted-foreground">Moderate and manage your verified members.</p>
        </div>
        <div className=" mt-10 max-w-screen-xl mx-auto">
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
                                <td className="py-3 px-4">{`${user.global_name} (${user.user_name})`}</td>
                                <td className="py-3 px-4">{user.user_id}</td>
                                <td className="py-3 px-4">{user.email}</td>
                                <td className="py-3 px-4">{user.ip}</td>
                                <td className="py-3 px-4">
                                <UserInfo user={user} />
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
