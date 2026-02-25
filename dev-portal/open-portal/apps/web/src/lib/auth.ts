import * as schema from "@op/platform/db-sqlite";
import { createDb } from "@op-plugin/db-libsql";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { boolFromEnv, env } from "../env";

const db = createDb(env.DATABASE_URL);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // In production, send an actual email.
      // In dev, log the reset URL to the console.
      console.log(`[openport] Password reset for ${user.email}: ${url}`);
    },
  },

  socialProviders: boolFromEnv.OPENPORT_AUTH_MOCK
    ? {}
    : {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID ?? "",
          clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
        },
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID ?? "",
          clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        },
      },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },

  advanced: {
    cookiePrefix: "openport",
  },
});

export type Auth = typeof auth;
