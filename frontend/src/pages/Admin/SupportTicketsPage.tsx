import * as React from 'react';
import { Ticket, Search, RefreshCw, MessageCircle, CheckCircle, Clock, AlertCircle, XCircle, Send, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  responseCount: number;
}

interface TicketDetail extends Ticket {
  responses: Response[];
}

interface Response {
  id: string;
  message: string;
  isFromAdmin: boolean;
  createdAt: string;
  userName: string;
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = React.useState<TicketDetail | null>(null);
  const [replyMessage, setReplyMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [isReplyDialogOpen, setIsReplyDialogOpen] = React.useState(false);
  const { token } = useAuthStore();

  React.useEffect(() => {
    fetchTickets();
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

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/support/tickets`, {
        headers: getAuthHeaders()
      });
      setTickets(response.data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetail = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/support/tickets/${id}`, {
        headers: getAuthHeaders()
      });
      setSelectedTicket(response.data);
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
      toast.error('Failed to load ticket details');
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    
    try {
      await axios.post(`${API_URL}/support/tickets/${selectedTicket.id}/responses`,
        { message: replyMessage },
        { headers: getAuthHeaders() }
      );
      toast.success('Reply sent successfully');
      setReplyMessage('');
      setIsReplyDialogOpen(false);
      fetchTicketDetail(selectedTicket.id);
      fetchTickets();
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast.error('Failed to send reply');
    }
  };

  const updateTicketStatus = async (id: string, status: string) => {
    try {
      await axios.patch(`${API_URL}/support/tickets/${id}/status`,
        { status },
        { headers: getAuthHeaders() }
      );
      toast.success(`Ticket ${status.toLowerCase()}`);
      fetchTickets();
      if (selectedTicket?.id === id) {
        fetchTicketDetail(id);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleTicketClick = async (ticket: Ticket) => {
    await fetchTicketDetail(ticket.id);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'OPEN': return <Badge className="bg-red-100 text-red-800">OPEN</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-blue-100 text-blue-800">IN_PROGRESS</Badge>;
      case 'RESOLVED': return <Badge className="bg-green-100 text-green-800">RESOLVED</Badge>;
      case 'CLOSED': return <Badge className="bg-gray-100 text-gray-800">CLOSED</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case 'high': return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      default: return <Badge className="bg-blue-100 text-blue-800">Low</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Support Tickets</h1>
          <p className="text-gray-500 mt-1">Manage customer support requests</p>
        </div>
        <Button onClick={fetchTickets} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <CardTitle>All Tickets ({filteredTickets.length})</CardTitle>
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Search tickets..." 
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select 
                    className="border rounded-lg px-3 py-2 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="open">OPEN</option>
                    <option value="in_progress">IN_PROGRESS</option>
                    <option value="resolved">RESOLVED</option>
                    <option value="closed">CLOSED</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTickets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No tickets found</div>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => handleTicketClick(ticket)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedTicket?.id === ticket.id 
                          ? 'border-[#1A3E6F] bg-[#1A3E6F]/5' 
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-[#111827]">{ticket.subject}</p>
                          <p className="text-xs text-gray-500 mt-1">#{ticket.ticketNumber} • {ticket.customerName}</p>
                        </div>
                        <div className="flex gap-2">
                          {getPriorityBadge(ticket.priority)}
                          {getStatusBadge(ticket.status)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
                        <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        <span>Responses: {ticket.responseCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ticket Details */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>
                {selectedTicket ? `Ticket #${selectedTicket.ticketNumber}` : 'Ticket Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTicket ? (
                <div className="space-y-6">
                  {/* Customer Info */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-[#111827]">Customer Information</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-500">Name:</span> {selectedTicket.customerName}</p>
                      <p><span className="text-gray-500">Email:</span> {selectedTicket.customerEmail}</p>
                      <p><span className="text-gray-500">Phone:</span> {selectedTicket.customerPhone || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Ticket Info */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-[#111827]">Ticket Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Subject:</span>
                        <span className="text-sm font-medium">{selectedTicket.subject}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Status:</span>
                        {getStatusBadge(selectedTicket.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Priority:</span>
                        {getPriorityBadge(selectedTicket.priority)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Created:</span>
                        <span className="text-sm">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-[#111827]">Description</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedTicket.description}</p>
                  </div>

                  {/* Update Status */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-[#111827]">Update Status</h3>
                    <select 
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm"
                      value={selectedTicket.status}
                      onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In_Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  {/* Send Reply Button */}
                  <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-[#1A3E6F]">
                        <MessageCircle className="mr-2 h-4 w-4" /> Send Reply
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reply to Customer</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Type your reply here..."
                          rows={5}
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                        />
                        <Button onClick={handleSendReply} className="w-full bg-[#1A3E6F]">
                          <Send className="mr-2 h-4 w-4" /> Send Reply
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Select a ticket to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}