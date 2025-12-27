# Dexi Auth with Microsoft Entra ID (MSAL)

Dexi is a central service. Each calling app (e.g., Nexus, Clarity, Mosaic) authenticates users with its own identity provider. For Nexus, use Microsoft Entra ID with MSAL and the On-Behalf-Of (OBO) flow to obtain a Dexi-scoped JWT.

## High-level flow
1. User signs into Nexus via MSAL.
2. Nexus receives a user JWT for the Nexus API.
3. Nexus uses OBO to request a **Dexi access token** with audience set to the Dexi App Registration.
4. Dexi validates the token using the Entra JWKS endpoint and enforces roles.

## Internal-only access (no API keys)
Dexi is internal and only called by Evidexa apps. We do not use API keys. Access control is enforced via JWT validation and private network controls (VPC/ALB security groups).

## Required Entra App Registration (Dexi)
Create a dedicated Dexi App Registration in Entra and configure:
- **Application ID (Client ID)**: used as the JWT `aud` value.
- **Expose an API**: define scope `api://<dexi-client-id>/access_as_user`.
- **App roles**: define `admin`, `manager`, `analyst`, `viewer` and assign to users/groups.
- **Token configuration**: include `roles`, `azp`, `tid`, `appid`/`sub` as needed.

## MASL note (Nexus)
MSAL does not mint tokens. The Entra app registration must be configured to emit required claims for Dexi when requesting the Dexi scope. Nexus uses OBO to exchange a Nexus token for a Dexi-audience token.

## Expected JWT claims
- `iss`: `https://login.microsoftonline.com/<tenantId>/v2.0`
- `aud`: Dexi client ID (App Registration)
- `sub`: user ID
- `azp`: calling client ID (Nexus client ID)
- `roles`: app roles assigned to the user
- `tid`: tenant ID

Dexi validates:
- `iss` matches issuer
- `aud` matches Dexi client ID
- `tid` matches tenant ID
- `azp` is in allowed client IDs

## OBO flow (Nexus)
Nexus receives the user's token and exchanges it for a Dexi-scoped token.

Pseudocode:
```ts
const oboToken = await msalClient.acquireTokenOnBehalfOf({
  authority: `https://login.microsoftonline.com/${tenantId}`,
  oboAssertion: userToken,
  scopes: [`api://${dexiClientId}/access_as_user`],
});

// Use oboToken.accessToken to call Dexi
```

## Dexi configuration
Dexi uses multi-issuer validation via `DEXI_ISSUERS_JSON` or `DEXI_ISSUERS_PATH`.

Example (JSON):
```json
[
  {
    "issuer": "https://login.microsoftonline.com/<tenantId>/v2.0",
    "jwksUri": "https://login.microsoftonline.com/<tenantId>/discovery/v2.0/keys",
    "audience": "<dexi-client-id>",
    "tenantId": "<tenantId>",
    "allowedAzp": ["<nexus-client-id>", "<clarity-client-id>"] ,
    "appId": "nexus"
  }
]
```

## Placeholder values to collect
- `tenantId`: Entra tenant ID
- `audience`: Dexi App Registration client ID
- `allowedAzp`: client IDs for Nexus/Clarity/Mosaic
- `issuer`: `https://login.microsoftonline.com/<tenantId>/v2.0`

## Local development
Recommended: Use `JWT_SECRET` with a locally signed JWT to exercise full validation.\n\n1. Set `JWT_SECRET`, `JWT_ISSUER`, and `JWT_AUDIENCE` in `.env`.\n2. Optionally set `LOCAL_*` values (tenant, azp, roles, app).\n3. Run `npm run auth:mint` to mint a JWT.\n4. Call Dexi with `Authorization: Bearer <token>`.\n\nFallback: `DEXI_DEV_AUTH=1` with `x-dev-*` headers for quick iteration.
