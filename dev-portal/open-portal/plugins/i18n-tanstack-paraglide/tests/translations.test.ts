import { expect, test, describe } from "vite-plus/test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const FIXTURES_DIR = resolve(import.meta.dirname, "fixtures");
const MESSAGES_DIR = join(FIXTURES_DIR, "messages");
const PROJECT_INLANG_DIR = join(FIXTURES_DIR, "project.inlang");

// ---------------------------------------------------------------------------
// Domain concept definitions — these are the keys that MUST exist for each
// domain. If a key is missing from any locale file, the test fails.
// ---------------------------------------------------------------------------

const DOMAIN_KEYS: Record<string, string[]> = {
  auth: [
    "auth.sign_in",
    "auth.sign_up",
    "auth.login",
    "auth.logout",
    "auth.create_account",
    "auth.forgot_password",
    "auth.reset_password",
    "auth.set_new_password",
    "auth.send_reset_link",
    "auth.back_to_sign_in",
    "auth.email",
    "auth.password",
    "auth.full_name",
    "auth.confirm_password",
    "auth.new_password",
    "auth.confirm_new_password",
    "auth.name",
    "auth.role",
    "auth.select_a_role",
    "auth.status",
    "auth.active",
    "auth.inactive",
    "auth.actions",
    "auth.edit",
    "auth.edit_user",
    "auth.create_user",
    "auth.delete",
    "auth.delete_user_confirm",
    "auth.save",
    "auth.cancel",
    "auth.search_users",
    "auth.all_roles",
    "auth.no_users_found",
    "auth.user_management",
    "auth.roles",
    "auth.create_role",
    "auth.create_new_role",
    "auth.role_name",
    "auth.description",
    "auth.permissions",
    "auth.inherited_from",
    "auth.no_roles_found",
    "auth.delete_role_confirm",
    "auth.failed_to_create_role",
    "auth.failed_to_delete_role",
    "auth.policies",
    "auth.create_policy",
    "auth.create_new_policy",
    "auth.policy_name",
    "auth.combining_algorithm",
    "auth.deny_overrides",
    "auth.allow_overrides",
    "auth.first_applicable",
    "auth.test_policy",
    "auth.test_policy_decision",
    "auth.close_tool",
    "auth.user_id",
    "auth.resource_id",
    "auth.action",
    "auth.test",
    "auth.decision",
    "auth.allow",
    "auth.deny",
    "auth.rules",
    "auth.no_rules_defined",
    "auth.no_policies_found",
    "auth.organizations",
    "auth.new_organization",
    "auth.create_organization",
    "auth.slug",
    "auth.auto_generated_slug",
    "auth.members_of",
    "auth.invite_member",
    "auth.send_invite",
    "auth.remove",
    "auth.remove_member_confirm",
    "auth.delete_org_confirm",
    "auth.no_organizations_yet",
    "auth.no_members",
    "auth.member",
    "auth.admin",
    "auth.viewer",
    "auth.editor",
    "auth.operator",
    "auth.service_identities",
    "auth.new_service_identity",
    "auth.create_service_identity",
    "auth.scopes",
    "auth.client_id",
    "auth.client_secret_warning",
    "auth.dismiss",
    "auth.rotate",
    "auth.revoke",
    "auth.rotate_secret_confirm",
    "auth.revoke_identity_confirm",
    "auth.no_service_identities",
    "auth.profile",
    "auth.settings",
    "auth.passwords_do_not_match",
    "auth.unexpected_error",
    "auth.reset_link_sent",
    "auth.password_reset_success",
    "auth.name_required",
    "auth.email_required",
    "auth.invalid_email_format",
    "auth.role_required",
    "auth.signing_in",
    "auth.sending",
    "auth.resetting",
    "auth.sign_in_failed",
    "auth.registration_failed",
    "auth.request_failed",
    "auth.reset_failed",
    "auth.dont_have_account",
    "auth.already_have_account",
    "auth.greeting",
  ],
  telemetry: [
    "telemetry.time",
    "telemetry.level",
    "telemetry.message",
    "telemetry.labels",
    "telemetry.all",
    "telemetry.debug",
    "telemetry.info",
    "telemetry.warn",
    "telemetry.error",
    "telemetry.trace",
    "telemetry.fatal",
    "telemetry.entries",
    "telemetry.no_log_entries",
    "telemetry.prev",
    "telemetry.next",
    "telemetry.logs",
    "telemetry.traces",
    "telemetry.metrics",
    "telemetry.signal_provider",
    "telemetry.signal_query",
    "telemetry.signal_visualization",
    "telemetry.dashboard",
    "telemetry.alert_rule",
    "telemetry.notification_channel",
    "telemetry.annotation",
    "telemetry.span",
    "telemetry.trace_entity",
    "telemetry.operation_name",
    "telemetry.service_name",
    "telemetry.duration",
    "telemetry.status",
    "telemetry.attributes",
    "telemetry.events",
    "telemetry.ok",
    "telemetry.unset",
    "telemetry.healthy",
    "telemetry.unhealthy",
    "telemetry.endpoint",
    "telemetry.driver",
    "telemetry.enabled",
    "telemetry.expression",
    "telemetry.time_range",
    "telemetry.pagination",
    "telemetry.sort",
    "telemetry.filters",
    "telemetry.line_chart",
    "telemetry.bar_chart",
    "telemetry.area_chart",
    "telemetry.heatmap",
    "telemetry.table",
    "telemetry.stat",
    "telemetry.gauge",
    "telemetry.log_list",
    "telemetry.trace_flamegraph",
    "telemetry.trace_table",
    "telemetry.alert_severity_info",
    "telemetry.alert_severity_warning",
    "telemetry.alert_severity_critical",
    "telemetry.alert_state_inactive",
    "telemetry.alert_state_pending",
    "telemetry.alert_state_firing",
    "telemetry.alert_state_resolved",
    "telemetry.channel_email",
    "telemetry.channel_slack",
    "telemetry.channel_webhook",
    "telemetry.channel_pagerduty",
    "telemetry.unit",
    "telemetry.color_scheme",
    "telemetry.show_legend",
    "telemetry.thresholds",
    "telemetry.refresh_interval",
    "telemetry.variables",
    "telemetry.grid_columns",
    "telemetry.row_height",
    "telemetry.gap",
    "telemetry.locked",
    "telemetry.clone",
    "telemetry.health_check",
    "telemetry.execute",
    "telemetry.counter",
    "telemetry.gauge_metric",
    "telemetry.histogram",
    "telemetry.up_down_counter",
    "telemetry.operator_eq",
    "telemetry.operator_neq",
    "telemetry.operator_contains",
    "telemetry.operator_regex",
    "telemetry.operator_gt",
    "telemetry.operator_lt",
    "telemetry.operator_gte",
    "telemetry.operator_lte",
  ],
  catalog: [
    "catalog.entity",
    "catalog.entities",
    "catalog.search_entities",
    "catalog.all",
    "catalog.no_entities_found",
    "catalog.loading",
    "catalog.prev",
    "catalog.next",
    "catalog.component",
    "catalog.api",
    "catalog.resource",
    "catalog.system",
    "catalog.domain",
    "catalog.user",
    "catalog.group",
    "catalog.location",
    "catalog.template",
    "catalog.namespace",
    "catalog.title",
    "catalog.description",
    "catalog.tags",
    "catalog.labels",
    "catalog.annotations",
    "catalog.links",
    "catalog.owner",
    "catalog.owned_by",
    "catalog.part_of",
    "catalog.depends_on",
    "catalog.provides_api",
    "catalog.consumes_api",
    "catalog.member_of",
    "catalog.has_member",
    "catalog.child_of",
    "catalog.lifecycle_production",
    "catalog.lifecycle_development",
    "catalog.lifecycle_experimental",
    "catalog.type_service",
    "catalog.type_website",
    "catalog.type_library",
    "catalog.entity_created",
    "catalog.entity_updated",
    "catalog.entity_deleted",
    "catalog.default_namespace",
    "catalog.import_from_yaml",
    "catalog.entity_sync",
    "catalog.source_type_github",
    "catalog.source_type_gitlab",
    "catalog.source_type_url",
    "catalog.source_type_file",
    "catalog.prune_missing",
    "catalog.discovery",
  ],
  eventing: [
    "eventing.event",
    "eventing.event_stream",
    "eventing.event_bus",
    "eventing.publish",
    "eventing.subscribe",
    "eventing.unsubscribe",
    "eventing.handler",
    "eventing.subscription",
    "eventing.event_type",
    "eventing.event_source",
    "eventing.event_id",
    "eventing.timestamp",
    "eventing.payload",
    "eventing.data",
    "eventing.spec_version",
    "eventing.source_filter",
    "eventing.max_retries",
    "eventing.ordered",
    "eventing.fire_and_forget",
    "eventing.topic",
    "eventing.stream",
    "eventing.basin",
    "eventing.consumer",
    "eventing.consumer_group",
    "eventing.producer",
    "eventing.in_memory",
    "eventing.connected",
    "eventing.disconnected",
    "eventing.endpoint",
    "eventing.api_key",
    "eventing.timeout",
    "eventing.connection_timeout",
    "eventing.publish_failed",
    "eventing.subscribe_failed",
    "eventing.handler_failed",
    "eventing.fallback_to_in_memory",
    "eventing.event_stream_initialized",
    "eventing.event_stream_ready",
    "eventing.event_stream_closed",
    "eventing.event_subscriptions",
  ],
  workflow: [
    "workflow.workflow",
    "workflow.workflows",
    "workflow.step",
    "workflow.steps",
    "workflow.trigger",
    "workflow.triggers",
    "workflow.cron_trigger",
    "workflow.event_trigger",
    "workflow.manual_trigger",
    "workflow.schedule",
    "workflow.timezone",
    "workflow.handler",
    "workflow.execution",
    "workflow.run",
    "workflow.run_id",
    "workflow.workflow_name",
    "workflow.input",
    "workflow.output",
    "workflow.error",
    "workflow.attempt",
    "workflow.started_at",
    "workflow.completed_at",
    "workflow.status_pending",
    "workflow.status_running",
    "workflow.status_completed",
    "workflow.status_failed",
    "workflow.status_cancelled",
    "workflow.status_timed_out",
    "workflow.retry",
    "workflow.max_attempts",
    "workflow.initial_backoff",
    "workflow.max_backoff",
    "workflow.multiplier",
    "workflow.timeout",
    "workflow.timeout_ms",
    "workflow.condition",
    "workflow.concurrency",
    "workflow.concurrency_key",
    "workflow.allow_concurrency",
    "workflow.register",
    "workflow.start",
    "workflow.stop",
    "workflow.cancel",
    "workflow.cancel_run",
    "workflow.list_workflows",
    "workflow.get_run",
    "workflow.input_validation_failed",
    "workflow.not_found",
    "workflow.no_handler_or_steps",
    "workflow.hatchet_not_configured",
    "workflow.failed_to_start_worker",
    "workflow.worker",
    "workflow.server_url",
    "workflow.token",
    "workflow.pipeline",
    "workflow.job",
    "workflow.durable_execution",
    "workflow.entity_sync_task",
    "workflow.source_location",
    "workflow.cron_expression",
    "workflow.every_minute",
    "workflow.every_hour",
  ],
};

