import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileSignature, User, CheckCircle, Clock, Download, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { consentApi, patientApi } from "@/lib/api";

const consentFormTypes = [
  { value: "hipaa", label: "HIPAA Authorization", description: "Authorization for use and disclosure of protected health information" },
  { value: "consent", label: "Consent for Treatment", description: "Consent for home health care services" },
  { value: "rights", label: "Patient Rights & Responsibilities", description: "Information about patient rights and responsibilities" },
  { value: "advance_directive", label: "Advance Directive", description: "Advanced healthcare directives and preferences" },
  { value: "financial", label: "Financial Agreement", description: "Financial responsibility and billing information" },
];

export default function ConsentRights() {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedFormType, setSelectedFormType] = useState<string>("");
  const { toast } = useToast();

  const { data: patients } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: patientApi.getAll,
  });

  const { data: consentForms, error: consentError } = useQuery({
    queryKey: ['/api/consent', selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient) return [];
      try {
        const result = await consentApi.getByPatient(selectedPatient.id);
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Error fetching consent forms:', error);
        return [];
      }
    },
    enabled: !!selectedPatient,
    retry: 1,
  });

  const generateFormMutation = useMutation({
    mutationFn: async ({ patientId, formType }: { patientId: number; formType: string }) => {
      return consentApi.create({
        patientId,
        formType,
        status: 'pending',
        documentUrl: `/forms/${formType}_${patientId}_${Date.now()}.pdf`, // Mock URL
      });
    },
    onSuccess: () => {
      toast({
        title: "Form Generated",
        description: "Consent form has been generated and is ready for signature",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendForSignatureMutation = useMutation({
    mutationFn: async (formId: number) => {
      // In a real implementation, this would integrate with HelloSign or similar
      // For now, we'll simulate sending for signature
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      toast({
        title: "Sent for Signature",
        description: "Form has been sent to patient for electronic signature",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Send Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePatientSelect = (patientId: string) => {
    const patient = patients?.find((p: any) => p.id.toString() === patientId);
    setSelectedPatient(patient);
  };

  const handleGenerateForm = () => {
    if (selectedPatient && selectedFormType) {
      generateFormMutation.mutate({
        patientId: selectedPatient.id,
        formType: selectedFormType,
      });
    }
  };

  const handleSendForSignature = (formId: number) => {
    sendForSignatureMutation.mutate(formId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'expired':
        return <Clock className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFormTypeLabel = (formType: string) => {
    const type = consentFormTypes.find(t => t.value === formType);
    return type ? type.label : formType.toUpperCase();
  };

  const getComplianceStatus = () => {
    if (!consentForms || !Array.isArray(consentForms) || consentForms.length === 0) return 'incomplete';
    
    const requiredForms = ['hipaa', 'consent', 'rights'];
    const signedForms = consentForms
      .filter((form: any) => form && form.status === 'signed')
      .map((form: any) => form.formType);
    
    const hasAllRequired = requiredForms.every(required => signedForms.includes(required));
    return hasAllRequired ? 'compliant' : 'incomplete';
  };

  return (
    <div className="p-6 space-y-6">
      {/* HIPAA Compliance Status */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-900">
            <FileSignature className="w-5 h-5" />
            <span>HIPAA Compliance Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                All patient consent forms must be properly executed and maintained in compliance with HIPAA regulations.
              </p>
              <p className="text-xs mt-1 text-blue-600">
                Required forms: HIPAA Authorization, Consent for Treatment, Patient Rights & Responsibilities
              </p>
            </div>
            <Badge
              className={
                getComplianceStatus() === 'compliant'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }
              variant="secondary"
            >
              {getComplianceStatus() === 'compliant' ? 'Compliant' : 'Incomplete'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Form Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSignature className="w-5 h-5" />
            <span>Generate Consent Forms</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Patient
                </label>
                <Select onValueChange={handlePatientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a patient" />
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Type
                </label>
                <Select onValueChange={setSelectedFormType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose form type" />
                  </SelectTrigger>
                  <SelectContent>
                    {consentFormTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedFormType && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-1">
                  {consentFormTypes.find(t => t.value === selectedFormType)?.label}
                </h4>
                <p className="text-sm text-gray-600">
                  {consentFormTypes.find(t => t.value === selectedFormType)?.description}
                </p>
              </div>
            )}

            <Button
              onClick={handleGenerateForm}
              disabled={!selectedPatient || !selectedFormType || generateFormMutation.isPending}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {generateFormMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileSignature className="w-4 h-4 mr-2" />
                  Generate Form
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patient Consent History */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Consent Forms - {selectedPatient.patientName}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {consentForms && consentForms.length > 0 ? (
              <div className="space-y-4">
                {consentForms.map((form: any) => (
                  <div key={form.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          {getStatusIcon(form.status)}
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {getFormTypeLabel(form.formType)}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {consentFormTypes.find(t => t.value === form.formType)?.description}
                            </p>
                          </div>
                          <Badge className={getStatusColor(form.status)} variant="secondary">
                            {form.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">Created:</span>{' '}
                            {new Date(form.createdAt).toLocaleDateString()}
                          </div>
                          {form.signedAt && (
                            <div>
                              <span className="font-medium">Signed:</span>{' '}
                              {new Date(form.signedAt).toLocaleDateString()}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Status:</span>{' '}
                            <span className="capitalize">{form.status}</span>
                          </div>
                          {form.documentUrl && (
                            <div>
                              <span className="font-medium">Document:</span>{' '}
                              <span className="text-blue-600">Available</span>
                            </div>
                          )}
                        </div>

                        {form.signatureData && (
                          <div className="p-3 bg-green-50 rounded-lg mb-3">
                            <h4 className="font-medium text-green-900 mb-1">Signature Information</h4>
                            <div className="text-sm text-green-800">
                              <p>Signed electronically via secure platform</p>
                              <p>IP Address: {form.signatureData.ipAddress || 'N/A'}</p>
                              <p>Timestamp: {form.signedAt ? new Date(form.signedAt).toLocaleString() : 'N/A'}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2">
                        {form.documentUrl && (
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        )}
                        {form.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleSendForSignature(form.id)}
                            disabled={sendForSignatureMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {sendForSignatureMutation.isPending ? (
                              <>
                                <Clock className="w-4 h-4 mr-1 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-1" />
                                Send for Signature
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileSignature className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Consent Forms Found</h3>
                <p className="text-gray-500">Generate your first consent form to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compliance Summary */}
      {selectedPatient && consentForms && consentForms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Compliance Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['hipaa', 'consent', 'rights'].map((requiredType) => {
                const form = consentForms.find((f: any) => f.formType === requiredType);
                const isSigned = form && form.status === 'signed';
                
                return (
                  <div
                    key={requiredType}
                    className={`p-4 rounded-lg border ${
                      isSigned
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {isSigned ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-red-600" />
                      )}
                      <h4 className={`font-medium ${
                        isSigned ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {getFormTypeLabel(requiredType)}
                      </h4>
                    </div>
                    <p className={`text-sm ${
                      isSigned ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {isSigned ? 'Completed' : 'Required'}
                    </p>
                    {form && form.signedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Signed: {new Date(form.signedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
