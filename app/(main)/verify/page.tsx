"use client";

import { Turnstile } from "next-turnstile";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/shared/button";
import { ShieldCheck } from "lucide-react";
import { useUserLocation } from "@/lib/hooks/user-location-hooks";
import { useScreenSize } from "@/lib/hooks/screen-size-hooks";
import { useCsrfToken } from "@/lib/hooks/csrf-token-hooks";
import { TURNSTILE_SITE_KEY } from "@/lib/constants";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Suspended />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black">
      <div className="p-9 rounded-3xl md:w-1/2 max-w-md border border-white/[0.08] bg-white/[0.02]  hover:border-white/[0.12] transition-colors duration-300">
        <div className="mx-auto">
          <ShieldCheck size={50} className="text-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-center">Loading...</h1>
        </div>
      </div>
    </main>
  );
}

function Suspended() {
  return <Body />;
}

function Body() {
  const location = useUserLocation();
  const screenSize = useScreenSize();
  const csrfToken = useCsrfToken();
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  const handleVerify = async () => {
    if (!token || !csrfToken) return;
    const response = await fetch("/api/verify", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({
        location,
        token,
        screenSize,
      }),
    });
    if (response.ok) {
      router.push("/result/success");
    } else if (response.status === 403) {
      router.push("/result/vpn");
    } else {
      router.push("/result/error");
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
              siteKey={TURNSTILE_SITE_KEY}
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
