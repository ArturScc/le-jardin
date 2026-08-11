import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Le Jardin | Financeiro", description: "Gestão financeira para a cafeteria e floricultura Le Jardin." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
