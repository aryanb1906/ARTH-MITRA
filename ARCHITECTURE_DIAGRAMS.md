# 🎨 ARTH-MITRA Architecture Diagrams & Visual Reference

## Complete System Architecture Visualization

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                          ARTH-MITRA: 3-TIER ARCHITECTURE                                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   PRESENTATION LAYER                                                 │
│                               (Browser / Mobile Client)                                              │
│                                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                                              │  │
│  │  ┌───────────┐  ┌───────────┐  ┌─────────────────┐  ┌─────────────┐  ┌──────────────────┐ │  │
│  │  │  Chat UI  │  │   Voice   │  │ Tax Calculator  │  │  Dashboard  │  │  Saved Messages  │ │  │
│  │  │           │  │  Copilot  │  │                 │  │             │  │                  │ │  │
│  │  │ Streaming │  │ STT/TTS   │  │ Old vs New      │  │  Analytics  │  │  Bookmarks      │ │  │
│  │  │ Markdown  │  │ 13 Voice  │  │ Regime          │  │  Metrics    │  │  Tags / Notes   │ │  │
│  │  │ Rendering │  │ Commands  │  │ Deductions      │  │  Charts     │  │  Pin to Top     │ │  │
│  │  └────┬──────┘  └─────┬─────┘  └────────┬────────┘  └──────┬──────┘  └────────┬─────────┘ │  │
│  │       │               │                 │                  │                  │           │  │
│  │       └───────────────┴─────────────────┴──────────────────┴──────────────────┘           │  │
│  │                              React/Next.js + TypeScript                                    │  │
│  │                         Redux Toolkit (State Management)                                  │  │
│  │                         TanStack Query (Server State)                                     │  │
│  │                                                                                           │  │
│  └──────────────────────────────────────────────────┬──────────────────────────────────────┘  │
│                                                     │ HTTPS                                   │
│                                         TLS 1.3, Token in localStorage                       │
│                                         Refresh Token in HttpOnly Cookie                     │
└─────────────────────────────────────────────────────┼──────────────────────────────────────────┘
                                                      │
                ┌─────────────────────────────────────┼─────────────────────────────────────┐
                │                                     │                                     │
                ▼                                     ▼                                     ▼
        ┌───────────────┐                   ┌──────────────────┐              ┌──────────────────┐
        │   CLOUDFLARE  │                   │  GLOBAL ROUTE 53 │              │   GOOGLE OAUTH   │
        │   SECURITY    │                   │  (Geo-routing)   │              │   (Auth Provider)│
        │               │                   │                  │              │                  │
        │ ✓ DDoS        │                   │ Mumbai → India   │              │ Endpoint:        │
        │ ✓ WAF         │                   │ US → US-East     │              │ accounts.google  │
        │ ✓ Rate Limit  │                   │ EU → EU-West     │              │ .com/oauth2/...  │
        └───────────────┘                   └────────┬─────────┘              └──────────────────┘
                                                     │
