import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

export const SESSION_COOKIE = "ip_session";

const SESSION_MAX_AGE_REMEMBER = 60 * 60 * 24 * 30;
const SESSION_MAX_AGE_DEFAULT = 60 * 60 * 24 * 7;

export function readSessionToken(): string | undefined {
  return getCookie(SESSION_COOKIE);
}

export function writeSessionCookie(token: string, rememberMe = false) {
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: rememberMe ? SESSION_MAX_AGE_REMEMBER : SESSION_MAX_AGE_DEFAULT,
  });
}

export function clearSessionCookie() {
  deleteCookie(SESSION_COOKIE, { path: "/" });
}
