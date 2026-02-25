import type { JSX } from "solid-js";
import { createSignal, Show } from "solid-js";

export interface SignInFormProps {
  onSubmit: (email: string, password: string) => Promise<{ error?: string }>;
  /** Shown as a banner when mock/dev auth is active */
  mockAuthNotice?: string;
  submitLabel?: string;
  class?: string;
}

export function SignInForm(props: SignInFormProps): JSX.Element {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [pending, setPending] = createSignal(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await props.onSubmit(email(), password());
      if (result.error) setError(result.error);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div class={props.class}>
      <Show when={props.mockAuthNotice}>
        <p class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {props.mockAuthNotice}
        </p>
      </Show>

      <form onSubmit={handleSubmit} class="space-y-4">
        <div>
          <label
            class="mb-1 block text-sm font-medium text-[var(--color-text,#111)]"
            for="sui-email"
          >
            Email
          </label>
          <input
            id="sui-email"
            type="email"
            required
            autocomplete="email"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            class="w-full rounded-lg border border-[var(--color-surface1,rgba(0,0,0,0.2))] bg-[var(--color-bg,#fff)] px-3 py-2 text-sm text-[var(--color-text,#111)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#0ea5e9)]"
          />
        </div>

        <div>
          <label
            class="mb-1 block text-sm font-medium text-[var(--color-text,#111)]"
            for="sui-password"
          >
            Password
          </label>
          <input
            id="sui-password"
            type="password"
            required
            autocomplete="current-password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            class="w-full rounded-lg border border-[var(--color-surface1,rgba(0,0,0,0.2))] bg-[var(--color-bg,#fff)] px-3 py-2 text-sm text-[var(--color-text,#111)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#0ea5e9)]"
          />
        </div>

        <Show when={error()}>
          <p class="text-sm text-red-600">{error()}</p>
        </Show>

        <button
          type="submit"
          disabled={pending()}
          class="w-full rounded-full bg-[var(--color-primary,#0ea5e9)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending() ? "Signing in…" : (props.submitLabel ?? "Sign in")}
        </button>
      </form>
    </div>
  );
}
