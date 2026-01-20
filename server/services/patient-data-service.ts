import { db } from '../db';
import { patients, patientAuditLogs } from '@shared/schema';
import { eq, desc, and, or, ilike, isNull } from 'drizzle-orm';
import type { Patient, InsertPatient, InsertPatientAuditLog } from '@shared/schema';

export class PatientDataService {
  /**
   * Get all patients with pagination and filtering
   */
  async getAllPatients(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive' | 'all';
    sortBy?: 'name' | 'created' | 'updated';
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      status = 'active',
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const whereConditions = [];
    
    // Status filter
    if (status === 'active') {
      whereConditions.push(eq(patients.isActive, true));
      whereConditions.push(eq(patients.isDeleted, false));
    } else if (status === 'inactive') {
      whereConditions.push(eq(patients.isActive, false));
    }

    // Search filter
    if (search) {
      whereConditions.push(
        or(
          ilike(patients.patientName, `%${search}%`),
          ilike(patients.firstName, `%${search}%`),
          ilike(patients.lastName, `%${search}%`),
          ilike(patients.patientId, `%${search}%`),
          ilike(patients.mrn, `%${search}%`),
          ilike(patients.email, `%${search}%`)
        )
      );
    }

    // Build ORDER BY
    let orderBy;
    if (sortBy === 'name') {
      orderBy = sortOrder === 'desc' ? desc(patients.patientName) : patients.patientName;
    } else if (sortBy === 'created') {
      orderBy = sortOrder === 'desc' ? desc(patients.createdAt) : patients.createdAt;
    } else {
      orderBy = sortOrder === 'desc' ? desc(patients.updatedAt) : patients.updatedAt;
    }

    const query = db.select()
      .from(patients)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const results = await query;

    // Get total count for pagination
    const countQuery = db.select({ count: patients.id })
      .from(patients)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);
    
    const totalResults = await countQuery;
    const total = totalResults.length;

