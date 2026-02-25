import type { JSX } from "solid-js";
import { createSignal, For, Show } from "solid-js";
import { createQuery, type DefinedCreateQueryResult } from "@tanstack/solid-query";
import { Button } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Input } from "../components/Input.tsx";
import { Accordion } from "../components/Accordion.tsx";
import { Loading } from "../components/Loading.tsx";

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  inheritedFrom?: string[];
}

export interface RolePanelProps {
  organizationId: string;
  fetchRoles: (orgId: string) => Promise<Role[]>;
  createRole?: (orgId: string, role: Omit<Role, "id">) => Promise<{ error?: string }>;
  updateRole?: (orgId: string, roleId: string, role: Partial<Role>) => Promise<{ error?: string }>;
  deleteRole?: (orgId: string, roleId: string) => Promise<{ error?: string }>;
}

export function RolePanel(props: RolePanelProps): JSX.Element {
  const [showCreateForm, setShowCreateForm] = createSignal(false);
  const [newRoleName, setNewRoleName] = createSignal("");
  const [newRoleDescription, setNewRoleDescription] = createSignal("");
  const [selectedPermissions, setSelectedPermissions] = createSignal<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const rolesQuery = createQuery(() => ({
    queryKey: ["roles", props.organizationId],
    queryFn: () => props.fetchRoles(props.organizationId),
  })) as DefinedCreateQueryResult<Role[], Error>;

  const allPermissions = [
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
    "roles:read",
    "roles:create",
    "roles:update",
    "roles:delete",
    "policies:read",
    "policies:create",
    "policies:update",
    "policies:delete",
  ];

  async function handleCreateRole() {
    if (!newRoleName() || !props.createRole) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await props.createRole(props.organizationId, {
        name: newRoleName(),
        description: newRoleDescription(),
        permissions: Array.from(selectedPermissions()),
      });

      if (result.error) {
        setError(result.error);
      } else {
        setNewRoleName("");
        setNewRoleDescription("");
        setSelectedPermissions(new Set());
        setShowCreateForm(false);
        rolesQuery.refetch();
      }
    } catch {
      setError("Failed to create role");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteRole(roleId: string) {
    if (!props.deleteRole || !confirm("Delete this role?")) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await props.deleteRole(props.organizationId, roleId);
      if (result.error) {
        setError(result.error);
      } else {
        rolesQuery.refetch();
      }
    } catch {
      setError("Failed to delete role");
    } finally {
      setIsSubmitting(false);
    }
  }

  const togglePermission = (permission: string) => {
    const newSet = new Set(selectedPermissions());
    if (newSet.has(permission)) {
      newSet.delete(permission);
    } else {
      newSet.add(permission);
    }
    setSelectedPermissions(newSet);
  };

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Roles</h2>
        <Show when={props.createRole}>
          <Button onClick={() => setShowCreateForm(!showCreateForm())}>
            {showCreateForm() ? "Cancel" : "Create Role"}
          </Button>
        </Show>
      </div>

      <Show when={showCreateForm() && props.createRole}>
        <Card class="space-y-4 p-4">
          <h3 class="font-semibold">Create New Role</h3>

          <Show when={error()}>
            <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error()}
            </div>
          </Show>

          <div>
            <label class="mb-1 block text-sm font-medium">Role Name</label>
            <Input
              type="text"
              placeholder="e.g., Editor"
              value={newRoleName()}
              onInput={(e) => setNewRoleName(e.currentTarget.value)}
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium">Description</label>
            <Input
              type="text"
              placeholder="Role description"
              value={newRoleDescription()}
              onInput={(e) => setNewRoleDescription(e.currentTarget.value)}
            />
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium">Permissions</label>
            <div class="space-y-2">
              <For each={allPermissions}>
                {(permission) => (
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedPermissions().has(permission)}
                      onChange={() => togglePermission(permission)}
                      class="rounded"
                    />
                    <span class="text-sm">{permission}</span>
                  </label>
                )}
              </For>
            </div>
          </div>

          <Button onClick={handleCreateRole} disabled={isSubmitting() || !newRoleName()}>
            {isSubmitting() ? "Creating…" : "Create"}
          </Button>
        </Card>
      </Show>

      <Show when={!rolesQuery.isPending} fallback={<Loading variant="spinner" />}>
        <Show
          when={rolesQuery.data && rolesQuery.data.length > 0}
          fallback={
            <p class="text-center text-sm text-[var(--color-text-secondary)]">No roles found.</p>
          }
        >
          <Accordion
            items={
              rolesQuery.data?.map((role) => ({
                title: (
                  <div class="flex items-center justify-between gap-2">
                    <div>
                      <div class="font-semibold">{role.name}</div>
                      <div class="text-sm text-[var(--color-text-secondary)]">
                        {role.description}
                      </div>
                    </div>
                    <Show when={props.deleteRole}>
                      <Button
                        class="btn-xs btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.id);
                        }}
                      >
                        Delete
                      </Button>
                    </Show>
                  </div>
                ),
                children: (
                  <div class="space-y-3 p-4">
                    <div>
                      <h4 class="text-sm font-semibold">Permissions</h4>
                      <div class="mt-2 flex flex-wrap gap-2">
                        <For each={role.permissions}>
                          {(permission) => (
                            <span class="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800">
                              {permission}
                            </span>
                          )}
                        </For>
                      </div>
                    </div>

                    <Show when={role.inheritedFrom && role.inheritedFrom.length > 0}>
                      <div>
                        <h4 class="text-sm font-semibold">Inherited From</h4>
                        <div class="mt-2 flex flex-wrap gap-2">
                          <For each={role.inheritedFrom || []}>
                            {(parentRole) => (
                              <span class="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-800">
                                {parentRole}
                              </span>
                            )}
                          </For>
                        </div>
                      </div>
                    </Show>
                  </div>
                ),
              })) || []
            }
          />
        </Show>
      </Show>
    </div>
  );
}
