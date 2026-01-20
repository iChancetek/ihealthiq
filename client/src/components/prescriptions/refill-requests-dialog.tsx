import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, X, Clock, Send, AlertTriangle } from 'lucide-react';

interface RefillRequest {
  id: number;
  patientId: number;
  patientName: string;
  prescriptionId: number;
  medicationName: string;
  currentDosage: string;
  requestDate: string;
  status: string;
  pharmacyName: string;
  pharmacyFax: string;
  requestedRefills: number;
  remainingRefills: number;
  lastFilled: string;
}

export function RefillRequestsDialog() {
  const [selectedRequest, setSelectedRequest] = useState<RefillRequest | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [dosageChange, setDosageChange] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending refill requests
  const { data: refillRequests, isLoading } = useQuery({
    queryKey: ['/api/refills/pending'],
    enabled: true
  });

  // Approve refill mutation
  const approveRefillMutation = useMutation({
    mutationFn: async (data: { 
      refillId: number; 
      notes?: string; 
      dosageChange?: string;
    }) => {
      const response = await fetch('/api/refills/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to approve refill');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Refill Approved",
        description: `Refill sent to ${data.pharmacyName} via eFax`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/refills/pending'] });
      setSelectedRequest(null);
      setDoctorNotes('');
      setDosageChange('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Deny refill mutation
  const denyRefillMutation = useMutation({
    mutationFn: async (data: { 
      refillId: number; 
      reason: string;
    }) => {
      const response = await fetch('/api/refills/deny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to deny refill');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Refill Denied",
        description: "Patient and pharmacy have been notified"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/refills/pending'] });
      setSelectedRequest(null);
      setDoctorNotes('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleApprove = () => {
    if (!selectedRequest) return;
    
    approveRefillMutation.mutate({
      refillId: selectedRequest.id,
      notes: doctorNotes,
      dosageChange: dosageChange
    });
  };

  const handleDeny = () => {
    if (!selectedRequest || !doctorNotes) {
      toast({
        title: "Denial Reason Required",
        description: "Please provide a reason for denying the refill",
        variant: "destructive"
      });
      return;
    }
    
    denyRefillMutation.mutate({
      refillId: selectedRequest.id,
      reason: doctorNotes
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilEmpty = (lastFilled: string, frequency: string) => {
    // Calculate based on last filled date and frequency
    const lastFilledDate = new Date(lastFilled);
    const today = new Date();
    const daysSinceLastFill = Math.floor((today.getTime() - lastFilledDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Estimate days remaining based on 30-day supply
    const estimatedDaysRemaining = 30 - daysSinceLastFill;
    return estimatedDaysRemaining;
  };

  if (isLoading) {
    return (
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Loading Refill Requests...</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-8">
          <Clock className="w-8 h-8 animate-spin" />
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Process Refill Requests
        </DialogTitle>
        <DialogDescription>
          Review and approve/deny pending refill requests with eFax integration
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Refill Requests List */}
        <div className="space-y-4">
          <h3 className="font-semibold">Pending Requests ({refillRequests?.length || 0})</h3>
          
          {refillRequests && refillRequests.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {refillRequests.map((request: RefillRequest) => {
                const daysRemaining = getDaysUntilEmpty(request.lastFilled, 'daily');
                
                return (
                  <Card 
                    key={request.id}
                    className={`cursor-pointer transition-colors ${
                      selectedRequest?.id === request.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedRequest(request)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{request.patientName}</h4>
                          <p className="text-sm text-gray-600">{request.medicationName} - {request.currentDosage}</p>
                        </div>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>Pharmacy: {request.pharmacyName}</div>
                        <div>Requested: {new Date(request.requestDate).toLocaleDateString()}</div>
                        <div>Last Filled: {new Date(request.lastFilled).toLocaleDateString()}</div>
                        <div className={`${daysRemaining <= 3 ? 'text-red-600 font-medium' : ''}`}>
                          Est. {daysRemaining} days remaining
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center gap-2">
                        <div className="text-xs text-gray-500">
                          Refills: {request.remainingRefills} remaining
                        </div>
                        {daysRemaining <= 3 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="text-xs">Urgent</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No pending refill requests</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Selected Request Details */}
        <div className="space-y-4">
          {selectedRequest ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Refill Request Details</CardTitle>
                  <CardDescription>
                    Patient: {selectedRequest.patientName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="font-medium">Medication</Label>
                      <p>{selectedRequest.medicationName}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Current Dosage</Label>
                      <p>{selectedRequest.currentDosage}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Pharmacy</Label>
                      <p>{selectedRequest.pharmacyName}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Fax Number</Label>
                      <p>{selectedRequest.pharmacyFax}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Requested Refills</Label>
                      <p>{selectedRequest.requestedRefills}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Remaining Authorization</Label>
                      <p>{selectedRequest.remainingRefills} refills</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Doctor Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="dosage-change">Dosage Change (Optional)</Label>
                    <Input
                      id="dosage-change"
                      value={dosageChange}
                      onChange={(e) => setDosageChange(e.target.value)}
                      placeholder="e.g., Increase to 1000mg twice daily"
                    />
                  </div>

                  <div>
                    <Label htmlFor="doctor-notes">Notes/Instructions</Label>
                    <Textarea
                      id="doctor-notes"
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      placeholder="Additional instructions or reason for denial..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleApprove}
                      disabled={approveRefillMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveRefillMutation.isPending ? "Sending..." : "Approve & Send eFax"}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleDeny}
                      disabled={denyRefillMutation.isPending}
                    >
                      <X className="w-4 h-4 mr-2" />
                      {denyRefillMutation.isPending ? "Processing..." : "Deny Request"}
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
                    <p><strong>eFax Integration:</strong></p>
                    <p>• Approved refills sent directly to pharmacy</p>
                    <p>• HIPAA-compliant transmission logging</p>
                    <p>• Delivery confirmation tracking</p>
                    <p>• Audit trail for compliance</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a refill request to review</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

export default RefillRequestsDialog;