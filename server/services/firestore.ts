import { db } from "../firebase";
import * as schema from "@shared/schema";
import { IStorage } from "../storage";
import {
    type User, type InsertUser, type Patient, type InsertPatient,
    type Referral, type InsertReferral, type Appointment, type InsertAppointment,
    type Task, type InsertTask, type Prescription, type InsertPrescription
} from "@shared/schema";

// Helper to convert Firestore query snapshot to array
const snapshotToData = <T>(snapshot: FirebaseFirestore.QuerySnapshot): T[] => {
    return snapshot.docs.map(doc => doc.data() as T);
};

// Helper to get next ID (Sequence simulation)
async function getNextId(collectionName: string): Promise<number> {
    const snapshot = await db.collection(collectionName)
        .orderBy('id', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) return 1;
    const lastId = snapshot.docs[0].data().id;
    return (typeof lastId === 'number' ? lastId : 0) + 1;
}

export class FirestoreStorage implements IStorage {
    // --- USER METHODS ---
    async getUser(id: number): Promise<User | undefined> {
        const snapshot = await db.collection('users').where('id', '==', id).limit(1).get();
        if (snapshot.empty) return undefined;
        return snapshot.docs[0].data() as User;
    }

    async getUserById(id: number): Promise<User | undefined> {
        return this.getUser(id);
    }

    async getUserByUsername(username: string): Promise<User | undefined> {
        const snapshot = await db.collection('users').where('username', '==', username).limit(1).get();
        if (snapshot.empty) return undefined;
        return snapshot.docs[0].data() as User;
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        if (snapshot.empty) return undefined;
        return snapshot.docs[0].data() as User;
    }

    async createUser(insertUser: InsertUser): Promise<User> {
        const id = await getNextId('users');
        const newUser = { ...insertUser, id, createdAt: new Date(), updatedAt: new Date() } as User;
        await db.collection('users').add(newUser);
        return newUser;
    }

