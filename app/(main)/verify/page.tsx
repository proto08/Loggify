"use client";

import { Turnstile } from "next-turnstile";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/shared/button";
import { ShieldCheck } from "lucide-react";
import { _0x9g22 } from "@/lib/functions/obf";
import { useUserLocation } from "@/lib/hooks/use-user-location";

function VerifyContent() {
  const location = useUserLocation();
  const [token, setToken] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get("code");

  const handleVerify = async () => {
    if (!token) return;
    if (!code) return;
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        location,
        token: await _0x9g22(token),
      }),
    });
    const result = await res.json();
    if (result.status === 200) {
      router.push("/success");
    } else {
      router.push("/error");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black">
      <div className="p-9 rounded-3xl md:w-1/2 max-w-md border border-white/[0.08] bg-white/[0.02]  hover:border-white/[0.12] transition-colors duration-300">
        <div className="mx-auto">
          <ShieldCheck size={50} className="text-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-center">Complete Verification</h1>
          <h1 className="text-xl font-bold mb-4 text-center">認証を完了してください</h1>
        </div>
        <div className="mt-4">
          <div className="flex justify-center">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string}
              onVerify={(token) => {
                setToken(token);
              }}
            />
          </div>
          <Button
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!token}
            onClick={handleVerify}
          >
            Verify / 認証する
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function Verify() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
