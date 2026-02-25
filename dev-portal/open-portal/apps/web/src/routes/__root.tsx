import type { QueryClient } from "@tanstack/solid-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/solid-router";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";

import Header from "../components/Header";
import styleCss from "../styles.css?url";

export const Route = createRootRouteWithContext()<{ queryClient: QueryClient }>({
  head: () => ({
    links: [{ rel: "stylesheet", href: styleCss }],
  }),
  shellComponent: RootShell,
  component: RootLayout,
  errorComponent: RootError,
});

function RootShell() {
  return (
    <html>
      <head>
        <HydrationScript />
      </head>
      <body>
        <HeadContent />
        <Suspense>
          <Outlet />
        </Suspense>
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <TanStackRouterDevtools />
    </>
  );
}

function RootError(props: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.log({ error: props.error });

  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        "justify-content": "center",
        "min-height": "60vh",
        padding: "2rem",
        "text-align": "center",
      }}
    >
      <div
        style={{
          "max-width": "32rem",
          width: "100%",
          padding: "2rem",
          "border-radius": "0.75rem",
          "background-color": "var(--color-surface0, #f8fafc)",
          border: "1px solid var(--color-surface1, #e2e8f0)",
        }}
      >
        <div
          style={{
            width: "3rem",
            height: "3rem",
            "border-radius": "50%",
            background: "color-mix(in srgb, var(--color-error, #ef4444) 15%, transparent)",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            margin: "0 auto 1.25rem",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-error, #ef4444)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2
          style={{
            "font-size": "1.125rem",
            "font-weight": "700",
            color: "var(--color-text, #0f172a)",
            margin: "0 0 0.5rem",
          }}
        >
          Something went wrong
        </h2>
        <p
          style={{
            "font-size": "0.875rem",
            color: "var(--color-text-secondary, #64748b)",
            margin: "0 0 1.5rem",
            "word-break": "break-word",
          }}
        >
          {props.error.message || "An unexpected error occurred."}
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            "justify-content": "center",
          }}
        >
          <button
            style={{
              padding: "0.5rem 1.25rem",
              "border-radius": "0.375rem",
              "font-size": "0.875rem",
              "font-weight": "600",
              cursor: "pointer",
              border: "1px solid var(--color-surface1, #e2e8f0)",
              "background-color": "var(--color-bg, white)",
              color: "var(--color-text, #0f172a)",
              transition: "background-color 150ms ease",
            }}
            onClick={() => router.history.back()}
          >
            Go back
          </button>
          <button
            style={{
              padding: "0.5rem 1.25rem",
              "border-radius": "0.375rem",
              "font-size": "0.875rem",
              "font-weight": "600",
              cursor: "pointer",
              border: "none",
              "background-color": "var(--color-primary, #3b82f6)",
              color: "white",
              transition: "background-color 150ms ease",
            }}
            onClick={() => props.reset()}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