    async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
        const snapshot = await db.collection('users').where('id', '==', id).limit(1).get();
        if (snapshot.empty) return undefined;
        const doc = snapshot.docs[0];
        const updated = { ...doc.data(), ...updateData, updatedAt: new Date() };
        await doc.ref.update(updated);
        return updated as User;
    }

    async getAllUsers(): Promise<User[]> {
        const snapshot = await db.collection('users').get();
        return snapshotToData<User>(snapshot);
    }

    // --- PATIENT METHODS ---
    async getPatient(id: number): Promise<Patient | undefined> {
        const snapshot = await db.collection('patients').where('id', '==', id).limit(1).get();
        if (snapshot.empty) return undefined;
        return snapshot.docs[0].data() as Patient;
    }

    async getPatients(): Promise<Patient[]> {
        const snapshot = await db.collection('patients').get();
        return snapshotToData<Patient>(snapshot);
    }

    async searchPatients(searchTerm: string): Promise<Patient[]> {
        const all = await this.getPatients();
        const term = searchTerm.toLowerCase();
        return all.filter(p => p.patientName.toLowerCase().includes(term));
    }

    async createPatient(insertPatient: InsertPatient): Promise<Patient> {
        const id = await getNextId('patients');
        const newPatient = {
            ...insertPatient, id,
            createdAt: new Date(), updatedAt: new Date(),
            isDeleted: false, isActive: true
        } as unknown as Patient;
        await db.collection('patients').add(newPatient);
        return newPatient;
    }

    async updatePatient(id: number, updateData: Partial<InsertPatient>): Promise<Patient | undefined> {
        const snapshot = await db.collection('patients').where('id', '==', id).limit(1).get();
        if (snapshot.empty) return undefined;
        await snapshot.docs[0].ref.update({ ...updateData, updatedAt: new Date() });
        return { ...snapshot.docs[0].data(), ...updateData } as Patient;
    }

    // --- STUBS FOR REMAINING METHODS (To be implemented) ---
    // Referral
    async getReferral(id: number) { console.warn('Stub: getReferral'); return undefined; }
    async getReferrals() { return []; }
    async getReferralsByStatus(status: string) { return []; }
    async createReferral(r: any) { const id = await getNextId('referrals'); return { ...r, id } as Referral; }
    async updateReferral(id: number, r: any) { return undefined; }

    // Eligibility
    async getEligibilityVerification(id: number) { return undefined; }
    async getEligibilityVerificationsByPatient(pid: number) { return []; }
    async createEligibilityVerification(v: any) { return { ...v, id: 1 } as any; }
    async updateEligibilityVerification(id: number, v: any) { return undefined; }

    // Homebound
    async getHomeboundAssessment(id: number) { return undefined; }
    async getHomeboundAssessmentsByPatient(pid: number) { return []; }
    async createHomeboundAssessment(a: any) { return { ...a, id: 1 } as any; }
    async updateHomeboundAssessment(id: number, a: any) { return undefined; }

    // Appointment
    async getAppointment(id: number) { return undefined; }
    async getAppointments() { return []; }
    async getAppointmentsByPatient(pid: number) { return []; }
    async createAppointment(a: any) { return { ...a, id: 1 } as Appointment; }
    async updateAppointment(id: number, a: any) { return undefined; }

    // Task
    async getTask(id: number) { return undefined; }
    async getTasks() { return []; }
    async getTasksByStatus(s: string) { return []; }
    async getTasksByPriority(p: string) { return []; }
    async createTask(t: any) { return { ...t, id: 1 } as Task; }
    async updateTask(id: number, t: any) { return undefined; }

    // Consent
    async getConsentForm(id: number) { return undefined; }
    async getConsentFormsByPatient(pid: number) { return []; }
    async createConsentForm(f: any) { return { ...f, id: 1 } as any; }
    async updateConsentForm(id: number, f: any) { return undefined; }

    // Voice
    async getVoiceSession(sid: string) { return undefined; }
    async getActiveVoiceSessions() { return []; }
    async createVoiceSession(s: any) { return { ...s, id: 1 } as any; }
    async updateVoiceSession(sid: string, s: any) { return undefined; }

    // Audit
    async createAuditLog(l: any) { return { ...l, id: 1 } as any; }
    async getAuditLogs(uid?: number, limit?: number) { return []; }
    async getAuditLogsByAction(a: string) { return []; }
    async getAuditLogsByResource(rt: string, rid?: number) { return []; }

    // Activity
    async createUserActivityLog(l: any) { return { ...l, id: 1 } as any; }
    async getUserActivityLogs(uid: number, limit?: number) { return []; }
    async getUserActivityByModule(uid: number, m: string) { return []; }
    async getAllUserActivityLogs(limit?: number) { return []; }
    async getActiveUserSessions() { return []; }

    // Password
    async createPasswordResetToken(t: any) { return { ...t, id: 1 } as any; }
    async getPasswordResetToken(t: string) { return undefined; }
    async markPasswordResetTokenUsed(id: number) { }
    async cleanupExpiredPasswordResetTokens() { }

    // SOAP
    async getSOAPNotesByPatient(pid: number) { return []; }
    async createSOAPNote(n: any) { return { ...n, id: 1 } as any; }
    async updateSOAPNote(id: number, n: any) { return undefined; }

    // Billing (Payers, Claims, etc.)
    async getPayer(id: number) { return undefined; }
    async getPayers() { return []; }
    async createPayer(p: any) { return { ...p, id: 1 } as any; }
    async updatePayer(id: number, p: any) { return undefined; }

    async getClaim(id: number) { return undefined; }
    async getClaims() { return []; }
    async getClaimsByStatus(s: string) { return []; }
    async getClaimsByPayer(pid: number) { return []; }
    async createClaim(c: any) { return { ...c, id: 1 } as any; }
    async updateClaim(id: number, c: any) { return undefined; }

    async getClaimLineItems(cid: number) { return []; }
    async createClaimLineItem(i: any) { return { ...i, id: 1 } as any; }
    async updateClaimLineItem(id: number, i: any) { return undefined; }

    async getDenial(id: number) { return undefined; }
    async getDenials() { return []; }
    async getDenialsByClaim(cid: number) { return []; }
    async createDenial(d: any) { return { ...d, id: 1 } as any; }
    async updateDenial(id: number, d: any) { return undefined; }

    async getAppeal(id: number) { return undefined; }
    async getAppeals() { return []; }
    async getAppealsByDenial(did: number) { return []; }
    async createAppeal(a: any) { return { ...a, id: 1 } as any; }
    async updateAppeal(id: number, a: any) { return undefined; }

    async getBillingRule(id: number) { return undefined; }
    async getBillingRules() { return []; }
    async getBillingRulesByPayer(pid: number) { return []; }
    async createBillingRule(r: any) { return { ...r, id: 1 } as any; }
    async updateBillingRule(id: number, r: any) { return undefined; }

    async getClearinghouse(id: number) { return undefined; }
    async getClearinghouses() { return []; }
    async createClearinghouse(c: any) { return { ...c, id: 1 } as any; }
    async updateClearinghouse(id: number, c: any) { return undefined; }

    // AI Modules
    async createAiReferralProcessing(p: any) { return { ...p, id: 1 } as any; }
    async getAiReferralProcessing(id: number) { return undefined; }
    async getAiReferralProcessingByReferral(rid: number) { return []; }

    async createAiTranscriptionSession(s: any) { return { ...s, id: 1 } as any; }
    async getAiTranscriptionSession(sid: string) { return undefined; }
    async getActiveAiTranscriptionSession(uid: number) { return undefined; }
    async getAllAiTranscriptionSessions() { return []; }
    async updateAiTranscriptionSession(sid: string, s: any) { return undefined; }
    async deleteAiTranscriptionSession(sid: string) { }

    async createAiReferralSummary(s: any) { return { ...s, id: 1 } as any; }
    async getAiReferralSummary(id: number) { return undefined; }
    async getAiReferralSummaryByReferral(rid: number) { return undefined; }

    async createAiHopeAssessment(a: any) { return { ...a, id: 1 } as any; }
    async getAiHopeAssessment(id: number) { return undefined; }
    async getAllAiHopeAssessments() { return []; }
    async getAiHopeAssessmentsByPatient(pid: number) { return []; }
    async updateAiHopeAssessment(id: number, a: any) { return undefined; }
    async deleteAiHopeAssessment(id: number) { }

    async createAiChartReview(r: any) { return { ...r, id: 1 } as any; }
    async getAiChartReview(id: number) { return undefined; }
    async getAiChartReviewsByPatient(pid: number) { return []; }

    async createAiAgentTask(t: any) { return { ...t, id: 1 } as any; }
    async getAiAgentTask(id: number) { return undefined; }
    async getAiAgentTaskByTaskId(tid: string) { return undefined; }
    async getAiAgentTasksByStatus(s: string) { return []; }
    async updateAiAgentTask(tid: string, t: any) { return undefined; }

    async createAiAgentCollaboration(c: any) { return { ...c, id: 1 } as any; }
    async getAiAgentCollaboration(id: number) { return undefined; }
    async getAiAgentCollaborationsBySession(sid: string) { return []; }

    async createAiModelMetrics(m: any) { return { ...m, id: 1 } as any; }
    async getAiModelMetrics(id: number) { return undefined; }
    async getAiModelMetricsByModule(m: string) { return []; }

    // Prescriptions (Additional)
    async getPrescription(id: number) { return undefined; }
    async getPrescriptions() { return []; }
    async getPrescriptionsByPatient(pid: number) { return []; }
    async createPrescription(p: any) { return { ...p, id: 1 } as Prescription; }
    async updatePrescription(id: number, p: any) { return undefined; }

    async getRefillRequest(id: number) { return undefined; }
    async getRefillRequests() { return []; }
    async getRefillRequestsByPrescription(pid: number) { return []; }
    async createRefillRequest(r: any) { return { ...r, id: 1 } as any; }
    async updateRefillRequest(id: number, r: any) { return undefined; }

    async getPharmacy(id: number) { return undefined; }
    async getPharmacies() { return []; }
    async getPharmaciesByZipCode(z: string) { return []; }
    async createPharmacy(p: any) { return { ...p, id: 1 } as any; }
    async updatePharmacy(id: number, p: any) { return undefined; }

    async createPrescriptionAuditLog(l: any) { return { ...l, id: 1 } as any; }
    async getPrescriptionAuditLogs(pid?: number, rid?: number) { return []; }

    async getMedicationInteractions(n: string) { return []; }
    async createMedicationInteraction(i: any) { return { ...i, id: 1 } as any; }

    async getPatientMedications(pid: number) { return []; }
    async createPatientMedication(m: any) { return { ...m, id: 1 } as any; }
    async updatePatientMedication(id: number, m: any) { return undefined; }

    async getPharmacyById(id: string) { return undefined; }
    async getPendingRefillRequests() { return []; }
    async getRefillRequestById(id: number) { return undefined; }
}
