import { createFileRoute } from "@tanstack/solid-router";
import { RolePanel } from "@op-plugin/solid-ui";
import { listRolesFn, createRoleFn, deleteRoleFn } from "../../server/iam";

export const Route = createFileRoute("/settings/roles")({
  component: RolesPage,
});

function RolesPage() {
  return (
    <div>
      <h1 class="mb-6 text-2xl font-bold text-[var(--color-text)]">Roles</h1>
      <RolePanel
        organizationId="default"
        fetchRoles={async () => {
          const roles = await listRolesFn();
          return roles;
        }}
        createRole={async (_orgId, role) => {
          return createRoleFn({ data: { name: role.name, description: role.description } });
        }}
        deleteRole={async (_orgId, roleId) => {
          return deleteRoleFn({ data: { id: roleId } });
        }}
      />
    </div>
  );
}
