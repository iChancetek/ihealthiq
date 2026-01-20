import Anthropic from '@anthropic-ai/sdk';
import { storage } from '../storage';
import { db } from '../db';
import { auditLogs } from '@shared/schema';

// the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
export interface QAPINotificationError {
  errorType: 'missing_fields' | 'invalid_data' | 'late_action' | 'compliance_issue' | 'data_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportId: string;
  reportType: string;
  patientName: string;
  patientId: number;
  reportDate: string;
  responsibleUserId: number;
  issueDescription: string;
  fieldsMissing?: string[];
  suggestedActions?: string[];
  deadlineHours: number;
}

export interface QAPIEmailTemplate {
  subject: string;
  body: string;
  recipients: string[];
  priority: 'normal' | 'high' | 'urgent';
  escalationRequired: boolean;
}

export interface QAPIAuditEntry {
  notificationId: string;
  reportId: string;
  errorType: string;
  severity: string;
  emailSent: boolean;
  emailSentAt?: string;
  recipientEmails: string[];
  responseReceived: boolean;
  responseAt?: string;
  escalationTriggered: boolean;
  resolvedAt?: string;
  aiGeneratedContent: string;
  createdAt: string;
}

export class QAPINotificationAgent {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async monitorReportsForErrors(): Promise<QAPINotificationError[]> {
    const errors: QAPINotificationError[] = [];

    try {
      // Monitor referrals for errors
      const referrals = await storage.getReferrals();
      for (const referral of referrals) {
        const referralErrors = await this.analyzeReferralForErrors(referral);
        errors.push(...referralErrors);
      }

      // Monitor eligibility verifications
      const verifications = await storage.getEligibilityVerificationsByPatient(0); // Get all
      for (const verification of verifications) {
        const verificationErrors = await this.analyzeEligibilityForErrors(verification);
        errors.push(...verificationErrors);
      }

      // Monitor homebound assessments
      const assessments = await storage.getHomeboundAssessmentsByPatient(0); // Get all
      for (const assessment of assessments) {
        const assessmentErrors = await this.analyzeHomeboundForErrors(assessment);
        errors.push(...assessmentErrors);
      }

      // Monitor appointments for late actions
      const appointments = await storage.getAppointments();
      for (const appointment of appointments) {
        const appointmentErrors = await this.analyzeAppointmentForErrors(appointment);
        errors.push(...appointmentErrors);
      }

      return errors;
    } catch (error) {
      console.error('Error monitoring reports:', error);
      return [];
    }
  }

  private async analyzeReferralForErrors(referral: any): Promise<QAPINotificationError[]> {
    const errors: QAPINotificationError[] = [];
    const patient = await storage.getPatient(referral.patientId);
    
    if (!patient) return errors;

    // Check for missing critical fields
    const missingFields: string[] = [];
    if (!referral.diagnosis) missingFields.push('Primary Diagnosis');
    if (!referral.referringPhysician) missingFields.push('Referring Physician');
    if (!referral.urgencyLevel) missingFields.push('Urgency Level');
    if (!referral.serviceRequested) missingFields.push('Service Requested');

    if (missingFields.length > 0) {
      errors.push({
        errorType: 'missing_fields',
        severity: missingFields.length > 2 ? 'high' : 'medium',
        reportId: `REF-${referral.id}`,
        reportType: 'Referral',
        patientName: patient.patientName,
        patientId: patient.id,
        reportDate: referral.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        responsibleUserId: referral.createdBy || 1,
        issueDescription: `Missing required fields: ${missingFields.join(', ')}`,
        fieldsMissing: missingFields,
        suggestedActions: ['Complete missing documentation', 'Contact referring physician for additional information'],
        deadlineHours: 48
      });
    }

    // Check for late SOC (Start of Care)
    if (referral.urgencyLevel === 'urgent' && referral.createdAt) {
      const hoursSinceCreation = (Date.now() - referral.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 48 && referral.status !== 'completed') {
        errors.push({
          errorType: 'late_action',
          severity: 'critical',
          reportId: `REF-${referral.id}`,
          reportType: 'Referral',
          patientName: patient.patientName,
          patientId: patient.id,
          reportDate: referral.createdAt.toISOString().split('T')[0],
          responsibleUserId: referral.createdBy || 1,
          issueDescription: `Urgent referral not completed within 48 hours (${Math.round(hoursSinceCreation)} hours elapsed)`,
          suggestedActions: ['Immediate contact with care team', 'Expedite service initiation', 'Document delay reasons'],
          deadlineHours: 24
        });
      }
    }

    return errors;
  }

