import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Brain, Search, Send, AlertTriangle } from 'lucide-react';

interface PrescriptionData {
  patientId: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  pharmacyId: number;
  quantity: number;
  refills: number;
  diagnosisCode: string;
}

interface AIRecommendation {
  medicationName: string;
  recommendedDosage: string;
  frequency: string;
  duration: string;
  interactions: {
    severity: string;
    interactingMedications: string[];
    recommendations: string[];
  };
  contraindications: string[];
  warnings: string[];
  confidence: number;
}

export function NewPrescriptionDialog() {
  const [formData, setFormData] = useState<Partial<PrescriptionData>>({});
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [pharmacySearch, setPharmacySearch] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch patients for selection
  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
    enabled: true
  });

  // Fetch pharmacies based on search
  const { data: pharmacies } = useQuery({
    queryKey: ['/api/pharmacies/search', pharmacySearch],
    enabled: pharmacySearch.length >= 3
  });

  // Get AI dose recommendations
  const aiRecommendationMutation = useMutation({
    mutationFn: async (data: { patientId: number; medicationName: string }) => {
      const response = await fetch('/api/prescriptions/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to get AI recommendations');
      return response.json();
    },
    onSuccess: (data) => {
      setAiRecommendation(data);
      // Auto-fill form with AI recommendations
      setFormData(prev => ({
        ...prev,
        dosage: data.recommendedDosage,
        frequency: data.frequency,
        duration: data.duration
      }));
    }
  });

  // Create prescription mutation
  const createPrescriptionMutation = useMutation({
    mutationFn: async (data: PrescriptionData) => {
      const response = await fetch('/api/prescriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create prescription');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Prescription Created",
        description: "Prescription sent to pharmacy via secure eFax"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      // Reset form
      setFormData({});
      setSelectedPatient(null);
      setAiRecommendation(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleGetAIRecommendations = () => {
    if (selectedPatient && formData.medicationName) {
      aiRecommendationMutation.mutate({
        patientId: selectedPatient,
        medicationName: formData.medicationName
      });
    }
  };

  const handleSubmit = () => {
    if (!selectedPatient || !formData.medicationName || !formData.pharmacyId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    createPrescriptionMutation.mutate({
      ...formData,
      patientId: selectedPatient
    } as PrescriptionData);
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          New Prescription Order
        </DialogTitle>
        <DialogDescription>
          Create and transmit a new prescription with AI-powered dosing recommendations
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="patient">Patient *</Label>
            <Select value={selectedPatient?.toString() || ""} onValueChange={(value) => setSelectedPatient(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients?.map((patient: any) => (
                  <SelectItem key={patient.id} value={patient.id.toString()}>
                    {patient.patientName} - DOB: {patient.dateOfBirth}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="medication">Medication Name *</Label>
            <div className="flex gap-2">
              <Input
                id="medication"
                value={formData.medicationName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, medicationName: e.target.value }))}
                placeholder="Enter medication name"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleGetAIRecommendations}
                disabled={!selectedPatient || !formData.medicationName || aiRecommendationMutation.isPending}
              >
                <Brain className="w-4 h-4 mr-2" />
                AI Suggest
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dosage">Dosage *</Label>
              <Input
                id="dosage"
                value={formData.dosage || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                placeholder="e.g., 500mg"
              />
            </div>
            <div>
              <Label htmlFor="frequency">Frequency *</Label>
              <Select value={formData.frequency || ""} onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once-daily">Once Daily</SelectItem>
                  <SelectItem value="twice-daily">Twice Daily</SelectItem>
                  <SelectItem value="three-times-daily">Three Times Daily</SelectItem>
                  <SelectItem value="four-times-daily">Four Times Daily</SelectItem>
                  <SelectItem value="as-needed">As Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                placeholder="30"
              />
            </div>
            <div>
              <Label htmlFor="refills">Refills</Label>
              <Input
                id="refills"
                type="number"
                value={formData.refills || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, refills: parseInt(e.target.value) }))}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="duration">Duration</Label>
            <Input
              id="duration"
              value={formData.duration || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              placeholder="e.g., 30 days"
            />
          </div>

          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Take with food..."
              rows={3}
            />
          </div>

          {/* Pharmacy Search */}
          <div>
            <Label htmlFor="pharmacy-search">Search Pharmacy *</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="pharmacy-search"
                  value={pharmacySearch}
                  onChange={(e) => setPharmacySearch(e.target.value)}
                  placeholder="Search by name, zip code, or address"
                />
                <Button variant="outline" size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              
              {pharmacies && pharmacies.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                  {pharmacies.map((pharmacy: any) => (
                    <div
                      key={pharmacy.id}
                      className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                        formData.pharmacyId === pharmacy.id ? 'bg-blue-100' : ''
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, pharmacyId: pharmacy.id }))}
                    >
                      <div className="font-medium">{pharmacy.name}</div>
                      <div className="text-sm text-gray-600">{pharmacy.address}</div>
                      <div className="text-xs text-gray-500">Fax: {pharmacy.faxNumber}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Recommendations Panel */}
        <div className="space-y-4">
          {aiRecommendation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Dosing Recommendations
                </CardTitle>
                <CardDescription>
                  Confidence: {aiRecommendation.confidence}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Recommended Dosage</Label>
                  <p className="text-sm">{aiRecommendation.recommendedDosage}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Frequency</Label>
                  <p className="text-sm">{aiRecommendation.frequency}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Duration</Label>
                  <p className="text-sm">{aiRecommendation.duration}</p>
                </div>

                {aiRecommendation.interactions.severity !== 'none' && (
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      Drug Interactions
                    </Label>
                    <Badge variant={aiRecommendation.interactions.severity === 'major' ? 'destructive' : 'secondary'}>
                      {aiRecommendation.interactions.severity}
                    </Badge>
                    <div className="text-sm mt-1">
                      {aiRecommendation.interactions.recommendations.map((rec, idx) => (
                        <p key={idx}>{rec}</p>
                      ))}
                    </div>
                  </div>
                )}

                {aiRecommendation.warnings.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Warnings</Label>
                    <ul className="text-sm space-y-1">
                      {aiRecommendation.warnings.map((warning, idx) => (
                        <li key={idx} className="text-orange-600">• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {aiRecommendationMutation.isPending && (
            <Card>
              <CardContent className="p-6 text-center">
                <Brain className="w-8 h-8 mx-auto mb-4 animate-pulse" />
                <p>Analyzing patient data and generating AI recommendations...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline">Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={createPrescriptionMutation.isPending}
        >
          {createPrescriptionMutation.isPending ? "Creating..." : "Create & Send Prescription"}
        </Button>
      </div>
    </DialogContent>
  );
}

export default NewPrescriptionDialog;