import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: varchar("email", { length: 100 }).unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }),
  department: varchar("department", { length: 100 }),
  licenseNumber: varchar("license_number", { length: 50 }),
  isActive: boolean("is_active").default(true),
  isApproved: boolean("is_approved").default(false),
  requirePasswordChange: boolean("require_password_change").default(false),
  profileData: jsonb("profile_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  lastLogin: timestamp("last_login"),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  patientName: text("patient_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  patientId: text("patient_id").unique(),
  diagnosis: text("diagnosis"),
  physician: text("physician"),
  insuranceInfo: jsonb("insurance_info"),
  // Enhanced patient data fields
  firstName: text("first_name"),
  lastName: text("last_name"),
  middleName: text("middle_name"),
  gender: text("gender"),
  ssn: text("ssn"),
  mrn: text("mrn"), // Medical Record Number
  email: text("email"),
  phoneNumber: text("phone_number"),
  emergencyContact: jsonb("emergency_contact"),
  address: jsonb("address"),
  // Medical Information
  allergies: text("allergies").array(),
  medicalHistory: jsonb("medical_history"),
  currentMedications: jsonb("current_medications"),
  preferredPharmacy: integer("preferred_pharmacy").references(() => pharmacies.id),
  primaryCarePhysician: text("primary_care_physician"),
  // Care Management
  careHistory: jsonb("care_history"),
  riskFactors: text("risk_factors").array(),
  specialNotes: text("special_notes"),
  isActive: boolean("is_active").default(true),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastModifiedBy: integer("last_modified_by").references(() => users.id),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  referralDate: timestamp("referral_date").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, complete, missing_info
  ocrStatus: text("ocr_status").default("pending"), // pending, processing, complete, failed
  documentUrl: text("document_url"),
  extractedData: jsonb("extracted_data"),
  missingFields: text("missing_fields").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prescription & Refill Module Tables
export const prescriptions = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  prescriptionNumber: text("prescription_number"),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  quantity: integer("quantity").notNull(),
  instructions: text("instructions").notNull(),
  refillsRemaining: integer("refills_remaining").default(0),
  status: text("status").notNull().default("pending"), // pending, sent, filled, cancelled
  prescribedBy: integer("prescribed_by").notNull().references(() => users.id),
  prescribedDate: timestamp("prescribed_date").defaultNow(),
  expirationDate: timestamp("expiration_date").notNull(),
  digitalSignature: text("digital_signature"),
  aiRecommendations: jsonb("ai_recommendations"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  doctorId: integer("doctor_id").references(() => users.id),
  pharmacyId: integer("pharmacy_id").references(() => pharmacies.id),
  doctorNotes: text("doctor_notes"),
  faxStatus: text("fax_status"), // pending, sent, delivered, failed
  faxDeliveryConfirmation: jsonb("fax_delivery_confirmation"),
});

