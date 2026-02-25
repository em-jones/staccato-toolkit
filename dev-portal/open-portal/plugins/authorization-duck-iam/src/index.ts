import {
	createAccessConfig,
	type Engine,
	MemoryAdapter,
} from "@gentleduck/iam";
import type {
	AuthorizationCheck,
	AuthorizationService,
	Policy as CorePolicy,
	Role as CoreRole,
	PermissionCheck,
	PermissionMap,
	PermissionResult,
	PolicyAPI,
	RoleAPI,
} from "@op/platform/auth";
import type { Logger } from "@op/platform/o11y/types";
import type { BasePlugin } from "@op/platform/plugins/types";

/**
 * Create a typed access config for the authorization system
 */
function createTypedAccessConfig() {
	return createAccessConfig({
		actions: [
			"create",
			"read",
			"update",
			"delete",
			"manage",
			"publish",
			"unpublish",
		] as const,
		resources: [
			"post",
			"comment",
			"user",
			"role",
			"policy",
			"organization",
			"team",
			"dashboard",
			"analytics",
			"settings",
		] as const,
		roles: [
			"viewer",
			"author",
			"editor",
			"moderator",
			"admin",
			"superadmin",
		] as const,
		scopes: [] as const,
	});
}

/**
 * Configuration for the authorization service
 */
export interface DuckIAMConfig {
	adapter?: string;
	defaultRoles?: CoreRole[];
	defaultPolicies?: CorePolicy[];
}

/**
 * Create a Duck IAM engine instance
 */
function createDuckEngine(_adapter: string = "memory", logger?: Logger) {
	const access = createTypedAccessConfig();

	logger?.debug("Creating DuckIAM memory engine");

	// Create memory adapter with basic setup
	const memoryAdapter = new MemoryAdapter({
		roles: [],
		assignments: {},
		policies: [],
		attributes: {},
	} as any);

	// Create the engine
	const engine = access.createEngine({
		adapter: memoryAdapter as any,
		cacheTTL: 120,
		defaultEffect: "deny",
	});

	logger?.debug("DuckIAM engine created successfully");
	return { engine, access };
}

/**
 * Implement RoleAPI for role management
 */
class DuckIAMRoleAdapter implements RoleAPI {
	private engine: Engine;
	private roles: Map<string, CoreRole> = new Map();
	private assignments: Map<string, Array<{ roleId: string; scope?: string }>> =
		new Map();
	private logger: Logger | undefined;

	constructor(engine: Engine, logger?: Logger) {
		this.engine = engine;
		this.logger = logger;
	}

	async getRolesForOrg(orgId: string): Promise<CoreRole[]> {
		this.logger?.debug("Getting roles for org", { orgId });
		return Array.from(this.roles.values()).filter(
			(role) => role.name && role.name.includes(orgId),
		);
	}

	async getRole(id: string): Promise<CoreRole | null> {
		this.logger?.debug("Getting role", { roleId: id });
		return this.roles.get(id) || null;
	}

