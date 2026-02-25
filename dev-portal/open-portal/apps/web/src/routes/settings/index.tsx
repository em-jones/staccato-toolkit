import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { UserTable, UserEditForm } from "@op-plugin/solid-ui";
import type { User } from "@op-plugin/solid-ui";
import { listUsersFn, deleteUserFn } from "../../server/iam";

export const Route = createFileRoute("/settings/")({
  component: UsersPage,
});

function UsersPage() {
  const [editingUser, setEditingUser] = createSignal<User | undefined>();

  async function fetchUsers(_orgId: string, filters?: { role?: string; search?: string }) {
    const users = await listUsersFn();
    let result = users;
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }
    if (filters?.role) {
      result = result.filter((u) => u.role === filters.role);
    }
    return result;
  }

  async function handleDelete(userId: string) {
    if (!confirm("Delete this user?")) return;
    await deleteUserFn({ data: { id: userId } });
  }

  async function handleEditSubmit(_user: {
    id: string;
    name: string;
    email: string;
    role: string;
  }) {
    // TODO: wire to updateUserFn when available
    setEditingUser(undefined);
    return {};
  }

  return (
    <div>
      <h1 class="mb-6 text-2xl font-bold text-[var(--color-text)]">User Management</h1>
      <UserTable
        organizationId="default"
        fetchUsers={fetchUsers}
        onEdit={(user) => setEditingUser(user)}
        onDelete={handleDelete}
      />
      <Show when={editingUser()}>
        <UserEditForm
          user={editingUser()}
          availableRoles={["admin", "editor", "viewer", "operator"]}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditingUser(undefined)}
        />
      </Show>
    </div>
  );
}
