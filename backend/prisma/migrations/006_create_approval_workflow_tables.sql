-- Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number TEXT UNIQUE NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('POLICY', 'CLAIM', 'PAYMENT')),
    entity_id UUID NOT NULL,
    requested_by UUID REFERENCES users(id),
    current_level UUID REFERENCES role_levels(id),
    status TEXT DEFAULT 'PENDING',
    priority TEXT DEFAULT 'NORMAL',
    approval_metadata JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create approval_history table
CREATE TABLE IF NOT EXISTS approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES users(id),
    approval_level UUID REFERENCES role_levels(id),
    decision TEXT CHECK (decision IN ('APPROVED', 'REJECTED', 'REQUIRES_MODIFICATION')),
    notes TEXT,
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_history_request ON approval_history(request_id);