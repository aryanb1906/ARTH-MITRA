# 🏗️ ARTH-MITRA: Complete System Design Document

## Executive Summary
This document provides a comprehensive, interview-level system design for **Arth-Mitra**, an AI-powered financial assistant tailored for Indian users. The architecture is designed to scale to millions of daily users while maintaining sub-2-second response times and 99.9% availability.

---

## 1. 📋 REQUIREMENTS ANALYSIS

### 1.1 Functional Requirements

| Requirement | Details |
|---|---|
| **User Authentication** | OAuth2/Google Sign-in, JWT token management, session persistence |
| **AI Chat Interface** | Real-time streaming responses with RAG (Retrieval Augmented Generation) |
| **Voice Copilot** | Speech-to-text, text-to-speech, 13 voice commands, trilingual support (EN/HI/Hinglish) |
| **Tax Calculator** | Interactive tax computation with old vs new regime comparison, deduction support |
| **Document Upload** | PDF/image parsing, semantic indexing, document-scoped querying |
| **Scheme Finder** | Government scheme recommendations based on user profile |
| **Chat Export** | HTML/PDF export with metadata and source attribution |
| **Analytics Dashboard** | Real-time metrics tracking, user insights, query analytics |
| **Saved Messages** | Bookmarking, tagging, notes, pinning functionality |
| **Multi-turn Conversation** | Memory management (last 20 turns, 30-min TTL) |

### 1.2 Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Response Latency** | < 2 seconds (p95: < 5 seconds) |
| **Availability** | 99.9% uptime (SLA: 4 hours downtime/month) |
| **Throughput** | 10,000+ concurrent users, 100K daily active users |
| **Storage** | Multi-terabyte vector DB + document storage |
| **Data Consistency** | Strong consistency for financial data, eventual consistency for analytics |
| **Security** | HTTPS, JWT, rate limiting (10 req/min), prompt injection protection |
| **Search Latency** | Vector search: < 50ms, Metadata search: < 100ms |
| **Cache Hit Rate** | Target: 70%+ (L1: in-memory, L2: disk) |

### 1.3 Scalability Requirements

- **Horizontal Scaling**: Stateless API servers behind load balancer
- **Database**: Sharding by user_id for chat sessions, partitioning for analytics
- **Vector DB**: Distributed ChromaDB with replica sets
- **Cache**: Redis Cluster for distributed caching
- **Message Queue**: Kafka for async processing (tax calculations, document indexing)
- **Multi-Region**: Geo-distributed deployment in India + global edge

### 1.4 Availability Requirements

- **99.9% SLA** with automatic failover
- **Database Replication**: 3-node replicas for HA
- **API Gateway**: Active-active load balancing
- **Circuit Breaker**: Graceful degradation when services fail
- **Health Checks**: Every 10 seconds, automated recovery

### 1.5 Security Considerations

| Layer | Controls |
|---|---|
| **Transport** | TLS 1.3, HTTPS enforced |
| **Authentication** | OAuth2, JWT with RS256 signing |
| **Authorization** | RBAC (admin, user, analyst roles) |
| **Input Validation** | 5-pattern prompt injection detection, 1000-char input cap |
| **API Security** | Rate limiting (10 req/min), CORS, CSRF tokens |
| **Database** | Encryption at rest (AES-256), parameterized queries |
| **Financial Data** | PCI DSS compliance (no credit card storage), audit logs |

### 1.6 Latency Expectations

```
ACCEPTABLE LATENCY BUDGET:
├── Frontend → CDN: 50ms (India)
├── DNS Resolution: 10ms
├── API Gateway: 5ms
├── Load Balancer: 2ms
├── Service Processing: 500ms (50% from cache, 1500ms from DB)
├── Vector Search: 50ms
├── LLM Inference: 8-12 seconds (external API)
├── Network Round Trip: 100ms
└── TOTAL: 1,000-2,000ms (acceptable)
```

---

## 2. 🏛️ HIGH-LEVEL ARCHITECTURE

### 2.1 Complete Request Flow

```
CLIENT BROWSER (India)
    ↓
DNS (Route 53 / CloudFlare)
    ↓
CDN (CloudFront / Vercel Edge Network)
    ↓
Load Balancer (Application Load Balancer)
    ↓
API Gateway (Rate limiting, Auth validation, Request routing)
    ↓
Application Services (Node.js/Next.js Frontend Gateway)
    ↓
Microservices Layer:
├── Auth Service (JWT validation, OAuth)
├── Chat Service (Query processing, streaming)
├── RAG Service (Vector search, retrieval)
├── LLM Service (Prompt orchestration)
└── Analytics Service (Event tracking)
    ↓
Cache Layer (Redis Cluster)
├── L1: In-memory LRU (hot data)
└── L2: Disk JSON (24h TTL)
    ↓
Data Layer:
├── Vector DB (ChromaDB - embeddings)
├── Relational DB (PostgreSQL - transactions)
├── Document Store (MongoDB - flexible schema)
└── Time-Series DB (InfluxDB - analytics)
    ↓
Object Storage (S3 / Google Cloud Storage)
    ↓
Response Back to Client
```

### 2.2 Architecture Decision: Microservices vs Monolith

**Decision**: **Hybrid Microservices** (Modular Monolith → Microservices)

**Rationale**:
- **Initial Phase**: Monolith with clear service boundaries (faster to deploy, easier to manage)
- **Growth Phase**: Separate critical services (Chat, RAG, LLM) as microservices
- **Scale Phase**: Full microservices with independent databases

**Services Breakdown**:
1. **API Gateway** (Node.js) - Request routing, rate limiting, auth
2. **Chat Service** (Python FastAPI) - Conversation management
3. **RAG Service** (Python FastAPI) - Vector search, document retrieval
4. **LLM Service** (Python FastAPI) - Prompt engineering, streaming
5. **Auth Service** (Node.js Express) - JWT, OAuth, sessions
6. **Analytics Service** (Python) - Event aggregation, dashboards
7. **Document Service** (Python) - File upload, parsing, indexing
8. **Voice Service** (Python) - STT/TTS coordination

### 2.3 CDN & Edge Strategy

**Why CDN?**
- **Static Assets**: 10ms delivery of JS/CSS/images from 50+ edge locations in India
- **Geographic Distribution**: Reduced latency for Indian users across states
- **Bandwidth Savings**: 60-70% reduction in origin traffic
- **DDoS Protection**: Cloudflare/Vercel edge security

**Implementation**:
```
Frontend Assets (JS/CSS/Images) → Vercel Edge CDN → India regions
API Responses → Not cached (dynamic)
Vector Search Results → Redis (in-memory cache) → 4ms response
```

### 2.4 Authentication Flow

```
User Login (Google OAuth2):
1. User clicks "Sign in with Google"
2. Google Auth → Authorization Code
3. Backend exchanges code for ID Token + Refresh Token
4. JWT created with user_id + role claims
5. Refresh Token stored in HttpOnly Cookie
6. Access Token (15-min TTL) in localStorage
7. All subsequent requests: Authorization: Bearer {JWT}
8. Token validation at API Gateway (10ms)
9. Automatic refresh when expired (5-min before expiry)
```

### 2.5 API Gateway Purpose

The API Gateway serves as the **single entry point** for all client requests:

| Function | Detail |
|---|---|
| **Request Routing** | Route /api/chat → Chat Service, /api/rag → RAG Service |
| **Rate Limiting** | 10 requests/min per user (token bucket algorithm) |
| **Authentication** | Verify JWT signature, check token expiry |
| **Authorization** | Check user roles before route access |
| **Request Logging** | Log all requests for audit/analytics |
| **Response Transformation** | Normalize response formats |
| **Circuit Breaking** | Fail fast if downstream service is down |
| **Compression** | Gzip responses > 1KB |

---

## 3. 🎨 COMPLETE SYSTEM DESIGN DIAGRAM

