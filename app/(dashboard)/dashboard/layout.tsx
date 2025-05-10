import { ThemeProvider } from "@/components/theme-provider";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import "@/app/globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
}); 

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loggify - The Best Discord Logging Service",
  description: "Loggify is a Advanced Discord Logger for Server Admins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased  text-white`}>
        <ThemeProvider>
          <SidebarProvider>
            <AppSidebar />
            <main className="min-h-screen">
                <SidebarTrigger />
                {children}
            </main>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

