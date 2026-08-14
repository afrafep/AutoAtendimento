import type { Metadata } from "next";
import AtualizacaoDisponivelBanner from "@/components/AtualizacaoDisponivelBanner";
import { getAppVersion } from "@/lib/appVersion";
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
  const versaoAtual = getAppVersion();

  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        {children}
        <AtualizacaoDisponivelBanner versaoInicial={versaoAtual} />
      </body>
    </html>
  );
}
