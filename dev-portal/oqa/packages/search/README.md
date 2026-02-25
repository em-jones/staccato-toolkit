# OQA Search 🔍

## Search Architecture 🏗️

Search in OQA functions as a query builder that adapts to different contexts:

- **Global Search** 🌍: Text-based filter syntax (e.g., `service:auth severity:high` - GitHub-like) applied across all signal types. The UI parses and dispatches relevant filters to each signal's search backend.

- **Individual Search** 🎯: Uses provider-specific query languages for advanced, signal-specific queries (e.g., LogQL for logs, PromQL for metrics).

## Command Palette Search ⌨️

The primary search interface uses a `Cmd+K` command palette with:

- ✨ **Syntax highlighting** for query tokens (field names, operators, values)
- 💡 **Autocomplete suggestions** for fields, operators, and values based on context
- 🤖 **LSP-like experience** with real-time validation and error hints
- 🏷️ **Filter chips** for quick addition of common filters (time range, service, severity)

Example query experience:

```
service:auth severity:>error [last1h] |
  where latency_ms > 500 | sort by count desc
```

Search UI for the OQA system, configurable to support different OQA signal backends.

## Alignment with OQA Ecosystem Spec 📋

This package implements the search functionality for OQA signals:

- 📊 Searches across Performance, Error, and Incident signals
- 📝 Integrates with OTel-backed log storage
- 🛡️ Supports filtering by compliance framework controls

## Search Branches 🌿

This package provides a common set of search components that support two scenarios:

### 1. Global Search 🗂️

Unified search across all signal types from a single entry point.

- 🔄 Cross-signal query parsing
- 📈 Aggregated results from metrics, logs, traces, errors, incidents
- 🔽 Result type indicators and drill-down navigation

### 2. Individual Signal Search 🎪

Specialized search UIs for each signal type.

- 📉 Metrics search: Query by metric name, labels, aggregation
- 📜 Logs search: Full-text with severity filtering
- 🔗 Traces search: Trace ID lookup, service filtering
- ⚠️ Errors search: Error type, stack trace search
- 🚨 Incidents search: Status, severity, affected service filtering

## Shared Components 🧩

- ✍️ Search input with autocomplete
- 🔧 Filter builders (time range, service, severity)
- 📄 Result pagination
- 🕐 Search history
