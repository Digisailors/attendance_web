import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define protected routes and who can access them
const roleRoutes: Record<string, string[]> = {
  "/admin": ["manager", "team-lead"],
  "/team-lead": ["team-lead"],
  "/manager": ["manager"],
  "/employee": ["employee", "team-lead", "manager"],
  "/intern": ["intern", "employee", "team-lead", "manager"],
};

// Define which routes are public (no login required)
const publicRoutes = ["/", "/login", "/signup", "/forgot-password"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1️⃣ Allow public routes to pass through
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 2️⃣ Get Supabase session from Authorization header or cookies
  const accessToken =
    req.cookies.get("sb-access-token")?.value ||
    req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 3️⃣ Validate the session & get user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    console.log("❌ Invalid user:", userError);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 4️⃣ Fetch user type (role) from `users` table
  const { data: userData, error } = await supabase
    .from("users")
    .select("user_type, is_active")
    .eq("id", user.id)
    .single();

  if (error || !userData?.is_active) {
    console.log("❌ Unauthorized or inactive user");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = userData.user_type;

  // 5️⃣ Check route access based on role
  for (const [routePrefix, allowedRoles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(routePrefix) && !allowedRoles.includes(role)) {
      console.log(`⛔ Access denied for ${role} to ${pathname}`);
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // 6️⃣ If authorized, continue to requested page
  return NextResponse.next();
}

// ✅ Apply middleware only to routes that start with these
export const config = {
  matcher: [
    "/admin/:path*",
    "/team-lead/:path*",
    "/manager/:path*",
    "/employee/:path*",
    "/intern/:path*",
  ],
};
