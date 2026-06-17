import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lechrol — Żaluzje, rolety, markizy i moskitiery | Warszawa",
  description:
    "Lechrol to producent osłon okiennych z ponad 25-letnim doświadczeniem. Żaluzje, rolety, markizy i moskitiery — produkcja, sprzedaż i montaż w Warszawie i okolicach.",
  keywords: [
    "żaluzje",
    "rolety",
    "markizy",
    "moskitiery",
    "osłony okienne",
    "Lechrol",
    "Warszawa",
    "Łomianki",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={inter.variable}>
      <body className="font-sans">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
