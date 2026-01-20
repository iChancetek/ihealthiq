import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCheck, Send, Clock, CheckCircle, ArrowRight, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Patient {
  id: number;
  patientName: string;
  dateOfBirth: string;
  diagnosis: string;
  allergies?: string[];
  medications?: string[];
}

interface ReferralData {
  id?: number;
  patientId: number;
  specialtyType: string;
  referralReason: string;
  urgency: 'routine' | 'urgent' | 'stat';
  providerPreference?: string;
  notes?: string;
  status: 'draft' | 'pending' | 'sent' | 'completed';
  aiGenerated: boolean;
  createdAt?: string;
}

interface IntelligentReferralsProps {
  selectedPatient: Patient | null;
  soapNotes?: any;
  referralNeeds?: any;
  aiAutomationData?: {
    referralNeeds?: {
      cardiology?: boolean;
      pulmonology?: boolean;
      endocrinology?: boolean;
      neurology?: boolean;
      orthopedics?: boolean;
      psychiatry?: boolean;
      dermatology?: boolean;
      gastroenterology?: boolean;
      [key: string]: boolean | undefined;
    };
    specialistTypes?: string[];
    autoTriggers?: {
      shouldCreateReferrals: boolean;
      urgencyLevel: string;
    };
  };
  onReferralSubmitted: (referral: ReferralData) => void;
}

