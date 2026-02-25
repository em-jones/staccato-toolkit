import { Button, Card, CardActions, CardBody } from "@op-plugin/solid-ui";
import { createSignal, For, type JSX, onCleanup, onMount } from "solid-js";

// ── Parallax hook ──────────────────────────────────────────────────────────────

function useScrollY() {
  const [scrollY, setScrollY] = createSignal(0);
  onMount(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", handler));
  });
  return scrollY;
}

// ── Image Placeholder ──────────────────────────────────────────────────────────

interface ImgPlaceholderProps {
  width?: string;
  height?: string;
  label?: string;
  style?: JSX.CSSProperties;
  class?: string;
}

function ImgPlaceholder(props: ImgPlaceholderProps) {
  return (
    <div
      class={props.class}
      style={{
        width: props.width ?? "100%",
        height: props.height ?? "240px",
        "background-color": "var(--color-surface1, #e2e8f0)",
        "border-radius": "0.75rem",
        display: "flex",
        "align-items": "center",
        "justify-content": "center",
        "flex-direction": "column",
        gap: "0.5rem",
        color: "var(--color-text-secondary, #64748b)",
        "font-size": "0.875rem",
        border: "2px dashed var(--color-surface2, #cbd5e1)",
        overflow: "hidden",
        ...props.style,
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        style={{ opacity: "0.4" }}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      {props.label && <span style={{ opacity: "0.5" }}>{props.label}</span>}
    </div>
  );
}

// ── Feature cards data ─────────────────────────────────────────────────────────

const features = [
  {
    icon: "⚡",
    title: "Blazing Fast Builds",
    description:
      "Zero-config bundling with Rolldown under the hood. Ship production builds in seconds, not minutes.",
    badge: "Performance",
    badgeColor: "primary" as const,
  },
  {
    icon: "🔧",
    title: "Unified Toolchain",
    description:
      "Format, lint, test, and build from one CLI. No more juggling a dozen config files across your monorepo.",
    badge: "DX",
    badgeColor: "green" as const,
  },
  {
    icon: "🛡️",
    title: "Type-Safe by Default",
    description:
      "First-class TypeScript support with the native TS compiler preview. Catch errors before they ship.",
    badge: "Safety",
    badgeColor: "secondary" as const,
  },
  {
    icon: "📦",
    title: "Smart Package Management",
    description:
      "Wraps your existing package manager with intelligent caching and dependency deduplication.",
    badge: "Efficiency",
    badgeColor: "accent" as const,
  },
  {
    icon: "🧪",
    title: "Integrated Testing",
    description:
      "Vitest runs out of the box. Write tests alongside your code with full coverage reporting.",
    badge: "Quality",
    badgeColor: "warning" as const,
  },
  {
    icon: "🚀",
    title: "Deploy Anywhere",
    description:
      "Serverless, edge, Node.js — preset-driven deployment means one codebase targets every platform.",
    badge: "Portability",
    badgeColor: "error" as const,
  },
];

// ── Section: Parallax hero layer ───────────────────────────────────────────────

function ParallaxLayer(props: { scrollY: () => number; children: JSX.Element }) {
  return (
    <div
      style={{
        transform: `translateY(${props.scrollY() * 0.35}px)`,
        transition: "transform 0ms linear",
        "will-change": "transform",
      }}
    >
      {props.children}
    </div>
  );
}

// ── Section: Stats ─────────────────────────────────────────────────────────────

const stats = [
  { value: "10×", label: "Faster cold builds" },
  { value: "1", label: "CLI to rule them all" },
  { value: "0", label: "Config files needed" },
  { value: "∞", label: "Targets supported" },
];

// ── Home page ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const scrollY = useScrollY();

  return (
    <div style={{ overflow: "hidden" }}>
      {/* ── Hero ── */}
      <section
        style={{
          position: "relative",
          "min-height": "100vh",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, var(--color-bg, #0f172a) 0%, color-mix(in srgb, var(--color-primary, #3b82f6) 8%, var(--color-bg, #0f172a)) 100%)",
        }}
      >
        {/* Parallax background image */}
        <div
          style={{
            position: "absolute",
            inset: "-20%",
            "z-index": "0",
            transform: `translateY(${scrollY() * 0.5}px)`,
            "will-change": "transform",
          }}
        >
          <ImgPlaceholder
            label="Hero background"
            style={{
              width: "100%",
              height: "140%",
              "border-radius": "0",
              border: "none",
              opacity: "0.15",
            }}
          />
        </div>

        {/* Decorative orbs */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "5%",
            width: "28rem",
            height: "28rem",
            "border-radius": "9999px",
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--color-primary, #3b82f6) 20%, transparent), transparent 70%)",
            "z-index": "0",
            transform: `translateY(${scrollY() * 0.2}px)`,
            "will-change": "transform",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            left: "3%",
            width: "20rem",
            height: "20rem",
            "border-radius": "9999px",
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--color-secondary, #8b5cf6) 15%, transparent), transparent 70%)",
            "z-index": "0",
            transform: `translateY(${scrollY() * -0.15}px)`,
            "will-change": "transform",
          }}
        />

        {/* Hero content */}
        <div
          style={{
            position: "relative",
            "z-index": "1",
            "text-align": "center",
            padding: "2rem 1.5rem",
            "max-width": "56rem",
            margin: "0 auto",
          }}
        >
          <ParallaxLayer scrollY={scrollY}>
            <h1
              style={{
                "font-size": "clamp(2.5rem, 6vw, 5rem)",
                "font-weight": "800",
                "line-height": "1.1",
                color: "var(--color-text, white)",
                margin: "0 0 1.5rem",
                "letter-spacing": "-0.02em",
              }}
            >
              The Unified Toolchain
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))",
                  "-webkit-background-clip": "text",
                  "-webkit-text-fill-color": "transparent",
                  "background-clip": "text",
                }}
              >
                for Modern Web
              </span>
            </h1>
            <p
              style={{
                "font-size": "clamp(1rem, 2vw, 1.25rem)",
                color: "var(--color-text-secondary, #94a3b8)",
                "max-width": "36rem",
                margin: "0 auto 2.5rem",
                "line-height": "1.7",
              }}
            >
              One CLI. Format, lint, test, bundle, and deploy — powered by Vite, Rolldown, Vitest,
              and Oxlint under the hood.
            </p>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                "justify-content": "center",
                "flex-wrap": "wrap",
              }}
            >
              <Button color="primary" size="lg">
                Get Started
              </Button>
              <Button variant="outline" size="lg">
                View Docs
              </Button>
            </div>
          </ParallaxLayer>
        </div>
      </section>

      {/* ── Stats band ── */}
      <section
        style={{
          padding: "3rem 1.5rem",
          "background-color": "var(--color-surface0, #f8fafc)",
          "border-top": "1px solid var(--color-surface1, #e2e8f0)",
          "border-bottom": "1px solid var(--color-surface1, #e2e8f0)",
        }}
      >
        <div
          class="page-wrap"
          style={{
            display: "grid",
            "grid-template-columns": "repeat(auto-fit, minmax(10rem, 1fr))",
            gap: "2rem",
            "text-align": "center",
          }}
        >
          <For each={stats}>
            {(s) => (
              <div>
                <div
                  style={{
                    "font-size": "2.5rem",
                    "font-weight": "800",
                    color: "var(--color-primary, #3b82f6)",
                    "line-height": "1",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    "margin-top": "0.5rem",
                    color: "var(--color-text-secondary, #64748b)",
                    "font-size": "0.875rem",
                  }}
                >
                  {s.label}
                </div>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section style={{ padding: "6rem 1.5rem" }}>
        <div class="page-wrap">
          <div style={{ "text-align": "center", "margin-bottom": "4rem" }}>
            <h2
              style={{
                "font-size": "clamp(1.75rem, 4vw, 2.75rem)",
                "font-weight": "800",
                color: "var(--color-text, #0f172a)",
                margin: "0 0 1rem",
              }}
            >
              Everything you need, nothing you don't
            </h2>
            <p
              style={{
                color: "var(--color-text-secondary, #64748b)",
                "font-size": "1.125rem",
                "max-width": "32rem",
                margin: "0 auto",
              }}
            >
              Vite+ replaces five separate tools with a single, cohesive workflow.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              "grid-template-columns": "repeat(auto-fit, minmax(18rem, 1fr))",
              gap: "1.5rem",
            }}
          >
            <For each={features}>
              {(feature) => (
                <Card elevated>
                  <CardBody>
                    <div
                      style={{
                        "font-size": "2rem",
                        "margin-bottom": "0.75rem",
                      }}
                    >
                      {feature.icon}
                    </div>
                    <h3
                      style={{
                        "font-size": "1.1rem",
                        "font-weight": "700",
                        margin: "0 0 0.25rem",
                        color: "var(--color-text, #0f172a)",
                      }}
                    >
                      {feature.title}
                    </h3>
                    <p
                      style={{
                        color: "var(--color-text-secondary, #64748b)",
                        "font-size": "0.9rem",
                        "line-height": "1.6",
                      }}
                    >
                      {feature.description}
                    </p>
                    <CardActions></CardActions>
                  </CardBody>
                </Card>
              )}
            </For>
          </div>
        </div>
      </section>

      {/* ── Showcase / mockup section ── */}
      <section
        style={{
          padding: "6rem 1.5rem",
          "background-color": "var(--color-surface0, #f8fafc)",
        }}
      >
        <div
          class="page-wrap"
          style={{
            display: "grid",
            "grid-template-columns": "repeat(auto-fit, minmax(22rem, 1fr))",
            gap: "3rem",
            "align-items": "center",
          }}
        >
          <div>
            <h2
              style={{
                "font-size": "clamp(1.5rem, 3.5vw, 2.5rem)",
                "font-weight": "800",
                color: "var(--color-text, #0f172a)",
                margin: "0 0 1rem",
                "line-height": "1.2",
              }}
            >
              One command to run them all
            </h2>
            <p
              style={{
                color: "var(--color-text-secondary, #64748b)",
                "line-height": "1.7",
                "margin-bottom": "2rem",
              }}
            >
              Replace your{" "}
              <code
                style={{
                  "background-color": "var(--color-surface1, #e2e8f0)",
                  padding: "0.125rem 0.375rem",
                  "border-radius": "0.25rem",
                  "font-size": "0.875em",
                }}
              >
                package.json
              </code>{" "}
              scripts, Vite config, Vitest config, ESLint config, and Prettier config with a single{" "}
              <code
                style={{
                  "background-color": "var(--color-surface1, #e2e8f0)",
                  padding: "0.125rem 0.375rem",
                  "border-radius": "0.25rem",
                  "font-size": "0.875em",
                }}
              >
                vp
              </code>{" "}
              invocation.
            </p>
            <Button color="primary">Read the docs</Button>
          </div>

          <div>
            <ImgPlaceholder height="320px" label="Terminal screenshot" />
          </div>
        </div>
      </section>

      {/* ── Parallax interlude ── */}
      <section
        style={{
          position: "relative",
          "min-height": "28rem",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          overflow: "hidden",
        }}
      >
        {/* Parallax background */}
        <div
          style={{
            position: "absolute",
            inset: "-30%",
            transform: `translateY(${scrollY() * 0.4}px)`,
            "will-change": "transform",
            "z-index": "0",
          }}
        >
          <ImgPlaceholder
            label="Background illustration"
            style={{
              width: "100%",
              height: "160%",
              "border-radius": "0",
              border: "none",
              opacity: "0.2",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            inset: "0",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--color-primary, #3b82f6) 85%, transparent), color-mix(in srgb, var(--color-secondary, #8b5cf6) 85%, transparent))",
            "z-index": "1",
          }}
        />
        <div
          style={{
            position: "relative",
            "z-index": "2",
            "text-align": "center",
            padding: "4rem 1.5rem",
            color: "white",
          }}
        >
          <h2
            style={{
              "font-size": "clamp(1.75rem, 4vw, 3rem)",
              "font-weight": "800",
              margin: "0 0 1rem",
            }}
          >
            Ready to ship faster?
          </h2>
          <p
            style={{
              opacity: "0.85",
              "max-width": "28rem",
              margin: "0 auto 2rem",
              "font-size": "1.125rem",
              "line-height": "1.6",
            }}
          >
            Join thousands of teams who moved to Vite+ and never looked back.
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              "justify-content": "center",
              "flex-wrap": "wrap",
            }}
          >
            <Button
              size="lg"
              style={{
                "background-color": "white",
                color: "var(--color-primary, #3b82f6)",
                "border-color": "white",
              }}
            >
              Start for free
            </Button>
            <Button variant="outline" size="lg" style={{ "border-color": "white", color: "white" }}>
              View on GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* ── Testimonials / use-case section ── */}
      <section style={{ padding: "6rem 1.5rem" }}>
        <div class="page-wrap">
          <div style={{ "text-align": "center", "margin-bottom": "4rem" }}>
            <h2
              style={{
                "font-size": "clamp(1.75rem, 4vw, 2.75rem)",
                "font-weight": "800",
                color: "var(--color-text, #0f172a)",
                margin: "0 0 1rem",
              }}
            >
              Built for every team
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              "grid-template-columns": "repeat(auto-fit, minmax(20rem, 1fr))",
              gap: "1.5rem",
            }}
          >
            <For
              each={[
                {
                  label: "Team screenshot A",
                  caption: "Startups ship MVPs in days",
                },
                {
                  label: "Team screenshot B",
                  caption: "Enterprises scale with confidence",
                },
                {
                  label: "Team screenshot C",
                  caption: "Open-source projects move fast",
                },
              ]}
            >
              {(item) => (
                <Card>
                  <CardBody>
                    <ImgPlaceholder height="180px" label={item.label} />
                    <p
                      style={{
                        "margin-top": "1rem",
                        "font-weight": "600",
                        color: "var(--color-text, #0f172a)",
                        "text-align": "center",
                      }}
                    >
                      {item.caption}
                    </p>
                  </CardBody>
                </Card>
              )}
            </For>
          </div>
        </div>
      </section>

      {/* ── Footer gap ── */}
      <div style={{ height: "4rem" }} />
    </div>
  );
}
