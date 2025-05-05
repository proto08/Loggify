"use client"

import { Turnstile } from "next-turnstile";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { GpsData } from "@/lib/types/userdata";
import { Button } from "@/components/ui/button";

function VerifyContent() {
    const [gpsData, setGpsData] = useState<GpsData | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get("code");
    const gfe = searchParams.get("gfe");

    useEffect(() => {
        if (!code || !gfe) {
            router.push("/error");
        }
    }, [code, gfe, router]);

    useEffect(() => {
        const getLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setGpsData({
                            hh: position.coords.latitude ?? 0,
                            xf: position.coords.longitude ?? 0,
                            ff: position.coords.accuracy ?? 0
                        });
                    },
                    (error) => {
                        console.log("error getting location", error);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            }
        };
        getLocation();
    }, []);

    const handleVerify = async () => {
        if (!token) return;
        if (!gfe) return;

        const res = await fetch('/api/verify', {      
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                token,
                ct: gfe,
                kt: code,
                ll: gpsData || { hh: 0, xf: 0, ff: 0 }
            }),
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
            <h1 className="text-2xl font-bold mb-4">チェックマークが付いてから、<br></br>認証ボタンを押してください</h1>
            <div className="mt-4">
                <Turnstile
                    siteKey="1x00000000000000000000AA"
                    onVerify={(token) => {
                        setToken(token);
                    }}
                />
                <Button 
                    className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" 
                    disabled={!token}
                    onClick={handleVerify}
                >
                    認証する
                </Button>
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
