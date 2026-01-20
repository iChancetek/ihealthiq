export interface StaffMember {
  id: string;
  name: string;
  license: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  availability: {
    [key: string]: string[]; // day of week -> time slots
  };
  maxDailyVisits: number;
  travelRadius: number; // in miles
}

export interface ScheduleRecommendation {
  staffId: string;
  staffName: string;
  recommendedDate: Date;
  recommendedTime: string;
  travelDistance: number;
  confidence: number;
  reasoning: string;
}

export class SchedulerService {
  private googleMapsApiKey: string;
  private staffMembers: StaffMember[] = [];

  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_CLOUD_API_KEY || "test_key";
    // Staff data should be loaded from database or admin configuration
    this.staffMembers = [];
  }

  async getOptimalSchedule(patientLocation: any, appointmentType: string, preferredDates: Date[]): Promise<ScheduleRecommendation[]> {
    try {
      const recommendations: ScheduleRecommendation[] = [];

      for (const staff of this.staffMembers) {
        // Check if staff has required license for appointment type
        if (!this.hasRequiredLicense(staff, appointmentType)) {
          continue;
        }

        // Calculate travel distance
        const distance = await this.calculateDistance(staff.location, patientLocation);
        
        if (distance > staff.travelRadius) {
          continue;
        }

        // Find available time slots
        for (const preferredDate of preferredDates) {
          const dayOfWeek = this.getDayOfWeek(preferredDate);
          const availableSlots = staff.availability[dayOfWeek] || [];

          for (const timeSlot of availableSlots) {
            const confidence = this.calculateConfidence(staff, distance, preferredDate, timeSlot);
            
            recommendations.push({
              staffId: staff.id,
              staffName: staff.name,
              recommendedDate: preferredDate,
              recommendedTime: timeSlot,
              travelDistance: distance,
              confidence,
              reasoning: this.generateReasoning(staff, distance, confidence)
            });
          }
        }
      }

      // Sort by confidence score (highest first)
      return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
    } catch (error) {
      console.error("Error generating schedule recommendations:", error);
      throw new Error("Failed to generate schedule recommendations: " + (error as Error).message);
    }
  }

  private async calculateDistance(staffLocation: any, patientLocation: any): Promise<number> {
    if (!this.googleMapsApiKey || this.googleMapsApiKey === "test_key") {
      // Return mock distance for testing
      return Math.random() * 20 + 5; // 5-25 miles
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${staffLocation.lat},${staffLocation.lng}&destinations=${patientLocation.lat},${patientLocation.lng}&units=imperial&key=${this.googleMapsApiKey}`
      );

      if (!response.ok) {
        throw new Error(`Google Maps API error: ${response.statusText}`);
      }

      const data = await response.json();
      const element = data.rows?.[0]?.elements?.[0];
      
      if (element?.status === "OK") {
        const distanceText = element.distance.text;
        const distanceValue = parseFloat(distanceText.replace(/[^\d.]/g, ''));
        return distanceValue;
      } else {
        throw new Error("Unable to calculate distance");
      }
    } catch (error) {
      console.error("Distance calculation failed:", error);
      return 999; // Return high value to deprioritize
    }
  }

  private hasRequiredLicense(staff: StaffMember, appointmentType: string): boolean {
    const requiredLicenses: { [key: string]: string[] } = {
      'soc': ['RN'],
      'evaluation': ['PT', 'OT', 'ST'],
      'nursing': ['RN', 'LPN'],
      'therapy': ['PT', 'OT', 'ST'],
      'routine': ['RN', 'LPN', 'PT', 'OT', 'ST']
    };

    const required = requiredLicenses[appointmentType] || [];
    return required.some(license => staff.license.includes(license));
  }

  private getDayOfWeek(date: Date): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  private calculateConfidence(staff: StaffMember, distance: number, date: Date, timeSlot: string): number {
    let confidence = 100;

    // Distance factor (closer is better)
    confidence -= (distance / staff.travelRadius) * 30;

    // Time preference factor (morning slots generally preferred)
    const hour = parseInt(timeSlot.split(':')[0]);
    if (hour >= 9 && hour <= 11) {
      confidence += 10; // Morning bonus
    } else if (hour >= 14 && hour <= 16) {
      confidence += 5; // Afternoon bonus
    }

    // Day preference factor (weekdays preferred)
    const dayOfWeek = date.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      confidence += 5; // Weekday bonus
    }

    return Math.max(0, Math.min(100, confidence));
  }

  private generateReasoning(staff: StaffMember, distance: number, confidence: number): string {
    let reasons = [];
    
    if (distance <= 10) {
      reasons.push("Close proximity to patient");
    } else if (distance <= 20) {
      reasons.push("Reasonable travel distance");
    }

    if (confidence >= 80) {
      reasons.push("High availability match");
    } else if (confidence >= 60) {
      reasons.push("Good availability match");
    }

    reasons.push(`${distance.toFixed(1)} miles travel distance`);

    return reasons.join(", ");
  }

  async createSOCAlert(patientId: number, appointmentDate: Date): Promise<void> {
    // Create a high-priority task for SOC within 48 hours
    const hoursDiff = (appointmentDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff <= 48) {
      console.log(`SOC 48-hour alert created for patient ${patientId}`);
      // In a real implementation, this would create a task or send notifications
    }
  }
}

export const schedulerService = new SchedulerService();
