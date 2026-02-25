# Specification: Tempo Backend Configuration

## Overview

Defines configuration, deployment, and operation of the Tempo backend, including retention policies, performance tuning, storage configuration, and observability of the tracing infrastructure itself.

## Requirements
### Requirement: Tempo retention policy

Tempo SHALL be configured with a retention period of 72 hours (3 days) for all traces. Older traces MUST be automatically deleted to manage storage costs.

#### Scenario: Trace stored for 72 hours

- **WHEN** a trace is exported to Tempo
- **THEN** it is available for querying for the next 72 hours

#### Scenario: Trace automatic deletion after retention

- **WHEN** 72 hours have elapsed since trace creation
- **THEN** the trace is automatically deleted from Tempo storage

#### Scenario: Retention policy configuration

- **WHEN** Tempo is configured
- **THEN** the retention period is set in the Tempo configuration: `traces.retention: 72h`

### Requirement: Tempo storage backend configuration

Tempo SHALL use object storage (S3, GCS, or Azure Blob Storage) for trace blocks. Block size SHALL be configured at 1 GB to balance query performance and storage efficiency.

#### Scenario: S3 storage backend

- **WHEN** Tempo is deployed in AWS
- **THEN** it is configured to use S3 with bucket `tempo-traces` and region from environment

#### Scenario: Block size configuration

- **WHEN** Tempo storage is initialized
- **THEN** the block size is set to 1 GB (`block_size_bytes: 1073741824`)

#### Scenario: Distributed storage replication

- **WHEN** traces are written to storage
- **THEN** they are replicated across at least 2 availability zones for durability

### Requirement: Tempo ingestion rate limiting

Tempo SHALL rate-limit incoming trace spans to prevent overload. Maximum ingestion rate MUST be configurable per client and globally, defaulting to 100,000 spans/second globally.

#### Scenario: Global ingestion rate limit

- **WHEN** the global span ingestion rate exceeds 100,000 spans/second
- **THEN** Tempo rejects excess spans with HTTP 429 (Too Many Requests)

#### Scenario: Per-service rate limit

- **WHEN** a service sends spans at > 50,000 spans/second (configurable)
- **THEN** Tempo rejects spans from that service and returns 429

#### Scenario: Rate limit configuration

- **WHEN** Tempo is configured
- **THEN** rate limits are set: `rate_limit.max_bytes_per_second: 10485760` (10 MB/s)

### Requirement: Tempo query performance and indexing

Tempo SHALL index traces by service name, span name, and duration for efficient querying. Indexes MUST be rebuilt periodically (every 24 hours) to reflect new data.

#### Scenario: Query by service name

- **WHEN** a user queries traces for a specific service
- **THEN** the query completes in < 1 second using the service name index

#### Scenario: Query by duration (latency)

- **WHEN** a user queries for traces with duration > 5 seconds
- **THEN** the query completes in < 5 seconds using the duration index

#### Scenario: Index rebuild

- **WHEN** 24 hours have elapsed since the last index rebuild
- **THEN** Tempo automatically rebuilds indexes for efficient future queries

### Requirement: Tempo high availability and replication

Tempo SHALL be deployed with at least 3 replicas for redundancy. Write consistency MUST be configured to allow loss of 1 replica without data loss.

#### Scenario: Tempo deployment replicas

- **WHEN** Tempo is deployed to production
- **THEN** it has at least 3 pod replicas running across different nodes

#### Scenario: Single replica failure

- **WHEN** one Tempo replica fails
- **THEN** other replicas continue serving queries with no data loss

#### Scenario: Quorum writes

- **WHEN** a trace block is written
- **THEN** it is written to at least 2 out of 3 replicas (quorum)

### Requirement: Tempo observability and monitoring

Tempo's own performance MUST be observable through Prometheus metrics. Key metrics include ingestion rate, query latency, storage usage, and error rates.

#### Scenario: Ingestion rate metric

- **WHEN** Tempo is running
- **THEN** it exports metric `tempo_distributor_spans_received_total` (rate)

#### Scenario: Query latency metric

- **WHEN** a query is executed against Tempo
- **THEN** it records metric `tempo_querier_request_duration_seconds` (histogram)

#### Scenario: Storage usage metric

- **WHEN** traces are stored in Tempo
- **THEN** it exports metric `tempo_ingester_blocks_total_bytes` (gauge)

### Requirement: Tempo backup and disaster recovery

Tempo trace blocks stored in object storage MUST have backup enabled. Backup frequency SHALL be daily, with retention of 7 days of backup snapshots.

#### Scenario: Daily backup

- **WHEN** 24 hours have elapsed since the last backup
- **THEN** Tempo (or the storage system) automatically backs up all trace blocks

#### Scenario: Restore from backup

- **WHEN** data corruption occurs
- **THEN** traces can be restored from a backup snapshot from the previous 7 days

#### Scenario: Backup retention

- **WHEN** a backup is older than 7 days
- **THEN** it is automatically deleted to save storage cost
