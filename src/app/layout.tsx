import type { Metadata } from "next";
import AtualizacaoDisponivelBanner from "@/components/AtualizacaoDisponivelBanner";
import { getAppVersion } from "@/lib/appVersion";
import "@/styles/global.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

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
        <ToastContainer
          newestOnTop
          closeButton={false}
          hideProgressBar
          pauseOnHover={false}
          theme="light"
          toastClassName="!min-h-0 !p-0 !bg-transparent !shadow-none"
        />
        <AtualizacaoDisponivelBanner versaoInicial={versaoAtual} />
      </body>
    </html>
  );
}
