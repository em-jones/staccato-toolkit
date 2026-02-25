import { memoryAdapter } from "@better-auth/memory-adapter";
import type {
	AuthAPI,
	CreateOrganizationInput,
	CreateUserInput,
	Organization,
	OrganizationMember,
	RoleAPI,
	UpdateOrganizationInput,
	UpdateUserInput,
	User,
} from "@op/platform/auth";
import type { Logger } from "@op/platform/o11y/types";
import type { BasePlugin } from "@op/platform/plugins/types";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

export type BetterAuthDatabaseType = "postgres" | "sqlite" | "memory";

export interface BetterAuthConfig {
	databaseUrl?: string;
	databaseType?: BetterAuthDatabaseType;
	secret: string;
	baseUrl?: string;
}

export interface BetterAuthInstance {
	auth: ReturnType<typeof betterAuth>;
}

export function initializeBetterAuth(
	config?: Partial<BetterAuthConfig>,
	logger?: Logger,
): BetterAuthInstance {
	const databaseType =
		config?.databaseType ||
		(process.env.AUTH_DATABASE_TYPE as BetterAuthDatabaseType) ||
		"postgres";
	const secret = config?.secret || process.env.AUTH_SECRET;
	const baseUrl =
		config?.baseUrl || process.env.AUTH_BASE_URL || "http://localhost:3000";

	if (!secret) {
		throw new Error(
			"Missing required AUTH_SECRET environment variable or secret config",
		);
	}

	logger?.info("Initializing Better Auth", { databaseType, baseUrl });

	if (databaseType === "memory") {
		const auth = betterAuth({
			database: memoryAdapter(),
			secret,
			baseURL: baseUrl,
			plugins: [organization()],
		});

		logger?.info("Better Auth initialized successfully (memory adapter)");
		return { auth };
	}

	const databaseUrl = config?.databaseUrl || process.env.AUTH_DATABASE_URL;

	if (!databaseUrl) {
		throw new Error(
			"Missing required AUTH_DATABASE_URL environment variable or databaseUrl config",
		);
	}

	const auth = betterAuth({
		database: {
			type: databaseType,
			url: databaseUrl,
		},
		secret,
		baseURL: baseUrl,
		plugins: [organization()],
	});

	logger?.info("Better Auth initialized successfully");
	return { auth };
}

function mapBetterAuthUserToCore(
	betterAuthUser: any,
	role: string = "user",
): User {
	return {
		id: betterAuthUser.id,
		email: betterAuthUser.email,
		name: betterAuthUser.name || undefined,
		role,
		organizationId: betterAuthUser.organizationId,
		organizationRole: betterAuthUser.organizationRole,
	};
}

async function mapProviderUserWithRoles(
	betterAuthUser: any,
	roleApi: RoleAPI,
	logger?: Logger,
): Promise<User> {
	try {
		const userRoles = await roleApi.getRolesForUser(betterAuthUser.id);
		const primaryRole = userRoles.length > 0 ? userRoles[0].name : "user";
		logger?.debug(`Mapped user ${betterAuthUser.id} to role: ${primaryRole}`);
		return mapBetterAuthUserToCore(betterAuthUser, primaryRole);
	} catch (error) {
		logger?.error("Failed to fetch roles for user", {
			error: error instanceof Error ? error.message : String(error),
		});
		return mapBetterAuthUserToCore(betterAuthUser);
	}
}

