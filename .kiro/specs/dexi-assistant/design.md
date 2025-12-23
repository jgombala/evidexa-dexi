# Design Document

## Overview

Dexi is a sophisticated multi-agent AI orchestration microservice that serves as the cognitive layer for the entire Evidexa ecosystem. The system leverages OpenAI's latest GPT-5 agent development framework, including the new OpenAI Agents JS library and advanced tool node capabilities. This enables a quarterback pattern where GPT-5 agents orchestrate specialized tools powered by optimal LLMs for specific tasks.

The architecture supports 8+ specialized agents (Guide, Interview, Waveform, Transcript, Labeling, Trait, Export, Rationales) that client applications can invoke through REST APIs. Each agent is implemented using OpenAI's latest agent framework with advanced tool orchestration, streaming capabilities, and sophisticated workflow management.

**Phase 1 Focus**: This design prioritizes the core orchestrator service, tool registry, and Guide Agent functionality as the foundation for the multi-agent system. Additional specialized agents will be implemented in subsequent phases, building on the established patterns and infrastructure.

## Architecture

### Thoughtful AWS Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Applications                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │Nexus Console│ │   Clarity   │ │voice-service│ │synthetic-gen││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS/WSS (Direct or via ALB)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 AWS ECS Fargate Cluster                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Dexi Orchestrator Service                   │   │
│  │         (Express.js + OpenAI Agents Framework)         │   │
│  │                                                         │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │   │
│  │  │ Guide   │ │Interview│ │Transcript│ │ Export  │      │   │
│  │  │ Agent   │ │ Agent   │ │ Agent   │ │ Agent   │      │   │
│  │  │(GPT-5)  │ │(GPT-5)  │ │(GPT-5)  │ │(GPT-5)  │      │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Managed Data Layer                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ RDS Aurora      │ │ ElastiCache     │ │ Simple Vector   │   │
│  │ PostgreSQL      │ │ Redis Cluster   │ │ Store (Phase 1) │   │
│  │ (Serverless v2) │ │ (Multi-AZ)      │ │ (pgvector/S3)   │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External LLM APIs (Direct)                    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   OpenAI API    │ │  Anthropic API  │ │  Perplexity     │   │
│  │    (GPT-5)      │ │   (Claude-3.5)  │ │     API         │   │
│  │  Primary Agent  │ │ Specialized     │ │ RAG/Search      │   │
│  │  Orchestration  │ │ Tool Backend    │ │ Tool Backend    │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Design Rationale - AWS Services That Add Clear Value:**

**✅ ECS Fargate (High Value)**
- **Why**: Eliminates server management, auto-scaling, integrated with AWS ecosystem
- **Alternative**: Self-managed EC2 instances require significant ops overhead
- **Decision**: Use Fargate for container orchestration

**✅ RDS Aurora Serverless v2 (High Value)**  
- **Why**: Auto-scaling PostgreSQL, backup/recovery, multi-AZ availability
- **Alternative**: Self-managed PostgreSQL requires DBA expertise and ops overhead
- **Decision**: Use Aurora for primary database needs

**✅ ElastiCache Redis (High Value)**
- **Why**: Managed Redis with clustering, backup, and monitoring
- **Alternative**: Self-managed Redis requires ops overhead and clustering complexity
- **Decision**: Use ElastiCache for session and cache management

**❌ AWS API Gateway (Low Value for Phase 1)**
- **Why Not**: Adds latency (~10-50ms), complexity, and cost without clear benefit
- **Alternative**: Direct ALB → ECS with Express.js handles routing efficiently
- **Decision**: Skip API Gateway initially, use Application Load Balancer

**❌ Amazon OpenSearch (Premature Optimization)**
- **Why Not**: Complex setup, high cost, overkill for Phase 1 vector needs
- **Alternative**: Start with pgvector in PostgreSQL or simple S3-based vector store
- **Decision**: Defer until vector search requirements are proven at scale

**🤔 Direct LLM APIs vs AWS Bedrock**
- **OpenAI GPT-5**: Direct API for latest features, agent framework, handoffs
- **Claude/Others**: Direct APIs for now, evaluate Bedrock later for cost optimization
- **Decision**: Direct APIs for maximum capability, flexibility, and latest features

### Agent Architecture Pattern

Each agent leverages OpenAI's GPT-5 agent framework with tools and handoff-based workflows:

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent (e.g., Guide Agent)                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           OpenAI GPT-5 Agent Framework              │   │
│  │                                                     │   │
│  │  Agent({                                            │   │
│  │    name: "guide-agent",                             │   │
│  │    model: "gpt-5",                                  │   │
│  │    instructions: "You are the Guide Agent...",     │   │
│  │    tools: [docsSearch, rbacCheck, ...handoffs]     │   │
│  │  })                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Tool Execution & Handoffs              │   │
│  │                                                     │   │
│  │  1. GPT-5 agent analyzes user request              │   │
│  │  2. Selects appropriate tools to execute           │   │
│  │  3. Tools call specialized LLMs internally         │   │
│  │  4. Agent can handoff to other agents if needed    │   │
│  │  5. Streaming responses via StreamedRunResult      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

Multi-Agent Handoff Flow:
Guide Agent → handoff() → Transcript Agent → handoff() → Export Agent
```

## Modern Agent Development Approach

### OpenAI GPT-5 Agent Framework Integration

Based on OpenAI's latest GPT-5 agent development capabilities, Dexi leverages:

1. **GPT-5 Reasoning**: Advanced reasoning capabilities with the latest GPT-5 model for superior orchestration
2. **Tool System**: Sophisticated `tool()` functions that can internally use specialized LLMs (Claude, Gemini, Perplexity)
3. **Handoff Workflows**: Agent-to-agent communication via `handoff()` system for complex multi-agent workflows
4. **Streaming Execution**: Real-time streaming via `StreamedRunResult` and `run()` with streaming support
5. **MCP Integration**: Built-in Model Context Protocol support for external tool integration
6. **Agent Serialization**: Agents can be serialized, cloned, and converted to tools for composition

### Agent Framework Benefits

- **GPT-5 Powered**: Latest reasoning capabilities with superior orchestration and decision-making
- **Simplified Architecture**: OpenAI handles conversation state, tool routing, and execution flow
- **Native Streaming**: Built-in streaming support via `StreamedRunResult` for real-time responses
- **Multi-Agent Workflows**: Seamless agent handoffs for complex, specialized task chains
- **Tool Composition**: Agents can be converted to tools, enabling recursive agent architectures
- **MCP Ecosystem**: Access to external tools and services via Model Context Protocol

### Research-Validated Architecture

**Confirmed Capabilities from SDK Investigation:**
- ✅ **GPT-5 Model Support**: Native `gpt-5` model available in both OpenAI Agents and AI SDK
- ✅ **Handoff System**: `handoff()` function enables seamless multi-agent coordination
- ✅ **Tool Orchestration**: `tool()` functions support async execution with streaming
- ✅ **Multi-Provider Integration**: AI SDK provides type-safe access to OpenAI, Anthropic, Google
- ✅ **Streaming Support**: `StreamedRunResult` and AI SDK streaming for real-time responses
- ✅ **MCP Integration**: Built-in Model Context Protocol support for external services

**Hybrid Implementation Strategy:**
- **OpenAI Agents**: Primary orchestration with GPT-5 for reasoning and agent coordination
- **AI SDK**: Multi-provider tool implementations for optimal LLM selection per task
- **Combined Benefits**: Best of both frameworks for maximum flexibility and performance

### Tool Architecture

```typescript
// Modern tool implementation using OpenAI Agents framework
import { tool } from '@openai/agents';
import { PerplexityAdapter, ClaudeAdapter } from './llm-adapters';

