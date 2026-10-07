-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('companyName', '"Awash Insurance SC"', 'Company display name'),
    ('vatRate', '0.15', 'Value Added Tax rate'),
    ('drrRate', '0.01', 'Disability and Rehabilitation Rate')
ON CONFLICT (setting_key) DO NOTHING;