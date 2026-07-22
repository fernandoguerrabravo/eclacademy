import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECL Academy | Ecommerce Logistics LLC - Tu Puerta al Mercado de EE.UU.",
  description:
    "Talleres especializados para sellers de Amazon en Latinoamérica. Cumplimiento aduanero, FDA, USDA, logística, fintech y comercio internacional.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