export const refillRequests = pgTable("refill_requests", {
  id: serial("id").primaryKey(),
  prescriptionId: integer("prescription_id").notNull().references(() => prescriptions.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  requestedDate: timestamp("requested_date").defaultNow(),
  status: text("status").notNull().default("pending"), // pending, approved, denied, filled
  approvedBy: integer("approved_by").references(() => users.id),
  approvalDate: timestamp("approval_date"),
  denialReason: text("denial_reason"),
  dosageChanges: text("dosage_changes"),
  doctorNotes: text("doctor_notes"),
  pharmacyId: integer("pharmacy_id").references(() => pharmacies.id),
  faxStatus: text("fax_status"), // pending, sent, delivered, failed
  faxDeliveryConfirmation: jsonb("fax_delivery_confirmation"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pharmacies = pgTable("pharmacies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  phoneNumber: text("phone_number"),
  faxNumber: text("fax_number").notNull(),
  email: text("email"),
  chainType: text("chain_type"), // cvs, walgreens, rite_aid, independent, etc.
  isActive: boolean("is_active").default(true),
  coordinates: jsonb("coordinates"), // {lat, lng} for distance calculations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const prescriptionAuditLogs = pgTable("prescription_audit_logs", {
  id: serial("id").primaryKey(),
  prescriptionId: integer("prescription_id").references(() => prescriptions.id),
  refillRequestId: integer("refill_request_id").references(() => refillRequests.id),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // created, modified, approved, denied, sent, cancelled
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  digitalSignature: text("digital_signature"),
  complianceData: jsonb("compliance_data"), // HIPAA, EPCS compliance tracking
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicationInteractions = pgTable("medication_interactions", {
  id: serial("id").primaryKey(),
  medicationA: text("medication_a").notNull(),
  medicationB: text("medication_b").notNull(),
  interactionType: text("interaction_type").notNull(), // major, moderate, minor
  description: text("description").notNull(),
  severity: text("severity").notNull(), // critical, high, medium, low
  recommendation: text("recommendation"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const patientMedications = pgTable("patient_medications", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  prescribedBy: integer("prescribed_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  allergies: text("allergies").array(),
  sideEffects: text("side_effects").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eligibilityVerifications = pgTable("eligibility_verifications", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  insuranceType: text("insurance_type"), // medicaid, medicare, mco
  status: text("status").notNull().default("pending"), // pending, verified, failed
  verificationData: jsonb("verification_data"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const homeboundAssessments = pgTable("homebound_assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  assessmentData: jsonb("assessment_data").notNull(),
  status: text("status").notNull().default("pending"), // qualified, not_qualified, pending, review_needed
  aiRecommendation: jsonb("ai_recommendation"),
  cmsCompliant: boolean("cms_compliant"),
  rationale: text("rationale"),
  aiVerdict: text("ai_verdict"),
  assessedAt: timestamp("assessed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  staffId: text("staff_id"),
  appointmentType: text("appointment_type"), // soc, routine, evaluation
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  location: jsonb("location"), // address, coordinates
  travelDistance: text("travel_distance"),
  aiRecommendation: jsonb("ai_recommendation"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  taskType: text("task_type").notNull(), // missing_info, verification, assessment, scheduling
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  description: text("description").notNull(),
  assignedTo: text("assigned_to"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const consentForms = pgTable("consent_forms", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  formType: text("form_type").notNull(), // hipaa, consent, rights
  status: text("status").notNull().default("pending"), // pending, signed, expired
  documentUrl: text("document_url"),
  signedAt: timestamp("signed_at"),
  signatureData: jsonb("signature_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const voiceSessions = pgTable("voice_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  transcript: text("transcript").array(),
  context: jsonb("context"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // user_created, user_updated, password_reset, role_changed, login_attempt, etc.
  resource: text("resource").notNull(), // user, patient, referral, document, etc.
  resourceId: text("resource_id"), // ID of the affected resource
  details: jsonb("details"), // Additional context about the action
  ipAddress: text("ip_address"), // Support IPv6
  userAgent: text("user_agent"),
  success: boolean("success").default(true), // Whether the action was successful
  errorMessage: text("error_message"), // If action failed, capture error
  createdAt: timestamp("created_at").defaultNow(),
  resourceType: varchar("resource_type", { length: 50 }), // Additional column that exists in DB
});

// Patient Data Audit Logs for HIPAA Compliance
export const patientAuditLogs = pgTable("patient_audit_logs", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(), // view, create, update, delete, export
  fieldChanged: varchar("field_changed", { length: 100 }), // specific field that was modified
  oldValue: text("old_value"), // previous value (encrypted for sensitive data)
  newValue: text("new_value"), // new value (encrypted for sensitive data)
  reason: text("reason"), // reason for the change
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),
  accessMethod: varchar("access_method", { length: 50 }), // web, api, mobile
  complianceFlags: text("compliance_flags").array(), // any compliance issues
  createdAt: timestamp("created_at").defaultNow(),
});

// Billing and Claims Management Tables
export const payers = pgTable("payers", {
  id: serial("id").primaryKey(),
  payerName: varchar("payer_name", { length: 200 }).notNull(),
  payerType: varchar("payer_type", { length: 50 }).notNull(), // medicare, medicaid, commercial, mco
  payerId: varchar("payer_id", { length: 100 }).unique(),
  billingRules: jsonb("billing_rules"),
  denialPatterns: jsonb("denial_patterns"),
  contactInfo: jsonb("contact_info"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  claimId: varchar("claim_id", { length: 50 }).unique().notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  providerId: integer("provider_id").references(() => users.id),
  payerId: integer("payer_id").references(() => payers.id),
  claimType: varchar("claim_type", { length: 20 }).notNull(), // cms1500, ub04, dental
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  serviceDate: timestamp("service_date").notNull(),
  submissionDate: timestamp("submission_date"),
  totalAmount: integer("total_amount").notNull(), // in cents
  paidAmount: integer("paid_amount").default(0),
  deniedAmount: integer("denied_amount").default(0),
  claimData: jsonb("claim_data"),
  submissionData: jsonb("submission_data"),
  scrubResults: jsonb("scrub_results"),
  riskScore: integer("risk_score"), // 0-100 denial risk
  aiFlags: text("ai_flags").array(),
  clearinghouseId: varchar("clearinghouse_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const claimLineItems = pgTable("claim_line_items", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id),
  lineNumber: integer("line_number").notNull(),
  serviceCode: varchar("service_code", { length: 20 }).notNull(), // CPT/HCPCS
  diagnosisCode: varchar("diagnosis_code", { length: 20 }).notNull(), // ICD-10
  serviceUnits: integer("service_units").default(1),
  chargeAmount: integer("charge_amount").notNull(), // in cents
  allowedAmount: integer("allowed_amount"),
  paidAmount: integer("paid_amount").default(0),
  adjustmentCodes: text("adjustment_codes").array(),
  modifiers: text("modifiers").array(),
  placeOfService: varchar("place_of_service", { length: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const denials = pgTable("denials", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").references(() => claims.id),
  denialDate: timestamp("denial_date").notNull(),
  denialReason: varchar("denial_reason", { length: 10 }).notNull(),
  denialDescription: text("denial_description"),
  denialAmount: integer("denial_amount").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  remediationSteps: text("remediation_steps").array(),
  isAppealable: boolean("is_appealable").default(true),
  appealDeadline: timestamp("appeal_deadline"),
  status: varchar("status", { length: 30 }).default("pending"),
  aiAnalysis: jsonb("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const appeals = pgTable("appeals", {
  id: serial("id").primaryKey(),
  denialId: integer("denial_id").references(() => denials.id),
  appealDate: timestamp("appeal_date").notNull(),
  appealType: varchar("appeal_type", { length: 30 }).notNull(),
  appealLetter: text("appeal_letter"),
  supportingDocs: text("supporting_docs").array(),
  status: varchar("status", { length: 30 }).default("submitted"),
  responseDate: timestamp("response_date"),
  outcome: text("outcome"),
  recoveredAmount: integer("recovered_amount").default(0),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const billingRules = pgTable("billing_rules", {
  id: serial("id").primaryKey(),
  ruleName: varchar("rule_name", { length: 200 }).notNull(),
  payerId: integer("payer_id").references(() => payers.id),
  ruleType: varchar("rule_type", { length: 50 }).notNull(),
  conditions: jsonb("conditions"),
  actions: jsonb("actions"),
  priority: integer("priority").default(100),
  isActive: boolean("is_active").default(true),
  successRate: integer("success_rate"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  aiLearned: boolean("ai_learned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clearinghouses = pgTable("clearinghouses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  endpoint: varchar("endpoint", { length: 500 }),
  credentials: jsonb("credentials"),
  supportedFormats: text("supported_formats").array(),
  isActive: boolean("is_active").default(true),
  submissionStats: jsonb("submission_stats"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Activity Tracking Tables
export const userActivityLogs = pgTable("user_activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionId: varchar("session_id", { length: 100 }), // Track user sessions
  activityType: varchar("activity_type", { length: 50 }).notNull(), // login, logout, module_access, document_upload, document_view, etc.
  moduleName: varchar("module_name", { length: 100 }), // intake_automation, referral_engine, eligibility_check, etc.
  resourceType: varchar("resource_type", { length: 50 }), // document, patient, referral, etc.
  resourceId: integer("resource_id"), // ID of accessed/modified resource
  actionDetails: jsonb("action_details"), // Specific action data
  duration: integer("duration"), // Time spent in seconds (for sessions)
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: varchar("token", { length: 100 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEligibilityVerificationSchema = createInsertSchema(eligibilityVerifications).omit({ id: true, createdAt: true });
export const insertHomeboundAssessmentSchema = createInsertSchema(homeboundAssessments).omit({ id: true, createdAt: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
export const insertConsentFormSchema = createInsertSchema(consentForms).omit({ id: true, createdAt: true });
export const insertVoiceSessionSchema = createInsertSchema(voiceSessions).omit({ id: true, startedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertPatientAuditLogSchema = createInsertSchema(patientAuditLogs).omit({ id: true, createdAt: true });
export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs).omit({ id: true, createdAt: true });
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });

// Billing schemas
export const insertPayerSchema = createInsertSchema(payers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClaimSchema = createInsertSchema(claims).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClaimLineItemSchema = createInsertSchema(claimLineItems).omit({ id: true, createdAt: true });
export const insertDenialSchema = createInsertSchema(denials).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAppealSchema = createInsertSchema(appeals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBillingRuleSchema = createInsertSchema(billingRules).omit({ id: true, createdAt: true });
export const insertClearinghouseSchema = createInsertSchema(clearinghouses).omit({ id: true, createdAt: true });

// Prescription & Refill schemas
export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRefillRequestSchema = createInsertSchema(refillRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPharmacySchema = createInsertSchema(pharmacies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPrescriptionAuditLogSchema = createInsertSchema(prescriptionAuditLogs).omit({ id: true, createdAt: true });
export const insertMedicationInteractionSchema = createInsertSchema(medicationInteractions).omit({ id: true, createdAt: true });
export const insertPatientMedicationSchema = createInsertSchema(patientMedications).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type EligibilityVerification = typeof eligibilityVerifications.$inferSelect;
export type InsertEligibilityVerification = z.infer<typeof insertEligibilityVerificationSchema>;
export type HomeboundAssessment = typeof homeboundAssessments.$inferSelect;
export type InsertHomeboundAssessment = z.infer<typeof insertHomeboundAssessmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type ConsentForm = typeof consentForms.$inferSelect;
export type InsertConsentForm = z.infer<typeof insertConsentFormSchema>;
export type VoiceSession = typeof voiceSessions.$inferSelect;
export type InsertVoiceSession = z.infer<typeof insertVoiceSessionSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type PatientAuditLog = typeof patientAuditLogs.$inferSelect;
export type InsertPatientAuditLog = z.infer<typeof insertPatientAuditLogSchema>;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Billing types
export type Payer = typeof payers.$inferSelect;
export type InsertPayer = z.infer<typeof insertPayerSchema>;
export type Claim = typeof claims.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type ClaimLineItem = typeof claimLineItems.$inferSelect;
export type InsertClaimLineItem = z.infer<typeof insertClaimLineItemSchema>;
export type Denial = typeof denials.$inferSelect;
export type InsertDenial = z.infer<typeof insertDenialSchema>;
export type Appeal = typeof appeals.$inferSelect;
export type InsertAppeal = z.infer<typeof insertAppealSchema>;
export type BillingRule = typeof billingRules.$inferSelect;
export type InsertBillingRule = z.infer<typeof insertBillingRuleSchema>;
export type Clearinghouse = typeof clearinghouses.$inferSelect;
export type InsertClearinghouse = z.infer<typeof insertClearinghouseSchema>;

// Prescription & Refill types
export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type RefillRequest = typeof refillRequests.$inferSelect;
export type InsertRefillRequest = z.infer<typeof insertRefillRequestSchema>;
export type Pharmacy = typeof pharmacies.$inferSelect;
export type InsertPharmacy = z.infer<typeof insertPharmacySchema>;
export type PrescriptionAuditLog = typeof prescriptionAuditLogs.$inferSelect;
export type InsertPrescriptionAuditLog = z.infer<typeof insertPrescriptionAuditLogSchema>;
export type MedicationInteraction = typeof medicationInteractions.$inferSelect;
export type InsertMedicationInteraction = z.infer<typeof insertMedicationInteractionSchema>;
export type PatientMedication = typeof patientMedications.$inferSelect;
export type InsertPatientMedication = z.infer<typeof insertPatientMedicationSchema>;

// AI Intake Results for Nurse Accounts
export const aiIntakeResults = pgTable("ai_intake_results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id), // Nurse who performed intake
  patientName: varchar("patient_name", { length: 255 }),
  diagnosis: text("diagnosis"),
  processingTime: integer("processing_time"), // in milliseconds
  aiConfidence: varchar("ai_confidence", { length: 10 }).default("98.5%"),
  cmsCompliance: varchar("cms_compliance", { length: 10 }).default("100%"),
  extractedData: jsonb("extracted_data"), // Full extraction results
  eligibilityResult: jsonb("eligibility_result"),
  homeboundResult: jsonb("homebound_result"),
  schedulingResult: jsonb("scheduling_result"),
  validationResult: jsonb("validation_result"),
  aiSummary: jsonb("ai_summary"), // AI-generated summary with action items
  status: varchar("status", { length: 30 }).default("completed"), // completed, saved, archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recycle Area for Data Deletion Safeguards
export const recycleItems = pgTable("recycle_items", {
  id: serial("id").primaryKey(),
  originalTable: varchar("original_table", { length: 100 }).notNull(),
  originalId: varchar("original_id", { length: 100 }).notNull(),
  itemType: varchar("item_type", { length: 50 }).notNull(), // e.g., 'referral', 'patient', 'session'
  itemTitle: varchar("item_title", { length: 255 }).notNull(),
  itemData: jsonb("item_data").notNull(), // Store complete original record
  deletedBy: integer("deleted_by").notNull().references(() => users.id),
  deletedAt: timestamp("deleted_at").defaultNow(),
  canRestore: boolean("can_restore").default(true),
  metadata: jsonb("metadata"), // Additional info like deletion reason
});

export const insertRecycleItemSchema = createInsertSchema(recycleItems).omit({ id: true, deletedAt: true });
export const insertAiIntakeResultSchema = createInsertSchema(aiIntakeResults).omit({ id: true, createdAt: true, updatedAt: true });

// AI-Driven Module Tables

// 1. AI-Driven Referral Acceleration Engine
export const aiReferralProcessing = pgTable("ai_referral_processing", {
  id: serial("id").primaryKey(),
  referralId: integer("referral_id").references(() => referrals.id),
  documentType: varchar("document_type", { length: 50 }).notNull(), // pdf, tiff, hl7_cda, fhir
  extractedEntities: jsonb("extracted_entities"), // NER results
  confidence: integer("confidence"), // 0-100
  chainOfThoughtReasoning: text("chain_of_thought_reasoning"),
  autofilledFields: jsonb("autofilled_fields"),
  flaggedIncomplete: text("flagged_incomplete").array(),
  responseAutoDraft: text("response_auto_draft"),
  processingTimeMs: integer("processing_time_ms"),
  modelUsed: varchar("model_used", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Ambient Listening + Smart Transcription Module
export const aiTranscriptionSessions = pgTable("ai_transcription_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 100 }).unique().notNull(),
  userId: integer("user_id").references(() => users.id),
  patientId: integer("patient_id").references(() => patients.id),
  audioFileUrl: text("audio_file_url"),
  transcriptionText: text("transcription_text"), // Main transcription field
  rawTranscript: text("raw_transcript"),
  soapNotes: text("soap_notes"), // Changed from jsonb to text for compatibility
  aiSummary: text("ai_summary"), // AI-generated clinical summary
  summaryAudioUrl: text("summary_audio_url"), // URL to AI summary audio file
  confidenceScores: jsonb("confidence_scores"),
  cptCodes: text("cpt_codes").array(), // Changed from cptCodeSuggestions
  icdCodes: text("icd_codes").array(), // Changed from icdCodeSuggestions
  cptCodeSuggestions: text("cpt_code_suggestions").array(),
  icdCodeSuggestions: text("icd_code_suggestions").array(),
  voiceCommands: jsonb("voice_commands"),
  duration: integer("duration"), // seconds
  status: varchar("status", { length: 30 }).default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(), // Adding updatedAt field
  completedAt: timestamp("completed_at"),
});

// 3. Referral Packet Summary Generator
export const aiReferralSummaries = pgTable("ai_referral_summaries", {
  id: serial("id").primaryKey(),
  referralId: integer("referral_id").references(() => referrals.id),
  originalDocuments: text("original_documents").array(),
  clinicalOverview: text("clinical_overview"),
  symptoms: text("symptoms").array(),
  conditions: text("conditions").array(),
  medications: text("medications").array(),
  riskLevel: varchar("risk_level", { length: 20 }), // low, medium, high, critical
  triageScore: integer("triage_score"), // 0-10
  urgencyPrediction: varchar("urgency_prediction", { length: 30 }),
  nextBestActions: text("next_best_actions").array(),
  sourceSnippets: jsonb("source_snippets"),
  processingMetadata: jsonb("processing_metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. AI-Supported HOPE Clinical Decision Module
export const aiHopeAssessments = pgTable("ai_hope_assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  assessmentData: jsonb("assessment_data"),
  symptomImpactRanking: jsonb("symptom_impact_ranking"),
  medicalReasoning: text("medical_reasoning"),
  explainableAiOutput: jsonb("explainable_ai_output"),
  symptomTrends: jsonb("symptom_trends"),
  inconsistenciesDetected: text("inconsistencies_detected").array(),
  cmsComplianceCheck: boolean("cms_compliance_check"),
  careplanSuggestions: jsonb("careplan_suggestions"),
  clinicianApprovalStatus: varchar("clinician_approval_status", { length: 30 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 5. Generative Chart Review + AI Coding Assistant
export const aiChartReviews = pgTable("ai_chart_reviews", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id),
  chartDocuments: text("chart_documents").array(),
  extractedCodes: jsonb("extracted_codes"), // ICD, CPT, HCPCS
  codingDiscrepancies: jsonb("coding_discrepancies"),
  codingJustification: text("coding_justification"),
  medicalNecessityFlags: text("medical_necessity_flags").array(),
  codingConfidenceScore: integer("coding_confidence_score"), // 0-100
  recommendedFlags: text("recommended_flags").array(),
  complianceValidation: jsonb("compliance_validation"),
  reimbursementAccuracy: integer("reimbursement_accuracy"), // 0-100
  rulesEngineResults: jsonb("rules_engine_results"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 6. Autonomous AI Agents for Routine Operations
export const aiAgentTasks = pgTable("ai_agent_tasks", {
  id: serial("id").primaryKey(),
  agentType: varchar("agent_type", { length: 50 }).notNull(), // scheduling, authorization, patient_engagement
  taskId: varchar("task_id", { length: 100 }).unique().notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  taskDescription: text("task_description"),
  status: varchar("status", { length: 30 }).default("queued"), // queued, processing, completed, failed, retry
  priority: varchar("priority", { length: 20 }).default("medium"),
  agentDecisions: jsonb("agent_decisions"),
  collaborationData: jsonb("collaboration_data"), // LangChain/AutoGen orchestration
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  ragKnowledgeUsed: text("rag_knowledge_used").array(),
  executionTimeMs: integer("execution_time_ms"),
  errorDetails: jsonb("error_details"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// AI Agent Collaboration Log
export const aiAgentCollaborations = pgTable("ai_agent_collaborations", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 100 }).notNull(),
  participatingAgents: text("participating_agents").array(),
  collaborationGoal: text("collaboration_goal"),
  messageExchange: jsonb("message_exchange"),
  finalDecision: text("final_decision"),
  executionPlan: jsonb("execution_plan"),
  successMetrics: jsonb("success_metrics"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// AI Model Performance Tracking
export const aiModelMetrics = pgTable("ai_model_metrics", {
  id: serial("id").primaryKey(),
  modelName: varchar("model_name", { length: 100 }).notNull(),
  moduleType: varchar("module_type", { length: 50 }).notNull(),
  performanceMetrics: jsonb("performance_metrics"),
  accuracyScore: integer("accuracy_score"), // 0-100
  processingSpeed: integer("processing_speed"), // ms
  costPerExecution: integer("cost_per_execution"), // cents
  errorRate: integer("error_rate"), // 0-100
  feedbackScore: integer("feedback_score"), // 0-100
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for AI modules
export const insertAiReferralProcessingSchema = createInsertSchema(aiReferralProcessing).omit({ id: true, createdAt: true });
export const insertAiTranscriptionSessionSchema = createInsertSchema(aiTranscriptionSessions).omit({ id: true, createdAt: true });
export const insertAiReferralSummarySchema = createInsertSchema(aiReferralSummaries).omit({ id: true, createdAt: true });
export const insertAiHopeAssessmentSchema = createInsertSchema(aiHopeAssessments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAiChartReviewSchema = createInsertSchema(aiChartReviews).omit({ id: true, createdAt: true });
export const insertAiAgentTaskSchema = createInsertSchema(aiAgentTasks).omit({ id: true, createdAt: true });
export const insertAiAgentCollaborationSchema = createInsertSchema(aiAgentCollaborations).omit({ id: true, createdAt: true });
export const insertAiModelMetricsSchema = createInsertSchema(aiModelMetrics).omit({ id: true, createdAt: true });

// Document processing tables
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  fileType: varchar("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: varchar("file_path").notNull(),
  status: varchar("status").notNull().default("uploading"), // uploading, processing, completed, failed
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  
  // AI Processing Results
  extractedText: text("extracted_text"),
  documentType: varchar("document_type"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  summary: text("summary"),
  keyData: jsonb("key_data"),
  medicalInfo: jsonb("medical_info"),
  complianceFlags: jsonb("compliance_flags"),
  
  // Security Scan Results
  securityPassed: boolean("security_passed").default(false),
  securityThreats: jsonb("security_threats"),
  hipaaCompliant: boolean("hipaa_compliant").default(false),
  
  // Audit Trail
  auditTrail: jsonb("audit_trail"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentTransmissions = pgTable("document_transmissions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id),
  transmissionType: varchar("transmission_type").notNull(), // email, efax
  recipient: varchar("recipient").notNull(),
  transmissionId: varchar("transmission_id"), // external ID from email/fax service
  status: varchar("status").notNull().default("pending"), // pending, sent, delivered, failed
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  failureReason: text("failure_reason"),
  metadata: jsonb("metadata"),
  sentBy: integer("sent_by").references(() => users.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas for documents
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentTransmissionSchema = createInsertSchema(documentTransmissions).omit({ id: true, createdAt: true, updatedAt: true });

// Types for AI modules
export type AiReferralProcessing = typeof aiReferralProcessing.$inferSelect;
export type InsertAiReferralProcessing = z.infer<typeof insertAiReferralProcessingSchema>;
export type AiTranscriptionSession = typeof aiTranscriptionSessions.$inferSelect;
export type InsertAiTranscriptionSession = z.infer<typeof insertAiTranscriptionSessionSchema>;
export type AiReferralSummary = typeof aiReferralSummaries.$inferSelect;
export type InsertAiReferralSummary = z.infer<typeof insertAiReferralSummarySchema>;
export type AiHopeAssessment = typeof aiHopeAssessments.$inferSelect;
export type InsertAiHopeAssessment = z.infer<typeof insertAiHopeAssessmentSchema>;
export type AiChartReview = typeof aiChartReviews.$inferSelect;
export type InsertAiChartReview = z.infer<typeof insertAiChartReviewSchema>;
export type AiAgentTask = typeof aiAgentTasks.$inferSelect;
export type InsertAiAgentTask = z.infer<typeof insertAiAgentTaskSchema>;
export type AiAgentCollaboration = typeof aiAgentCollaborations.$inferSelect;
export type InsertAiAgentCollaboration = z.infer<typeof insertAiAgentCollaborationSchema>;
export type AiModelMetrics = typeof aiModelMetrics.$inferSelect;
export type InsertAiModelMetrics = z.infer<typeof insertAiModelMetricsSchema>;

// AI Intake results types
export type AiIntakeResult = typeof aiIntakeResults.$inferSelect;
export type InsertAiIntakeResult = z.infer<typeof insertAiIntakeResultSchema>;

// Recycle area types
export type RecycleItem = typeof recycleItems.$inferSelect;
export type InsertRecycleItem = z.infer<typeof insertRecycleItemSchema>;

// Document processing types
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentTransmission = typeof documentTransmissions.$inferSelect;
export type InsertDocumentTransmission = z.infer<typeof insertDocumentTransmissionSchema>;

// Field Staff tables
export const fieldStaff = pgTable("field_staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(), // nurse, therapist, aide
  licenseNumber: varchar("license_number", { length: 100 }),
  territory: varchar("territory", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const patientVisits = pgTable("patient_visits", {
  id: serial("id").primaryKey(),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  visitType: varchar("visit_type", { length: 100 }).notNull(), // initial, follow-up, discharge
  scheduledTime: timestamp("scheduled_time").notNull(),
  status: varchar("status", { length: 50 }).default('pending'), // pending, in_progress, completed, cancelled
  priority: varchar("priority", { length: 20 }).default('medium'), // low, medium, high, urgent
  notes: text("notes"),
  assignedStaffId: integer("assigned_staff_id").references(() => fieldStaff.id),
  gpsLatitude: decimal("gps_latitude", { precision: 10, scale: 7 }),
  gpsLongitude: decimal("gps_longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const visitDocumentations = pgTable("visit_documentations", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id").references(() => patientVisits.id).notNull(),
  staffId: integer("staff_id").references(() => fieldStaff.id).notNull(),
  vitalSigns: jsonb("vital_signs"), // { bloodPressure, heartRate, temperature, etc. }
  clinicalNotes: text("clinical_notes"),
  treatmentProvided: text("treatment_provided"),
  nextSteps: text("next_steps"),
  photos: jsonb("photos"), // array of photo URLs/paths
  audioNotes: jsonb("audio_notes"), // array of audio file URLs/paths
  duration: integer("duration"), // visit duration in minutes
  documentedAt: timestamp("documented_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fieldStaffSessions = pgTable("field_staff_sessions", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => fieldStaff.id).notNull(),
  loginTime: timestamp("login_time").defaultNow(),
  logoutTime: timestamp("logout_time"),
  gpsLatitude: decimal("gps_latitude", { precision: 10, scale: 7 }),
  gpsLongitude: decimal("gps_longitude", { precision: 10, scale: 7 }),
  deviceInfo: jsonb("device_info"), // device type, browser, etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Field Staff relationships
export const fieldStaffRelations = relations(fieldStaff, ({ one, many }) => ({
  user: one(users, {
    fields: [fieldStaff.userId],
    references: [users.id],
  }),
  visits: many(patientVisits),
  documentations: many(visitDocumentations),
  sessions: many(fieldStaffSessions),
}));

export const patientVisitsRelations = relations(patientVisits, ({ one, many }) => ({
  assignedStaff: one(fieldStaff, {
    fields: [patientVisits.assignedStaffId],
    references: [fieldStaff.id],
  }),
  documentations: many(visitDocumentations),
}));

export const visitDocumentationsRelations = relations(visitDocumentations, ({ one }) => ({
  visit: one(patientVisits, {
    fields: [visitDocumentations.visitId],
    references: [patientVisits.id],
  }),
  staff: one(fieldStaff, {
    fields: [visitDocumentations.staffId],
    references: [fieldStaff.id],
  }),
}));

export const fieldStaffSessionsRelations = relations(fieldStaffSessions, ({ one }) => ({
  staff: one(fieldStaff, {
    fields: [fieldStaffSessions.staffId],
    references: [fieldStaff.id],
  }),
}));

// Field Staff types
export type FieldStaff = typeof fieldStaff.$inferSelect;
export type InsertFieldStaff = typeof fieldStaff.$inferInsert;
export type PatientVisit = typeof patientVisits.$inferSelect;
export type InsertPatientVisit = typeof patientVisits.$inferInsert;
export type VisitDocumentation = typeof visitDocumentations.$inferSelect;
export type InsertVisitDocumentation = typeof visitDocumentations.$inferInsert;
export type FieldStaffSession = typeof fieldStaffSessions.$inferSelect;
export type InsertFieldStaffSession = typeof fieldStaffSessions.$inferInsert;
