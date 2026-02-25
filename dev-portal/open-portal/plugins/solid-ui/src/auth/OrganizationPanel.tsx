import type { JSX } from "solid-js";
import { createSignal, For, Show } from "solid-js";
import {
  createQuery,
  createMutation,
  useQueryClient,
  type DefinedCreateQueryResult,
} from "@tanstack/solid-query";
import { Button } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Input } from "../components/Input.tsx";
import { Loading } from "../components/Loading.tsx";
import { Table, TableHead, TableBody, TableRow, TableCell } from "../components/Table.tsx";
import { Modal } from "../components/Modal.tsx";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  memberCount?: number;
  createdAt?: string;
}

export interface OrganizationMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt?: string;
}

export interface OrganizationPanelProps {
  fetchOrganizations: () => Promise<Organization[]>;
  createOrganization?: (data: { name: string; slug: string }) => Promise<{ error?: string }>;
  updateOrganization?: (
    id: string,
    data: { name?: string; slug?: string },
  ) => Promise<{ error?: string }>;
  deleteOrganization?: (id: string) => Promise<{ error?: string }>;
  fetchMembers?: (orgId: string) => Promise<OrganizationMember[]>;
  inviteMember?: (orgId: string, email: string, role: string) => Promise<{ error?: string }>;
  removeMember?: (orgId: string, userId: string) => Promise<{ error?: string }>;
  updateMemberRole?: (orgId: string, userId: string, role: string) => Promise<{ error?: string }>;
  availableRoles?: string[];
}

