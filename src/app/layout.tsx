import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinançasPro 🚀 | Gestão Financeira Dark Purple",
  description: "Gerencie suas receitas, despesas, objetivos de poupança e planeje a quitação de suas dívidas no modo Dark Purple com métodos Bola de Neve e Avalanche.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0c0814] text-purple-100 antialiased selection:bg-purple-600 selection:text-white min-h-screen">{children}</body>
    </html>
  );
}