### 3.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER                                  │
│                     (React/Next.js, Browser)                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Chat UI | Voice Copilot | Tax Calculator | Dashboard | Documents│   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       EDGE & CDN LAYER                                   │
│           (Vercel Edge / CloudFront / Cloudflare Workers)               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Static Assets: .js, .css, .png, .svg (cached, 24h TTL)         │   │
│  │ Geo-routing to nearest India data center                        │   │
│  │ DDoS protection & request filtering                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      LOAD BALANCER LAYER                                 │
│              (AWS Application Load Balancer or Nginx)                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Active-Active configuration                                     │   │
│  │ Health checks every 10s (drains unhealthy instances)           │   │
│  │ SSL termination (TLS 1.3)                                       │   │
│  │ Sticky sessions for streaming (if needed)                       │   │
│  │ Distribution: Round-robin, Least connections                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER                                    │
│          (Kong / AWS API Gateway / Custom Node.js Express)              │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐          │
│  │  Auth Guard  │  Rate Limit  │   Logging    │  Routing     │          │
│  │ (JWT valid)  │ (10 req/min) │  (audit log) │  (to services)         │
│  └──────────────┴──────────────┴──────────────┴──────────────┘          │
│  Response Compression | CORS | Request validation                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                   APPLICATION SERVICES LAYER                             │
│                  (Deployed on Kubernetes / Container Service)           │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │
│  │  Chat       │  │  RAG        │  │  LLM        │                    │
│  │  Service    │  │  Service    │  │  Service    │                    │
│  │             │  │             │  │             │                    │
│  │ - Streaming │  │ - Vector    │  │ - Prompt    │                    │
│  │ - Memory    │  │   search    │  │   engineer  │                    │
│  │ - History   │  │ - Document  │  │ - Streaming │                    │
│  │ - Export    │  │   retrieve  │  │ - Fallback  │                    │
│  └─────────────┘  └─────────────┘  └─────────────┘                    │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │
│  │  Auth       │  │  Analytics  │  │  Document   │                    │
│  │  Service    │  │  Service    │  │  Service    │                    │
│  │             │  │             │  │             │                    │
│  │ - OAuth     │  │ - Events    │  │ - Upload    │                    │
│  │ - JWT       │  │ - Metrics   │  │ - Parse     │                    │
│  │ - Sessions  │  │ - Dashboard │  │ - Index     │                    │
│  └─────────────┘  └─────────────┘  └─────────────┘                    │
│                                                                          │
│  Horizontal Scaling: Auto-scale 2-50 replicas based on CPU/Memory     │
│  Health Checks: /health endpoint, memory usage, request latency         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       CACHE LAYER                                        │
│                      (Redis Cluster)                                    │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ L1: In-Memory LRU Cache (Redis)                              │       │
│  │ ├─ Hot Queries (last 10K unique queries): 4ms latency       │       │
│  │ ├─ User Sessions: 1-hour TTL                                │       │
│  │ ├─ Vector embeddings cache: 24h TTL                         │       │
│  │ └─ Rate limit counters: 1-min window                        │       │
│  │                                                              │       │
│  │ L2: Disk Cache (Local JSON)                                 │       │
│  │ ├─ Response cache: 24h TTL                                  │       │
│  │ ├─ Document snippets: 7d TTL                                │       │
│  │ └─ Fallback when Redis is unavailable                       │       │
│  │                                                              │       │
│  │ Cache Keys:                                                 │       │
│  │ - query:{hash}:{user_id} → Response                         │       │
│  │ - embedding:{doc_id} → Vector                               │       │
│  │ - session:{jwt_kid} → User context                          │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                          │
│  Cache Strategy:                                                        │
│  └─ Write-through: Always update cache + DB                           │
│  └─ Invalidation: TTL + explicit bust on data update                  │
│  └─ Warm-up: Pre-load 15 common queries at startup                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                                       │
│                  (Multi-Database Strategy)                              │
│                                                                          │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐         │
│  │  VECTOR DB          │  │  RELATIONAL DB (PostgreSQL)      │         │
│  │  (ChromaDB)         │  │                                  │         │
│  │                     │  │  ├─ users (OAuth, preferences)  │         │
│  │ ├─ Collections:     │  │  ├─ chat_sessions                │         │
│  │ │  ├─ tax_laws     │  │  ├─ messages                      │         │
│  │ │  ├─ schemes      │  │  ├─ documents                     │         │
│  │ │  ├─ investments  │  │  ├─ analytics_events              │         │
│  │ │  └─ faq          │  │  ├─ saved_messages                │         │
│  │                     │  │  └─ audit_logs                    │         │
│  │ ├─ Model:          │  │                                  │         │
│  │ │  all-MiniLM-L6  │  │  Replication: 3-node HA           │         │
│  │ │  (384 dims)      │  │  Backup: Daily snapshots          │         │
│  │                     │  │  Sharding: by user_id            │         │
│  │ ├─ Indexing:      │  │  Partitioning: monthly (large)   │         │
│  │ │  Hnsw (1M+)     │  │                                  │         │
│  │ │  10K ops/s      │  │                                  │         │
│  │ └─ Latency: 50ms   │  │                                  │         │
│  └─────────────────────┘  └──────────────────────────────────┘         │
│                                                                          │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐        │
│  │  DOCUMENT STORE (NoSQL)  │  │  TIME-SERIES DB (InfluxDB)   │        │
│  │  (MongoDB)               │  │                              │        │
│  │                          │  │ Metrics:                     │        │
│  │ ├─ documents collection  │  │ ├─ query_latency             │        │
│  │ ├─ cache retention       │  │ ├─ cache_hit_rate            │        │
│  │ ├─ user_profiles         │  │ ├─ api_errors                │        │
│  │ ├─ Flexible schema       │  │ ├─ active_users              │        │
│  │ ├─ TTL indexes           │  │ └─ concurrent_sessions       │        │
│  │ └─ 100ms latency         │  │                              │        │
│  │    for updates           │  │ Retention: 30 days           │        │
│  └──────────────────────────┘  └──────────────────────────────┘        │
│                                                                          │
│  Backup Strategy:                                                       │
│  └─ PostgreSQL: Daily snapshots → S3 (30-day retention)               │
│  └─ ChromaDB: Backup collections weekly                               │
│  └─ Point-in-time recovery: 7 days                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    OBJECT STORAGE LAYER                                 │
│                  (AWS S3 / Google Cloud Storage)                        │
│                                                                          │
│  ├─ Uploaded Documents (PDF, images)                                   │
│  │  └─ Storage class: Intelligent-Tiering                              │
│  │  └─ Encryption: AES-256 at rest                                     │
│  │  └─ Retention: User-defined + 30-day automatic purge                │
│  │                                                                      │
│  ├─ Exported Chats (HTML, PDF)                                         │
│  │  └─ TTL: 7 days (auto-delete)                                       │
│  │  └─ ACL: Private (user can sign presigned URLs)                     │
│  │                                                                      │
│  ├─ Model Checkpoints (ONNX embeddings)                                │
│  │  └─ Versioned for rollback                                          │
│  │  └─ Immutable (content-hash named)                                  │
│  │                                                                      │
│  └─ Analytics Backups (daily)                                          │
│     └─ Glacier Deep Archive (1-year retention)                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                   MESSAGE QUEUE / EVENT STREAMING                        │
│                         (Apache Kafka)                                  │
│                                                                          │
│  Topics:                                                                │
│  ├─ user-events (signups, logins) [1-day retention]                    │
│  ├─ query-submitted (every chat query) [7-day retention]               │
│  ├─ document-uploaded (file events) [30-day retention]                 │
│  ├─ tax-calculation-tasks (async processing)                           │
│  ├─ voice-commands (voice copilot events)                              │
│  └─ error-logs (service exceptions) [7-day retention]                  │
│                                                                          │
│  Consumers:                                                             │
│  ├─ Analytics Service → InfluxDB (real-time aggregation)               │
│  ├─ Document Indexing Service → ChromaDB (vector embedding)            │
│  ├─ Tax Calculation Service → PostgreSQL (results stored)              │
│  ├─ Notification Service → Email/SMS delivery                          │
│  └─ Error Alerting Service → PagerDuty (on critical errors)            │
│                                                                          │
│  Guarantees: At-least-once delivery, consumer groups for scaling       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│              EXTERNAL SERVICES & INTEGRATIONS                            │
│                                                                          │
│  ├─ LLM Provider (OpenAI / Anthropic)                                  │
│  │  └─ Streaming API: 8-12 second latency                              │
│  │  └─ Rate limit: 100K tokens/min                                     │
│  │  └─ Fallback: Ollama local (gemma3:1b)                              │
│  │                                                                      │
│  ├─ OAuth Provider (Google)                                            │
│  │  └─ Sign-in, token refresh                                          │
│  │  └─ ~100ms latency                                                  │
│  │                                                                      │
│  ├─ TTS/STT Services                                                   │
│  │  ├─ Client-side: Web Speech API (offline)                           │
│  │  └─ Server-side: OpenAI TTS (fallback)                              │
│  │                                                                      │
│  └─ Email Service (SendGrid / AWS SES)                                 │
│     └─ Chat exports, notifications                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│               MONITORING & OBSERVABILITY LAYER                           │
│                                                                          │
│  ├─ Logging: ELK Stack / Datadog (all requests, errors, queries)      │
│  ├─ Metrics: Prometheus + Grafana (latency, throughput, cache hits)   │
│  ├─ Tracing: Jaeger (request lifecycle across services)                │
│  ├─ Error Tracking: Sentry (exception aggregation)                     │
│  ├─ Alerting: PagerDuty (on p95 latency > 5s, error rate > 1%)        │
│  ├─ Health: Custom /health endpoints (every service)                   │
│  └─ Synthetic Monitoring: Uptime robot (1-min checks)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Rationale

| Component | Why It's Needed | Alternative Considered |
|---|---|---|
| **CDN** | Reduce latency for static assets, DDoS protection | Serving directly from origin (too slow) |
| **Load Balancer** | Distribute traffic, HA, SSL termination | Single server (not scalable, single point of failure) |
| **API Gateway** | Rate limiting, auth, routing, logging | Direct service calls (security, monitoring gaps) |
| **Microservices** | Independent scaling, fault isolation | Monolith (tight coupling, harder to scale) |
| **Redis Cache** | In-memory access, sub-millisecond lookups | Database queries (too slow, high I/O) |
| **Vector DB** | Semantic search for RAG, <50ms latency | Elasticsearch (not optimized for vectors) |
| **PostgreSQL** | ACID compliance, complex queries, relationships | NoSQL only (harder to join data) |
| **Kafka** | Async processing, decoupling, high throughput | Direct API calls (synchronous bottleneck) |
| **S3** | Scalable file storage, versioning, backup | Local disk (limited capacity, no HA) |

---

## 4. 🗄️ DATABASE DESIGN

### 4.1 Database Selection

**Decision: Polyglot Persistence (Multi-Database)**

**Why Not Just SQL?**
- ❌ NoSQL alone: Hard to enforce consistency, complex transactions
- ❌ SQL alone: Poor vector search performance, document flexibility
- ✅ Polyglot: Use the right tool for each use case

