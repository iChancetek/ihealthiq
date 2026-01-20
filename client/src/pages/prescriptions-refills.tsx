import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Pill, Send, Loader2, AlertTriangle, CheckCircle, Clock, MapPin, Phone, FileText } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Prescription {
  id: number;
  patientId: number;
  medicationName: string;
  dosage: string;
  quantity: number;
  instructions: string;
  refillsRemaining: number;
  status: string;
  prescribedBy: number;
  prescribedDate: Date;
  expirationDate: Date;
  digitalSignature: string;
  createdAt: Date;
  aiRecommendations?: any;
}

interface RefillRequest {
  id: number;
  prescriptionId: number;
  quantityRequested: number;
  reason: string;
  status: string;
  requestedBy: number;
  approvedBy?: number;
  createdAt: Date;
  approvedAt?: Date;
}

interface Pharmacy {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  faxNumber: string;
  chainType: string;
  isActive: boolean;
  estimatedWaitTime?: number;
  distance?: number;
  services?: string[];
}

interface Patient {
  id: number;
  patientName: string;
  dateOfBirth: string;
  patientId: string;
}

interface AIRecommendation {
  medicationName: string;
  recommendedDosage: string;
  frequency: string;
  duration: string;
  confidence: number;
  interactions: {
    severity: string;
    interactingMedications: string[];
    recommendations: string[];
  };
  alternatives?: Array<{
    medication: string;
    reason: string;
  }>;
  warnings: string[];
  monitoringRequirements: string[];
}

const prescriptionSchema = z.object({
  patientId: z.number().min(1, 'Patient is required'),
  medicationName: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  instructions: z.string().min(1, 'Instructions are required'),
  refillsRemaining: z.number().min(0, 'Refills cannot be negative'),
  indication: z.string().min(1, 'Medical indication is required'),
  medicalConditions: z.array(z.string()).default([]),
  currentMedications: z.array(z.string()).default([])
});

