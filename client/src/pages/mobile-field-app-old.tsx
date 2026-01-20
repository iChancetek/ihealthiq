import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Clock, 
  Phone, 
  Camera, 
  Mic, 
  FileText, 
  Navigation, 
  Wifi, 
  WifiOff,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  Stethoscope,
  Heart,
  Activity
} from 'lucide-react';

interface FieldStaffUser {
  id: number;
  name: string;
  role: string;
  licenseNumber: string;
  territory: string;
}

interface PatientVisit {
  id: number;
  patientName: string;
  address: string;
  phone: string;
  visitType: string;
  scheduledTime: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  gpsCoordinates?: { lat: number; lng: number };
}

interface VisitDocumentation {
  id?: number;
  visitId: number;
  vitalSigns: {
    bloodPressure: string;
    heartRate: string;
    temperature: string;
    oxygenSaturation: string;
    respiratoryRate: string;
  };
  clinicalNotes: string;
  treatmentProvided: string;
  nextSteps: string;
  photos: string[];
  audioNotes: string[];
  duration: number;
  timestamp: string;
}

export default function MobileFieldApp() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FieldStaffUser | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<PatientVisit | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [visitForm, setVisitForm] = useState<VisitDocumentation>({
    visitId: 0,
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      oxygenSaturation: '',
      respiratoryRate: ''
    },
    clinicalNotes: '',
    treatmentProvided: '',
    nextSteps: '',
    photos: [],
    audioNotes: [],
    duration: 0,
    timestamp: new Date().toISOString()
  });

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  // Fetch field staff profile
  const { data: staffProfile } = useQuery({
    queryKey: ['/api/field-staff/profile'],
    retry: false,
  });

  // Fetch today's scheduled visits
  const { data: scheduledVisits, isLoading: visitsLoading } = useQuery({
    queryKey: ['/api/field-staff/visits/today'],
    retry: false,
  });

  // Submit visit documentation
  const submitVisitMutation = useMutation({
    mutationFn: async (documentation: VisitDocumentation) => {
      return apiRequest('/api/field-staff/visits/document', {
        method: 'POST',
        body: JSON.stringify(documentation),
      });
    },
    onSuccess: () => {
      toast({
        title: "Visit Documented",
        description: "Visit documentation submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/field-staff/visits/today'] });
      setSelectedVisit(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit visit documentation",
        variant: "destructive",
      });
    },
  });

  // Update visit status
  const updateVisitStatusMutation = useMutation({
    mutationFn: async ({ visitId, status }: { visitId: number; status: string }) => {
      return apiRequest(`/api/field-staff/visits/${visitId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/field-staff/visits/today'] });
    },
  });

  const handleStartVisit = (visit: PatientVisit) => {
    setSelectedVisit(visit);
    setVisitForm({
      ...visitForm,
      visitId: visit.id,
      timestamp: new Date().toISOString()
    });
    updateVisitStatusMutation.mutate({ visitId: visit.id, status: 'in_progress' });
  };

  const handleCompleteVisit = () => {
    if (selectedVisit) {
      const documentation = {
        ...visitForm,
        duration: Math.floor((new Date().getTime() - new Date(visitForm.timestamp).getTime()) / 60000)
      };
      submitVisitMutation.mutate(documentation);
      updateVisitStatusMutation.mutate({ visitId: selectedVisit.id, status: 'completed' });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (selectedVisit) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Visit Header */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{selectedVisit.patientName}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedVisit(null)}
                >
                  Back to Schedule
                </Button>
              </div>
              <CardDescription className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {selectedVisit.address}
              </CardDescription>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(selectedVisit.scheduledTime).toLocaleTimeString()}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {selectedVisit.phone}
                </span>
              </div>
            </CardHeader>
          </Card>

          {/* Visit Documentation Form */}
          <Tabs defaultValue="vitals" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="vitals">Vitals</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="vitals">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Vital Signs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bloodPressure">Blood Pressure</Label>
                      <Input
                        id="bloodPressure"
                        placeholder="120/80"
                        value={visitForm.vitalSigns.bloodPressure}
                        onChange={(e) => setVisitForm({
                          ...visitForm,
                          vitalSigns: { ...visitForm.vitalSigns, bloodPressure: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="heartRate">Heart Rate</Label>
                      <Input
                        id="heartRate"
                        placeholder="72 bpm"
                        value={visitForm.vitalSigns.heartRate}
                        onChange={(e) => setVisitForm({
                          ...visitForm,
                          vitalSigns: { ...visitForm.vitalSigns, heartRate: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="temperature">Temperature</Label>
                      <Input
                        id="temperature"
                        placeholder="98.6°F"
                        value={visitForm.vitalSigns.temperature}
                        onChange={(e) => setVisitForm({
                          ...visitForm,
                          vitalSigns: { ...visitForm.vitalSigns, temperature: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="oxygenSaturation">O2 Saturation</Label>
                      <Input
                        id="oxygenSaturation"
                        placeholder="98%"
                        value={visitForm.vitalSigns.oxygenSaturation}
                        onChange={(e) => setVisitForm({
                          ...visitForm,
                          vitalSigns: { ...visitForm.vitalSigns, oxygenSaturation: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
                    <Input
                      id="respiratoryRate"
                      placeholder="16 breaths/min"
                      value={visitForm.vitalSigns.respiratoryRate}
                      onChange={(e) => setVisitForm({
                        ...visitForm,
                        vitalSigns: { ...visitForm.vitalSigns, respiratoryRate: e.target.value }
                      })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Clinical Documentation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="clinicalNotes">Clinical Notes</Label>
                    <Textarea
                      id="clinicalNotes"
                      placeholder="Patient assessment, observations, and clinical findings..."
                      value={visitForm.clinicalNotes}
                      onChange={(e) => setVisitForm({ ...visitForm, clinicalNotes: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label htmlFor="treatmentProvided">Treatment Provided</Label>
                    <Textarea
                      id="treatmentProvided"
                      placeholder="Treatments, medications administered, procedures performed..."
                      value={visitForm.treatmentProvided}
                      onChange={(e) => setVisitForm({ ...visitForm, treatmentProvided: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nextSteps">Next Steps</Label>
                    <Textarea
                      id="nextSteps"
                      placeholder="Follow-up care, recommendations, scheduling..."
                      value={visitForm.nextSteps}
                      onChange={(e) => setVisitForm({ ...visitForm, nextSteps: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Media Documentation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <Camera className="h-6 w-6" />
                      Take Photo
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <Mic className="h-6 w-6" />
                      Record Audio
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    Photos and audio notes will be securely uploaded when connection is available.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle>Visit Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Visit Duration:</strong> 
                      <span className="ml-2">
                        {Math.floor((new Date().getTime() - new Date(visitForm.timestamp).getTime()) / 60000)} minutes
                      </span>
                    </div>
                    <div>
                      <strong>Documentation Complete:</strong>
                      <span className="ml-2">
                        {visitForm.clinicalNotes && visitForm.vitalSigns.heartRate ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCompleteVisit}
                    className="w-full"
                    disabled={!visitForm.clinicalNotes || submitVisitMutation.isPending}
                  >
                    {submitVisitMutation.isPending ? 'Submitting...' : 'Complete Visit'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with status indicators */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Field Staff App</h1>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1 text-sm">
                  {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
                  {isOnline ? 'Online' : 'Offline'}
                </div>
                {currentLocation && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Navigation className="h-4 w-4" />
                    Location Available
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{staffProfile?.name || 'Field Staff'}</span>
              </div>
              <div className="text-xs text-gray-600">{staffProfile?.role}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto p-4">
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{scheduledVisits?.length || 0}</div>
              <div className="text-sm text-gray-600">Today's Visits</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">
                {scheduledVisits?.filter((v: PatientVisit) => v.status === 'completed').length || 0}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Activity className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">
                {scheduledVisits?.filter((v: PatientVisit) => v.status === 'in_progress').length || 0}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">
                {scheduledVisits?.filter((v: PatientVisit) => v.status === 'pending').length || 0}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </CardContent>
          </Card>
        </div>

        {/* Visit schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {visitsLoading ? (
              <div className="text-center py-8">Loading visits...</div>
            ) : scheduledVisits?.length > 0 ? (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {scheduledVisits.map((visit: PatientVisit) => (
                    <div
                      key={visit.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{visit.patientName}</h3>
                          <Badge className={`${getPriorityColor(visit.priority)} text-white`}>
                            {visit.priority}
                          </Badge>
                          {getStatusIcon(visit.status)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(visit.scheduledTime).toLocaleTimeString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {visit.address}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {visit.phone}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {visit.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleStartVisit(visit)}
                          >
                            Start Visit
                          </Button>
                        )}
                        {visit.status === 'in_progress' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedVisit(visit)}
                          >
                            Continue
                          </Button>
                        )}
                        {visit.status === 'completed' && (
                          <Button size="sm" variant="secondary" disabled>
                            Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No visits scheduled for today
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}