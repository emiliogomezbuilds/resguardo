import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303 forces the browser to follow with GET, not the original POST — the
  // default redirect status preserves method on non-GET requests, which
  // turned into a 405 here because /login only handles GET.
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
