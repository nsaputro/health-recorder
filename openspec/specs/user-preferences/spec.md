## Purpose

Manages persistent user preferences for clinical biological sex classification and preferred measurement display units.

## Requirements

### Requirement: User Preferences Persistence
The system SHALL store and retrieve user preference settings including biological sex, lab measurement unit, and weight measurement unit.

#### Scenario: Retrieve user preferences
- **WHEN** a client requests current user preferences
- **THEN** the system returns the stored gender, lab unit, and weight unit settings

### Requirement: Partial Preference Update
The system SHALL allow updating any subset of user preference fields while preserving unchanged preference values.

#### Scenario: Update single preference field
- **WHEN** a client submits an update containing only preferred weight unit
- **THEN** the weight unit is updated while gender and lab unit remain unchanged
