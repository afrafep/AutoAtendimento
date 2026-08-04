import type { Metadata } from "next";
import "@/styles/global.css";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "Sisclinic Autoatendimento",
  description: "Autoatendimento do beneficiario",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}


