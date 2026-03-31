import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { jwtVerify } from "jose";
import { ENV } from "./env";
import { getUserById } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const APP_COOKIE = "meta_session";
const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret || "meta-dashboard-secret-2024");

function parseCookies(cookieHeader?: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!cookieHeader) return map;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) map.set(k.trim(), decodeURIComponent(v.join("=").trim()));
  }
  return map;
}

async function tryAuthViaAppToken(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.get(APP_COOKIE);
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.userId || typeof payload.userId !== "number") return null;
    const user = await getUserById(payload.userId);
    if (!user || user.ativo !== 1) return null;
    return user;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // 1. Tentar autenticação via Manus OAuth (cookie de sessão padrão)
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    // Authentication is optional for public procedures.
    user = null;
  }

  // 2. Se não autenticado via OAuth, tentar via meta_session (login por senha)
  if (!user) {
    user = await tryAuthViaAppToken(opts.req);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
