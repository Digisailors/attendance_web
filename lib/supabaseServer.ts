import { createClient } from "@supabase/supabase-js";
// ❌ Remove this line: import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const createClientInstance = () =>
  createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (for API routes) - ADMIN ACCESS
export const createServerClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createClient(supabaseUrl, serviceRoleKey);
};

// 🆕 Pages Router compatible: Create client from request cookies
// lib/supabaseServer.ts

export const createAuthServerClient = (req: any) => {
  const cookies = req.cookies || {};
  
  // 🔍 Try to find auth cookies with different possible names
  const cookieNames = Object.keys(cookies);
  console.log("🍪 Available cookie names:", cookieNames);
  
  // Find auth token - try multiple patterns
  let authToken = null;
  let refreshToken = null;
  
  // Pattern 1: Simple names
  authToken = cookies['sb-access-token'];
  refreshToken = cookies['sb-refresh-token'];
  
  // Pattern 2: Project-specific names (sb-<project-ref>-auth-token)
  if (!authToken) {
    const authCookie = cookieNames.find(name => 
      name.includes('auth-token') && !name.includes('refresh')
    );
    if (authCookie) {
      authToken = cookies[authCookie];
      console.log("✅ Found auth token:", authCookie);
    }
  }
  
  if (!refreshToken) {
    const refreshCookie = cookieNames.find(name => 
      name.includes('auth-token') && name.includes('refresh')
    );
    if (refreshCookie) {
      refreshToken = cookies[refreshCookie];
      console.log("✅ Found refresh token:", refreshCookie);
    }
  }
  
  console.log("🔑 Auth token found:", !!authToken);
  console.log("🔄 Refresh token found:", !!refreshToken);

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: authToken
        ? {
            Authorization: `Bearer ${authToken}`,
          }
        : {},
    },
  });

  // If we have tokens, set the session
  if (authToken && refreshToken) {
    client.auth.setSession({
      access_token: authToken,
      refresh_token: refreshToken,
    });
  }

  return client;
};

// Auth helpers
export const signUp = async (
  email: string,
  password: string,
  userData?: any
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
};

export const createServerSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
};
