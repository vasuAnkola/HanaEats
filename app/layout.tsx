import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "HANAEats — Southeast Asia POS",
  description: "Multi-tenant Point-of-Sale platform for Southeast Asian food outlets",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('theme');
              if (t === 'dark' || (!t && false)) document.documentElement.classList.add('dark');
              else if (t === 'system') {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches)
                  document.documentElement.classList.add('dark');
              }
            } catch(e){}
          })()
        ` }} />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </body>
    </html>
  );
}
