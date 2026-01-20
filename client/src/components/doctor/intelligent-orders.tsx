import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Pill, 
  Plus, 
  Trash2, 
  Edit3, 
  Send, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Brain,
  Clock,
  FileText
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Patient {
  id: number;
  patientName: string;
  dateOfBirth: string;
  diagnosis: string;
  allergies?: string[];
  medications?: string[];
}

interface MedicationOrder {
  id?: number;
  patientId: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  refills: number;
  instructions: string;
  prescriberId: number;
  status: 'draft' | 'active' | 'completed' | 'discontinued';
  isRefill: boolean;
  originalOrderId?: number;
  aiGenerated: boolean;
  createdAt?: string;
}

interface RefillRequest {
  id: number;
  patientId: number;
  originalOrderId: number;
  medicationName: string;
  requestedDate: string;
  status: 'pending' | 'approved' | 'denied';
  requestReason: string;
}

interface IntelligentOrdersProps {
  selectedPatient: Patient | null;
  extractedMedications?: string[];
  soapNotes?: any;
  onOrderSubmitted: (order: MedicationOrder) => void;
  aiAutomationData?: {
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      indication: string;
      action: string;
      priority: string;
    }>;
    autoTriggers?: {
      shouldCreateOrders: boolean;
      urgencyLevel: string;
    };
  };
}

