import { createFileRoute, Link, Outlet, useRouter } from "@tanstack/solid-router";
import { createQuery } from "@tanstack/solid-query";
import { Show } from "solid-js";
import { getSessionFn } from "../server/auth";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

const navItems = [
  { to: "/settings", label: "Users", icon: "👤" },
  { to: "/settings/organizations", label: "Organizations", icon: "🏢" },
  { to: "/settings/roles", label: "Roles", icon: "🔑" },
  { to: "/settings/policies", label: "Policies", icon: "📋" },
  { to: "/settings/service-identities", label: "Service Identities", icon: "🤖" },
] as const;

function SettingsLayout() {
  const router = useRouter();

  const session = createQuery(() => ({
    queryKey: ["session"],
    queryFn: () => getSessionFn(),
    staleTime: 30_000,
  }));

  return (
    <Show
      when={session.data?.user}
      fallback={
        <main class="flex min-h-[60vh] items-center justify-center px-4">
          <div class="text-center">
            <h2 class="mb-2 text-xl font-bold text-[var(--color-text)]">Authentication required</h2>
            <p class="mb-4 text-sm text-[var(--color-text-secondary)]">
              You must be signed in to access settings.
            </p>
            <Link
              to="/auth/sign-in"
              class="inline-block rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Sign in
            </Link>
          </div>
        </main>
      }
    >
      <div class="page-wrap flex min-h-[calc(100vh-4rem)] gap-0 px-0 md:gap-6 md:px-4 md:py-6">
        {/* Sidebar */}
        <nav class="hidden w-56 shrink-0 md:block">
          <div class="sticky top-20 space-y-1">
            <h2 class="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Administration
            </h2>
            {navItems.map((item) => {
              const isActive = () => {
                const path = router.state.location.pathname;
                if (item.to === "/settings") return path === "/settings" || path === "/settings/";
                return path.startsWith(item.to);
              };
              return (
                <Link
                  to={item.to}
                  class={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive()
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface0)]"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Mobile nav */}
        <div class="flex w-full overflow-x-auto border-b border-[var(--color-surface1)] md:hidden">
          {navItems.map((item) => {
            const isActive = () => {
              const path = router.state.location.pathname;
              if (item.to === "/settings") return path === "/settings" || path === "/settings/";
              return path.startsWith(item.to);
            };
            return (
              <Link
                to={item.to}
                class={`whitespace-nowrap px-4 py-3 text-sm font-medium ${
                  isActive()
                    ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Content */}
        <main class="min-w-0 flex-1 px-4 py-6 md:px-0 md:py-0">
          <Outlet />
        </main>
      </div>
    </Show>
  );
}