const docsSearchTool = tool({
  name: "docs_search",
  description: "Search Evidexa documentation using advanced RAG",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      filters: { type: "object", description: "Optional filters" }
    },
    required: ["query"]
  },
  execute: async ({ query, filters }) => {
    console.log(`Searching documentation for: ${query}`);
    
    // Use Perplexity for enhanced retrieval (specialized LLM)
    const perplexityAdapter = new PerplexityAdapter();
    const searchResults = await perplexityAdapter.search(query, filters);
    
    return {
      results: searchResults,
      confidence: searchResults.length > 0 ? 0.85 : 0.3,
      source: "documentation",
      timestamp: new Date().toISOString()
    };
  }
});

const summarizeTranscriptTool = tool({
  name: "summarize_transcript",
  description: "Summarize transcript content using advanced language understanding",
  parameters: {
    type: "object",
    properties: {
      transcript: { type: "string", description: "Transcript text to summarize" },
      style: { type: "string", enum: ["brief", "detailed"], description: "Summary style" }
    },
    required: ["transcript"]
  },
  execute: async ({ transcript, style = "brief" }) => {
    console.log(`Summarizing transcript (${style} style)`);
    
    // Use Claude for superior summarization (specialized LLM)
    const claudeAdapter = new ClaudeAdapter();
    const summary = await claudeAdapter.summarize(transcript, style);
    
    return {
      summary,
      originalLength: transcript.length,
      summaryLength: summary.length,
      compressionRatio: summary.length / transcript.length,
      style
    };
  }
});
```
```

## Components and Interfaces

### 1. Express.js Application Router (Simplified)

**Responsibilities:**
- Request authentication and authorization per Requirement 8.4
- Rate limiting per client/user/agent per Requirement 8.3 (using express-rate-limit)
- Request validation and routing per Requirements 1.1, 1.2
- Response formatting and error handling
- OpenAPI specification generation and documentation per Requirement 1.5
- Performance monitoring and alerting per Requirement 7.5

**Simplified Architecture Benefits:**
- **Lower Latency**: Direct routing without API Gateway overhead (~10-50ms saved per request)
- **Reduced Complexity**: Single service to manage instead of API Gateway + Lambda/ECS
- **Cost Efficiency**: No API Gateway charges (~$3.50 per million requests)
- **Easier Development**: Standard Express.js patterns, familiar debugging

**Implementation:**
```typescript
import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateJWT, validateRequest } from './middleware';

const app = express();

// Rate limiting per Requirement 8.3
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use(rateLimiter);
app.use(authenticateJWT); // JWT auth per Requirement 8.4
app.use(express.json({ limit: '10mb' }));

// OpenAPI documentation endpoint per Requirement 1.5
app.get('/api/docs', (req, res) => {
  const openAPISpec = generateOpenAPISpec({
    agents: agentRegistry.getAll(),
    tools: toolRegistry.getAll()
  });
  res.json(openAPISpec);
});

// Agent endpoints
app.post('/api/chat', validateRequest(chatSchema), chatHandler);
app.post('/api/agents/:agentId/invoke', validateRequest(agentSchema), agentHandler);
```

**Key Interfaces:**
```typescript
// Primary chat interface - supports both sync and async modes
POST /api/chat
{
  message: string,
  context: {
    userId: string,
    role: "admin" | "manager" | "analyst" | "viewer", // RBAC roles
    applicationId: string,
    currentRoute?: string,
    sessionId?: string,
    campaignId?: string
  },
  agentHint?: string, // Suggest specific agent
  mode?: "fast" | "balanced" | "deep", // Performance modes per Requirement 7.1
  async?: boolean // Support for long-running tasks per Requirement 1.4
}

// Direct agent invocation with RBAC validation
POST /api/agents/{agentId}/invoke
{
  task: string,
  parameters: object,
  context: Context // Validated against agent's rbacRoles per Requirement 3.2
}

// Tool execution (for debugging/testing) with RBAC enforcement
POST /api/tools/{toolId}/execute
{
  parameters: object,
  context: Context // Validated against tool's rbacRoles per Requirement 3.2
}

// OpenAPI specification endpoint per Requirement 1.5
GET /api/docs
// Returns comprehensive OpenAPI spec documenting all agent capabilities
```

### 2. Agent Manager

**Responsibilities:**
- Agent lifecycle management
- Request routing to appropriate agents
- Multi-agent orchestration for complex tasks
- Conversation thread management

**Agent Registry:**
```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  assistantId: string; // OpenAI Assistant ID per Requirement 2.2
  tools: string[]; // Tool IDs this agent can access
  triggers: string[]; // Keywords/patterns that route to this agent
  capabilities: string[];
  rbacRoles: string[]; // Which user roles can access this agent per Requirement 3.2
  successMetrics: SuccessMetric[]; // Defined success metrics per Requirement 2.4
  failureModes: FailureMode[]; // Defined failure modes per Requirement 2.4
}

// Phase 1: Guide Agent implementation per Requirement 4
const agents: Agent[] = [
  {
    id: "guide",
    name: "Guide Agent",
    description: "Provides contextual help and navigation assistance for Evidexa workflows",
    assistantId: "asst_guide_v1",
    tools: ["docs-search", "ui-navigator", "rbac-inspector"], // Per Requirement 4.1
    triggers: ["help", "how to", "navigate", "guide", "documentation"],
    capabilities: ["documentation", "navigation", "permissions", "workflow_guidance"],
    rbacRoles: ["admin", "manager", "analyst", "viewer"],
    successMetrics: [
      { name: "response_relevance", threshold: 0.8 },
      { name: "citation_accuracy", threshold: 0.9 },
      { name: "user_satisfaction", threshold: 0.85 }
    ],
    failureModes: [
      { type: "no_documentation_found", fallback: "suggest_contact_support" },
      { type: "permission_denied", fallback: "explain_rbac_requirements" }
    ]
  }
  // Phase 2: Additional agents (Interview, Waveform, Transcript, Labeling, Trait, Export, Rationales)
  // Will be implemented following the same pattern per Requirement 2.1
];
```

### 3. Tool Registry

**Responsibilities:**
- Tool versioning and schema management per Requirement 3.1
- RBAC enforcement for tool access per Requirement 3.2
- Tool execution with logging and metrics per Requirements 3.4, 6.2
- Caching of tool results per Requirement 3.5
- Performance tracking and cost monitoring per Requirements 5.5, 6.2

