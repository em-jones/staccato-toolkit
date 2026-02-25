import { createQuery } from "@tanstack/solid-query";
import { Link, useNavigate } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import {
  Navbar,
  NavbarSection,
  NavbarItem,
  NavbarTitle,
  NavbarDropdown,
  Button,
  Avatar,
} from "@op-plugin/solid-ui";

import { signOutFn, getSessionFn } from "../server/auth";

const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const dropdownMenuItemStyles = {
  display: "block" as const,
  width: "100%",
  padding: "0.5rem 1rem",
  "text-align": "left" as const,
  color: "var(--color-text)",
  "text-decoration": "none",
  "border-radius": "var(--variant-radius-sm, 0.375rem)",
  transition: "background-color 150ms ease",
  cursor: "pointer",
  "background-color": "transparent",
  border: "none",
  "font-size": "0.875rem",
  "font-weight": "500",
};

export default function Header() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = createSignal(false);

  const session = createQuery(() => ({
    queryKey: ["session"],
    queryFn: () => getSessionFn(),
    staleTime: 30_000,
  }));

  const handleLogout = async () => {
    await signOutFn();
    await session.refetch();
    setMobileOpen(false);
    navigate({ to: "/" });
  };

  return (
    <header
      style={{
        position: "sticky",
        top: "0",
        "z-index": "50",
        "background-color": "color-mix(in srgb, var(--color-bg, white) 85%, transparent)",
        "backdrop-filter": "blur(12px)",
        "-webkit-backdrop-filter": "blur(12px)",
        "border-bottom": "1px solid var(--color-surface1, #e2e8f0)",
      }}
    >
      <div class="page-wrap">
        <Navbar glass style={{ "background-color": "transparent", border: "none", padding: "0" }}>
          {/* Brand */}
          <NavbarSection position="start">
            <NavbarTitle>
              <Link
                to="/"
                style={{
                  display: "flex",
                  "align-items": "center",
                  gap: "0.5rem",
                  "text-decoration": "none",
                  color: "var(--color-text, #0f172a)",
                  "font-weight": "800",
                  "font-size": "1.125rem",
                  "letter-spacing": "-0.02em",
                }}
              >
                <span
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    "border-radius": "0.375rem",
                    background:
                      "linear-gradient(135deg, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))",
                    display: "inline-block",
                    "flex-shrink": "0",
                  }}
                />
                OpenPort
              </Link>
            </NavbarTitle>
          </NavbarSection>

          {/* Desktop nav links */}
          <NavbarSection position="center" class="desktop-nav" style={{ display: "flex" }}>
            <Link to="/" class="header-nav-link">
              Home
            </Link>
            <a href="#features" class="header-nav-link">
              Features
            </a>
            <a href="#docs" class="header-nav-link">
              Docs
            </a>
            <Show when={session.data?.user}>
              <Link to="/settings" class="header-nav-link">
                Settings
              </Link>
            </Show>
          </NavbarSection>

          {/* Desktop auth controls */}
          <NavbarSection position="end">
            {/* Desktop auth — hidden on mobile via inline style toggle */}
            <div
              class="desktop-nav"
              style={{ display: "flex", gap: "0.5rem", "align-items": "center" }}
            >
              <Show
                when={session.data?.user}
                fallback={
                  <>
                    <Link to="/auth/sign-in">
                      <Button variant="ghost" size="sm">
                        Login
                      </Button>
                    </Link>
                    <Link to="/auth/sign-up">
                      <Button color="primary" size="sm">
                        Sign up
                      </Button>
                    </Link>
                  </>
                }
              >
                {(user) => (
                  <NavbarDropdown
                    trigger={
                      <div
                        style={{
                          display: "flex",
                          "align-items": "center",
                          gap: "0.5rem",
                          padding: "0.375rem 0.625rem",
                          "border-radius": "9999px",
                          cursor: "pointer",
                          "background-color": "var(--color-surface0, #f8fafc)",
                          border: "1px solid var(--color-surface1, #e2e8f0)",
                        }}
                      >
                        <Avatar size="sm" placeholder>
                          <UserIcon />
                        </Avatar>
                        <span
                          style={{
                            "font-size": "0.875rem",
                            "font-weight": "500",
                            "max-width": "8rem",
                            overflow: "hidden",
                            "text-overflow": "ellipsis",
                            "white-space": "nowrap",
                          }}
                        >
                          {user()?.name ?? user()?.email}
                        </span>
                      </div>
                    }
                  >
                    <div
                      style={{
                        padding: "0.25rem",
                        display: "flex",
                        "flex-direction": "column",
                        gap: "0.125rem",
                        "min-width": "12rem",
                      }}
                    >
                      <div
                        style={{
                          padding: "0.5rem 1rem",
                          "font-size": "0.75rem",
                          color: "var(--color-text-secondary)",
                          "border-bottom": "1px solid var(--color-surface1)",
                          "margin-bottom": "0.25rem",
                        }}
                      >
                        {user()?.email}
                      </div>
                      <Link to="/settings" style={dropdownMenuItemStyles}>
                        Settings
                      </Link>
                      <button
                        style={{ ...dropdownMenuItemStyles, color: "var(--color-error, #ef4444)" }}
                        onClick={handleLogout}
                      >
                        Logout
                      </button>
                    </div>
                  </NavbarDropdown>
                )}
              </Show>
            </div>

            {/* Hamburger — mobile only */}
            <button
              class="mobile-menu-btn"
              style={{
                display: "none",
                "align-items": "center",
                "justify-content": "center",
                padding: "0.5rem",
                "border-radius": "0.375rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text)",
              }}
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <Show when={mobileOpen()} fallback={<MenuIcon />}>
                <CloseIcon />
              </Show>
            </button>
          </NavbarSection>
        </Navbar>
      </div>

      {/* Mobile drawer */}
      <Show when={mobileOpen()}>
        <div
          style={{
            "background-color": "var(--color-bg, white)",
            "border-top": "1px solid var(--color-surface1, #e2e8f0)",
            padding: "1rem 1.5rem 1.5rem",
            display: "flex",
            "flex-direction": "column",
            gap: "0.25rem",
          }}
        >
          <Link to="/" class="mobile-nav-link" onClick={() => setMobileOpen(false)}>
            Home
          </Link>
          <a href="#features" class="mobile-nav-link" onClick={() => setMobileOpen(false)}>
            Features
          </a>
          <a href="#docs" class="mobile-nav-link" onClick={() => setMobileOpen(false)}>
            Docs
          </a>
          <Show when={session.data?.user}>
            <Link to="/settings" class="mobile-nav-link" onClick={() => setMobileOpen(false)}>
              Settings
            </Link>
          </Show>

          <div
            style={{
              "margin-top": "1rem",
              "padding-top": "1rem",
              "border-top": "1px solid var(--color-surface1, #e2e8f0)",
            }}
          >
            <Show
              when={session.data?.user}
              fallback={
                <div style={{ display: "flex", "flex-direction": "column", gap: "0.5rem" }}>
                  <Link to="/auth/sign-in" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" block>
                      Login
                    </Button>
                  </Link>
                  <Link to="/auth/sign-up" onClick={() => setMobileOpen(false)}>
                    <Button color="primary" block>
                      Sign up
                    </Button>
                  </Link>
                </div>
              }
            >
              {(user) => (
                <div style={{ display: "flex", "flex-direction": "column", gap: "0.25rem" }}>
                  <div
                    style={{
                      padding: "0.5rem 0",
                      "font-size": "0.875rem",
                      "font-weight": "600",
                      color: "var(--color-text)",
                    }}
                  >
                    {user()?.name ?? user()?.email}
                  </div>
                  <Link to="/settings" class="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                    Settings
                  </Link>
                  <button
                    class="mobile-nav-link"
                    style={{
                      background: "none",
                      border: "none",
                      "text-align": "left",
                      cursor: "pointer",
                      color: "var(--color-error, #ef4444)",
                    }}
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </Show>
          </div>
        </div>
      </Show>
    </header>
  );
}
