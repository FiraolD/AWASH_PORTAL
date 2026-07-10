import React, { useEffect, useState } from 'react';
import axios from 'axios'; // â† ADD THIS IMPORT
import { Download, Eye, FileText, Trash2, Upload } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Document {
    id: string;
    documentUrl: string;
    documentType: string;
    fileName: string;
    uploadedAt: string;
    fileSize?: number;
    mimeType?: string;
}

interface PolicyDocumentsProps {
    policyId: string;
    policyNumber?: string;
    open?: boolean;
    onClose?: () => void;
}

export default function PolicyDocuments({ policyId, policyNumber, open = true }: PolicyDocumentsProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore();

    const getAuthHeaders = () => {
        const stored = localStorage.getItem('awash-auth-storage');
        let authToken = token;
        if (!authToken && stored) {
            const parsed = JSON.parse(stored);
            authToken = parsed.state?.token;
        }
        return { Authorization: `Bearer ${authToken}` };
    };

    useEffect(() => {
        fetchDocuments();
    }, [policyId]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/policies/${policyId}/documents`, {
                headers: getAuthHeaders()
            });
            setDocuments(response.data);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDocument = async (documentId: string) => {
        try {
            const url = `${API_URL}/policies/documents/${documentId}/download`;
            // Open in new tab
            window.open(url, '_blank');
        } catch (error) {
            console.error('Failed to view document:', error);
            toast.error('Failed to load document');
        }
    };

    const handleDownloadDocument = async (documentId: string, fileName: string) => {
        try {
            const url = `${API_URL}/policies/documents/${documentId}/download`;
            
            const response = await axios.get(url, {
                headers: getAuthHeaders(),
                responseType: 'blob'
            });
            
            // Create download link
            const blob = new Blob([response.data]);
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName || `policy_document_${documentId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            
            toast.success('Document downloaded successfully');
        } catch (error) {
            console.error('Failed to download document:', error);
            toast.error('Failed to download document');
        }
    };

    const handleDeleteDocument = async (documentId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        
        try {
            await axios.delete(`${API_URL}/policies/documents/${documentId}`, {
                headers: getAuthHeaders()
            });
            toast.success('Document deleted successfully');
            fetchDocuments();
        } catch (error) {
            console.error('Failed to delete document:', error);
            toast.error('Failed to delete document');
        }
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'Unknown size';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };

    if (!open) return null;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading documents...</p>
                </div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Policy Documents
                    {policyNumber && <span className="text-sm text-gray-500">({policyNumber})</span>}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No documents available for this policy</p>
                        <p className="text-sm mt-1">Policy documents will appear here once uploaded</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <FileText className="h-8 w-8 text-[#1A3E6F]" />
                                    <div>
                                        <p className="font-medium text-sm">{doc.fileName || 'Policy Document'}</p>
                                        <p className="text-xs text-gray-500">
                                            {doc.documentType || 'PDF'} â€¢ {formatFileSize(doc.fileSize)} â€¢ 
                                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewDocument(doc.id)}
                                        title="View"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownloadDocument(doc.id, doc.fileName)}
                                        title="Download"
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteDocument(doc.id)}
                                        title="Delete"
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