| Use Case | Database | Reason |
|---|---|---|
| User profiles, chat history, audit logs | **PostgreSQL** | ACID, strong consistency, complex joins |
| Embeddings, vector search | **ChromaDB** | Optimized for semantic similarity, <50ms |
| Documents, flexible schema | **MongoDB** | Flexible schema, TTL indexes, fast writes |
| Analytics, time-series metrics | **InfluxDB** | Optimized for high-cardinality time-series |
| Cache, sessions, rate limits | **Redis** | Sub-millisecond access, in-memory |

### 4.2 PostgreSQL Schema Design

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    profile_picture_url TEXT,
    age_group VARCHAR(50),
    income_range VARCHAR(50),
    preferences JSONB, -- Language, theme, notification settings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat Sessions Table
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    topic VARCHAR(100), -- "tax", "investment", "scheme", "general"
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

-- Chat Messages Table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- "user" or "assistant"
    content TEXT NOT NULL,
    tokens_used INT,
    sources JSONB, -- [{title, url, snippet, document_id}]
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    s3_path TEXT, -- "s3://bucket/user_id/doc_id"
    document_hash VARCHAR(64), -- SHA256 for dedup
    is_indexed BOOLEAN DEFAULT FALSE,
    indexed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_document_hash ON documents(document_hash);

