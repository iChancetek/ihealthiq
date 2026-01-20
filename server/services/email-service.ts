import { MailService } from '@sendgrid/mail';

export class EmailService {
  private mailService: MailService;
  private isConfigured: boolean = false;

  constructor() {
    this.mailService = new MailService();
    this.setupSendGrid();
  }

  private setupSendGrid() {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (apiKey) {
      this.mailService.setApiKey(apiKey);
      this.isConfigured = true;
      console.log('SendGrid email service initialized successfully');
      console.log('Note: Ensure sender email is verified in SendGrid dashboard');
    } else {
      console.warn('SendGrid API key not configured - email functionality will be simulated');
      this.isConfigured = false;
    }
  }

  async sendTranscriptionSummary(params: {
    to: string;
    subject: string;
    content: string;
    sessionId: string;
    audioAttachment?: {
      filename: string;
      content: string; // base64 encoded
      type: string;
    };
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured) {
        // Log the email details for development/testing
        console.log('=== EMAIL SIMULATION (SendGrid not configured) ===');
        console.log(`To: ${params.to}`);
        console.log(`Subject: ${params.subject}`);
        console.log(`Session ID: ${params.sessionId}`);
        console.log(`Has Audio Attachment: ${!!params.audioAttachment}`);
        console.log(`Content Preview: ${params.content.substring(0, 200)}...`);
        console.log('=== END EMAIL SIMULATION ===');
        
        // Return error indicating configuration needed
        throw new Error(
          'Email service not configured. Please provide SENDGRID_API_KEY to enable real email functionality. ' +
          'This email has been logged but not sent.'
        );
      }

      // Use a verified SendGrid sender email from the available verified addresses
      const emailData: any = {
        to: params.to,
        from: {
          email: 'healthcare@isynera.com',
          name: 'iSynera AI Healthcare Platform'
        },
        subject: params.subject,
        html: this.formatEmailHTML(params.content, params.sessionId),
        text: params.content,
        trackingSettings: {
          clickTracking: { enable: false },
          openTracking: { enable: false }
        },
        mailSettings: {
          sandboxMode: { enable: false }
        }
      };

      // Add audio attachment if provided
      if (params.audioAttachment) {
        emailData.attachments = [{
          content: params.audioAttachment.content,
          filename: params.audioAttachment.filename,
          type: params.audioAttachment.type,
          disposition: 'attachment'
        }];
      }

      console.log('Attempting to send email with SendGrid...');
      console.log(`To: ${params.to}`);
      console.log(`From: ${emailData.from.email}`);
      console.log(`Subject: ${params.subject}`);
      console.log(`Has attachment: ${!!params.audioAttachment}`);
      
      const [response] = await this.mailService.send(emailData);
      
      console.log(`Real email sent successfully to ${params.to} via SendGrid`);
      console.log(`SendGrid Response Status: ${response.statusCode}`);
      console.log(`SendGrid Message ID: ${response.headers['x-message-id']}`);
      console.log('Full SendGrid Response:', JSON.stringify(response.headers, null, 2));
      
      return {
        success: true,
        messageId: response.headers['x-message-id'] as string
      };

    } catch (error: any) {
      console.error('Email sending failed:', error);
      
      // Handle specific SendGrid errors
      let errorMessage = 'Unknown email error';
      let needsVerification = false;
      
      if (error && error.code === 403) {
        errorMessage = 'Sender email verification required. The email address healthcare@isynera.com must be verified in SendGrid dashboard. Visit: https://app.sendgrid.com/settings/sender_auth/senders';
        needsVerification = true;
        console.error('SENDGRID 403 FORBIDDEN: Sender verification required');
      } else if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for common SendGrid verification issues
        if (errorMessage.includes('sender identity') || errorMessage.includes('verify') || errorMessage.includes('not verified') || errorMessage.includes('Forbidden')) {
          errorMessage = 'Sender email address needs to be verified in SendGrid. Please verify healthcare@isynera.com in your SendGrid dashboard at: https://app.sendgrid.com/settings/sender_auth/senders';
          needsVerification = true;
        } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
          errorMessage = 'SendGrid API key may be invalid or lacks required permissions.';
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        needsVerification,
        verificationUrl: needsVerification ? 'https://app.sendgrid.com/settings/sender_auth/senders' : undefined
      };
    }
  }

  private formatEmailHTML(content: string, sessionId: string): string {
    // Convert plain text content to HTML with proper formatting
    const htmlContent = content
      .split('\n')
      .map(line => {
        if (line.startsWith('===')) {
          return `<h3 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 5px; margin-top: 20px;">${line.replace(/=/g, '').trim()}</h3>`;
        }
        if (line.trim() === '') {
          return '<br>';
        }
        return `<p style="margin: 10px 0; line-height: 1.5;">${line}</p>`;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>iSynera AI Healthcare - Transcription Summary</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
          
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">iSynera AI Healthcare Platform</h1>
            <p style="color: #e0e7ff; margin: 5px 0 0 0;">HIPAA-Compliant Clinical Transcription Summary</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin-bottom: 20px;">
            <p style="margin: 0; font-weight: 600; color: #475569;">Session ID: ${sessionId}</p>
            <p style="margin: 5px 0 0 0; color: #64748b;">Generated: ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            ${htmlContent}
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background: #f1f5f9; border-radius: 8px; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">
              This email was generated by iSynera AI Healthcare Platform<br>
              All medical information is HIPAA-protected and confidential
            </p>
          </div>
          
        </body>
      </html>
    `;
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
      filename: string;
      content: string; // base64 encoded
      type: string;
    }>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured) {
        console.log('=== EMAIL SIMULATION (SendGrid not configured) ===');
        console.log(`To: ${params.to}`);
        console.log(`Subject: ${params.subject}`);
        console.log(`Has Attachments: ${!!(params.attachments && params.attachments.length > 0)}`);
        console.log('=== END EMAIL SIMULATION ===');
        
        throw new Error(
          'Email service not configured. Please provide SENDGRID_API_KEY to enable real email functionality.'
        );
      }

      console.log('Attempting to send email with SendGrid...');
      console.log(`To: ${params.to}`);
      console.log(`From: healthcare@isynera.com`);
      console.log(`Subject: ${params.subject}`);
      console.log(`Has attachment: ${!!(params.attachments && params.attachments.length > 0)}`);

      const emailData: any = {
        to: params.to,
        from: 'healthcare@isynera.com',
        subject: params.subject,
      };

      if (params.html) {
        emailData.html = params.html;
      }
      if (params.text) {
        emailData.text = params.text;
      }

      if (params.attachments && params.attachments.length > 0) {
        emailData.attachments = params.attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.type,
          disposition: 'attachment'
        }));
      }

      const response = await this.mailService.send(emailData);
      
      console.log('Real email sent successfully to', params.to, 'via SendGrid');
      console.log('SendGrid Response Status:', response[0]?.statusCode);
      console.log('SendGrid Message ID:', response[0]?.headers?.['x-message-id']);
      console.log('Full SendGrid Response:', response[0]?.headers);

      return {
        success: true,
        messageId: response[0]?.headers?.['x-message-id'] || 'unknown'
      };

    } catch (error) {
      console.error('SendGrid email error:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    return await this.sendTranscriptionSummary({
      to,
      subject: 'iSynera AI - Email Service Test',
      content: `
This is a test email from iSynera AI Healthcare Platform.

If you receive this email, the SendGrid integration is working correctly.

Test Details:
- Service: SendGrid Email API
- Timestamp: ${new Date().toISOString()}
- Platform: iSynera AI Healthcare
- Status: Email service operational

=== FEATURES CONFIRMED ===
- HTML formatting
- HIPAA-compliant templates  
- Attachment support
- Secure transmission

This confirms that clinical transcription summaries, SOAP notes, and AI-generated reports can be successfully delivered via email.
      `,
      sessionId: `TEST-${Date.now()}`
    });
  }
}

export const emailService = new EmailService();