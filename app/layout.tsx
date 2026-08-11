import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Le Jardin | Financeiro",
  description: "Gestão financeira para a cafeteria e floricultura Le Jardin.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Le Jardin" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
