# 🎨 ARTH-MITRA: Mermaid Architecture Diagrams

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB["🌐 Web Browser"]
        MOBILE["📱 Mobile App"]
    end

    subgraph "CDN & Edge"
        CDN["☁️ Vercel CDN<br/>Static Assets<br/>24h TTL"]
    end

    subgraph "Load Balancing"
        LB["⚖️ AWS ALB<br/>SSL Termination<br/>Health Checks"]
    end

    subgraph "API Gateway"
        APIGW["🔐 API Gateway<br/>JWT Validation<br/>Rate Limiting<br/>Routing"]
    end

    subgraph "Microservices"
        AUTH["🔑 Auth Service"]
        CHAT["💬 Chat Service"]
        RAG["🔍 RAG Service"]
        LLM["🤖 LLM Service"]
        DOC["📄 Document Service"]
        ANALYTICS["📊 Analytics Service"]
    end

    subgraph "Caching"
        REDIS["⚡ Redis Cluster<br/>L1: In-Memory<br/>L2: Disk Cache"]
    end

    subgraph "Data Layer"
        POSTGRES["🗄️ PostgreSQL<br/>Primary + 2 Replicas"]
        CHROMADB["🔬 ChromaDB<br/>Vector Search<br/>HNSW Index"]
        MONGODB["📚 MongoDB<br/>Documents<br/>TTL Indexes"]
        INFLUXDB["📈 InfluxDB<br/>Time-Series<br/>Metrics"]
    end

    subgraph "Message Queue"
        KAFKA["📨 Kafka<br/>5+ Topics<br/>Async Processing"]
    end

    subgraph "Storage & External"
        S3["☁️ AWS S3<br/>Documents<br/>Backups"]
        OPENAI["🚀 OpenAI API<br/>GPT-4o<br/>Streaming"]
    end

    WEB --> CDN
    MOBILE --> CDN
    CDN --> LB
    LB --> APIGW
    
    APIGW --> AUTH
    APIGW --> CHAT
    APIGW --> RAG
    APIGW --> DOC
    APIGW --> ANALYTICS
    
    AUTH --> REDIS
    CHAT --> REDIS
    CHAT --> POSTGRES
    CHAT --> KAFKA
    
    RAG --> CHROMADB
    RAG --> REDIS
    RAG --> MONGODB
    
    LLM --> OPENAI
    LLM --> REDIS
    
    DOC --> S3
    DOC --> KAFKA
    DOC --> CHROMADB
    
    ANALYTICS --> KAFKA
    ANALYTICS --> INFLUXDB
    
    POSTGRES -.->|Replication| POSTGRES
    CHROMADB -.->|Replication| CHROMADB
    
    style WEB fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style CDN fill:#50E3C2,stroke:#2B8F7F,color:#fff
    style LB fill:#FFB347,stroke:#B8860B,color:#fff
    style APIGW fill:#FF7675,stroke:#B73E3E,color:#fff
    style REDIS fill:#FFA500,stroke:#B8860B,color:#fff
    style POSTGRES fill:#50C878,stroke:#2E7D4E,color:#fff
    style CHROMADB fill:#9B59B6,stroke:#6C3A85,color:#fff
    style KAFKA fill:#FF6B6B,stroke:#CC5555,color:#fff
    style OPENAI fill:#10A37F,stroke:#0D7F5F,color:#fff
```

---

## 2. Request Lifecycle Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant CDN as CDN/LB
    participant APIGW as API Gateway
    participant Chat as Chat Service
    participant RAG as RAG Service
    participant LLM as LLM API
    participant Cache as Redis Cache
    participant DB as Databases

    User->>Browser: Types "How to calculate taxes?"
    Browser->>CDN: HTTPS Request + JWT Token
    CDN->>APIGW: Route to API Gateway
    APIGW->>APIGW: Validate JWT (5ms)
    APIGW->>APIGW: Rate Limit Check (2ms)
    APIGW->>Chat: Create Message Record
    Chat->>DB: Insert Message (50ms)
    Chat-->>APIGW: Message ID
    APIGW-->>Browser: Start Response (100ms)
    Browser-->>User: "Processing..."
    
    par Async Processing
        Chat->>Cache: Check Cache (4ms)
        Cache-->>Chat: Cache MISS
        Chat->>RAG: Retrieve Relevant Sources
        RAG->>DB: Vector Search (50ms)
        DB-->>RAG: Top 5 Documents
        RAG->>Cache: Cache Result
        Chat->>LLM: Call OpenAI API
        LLM->>LLM: Generate Response (12000ms)
        LLM-->>Chat: Streaming Response
    end
    
    Chat->>Cache: Store Full Response (10ms)
    Chat-->>Browser: Stream Response as SSE
    Browser-->>User: Show Results (14000ms total)
    Chat->>DB: Insert Full Message
    Chat->>KAFKA: Publish query-submitted event
    KAFKA->>Analytics: Process Event
    Analytics->>DB: Write Metrics

    Note over Browser,DB: Total: 1-14 seconds (streaming shows faster)
```