export function createBetterAuthAdapter(
	betterAuthInstance: BetterAuthInstance,
	roleApi?: RoleAPI,
	logger?: Logger,
): AuthAPI {
	const { auth } = betterAuthInstance;

	return {
		async createUser(input: CreateUserInput): Promise<User> {
			logger?.debug("Creating user", { email: input.email });
			try {
				const user = await (auth as any).db.user.create({
					email: input.email,
					name: input.name || "",
					emailVerified: false,
				});

				if (!user) {
					throw new Error("Failed to create user");
				}

				logger?.info("User created successfully", {
					userId: user.id,
					email: input.email,
				});
				return mapBetterAuthUserToCore(user);
			} catch (error) {
				logger?.error("Failed to create user", {
					email: input.email,
					error: error instanceof Error ? error.message : String(error),
				});
				throw new Error(`Failed to create user: ${error}`);
			}
		},

		async getUser(id: string): Promise<User | null> {
			logger?.debug("Getting user", { userId: id });
			try {
				const user = await (auth as any).db.user.findUnique({
					where: { id },
				});

				if (!user) {
					logger?.debug("User not found", { userId: id });
					return null;
				}

				return mapBetterAuthUserToCore(user);
			} catch (error) {
				logger?.error("Failed to get user", {
					userId: id,
					error: error instanceof Error ? error.message : String(error),
				});
				return null;
			}
		},

		async updateUser(id: string, data: UpdateUserInput): Promise<User> {
			logger?.debug("Updating user", { userId: id });
			try {
				const updateData: Record<string, unknown> = {};
				if (data.email !== undefined) updateData.email = data.email;
				if (data.name !== undefined) updateData.name = data.name;

				const user = await (auth as any).db.user.update({
					where: { id },
					data: updateData,
				});

				if (!user) {
					throw new Error("User not found");
				}

				logger?.info("User updated successfully", { userId: id });
				return mapBetterAuthUserToCore(user);
			} catch (error) {
				logger?.error("Failed to update user", {
					userId: id,
					error: error instanceof Error ? error.message : String(error),
				});
				throw new Error(`Failed to update user: ${error}`);
			}
		},

		async deleteUser(id: string): Promise<void> {
			logger?.debug("Deleting user", { userId: id });
			try {
				await (auth as any).db.session.deleteMany({
					where: { userId: id },
				});

				await (auth as any).db.user.delete({
					where: { id },
				});

				logger?.info("User deleted successfully", { userId: id });
			} catch (error) {
				logger?.error("Failed to delete user", {
					userId: id,
					error: error instanceof Error ? error.message : String(error),
				});
				throw new Error(`Failed to delete user: ${error}`);
			}
		},

		async getOrganizations(): Promise<Organization[]> {
			logger?.debug("Getting all organizations");
			try {
				const orgs = await (auth as any).db.organization.findMany();
				logger?.debug(`Found ${orgs.length} organizations`);
				return orgs.map((org: any) => ({
					id: org.id,
					name: org.name,
					slug: org.slug,
					createdAt: new Date(org.createdAt),
					updatedAt: new Date(org.updatedAt),
				}));
			} catch (error) {
				logger?.error("Failed to get organizations", {
					error: error instanceof Error ? error.message : String(error),
				});
				return [];
			}
		},

		async getOrganization(id: string): Promise<Organization | null> {
			logger?.debug("Getting organization", { orgId: id });
			try {
				const org = await (auth as any).db.organization.findUnique({
					where: { id },
				});

				if (!org) {
					logger?.debug("Organization not found", { orgId: id });
					return null;
				}

				return {
					id: org.id,
					name: org.name,
					slug: org.slug,
					createdAt: new Date(org.createdAt),
					updatedAt: new Date(org.updatedAt),
				};
			} catch (error) {
				logger?.error("Failed to get organization", {
					orgId: id,
					error: error instanceof Error ? error.message : String(error),
				});
				return null;
			}
		},

		async createOrganization(
			data: CreateOrganizationInput,
		): Promise<Organization> {
			logger?.debug("Creating organization", {
				name: data.name,
				slug: data.slug,
			});
			try {
				const org = await (auth as any).db.organization.create({
					data: {
						name: data.name,
						slug: data.slug,
					},
				});

				if (!org) {
					throw new Error("Failed to create organization");
				}

				logger?.info("Organization created successfully", {
					orgId: org.id,
					name: data.name,
				});
				return {
					id: org.id,
					name: org.name,
					slug: org.slug,
					createdAt: new Date(org.createdAt),
					updatedAt: new Date(org.updatedAt),
				};
			} catch (error) {
				logger?.error("Failed to create organization", {
					name: data.name,
					error: error instanceof Error ? error.message : String(error),
				});
				throw new Error(`Failed to create organization: ${error}`);
			}
		},

		async updateOrganization(
			id: string,
			data: UpdateOrganizationInput,
		): Promise<Organization> {
			logger?.debug("Updating organization", { orgId: id });
			try {
				const updateData: Record<string, unknown> = {};
				if (data.name !== undefined) updateData.name = data.name;
				if (data.slug !== undefined) updateData.slug = data.slug;

				const org = await (auth as any).db.organization.update({
					where: { id },
					data: updateData,
				});

				if (!org) {
					throw new Error("Organization not found");
				}

				logger?.info("Organization updated successfully", { orgId: id });
				return {
					id: org.id,
					name: org.name,
					slug: org.slug,
					createdAt: new Date(org.createdAt),
					updatedAt: new Date(org.updatedAt),
				};
			} catch (error) {
				logger?.error("Failed to update organization", {
					orgId: id,
					error: error instanceof Error ? error.message : String(error),
				});
				throw new Error(`Failed to update organization: ${error}`);
			}
		},

		async mapProviderUserToCoreUser<T>(
			providerUser: T,
			overrideRoleApi?: RoleAPI,
		): Promise<User> {
			const effectiveRoleApi = overrideRoleApi || roleApi;

			if (effectiveRoleApi) {
				return mapProviderUserWithRoles(
					providerUser as any,
					effectiveRoleApi,
					logger,
				);
			} else {
				return mapBetterAuthUserToCore(providerUser as any);
			}
		},
	};
}

