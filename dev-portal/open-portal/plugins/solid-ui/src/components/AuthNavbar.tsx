import { type JSX, Show, createSignal } from "solid-js";
import { useStore } from "@nanostores/solid";
import { authStore } from "@op-plugin/core-ui";
import { Avatar } from "./Avatar";
import { Navbar, NavbarSection, NavbarItem, NavbarTitle, NavbarDropdown } from "./Navbar";

const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
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

const baseTriggerStyles: JSX.CSSProperties = {
  display: "flex",
  "align-items": "center",
  gap: "0.5rem",
  padding: "0.5rem",
  "border-radius": "9999px",
  cursor: "pointer",
  transition: "background-color 150ms ease",
};

const baseMenuItemStyles: JSX.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.5rem 1rem",
  "text-align": "left",
  color: "var(--color-text)",
  "text-decoration": "none",
  "border-radius": "var(--variant-radius-sm, 0.375rem)",
  transition: "background-color 150ms ease",
  cursor: "pointer",
  "background-color": "transparent",
  border: "none",
  "font-size": "0.875rem",
};

export interface AuthNavbarProps {
  class?: string;
  logo?: JSX.Element;
}

export function AuthNavbar(props: AuthNavbarProps) {
  const auth = useStore(authStore);
  const [hovered, setHovered] = createSignal(false);

  return (
    <Navbar class={props.class}>
      <NavbarSection position="start">
        <Show when={props.logo}>
          <NavbarTitle>{props.logo}</NavbarTitle>
        </Show>
      </NavbarSection>

      <NavbarSection position="end">
        <Show
          when={auth.isAuthenticated && auth.user}
          fallback={
            <NavbarDropdown
              trigger={
                <div
                  style={baseTriggerStyles}
                  onMouseEnter={() => setHovered(true)}
                  onMouseLeave={() => setHovered(false)}
                >
                  <Avatar size="sm" placeholder>
                    <UserIcon />
                  </Avatar>
                </div>
              }
            >
              <div
                style={{
                  padding: "0.5rem",
                  display: "flex",
                  "flex-direction": "column",
                  gap: "0.25rem",
                }}
              >
                <button style={{ ...baseMenuItemStyles(), "font-weight": "600" }}>Sign Up</button>
                <button style={baseMenuItemStyles()}>Login</button>
              </div>
            </NavbarDropdown>
          }
        >
          <NavbarDropdown
            trigger={
              <div
                style={baseTriggerStyles}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
              >
                <Avatar size="sm" src={auth.user?.image} alt={auth.user?.name}>
                  <UserIcon />
                </Avatar>
              </div>
            }
          >
            <div
              style={{
                padding: "0.5rem",
                display: "flex",
                "flex-direction": "column",
                gap: "0.25rem",
              }}
            >
              <div style={{ padding: "0.5rem 1rem", "font-size": "0.875rem" }}>
                {auth.user?.name || auth.user?.email}
              </div>
              <button style={baseMenuItemStyles()}>Profile</button>
              <button style={baseMenuItemStyles()}>Settings</button>
              <button style={{ ...baseMenuItemStyles(), "font-weight": "600" }}>Logout</button>
            </div>
          </NavbarDropdown>
        </Show>
      </NavbarSection>
    </Navbar>
  );
}