┌─────────────────────────────────────────────────────▼──────────────────────────────────────────────┐
│                          EDGE & CDN LAYER (Vercel Edge Network)                                   │
│                                                                                                 │
│  Caching:                                                                                      │
│  ├─ Static Assets: JS, CSS, PNG, SVG → 24h TTL → Cache-Control: public, immutable          │
│  ├─ Pre-compressed: GZIP (JS/CSS), WEBP (Images)                                            │
│  ├─ Geo-distributed: 50 edge locations in India + global                                    │
│  └─ Dynamic requests: Passed through to origin (NOT cached)                                 │
│                                                                                                 │
│  Edge Function (Middleware):                                                                  │
│  ├─ Add security headers (CSP, X-Frame-Options, etc.)                                       │
│  ├─ Redirect http → https                                                                    │
│  └─ Request coalescing (deduplicate concurrent requests)                                    │
│                                                                                                 │
└─────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                              │ 10 ms (edge → origin)
                ┌─────────────────────────────▼─────────────────────────────┐
                │      LOAD BALANCER (AWS ALB - Mumbai Region)              │
                │                                                            │
                │  ├─ SSL Termination (TLS 1.3)                             │
                │  ├─ Active-Active High Availability                       │
                │  ├─ Health Check: /health every 10s                       │
                │  ├─ Algorithm: Least connections                          │
                │  ├─ Sticky Sessions: Disabled (stateless)                 │
                │  └─ Max Connections: 10,000 per server                    │
                │                                                            │
                └─────────────────┬────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────────┐
        │                         │                             │
        ▼                         ▼                             ▼
    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
    │   API       │          │   API       │          │   API       │
    │ Server 1    │          │ Server 2    │          │ Server 3    │
    │ 2vCPU, 4GB  │          │ 2vCPU, 4GB  │          │ 2vCPU, 4GB  │
    └─────────────┘          └─────────────┘          └─────────────┘
    [Auto-scales to 50 servers during peak]
    
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION/BUSINESS LOGIC LAYER                                          │
│                   (FastAPI Services Running on Kubernetes)                                     │
│                                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           API GATEWAY (Kong)                                             │ │
│  │                                                                                          │ │
│  │  Core Responsibilities:                                                                 │ │
│  │  ├─ Request Parsing & Validation (JSON, multipart)                                     │ │
│  │  ├─ JWT Token Verification (RS256 signature check)                                     │ │
│  │  ├─ Rate Limiting (Token bucket: 10 req/min per user)                                 │ │
│  │  ├─ CORS Validation (allowed origins, methods)                                         │ │
│  │  ├─ Request Routing (HTTP method + path → service)                                    │ │
│  │  ├─ Request Logging (timestamp, user_id, latency)                                     │ │
│  │  ├─ Response Compression (gzip)                                                        │ │
│  │  └─ Error Response Normalization                                                       │ │
│  │                                                                                          │ │
│  │  Routes:                                                                                │ │
│  │  ├─ POST   /api/auth/login          → Auth Service                                    │ │
│  │  ├─ POST   /api/chats               → Chat Service                                    │ │
│  │  ├─ POST   /api/documents/upload    → Document Service                                │ │
│  │  ├─ GET    /api/saved-messages      → Chat Service                                    │ │
│  │  ├─ POST   /api/calculate-tax       → Tax Service                                     │ │
│  │  ├─ GET    /api/analytics           → Analytics Service                               │ │
│  │  └─ POST   /api/voice/command       → Voice Service                                   │ │
│  │                                                                                          │ │
│  └──────────┬──────────────────────────────────────────────────────────────────────────────┘ │
│             │                                                                                  │
│    ┌────────┴────────┬─────────────────┬──────────────────┬──────────────────┐               │
│    │                 │                 │                  │                  │               │
│    ▼                 ▼                 ▼                  ▼                  ▼               │
│┌───────────┐   ┌──────────┐  ┌─────────────┐   ┌──────────────┐  ┌──────────────────┐   │
││ AUTH      │   │  CHAT    │  │  RAG        │   │  LLM         │  │  DOCUMENT        │   │
││ SERVICE   │   │  SERVICE │  │  SERVICE    │   │  SERVICE     │  │  SERVICE         │   │
││           │   │          │  │             │   │              │  │                  │   │
││ Routes:   │   │ Routes:  │  │ Routes:     │   │ Routes:      │  │ Routes:          │   │
││ POST /    │   │ POST /   │  │ POST /      │   │ POST /       │  │ POST /upload     │   │
││ login     │   │ messages │  │ retrieve    │   │ complete     │  │ GET  /status     │   │
││ POST /    │   │ GET  /   │  │             │   │              │  │ DELETE /         │   │
││ refresh   │   │ history  │  │ Functions:  │   │ Functions:   │  │                  │   │
││           │   │          │  │ • Vector    │   │ • Prompt     │  │ Functions:       │   │
││ Functions:│   │ Functions│  │   search    │   │   engineer   │  │ • Extract text   │   │
││ • OAuth   │   │ • Memory │  │ • Semantic  │   │ • Streaming  │  │   (PyPDF2)       │   │
││   flow    │   │   mgt    │  │   matching  │   │   response   │  │ • OCR (Tesseract)│   │
││ • JWT     │   │ • Session│  │ • Fetch     │   │ • Fallback   │  │ • Generate       │   │
││   create  │   │   mgmt   │  │   snippets  │   │   (Ollama)   │  │   embeddings     │   │
││ • Token   │   │ • Export │  │             │   │              │  │                  │   │
││   rotate  │   │   chats  │  │             │   │              │  │                  │   │
││           │   │          │  │             │   │              │  │                  │   │
│└───────────┘   └──────────┘  └─────────────┘   └──────────────┘  └──────────────────┘   │
│                                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                    ANALYTICS SERVICE                                                 │ │
│  │                                                                                      │ │
│  │  Functions:                                                                         │ │
│  │  • Consume Kafka events (user-events, query-submitted, voice-commands)            │ │
│  │  • Aggregate metrics (count, sum, average, histogram)                              │ │
│  │  • Write to InfluxDB (time-series metrics)                                         │ │
│  │  • Dashboard API endpoints (real-time metrics)                                     │ │
│  │                                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                             │
│  Deployment:                                                                               │
│  └─ Kubernetes StatefulSet (2-50 replicas based on load)                                 │
│     ├─ Rolling updates (1 replica at a time)                                              │
│     ├─ Resource limits: 2 CPU, 4GB RAM per pod                                            │
│     ├─ Health check: /health endpoint (10s interval)                                      │
│     └─ Restart policy: Always (auto-recovery on crash)                                    │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                │       │       │       │       │
                ┌───────────────┼───────┼───────┼───────┼───────┼───────────────┐
                │               │       │       │       │       │               │
                ▼               ▼       ▼       ▼       ▼       ▼               ▼
        ┌──────────────┐  ┌─────────────────────────────────────┐  ┌──────────────────┐
        │ CACHE LAYER  │  │       MESSAGE QUEUE LAYER           │  │ TASK SCHEDULER   │
        │ (Redis)      │  │        (Apache Kafka)               │  │ (APScheduler)    │
        │              │  │                                     │  │                  │
        │ L1: In-mem   │  │ Topics:                             │  │ Scheduled jobs:  │
        │ ├─ Sessions  │  │ ├─ user-events                      │  │ ├─ Daily backup  │
        │ ├─ Query     │  │ ├─ query-submitted                  │  │ ├─ Cache warmup  │
        │ │  cache     │  │ ├─ document-uploaded                │  │ ├─ Model reload  │
        │ ├─ Embed     │  │ ├─ tax-calculation-tasks            │  │ └─ Cleanup       │
        │ │  cache     │  │ ├─ voice-commands                   │  │    (old files)   │
        │ └─ Rate      │  │ └─ dlq-errors                       │  │                  │
        │   limits     │  │                                     │  │                  │
        │              │  │ Consumers:                          │  └──────────────────┘
        │ L2: Disk     │  │ ├─ Analytics Service                │
        │ Cache        │  │ ├─ Document Indexing Service       │
        │ (JSON)       │  │ ├─ Notification Service            │
        │ ├─ Response  │  │ └─ Error Alerting Service          │
        │   cache      │  │                                     │
        │ ├─ Document  │  │ Partitioning: 5-10 partitions      │
        │   snippets   │  │ per topic                          │
        │ └─ TTL: 24h  │  │ (distribution across brokers)      │
        │              │  │                                     │
        │ Replication: │  │ Retention: 1-30 days               │
        │ 3-node       │  │ depending on topic type             │
        │ cluster      │  │                                     │
        │ (high        │  │ Guarantees:                         │
        │  availability)│  │ ├─ At-least-once delivery          │
        │              │  │ ├─ Topic partitioning (scaling)     │
        │ Latency:     │  │ ├─ Consumer groups (parallel)       │
        │ 4ms (L1)     │  │ └─ Exactly-once semantics (Kafka   │
        │ 50ms (L2)    │  │   Streams)                          │
        │ 500ms (miss) │  │                                     │
        │              │  │ Performance:                        │
        │              │  │ ├─ 1M msgs/day (peak: 1K msgs/sec) │
        │              │  │ ├─ 3 brokers, 5 replicas           │
        │              │  │ └─ Throughput: 100K msgs/sec       │
        │              │  │                                     │
        └──────────────┘  └─────────────────────────────────────┘
                │                                  │
                │                ┌─────────────────┼─────────────────┐
                │                │                 │                 │
                ▼                ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             DATA LAYER (Multi-Database Architecture)                            │
