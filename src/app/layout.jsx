import "./globals.css";

export const viewport = {
  themeColor: "#064e3b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: "Fast Orçamento",
  description: "Gerador de orçamentos",
  manifest: "/manifest.json",
  icons: {
    icon: "/icone-favicon.png",
    shortcut: "/icone-favicon.png",
    apple: "/icone-app.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
