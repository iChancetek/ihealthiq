import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Edit3, Save, X, User, Calendar, Phone, MapPin, Shield, Heart, Pill, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface ExtractedPatientData {
  id?: number;
  patientName: string;
  dateOfBirth: string;
  contactPhone: string;
  address: string;
  insuranceInfo: {
    provider: string;
    memberId: string;
    groupId: string;
    effectiveDate: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  primaryDiagnosis: string;
  secondaryDiagnoses: string[];
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    prescribingPhysician: string;
  }>;
  allergies: string[];
  medicalHistory: string[];
  physician: string;
  referralReason: string;
  confidence: number;
  extractionSource: string;
}

interface PatientDataPreviewProps {
  extractedData: ExtractedPatientData;
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (editedData: ExtractedPatientData) => void;
  onCancel: () => void;
}

export default function PatientDataPreview({ 
  extractedData, 
  isOpen, 
  onClose, 
  onConfirmImport, 
  onCancel 
}: PatientDataPreviewProps) {
  const [editedData, setEditedData] = useState<ExtractedPatientData>(extractedData);
  const [isEditing, setIsEditing] = useState(true); // Always start in editing mode
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const handleFieldChange = (field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedFieldChange = (parent: string, field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof ExtractedPatientData],
        [field]: value
      }
    }));
  };

  const handleMedicationChange = (index: number, field: string, value: string) => {
    setEditedData(prev => {
      const newMedications = [...prev.medications];
      newMedications[index] = { ...newMedications[index], [field]: value };
      return { ...prev, medications: newMedications };
    });
  };

  const addMedication = () => {
    setEditedData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '', prescribingPhysician: '' }]
    }));
  };

  const removeMedication = (index: number) => {
    setEditedData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const handleArrayFieldChange = (field: 'allergies' | 'secondaryDiagnoses' | 'medicalHistory', value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value.split(',').map(item => item.trim()).filter(item => item)
    }));
  };

  const handleSaveChanges = () => {
    setIsEditing(false);
    toast({
      title: "Changes Saved",
      description: "Patient data has been updated successfully",
    });
  };

  const handleConfirmImport = () => {
    onConfirmImport(editedData);
    toast({
      title: "Patient Imported",
      description: "Patient data has been imported and will auto-populate relevant areas",
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Data Preview & Editing
              </DialogTitle>
              <DialogDescription>
                Review and edit the extracted patient information before importing
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${getConfidenceColor(editedData.confidence)} border`}>
                {Math.round(editedData.confidence * 100)}% Confidence
              </Badge>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <Save className="h-4 w-4 mr-1" /> : <Edit3 className="h-4 w-4 mr-1" />}
                {isEditing ? 'Save Changes' : 'Edit Data'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="medical">Medical Info</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Extraction Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Source Document</Label>
                    <p className="text-sm">{editedData.extractionSource}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Extraction Confidence</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${editedData.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{Math.round(editedData.confidence * 100)}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{editedData.medications.length}</div>
                    <div className="text-sm text-gray-600">Medications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{editedData.allergies.length}</div>
                    <div className="text-sm text-gray-600">Allergies</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{editedData.secondaryDiagnoses.length}</div>
                    <div className="text-sm text-gray-600">Secondary Diagnoses</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demographics Tab */}
          <TabsContent value="demographics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Demographics & Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="patientName">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="patientName"
                        value={editedData.patientName}
                        onChange={(e) => handleFieldChange('patientName', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 bg-gray-50 rounded border">{editedData.patientName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    {isEditing ? (
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={editedData.dateOfBirth}
                        onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 bg-gray-50 rounded border">
                        {new Date(editedData.dateOfBirth).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    {isEditing ? (
                      <Input
                        id="contactPhone"
                        value={editedData.contactPhone}
                        onChange={(e) => handleFieldChange('contactPhone', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 bg-gray-50 rounded border">{editedData.contactPhone}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="physician">Primary Physician</Label>
                    {isEditing ? (
                      <Input
                        id="physician"
                        value={editedData.physician}
                        onChange={(e) => handleFieldChange('physician', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 bg-gray-50 rounded border">{editedData.physician}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  {isEditing ? (
                    <Textarea
                      id="address"
                      value={editedData.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <p className="p-2 bg-gray-50 rounded border">{editedData.address}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Emergency Contact</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="emergencyName" className="text-sm">Name</Label>
                      {isEditing ? (
                        <Input
                          id="emergencyName"
                          value={editedData.emergencyContact.name}
                          onChange={(e) => handleNestedFieldChange('emergencyContact', 'name', e.target.value)}
                        />
                      ) : (
                        <p className="p-2 bg-gray-50 rounded border text-sm">{editedData.emergencyContact.name}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="emergencyRelationship" className="text-sm">Relationship</Label>
                      {isEditing ? (
                        <Input
                          id="emergencyRelationship"
                          value={editedData.emergencyContact.relationship}
                          onChange={(e) => handleNestedFieldChange('emergencyContact', 'relationship', e.target.value)}
                        />
                      ) : (
                        <p className="p-2 bg-gray-50 rounded border text-sm">{editedData.emergencyContact.relationship}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="emergencyPhone" className="text-sm">Phone</Label>
                      {isEditing ? (
                        <Input
                          id="emergencyPhone"
                          value={editedData.emergencyContact.phone}
                          onChange={(e) => handleNestedFieldChange('emergencyContact', 'phone', e.target.value)}
                        />
                      ) : (
                        <p className="p-2 bg-gray-50 rounded border text-sm">{editedData.emergencyContact.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Information Tab */}
          <TabsContent value="medical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Medical Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="primaryDiagnosis">Primary Diagnosis</Label>
                  {isEditing ? (
                    <Input
                      id="primaryDiagnosis"
                      value={editedData.primaryDiagnosis}
                      onChange={(e) => handleFieldChange('primaryDiagnosis', e.target.value)}
                    />
                  ) : (
                    <p className="p-2 bg-gray-50 rounded border">{editedData.primaryDiagnosis}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="secondaryDiagnoses">Secondary Diagnoses (comma-separated)</Label>
                  {isEditing ? (
                    <Textarea
                      id="secondaryDiagnoses"
                      value={editedData.secondaryDiagnoses.join(', ')}
                      onChange={(e) => handleArrayFieldChange('secondaryDiagnoses', e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border">
                      {editedData.secondaryDiagnoses.map((diagnosis, index) => (
                        <Badge key={index} variant="outline" className="mr-1 mb-1">
                          {diagnosis}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="allergies">Allergies (comma-separated)</Label>
                  {isEditing ? (
                    <Textarea
                      id="allergies"
                      value={editedData.allergies.join(', ')}
                      onChange={(e) => handleArrayFieldChange('allergies', e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border">
                      {editedData.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive" className="mr-1 mb-1">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="medicalHistory">Medical History (comma-separated)</Label>
                  {isEditing ? (
                    <Textarea
                      id="medicalHistory"
                      value={editedData.medicalHistory.join(', ')}
                      onChange={(e) => handleArrayFieldChange('medicalHistory', e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded border">
                      {editedData.medicalHistory.map((condition, index) => (
                        <Badge key={index} variant="secondary" className="mr-1 mb-1">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="referralReason">Referral Reason</Label>
                  {isEditing ? (
                    <Textarea
                      id="referralReason"
                      value={editedData.referralReason}
                      onChange={(e) => handleFieldChange('referralReason', e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <p className="p-2 bg-gray-50 rounded border">{editedData.referralReason}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medications Tab */}
          <TabsContent value="medications" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Current Medications
                  </CardTitle>
                  {isEditing && (
                    <Button onClick={addMedication} size="sm">
                      Add Medication
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editedData.medications.map((medication, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">Medication {index + 1}</Label>
                      {isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeMedication(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`medName${index}`} className="text-sm">Medication Name</Label>
                        {isEditing ? (
                          <Input
                            id={`medName${index}`}
                            value={medication.name}
                            onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                          />
                        ) : (
                          <p className="p-2 bg-gray-50 rounded border text-sm">{medication.name}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor={`medDosage${index}`} className="text-sm">Dosage</Label>
                        {isEditing ? (
                          <Input
                            id={`medDosage${index}`}
                            value={medication.dosage}
                            onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                          />
                        ) : (
                          <p className="p-2 bg-gray-50 rounded border text-sm">{medication.dosage}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`medFrequency${index}`} className="text-sm">Frequency</Label>
                        {isEditing ? (
                          <Input
                            id={`medFrequency${index}`}
                            value={medication.frequency}
                            onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                          />
                        ) : (
                          <p className="p-2 bg-gray-50 rounded border text-sm">{medication.frequency}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor={`medPhysician${index}`} className="text-sm">Prescribing Physician</Label>
                        {isEditing ? (
                          <Input
                            id={`medPhysician${index}`}
                            value={medication.prescribingPhysician}
                            onChange={(e) => handleMedicationChange(index, 'prescribingPhysician', e.target.value)}
                          />
                        ) : (
                          <p className="p-2 bg-gray-50 rounded border text-sm">{medication.prescribingPhysician}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {editedData.medications.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Pill className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No medications found</p>
                    {isEditing && (
                      <Button onClick={addMedication} className="mt-2">
                        Add First Medication
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insurance Tab */}
          <TabsContent value="insurance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Insurance Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                    {isEditing ? (
                      <Input
                        id="insuranceProvider"
                        value={editedData.insuranceInfo.provider}
                        onChange={(e) => handleNestedFieldChange('insuranceInfo', 'provider', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 bg-gray-50 rounded border">{editedData.insuranceInfo.provider}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="memberId">Member ID</Label>
                    {isEditing ? (
                      <Input
                        id="memberId"
                        value={editedData.insuranceInfo.memberId}
                        onChange={(e) => handleNestedFieldChange('insuranceInfo', 'memberId', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 bg-gray-50 rounded border">{editedData.insuranceInfo.memberId}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="groupId">Group ID</Label>
                    {isEditing ? (
                      <Input
                        id="groupId"
                        value={editedData.insuranceInfo.groupId}
                        onChange={(e) => handleNestedFieldChange('insuranceInfo', 'groupId', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 bg-gray-50 rounded border">{editedData.insuranceInfo.groupId}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="effectiveDate">Effective Date</Label>
                    {isEditing ? (
                      <Input
                        id="effectiveDate"
                        type="date"
                        value={editedData.insuranceInfo.effectiveDate}
                        onChange={(e) => handleNestedFieldChange('insuranceInfo', 'effectiveDate', e.target.value)}
                      />
                    ) : (
                      <p className="p-2 bg-gray-50 rounded border">
                        {new Date(editedData.insuranceInfo.effectiveDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel Import
          </Button>
          <div className="space-x-2">
            {isEditing && (
              <Button onClick={handleSaveChanges}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            )}
            <Button onClick={handleConfirmImport} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Import Patient & Auto-Populate
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}