**Tool Execution Monitoring:**
```typescript
interface ToolExecutionMetrics {
  toolId: string;
  version: string;
  executionTime: number;
  tokensUsed: number;
  cost: number;
  cacheHit: boolean;
  llmProvider: string;
  userId: string;
  timestamp: Date;
  success: boolean;
  errorType?: string;
}

// Comprehensive logging per Requirements 3.4, 6.1, 6.2
class ToolExecutionLogger {
  async logExecution(metrics: ToolExecutionMetrics): Promise<void> {
    // Store metrics for cost tracking per Requirement 6.2
    await this.metricsStore.record(metrics);
    
    // Generate alerts for performance issues per Requirement 7.5
    if (metrics.executionTime > this.getLatencyThreshold(metrics.toolId)) {
      await this.alertManager.sendLatencyAlert(metrics);
    }
    
    // Track cost per LLM provider per Requirement 5.5
    await this.costTracker.updateCosts(metrics);
  }
}
```

**Tool Interface:**
```typescript
interface Tool {
  id: string;
  name: string;
  version: string; // Versioned tools per Requirement 3.1
  description: string;
  inputSchema: JSONSchema; // Strict JSON schemas per Requirement 3.1
  outputSchema: JSONSchema; // Strict JSON schemas per Requirement 3.1
  rbacRoles: string[]; // RBAC validation per Requirement 3.2
  cacheTTL?: number; // Configurable TTL per Requirement 3.5
  llmProvider?: "openai" | "anthropic" | "gemini" | "perplexity" | "internal";
  execute: (params: any, context: Context) => Promise<ToolResult>;
}

interface ToolResult {
  data: any;
  metadata: {
    version: string;
    executionTime: number;
    tokensUsed?: number;
    cost?: number;
    cacheHit: boolean;
    llmProvider?: string;
  };
}

// Guide Agent Tools per Requirement 4.1
const docsSearchTool: Tool = {
  id: "docs-search",
  name: "Documentation Search",
  version: "1.0.0",
  description: "Search Evidexa documentation using RAG pipeline per Requirement 4.2",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      filters: { 
        type: "object", 
        properties: {
          module: { type: "string", enum: ["nexus", "clarity", "mosaic"] },
          section: { type: "string" }
        },
        optional: true 
      }
    },
    required: ["query"]
  },
  outputSchema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            content: { type: "string" },
            source: { type: "string" },
            confidence: { type: "number" },
            citation: { type: "string" }
          }
        }
      },
      totalResults: { type: "number" }
    }
  },
  rbacRoles: ["admin", "manager", "analyst", "viewer"],
  cacheTTL: 3600, // 1 hour cache per Requirement 3.5
  llmProvider: "perplexity", // Specialized LLM per Requirement 5.2
  execute: async (params, context) => {
    // RAG pipeline implementation with citations per Requirement 4.3
    const startTime = Date.now();
    const results = await perplexityRAGSearch(params.query, params.filters);
    
    return {
      data: {
        results: results.map(r => ({
          content: r.content,
          source: r.source,
          confidence: r.confidence,
          citation: r.citation // Citations per Requirement 4.3
        })),
        totalResults: results.length
      },
      metadata: {
        version: "1.0.0",
        executionTime: Date.now() - startTime,
        tokensUsed: results.tokensUsed,
        cost: results.cost,
        cacheHit: false,
        llmProvider: "perplexity"
      }
    };
  }
};

// UI Navigator tool per Requirement 4.1
const uiNavigatorTool: Tool = {
  id: "ui-navigator",
  name: "UI Navigation Assistant",
  version: "1.0.0",
  description: "Provides navigation suggestions and step-by-step guidance",
  inputSchema: {
    type: "object",
    properties: {
      currentRoute: { type: "string" },
      targetAction: { type: "string" },
      userRole: { type: "string" }
    },
    required: ["targetAction", "userRole"]
  },
  outputSchema: {
    type: "object",
    properties: {
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string" },
            route: { type: "string" },
            description: { type: "string" },
            requiresPermission: { type: "string", optional: true }
          }
        }
      },
      warnings: { type: "array", items: { type: "string" } }
    }
  },
  rbacRoles: ["admin", "manager", "analyst", "viewer"],
  cacheTTL: 1800, // 30 minutes
  llmProvider: "internal",
  execute: async (params, context) => {
    // Navigation logic with permission validation per Requirement 4.4
    return await generateNavigationSteps(params, context);
  }
};

// RBAC Inspector tool per Requirement 4.1
const rbacInspectorTool: Tool = {
  id: "rbac-inspector",
  name: "RBAC Permission Inspector",
  version: "1.0.0",
  description: "Validates user permissions before suggesting actions per Requirement 4.4",
  inputSchema: {
    type: "object",
    properties: {
      userId: { type: "string" },
      requestedAction: { type: "string" },
      resource: { type: "string" }
    },
    required: ["userId", "requestedAction"]
  },
  outputSchema: {
    type: "object",
    properties: {
      hasPermission: { type: "boolean" },
      requiredRole: { type: "string" },
      explanation: { type: "string" }
    }
  },
  rbacRoles: ["admin", "manager", "analyst", "viewer"],
  cacheTTL: 300, // 5 minutes
  llmProvider: "internal",
  execute: async (params, context) => {
    // Permission validation logic per Requirement 4.4
    return await validateUserPermissions(params, context);
  }
};
```

### 4. Context Engineering & Memory Management

**Context Engineering Principles:**
- **Layered Context**: Immediate, historical, and adaptive context layers
- **Dynamic Prioritization**: Context relevance scoring and pruning
- **Task-Specific Context**: Different context structures for different agent types
- **Memory-Informed Context**: Long-term memory enhances current context

**Long-Term Memory Architecture:**
```typescript
interface MemorySystem {
  // Working memory (current session)
  working: {
    conversationHistory: Message[];
    activeContext: UserContext;
    agentState: AgentState;
    temporaryPreferences: Preference[];
  };
  
  // Episodic memory (interaction history)
  episodic: {
    sessions: SessionMemory[];
    interactions: InteractionMemory[];
    outcomes: OutcomeMemory[];
    feedback: FeedbackMemory[];
  };
  
  // Semantic memory (learned knowledge)
  semantic: {
    userProfile: UserProfile;
    preferences: LearnedPreference[];
    patterns: BehavioralPattern[];
    expertise: DomainExpertise;
  };
  
  // Memory operations
  operations: {
    store: (memory: Memory, type: MemoryType) => Promise<void>;
    retrieve: (query: MemoryQuery) => Promise<Memory[]>;
    consolidate: (sessionId: string) => Promise<void>;
    forget: (criteria: RetentionPolicy) => Promise<void>;
  };
}
```

**Context Adaptation Strategies:**
- **User Expertise Detection**: Adapt complexity based on user behavior patterns
- **Preference Learning**: Remember and apply user communication preferences
- **Task Context Optimization**: Tailor context structure to specific agent tasks
- **Cross-Session Continuity**: Maintain relevant context across sessions

### 5. Pragmatic AWS Data Services

