import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET);

// Valid for 2 hours (you can change)
const ADMIN_TOKEN_EXPIRY_SECONDS = 60 * 60 * 2;

export async function signAdminToken(payload: { adminId: string; email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${ADMIN_TOKEN_EXPIRY_SECONDS}s`)
    .sign(secret);
}

export async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { adminId: string; email: string; exp: number };
  } catch (e) {
    return null; // invalid or expired token
  }
}