│                                                                                                  │
│  ┌───────────────────────┐  ┌────────────────────────┐  ┌──────────────────────┐            │
│  │  POSTGRESQL (Primary) │  │   CHROMADB             │  │   MONGODB            │            │
│  │  (Relational DB)      │  │   (Vector Database)    │  │   (Document Store)   │            │
│  │                       │  │                        │  │                      │            │
│  │ Replication:          │  │ Collections:           │  │ Collections:         │            │
│  │ ├─ Primary-Replica    │  │ ├─ tax_laws           │  │ ├─ documents         │            │
│  │ │  (3 nodes, HA)      │  │ ├─ schemes            │  │ ├─ user_profiles     │            │
│  │ ├─ Sync replication   │  │ ├─ investments        │  │ ├─ analytics_events  │            │
│  │ │  (strong consistency)│  │ ├─ faq                │  │ └─ chat_exports      │            │
│  │ └─ Auto-failover      │  │ └─ user_documents     │  │                      │            │
│  │   (10 seconds)        │  │                        │  │ TTL Indexes:         │            │
│  │                       │  │ Model: all-MiniLM-    │  │ ├─ Expire old docs    │            │
│  │ Sharding:             │  │ L6-v2 (384 dims,      │  │   after 30 days      │            │
│  │ ├─ by user_id         │  │ ONNX optimized)       │  │ ├─ Clean cache       │            │
│  │ ├─ 10 shard DBs       │  │                        │  │   entries            │            │
│  │ └─ Consistent hashing │  │ Indexing:             │  │ └─ Remove exports    │            │
│  │                       │  │ ├─ HNSW               │  │   after 7 days       │            │
│  │ Tables:               │  │ ├─ 1M+ vectors        │  │                      │            │
│  │ ├─ users              │  │ └─ <50ms latency      │  │ Indexing:            │            │
│  │ ├─ chat_sessions      │  │                        │  │ ├─ Compound indexes  │            │
│  │ ├─ chat_messages      │  │ Replication:          │  │ ├─ Text search       │            │
│  │ ├─ documents          │  │ ├─ 3 nodes            │  │ └─ Tag indexes       │            │
│  │ ├─ saved_messages     │  │ ├─ Backup             │  │                      │            │
│  │ ├─ audit_logs         │  │ │  weekly              │  │ Performance:         │            │
│  │ └─ analytics_events   │  │ └─ Disaster            │  │ ├─ Write: 100ms      │            │
│  │                       │  │    recovery            │  │ └─ Read: 50ms        │            │
│  │ Performance:          │  │                        │  │                      │            │
│  │ ├─ Connections: 100   │  │ Performance:           │  │ Storage: 500GB       │            │
│  │ ├─ QPS: 5K ops/sec    │  │ ├─ QPS: 10K ops/sec   │  │ (text + metadata)    │            │
│  │ ├─ Latency: 100-500ms │  │ ├─ Latency: 50ms      │  │                      │            │
│  │ └─ Storage: 2TB       │  │ └─ Storage: 500GB      │  │                      │            │
│  │                       │  │                        │  │                      │            │
│  └───────────────────────┘  └────────────────────────┘  └──────────────────────┘            │
│                                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────────┐           │
│  │                     INFLUXDB (Time-Series Database)                            │           │
│  │                                                                                │           │
│  │  Measurements:                                                                │           │
│  │  ├─ query_latency (p50, p95, p99 in ms)                                      │           │
│  │  ├─ cache_metrics (hit rate, miss rate, evictions)                           │           │
│  │  ├─ api_errors (count by service, error type)                                │           │
│  │  ├─ active_sessions (concurrent users by region)                             │           │
│  │  └─ database_metrics (connections, queries, CPU)                             │           │
│  │                                                                                │           │
│  │  Retention Policy: 30 days (old metrics auto-deleted)                        │           │
│  │  Replication: 2 nodes (high availability)                                    │           │
│  │  Storage: 100GB (compressed)                                                 │           │
│  │                                                                                │           │
│  └────────────────────────────────────────────────────────────────────────────────┘           │
│                                                                                                  │
│  Backup Strategy:                                                                              │
│  ├─ PostgreSQL: Daily 2AM IST → S3 DEEP_ARCHIVE (30-day retention)                          │
│  ├─ Point-in-time recovery: Binlog replication (7-day retention)                            │
│  ├─ ChromaDB: Weekly collection export → S3                                                  │
│  └─ Disaster Recovery: Multi-region replicas (RTO < 1 hour)                                 │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
        │               │               │                   │
        ▼               ▼               ▼                   ▼
    ┌──────────┐  ┌───────────┐  ┌─────────────┐  ┌──────────────────┐
    │ OBJECT   │  │ MONITORING│  │  EXTERNAL   │  │  NOTIFICATION    │
    │ STORAGE  │  │ & LOGGING │  │  SERVICES   │  │  SERVICES        │
    │ (S3)     │  │           │  │             │  │                  │
    │          │  │ Datadog:  │  │ OpenAI API  │  │ SendGrid (Email) │
    │ Storage: │  │ • Logs    │  │ • GPT-4o    │  │ Twilio (SMS)     │
    │ 10TB+    │  │ • Metrics │  │ • Token: 100K│ │ Push notifications│
    │          │  │ • Traces  │  │   /min      │  │                  │
    │ Buckets: │  │           │  │             │  │ For:             │
    │ • docs   │  │ Sentry:   │  │ Google OAuth│  │ • Export ready   │
    │ • exports│  │ • Errors  │  │ • User auth │  │ • Document ready │
    │ • models │  │ • Issues  │  │             │  │ • Rate limit     │
    │ • backups│  │ • Alerts  │  │ Ollama      │  │   exceeded       │
    │          │  │           │  │ • Fallback  │  │ • Error alerts   │
    │ Lifecycle│  │ Logs:     │  │   LLM       │  │                  │
    │ Policies:│  │ ELK Stack │  │ localhost:  │  └──────────────────┘
    │ • Delete │  │ • Apps    │  │ 11434       │
    │   after  │  │ • Nginx   │  │             │
    │   30d    │  │ • Kafka   │  │             │
    │ • Archive│  │ • Errors  │  │             │
    │   to     │  │           │  │             │
    │   Glacier│  │ Retention:│  │             │
    │          │  │ • Apps:   │  │             │
    │ Encryption│ │   7 days  │  │             │
    │ AES-256  │  │ • Errors: │  │             │
    │ + versio-│  │   30 days │  │             │
    │  ning    │  │ • Audit:  │  │             │
    │          │  │   1 year  │  │             │
    │          │  │           │  │             │
    └──────────┘  └───────────┘  └─────────────┘
