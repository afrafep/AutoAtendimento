import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function getSisclinicBaseUrl() {
  return (
    process.env.SISCLINIC_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    "https://api.afrafepsaude.com.br"
  ).replace(/\/+$/, "");
}

function getSisclinicLoginToken() {
  const token =
    process.env.SISCLINIC_LOGIN_TOKEN || process.env.SISCLINIC_API_TOKEN;

  if (!token) {
    throw new Error(
      "Missing SISCLINIC_LOGIN_TOKEN (or legacy SISCLINIC_API_TOKEN)",
    );
  }

  return token;
}

async function forwardRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetUrl = new URL(`${getSisclinicBaseUrl()}/${path.join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  const bodyText =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  const response = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: {
      "Content-Type":
        request.headers.get("content-type") || "application/json",
      Authorization: `Bearer ${getSisclinicLoginToken()}`,
    },
    body: bodyText && bodyText.length > 0 ? bodyText : undefined,
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forwardRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forwardRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forwardRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forwardRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return forwardRequest(request, context);
}
