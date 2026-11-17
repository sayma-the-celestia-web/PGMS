import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "PGMS — Presentation Group Management System | DIU SWE",
  description:
    "Official presentation group registration and team management platform for the Department of Software Engineering, Daffodil International University.",
  keywords: ["DIU", "Software Engineering", "PGMS", "Presentation Groups", "Group Formation"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-[#F5F8FC] text-[#172B4D] selection:bg-diu-blue selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