    return {
      patients: results,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: results.length,
        totalRecords: total
      }
    };
  }

  /**
   * Get patient by ID with full details
   */
  async getPatientById(id: number): Promise<Patient | null> {
    const result = await db.select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create new patient with audit logging
   */
  async createPatient(
    patientData: Omit<InsertPatient, 'createdAt' | 'updatedAt'>,
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Patient> {
    // Insert patient
    const [newPatient] = await db.insert(patients)
      .values({
        ...patientData,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastModifiedBy: userId
      })
      .returning();

    // Log audit trail
    await this.logPatientAudit({
      patientId: newPatient.id,
      userId,
      action: 'create',
      reason: 'New patient record created',
      ipAddress,
      userAgent,
      accessMethod: 'web'
    });

    return newPatient;
  }

  /**
   * Update patient with field-level audit logging
   */
  async updatePatient(
    id: number,
    updates: Partial<InsertPatient>,
    userId: number,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Patient | null> {
    // Get current patient data for audit comparison
    const currentPatient = await this.getPatientById(id);
    if (!currentPatient) {
      throw new Error('Patient not found');
    }

    // Update patient
    const [updatedPatient] = await db.update(patients)
      .set({
        ...updates,
        updatedAt: new Date(),
        lastModifiedBy: userId
      })
      .where(eq(patients.id, id))
      .returning();

    // Log field-level changes
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = (currentPatient as any)[field];
      if (oldValue !== newValue) {
        await this.logPatientAudit({
          patientId: id,
          userId,
          action: 'update',
          fieldChanged: field,
          oldValue: String(oldValue || ''),
          newValue: String(newValue || ''),
          reason: reason || `Updated ${field}`,
          ipAddress,
          userAgent,
          accessMethod: 'web'
        });
      }
    }

    return updatedPatient;
  }

  /**
   * Soft delete patient with audit logging
   */
  async deletePatient(
    id: number,
    userId: number,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    const patient = await this.getPatientById(id);
    if (!patient) {
      return false;
    }

    // Soft delete
    await db.update(patients)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
        updatedAt: new Date(),
        lastModifiedBy: userId
      })
      .where(eq(patients.id, id));

    // Log audit trail
    await this.logPatientAudit({
      patientId: id,
      userId,
      action: 'delete',
      reason,
      ipAddress,
      userAgent,
      accessMethod: 'web',
      complianceFlags: ['soft_delete', 'hipaa_retention']
    });

    return true;
  }

  /**
   * Restore soft-deleted patient
   */
  async restorePatient(
    id: number,
    userId: number,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    const [restoredPatient] = await db.update(patients)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        updatedAt: new Date(),
        lastModifiedBy: userId
      })
      .where(eq(patients.id, id))
      .returning();

    if (restoredPatient) {
      await this.logPatientAudit({
        patientId: id,
        userId,
        action: 'restore',
        reason,
        ipAddress,
        userAgent,
        accessMethod: 'web'
      });
      return true;
    }

    return false;
  }

  /**
   * Get patient audit history
   */
  async getPatientAuditHistory(
    patientId: number,
    limit: number = 100
  ): Promise<any[]> {
    const auditLogs = await db.select()
      .from(patientAuditLogs)
      .where(eq(patientAuditLogs.patientId, patientId))
      .orderBy(desc(patientAuditLogs.createdAt))
      .limit(limit);

    return auditLogs;
  }

  /**
   * Log patient audit event
   */
  private async logPatientAudit(auditData: Omit<InsertPatientAuditLog, 'createdAt'>): Promise<void> {
    await db.insert(patientAuditLogs)
      .values({
        ...auditData,
        createdAt: new Date()
      });
  }

  /**
   * Search patients by criteria
   */
  async searchPatients(criteria: {
    name?: string;
    dob?: string;
    mrn?: string;
    patientId?: string;
    email?: string;
    phone?: string;
  }): Promise<Patient[]> {
    const whereConditions = [
      eq(patients.isDeleted, false)
    ];

    if (criteria.name) {
      whereConditions.push(
        or(
          ilike(patients.patientName, `%${criteria.name}%`),
          ilike(patients.firstName, `%${criteria.name}%`),
          ilike(patients.lastName, `%${criteria.name}%`)
        )
      );
    }

    if (criteria.dob) {
      whereConditions.push(eq(patients.dateOfBirth, criteria.dob));
    }

    if (criteria.mrn) {
      whereConditions.push(eq(patients.mrn, criteria.mrn));
    }

    if (criteria.patientId) {
      whereConditions.push(eq(patients.patientId, criteria.patientId));
    }

    if (criteria.email) {
      whereConditions.push(ilike(patients.email, `%${criteria.email}%`));
    }

    if (criteria.phone) {
      whereConditions.push(ilike(patients.phoneNumber, `%${criteria.phone}%`));
    }

    const results = await db.select()
      .from(patients)
      .where(and(...whereConditions))
      .orderBy(patients.patientName)
      .limit(50);

    return results;
  }

  /**
   * Get patient statistics
   */
  async getPatientStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    recentlyAdded: number;
    recentlyUpdated: number;
  }> {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, active, inactive, recentlyAdded, recentlyUpdated] = await Promise.all([
      db.select().from(patients).where(eq(patients.isDeleted, false)),
      db.select().from(patients).where(and(eq(patients.isActive, true), eq(patients.isDeleted, false))),
      db.select().from(patients).where(and(eq(patients.isActive, false), eq(patients.isDeleted, false))),
      db.select().from(patients).where(and(
        eq(patients.isDeleted, false),
        // createdAt > lastWeek (simplified for this example)
      )),
      db.select().from(patients).where(and(
        eq(patients.isDeleted, false),
        // updatedAt > lastWeek (simplified for this example)
      ))
    ]);

    return {
      total: total.length,
      active: active.length,
      inactive: inactive.length,
      recentlyAdded: recentlyAdded.length,
      recentlyUpdated: recentlyUpdated.length
    };
  }

  /**
   * Bulk update patients
   */
  async bulkUpdatePatients(
    patientIds: number[],
    updates: Partial<InsertPatient>,
    userId: number,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<number> {
    let updatedCount = 0;

    for (const patientId of patientIds) {
      try {
        await this.updatePatient(patientId, updates, userId, reason, ipAddress, userAgent);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update patient ${patientId}:`, error);
      }
    }

    return updatedCount;
  }
}

export const patientDataService = new PatientDataService();