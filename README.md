# DLN Indexer & Aggregator

Indexes on-chain transactions, extracts `create` / `fulfill` order events, aggregates daily statistics, and exposes a REST API for analytics.

---

## Overview

This project is intentionally built as a **real backend system**, not a demo.

It includes:

- Reliable Solana program indexing (SRC + DST)
- Forward indexing and historical backfill
- Persistent cursors and idempotent ingestion
- Job-based aggregation with retries
- Pre-aggregated analytics for fast API queries
- Clean separation of concerns

---

## Technology Stack

- **Node.js** — main runtime for indexer, aggregator and API
- **PostgreSQL** — persistent storage for indexed transactions, jobs and aggregated stats
- **Redis** — job queue coordination, locking and retry scheduling
- **Docker / Docker Compose** — local and reproducible environment
- **Solana RPC (Helius)** — transaction and log ingestion
- **Jupiter API** — token price resolution
- **Nx** — monorepo tooling and app isolation

---

## Architecture

```
Solana RPC
   │
   ▼
Indexer (SRC + DST)
   │
   ▼
Raw TX + Aggregation Jobs
   │
   ▼
Aggregator Workers
   │
   ▼
Order Events + Daily Stats
   │
   ▼
REST API
```

---

## Components

<details>
<summary><strong>Indexer</strong></summary>

- Fetches transactions from Solana RPC
- Two modes:
  - `default` — forward indexing
  - `backfill` — historical scan
- Stores:
  - `raw_tx`
  - `aggregation_jobs`
- Maintains persistent cursor in `indexer_state`
- Fully idempotent via `ON CONFLICT DO NOTHING`

</details>

<details>
<summary><strong>Aggregator</strong></summary>

- Pulls jobs from `aggregation_jobs`
- Parses DLN instructions & events:
  - `CreateOrder`
  - `CreateOrderWithNonce`
  - `FulfillOrder`
- Extracts:
  - order id
  - token mint
  - amount
  - block time
- Writes:
  - `order_events`
  - `daily_stats`
- Retry logic with exponential backoff

</details>

<details>
<summary><strong>REST API</strong></summary>

- NestJS REST service
- Read-only analytics endpoints
- Example:
  ```
  GET /dashboard/daily-volume?from=2024-01-01&to=2024-01-31
  ```
- Designed for dashboards and reporting

</details>

---

## Database

<details>
<summary><strong>order_events</strong></summary>

Parsed DLN events.

- `signature`
- `order_id`
- `type` (`create | fulfill`)
- `token_mint`
- `amount`
- `day`

Uniqueness:

- `(signature, type, order_id)`

</details>

<details>
<summary><strong>daily_stats</strong></summary>

Pre-aggregated daily metrics.

- `day`
- `created_count`
- `created_volume_usd`
- `fulfilled_count`
- `fulfilled_volume_usd`

</details>

<details>
<summary><strong>aggregation_jobs</strong></summary>

Job queue.

- `status` (`pending | processing | failed | skipped | done`)
- `locked_until`
- `next_retry_at`
- `attempts`

</details>

---

# Environment variables (short reference)

```bash
POSTGRES_USER – PostgreSQL user name
POSTGRES_PASSWORD – PostgreSQL user password
POSTGRES_DB – PostgreSQL database name
POSTGRES_PORT – PostgreSQL exposed port

DATABASE_URL – Full PostgreSQL connection string used by backend services

SOLANA_RPC_URL – Solana RPC endpoint (Helius Mainnet RPC)

# Indexer

RPC_SIG_CONCURRENCY – Concurrent requests for fetching transaction signatures
RPC_TX_CONCURRENCY – Concurrent requests for fetching full transactions
RPC_BATCH_TX_CONCURRENCY – Concurrency for batch transaction RPC calls
RPC_MAX_ATTEMPTS – Maximum retry attempts for RPC requests
RPC_BASE_DELAY_MS – Initial retry delay for failed RPC calls (ms)
RPC_MAX_DELAY_MS – Maximum retry backoff delay (ms)
SRC_PROGRAM_ID – Source-chain DLN program ID
DST_PROGRAM_ID – Destination-chain DLN program ID
RPC_BACKFILL_BATCH_SIZE – Batch size for historical (backfill) indexing
RPC_FORWARD_BATCH_SIZE – Batch size for live (forward) indexing

# Aggregator

AGGREGATION_WORKERS_COUNT – Number of parallel aggregation workers
AGGREGATION_WORKER_TICK_INTERVAL_MS – Worker polling interval (ms)
AGGREGATION_WORKER_JOBS_BATCH_SIZE – Jobs fetched per worker tick
AGGREGATION_WORKER_JOBS_BATCH_LOCK_MS – Job batch lock duration (ms)
AGGREGATION_WORKER_JOBS_CONCURRENCY – Concurrent jobs per worker
AGGREGATION_WORKER_JOBS_BASE_ERROR_DELAY_MS – Base retry delay for failed jobs (ms)
AGGREGATION_WORKER_JOBS_MAX_ERROR_DELAY_MS – Maximum retry delay for failed jobs (ms)

JUPITER_URL – Jupiter price API endpoint
JUPITER_API_KEY – Jupiter API key for price requests

REDIS_URL – Redis connection string
```

---

## Running locally

```bash
docker compose up --build
```

Starts PostgreSQL, Redis, migrations, indexer, aggregator and API.

---

## Design notes

<details>
<summary><strong>Why job-based aggregation?</strong></summary>

Decouples indexing from parsing, enables retries, scaling and clean failure handling.

</details>

<details>
<summary><strong>Why daily aggregation?</strong></summary>

Fast dashboard queries without scanning raw events.

</details>

## Instruction & Event Parsing

- Instructions and events are parsed **directly from raw transaction data**
- Decoding is done using **borsh layouts**, matching on-chain program structures
- Anchor discriminators are used to identify events and instruction variants
- Parsing logic is isolated into a dedicated service/module

Implementation details can be found in: [Parser service](apps/aggregator/src/parser/parser.service.ts)

---

## Performance Metrics (Target Task)

Indexer & Aggregator Throughput

- **~50,000 on-chain events processed in ~10 minutes**
- Stable ingestion without backlog accumulation
- Pending jobs queue remains near-zero under sustained load
- Failed jobs are retried with exponential backoff and do not block pipeline progress

This metric was achieved on a local environment using a Helius RPC endpoint (~10 rpc) with rate limiting enabled (HTTP 429 handling in place).

---

## Price Handling

- In is used Jupiter (https://api.jup.ag/price) from price fetching.
- Price is resolved **by current day**, not by the event timestamp
- Price values are **cached** and reused across all events for the same day
- This approach is used intentionally to avoid **paid historical pricing APIs**
</details>

---

## Possible Improvements

<details>
<summary><strong>Observability & Metrics</strong></summary>

- Add **Prometheus metrics** for:
  - Indexer lag (slot / block_time delta)
  - Aggregation job states (pending / processing / failed)
  - Retry counts and backoff delays
- Visualize metrics in **Grafana dashboards**
- Add alerting on:
  - Indexer falling behind source chain
  - Excessive retry or failure rates

</details>

<details>
<summary><strong>Infrastructure & Scaling</strong></summary>

- Horizontal scaling for:
  - Aggregator workers (via job sharding or advisory locks)
- Dedicated RPC pool with priority routing

</details>

<details>
<summary><strong>API & Product Layer</strong></summary>

- Optional WebSocket / SSE endpoints for real-time updates

</details>