```

---

## Data Flow Diagrams

### User Query → Response Flow (Timeline)

```
                         TIME →
T=0ms        T=50ms       T=200ms       T=1250ms      T=14000ms    T=14250ms
│            │             │              │              │             │
▼            ▼             ▼              ▼              ▼             ▼

User Query   CDN/LB        API GW        Cache Check   LLM API       Stream Back
Submitted    Routes to     Validates     Retrieves     Completes     Response
             API Server    JWT           Sources
             (50ms)        (50ms)        (50ms)        (12000ms)     (250ms)
                                         ├─ Cache MISS
             │◄─────────────────────────►│              │◄──────────────────►│
             │   Total Roundtrip         │              │  External API Call │


CACHE HIT PATH (Second Query):
────────────────────────────────
T=0ms        T=50ms       T=100ms
│            │             │
▼            ▼             ▼
User Query   CDN/LB        Cache HIT
Submitted    Routes        Return Result
(50ms)       (50ms)        (4ms)
│◄────────────────────────►│
Total: ~100ms
```

---

## Service Interaction Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         SERVICE INTERACTION DIAGRAM                      │
└──────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────┐
                          │   CLIENT    │
                          │  (Browser)  │
                          └──────┬──────┘
                                 │
                    ┌────────────┼────────────┐
                    │   HTTPS    │    │       │
                    │            │   OAuth   │
                    ▼            │   Login   │
            ┌──────────────┐     ▼           
            │ CDN/Edge     │   ┌──────────────┐
            │ Static Files │   │ Google OAuth │
            │              │   │              │
            │ (JS, CSS,    │   └──────────────┘
            │  Images)     │
            │              │
            └────────┬─────┘
                     │
                     ▼
            ┌──────────────┐
            │ Load Balancer│
            │ (ALB)        │
            └────────┬─────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
      ┌────────┐ ┌────────┐ ┌────────┐
      │ API    │ │ API    │ │ API    │
      │Server 1│ │Server 2│ │Server 3│
      └──┬──┬──┘ └──┬──┬──┘ └──┬──┬──┘
         │  │       │  │       │  │
         │  └──┬────┼──┴───┬───┘  │
         │     │    │      │      │
         ▼     ▼    ▼      ▼      ▼
      ┌────────────────────────────────────────────────┐
      │              API GATEWAY (Kong)                │
      │                                                │
      │ Routing Table:                                 │
      │ /api/auth/*        → Auth Service              │
      │ /api/chats/*       → Chat Service              │
      │ /api/documents/*   → Document Service          │
      │ /api/rag/*         → RAG Service               │
      │ /api/voice/*       → Voice Service             │
      │ /api/analytics/*   → Analytics Service         │
      │                                                │
      └────┬──────────────┬──────────┬────────┬────────┘
           │              │          │        │
      ┌────▼──────┐   ┌───▼──┐   ┌──▼──┐  ┌─▼───┐
      │AUTH       │   │CHAT  │   │RAG  │  │LLM  │
      │SERVICE    │   │SERVICE   │SERVICE   │SERVICE
      │           │   │     │   │      │  │     │
      │ ┌Request  │   │┌────▼──┐ │┌─────┼──┬────┐│
      │ │JWT, OAuth│  ││        │ ││ Semantic   ││
      │ └─────────┬┘  │└───┬────┘ │ Search     ││
      │           │   │    │      └────┬───────┘│
      │           │   │    │           │        │
      │           │   │    └─────┬─────┴────┐   │
      │           │   │          │          │   │
      │ ┌─────────┘   │    ┌─────▼──────┬──▼──┐│
      │ │             │    │ Document   │ LLM ││
      │ │             │    │ Retrieval  │ API ││
      │ │             │    └─────┬──────┴─────┘│
      │ │             │          │             │
      │ └─────┬───────┘          │             │
      │       │    ┌─────────────┼─────────────┤
      │       │    │             │             │
      │       ▼    ▼             ▼             ▼
      │    ┌────────────────────────────────────┐
      │    │       REDIS CACHE CLUSTER          │
      │    │                                    │
      │    │ L1: Hot data (sessions, queries)  │
      │    │ L2: Disk backups                  │
      │    │ TTL: 1h-24h                       │
      │    │                                    │
      │    └────┬───────────┬────────────────────┘
      │         │           │
      │    ┌────▼───┐   ┌───▼──────┐
      │    │PostgreSQL  MongoDB    │
      │    │  (ACID)    (Flexible) │
      │    │    │           │      │
      │    └────┼───────────┼──────┘
      │         │           │
      │    ┌────▼───────────▼──────┐
      │    │     ChromaDB Vector   │
      │    │   Database (HNSW)     │
      │    │   384-dim Embeddings  │
      │    └───────────┬───────────┘
      │                │
      │         ┌──────▼──────┐
      │         │ InfluxDB    │
      │         │ (Metrics)   │
      │         └─────────────┘
      │
      │ ┌─────────────────────────────────────┐
      │ │  KAFKA (Message Queue)              │
      │ │                                     │
      │ │ Topics:                             │
      │ │ ├─ user-events                      │
      │ │ ├─ query-submitted                  │
      │ │ ├─ document-uploaded                │
      │ │ ├─ tax-calculation-tasks            │
      │ │ ├─ voice-commands                   │
      │ │ └─ dlq-errors                       │
      │ │                                     │
      │ └──┬──────────────────────────────────┘
      │    │
      │    ├──────────┬──────────┬─────────────┐
      │    │          │          │             │
      │    ▼          ▼          ▼             ▼
      │  Analytics   Indexing   Email       Error
      │  Service     Service    Service     Alerting
      │             (Async)
      │
      └─────────────┬────────────────────────────┐
                    │                            │
                    ▼                            ▼
              ┌──────────┐               ┌───────────┐
              │ AWS S3   │               │ Datadog   │
              │ Storage  │               │ Monitoring│
              │ (Docs,   │               │           │
              │ Backups) │               └───────────┘
              └──────────┘
```