---

## 3. Database Architecture

```mermaid
graph LR
    APP["Application"]
    
    subgraph "Cache Layer"
        L1["L1: Redis<br/>In-Memory<br/>4ms"]
        L2["L2: Disk Cache<br/>JSON Files<br/>50ms"]
    end
    
    subgraph "Primary Databases"
        PG["PostgreSQL<br/>ACID Transactions<br/>Users, Sessions<br/>100-500ms"]
        MONGO["MongoDB<br/>Documents<br/>User Profiles<br/>100ms"]
        CHROME["ChromaDB<br/>Vector Search<br/>Embeddings<br/>50ms"]
        INFLUX["InfluxDB<br/>Time-Series<br/>Metrics<br/>100ms"]
    end
    
    subgraph "Replication"
        PG_R1["PostgreSQL<br/>Replica 1"]
        PG_R2["PostgreSQL<br/>Replica 2"]
        CHROME_R["ChromaDB<br/>Replicas"]
    end
    
    subgraph "Backup"
        BACKUP["S3 Backups<br/>Daily<br/>30-day Retention"]
    end
    
    APP --> L1
    L1 --> L2
    L2 --> PG
    L2 --> MONGO
    L2 --> CHROME
    L2 --> INFLUX
    
    PG --> PG_R1
    PG --> PG_R2
    PG --> BACKUP
    MONGO --> BACKUP
    CHROME --> CHROME_R
    CHROME --> BACKUP
    
    style L1 fill:#FFA500
    style L2 fill:#FFD700
    style PG fill:#50C878
    style MONGO fill:#4A90E2
    style CHROME fill:#9B59B6
    style INFLUX fill:#FF6B6B
    style BACKUP fill:#808080
```

---

## 4. Microservices Architecture

```mermaid
graph TB
    API["API Gateway<br/>Port 3000"]
    
    API --> AUTH["Auth Service<br/>Port 3001<br/>5 replicas"]
    API --> CHAT["Chat Service<br/>Port 3002<br/>10 replicas"]
    API --> RAG["RAG Service<br/>Port 3003<br/>10 replicas"]
    API --> LLM["LLM Service<br/>Port 3004<br/>5 replicas"]
    API --> DOC["Document Service<br/>Port 3005<br/>5 replicas"]
    API --> ANALYTICS["Analytics Service<br/>Port 3006<br/>3 replicas"]
    API --> VOICE["Voice Service<br/>Port 3007<br/>3 replicas"]
    
    AUTH --> POSTGRES[(PostgreSQL)]
    CHAT --> POSTGRES
    CHAT --> REDIS["Redis"]
    CHAT --> KAFKA["Kafka"]
    
    RAG --> CHROMADB["ChromaDB"]
    RAG --> MONGO[(MongoDB)]
    RAG --> REDIS
    
    LLM --> OPENAI["OpenAI API"]
    LLM --> REDIS
    
    DOC --> S3["AWS S3"]
    DOC --> KAFKA
    DOC --> CHROMADB
    
    ANALYTICS --> KAFKA
    ANALYTICS --> INFLUXDB["InfluxDB"]
    
    VOICE --> KAFKA
    VOICE --> REDIS
    
    KAFKA --> NOTIFICATION["Notification Service"]
    KAFKA --> INDEXING["Indexing Service"]
    KAFKA --> ERROR["Error Alerting"]
    
    NOTIFICATION --> SENDGRID["SendGrid<br/>Email"]
    NOTIFICATION --> TWILIO["Twilio<br/>SMS"]
    
    ERROR --> PAGERDUTY["PagerDuty<br/>Alerts"]
    
    style API fill:#FF7675
    style AUTH fill:#4A90E2
    style CHAT fill:#50C878
    style RAG fill:#9B59B6
    style LLM fill:#FFB347
    style DOC fill:#50E3C2
    style ANALYTICS fill:#FF6B6B
    style VOICE fill:#FFD700
    style KAFKA fill:#FF7675
    style NOTIFICATION fill:#4A90E2
    style ERROR fill:#FF0000
```

---

## 5. Caching Strategy

