-- Canonical Workflow Engine + Approval Workbench
-- Intentionally NOT applied to Neon production. This migration is for branch validation only.

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  entity_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id),
  version_no INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_definition_id, version_no)
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id) ON DELETE CASCADE,
  step_key VARCHAR(100) NOT NULL,
  step_order INTEGER NOT NULL,
  name VARCHAR(200) NOT NULL,
  department VARCHAR(100),
  authority_level_code VARCHAR(100),
  approval_mode VARCHAR(20) NOT NULL DEFAULT 'ANY',
  required_approvals INTEGER NOT NULL DEFAULT 1,
  min_amount NUMERIC(18,2),
  max_amount NUMERIC(18,2),
  sla_hours INTEGER,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(workflow_version_id, step_key),
  UNIQUE(workflow_version_id, step_order)
);

CREATE TABLE IF NOT EXISTS workflow_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_level_id UUID NOT NULL REFERENCES role_levels(id),
  entity_type VARCHAR(50) NOT NULL,
  product_code VARCHAR(100),
  max_amount NUMERIC(18,2),
  can_approve BOOLEAN NOT NULL DEFAULT true,
  can_reject BOOLEAN NOT NULL DEFAULT true,
  can_modify BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_level_id, entity_type, product_code)
);

CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_version_id UUID NOT NULL REFERENCES workflow_versions(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  current_step_order INTEGER,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  workflow_step_id UUID NOT NULL REFERENCES workflow_steps(id),
  assignee_user_id UUID,
  authority_level_code VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  due_at TIMESTAMPTZ,
  decision VARCHAR(30),
  decision_comment TEXT,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  workflow_task_id UUID REFERENCES workflow_tasks(id),
  actor_user_id UUID NOT NULL,
  decision VARCHAR(30) NOT NULL,
  comment TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_user_id UUID NOT NULL,
  delegate_user_id UUID NOT NULL,
  entity_type VARCHAR(50),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (delegator_user_id <> delegate_user_id),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  actor_user_id UUID,
  step_order INTEGER,
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_versions_active ON workflow_versions(workflow_definition_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_version_order ON workflow_steps(workflow_version_id, step_order);
CREATE INDEX IF NOT EXISTS idx_workflow_authorities_lookup ON workflow_authorities(entity_type, product_code, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_queue ON workflow_instances(status, entity_type, current_step_order);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_queue ON workflow_tasks(status, authority_level_code, due_at);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_instance ON workflow_tasks(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_decisions_instance ON workflow_decisions(workflow_instance_id, created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_history_instance ON workflow_history(workflow_instance_id, created_at);
