import { CircleUser } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";


export default function AccountSetting() {
    return (
        <main>
            <Sheet>
            <SheetTrigger className="flex items-center"><span className="mr-2"><CircleUser /></span>Account</SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                <SheetTitle>Are you absolutely sure?</SheetTitle>
                <SheetDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove your data from our servers.
                </SheetDescription>
                </SheetHeader>
            </SheetContent>
            </Sheet>
        </main>
    )
}

