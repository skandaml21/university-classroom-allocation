
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export interface SessionPayload {
  userId: number;
  name: string;
  email: string;
  role: "ADMIN" | "FACULTY";
}

const COOKIE_NAME = "classroom_session";
const SESSION_DURATION = 60 * 60 * 8; // 8 hours

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export function createSessionToken(
  payload: SessionPayload
): string {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: SESSION_DURATION,
  });
}

export function verifySessionToken(
  token: string
): SessionPayload {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  }) as SessionPayload;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
