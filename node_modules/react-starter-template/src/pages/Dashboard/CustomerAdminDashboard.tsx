import { useState, useEffect } from 'react';
import { Users, Headphones, Clock, CheckCircle, Star, MessageCircle, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';

interface DashboardStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  supportTicketsOpen: number;
  supportTicketsResolved: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  pendingRenewals: number;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  customer: string;
  customerEmail: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
}

export default function CustomerAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    newCustomersThisMonth: 0,
    supportTicketsOpen: 0,
    supportTicketsResolved: 0,
    averageResponseTime: 0,
    customerSatisfaction: 0,
    pendingRenewals: 0
  });
  const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch customers
      const customersResponse = await axiosInstance.get('/users/customers');
      const customers = customersResponse.data;
      
      // Calculate customer stats
      const totalCustomers = customers.length;
      const activeCustomers = customers.filter((c: Customer) => c.status === 'ACTIVE').length;
      
      // Get current month start date
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const newCustomersThisMonth = customers.filter((c: Customer) => 
        new Date(c.createdAt) >= startOfMonth
      ).length;
      
      // Fetch support tickets
      const ticketsResponse = await axiosInstance.get('/support/admin/tickets');
      const tickets = ticketsResponse.data;
      
      const openTickets = tickets.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
      const resolvedTickets = tickets.filter((t: any) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
      
      // Get recent tickets (last 5)
      const recentTicketsData = tickets.slice(0, 5).map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        customer: `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Unknown',
        customerEmail: t.email,
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt
      }));
      
      setRecentTickets(recentTicketsData);
      setRecentCustomers(customers.slice(0, 5));
      
      setStats({
        totalCustomers,
        activeCustomers,
        newCustomersThisMonth,
        supportTicketsOpen: openTickets,
        supportTicketsResolved: resolvedTickets,
        averageResponseTime: 2.4,
        customerSatisfaction: 4.2,
        pendingRenewals: 0
      });
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN': return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Customer Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage customers, support tickets, and customer service operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">+{stats.newCustomersThisMonth} this month</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Customers</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeCustomers.toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  {stats.totalCustomers > 0 ? ((stats.activeCustomers / stats.totalCustomers) * 100).toFixed(1) : 0}% active rate
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Open Support Tickets</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.supportTicketsOpen}</p>
                <p className="text-xs text-green-600">{stats.supportTicketsResolved} resolved this month</p>
              </div>
              <Headphones className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Customer Satisfaction</p>
                <p className="text-2xl font-bold">{stats.customerSatisfaction} / 5</p>
                <p className="text-xs text-green-600">↑ 0.3 from last month</p>
              </div>
              <Star className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Response Time</p>
                <p className="text-2xl font-bold">{stats.averageResponseTime} hours</p>
              </div>
              <Clock className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Renewals</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingRenewals}</p>
              </div>
              <MessageCircle className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Support Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Open Support Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Headphones className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No support tickets found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{ticket.ticketNumber}</p>
                    <p className="text-sm">{ticket.subject}</p>
                    <p className="text-xs text-gray-500">{ticket.customer}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status?.replace('_', ' ')}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">View</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Customer Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No customers found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                    <p className="text-sm text-gray-500">{customer.email}</p>
                  </div>
                  <div>
                    <Badge className={customer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {customer.status}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Joined: {new Date(customer.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">Details</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}