  private async analyzeEligibilityForErrors(verification: any): Promise<QAPINotificationError[]> {
    const errors: QAPINotificationError[] = [];
    const patient = await storage.getPatient(verification.patientId);
    
    if (!patient) return errors;

    // Check for expired insurance or eligibility issues
    if (verification.eligibilityStatus === 'denied' || verification.eligibilityStatus === 'expired') {
      errors.push({
        errorType: 'invalid_data',
        severity: 'high',
        reportId: `ELIG-${verification.id}`,
        reportType: 'Eligibility Verification',
        patientName: patient.patientName,
        patientId: patient.id,
        reportDate: verification.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        responsibleUserId: 1,
        issueDescription: `Patient eligibility ${verification.eligibilityStatus}: ${verification.denialReason || 'Unknown reason'}`,
        suggestedActions: ['Contact insurance provider', 'Review alternative coverage options', 'Update patient information'],
        deadlineHours: 24
      });
    }

    return errors;
  }

  private async analyzeHomeboundForErrors(assessment: any): Promise<QAPINotificationError[]> {
    const errors: QAPINotificationError[] = [];
    const patient = await storage.getPatient(assessment.patientId);
    
    if (!patient) return errors;

    // Check for incomplete homebound assessment
    if (!assessment.physicianSignature || !assessment.assessmentDate) {
      errors.push({
        errorType: 'missing_fields',
        severity: 'high',
        reportId: `HB-${assessment.id}`,
        reportType: 'Homebound Assessment',
        patientName: patient.patientName,
        patientId: patient.id,
        reportDate: assessment.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        responsibleUserId: 1,
        issueDescription: 'Homebound assessment missing physician signature or assessment date',
        fieldsMissing: [
          ...(assessment.physicianSignature ? [] : ['Physician Signature']),
          ...(assessment.assessmentDate ? [] : ['Assessment Date'])
        ],
        suggestedActions: ['Obtain physician signature', 'Complete assessment documentation'],
        deadlineHours: 72
      });
    }

    return errors;
  }

  private async analyzeAppointmentForErrors(appointment: any): Promise<QAPINotificationError[]> {
    const errors: QAPINotificationError[] = [];
    const patient = await storage.getPatient(appointment.patientId);
    
    if (!patient) return errors;

    // Check for missed appointments without follow-up
    if (appointment.status === 'missed' && appointment.scheduledDate) {
      const daysSinceMissed = (Date.now() - appointment.scheduledDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceMissed > 3) {
        errors.push({
          errorType: 'late_action',
          severity: 'medium',
          reportId: `APPT-${appointment.id}`,
          reportType: 'Appointment',
          patientName: patient.patientName,
          patientId: patient.id,
          reportDate: appointment.scheduledDate.toISOString().split('T')[0],
          responsibleUserId: 1,
          issueDescription: `Missed appointment with no follow-up after ${Math.round(daysSinceMissed)} days`,
          suggestedActions: ['Contact patient for rescheduling', 'Document no-show reason', 'Update care plan if needed'],
          deadlineHours: 24
        });
      }
    }

    return errors;
  }

