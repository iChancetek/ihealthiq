import { storage } from "../storage";
import type { InsertAuditLog, InsertUserActivityLog } from "@shared/schema";

export interface AuditContext {
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  // Audit logging methods
  static async logUserAction(
    action: string,
    context: AuditContext,
    resourceType?: string,
    resourceId?: number,
    details?: Record<string, any>,
    success: boolean = true,
    errorMessage?: string
  ) {
    try {
      const auditLog: InsertAuditLog = {
        userId: context.userId,
        action,
        resource: resourceType || 'system', // Required field
        resourceType: resourceType || 'system', // Legacy field that exists in DB
        resourceId: resourceId?.toString(), // Convert to string as required by schema
        details: details ? JSON.stringify(details) : null,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        success,
        errorMessage
      };

      await storage.createAuditLog(auditLog);
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  static async logUserActivity(
    userId: number,
    activityType: string,
    context: AuditContext,
    moduleName?: string,
    resourceType?: string,
    resourceId?: number,
    actionDetails?: Record<string, any>,
    sessionId?: string,
    duration?: number
  ) {
    try {
      const activityLog: InsertUserActivityLog = {
        userId,
        sessionId,
        activityType,
        moduleName,
        resourceType,
        resourceId,
        actionDetails: actionDetails ? JSON.stringify(actionDetails) : null,
        duration,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      };

      await storage.createUserActivityLog(activityLog);
    } catch (error) {
      console.error('Failed to create user activity log:', error);
    }
  }

  // Administrative action logging
  static async logAdminAction(
    adminUserId: number,
    action: string,
    targetUserId: number,
    context: AuditContext,
    details?: Record<string, any>
  ) {
    await this.logUserAction(
      action,
      { ...context, userId: adminUserId },
      true,
      null,
      'users',
      targetUserId.toString(),
      {
        ...details,
        adminAction: true,
        targetUserId
      }
    );
  }

  // Security event logging
  static async logSecurityEvent(
    action: string,
    context: AuditContext,
    success: boolean,
    details?: Record<string, any>,
    errorMessage?: string
  ) {
    await this.logUserAction(
      action,
      context,
      'auth', // resource type
      undefined, // resource ID
      {
        ...details,
        securityEvent: true
      },
      success,
      errorMessage
    );
  }

  // Get audit logs for admin dashboard
  static async getAuditLogs(userId?: number, limit: number = 100) {
    return await storage.getAuditLogs(userId, limit);
  }

  static async getUserActivityLogs(userId: number, limit: number = 100) {
    return await storage.getUserActivityLogs(userId, limit);
  }

  static async getAuditLogsByAction(action: string) {
    return await storage.getAuditLogsByAction(action);
  }

  static async getAuditLogsByResource(resourceType: string, resourceId?: number) {
    return await storage.getAuditLogsByResource(resourceType, resourceId);
  }
}