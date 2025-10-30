import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, userType, action, newPassword } = body;

    // ✅ VALIDATE USER (NEW)
    if (action === "validate") {
      if (!email || !userType) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      // Check if user is intern
      if (userType === "intern") {
        const { data, error } = await supabase
          .from("interns")
          .select("*")
          .eq("email", email)
          .eq("status", "Active")
          .single();

        if (error || !data) {
          console.log("Intern validation failed:", error);
          return NextResponse.json(
            { authorized: false, error: "Intern not found or inactive" },
            { status: 403 }
          );
        }

        return NextResponse.json({
          authorized: true,
          data: { name: data.name, email: data.email },
        });
      } else {
        // Check if user is employee
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .eq("email_address", email)
          .eq("is_active", true)
          .single();

        if (error || !data) {
          console.log("Employee validation failed:", error);
          return NextResponse.json(
            { authorized: false, error: "Employee not found or inactive" },
            { status: 403 }
          );
        }

        return NextResponse.json({
          authorized: true,
          data: { name: data.name, email: data.email_address },
        });
      }
    }

    if (!email || (!password && action !== "reset")) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ SIGNUP
    if (action === "signup") {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (authError) {
        return NextResponse.json(
          { error: "Auth signup failed", details: authError.message },
          { status: 400 }
        );
      }

      const authUserId = authData.user?.id;

      // 2. Store additional info in your custom `users` table, including hashed password
      const hashedPassword = hashPassword(password);
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            id: authUserId,
            email,
            user_type: userType || "user",
            is_active: true,
            password: hashedPassword,
          },
        ])
        .select();

      if (error) {
        return NextResponse.json(
          { error: "Custom user insert failed", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Signup successful",
        user: data?.[0],
      });
    }

    // ✅ SIGNIN
    if (action === "signin") {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      const hashedInputPassword = hashPassword(password);

      if (hashedInputPassword !== data.password) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        message: "Login successful",
        user: {
          id: data.id,
          email: data.email,
          userType: data.user_type,
        },
      });
    }

    // ✅ RESET PASSWORD
    if (action === "reset") {
      if (!newPassword) {
        return NextResponse.json(
          { error: "Missing new password" },
          { status: 400 }
        );
      }

      const { data: userData, error: findError } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", email)
        .single();

      if (findError || !userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const hashedNewPassword = hashPassword(newPassword);

      const { error: updateError } = await supabase
        .from("users")
        .update({ password: hashedNewPassword })
        .eq("id", userData.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update password", details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Password reset successful",
        user: {
          id: userData.id,
          email: userData.email,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}