export function OrganizationPanel(props: OrganizationPanelProps): JSX.Element {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = createSignal(false);
  const [selectedOrg, setSelectedOrg] = createSignal<Organization | null>(null);
  const [showInviteModal, setShowInviteModal] = createSignal(false);
  const [newOrgName, setNewOrgName] = createSignal("");
  const [newOrgSlug, setNewOrgSlug] = createSignal("");
  const [inviteEmail, setInviteEmail] = createSignal("");
  const [inviteRole, setInviteRole] = createSignal("member");
  const [error, setError] = createSignal<string | null>(null);

  const orgsQuery = createQuery(() => ({
    queryKey: ["organizations"],
    queryFn: () => props.fetchOrganizations(),
  })) as DefinedCreateQueryResult<Organization[], Error>;

  const membersQuery = createQuery(() => ({
    queryKey: ["org-members", selectedOrg()?.id],
    queryFn: () => props.fetchMembers?.(selectedOrg()!.id) ?? Promise.resolve([]),
    enabled: !!selectedOrg() && !!props.fetchMembers,
  })) as DefinedCreateQueryResult<OrganizationMember[], Error>;

  async function handleCreateOrg() {
    if (!newOrgName() || !props.createOrganization) return;
    setError(null);
    const slug =
      newOrgSlug() ||
      newOrgName()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    const result = await props.createOrganization({ name: newOrgName(), slug });
    if (result.error) {
      setError(result.error);
    } else {
      setNewOrgName("");
      setNewOrgSlug("");
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    }
  }

  async function handleDeleteOrg(id: string) {
    if (!props.deleteOrganization || !confirm("Delete this organization? This cannot be undone."))
      return;
    setError(null);
    const result = await props.deleteOrganization(id);
    if (result.error) {
      setError(result.error);
    } else {
      if (selectedOrg()?.id === id) setSelectedOrg(null);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    }
  }

  async function handleInvite() {
    if (!inviteEmail() || !selectedOrg() || !props.inviteMember) return;
    setError(null);
    const result = await props.inviteMember(selectedOrg()!.id, inviteEmail(), inviteRole());
    if (result.error) {
      setError(result.error);
    } else {
      setInviteEmail("");
      setInviteRole("member");
      setShowInviteModal(false);
      queryClient.invalidateQueries({ queryKey: ["org-members", selectedOrg()?.id] });
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedOrg() || !props.removeMember || !confirm("Remove this member?")) return;
    setError(null);
    const result = await props.removeMember(selectedOrg()!.id, userId);
    if (result.error) {
      setError(result.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ["org-members", selectedOrg()?.id] });
    }
  }

  const roles = () => props.availableRoles ?? ["admin", "member", "viewer"];

  return (
    <div class="space-y-6">
      <Show when={error()}>
        <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error()}
        </div>
      </Show>

      {/* Organization List */}
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Organizations</h2>
        <Show when={props.createOrganization}>
          <Button onClick={() => setShowCreateForm(!showCreateForm())}>
            {showCreateForm() ? "Cancel" : "New Organization"}
          </Button>
        </Show>
      </div>

      <Show when={showCreateForm()}>
        <Card class="space-y-4 p-4">
          <h3 class="font-semibold">Create Organization</h3>
          <div>
            <label class="mb-1 block text-sm font-medium">Name</label>
            <Input
              type="text"
              placeholder="My Organization"
              value={newOrgName()}
              onInput={(e) => setNewOrgName(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">Slug</label>
            <Input
              type="text"
              placeholder="my-organization (auto-generated if blank)"
              value={newOrgSlug()}
              onInput={(e) => setNewOrgSlug(e.currentTarget.value)}
            />
          </div>
          <Button onClick={handleCreateOrg} disabled={!newOrgName()}>
            Create
          </Button>
        </Card>
      </Show>

      <Show when={!orgsQuery.isPending} fallback={<Loading variant="spinner" />}>
        <Show
          when={orgsQuery.data && orgsQuery.data.length > 0}
          fallback={
            <p class="text-center text-sm text-[var(--color-text-secondary)]">
              No organizations yet.
            </p>
          }
        >
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <For each={orgsQuery.data}>
              {(org) => (
                <Card
                  class={`cursor-pointer p-4 transition ${
                    selectedOrg()?.id === org.id
                      ? "ring-2 ring-[var(--color-primary,#0ea5e9)]"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setSelectedOrg(org)}
                >
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="font-semibold">{org.name}</h3>
                      <p class="text-sm text-[var(--color-text-secondary)]">{org.slug}</p>
                    </div>
                    <Show when={props.deleteOrganization}>
                      <Button
                        class="btn-xs btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOrg(org.id);
                        }}
                      >
                        Delete
                      </Button>
                    </Show>
                  </div>
                  <Show when={org.memberCount !== undefined}>
                    <p class="mt-2 text-xs text-[var(--color-text-secondary)]">
                      {org.memberCount} member{org.memberCount !== 1 ? "s" : ""}
                    </p>
                  </Show>
                </Card>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* Members Section */}
      <Show when={selectedOrg() && props.fetchMembers}>
        <div class="border-t border-[var(--color-surface1)] pt-6">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              Members of <span class="text-[var(--color-primary)]">{selectedOrg()!.name}</span>
            </h3>
            <Show when={props.inviteMember}>
              <Button onClick={() => setShowInviteModal(true)}>Invite Member</Button>
            </Show>
          </div>

          <Show when={!membersQuery.isPending} fallback={<Loading variant="spinner" />}>
            <Show
              when={membersQuery.data && membersQuery.data.length > 0}
              fallback={
                <p class="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
                  No members.
                </p>
              }
            >
              <div class="mt-4 overflow-x-auto rounded-lg border border-[var(--color-surface1)]">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell class="text-right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <For each={membersQuery.data}>
                      {(member) => (
                        <TableRow>
                          <TableCell>{member.name}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            <Show
                              when={props.updateMemberRole}
                              fallback={<span>{member.role}</span>}
                            >
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  props
                                    .updateMemberRole?.(
                                      selectedOrg()!.id,
                                      member.userId,
                                      e.currentTarget.value,
                                    )
                                    .then(() =>
                                      queryClient.invalidateQueries({
                                        queryKey: ["org-members", selectedOrg()?.id],
                                      }),
                                    )
                                }
                                class="rounded border border-[var(--color-surface1)] bg-[var(--color-bg)] px-2 py-1 text-sm"
                              >
                                <For each={roles()}>
                                  {(role) => <option value={role}>{role}</option>}
                                </For>
                              </select>
                            </Show>
                          </TableCell>
                          <TableCell class="text-right">
                            <Show when={props.removeMember}>
                              <Button
                                class="btn-xs btn-error"
                                onClick={() => handleRemoveMember(member.userId)}
                              >
                                Remove
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
      </Show>

      {/* Invite Modal */}
      <Modal open={showInviteModal()} onClose={() => setShowInviteModal(false)}>
        <div class="space-y-4">
          <h3 class="text-lg font-semibold">Invite Member</h3>
          <div>
            <label class="mb-1 block text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={inviteEmail()}
              onInput={(e) => setInviteEmail(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">Role</label>
            <select
              value={inviteRole()}
              onChange={(e) => setInviteRole(e.currentTarget.value)}
              class="w-full rounded-lg border border-[var(--color-surface1)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            >
              <For each={roles()}>{(role) => <option value={role}>{role}</option>}</For>
            </select>
          </div>
          <div class="flex gap-2">
            <Button onClick={handleInvite} disabled={!inviteEmail()} class="flex-1">
              Send Invite
            </Button>
            <Button class="flex-1 btn-outline" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
