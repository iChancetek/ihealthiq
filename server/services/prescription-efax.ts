import { emailService } from './email-service';

export interface eFaxResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryStatus?: 'sent' | 'pending' | 'failed';
}

export interface PrescriptionData {
  id: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
  refills: number;
  diagnosisCode: string;
  prescribedAt: Date;
}

export interface PatientData {
  id: number;
  patientName: string;
  dateOfBirth: string;
  address?: string;
  phone?: string;
  allergies?: string;
}

export interface PharmacyData {
  id: string;
  name: string;
  address: string;
  phone: string;
  fax: string;
  npi?: string;
  ncpdp?: string;
}

export class PrescriptioneFaxService {
  // Send new prescription to pharmacy via eFax
  async sendPrescriptionToPharmacy(
    prescription: PrescriptionData, 
    patient: PatientData, 
    pharmacy: PharmacyData
  ): Promise<eFaxResponse> {
    try {
      // Generate prescription content in standard format
      const prescriptionContent = this.generatePrescriptionDocument(prescription, patient, pharmacy);
      
      // In production, this would integrate with a real eFax service like:
      // - SRFax, eFax Corporate, MetroFax, or FaxAge
      // For now, we'll simulate eFax by sending via email with specific formatting
      
      const subject = `PRESCRIPTION ORDER - ${patient.patientName} - ${prescription.medicationName}`;
      const htmlContent = this.formatPrescriptionForTransmission(prescriptionContent);
      
      // Send via email to pharmacy fax gateway (most eFax services support email-to-fax)
      const emailResult = await emailService.sendEmail({
        to: `${pharmacy.fax.replace(/[^\d]/g, '')}@efax.gateway.local`, // Simulated fax gateway
        subject: subject,
        text: prescriptionContent,
        html: htmlContent
      });

      if (emailResult.success) {
        return {
          success: true,
          messageId: emailResult.messageId,
          deliveryStatus: 'sent'
        };
      } else {
        return {
          success: false,
          error: emailResult.error || 'Failed to send prescription via eFax',
          deliveryStatus: 'failed'
        };
      }
      
    } catch (error) {
      console.error('Error sending prescription via eFax:', error);
      return {
        success: false,
        error: 'eFax transmission failed',
        deliveryStatus: 'failed'
      };
    }
  }

  // Send refill authorization to pharmacy via eFax
  async sendRefillToPharmacy(
    refillRequest: any,
    doctorNotes?: string,
    dosageChanges?: string
  ): Promise<eFaxResponse> {
    try {
      const refillContent = this.generateRefillDocument(refillRequest, doctorNotes, dosageChanges);
      
      const subject = `REFILL AUTHORIZATION - ${refillRequest.patientName} - ${refillRequest.medicationName}`;
      const htmlContent = this.formatRefillForTransmission(refillContent);
      
      // Send via email to pharmacy fax gateway
      const emailResult = await emailService.sendEmail({
        to: `${refillRequest.pharmacyFax.replace(/[^\d]/g, '')}@efax.gateway.local`,
        subject: subject,
        text: refillContent,
        html: htmlContent
      });

      if (emailResult.success) {
        return {
          success: true,
          messageId: emailResult.messageId,
          deliveryStatus: 'sent'
        };
      } else {
        return {
          success: false,
          error: emailResult.error || 'Failed to send refill authorization via eFax',
          deliveryStatus: 'failed'
        };
      }
      
    } catch (error) {
      console.error('Error sending refill via eFax:', error);
      return {
        success: false,
        error: 'eFax transmission failed',
        deliveryStatus: 'failed'
      };
    }
  }

  // Generate standard prescription document format
  private generatePrescriptionDocument(
    prescription: PrescriptionData, 
    patient: PatientData, 
    pharmacy: PharmacyData
  ): string {
    const currentDate = new Date().toLocaleDateString();
    
    return `
PRESCRIPTION ORDER
================

Date: ${currentDate}
Prescription ID: ${prescription.id}

TO: ${pharmacy.name}
    ${pharmacy.address}
    Phone: ${pharmacy.phone}
    Fax: ${pharmacy.fax}
    ${pharmacy.npi ? `NPI: ${pharmacy.npi}` : ''}

PATIENT INFORMATION:
Name: ${patient.patientName}
DOB: ${patient.dateOfBirth}
${patient.address ? `Address: ${patient.address}` : ''}
${patient.phone ? `Phone: ${patient.phone}` : ''}
${patient.allergies ? `Allergies: ${patient.allergies}` : 'No known allergies'}

PRESCRIPTION:
Medication: ${prescription.medicationName}
Strength/Dosage: ${prescription.dosage}
Frequency: ${prescription.frequency}
Duration: ${prescription.duration}
Quantity: ${prescription.quantity}
Refills: ${prescription.refills}
${prescription.diagnosisCode ? `Diagnosis Code: ${prescription.diagnosisCode}` : ''}

INSTRUCTIONS:
${prescription.instructions || 'Take as directed'}

PRESCRIBER:
Dr. [Prescriber Name]
DEA#: [DEA Number]
NPI: [NPI Number]
License: [License Number]

SIGNATURE: [Electronic Signature]
Date Prescribed: ${prescription.prescribedAt.toLocaleDateString()}

================
HIPAA COMPLIANT TRANSMISSION
This fax contains confidential medical information.
If received in error, please contact sender immediately.
================
    `.trim();
  }

  // Generate refill authorization document
  private generateRefillDocument(
    refillRequest: any,
    doctorNotes?: string,
    dosageChanges?: string
  ): string {
    const currentDate = new Date().toLocaleDateString();
    
    return `
REFILL AUTHORIZATION
===================

Date: ${currentDate}
Refill Request ID: ${refillRequest.id}

TO: ${refillRequest.pharmacyName}
Fax: ${refillRequest.pharmacyFax}

PATIENT: ${refillRequest.patientName}
MEDICATION: ${refillRequest.medicationName}
CURRENT DOSAGE: ${refillRequest.currentDosage}

AUTHORIZATION: APPROVED
Authorized Refills: ${refillRequest.requestedRefills}

${dosageChanges ? `DOSAGE CHANGES:
${dosageChanges}` : ''}

${doctorNotes ? `DOCTOR NOTES:
${doctorNotes}` : ''}

PRESCRIBER:
Dr. [Prescriber Name]
DEA#: [DEA Number]
Date: ${currentDate}

SIGNATURE: [Electronic Signature]

===================
HIPAA COMPLIANT TRANSMISSION
===================
    `.trim();
  }

  // Format prescription for HTML transmission
  private formatPrescriptionForTransmission(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Prescription Order</title>
    <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; }
        .header { text-align: center; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .section { margin: 15px 0; }
        .patient-info, .prescription-info { background-color: #f5f5f5; padding: 10px; border: 1px solid #ccc; }
        .footer { border-top: 2px solid #000; margin-top: 20px; padding-top: 10px; font-size: 10px; }
    </style>
</head>
<body>
    <pre>${content}</pre>
</body>
</html>
    `;
  }

  // Format refill for HTML transmission
  private formatRefillForTransmission(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Refill Authorization</title>
    <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; }
        .approval { color: green; font-weight: bold; }
        .section { margin: 15px 0; }
    </style>
</head>
<body>
    <pre>${content}</pre>
</body>
</html>
    `;
  }
}

// Export service functions
const eFaxService = new PrescriptioneFaxService();

export const sendPrescriptionToPharmacy = eFaxService.sendPrescriptionToPharmacy.bind(eFaxService);
export const sendRefillToPharmacy = eFaxService.sendRefillToPharmacy.bind(eFaxService);