-- Saved Messages Table
CREATE TABLE saved_messages (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    tags VARCHAR(50)[], -- ["important", "investment", "tax"]
    notes TEXT,
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_saved_messages_user_id ON saved_messages(user_id);

-- Audit Log Table
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    action VARCHAR(100), -- "query_submitted", "document_uploaded", "export"
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### 4.3 ChromaDB (Vector Database)

**Collections**:
```python
# Collection for tax laws & regulations
collection_tax_laws = client.create_collection(
    name="tax_laws",
    metadata={"description": "Indian tax regulations, deductions, exemptions"}
)

# Collection for government schemes
collection_schemes = client.create_collection(
    name="government_schemes",
    metadata={"hnsw:space": "cosine"}  # Cosine similarity for semantic matching
)

# Collection for investment guides
collection_investments = client.create_collection(
    name="investment_guides",
    metadata={"description": "Stocks, bonds, ETFs, gold, real estate"}
)

# Collection for user documents (private, scoped to user)
collection_user_docs = client.create_collection(
    name="user_documents",
    metadata={"type": "user-specific", "retention_days": 30}
)

# Example: Storing embeddings
collection_tax_laws.add(
    ids=["doc_001", "doc_002"],
    embeddings=[[0.1, 0.2, ...], [0.3, 0.4, ...]],  # 384-dim vectors
    documents=[
        "Section 80C allows deduction for life insurance premiums...",
        "NPS contributions are tax-deductible under section 80CCD..."
    ],
    metadatas=[
        {"source": "tax_guide", "category": "deductions", "fiscal_year": "2025-26"},
        {"source": "nps_guide", "category": "retirement", "fiscal_year": "2025-26"}
    ]
)
```

**Indexing Strategy**:
- **HNSW (Hierarchical Navigable Small World)**: Fast approximate nearest neighbor search
- **Metric**: Cosine similarity for semantic vectors
- **Index Size**: 1M+ embeddings with <50ms query latency
- **Replication**: 3-node cluster for HA

### 4.4 MongoDB Schema (Document Store)

```javascript
// Documents Collection
db.documents.insertOne({
    _id: ObjectId("..."),
    user_id: UUID("..."),
    filename: "tax_return_2024.pdf",
    content_preview: "First 5000 chars of extracted text...",
    metadata: {
        uploaded_at: ISODate("2025-05-10"),
        file_size: 2048576,
        pages: 12,
        language: "en",
        has_images: false
    },
    tags: ["personal", "important"],
    ttl_delete_at: ISODate("2025-06-10"), // 30-day auto-delete
    s3_path: "s3://bucket/user_id/doc_id"
});

// Create TTL index for auto-deletion
db.documents.createIndex({ ttl_delete_at: 1 }, { expireAfterSeconds: 0 })

// Analytics Events Collection (time-series optimized)
db.analytics_events.insertMany([
    {
        timestamp: ISODate("2025-05-10T10:30:00Z"),
        user_id: UUID("..."),
        event_type: "query_submitted",
        query_length: 150,
        response_latency_ms: 1500,
        cache_hit: false,
        topic: "tax",
        metadata: { voice_enabled: false }
    }
]);

// Create index on timestamp for time-range queries
db.analytics_events.createIndex({ timestamp: 1 })
```

### 4.5 InfluxDB Schema (Time-Series Metrics)

```
# Query Latency
measurement: query_latency
tags: service=chat_service, endpoint=/api/query, region=ap-south-1
fields: latency_ms=1250, cache_hit=true, tokens_used=500
timestamp: 2025-05-10T10:30:00Z

# Cache Performance
measurement: cache_metrics
tags: cache_layer=L1, cache_type=redis, region=ap-south-1
fields: hit_rate=0.75, miss_rate=0.25, evictions=100, size_mb=512
timestamp: 2025-05-10T10:30:00Z

# API Errors
measurement: api_errors
tags: service=lm_service, error_type=timeout, region=ap-south-1
fields: count=5, last_error_code=500
timestamp: 2025-05-10T10:30:00Z

# Active Users
measurement: active_sessions
tags: region=ap-south-1, platform=web
fields: count=12500
timestamp: 2025-05-10T10:30:00Z
```

### 4.6 Indexing Strategy

**PostgreSQL**:
```sql
-- Indexing Strategy
CREATE INDEX idx_messages_session_user_created 
ON chat_messages(session_id, created_at DESC); -- For pagination

CREATE INDEX idx_users_email ON users(email);  -- For login lookup

CREATE INDEX idx_audit_logs_composite 
ON audit_logs(user_id, created_at DESC);  -- For audit queries

-- Partial Index for optimization
CREATE INDEX idx_chat_messages_recent 
ON chat_messages(session_id) WHERE created_at > NOW() - INTERVAL '7 days';
```

**ChromaDB**:
- **HNSW**-indexed at collection level
- **Metadata filtering** on category, source, fiscal_year
- **Approximate NN** with 95% recall, 50ms latency

### 4.7 Read-Heavy vs Write-Heavy Handling

| Scenario | Optimization |
|---|---|
| **Chat History Queries (Read-Heavy)** | Pagination (offset/limit), L1 cache, materialized view of top 100 recent chats |
| **Analytics Events (Write-Heavy)** | Batch inserts (Kafka → consumer batches 1000 events), InfluxDB time-series optimization |
| **Vector Search (Read-Heavy)** | HNSW indexing, caching top 100 queries, approximate NN |
| **User Profile Updates (Mixed)** | Redis write-through cache, eventual consistency for analytics |

### 4.8 Replication & Failover

**PostgreSQL Replication** (3-node HA):
```
PRIMARY (Read + Write)
    ↓
REPLICA 1 (Read-only, synchronous)
    ↓
REPLICA 2 (Read-only, asynchronous)

Failover: Primary dies → REPLICA 1 promoted automatically (pg_auto_failover)
```

**ChromaDB Replication**:
- 3 nodes in Kubernetes StatefulSet
- Data replicated across nodes
- Automatic recovery on node failure

### 4.9 Sharding & Partitioning

**PostgreSQL Sharding by user_id**:
```
Shard 1: user_id % 3 == 0 → Shard DB 1
Shard 2: user_id % 3 == 1 → Shard DB 2
Shard 3: user_id % 3 == 2 → Shard DB 3

Router (application layer) determines shard before querying
```

**Table Partitioning by date** (for large tables):
```sql
-- Partition chat_messages monthly
CREATE TABLE chat_messages_2025_05 PARTITION OF chat_messages
FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
```

### 4.10 CAP Theorem Considerations

| Scenario | Priority | Decision |
|---|---|---|
| **User Authentication** | Consistency > Availability | Strong consistency (single source of truth) |
| **Chat History** | Consistency > Availability | ACID transactions |
| **Analytics Events** | Availability > Consistency | Eventual consistency (async processing) |
| **Cache** | Availability > Consistency | Write-through + TTL (stale data acceptable) |
| **Document Retrieval** | Consistency > Availability | Immediate reflection after upload |

---

## 5. 💾 CACHING STRATEGY

### 5.1 Multi-Layer Cache Architecture

```
                    REQUEST
                        ↓
                 [BROWSER CACHE]
                 (Static assets, 24h)
                        ↓
                   [CDN CACHE]
                   (JS/CSS, 24h)
                        ↓
                 [L1 IN-MEMORY CACHE]
                    (Redis)
                        ↓
                 [L2 DISK CACHE]
                  (Local JSON)
                        ↓
                 [DATABASE]
               (Latency: 100-500ms)
```

### 5.2 Redis Caching Strategy

**Cache Keys Structure**:
```
query:{query_hash}:{user_id} = {response_json}           [TTL: 24h]
embedding:{doc_id} = {vector}                            [TTL: 24h]
session:{jwt_kid} = {user_context}                       [TTL: 1h]
ratelimit:{user_id}:{minute} = {request_count}           [TTL: 60s]
user_profile:{user_id} = {profile_json}                  [TTL: 1h]
```

**Cache Warm-Up (Startup)**:
```python
# Pre-load 15 most common queries at server startup
COMMON_QUERIES = [
    "What are the tax deductions for salary income?",
    "How does GST work?",
    "Investment options for NRI?",
    # ... 12 more
]

for query in COMMON_QUERIES:
    response = rag_service.retrieve(query)
    redis.set(f"query:{hash(query)}:warmup", response, ex=86400)
```

### 5.3 Server-Side Cache Invalidation

**TTL-based** (Automatic):
- Query responses: 24 hours
- User sessions: 1 hour
- Embeddings: 24 hours
- Rate limits: 1 minute

**Event-based** (Explicit):
```python
# When user uploads a new document
async def on_document_uploaded(doc_id):
    await redis.delete(f"user_docs:{doc.user_id}")  # Invalidate list
    await kafka.publish("document-indexed", {doc_id})

# When tax laws are updated
async def on_tax_laws_updated():
    await redis.delete_pattern("query:*tax*")  # Wildcard invalidation
```

### 5.4 CDN Caching

**Static Assets**:
```
JS/CSS/Images → Vercel CDN → 24h TTL → 50 edge locations in India
Cache-Control: public, max-age=86400, immutable
```

**NOT Cached**:
```
/api/chat → Not cacheable (user-specific, dynamic)
/api/query → Cache by query hash + user_id (done in Redis)
```

### 5.5 Session Storage

**JWT + Refresh Token Pattern**:
```
Access Token (15 min TTL):
- localStorage (vulnerable to XSS, fast)
- Payload: {user_id, role, exp}
- Signed with RS256 (public key verification)

Refresh Token (7 day TTL):
- HttpOnly cookie (secure against XSS)
- Stored in Redis: refresh_token:{jti} = {user_id}
- Rotated on each use (refresh token rotation)
```

### 5.6 Hot Data Optimization

**Identify Hot Data**:
```python
# Monitor cache hits via Prometheus
- Cache hit rate per query: target > 70%
- Hot 1% of queries account for 50% of traffic
- Cache these aggressively

# Example: Tax calculation results
- Same query by 100 users → Cache after first calculation
- Invalidate only on law changes (rare)
- 95% cache hit rate
```

### 5.7 Cache Metrics

```
Cache Hit Rate Calculation:
hit_rate = cache_hits / (cache_hits + cache_misses)

Target: 70% overall
- L1 (Redis): 85% hit rate
- L2 (Disk): 15% hit rate (from L1 misses)
- Database: 0-5% (L2 misses)

Latency Impact:
- Cache hit: 4ms
- L2 hit: 50ms
- Database hit: 200-500ms
- Savings: 50-100x faster
```

---

## 6. 📦 STORAGE DESIGN

### 6.1 Object Storage Architecture

**AWS S3 Bucket Structure**:
```
s3://arth-mitra-storage/
├── documents/
│   └── {user_id}/{doc_id}
│       ├── original.pdf
│       ├── preview.png
│       └── metadata.json
├── exports/
│   └── {user_id}/{export_id}
│       ├── {timestamp}_chat.html
│       ├── {timestamp}_chat.pdf
│       └── manifest.json
├── models/
│   └── embeddings/
│       ├── all-MiniLM-L6-v2/
│       │   ├── model.onnx
│       │   ├── tokenizer.json
│       │   └── version.txt
└── backups/
    ├── postgresql/
    │   └── 2025-05-10_full_backup.sql.gz
    └── chromadb/
        └── 2025-05-10_collections.tar.gz
```

### 6.2 File Handling Strategy

**Upload Flow**:
```
User selects PDF/image
    ↓
Client validates: size < 10MB, MIME type allowed
    ↓
POST /api/documents/upload
    ├─ Auth check
    ├─ Virus scan (ClamAV)
    └─ S3 upload with presigned URL
        ↓
Document Service processes:
├─ Extract text (PyPDF2, Tesseract OCR)
├─ Generate embeddings (ONNX model)
├─ Store in ChromaDB
└─ Kafka event: "document-indexed"
    ↓
User notified: "Ready for search"
```

**Download/Export Flow**:
```
User requests export
    ↓
POST /api/chats/{session_id}/export
    ├─ Auth check
    ├─ Render HTML/PDF (Puppeteer)
    ├─ Upload to S3 with TTL (7 days)
    └─ Generate presigned URL (1-hour expiry)
        ↓
Response: { download_url, expires_at }
    ↓
Client downloads → Browser auto-deletes after 7 days
```

### 6.3 Pre-signed URLs

**Why Pre-signed URLs?**
- ✅ No credential sharing
- ✅ Time-limited access
- ✅ Bandwidth optimization (direct S3 → Client)
- ✅ Audit logging

**Implementation**:
```python
import boto3
from datetime import timedelta

s3 = boto3.client('s3')

# Generate URL valid for 1 hour
presigned_url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'arth-mitra-storage', 'Key': f'documents/{user_id}/{doc_id}'},
    ExpiresIn=3600  # 1 hour
)
# Output: https://arth-mitra-storage.s3.amazonaws.com/...?X-Amz-Signature=...
```

### 6.4 Compression Strategy

| File Type | Compression | Ratio | Latency |
|---|---|---|---|
| **PDF (text)** | gzip | 3:1 | Fast |
| **JSON exports** | gzip | 5:1 | Fast |
| **Images (PNG)** | WebP | 2:1 | Medium |
| **ONNX models** | tar.gz | 2:1 | OK |
| **Backups** | gzip + encryption | 3:1 | Offline |

### 6.5 Backup Strategy

**PostgreSQL Backups**:
```bash
# Daily full backup at 2 AM IST
pg_dump -U postgres arth_mitra | gzip > backup_$(date +%Y%m%d).sql.gz

# Upload to S3 Glacier (cold storage)
aws s3 cp backup_*.sql.gz s3://arth-mitra-backups/postgresql/ \
    --storage-class DEEP_ARCHIVE \
    --metadata "retention=30days"

# Retention: 30 days, weekly snapshots
# RTO (Recovery Time Objective): 4 hours
# RPO (Recovery Point Objective): 1 day (one backup per day)
```

**ChromaDB Backups**:
```bash
# Weekly collection snapshots
python -c "
import chromadb
client = chromadb.HttpClient(host='chromadb-primary')
for collection in client.list_collections():
    collection.export('/backups/chromadb/{}.tar.gz')
"
```

**Point-in-Time Recovery**:
- PostgreSQL: 7-day binlog retention
- Restore to any point in last 7 days (5-minute granularity)

---

## 7. ⚖️ LOAD BALANCING & SCALING

### 7.1 Horizontal Scaling Strategy

**Application Servers**:
```
Load Balancer (ALB)
    ├─ API Server 1 (2 vCPU, 4GB RAM)
    ├─ API Server 2 (2 vCPU, 4GB RAM)
    ├─ API Server 3 (2 vCPU, 4GB RAM)
    └─ [Auto-scale to 50 servers at peak]

Health Check:
- Endpoint: /health
- Interval: 10 seconds
- Timeout: 5 seconds
- Unhealthy threshold: 3 failures → Drain & remove
```

**Auto-Scaling Metrics**:
```
Scale UP when:
- CPU > 70% for 2 minutes
- Memory > 75% for 2 minutes
- Request latency p95 > 3 seconds
- Active connections > threshold

Scale DOWN when:
- CPU < 30% for 5 minutes
- No new requests for 2 minutes

Min replicas: 2 (HA)
Max replicas: 50
Cooldown: 5 minutes between scale events
```

### 7.2 Vertical Scaling

**When to use**:
- Database (more CPU for complex queries)
- Cache (more memory for hit rate)
- LLM service (better GPU for inference)

**Limitations**:
- Single point of failure
- Downtime during scaling
- Cost increases superlinearly

**Decision**: Prefer horizontal scaling for stateless services.

### 7.3 Stateless Server Design

**Why Stateless?**:
- Any server can handle any request
- Easy to scale horizontally
- No session affinity needed
- Easier failover

**Implementation**:
```python
# ❌ BAD: Server-side session state
app.py:
session_store = {}  # In-memory storage

@app.route('/chat')
def chat():
    user_session = session_store[user_id]  # What if this server dies?

# ✅ GOOD: Stateless with external session store
@app.route('/chat')
async def chat():
    token = request.headers['Authorization']
    user_session = await redis.get(f"session:{token}")  # Can use any server
```

### 7.4 Auto-Scaling Configuration

**Kubernetes Horizontal Pod Autoscaler**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 2
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100  # Double replicas
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50  # Halve replicas
        periodSeconds: 60
```

### 7.5 Traffic Distribution Strategies

| Algorithm | Use Case | Pros | Cons |
|---|---|---|---|
| **Round-robin** | Default | Simple, even distribution | Doesn't account for server load |
| **Least connections** | Long-lived requests | Adaptive | Overkill for short requests |
| **IP hash** | Sticky sessions | Consistent routing | Session affinity anti-pattern |
| **Weighted** | Mixed instance types | Proportional to capacity | Requires manual config |

**Recommendation**: Least connections (with /health monitoring).

### 7.6 Multi-Region Deployment

**Architecture**:
```
┌─────────────────────────────────────────────────────────┐
│                   Global Load Balancer                   │
│              (AWS Route 53 / Cloudflare)                │
│  Geo-routing: India users → Mumbai region               │
│  Global users → Nearest region (auto-failover)          │
└─────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
    INDIA (Primary)    US-EAST (DR)      EU-WEST (DR)
    Mumbai Region      Virginia           Frankfurt
    ├─ API Servers     ├─ API Servers     ├─ API Servers
    ├─ PostgreSQL      ├─ PostgreSQL      ├─ PostgreSQL
    │  (Primary)       │  (Replica)       │  (Replica)
    ├─ Redis Cluster   ├─ Redis Cluster   ├─ Redis Cluster
    ├─ ChromaDB        ├─ ChromaDB        ├─ ChromaDB
    └─ Kafka Broker    └─ Kafka Broker    └─ Kafka Broker

Data Replication:
- PostgreSQL: Streaming replication (synchronous to US, async to EU)
- ChromaDB: Collection sync every 6 hours
- Kafka: Topic replication across regions (3 replicas)
```

### 7.7 Failover Strategy

**Application Failover**:
```
Healthy server dies:
1. Health check fails 3x → Load balancer removes from pool (instantly)
2. New requests → Distributed to remaining healthy servers
3. Auto-scaler adds new replica (within 2 minutes)
4. Impact: Zero (redundancy via HA)
```

**Database Failover**:
```
PostgreSQL Primary dies:
1. Monitoring detects failure (10 seconds)
2. REPLICA 1 promoted to PRIMARY automatically (pg_auto_failover)
3. Applications reconnect (using DNS alias)
4. Impact: < 1 minute RTO

Alternative: Multi-master (Postgres BDR):
- Both masters active, stronger consistency
- Higher latency, more complex
```

**Region Failover**:
```
Mumbai region goes down:
1. Global LB detects all health checks failing
2. Route 53 switches traffic to US-EAST region
3. Users auto-routed (DNS TTL: 60 seconds)
4. Data: Already replicated (recovery from backup)
5. Impact: < 2 minutes RTO, potential stale data
```

---

## 8. 📨 MESSAGE QUEUES / EVENT-DRIVEN DESIGN

### 8.1 Pub/Sub Architecture

**Why Message Queues?**
- ✅ Async processing (fast user response)
- ✅ Decoupling (services independent)
- ✅ Scalability (separate consumer pools)
- ✅ Reliability (retry + dead-letter handling)

### 8.2 Kafka Topics

```
Topic: user-events
├─ Partitions: 3 (distributed across brokers)
├─ Retention: 1 day (7 GB)
├─ Schema: {user_id, event_type, timestamp, metadata}
├─ Consumers:
│  ├─ Analytics Service (aggregates to InfluxDB)
│  └─ Email Service (sends welcome email)
└─ Example:
   {
     "user_id": "uuid-123",
     "event_type": "signup",
     "timestamp": "2025-05-10T10:30:00Z",
     "metadata": {"source": "mobile", "referrer": "google"}
   }

Topic: query-submitted
├─ Partitions: 10 (high throughput)
├─ Retention: 7 days (100 GB)
├─ Schema: {user_id, query, latency_ms, cache_hit, topic}
├─ Consumers:
│  ├─ Analytics Service (real-time metrics)
│  ├─ Search Improvement Service (query analysis)
│  └─ Error Alerting Service (on high latency)
└─ Example:
   {
     "user_id": "uuid-456",
     "query": "How do I invest in ELSS funds?",
     "latency_ms": 1250,
     "cache_hit": false,
     "topic": "investment"
   }

Topic: document-uploaded
├─ Partitions: 5
├─ Retention: 30 days
├─ Consumers:
│  ├─ Document Indexing Service (extracts text, generates embeddings)
│  ├─ Virus Scanning Service (ClamAV scan)
│  └─ Notification Service (user: "Document ready")
└─ Example:
   {
     "document_id": "uuid-789",
     "user_id": "uuid-456",
     "filename": "tax_return.pdf",
     "file_size": 2048576,
     "timestamp": "2025-05-10T10:30:00Z"
   }

Topic: tax-calculation-tasks
├─ Partitions: 5
├─ Retention: 30 days
├─ Consumers: Tax Calculation Service (computes old vs new regime)
└─ Example:
   {
     "task_id": "uuid-task-1",
     "user_id": "uuid-456",
     "gross_income": 1500000,
     "deductions": {...},
     "age_group": "45-60"
   }

Topic: voice-commands
├─ Partitions: 3
├─ Retention: 7 days
├─ Consumers:
│  ├─ Analytics Service (usage patterns)
│  └─ Voice Service (optimization)
└─ Example:
   {
     "user_id": "uuid-456",
     "command": "read_page",
     "language": "hi",
     "timestamp": "2025-05-10T10:30:00Z"
   }

Topic: dlq-errors (Dead Letter Queue)
├─ Partitions: 3
├─ Retention: 30 days
├─ Messages that failed after 3 retries
├─ Manual intervention required
└─ Example:
   {
     "original_topic": "document-uploaded",
     "message": {...},
     "error": "Virus detected",
     "retry_count": 3
   }
```

### 8.3 Async Processing Example

**Scenario**: User uploads a document

```python
# HTTP Request (Fast response)
@app.post("/api/documents/upload")
async def upload_document(file: UploadFile):
    doc_id = generate_uuid()
    
    # 1. Quick S3 upload
    s3_path = await s3_client.upload_file(file, f"documents/{user_id}/{doc_id}")
    
    # 2. Publish to Kafka (non-blocking, < 10ms)
    await kafka_producer.send_and_forget("document-uploaded", {
        "document_id": doc_id,
        "user_id": user_id,
        "filename": file.filename,
        "file_size": file.size,
        "s3_path": s3_path
    })
    
    # 3. Respond immediately
    return {"document_id": doc_id, "status": "processing"}

# Async Consumer (Background)
class DocumentIndexingService:
    async def process_document(self, message):
        try:
            # Extract text from PDF
            text = await extract_pdf_text(s3_path)
            
            # Virus scan
            is_safe = await virus_scan(s3_path)
            if not is_safe:
                await kafka_producer.send("dlq-errors", {...})
                return
            
            # Generate embeddings
            embeddings = await embedding_model.encode(text)
            
            # Store in ChromaDB
            await chromadb.add_documents(
                ids=[doc_id],
                embeddings=[embeddings],
                metadatas=[{"user_id": user_id, "filename": file.filename}]
            )
            
            # Update DB: mark as indexed
            await db.update_document(doc_id, {"is_indexed": True})
            
            # Notify user
            await notification_service.send_email(user_id, "Document indexed and ready for search")
        
        except Exception as e:
            # Retry up to 3 times, then DLQ
            if message.retry_count < 3:
                await kafka_producer.send("document-uploaded", message, delay=60)  # Retry after 1 min
            else:
                await kafka_producer.send("dlq-errors", {**message, "error": str(e)})
```

### 8.4 Retry Mechanisms

**Exponential Backoff**:
```python
RETRY_CONFIG = {
    "max_retries": 3,
    "initial_delay": 1,     # seconds
    "backoff_multiplier": 2,
    "max_delay": 300        # 5 minutes
}

# Retry 1: after 1 second
# Retry 2: after 2 seconds
# Retry 3: after 4 seconds
# Final: Dead Letter Queue
```

**Circuit Breaker**:
```python
@circuit_breaker(failure_threshold=5, timeout=60)
async def call_external_lm_api():
    # If 5 failures in 60 seconds, circuit opens
    # New requests immediately fail (fast fail)
    # After 60 seconds, try again (graceful recovery)
    response = await lm_api.query(prompt)
    return response
```

### 8.5 Dead Letter Queue Handling

```python
# DLQ Consumer (Manual intervention)
async def process_dlq_message(message):
    # Log for visibility
    logger.error(f"DLQ Message: {message}")
    
    # Alert admin
    await send_pagerduty_alert({
        "severity": "warning",
        "title": f"DLQ: {message['original_topic']}",
        "description": message['error']
    })
    
    # Store for later analysis
    await db.insert_dlq_log({
        "message_id": message.get("id"),
        "topic": message["original_topic"],
        "error": message["error"],
        "created_at": datetime.now()
    })
    
    # Manual retry (via admin dashboard)
    # or automatic cleanup after 30 days
```

---

## 9. 🔌 API DESIGN

### 9.1 REST API Endpoints

**Authentication**:
```
POST /api/auth/login
Request:
{
  "provider": "google",
  "authorization_code": "4/0Adx..."
}

Response (200):
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 900,
  "user": {
    "id": "uuid-123",
    "email": "user@example.com",
    "name": "Aryan Bhardwaj"
  }
}
```

**Chat**:
```
POST /api/chats
Request:
{
  "session_id": "uuid-456",
  "message": "How do I calculate my taxes?"
}