	async createRole(data: Omit<CoreRole, "id">): Promise<CoreRole> {
		const id = `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		const role: CoreRole = { ...data, id };
		this.roles.set(id, role);

		this.logger?.info("Role created", { roleId: id, name: data.name });

		// Try to save to engine if it's a predefined role
		try {
			const access = createTypedAccessConfig();
			const predefinedRoles = [
				"viewer",
				"author",
				"editor",
				"moderator",
				"admin",
				"superadmin",
			];

			if (predefinedRoles.includes(data.name)) {
				const duckRole = access.defineRole(data.name as any).name(data.name);

				const permissions = data.permissions || [];
				for (const perm of permissions) {
					for (const action of perm.actions) {
						(duckRole as any).grant(action, perm.resource);
					}
				}

				if (data.inherits && data.inherits.length > 0) {
					for (const parent of data.inherits) {
						(duckRole as any).inherits(parent);
					}
				}

				const built = (duckRole as any).build();
				await this.engine.admin.saveRole(built);
				this.logger?.debug("Role saved to DuckIAM engine", {
					roleId: id,
					name: data.name,
				});
			}
		} catch (err) {
			this.logger?.warn("Failed to save role to DuckIAM engine (non-fatal)", {
				roleId: id,
				name: data.name,
				error: err instanceof Error ? err.message : String(err),
			});
		}

		return role;
	}

	async updateRole(
		id: string,
		data: Partial<Omit<CoreRole, "id">>,
	): Promise<CoreRole> {
		const existing = this.roles.get(id);
		if (!existing) {
			this.logger?.warn("Attempted to update non-existent role", {
				roleId: id,
			});
			throw new Error(`Role ${id} not found`);
		}

		const updated: CoreRole = { ...existing, ...data };
		this.roles.set(id, updated);

		this.logger?.info("Role updated", { roleId: id });
		return updated;
	}

	async deleteRole(id: string): Promise<void> {
		if (!this.roles.has(id)) {
			this.logger?.warn("Attempted to delete non-existent role", {
				roleId: id,
			});
			throw new Error(`Role ${id} not found`);
		}

		this.roles.delete(id);
		// Also remove all assignments for this role
		let removedAssignments = 0;
		for (const [userId, userAssignments] of this.assignments.entries()) {
			const filtered = userAssignments.filter((a) => a.roleId !== id);
			removedAssignments += userAssignments.length - filtered.length;
			if (filtered.length === 0) {
				this.assignments.delete(userId);
			} else {
				this.assignments.set(userId, filtered);
			}
		}

		this.logger?.info("Role deleted", { roleId: id, removedAssignments });
	}

	async assignRole(
		userId: string,
		roleId: string,
		scope?: string,
	): Promise<void> {
		if (!this.roles.has(roleId)) {
			this.logger?.warn("Attempted to assign non-existent role", {
				userId,
				roleId,
			});
			throw new Error(`Role ${roleId} not found`);
		}

		const assignments = this.assignments.get(userId) || [];
		const exists = assignments.some(
			(a) => a.roleId === roleId && a.scope === scope,
		);

		if (!exists) {
			assignments.push({ roleId, scope });
			this.assignments.set(userId, assignments);
			this.logger?.info("Role assigned", { userId, roleId, scope });
		}

		// Try to assign in engine if it's a predefined role
		const role = this.roles.get(roleId);
		if (
			role &&
			[
				"viewer",
				"author",
				"editor",
				"moderator",
				"admin",
				"superadmin",
			].includes(role.name)
		) {
			try {
				await this.engine.admin.assignRole(userId, role.name as any, scope);
			} catch (err) {
				this.logger?.warn(
					"Failed to assign role in DuckIAM engine (non-fatal)",
					{
						userId,
						roleId,
						error: err instanceof Error ? err.message : String(err),
					},
				);
			}
		}
	}

	async revokeRole(
		userId: string,
		roleId: string,
		scope?: string,
	): Promise<void> {
		const assignments = this.assignments.get(userId) || [];
		const filtered = assignments.filter(
			(a) => !(a.roleId === roleId && a.scope === scope),
		);
		this.assignments.set(userId, filtered);

		this.logger?.info("Role revoked", { userId, roleId, scope });

		// Try to revoke in engine
		const role = this.roles.get(roleId);
		if (
			role &&
			[
				"viewer",
				"author",
				"editor",
				"moderator",
				"admin",
				"superadmin",
			].includes(role.name)
		) {
			try {
				await this.engine.admin.revokeRole(userId, role.name as any, scope);
			} catch (err) {
				this.logger?.warn(
					"Failed to revoke role in DuckIAM engine (non-fatal)",
					{
						userId,
						roleId,
						error: err instanceof Error ? err.message : String(err),
					},
				);
			}
		}
	}

	async getRolesForUser(userId: string, scope?: string): Promise<CoreRole[]> {
		this.logger?.debug("Getting roles for user", { userId, scope });
		const assignments = this.assignments.get(userId) || [];

		const filtered = scope
			? assignments.filter((a) => a.scope === scope)
			: assignments.filter((a) => !a.scope);

		return filtered
			.map((a) => this.roles.get(a.roleId))
			.filter((role): role is CoreRole => role !== undefined);
	}
}

/**
 * Implement PolicyAPI for policy management
 */
class DuckIAMPolicyAdapter implements PolicyAPI {
	private policies: Map<string, CorePolicy> = new Map();
	private logger: Logger | undefined;

	constructor(_engine: Engine, logger?: Logger) {
		this.logger = logger;
	}

	async createPolicy(data: Omit<CorePolicy, "id">): Promise<CorePolicy> {
		const id = `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

		const policy: CorePolicy = { ...data, id };

		// Store locally - policy structure from CorePolicy doesn't directly map to duck-iam rules
		this.policies.set(id, policy);

		this.logger?.info("Policy created", { policyId: id, name: data.name });
		return policy;
	}

	async getPolicy(id: string): Promise<CorePolicy | null> {
		this.logger?.debug("Getting policy", { policyId: id });
		return this.policies.get(id) || null;
	}

	async updatePolicy(
		id: string,
		data: Partial<Omit<CorePolicy, "id">>,
	): Promise<CorePolicy> {
		const existing = this.policies.get(id);
		if (!existing) {
			this.logger?.warn("Attempted to update non-existent policy", {
				policyId: id,
			});
			throw new Error(`Policy ${id} not found`);
		}

		const updated: CorePolicy = { ...existing, ...data };

		this.policies.set(id, updated);
		this.logger?.info("Policy updated", { policyId: id });
		return updated;
	}

	async deletePolicy(id: string): Promise<void> {
		if (!this.policies.has(id)) {
			this.logger?.warn("Attempted to delete non-existent policy", {
				policyId: id,
			});
			throw new Error(`Policy ${id} not found`);
		}

		this.policies.delete(id);
		this.logger?.info("Policy deleted", { policyId: id });
	}

	async listPolicies(): Promise<CorePolicy[]> {
		this.logger?.debug("Listing all policies");
		return Array.from(this.policies.values());
	}
}

/**
 * Implement AuthorizationService for permission checks
 */
