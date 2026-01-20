-- iSynera AI Healthcare Platform Database Schema
-- PostgreSQL Database Schema with All Tables
-- Generated: July 6, 2025

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS appeal_letters CASCADE;
DROP TABLE IF EXISTS denials CASCADE;
DROP TABLE IF EXISTS claim_line_items CASCADE;
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS payers CASCADE;
DROP TABLE IF EXISTS patient_audit_logs CASCADE;
DROP TABLE IF EXISTS prescription_audit_logs CASCADE;
DROP TABLE IF EXISTS medication_interactions CASCADE;
DROP TABLE IF EXISTS patient_medications CASCADE;
DROP TABLE IF EXISTS refill_requests CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS pharmacies CASCADE;
DROP TABLE IF EXISTS ai_transcription_sessions CASCADE;
DROP TABLE IF EXISTS ai_referral_summaries CASCADE;
DROP TABLE IF EXISTS ai_intake_processing CASCADE;
DROP TABLE IF EXISTS voice_sessions CASCADE;
DROP TABLE IF EXISTS consent_forms CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS homebound_assessments CASCADE;
DROP TABLE IF EXISTS eligibility_verifications CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create sequences
CREATE SEQUENCE IF NOT EXISTS users_id_seq;
CREATE SEQUENCE IF NOT EXISTS patients_id_seq;
CREATE SEQUENCE IF NOT EXISTS referrals_id_seq;
CREATE SEQUENCE IF NOT EXISTS prescriptions_id_seq;
CREATE SEQUENCE IF NOT EXISTS refill_requests_id_seq;
CREATE SEQUENCE IF NOT EXISTS pharmacies_id_seq;
CREATE SEQUENCE IF NOT EXISTS eligibility_verifications_id_seq;
CREATE SEQUENCE IF NOT EXISTS homebound_assessments_id_seq;
CREATE SEQUENCE IF NOT EXISTS appointments_id_seq;
CREATE SEQUENCE IF NOT EXISTS tasks_id_seq;
CREATE SEQUENCE IF NOT EXISTS consent_forms_id_seq;
CREATE SEQUENCE IF NOT EXISTS voice_sessions_id_seq;
CREATE SEQUENCE IF NOT EXISTS ai_intake_processing_id_seq;
CREATE SEQUENCE IF NOT EXISTS ai_referral_summaries_id_seq;
CREATE SEQUENCE IF NOT EXISTS ai_transcription_sessions_id_seq;
CREATE SEQUENCE IF NOT EXISTS patient_medications_id_seq;
CREATE SEQUENCE IF NOT EXISTS medication_interactions_id_seq;
CREATE SEQUENCE IF NOT EXISTS prescription_audit_logs_id_seq;
CREATE SEQUENCE IF NOT EXISTS patient_audit_logs_id_seq;
CREATE SEQUENCE IF NOT EXISTS payers_id_seq;
CREATE SEQUENCE IF NOT EXISTS claims_id_seq;
CREATE SEQUENCE IF NOT EXISTS claim_line_items_id_seq;
CREATE SEQUENCE IF NOT EXISTS denials_id_seq;
CREATE SEQUENCE IF NOT EXISTS appeal_letters_id_seq;
CREATE SEQUENCE IF NOT EXISTS audit_logs_id_seq;

-- Users table (Authentication and role management)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50),
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

-- Patients table (Core patient information)
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    patient_name TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    patient_id TEXT UNIQUE,
    diagnosis TEXT,
    physician TEXT,
    insurance_info JSONB,
    first_name TEXT,
    last_name TEXT,
    middle_name TEXT,
    gender TEXT,
    ssn TEXT,
    mrn TEXT,
    email TEXT,
    phone_number TEXT,
    emergency_contact JSONB,
    address JSONB,
    allergies TEXT[],
    medical_history JSONB,
    current_medications JSONB,
    preferred_pharmacy INTEGER,
    primary_care_physician TEXT,
    care_history JSONB,
    risk_factors TEXT[],
    special_notes TEXT,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified_by INTEGER
);

