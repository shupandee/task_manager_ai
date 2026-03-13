// app/api/people/route.ts
import { NextResponse } from "next/server";
import { loadData, allNames } from "@/lib/store";

export async function GET() {
  const data = loadData();
  return NextResponse.json({ names: allNames(data.tasks) });
}
