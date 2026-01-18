# DLN Indexer & Aggregator

> Production-oriented indexing and aggregation service for **deBridge DLN** on Solana.
>
> Indexes on-chain transactions, extracts `create` / `fulfill` order events, aggregates daily statistics, and exposes a REST API for analytics.

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
