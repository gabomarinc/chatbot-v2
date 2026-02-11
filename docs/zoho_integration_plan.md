# Zoho CRM Integration Plan

This document outlines the steps required to integrate Zoho CRM with the Konsul Agent.

## 1. Prerequisites (User Actions)

You need to register a "Server-based Application" in the [Zoho Developer Console](https://api-console.zoho.com/).

### Steps:
1.  **Add Client:** Select "Server-based Applications".
2.  **Client Details:**
    *   **Client Name:** Konsul Bot
    *   **Homepage URL:** `https://tudominio.com` (or your dashboard URL)
    *   **Authorized Redirect URIs:** `http://localhost:3000/api/oauth/zoho/callback` (Local testing) and `https://tudominio.com/api/oauth/zoho/callback` (Production).

### Required Credentials:
Please provide:
1.  **Client ID**
2.  **Client Secret**
3.  **Zoho Data Center** (e.g., `.com`, `.eu`, `.in`)

## 2. Implementation Steps (Developer)

### Phase 1: Database & Schema
- [ ] Add `ZOHO` to `IntegrationProvider` enum in Prisma.
- [ ] Create `ZohoToken` model (or extend `AgentIntegration`) to store `access_token`, `refresh_token`, `api_domain`, and `expires_at`.

### Phase 2: OAuth Flow
- [ ] Create generic OAuth handler for Zoho (`src/app/api/oauth/zoho/route.ts`).
- [ ] Implement token exchange (Code -> Tokens).
- [ ] Implement token refresh logic (Middleware or Helper).

### Phase 3: Agent Capabilities (Tools)
- [ ] **Create Lead:** Tool for the agent to create a new Lead/Contact in Zoho.
- [ ] **Search:** Tool to find existing customers.

## 3. Configuration
- [ ] Add Zoho card to user dashboard (`/integrations`).
- [ ] "Connect" button that triggers the OAuth flow.
