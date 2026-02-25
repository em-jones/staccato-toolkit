#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PLUGINS_DIR="${PROJECT_DIR}/plugins"

usage() {
  echo "Usage: $0 <technology-name> [signal-providers...]"
  echo ""
  echo "Creates a new @op-plugin/[technology]-signals plugin"
  echo ""
  echo "Arguments:"
  echo "  technology-name    Name of the technology (e.g., prometheus, tempo, loki)"
  echo "  signal-providers   Optional list of signal provider plugins to depend on"
  echo "                    Available: core-traces, core-metrics, core-logs, clickhouse-traces,"
  echo "                               clickhouse-metrics, clickhouse-logs, tempo, mimir, loki"
  echo ""
  echo "Examples:"
  echo "  $0 prometheus"
  echo "  $0 prometheus core-metrics clickhouse-metrics"
  echo "  $0 tempo core-traces clickhouse-traces"
  exit 1
}

if [ $# -lt 1 ]; then
  usage
fi

TECH="$1"
shift

PLUGIN_NAME="@op-plugin/${TECH}-signals"
PLUGIN_DIR="${PLUGINS_DIR}/${TECH}-signals"

if [ -d "$PLUGIN_DIR" ]; then
  echo "Error: Plugin directory already exists at $PLUGIN_DIR"
  exit 1
fi

SIGNAL_PROVIDERS=("$@")

echo "Creating plugin: $PLUGIN_NAME"
echo "Location: $PLUGIN_DIR"

mkdir -p "$PLUGIN_DIR/src"
mkdir -p "$PLUGIN_DIR/tests"

DEPS="\"@op-plugin/signals-api\": \"workspace:*\""

if [ ${#SIGNAL_PROVIDERS[@]} -gt 0 ]; then
  for sp in "${SIGNAL_PROVIDERS[@]}"; do
    case "$sp" in
      core-traces) DEPS="${DEPS},\"@op-plugin/signal-provider-core-traces\":\"workspace:*\"" ;;
      core-metrics) DEPS="${DEPS},\"@op-plugin/signal-provider-core-metrics\":\"workspace:*\"" ;;
      core-logs) DEPS="${DEPS},\"@op-plugin/signal-provider-core-logs\":\"workspace:*\"" ;;
      clickhouse-traces) DEPS="${DEPS},\"@op-plugin/signal-provider-clickhouse-traces\":\"workspace:*\"" ;;
      clickhouse-metrics) DEPS="${DEPS},\"@op-plugin/signal-provider-clickhouse-metrics\":\"workspace:*\"" ;;
      clickhouse-logs) DEPS="${DEPS},\"@op-plugin/signal-provider-clickhouse-logs\":\"workspace:*\"" ;;
      tempo) DEPS="${DEPS},\"@op-plugin/signal-provider-tempo\":\"workspace:*\"" ;;
      mimir) DEPS="${DEPS},\"@op-plugin/signal-provider-mimir\":\"workspace:*\"" ;;
      loki) DEPS="${DEPS},\"@op-plugin/signal-provider-loki\":\"workspace:*\"" ;;
      *) echo "Warning: Unknown signal provider '$sp', skipping" ;;
    esac
  done
fi

DEPS_JSON="{$DEPS}"

cat > "$PLUGIN_DIR/package.json" << EOF
{
  "name": "$PLUGIN_NAME",
  "version": "0.0.0",
  "description": "A starter for creating a TypeScript package.",
  "homepage": "https://github.com/author/library#readme",
  "bugs": {
    "url": "https://github.com/author/library/issues"
  },
  "license": "MIT",
  "author": "Author Name <author.name@mail.com>",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/author/library.git"
  },
  "files": [
    "dist"
  ],
  "type": "module",
  "exports": {
    ".": "./dist/index.mjs",
    "./package.json": "./package.json"
  },
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "vp pack",
    "dev": "vp pack --watch",
    "test": "vp test",
    "check": "vp check",
    "prepublishOnly": "vp run build"
  },
  "dependencies": ${DEPS_JSON},
  "devDependencies": {
    "@types/node": "^25.5.0",
    "@typescript/native-preview": "7.0.0-dev.20260316.1",
    "bumpp": "^11.0.1",
    "typescript": "^5.9.3",
    "vite-plus": "^0.1.11"
  }
}
EOF

cat > "$PLUGIN_DIR/tsconfig.json" << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

cat > "$PLUGIN_DIR/vite.config.ts" << 'EOF'
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.mjs',
    },
    rollupOptions: {
      external: ['vite'],
    },
  },
});
EOF

cat > "$PLUGIN_DIR/src/index.ts" << 'EOF'
export function fn() {
  return "Hello, signals plugin!";
}
EOF

cat > "$PLUGIN_DIR/tests/index.test.ts" << 'EOF'
import { describe, it, expect } from 'vitest';

describe('index', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});
EOF

cat > "$PLUGIN_DIR/README.md" << EOF
# $PLUGIN_NAME

Signals plugin for $TECH.

## Installation

\`\`\`bash
npm install $PLUGIN_NAME
\`\`\`

## Usage

\`\`\`ts
import { fn } from '$PLUGIN_NAME';
\`\`\`
EOF

cat > "$PLUGIN_DIR/.gitignore" << 'EOF'
node_modules
dist
*.log
EOF

echo ""
echo "Created plugin: $PLUGIN_NAME"
echo "Location: $PLUGIN_DIR"
echo ""
echo "To add to workspace, run:"
echo "  cd $PLUGIN_DIR && bun install"