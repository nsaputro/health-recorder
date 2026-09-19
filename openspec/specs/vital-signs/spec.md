## Purpose

Records vital sign readings including systolic blood pressure, diastolic blood pressure, and heart rate for cardiovascular tracking.

## Requirements

### Requirement: Recording Vital Signs
The system SHALL require at least one measurement among systolic blood pressure, diastolic blood pressure, or heart rate when creating a vital sign record.

#### Scenario: Record blood pressure reading
- **WHEN** a client submits systolic and diastolic blood pressure values
- **THEN** the system persists the vital sign record with timestamps and unsynced status

### Requirement: Querying Vital Signs
The system SHALL return vital signs ordered by measurement date descending with pagination and time window filtering support.

#### Scenario: List vital signs
- **WHEN** a client requests vital signs for a given time window
- **THEN** the system returns matching vital sign readings

### Requirement: Updating and Deleting Vital Signs
The system SHALL allow updating or deleting vital sign records by ID while preserving data integrity and resetting sync state on edit.

#### Scenario: Edit vital sign entry
- **WHEN** a client submits updated systolic or heart rate values for an existing record
- **THEN** the record is modified and sync flags are reset to unsynced
