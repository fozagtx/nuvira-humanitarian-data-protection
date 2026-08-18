import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { COOKIE_NAME } from "../../shared/const";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function hasSessionToken(req: CreateExpressContextOptions["req"]) {
  const cookie = req.headers.cookie ?? "";
  const authorization = req.headers.authorization;
  return cookie.includes(`${COOKIE_NAME}=`) || (typeof authorization === "string" && authorization.startsWith("Bearer "));
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (hasSessionToken(opts.req)) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
