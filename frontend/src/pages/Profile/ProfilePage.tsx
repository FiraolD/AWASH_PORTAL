import * as React from 'react';
import {
  Plus,
  Edit2,
  Camera
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import axiosInstance from '../../lib/axios';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zip: user?.address?.zip || '',
  });

  const handleSave = () => {
    updateUser({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      address: {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
      }
    });
    setIsEditing(false);
    toast.success('Profile updated successfully!');
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await axiosInstance.post('/v1/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      // Update user avatar in store
      updateUser({ avatarUrl: response.data.avatarUrl });
      toast.success('Avatar updated successfully!');
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast.error('Failed to upload avatar');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="relative h-48 rounded-3xl bg-[#1A3E6F] overflow-hidden shadow-xl">
         <div className="absolute inset-0 bg-black/10" />
         <div className="absolute bottom-6 left-8 flex items-end space-x-6">
            <div className="relative group">
              <div className="h-32 w-32 rounded-3xl bg-white p-1.5 shadow-2xl">
                 <img src={user?.avatarUrl} alt="User Profile" className="h-full w-full rounded-2xl object-cover" />
              </div>
              <button className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-[#E31E24] text-white flex items-center justify-center border-4 border-white shadow-lg hover:scale-110 transition-transform">
                <Camera className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-2 text-white">
               <h1 className="text-3xl font-bold tracking-tight">{user?.firstName} {user?.lastName}</h1>
               <p className="text-sm text-blue-100 opacity-80 uppercase tracking-widest font-medium">{user?.role.replace('_', ' ')}</p>
            </div>
         </div>
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="w-full justify-start bg-transparent border-b border-slate-100 rounded-none p-0 h-auto gap-8">
          <TabsTrigger value="personal" className="rounded-none px-2 py-4 border-b-2 border-transparent data-[state=active]:border-[#1A3E6F] data-[state=active]:bg-transparent shadow-none">Personal Info</TabsTrigger>
          <TabsTrigger value="beneficiaries" className="rounded-none px-2 py-4 border-b-2 border-transparent data-[state=active]:border-[#1A3E6F] data-[state=active]:bg-transparent shadow-none">Beneficiaries</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-8 space-y-6">
           <Card className="border-slate-100 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 px-8 py-6">
                 <div>
                   <CardTitle className="text-lg font-bold text-[#111827]">Contact Details</CardTitle>
                 </div>
                 {!isEditing ? (
                   <Button variant="outline" size="sm" className="border-slate-200 text-xs font-semibold" onClick={() => setIsEditing(true)}>
                     <Edit2 className="mr-2 h-3.5 w-3.5" /> Edit Profile
                   </Button>
                 ) : (
                   <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button className="bg-[#1A3E6F] text-xs px-6" size="sm" onClick={handleSave}>Save Changes</Button>
                   </div>
                 )}
              </CardHeader>
              <CardContent className="p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <Label className="text-[#6B7280] font-semibold text-xs uppercase">First Name</Label>
                          <Input disabled={!isEditing} value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[#6B7280] font-semibold text-xs uppercase">Last Name</Label>
                          <Input disabled={!isEditing} value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} />
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <Label className="text-[#6B7280] font-semibold text-xs uppercase">Email Address</Label>
                          <Input disabled={!isEditing} value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[#6B7280] font-semibold text-xs uppercase">Phone Number</Label>
                          <Input disabled={!isEditing} value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} />
                       </div>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="beneficiaries" className="mt-8 space-y-6">
           <div className="flex justify-between items-center">
             <h3 className="text-xl font-bold text-[#111827]">Manage Beneficiaries</h3>
             <Button className="bg-[#1A3E6F]" size="sm">
               <Plus className="mr-2 h-4 w-4" /> Add New
             </Button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Card key={i} className="relative overflow-hidden group border-slate-100 hover:border-[#1A3E6F]/30 transition-all shadow-sm hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                       <div>
                         <p className="font-bold text-[#111827]">{i === 1 ? 'Jane Doe' : 'Mark Doe'}</p>
                         <p className="text-xs text-[#6B7280] mt-1">{i === 1 ? 'Spouse' : 'Child'}</p>
                       </div>
                       <Badge variant="success" className="px-3 font-bold">
                         {i === 1 ? '70%' : '30%'}
                       </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


