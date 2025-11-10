import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, AUTH_TOKEN, credentialsMatch } from "@/lib/auth";

type LoginRequest = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequest;
    const email = body.email?.trim();
    const password = body.password ?? "";

    if (!email || !password || !credentialsMatch(email, password)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: AUTH_TOKEN,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  } catch (error) {
    console.error("Failed to process login request:", error);
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

