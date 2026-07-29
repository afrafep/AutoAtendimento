import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function getLogicConfig() {
  const baseUrl =
    process.env.LOGIC_BASE_URL ||
    process.env.VITE_LOGIC_BASE_URL ||
    "https://webpacs.logicmed.com.br";
  const uuid = process.env.LOGIC_UUID || process.env.VITE_LOGIC_UUID;
  const clientId =
    process.env.LOGIC_CLIENT_ID || process.env.VITE_LOGIC_CLIENT_ID;
  const clientSecret =
    process.env.LOGIC_CLIENT_SECRET || process.env.VITE_LOGIC_CLIENT_SECRET;

  if (!uuid || !clientId || !clientSecret) {
    throw new Error("Missing LogicMed server credentials");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    uuid,
    clientId,
    clientSecret,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const { baseUrl, uuid, clientId, clientSecret } = getLogicConfig();
  const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;

  const response = await fetch(
    `${baseUrl}/api/integration/pacs/${uuid}/worklist`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body,
      cache: "no-store",
    }
  );

  const responseText = await response.text();

  return new Response(responseText, {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/json",
    },
  });
}
