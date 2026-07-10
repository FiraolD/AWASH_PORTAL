-- Create policy_approvals table
CREATE TABLE IF NOT EXISTS policy_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES policies(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id),
    approver_role TEXT,
    decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'PENDING', 'DIRECT_APPROVED')),
    approval_level INTEGER DEFAULT 1,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    direct_approved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_policy_approvals_policy ON policy_approvals(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_approvals_approver ON policy_approvals(approver_id);