**Simple Vector Storage (Phase 1 - Pragmatic Approach):**
```typescript
// Start simple, scale when needed
interface VectorStore {
  // Option 1: PostgreSQL with pgvector extension (in RDS Aurora)
  storeEmbedding(id: string, embedding: number[], metadata: any): Promise<void>;
  searchSimilar(queryEmbedding: number[], limit: number): Promise<SearchResult[]>;
  
  // Option 2: S3 + in-memory index for small datasets
  // Option 3: Upgrade to OpenSearch when scale demands it
}

class SimpleVectorStore implements VectorStore {
  constructor(private db: PostgreSQLClient) {}
  
  async storeEmbedding(id: string, embedding: number[], metadata: any): Promise<void> {
    // Use pgvector extension in Aurora PostgreSQL
    await this.db.query(`
      INSERT INTO embeddings (id, embedding, metadata) 
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET embedding = $2, metadata = $3
    `, [id, embedding, metadata]);
  }
  
  async searchSimilar(queryEmbedding: number[], limit: number): Promise<SearchResult[]> {
    // Vector similarity search using pgvector
    const result = await this.db.query(`
      SELECT id, metadata, (embedding <-> $1) as distance
      FROM embeddings
      ORDER BY embedding <-> $1
      LIMIT $2
    `, [queryEmbedding, limit]);
    
    return result.rows;
  }
}
```

**ElastiCache Redis (High Value Managed Service):**
- High-performance in-memory caching with cluster mode
- Caches user data, permissions, and session context  
- Stores conversation threads and agent state
- Automatic failover and backup to S3
- TTL-based cache invalidation with Redis expiration

**Why This Approach:**
- **pgvector in Aurora**: Leverages existing PostgreSQL, simpler ops, good performance for moderate scale
- **Upgrade Path**: Can migrate to OpenSearch when vector search becomes a bottleneck
- **Cost Effective**: No additional service costs until scale demands it
- **Operational Simplicity**: One less service to manage, monitor, and secure

**Long-Term Memory System (PostgreSQL + Vector Store):**
- Persistent user interaction history and preferences
- Cross-session context continuity and learning
- Behavioral pattern recognition and adaptation
- Privacy-compliant memory management with retention policies

**Prompt Management and A/B Testing System:**
```typescript
// Versioned prompts with approval workflows per Requirement 6.3
interface PromptVersion {
  id: string;
  agentId: string;
  version: string;
  content: string;
  status: "draft" | "approved" | "active" | "deprecated";
  approvedBy: string;
  approvedAt: Date;
  metadata: {
    description: string;
    changes: string[];
    performanceMetrics?: PromptMetrics;
  };
}

interface ABTestConfig {
  id: string;
  name: string;
  agentId: string;
  variants: {
    control: { promptVersion: string; weight: number };
    treatment: { promptVersion: string; weight: number };
  };
  metrics: string[]; // e.g., ["response_quality", "user_satisfaction", "task_completion"]
  startDate: Date;
  endDate: Date;
  status: "active" | "completed" | "paused";
}

class PromptManager {
  async getActivePrompt(agentId: string, userId?: string): Promise<string> {
    // Check for active A/B tests per Requirement 6.3
    const activeTest = await this.getActiveABTest(agentId);
    
    if (activeTest && userId) {
      const variant = this.assignUserToVariant(userId, activeTest);
      return await this.getPromptVersion(variant.promptVersion);
    }
    
    // Return current active prompt
    return await this.getCurrentPrompt(agentId);
  }
  
  private assignUserToVariant(userId: string, test: ABTestConfig): any {
    // Consistent assignment based on user ID hash
    const hash = this.hashUserId(userId);
    const threshold = test.variants.control.weight / 100;
    return hash < threshold ? test.variants.control : test.variants.treatment;
  }
}
```

**RDS Aurora PostgreSQL (Schema Registry):**
- Serverless PostgreSQL with automatic scaling (0.5-128 ACUs)
- Manages versioned tool schemas and agent configurations
- Stores prompt templates and system instructions
- Tracks tool and agent performance metrics per Requirement 6.2
- Automatic backup and point-in-time recovery
- Multi-AZ deployment for high availability

**Audit and Compliance Layer:**
```typescript
// Comprehensive audit logging per Requirements 6.1, 6.4, 6.5, 8.5
interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  agentId: string;
  toolsUsed: string[];
  request: {
    message: string; // PII-redacted per Requirement 6.5
    context: UserContext;
  };
  response: {
    message: string; // PII-redacted per Requirement 6.5
    confidence: number;
    evidenceSpans: EvidenceSpan[]; // Link to evidence per Requirement 6.4
  };
  performance: {
    totalLatency: number;
    tokensUsed: number;
    cost: number;
  };
  compliance: {
    piiDetected: boolean;
    redactionApplied: boolean;
    consentLinked: boolean; // Per Requirement 8.5
    retentionPolicy: string;
  };
}

class PIIDetectionService {
  async detectAndRedact(text: string): Promise<{ redacted: string; piiFound: boolean }> {
    // Implement PII detection per Requirement 6.5
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone
      // Additional patterns for behavioral data context
    ];
    
    let redacted = text;
    let piiFound = false;
    
    piiPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        piiFound = true;
        redacted = redacted.replace(pattern, '[REDACTED]');
      }
    });
    
    return { redacted, piiFound };
  }
}
```

### 5. Direct LLM Integration (Optimized for Capability)

**OpenAI GPT-5 Agent Framework (Direct API):**
```typescript
import { Agent, tool, run, handoff, StreamedRunResult } from '@openai/agents';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

class DexiAgent {
  private agent: Agent;
  private handoffs: any[] = [];
  private secretsManager: SecretsManagerClient;

  constructor() {
    this.secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION });
  }

  async initialize(config: AgentConfig): Promise<void> {
    // Retrieve API keys from AWS Secrets Manager (clear value here)
    const openaiKey = await this.getSecret('dexi/openai-api-key');
    
    // Create tools with direct LLM backends
    const tools = config.tools.map(toolConfig => 
      tool({
        name: toolConfig.name,
        description: toolConfig.description,
        parameters: toolConfig.schema,
        execute: async (params) => {
          // Tools use direct API calls for maximum capability and speed
          return await toolConfig.execute(params);
        }
      })
    );

    // Initialize GPT-5 agent with direct OpenAI API
    this.agent = new Agent({
      name: config.name,
      model: "gpt-5", // Latest model with full agent framework support
      instructions: config.systemPrompt,
      tools: [...tools, ...this.handoffs],
      apiKey: openaiKey
    });
  }

  async execute(message: string, context: Context): Promise<StreamedRunResult> {
    // Direct execution with OpenAI's agent framework
    return await run(this.agent, message, {
      stream: true,
      context: context
    });
  }

  private async getSecret(secretId: string): Promise<string> {
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await this.secretsManager.send(command);
    return response.SecretString!;
  }
}
```