export default function IntelligentReferrals({
  selectedPatient,
  soapNotes,
  referralNeeds,
  aiAutomationData,
  onReferralSubmitted
}: IntelligentReferralsProps) {
  const [referralForm, setReferralForm] = useState<Partial<ReferralData>>({
    specialtyType: '',
    referralReason: '',
    urgency: 'routine',
    providerPreference: '',
    notes: '',
    status: 'draft',
    aiGenerated: false
  });

  const [aiSuggestedReferrals, setAiSuggestedReferrals] = useState<Array<{
    specialty: string;
    reason: string;
    urgency: string;
    confidence: number;
  }>>([]);

  const { toast } = useToast();

  // Process AI automation data with patient historical usage analysis
  useEffect(() => {
    if (aiAutomationData && selectedPatient) {
      const suggestions: Array<{
        specialty: string;
        reason: string;
        urgency: string;
        confidence: number;
        historicalUsage?: {
          homeHealth: boolean;
          dme: boolean;
          specialist: string;
          frequency: number;
        };
        oneClickReady: boolean;
      }> = [];

      // Process referral needs from AI automation with historical context
      if (aiAutomationData.referralNeeds) {
        Object.entries(aiAutomationData.referralNeeds).forEach(([specialty, needed]) => {
          if (needed) {
            const historicalData = analyzePatientHistoricalUsage(selectedPatient, specialty);
            suggestions.push({
              specialty: specialty.charAt(0).toUpperCase() + specialty.slice(1),
              reason: generateReferralReason(specialty, historicalData),
              urgency: aiAutomationData.autoTriggers?.urgencyLevel || 'routine',
              confidence: historicalData.frequency > 2 ? 95 : 85,
              historicalUsage: historicalData,
              oneClickReady: historicalData.homeHealth || historicalData.dme || historicalData.frequency > 1
            });
          }
        });
      }

      // Process specialist types
      if (aiAutomationData.specialistTypes?.length > 0) {
        aiAutomationData.specialistTypes.forEach(specialist => {
          if (!suggestions.some(s => s.specialty.toLowerCase() === specialist.toLowerCase())) {
            suggestions.push({
              specialty: specialist,
              reason: `Clinical assessment indicates need for specialist consultation`,
              urgency: aiAutomationData.autoTriggers?.urgencyLevel || 'routine',
              confidence: 80
            });
          }
        });
      }

      setAiSuggestedReferrals(suggestions);

      // Auto-populate first suggested referral if auto-triggers are enabled
      if (aiAutomationData.autoTriggers?.shouldCreateReferrals && suggestions.length > 0) {
        const firstSuggestion = suggestions[0];
        setReferralForm(prev => ({
          ...prev,
          specialtyType: firstSuggestion.specialty,
          referralReason: firstSuggestion.reason,
          urgency: firstSuggestion.urgency as 'routine' | 'urgent' | 'stat',
          aiGenerated: true
        }));
      }
    }
  }, [aiAutomationData, selectedPatient]);

  // Analyze patient's historical usage for home health, DME, and specialist consultations
  const analyzePatientHistoricalUsage = (patient: Patient, specialty: string) => {
    // Use actual patient data from care history
    const patientCareHistory = patient.careHistory || {
      homeHealth: false,
      dme: false,
      specialists: []
    };

    // Find matching specialist from patient's actual care history
    const matchingSpecialist = patientCareHistory.specialists?.find(
      (spec: any) => spec.specialty?.toLowerCase().includes(specialty.toLowerCase())
    );

    return {
      homeHealth: patientCareHistory.homeHealth || false,
      dme: patientCareHistory.dme || false,
      specialist: matchingSpecialist ? `${matchingSpecialist.name} - ${matchingSpecialist.specialty}` : '',
      frequency: matchingSpecialist ? 1 : 0, // Number of specialists of this type
      lastVisit: matchingSpecialist?.lastVisit || null
    };
  };

  // Generate smart referral reason based on specialty and historical data
  const generateReferralReason = (specialty: string, historicalData: any) => {
    let reason = `AI-recommended ${specialty} consultation based on SOAP note analysis`;
    
    if (historicalData.frequency > 1) {
      reason += `. Patient has ${historicalData.frequency} previous ${specialty} visits`;
    }
    
    if (historicalData.homeHealth) {
      reason += `. Patient currently receiving home health services`;
    }
    
    if (historicalData.dme) {
      reason += `. Patient has DME requirements`;
    }
    
    if (historicalData.specialist) {
      reason += `. Previous provider: ${historicalData.specialist}`;
    }
    
    return reason;
  };

  // One-click referral generation based on historical patterns
  const generateOneClickReferral = (suggestion: any) => {
    if (!suggestion.oneClickReady) {
      toast({
        title: "Manual Review Required",
        description: "This referral requires manual review due to limited historical data",
        variant: "destructive"
      });
      return;
    }

    const autoReferral: ReferralData = {
      patientId: selectedPatient!.id,
      specialtyType: suggestion.specialty,
      referralReason: suggestion.reason,
      urgency: suggestion.urgency as 'routine' | 'urgent' | 'stat',
      providerPreference: suggestion.historicalUsage?.specialist || '',
      notes: `One-click auto-generated referral based on historical usage patterns. Confidence: ${suggestion.confidence}%`,
      status: 'pending',
      aiGenerated: true,
      createdAt: new Date().toISOString()
    };

    // Submit directly without form interaction
    onReferralSubmitted(autoReferral);
    
    toast({
      title: "One-Click Referral Created",
      description: `${suggestion.specialty} referral submitted based on historical patterns`,
    });
  };

  const handleFormChange = (field: keyof ReferralData, value: any) => {
    setReferralForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAISuggestionSelect = (suggestion: typeof aiSuggestedReferrals[0]) => {
    setReferralForm({
      specialtyType: suggestion.specialty,
      referralReason: suggestion.reason,
      urgency: suggestion.urgency as 'routine' | 'urgent' | 'stat',
      providerPreference: '',
      notes: `AI-generated referral based on clinical assessment (Confidence: ${suggestion.confidence}%)`,
      status: 'draft',
      aiGenerated: true
    });

    toast({
      title: "AI Suggestion Applied",
      description: `Referral form populated with ${suggestion.specialty} recommendation`,
    });
  };

  const handleSubmitReferral = () => {
    if (!selectedPatient) {
      toast({
        title: "No Patient Selected",
        description: "Please select a patient before creating a referral",
        variant: "destructive",
      });
      return;
    }

    if (!referralForm.specialtyType || !referralForm.referralReason) {
      toast({
        title: "Incomplete Referral",
        description: "Please fill in specialty type and referral reason",
        variant: "destructive",
      });
      return;
    }

    const completeReferral: ReferralData = {
      patientId: selectedPatient.id,
      specialtyType: referralForm.specialtyType || '',
      referralReason: referralForm.referralReason || '',
      urgency: referralForm.urgency || 'routine',
      providerPreference: referralForm.providerPreference,
      notes: referralForm.notes,
      status: 'pending',
      aiGenerated: referralForm.aiGenerated || false,
      createdAt: new Date().toISOString()
    };

    onReferralSubmitted(completeReferral);

    // Reset form
    setReferralForm({
      specialtyType: '',
      referralReason: '',
      urgency: 'routine',
      providerPreference: '',
      notes: '',
      status: 'draft',
      aiGenerated: false
    });

    toast({
      title: "Referral Created",
      description: `${completeReferral.specialtyType} referral created for ${selectedPatient.patientName}`,
    });
  };

  if (!selectedPatient) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a patient to create intelligent referrals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Automation Status */}
      {aiAutomationData && (
        <Alert className="border-green-200 bg-green-50">
          <Zap className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Clinical Automation Active:</strong> AI has analyzed SOAP notes and identified {aiSuggestedReferrals.length} potential referral needs for {selectedPatient.patientName}.
          </AlertDescription>
        </Alert>
      )}

      {/* AI Suggested Referrals */}
      {aiSuggestedReferrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              AI-Recommended Referrals
            </CardTitle>
            <CardDescription>
              Based on SOAP note analysis and clinical indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiSuggestedReferrals.map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        {suggestion.specialty}
                      </Badge>
                      <Badge variant="outline" className={
                        suggestion.urgency === 'stat' ? 'bg-red-100 text-red-800' :
                        suggestion.urgency === 'urgent' ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {suggestion.urgency}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {suggestion.confidence}% confidence
                      </span>
                      {suggestion.oneClickReady && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          One-Click Ready
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{suggestion.reason}</p>
                    {suggestion.historicalUsage && (
                      <div className="mt-2 flex gap-2 text-xs">
                        {suggestion.historicalUsage.homeHealth && (
                          <span className="bg-blue-100 px-2 py-1 rounded text-blue-700">Home Health</span>
                        )}
                        {suggestion.historicalUsage.dme && (
                          <span className="bg-purple-100 px-2 py-1 rounded text-purple-700">DME Services</span>
                        )}
                        {suggestion.historicalUsage.frequency > 0 && (
                          <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">
                            {suggestion.historicalUsage.frequency} previous visits
                          </span>
                        )}
                        {suggestion.historicalUsage.specialist && (
                          <span className="bg-indigo-100 px-2 py-1 rounded text-indigo-700">
                            Prev: {suggestion.historicalUsage.specialist.split(' - ')[0]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleAISuggestionSelect(suggestion)}
                      variant="outline"
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Use Form
                    </Button>
                    {suggestion.oneClickReady && (
                      <Button
                        size="sm"
                        onClick={() => generateOneClickReferral(suggestion)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        One-Click Submit
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Create Referral for {selectedPatient.patientName}
          </CardTitle>
          <CardDescription>
            Intelligent referral management with AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialtyType">Specialty Type *</Label>
              <Input
                id="specialtyType"
                value={referralForm.specialtyType || ''}
                onChange={(e) => handleFormChange('specialtyType', e.target.value)}
                placeholder="e.g., Cardiology, Orthopedics"
                className={referralForm.aiGenerated ? 'border-blue-500 bg-blue-50' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <select
                id="urgency"
                value={referralForm.urgency || 'routine'}
                onChange={(e) => handleFormChange('urgency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referralReason">Referral Reason *</Label>
            <Textarea
              id="referralReason"
              value={referralForm.referralReason || ''}
              onChange={(e) => handleFormChange('referralReason', e.target.value)}
              placeholder="Detailed reason for referral..."
              rows={3}
              className={referralForm.aiGenerated ? 'border-blue-500 bg-blue-50' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="providerPreference">Provider Preference</Label>
            <Input
              id="providerPreference"
              value={referralForm.providerPreference || ''}
              onChange={(e) => handleFormChange('providerPreference', e.target.value)}
              placeholder="Specific provider or clinic preference"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={referralForm.notes || ''}
              onChange={(e) => handleFormChange('notes', e.target.value)}
              placeholder="Additional clinical notes or instructions..."
              rows={2}
            />
          </div>

          {referralForm.aiGenerated && (
            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                This referral was generated using AI analysis of clinical data
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSubmitReferral}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Create Referral
            </Button>
            <Button 
              variant="outline"
              onClick={() => setReferralForm({
                specialtyType: '',
                referralReason: '',
                urgency: 'routine',
                providerPreference: '',
                notes: '',
                status: 'draft',
                aiGenerated: false
              })}
            >
              Clear Form
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}