---

## Request Lifecycle Sequence Diagram

```
USER                CDN          ALB           API-GW         SERVICES       CACHE/DB
 │                  │             │              │              │              │
 ├─ HTTPS Request ──┤             │              │              │              │
 │ (Query: "Tax")   │             │              │              │              │
 │                  ├─ Route ─────┤              │              │              │
 │                  │             ├─ Forward ───┤              │              │
 │                  │             │             ├─ Parse JWT──┤              │
 │                  │             │             │             │              │
 │                  │             │             ├─ Rate Limit─┤              │
 │                  │             │             │             │              │
 │                  │             │             ├─ Route ─────────────────┤  │
 │                  │             │             │             │ Chat Svc  │  │
 │                  │             │             │             ├─ Check Cache─┤
 │                  │             │             │             │          (4ms)
 │                  │             │             │             │ ❌ MISS    │
 │                  │             │             │             │             │
 │                  │             │             │             ├─ RAG Search ├─┤
 │                  │             │             │             │             │ │
 │                  │             │             │             │       Vector  │
 │                  │             │             │             │       Search  │
 │                  │             │             │             │       (50ms)  │
 │                  │             │             │             │◄─────────────┘
 │                  │             │             │             │             │
 │                  │             │             │             ├─ Fetch Docs─┤
 │                  │             │             │             │             │
 │                  │             │             │             │    MongoDB  │
 │                  │             │             │             │   (100ms)   │
 │                  │             │             │             │◄────────────┘
 │                  │             │             │             │             │
 │                  │             │             │             ├─ LLM API ──┤
 │                  │             │             │             │             │
 │                  │             │             │             │    OpenAI  │
 │                  │             │             │             │  (12000ms) │
 │                  │             │             │             │◄───────────┘
 │                  │             │             │             │             │
 │                  │             │             │             ├─ Cache Set─┤
 │                  │             │             │             │             │
 │                  │             │             │             │    Redis   │
 │                  │             │             │             │   (10ms)   │
 │                  │             │             │             │◄────────────┘
 │                  │             │             │             │             │
 │                  │             │             │◄─ Stream ───┤             │
 │                  │             │◄─ Compress ┤             │             │
 │                  │◄─ Send Gzip ┤            │             │             │
 │◄─ Response ──────┤ (1250ms)    │             │             │             │
 │ (Browser shows)  │             │             │             │             │
 │ "Processing...  │             │             │             │             │
 │  Complete ✓"     │             │             │             │             │
 │                  │             │             │             │             │
```

