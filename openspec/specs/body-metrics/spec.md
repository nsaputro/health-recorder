## Purpose

Records and tracks body weight and height measurements with automated BMI computation and historical trend querying.

## Requirements

### Requirement: Recording Body Weight and Height
The system SHALL store weight in kilograms and optional height in centimeters, automatically calculating BMI when height is provided.

#### Scenario: Add weight and height entry
- **WHEN** a client submits a valid weight in kg and height in cm
- **THEN** the system stores the entry with the computed BMI value

### Requirement: Querying Body Metrics
The system SHALL return recorded body metrics ordered chronologically descending with optional time range and pagination filters.

#### Scenario: Query weight history
- **WHEN** a client requests body metrics with a since date parameter
- **THEN** the system returns records measured on or after that date in descending order

### Requirement: Updating and Deleting Body Metrics
The system SHALL allow updating or deleting an existing metric record by ID, recalculating BMI on update and resetting cloud sync flags.

#### Scenario: Update weight entry
- **WHEN** a client updates the weight or height of an existing entry
- **THEN** the entry is updated, BMI is recalculated, and cloud sync flags are reset to false
