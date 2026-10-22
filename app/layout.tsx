import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hospedagem | Girofy",
  description: "Painel privado para publicar sites estáticos na Girofy.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
