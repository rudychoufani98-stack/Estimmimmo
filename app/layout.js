export const metadata = {
  title: "EstimImmo — Estimation & Rentabilité immobilière",
  description:
    "Estimez la valeur de n'importe quel bien immobilier en France à partir des transactions réelles (DVF) et calculez sa rentabilité locative.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
