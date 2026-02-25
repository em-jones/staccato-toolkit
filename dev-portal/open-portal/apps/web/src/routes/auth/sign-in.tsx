import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
import { SignInForm } from "@op-plugin/solid-ui";
import { signInFn } from "../../server/auth";

export const Route = createFileRoute("/auth/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();

  async function handleSignIn(email: string, password: string) {
    try {
      await signInFn({ data: { email, password } });
      navigate({ to: "/" });
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Sign in failed" };
    }
  }

  return (
    <main class="flex min-h-[80vh] items-center justify-center px-4">
      <div class="w-full max-w-sm">
        <h1 class="mb-6 text-center text-2xl font-bold text-[var(--color-text)]">Sign in</h1>
        <SignInForm onSubmit={handleSignIn} />
        <div class="mt-4 flex flex-col gap-2 text-center text-sm text-[var(--color-text-secondary)]">
          <Link to="/auth/reset-password" search={{ token: undefined }} class="hover:underline">
            Forgot password?
          </Link>
          <span>
            Don't have an account?{" "}
            <Link
              to="/auth/sign-up"
              class="font-medium text-[var(--color-primary)] hover:underline"
            >
              Sign up
            </Link>
          </span>
        </div>
      </div>
    </main>
  );
}
