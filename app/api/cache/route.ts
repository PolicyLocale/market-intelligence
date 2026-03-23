import { NextResponse } from "next/server";
import { getCache } from "@/lib/persistentCache";

export async function GET() {
  return NextResponse.json(getCache());
}