Response (200, Streaming):
{
  "id": "msg-789",
  "role": "assistant",
  "content": "To calculate your taxes, ...", // Streamed in chunks
  "sources": [
    {
      "title": "Income Tax Calculation Guide",
      "url": "https://...",
      "snippet": "Section 80...",
      "document_id": "doc-123"
    }
  ],
  "metadata": {
    "latency_ms": 1250,
    "tokens_used": 450,
    "cache_hit": false
  }
}

Stream Example (SSE):
data: {"content": "To", "done": false}
data: {"content": " calculate", "done": false}
data: {"content": " your", "done": false}
...
data: {"done": true, "sources": [...]}
```

**Document Upload**:
```
POST /api/documents/upload
Request: multipart/form-data
{
  "file": <binary PDF>,
  "category": "tax_return"  // optional
}

Response (201):
{
  "document_id": "doc-123",
  "filename": "tax_return.pdf",
  "status": "processing",
  "message": "Document received. Indexing in progress..."
}
```

**Saved Messages**:
```
POST /api/messages/{message_id}/save
Request:
{
  "tags": ["important", "investment"],
  "notes": "This explained ELSS perfectly"
}

Response (201):
{
  "saved_message_id": "saved-456",
  "message_id": "msg-789",
  "tags": ["important", "investment"],
  "created_at": "2025-05-10T10:30:00Z"
}

