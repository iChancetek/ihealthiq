import { db } from '../db';
import { recycleItems, patients, referrals, aiTranscriptionSessions, aiHopeAssessments, type RecycleItem, type InsertRecycleItem } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface DeletionContext {
  itemId: string;
  itemType: string;
  itemTitle: string;
  tableName: string;
  userId: number;
  reason?: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  restoredItem?: any;
}

export interface PermanentDeletionResult {
  success: boolean;
  message: string;
  auditLog?: any;
}

export class DataDeletionSafeguardsService {
  
  /**
   * Soft delete - Move item to recycle area instead of permanent deletion
   */
  async moveToRecycleArea(context: DeletionContext): Promise<{ success: boolean; recycleId?: number; message: string }> {
    try {
      // First, get the original item data based on table type
      const originalData = await this.getOriginalItemData(context.tableName, context.itemId);
      
      if (!originalData) {
        return {
          success: false,
          message: `Item not found in ${context.tableName}`
        };
      }

      // Create recycle entry
      const recycleData: InsertRecycleItem = {
        originalTable: context.tableName,
        originalId: context.itemId,
        itemType: context.itemType,
        itemTitle: context.itemTitle,
        itemData: originalData,
        deletedBy: context.userId,
        canRestore: true,
        metadata: {
          deletionReason: context.reason || 'User requested deletion',
          originalTimestamp: new Date().toISOString(),
          hipaaCompliant: true
        }
      };

      const [recycleEntry] = await db.insert(recycleItems)
        .values(recycleData)
        .returning();

      // Remove from original table (soft delete)
      await this.removeFromOriginalTable(context.tableName, context.itemId);

      // Create audit log
      await this.createAuditLog({
        action: 'SOFT_DELETE',
        tableName: context.tableName,
        itemId: context.itemId,
        userId: context.userId,
        details: {
          recycleId: recycleEntry.id,
          reason: context.reason,
          canRestore: true
        }
      });

      return {
        success: true,
        recycleId: recycleEntry.id,
        message: `Item successfully moved to Recycle Area. Can be restored if needed.`
      };

    } catch (error) {
      console.error('Error in soft delete operation:', error);
      return {
        success: false,
        message: `Failed to move item to Recycle Area: ${error.message}`
      };
    }
  }

  /**
   * Get all items in the recycle area for a user
   */
  async getRecycleAreaItems(userId?: number): Promise<RecycleItem[]> {
    try {
      const whereClause = userId ? eq(recycleItems.deletedBy, userId) : undefined;
      
      const items = await db.select()
        .from(recycleItems)
        .where(whereClause)
        .orderBy(recycleItems.deletedAt);

      return items;
    } catch (error) {
      console.error('Error fetching recycle area items:', error);
      return [];
    }
  }

  /**
   * Restore an item from the recycle area back to its original location
   */
  async restoreFromRecycleArea(recycleId: number, userId: number): Promise<RestoreResult> {
    try {
      // Get recycle item
      const [recycleItem] = await db.select()
        .from(recycleItems)
        .where(eq(recycleItems.id, recycleId));

      if (!recycleItem) {
        return {
          success: false,
          message: 'Item not found in Recycle Area'
        };
      }

      if (!recycleItem.canRestore) {
        return {
          success: false,
          message: 'This item cannot be restored'
        };
      }

      // Restore to original table
      const restoredItem = await this.restoreToOriginalTable(
        recycleItem.originalTable,
        recycleItem.itemData as any
      );

      // Remove from recycle area
      await db.delete(recycleItems)
        .where(eq(recycleItems.id, recycleId));

      // Create audit log
      await this.createAuditLog({
        action: 'RESTORE',
        tableName: recycleItem.originalTable,
        itemId: recycleItem.originalId,
        userId: userId,
        details: {
          recycleId: recycleId,
          restoredAt: new Date().toISOString()
        }
      });

      return {
        success: true,
        message: 'Item successfully restored to original location',
        restoredItem: restoredItem
      };

    } catch (error) {
      console.error('Error restoring item:', error);
      return {
        success: false,
        message: `Failed to restore item: ${error.message}`
      };
    }
  }

