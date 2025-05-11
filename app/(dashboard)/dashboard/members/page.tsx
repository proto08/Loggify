import { createClient } from "@supabase/supabase-js";
import { auth } from "@/auth"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);


async function getMembers() {
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
    const members = await getMembers()
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
                            {/* <th className="py-3 px-4 text-left font-medium">User Agent</th> */}
                            <th className="py-3 px-4 text-left font-medium">GPS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member, index) => (
                            <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                                <td className="py-3 px-4">{`${member.global_name} (${member.user_name})`}</td>
                                <td className="py-3 px-4">{member.user_id}</td>
                                <td className="py-3 px-4">{member.email}</td>
                                <td className="py-3 px-4">{member.ip}</td>
                                {/* <td className="py-3 px-4">{member.user_agent}</td> */}
                                <td className="py-3 px-4">{member.gps ? `${member.gps.latitude || "N/A"}, ${member.gps.longitude || "N/A"}` : "N/A"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </main>
  )
}
