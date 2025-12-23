# Dexi Phase 1 - Implementation Plan

**Version:** 1.0  
**Timeline:** 4 weeks (parallel to Console Phase 3, weeks 3-6)  
**Team:** 1-2 engineers  
**Budget:** $4K-$7K/month operational cost

---

## 🎯 Objective

Build the **Dexi Orchestrator Service** with Guide Agent and integrate with Nexus Console. This establishes the foundation for a platform-wide AI microservice that will eventually serve all Evidexa modules.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Nexus Console (UI)                    │
│                  Sidebar Copilot Component               │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Dexi Orchestrator Service                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  API Layer (REST + WebSocket)                   │   │
│  └─────────────────────────────────────────────────┘   │
│                     │                                    │
│         ┌───────────┴───────────┬──────────┐           │
│         ▼                       ▼          ▼           │
│  ┌──────────┐          ┌──────────────┐  ┌─────────┐  │
│  │ GPT-5    │          │ RAG Engine   │  │ Tools   │  │
│  │ Guide    │◄────────►│ (Pinecone)   │  │ Registry│  │
│  │ Agent    │          │              │  │         │  │
│  └──────────┘          └──────────────┘  └─────────┘  │
│       │                       │                │        │
│       └───────────────────────┴────────────────┘       │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐    ┌──────────────┐
│ Nexus API       │    │ Neon DB      │
│ (Campaign data) │    │ (Metadata)   │
└─────────────────┘    └──────────────┘
```

---

## Week 1: Infrastructure & Core Service

### Day 1-2: Repository & Infrastructure Setup

**Tasks:**
- [ ] Create `dexi-service` repository
- [ ] Setup TypeScript + Node.js project structure
- [ ] Configure ESLint, Prettier, Jest
- [ ] Setup Docker + docker-compose for local development
- [ ] Configure AWS ECS/Fargate deployment (Terraform)
- [ ] Setup CI/CD pipeline (GitHub Actions)

**Deliverables:**
- Working local development environment
- Automated deployment pipeline
- Infrastructure as code (Terraform)

### Day 3-4: LLM Adapter Interface

**Tasks:**
- [ ] Design pluggable LLM adapter interface
- [ ] Implement OpenAI adapter (GPT-5)
- [ ] Implement Anthropic adapter (Claude)
- [ ] Implement Google adapter (Gemini)
- [ ] Implement Perplexity adapter
- [ ] Create PolicyRouter for model selection

**Code Structure:**
```typescript
// src/llm/adapters/base.ts
interface LLMAdapter {
  chat(messages: Message[], tools?: Tool[]): Promise<Response>;
  stream(messages: Message[], tools?: Tool[]): AsyncIterator<Chunk>;
}

// src/llm/adapters/openai.ts
class OpenAIAdapter implements LLMAdapter {
  async chat(messages, tools) {
    return await openai.chat.completions.create({
      model: "gpt-5",
      messages,
      tools,
    });
  }
}

// src/llm/policy-router.ts
class PolicyRouter {
  selectAdapter(taskType: TaskType): LLMAdapter {
    switch (taskType) {
      case "reasoning": return new OpenAIAdapter();
      case "summarization": return new AnthropicAdapter();
      case "generation": return new GeminiAdapter();
      case "retrieval": return new PerplexityAdapter();
    }
  }
}
```

**Deliverables:**
- LLM adapter interface
- 4 adapter implementations
- PolicyRouter with task-based routing
- Unit tests for all adapters

### Day 5: Vector Store & Observability

**Tasks:**
- [ ] Setup Pinecone vector store (or pgvector)
- [ ] Implement document ingestion pipeline
- [ ] Setup CloudWatch metrics
- [ ] Setup Prometheus + Grafana
- [ ] Implement structured logging (Winston)
- [ ] Create cost tracking middleware

**Metrics to Track:**
- Request count (by agent, by model)
- Response latency (p50, p95, p99)
- Token usage (input, output)
- Cost per request
- Error rate
- Cache hit rate

**Deliverables:**
- Vector store configured
- Observability dashboard
- Cost tracking system

---

## Week 2: Guide Agent & Tool Registry

### Day 6-7: Tool Registry

**Tasks:**
- [ ] Design tool registry schema
- [ ] Implement tool versioning system
- [ ] Create tool execution engine
- [ ] Add RBAC validation layer
- [ ] Implement tool result caching

**Tool Registry Schema:**
```typescript
interface Tool {
  name: string;
  version: string;
  description: string;
  parameters: JSONSchema;
  rbacRoles: string[]; // Which roles can use this tool
  execute: (params: any, context: Context) => Promise<any>;
}