GET /api/saved-messages
Response (200):
{
  "items": [
    {
      "saved_message_id": "saved-456",
      "message": {...},
      "tags": ["important"],
      "created_at": "2025-05-10T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 45
  }
}
```

### 9.2 Status Codes & Error Handling

| Code | Meaning | Scenario |
|---|---|---|
| **200 OK** | Success | Query returned results |
| **201 Created** | Created | Document uploaded, message saved |
| **204 No Content** | Success | Delete operation successful |
| **400 Bad Request** | User error | Invalid input, malformed JSON |
| **401 Unauthorized** | Auth missing | No JWT token provided |
| **403 Forbidden** | Auth failed | JWT invalid or expired |
| **404 Not Found** | Not found | Session doesn't exist |
| **429 Too Many Requests** | Rate limited | > 10 requests/min |
| **500 Internal Server Error** | Server error | Unexpected exception |
| **503 Service Unavailable** | Degradation | Database down, fallback to cached response |

**Error Response Format**:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded 10 requests per minute. Try again in 45 seconds.",
    "retry_after": 45
  }
}
```

### 9.3 Pagination

**Cursor-based (Recommended for large datasets)**:
```
GET /api/chats/{session_id}/messages?cursor=msg-789&limit=20

Response:
{
  "items": [{...}, {...}],
  "pagination": {
    "cursor": "msg-456",  // Next cursor
    "has_more": true,
    "limit": 20
  }
}
```

**Offset-based** (OK for small datasets):
```
GET /api/saved-messages?page=1&page_size=20

Response:
{
  "items": [{...}],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 150,
    "pages": 8
  }
}
```

### 9.4 Rate Limiting

**Per-User Rate Limit** (10 requests/min):
```
Request Headers:
Authorization: Bearer eyJhbGc...

Response Headers (429):
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1715337060  # Unix timestamp
```

**Implementation** (Token Bucket):
```python
class RateLimiter:
    def __init__(self, rate=10, window=60):  # 10 req/min
        self.rate = rate
        self.window = window
    
    async def check_limit(self, user_id):
        key = f"ratelimit:{user_id}:{int(time.time() // self.window)}"
        
        # Increment counter
        count = await redis.incr(key)
        
        # Set TTL on first request in window
        if count == 1:
            await redis.expire(key, self.window)
        
        # Check against limit
        if count > self.rate:
            raise RateLimitError(f"Rate limit exceeded. Reset at {timestamp}")
        
        return count
```

### 9.5 REST vs GraphQL Comparison

| Aspect | REST | GraphQL |
|---|---|---|
| **Learning curve** | Easy (CRUD operations) | Steeper (query language) |
| **Over-fetching** | Common (extra fields returned) | Eliminated (request specific fields) |
| **Under-fetching** | Possible (multiple requests needed) | Eliminated (single query) |
| **Caching** | HTTP cache, straightforward | Harder (POST, custom logic) |
| **Real-time** | Polling or WebSocket | Subscriptions built-in |
| **Recommendation** | ✅ Use for ARTH-MITRA (simple, cacheable APIs) | For complex, multi-resource queries |

**Decision**: **REST for now** (simpler, better CDN caching), migrate to GraphQL if needed later.

---

## 10. 🔒 SECURITY

### 10.1 Authentication (OAuth2 + JWT)

**OAuth2 Flow**:
```
1. User clicks "Sign in with Google"
2. App redirects to: https://accounts.google.com/o/oauth2/v2/auth?client_id=...
3. Google authenticates user
4. Google redirects back with authorization_code: /callback?code=4/0Adx...
5. Backend exchanges code for ID token (server-to-server, secure)
6. Backend creates JWT and sets refresh token in HttpOnly cookie
7. User is logged in
```

**JWT Structure**:
```
Header:
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "2024-key-1"  // Key ID for rotation
}

Payload:
{
  "user_id": "uuid-123",
  "email": "user@example.com",
  "role": "user",  // Can be "admin", "analyst"
  "iat": 1715337000,
  "exp": 1715337900,  // 15 minutes
  "iss": "arth-mitra",
  "sub": "user-123"
}

Signature:
RS256(header + payload, private_key)
```

**Token Refresh**:
```python
@app.post("/api/auth/refresh")
async def refresh_token():
    # Get refresh token from HttpOnly cookie
    refresh_token = request.cookies.get("refresh_token")
    
    # Validate refresh token
    claims = jwt.decode(refresh_token, public_key)
    
    # Generate new access token
    new_access_token = create_jwt(claims, expires_in=900)
    
    # Rotate refresh token (optional but recommended)
    new_refresh_token = create_jwt(claims, expires_in=604800)  # 7 days
    
    # Set in HttpOnly cookie
    response.set_cookie("refresh_token", new_refresh_token, http_only=True, secure=True)
    
    return {"access_token": new_access_token}
```

### 10.2 Authorization (RBAC)

**Roles**:
```
User:
- Read own profile
- Create/read/update own chats
- Upload/delete own documents
- Cannot modify others' data

Admin:
- All user permissions
- Access audit logs
- Manage user accounts
- View analytics dashboard

Analyst:
- Read analytics
- Cannot modify user data
```

**Implementation**:
```python
@app.get("/api/chats/{session_id}")
@require_auth
async def get_chat_session(session_id):
    user = current_user  # From JWT
    session = await db.get_chat_session(session_id)
    
    # Check authorization
    if session.user_id != user.id and user.role != "admin":
        raise ForbiddenError("You don't have access to this session")
    
    return session
```

### 10.3 API Security

**HTTPS/TLS**:
- TLS 1.3 enforced
- Certificate pinning for mobile apps (optional)
- HSTS header: `Strict-Transport-Security: max-age=31536000`

**CORS**:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://arth-mitra.vercel.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization"],
)
```

**CSRF Protection**:
```python
# Double-submit cookie pattern
@app.post("/api/chats")
async def submit_chat(request: ChatRequest):
    # For state-changing operations, verify CSRF token
    csrf_token = request.headers.get("X-CSRF-Token")
    cookie_token = request.cookies.get("csrf_token")
    
    if csrf_token != cookie_token:
        raise UnauthorizedError("CSRF token mismatch")
```

### 10.4 Prompt Injection Protection

**5 Regex Patterns**:
```python
INJECTION_PATTERNS = [
    r"(ignore|disregard|forget).*previous",  # "Ignore previous instructions"
    r"system\s*:\s*",                         # "System: "
    r"(execute|run|eval|import).*code",       # Code execution attempts
    r"select.*from.*where",                   # SQL injection
    r"<script|javascript:",                   # XSS attempts
]

def detect_injection(user_input):
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, user_input, re.IGNORECASE):
            raise SecurityError("Suspicious input detected")

@app.post("/api/chats")
async def submit_chat(request: ChatRequest):
    detect_injection(request.message)  # Check before processing
```

**Input Validation**:
- Max length: 1000 characters
- Allowed characters: alphanumeric + common punctuation
- No special regex characters

### 10.5 Data Protection

**Encryption at Rest**:
```
PostgreSQL: AES-256 encryption (AWS RDS with encrypted snapshots)
MongoDB: AES-256 encryption (AWS DocumentDB)
S3: Default AES-256, versioning enabled
```

**Encryption in Transit**:
```
All traffic: TLS 1.3
Kafka inter-broker: SSL
Database connections: SSL required
```

**Secrets Management**:
```
API Keys, Database passwords → AWS Secrets Manager
Rotation: Every 90 days
Access: Only services that need it (RBAC)
Audit log: All access logged
```

### 10.6 SQL Injection Prevention

**Parameterized Queries**:
```python
# ❌ VULNERABLE
query = f"SELECT * FROM users WHERE email = '{user_email}'"
result = db.execute(query)

# ✅ SAFE
query = "SELECT * FROM users WHERE email = %s"
result = db.execute(query, (user_email,))
```

### 10.7 XSS/CSRF Prevention

**XSS**:
- Content Security Policy: `Content-Security-Policy: default-src 'self'; script-src 'self'`
- Escape user input in templates
- No `innerHTML` in frontend (use `textContent`)

**CSRF**:
- Double-submit cookie (see above)
- SameSite cookie attribute: `Set-Cookie: session=...; SameSite=Strict`

### 10.8 Compliance

**PCI DSS** (Payment Card Industry):
- ✅ We don't store credit cards (no PCI scope)
- ✅ Audit logs for financial data access

**GDPR** (EU users):
- Right to deletion: User → request → anonymize all personal data
- Data portability: Export chat history in standard format
- Consent: Explicit opt-in for marketing emails

---

## 11. 📊 MONITORING & OBSERVABILITY

### 11.1 Logging

**ELK Stack** (Elasticsearch + Logstash + Kibana):

```python
import logging
from pythonjsonlogger import jsonlogger

# Structured logging (JSON)
logger = logging.getLogger()
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)

# Example: Logging a query event
logger.info("Query submitted", extra={
    "user_id": "uuid-123",
    "query": "How to invest in ELSS?",
    "session_id": "session-456",
    "latency_ms": 1250,
    "cache_hit": False,
    "token_count": 450,
    "timestamp": datetime.now().isoformat()
})
```

**Log Retention**:
- Application logs: 30 days
- Error logs: 90 days
- Audit logs: 1 year
- Debug logs: 7 days

### 11.2 Metrics

**Prometheus** (Time-series metrics):

```
# Query latency (histogram)
http_request_duration_seconds_bucket{service="chat_service", le="0.5"} 1000
http_request_duration_seconds_bucket{service="chat_service", le="1"} 5000
http_request_duration_seconds_bucket{service="chat_service", le="2"} 9500
http_request_duration_seconds_bucket{service="chat_service", le="+Inf"} 10000

