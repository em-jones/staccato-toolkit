import { createFileRoute, Link } from "@tanstack/solid-router";
import { ResetPasswordForm } from "@op-plugin/solid-ui";
import { requestPasswordResetFn, resetPasswordFn } from "../../server/auth";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || undefined,
  }),
});

function ResetPasswordPage() {
  const search = Route.useSearch();
  const token = () => search().token;
  const mode = () => (token() ? "reset" : "request") as "request" | "reset";

  async function handleRequest(email: string) {
    try {
      await requestPasswordResetFn({ data: { email } });
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Request failed" };
    }
  }

  async function handleReset(resetToken: string, newPassword: string) {
    try {
      await resetPasswordFn({ data: { token: resetToken, newPassword } });
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Reset failed" };
    }
  }

  return (
    <main class="flex min-h-[80vh] items-center justify-center px-4">
      <div class="w-full max-w-sm">
        <h1 class="mb-6 text-center text-2xl font-bold text-[var(--color-text)]">
          {mode() === "request" ? "Reset password" : "Set new password"}
        </h1>
        <ResetPasswordForm
          mode={mode()}
          token={token()}
          onRequestReset={handleRequest}
          onResetPassword={handleReset}
        />
        <p class="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
          <Link to="/auth/sign-in" class="font-medium text-[var(--color-primary)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
