# Workflows Core

## Dependes on the `@op-plugin/events-core` apis and an implementation

**NOTE**: Use this to register workflows to be triggered by events:

- catalog events
- database events
- cron events

Core apis for the workflows system:

- Use this to execute an entity provider in order to sync entities into the catalog. This is a
  one-way operation that takes entities from an external source and creates/updates them in the
  catalog. The provider is responsible for defining how to connect to the external source and fetch
  the entities.
