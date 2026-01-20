# iSynera AI Healthcare Platform - Database Schema Documentation

## Overview

This document provides comprehensive documentation for the PostgreSQL database schema used by the iSynera AI Healthcare Platform. The database is designed to support HIPAA-compliant healthcare operations with advanced AI integration capabilities.

## Database Configuration

- **Database Type**: PostgreSQL 16
- **Provider**: Neon Serverless PostgreSQL
- **ORM**: Drizzle ORM with TypeScript
- **Migration Tool**: Drizzle Kit
- **Connection**: Pooled connections via @neondatabase/serverless

## Core Tables

### 1. Users Table
**Purpose**: Authentication, role management, and user profiles
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50),                    -- admin, doctor, nurse, clinical_staff, etc.
    department VARCHAR(100),
    license_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT false,
    require_password_change BOOLEAN DEFAULT false,
    profile_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    first_name TEXT,
    last_name TEXT,
    last_login TIMESTAMP
);
```

### 2. Patients Table
**Purpose**: Comprehensive patient information management
```sql
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    patient_name TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    patient_id TEXT UNIQUE,
    diagnosis TEXT,
    physician TEXT,
    insurance_info JSONB,
    -- Personal Information
    first_name TEXT,
    last_name TEXT,
    middle_name TEXT,
    gender TEXT,
    ssn TEXT,
    mrn TEXT,                           -- Medical Record Number
    email TEXT,
    phone_number TEXT,
    emergency_contact JSONB,
    address JSONB,
    -- Medical Information
    allergies TEXT[],
    medical_history JSONB,
    current_medications JSONB,
    preferred_pharmacy INTEGER REFERENCES pharmacies(id),
    primary_care_physician TEXT,
    -- Care Management
    care_history JSONB,
    risk_factors TEXT[],
    special_notes TEXT,
    -- Audit Fields
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_by INTEGER REFERENCES users(id)
);
```

## Healthcare Workflow Tables

### 3. Referrals Table
**Purpose**: Patient referral processing and document management
```sql
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    referral_date TIMESTAMP NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',    -- pending, processing, complete, missing_info
    ocr_status TEXT DEFAULT 'pending',         -- pending, processing, complete, failed
    document_url TEXT,
    extracted_data JSONB,
    missing_fields TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Eligibility Verifications Table
**Purpose**: Insurance eligibility verification tracking
```sql
CREATE TABLE eligibility_verifications (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    insurance_type TEXT,                       -- medicaid, medicare, mco
    status TEXT NOT NULL DEFAULT 'pending',    -- pending, verified, failed
    verification_data JSONB,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Homebound Assessments Table
**Purpose**: CMS-compliant homebound status determination
```sql
CREATE TABLE homebound_assessments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    assessment_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',    -- qualified, not_qualified, pending, review_needed
    ai_recommendation JSONB,
    cms_compliant BOOLEAN,
    rationale TEXT,
    ai_verdict TEXT,
    assessed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## AI and Transcription Tables

