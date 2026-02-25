import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
import { SignUpForm } from "@op-plugin/solid-ui";
import { signUpFn } from "../../server/auth";

export const Route = createFileRoute("/auth/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();

  async function handleSignUp(name: string, email: string, password: string) {
    try {
      await signUpFn({ data: { name, email, password } });
      navigate({ to: "/" });
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Registration failed" };
    }
  }

  return (
    <main class="flex min-h-[80vh] items-center justify-center px-4">
      <div class="w-full max-w-sm">
        <h1 class="mb-6 text-center text-2xl font-bold text-[var(--color-text)]">Create account</h1>
        <SignUpForm onSubmit={handleSignUp} />
        <p class="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
          Already have an account?{" "}
          <Link to="/auth/sign-in" class="font-medium text-[var(--color-primary)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
