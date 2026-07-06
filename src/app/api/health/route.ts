import { storageMode } from "@/lib/data-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const mode = storageMode();
    return Response.json({ ok: true, storage: mode });
  } catch {
    // Nunca derruba o healthcheck; o app funciona em modo memória se necessário.
    return Response.json({ ok: true, storage: "memory" });
  }
}