const refillSchema = z.object({
  prescriptionId: z.number().min(1, 'Prescription is required'),
  quantityRequested: z.number().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(1, 'Reason is required')
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;
type RefillFormData = z.infer<typeof refillSchema>;

export default function PrescriptionsRefills() {
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [pharmacySearchZip, setPharmacySearchZip] = useState('');
  const [activeTab, setActiveTab] = useState('prescriptions');
  const [newPrescriptionOpen, setNewPrescriptionOpen] = useState(false);
  const [newRefillOpen, setNewRefillOpen] = useState(false);
  const [eFaxDialogOpen, setEFaxDialogOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch prescriptions
  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['/api/prescriptions'],
    queryFn: () => apiRequest('/api/prescriptions')
  });

  // Fetch refill requests
  const { data: refills = [], isLoading: refillsLoading } = useQuery({
    queryKey: ['/api/refills'],
    queryFn: () => apiRequest('/api/refills')
  });

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: () => apiRequest('/api/patients')
  });

  // Fetch pharmacies based on zip code
  const { data: pharmacies = [], refetch: refetchPharmacies } = useQuery({
    queryKey: ['/api/pharmacies/search', pharmacySearchZip],
    queryFn: () => apiRequest(`/api/pharmacies/search?zipCode=${pharmacySearchZip}`),
    enabled: pharmacySearchZip.length === 5
  });

  // Fetch popular pharmacy chains
  const { data: popularChains = [] } = useQuery({
    queryKey: ['/api/pharmacies/popular-chains'],
    queryFn: () => apiRequest('/api/pharmacies/popular-chains')
  });

  // Create prescription mutation
  const createPrescriptionMutation = useMutation({
    mutationFn: (data: PrescriptionFormData) => apiRequest('/api/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      setNewPrescriptionOpen(false);
      setAiRecommendations(response.aiRecommendations);
      toast({
        title: 'Prescription Created',
        description: 'Prescription created successfully with AI recommendations'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create prescription',
        variant: 'destructive'
      });
    }
  });

  // Create refill mutation
  const createRefillMutation = useMutation({
    mutationFn: (data: RefillFormData) => apiRequest('/api/refills', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/refills'] });
      setNewRefillOpen(false);
      toast({
        title: 'Refill Requested',
        description: 'Refill request submitted successfully'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create refill request',
        variant: 'destructive'
      });
    }
  });

  // Send eFax mutation
  const sendEFaxMutation = useMutation({
    mutationFn: ({ prescriptionId, pharmacyId }: { prescriptionId: number; pharmacyId: number }) =>
      apiRequest(`/api/prescriptions/${prescriptionId}/send-efax`, {
        method: 'POST',
        body: JSON.stringify({ pharmacyId })
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      setEFaxDialogOpen(false);
      toast({
        title: 'eFax Sent',
        description: response.success 
          ? `Prescription successfully sent to ${selectedPharmacy?.name}`
          : 'eFax transmission failed. Please try again.'
      });
    },
    onError: (error) => {
      toast({
        title: 'eFax Error',
        description: 'Failed to send prescription via eFax',
        variant: 'destructive'
      });
    }
  });

  // Approve refill mutation
  const approveRefillMutation = useMutation({
    mutationFn: ({ refillId, pharmacyId }: { refillId: number; pharmacyId: number }) =>
      apiRequest(`/api/refills/${refillId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ pharmacyId })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/refills'] });
      toast({
        title: 'Refill Approved',
        description: 'Refill request approved and sent to pharmacy'
      });
    }
  });

  const prescriptionForm = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      patientId: 0,
      medicationName: '',
      dosage: '',
      quantity: 30,
      instructions: '',
      refillsRemaining: 0,
      indication: '',
      medicalConditions: [],
      currentMedications: []
    }
  });

  const refillForm = useForm<RefillFormData>({
    resolver: zodResolver(refillSchema),
    defaultValues: {
      prescriptionId: 0,
      quantityRequested: 30,
      reason: ''
    }
  });

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      approved: 'bg-green-100 text-green-800',
      denied: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handlePharmacySearch = () => {
    if (pharmacySearchZip.length === 5) {
      refetchPharmacies();
    }
  };

  const handleSendEFax = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setEFaxDialogOpen(true);
  };

  const formatFaxNumber = (faxNumber: string) => {
    const digits = faxNumber.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return faxNumber;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Pill className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Prescriptions & Refills</h1>
        </div>
        <div className="flex space-x-2">
          <Dialog open={newPrescriptionOpen} onOpenChange={setNewPrescriptionOpen}>
            <DialogTrigger asChild>
              <Button>New Prescription</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Prescription</DialogTitle>
                <DialogDescription>
                  Create a new prescription with AI-powered dosing recommendations
                </DialogDescription>
              </DialogHeader>
              <Form {...prescriptionForm}>
                <form onSubmit={prescriptionForm.handleSubmit((data) => createPrescriptionMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={prescriptionForm.control}
                      name="patientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select patient" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {patients.map((patient: Patient) => (
                                <SelectItem key={patient.id} value={patient.id.toString()}>
                                  {patient.patientName} - DOB: {patient.dateOfBirth}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prescriptionForm.control}
                      name="medicationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medication Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Lisinopril" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={prescriptionForm.control}
                      name="dosage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dosage</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 10mg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prescriptionForm.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prescriptionForm.control}
                      name="refillsRemaining"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Refills</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={prescriptionForm.control}
                    name="indication"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medical Indication</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Hypertension" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={prescriptionForm.control}
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instructions</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Take once daily with food" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setNewPrescriptionOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createPrescriptionMutation.isPending}>
                      {createPrescriptionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Prescription
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={newRefillOpen} onOpenChange={setNewRefillOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Request Refill</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Prescription Refill</DialogTitle>
                <DialogDescription>
                  Request a refill for an existing prescription
                </DialogDescription>
              </DialogHeader>
              <Form {...refillForm}>
                <form onSubmit={refillForm.handleSubmit((data) => createRefillMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={refillForm.control}
                    name="prescriptionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prescription</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select prescription" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {prescriptions.map((prescription: Prescription) => (
                              <SelectItem key={prescription.id} value={prescription.id.toString()}>
                                {prescription.medicationName} - {prescription.dosage}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={refillForm.control}
                    name="quantityRequested"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity Requested</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={refillForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Refill</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., Running low on medication" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setNewRefillOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createRefillMutation.isPending}>
                      {createRefillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Request Refill
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* AI Recommendations Display */}
      {aiRecommendations && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <span>AI Dosing Recommendations</span>
              <Badge variant="secondary">Confidence: {Math.round(aiRecommendations.confidence * 100)}%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold">Recommended Dosage</h4>
                <p>{aiRecommendations.recommendedDosage}</p>
                <p className="text-sm text-gray-600">{aiRecommendations.frequency} for {aiRecommendations.duration}</p>
              </div>
              <div>
                <h4 className="font-semibold">Drug Interactions</h4>
                <Badge className={`${
                  aiRecommendations.interactions.severity === 'none' ? 'bg-green-100 text-green-800' :
                  aiRecommendations.interactions.severity === 'minor' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {aiRecommendations.interactions.severity}
                </Badge>
                {aiRecommendations.interactions.interactingMedications.length > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    Interactions with: {aiRecommendations.interactions.interactingMedications.join(', ')}
                  </p>
                )}
              </div>
            </div>
            {aiRecommendations.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                <h4 className="font-semibold flex items-center space-x-1">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span>Warnings</span>
                </h4>
                <ul className="list-disc list-inside text-sm">
                  {aiRecommendations.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="refills">Refill Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions">
          <div className="grid gap-4">
            {prescriptionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : prescriptions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Pill className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No prescriptions</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new prescription.</p>
                </CardContent>
              </Card>
            ) : (
              prescriptions.map((prescription: Prescription) => (
                <Card key={prescription.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{prescription.medicationName}</CardTitle>
                        <CardDescription>
                          {prescription.dosage} • Qty: {prescription.quantity} • Refills: {prescription.refillsRemaining}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(prescription.status)}
                        <Button
                          size="sm"
                          onClick={() => handleSendEFax(prescription)}
                          disabled={prescription.status === 'sent' || prescription.status === 'delivered'}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send eFax
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Instructions:</strong> {prescription.instructions}</p>
                        <p><strong>Prescribed:</strong> {new Date(prescription.prescribedDate).toLocaleDateString()}</p>
                        <p><strong>Expires:</strong> {new Date(prescription.expirationDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p><strong>Digital Signature:</strong> {prescription.digitalSignature.substring(0, 16)}...</p>
                        {prescription.aiRecommendations && (
                          <Badge variant="outline" className="mt-2">
                            AI-Enhanced Prescription
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="refills">
          <div className="grid gap-4">
            {refillsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : refills.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">No refill requests</h3>
                  <p className="mt-1 text-sm text-gray-500">Refill requests will appear here when submitted.</p>
                </CardContent>
              </Card>
            ) : (
              refills.map((refill: RefillRequest) => {
                const prescription = prescriptions.find((p: Prescription) => p.id === refill.prescriptionId);
                return (
                  <Card key={refill.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {prescription?.medicationName || 'Unknown Medication'}
                          </CardTitle>
                          <CardDescription>
                            Refill Request • Qty: {refill.quantityRequested}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(refill.status)}
                          {refill.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                // Set up pharmacy selection for refill approval
                                setSelectedPrescription(prescription);
                                setEFaxDialogOpen(true);
                              }}
                            >
                              Approve & Send
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <p><strong>Reason:</strong> {refill.reason}</p>
                        <p><strong>Requested:</strong> {new Date(refill.createdAt).toLocaleDateString()}</p>
                        {refill.approvedAt && (
                          <p><strong>Approved:</strong> {new Date(refill.approvedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* eFax Pharmacy Selection Dialog */}
      <Dialog open={eFaxDialogOpen} onOpenChange={setEFaxDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Send Prescription via eFax</DialogTitle>
            <DialogDescription>
              Select a pharmacy to send the prescription to via secure eFax
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Pharmacy Search */}
            <div className="flex space-x-2">
              <Input
                placeholder="Enter ZIP code"
                value={pharmacySearchZip}
                onChange={(e) => setPharmacySearchZip(e.target.value)}
                maxLength={5}
              />
              <Button onClick={handlePharmacySearch}>Search</Button>
            </div>

            {/* Popular Chains */}
            <div>
              <h4 className="font-semibold mb-2">Popular Pharmacy Chains</h4>
              <div className="grid grid-cols-3 gap-2">
                {popularChains.map((chain: any) => (
                  <Button
                    key={chain.chainType}
                    variant="outline"
                    size="sm"
                    onClick={() => setPharmacySearchZip('60601')} // Example zip for chain search
                  >
                    {chain.displayName}
                  </Button>
                ))}
              </div>
            </div>

            {/* Pharmacy Results */}
            {pharmacies.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Available Pharmacies</h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {pharmacies.map((pharmacy: Pharmacy) => (
                    <Card
                      key={pharmacy.id}
                      className={`cursor-pointer transition-colors ${
                        selectedPharmacy?.id === pharmacy.id
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedPharmacy(pharmacy)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-semibold">{pharmacy.name}</h5>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{pharmacy.address}, {pharmacy.city}, {pharmacy.state}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Phone className="h-3 w-3" />
                                <span>{pharmacy.phoneNumber}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <FileText className="h-3 w-3" />
                                <span>{formatFaxNumber(pharmacy.faxNumber)}</span>
                              </div>
                            </div>
                            {pharmacy.estimatedWaitTime && (
                              <p className="text-sm text-gray-500">
                                Est. wait time: {pharmacy.estimatedWaitTime} minutes
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{pharmacy.chainType}</Badge>
                            {pharmacy.distance && (
                              <p className="text-sm text-gray-500">{pharmacy.distance} miles</p>
                            )}
                          </div>
                        </div>
                        {pharmacy.services && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {pharmacy.services.slice(0, 3).map((service) => (
                              <Badge key={service} variant="secondary" className="text-xs">
                                {service.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEFaxDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedPrescription && selectedPharmacy) {
                    sendEFaxMutation.mutate({
                      prescriptionId: selectedPrescription.id,
                      pharmacyId: selectedPharmacy.id
                    });
                  }
                }}
                disabled={!selectedPharmacy || sendEFaxMutation.isPending}
              >
                {sendEFaxMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Send eFax
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}