---

## Failure Scenarios & Recovery

```
SCENARIO 1: API Server Crashes
──────────────────────────────
Healthy: [S1] [S2] [S3]  → LB routes
         [S1] [X2] [S3]  → LB detects health check failure
         [S1] [X2] [S3]  → Drain connections (30 seconds)
         [S1] [  ] [S3]  → Remove from rotation
         [S1] [NEW S4] [S3]  → Auto-scale adds new replica (2 minutes)
         
Impact: Zero (other servers handle traffic)

─────────────────────────────────────────────

SCENARIO 2: Cache Layer (Redis) Dies
──────────────────────────────────────
Request comes in:
├─ Check L1 Cache: FAIL (Redis down)
├─ Check L2 Cache: Database reads JSON
├─ Database query: 200-500ms (slower but working)
├─ Redis restarts automatically
├─ New requests: Back to 4ms latency
└─ Impact: 2-5 second degradation, then recovery

─────────────────────────────────────────────

SCENARIO 3: Primary Database Fails
──────────────────────────────────
Primary goes down:
├─ Monitoring detects (10 seconds)
├─ pg_auto_failover promotes Replica 1
├─ Applications reconnect via DNS alias
├─ Replica 2 syncs from new Primary
├─ Replication lag: < 1 minute
└─ Impact: < 1 minute RTO, < 1 min data loss

─────────────────────────────────────────────

SCENARIO 4: Vector DB Search Slow
──────────────────────────────────
Query takes 500ms instead of 50ms:
├─ Concurrent requests spike
├─ RAG Service queue backs up
├─ Request timeout: 30 seconds
├─ Client receives fallback: "Cached response"
├─ Admin alerted via PagerDuty
├─ Root cause: HNSW index corruption
├─ Fix: Rebuild index (off-peak)
└─ Impact: Degraded results temporarily

─────────────────────────────────────────────

SCENARIO 5: LLM API Rate Limited
─────────────────────────────────
OpenAI returns 429 (Too Many Requests):
├─ LLM Service catches error
├─ Exponential backoff: wait 5 seconds
├─ Retry up to 3 times
├─ If still failing: Fallback to local Ollama
├─ User gets slower response (Ollama latency: +5s)
├─ Queue for batch processing later
└─ Impact: Higher latency, degraded quality

─────────────────────────────────────────────

SCENARIO 6: Kafka Broker Dies
──────────────────────────────
Broker failure in Kafka cluster:
├─ 3-replica topic survives (data on other brokers)
├─ Producer retries automatically
├─ Consumer groups rebalance (30 seconds)
├─ Analytics service catches up
├─ No data loss (3 replicas)
└─ Impact: Slight latency spike (< 30 seconds)
```

