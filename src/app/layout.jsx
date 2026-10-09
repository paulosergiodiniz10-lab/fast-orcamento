import "./globals.css";

export const metadata = {
  title: "Fast Orçamento & Reservas",
  description: "www.orcamentofast.com.br",
  manifest: "/manifest.json",
  metadataBase: new URL("https://www.orcamentofast.com.br"),
  openGraph: {
    title: "Fast Orçamento & Reservas",
    description: "www.orcamentofast.com.br",
    url: "https://www.orcamentofast.com.br",
    siteName: "Fast Orçamento & Reservas",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fast Orçamento & Reservas",
    description: "www.orcamentofast.com.br",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="theme-color" content="#064e3b" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body>{children}</body>
    </html>
  );
}
