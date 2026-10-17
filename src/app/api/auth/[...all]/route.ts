import { getAuth } from "@/lib/auth";
export const runtime = "nodejs";
async function handler(request: Request) {
  const auth = getAuth();
  if (!auth)
    return Response.json(
      { error: "Optional email sign-in is not configured. Local vaults do not need an account." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  return auth.handler(request);
}
export const GET = handler;
export const POST = handler;
