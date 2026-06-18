import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, XCircle, Eye, Loader2, Lock } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import axiosInstance from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

interface Endorsement {
  id: string;
  policyNumber: string;
  customerName: string;
  customerEmail: string;
  type: string;
  changes: any;
  reason: string;
  status: string;
  submittedDate: string;
}

export default function EndorsementsPage() {
  const { user } = useAuthStore();
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEndorsement, setSelectedEndorsement] = useState<Endorsement | null>(null);

  const userRole = user?.role?.toUpperCase() || '';
  const canApprove = ['UNDERWRITING_ADMIN', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING', 'SENIOR_UNDERWRITING_OFFICER', 'MASTER_ADMIN'].includes(userRole);

  useEffect(() => {
    fetchEndorsements();
  }, []);

  const fetchEndorsements = async () => {
    setLoading(true);
    try {
      // FIXED: Use the correct underwriting endpoint
      const response = await axiosInstance.get('/underwriting/endorsements');
      console.log('Endorsements:', response.data);
      setEndorsements(response.data);
    } catch (error) {
      console.error('Failed to fetch endorsements:', error);
      toast.error('Failed to load endorsements');
      setEndorsements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!canApprove) {
      toast.error('You do not have permission to approve endorsements');
      return;
    }
    
    try {
      await axiosInstance.post(`/underwriting/endorsements/${id}/approve`, {});
      toast.success('Endorsement approved successfully');
      fetchEndorsements();
      setSelectedEndorsement(null);
    } catch (error) {
      console.error('Failed to approve endorsement:', error);
      toast.error('Failed to approve endorsement');
    }
  };

  const handleReject = async (id: string) => {
    if (!canApprove) {
      toast.error('You do not have permission to reject endorsements');
      return;
    }
    
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      try {
        await axiosInstance.post(`/underwriting/endorsements/${id}/reject`, { reason });
        toast.success('Endorsement rejected');
        fetchEndorsements();
        setSelectedEndorsement(null);
      } catch (error) {
        console.error('Failed to reject endorsement:', error);
        toast.error('Failed to reject endorsement');
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-gray-500">Loading endorsements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Endorsements</h1>
        <p className="text-gray-500 mt-1">Review and approve policy change requests</p>
      </div>

      {endorsements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No pending endorsements</p>
            <p className="text-sm text-gray-400 mt-1">All endorsement requests have been processed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {endorsements.map((endorsement) => (
            <Card key={endorsement.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold">{endorsement.policyNumber}</h3>
                      <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                      {!canApprove && (
                        <Badge className="bg-gray-100 text-gray-500 flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          View Only
                        </Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Customer</p>
                      <p className="font-medium">{endorsement.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Endorsement Type</p>
                      <p className="font-medium">{endorsement.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Changes Requested</p>
                      <p className="text-sm">
                        {typeof endorsement.changes === 'string' 
                          ? endorsement.changes 
                          : JSON.stringify(endorsement.changes || {})}
                      </p>
                    </div>
                    {endorsement.reason && (
                      <div>
                        <p className="text-sm text-gray-500">Reason</p>
                        <p className="text-sm text-gray-600">{endorsement.reason}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedEndorsement(endorsement)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    {canApprove ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(endorsement.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleReject(endorsement.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="text-gray-400"
                      >
                        <Lock className="h-4 w-4 mr-1" />
                        No Approval Rights
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Endorsement Details Modal */}
      <Dialog open={!!selectedEndorsement} onOpenChange={() => setSelectedEndorsement(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Endorsement Details</DialogTitle>
          </DialogHeader>
          
          {selectedEndorsement && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Policy Number</label>
                  <p className="mt-1">{selectedEndorsement.policyNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer</label>
                  <p className="mt-1">{selectedEndorsement.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="mt-1">{selectedEndorsement.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted</label>
                  <p className="mt-1">{new Date(selectedEndorsement.submittedDate).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Changes Requested</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">
                    {typeof selectedEndorsement.changes === 'string' 
                      ? selectedEndorsement.changes 
                      : JSON.stringify(selectedEndorsement.changes, null, 2)}
                  </pre>
                </div>
              </div>
              
              {selectedEndorsement.reason && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Reason</label>
                  <p className="mt-1 text-gray-700">{selectedEndorsement.reason}</p>
                </div>
              )}
              
              {!canApprove && (
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <Lock className="h-5 w-5 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">You have view-only access for endorsements</p>
                  <p className="text-xs text-gray-400">Approval requires Senior Officer or higher role</p>
                </div>
              )}
              
              {canApprove && (
                <div className="flex gap-3 pt-4">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => {
                    handleApprove(selectedEndorsement.id);
                  }}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700" onClick={() => {
                    handleReject(selectedEndorsement.id);
                  }}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}