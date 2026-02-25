import type { JSX } from "solid-js";
import { createSignal, Show } from "solid-js";

export interface SignUpFormProps {
  onSubmit: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  submitLabel?: string;
  class?: string;
}

export function SignUpForm(props: SignUpFormProps): JSX.Element {
  const [name, setName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirm, setConfirm] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [pending, setPending] = createSignal(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (password() !== confirm()) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await props.onSubmit(name(), email(), password());
      if (result.error) setError(result.error);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const field =
    "w-full rounded-lg border border-[var(--color-surface1,rgba(0,0,0,0.2))] bg-[var(--color-bg,#fff)] px-3 py-2 text-sm text-[var(--color-text,#111)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#0ea5e9)]";
  const label = "mb-1 block text-sm font-medium text-[var(--color-text,#111)]";

  return (
    <div class={props.class}>
      <form onSubmit={handleSubmit} class="space-y-4">
        <div>
          <label class={label} for="suf-name">
            Full name
          </label>
          <input
            id="suf-name"
            type="text"
            required
            autocomplete="name"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            class={field}
          />
        </div>
        <div>
          <label class={label} for="suf-email">
            Email
          </label>
          <input
            id="suf-email"
            type="email"
            required
            autocomplete="email"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            class={field}
          />
        </div>
        <div>
          <label class={label} for="suf-password">
            Password
          </label>
          <input
            id="suf-password"
            type="password"
            required
            autocomplete="new-password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            class={field}
          />
        </div>
        <div>
          <label class={label} for="suf-confirm">
            Confirm password
          </label>
          <input
            id="suf-confirm"
            type="password"
            required
            autocomplete="new-password"
            value={confirm()}
            onInput={(e) => setConfirm(e.currentTarget.value)}
            class={field}
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
          {pending() ? "Creating account…" : (props.submitLabel ?? "Create account")}
        </button>
      </form>
    </div>
  );
}
