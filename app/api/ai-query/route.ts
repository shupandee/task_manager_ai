// app/api/ai-query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const { query, viewer, history } = await req.json();
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  try {
    const response = await runAgent(query as string, viewer ?? null, history ?? []);
    return NextResponse.json({ response });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}