import { auth } from "@/auth";
import { Button } from "./button";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import Link from "next/link";

export default async function UserButton() {
  const session = await auth();
  if (!session) {
    return (
      <Button>
        <Link href="/login">Login</Link>
      </Button>
    );
  }
  return (
    <div className="flex gap-3">
      <Avatar>
        <AvatarImage src={session.user?.image ?? ""} />
        <AvatarFallback>{session.user?.name?.charAt(0)}</AvatarFallback>
      </Avatar>
      <Button>
        <Link href="/dashboard">Dashboard</Link>
      </Button>
    </div>
  );
}
