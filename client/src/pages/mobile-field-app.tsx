import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  MapPin, 
  Phone,
  User,
  Calendar,
  CheckCircle,
  Clock3,
  AlertTriangle,
  Navigation,
  Stethoscope,
  FileText,
  Camera,
  Mic,
  LogOut,
  Heart,
  Thermometer,
  Activity,
  Plus,
  Save
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { PatientVisit, FieldStaff, VisitDocumentation } from '@shared/schema';

export default function MobileFieldApp() {
  const [selectedStaffId, setSelectedStaffId] = useState<number>(1);
  const [selectedVisit, setSelectedVisit] = useState<PatientVisit | null>(null);
  const [isDocumenting, setIsDocumenting] = useState(false);
  const [documentationData, setDocumentationData] = useState({
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      oxygenSaturation: ''
    },
    clinicalNotes: '',
    treatmentProvided: '',
    nextSteps: ''
  });

  const queryClient = useQueryClient();

  // Fetch field staff
  const { data: fieldStaffList = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['/api/field-staff'],
    retry: false,
  });

  // Fetch visits for selected staff
  const { data: visits = [], isLoading: isLoadingVisits } = useQuery({
    queryKey: ['/api/field-staff', selectedStaffId, 'visits'],
    retry: false,
  });

  // Get current staff member
  const currentStaff = fieldStaffList.find((staff: FieldStaff) => staff.id === selectedStaffId);

  // Update visit status mutation
  const updateVisitMutation = useMutation({
    mutationFn: async (data: { visitId: number; status: string }) => {
      return await apiRequest(`/api/visits/${data.visitId}`, {
        method: 'PATCH',
        body: { status: data.status }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/field-staff', selectedStaffId, 'visits'] });
    },
  });

  // Create documentation mutation
  const createDocumentationMutation = useMutation({
    mutationFn: async (data: { visitId: number; documentation: any }) => {
      return await apiRequest(`/api/visits/${data.visitId}/documentation`, {
        method: 'POST',
        body: {
          staffId: selectedStaffId,
          ...data.documentation
        }
      });
    },
    onSuccess: () => {
      setIsDocumenting(false);
      setSelectedVisit(null);
      setDocumentationData({
        vitalSigns: {
          bloodPressure: '',
          heartRate: '',
          temperature: '',
          oxygenSaturation: ''
        },
        clinicalNotes: '',
        treatmentProvided: '',
        nextSteps: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/field-staff', selectedStaffId, 'visits'] });
    },
  });

  const handleStartVisit = (visit: PatientVisit) => {
    updateVisitMutation.mutate({ visitId: visit.id, status: 'in_progress' });
  };

  const handleCompleteVisit = (visit: PatientVisit) => {
    setSelectedVisit(visit);
    setIsDocumenting(true);
  };

  const handleSaveDocumentation = () => {
    if (selectedVisit) {
      createDocumentationMutation.mutate({
        visitId: selectedVisit.id,
        documentation: documentationData
      });
      
      // Mark visit as completed
      updateVisitMutation.mutate({ visitId: selectedVisit.id, status: 'completed' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoadingStaff) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading field staff...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-teal-100 p-2 rounded-lg">
                <Stethoscope className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">📱 Mobile Field App</h1>
                <p className="text-sm text-gray-600">Healthcare Field Operations</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{currentStaff?.name || 'Field Staff'}</span>
              </div>
              <div className="text-xs text-gray-600">{currentStaff?.role}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff selector */}
      <div className="max-w-4xl mx-auto p-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Select Field Staff Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select 
              value={selectedStaffId} 
              onChange={(e) => setSelectedStaffId(Number(e.target.value))}
              className="w-full p-2 border rounded-lg"
            >
              {fieldStaffList.map((staff: FieldStaff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} - {staff.role}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{visits.length}</div>
              <div className="text-sm text-gray-600">Today's Visits</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">
                {visits.filter((v: PatientVisit) => v.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock3 className="h-6 w-6 mx-auto mb-2 text-orange-500" />
              <div className="text-2xl font-bold">
                {visits.filter((v: PatientVisit) => v.status === 'in_progress').length}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold">
                {visits.filter((v: PatientVisit) => v.priority === 'urgent').length}
              </div>
              <div className="text-sm text-gray-600">Urgent</div>
            </CardContent>
          </Card>
        </div>

        {/* Visit list */}
        {isLoadingVisits ? (
          <div className="text-center py-8">Loading visits...</div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Scheduled Visits</h2>
            {visits.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">No visits scheduled for today</p>
                </CardContent>
              </Card>
            ) : (
              visits.map((visit: PatientVisit) => (
                <Card key={visit.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{visit.patientName}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Clock className="h-4 w-4" />
                          {new Date(visit.scheduledTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge className={getStatusColor(visit.status || 'pending')}>
                          {visit.status || 'pending'}
                        </Badge>
                        <div className={`text-xs font-medium ${getPriorityColor(visit.priority || 'medium')}`}>
                          {visit.priority || 'medium'} priority
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {visit.address}
                      </div>
                      {visit.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          {visit.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4" />
                        {visit.visitType}
                      </div>
                    </div>

                    {visit.notes && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{visit.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {visit.status === 'pending' && (
                        <Button 
                          onClick={() => handleStartVisit(visit)}
                          disabled={updateVisitMutation.isPending}
                          className="flex-1"
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          Start Visit
                        </Button>
                      )}
                      
                      {visit.status === 'in_progress' && (
                        <Button 
                          onClick={() => handleCompleteVisit(visit)}
                          className="flex-1"
                          variant="outline"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Complete Visit
                        </Button>
                      )}

                      <Button variant="outline" size="sm">
                        <MapPin className="h-4 w-4" />
                      </Button>
                      
                      {visit.phone && (
                        <Button variant="outline" size="sm">
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Documentation Modal */}
      {isDocumenting && selectedVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Visit Documentation</h2>
              <p className="text-gray-600 mb-6">Patient: {selectedVisit.patientName}</p>

              <div className="space-y-6">
                {/* Vital Signs */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Vital Signs
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Blood Pressure</label>
                      <input
                        type="text"
                        placeholder="120/80"
                        value={documentationData.vitalSigns.bloodPressure}
                        onChange={(e) => setDocumentationData(prev => ({
                          ...prev,
                          vitalSigns: { ...prev.vitalSigns, bloodPressure: e.target.value }
                        }))}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Heart Rate</label>
                      <input
                        type="text"
                        placeholder="72 bpm"
                        value={documentationData.vitalSigns.heartRate}
                        onChange={(e) => setDocumentationData(prev => ({
                          ...prev,
                          vitalSigns: { ...prev.vitalSigns, heartRate: e.target.value }
                        }))}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Temperature</label>
                      <input
                        type="text"
                        placeholder="98.6°F"
                        value={documentationData.vitalSigns.temperature}
                        onChange={(e) => setDocumentationData(prev => ({
                          ...prev,
                          vitalSigns: { ...prev.vitalSigns, temperature: e.target.value }
                        }))}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Oxygen Saturation</label>
                      <input
                        type="text"
                        placeholder="98%"
                        value={documentationData.vitalSigns.oxygenSaturation}
                        onChange={(e) => setDocumentationData(prev => ({
                          ...prev,
                          vitalSigns: { ...prev.vitalSigns, oxygenSaturation: e.target.value }
                        }))}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Clinical Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">Clinical Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Enter clinical observations and notes..."
                    value={documentationData.clinicalNotes}
                    onChange={(e) => setDocumentationData(prev => ({
                      ...prev,
                      clinicalNotes: e.target.value
                    }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                {/* Treatment Provided */}
                <div>
                  <label className="block text-sm font-medium mb-2">Treatment Provided</label>
                  <textarea
                    rows={3}
                    placeholder="Describe treatment and interventions..."
                    value={documentationData.treatmentProvided}
                    onChange={(e) => setDocumentationData(prev => ({
                      ...prev,
                      treatmentProvided: e.target.value
                    }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                {/* Next Steps */}
                <div>
                  <label className="block text-sm font-medium mb-2">Next Steps</label>
                  <textarea
                    rows={3}
                    placeholder="Follow-up care and recommendations..."
                    value={documentationData.nextSteps}
                    onChange={(e) => setDocumentationData(prev => ({
                      ...prev,
                      nextSteps: e.target.value
                    }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <Button 
                  onClick={handleSaveDocumentation}
                  disabled={createDocumentationMutation.isPending}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Documentation
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDocumenting(false);
                    setSelectedVisit(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}