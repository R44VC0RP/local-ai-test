'use client';

import { useState, useEffect } from "react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";
import Image from "next/image";
import { JetBrains_Mono } from 'next/font/google';

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a loading state or nothing while client-side hydration is happening
  if (!mounted) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className={`${jetBrainsMono.variable} antialiased`}>
          <div className="flex h-screen items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jetBrainsMono.variable} antialiased`} suppressHydrationWarning>
        {/* <script src="https://unpkg.com/react-scan/dist/auto.global.js" async /> */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex h-screen">
            <ChatSidebar />
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Image src="/exon.png" alt="exon enterprise logo" width={30} height={30} />
                  <p className="font-medium">Exon Enterprise</p>
                </div>
                <ThemeToggle />
              </div>
              <main className="flex-1 overflow-hidden relative">
                {children}
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
