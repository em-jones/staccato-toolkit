import type { JSX } from "solid-js";
import { createSignal, For, Show, createMemo } from "solid-js";
import { createQuery, type DefinedCreateQueryResult } from "@tanstack/solid-query";
import { Button } from "../components/Button.tsx";
import { Input } from "../components/Input.tsx";
import { Table, TableHead, TableBody, TableRow, TableCell } from "../components/Table.tsx";
import { Loading } from "../components/Loading.tsx";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
}

export interface UserTableProps {
  organizationId: string;
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
  onRoleChange?: (userId: string, newRole: string) => void;
  fetchUsers: (orgId: string, filters?: { role?: string; search?: string }) => Promise<User[]>;
}

export function UserTable(props: UserTableProps): JSX.Element {
  const [searchTerm, setSearchTerm] = createSignal("");
  const [roleFilter, setRoleFilter] = createSignal<string | undefined>();
  const [sortBy, setSortBy] = createSignal<"name" | "email" | "role">("name");
  const [sortOrder, setSortOrder] = createSignal<"asc" | "desc">("asc");

  const usersQuery = createQuery(() => ({
    queryKey: ["users", props.organizationId, searchTerm(), roleFilter()],
    queryFn: () =>
      props.fetchUsers(props.organizationId, {
        role: roleFilter(),
        search: searchTerm(),
      }),
  })) as DefinedCreateQueryResult<User[], Error>;

  const sortedUsers = createMemo(() => {
    const users = usersQuery.data || [];
    const sorted = [...users].sort((a, b) => {
      const key = sortBy();
      let aVal = a[key];
      let bVal = b[key];

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder() === "asc" ? comparison : -comparison;
    });

    return sorted;
  });

  const uniqueRoles = createMemo(() => {
    const users = usersQuery.data || [];
    return [...new Set(users.map((u) => u.role))].sort();
  });

  function handleSort(key: "name" | "email" | "role") {
    if (sortBy() === key) {
      setSortOrder(sortOrder() === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  }

  const getSortIndicator = (key: string) => {
    if (sortBy() !== key) return "";
    return sortOrder() === "asc" ? " ↑" : " ↓";
  };

  return (
    <div class="space-y-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:gap-2">
        <Input
          type="text"
          placeholder="Search users..."
          value={searchTerm()}
          onInput={(e) => setSearchTerm(e.currentTarget.value)}
          class="flex-1"
        />

        <select
          value={roleFilter() || ""}
          onChange={(e) => setRoleFilter(e.currentTarget.value || undefined)}
          class="rounded-lg border border-[var(--color-surface1,rgba(0,0,0,0.2))] bg-[var(--color-bg,#fff)] px-3 py-2 text-sm text-[var(--color-text,#111)]"
        >
          <option value="">All Roles</option>
          <For each={uniqueRoles()}>{(role) => <option value={role}>{role}</option>}</For>
        </select>
      </div>

      <Show when={!usersQuery.isPending} fallback={<Loading variant="spinner" />}>
        <div class="overflow-x-auto rounded-lg border border-[var(--color-surface1,rgba(0,0,0,0.2))]">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell
                  class="cursor-pointer hover:bg-[var(--color-surface2)]"
                  onClick={() => handleSort("name")}
                >
                  Name{getSortIndicator("name")}
                </TableCell>
                <TableCell
                  class="cursor-pointer hover:bg-[var(--color-surface2)]"
                  onClick={() => handleSort("email")}
                >
                  Email{getSortIndicator("email")}
                </TableCell>
                <TableCell
                  class="cursor-pointer hover:bg-[var(--color-surface2)]"
                  onClick={() => handleSort("role")}
                >
                  Role{getSortIndicator("role")}
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell class="text-right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <For each={sortedUsers()}>
                {(user) => (
                  <TableRow>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <span
                        class={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          user.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell class="space-x-2 text-right">
                      <Show when={props.onEdit}>
                        <Button class="btn-xs" onClick={() => props.onEdit?.(user)}>
                          Edit
                        </Button>
                      </Show>
                      <Show when={props.onRoleChange}>
                        <Button class="btn-xs" onClick={() => props.onRoleChange?.(user.id, "")}>
                          Change Role
                        </Button>
                      </Show>
                      <Show when={props.onDelete}>
                        <Button class="btn-xs btn-error" onClick={() => props.onDelete?.(user.id)}>
                          Delete
                        </Button>
                      </Show>
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </div>

        <Show when={sortedUsers().length === 0}>
          <p class="text-center text-sm text-[var(--color-text-secondary,rgba(0,0,0,0.6))]">
            No users found.
          </p>
        </Show>
      </Show>
    </div>
  );
}