### 6. AI Transcription Sessions Table
**Purpose**: AI-powered transcription and SOAP note generation
```sql
CREATE TABLE ai_transcription_sessions (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    patient_id INTEGER REFERENCES patients(id),
    user_id INTEGER REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'active',     -- active, processing, completed
    transcription_text TEXT,
    soap_notes JSONB,
    ai_summary TEXT,
    audio_file_path TEXT,
    ai_summary_audio_path TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 7. AI Intake Processing Table
**Purpose**: AI-powered document processing and analysis
```sql
CREATE TABLE ai_intake_processing (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    original_filename TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    processing_status TEXT NOT NULL DEFAULT 'pending',
    extracted_data JSONB,
    ai_analysis JSONB,
    confidence_score DECIMAL(5,2),
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 8. AI Referral Summaries Table
**Purpose**: AI-generated clinical summaries and risk assessments
```sql
CREATE TABLE ai_referral_summaries (
    id SERIAL PRIMARY KEY,
    referral_id INTEGER REFERENCES referrals(id),
    patient_id INTEGER REFERENCES patients(id),
    summary_data JSONB NOT NULL,
    clinical_overview TEXT,
    risk_assessment TEXT,
    recommendations TEXT,
    urgency_prediction VARCHAR(30),
    confidence_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Prescription Management Tables

### 9. Pharmacies Table
**Purpose**: Pharmacy information and fax management
```sql
CREATE TABLE pharmacies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    phone_number TEXT,
    fax_number TEXT NOT NULL,
    email TEXT,
    chain_type TEXT,                    -- cvs, walgreens, rite_aid, independent
    is_active BOOLEAN DEFAULT true,
    coordinates JSONB,                  -- {lat, lng} for distance calculations
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 10. Prescriptions Table
**Purpose**: Electronic prescription management
```sql
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    prescription_number TEXT,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    instructions TEXT NOT NULL,
    refills_remaining INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',    -- pending, sent, filled, cancelled
    prescribed_by INTEGER NOT NULL REFERENCES users(id),
    prescribed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiration_date TIMESTAMP NOT NULL,
    digital_signature TEXT,
    ai_recommendations JSONB,
    doctor_id INTEGER REFERENCES users(id),
    pharmacy_id INTEGER REFERENCES pharmacies(id),
    doctor_notes TEXT,
    fax_status TEXT,                           -- pending, sent, delivered, failed
    fax_delivery_confirmation JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 11. Patient Medications Table
**Purpose**: Current medication tracking and history
```sql
CREATE TABLE patient_medications (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    prescribed_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    allergies TEXT[],
    side_effects TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Billing and Claims Management Tables

### 12. Payers Table
**Purpose**: Insurance payer information and billing rules
```sql
CREATE TABLE payers (
    id SERIAL PRIMARY KEY,
    payer_name VARCHAR(200) NOT NULL,
    payer_type VARCHAR(50) NOT NULL,           -- medicare, medicaid, commercial, mco
    payer_id VARCHAR(100) UNIQUE,
    billing_rules JSONB,
    denial_patterns JSONB,
    contact_info JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 13. Claims Table
**Purpose**: Insurance claims processing and management
```sql
CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    claim_id VARCHAR(50) UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES patients(id),
    provider_id INTEGER REFERENCES users(id),
    payer_id INTEGER REFERENCES payers(id),
    claim_type VARCHAR(20) NOT NULL,           -- cms1500, ub04, dental
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    service_date TIMESTAMP NOT NULL,
    submission_date TIMESTAMP,
    total_amount INTEGER NOT NULL,             -- in cents
    paid_amount INTEGER DEFAULT 0,
    denied_amount INTEGER DEFAULT 0,
    claim_data JSONB,
    submission_data JSONB,
    scrub_results JSONB,
    risk_score INTEGER,                        -- 0-100 denial risk
    ai_flags TEXT[],
    clearinghouse_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Audit and Compliance Tables

### 14. Audit Logs Table
**Purpose**: System-wide audit trail for compliance
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,                      -- login, logout, create, update, delete, view
    resource TEXT NOT NULL,                    -- user, patient, referral, document
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resource_type VARCHAR(50)
);
```

### 15. Patient Audit Logs Table
**Purpose**: HIPAA-compliant patient data access tracking
```sql
CREATE TABLE patient_audit_logs (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,               -- view, create, update, delete, export
    field_changed VARCHAR(100),
    old_value TEXT,                            -- encrypted for sensitive data
    new_value TEXT,                            -- encrypted for sensitive data
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    access_method VARCHAR(50),                 -- web, api, mobile
    compliance_flags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Workflow Management Tables

### 16. Tasks Table
**Purpose**: Task management and workflow automation
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    task_type TEXT NOT NULL,                   -- missing_info, verification, assessment, scheduling
    priority TEXT NOT NULL DEFAULT 'medium',   -- low, medium, high, urgent
    status TEXT NOT NULL DEFAULT 'pending',    -- pending, in_progress, completed, cancelled
    description TEXT NOT NULL,
    assigned_to TEXT,
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 17. Appointments Table
**Purpose**: Appointment scheduling and management
```sql
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    staff_id TEXT,
    appointment_type TEXT,                     -- soc, routine, evaluation
    scheduled_date TIMESTAMP NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled, completed, cancelled
    location JSONB,                           -- address, coordinates
    travel_distance TEXT,
    ai_recommendation JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 18. Sessions Table
**Purpose**: Session management for authentication
```sql
CREATE TABLE sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);
```

## Indexes and Performance Optimization

The database includes comprehensive indexing for optimal performance:

- **Patient lookups**: Indexed on patient_id, date_of_birth, is_active, is_deleted
- **Referral processing**: Indexed on patient_id, status
- **Prescription management**: Indexed on patient_id, status
- **Appointment scheduling**: Indexed on patient_id, scheduled_date
- **Task management**: Indexed on patient_id, status, priority
- **Audit compliance**: Indexed on user_id, action, resource
- **Claims processing**: Indexed on patient_id, status, service_date
- **Session management**: Indexed on expire timestamp

## HIPAA Compliance Features

1. **Comprehensive Audit Trails**: All patient data access is logged with user, timestamp, and action details
2. **Soft Deletes**: Patient records are marked as deleted rather than physically removed
3. **Encryption Support**: Sensitive fields support encrypted storage
4. **Access Control**: Role-based permissions with detailed logging
5. **Data Integrity**: Foreign key constraints ensure referential integrity
6. **Compliance Flags**: Automated compliance checking and flagging

## AI Integration Features

1. **Intelligent Document Processing**: AI-powered OCR and data extraction
2. **Clinical Decision Support**: AI recommendations for assessments and care plans
3. **Automated Transcription**: Voice-to-text with SOAP note generation
4. **Risk Assessment**: AI-powered risk scoring and predictions
5. **Quality Assurance**: Automated compliance checking and validation

## Migration and Maintenance

- **Schema Versioning**: Tracked through Drizzle migrations
- **Automated Triggers**: Updated timestamps and audit logging
- **Data Validation**: Check constraints and foreign key integrity
- **Backup Strategy**: Point-in-time recovery with Neon PostgreSQL
- **Monitoring**: Performance metrics and query optimization

## Environment Configuration

The database requires the following environment variables:

```env
DATABASE_URL=postgresql://username:password@host:port/database
PGDATABASE=database_name
PGHOST=hostname
PGPASSWORD=password
PGPORT=5432
PGUSER=username
```

## Getting Started

1. **Run Migration**: Execute `node database-migration.js` to set up the schema
2. **Verify Setup**: Check that all tables are created successfully
3. **Configure Access**: Ensure proper user roles and permissions
4. **Test Connection**: Verify application can connect and perform operations

## Support and Maintenance

For database-related issues:
1. Check audit logs for access patterns
2. Monitor performance metrics
3. Review index usage and optimization opportunities
4. Ensure HIPAA compliance requirements are met
5. Regular backup verification and disaster recovery testing