#!/bin/bash

# Script to create worker agent specifications for newest free models
# Usage: ./create_worker_agents.sh

set -e

echo "Creating worker agent specifications for newest free models..."

# Define target model families
TARGET_MODELS=("qwen" "kimi" "nemotron" "gpt-oss" "step")

# Get free models from OpenRouter API
echo "Fetching free models from OpenRouter API..."
FREE_MODELS=$(curl -s "https://openrouter.ai/api/v1/models" | jq -r '.data[] | select(.pricing.prompt=="0" and .pricing.completion=="0") | .id')

if [ -z "$FREE_MODELS" ]; then
  echo "Error: Could not fetch free models from OpenRouter API"
  exit 1
fi

echo "Found $(echo "$FREE_MODELS" | wc -l) free models"

# Process each target model family
for TARGET in "${TARGET_MODELS[@]}"; do
  echo "Processing $TARGET models..."
  
  # Filter free models for this family
  MODELS=$(echo "$FREE_MODELS" | grep -i "$TARGET" || true)
  
  if [ -z "$MODELS" ]; then
    echo "No free $TARGET models found"
    continue
  fi
  
  echo "Found $(echo "$MODELS" | wc -l) free $TARGET models:"
  echo "$MODELS"
  
  # Process each model
  while IFS= read -r MODEL; do
    if [ -z "$MODEL" ]; then
      continue
    fi
    
    echo "Processing model: $MODEL"
    
    # Extract provider and model name for filename
    # Format is usually "provider/model-name:free" or just "model-name:free"
    if [[ "$MODEL" == *":"* ]]; then
      MODEL_BASE=$(echo "$MODEL" | sed 's/:free$//')
    else
      MODEL_BASE="$MODEL"
    fi
    
    # Determine provider abbreviation
    if [[ "$MODEL" == opencode/* ]]; then
      PROVIDER="oc"
      MODEL_FOR_FRONTMATTER="$MODEL_BASE"
    elif [[ "$MODEL" == openrouter/* ]]; then
      PROVIDER="or"
      MODEL_FOR_FRONTMATTER="$MODEL_BASE"
    else
      # Assume openrouter if no explicit provider
      PROVIDER="or"
      MODEL_FOR_FRONTMATTER="$MODEL_BASE"
    fi
    
    # Create safe filename by replacing slashes and special characters
    SAFE_MODEL_NAME=$(echo "$MODEL_BASE" | tr '/' '-' | tr ':' '-' | tr '.' '-')
    FILENAME="${PROVIDER}_${SAFE_MODEL_NAME}_worker.md"
    FILEPATH="/home/em/repos/oss/staccato-toolkit/.opencode/agents/$FILENAME"
    
    # Skip if file already exists
    if [ -f "$FILEPATH" ]; then
      echo "  Skipping existing file: $FILENAME"
      continue
    fi
    
    # Create the worker agent specification
    echo "  Creating: $FILENAME"
    
    cat > "$FILEPATH" << EOF
---
description: Parallelizable general-purpose worker; expertise attached to td task as skill to use.
mode: subagent
model: $MODEL_FOR_FRONTMATTER:free
temperature: 0.7
tools:
  write: true
  edit: true
  bash: true
  kubernetes_*: true
---

# Worker agent

## Session start

\`\`\`bash
task worker:next_task <worker_feature_id> # Returns null or {task_id: <task_id>, skill: <skill>, context: <context>, status: status}
\`\`\`

## **IMPORTANT**

**Whenever** \`worker:next_task\` returns null, that's a signal that the feature is \`complete\`

## WHEN: status in [\`in_progress\`, \`open\`] Implementation operations

1. use the \`context\` and \`skill\` returned from \`worker:next_task\` to implement the task while
    logging progress. If \`skill\` is a comma-separated list, load each skill before beginning (see
    \`skill-composition\` skill for guidance)
2. link implementation files after completing work: \`td link <id> <files> --role implementation\`
3. [perform handoff](#handoff)
4. Progress the task status: \`td review <id>\`

## WHEN: status == \`in_review\` Review operations

1. use the \`context\` and \`skill\` returned from \`worker:next_task\` to review the implementation of
    the task while logging progress. If \`skill\` is a comma-separated list, load each skill before
    reviewing
2. Get implementation files: \`td files <id> --role implementation\` and review them
3. [perform handoff](#handoff)
4. Progress the task status:
    - **IF VERIFIED**: \`td approve <id>\`
    - **IF REJECTED**: \`td reject <id>\`

## Core responsibilities

- Perform task retrieved from \`worker:next_task\`
- Use rely on the specified skill for the guide to implementing the task
- Log progress and decisions with \`td log\` and use flags:
  - \`--decision\` for significant decisions made during implementation
  - \`--hypothesis\` for assumptions or hypotheses that are being tested during implementation
  - \`--tried\` for approaches or solutions that were attempted during implementation
  - \`--result\` for outcomes of the approaches or solutions that were attempted during implementation
  - \`--blocker\` for any blockers encountered during implementation
- Link implementation files after completing work: \`td link <id> <files> --role implementation\`
- Progress the task status

## Handoff

Handoff captures the session's work and decisions, preserving context for the next session. Handoff
is required at each task state transition:

- **Before \`td review\` (submitting for review)**:

  \`\`\`bash
  td handoff <id> --done "<what was implemented>" --remaining "none" [--decision "<key decision made>"]
  \`\`\`

- **Before \`td approve\` (approving a reviewed task)**:

  \`\`\`bash
  td handoff <id> --done "Verified: <summary of what was confirmed>" --remaining "none"
  \`\`\`

- **Before \`td reject\` (returning task to implementer)**:

  \`\`\`bash
  td handoff <id> --done "Review complete, rejected" --remaining "<specific actionable issues to fix>"
  \`\`\`

Handoff ensures the next agent session knows what was done, what remains, and why decisions were
made.
EOF
    
    echo "  Created $FILENAME"
  done <<< "$MODELS"
done

echo "Worker agent creation complete!"

# Show summary
echo ""
echo "Created worker agents:"
ls -la /home/em/repos/oss/staccato-toolkit/.opencode/agents/*_worker.md | grep -v "worker.md$" | wc -l