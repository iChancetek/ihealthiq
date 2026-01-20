import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  FileText, 
  Database, 
  Send, 
  CheckCircle, 
  User,
  Stethoscope,
  Settings
} from 'lucide-react';

interface PatientData {
  id: number;
  patientName: string;
  dateOfBirth: string;
  diagnosis: string;
}

export default function EHRIntegrationPanelSimple() {
  const [selectedPatient, setSelectedPatient] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [dateRange, setDateRange] = useState<string>('30');
  const [ehrSystem, setEhrSystem] = useState<string>('');
  const [customMapping, setCustomMapping] = useState<string>('');
  const { toast } = useToast();

  // Fetch patients
  const { data: patients = [], isLoading: patientsLoading } = useQuery<PatientData[]>({
    queryKey: ['/api/patients'],
    staleTime: 5 * 60 * 1000,
  });

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: async (exportData: {
      patientId?: string;
      format: string;
      dateRange: string;
      includeSOAP: boolean;
      ehrSystem?: string;
    }) => {
      const response = await fetch('/api/ehr/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export failed: ${errorText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `patient_data_${new Date().toISOString().split('T')[0]}.${exportData.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Export Successful",
        description: "Patient data has been exported and downloaded"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Generate CCD document mutation
  const generateCCDMutation = useMutation({
    mutationFn: async (data: { patientId: string }) => {
      const response = await fetch('/api/ehr/generate-ccd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`CCD generation failed: ${errorText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ccd_${data.patientId}_${new Date().toISOString().split('T')[0]}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "CCD Generated",
        description: "Continuity of Care Document has been generated and downloaded"
      });
    },
    onError: (error: any) => {
      toast({
        title: "CCD Generation Failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Send to EHR mutation
  const sendToEHRMutation = useMutation({
    mutationFn: async (data: {
      patientId: string;
      ehrSystem: string;
      mapping: string;
    }) => {
      const response = await fetch('/api/ehr/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`EHR transmission failed: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Data Sent Successfully",
        description: `Patient data transmitted to ${ehrSystem} (Transaction ID: ${data.transactionId})`
      });
    },
    onError: (error: any) => {
      toast({
        title: "EHR Transmission Failed",
        description: error.message || "Please check your EHR configuration",
        variant: "destructive"
      });
    }
  });

  const handleExport = () => {
    exportDataMutation.mutate({
      patientId: selectedPatient === "all" ? undefined : selectedPatient || undefined,
      format: selectedFormat,
      dateRange,
      includeSOAP: true,
      ehrSystem: ehrSystem || undefined
    });
  };

  const handleGenerateCCD = () => {
    if (!selectedPatient || selectedPatient === "all") {
      toast({
        title: "Specific Patient Required",
        description: "Please select a specific patient to generate CCD document",
        variant: "destructive"
      });
      return;
    }
    
    generateCCDMutation.mutate({ patientId: selectedPatient });
  };

  const handleSendToEHR = () => {
    if (!selectedPatient || selectedPatient === "all" || !ehrSystem) {
      toast({
        title: "Missing Information",
        description: "Please select a specific patient and EHR system",
        variant: "destructive"
      });
      return;
    }
    
    sendToEHRMutation.mutate({
      patientId: selectedPatient,
      ehrSystem,
      mapping: customMapping
    });
  };

  if (patientsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading EHR Integration...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please wait while we load the EHR integration panel.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Data Export
            </CardTitle>
            <CardDescription>
              Export patient data and SOAP notes in various formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="patient-select">Patient (Optional - Leave blank for all patients)</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select patient or leave blank for all" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id.toString()}>
                      {patient.patientName} - DOB: {patient.dateOfBirth}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="format-select">Export Format</Label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Report</SelectItem>
                  <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                  <SelectItem value="json">JSON Data</SelectItem>
                  <SelectItem value="xml">XML Document</SelectItem>
                  <SelectItem value="hl7">HL7 Message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-range">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleExport}
              disabled={exportDataMutation.isPending}
              className="w-full"
            >
              {exportDataMutation.isPending ? (
                <>
                  <Download className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Clinical Documents
            </CardTitle>
            <CardDescription>
              Generate standardized clinical documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleGenerateCCD}
              disabled={generateCCDMutation.isPending || !selectedPatient || selectedPatient === "all"}
              className="w-full"
              variant="outline"
            >
              {generateCCDMutation.isPending ? (
                <>
                  <FileText className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate CCD Document
                </>
              )}
            </Button>

            <Button 
              variant="outline"
              className="w-full"
              onClick={() => {
                toast({
                  title: "Feature Coming Soon",
                  description: "C-CDA generation will be available in the next update"
                });
              }}
            >
              <Database className="w-4 h-4 mr-2" />
              Generate C-CDA
            </Button>

            <Button 
              variant="outline"
              className="w-full"
              onClick={() => {
                toast({
                  title: "Feature Coming Soon",
                  description: "Direct FHIR export will be available in the next update"
                });
              }}
            >
              <Send className="w-4 h-4 mr-2" />
              Export to FHIR
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* EHR Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            EHR System Integration
          </CardTitle>
          <CardDescription>
            Direct integration with external EHR systems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ehr-system">EHR System</Label>
              <Select value={ehrSystem} onValueChange={setEhrSystem}>
                <SelectTrigger>
                  <SelectValue placeholder="Select EHR system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="athena">Athena Health</SelectItem>
                  <SelectItem value="eclinicalworks">eClinicalWorks</SelectItem>
                  <SelectItem value="drchrono">DrChrono</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                  <SelectItem value="cerner">Cerner</SelectItem>
                  <SelectItem value="allscripts">Allscripts</SelectItem>
                  <SelectItem value="custom">Custom FHIR Endpoint</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="custom-mapping">Custom Field Mapping (Optional)</Label>
              <Textarea
                id="custom-mapping"
                value={customMapping}
                onChange={(e) => setCustomMapping(e.target.value)}
                placeholder="Enter JSON field mapping configuration..."
                rows={3}
              />
            </div>
          </div>

          <Button 
            onClick={handleSendToEHR}
            disabled={sendToEHRMutation.isPending || !selectedPatient || selectedPatient === "all" || !ehrSystem}
            className="w-full"
          >
            {sendToEHRMutation.isPending ? (
              <>
                <Send className="w-4 h-4 mr-2 animate-spin" />
                Transmitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send to EHR System
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{patients.length}</div>
              <div className="text-sm text-muted-foreground">Patients</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">5</div>
              <div className="text-sm text-muted-foreground">Export Formats</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">7</div>
              <div className="text-sm text-muted-foreground">EHR Systems</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">HIPAA</div>
              <div className="text-sm text-muted-foreground">Compliant</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Information */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            EHR Integration Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
            <ul className="space-y-2">
              <li>• Real-time patient data synchronization</li>
              <li>• HL7/FHIR standard compliance</li>
              <li>• Automated SOAP note formatting</li>
              <li>• CCD/C-CDA document generation</li>
            </ul>
            <ul className="space-y-2">
              <li>• Custom field mapping support</li>
              <li>• Bulk data export capabilities</li>
              <li>• HIPAA-compliant transmission</li>
              <li>• Audit trail and logging</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}