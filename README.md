# 🎵 Staccato Toolkit

> An open-source, vendor-agnostic developer platform for building and operating cloud-native
> software — designed to satisfy all six pillars of the AWS Well-Architected Framework out of the
> box.

---

## 🔭 Vision

Most platform engineering teams solve the same problems repeatedly:

- 🔁 Reproducible dev environments
- 🚀 Consistent CI/CD pipelines
- ☸️ A Kubernetes runtime target
- 📊 Observability out of the box
- 🔒 Security baselines
- 💰 Cost guardrails

The Staccato Toolkit packages those solutions into a single, opinionated-but-extensible monorepo
that a platform team can fork, own, and evolve.

The framework is **vendor-agnostic**. The reference architecture targets AWS — EKS, IAM, CloudWatch,
and the broader AWS service catalog — but the abstractions are Kubernetes-native and portable. The
AWS Well-Architected Framework is used as a quality benchmark, not a vendor constraint: every
platform capability maps to at least one of its six pillars.

```
┌────────────────────────────────────────────────────────────────┐
│                      Staccato Toolkit                          │
│                                                                │
│   ┌────────────────────────────────────────────────────────┐   │
│   │              Platform Toolkit                          │   │
│   │  CLI · API server · domain library · Dagger CI/CD      │   │
│   │  Backstage portal · OpenSpec change management         │   │
│   └────────────────────────────────────────────────────────┘   │
│                                                                │
│   ┌────────────────────────────────────────────────────────┐   │
│   │         Golden-Path Reference Architecture             │   │
│   │  Kubernetes (KubeVela) · observability · security      │   │
│   │  reliability · cost optimization · sustainability      │   │
│   └────────────────────────────────────────────────────────┘   │
│                                                                │
│   ┌─────────────────────────────────────────────────────┐      │
│   │      AWS Well-Architected Framework Alignment       │      │
│   │  Operational Excellence · Security · Reliability    │      │
│   │  Performance Efficiency · Cost · Sustainability     │      │
│   └─────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────┘
```

📋 See [ROADMAP.md](ROADMAP.md) for the detailed, pillar-by-pillar plan.

---

## 🎯 Philosophy

**Dev tools: only the ones you need, all the ones you want.**

The Staccato Toolkit embraces a minimalist-yet-expansive approach to developer tooling:

- **Only the ones you need**: No bloat. Every tool in the default stack solves a real problem in the
  golden-path workflow. Pre-configured, opinionated, production-ready.
- **All the ones you want**: Fully extensible. **COMING SOON**

The toolkit combines strict opinionation within the default path with radical flexibility beyond it.
Developers get a fast, guided road to production; platform teams get complete ownership and the
freedom to evolve.

---

## ✅ Well-Architected Coverage

> 🟢 Available · 🟡 In progress · 🔵 Planned

| Pillar                        | Status         | Key capabilities                                                                      |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| ⚙️ **Operational Excellence** | 🟡 In progress | CI/CD (Dagger), change management (OpenSpec), Kubernetes runtime, observability stack |
| 🔒 **Security**               | 🔵 Planned     | IAM patterns, secrets management, image scanning, RBAC, network policy                |
| 🛡️ **Reliability**            | 🔵 Planned     | Multi-cluster delivery (KubeVela), progressive rollout, health checks, chaos testing  |
| ⚡ **Performance Efficiency** | 🔵 Planned     | HPA, load testing, profiling tooling                                                  |
| 💰 **Cost Optimization**      | 🔵 Planned     | Resource tagging, cost allocation, rightsizing guidance                               |
| 🌱 **Sustainability**         | 🔵 Planned     | Resource efficiency patterns, cluster bin-packing                                     |

---

## 🏗️ Architecture

The toolkit is organized into two layers that compose into a complete platform:

### 🔧 Platform Toolkit

The machinery every platform team needs, regardless of what they're building:

| Component                  | Type       | Description                                                                |
| -------------------------- | ---------- | -------------------------------------------------------------------------- |
| `staccato-cli`             | Go service | 🖥️ User-facing CLI — triggers workflows and manages platform configuration |
| `staccato-server`          | Go service | 🌐 API server — orchestrates CLI ↔ system interactions                     |
| `staccato-core`            | Go library | 📦 Core business logic, data models, and shared interfaces                 |
| `platform` (Dagger module) | Go/Dagger  | 🔄 CI/CD pipeline engine — lint, format, test, build                       |
| Backstage developer portal | Node.js/TS | 🗂️ Software catalog, TechDocs, tech radar, scaffolder templates            |
| OpenSpec + `td`            | Workflow   | 📋 Structured change management with artifact-linked task tracking         |

### 🗺️ Golden-Path Reference Architecture

The opinionated cloud-native stack the toolkit builds toward:

| Layer                        | Technology                 | Role                                                           |
| ---------------------------- | -------------------------- | -------------------------------------------------------------- |
| ☸️ Container orchestration   | Kubernetes (EKS reference) | Standard runtime target                                        |
| 🚀 Application delivery      | KubeVela (OAM)             | Declarative multi-cluster app delivery and progressive rollout |
| 💻 Local development cluster | kind                       | Zero-VM local Kubernetes via Docker                            |
| 📦 Package management        | Helm                       | CNCF-graduated chart distribution                              |
| 🔁 Iterative local dev       | skaffold                   | Build → load → deploy loop for local clusters                  |
| 🛠️ Dev environment           | Devbox                     | Reproducible, version-pinned toolchain for every developer     |

### 🔗 Component dependency graph

```
staccato-cli    ──► staccato-core
staccato-server ──► staccato-core
```

### 📁 Go workspace modules

