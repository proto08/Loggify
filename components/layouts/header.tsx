import { Button } from "@/components/ui/button"
import Link from 'next/link'
import React from 'react'
import UserButton from "@/components/ui/user-button"
export default async function Header () {
  return (
    <header className="fixed top-0 w-full z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
            <Link href="/" className="block font-bold text-2xl transition-transform duration-300 ease-in-out transform hover:scale-105">Loggify</Link>
            <ul className="hidden md:flex text-xl gap-4">
              <li><Button variant="ghost"><Link href="/pricing" className="hover:text-foreground transition-colors text-lg">Pricing</Link></Button></li>
              <li><Button variant="ghost"><Link href="/features" className="hover:text-foreground transition-colors text-lg">Features</Link></Button></li>
              <li><Button variant="ghost"><Link href="/blogs" className="hover:text-foreground transition-colors text-lg">Blog</Link></Button></li>
            </ul>
            <div className="flex items-center gap-4">
              <UserButton />
            </div>
            
        </div>
    </header>
  )
}