/**
 * Server functions for authentication.
 *
 * Provides TanStack Start server functions for the auth workflow,
 * backed by better-auth.
 */

import { createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { auth } from "../lib/auth";

/**
 * Server function: handle sign-in.
 */
export const signInFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { email: string; password: string } }) => {
    const response = await auth.api.signInEmail({
      body: {
        email: data.email,
        password: data.password,
      },
    });
    return { success: true, user: response.user };
  },
);

/**
 * Server function: handle sign-up.
 */
export const signUpFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { email: string; password: string; name: string } }) => {
    const response = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
    });
    return { success: true, user: response.user };
  },
);

/**
 * Server function: handle sign-out.
 */
export const signOutFn = createServerFn({ method: "POST" }).handler(async () => {
  const headers = getRequestHeaders();
  await auth.api.signOut({ headers });
  return { success: true };
});

/**
 * Server function: get current session.
 */
export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    return session;
  } catch {
    return null;
  }
});

/**
 * Server function: request a password reset email.
 */
export const requestPasswordResetFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { email: string } }) => {
    try {
      await auth.api.requestPasswordReset({
        body: {
          email: data.email,
          redirectTo: "/auth/reset-password",
        },
      });
      return { success: true };
    } catch {
      // Always return success to avoid email enumeration
      return { success: true };
    }
  },
);

/**
 * Server function: reset password with token.
 */
export const resetPasswordFn = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { token: string; newPassword: string } }) => {
    await auth.api.resetPassword({
      body: {
        token: data.token,
        newPassword: data.newPassword,
      },
    });
    return { success: true };
  },
);
