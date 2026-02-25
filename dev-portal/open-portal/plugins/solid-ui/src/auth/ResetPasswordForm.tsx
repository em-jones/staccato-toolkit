import type { JSX } from "solid-js";
import { createSignal, Show } from "solid-js";

export interface ResetPasswordFormProps {
  /** Step 1: request a reset link; Step 2: set new password with token */
  mode: "request" | "reset";
  onRequestReset: (email: string) => Promise<{ error?: string }>;
  onResetPassword?: (token: string, newPassword: string) => Promise<{ error?: string }>;
  /** Pre-filled from URL query param */
  token?: string;
  class?: string;
}

export function ResetPasswordForm(props: ResetPasswordFormProps): JSX.Element {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirm, setConfirm] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [success, setSuccess] = createSignal<string | null>(null);
  const [pending, setPending] = createSignal(false);

  const field =
    "w-full rounded-lg border border-[var(--color-surface1,rgba(0,0,0,0.2))] bg-[var(--color-bg,#fff)] px-3 py-2 text-sm text-[var(--color-text,#111)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#0ea5e9)]";
  const label = "mb-1 block text-sm font-medium text-[var(--color-text,#111)]";

  async function handleRequest(e: SubmitEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await props.onRequestReset(email());
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("If an account exists with that email, a reset link has been sent.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleReset(e: SubmitEvent) {
    e.preventDefault();
    if (password() !== confirm()) {
      setError("Passwords do not match.");
      return;
    }
    if (!props.onResetPassword || !props.token) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await props.onResetPassword(props.token, password());
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Password has been reset. You can now sign in.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div class={props.class}>
      <Show when={success()}>
        <p class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success()}
        </p>
      </Show>

      <Show when={error()}>
        <p class="mb-4 text-sm text-red-600">{error()}</p>
      </Show>

      <Show when={props.mode === "request"}>
        <form onSubmit={handleRequest} class="space-y-4">
          <div>
            <label class={label} for="rpf-email">
              Email
            </label>
            <input
              id="rpf-email"
              type="email"
              required
              autocomplete="email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              class={field}
            />
          </div>
          <button
            type="submit"
            disabled={pending()}
            class="w-full rounded-full bg-[var(--color-primary,#0ea5e9)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending() ? "Sending…" : "Send reset link"}
          </button>
        </form>
      </Show>

      <Show when={props.mode === "reset"}>
        <form onSubmit={handleReset} class="space-y-4">
          <div>
            <label class={label} for="rpf-password">
              New password
            </label>
            <input
              id="rpf-password"
              type="password"
              required
              autocomplete="new-password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              class={field}
            />
          </div>
          <div>
            <label class={label} for="rpf-confirm">
              Confirm new password
            </label>
            <input
              id="rpf-confirm"
              type="password"
              required
              autocomplete="new-password"
              value={confirm()}
              onInput={(e) => setConfirm(e.currentTarget.value)}
              class={field}
            />
          </div>
          <button
            type="submit"
            disabled={pending()}
            class="w-full rounded-full bg-[var(--color-primary,#0ea5e9)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending() ? "Resetting…" : "Reset password"}
          </button>
        </form>
      </Show>
    </div>
  );
}