```
go.work
├── src/ops/workloads            (Dagger pipeline module)
├── src/staccato-toolkit/cli     (github.com/staccato-toolkit/cli)
├── src/staccato-toolkit/core    (github.com/staccato-toolkit/core)
└── src/staccato-toolkit/server  (github.com/staccato-toolkit/server)
```

---

## 📂 Repository Layout

```
openspec-td/
├── src/
│   ├── staccato-toolkit/
│   │   ├── cli/         # staccato-cli (Go service)
│   │   ├── server/      # staccato-server (Go service)
│   │   └── core/        # staccato-core (Go library)
│   ├── ops/
│   │   └── workloads/   # Dagger CI/CD module
│   └── dev-portal/
│       └── backstage/   # Backstage developer portal
├── openspec/            # Change management (specs, changes, schemas)
├── .entities/           # Backstage software catalog entities
├── .opencode/           # Agent skills and usage rules
├── docs/                # Architecture docs & MkDocs site
├── go.work              # Go workspace (unifies all modules)
└── devbox.json          # Reproducible dev environment
```

---

## 🚀 Getting Started

### Prerequisites

This project uses [Devbox](https://www.jetify.com/devbox/) for a fully reproducible development
environment. Install it once:

```bash
curl -fsSL https://get.jetify.com/devbox | bash
```

### Enter the dev shell

```bash
devbox shell
```

This drops you into a shell with all required tools pre-configured:

| Tool            | Version | Purpose                               |
| --------------- | ------- | ------------------------------------- |
| `go`            | latest  | 🐹 Go runtime for all toolkit modules |
| `golangci-lint` | latest  | 🔍 Go static analysis                 |
| `dagger`        | latest  | 🔄 Pipeline engine (local + CI)       |
| `nodejs-slim`   | 24.13.0 | 🟩 Backstage developer portal runtime |
| `bun`           | latest  | ⚡ JS tooling and package management  |

---

## 🛠️ Development

### Run the pipeline locally

All pipeline tasks are Dagger functions, invoked from `src/ops/workloads`:

```bash
# 🔍 Lint all Go source
dagger call lint --source ../..

# 🎨 Check formatting (gofmt)
dagger call format --source ../..

# 🧪 Run all tests
dagger call test --source ../..

# 🏗️ Build all binaries
dagger call build --source ../..
```

### Run tests directly

```bash
# All modules via go.work, from repo root
go test ./src/staccato-toolkit/...
```

### Format Go source

```bash
gofmt -w ./src/staccato-toolkit/...
```

---

## 🔄 CI/CD Pipeline

GitHub Actions drives the pipeline on every push to `main` and on pull requests. Each job delegates
to the Dagger module:

```
push / pull_request
        │
        ├─► lint    (dagger call lint --source ../..)
        ├─► format  (dagger call format --source ../..)
        │
        └─► test    (needs: lint, format)
               │
               └─► build (needs: lint, test)
```

- 📄 Pipeline definition: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
- 🧩 Dagger module: [`src/ops/workloads/main.go`](src/ops/workloads/main.go)

---

## 📋 Change Management

All planned work flows through [OpenSpec](openspec/) — a structured artifact workflow linking
specifications to tracked tasks:

```
openspec/
├── specs/      # Feature & capability specifications
├── changes/    # Active and archived change sets
├── schemas/v1  # Schema definitions
└── config.yaml # Domain context and enforcement rules
```

Tasks are tracked with the `td` CLI:

```bash
td usage --new-session   # orient to current work
td ls                    # list open issues
td start <id>            # begin work on an issue
```

Agent work (design → implementation → verify → archive) is coordinated through skills in
[`.opencode/skills/`](.opencode/skills/).

---

## 🗂️ Developer Portal

The [Backstage](https://backstage.io) developer portal lives at `src/dev-portal/backstage/` and
reads software catalog entities from [`.entities/`](.entities/).

| Entity               | Kind      | Description                                |
| -------------------- | --------- | ------------------------------------------ |
| `staccato-cli`       | Component | 🖥️ CLI service                             |
| `staccato-server`    | Component | 🌐 API server                              |
| `staccato-domain`    | Component | 📦 Domain library                          |
| `platform`           | Component | 🔄 Dagger CI/CD module                     |
| `developer-platform` | System    | 🏗️ Umbrella system grouping all components |

---

## Capabilities

### Core

- 🖥️ User-facing `cli`, `tui`, and `web` apps for triggering workflows and managing platform
  configuration
- ♻️ Pre-production environment bootstrapping
- 🌐 Production
  - 🔧 operations deployment and maintenance
    - 🔍 Observability stack integration - `otel`
    - 🧑‍💻 Developer portal - `backstage`
    - 📂 CI/CD Pipeline provisioning - `dagger` & `github actions`
  - runtime environment bootstrapping and maintenance
- Extensible plugin system for customizing both pre-production and production workflows

### Add-ons

- 🖌️ - GUI design collaboration via `penpot`
- 🏁 - Feature flags via `flagd` and `openfeature`

## 📚 Documentation

Full documentation is built with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/):

```bash
mkdocs serve
```

- 🏗️ [Architecture Overview](docs/architecture/overview.md)
- 🗺️ [Roadmap](ROADMAP.md)

---

## 🤝 Contributing

1. 🛠️ Enter the dev shell: `devbox shell`
2. 📝 Create a change: `openspec new change "<your-change-name>"`
3. 📐 Author specs and design artifacts following the OpenSpec workflow
4. ✅ Implement tasks tracked by `td`
5. 🔍 Ensure CI passes: `dagger call lint --source ../.. && dagger call test --source ../..`
6. 🚀 Submit a pull request

💡 Contributions that advance coverage of an AWS Well-Architected pillar are especially welcome —
see [ROADMAP.md](ROADMAP.md) for open areas.

---

## 📄 License

This project is licensed under the MIT License.
