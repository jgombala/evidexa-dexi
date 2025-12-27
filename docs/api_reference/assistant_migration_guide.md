# Assistants → Responses Migration (Dexi Summary)

The Assistants API is deprecated. Dexi uses the Responses API and dashboard-managed prompts.

## Mapping
- Assistant → Prompt (dashboard)
- Thread → Conversation
- Run → Response
- Run steps → Output items

## What Dexi does
- Uses prompt YAML locally and references prompt IDs in Responses when available.
- Manages conversation state and tool loops in the service.
- Uses Vector Stores for RAG instead of Assistants File Search.

## Actions for Nexus/Clarity/Mosaic
1. Use Responses API for all new integrations.
2. Use dashboard prompts for prompt versioning.
3. Avoid Assistants/Threads/Runs endpoints.
