import Link from 'next/link'
import React from 'react'

export default async function Header () {
  return (
    <header className="fixed top-0 w-full z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="block font-bold text-xl transition-transform duration-300 ease-in-out transform hover:scale-105">DeltaVerify</Link>
        </div>
    </header>
  )
}