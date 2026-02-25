import { createFileRoute } from "@tanstack/solid-router";
import { ServiceIdentityPanel } from "@op-plugin/solid-ui";
import {
  listServiceIdentitiesFn,
  createServiceIdentityFn,
  revokeServiceIdentityFn,
  rotateServiceIdentitySecretFn,
} from "../../server/iam";

export const Route = createFileRoute("/settings/service-identities")({
  component: ServiceIdentitiesPage,
});

function ServiceIdentitiesPage() {
  return (
    <div>
      <h1 class="mb-6 text-2xl font-bold text-[var(--color-text)]">Service Identities</h1>
      <ServiceIdentityPanel
        fetchIdentities={async () => listServiceIdentitiesFn()}
        createIdentity={async (data: { name: string; description?: string; scopes: string[] }) => {
          const result = await createServiceIdentityFn({ data });
          return result;
        }}
        revokeIdentity={async (id: string) => {
          return revokeServiceIdentityFn({ data: { id } });
        }}
        rotateSecret={async (id: string) => {
          return rotateServiceIdentitySecretFn({ data: { id } });
        }}
      />
    </div>
  );
}
