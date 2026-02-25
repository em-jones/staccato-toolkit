import { createFileRoute } from "@tanstack/solid-router";
import { OrganizationPanel } from "@op-plugin/solid-ui";
import {
  listOrganizationsFn,
  createOrganizationFn,
  deleteOrganizationFn,
  listOrgMembersFn,
  inviteMemberFn,
  removeMemberFn,
  updateMemberRoleFn,
} from "../../server/iam";

export const Route = createFileRoute("/settings/organizations")({
  component: OrganizationsPage,
});

function OrganizationsPage() {
  return (
    <div>
      <h1 class="mb-6 text-2xl font-bold text-[var(--color-text)]">Organizations</h1>
      <OrganizationPanel
        fetchOrganizations={() => listOrganizationsFn()}
        createOrganization={async (data: { name: string; slug: string }) => {
          const result = await createOrganizationFn({ data });
          return { error: result.error };
        }}
        deleteOrganization={async (id: string) => {
          const result = await deleteOrganizationFn({ data: { id } });
          return { error: result.error };
        }}
        fetchMembers={(orgId: string) => listOrgMembersFn({ data: { orgId } })}
        inviteMember={async (orgId: string, email: string, role: string) => {
          const result = await inviteMemberFn({ data: { orgId, email, role } });
          return { error: result.error };
        }}
        removeMember={async (orgId: string, userId: string) => {
          const result = await removeMemberFn({ data: { orgId, userId } });
          return { error: result.error };
        }}
        updateMemberRole={async (orgId: string, userId: string, role: string) => {
          const result = await updateMemberRoleFn({ data: { orgId, userId, role } });
          return { error: result.error };
        }}
        availableRoles={["admin", "member", "viewer"]}
      />
    </div>
  );
}
