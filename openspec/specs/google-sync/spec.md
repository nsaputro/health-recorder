## Purpose

Synchronizes local health metrics and vital signs to Google Health and Google Sheets using user-authenticated OAuth2 credentials.

## Requirements

### Requirement: OAuth2 Credential Management
The system SHALL handle Google OAuth2 authorization code exchange, per-user token persistence, and automatic access token refreshing.

#### Scenario: Connect Google account
- **WHEN** a user completes OAuth authorization and returns with a valid code
- **THEN** tokens are securely stored for that user and status reports connected

### Requirement: Google Health Synchronization
The system SHALL synchronize compatible metrics including body weight, heart rate, and blood glucose to the Google Health API v4.

#### Scenario: Sync metric to Google Health
- **WHEN** a sync trigger executes for unsynced weight or glucose records
- **THEN** records are transmitted to Google Health and marked as synced

### Requirement: Google Sheets Synchronization
The system SHALL synchronize all health metrics and lab results to a dedicated user spreadsheet, creating the sheet schema on first run.

#### Scenario: Append records to spreadsheet
- **WHEN** a sync trigger runs for unsynced records
- **THEN** entries are appended to the user Google Sheet and marked as synced to sheets

### Requirement: Sync Logging and Audit
The system SHALL record audit log entries for every synchronization attempt detailing service, record type, status, and error messages.

#### Scenario: Log sync error
- **WHEN** a Google API synchronization call encounters an error
- **THEN** a failure log entry is recorded with error details and records remain unsynced
