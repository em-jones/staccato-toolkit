# Plugin Platform

## Legend

- 🟢 = stable
- 🟡 = beta
- 🔴 = not started/alpha

## Platform Repsonsibilities

- 💻 Provide `interfaces` for plugins to implement core features
- ♻️ Lifecycle orchestration logic for plugin registration and configuration

### Common Features

#### `StandardSchemaV1` - standard schema for plugin configuration, with support for validation and defaults

#### 🧩 `ServerServices` - server-side dependency container

#### 💻 `ClientServices` - client-side dependency container <!-- TODO: Needs lazy implementation-->

#### 🧪 Type-safe first

Goal: use of generics to provide type safety for plugin deveopers/plugin consumers

    - ✅ adding services through the plugin registration strongly-types the
      service's availabilty to be consumed by clients
    - ✅ plugin configuration is rendered as `openapi` schema to support yaml lsp validation and auto-complete in `openport.yaml`
    - ✅ feature flag providers strongly type the `FeatureService` interface for plugin consumers to ensure type
      safety when consuming feature flags
    - ✅ event producers and subscribers are strongly typed to ensure type safety when producing and consuming events

### 🏁 ./src/features - Feature Management

#### Interface(s)

    - [`FeatureService<Validators>`](./src/features/api.ts) strongly-typed interface for accessing feature flags within your plugins
      with support for custom validators
    - In-memory feature-flag provider service, backed by openfeature to support configuration

#### Beta

### ⚙️ ./src/config - Configuration

#### Beta

    - dev environment open-api spec generation for integration with `openport.yaml`
    - validations on start-up: validate configuration provided that's difficult to validate with json schema

#### Planned

    -

### 👁️ ./src/o11y/ - Observability

Registers telemetry services for the platform and plugins registered with the plugin system

### 📊 metrics 🟡

#### Beta

    - `MetricsBuilder` interface for registering custom metrics within your plugins

#### Planned

    - otel-collector configuration

### 📝 logging 🟡 (otel)

### 🔍 tracing 🟡

### ⁉️ error tracking 🔴

### ⏲️ profiles 🔴

### ./src/db - Db

### ./src/eventing

- gather migration jobs

## Lifecycle

0. Bootstrap core
   - validate configurations of core and plugins
   - Initialize service container(s)
1. Initialize Telemetry services/plugins
   - look for `metrics`, `logging`, and `tracing` plugins and config and initialize them or provide
     defaults
2. Register additional plugins using the builder interface:
   - Use `registerWebServer()` to register web server plugins
   - Use `registerDb()` to register database plugins
   - Use `registerEventing()` to register eventing plugins
   - Use `registerPlugin()` for all other plugins
3. Initialize `eventing` and `workflow` plugins and services (required for registering lifecycle
   event hooks)
   1. - create default hooks:
      - `cron`
      - `platform.before_plugin_init`
      - `platform.after_plugin_init`
      - get data_store plugins and attach handlers to hooks
        - `platform.data_store.before_init`
        - `platform.data_store.after_init`
        - `platform.data_store.before_query`
        - `platform.data_store.after_query`
        - `platform.data_store.before_update`
        - `platform.data_store.after_update`
        - `platform.data_store.before_delete`
        - `platform.data_store.on_error`
        - `platform.data_store.before_migration`
        - `platform.data_store.after_migration`
        - `platform.core_data.after_iam_init`
        - `platform.core_data.after_catalog_init`
      - get web server plugin and attach handlers to hooks
        - `platform.web.before_start`
        - `platform.web.after_start`
        - `platform.web.before_request`
        - `platform.web.after_request`
        - `platform.web.on_error`
        - `platform.web.before_stop`
        - `platform.web.after_stop`
      - gather all producers from all registered plugins and register them with the event system
      - gather all subscribers from all registered plugins and register them with the event system
4. Initialize `data_store` service provider plugin(s)
   - use this to provide db connections to plugins that require them for persistence
5. Initialize web server services/plugins
   - look for `webserver` plugin and configure it (required)