**Direct API Tool Adapters (Maximum Capability):**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Direct Anthropic API for specialized tasks
class AnthropicToolAdapter {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY // From AWS Secrets Manager
    });
  }

  async summarizeTranscript(transcript: string): Promise<Summary> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Summarize this transcript concisely: ${transcript}`
        }
      ]
    });

    return {
      summary: response.content[0].text,
      model: 'claude-3-5-sonnet',
      provider: 'anthropic-direct',
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      cost: this.calculateCost(response.usage)
    };
  }

  private calculateCost(usage: any): number {
    // Claude 3.5 Sonnet pricing: $3/1M input, $15/1M output tokens
    return (usage.input_tokens * 0.000003) + (usage.output_tokens * 0.000015);
  }
}

// Direct OpenAI API for embeddings and other tasks
class OpenAIToolAdapter {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY // From AWS Secrets Manager
    });
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text
    });

    return response.data[0].embedding;
  }
}

// Perplexity for enhanced search/RAG
class PerplexityToolAdapter {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY; // From AWS Secrets Manager
  }

  async searchDocumentation(query: string, filters?: any): Promise<SearchResults> {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'user',
            content: `Search for: ${query}. Focus on Evidexa documentation and workflows.`
          }
        ]
      })
    });

    const data = await response.json();
    return {
      results: this.parseSearchResults(data.choices[0].message.content),
      provider: 'perplexity-direct',
      model: 'sonar-large'
    };
  }
}
```

**Why Direct APIs Over AWS Bedrock:**
- **Latest Features**: Direct access to newest models and capabilities
- **Lower Latency**: No additional AWS service layer
- **Full Control**: Access to all API parameters and features  
- **Cost Transparency**: Direct billing and usage tracking
- **Flexibility**: Easy to switch providers or add new ones
- **Development Speed**: Standard SDK patterns, better documentation

## Data Models

### Core Entities

```typescript
// Enhanced user context with memory and adaptation
interface UserContext {
  // Immediate context
  userId: string;
  role: "admin" | "manager" | "analyst" | "viewer";
  permissions: string[];
  applicationId: string;
  sessionId?: string;
  campaignId?: string;
  currentRoute?: string;
  
  // Long-term memory context
  memory?: {
    userPreferences: UserPreferences;
    interactionHistory: InteractionSummary[];
    learnedPatterns: BehavioralPattern[];
    expertiseLevel: ExpertiseLevel;
  };
  
  // Dynamic adaptation context
  adaptive?: {
    taskComplexity: number;
    preferredResponseStyle: "concise" | "detailed" | "technical";
    contextPriority: ContextPriority[];
    sessionGoals: string[];
  };
}

// Agent execution request
interface AgentRequest {
  agentId: string;
  message: string;
  context: UserContext;
  mode: "fast" | "balanced" | "deep";
  threadId?: string;
}

// Agent response
interface AgentResponse {
  agentId: string;
  message: string;
  suggestedActions?: Action[];
  toolsUsed: ToolExecution[];
  confidence: number;
  threadId: string;
  metadata: {
    tokensUsed: number;
    cost: number;
    latency: number;
    cacheHit: boolean;
  };
}

// Tool execution record
interface ToolExecution {
  toolId: string;
  version: string;
  input: any;
  output: any;
  llmProvider?: string;
  tokensUsed?: number;
  latency: number;
  cacheHit: boolean;
  timestamp: Date;
}

// Conversation thread
interface ConversationThread {
  id: string;
  userId: string;
  agentId: string;
  messages: Message[];
  context: UserContext;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}
```

### Agent-Specific Models

```typescript
// Guide Agent specific
interface NavigationSuggestion {
  action: string;
  route: string;
  description: string;
  requiresPermission?: string;
}

// Transcript Agent specific
interface TranscriptAnalysis {
  turns: Turn[];
  qaPairs: QAPair[];
  piiRedacted: boolean;
  qualityScore: number;
  issues: Issue[];
}

// Labeling Agent specific
interface LabelSuggestion {
  turnId: string;
  suggestedLabels: Label[];
  confidence: number;
  reasoning: string;
}
```

## Error Handling

### Error Categories

1. **Authentication Errors (401)** - Per Requirement 8.4
   - Invalid JWT token
   - Expired credentials
   - Missing authentication

2. **Authorization Errors (403)** - Per Requirements 3.2, 8.1
   - Insufficient permissions for agent
   - Tool access denied
   - RBAC violation

3. **Validation Errors (400)** - Per Requirement 3.1
   - Invalid request schema
   - Missing required parameters
   - Malformed context data

4. **Agent Errors (422)** - Per Requirement 2.4
   - Agent not found
   - Tool execution failure
   - LLM provider unavailable

5. **System Errors (500)**
   - Database connection failure
   - Vector store unavailable
   - Internal service errors

6. **Performance Errors (503)** - Per Requirement 7.5
   - Latency threshold breached
   - Rate limit exceeded
   - Service temporarily unavailable

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
    suggestedAction?: string;
  };
  requestId: string;
  timestamp: Date;
}
```

### Fallback Strategies

1. **LLM Provider Fallbacks** - Per Requirement 5.5:
   - Primary: GPT-5 → Fallback: GPT-4o
   - Tool-specific: Claude → GPT-4o, Gemini → GPT-4o, Perplexity → OpenAI embeddings

2. **Agent Fallbacks** - Per Requirement 2.4:
   - Specialized agent unavailable → Route to Guide Agent
   - Tool failure → Return partial response with explanation
   - Multi-agent synthesis failure → Return individual agent responses

3. **Context Service Fallbacks**:
   - Vector store down → Use cached results or simplified responses
   - Feature store unavailable → Fetch fresh data (slower)
   - Memory system unavailable → Use session-only context

4. **Performance Mode Fallbacks** - Per Requirement 7.1:
   - Deep mode timeout → Automatically switch to Balanced mode
   - Balanced mode latency breach → Switch to Fast mode
   - Fast mode failure → Return cached response if available

## Testing Strategy

### Unit Testing
- Tool execution with mocked LLM responses
- Agent routing logic
- Context enrichment functions
- RBAC validation

### Integration Testing
- End-to-end agent workflows
- Multi-tool orchestration
- LLM provider integration
- Database and cache operations

### Performance Testing
- Load testing with 50+ concurrent users
- Latency testing for different performance modes
- Cache hit rate optimization
- Token usage efficiency

### Golden Task Evaluation
```typescript
interface GoldenTask {
  id: string;
  description: string;
  input: AgentRequest;
  expectedAgent: string;
  expectedTools: string[];
  expectedResponsePattern: RegExp;
  maxLatency: number; // Per Requirement 7.1 performance targets
  minConfidence: number;
  requirementsCovered: string[]; // Track requirement coverage
}

// Golden tasks covering core Guide Agent functionality per Requirements 4.1-4.5
const goldenTasks: GoldenTask[] = [
  {
    id: "guide-help-campaign",
    description: "User asks how to create a campaign - tests documentation search",
    input: {
      agentId: "guide",
      message: "How do I create a new campaign?",
      context: { userId: "test", role: "analyst", applicationId: "nexus", ... },
      mode: "balanced"
    },
    expectedAgent: "guide",
    expectedTools: ["docs-search", "rbac-inspector"],
    expectedResponsePattern: /step.*create.*campaign/i,
    maxLatency: 2000, // Balanced mode target per Requirement 7.1
    minConfidence: 0.8,
    requirementsCovered: ["4.2", "4.3", "4.4"]
  },
  {
    id: "guide-navigation-help",
    description: "User needs navigation assistance - tests UI navigator",
    input: {
      agentId: "guide",
      message: "I'm lost, how do I get to the transcript analysis page?",
      context: { userId: "test", role: "manager", currentRoute: "/dashboard", ... },
      mode: "fast"
    },
    expectedAgent: "guide",
    expectedTools: ["ui-navigator", "rbac-inspector"],
    expectedResponsePattern: /navigate.*transcript.*analysis/i,
    maxLatency: 500, // Fast mode target per Requirement 7.1
    minConfidence: 0.85,
    requirementsCovered: ["4.1", "4.4", "4.5"]
  },
  {
    id: "guide-permission-check",
    description: "User asks about permissions - tests RBAC validation",
    input: {
      agentId: "guide",
      message: "Can I export campaign data?",
      context: { userId: "test", role: "viewer", ... },
      mode: "balanced"
    },
    expectedAgent: "guide",
    expectedTools: ["rbac-inspector"],
    expectedResponsePattern: /permission.*export.*viewer/i,
    maxLatency: 2000,
    minConfidence: 0.9,
    requirementsCovered: ["4.4", "8.1"]
  },
  {
    id: "guide-context-maintenance",
    description: "Multi-turn conversation - tests context maintenance",
    input: {
      agentId: "guide",
      message: "What about labeling workflows?",
      context: { 
        userId: "test", 
        role: "analyst", 
        conversationHistory: [
          { role: "user", content: "How do I analyze transcripts?" },
          { role: "assistant", content: "Here's how to analyze transcripts..." }
        ]
      },
      mode: "balanced"
    },
    expectedAgent: "guide",
    expectedTools: ["docs-search"],
    expectedResponsePattern: /labeling.*workflow/i,
    maxLatency: 2000,
    minConfidence: 0.8,
    requirementsCovered: ["4.5"]
  }
];
```

## Research Validation Summary

This design has been validated through comprehensive investigation of the latest OpenAI and AI SDK capabilities:

### ✅ **Confirmed Feasible Technologies**
- **GPT-5 Model**: Available and working in both OpenAI Agents and AI SDK - supports Requirement 5.1
- **Agent Framework**: OpenAI Agents provides robust `Agent`, `tool`, `handoff`, and `run` functions - enables Requirements 2.1, 2.2
- **Multi-Provider Support**: AI SDK enables seamless integration with OpenAI, Anthropic, Google - supports Requirement 5.2
- **Streaming**: Native streaming support via `StreamedRunResult` and AI SDK streaming - enables Requirement 7.2
- **Tool Orchestration**: Sophisticated tool system with async execution and error handling - supports Requirements 3.3, 3.4
- **Multi-Agent Coordination**: Handoff system enables seamless agent-to-agent task routing - enables Requirement 2.3

### 🎯 **Recommended Implementation Approach**
1. **Primary Framework**: OpenAI Agents for GPT-5 orchestration and agent coordination per Requirement 5.1
2. **Tool Implementation**: AI SDK for multi-provider tool backends (Claude, Gemini, Perplexity) per Requirement 5.2
3. **Streaming**: Leverage both frameworks' streaming capabilities for real-time responses per Requirement 7.2
4. **Multi-Agent**: Use handoff system for complex workflows requiring specialist agents per Requirement 2.3

### 📊 **Technical Feasibility: HIGH**
- All core components use production-ready, documented APIs
- GPT-5 is available and performant for orchestration tasks per Requirement 5.1
- Multi-LLM routing is straightforward with AI SDK providers per Requirement 5.2
- Streaming and real-time capabilities are built-in per Requirement 7.2
- Performance targets achievable: Fast mode <500ms, Balanced <2s, Deep async per Requirement 7.1
- Cost estimates remain valid ($4K-7K/month for Phase 1) with multi-LLM optimization per Requirement 5.5

### 🔒 **Security and Compliance Validation**
- JWT authentication with role-based scopes supports Requirement 8.4
- RBAC validation at agent and tool levels supports Requirements 8.1, 3.2
- Rate limiting capabilities support Requirement 8.3
- PII detection and redaction patterns support Requirements 6.5, 8.2
- Audit logging with immutable trails supports Requirement 8.5

## Production-Validated Agent Patterns

### Context Engineering Best Practices (From Manus Production Experience)

**KV-Cache Optimization (Critical for Performance & Cost):**
- **Stable Prompt Prefixes**: Never include timestamps or dynamic data in system prompts
- **Append-Only Context**: Avoid modifying previous messages to maintain cache validity  
- **Deterministic Serialization**: Ensure consistent JSON key ordering for cache hits
- **Cache Breakpoint Management**: Strategic placement for optimal cache utilization

**Tool Management Patterns:**
- **Mask Don't Remove**: Use logit masking instead of dynamic tool removal to preserve cache
- **Consistent Tool Prefixes**: Group tools with consistent naming (`transcript_`, `labeling_`, `export_`)
- **Response Prefill**: Use constrained decoding to guide tool selection without context changes

**Attention Management:**
- **Recitation Patterns**: Agents create and update task lists to maintain focus
- **Error Preservation**: Keep failed attempts in context for learning and adaptation
- **Diversity Injection**: Introduce controlled variation to prevent pattern lock-in

### Long-Term Memory Architecture (From LangGraph Production Patterns)

**Two-Layer Memory System:**
```typescript
interface MemoryArchitecture {
  // Thread-level (short-term) - managed by LangGraph checkpoints
  working: {
    conversationHistory: Message[];
    activeContext: Context;
    agentState: AgentState;
    temporaryPreferences: Preference[];
  };
  
  // Cross-thread (long-term) - persistent across sessions
  persistent: {
    userProfile: UserProfile;
    preferences: {
      triage: string;
      response: string;
      calendar: string;
      background: string;
    };
    interactionHistory: InteractionSummary[];
    learnedPatterns: BehavioralPattern[];
  };
}
```

**Memory Manager Pattern:**
```typescript
// Dedicated LLM for surgical memory updates
class MemoryManager {
  private memoryLLM: LLM;
  
  async updateMemory(
    namespace: string,
    currentMemory: string,
    feedback: Message[],
    updateType: 'triage' | 'response' | 'calendar'
  ): Promise<string> {
    const prompt = `
    # Role: Memory Profile Manager for ${namespace}
    
    # Rules:
    - NEVER overwrite the entire profile
    - ONLY add new information or update contradicted facts
    - PRESERVE all other information
    
    # Current Profile:
    ${currentMemory}
    
    # User Feedback:
    ${feedback.map(f => f.content).join('\n')}
    
    # Task: Update profile based on feedback
    `;
    
    return await this.memoryLLM.invoke(prompt);
  }
}
```

**Feedback-Driven Learning:**
- **Trigger-Based Updates**: Memory only updates on explicit user feedback (edits, corrections)
- **Surgical Modifications**: Never overwrite entire profiles, only targeted updates
- **Namespace Organization**: Separate memory spaces for different preference types
- **Validation Loops**: Memory manager validates updates before persistence

## Memory-Enhanced Agent Capabilities

### Context Engineering Best Practices
Based on production AI agent patterns, Dexi implements:

1. **Layered Context Architecture**
   - **Immediate**: Current session, route, and task context
   - **Historical**: Previous interactions and learned patterns  
   - **Adaptive**: Dynamic context based on user expertise and preferences

2. **Memory-Informed Decision Making**
   - Agents remember user preferences and communication styles
   - Historical context informs current responses and suggestions
   - Cross-session learning improves agent accuracy over time

3. **Privacy-Compliant Memory Management**
   - Configurable retention policies for different data types
   - User control over memory storage and deletion
   - Compliance with data protection regulations

### Implementation Benefits
- **Personalized Experience**: Agents adapt to individual user patterns
- **Improved Efficiency**: Reduced need to re-explain preferences and context
- **Better Outcomes**: Memory-informed decisions lead to more relevant assistance
- **Continuous Learning**: System improves through accumulated experience

### Production Implementation Patterns

**Cache-Optimized Tool Implementation:**
```typescript
// Example: Documentation search with production optimizations
const docsSearchTool = tool({
  name: 'docs_search', // Consistent prefix pattern
  description: 'Search Evidexa documentation with caching',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      module: { type: 'string', enum: ['nexus', 'mosaic', 'clarity'] }
    }
  },
  execute: async ({ query, module }) => {
    // Cache-friendly: deterministic serialization
    const cacheKey = JSON.stringify({ query, module }, 
      Object.keys({ query, module }).sort());
    
    // Use file system as external context (Manus pattern)
    const resultPath = `./memory/docs_search_${
      Buffer.from(cacheKey).toString('base64')}.json`;
    
    // Check persistent cache first
    if (await fs.exists(resultPath)) {
      return await fs.readJSON(resultPath);
    }
    
    // Execute search with Perplexity
    const result = await perplexitySearch(query, module);
    
    // Store for future reference (restorable compression)
    await fs.writeJSON(resultPath, result);
    return result;
  }
});
```

**Memory-Enhanced Agent with Recitation:**
```typescript
class DexiAgentWithMemory extends DexiAgent {
  async executeWithMemoryAndRecitation(message: string, context: Context) {
    // 1. Fetch personalized preferences from long-term memory
    const preferences = await this.memorySystem.getPreferences(context.userId);
    
    // 2. Create/update task list for attention management (Manus pattern)
    const taskList = await this.createTaskList(message, context);
    
    // 3. Inject stable context (cache-friendly)
    const stableContext = {
      systemPrompt: this.getStableSystemPrompt(), // No timestamps!
      userPreferences: preferences,
      currentTasks: taskList
    };
    
    // 4. Execute with recitation pattern
    return await this.executeWithRecitation(message, stableContext);
  }
  
  private async createTaskList(message: string, context: Context): Promise<TaskList> {
    // Agent creates todo.md-style task list for focus management
    return {
      mainGoal: this.extractMainGoal(message),
      subTasks: this.breakDownTasks(message),
      completedTasks: [],
      currentFocus: 'initial_analysis'
    };
  }
}
```

**Error-Preserving Execution Pattern:**
```typescript
// Keep errors in context for learning (Manus insight)
async function executeToolWithErrorPreservation(tool: Tool, params: any) {
  try {
    const result = await tool.execute(params);
    return {
      success: true,
      result,
      context: `Successfully executed ${tool.name}`
    };
  } catch (error) {
    // Don't hide the error - keep it for learning
    return {
      success: false,
      error: error.message,
      context: `Failed to execute ${tool.name}: ${error.message}. This provides learning context for future attempts.`
    };
  }
}
```

## AWS Infrastructure and Deployment

### ECS Fargate Deployment Architecture

**Container Strategy:**
```yaml
# docker-compose.yml for local development
version: '3.8'
services:
  dexi-orchestrator:
    build: .
    environment:
      - AWS_REGION=us-east-1
      - NODE_ENV=production
    ports:
      - "3000:3000"
    depends_on:
      - redis
      - postgres

