import { NextResponse } from "next/server";

export async function GET() {
  const username = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  const base64 = process.env.DATAFORSEO_BASE64;

  if (!username || !password) {
    return NextResponse.json(
      { error: "DataForSEO credentials not configured" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    username,
    password,
    base64,
    source: "environment",
  });
}
