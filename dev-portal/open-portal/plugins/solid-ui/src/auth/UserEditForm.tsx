import type { JSX } from "solid-js";
import { createSignal, Show, For } from "solid-js";
import { createForm, Field } from "@tanstack/solid-form";
import type { FieldApi } from "@tanstack/solid-form";
import { Button } from "../components/Button.tsx";
import { Input } from "../components/Input.tsx";
import { Modal } from "../components/Modal.tsx";

export interface UserEditFormProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  availableRoles: string[];
  onSubmit: (user: {
    id: string;
    name: string;
    email: string;
    role: string;
  }) => Promise<{ error?: string }>;
  onCancel?: () => void;
}

function FieldInfo(props: { field: FieldApi<any, any, any, any> }): JSX.Element {
  return (
    <Show when={props.field.state.meta.touchedError}>
      <p class="mt-1 text-sm text-red-600">{props.field.state.meta.touchedError}</p>
    </Show>
  );
}

export function UserEditForm(props: UserEditFormProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string | null>(null);

  const form = createForm(() => ({
    defaultValues: {
      id: props.user?.id || "",
      name: props.user?.name || "",
      email: props.user?.email || "",
      role: props.user?.role || "",
    },
    onSubmit: async (values) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const result = await props.onSubmit({
          id: values.id,
          name: values.name,
          email: values.email,
          role: values.role,
        });
        if (result.error) {
          setSubmitError(result.error);
        }
      } catch {
        setSubmitError("An unexpected error occurred");
      } finally {
        setIsSubmitting(false);
      }
    },
  }));

  return (
    <Modal open={!!props.user} onClose={props.onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class="space-y-4"
      >
        <h2 class="text-lg font-semibold">{props.user ? "Edit User" : "Create User"}</h2>

        <Show when={submitError()}>
          <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError()}
          </div>
        </Show>

        <Field
          name="name"
          validators={{
            onChange: ({ value }) => {
              if (!value) return "Name is required";
              return undefined;
            },
          }}
          children={(field) => (
            <div>
              <label
                class="mb-1 block text-sm font-medium text-[var(--color-text,#111)]"
                for="user-name"
              >
                Name
              </label>
              <Input
                id="user-name"
                type="text"
                value={field().state.value}
                onBlur={field().handleBlur}
                onInput={(e) => field().setValue(e.currentTarget.value)}
                required
              />
              <FieldInfo field={field()} />
            </div>
          )}
        />

        <Field
          name="email"
          validators={{
            onChange: ({ value }) => {
              if (!value) return "Email is required";
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return "Invalid email format";
              }
              return undefined;
            },
          }}
          children={(field) => (
            <div>
              <label
                class="mb-1 block text-sm font-medium text-[var(--color-text,#111)]"
                for="user-email"
              >
                Email
              </label>
              <Input
                id="user-email"
                type="email"
                value={field().state.value}
                onBlur={field().handleBlur}
                onInput={(e) => field().setValue(e.currentTarget.value)}
                required
              />
              <FieldInfo field={field()} />
            </div>
          )}
        />

        <Field
          name="role"
          validators={{
            onChange: ({ value }) => {
              if (!value) return "Role is required";
              return undefined;
            },
          }}
          children={(field) => (
            <div>
              <label
                class="mb-1 block text-sm font-medium text-[var(--color-text,#111)]"
                for="user-role"
              >
                Role
              </label>
              <select
                id="user-role"
                value={field().state.value}
                onBlur={field().handleBlur}
                onChange={(e) => field().setValue(e.currentTarget.value)}
                class="w-full rounded-lg border border-[var(--color-surface1,rgba(0,0,0,0.2))] bg-[var(--color-bg,#fff)] px-3 py-2 text-sm text-[var(--color-text,#111)]"
                required
              >
                <option value="">Select a role</option>
                <For each={props.availableRoles}>
                  {(role) => <option value={role}>{role}</option>}
                </For>
              </select>
              <FieldInfo field={field()} />
            </div>
          )}
        />

        <div class="flex gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting()} class="flex-1">
            {isSubmitting() ? "Saving…" : "Save"}
          </Button>
          <Button type="button" class="flex-1 btn-outline" onClick={props.onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
