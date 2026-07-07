import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Config minimale : pas de cache incremental R2 (l'app est surtout dynamique).
export default defineCloudflareConfig({});
