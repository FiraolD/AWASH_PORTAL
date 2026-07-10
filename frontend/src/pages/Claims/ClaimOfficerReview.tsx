import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, CheckCircle, XCircle, Clock, AlertCircle, DollarSign, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface PendingClaim {
    id: string;
    claimNumber: string;
    status: string;
    incidentDate: string;
    estimatedAmount: number;
    submittedDate: string;
    natureOfLoss: string;
    riskItem: string;
    location: string;
    incidentDescription: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    policyNumber: string;
    type: string;
}

interface ClaimDetail extends PendingClaim {
    witnessName?: string;
    witnessPhone?: string;
    witnessStatement?: string;
    driverFullName?: string;
    driverAge?: number;
    driverOccupation?: string;
    driverLicenseNumber?: string;
    vehicleDamageDetails?: string;
    injuredPersons?: any[];
    roadConditions?: string;
    weatherConditions?: string;
    responsibleParty?: string;
}

export default function ClaimOfficerReview() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [claims, setClaims] = useState<PendingClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClaim, setSelectedClaim] = useState<ClaimDetail | null>(null);
    const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [reviewData, setReviewData] = useState({
        decision: 'UNDER_REVIEW',   // Changed from claimStatus
        approvedAmount: '',
        notes: '',                 // Combined notes field
        // Removed proximateCause, officerRemarks, estimatedLoss
    });

    const getAuthHeaders = () => {
        const stored = localStorage.getItem('awash-auth-storage');
        let authToken = token;
        if (!authToken && stored) {
            const parsed = JSON.parse(stored);
            authToken = parsed.state?.token;
        }
        return { Authorization: `Bearer ${authToken}` };
    };

    const fetchPendingClaims = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/claims/pending-review`, {
                headers: getAuthHeaders()
            });
            setClaims(response.data);
        } catch (error) {
            console.error('Failed to fetch claims:', error);
            toast.error('Failed to load pending claims');
        } finally {
            setLoading(false);
        }
    };

    const fetchClaimDetails = async (id: string) => {
        try {
            const response = await axios.get(`${API_URL}/claims/${id}`, {
                headers: getAuthHeaders()
            });
            setSelectedClaim(response.data);
        } catch (error) {
            console.error('Failed to fetch claim details:', error);
            toast.error('Failed to load claim details');
        }
    };

    const handleReview = async () => {
        if (!selectedClaim) return;

        // Validate required fields
        if (!reviewData.decision) {
            toast.error('Please select a decision');
            return;
        }

        try {
            // Map decision to backend format
            const payload = {
                decision: reviewData.decision, // 'APPROVE', 'REJECT', 'UNDER_REVIEW'
                approvedAmount: reviewData.approvedAmount ? parseFloat(reviewData.approvedAmount) : null,
                notes: reviewData.notes,
            };

            await axios.post(`${API_URL}/claims/${selectedClaim.id}/review`, payload, {
                headers: getAuthHeaders()
            });

            toast.success(`Claim ${reviewData.decision.toLowerCase()}d successfully`);
            setReviewDialogOpen(false);
            setSelectedClaim(null);
            fetchPendingClaims();
        } catch (error: any) {
            console.error('Failed to review claim:', error);
            const errorMsg = error.response?.data?.error || 'Failed to review claim';
            toast.error(errorMsg);
        }
    };

    useEffect(() => {
        fetchPendingClaims();
    }, []);

    const getStatusBadge = (status: string) => {
        switch(status?.toLowerCase()) {
            case 'submitted': return <Badge className="bg-yellow-100 text-yellow-800">Submitted</Badge>;
            case 'under_review': return <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>;
            case 'approved': return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
            case 'rejected': return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A3E6F]" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[#1A3E6F]">Claim Officer Review</h1>
                <p className="text-gray-500">Review and process pending claims</p>
            </div>

            {claims.length === 0 ? (
                <Card><CardContent className="text-center py-12"><CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" /><p>No pending claims to review</p></CardContent></Card>
            ) : (
                <div className="grid gap-4">
                    {claims.map((claim) => (
                        <Card key={claim.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start flex-wrap gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="font-semibold text-lg">{claim.claimNumber}</h3>
                                            {getStatusBadge(claim.status)}
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div><p className="text-gray-500">Customer</p><p className="font-medium">{claim.firstName} {claim.lastName}</p></div>
                                            <div><p className="text-gray-500">Policy</p><p className="font-medium">{claim.policyNumber}</p></div>
                                            <div><p className="text-gray-500">Nature of Loss</p><p className="font-medium">{claim.natureOfLoss}</p></div>
                                            <div><p className="text-gray-500">Incident Date</p><p className="font-medium">{new Date(claim.incidentDate).toLocaleDateString()}</p></div>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2">{claim.incidentDescription}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={async () => { await fetchClaimDetails(claim.id); setReviewDialogOpen(true); }}><Eye className="h-4 w-4 mr-1" /> Review</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Review Dialog */}
            <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Review Claim: {selectedClaim?.claimNumber}</DialogTitle></DialogHeader>
                    {selectedClaim && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold mb-2">Claim Details</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-gray-500">Customer:</span> {selectedClaim.firstName} {selectedClaim.lastName}</div>
                                    <div><span className="text-gray-500">Policy:</span> {selectedClaim.policyNumber}</div>
                                    <div><span className="text-gray-500">Incident Date:</span> {new Date(selectedClaim.incidentDate).toLocaleDateString()}</div>
                                    <div><span className="text-gray-500">Location:</span> {selectedClaim.location}</div>
                                    <div><span className="text-gray-500">Nature of Loss:</span> {selectedClaim.natureOfLoss}</div>
                                    <div><span className="text-gray-500">Risk Item:</span> {selectedClaim.riskItem || 'N/A'}</div>
                                </div>
                                <div className="mt-3"><p className="text-gray-500 text-sm">Description:</p><p className="text-sm">{selectedClaim.incidentDescription}</p></div>
                            </div>

                            {selectedClaim.driverFullName && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-semibold mb-2">Driver Information</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div><span className="text-gray-500">Name:</span> {selectedClaim.driverFullName}</div>
                                        <div><span className="text-gray-500">Age:</span> {selectedClaim.driverAge}</div>
                                        <div><span className="text-gray-500">Occupation:</span> {selectedClaim.driverOccupation}</div>
                                        <div><span className="text-gray-500">License:</span> {selectedClaim.driverLicenseNumber}</div>
                                    </div>
                                </div>
                            )}

                            {selectedClaim.vehicleDamageDetails && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-semibold mb-2">Damage Details</h3>
                                    <p className="text-sm">{selectedClaim.vehicleDamageDetails}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <Label>Decision *</Label>
                                    <select 
                                        className="w-full rounded-lg border p-2" 
                                        value={reviewData.decision} 
                                        onChange={(e) => setReviewData({...reviewData, decision: e.target.value})}
                                    >
                                        <option value="UNDER_REVIEW">Under Review</option>
                                        <option value="APPROVE">Approve</option>
                                        <option value="REJECT">Reject</option>
                                    </select>
                                </div>
                                <div>
                                    <Label>Approved Amount (ETB)</Label>
                                    <Input 
                                        type="number" 
                                        value={reviewData.approvedAmount} 
                                        onChange={(e) => setReviewData({...reviewData, approvedAmount: e.target.value})} 
                                        placeholder="Enter approved amount if applicable" 
                                    />
                                </div>
                                <div>
                                    <Label>Notes</Label>
                                    <Textarea 
                                        value={reviewData.notes} 
                                        onChange={(e) => setReviewData({...reviewData, notes: e.target.value})} 
                                        placeholder="Add your assessment and recommendations..." 
                                        rows={3} 
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button onClick={handleReview} className="flex-1 bg-[#1A3E6F]">Submit Review</Button>
                                    <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}