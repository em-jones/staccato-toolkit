import type { JSX } from "solid-js";
import { createSignal, For, Show } from "solid-js";
import { createQuery, type DefinedCreateQueryResult } from "@tanstack/solid-query";
import { Button } from "../components/Button.tsx";
import { Card } from "../components/Card.tsx";
import { Input } from "../components/Input.tsx";
import { Accordion } from "../components/Accordion.tsx";
import { Loading } from "../components/Loading.tsx";

export interface PolicyRule {
  effect: "Allow" | "Deny";
  actions: string[];
  resources: string[];
  conditions?: Record<string, unknown>;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  combiningAlgorithm: "DenyOverrides" | "AllowOverrides" | "FirstApplicable";
  rules: PolicyRule[];
}

export interface PolicyPanelProps {
  organizationId: string;
  fetchPolicies: (orgId: string) => Promise<Policy[]>;
  createPolicy?: (orgId: string, policy: Omit<Policy, "id">) => Promise<{ error?: string }>;
  updatePolicy?: (
    orgId: string,
    policyId: string,
    policy: Partial<Policy>,
  ) => Promise<{ error?: string }>;
  deletePolicy?: (orgId: string, policyId: string) => Promise<{ error?: string }>;
  testPolicy?: (
    orgId: string,
    userId: string,
    resourceId: string,
    action: string,
  ) => Promise<{ decision: "Allow" | "Deny"; explanation: string }>;
}