export default function IntelligentOrders({ 
  selectedPatient, 
  extractedMedications = [], 
  soapNotes,
  onOrderSubmitted,
  aiAutomationData
}: IntelligentOrdersProps) {
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Partial<MedicationOrder>>({
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '',
    refills: 0,
    instructions: '',
    status: 'draft',
    isRefill: false,
    aiGenerated: false
  });
  const [showOrderForm, setShowOrderForm] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load existing orders for patient
  const { data: existingOrders } = useQuery({
    queryKey: ['/api/doctor/orders', selectedPatient?.id],
    enabled: !!selectedPatient
  });

  // Load pending refill requests
  const { data: refillRequests } = useQuery({
    queryKey: ['/api/doctor/refill-requests', selectedPatient?.id],
    enabled: !!selectedPatient
  });

  // Process AI automation data when it arrives - Enhanced auto-population
  useEffect(() => {
    if (aiAutomationData?.medications && aiAutomationData.medications.length > 0) {
      console.log('Processing AI automation data:', aiAutomationData);
      
      // Convert AI medications to order format with enhanced auto-population
      const aiGeneratedOrders = aiAutomationData.medications.map((med, index) => {
        // Smart dosage parsing from voice dictation
        const parsedDosage = parseVoiceDictatedDosage(med.dosage || '');
        const parsedFrequency = parseVoiceDictatedFrequency(med.frequency || '');
        const parsedDuration = parseVoiceDictatedDuration(med.indication || '');
        
        return {
          id: Date.now() + index, // Temporary ID
          patientId: selectedPatient?.id || 0,
          medicationName: med.name,
          dosage: parsedDosage.dosage || med.dosage || '',
          frequency: parsedFrequency.frequency || med.frequency || 'As directed',
          duration: parsedDuration.duration || '30 days',
          quantity: parsedDosage.quantity || '30',
          refills: med.action === 'continue' ? 2 : 0,
          instructions: buildSmartInstructions(med),
          prescriberId: 1, // Current doctor ID - should come from auth
          status: 'draft' as const,
          isRefill: med.action === 'continue' || med.action === 'refill',
          aiGenerated: true,
          priority: med.priority || 'medium',
          indication: med.indication,
          voiceExtracted: true, // Flag for voice dictation source
          autoPopulated: true
        };
      });

      setOrders(prevOrders => [...prevOrders, ...aiGeneratedOrders]);
      
      // Show automation notification
      toast({
        title: "Voice Dictation Auto-Population",
        description: `Automatically populated ${aiGeneratedOrders.length} medication orders from voice transcription`,
        duration: 5000
      });

      // Auto-trigger order creation if specified
      if (aiAutomationData.autoTriggers?.shouldCreateOrders) {
        console.log('Auto-triggering order creation workflow');
        // Could automatically submit draft orders for review here
      }
    }
  }, [aiAutomationData, selectedPatient, toast]);

  // Smart parsing functions for voice dictation
  const parseVoiceDictatedDosage = (text: string) => {
    // Parse common voice patterns: "5 mg", "10 milligrams", "one tablet", etc.
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(mg|milligrams?|mcg|micrograms?|g|grams?|ml|milliliters?|tablets?|capsules?|units?)/i,
      /(one|two|three|four|five|six|seven|eight|nine|ten)\s*(tablets?|capsules?|mg|milligrams?)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          dosage: match[0],
          quantity: inferQuantityFromDosage(match[0])
        };
      }
    }
    return { dosage: text, quantity: '30' };
  };

  const parseVoiceDictatedFrequency = (text: string) => {
    // Parse common frequency patterns from voice
    const frequencies = {
      'once daily': 'Once daily',
      'twice daily': 'Twice daily',
      'three times daily': 'Three times daily',
      'four times daily': 'Four times daily',
      'every morning': 'Once daily (morning)',
      'every evening': 'Once daily (evening)',
      'with meals': 'With meals',
      'as needed': 'As needed',
      'prn': 'As needed',
      'bid': 'Twice daily',
      'tid': 'Three times daily',
      'qid': 'Four times daily',
      'qd': 'Once daily'
    };
    
    const lowerText = text.toLowerCase();
    for (const [pattern, frequency] of Object.entries(frequencies)) {
      if (lowerText.includes(pattern)) {
        return { frequency };
      }
    }
    return { frequency: text || 'As directed' };
  };

  const parseVoiceDictatedDuration = (text: string) => {
    // Parse duration patterns from voice dictation
    const durationPatterns = [
      /(\d+)\s*(days?|weeks?|months?)/i,
      /(one|two|three|four|five|six|seven|eight|nine|ten|thirty|ninety)\s*(days?|weeks?|months?)/i
    ];
    
    for (const pattern of durationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return { duration: match[0] };
      }
    }
    return { duration: '30 days' };
  };

  const inferQuantityFromDosage = (dosage: string) => {
    // Infer quantity based on dosage format
    if (dosage.toLowerCase().includes('tablet') || dosage.toLowerCase().includes('capsule')) {
      return '30'; // Standard 30-day supply
    }
    return '30'; // Default
  };

  const buildSmartInstructions = (med: any) => {
    // Build comprehensive instructions from AI data
    let instructions = med.indication || 'Take as prescribed';
    
    if (med.frequency) {
      instructions += `. ${med.frequency}`;
    }
    
    if (med.priority === 'high') {
      instructions += '. URGENT - Start immediately';
    }
    
    return instructions;
  };

  // AI-powered medication extraction
  const extractMedicationsMutation = useMutation({
    mutationFn: async ({ soapNotes, patientContext }: { soapNotes: any; patientContext: Patient }) => {
      return apiRequest('/api/doctor/extract-medications', {
        method: 'POST',
        body: JSON.stringify({
          soapNotes,
          patientContext,
          extractedMedications
        })
      });
    },
    onSuccess: (data) => {
      setOrders(data.medicationOrders || []);
      toast({
        title: "Medications Extracted",
        description: `Found ${data.medicationOrders?.length || 0} potential medication orders`
      });
    }
  });

  // Submit medication order
  const submitOrderMutation = useMutation({
    mutationFn: async (order: MedicationOrder) => {
      return apiRequest('/api/doctor/submit-order', {
        method: 'POST',
        body: JSON.stringify(order)
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Order Submitted",
        description: "Medication order submitted successfully"
      });
      onOrderSubmitted(data.order);
      setCurrentOrder({
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: '',
        refills: 0,
        instructions: '',
        status: 'draft',
        isRefill: false,
        aiGenerated: false
      });
      setShowOrderForm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/orders'] });
    }
  });

  // Process refill request - Enhanced structured workflow
  const processRefillMutation = useMutation({
    mutationFn: async ({ requestId, action, modifications }: { 
      requestId: number; 
      action: 'approve' | 'deny' | 'modify'; 
      modifications?: Partial<MedicationOrder> 
    }) => {
      return apiRequest('/api/doctor/process-refill', {
        method: 'POST',
        body: JSON.stringify({ requestId, action, modifications })
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Refill Processed",
        description: data.action === 'approve' ? "Refill approved and submitted" : 
                    data.action === 'modify' ? "Refill modified and approved" : "Refill request denied"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/refill-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/doctor/orders'] });
    }
  });

  // Submit refill via eFax or EHR integration
  const submitRefillMutation = useMutation({
    mutationFn: async ({ order, submissionMethod }: { 
      order: MedicationOrder; 
      submissionMethod: 'efax' | 'ehr' | 'manual' 
    }) => {
      return apiRequest('/api/doctor/submit-refill', {
        method: 'POST',
        body: JSON.stringify({ order, submissionMethod })
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Refill Submitted",
        description: `Refill submitted via ${data.method}. ${data.confirmationId ? `Confirmation: ${data.confirmationId}` : ''}`
      });
    }
  });

  // Create structured refill request from existing order
  const createRefillFromOrder = (existingOrder: MedicationOrder) => {
    const refillOrder: MedicationOrder = {
      ...existingOrder,
      id: undefined, // Will be assigned by backend
      isRefill: true,
      originalOrderId: existingOrder.id,
      status: 'draft',
      aiGenerated: false,
      createdAt: undefined,
      // Auto-fill with existing medication details
      medicationName: existingOrder.medicationName,
      dosage: existingOrder.dosage,
      frequency: existingOrder.frequency,
      duration: existingOrder.duration,
      quantity: existingOrder.quantity,
      instructions: existingOrder.instructions,
      refills: Math.max(0, existingOrder.refills - 1) // Decrease refill count
    };
    
    setCurrentOrder(refillOrder);
    setShowOrderForm(true);
    
    toast({
      title: "Refill Request Created",
      description: "Medication details auto-filled from previous order"
    });
  };

  useEffect(() => {
    if (extractedMedications.length > 0 && selectedPatient) {
      extractMedicationsMutation.mutate({
        soapNotes,
        patientContext: selectedPatient
      });
    }
  }, [extractedMedications, selectedPatient, soapNotes]);

  const addNewOrder = () => {
    setCurrentOrder(prev => ({
      ...prev,
      patientId: selectedPatient?.id || 0,
      prescriberId: 1 // Current doctor ID
    }));
    setShowOrderForm(true);
  };

  const updateOrder = (field: keyof MedicationOrder, value: any) => {
    setCurrentOrder(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const submitCurrentOrder = () => {
    if (!selectedPatient || !currentOrder.medicationName || !currentOrder.dosage) {
      toast({
        title: "Incomplete Order",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    submitOrderMutation.mutate({
      ...currentOrder,
      patientId: selectedPatient.id,
      prescriberId: 1
    } as MedicationOrder);
  };

  const checkForInteractions = (medicationName: string) => {
    const patientMeds = selectedPatient?.medications || [];
    const commonInteractions = {
      'warfarin': ['aspirin', 'ibuprofen'],
      'digoxin': ['furosemide', 'amiodarone'],
      'metformin': ['contrast dye']
    };

    const interactions = commonInteractions[medicationName.toLowerCase() as keyof typeof commonInteractions] || [];
    return interactions.filter(med => 
      patientMeds.some(patMed => patMed.toLowerCase().includes(med))
    );
  };

  if (!selectedPatient) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <div className="text-lg font-semibold text-gray-700 mb-2">Patient Required</div>
          <div className="text-sm text-gray-500">
            Please select a patient to manage orders and refills
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Medication Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medication Management
          </CardTitle>
          <CardDescription>
            {selectedPatient.patientName} | Current Medications: {selectedPatient.medications?.length || 0} | 
            Allergies: {selectedPatient.allergies?.join(', ') || 'None documented'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* AI-Generated Orders from SOAP */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Generated Orders from SOAP Notes
            </CardTitle>
            <CardDescription>
              Medications automatically extracted from clinical documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.map((order, index) => (
                <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        AI Generated
                      </Badge>
                      <div className="font-semibold">{order.medicationName}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCurrentOrder(order);
                          setShowOrderForm(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => submitOrderMutation.mutate(order)}
                        disabled={submitOrderMutation.isPending}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Submit
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Dosage</div>
                      <div className="text-gray-600">{order.dosage}</div>
                    </div>
                    <div>
                      <div className="font-medium">Frequency</div>
                      <div className="text-gray-600">{order.frequency}</div>
                    </div>
                    <div>
                      <div className="font-medium">Duration</div>
                      <div className="text-gray-600">{order.duration}</div>
                    </div>
                    <div>
                      <div className="font-medium">Refills</div>
                      <div className="text-gray-600">{order.refills}</div>
                    </div>
                  </div>
                  
                  {order.instructions && (
                    <div className="mt-3">
                      <div className="font-medium text-sm">Instructions</div>
                      <div className="text-sm text-gray-600">{order.instructions}</div>
                    </div>
                  )}
                  
                  {checkForInteractions(order.medicationName).length > 0 && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="h-4 w-4" />
                        <div className="font-medium">Potential Interactions</div>
                      </div>
                      <div className="text-sm text-yellow-700">
                        May interact with: {checkForInteractions(order.medicationName).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Refill Requests */}
      {refillRequests && refillRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Pending Refill Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {refillRequests.map((request: RefillRequest) => (
                <div key={request.id} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold">{request.medicationName}</div>
                      <div className="text-sm text-gray-600">
                        Requested: {new Date(request.requestedDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => processRefillMutation.mutate({
                          requestId: request.id,
                          action: 'deny'
                        })}
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        Deny
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => processRefillMutation.mutate({
                          requestId: request.id,
                          action: 'approve'
                        })}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                  
                  {request.requestReason && (
                    <div className="text-sm text-gray-600">
                      <strong>Reason:</strong> {request.requestReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Order Creation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Medication Order
            </CardTitle>
            <Button onClick={addNewOrder} disabled={showOrderForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Order
            </Button>
          </div>
        </CardHeader>
        
        {showOrderForm && (
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="medication">Medication Name *</Label>
                  <Input
                    id="medication"
                    value={currentOrder.medicationName || ''}
                    onChange={(e) => updateOrder('medicationName', e.target.value)}
                    placeholder="Enter medication name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dosage">Dosage *</Label>
                  <Input
                    id="dosage"
                    value={currentOrder.dosage || ''}
                    onChange={(e) => updateOrder('dosage', e.target.value)}
                    placeholder="e.g., 500mg"
                  />
                </div>
                
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select 
                    value={currentOrder.frequency || ''} 
                    onValueChange={(value) => updateOrder('frequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once daily">Once daily</SelectItem>
                      <SelectItem value="twice daily">Twice daily</SelectItem>
                      <SelectItem value="three times daily">Three times daily</SelectItem>
                      <SelectItem value="four times daily">Four times daily</SelectItem>
                      <SelectItem value="every 4 hours">Every 4 hours</SelectItem>
                      <SelectItem value="every 6 hours">Every 6 hours</SelectItem>
                      <SelectItem value="every 8 hours">Every 8 hours</SelectItem>
                      <SelectItem value="as needed">As needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={currentOrder.duration || ''}
                    onChange={(e) => updateOrder('duration', e.target.value)}
                    placeholder="e.g., 30 days"
                  />
                </div>
                
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    value={currentOrder.quantity || ''}
                    onChange={(e) => updateOrder('quantity', e.target.value)}
                    placeholder="e.g., 30 tablets"
                  />
                </div>
                
                <div>
                  <Label htmlFor="refills">Refills</Label>
                  <Select 
                    value={currentOrder.refills?.toString() || '0'} 
                    onValueChange={(value) => updateOrder('refills', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select refills" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} refills
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="instructions">Special Instructions</Label>
                <Textarea
                  id="instructions"
                  value={currentOrder.instructions || ''}
                  onChange={(e) => updateOrder('instructions', e.target.value)}
                  placeholder="Enter special instructions for the patient"
                  className="min-h-20"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRefill"
                  checked={currentOrder.isRefill || false}
                  onCheckedChange={(checked) => updateOrder('isRefill', checked)}
                />
                <Label htmlFor="isRefill">This is a refill order</Label>
              </div>
              
              {/* Drug interaction warnings */}
              {currentOrder.medicationName && checkForInteractions(currentOrder.medicationName).length > 0 && (
                <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="h-4 w-4" />
                    <div className="font-medium">Potential Drug Interactions</div>
                  </div>
                  <div className="text-sm text-yellow-700 mt-1">
                    {currentOrder.medicationName} may interact with patient's current medications: {checkForInteractions(currentOrder.medicationName).join(', ')}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Button
                  onClick={submitCurrentOrder}
                  disabled={submitOrderMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Order
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setShowOrderForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}