---

## Scalability Timeline

```
GROWTH PHASES & SCALING DECISIONS

┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Startup (MVP)                    [Current State]               │
├─────────────────────────────────────────────────────────────────────────┤
│ Daily Active Users: 10K - 100K                                          │
│                                                                          │
│ Architecture:                                                            │
│ ├─ Monolithic: Single API server pool (3 instances)                    │
│ ├─ Database: PostgreSQL (primary + 2 replicas)                         │
│ ├─ Cache: Redis (10GB, single node)                                    │
│ ├─ Vector DB: ChromaDB (embedded or single instance)                   │
│ └─ CDN: Basic caching                                                   │
│                                                                          │
│ Operations:                                                              │
│ ├─ Manual deployments (small team)                                      │
│ ├─ Basic monitoring (CloudWatch)                                        │
│ ├─ Single region (Mumbai)                                               │
│ └─ Downtime: Weekly maintenance (1-2 hours)                            │
│                                                                          │
│ Cost: ~$5K-10K/month                                                    │
│                                                                          │
│ Limits: Database query latency (bottleneck)                            │
└─────────────────────────────────────────────────────────────────────────┘

                                  ▼
                                SCALE UP
                                  │
                                  │ Add Load Balancer
                                  │ Increase Cache
                                  │ Database indexing
                                  │ CDN optimization
                                  ▼

┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Growth (Scale-out)              [1-6 months in]                │
├─────────────────────────────────────────────────────────────────────────┤
│ Daily Active Users: 100K - 1M                                           │
│                                                                          │
│ Scaling Actions:                                                         │
│ ├─ Microservices: Split Chat, RAG, LLM services                        │
│ ├─ Database: Introduce sharding (10 shards)                            │
│ ├─ Cache: Redis Cluster (100GB, 5 nodes)                               │
│ ├─ Vector DB: Partitioned ChromaDB (5 collections)                     │
│ ├─ Message Queue: Kafka setup for async processing                     │
│ ├─ Multiple regions: Mumbai + US-East + EU                             │
│ └─ CDN: Vercel Edge Network expansion                                   │
│                                                                          │
│ Operations:                                                              │
│ ├─ Infrastructure as Code (Terraform)                                  │
│ ├─ Advanced monitoring (Datadog)                                        │
│ ├─ Automated deployments (GitHub Actions + Kubernetes)                │
│ ├─ 99.9% SLA (3+ replicas for HA)                                      │
│ └─ Incident response: On-call rotation                                  │
│                                                                          │
│ Cost: ~$50K-100K/month                                                  │
│                                                                          │
│ Limits: Cross-region latency, data consistency                         │
└─────────────────────────────────────────────────────────────────────────┘

                                  ▼
                                SCALE UP
                                  │
                                  │ Database federation
                                  │ Event sourcing
                                  │ CQRS pattern
                                  │ Multi-region replication
                                  ▼

┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Enterprise (Scale-massive)      [6-18 months in]               │
├─────────────────────────────────────────────────────────────────────────┤
│ Daily Active Users: 1M - 10M                                            │
│                                                                          │
│ Architecture Changes:                                                    │
│ ├─ Full microservices (10+ services)                                   │
│ ├─ Database federation: Regional databases                             │
│ ├─ Event sourcing: Immutable event log for consistency                 │
│ ├─ CQRS: Separate read/write models                                    │
│ ├─ Vector DB: Distributed ChromaDB (10+ nodes)                        │
│ ├─ 5+ regions globally                                                 │
│ ├─ Advanced caching (multi-layer, predictive)                         │
│ └─ GraphQL layer (API aggregation)                                     │
│                                                                          │
│ Operations:                                                              │
│ ├─ Platform Engineering team                                            │
│ ├─ Advanced observability (Datadog Enterprise)                          │
│ ├─ Machine Learning (predict failures, optimize resources)             │
│ ├─ 99.99% SLA (< 1 hour downtime/year)                                │
│ ├─ Chaos engineering (test failure scenarios)                          │
│ └─ Global incident management (PagerDuty Enterprise)                   │
│                                                                          │
│ Cost: ~$500K-2M/month                                                   │
│                                                                          │
│ Features:                                                                │
│ ├─ Real-time personalization                                            │
│ ├─ ML-based fraud detection                                             │
│ ├─ Predictive caching                                                   │
│ └─ Advanced analytics                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack Evolution

```
TIMELINE OF TECH CHOICES

