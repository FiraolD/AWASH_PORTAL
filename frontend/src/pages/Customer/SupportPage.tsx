import * as React from 'react';
import { MessageCircle, Plus, Search, Clock, CheckCircle, AlertCircle, Send, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/Dialog';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  responseCount: number;
}

interface Message {
  id: string;
  message: string;
  isFromAdmin: boolean;
  createdAt: string;
  userName: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isNewTicketOpen, setIsNewTicketOpen] = React.useState(false);
  const [newTicket, setNewTicket] = React.useState({ subject: '', description: '', priority: 'medium' });
  const [replyMessage, setReplyMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
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

  const fetchTicketMessages = async (ticketId: string) => {
    try {
      const response = await axios.get(`${API_URL}/support/tickets/${ticketId}`, {
        headers: getAuthHeaders()
      });
      setMessages(response.data.responses || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      toast.error('Please fill all fields');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/support/tickets`, newTicket, {
        headers: getAuthHeaders()
      });
      toast.success('Ticket created successfully');
      setIsNewTicketOpen(false);
      setNewTicket({ subject: '', description: '', priority: 'medium' });
      fetchTickets();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/support/tickets/${selectedTicket.id}/responses`,
        { message: replyMessage },
        { headers: getAuthHeaders() }
      );
      toast.success('Reply sent');
      setReplyMessage('');
      fetchTicketMessages(selectedTicket.id);
      fetchTickets();
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const selectTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await fetchTicketMessages(ticket.id);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'OPEN': return <Badge className="bg-red-100 text-red-800">OPEN</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
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
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Support Center</h1>
          <p className="text-gray-500 mt-1">Get help from our support team</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchTickets} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
          <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
            <DialogTrigger asChild><Button className="bg-[#1A3E6F]"><Plus className="mr-2 h-4 w-4" /> New Ticket</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Create New Support Ticket</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Subject" value={newTicket.subject} onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})} /><select className="w-full border rounded-lg p-2" value={newTicket.priority} onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><Textarea rows={5} placeholder="Describe your issue..." value={newTicket.description} onChange={(e) => setNewTicket({...newTicket, description: e.target.value})} /><Button onClick={createTicket} isLoading={submitting} className="w-full bg-[#1A3E6F]">Submit Ticket</Button></div></DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card><CardHeader><CardTitle>My Support Tickets ({tickets.length})</CardTitle></CardHeader><CardContent className="space-y-3">
            {tickets.length === 0 ? <div className="text-center py-8 text-gray-500">No tickets found</div> : tickets.map((ticket) => (
              <div key={ticket.id} onClick={() => selectTicket(ticket)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.id === ticket.id ? 'border-[#1A3E6F] bg-[#1A3E6F]/5' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className="flex justify-between items-start mb-2"><div><p className="font-semibold">{ticket.subject}</p><p className="text-xs text-gray-500 mt-1">#{ticket.ticketNumber}</p></div><div className="flex gap-2">{getPriorityBadge(ticket.priority)}{getStatusBadge(ticket.status)}</div></div>
                <div className="flex justify-between items-center text-xs text-gray-400 mt-2"><span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span><span>Responses: {ticket.responseCount || 0}</span></div>
              </div>
            ))}
          </CardContent></Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full"><CardHeader><CardTitle>{selectedTicket ? `Ticket #${selectedTicket.ticketNumber}` : 'Ticket Details'}</CardTitle></CardHeader><CardContent>
            {selectedTicket ? (
              <div className="space-y-6">
                <div><h3 className="font-semibold mb-2">Subject</h3><p>{selectedTicket.subject}</p></div>
                <div><h3 className="font-semibold mb-2">Status</h3>{getStatusBadge(selectedTicket.status)}</div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {messages.map((msg) => (<div key={msg.id} className={`p-3 rounded-lg ${msg.isFromAdmin ? 'bg-[#1A3E6F]/5 ml-4' : 'bg-gray-50 mr-4'}`}><div className="flex justify-between items-start mb-1"><span className="text-xs font-semibold text-[#1A3E6F]">{msg.userName}</span><span className="text-[10px] text-gray-400">{new Date(msg.createdAt).toLocaleString()}</span></div><p className="text-sm">{msg.message}</p></div>))}
                </div>
                <div className="flex gap-2"><Input placeholder="Type your reply..." value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} /><Button size="icon" className="bg-[#1A3E6F]" onClick={sendReply} disabled={submitting}><Send className="h-4 w-4" /></Button></div>
              </div>
            ) : (<div className="text-center py-12"><MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Select a ticket to view conversation</p></div>)}
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}