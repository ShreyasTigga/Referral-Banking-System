import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ message: "Admin logged out successfully" });

  // Clear the admin_session cookie by expiring it
  res.cookies.set("admin_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0), // past date = delete
  });

  return res;
}
