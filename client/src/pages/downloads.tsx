import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Calendar, HardDrive, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DownloadItem {
  id: string;
  title: string;
  description: string;
  filename: string;
  downloadUrl: string;
  size: string;
  type: string;
}

export default function Downloads() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  // Fetch available downloads
  const { data: downloads = [], isLoading } = useQuery<DownloadItem[]>({
    queryKey: ['/api/downloads'],
  });

  const handleDownload = async (download: DownloadItem) => {
    try {
      setDownloading(download.id);
      
      // Open download URL in new window/tab
      window.open(download.downloadUrl, '_blank');
      
      toast({
        title: "Download Started",
        description: `${download.filename} download has been initiated.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = (download: DownloadItem) => {
    // Open file in new tab for preview
    window.open(download.downloadUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Download className="h-8 w-8 text-blue-600" />
            Documentation Downloads
          </h1>
          <p className="text-gray-600 mt-2">Loading available documentation...</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Download className="h-8 w-8 text-blue-600" />
          Documentation Downloads
        </h1>
        <p className="text-gray-600 mt-2">
          Access comprehensive documentation and reports for the iSynera AI Healthcare Platform
        </p>
      </div>

      {downloads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Downloads Available</h3>
            <p className="text-gray-500 text-center">
              Documentation files will appear here when they become available.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {downloads.map((download) => (
            <Card key={download.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      {download.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {download.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* File Details */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-4 w-4" />
                      <span>{download.size}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {download.type.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span>Generated: June 26, 2025</span>
                    </div>
                    <div className="truncate">
                      <strong>Filename:</strong> {download.filename}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleDownload(download)}
                      disabled={downloading === download.id}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloading === download.id ? 'Downloading...' : 'Download'}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handlePreview(download)}
                      className="px-3"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Additional Information */}
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documentation Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Development Report:</strong> Comprehensive overview of all new modules and changes implemented in the last two days, including technical specifications and feature details.
              </div>
              <div>
                <strong>Platform Documentation:</strong> Complete technical documentation explaining how each feature works, including implementation guides, API documentation, and usage instructions.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">File Formats & Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Markdown (.md):</strong> Documentation files in Markdown format, readable with any text editor or Markdown viewer. Can be converted to PDF or HTML as needed.
              </div>
              <div>
                <strong>Compatibility:</strong> Files are compatible with GitHub, GitLab, documentation platforms, and can be easily shared with development teams.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}