// Example tool registration
toolRegistry.register({
  name: "DocsSearch",
  version: "1.0.0",
  description: "Search Nexus documentation",
  parameters: {
    query: { type: "string", required: true },
    filters: { type: "object", optional: true },
  },
  rbacRoles: ["admin", "manager", "analyst", "viewer"],
  execute: async (params, context) => {
    // RAG search implementation
    const results = await vectorStore.search(params.query);
    return { snippets: results };
  },
});
```

**Deliverables:**
- Tool registry system
- Tool versioning
- RBAC validation
- Tool execution engine

### Day 8-9: Guide Agent Tools

**Tasks:**
- [ ] Implement DocsSearch tool (RAG over Nexus docs)
- [ ] Implement UINavigator tool (route suggestions)
- [ ] Implement RBACInspector tool (permission checks)
- [ ] Ingest Nexus documentation into vector store
- [ ] Create embeddings for all docs

**DocsSearch Implementation:**
```typescript
async function docsSearch(query: string, filters?: any): Promise<SearchResult> {
  // 1. Generate embedding for query
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: query,
  });

  // 2. Search vector store
  const results = await pinecone.query({
    vector: embedding.data[0].embedding,
    topK: 5,
    filter: filters,
  });

  // 3. Return formatted results
  return {
    snippets: results.matches.map(match => ({
      id: match.id,
      title: match.metadata.title,
      uri: match.metadata.uri,
      text: match.metadata.text,
      score: match.score,
    })),
    confidence: results.matches[0]?.score || 0,
  };
}
```

**Deliverables:**
- 3 working tools
- Nexus docs ingested into vector store
- Tool integration tests

### Day 10: Guide Agent Implementation

**Tasks:**
- [ ] Create Guide Agent with OpenAI Assistants API
- [ ] Configure system prompt
- [ ] Attach tools to Assistant
- [ ] Implement conversation threading
- [ ] Add response formatting

**Guide Agent Setup:**
```typescript
const guideAssistant = await openai.beta.assistants.create({
  name: "Dexi Guide Agent",
  instructions: `You are Dexi, the AI assistant for Evidexa Nexus Console.

Your role:
- Help users navigate the Nexus Console
- Answer questions about features and workflows
- Provide step-by-step guidance
- Check user permissions before suggesting actions

Guidelines:
- Be concise and helpful
- Cite documentation when possible
- Respect RBAC - only suggest actions user has permission for
- If unsure, say so and offer to search docs`,
  
  model: "gpt-5",
  tools: [
    { type: "function", function: docsSearchTool },
    { type: "function", function: uiNavigatorTool },
    { type: "function", function: rbacInspectorTool },
  ],
});
```

**Deliverables:**
- Guide Agent configured
- System prompt versioned
- Tool integration working

---

## Week 3: API & Context Services

### Day 11-12: REST API

**Tasks:**
- [ ] Implement `POST /api/chat` endpoint
- [ ] Add request validation (Zod)
- [ ] Implement context enrichment
- [ ] Add rate limiting (Redis)
- [ ] Add authentication (JWT)
- [ ] Add request/response logging

**API Implementation:**
```typescript
// POST /api/chat
app.post("/api/chat", authenticate, rateLimit, async (req, res) => {
  const { message, context } = req.body;
  
  // 1. Validate request
  const validated = chatRequestSchema.parse(req.body);
  
  // 2. Enrich context
  const enrichedContext = await enrichContext({
    ...context,
    userId: req.user.id,
    role: req.user.role,
  });
  
  // 3. Create or retrieve thread
  const thread = await getOrCreateThread(enrichedContext);
  
  // 4. Add user message
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: message,
  });
  
  // 5. Run assistant
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: guideAssistant.id,
  });
  
  // 6. Wait for completion and handle tool calls
  const result = await waitForCompletion(thread.id, run.id);
  
  // 7. Extract suggested actions
  const actions = extractSuggestedActions(result);
  
  // 8. Log for analytics
  await logInteraction({
    userId: req.user.id,
    agent: "Guide",
    message,
    response: result.content,
    tokensUsed: result.usage,
    cost: calculateCost(result.usage),
  });
  
  // 9. Return response
  res.json({
    reply: result.content,
    suggestedActions: actions,
    agent: "Guide",
  });
});
```

**Deliverables:**
- REST API endpoint
- Request validation
- Rate limiting
- Authentication

### Day 13: WebSocket API

**Tasks:**
- [ ] Implement WebSocket server
- [ ] Add streaming response support
- [ ] Handle connection lifecycle
- [ ] Add reconnection logic

**WebSocket Implementation:**
```typescript
wss.on("connection", (ws, req) => {
  const userId = authenticateWS(req);
  
  ws.on("message", async (data) => {
    const { message, context } = JSON.parse(data);
    
    // Stream response
    const stream = await streamAssistantResponse(message, context);
    
    for await (const chunk of stream) {
      ws.send(JSON.stringify({
        type: "chunk",
        content: chunk.delta.content,
      }));
    }
    
    ws.send(JSON.stringify({ type: "done" }));
  });
});
```

**Deliverables:**
- WebSocket server
- Streaming support
- Connection management

### Day 14-15: Context Services & Caching

**Tasks:**
- [ ] Implement context enrichment service
- [ ] Add Redis caching layer
- [ ] Implement cache invalidation strategy
- [ ] Add context compression (trim old messages)

**Context Enrichment:**
```typescript
async function enrichContext(context: Context): Promise<EnrichedContext> {
  // Fetch user data
  const user = await getUserData(context.userId);
  
  // Fetch campaign data if applicable
  let campaign = null;
  if (context.campaignId) {
    campaign = await getCampaignData(context.campaignId);
  }
  
  // Fetch recent actions
  const recentActions = await getRecentActions(context.userId, 5);
  
  return {
    ...context,
    user: {
      id: user.id,
      role: user.role,
      permissions: user.permissions,
    },
    campaign: campaign ? {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      metrics: campaign.metrics,
    } : null,
    recentActions,
  };
}
```

**Caching Strategy:**
- Cache user data (5 min TTL)
- Cache campaign data (1 min TTL)
- Cache docs search results (1 hour TTL)
- Cache RBAC checks (5 min TTL)

**Deliverables:**
- Context enrichment service
- Redis caching
- Cache invalidation

---

## Week 4: Testing & Integration

### Day 16-17: Testing

**Tasks:**
- [ ] Unit tests for all components (>80% coverage)
- [ ] Integration tests (API + Agent + Tools)
- [ ] Load testing (50 concurrent users)
- [ ] Create golden task sets for evaluation
- [ ] Test RBAC enforcement
- [ ] Test error handling and fallbacks

**Golden Task Sets:**
```typescript
const goldenTasks = [
  {
    query: "How do I create a campaign?",
    expectedAgent: "Guide",
    expectedTools: ["DocsSearch"],
    expectedResponse: /step.*create.*campaign/i,
  },
  {
    query: "What campaigns can I see?",
    expectedAgent: "Guide",
    expectedTools: ["RBACInspector"],
    expectedResponse: /permission.*role/i,
  },
  // ... 20+ more tasks
];
```

**Deliverables:**
- Test suite (unit + integration)
- Load test results
- Golden task evaluation

### Day 18-19: Console Integration

**Tasks:**
- [ ] Create Dexi client library for Console
- [ ] Implement Sidebar Copilot UI component
- [ ] Add bot icon button to header
- [ ] Implement chat message rendering
- [ ] Add suggested action buttons
- [ ] Add error handling and fallbacks

**Client Library:**
```typescript
// Console: src/lib/dexi-client.ts
class DexiClient {
  async chat(message: string, context: Context): Promise<DexiResponse> {
    const response = await fetch("https://dexi.evidexa.ai/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ message, context }),
    });
    
