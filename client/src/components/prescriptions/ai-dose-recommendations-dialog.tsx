import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Brain, Search, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

interface AIRecommendation {
  medicationName: string;
  recommendedDosage: string;
  frequency: string;
  duration: string;
  route: string;
  warnings: string[];
  contraindications: string[];
  interactions: {
    severity: string;
    interactingMedications: string[];
    recommendations: string[];
  };
  monitoring: string[];
  alternatives: Array<{
    medication: string;
    reason: string;
  }>;
  confidence: number;
  reasoning: string;
}

export function AIDoseRecommendationsDialog() {
  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [medicationName, setMedicationName] = useState('');
  const [indication, setIndication] = useState('');
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  // Fetch patients for selection
  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
    enabled: true
  });

  // Fetch patient medical data when selected
  const { data: patientData } = useQuery({
    queryKey: ['/api/patients', selectedPatient, 'medical-data'],
    enabled: !!selectedPatient
  });

  // Get AI dose recommendations
  const getRecommendationsMutation = useMutation({
    mutationFn: async (data: { 
      patientId: number; 
      medicationName: string; 
      indication?: string;
    }) => {
      const response = await fetch('/api/prescriptions/ai-dose-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to get AI recommendations');
      return response.json();
    },
    onSuccess: (data) => {
      setRecommendations(data);
      setIsAnalyzing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setIsAnalyzing(false);
    }
  });

  const handleAnalyze = () => {
    if (!selectedPatient || !medicationName) {
      toast({
        title: "Missing Information",
        description: "Please select a patient and enter medication name",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    getRecommendationsMutation.mutate({
      patientId: selectedPatient,
      medicationName,
      indication
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'contraindicated':
      case 'major': return 'destructive';
      case 'moderate': return 'secondary';
      case 'minor': return 'outline';
      default: return 'secondary';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Dose Recommendations
        </DialogTitle>
        <DialogDescription>
          Get intelligent dosing recommendations based on patient-specific factors
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analysis Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Input
                  id="medication"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  placeholder="Enter medication name"
                />
              </div>

              <div>
                <Label htmlFor="indication">Indication (Optional)</Label>
                <Input
                  id="indication"
                  value={indication}
                  onChange={(e) => setIndication(e.target.value)}
                  placeholder="e.g., Hypertension, Diabetes"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !selectedPatient || !medicationName}
              >
                <Brain className="w-4 h-4 mr-2" />
                {isAnalyzing ? "Analyzing..." : "Get AI Recommendations"}
              </Button>
            </CardContent>
          </Card>

          {/* Patient Summary */}
          {patientData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Patient Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Age:</strong> {patientData.age} years</div>
                <div><strong>Weight:</strong> {patientData.weight || 'Not recorded'}</div>
                <div><strong>Allergies:</strong> {patientData.allergies || 'None known'}</div>
                <div><strong>Kidney Function:</strong> {patientData.kidneyFunction || 'Normal'}</div>
                <div><strong>Current Medications:</strong> {patientData.currentMedications?.length || 0} drugs</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {isAnalyzing ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-500" />
                <h3 className="text-lg font-semibold mb-2">AI Analysis in Progress</h3>
                <p className="text-gray-600 mb-4">
                  Analyzing patient factors including age, weight, comorbidities, drug interactions, 
                  and clinical guidelines...
                </p>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              </CardContent>
            </Card>
          ) : recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          {rec.medicationName} Recommendations
                        </CardTitle>
                        <CardDescription>
                          AI Analysis Confidence: <span className={getConfidenceColor(rec.confidence)}>{rec.confidence}%</span>
                        </CardDescription>
                      </div>
                      <Badge variant={rec.confidence >= 80 ? 'default' : 'secondary'}>
                        {rec.confidence >= 80 ? 'High Confidence' : 'Review Required'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Primary Recommendations */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-medium text-green-700">Recommended Dosage</Label>
                        <p className="text-lg font-semibold">{rec.recommendedDosage}</p>
                      </div>
                      <div>
                        <Label className="font-medium text-green-700">Frequency</Label>
                        <p className="text-lg font-semibold">{rec.frequency}</p>
                      </div>
                      <div>
                        <Label className="font-medium text-green-700">Duration</Label>
                        <p>{rec.duration}</p>
                      </div>
                      <div>
                        <Label className="font-medium text-green-700">Route</Label>
                        <p>{rec.route}</p>
                      </div>
                    </div>

                    {/* Drug Interactions */}
                    {rec.interactions.severity !== 'none' && (
                      <div className="border-l-4 border-orange-500 pl-4">
                        <Label className="font-medium text-orange-700 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Drug Interactions Detected
                        </Label>
                        <Badge variant={getSeverityColor(rec.interactions.severity)} className="mb-2">
                          {rec.interactions.severity} Severity
                        </Badge>
                        <div className="space-y-2">
                          <div>
                            <strong>Interacting Medications:</strong>
                            <ul className="list-disc list-inside text-sm">
                              {rec.interactions.interactingMedications.map((med, idx) => (
                                <li key={idx}>{med}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <strong>Recommendations:</strong>
                            <ul className="list-disc list-inside text-sm">
                              {rec.interactions.recommendations.map((recommendation, idx) => (
                                <li key={idx}>{recommendation}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {rec.warnings.length > 0 && (
                      <div className="border-l-4 border-red-500 pl-4">
                        <Label className="font-medium text-red-700">Important Warnings</Label>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {rec.warnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Contraindications */}
                    {rec.contraindications.length > 0 && (
                      <div className="border-l-4 border-red-600 pl-4 bg-red-50 p-3 rounded">
                        <Label className="font-medium text-red-800">Contraindications</Label>
                        <ul className="list-disc list-inside text-sm space-y-1 text-red-700">
                          {rec.contraindications.map((contraindication, idx) => (
                            <li key={idx}>{contraindication}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Monitoring Requirements */}
                    {rec.monitoring.length > 0 && (
                      <div className="border-l-4 border-blue-500 pl-4">
                        <Label className="font-medium text-blue-700">Monitoring Requirements</Label>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {rec.monitoring.map((monitor, idx) => (
                            <li key={idx}>{monitor}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Alternative Medications */}
                    {rec.alternatives.length > 0 && (
                      <div>
                        <Label className="font-medium">Alternative Medications</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {rec.alternatives.map((alt, idx) => (
                            <div key={idx} className="border rounded p-3">
                              <div className="font-medium">{alt.medication}</div>
                              <div className="text-sm text-gray-600">{alt.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Reasoning */}
                    <div className="bg-gray-50 p-4 rounded">
                      <Label className="font-medium">AI Clinical Reasoning</Label>
                      <p className="text-sm mt-1">{rec.reasoning}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">AI Dose Analysis</h3>
                <p className="text-gray-600">
                  Select a patient and medication to get personalized dosing recommendations
                  based on clinical factors and drug interactions.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">AI Analysis Factors:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-800">
          <div>• Patient age & weight</div>
          <div>• Kidney & liver function</div>
          <div>• Drug interactions</div>
          <div>• Clinical guidelines</div>
          <div>• Allergy history</div>
          <div>• Comorbid conditions</div>
          <div>• Current medications</div>
          <div>• Contraindications</div>
        </div>
      </div>
    </DialogContent>
  );
}

export default AIDoseRecommendationsDialog;