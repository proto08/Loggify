"use client"

import { Turnstile } from "next-turnstile";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get("code");

    const handleVerify = async (token: string) => {
        const res = await fetch('/api/verify', {      
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, code }),
        })
        const result = await res.json();
        if (result.status === 200) {
            router.push("/success"); 
        } else {
            router.push("/error");
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <h1 className="text-2xl font-bold mb-4">認証を完了してください</h1>
            <div className="mt-4">
                <Turnstile
                    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string}
                    onVerify={handleVerify}
                />
            </div>
        </div>
    )
}

export default function Verify() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyContent />
        </Suspense>
    )
}   