  async generateQAPIEmail(error: QAPINotificationError): Promise<QAPIEmailTemplate> {
    const user = await storage.getUser(error.responsibleUserId);
    const userName = user ? user.username : 'Staff Member';
    const userEmail = user?.email || 'staff@healthcare.com';

    const prompt = `
You are a healthcare quality officer. Compose a formal QAPI email to the responsible healthcare staff member regarding the following issue:

Error Type: ${error.errorType}
Severity: ${error.severity}
Patient Name: ${error.patientName}
Report Name/ID: ${error.reportType} / ${error.reportId}
Date of Report: ${error.reportDate}
Responsible User: ${userName}
Description: ${error.issueDescription}
${error.fieldsMissing ? `Missing Fields: ${error.fieldsMissing.join(', ')}` : ''}
${error.suggestedActions ? `Suggested Actions: ${error.suggestedActions.join(', ')}` : ''}

Use a respectful and compliance-focused tone. Include:
- A short description of the error
- Request for corrective action
- Deadline to respond (${error.deadlineHours} hours)
- Contact info for escalation

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "subject": "QAPI Notification – Action Required for Report ID [reportId]",
  "body": "Professional email body with proper formatting",
  "priority": "normal|high|urgent",
  "escalationRequired": false
}

No markdown, no code blocks, no explanatory text. Only valid JSON.
    `;

    try {
      const response = await this.anthropic.messages.create({
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
        model: 'claude-sonnet-4-20250514',
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const emailTemplate = this.extractValidJson(responseText);

      return {
        subject: emailTemplate.subject || `QAPI Notification – Action Required for Report ID ${error.reportId}`,
        body: emailTemplate.body || this.getDefaultEmailBody(error, userName),
        recipients: [userEmail],
        priority: emailTemplate.priority || (error.severity === 'critical' ? 'urgent' : error.severity === 'high' ? 'high' : 'normal'),
        escalationRequired: emailTemplate.escalationRequired || error.severity === 'critical'
      };
    } catch (genError) {
      console.error('Error generating QAPI email:', genError);
      return this.getDefaultEmailTemplate(error, userName, userEmail);
    }
  }

  private extractValidJson(response: string): any {
    try {
      // Try direct parsing first
      return JSON.parse(response);
    } catch {
      try {
        // Clean and try again
        const cleaned = this.cleanJsonResponse(response);
        return JSON.parse(cleaned);
      } catch {
        try {
          // Extract with regex as last resort
          return this.extractJsonWithRegex(response);
        } catch {
          return {};
        }
      }
    }
  }

  private cleanJsonResponse(response: string): string {
    return response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/^\s*[\w\s]*?{/, '{')
      .replace(/}\s*[\w\s]*?$/, '}')
      .trim();
  }

  private extractJsonWithRegex(response: string): any {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found');
  }

  private getDefaultEmailBody(error: QAPINotificationError, userName: string): string {
    return `
Dear ${userName},

During routine quality review, the following issue was identified:

• Patient: ${error.patientName}
• Report: ${error.reportType} (${error.reportDate})
• Error: ${error.issueDescription}

Please address this issue within ${error.deadlineHours} hours and update the record accordingly.

${error.suggestedActions ? `Recommended Actions:\n${error.suggestedActions.map(action => `• ${action}`).join('\n')}\n` : ''}

If you have questions or need assistance, contact the QAPI department at qapi-team@isynera.com.

Thank you for your prompt attention to this matter.

Best regards,
QAPI Quality Assurance Team
Healthcare AI Platform
    `.trim();
  }

  private getDefaultEmailTemplate(error: QAPINotificationError, userName: string, userEmail: string): QAPIEmailTemplate {
    return {
      subject: `QAPI Notification – Action Required for Report ID ${error.reportId}`,
      body: this.getDefaultEmailBody(error, userName),
      recipients: [userEmail],
      priority: error.severity === 'critical' ? 'urgent' : error.severity === 'high' ? 'high' : 'normal',
      escalationRequired: error.severity === 'critical'
    };
  }

  async sendQAPINotification(error: QAPINotificationError): Promise<boolean> {
    try {
      const emailTemplate = await this.generateQAPIEmail(error);
      const notificationId = `QAPI-${Date.now()}-${error.reportId}`;

      // Log the notification attempt
      await this.logQAPINotification(notificationId, error, emailTemplate);

      // In a real implementation, you would send the email here using SendGrid, Gmail API, etc.
      // For now, we'll simulate the email sending process
      console.log('QAPI Email Generated:', {
        notificationId,
        to: emailTemplate.recipients,
        subject: emailTemplate.subject,
        priority: emailTemplate.priority,
        escalationRequired: emailTemplate.escalationRequired
      });

      // Update the audit log to mark email as sent
      await this.updateNotificationStatus(notificationId, true);

      return true;
    } catch (error) {
      console.error('Error sending QAPI notification:', error);
      return false;
    }
  }

  private async logQAPINotification(
    notificationId: string,
    error: QAPINotificationError,
    emailTemplate: QAPIEmailTemplate
  ): Promise<void> {
    try {
      await storage.createAuditLog({
        userId: error.responsibleUserId,
        action: 'qapi_notification_generated',
        resource: 'qapi_notification',
        resourceId: notificationId,
        details: JSON.stringify({
          notificationId,
          reportId: error.reportId,
          errorType: error.errorType,
          severity: error.severity,
          emailSubject: emailTemplate.subject,
          recipients: emailTemplate.recipients,
          priority: emailTemplate.priority,
          escalationRequired: emailTemplate.escalationRequired,
          patientId: error.patientId,
          issueDescription: error.issueDescription
        }),
        ipAddress: '127.0.0.1'
      });
    } catch (logError) {
      console.error('Error logging QAPI notification:', logError);
    }
  }

  private async updateNotificationStatus(notificationId: string, emailSent: boolean): Promise<void> {
    try {
      await storage.createAuditLog({
        userId: 1,
        action: 'qapi_notification_sent',
        resource: 'qapi_notification',
        resourceId: notificationId,
        details: JSON.stringify({
          notificationId,
          emailSent,
          sentAt: new Date().toISOString()
        }),
        ipAddress: '127.0.0.1'
      });
    } catch (error) {
      console.error('Error updating notification status:', error);
    }
  }

  async processAllQAPINotifications(): Promise<{
    totalErrors: number;
    notificationsSent: number;
    criticalIssues: number;
    escalationsTriggered: number;
  }> {
    const errors = await this.monitorReportsForErrors();
    let notificationsSent = 0;
    let criticalIssues = 0;
    let escalationsTriggered = 0;

    for (const error of errors) {
      if (error.severity === 'critical') {
        criticalIssues++;
      }

      const sent = await this.sendQAPINotification(error);
      if (sent) {
        notificationsSent++;
        
        if (error.severity === 'critical') {
          escalationsTriggered++;
        }
      }
    }

    return {
      totalErrors: errors.length,
      notificationsSent,
      criticalIssues,
      escalationsTriggered
    };
  }
}

export const qapiNotificationAgent = new QAPINotificationAgent();