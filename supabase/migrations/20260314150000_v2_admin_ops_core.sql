-- V2 Admin / Ops Core Schema
-- Created: 2026-03-14
-- Description: RBAC, audit log, approval model, and admin read views for action-based operations
-- Reference: docs/v2-plans/06/*

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE v2_admin_action_status_enum AS ENUM (
    'PENDING',
    'SUCCEEDED',
    'FAILED',
    'REJECTED',
    'CANCELED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_admin_approval_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_admin_note_visibility_enum AS ENUM (
    'INTERNAL',
    'CS',
    'FINANCE',
    'SECURITY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.v2_admin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_roles_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_roles_is_active
  ON public.v2_admin_roles(is_active);

CREATE TABLE IF NOT EXISTS public.v2_admin_role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES public.v2_admin_roles(id) ON DELETE CASCADE,
  permission_code VARCHAR(120) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_role_permissions_unique UNIQUE (role_id, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_role_permissions_permission_code
  ON public.v2_admin_role_permissions(permission_code);
CREATE INDEX IF NOT EXISTS idx_v2_admin_role_permissions_is_active
  ON public.v2_admin_role_permissions(is_active);

CREATE TABLE IF NOT EXISTS public.v2_admin_user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.v2_admin_roles(id) ON DELETE CASCADE,
  scope_type VARCHAR(50) NOT NULL DEFAULT 'GLOBAL',
  scope_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_user_roles_status_check CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED'))
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_user_roles_user_id
  ON public.v2_admin_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_v2_admin_user_roles_role_id
  ON public.v2_admin_user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_v2_admin_user_roles_status
  ON public.v2_admin_user_roles(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_admin_user_roles_active_scope
  ON public.v2_admin_user_roles(
    user_id,
    role_id,
    scope_type,
    COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.v2_admin_action_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_key VARCHAR(120) NOT NULL,
  domain VARCHAR(80) NOT NULL,
  resource_type VARCHAR(80),
  resource_id UUID,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email_snapshot VARCHAR(255),
  request_id VARCHAR(120),
  action_status v2_admin_action_status_enum NOT NULL DEFAULT 'PENDING',
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  precheck_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  permission_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  transition_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code VARCHAR(80),
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_action_logs_domain_status
  ON public.v2_admin_action_logs(domain, action_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_action_logs_resource
  ON public.v2_admin_action_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_action_logs_actor
  ON public.v2_admin_action_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_action_logs_request_id
  ON public.v2_admin_action_logs(request_id);

CREATE TABLE IF NOT EXISTS public.v2_admin_state_transition_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_log_id UUID REFERENCES public.v2_admin_action_logs(id) ON DELETE SET NULL,
  domain VARCHAR(80) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id UUID NOT NULL,
  transition_key VARCHAR(120) NOT NULL,
  from_state VARCHAR(120),
  to_state VARCHAR(120),
  reason TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_state_transition_logs_resource
  ON public.v2_admin_state_transition_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_state_transition_logs_action_log_id
  ON public.v2_admin_state_transition_logs(action_log_id);

CREATE TABLE IF NOT EXISTS public.v2_admin_approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_log_id UUID NOT NULL REFERENCES public.v2_admin_action_logs(id) ON DELETE CASCADE,
  domain VARCHAR(80) NOT NULL,
  action_key VARCHAR(120) NOT NULL,
  requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_role_code VARCHAR(80),
  status v2_admin_approval_status_enum NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_approval_requests_action_log_unique UNIQUE (action_log_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_approval_requests_status_requested_at
  ON public.v2_admin_approval_requests(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_approval_requests_assignee_role_code
  ON public.v2_admin_approval_requests(assignee_role_code);

CREATE TABLE IF NOT EXISTS public.v2_admin_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain VARCHAR(80) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id UUID NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note_type VARCHAR(80) NOT NULL DEFAULT 'GENERAL',
  visibility v2_admin_note_visibility_enum NOT NULL DEFAULT 'INTERNAL',
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_notes_body_not_empty CHECK (length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_notes_resource
  ON public.v2_admin_notes(resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_notes_domain
  ON public.v2_admin_notes(domain, created_at DESC);

-- =====================================================
-- 3. READ MODELS (VIEWS)
-- =====================================================

CREATE OR REPLACE VIEW public.v2_admin_order_queue_view AS
SELECT
  o.id AS order_id,
  o.order_no,
  o.sales_channel_id,
  o.order_status,
  o.payment_status,
  o.fulfillment_status,
  o.grand_total,
  o.placed_at,
  o.created_at,
  COUNT(DISTINCT fg.id) AS fulfillment_group_count,
  COUNT(DISTINCT sh.id) FILTER (
    WHERE sh.status IN ('READY_TO_PACK', 'PACKING', 'SHIPPED', 'IN_TRANSIT')
  ) AS active_shipment_count,
  COUNT(DISTINCT de.id) FILTER (
    WHERE de.status IN ('PENDING', 'GRANTED')
  ) AS active_entitlement_count
FROM public.v2_orders o
LEFT JOIN public.v2_fulfillment_groups fg
  ON fg.order_id = o.id
LEFT JOIN public.v2_fulfillments f
  ON f.fulfillment_group_id = fg.id
LEFT JOIN public.v2_shipments sh
  ON sh.fulfillment_id = f.id
LEFT JOIN public.v2_digital_entitlements de
  ON de.order_id = o.id
GROUP BY o.id;

CREATE OR REPLACE VIEW public.v2_admin_fulfillment_queue_view AS
SELECT
  fg.id AS fulfillment_group_id,
  fg.order_id,
  fg.kind AS fulfillment_kind,
  fg.status AS fulfillment_group_status,
  f.id AS fulfillment_id,
  f.status AS fulfillment_status,
  sh.id AS shipment_id,
  sh.status AS shipment_status,
  COALESCE(
    SUM(
      CASE WHEN r.status = 'ACTIVE' THEN r.quantity ELSE 0 END
    ),
    0
  ) AS active_reserved_quantity,
  COUNT(DISTINCT de.id) FILTER (
    WHERE de.status IN ('PENDING', 'GRANTED')
  ) AS active_entitlement_count,
  GREATEST(
    fg.updated_at,
    COALESCE(f.updated_at, fg.updated_at),
    COALESCE(sh.updated_at, fg.updated_at)
  ) AS updated_at
FROM public.v2_fulfillment_groups fg
LEFT JOIN public.v2_fulfillments f
  ON f.fulfillment_group_id = fg.id
LEFT JOIN public.v2_shipments sh
  ON sh.fulfillment_id = f.id
LEFT JOIN public.v2_inventory_reservations r
  ON r.fulfillment_group_id = fg.id
LEFT JOIN public.v2_digital_entitlements de
  ON de.fulfillment_id = f.id
GROUP BY
  fg.id,
  fg.order_id,
  fg.kind,
  fg.status,
  f.id,
  f.status,
  sh.id,
  sh.status,
  fg.updated_at,
  f.updated_at,
  sh.updated_at;

CREATE OR REPLACE VIEW public.v2_admin_inventory_health_view AS
SELECT
  l.id AS inventory_level_id,
  l.variant_id,
  l.location_id,
  l.on_hand_quantity,
  l.reserved_quantity,
  l.available_quantity,
  l.safety_stock_quantity,
  COALESCE(
    SUM(
      CASE WHEN r.status = 'ACTIVE' THEN r.quantity ELSE 0 END
    ),
    0
  ) AS active_reservation_quantity,
  l.reserved_quantity - COALESCE(
    SUM(
      CASE WHEN r.status = 'ACTIVE' THEN r.quantity ELSE 0 END
    ),
    0
  ) AS reservation_delta,
  l.updated_at
FROM public.v2_inventory_levels l
LEFT JOIN public.v2_inventory_reservations r
  ON r.variant_id = l.variant_id
 AND r.location_id = l.location_id
GROUP BY
  l.id,
  l.variant_id,
  l.location_id,
  l.on_hand_quantity,
  l.reserved_quantity,
  l.available_quantity,
  l.safety_stock_quantity,
  l.updated_at;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_v2_admin_roles_updated_at ON public.v2_admin_roles;
CREATE TRIGGER update_v2_admin_roles_updated_at
  BEFORE UPDATE ON public.v2_admin_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_admin_role_permissions_updated_at ON public.v2_admin_role_permissions;
CREATE TRIGGER update_v2_admin_role_permissions_updated_at
  BEFORE UPDATE ON public.v2_admin_role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_admin_user_roles_updated_at ON public.v2_admin_user_roles;
CREATE TRIGGER update_v2_admin_user_roles_updated_at
  BEFORE UPDATE ON public.v2_admin_user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_admin_action_logs_updated_at ON public.v2_admin_action_logs;
CREATE TRIGGER update_v2_admin_action_logs_updated_at
  BEFORE UPDATE ON public.v2_admin_action_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_admin_approval_requests_updated_at ON public.v2_admin_approval_requests;
CREATE TRIGGER update_v2_admin_approval_requests_updated_at
  BEFORE UPDATE ON public.v2_admin_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_admin_notes_updated_at ON public.v2_admin_notes;
CREATE TRIGGER update_v2_admin_notes_updated_at
  BEFORE UPDATE ON public.v2_admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. SEED BASE ROLES / PERMISSIONS
-- =====================================================

INSERT INTO public.v2_admin_roles (code, name, description, is_system, is_active)
VALUES
  ('SUPER_ADMIN', 'Super Admin', 'All admin actions and approvals', true, true),
  ('OPS_MANAGER', 'Ops Manager', 'Operational fulfillment and inventory actions', true, true),
  ('CS_AGENT', 'CS Agent', 'Customer support actions with limited authority', true, true),
  ('FINANCE_MANAGER', 'Finance Manager', 'Refund and finance approvals', true, true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  is_active = EXCLUDED.is_active;

WITH permission_rows AS (
  SELECT 'SUPER_ADMIN'::text AS role_code, unnest(ARRAY[
    'ADMIN_ACTION_EXECUTE',
    'ADMIN_ACTION_APPROVE',
    'ORDER_REFUND_APPROVE',
    'FULFILLMENT_EXECUTE',
    'INVENTORY_ADJUST',
    'ENTITLEMENT_REISSUE',
    'AUDIT_READ',
    'RBAC_MANAGE'
  ]) AS permission_code
  UNION ALL
  SELECT 'OPS_MANAGER', unnest(ARRAY[
    'ADMIN_ACTION_EXECUTE',
    'FULFILLMENT_EXECUTE',
    'INVENTORY_ADJUST',
    'ENTITLEMENT_REISSUE',
    'AUDIT_READ'
  ])
  UNION ALL
  SELECT 'CS_AGENT', unnest(ARRAY[
    'ADMIN_ACTION_EXECUTE',
    'ENTITLEMENT_REISSUE',
    'AUDIT_READ'
  ])
  UNION ALL
  SELECT 'FINANCE_MANAGER', unnest(ARRAY[
    'ADMIN_ACTION_APPROVE',
    'ORDER_REFUND_APPROVE',
    'AUDIT_READ'
  ])
)
INSERT INTO public.v2_admin_role_permissions (
  role_id,
  permission_code,
  description,
  is_active
)
SELECT
  r.id,
  p.permission_code,
  CONCAT('seed:', p.role_code, ':', p.permission_code),
  true
FROM permission_rows p
JOIN public.v2_admin_roles r
  ON r.code = p.role_code
ON CONFLICT (role_id, permission_code) DO UPDATE
SET
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- =====================================================
-- 6. COMMENTS
-- =====================================================

COMMENT ON TABLE public.v2_admin_roles IS 'Admin roles for v2 action-based operation model';
COMMENT ON TABLE public.v2_admin_role_permissions IS 'Role-to-permission mapping for admin actions';
COMMENT ON TABLE public.v2_admin_user_roles IS 'Assigned admin roles to workspace users';
COMMENT ON TABLE public.v2_admin_action_logs IS 'Action executor lifecycle logs (precheck/permission/transition/execute)';
COMMENT ON TABLE public.v2_admin_state_transition_logs IS 'State transition audit logs linked to action logs';
COMMENT ON TABLE public.v2_admin_approval_requests IS 'Approval workflow records for sensitive actions';
COMMENT ON TABLE public.v2_admin_notes IS 'Generic admin notes attached to domain resources';
COMMENT ON VIEW public.v2_admin_order_queue_view IS 'Admin read model for mixed order queue monitoring';
COMMENT ON VIEW public.v2_admin_fulfillment_queue_view IS 'Admin read model for fulfillment execution queue';
COMMENT ON VIEW public.v2_admin_inventory_health_view IS 'Admin read model for inventory reservation mismatch and low-stock checks';
