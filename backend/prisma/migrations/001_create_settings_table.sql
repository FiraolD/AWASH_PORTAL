-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Insert default settings if they don't exist
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('companyName', '"Awash Insurance SC"', 'Company display name'),
    ('companyEmail', '"info@awashinsurance.com"', 'Company contact email'),
    ('supportEmail', '"support@awashinsurance.com"', 'Customer support email address'),
    ('supportPhone', '"+251-11-551-0000"', 'Customer support phone number'),
    ('claimsEmail', '"claims@awashinsurance.com"', 'Claims department email'),
    ('vatRate', '0.15', 'Value Added Tax rate'),
    ('drrRate', '0.01', 'Disability and Rehabilitation Rate'),
    ('currency', '"ETB"', 'System currency'),
    ('dateFormat', '"DD/MM/YYYY"', 'Date display format'),
    ('timezone', '"Africa/Addis_Ababa"', 'System timezone'),
    ('enableOnlinePayments', 'true', 'Enable online payment processing'),
    ('enableChatSupport', 'true', 'Enable live chat support'),
    ('maintenanceMode', 'false', 'Put system in maintenance mode'),
    ('emailNotifications', 'true', 'Enable email notifications'),
    ('smsAlerts', 'false', 'Enable SMS alerts'),
    ('claimUpdates', 'true', 'Send claim status updates'),
    ('twoFactorAuth', 'false', 'Require two-factor authentication'),
    ('sessionTimeout', '30', 'Session timeout in minutes'),
    ('passwordExpiry', '90', 'Password expiry in days'),
    ('maxLoginAttempts', '5', 'Maximum login attempts before lockout')
ON CONFLICT (setting_key) DO NOTHING;