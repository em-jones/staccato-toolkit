import type { JSX } from "solid-js";
import { createSignal, For, Show } from "solid-js";
import { createQuery, useQueryClient, type DefinedCreateQueryResult } from "@tanstack/solid-query";
import { Button } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Input } from "../components/Input.tsx";
import { Loading } from "../components/Loading.tsx";
import { Table, TableHead, TableBody, TableRow, TableCell } from "../components/Table.tsx";
import { Modal } from "../components/Modal.tsx";
export interface ServiceIdentity {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  /** Only shown on creation */
  clientSecret?: string;
  scopes: string[];
  status: "active" | "revoked";
  createdAt?: string;
  lastUsedAt?: string;
}

export interface ServiceIdentityPanelProps {
  organizationId?: string;
  fetchIdentities: (orgId?: string) => Promise<ServiceIdentity[]>;
  createIdentity?: (data: {
    name: string;
    description?: string;
    scopes: string[];
  }) => Promise<{ identity?: ServiceIdentity; error?: string }>;
  revokeIdentity?: (id: string) => Promise<{ error?: string }>;
  rotateSecret?: (id: string) => Promise<{ clientSecret?: string; error?: string }>;
  availableScopes?: string[];
}

export function ServiceIdentityPanel(props: ServiceIdentityPanelProps): JSX.Element {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = createSignal(false);
  const [newName, setNewName] = createSignal("");
  const [newDescription, setNewDescription] = createSignal("");
  const [selectedScopes, setSelectedScopes] = createSignal<Set<string>>(new Set());
  const [newSecret, setNewSecret] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [pending, setPending] = createSignal(false);

  const identitiesQuery = createQuery(() => ({
    queryKey: ["service-identities", props.organizationId],
    queryFn: () => props.fetchIdentities(props.organizationId),
  })) as DefinedCreateQueryResult<ServiceIdentity[], Error>;

  const scopes = () =>
    props.availableScopes ?? [
      "catalog:read",
      "catalog:write",
      "users:read",
      "users:manage",
      "kubernetes:read",
      "kubernetes:write",
      "workflows:execute",
    ];

  function toggleScope(scope: string) {
    const next = new Set(selectedScopes());
    if (next.has(scope)) {
      next.delete(scope);
    } else {
      next.add(scope);
    }
    setSelectedScopes(next);
  }

  async function handleCreate() {
    if (!newName() || !props.createIdentity) return;
    setPending(true);
    setError(null);
    const result = await props.createIdentity({
      name: newName(),
      description: newDescription() || undefined,
      scopes: Array.from(selectedScopes()),
    });
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else if (result.identity?.clientSecret) {
      setNewSecret(result.identity.clientSecret);
      setNewName("");
      setNewDescription("");
      setSelectedScopes(new Set());
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ["service-identities"] });
    }
  }

  async function handleRevoke(id: string) {
    if (
      !props.revokeIdentity ||
      !confirm("Revoke this service identity? API keys will stop working immediately.")
    )
      return;
    setError(null);
    const result = await props.revokeIdentity(id);
    if (result.error) {
      setError(result.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ["service-identities"] });
    }
  }

  async function handleRotate(id: string) {
    if (
      !props.rotateSecret ||
      !confirm("Rotate the client secret? The old secret will be invalidated immediately.")
    )
      return;
    setError(null);
    const result = await props.rotateSecret(id);
    if (result.error) {
      setError(result.error);
    } else if (result.clientSecret) {
      setNewSecret(result.clientSecret);
    }
  }

  return (
    <div class="space-y-6">
      <Show when={error()}>
        <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error()}
        </div>
      </Show>

      {/* Secret display banner */}
      <Show when={newSecret()}>
        <div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p class="mb-2 text-sm font-semibold text-amber-800">
            Client secret — copy it now, it won't be shown again:
          </p>
          <code class="block break-all rounded bg-amber-100 px-3 py-2 text-sm font-mono text-amber-900">
            {newSecret()}
          </code>
          <Button class="btn-xs mt-2" onClick={() => setNewSecret(null)}>
            Dismiss
          </Button>
        </div>
      </Show>

      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Service Identities</h2>
        <Show when={props.createIdentity}>
          <Button onClick={() => setShowCreateForm(!showCreateForm())}>
            {showCreateForm() ? "Cancel" : "New Service Identity"}
          </Button>
        </Show>
      </div>

      <Show when={showCreateForm()}>
        <Card class="space-y-4 p-4">
          <h3 class="font-semibold">Create Service Identity</h3>
          <div>
            <label class="mb-1 block text-sm font-medium">Name</label>
            <Input
              type="text"
              placeholder="ci-pipeline"
              value={newName()}
              onInput={(e) => setNewName(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">Description</label>
            <Input
              type="text"
              placeholder="CI/CD pipeline service account"
              value={newDescription()}
              onInput={(e) => setNewDescription(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">Scopes</label>
            <div class="space-y-2">
              <For each={scopes()}>
                {(scope) => (
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedScopes().has(scope)}
                      onChange={() => toggleScope(scope)}
                      class="rounded"
                    />
                    <span class="text-sm">{scope}</span>
                  </label>
                )}
              </For>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={pending() || !newName()}>
            {pending() ? "Creating…" : "Create"}
          </Button>
        </Card>
      </Show>

      <Show when={!identitiesQuery.isPending} fallback={<Loading variant="spinner" />}>
        <Show
          when={identitiesQuery.data && identitiesQuery.data.length > 0}
          fallback={
            <p class="text-center text-sm text-[var(--color-text-secondary)]">
              No service identities configured.
            </p>
          }
        >
          <div class="overflow-x-auto rounded-lg border border-[var(--color-surface1)]">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Client ID</TableCell>
                  <TableCell>Scopes</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell class="text-right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <For each={identitiesQuery.data}>
                  {(identity) => (
                    <TableRow>
                      <TableCell>
                        <div>
                          <div class="font-medium">{identity.name}</div>
                          <Show when={identity.description}>
                            <div class="text-xs text-[var(--color-text-secondary)]">
                              {identity.description}
                            </div>
                          </Show>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code class="text-xs">{identity.clientId}</code>
                      </TableCell>
                      <TableCell>
                        <div class="flex flex-wrap gap-1">
                          <For each={identity.scopes}>
                            {(scope) => (
                              <span class="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                                {scope}
                              </span>
                            )}
                          </For>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          class={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            identity.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {identity.status}
                        </span>
                      </TableCell>
                      <TableCell class="space-x-2 text-right">
                        <Show when={props.rotateSecret && identity.status === "active"}>
                          <Button class="btn-xs" onClick={() => handleRotate(identity.id)}>
                            Rotate
                          </Button>
                        </Show>
                        <Show when={props.revokeIdentity && identity.status === "active"}>
                          <Button
                            class="btn-xs btn-error"
                            onClick={() => handleRevoke(identity.id)}
                          >
                            Revoke
                          </Button>
                        </Show>
                      </TableCell>
                    </TableRow>
                  )}
                </For>
              </TableBody>
            </Table>
          </div>
        </Show>
      </Show>
    </div>
  );
}