export function PolicyPanel(props: PolicyPanelProps): JSX.Element {
  const [showCreateForm, setShowCreateForm] = createSignal(false);
  const [showTestTool, setShowTestTool] = createSignal(false);
  const [newPolicyName, setNewPolicyName] = createSignal("");
  const [newPolicyDescription, setNewPolicyDescription] = createSignal("");
  const [newPolicyCombining, setNewPolicyCombining] = createSignal<
    "DenyOverrides" | "AllowOverrides" | "FirstApplicable"
  >("DenyOverrides");
  const [testUserId, setTestUserId] = createSignal("");
  const [testResourceId, setTestResourceId] = createSignal("");
  const [testAction, setTestAction] = createSignal("");
  const [testResult, setTestResult] = createSignal<{
    decision: "Allow" | "Deny";
    explanation: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const policiesQuery = createQuery(() => ({
    queryKey: ["policies", props.organizationId],
    queryFn: () => props.fetchPolicies(props.organizationId),
  })) as DefinedCreateQueryResult<Policy[], Error>;

  async function handleCreatePolicy() {
    if (!newPolicyName() || !props.createPolicy) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await props.createPolicy(props.organizationId, {
        name: newPolicyName(),
        description: newPolicyDescription(),
        combiningAlgorithm: newPolicyCombining(),
        rules: [],
      });

      if (result.error) {
        setError(result.error);
      } else {
        setNewPolicyName("");
        setNewPolicyDescription("");
        setNewPolicyCombining("DenyOverrides");
        setShowCreateForm(false);
        policiesQuery.refetch();
      }
    } catch {
      setError("Failed to create policy");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePolicy(policyId: string) {
    if (!props.deletePolicy || !confirm("Delete this policy?")) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await props.deletePolicy(props.organizationId, policyId);
      if (result.error) {
        setError(result.error);
      } else {
        policiesQuery.refetch();
      }
    } catch {
      setError("Failed to delete policy");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTestPolicy() {
    if (!testUserId() || !testResourceId() || !testAction() || !props.testPolicy) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await props.testPolicy(
        props.organizationId,
        testUserId(),
        testResourceId(),
        testAction(),
      );
      setTestResult(result);
    } catch {
      setError("Failed to test policy");
    } finally {
      setIsSubmitting(false);
    }
  }

  const combiningSummary = (algorithm: string) => {
    switch (algorithm) {
      case "DenyOverrides":
        return "Any Deny decision overrides Allow decisions";
      case "AllowOverrides":
        return "Any Allow decision overrides Deny decisions";
      case "FirstApplicable":
        return "First applicable policy rule determines the decision";
      default:
        return algorithm;
    }
  };

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Policies</h2>
        <div class="flex gap-2">
          <Show when={props.testPolicy}>
            <Button class="btn-secondary" onClick={() => setShowTestTool(!showTestTool())}>
              {showTestTool() ? "Close Tool" : "Test Policy"}
            </Button>
          </Show>
          <Show when={props.createPolicy}>
            <Button onClick={() => setShowCreateForm(!showCreateForm())}>
              {showCreateForm() ? "Cancel" : "Create Policy"}
            </Button>
          </Show>
        </div>
      </div>

      <Show when={showTestTool() && props.testPolicy}>
        <Card class="space-y-4 border-blue-200 bg-blue-50 p-4">
          <h3 class="font-semibold">Test Policy Decision</h3>

          <div class="grid gap-4 md:grid-cols-3">
            <div>
              <label class="mb-1 block text-sm font-medium">User ID</label>
              <Input
                type="text"
                placeholder="user-id"
                value={testUserId()}
                onInput={(e) => setTestUserId(e.currentTarget.value)}
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium">Resource ID</label>
              <Input
                type="text"
                placeholder="resource-id"
                value={testResourceId()}
                onInput={(e) => setTestResourceId(e.currentTarget.value)}
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium">Action</label>
              <Input
                type="text"
                placeholder="read"
                value={testAction()}
                onInput={(e) => setTestAction(e.currentTarget.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleTestPolicy}
            disabled={isSubmitting() || !testUserId() || !testResourceId() || !testAction()}
          >
            {isSubmitting() ? "Testing…" : "Test"}
          </Button>

          <Show when={testResult()}>
            <div
              class={`rounded-lg p-3 ${
                testResult()!.decision === "Allow"
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div
                class={`text-sm font-semibold ${
                  testResult()!.decision === "Allow" ? "text-green-800" : "text-red-800"
                }`}
              >
                Decision: {testResult()!.decision}
              </div>
              <div
                class={`mt-1 text-sm ${
                  testResult()!.decision === "Allow" ? "text-green-700" : "text-red-700"
                }`}
              >
                {testResult()!.explanation}
              </div>
            </div>
          </Show>
        </Card>
      </Show>

      <Show when={showCreateForm() && props.createPolicy}>
        <Card class="space-y-4 p-4">
          <h3 class="font-semibold">Create New Policy</h3>

          <Show when={error()}>
            <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error()}
            </div>
          </Show>

          <div>
            <label class="mb-1 block text-sm font-medium">Policy Name</label>
            <Input
              type="text"
              placeholder="e.g., Document Access"
              value={newPolicyName()}
              onInput={(e) => setNewPolicyName(e.currentTarget.value)}
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium">Description</label>
            <Input
              type="text"
              placeholder="Policy description"
              value={newPolicyDescription()}
              onInput={(e) => setNewPolicyDescription(e.currentTarget.value)}
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium">Combining Algorithm</label>
            <select
              value={newPolicyCombining()}
              onChange={(e) =>
                setNewPolicyCombining(
                  e.currentTarget.value as "DenyOverrides" | "AllowOverrides" | "FirstApplicable",
                )
              }
              class="w-full rounded-lg border border-[var(--color-surface1,rgba(0,0,0,0.2))] bg-[var(--color-bg,#fff)] px-3 py-2 text-sm text-[var(--color-text,#111)]"
            >
              <option value="DenyOverrides">Deny Overrides</option>
              <option value="AllowOverrides">Allow Overrides</option>
              <option value="FirstApplicable">First Applicable</option>
            </select>
            <p class="mt-1 text-xs text-[var(--color-text-secondary)]">
              {combiningSummary(newPolicyCombining())}
            </p>
          </div>

          <Button onClick={handleCreatePolicy} disabled={isSubmitting() || !newPolicyName()}>
            {isSubmitting() ? "Creating…" : "Create"}
          </Button>
        </Card>
      </Show>

      <Show when={!policiesQuery.isPending} fallback={<Loading variant="spinner" />}>
        <Show
          when={policiesQuery.data && policiesQuery.data.length > 0}
          fallback={
            <p class="text-center text-sm text-[var(--color-text-secondary)]">No policies found.</p>
          }
        >
          <Accordion
            items={
              policiesQuery.data?.map((policy) => ({
                title: (
                  <div class="flex items-center justify-between gap-2">
                    <div>
                      <div class="font-semibold">{policy.name}</div>
                      <div class="text-sm text-[var(--color-text-secondary)]">
                        {policy.description}
                      </div>
                    </div>
                    <Show when={props.deletePolicy}>
                      <Button
                        class="btn-xs btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePolicy(policy.id);
                        }}
                      >
                        Delete
                      </Button>
                    </Show>
                  </div>
                ),
                children: (
                  <div class="space-y-4 p-4">
                    <div>
                      <h4 class="text-sm font-semibold">Combining Algorithm</h4>
                      <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {policy.combiningAlgorithm}
                      </p>
                      <p class="mt-1 text-xs text-[var(--color-text-secondary)]">
                        {combiningSummary(policy.combiningAlgorithm)}
                      </p>
                    </div>

                    <div>
                      <h4 class="text-sm font-semibold">Rules</h4>
                      <div class="mt-2 space-y-2">
                        <Show
                          when={policy.rules.length > 0}
                          fallback={
                            <p class="text-sm text-[var(--color-text-secondary)]">
                              No rules defined
                            </p>
                          }
                        >
                          <For each={policy.rules}>
                            {(rule, index) => (
                              <Card class="space-y-2 border-l-4 border-blue-400 bg-blue-50 p-3">
                                <div class="flex items-center gap-2">
                                  <span
                                    class={`text-xs font-semibold ${
                                      rule.effect === "Allow" ? "text-green-700" : "text-red-700"
                                    }`}
                                  >
                                    {rule.effect}
                                  </span>
                                  <span class="text-xs text-[var(--color-text-secondary)]">
                                    Rule {index() + 1}
                                  </span>
                                </div>

                                <div>
                                  <div class="text-xs font-semibold text-[var(--color-text-secondary)]">
                                    Actions
                                  </div>
                                  <div class="mt-1 flex flex-wrap gap-1">
                                    <For each={rule.actions}>
                                      {(action) => (
                                        <span class="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                                          {action}
                                        </span>
                                      )}
                                    </For>
                                  </div>
                                </div>

                                <div>
                                  <div class="text-xs font-semibold text-[var(--color-text-secondary)]">
                                    Resources
                                  </div>
                                  <div class="mt-1 flex flex-wrap gap-1">
                                    <For each={rule.resources}>
                                      {(resource) => (
                                        <span class="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800">
                                          {resource}
                                        </span>
                                      )}
                                    </For>
                                  </div>
                                </div>
                              </Card>
                            )}
                          </For>
                        </Show>
                      </div>
                    </div>
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
