import { NextRequest, NextResponse } from "next/server";
import { RobotsTxt } from "@/services/RobotsTxt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'domain' parameter" },
        { status: 400 }
      );
    }

    const robotsTxt = new RobotsTxt();
    const result = await robotsTxt.analyze(domain);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[robots-txt API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
