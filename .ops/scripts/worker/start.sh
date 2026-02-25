#!/usr/bin/env bash
set -euo pipefail

# 1. New session
td usage --new-session
bun .ops/scripts/worker/td-next-task.ts "$WORKER_EPIC_ID"
