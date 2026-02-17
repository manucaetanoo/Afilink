import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.DATABASE_URL;
  return NextResponse.json({
    hasDatabaseUrl: !!url,
    prefix: url ? url.slice(0, 25) : null,
  });
}