    if (!response.ok) {
      throw new DexiError("Failed to chat with Dexi");
    }
    
    return response.json();
  }
}
```

**Deliverables:**
- Dexi client library
- Sidebar Copilot component
- Integration with Console

### Day 20: Documentation & Deployment

**Tasks:**
- [ ] Write API documentation (OpenAPI spec)
- [ ] Write deployment runbook
- [ ] Write incident response guide
- [ ] Create cost monitoring dashboard
- [ ] Deploy to staging environment
- [ ] Deploy to production environment

**Documentation:**
- API reference (Swagger/OpenAPI)
- Architecture diagrams
- Deployment guide
- Monitoring guide
- Troubleshooting guide

**Deliverables:**
- Complete documentation
- Production deployment
- Monitoring dashboard

---

## 📊 Success Metrics

### Performance
- [ ] Average response time < 2 seconds (p95)
- [ ] Streaming first token < 500ms
- [ ] Cache hit rate > 60%
- [ ] Uptime > 99.5%

### Quality
- [ ] Guide Agent accuracy > 80% on golden tasks
- [ ] User satisfaction score > 4/5
- [ ] Zero PII leakage incidents
- [ ] All prompts versioned and auditable

### Cost
- [ ] Cost per query < $0.10
- [ ] Total monthly cost < $7K
- [ ] Token efficiency > 70% (cached vs fresh)

---

## 🚨 Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| GPT-5 API instability | Fallback to GPT-4o, implement retry logic |
| High token costs | Aggressive caching, context compression |
| Slow response times | Streaming responses, optimize prompts |
| PII leakage | Strict RBAC, audit all tool outputs |
| Vector store costs | Start with pgvector (free), migrate to Pinecone if needed |

---

## 🎯 Phase 1 Deliverables Checklist

- [ ] Dexi Orchestrator Service deployed to production
- [ ] Guide Agent operational with 3 tools
- [ ] Console Sidebar Copilot integrated
- [ ] RAG pipeline ingesting Nexus docs
- [ ] Observability dashboard live
- [ ] Cost tracking operational
- [ ] API documentation complete
- [ ] >80% test coverage
- [ ] Load tested (50 concurrent users)
- [ ] Security audit passed

---

## 🔜 Next Steps (Phase 2)

- Add Interview Agent (prompt optimization)
- Add Transcript Agent (normalization, PII redaction)
- Add Labeling Agent (label suggestions)
- Extend to Mosaic module
- Add Inline Assists to Console
- Add Command Palette

---

**Ready to build!** 🚀