```mermaid
graph TD
    REQUEST["Incoming Request<br/>User Query"]
    
    REQUEST --> BROWSER["Browser Cache<br/>Static assets<br/>24h TTL<br/>HIT: 100ms"]
    
    BROWSER --> CDN["CDN Cache<br/>JS, CSS, Images<br/>50 edge locations<br/>HIT: 50ms"]
    
    CDN --> L1["L1: Redis<br/>In-Memory<br/>Hot Data<br/>HIT: 4ms<br/>Hit Rate: 70%"]
    
    L1 --> L1_HIT["✅ Cache HIT"]
    L1 --> L1_MISS["❌ Cache MISS"]
    
    L1_HIT --> RESPONSE1["Return Response<br/>TOTAL: 100ms"]
    
    L1_MISS --> L2["L2: Disk Cache<br/>Local JSON<br/>24h TTL<br/>HIT: 50ms"]
    
    L2 --> L2_HIT["✅ Cache HIT"]
    L2 --> L2_MISS["❌ Cache MISS"]
    
    L2_HIT --> RESPONSE2["Return Response<br/>TOTAL: 200ms"]
    
    L2_MISS --> DB["Database Query<br/>PostgreSQL / ChromaDB<br/>Latency: 50-500ms"]
    
    DB --> RESPONSE3["Return Response<br/>UPDATE CACHES<br/>TOTAL: 600-1000ms"]
    
    L1_HIT --> END["Fast Response ⚡"]
    L2_HIT --> END
    RESPONSE3 --> END
    
    style L1 fill:#FFA500,stroke:#B8860B,color:#fff
    style L2 fill:#FFD700,stroke:#B8860B,color:#fff
    style DB fill:#50C878,stroke:#2E7D4E,color:#fff
    style END fill:#FF6B6B,stroke:#CC5555,color:#fff
    style L1_HIT fill:#90EE90
    style L2_HIT fill:#90EE90
```

---

## 6. Kafka Event Processing

```mermaid
graph LR
    SERVICE["Services Publish"]
    
    SERVICE -->|user-events| KAFKA["Apache Kafka<br/>3 Brokers<br/>5-10 Partitions"]
    SERVICE -->|query-submitted| KAFKA
    SERVICE -->|document-uploaded| KAFKA
    SERVICE -->|voice-commands| KAFKA
    SERVICE -->|tax-tasks| KAFKA
    
    KAFKA --> ANALYTICS["📊 Analytics Service<br/>Consumer Group: analytics<br/>Parallel: 3 consumers"]
    KAFKA --> INDEXING["🔍 Indexing Service<br/>Consumer Group: indexing<br/>Parallel: 5 consumers"]
    KAFKA --> NOTIFY["📧 Notification Service<br/>Consumer Group: notify<br/>Parallel: 2 consumers"]
    KAFKA --> ERROR["⚠️ Error Alerting<br/>Consumer Group: error<br/>Parallel: 1 consumer"]
    KAFKA --> DLQ["🔴 Dead Letter Queue<br/>Manual Review Required"]
    
    ANALYTICS --> INFLUXDB["InfluxDB<br/>Metrics"]
    INDEXING --> CHROMADB["ChromaDB<br/>Embeddings"]
    NOTIFY --> EMAIL["SendGrid<br/>Email"]
    NOTIFY --> SMS["Twilio<br/>SMS"]
    ERROR --> PAGERDUTY["PagerDuty<br/>Alert"]
    
    DLQ --> ADMIN["👤 Admin Dashboard<br/>Manual Retry/Delete"]
    
    style KAFKA fill:#FF7675,stroke:#CC5555,color:#fff
    style ANALYTICS fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style INDEXING fill:#9B59B6,stroke:#6C3A85,color:#fff
    style NOTIFY fill:#50C878,stroke:#2E7D4E,color:#fff
    style ERROR fill:#FF0000,stroke:#CC0000,color:#fff
    style DLQ fill:#FFB347,stroke:#B8860B,color:#fff
```

---

## 7. Scaling Tiers

