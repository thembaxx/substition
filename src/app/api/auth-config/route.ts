import { authConfigured } from "@/lib/auth";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    { configured: authConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
