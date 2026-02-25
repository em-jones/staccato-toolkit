import { createFileRoute } from "@tanstack/solid-router";
import { PolicyPanel } from "@op-plugin/solid-ui";
import { listPoliciesFn, createPolicyFn, deletePolicyFn } from "../../server/iam";

export const Route = createFileRoute("/settings/policies")({
  component: PoliciesPage,
});

function PoliciesPage() {
  return (
    <div>
      <h1 class="mb-6 text-2xl font-bold text-[var(--color-text)]">Policies</h1>
      <PolicyPanel
        organizationId="default"
        fetchPolicies={async () => {
          return listPoliciesFn();
        }}
        createPolicy={async (_orgId, policy) => {
          return createPolicyFn({ data: policy });
        }}
        deletePolicy={async (_orgId, policyId) => {
          return deletePolicyFn({ data: { id: policyId } });
        }}
      />
    </div>
  );
}