```mermaid
graph TB
    subgraph "Phase 1: Startup<br/>10K-100K DAU"
        S1_COMPUTE["3 API Servers"]
        S1_DB["PostgreSQL<br/>Primary + 2 Replicas"]
        S1_CACHE["Redis<br/>10GB"]
        S1_VECTOR["ChromaDB<br/>Embedded"]
        S1_COST["💰 $5-10K/month"]
    end
    
    subgraph "Phase 2: Growth<br/>100K-1M DAU"
        S2_COMPUTE["10-30 API Servers<br/>Kubernetes"]
        S2_DB["PostgreSQL<br/>10 Shards"]
        S2_CACHE["Redis Cluster<br/>100GB, 5 nodes"]
        S2_VECTOR["ChromaDB<br/>Partitioned"]
        S2_QUEUE["Kafka<br/>3 Brokers"]
        S2_MULTI["Multi-Region<br/>3 regions"]
        S2_COST["💰 $50-100K/month"]
    end
    
    subgraph "Phase 3: Enterprise<br/>1M-10M DAU"
        S3_COMPUTE["50-100 API Servers<br/>Kubernetes + Service Mesh"]
        S3_DB["Database Federation<br/>Regional DBs"]
        S3_CACHE["Redis Cluster<br/>1TB, 20+ nodes"]
        S3_VECTOR["Distributed ChromaDB<br/>10+ nodes"]
        S3_QUEUE["Kafka<br/>10 Brokers"]
        S3_MULTI["5+ Global Regions"]
        S3_ADVANCED["Event Sourcing<br/>CQRS Pattern"]
        S3_COST["💰 $500K-2M+/month"]
    end
    
    S1_COMPUTE --> S2_COMPUTE
    S1_DB --> S2_DB
    S1_CACHE --> S2_CACHE
    S1_VECTOR --> S2_VECTOR
    
    S2_COMPUTE --> S3_COMPUTE
    S2_DB --> S3_DB
    S2_CACHE --> S3_CACHE
    S2_VECTOR --> S3_VECTOR
    S2_QUEUE --> S3_QUEUE
    
    style S1_COST fill:#90EE90
    style S2_COST fill:#FFD700
    style S3_COST fill:#FF7675
```

---

## 8. API Error Handling

```mermaid
graph TD
    REQUEST["API Request"]
    
    REQUEST --> VALIDATE["Validate Request<br/>Schema, Input"]
    
    VALIDATE --> VALID{Valid?}
    
    VALID -->|No| ERR400["❌ 400 Bad Request<br/>Invalid schema or input"]
    
    VALID -->|Yes| AUTH["Authenticate<br/>Verify JWT"]
    
    AUTH --> AUTH_OK{Token Valid?}
    
    AUTH_OK -->|No| ERR401["❌ 401 Unauthorized<br/>Token missing/invalid"]
    
    AUTH_OK -->|Yes| AUTHZ["Authorize<br/>Check permissions"]
    
    AUTHZ --> AUTHZ_OK{Permission OK?}
    
    AUTHZ_OK -->|No| ERR403["❌ 403 Forbidden<br/>Insufficient permissions"]
    
    AUTHZ_OK -->|Yes| RATELIMIT["Rate Limit Check<br/>10 req/min"]
    
    RATELIMIT --> RL_OK{Within Limit?}
    
    RL_OK -->|No| ERR429["❌ 429 Too Many Requests<br/>Retry after: 45s"]
    
    RL_OK -->|Yes| PROCESS["Process Request<br/>Call service"]
    
    PROCESS --> EXEC{Execution OK?}
    
    EXEC -->|Yes| SUCCESS["✅ 200 OK<br/>Return result"]
    
    EXEC -->|Timeout| ERR504["❌ 504 Gateway Timeout<br/>Service too slow"]
    
    EXEC -->|Resource Error| ERR404["❌ 404 Not Found<br/>Resource doesn't exist"]
    
    EXEC -->|Service Down| FALLBACK["Fallback:<br/>Cache/Default"]
    
    EXEC -->|Unexpected| ERR500["❌ 500 Internal Error<br/>Log to Sentry"]
    
    FALLBACK --> FALLBACK_OK{Fallback OK?}
    
    FALLBACK_OK -->|Yes| CACHED["✅ 200 OK<br/>Cached response"]
    
    FALLBACK_OK -->|No| ERR503["❌ 503 Unavailable<br/>Service degraded"]
    
    ERR400 --> RESPONSE["Send Response<br/>w/ Error Details"]
    ERR401 --> RESPONSE
    ERR403 --> RESPONSE
    ERR429 --> RESPONSE
    ERR504 --> RESPONSE
    ERR404 --> RESPONSE
    ERR500 --> RESPONSE
    ERR503 --> RESPONSE
    SUCCESS --> RESPONSE
    CACHED --> RESPONSE
    
    RESPONSE --> LOG["Log to ELK Stack"]
    RESPONSE --> METRICS["Update Metrics<br/>InfluxDB"]
    RESPONSE --> ALERT{Error Rate<br/>High?}
    
    ALERT -->|Yes| PAGERDUTY["🚨 Alert PagerDuty"]
    
    style SUCCESS fill:#90EE90
    style CACHED fill:#FFD700
    style ERR400 fill:#FF7675
    style ERR401 fill:#FF7675
    style ERR403 fill:#FF7675
    style ERR429 fill:#FF7675
    style ERR500 fill:#FF0000
    style ERR503 fill:#FF0000
    style ERR504 fill:#FF0000
    style PAGERDUTY fill:#FF0000
```

