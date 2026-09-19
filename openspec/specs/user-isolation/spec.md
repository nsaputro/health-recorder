## Purpose

Enforces multi-user data isolation and authentication across Home Assistant ingress proxy headers and direct standalone access.

## Requirements

### Requirement: Ingress User Identity Resolution
The system SHALL extract user identity from Home Assistant ingress headers only when verified by the supervisor ingress signature header.

#### Scenario: Ingress request authenticated
- **WHEN** a request arrives with X-Ingress-Path and X-Remote-User-Id headers
- **THEN** the request context is bound to the corresponding Home Assistant user ID

### Requirement: Impersonation Prevention
The system SHALL reject or sanitize untrusted X-Remote-User headers when the supervisor X-Ingress-Path header is absent.

#### Scenario: Direct port access without ingress
- **WHEN** a request arrives on the direct port without the X-Ingress-Path header
- **THEN** remote user headers are ignored and the request defaults to standalone context

### Requirement: Strict Per-User Data Isolation
The system SHALL scope all health data queries, inserts, updates, deletes, credentials, and preferences strictly to the active user ID.

#### Scenario: Cross-user data access prevented
- **WHEN** a user attempts to access or modify a record belonging to another user ID
- **THEN** the system returns a 404 Not Found error preventing cross-tenant leakage
