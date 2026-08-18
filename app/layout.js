import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://estmimmo.fr"),
  title: "EstimImmo — Estimation & Rentabilité immobilière",
  description:
    "Estimez la valeur de n'importe quel bien immobilier en France à partir des transactions réelles (DVF) et calculez sa rentabilité locative.",
  verification: { google: "Maj8QzeFCkxD5ewUlcw26CRoWmBaSxZO7vZ9azVNCPk" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
