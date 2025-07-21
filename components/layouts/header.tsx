import { Button } from "@/components/shared/button";
import Link from "next/link";
import React from "react";

export default async function Header() {
  return (
    <header className="fixed top-0 w-full z-50 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link
          href="/"
          className="block font-bold text-2xl transition-transform duration-300 ease-in-out transform hover:scale-105"
        >
          Loggify
        </Link>
        <ul className="hidden md:flex text-xl gap-4">
          <li>
            <Button variant="ghost">
              <Link href="https://github.com/yuk228/Loggify" className="hover:text-foreground transition-colors text-lg">
                Github
              </Link>
            </Button>
          </li>
          <li>
            <Button variant="ghost">
              <Link href="/features" className="hover:text-foreground transition-colors text-lg">
                Features
              </Link>
            </Button>
          </li>
          <li>
            <Button variant="ghost">
              <Link href="/blogs" className="hover:text-foreground transition-colors text-lg">
                Blog
              </Link>
            </Button>
          </li>
        </ul>
      </div>
    </header>
  );
}
