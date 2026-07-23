import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { 
  Headphones, 
  Ticket, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  MessageCircle,
  X,
  ChevronRight,
  FileText,
  Loader2
} from 'lucide-react';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

interface TicketResponse {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
  user?: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

const SupportPage = () => {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'medium' });
  const [newResponse, setNewResponse] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('my-tickets');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/support/tickets');
      setTickets(response.data);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketId: string) => {
    try {
      const response = await axiosInstance.get(`/support/tickets/${ticketId}`);
      setResponses(response.data.responses || []);
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
      toast.error('Failed to load ticket details');
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axiosInstance.post('/support/tickets', {
        subject: newTicket.subject,
        description: newTicket.description,
        priority: newTicket.priority.toUpperCase()
      });
      
      toast.success('Support ticket created successfully');
      setNewTicket({ subject: '', description: '', priority: 'medium' });
      setIsDialogOpen(false);
      fetchTickets();
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      toast.error(error.response?.data?.error || 'Failed to create support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const addResponse = async () => {
    if (!newResponse.trim() || !selectedTicket) return;

    setSubmitting(true);
    try {
      await axiosInstance.post(`/support/tickets/${selectedTicket.id}/responses`, {
        message: newResponse
      });
      
      toast.success('Response added successfully');
      setNewResponse('');
      fetchTicketDetails(selectedTicket.id);
      // Refresh tickets list to update status
      fetchTickets();
    } catch (error: any) {
      console.error('Failed to add response:', error);
      toast.error(error.response?.data?.error || 'Failed to add response');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      case 'open': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'open': return <AlertCircle className="h-4 w-4" />;
      default: return <Ticket className="h-4 w-4" />;
    }
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchTicketDetails(ticket.id);
    setActiveTab('ticket-details');
  };

  const handleBackToTickets = () => {
    setSelectedTicket(null);
    setResponses([]);
    setActiveTab('my-tickets');
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-500">Get help with your insurance needs</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              New Support Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Subject</Label>
                <Input 
                  placeholder="Brief description of your issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newTicket.priority} onValueChange={(v) => setNewTicket({ ...newTicket, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - General inquiry</SelectItem>
                    <SelectItem value="medium">Medium - Need assistance</SelectItem>
                    <SelectItem value="high">High - Urgent issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  placeholder="Please provide detailed information about your issue..."
                  rows={5}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                />
              </div>
              <Button onClick={createTicket} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Ticket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Open Tickets</p>
              <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'open').length}</p>
            </div>
            <Ticket className="h-8 w-8 text-yellow-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'in_progress').length}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Resolved</p>
              <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'resolved').length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contact Info</TabsTrigger>
          {selectedTicket && <TabsTrigger value="ticket-details">Ticket Details</TabsTrigger>}
        </TabsList>

        <TabsContent value="my-tickets" className="space-y-4">
          {tickets.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Headphones className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No support tickets yet</p>
                <Button variant="link" onClick={() => setIsDialogOpen(true)} className="mt-2">
                  Create your first ticket →
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div 
                  key={ticket.id}
                  className="bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewTicket(ticket)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(ticket.status)}
                      <div>
                        <p className="font-medium">{ticket.subject}</p>
                        <p className="text-sm text-gray-500">Ticket: {ticket.ticket_number}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority?.toUpperCase() || 'MEDIUM'}
                      </Badge>
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status?.replace('_', ' ').toUpperCase() || 'OPEN'}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{ticket.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Created: {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ticket-details">
          {selectedTicket && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>{selectedTicket.subject}</CardTitle>
                    <CardDescription>Ticket #{selectedTicket.ticket_number}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(selectedTicket.priority)}>
                      {selectedTicket.priority?.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {selectedTicket.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={handleBackToTickets}>
                      Back to Tickets
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Original Ticket Description */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Your Message</span>
                    <span className="text-xs text-gray-400">
                      {new Date(selectedTicket.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{selectedTicket.description}</p>
                </div>

                {/* Responses */}
                <div className="space-y-4 mb-6">
                  <h4 className="font-medium">Conversation History</h4>
                  {responses.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No responses yet</p>
                  ) : (
                    responses.map((response) => {
                      const isFromAdmin = response.user?.role !== 'CUSTOMER';
                      return (
                        <div 
                          key={response.id}
                          className={`flex ${isFromAdmin ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-[80%] rounded-lg p-3 ${
                            isFromAdmin ? 'bg-gray-100' : 'bg-blue-600 text-white'
                          }`}>
                            {isFromAdmin && (
                              <p className="text-xs font-medium text-gray-600 mb-1">
                                Awash Support
                              </p>
                            )}
                            <p className="text-sm">{response.message}</p>
                            <p className={`text-xs mt-1 ${isFromAdmin ? 'text-gray-400' : 'text-blue-200'}`}>
                              {new Date(response.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Response */}
                {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Type your response here..."
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      className="flex-1"
                      rows={3}
                    />
                    <Button onClick={addResponse} disabled={submitting || !newResponse.trim()} className="self-end">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}

                {selectedTicket.status === 'resolved' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="text-green-700">This ticket has been resolved.</p>
                    <p className="text-sm text-green-600 mt-1">If you have further questions, please create a new ticket.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Quick answers to common questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">How do I file a claim?</h4>
                <p className="text-sm text-gray-600 mt-1">
                  You can file a claim through your dashboard under the "Claims" section, 
                  or contact our claims department directly at 011-470-3190.
                </p>
              </div>
              <div>
                <h4 className="font-medium">How long does claim processing take?</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Most claims are processed within 5-7 business days after all required documents are submitted.
                </p>
              </div>
              <div>
                <h4 className="font-medium">How can I update my personal information?</h4>
                <p className="text-sm text-gray-600 mt-1">
                  You can update your profile information in the "Profile" section of your dashboard.
                </p>
              </div>
              <div>
                <h4 className="font-medium">What documents are needed for a claim?</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Required documents vary by claim type. Generally, you'll need a completed claim form, 
                  police report (for accidents), and any relevant receipts or estimates.
                </p>
              </div>
              <div>
                <h4 className="font-medium">How do I renew my policy?</h4>
                <p className="text-sm text-gray-600 mt-1">
                  You will receive a renewal notice 30 days before your policy expires. 
                  You can renew online through your dashboard or contact our customer service.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Reach out to our support team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Headphones className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Phone Support</p>
                  <p className="text-sm text-gray-600">011-470-3190 (Monday - Friday, 8:00 AM - 5:00 PM)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-gray-600">support@awashinsurance.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Business Hours</p>
                  <p className="text-sm text-gray-600">Monday - Friday: 8:00 AM - 5:00 PM</p>
                </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-gray-500">For urgent claims outside business hours, please call our 24/7 claims hotline:</p>
                <p className="font-medium text-blue-600 mt-1">+251-911-XXX-XXX</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupportPage;