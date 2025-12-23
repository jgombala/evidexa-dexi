# Requirements Document

## Introduction

Dexi is a multi-agent AI orchestration microservice that serves as the cognitive layer across the entire Evidexa ecosystem. The service provides specialized AI agents for behavioral data processing, transcript analysis, labeling assistance, trait extraction, export validation, and contextual guidance. Dexi operates as a platform-wide service that multiple Evidexa applications (Nexus Console, Clarity, Mosaic, voice-service, synthetic-generator) integrate with to access sophisticated AI capabilities. This phase focuses on establishing the core orchestrator service, tool registry, and Guide Agent functionality.

## Glossary

- **Dexi Orchestrator**: The central service that manages multi-agent AI requests, tool routing, and response coordination
- **Agent**: A specialized AI assistant with specific tools and capabilities (Guide, Interview, Transcript, Labeling, etc.)
- **Tool Registry**: The versioned registry of functions and services that agents can invoke
- **OpenAI Assistant**: The front-end orchestrator for each agent, configured with specific prompts and tools
- **LLM Adapter**: Pluggable interface for different language model providers (OpenAI, Anthropic, Gemini, Perplexity)
- **Policy Router**: Component that selects the appropriate LLM adapter based on task type
- **Context Services**: Vector stores, feature stores, and schema registries that provide context to agents
- **Client Applications**: Evidexa services that consume Dexi's capabilities
- **RAG Pipeline**: Retrieval-Augmented Generation system for document and data search

## Requirements

### Requirement 1

**User Story:** As a client application developer, I want to integrate with Dexi's multi-agent system through REST APIs, so that I can access specialized AI capabilities for my users.

#### Acceptance Criteria

1. THE Dexi Orchestrator SHALL expose REST API endpoints for agent interactions including /api/chat, /api/agents/{agentId}/invoke, and /api/tools/{toolId}/execute
2. THE Dexi Orchestrator SHALL route requests to appropriate agents based on task type and context
3. THE Dexi Orchestrator SHALL return structured responses with agent outputs, tool results, and confidence scores
4. THE Dexi Orchestrator SHALL support both synchronous and asynchronous execution modes for long-running tasks
5. THE Dexi Orchestrator SHALL provide OpenAPI specification documenting all agent capabilities and tool contracts

### Requirement 2

**User Story:** As a system architect, I want Dexi to implement a comprehensive multi-agent architecture, so that specialized AI capabilities can be provided for different domain tasks.

#### Acceptance Criteria

1. THE Dexi Orchestrator SHALL implement at least 8 specialized agents: Guide, Interview, Waveform, Transcript, Labeling, Trait, Export, and Rationales
2. EACH agent SHALL be implemented as an OpenAI Assistant with specific system prompts, tool access, and retrieval indices
3. THE Dexi Orchestrator SHALL route requests to single or multiple agents based on task complexity and requirements
4. EACH agent SHALL have defined inputs, outputs, failure modes, and success metrics
5. THE Dexi Orchestrator SHALL synthesize responses from multiple agents when required for complex tasks

### Requirement 3

**User Story:** As a system administrator, I want Dexi to implement a comprehensive tool registry, so that agents can access versioned, governed functions and services.

#### Acceptance Criteria

1. THE Tool Registry SHALL manage versioned tools with strict JSON schemas for inputs and outputs
2. THE Tool Registry SHALL enforce RBAC validation before tool execution based on user permissions
3. THE Tool Registry SHALL support tools that call external LLMs, internal services, or deterministic functions
4. THE Tool Registry SHALL log all tool executions with input parameters, outputs, versions, and performance metrics
5. THE Tool Registry SHALL implement caching for frequently accessed tool results with configurable TTL

### Requirement 4

**User Story:** As a data scientist, I want the Guide Agent to provide contextual assistance and documentation search, so that users can get help with Evidexa workflows and features.

#### Acceptance Criteria

1. THE Guide Agent SHALL implement DocsSearch, UINavigator, and RBACInspector tools
2. WHEN a user requests help, THE Guide Agent SHALL search relevant documentation using the RAG Pipeline
3. THE Guide Agent SHALL return responses with citations to source documentation and suggested actions
4. THE Guide Agent SHALL validate user permissions before suggesting actions or revealing information
5. THE Guide Agent SHALL maintain conversation context and provide step-by-step guidance for complex workflows

### Requirement 5

**User Story:** As a system architect, I want Dexi agents to use GPT-5 as the quarterback with specialized tools powered by optimal LLMs, so that orchestration is consistent while execution is optimized per task type.

#### Acceptance Criteria

1. EACH Dexi Agent SHALL be powered by OpenAI GPT-5 as the primary orchestrator and reasoning engine
2. THE Tool Registry SHALL implement tools that internally use specialized LLMs: Anthropic for summarization, Gemini for generation, Perplexity for retrieval
3. THE GPT-5 Agent SHALL decide which tools to invoke based on task requirements and synthesize tool results into coherent responses
4. THE Tool Registry SHALL abstract LLM implementation details so agents interact with consistent tool interfaces
5. THE Dexi Orchestrator SHALL track performance and costs per tool and underlying LLM provider for optimization

### Requirement 6

**User Story:** As a system administrator, I want comprehensive observability and governance, so that I can monitor AI operations, ensure compliance, and track costs.

#### Acceptance Criteria

1. THE Dexi Orchestrator SHALL log all agent interactions with timestamps, user context, agent selections, and tool executions
2. THE Dexi Orchestrator SHALL track token usage, costs, and performance metrics per agent and LLM provider
3. THE Dexi Orchestrator SHALL implement versioned prompts with approval workflows and A/B testing capabilities
4. THE Dexi Orchestrator SHALL provide audit trails linking decisions to evidence spans and rule versions
5. THE Dexi Orchestrator SHALL implement PII detection and redaction in all logs and responses

### Requirement 7

**User Story:** As a performance-conscious organization, I want Dexi to provide fast, scalable responses with multiple performance modes, so that user workflows are not interrupted.

#### Acceptance Criteria

1. THE Dexi Orchestrator SHALL support Fast mode (p50 < 500ms), Balanced mode (p50 < 2s), and Deep mode (async with notifications)
2. THE Dexi Orchestrator SHALL implement streaming responses for real-time user feedback
3. THE Dexi Orchestrator SHALL achieve cache hit rates above 60% for frequently accessed data
4. THE Dexi Orchestrator SHALL implement context compression and conversation memory management
5. THE Dexi Orchestrator SHALL provide performance monitoring with alerts for latency threshold breaches

### Requirement 8

**User Story:** As a security and compliance officer, I want Dexi to implement comprehensive data protection and access controls, so that sensitive behavioral data remains secure.

#### Acceptance Criteria

1. THE Dexi Orchestrator SHALL implement RBAC validation before all agent and tool executions
2. THE Dexi Orchestrator SHALL pseudonymize participant data before LLM processing
3. THE Dexi Orchestrator SHALL implement rate limiting per client application, user, and agent type
4. THE Dexi Orchestrator SHALL authenticate all requests using JWT tokens with role-based scopes
5. THE Dexi Orchestrator SHALL maintain immutable audit logs with consent linkage and data retention policies