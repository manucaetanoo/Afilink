import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Endpoint reemplazado por /api/payments/dlocalgo/process" },
    { status: 410 }
  );
}
