// Webhook Stripe : quand un paiement/abonnement reussit, on passe l'utilisateur en premium.
// Secrets (variables d'environnement Cloudflare, JAMAIS dans le code) :
//   STRIPE_WEBHOOK_SECRET      (whsec_...)
//   SUPABASE_SERVICE_ROLE_KEY  (cle service_role Supabase - contourne RLS)
//   NEXT_PUBLIC_SUPABASE_URL   (deja presente)
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sur Cloudflare, les secrets sont dans l'env du worker (pas process.env).
function readEnv(name) {
  try {
    const { env } = getCloudflareContext();
    if (env && env[name] != null) return env[name];
  } catch {}
  return process.env[name];
}

// Verifie la signature Stripe (schema t=...,v1=... ; HMAC-SHA256 sur `${t}.${body}`)
async function verifyStripe(body, sigHeader, secret) {
  try {
    const parts = Object.fromEntries((sigHeader || "").split(",").map((p) => p.split("=")));
    const t = parts.t, v1 = parts.v1;
    if (!t || !v1) return false;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${body}`));
    const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex === v1;
  } catch {
    return false;
  }
}

export async function POST(req) {
  const secret = readEnv("STRIPE_WEBHOOK_SECRET");
  const svcKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const sbUrl = readEnv("NEXT_PUBLIC_SUPABASE_URL") || "https://pjkxspeclcgtxhpitfyw.supabase.co";
  if (!secret || !svcKey || !sbUrl) {
    return Response.json({ error: "Webhook non configure (secrets manquants)." }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!(await verifyStripe(body, sig, secret))) {
    return Response.json({ error: "Signature invalide." }, { status: 400 });
  }

  let event;
  try { event = JSON.parse(body); } catch { return Response.json({ error: "Body invalide" }, { status: 400 }); }

  // Paiement/abonnement reussi -> activer le premium
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    const userId = s.client_reference_id;
    const customer = s.customer;
    if (userId) {
      await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          apikey: svcKey,
          Authorization: `Bearer ${svcKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ is_premium: true, stripe_customer_id: customer || null }),
      });
    }
  }

  // Annulation d'abonnement -> retirer le premium
  if (event.type === "customer.subscription.deleted") {
    const customer = event.data.object.customer;
    if (customer) {
      await fetch(`${sbUrl}/rest/v1/profiles?stripe_customer_id=eq.${customer}`, {
        method: "PATCH",
        headers: {
          apikey: svcKey,
          Authorization: `Bearer ${svcKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ is_premium: false }),
      });
    }
  }

  return Response.json({ received: true });
}
