"use client";

import { Turnstile } from "next-turnstile";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GpsData } from "@/lib/types/userdata";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { _0x9g22 } from "@/lib/functions/obf";

function VerifyContent() {
  const [gpsData, setGpsData] = useState<GpsData | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const lfg = searchParams.get("lfg");
  const gfe = searchParams.get("gfe");

  useEffect(() => {
    if (!lfg || !gfe) {
      router.push("/error");
    }
  }, [lfg, gfe, router]);

  useEffect(() => {
    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setGpsData({
              hh: position.coords.latitude ?? 0,
              xf: position.coords.longitude ?? 0,
              ff: position.coords.accuracy ?? 0,
            });
          },
          (error) => {
            console.log("error getting location", error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      }
    };
    getLocation();
  }, []);

  const handleVerify = async () => {
    if (!token) return;
    if (!gfe) return;
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        df: Buffer.from(token).toString("hex"),
        ct: gfe,
        kt: _0x9g22(lfg!),
        ll: Buffer.from(JSON.stringify(gpsData || { hh: 0, xf: 0, ff: 0 })).toString("hex"),
        pp: Buffer.from(
          JSON.stringify({ w: window.screen.width, h: window.screen.height })
        ).toString("hex"),
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