# Cache hit rate (gauge)
cache_hit_rate{cache_layer="L1", region="ap-south-1"} 0.85

# Active sessions (gauge)
active_sessions{region="ap-south-1"} 12500

# API errors (counter)
http_errors_total{service="lm_service", status="500"} 5
```

**Key Metrics**:
- API latency (p50, p95, p99)
- Cache hit rate
- Error rate
- Throughput (requests/sec)
- Database connection pool usage
- Memory usage
- Disk I/O

### 11.3 Distributed Tracing

**Jaeger** (Request lifecycle):

```
Request: User submits "How to calculate taxes?"
  ├─ API Gateway (50ms)
  │  ├─ JWT validation (5ms)
  │  ├─ Rate limit check (2ms)
  │  └─ Routing (3ms)
  │
  ├─ Chat Service (100ms)
  │  ├─ Session lookup (50ms)
  │  └─ Message insertion (50ms)
  │
  ├─ RAG Service (1000ms)
  │  ├─ Vector search (50ms)
  │  └─ Document retrieval (100ms)
  │
  ├─ LLM Service (8000ms)
  │  └─ OpenAI API call (8000ms)
  │
  └─ Response & Streaming (100ms)

Total: 9,250ms (user sees ~2s due to streaming)
```

### 11.4 Error Monitoring

**Sentry** (Exception tracking):

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    "https://xyz@o123.ingest.sentry.io/456",
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,  # Sample 10% of transactions
    error_sample_rate=1.0,   # Capture all errors
)

# Automatic error tracking
try:
    result = await llm_service.query(prompt)
except Exception as e:
    sentry_sdk.capture_exception(e)
    # Also includes context: user_id, request, stack trace
```

**Error Dashboard**:
```
Errors in last 24 hours:
1. "Timeout calling OpenAI API" (12 occurrences)
2. "ChromaDB connection refused" (3 occurrences)
3. "PDF parsing error: Invalid format" (8 occurrences)
```

### 11.5 Health Checks

**Service Health Endpoints**:

```python
@app.get("/health")
async def health_check():
    checks = {
        "database": await check_database(),
        "cache": await check_redis(),
        "vector_db": await check_chromadb(),
        "external_api": await check_llm_api(),
    }
    
    overall = "healthy" if all(checks.values()) else "degraded"
    
    return {
        "status": overall,
        "checks": checks,
        "timestamp": datetime.now().isoformat(),
        "version": "1.2.3"
    }
```

**Load Balancer uses this**:
- Check every 10 seconds
- Healthy: HTTP 200
- Unhealthy: HTTP 503 → Remove from pool

### 11.6 Alerting

**PagerDuty** (On-call escalation):

```
Alert: p95 latency > 5 seconds
├─ Severity: Warning
├─ Trigger: Alert fires
├─ Action: Notification to on-call engineer (Slack, email, SMS)
├─ Remediation: Auto-scale services (if configured)
└─ Escalation: If not acknowledged in 15 minutes, escalate to manager

Alert: Error rate > 1%
├─ Severity: Critical
├─ Trigger: Alert fires
├─ Action: Page on-call engineer
├─ Remediation: Rollback deployment / switch to fallback
```

---

## 12. 🚨 BOTTLENECKS & OPTIMIZATIONS

### 12.1 Potential Bottlenecks

| Bottleneck | Impact | Solution |
|---|---|---|
| **LLM API Latency** | 8-12s per response | Caching, prompt optimization, local fallback |
| **Vector Search** | 50ms per query | HNSW indexing, pre-warming, caching |
| **Database Queries** | 100-500ms | Indexing, query optimization, read replicas |
| **Cache Misses** | 10-50ms extra latency | Increase cache size, warm-up, TTL tuning |
| **Document Indexing** | Hours for large PDFs | Async processing, parallel workers, smaller chunks |
| **Network Latency** | 100ms round-trip | CDN, edge functions, geographic redundancy |

### 12.2 Performance Issues & Solutions

**Cold Start (First Request)**:
```
Problem: First request takes 5+ seconds
├─ Django/Flask startup: 2 seconds
├─ Model loading: 1 second
├─ Cache miss: +1 second

Solution:
├─ Warm-up pool: Keep 2 instances always running
├─ Pre-load model at startup
├─ Populate cache with top 15 queries
```

**High Memory Usage**:
```
Problem: 80% memory after 1 hour
├─ LRU cache growing unbounded
├─ Memory leak in embedding model

Solution:
├─ Set max cache size: 512MB
├─ Monitor memory trends
├─ Restart service daily (graceful shutdown)
```

**Slow Vector Search**:
```
Problem: Vector search taking 200ms (target: 50ms)
├─ HNSW index not optimal
├─ Too many vectors (1M+)

Solution:
├─ Tune HNSW parameters (ef_construction=200, ef_search=20)
├─ Partition by category (separate collections)
├─ Use approximate NN instead of exact
```

### 12.3 Database Hotspots

**Write-Heavy Table** (`chat_messages`):
```sql
Problem: 10K writes/sec, replication lag

Solution:
├─ Batch inserts (500 per batch)
├─ Async queue before DB
├─ Write sharding by session_id
└─ Connection pooling (max 100 connections)
```

**Read-Heavy Table** (`users`):
```sql
Problem: 100K reads/sec, CPU high

Solution:
├─ Cache in Redis (session data)
├─ Read replicas (5 replicas for reads)
├─ Projection (select only needed columns)
└─ Partial indexes on frequently filtered columns
```

### 12.4 Cache Miss Optimization

**Cache Invalidation Strategy**:
```
Problem: Stale data served to users (24h old)

Solution:
├─ Event-driven invalidation: When law changes, invalidate all tax_* keys
├─ TTL tuning: Balance freshness vs hit rate
├─ Cache warming: Pre-load new queries before they're requested
└─ Versioning: Include version in cache key (query:v2:hash)
```

### 12.5 Queue Overload Handling

**Kafka Backpressure**:
```
Problem: Document upload queue backing up (1000+ pending)

Solution:
├─ Increase consumer threads (5 → 20 workers)
├─ Optimize document parsing (parallel chunking)
├─ Batch embeddings (50 docs per batch)
└─ Auto-scale: More workers when lag > threshold
```

---

## 13. ❓ INTERVIEW QUESTIONS

### 13.1 Architecture Questions

**Q1: How would you scale to 10M daily users?**

A: Current architecture handles 100K DAU. For 10M:
1. **Horizontal scaling**: Increase API servers from 3 to 50+
2. **Database sharding**: Shard by user_id across 10 databases
3. **Cache optimization**: Increase Redis from 10GB to 500GB
4. **CDN expansion**: Add more edge locations globally
5. **Kafka scaling**: Increase broker count, partition count
6. **Multi-region**: Deploy in 5 regions (India, US, EU, Asia-Pac)
7. **Fallback services**: Cached responses when databases are saturated

**Q2: How would you handle a database failure?**

A: 
- **Detection**: Health check fails 3x (30 seconds)
- **Failover**: PostgreSQL replica promoted automatically (pg_auto_failover)
- **Applications**: Automatically reconnect via DNS alias
- **Data loss**: Minimal (< 1 minute of writes, async commit in replica)
- **Recovery**: Restore from backups if needed
- **RTO**: < 1 minute, **RPO**: < 1 minute

**Q3: Why did you choose PostgreSQL over NoSQL for chat sessions?**

A:
- ✅ Strong consistency needed for financial data
- ✅ Complex queries (joins, aggregations)
- ✅ ACID guarantees for transactions
- ✅ Better for structured data (schema known)
- ❌ NoSQL would be slower for joins, harder to enforce consistency

**Q4: How do you ensure prompt injection protection?**

A:
1. Regex pattern detection (5 patterns for common injection types)
2. Input length limit (1000 chars max)
3. Character whitelist (alphanumeric + punctuation only)
4. Sandbox the prompt (explicit system message, no code execution)
5. Rate limiting (10 requests/min) to prevent brute-force

### 13.2 Tradeoffs & Decisions

**Q5: REST vs GraphQL - why did you choose REST?**

A:
- **REST chosen because**:
  - Simpler for CRUD operations (chats, messages, documents)
  - Better HTTP caching (GET requests)
  - CDN friendly
  - Fewer resources than GraphQL
  
- **GraphQL would be better if**:
  - Multiple resource queries needed (user + chats + documents)
  - Complex nested data fetching
  - Strong typed schema for multiple clients

**Q6: Why multi-database instead of single database?**

A:
- **Vector DB (ChromaDB)**: Optimized for <50ms semantic search
- **Relational DB (PostgreSQL)**: Transactions, consistency, complex queries
- **Document store (MongoDB)**: Flexible schema for user documents
- **Time-series (InfluxDB)**: Optimized for analytics metrics
- **Cache (Redis)**: Sub-millisecond access

Each database is tuned for its use case. Single DB would sacrifice performance.

**Q7: Synchronous vs asynchronous processing - where would you draw the line?**

A:
- **Synchronous** (immediate response):
  - User login, JWT validation
  - Chat message retrieval
  - Saved message queries
  
