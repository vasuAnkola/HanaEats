import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "HANAEats — Southeast Asia POS",
  description: "Multi-tenant Point-of-Sale platform for Southeast Asian food outlets",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