  /**
   * Permanently delete an item from the recycle area (with final confirmation)
   */
  async permanentlyDelete(recycleId: number, userId: number, finalConfirmation: boolean): Promise<PermanentDeletionResult> {
    try {
      if (!finalConfirmation) {
        return {
          success: false,
          message: 'Final confirmation required for permanent deletion'
        };
      }

      // Get recycle item
      const [recycleItem] = await db.select()
        .from(recycleItems)
        .where(eq(recycleItems.id, recycleId));

      if (!recycleItem) {
        return {
          success: false,
          message: 'Item not found in Recycle Area'
        };
      }

      // Create final audit log before permanent deletion
      const auditLog = await this.createAuditLog({
        action: 'PERMANENT_DELETE',
        tableName: recycleItem.originalTable,
        itemId: recycleItem.originalId,
        userId: userId,
        details: {
          recycleId: recycleId,
          originalData: recycleItem.itemData,
          finalDeletionTimestamp: new Date().toISOString(),
          hipaaCompliant: true,
          irreversible: true
        }
      });

      // Remove from recycle area (permanent deletion)
      await db.delete(recycleItems)
        .where(eq(recycleItems.id, recycleId));

      return {
        success: true,
        message: 'Item permanently deleted. This action cannot be undone.',
        auditLog: auditLog
      };

    } catch (error) {
      console.error('Error in permanent deletion:', error);
      return {
        success: false,
        message: `Failed to permanently delete item: ${error.message}`
      };
    }
  }

  /**
   * Get original item data based on table name and ID
   */
  private async getOriginalItemData(tableName: string, itemId: string): Promise<any> {
    const id = parseInt(itemId);
    
    switch (tableName) {
      case 'patients':
        const [patient] = await db.select().from(patients).where(eq(patients.id, id));
        return patient;
      
      case 'referrals':
        const [referral] = await db.select().from(referrals).where(eq(referrals.id, id));
        return referral;
      
      case 'ai_transcription_sessions':
        const [session] = await db.select().from(aiTranscriptionSessions).where(eq(aiTranscriptionSessions.id, id));
        return session;
      
      case 'ai_hope_assessments':
        const [assessment] = await db.select().from(aiHopeAssessments).where(eq(aiHopeAssessments.id, id));
        return assessment;
      
      default:
        throw new Error(`Unsupported table: ${tableName}`);
    }
  }

  /**
   * Remove item from original table
   */
  private async removeFromOriginalTable(tableName: string, itemId: string): Promise<void> {
    const id = parseInt(itemId);
    
    switch (tableName) {
      case 'patients':
        await db.delete(patients).where(eq(patients.id, id));
        break;
      
      case 'referrals':
        await db.delete(referrals).where(eq(referrals.id, id));
        break;
      
      case 'ai_transcription_sessions':
        await db.delete(aiTranscriptionSessions).where(eq(aiTranscriptionSessions.id, id));
        break;
      
      case 'ai_hope_assessments':
        await db.delete(aiHopeAssessments).where(eq(aiHopeAssessments.id, id));
        break;
      
      default:
        throw new Error(`Unsupported table: ${tableName}`);
    }
  }

  /**
   * Restore item to original table
   */
  private async restoreToOriginalTable(tableName: string, itemData: any): Promise<any> {
    switch (tableName) {
      case 'patients':
        const [restoredPatient] = await db.insert(patients).values(itemData).returning();
        return restoredPatient;
      
      case 'referrals':
        const [restoredReferral] = await db.insert(referrals).values(itemData).returning();
        return restoredReferral;
      
      case 'ai_transcription_sessions':
        const [restoredSession] = await db.insert(aiTranscriptionSessions).values(itemData).returning();
        return restoredSession;
      
      case 'ai_hope_assessments':
        const [restoredAssessment] = await db.insert(aiHopeAssessments).values(itemData).returning();
        return restoredAssessment;
      
      default:
        throw new Error(`Unsupported table: ${tableName}`);
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(logData: {
    action: string;
    tableName: string;
    itemId: string;
    userId: number;
    details: any;
  }): Promise<any> {
    // This would typically integrate with your existing audit logging system
    console.log('AUDIT LOG:', {
      timestamp: new Date().toISOString(),
      action: logData.action,
      table: logData.tableName,
      itemId: logData.itemId,
      userId: logData.userId,
      details: logData.details,
      hipaaCompliant: true
    });
    
    return {
      id: Date.now(),
      ...logData,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Bulk operations for recycle area management
   */
  async bulkRestore(recycleIds: number[], userId: number): Promise<{ successful: number; failed: number; details: any[] }> {
    const results = {
      successful: 0,
      failed: 0,
      details: []
    };

    for (const recycleId of recycleIds) {
      const result = await this.restoreFromRecycleArea(recycleId, userId);
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }
      results.details.push({
        recycleId,
        success: result.success,
        message: result.message
      });
    }

    return results;
  }

  async bulkPermanentDelete(recycleIds: number[], userId: number, finalConfirmation: boolean): Promise<{ successful: number; failed: number; details: any[] }> {
    const results = {
      successful: 0,
      failed: 0,
      details: []
    };

    for (const recycleId of recycleIds) {
      const result = await this.permanentlyDelete(recycleId, userId, finalConfirmation);
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }
      results.details.push({
        recycleId,
        success: result.success,
        message: result.message
      });
    }

    return results;
  }
}

export const dataDeletionSafeguards = new DataDeletionSafeguardsService();