// Server wrapper : force le rendu dynamique pour que la page HTML ne soit
// jamais mise en cache 1 an (elle doit toujours pointer vers les derniers chunks JS).
export const dynamic = "force-dynamic";

import ClientApp from "./ClientApp";

export default function Page() {
  return <ClientApp />;
}
