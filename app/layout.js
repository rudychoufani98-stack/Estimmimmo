export const metadata = {
  title: "EstimImmo - Estimation & Rentabilite immobiliere",
  description:
    "Estimez la valeur de n'importe quel bien immobilier en France a partir des transactions reelles (DVF) et calculez sa rentabilite locative.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
