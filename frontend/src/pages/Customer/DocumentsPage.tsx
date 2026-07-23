import * as React from 'react';
import { FileText, Download, Eye, Search, RefreshCw, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Document {
  id: string;
  name: string;
  type: string;
  date: string;
  url: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { token } = useAuthStore();

  React.useEffect(() => {
    fetchDocuments();
  }, []);

  const getAuthHeaders = () => {
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = token;
    if (!authToken && stored) {
      const parsed = JSON.parse(stored);
      authToken = parsed.state?.token;
    }
    return { Authorization: `Bearer ${authToken}` };
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/documents`, {
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

  const getDocumentType = (type: string) => {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('image')) return 'Image';
    return 'Document';
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const policyDocs = documents.filter(d => d.type === 'policy');
  const claimDocs = documents.filter(d => d.type === 'claim');
  const otherDocs = documents.filter(d => d.type !== 'policy' && d.type !== 'claim');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">My Documents</h1>
          <p className="text-gray-500 mt-1">Access your policy documents, receipts, and certificates</p>
        </div>
        <Button onClick={fetchDocuments} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Document Library ({documents.length})</CardTitle>
            <div className="relative w-64"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search documents..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-6"><TabsTrigger value="all">All Documents</TabsTrigger><TabsTrigger value="policy">Policies</TabsTrigger><TabsTrigger value="claim">Claims</TabsTrigger><TabsTrigger value="other">Other</TabsTrigger></TabsList>

            <TabsContent value="all" className="space-y-3">
              {filteredDocuments.length === 0 ? <div className="text-center py-8 text-gray-500">No documents found</div> : filteredDocuments.map((doc) => <DocumentItem key={doc.id} document={doc} type={getDocumentType(doc.type)} />)}
            </TabsContent>
            <TabsContent value="policy" className="space-y-3">
              {policyDocs.length === 0 ? <div className="text-center py-8 text-gray-500">No policy documents</div> : policyDocs.map((doc) => <DocumentItem key={doc.id} document={doc} type={getDocumentType(doc.type)} />)}
            </TabsContent>
            <TabsContent value="claim" className="space-y-3">
              {claimDocs.length === 0 ? <div className="text-center py-8 text-gray-500">No claim documents</div> : claimDocs.map((doc) => <DocumentItem key={doc.id} document={doc} type={getDocumentType(doc.type)} />)}
            </TabsContent>
            <TabsContent value="other" className="space-y-3">
              {otherDocs.length === 0 ? <div className="text-center py-8 text-gray-500">No other documents</div> : otherDocs.map((doc) => <DocumentItem key={doc.id} document={doc} type={getDocumentType(doc.type)} />)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentItem({ document, type }: { document: Document; type: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center"><FileText className="h-6 w-6 text-[#1A3E6F]" /></div>
        <div><p className="font-semibold text-[#111827]">{document.name}</p><div className="flex items-center gap-3 mt-1"><Badge variant="outline" className="text-[10px]">{type}</Badge><span className="text-xs text-gray-500">{new Date(document.date).toLocaleDateString()}</span></div></div>
      </div>
      <div className="flex items-center gap-2"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button></div>
    </div>
  );
}