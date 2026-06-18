import * as React from 'react';
import { Settings, Globe, Bell, Shield, Database, Mail, Phone, Lock, Save, RefreshCw, AlertCircle, Download, HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { useAuthStore } from '../../stores/authStore';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface SystemSettings {
  companyName: string;
  companyEmail: string;
  supportEmail: string;
  supportPhone: string;
  claimsEmail: string;
  vatRate: number;
  drrRate: number;
  timezone: string;
  dateFormat: string;
  currency: string;
  enableOnlinePayments: boolean;
  enableChatSupport: boolean;
  maintenanceMode: boolean;
  emailNotifications: boolean;
  smsAlerts: boolean;
  claimUpdates: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
  maxLoginAttempts: number;
}

interface BackupSettings {
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  backupRetention: number;
  lastBackup: string | null;
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    companyName: 'Awash Insurance SC',
    companyEmail: 'info@awashinsurance.com',
    supportEmail: 'support@awashinsurance.com',
    supportPhone: '+251-11-551-0000',
    claimsEmail: 'claims@awashinsurance.com',
    vatRate: 0.15,
    drrRate: 0.01,
    timezone: 'Africa/Addis_Ababa',
    dateFormat: 'DD/MM/YYYY',
    currency: 'ETB',
    enableOnlinePayments: true,
    enableChatSupport: true,
    maintenanceMode: false,
    emailNotifications: true,
    smsAlerts: false,
    claimUpdates: true,
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    maxLoginAttempts: 5,
  });
  
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    autoBackupEnabled: false,
    backupFrequency: 'daily',
    backupTime: '00:00',
    backupRetention: 30,
    lastBackup: null
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [maintenanceRunning, setMaintenanceRunning] = useState(false);
  const { token } = useAuthStore();

  const getAuthHeaders = () => {
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = token;
    if (!authToken && stored) {
      try {
        const parsed = JSON.parse(stored);
        authToken = parsed.state?.token;
      } catch (e) {}
    }
    return { Authorization: `Bearer ${authToken}` };
  };

  useEffect(() => {
    fetchSettings();
    fetchBackupSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/settings`, {
        headers: getAuthHeaders()
      });
      setSettings(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/backup`, {
        headers: getAuthHeaders()
      });
      setBackupSettings(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error('Failed to fetch backup settings:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/settings`, settings, {
        headers: getAuthHeaders()
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveBackupSettings = async () => {
    try {
      await axios.put(`${API_URL}/settings/backup`, backupSettings, {
        headers: getAuthHeaders()
      });
      toast.success('Backup settings saved successfully');
    } catch (error) {
      console.error('Failed to save backup settings:', error);
      toast.error('Failed to save backup settings');
    }
  };

  const runDatabaseBackup = async () => {
    setBackupRunning(true);
    try {
      await axios.post(`${API_URL}/settings/backup/run`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('Database backup completed successfully');
      fetchBackupSettings();
    } catch (error) {
      console.error('Failed to run backup:', error);
      toast.error('Failed to run database backup');
    } finally {
      setBackupRunning(false);
    }
  };

  const runMaintenance = async () => {
    setMaintenanceRunning(true);
    try {
      await axios.post(`${API_URL}/settings/maintenance/run`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('Maintenance completed successfully');
    } catch (error) {
      console.error('Failed to run maintenance:', error);
      toast.error('Failed to run maintenance');
    } finally {
      setMaintenanceRunning(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    try {
      await axios.put(`${API_URL}/settings/maintenance`, 
        { maintenanceMode: !settings.maintenanceMode }, 
        { headers: getAuthHeaders() }
      );
      setSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }));
      toast.success(settings.maintenanceMode ? 'Maintenance mode disabled' : 'Maintenance mode enabled');
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
      toast.error('Failed to update maintenance mode');
    }
  };

  const handleInputChange = (field: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleBackupChange = (field: keyof BackupSettings, value: any) => {
    setBackupSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">System Settings</h1>
        <p className="text-gray-500 mt-1">Configure system-wide settings and preferences</p>
      </div>

      {/* Maintenance Mode Warning */}
      {settings.maintenanceMode && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800 font-medium">Maintenance Mode is Active</p>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            The system is currently in maintenance mode. Regular users cannot access the system.
          </p>
        </div>
      )}

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="general" className="flex items-center gap-2">General</TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">Notifications</TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">Security</TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">Database</TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#1A3E6F]" />
                <CardTitle>General Settings</CardTitle>
              </div>
              <CardDescription>Configure basic system information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input 
                    value={settings.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Email</Label>
                  <Input 
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input 
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Claims Email</Label>
                  <Input 
                    type="email"
                    value={settings.claimsEmail}
                    onChange={(e) => handleInputChange('claimsEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support Phone</Label>
                  <Input 
                    value={settings.supportPhone}
                    onChange={(e) => handleInputChange('supportPhone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>System Timezone</Label>
                  <select 
                    className="w-full rounded-lg border border-gray-200 p-2"
                    value={settings.timezone}
                    onChange={(e) => handleInputChange('timezone', e.target.value)}
                  >
                    <option value="Africa/Addis_Ababa">Africa/Addis_Ababa (EAT)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <select 
                    className="w-full rounded-lg border border-gray-200 p-2"
                    value={settings.dateFormat}
                    onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select 
                    className="w-full rounded-lg border border-gray-200 p-2"
                    value={settings.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                  >
                    <option value="ETB">ETB - Ethiopian Birr</option>
                    <option value="USD">USD - US Dollar</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>VAT Rate (%)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={settings.vatRate * 100}
                    onChange={(e) => handleInputChange('vatRate', parseFloat(e.target.value) / 100)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>DRR Rate (%)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={settings.drrRate * 100}
                    onChange={(e) => handleInputChange('drrRate', parseFloat(e.target.value) / 100)}
                  />
                </div>
              </div>
              
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Enable Online Payments</p>
                    <p className="text-xs text-gray-500">Allow customers to pay online</p>
                  </div>
                  <Switch 
                    checked={settings.enableOnlinePayments}
                    onCheckedChange={(val) => handleInputChange('enableOnlinePayments', val)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Enable Chat Support</p>
                    <p className="text-xs text-gray-500">Enable live chat support for customers</p>
                  </div>
                  <Switch 
                    checked={settings.enableChatSupport}
                    onCheckedChange={(val) => handleInputChange('enableChatSupport', val)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-xs text-gray-500">Put system in maintenance mode</p>
                  </div>
                  <Switch 
                    checked={settings.maintenanceMode}
                    onCheckedChange={toggleMaintenanceMode}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#1A3E6F]" />
                <CardTitle>Notification Settings</CardTitle>
              </div>
              <CardDescription>Configure email and push notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-xs text-gray-500">Send email for important updates</p>
                  </div>
                  <Switch 
                    checked={settings.emailNotifications}
                    onCheckedChange={(val) => handleInputChange('emailNotifications', val)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">SMS Alerts</p>
                    <p className="text-xs text-gray-500">Send SMS for critical alerts</p>
                  </div>
                  <Switch 
                    checked={settings.smsAlerts}
                    onCheckedChange={(val) => handleInputChange('smsAlerts', val)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Claim Status Updates</p>
                    <p className="text-xs text-gray-500">Notify users when claim status changes</p>
                  </div>
                  <Switch 
                    checked={settings.claimUpdates}
                    onCheckedChange={(val) => handleInputChange('claimUpdates', val)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#1A3E6F]" />
                <CardTitle>Security Settings</CardTitle>
              </div>
              <CardDescription>Configure security policies and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500">Require 2FA for admin accounts</p>
                  </div>
                  <Switch 
                    checked={settings.twoFactorAuth}
                    onCheckedChange={(val) => handleInputChange('twoFactorAuth', val)}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Session Timeout (minutes)</p>
                    <p className="text-xs text-gray-500">Auto logout after inactivity</p>
                  </div>
                  <Input 
                    type="number" 
                    className="w-24"
                    min="5"
                    max="480"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Password Expiry (days)</p>
                    <p className="text-xs text-gray-500">Force password change after period</p>
                  </div>
                  <Input 
                    type="number" 
                    className="w-24"
                    min="30"
                    max="365"
                    value={settings.passwordExpiry}
                    onChange={(e) => handleInputChange('passwordExpiry', parseInt(e.target.value))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Max Login Attempts</p>
                    <p className="text-xs text-gray-500">Lock account after failed attempts</p>
                  </div>
                  <Input 
                    type="number" 
                    className="w-24"
                    min="3"
                    max="10"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-[#1A3E6F]" />
                <CardTitle>Database Management</CardTitle>
              </div>
              <CardDescription>Manage database backups and maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={runDatabaseBackup}
                  disabled={backupRunning}
                >
                  {backupRunning ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Backup Database
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={runMaintenance}
                  disabled={maintenanceRunning}
                >
                  {maintenanceRunning ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <HardDrive className="mr-2 h-4 w-4" />
                  )}
                  Run Maintenance
                </Button>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Warning:</p>
                    <p className="text-sm text-yellow-700">
                      Database operations can affect system performance. Please ensure you have a backup before proceeding.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-[#1A3E6F]" />
                <CardTitle>Backup Settings</CardTitle>
              </div>
              <CardDescription>Configure automated database backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Auto Backup</p>
                    <p className="text-xs text-gray-500">Enable automatic database backups</p>
                  </div>
                  <Switch 
                    checked={backupSettings.autoBackupEnabled}
                    onCheckedChange={(val) => handleBackupChange('autoBackupEnabled', val)}
                  />
                </div>
                
                {backupSettings.autoBackupEnabled && (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">Backup Frequency</p>
                        <p className="text-xs text-gray-500">How often to run backups</p>
                      </div>
                      <select 
                        className="rounded-lg border border-gray-200 p-2"
                        value={backupSettings.backupFrequency}
                        onChange={(e) => handleBackupChange('backupFrequency', e.target.value as any)}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">Backup Time</p>
                        <p className="text-xs text-gray-500">Time to run backups (24h format)</p>
                      </div>
                      <Input 
                        type="time"
                        className="w-32"
                        value={backupSettings.backupTime}
                        onChange={(e) => handleBackupChange('backupTime', e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">Retention Period (days)</p>
                        <p className="text-xs text-gray-500">How long to keep backups</p>
                      </div>
                      <Input 
                        type="number"
                        className="w-24"
                        min="7"
                        max="365"
                        value={backupSettings.backupRetention}
                        onChange={(e) => handleBackupChange('backupRetention', parseInt(e.target.value))}
                      />
                    </div>
                  </>
                )}
                
                {backupSettings.lastBackup && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Last Backup:</strong> {new Date(backupSettings.lastBackup).toLocaleString()}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end pt-4">
                  <Button onClick={saveBackupSettings} className="bg-[#1A3E6F]">
                    <Save className="mr-2 h-4 w-4" /> Save Backup Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} className="bg-[#1A3E6F]">
          <Save className="mr-2 h-4 w-4" /> Save All Settings
        </Button>
      </div>
    </div>
  );
}