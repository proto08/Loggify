"use client"
import { Hero } from "@/components/ui/animated-hero";
import { Turnstile } from 'next-turnstile';

export default function Home()   {
  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <Hero />
    </main>
  );
}



