import { db } from "../db";
import { prescriptionAuditLogs, InsertPrescriptionAuditLog } from "@shared/schema";
import { eq, desc, gte, lte } from "drizzle-orm";

/**
 * Prescription Audit Logging Service
 * Handles comprehensive audit trails for prescription and refill activities
 * Ensures HIPAA compliance and regulatory tracking requirements
 */

interface AuditLogData {
  prescriptionId?: number;
  refillRequestId?: number;
  userId: number;
  action: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  digitalSignature?: string;
  complianceData?: {
    hipaaCompliant: boolean;
    encryptionStatus: string;
    auditTrail: string;
    digitalSignature: string;
  };
}

export async function logPrescriptionAudit(data: AuditLogData): Promise<void> {
  try {
    const auditEntry: InsertPrescriptionAuditLog = {
      prescriptionId: data.prescriptionId || null,
      refillRequestId: data.refillRequestId || null,
      userId: data.userId,
      action: data.action,
      details: data.details,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      digitalSignature: data.digitalSignature || null,
      complianceData: data.complianceData || null
    };

    await db.insert(prescriptionAuditLogs).values(auditEntry);
    
    console.log(`Prescription audit logged: ${data.action} by user ${data.userId}`);
  } catch (error) {
    console.error('Failed to log prescription audit:', error);
    // In production, this would trigger alerts for compliance teams
  }
}

/**
 * Retrieve audit logs for a specific prescription
 */
export async function getPrescriptionAuditLogs(prescriptionId: number) {
  try {
    return await db
      .select()
      .from(prescriptionAuditLogs)
      .where(eq(prescriptionAuditLogs.prescriptionId, prescriptionId))
      .orderBy(desc(prescriptionAuditLogs.createdAt));
  } catch (error) {
    console.error('Failed to retrieve prescription audit logs:', error);
    return [];
  }
}

/**
 * Retrieve audit logs for a specific refill request
 */
export async function getRefillAuditLogs(refillRequestId: number) {
  try {
    return await db
      .select()
      .from(prescriptionAuditLogs)
      .where(eq(prescriptionAuditLogs.refillRequestId, refillRequestId))
      .orderBy(desc(prescriptionAuditLogs.createdAt));
  } catch (error) {
    console.error('Failed to retrieve refill audit logs:', error);
    return [];
  }
}

/**
 * Generate compliance report for audit purposes
 */
export async function generateComplianceReport(userId?: number, startDate?: Date, endDate?: Date) {
  try {
    let query = db.select().from(prescriptionAuditLogs);
    
    if (userId) {
      query = query.where(eq(prescriptionAuditLogs.userId, userId));
    }
    
    if (startDate) {
      query = query.where(gte(prescriptionAuditLogs.createdAt, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(prescriptionAuditLogs.createdAt, endDate));
    }
    
    return await query.orderBy(desc(prescriptionAuditLogs.createdAt));
  } catch (error) {
    console.error('Failed to generate compliance report:', error);
    return [];
  }
}