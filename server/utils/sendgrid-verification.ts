import { MailService } from '@sendgrid/mail';

/**
 * SendGrid Verification Helper for iSynera Healthcare Platform
 * Provides utilities to check sender verification status and guide verification process
 */

interface VerificationStatus {
  isConfigured: boolean;
  isVerified: boolean;
  senderEmail: string;
  message: string;
  nextSteps: string[];
}

export class SendGridVerificationHelper {
  private mailService: MailService;
  private senderEmail = 'noreply@isynera.healthcare';

  constructor() {
    this.mailService = new MailService();
    if (process.env.SENDGRID_API_KEY) {
      this.mailService.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  /**
   * Check the current verification status of the sender email
   */
  async checkVerificationStatus(): Promise<VerificationStatus> {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      return {
        isConfigured: false,
        isVerified: false,
        senderEmail: this.senderEmail,
        message: 'SendGrid API key not configured',
        nextSteps: [
          'Add SENDGRID_API_KEY to environment variables',
          'Restart the application'
        ]
      };
    }

    try {
      // Test with a simple validation attempt
      const testResult = await this.testSenderValidation();
      
      return {
        isConfigured: true,
        isVerified: testResult.success,
        senderEmail: this.senderEmail,
        message: testResult.success 
          ? 'Sender email is verified and ready for production'
          : `Sender verification required: ${testResult.error}`,
        nextSteps: testResult.success 
          ? ['Email service is ready for production use']
          : [
              'Log into SendGrid dashboard at https://app.sendgrid.com',
              'Navigate to Settings → Sender Authentication',
              'Add Single Sender Verification for noreply@isynera.healthcare',
              'Complete email verification process',
              'Test email delivery'
            ]
      };

    } catch (error) {
      return {
        isConfigured: true,
        isVerified: false,
        senderEmail: this.senderEmail,
        message: `Verification check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextSteps: [
          'Verify SendGrid API key has correct permissions',
          'Complete sender verification in SendGrid dashboard',
          'Check SendGrid account status'
        ]
      };
    }
  }

  /**
   * Test sender validation by attempting to send to a test email
   */
  private async testSenderValidation(): Promise<{ success: boolean; error?: string }> {
    try {
      // Use SendGrid's mail/send endpoint with sandbox mode for testing
      const testEmailData = {
        to: 'test@example.com', // This won't actually send due to sandbox
        from: {
          email: this.senderEmail,
          name: 'iSynera AI Healthcare Platform'
        },
        subject: 'Verification Test',
        content: [{
          type: 'text/plain',
          value: 'This is a sender verification test'
        }],
        mail_settings: {
          sandbox_mode: {
            enable: true // This prevents actual sending
          }
        }
      };

      await this.mailService.send(testEmailData);
      return { success: true };

    } catch (error: any) {
      // Parse SendGrid specific errors
      if (error.response?.body?.errors) {
        const errors = error.response.body.errors;
        for (const err of errors) {
          if (err.message?.includes('sender identity') || 
              err.message?.includes('not verified') ||
              err.field === 'from.email') {
            return { 
              success: false, 
              error: 'Sender email address not verified in SendGrid' 
            };
          }
        }
      }

      return { 
        success: false, 
        error: error.message || 'Unknown verification error' 
      };
    }
  }

  /**
   * Generate step-by-step verification instructions
   */
  getVerificationInstructions(): string[] {
    return [
      '1. Log into SendGrid Dashboard',
      '   → Visit: https://app.sendgrid.com',
      '   → Use your SendGrid account credentials',
      '',
      '2. Navigate to Sender Authentication',
      '   → Click "Settings" in left sidebar',
      '   → Click "Sender Authentication"',
      '',
      '3. Add Single Sender Verification',
      '   → Click "Single Sender Verification"',
      '   → Click "Create New Sender"',
      '',
      '4. Fill in Sender Details',
      '   → From Name: iSynera AI Healthcare Platform',
      '   → From Email: noreply@isynera.healthcare',
      '   → Reply To: admin@isynera.com',
      '   → Company: [Your healthcare organization]',
      '   → Address: [Your organization address]',
      '   → City, State, Zip: [Your location details]',
      '   → Country: [Your country]',
      '',
      '5. Complete Email Verification',
      '   → Click "Create"',
      '   → Check email inbox for noreply@isynera.healthcare',
      '   → Click verification link in email',
      '',
      '6. Test Email Delivery',
      '   → Return to iSynera platform',
      '   → Test email functionality in AI Transcription Scribe',
      '   → Verify emails are delivered successfully'
    ];
  }
}

export const sendGridVerification = new SendGridVerificationHelper();