const ALL_REQUIRED_KEYS = Object.values(DOMAIN_KEYS).flat();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadMessages(locale: string): Record<string, string> {
  const filePath = join(MESSAGES_DIR, `${locale}.json`);
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Record<string, string>;
}

function getLocales(): string[] {
  return readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}

function extractVariables(value: string): string[] {
  const matches = value.match(/\{[^}]+\}/g);
  return matches ? matches.sort() : [];
}

// ---------------------------------------------------------------------------
// Project.inlang fixture tests
// ---------------------------------------------------------------------------

describe("project.inlang fixture", () => {
  test("settings.json exists", () => {
    expect(existsSync(join(PROJECT_INLANG_DIR, "settings.json"))).toBe(true);
  });

  test("project_id exists", () => {
    expect(existsSync(join(PROJECT_INLANG_DIR, "project_id"))).toBe(true);
  });

  test("settings.json has valid structure", () => {
    const raw = readFileSync(join(PROJECT_INLANG_DIR, "settings.json"), "utf-8");
    const settings = JSON.parse(raw);

    expect(settings.$schema).toContain("inlang.com/schema/project-settings");
    expect(settings.sourceLanguageTag).toBe("en");
    expect(Array.isArray(settings.languageTags)).toBe(true);
    expect(settings.languageTags).toContain("en");
    expect(settings.languageTags).toContain("de");
    expect(settings.modules).toContain(
      "https://cdn.jsdelivr.net/npm/@inlang/plugin-json@4/dist/index.js",
    );
    expect(settings["plugin.inlang.json"].pathPattern).toBe("./messages/{languageTag}.json");
    expect(settings["plugin.inlang.json"].variableReferencePattern).toEqual(["{", "}"]);
  });
});