-- Referrals table (Patient referral processing)
CREATE TABLE referrals (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    referral_date TIMESTAMP NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    ocr_status TEXT DEFAULT 'pending',
    document_url TEXT,
    extracted_data JSONB,
    missing_fields TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pharmacies table (Pharmacy management)
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
    chain_type TEXT,
    is_active BOOLEAN DEFAULT true,
    coordinates JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescriptions table (Prescription management)
CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    prescription_number TEXT,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    instructions TEXT NOT NULL,
    refills_remaining INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    prescribed_by INTEGER NOT NULL REFERENCES users(id),
    prescribed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiration_date TIMESTAMP NOT NULL,
    digital_signature TEXT,
    ai_recommendations JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    doctor_id INTEGER REFERENCES users(id),
    pharmacy_id INTEGER REFERENCES pharmacies(id),
    doctor_notes TEXT,
    fax_status TEXT,
    fax_delivery_confirmation JSONB
);

-- Refill Requests table (Prescription refill management)
CREATE TABLE refill_requests (
    id SERIAL PRIMARY KEY,
    prescription_id INTEGER NOT NULL REFERENCES prescriptions(id),
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    approval_date TIMESTAMP,
    denial_reason TEXT,
    dosage_changes TEXT,
    doctor_notes TEXT,
    pharmacy_id INTEGER REFERENCES pharmacies(id),
    fax_status TEXT,
    fax_delivery_confirmation JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patient Medications table (Current medication tracking)
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

-- Medication Interactions table (Drug interaction management)
CREATE TABLE medication_interactions (
    id SERIAL PRIMARY KEY,
    medication_a TEXT NOT NULL,
    medication_b TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL,
    recommendation TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Eligibility Verifications table (Insurance eligibility checking)
CREATE TABLE eligibility_verifications (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    insurance_type TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    verification_data JSONB,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Homebound Assessments table (CMS homebound status assessment)
CREATE TABLE homebound_assessments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    assessment_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    ai_recommendation JSONB,
    cms_compliant BOOLEAN,
    rationale TEXT,
    ai_verdict TEXT,
    assessed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table (Appointment scheduling)
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    staff_id TEXT,
    appointment_type TEXT,
    scheduled_date TIMESTAMP NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    location JSONB,
    travel_distance TEXT,
    ai_recommendation JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table (Task management and workflow)
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    task_type TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT NOT NULL,
    assigned_to TEXT,
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consent Forms table (Digital consent management)
CREATE TABLE consent_forms (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    form_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    document_url TEXT,
    signed_at TIMESTAMP,
    signature_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voice Sessions table (Voice agent session management)
CREATE TABLE voice_sessions (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    user_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    transcript TEXT[],
    context JSONB,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- AI Intake Processing table (AI-powered document processing)
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

-- AI Referral Summaries table (AI-generated referral summaries)
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

-- AI Transcription Sessions table (AI-powered transcription and SOAP notes)
CREATE TABLE ai_transcription_sessions (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    patient_id INTEGER REFERENCES patients(id),
    user_id INTEGER REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'active',
    transcription_text TEXT,
    soap_notes JSONB,
    ai_summary TEXT,
    audio_file_path TEXT,
    ai_summary_audio_path TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table (System audit trail)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resource_type VARCHAR(50)
);

-- Patient Audit Logs table (HIPAA-compliant patient data audit)
CREATE TABLE patient_audit_logs (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    access_method VARCHAR(50),
    compliance_flags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prescription Audit Logs table (Prescription audit trail)
CREATE TABLE prescription_audit_logs (
    id SERIAL PRIMARY KEY,
    prescription_id INTEGER REFERENCES prescriptions(id),
    refill_request_id INTEGER REFERENCES refill_requests(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    digital_signature TEXT,
    compliance_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payers table (Insurance payer management)
CREATE TABLE payers (
    id SERIAL PRIMARY KEY,
    payer_name VARCHAR(200) NOT NULL,
    payer_type VARCHAR(50) NOT NULL,
    payer_id VARCHAR(100) UNIQUE,
    billing_rules JSONB,
    denial_patterns JSONB,
    contact_info JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claims table (Insurance claims management)
CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    claim_id VARCHAR(50) UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES patients(id),
    provider_id INTEGER REFERENCES users(id),
    payer_id INTEGER REFERENCES payers(id),
    claim_type VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    service_date TIMESTAMP NOT NULL,
    submission_date TIMESTAMP,
    total_amount INTEGER NOT NULL,
    paid_amount INTEGER DEFAULT 0,
    denied_amount INTEGER DEFAULT 0,
    claim_data JSONB,
    submission_data JSONB,
    scrub_results JSONB,
    risk_score INTEGER,
    ai_flags TEXT[],
    clearinghouse_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claim Line Items table (Detailed claim line items)
CREATE TABLE claim_line_items (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER REFERENCES claims(id),
    line_number INTEGER NOT NULL,
    service_code VARCHAR(20) NOT NULL,
    diagnosis_code VARCHAR(20) NOT NULL,
    service_units INTEGER DEFAULT 1,
    charge_amount INTEGER NOT NULL,
    allowed_amount INTEGER,
    paid_amount INTEGER DEFAULT 0,
    adjustment_codes TEXT[],
    modifiers TEXT[],
    place_of_service VARCHAR(2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Denials table (Claim denials management)
CREATE TABLE denials (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER REFERENCES claims(id),
    denial_date TIMESTAMP NOT NULL,
    denial_reason VARCHAR(10) NOT NULL,
    denial_description TEXT,
    denial_amount INTEGER NOT NULL,
    is_appealed BOOLEAN DEFAULT false,
    appeal_outcome VARCHAR(20),
    ai_appeal_priority VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Appeal Letters table (Automated appeal letter generation)
CREATE TABLE appeal_letters (
    id SERIAL PRIMARY KEY,
    denial_id INTEGER REFERENCES denials(id),
    claim_id INTEGER REFERENCES claims(id),
    letter_type VARCHAR(50) NOT NULL,
    template_used VARCHAR(100),
    generated_content TEXT NOT NULL,
    ai_confidence_score DECIMAL(5,2),
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    sent_date TIMESTAMP,
    recipient_info JSONB,
    outcome VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table (Session management for authentication)
CREATE TABLE sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Add foreign key constraints
ALTER TABLE patients ADD CONSTRAINT fk_patients_preferred_pharmacy FOREIGN KEY (preferred_pharmacy) REFERENCES pharmacies(id);
ALTER TABLE patients ADD CONSTRAINT fk_patients_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id);
ALTER TABLE patients ADD CONSTRAINT fk_patients_last_modified_by FOREIGN KEY (last_modified_by) REFERENCES users(id);

-- Create indexes for better performance
CREATE INDEX idx_patients_patient_id ON patients(patient_id);
CREATE INDEX idx_patients_date_of_birth ON patients(date_of_birth);
CREATE INDEX idx_patients_is_active ON patients(is_active);
CREATE INDEX idx_patients_is_deleted ON patients(is_deleted);
CREATE INDEX idx_referrals_patient_id ON referrals(patient_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_eligibility_verifications_patient_id ON eligibility_verifications(patient_id);
CREATE INDEX idx_homebound_assessments_patient_id ON homebound_assessments(patient_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX idx_tasks_patient_id ON tasks(patient_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_consent_forms_patient_id ON consent_forms(patient_id);
CREATE INDEX idx_ai_transcription_sessions_patient_id ON ai_transcription_sessions(patient_id);
CREATE INDEX idx_ai_transcription_sessions_user_id ON ai_transcription_sessions(user_id);
CREATE INDEX idx_ai_transcription_sessions_status ON ai_transcription_sessions(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX idx_patient_audit_logs_patient_id ON patient_audit_logs(patient_id);
CREATE INDEX idx_patient_audit_logs_user_id ON patient_audit_logs(user_id);
CREATE INDEX idx_claims_patient_id ON claims(patient_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_service_date ON claims(service_date);
CREATE INDEX idx_sessions_expire ON sessions(expire);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, is_active, is_approved, created_at, updated_at)
VALUES ('admin', 'admin@isynera.com', '$2b$10$rOvCGjRr7/hFzlsrKr8fEOxQVGdGzGhEGDjhgOgmqgQBvEMZnOmNa', 'administrator', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_refill_requests_updated_at BEFORE UPDATE ON refill_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON pharmacies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_medications_updated_at BEFORE UPDATE ON patient_medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_intake_processing_updated_at BEFORE UPDATE ON ai_intake_processing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_referral_summaries_updated_at BEFORE UPDATE ON ai_referral_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_transcription_sessions_updated_at BEFORE UPDATE ON ai_transcription_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payers_updated_at BEFORE UPDATE ON payers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appeal_letters_updated_at BEFORE UPDATE ON appeal_letters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();