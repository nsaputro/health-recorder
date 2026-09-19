## Purpose

Manages quantitative laboratory diagnostic test results, supported test types, unit conversions, and clinical reference ranges.

## Requirements

### Requirement: Recording Lab Results
The system SHALL store diagnostic test results with validated test type, numeric value, unit, and optional laboratory facility name.

#### Scenario: Log lipid panel result
- **WHEN** a client submits a total cholesterol result with numeric value and unit
- **THEN** the record is saved with the designated test type and unsynced status

### Requirement: Clinical Reference Ranges and Metadata
The system SHALL expose supported laboratory test categories, default units, alternative clinical names, and normal reference ranges.

#### Scenario: Fetch reference ranges
- **WHEN** a client requests laboratory test metadata
- **THEN** the system returns all configured test types with default units and clinical thresholds

### Requirement: Gender-Adjusted Reference Ranges
The system SHALL adjust clinical reference ranges for gender-dependent tests including hemoglobin, creatinine, uric acid, and HDL when a gender parameter is provided.

#### Scenario: Retrieve female reference ranges
- **WHEN** a client requests lab types with gender set to female
- **THEN** the response reflects female-specific reference thresholds for gender-dependent tests

### Requirement: Unit Normalization and Conversion
The system SHALL provide unit conversion factors and support dual-unit representations for tests including glucose, cholesterol, HbA1c, creatinine, and hemoglobin.

#### Scenario: Display alternate unit representation
- **WHEN** a lab result is retrieved in a unit differing from the user preference
- **THEN** the interface normalizes and displays the equivalent converted value