// ---------------------------------------------------------------------------
// Message file existence tests
// ---------------------------------------------------------------------------

describe("message files", () => {
  test("English message file exists", () => {
    expect(existsSync(join(MESSAGES_DIR, "en.json"))).toBe(true);
  });

  test("German message file exists", () => {
    expect(existsSync(join(MESSAGES_DIR, "de.json"))).toBe(true);
  });

  test("all locale files are valid JSON", () => {
    const locales = getLocales();
    expect(locales.length).toBeGreaterThan(0);

    for (const locale of locales) {
      const raw = readFileSync(join(MESSAGES_DIR, `${locale}.json`), "utf-8");
      expect(() => JSON.parse(raw)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Domain coverage tests
// ---------------------------------------------------------------------------

describe("domain coverage", () => {
  const locales = getLocales();

  for (const locale of locales) {
    describe(`${locale} locale`, () => {
      const messages = loadMessages(locale);

      test("has metadata keys", () => {
        expect(messages["__code"]).toBeDefined();
        expect(messages["__direction"]).toBeDefined();
        expect(messages["__name"]).toBeDefined();
        expect(messages["__status"]).toBeDefined();
      });

      for (const [domain, keys] of Object.entries(DOMAIN_KEYS)) {
        describe(`${domain} concepts`, () => {
          test(`has all ${keys.length} required ${domain} keys`, () => {
            const missing = keys.filter((key) => !(key in messages));
            expect(missing).toEqual([]);
          });

          test("all values are non-empty strings", () => {
            for (const key of keys) {
              const value = messages[key];
              expect(typeof value).toBe("string");
              expect(value.length).toBeGreaterThan(0);
            }
          });
        });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Translation consistency tests
// ---------------------------------------------------------------------------

describe("translation consistency", () => {
  const locales = getLocales();
  const sourceMessages = loadMessages("en");
  const sourceKeys = Object.keys(sourceMessages).filter((k) => !k.startsWith("__"));

  test("all locales have the same keys as source", () => {
    for (const locale of locales) {
      if (locale === "en") continue;

      const messages = loadMessages(locale);
      const localeKeys = Object.keys(messages).filter((k) => !k.startsWith("__"));

      const missing = sourceKeys.filter((k) => !localeKeys.includes(k));
      const extra = localeKeys.filter((k) => !sourceKeys.includes(k));

      expect(missing).toEqual([]);
      expect(extra).toEqual([]);
    }
  });

  test("variable placeholders match between locales", () => {
    for (const locale of locales) {
      if (locale === "en") continue;

      const messages = loadMessages(locale);

      for (const key of sourceKeys) {
        const sourceVars = extractVariables(sourceMessages[key]);
        const localeVars = extractVariables(messages[key]);

        expect(localeVars).toEqual(sourceVars);
      }
    }
  });

  test("no untranslated keys (value identical to source key)", () => {
    const allowedIdentical = new Set([
      "telemetry.debug",
      "telemetry.info",
      "telemetry.warn",
      "telemetry.error",
      "telemetry.trace",
      "telemetry.fatal",
      "telemetry.labels",
      "telemetry.dashboard",
      "telemetry.span",
      "telemetry.trace_entity",
      "telemetry.ok",
      "telemetry.alert_severity_info",
      "telemetry.operator_eq",
      "telemetry.operator_neq",
      "telemetry.operator_regex",
      "telemetry.operator_gt",
      "telemetry.operator_lt",
      "telemetry.operator_gte",
      "telemetry.operator_lte",
      "catalog.api",
      "catalog.system",
      "catalog.tags",
      "catalog.labels",
      "catalog.links",
      "catalog.source_type_github",
      "catalog.source_type_gitlab",
      "catalog.source_type_url",
      "eventing.handler",
      "workflow.workflow",
      "workflow.workflows",
      "workflow.handler",
      "workflow.worker",
      "workflow.token",
      "workflow.pipeline",
    ]);

    for (const locale of locales) {
      if (locale === "en") continue;

      const messages = loadMessages(locale);

      for (const key of ALL_REQUIRED_KEYS) {
        if (allowedIdentical.has(key)) continue;

        const enValue = sourceMessages[key];
        const localeValue = messages[key];

        if (enValue && localeValue) {
          expect(localeValue).not.toBe(enValue);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Domain-specific semantic tests
// ---------------------------------------------------------------------------

describe("auth domain semantics", () => {
  const messages = loadMessages("en");

  test("sign-in and sign-up are distinct", () => {
    expect(messages["auth.sign_in"]).not.toBe(messages["auth.sign_up"]);
  });

  test("login and logout are distinct", () => {
    expect(messages["auth.login"]).not.toBe(messages["auth.logout"]);
  });

  test("allow and deny are distinct", () => {
    expect(messages["auth.allow"]).not.toBe(messages["auth.deny"]);
  });

  test("active and inactive are distinct", () => {
    expect(messages["auth.active"]).not.toBe(messages["auth.inactive"]);
  });

  test("greeting has variable placeholder", () => {
    const vars = extractVariables(messages["auth.greeting"]);
    expect(vars).toContain("{name}");
  });
});

describe("telemetry domain semantics", () => {
  const messages = loadMessages("en");

  test("log levels are distinct", () => {
    const levels = [
      messages["telemetry.debug"],
      messages["telemetry.info"],
      messages["telemetry.warn"],
      messages["telemetry.error"],
      messages["telemetry.trace"],
      messages["telemetry.fatal"],
    ];
    const unique = new Set(levels);
    expect(unique.size).toBe(levels.length);
  });

  test("signal types are distinct", () => {
    const types = [
      messages["telemetry.logs"],
      messages["telemetry.traces"],
      messages["telemetry.metrics"],
    ];
    const unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });

  test("alert severities are distinct", () => {
    const severities = [
      messages["telemetry.alert_severity_info"],
      messages["telemetry.alert_severity_warning"],
      messages["telemetry.alert_severity_critical"],
    ];
    const unique = new Set(severities);
    expect(unique.size).toBe(severities.length);
  });

  test("filter operators are distinct", () => {
    const operators = [
      messages["telemetry.operator_eq"],
      messages["telemetry.operator_neq"],
      messages["telemetry.operator_contains"],
      messages["telemetry.operator_regex"],
      messages["telemetry.operator_gt"],
      messages["telemetry.operator_lt"],
      messages["telemetry.operator_gte"],
      messages["telemetry.operator_lte"],
    ];
    const unique = new Set(operators);
    expect(unique.size).toBe(operators.length);
  });
});

describe("catalog domain semantics", () => {
  const messages = loadMessages("en");

  test("entity kinds are distinct", () => {
    const kinds = [
      messages["catalog.component"],
      messages["catalog.api"],
      messages["catalog.resource"],
      messages["catalog.system"],
      messages["catalog.domain"],
      messages["catalog.user"],
      messages["catalog.group"],
      messages["catalog.location"],
      messages["catalog.template"],
    ];
    const unique = new Set(kinds);
    expect(unique.size).toBe(kinds.length);
  });

  test("lifecycle values are distinct", () => {
    const lifecycles = [
      messages["catalog.lifecycle_production"],
      messages["catalog.lifecycle_development"],
      messages["catalog.lifecycle_experimental"],
    ];
    const unique = new Set(lifecycles);
    expect(unique.size).toBe(lifecycles.length);
  });

  test("component types are distinct", () => {
    const types = [
      messages["catalog.type_service"],
      messages["catalog.type_website"],
      messages["catalog.type_library"],
    ];
    const unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });

  test("entity events are distinct", () => {
    const events = [
      messages["catalog.entity_created"],
      messages["catalog.entity_updated"],
      messages["catalog.entity_deleted"],
    ];
    const unique = new Set(events);
    expect(unique.size).toBe(events.length);
  });
});

describe("eventing domain semantics", () => {
  const messages = loadMessages("en");

  test("publish and subscribe are distinct", () => {
    expect(messages["eventing.publish"]).not.toBe(messages["eventing.subscribe"]);
  });

  test("connected and disconnected are distinct", () => {
    expect(messages["eventing.connected"]).not.toBe(messages["eventing.disconnected"]);
  });

  test("event concepts cover core lifecycle", () => {
    expect(messages["eventing.event_stream_initialized"]).toBeDefined();
    expect(messages["eventing.event_stream_ready"]).toBeDefined();
    expect(messages["eventing.event_stream_closed"]).toBeDefined();
  });
});

describe("workflow domain semantics", () => {
  const messages = loadMessages("en");

  test("workflow statuses are distinct", () => {
    const statuses = [
      messages["workflow.status_pending"],
      messages["workflow.status_running"],
      messages["workflow.status_completed"],
      messages["workflow.status_failed"],
      messages["workflow.status_cancelled"],
      messages["workflow.status_timed_out"],
    ];
    const unique = new Set(statuses);
    expect(unique.size).toBe(statuses.length);
  });

  test("trigger types are distinct", () => {
    const triggers = [
      messages["workflow.cron_trigger"],
      messages["workflow.event_trigger"],
      messages["workflow.manual_trigger"],
    ];
    const unique = new Set(triggers);
    expect(unique.size).toBe(triggers.length);
  });

  test("start and stop are distinct", () => {
    expect(messages["workflow.start"]).not.toBe(messages["workflow.stop"]);
  });
});

// ---------------------------------------------------------------------------
// Cross-domain key count summary
// ---------------------------------------------------------------------------

describe("translation inventory", () => {
  test("reports domain key counts", () => {
    const counts: Record<string, number> = {};
    for (const [domain, keys] of Object.entries(DOMAIN_KEYS)) {
      counts[domain] = keys.length;
    }

    expect(counts.auth).toBeGreaterThan(0);
    expect(counts.telemetry).toBeGreaterThan(0);
    expect(counts.catalog).toBeGreaterThan(0);
    expect(counts.eventing).toBeGreaterThan(0);
    expect(counts.workflow).toBeGreaterThan(0);

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(ALL_REQUIRED_KEYS.length);
  });

  test("all locales have at least the required key count", () => {
    const locales = getLocales();
    const requiredCount = ALL_REQUIRED_KEYS.length;

    for (const locale of locales) {
      const messages = loadMessages(locale);
      const domainKeys = Object.keys(messages).filter(
        (k) => !k.startsWith("__") && ALL_REQUIRED_KEYS.includes(k),
      );

      expect(domainKeys.length).toBeGreaterThanOrEqual(requiredCount);
    }
  });
});