- **Asynchronous** (background):
  - Document indexing (takes 5-10 minutes)
  - Tax calculation (takes 30 seconds)
  - Email notifications
  - Analytics aggregation
  
Decision: If > 1 second, consider async.

### 13.3 Alternative Approaches

**Q8: How would you implement real-time collaboration (two users in same chat)?**

A:
1. **WebSocket** instead of polling
2. **Operational Transformation** (OT) for conflict resolution
3. **Yjs** or **Automerge** library for CRDT
4. **Redis Pub/Sub** to broadcast changes across servers
5. **State versioning**: Each message has version, merge on conflict

**Q9: How would you add voice capabilities at scale?**

A: (Already implemented!)
1. **Client-side STT**: Web Speech API (offline, fast)
2. **Server-side TTS**: Streaming from OpenAI/Google (fallback)
3. **Kafka topic**: `voice-commands` for async processing
4. **Audio encoding**: Opus (high quality, low bandwidth)
5. **Multi-region TTS**: Cache pronunciations for financial terms

**Q10: How would you implement end-to-end encryption for chats?**

A:
1. **Signal Protocol** or **Double Ratchet Algorithm**
2. **Key exchange**: ECDH on client-side
3. **Storage**: Encrypted in DB (key managed by user)
4. **Challenge**: Server can't analyze chats for RAG (trade-off)
5. **Alternative**: Server-managed encryption (TLS + at-rest encryption)

---

## 14. 🛠️ TECH STACK RECOMMENDATION

### 14.1 Frontend

| Layer | Recommendation | Alternative | Why |
|---|---|---|---|
| **Framework** | Next.js 14 | Vite + React | SSR, API routes, better SEO |
| **Styling** | Tailwind CSS | Material-UI | Utility-first, smaller bundle |
| **State Management** | Redux Toolkit | Zustand | Complex state, good DevTools |
| **API Client** | TanStack Query | Apollo | Caching, sync with server |
| **Markdown** | remark + rehype | markdown-it | Unified ecosystem |
| **WebSocket** | Socket.io | ws | Fallback to HTTP polling |
| **Voice** | Web Speech API | tone.js | Native browser support |

### 14.2 Backend

| Layer | Recommendation | Alternative | Why |
|---|---|---|---|
| **API Framework** | FastAPI | Flask, Django | Async, auto OpenAPI docs |
| **ORM** | SQLAlchemy | Tortoise | DB agnostic, mature |
| **Async** | asyncio | Twisted | Python standard |
| **Validation** | Pydantic | marshmallow | Type hints, fast |
| **Task Queue** | Celery + Redis | RQ | Distributed, powerful |
| **Testing** | pytest | unittest | Fixtures, plugins |
| **ASGI Server** | Uvicorn | Gunicorn | Async support |

### 14.3 Database

| Layer | Recommendation | Why |
|---|---|---|
| **SQL** | PostgreSQL 15 | Mature, ACID, rich features |
| **Vector DB** | ChromaDB | Easy to use, open-source |
| **Cache** | Redis Cluster | Distributed, sub-ms latency |
| **Document Store** | MongoDB | Flexible schema, TTL indexes |
| **Time-Series** | InfluxDB | Optimized for metrics |

### 14.4 Infrastructure & DevOps

| Layer | Recommendation | Why |
|---|---|---|
| **Container** | Docker | Standard, portable |
| **Orchestration** | Kubernetes | Auto-scaling, self-healing |
| **Cloud** | AWS | Widest service range, India region |
| **IaC** | Terraform | Code as infrastructure, reproducible |
| **CI/CD** | GitHub Actions | Git-native, free for public repos |
| **Monitoring** | Datadog | All-in-one (logs, metrics, traces) |
| **Error Tracking** | Sentry | Real-time error insights |

### 14.5 Deployment

```yaml
# AWS Resources
compute:
  - EKS (Kubernetes cluster): 10-50 nodes, auto-scaling
  - RDS PostgreSQL: Multi-AZ (primary + 2 replicas)
  - ElastiCache Redis: Cluster mode, 10-30 GB
  - S3: 10-100 GB for documents
  - CloudFront: CDN for static assets
  - ALB: Load balancer with SSL
  - Lambda: For scheduled tasks (cleanup, backups)

monitoring:
  - CloudWatch: AWS native metrics
  - X-Ray: Distributed tracing
  - CloudTrail: Audit logs
```

---

## 15. 📈 FINAL SUMMARY

### 15.1 End-to-End Request Lifecycle

```
1. USER SUBMITS: "How do I calculate my taxes?"
   ├─ Browser sends HTTPS request (TLS 1.3)
   └─ Size: ~200 bytes

2. CDN: Static assets (JS/CSS) already cached locally
   └─ No roundtrip for assets

3. GLOBAL LOAD BALANCER (Route 53)
   └─ Routes to Mumbai region (geo-proximity)

4. LOAD BALANCER (ALB)
   ├─ 3 healthy API servers running
   └─ Routes to least-loaded server

5. API GATEWAY (Kong)
   ├─ Parse JWT token (5ms)
   ├─ Check rate limit: 5/10 requests used (2ms)
   ├─ Validate request signature (3ms)
   └─ Route to Chat Service

6. CHAT SERVICE (FastAPI)
   ├─ Create message record in PostgreSQL (50ms)
   ├─ Return message_id immediately
   └─ Begin async processing

7. USER SEES: "Processing..." (50ms)

8. ASYNC: RAG SERVICE
   ├─ Check Redis cache for query (4ms) → MISS
   ├─ Vector search in ChromaDB (50ms)
   │  └─ Retrieve 5 top documents on tax laws
   ├─ Fetch document snippets from MongoDB (100ms)
   └─ Return 5 sources to LLM Service

9. LLM SERVICE (OpenAI API)
   ├─ Build prompt with sources (10ms)
   ├─ Call OpenAI API (8000ms, gpt-4o)
   └─ Stream response back to client

10. STREAMING RESPONSE
    ├─ "To calculate your taxes..."
    ├─ Real-time SSE to browser
    └─ User sees typing animation

11. CACHE POPULATION
    ├─ Store response in Redis (10ms)
    └─ TTL: 24 hours

12. DATABASE UPDATE
    ├─ Insert full message (role: assistant)
    ├─ Insert sources metadata
    ├─ Publish to Kafka: query-submitted event
    └─ Update chat_sessions.updated_at

13. ANALYTICS (Async)
    ├─ Kafka consumer processes event
    ├─ Write to InfluxDB (query latency: 1250ms)
    ├─ Update cache hit rate metric
    └─ Alert if latency > 5s

14. TOTAL TIME: 1,250ms (user sees ~2s with streaming)

15. SECOND REQUEST (Same query by same user)
    ├─ Cache hit: 4ms
    └─ No LLM call needed
```

### 15.2 Scalability Summary

| Metric | Current | 10x Scale | 100x Scale |
|---|---|---|---|
| **Daily Users** | 100K | 1M | 10M |
| **API Servers** | 3 | 30 | 100+ |
| **Database** | 1 Primary + 2 Replicas | 10 shards | 100 shards |
| **Cache Size** | 10GB | 100GB | 1TB |
| **Storage** | 100GB | 1TB | 10TB |
| **Cost/Month** | ~$5K | ~$50K | ~$500K+ |

### 15.3 Architecture Maturity

**Current State**: **Startup** (MVP → Growth)
- ✅ Single region (India)
- ✅ Monolithic + microservices hybrid
- ✅ Basic monitoring
- ✅ 99% availability

**Next Phase** (1M+ users): **Enterprise**
- ✅ Multi-region active-active
- ✅ Full microservices
- ✅ Advanced observability (Datadog, Jaeger)
- ✅ 99.99% availability (< 1 hour downtime/year)

### 15.4 Real-World Company Comparisons

**ARTH-MITRA architecture is similar to**:

| Company | Similarity | Difference |
|---|---|---|
| **ChatGPT** | Streaming chat, RAG, document upload | More complex caching, real-time collab |
| **Stripe** | Payment validation, RAG for docs | Different security model (PCI-DSS) |
| **Google Finance** | Data aggregation, personalized insights | More real-time data feeds |
| **Groww** (Indian FinTech) | Tax calculator, scheme finder | Similar target audience, simpler tech |
| **Navi** (Insurance) | Voice assistant, personalized advice | Similar voice features, different domain |

---

## Appendix A: Deployment Checklist

- [ ] PostgreSQL primary + 2 replicas configured
- [ ] Redis cluster (10GB) deployed
- [ ] ChromaDB with HNSW indexing set up
- [ ] Kafka topic creation (user-events, query-submitted, etc.)
- [ ] S3 bucket with lifecycle policies (document auto-purge)
- [ ] CloudFront CDN distribution
- [ ] SSL certificates (AWS Certificate Manager)
- [ ] EKS cluster with auto-scaling (2-50 nodes)
- [ ] Datadog monitoring and alerts
- [ ] Sentry error tracking
- [ ] GitHub Actions CI/CD pipeline
- [ ] Daily backup job (PostgreSQL → S3)
- [ ] Load testing (10K concurrent users)

---

## Appendix B: Additional Resources

- AWS Architecture Center: https://aws.amazon.com/architecture/
- System Design Interview Guide: https://github.com/donnemartin/system-design-primer
- OWASP Top 10: https://owasp.org/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Kafka Design: https://kafka.apache.org/documentation/

---

**Document Version**: 1.0  
**Last Updated**: May 10, 2025  
**Author**: System Design Team  
**Status**: Complete for Interview & Production Use