export interface OrganizationManagement {
	addMemberToOrganization(
		userId: string,
		organizationId: string,
		role: string,
	): Promise<OrganizationMember>;

	removeMemberFromOrganization(
		userId: string,
		organizationId: string,
	): Promise<void>;

	getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]>;

	getUserOrganizations(userId: string): Promise<Organization[]>;

	inviteUserToOrganization(
		organizationId: string,
		email: string,
		role: string,
	): Promise<void>;

	updateMemberRole(
		userId: string,
		organizationId: string,
		role: string,
	): Promise<OrganizationMember>;
}

export function createOrganizationManagement(
	betterAuthInstance: BetterAuthInstance,
	logger?: Logger,
): OrganizationManagement {
	const { auth } = betterAuthInstance;

	return {
		async addMemberToOrganization(
			userId: string,
			organizationId: string,
			role: string,
		): Promise<OrganizationMember> {
			logger?.debug("Adding member to organization", {
				userId,
				organizationId,
				role,
			});
			try {
				const member = await (auth as any).db.organizationMember.create({
					data: {
						userId,
						organizationId,
						role,
					},
				});

				if (!member) {
					throw new Error("Failed to add member to organization");
				}

				logger?.info("Member added to organization", {
					userId,
					organizationId,
				});
				return {
					userId: member.userId,
					organizationId: member.organizationId,
					role: member.role,
					joinedAt: new Date(member.createdAt),
				};
			} catch (error) {
				logger?.error("Failed to add member to organization", {
					userId,
					organizationId,
					error: error instanceof Error ? error.message : String(error),
				});
				throw new Error(`Failed to add member to organization: ${error}`);
			}
		},

		async removeMemberFromOrganization(
			userId: string,
			organizationId: string,
		): Promise<void> {
			logger?.debug("Removing member from organization", {
				userId,
				organizationId,
			});
			try {
				await (auth as any).db.organizationMember.delete({
					where: {
						userId_organizationId: {
							userId,
							organizationId,
						},
					},
				});
				logger?.info("Member removed from organization", {
					userId,
					organizationId,
				});
			} catch (error) {
				logger?.error("Failed to remove member from organization", {
					userId,
					organizationId,
					error: error instanceof Error ? error.message : String(error),
				});
				throw new Error(`Failed to remove member from organization: ${error}`);
			}
		},

		async getOrganizationMembers(
			organizationId: string,
		): Promise<OrganizationMember[]> {
			logger?.debug("Getting organization members", { organizationId });
			try {
				const members = await (auth as any).db.organizationMember.findMany({
					where: { organizationId },
				});

				logger?.debug(
					`Found ${members.length} members in organization ${organizationId}`,
				);
				return members.map((member: any) => ({
					userId: member.userId,
					organizationId: member.organizationId,
					role: member.role,
					joinedAt: new Date(member.createdAt),
				}));
			} catch (error) {
				logger?.error("Failed to get organization members", {
					organizationId,
					error: error instanceof Error ? error.message : String(error),
				});
				return [];
			}
		},

		async getUserOrganizations(userId: string): Promise<Organization[]> {
			logger?.debug("Getting user organizations", { userId });
			try {
				const members = await (auth as any).db.organizationMember.findMany({
					where: { userId },
					include: { organization: true },
				});

				logger?.debug(
					`User ${userId} belongs to ${members.length} organizations`,
				);
				return members.map((member: any) => {
					const org = member.organization;
					return {
						id: org.id,
						name: org.name,
						slug: org.slug,
						createdAt: new Date(org.createdAt),
						updatedAt: new Date(org.updatedAt),
					};
				});
			} catch (error) {
				logger?.error("Failed to get user organizations", {
					userId,
					error: error instanceof Error ? error.message : String(error),
				});
				return [];
			}
		},

		async inviteUserToOrganization(
			organizationId: string,
			email: string,
			role: string,
		): Promise<void> {
			logger?.debug("Inviting user to organization", {
				organizationId,
				email,
				role,
			});
			try {
				await (auth as any).db.invitation.create({
					data: {
						email,
						organizationId,
						role,
						expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
					},
				});
				logger?.info("User invited to organization", { organizationId, email });
			} catch (error) {
				logger?.error("Failed to invite user to organization", {
					organizationId,
					email,
					error: error instanceof Error ? error.message : String(error),
				});
				throw new Error(`Failed to invite user to organization: ${error}`);
			}
		},

		async updateMemberRole(
			userId: string,
			organizationId: string,
			role: string,
		): Promise<OrganizationMember> {
			logger?.debug("Updating member role", { userId, organizationId, role });
			try {
				const member = await (auth as any).db.organizationMember.update({
					where: {
						userId_organizationId: {
							userId,
							organizationId,
						},
					},
					data: { role },
				});

				if (!member) {
					throw new Error("Member not found");
				}

				logger?.info("Member role updated", { userId, organizationId, role });
				return {
					userId: member.userId,
					organizationId: member.organizationId,
					role: member.role,
					joinedAt: new Date(member.createdAt),
				};
			} catch (error) {
				logger?.error("Failed to update member role", {
					userId,
					organizationId,
					error: error instanceof Error ? error.message : String(error),
				});
				throw new Error(`Failed to update member role: ${error}`);
			}
		},
	};
}

export type {
	AuthAPI,
	Organization,
	OrganizationMember,
} from "@op/platform/auth";

export default {
	name: "authentication-better-auth",
	type: "custom",
	serverConfig: undefined as any,
	clientConfig: undefined as any,
	serverServices: [],
	clientServices: [],
	clientEvents: {},
	serverEvents: {},
	serverLifecycle: {
		async preStart(services: any) {
			const logger = services.get("logger");
			logger.info(
				"[authentication-better-auth] Running pre-start migrations...",
			);
			logger.debug("[authentication-better-auth] Pre-start complete");
		},
		async onInit(services: any) {
			const logger = services.get("logger");
			logger.info(
				"[authentication-better-auth] Initializing AuthAPI service...",
			);
			logger.debug("[authentication-better-auth] AuthAPI registered");
		},
	},
	clientLifecycle: {},
} satisfies BasePlugin;
