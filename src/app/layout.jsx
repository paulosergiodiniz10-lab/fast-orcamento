import "./globals.css";

export const metadata = {
  title: "Fast Orçamento - Gerador Ágil de Orçamentos",
  description: "Crie orçamentos de turismo para WhatsApp em segundos",
  manifest: "/manifest.json",
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
