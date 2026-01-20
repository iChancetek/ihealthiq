import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RotateCcw, AlertTriangle, Calendar, User, FileText, Clock } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface RecycleItem {
  id: number;
  originalTable: string;
  originalId: string;
  itemType: string;
  itemTitle: string;
  itemData: any;
  deletedBy: number;
  deletedAt: string;
  canRestore: boolean;
  metadata: any;
}

export default function RecycleArea() {
  const [selectedItem, setSelectedItem] = useState<RecycleItem | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'restore' | 'permanent';
    item: RecycleItem | null;
  }>({
    isOpen: false,
    type: 'restore',
    item: null
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch recycle area items
  const { data: recycleItems = [], isLoading } = useQuery({
    queryKey: ['/api/recycle/items'],
    retry: false,
  });

  // Restore item mutation
  const restoreMutation = useMutation({
    mutationFn: async (recycleId: number) => {
      return await apiRequest(`/api/recycle/restore/${recycleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Item Restored",
        description: data.message || "Item successfully restored to original location",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recycle/items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore item",
        variant: "destructive",
      });
    }
  });

  // Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async (recycleId: number) => {
      return await apiRequest(`/api/recycle/permanent-delete/${recycleId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalConfirmation: true })
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Item Permanently Deleted",
        description: data.message || "Item permanently removed from system",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recycle/items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to permanently delete item",
        variant: "destructive",
      });
    }
  });

  const getItemTypeIcon = (itemType: string) => {
    switch (itemType) {
      case 'patient':
        return <User className="h-4 w-4" />;
      case 'referral':
        return <FileText className="h-4 w-4" />;
      case 'session':
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getItemTypeBadge = (itemType: string) => {
    const colors = {
      patient: 'bg-blue-100 text-blue-800',
      referral: 'bg-green-100 text-green-800',
      session: 'bg-purple-100 text-purple-800',
      default: 'bg-gray-100 text-gray-800'
    };
    
    return colors[itemType as keyof typeof colors] || colors.default;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRestore = (item: RecycleItem) => {
    setConfirmDialog({
      isOpen: true,
      type: 'restore',
      item
    });
  };

  const handlePermanentDelete = (item: RecycleItem) => {
    setConfirmDialog({
      isOpen: true,
      type: 'permanent',
      item
    });
  };

  const handleConfirmAction = () => {
    if (!confirmDialog.item) return;

    if (confirmDialog.type === 'restore') {
      restoreMutation.mutate(confirmDialog.item.id);
    } else {
      permanentDeleteMutation.mutate(confirmDialog.item.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Recycle Area</h1>
        <p className="text-gray-600">
          Safely manage deleted items with recovery options and permanent deletion controls
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recycleItems.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Restorable</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recycleItems.filter((item: RecycleItem) => item.canRestore).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HIPAA Compliant</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">✓</div>
          </CardContent>
        </Card>
      </div>

      {/* Items List */}
      {recycleItems.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-gray-500">Recycle Area is Empty</CardTitle>
            <CardDescription className="text-center">
              No deleted items to display. When items are deleted, they will appear here with recovery options.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {recycleItems.map((item: RecycleItem) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getItemTypeIcon(item.itemType)}
                    <div>
                      <CardTitle className="text-lg">{item.itemTitle}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge className={getItemTypeBadge(item.itemType)}>
                          {item.itemType}
                        </Badge>
                        <span className="text-sm text-gray-500">ID: {item.originalId}</span>
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {item.canRestore && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(item)}
                        disabled={restoreMutation.isPending}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePermanentDelete(item)}
                      disabled={permanentDeleteMutation.isPending}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Forever
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Deleted:</span>
                    <div className="flex items-center gap-1 text-gray-600 mt-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.deletedAt)}
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Table:</span>
                    <div className="text-gray-600 mt-1">{item.originalTable}</div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <div className="mt-1">
                      {item.canRestore ? (
                        <Badge className="bg-green-100 text-green-800">Restorable</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">View Only</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Reason:</span>
                    <div className="text-gray-600 mt-1">
                      {item.metadata?.deletionReason || 'No reason provided'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={handleConfirmAction}
        title={
          confirmDialog.type === 'restore'
            ? 'Restore Item'
            : 'Permanently Delete Item'
        }
        description={
          confirmDialog.type === 'restore'
            ? 'Are you sure you want to restore this item to its original location?'
            : 'Are you sure you want to permanently delete this item? This action cannot be undone.'
        }
        confirmText={
          confirmDialog.type === 'restore' ? 'Restore' : 'Delete Forever'
        }
        type={confirmDialog.type}
        itemName={confirmDialog.item?.itemTitle}
      />
    </div>
  );
}