---

## 9. Monitoring & Observability Stack

```mermaid
graph TB
    subgraph "Data Collection"
        APPS["Applications"]
        KAFKA_MON["Kafka Logs"]
        INFRA["Infrastructure"]
    end
    
    subgraph "Processing"
        AGENT["Datadog Agent<br/>Log aggregation"]
        EXPORTER["Prometheus<br/>Exporters"]
    end
    
    subgraph "Storage"
        LOGS["📝 Elasticsearch<br/>Logs (30 days)"]
        METRICS["📊 Prometheus<br/>Metrics (15 days)"]
        TRACES["🔗 Jaeger<br/>Traces (7 days)"]
        EVENTS["📌 InfluxDB<br/>Events (30 days)"]
    end
    
    subgraph "Visualization"
        GRAFANA["📈 Grafana<br/>Custom Dashboards"]
        KIBANA["📊 Kibana<br/>Log Analysis"]
        JAEGER_UI["🔍 Jaeger UI<br/>Trace Visualization"]
    end
    
    subgraph "Alerting"
        RULES["Alert Rules<br/>Thresholds"]
        PAGERDUTY["🚨 PagerDuty<br/>On-call Management"]
        SLACK["💬 Slack<br/>Notifications"]
        EMAIL["📧 Email"]
    end
    
    APPS --> AGENT
    KAFKA_MON --> AGENT
    INFRA --> EXPORTER
    
    AGENT --> LOGS
    AGENT --> TRACES
    EXPORTER --> METRICS
    APPS --> EVENTS
    
    LOGS --> GRAFANA
    LOGS --> KIBANA
    METRICS --> GRAFANA
    TRACES --> JAEGER_UI
    EVENTS --> GRAFANA
    
    METRICS --> RULES
    LOGS --> RULES
    
    RULES --> PAGERDUTY
    RULES --> SLACK
    RULES --> EMAIL
    
    style AGENT fill:#50E3C2
    style LOGS fill:#4A90E2
    style METRICS fill:#50C878
    style TRACES fill:#9B59B6
    style GRAFANA fill:#FFD700
    style RULES fill:#FF7675
    style PAGERDUTY fill:#FF0000
```

---

## 10. Security Layers

```mermaid
graph TB
    USER["User/Browser"]
    
    USER --> HTTPS["🔒 HTTPS/TLS 1.3<br/>Encrypted Transport"]
    
    HTTPS --> WAF["🛡️ Web Application Firewall<br/>Cloudflare/AWS WAF<br/>Block malicious requests"]
    
    WAF --> DDOS["🛡️ DDoS Protection<br/>Rate limiting<br/>Geo-blocking"]
    
    DDOS --> APIGW["API Gateway<br/>Request Validation"]
    
    APIGW --> JWT["🔐 JWT Validation<br/>RS256 Signature<br/>Token Expiry"]
    
    JWT --> AUTHZ["🔐 Authorization<br/>RBAC<br/>Permission Check"]
    
    AUTHZ --> INPUT["🛡️ Input Validation<br/>Schema check<br/>Injection prevention"]
    
    INPUT --> CRYPTO["🔐 Encryption<br/>Data at rest (AES-256)<br/>Data in transit (TLS)"]
    
    CRYPTO --> AUDIT["📝 Audit Logging<br/>All actions logged<br/>Immutable trail"]
    
    AUDIT --> APP["Application Logic"]
    
    APP --> DB["Database<br/>Parameterized queries<br/>No SQL injection"]
    
    DB --> BACKUP["Backup & Recovery<br/>Encrypted backups<br/>Point-in-time restore"]
    
    BACKUP --> SECRETS["🔐 Secrets Manager<br/>AWS Secrets<br/>Never hardcode"]
    
    style HTTPS fill:#50E3C2
    style WAF fill:#FF7675
    style DDOS fill:#FF7675
    style JWT fill:#4A90E2
    style AUTHZ fill:#4A90E2
    style INPUT fill:#FF7675
    style CRYPTO fill:#50E3C2
    style AUDIT fill:#FFD700
    style SECRETS fill:#4A90E2
```

---

**Diagram Version**: 1.0  
**Last Updated**: May 10, 2025  
**Format**: Mermaid (auto-renders in GitHub)