# ECS Task Definition (Fargate)
{
  "family": "dexi-orchestrator",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/dexiTaskRole",
  "containerDefinitions": [
    {
      "name": "dexi-app",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/dexi:latest",
      "portMappings": [{"containerPort": 3000, "protocol": "tcp"}],
      "environment": [
        {"name": "AWS_REGION", "value": "us-east-1"},
        {"name": "NODE_ENV", "value": "production"}
      ],
      "secrets": [
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:account:secret:openai-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/dexi-orchestrator",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**Auto Scaling Configuration:**
```typescript
// CloudFormation template for ECS service with auto-scaling
const ecsServiceTemplate = {
  "DexiECSService": {
    "Type": "AWS::ECS::Service",
    "Properties": {
      "Cluster": {"Ref": "DexiCluster"},
      "TaskDefinition": {"Ref": "DexiTaskDefinition"},
      "DesiredCount": 2,
      "LaunchType": "FARGATE",
      "NetworkConfiguration": {
        "AwsvpcConfiguration": {
          "SecurityGroups": [{"Ref": "DexiSecurityGroup"}],
          "Subnets": [{"Ref": "PrivateSubnet1"}, {"Ref": "PrivateSubnet2"}]
        }
      },
      "LoadBalancers": [{
        "ContainerName": "dexi-app",
        "ContainerPort": 3000,
        "TargetGroupArn": {"Ref": "DexiTargetGroup"}
      }]
    }
  },
  
  "DexiAutoScalingTarget": {
    "Type": "AWS::ApplicationAutoScaling::ScalableTarget",
    "Properties": {
      "MaxCapacity": 10,
      "MinCapacity": 2,
      "ResourceId": {"Fn::Sub": "service/${DexiCluster}/${DexiECSService}"},
      "RoleARN": {"Fn::GetAtt": ["ApplicationAutoScalingRole", "Arn"]},
      "ScalableDimension": "ecs:service:DesiredCount",
      "ServiceNamespace": "ecs"
    }
  }
};
```

### AWS Security and Compliance Implementation

**IAM Roles and Policies:**
```json
{
  "DexiTaskRole": {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "secretsmanager:GetSecretValue"
        ],
        "Resource": [
          "arn:aws:secretsmanager:*:*:secret:dexi/*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ],
        "Resource": [
          "arn:aws:bedrock:*::foundation-model/anthropic.claude-*",
          "arn:aws:bedrock:*::foundation-model/amazon.titan-*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "es:ESHttpPost",
          "es:ESHttpPut",
          "es:ESHttpGet"
        ],
        "Resource": "arn:aws:es:*:*:domain/dexi-search/*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "elasticache:*"
        ],
        "Resource": "*",
        "Condition": {
          "StringEquals": {
            "elasticache:CacheClusterId": "dexi-cache-*"
          }
        }
      },
      {
        "Effect": "Allow",
        "Action": [
          "rds:DescribeDBInstances",
          "rds:Connect"
        ],
        "Resource": "arn:aws:rds:*:*:db:dexi-*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "cloudwatch:PutMetricData"
        ],
        "Resource": "*",
        "Condition": {
          "StringEquals": {
            "cloudwatch:namespace": "Dexi/*"
          }
        }
      }
    ]
  }
}
```

**VPC and Network Security:**
```typescript
// Network isolation and security groups
const networkConfig = {
  vpc: {
    cidr: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true
  },
  
  subnets: {
    public: [
      { cidr: "10.0.1.0/24", az: "us-east-1a" },
      { cidr: "10.0.2.0/24", az: "us-east-1b" }
    ],
    private: [
      { cidr: "10.0.10.0/24", az: "us-east-1a" },
      { cidr: "10.0.20.0/24", az: "us-east-1b" }
    ]
  },
  
  securityGroups: {
    alb: {
      ingress: [
        { port: 443, protocol: "tcp", source: "0.0.0.0/0" },
        { port: 80, protocol: "tcp", source: "0.0.0.0/0" }
      ]
    },
    ecs: {
      ingress: [
        { port: 3000, protocol: "tcp", sourceSecurityGroup: "alb-sg" }
      ],
      egress: [
        { port: 443, protocol: "tcp", destination: "0.0.0.0/0" }, // HTTPS outbound
        { port: 5432, protocol: "tcp", sourceSecurityGroup: "rds-sg" }, // PostgreSQL
        { port: 6379, protocol: "tcp", sourceSecurityGroup: "redis-sg" } // Redis
      ]
    }
  }
};
```

### Cost Optimization and Monitoring

**CloudWatch Dashboards and Alarms:**
```typescript
const monitoringConfig = {
  dashboards: {
    "Dexi-Operations": {
      widgets: [
        {
          type: "metric",
          properties: {
            metrics: [
              ["Dexi/Agents", "RequestCount", "AgentId", "guide"],
              ["Dexi/Tools", "ExecutionDuration", "ToolName", "docs-search"],
              ["AWS/ECS", "CPUUtilization", "ServiceName", "dexi-service"],
              ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "dexi-alb"]
            ],
            period: 300,
            stat: "Average",
            region: "us-east-1",
            title: "Dexi Performance Metrics"
          }
        }
      ]
    }
  },
  
  alarms: [
    {
      name: "Dexi-High-Latency",
      metric: "Dexi/Tools/ExecutionDuration",
      threshold: 5000, // 5 seconds
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 2,
      actions: ["arn:aws:sns:us-east-1:account:dexi-alerts"]
    },
    {
      name: "Dexi-High-Error-Rate",
      metric: "Dexi/Agents/ErrorRate",
      threshold: 0.05, // 5%
      comparisonOperator: "GreaterThanThreshold",
      evaluationPeriods: 3,
      actions: ["arn:aws:sns:us-east-1:account:dexi-alerts"]
    }
  ]
};
```

**Cost Tracking Implementation:**
```typescript
class AWSCostTracker {
  private cloudWatch: CloudWatchClient;
  
  async trackLLMCosts(provider: string, model: string, tokens: number): Promise<void> {
    const costPerToken = this.getCostPerToken(provider, model);
    const cost = tokens * costPerToken;
    
    await this.cloudWatch.send(new PutMetricDataCommand({
      Namespace: 'Dexi/Costs',
      MetricData: [
        {
          MetricName: 'LLMCost',
          Value: cost,
          Unit: 'None',
          Dimensions: [
            { Name: 'Provider', Value: provider },
            { Name: 'Model', Value: model }
          ]
        },
        {
          MetricName: 'TokenUsage',
          Value: tokens,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Provider', Value: provider },
            { Name: 'Model', Value: model }
          ]
        }
      ]
    }));
  }
  
  private getCostPerToken(provider: string, model: string): number {
    const pricing = {
      'openai': {
        'gpt-5': 0.00003, // Example pricing
        'gpt-4o': 0.000015
      },
      'aws-bedrock': {
        'claude-3-5-sonnet': 0.000015,
        'titan-embed': 0.0000002
      }
    };
    
    return pricing[provider]?.[model] || 0;
  }
}
```

## Design Trade-offs and Rationale

### AWS Services: Value-Driven Selection

**Services We're Using (High Value/Low Complexity):**

1. **ECS Fargate** ✅
   - **Value**: Eliminates server management, auto-scaling, integrated monitoring
   - **Complexity**: Low - standard container deployment
   - **Cost**: Reasonable for compute needs
   - **Alternative Rejected**: EC2 instances (high ops overhead)

2. **RDS Aurora Serverless v2** ✅
   - **Value**: Auto-scaling PostgreSQL, backup/recovery, multi-AZ
   - **Complexity**: Low - managed service
   - **Cost**: Pay-per-use scaling
   - **Alternative Rejected**: Self-managed PostgreSQL (high ops overhead)

3. **ElastiCache Redis** ✅
   - **Value**: Managed Redis clustering, backup, monitoring
   - **Complexity**: Low - managed service
   - **Cost**: Reasonable for caching needs
   - **Alternative Rejected**: Self-managed Redis (clustering complexity)

4. **AWS Secrets Manager** ✅
   - **Value**: Secure API key management and rotation
   - **Complexity**: Low - simple integration
   - **Cost**: Low ($0.40/secret/month)
   - **Alternative Rejected**: Environment variables (security risk)

**Services We're NOT Using (Low Value/High Complexity):**

1. **AWS API Gateway** ❌
   - **Why Not**: Adds 10-50ms latency, $3.50/million requests, complexity
   - **Alternative**: Direct ALB → ECS with Express.js (simpler, faster, cheaper)
   - **Future**: Could add later if advanced API management features needed

2. **Amazon OpenSearch** ❌ (Phase 1)
   - **Why Not**: High setup complexity, $200+/month minimum, overkill for initial scale
   - **Alternative**: pgvector in PostgreSQL (simpler, leverages existing DB)
   - **Future**: Migrate when vector search becomes performance bottleneck

3. **AWS Bedrock** ❌ (Phase 1)
   - **Why Not**: Model versions lag behind, limited agent framework support
   - **Alternative**: Direct OpenAI/Anthropic APIs (latest features, full capability)
   - **Future**: Evaluate for cost optimization once usage patterns established

### LLM Strategy: Capability Over Cost Optimization

**Primary Decision: Direct APIs**
- **OpenAI GPT-5**: Latest agent framework, handoffs, reasoning capabilities
- **Anthropic Claude**: Direct API for specialized tasks (summarization, analysis)
- **Perplexity**: Direct API for enhanced search and RAG capabilities

**Rationale:**
- **Phase 1 Priority**: Prove value and capability before optimizing costs
- **Development Speed**: Standard SDKs, better documentation, faster iteration
- **Feature Access**: Latest models and capabilities without AWS service delays
- **Flexibility**: Easy to add/remove providers based on performance

**Future Cost Optimization Path:**
1. **Measure Usage**: Track costs and usage patterns across providers
2. **Evaluate Bedrock**: When usage justifies the complexity trade-off
3. **Hybrid Approach**: Keep GPT-5 direct for orchestration, move tools to Bedrock if cost-effective

This approach prioritizes **speed to market** and **capability validation** over premature cost optimization, while maintaining a clear path to scale and optimize as usage grows.