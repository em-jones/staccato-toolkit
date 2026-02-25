#!/bin/bash

EPIC_ID=$1

# Get children of epic
bun .ops/scripts/worker/tasks-without-skills.ts "$WORKER_EPIC_ID"