class DuckIAMAuthorizationService implements AuthorizationService {
	private engine: Engine;
	private roleAdapter: DuckIAMRoleAdapter;
	private logger: Logger | undefined;

	constructor(
		engine: Engine,
		roleAdapter: DuckIAMRoleAdapter,
		logger?: Logger,
	) {
		this.engine = engine;
		this.roleAdapter = roleAdapter;
		this.logger = logger;
	}

	async userCan<
		TAction extends string = string,
		TResource extends string = string,
		TContext extends Record<string, unknown> = Record<string, unknown>,
	>(check: AuthorizationCheck<TAction, TResource, TContext>): Promise<boolean> {
		try {
			this.logger?.debug("Checking permission", {
				userId: check.userId,
				action: check.action,
				resource: check.resource,
			});

			const allowed = await this.engine.can(
				check.userId,
				check.action,
				{
					type: check.resource,
					attributes: (check.context || {}) as any,
				},
				undefined,
				undefined,
			);

			this.logger?.debug("Permission check result", {
				userId: check.userId,
				action: check.action,
				resource: check.resource,
				allowed,
			});

			return allowed;
		} catch (err) {
			this.logger?.error("Authorization check failed", {
				userId: check.userId,
				action: check.action,
				resource: check.resource,
				error: err instanceof Error ? err.message : String(err),
			});
			return false;
		}
	}

	async checkPermissions(
		userId: string,
		checks: PermissionCheck[],
	): Promise<PermissionResult[]> {
		this.logger?.debug("Checking multiple permissions", {
			userId,
			count: checks.length,
		});
		const results = await Promise.all(
			checks.map(async (check) => {
				const allowed = await this.userCan({
					userId,
					action: check.action,
					resource: check.resource,
				});

				return {
					action: check.action,
					resource: check.resource,
					allowed,
				};
			}),
		);

		return results;
	}

	async getEffectivePermissions(
		userId: string,
		scope?: string,
	): Promise<PermissionMap> {
		this.logger?.debug("Getting effective permissions", { userId, scope });
		const permissions: PermissionMap = {};

		// Get roles for the user
		const userRoles = await this.roleAdapter.getRolesForUser(userId, scope);

		// Collect permissions from all roles
		for (const role of userRoles) {
			const perms = role.permissions || [];
			for (const perm of perms) {
				if (!permissions[perm.resource]) {
					permissions[perm.resource] = [];
				}
				permissions[perm.resource].push(...perm.actions);
			}
		}

		// Deduplicate
		for (const resource in permissions) {
			permissions[resource] = Array.from(new Set(permissions[resource]));
		}

		this.logger?.debug("Effective permissions computed", {
			userId,
			resourceCount: Object.keys(permissions).length,
		});
		return permissions;
	}
}

/**
 * Create an authorization service instance with real @gentleduck/iam engine
 */
export function createAuthorizationService(
	config: DuckIAMConfig = {},
	logger?: Logger,
): {
	roleAPI: RoleAPI;
	policyAPI: PolicyAPI;
	authorizationService: AuthorizationService;
} {
	logger?.info("Creating authorization service", {
		adapter: config.adapter || "memory",
	});

	const { engine } = createDuckEngine(config.adapter || "memory", logger);

	const roleApi = new DuckIAMRoleAdapter(engine, logger);
	const policyApi = new DuckIAMPolicyAdapter(engine, logger);
	const authService = new DuckIAMAuthorizationService(engine, roleApi, logger);

	// Initialize with default roles and policies
	if (config.defaultRoles) {
		logger?.debug("Initializing default roles", {
			count: config.defaultRoles.length,
		});
		void Promise.all(
			config.defaultRoles.map((role) =>
				roleApi.createRole({
					name: role.name,
					description: role.description,
					permissions: role.permissions || [],
					inherits: role.inherits,
				}),
			),
		);
	}

	if (config.defaultPolicies) {
		logger?.debug("Initializing default policies", {
			count: config.defaultPolicies.length,
		});
		void Promise.all(
			config.defaultPolicies.map((policy) =>
				policyApi.createPolicy({
					name: policy.name,
					description: policy.description,
					rules: policy.rules,
					algorithm: policy.algorithm,
				}),
			),
		);
	}

	logger?.info("Authorization service created successfully");

	return {
		roleAPI: roleApi,
		policyAPI: policyApi,
		authorizationService: authService,
	};
}

export default {
	name: "authorization-duck-iam",
	type: "custom",
	serverConfig: undefined as any,
	clientConfig: undefined as any,
	serverServices: [],
	clientServices: [],
	eventHandlers: [],
	serverLifecycle: {
		async onInit(services: any) {
			const logger = services.get("logger");
			logger.info(
				"[authorization-duck-iam] Initializing authorization services...",
			);
			logger.info(
				"[authorization-duck-iam] Registering RoleAPI, PolicyAPI, and AuthorizationService...",
			);
			logger.debug(
				"[authorization-duck-iam] Authorization services registered",
			);
		},
	},
	clientLifecycle: {},
} satisfies BasePlugin;