Year 1 (Startup):
├─ Frontend: React + TypeScript (familiar, productive)
├─ Backend: Node.js/Express (single language, fast)
├─ Database: PostgreSQL (standard choice)
├─ Cache: Redis (proven solution)
├─ Deployment: Docker + Docker Compose (simple)
└─ Cost: 30 AWS EC2 instances + RDS + ElastiCache

Year 1-2 (Growth):
├─ Separate Backend: FastAPI + Python (scientific computing, AI-friendly)
├─ Vector DB: ChromaDB (built for ML/RAG)
├─ Message Queue: Kafka (high throughput)
├─ Orchestration: Kubernetes (auto-scaling)
├─ Monitoring: Datadog (comprehensive)
└─ Cost: Kubernetes cluster (50-100 pods) + managed databases

Year 2+ (Scale):
├─ Add: GraphQL layer (complex queries)
├─ Add: gRPC (service-to-service, low latency)
├─ Add: Rust microservices (performance-critical)
├─ Add: ClickHouse (analytics at scale)
├─ Add: CockroachDB (multi-region ACID)
└─ Cost: Complex multi-region setup (millions/month)
```

---

**Diagram Version**: 1.0  
**Last Updated**: May 10, 2025  
**Suitable for**: System Design Interviews, Architecture Reviews, Onboarding
