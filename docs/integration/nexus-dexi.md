# Nexus → Dexi Integration (V1)

Dexi is internal-only. Nexus calls Dexi using an Entra ID token obtained via OBO and sends streaming requests to `/api/chat`.

## Auth flow (OBO)
1. User signs into Nexus via MSAL.
2. Nexus receives a user JWT for Nexus.
3. Nexus uses OBO to request a Dexi JWT with `aud` = Dexi App ID.
4. Nexus calls Dexi with `Authorization: Bearer <token>`.

## Required claims
- `iss`: Entra issuer
- `aud`: Dexi App ID
- `sub`: user ID
- `azp`: Nexus client ID
- `roles`: App roles (admin/manager/analyst/viewer)
- `tid`: tenant ID

## Streaming request
```bash
curl -N http://dexi.internal/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I create a campaign?",
    "context": {"userId":"u1","role":"analyst","applicationId":"nexus"},
    "stream": true
  }'
```

## Notes
- Use `agentHint` to target a specific agent (e.g., `transcript`).
- `applicationId` controls UI route scoping and RAG store selection.
