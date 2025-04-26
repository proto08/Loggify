import { dark } from "@clerk/themes"
import { ClerkProvider } from "@clerk/nextjs"
import { ThemeProvider } from "next-themes"
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import Header from "@/components/layouts/header";
import "./globals.css";
import Footer from "@/components/layouts/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Delta Verify",
  description: "Protect your servers from extinction! Get detailed logging, server backups, and member backups with Delta Verify",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider 
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            forcedTheme="dark"
            disableTransitionOnChange
            >
              <Header />
              {children}
              <Footer />
            </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>

  );
}
