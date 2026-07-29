import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function getInteliteBaseUrl() {
  return (
    process.env.INTELITE_BASE_URL ||
    process.env.VITE_INTELITE_BASE_URL ||
    "http://ai.intelite.com.br:3004/api/Services"
  ).replace(/\/+$/, "");
}

function getInteliteCredentials() {
  const token = process.env.INTELITE_TOKEN || process.env.VITE_INTELITE_TOKEN;
  const unidade =
    process.env.INTELITE_UNIDADE || process.env.VITE_INTELITE_UNIDADE;
  const cnpj = process.env.INTELITE_CNPJ || process.env.VITE_INTELITE_CNPJ;

  if (!token || !unidade || !cnpj) {
    throw new Error("Missing Intelite server credentials");
  }

  return { token, unidade, cnpj };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const payload = await request.json().catch(() => ({}));
  const { token, unidade, cnpj } = getInteliteCredentials();

  const response = await fetch(`${getInteliteBaseUrl()}/${path.join("/")}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token,
      unidade,
      cnpj,
      ...(payload || {}),
    }),
    cache: "no-store",
  });

  const responseText = await response.text();

  return new Response(responseText, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/json",
    },
  });
}
