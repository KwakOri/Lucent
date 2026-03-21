-- V2 Admin Sales Stats Core Schema
-- Created: 2026-03-21
-- Description: settlement-oriented financial event/allocations and admin sales stats read views

DO $$ BEGIN
  CREATE TYPE v2_financial_event_type_enum AS ENUM (
    'CAPTURE',
    'REFUND',
    'CHARGEBACK',
    'FEE',
    'ADJUSTMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.v2_order_financial_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_key VARCHAR(255) NOT NULL,
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.v2_payments(id) ON DELETE SET NULL,
  event_type v2_financial_event_type_enum NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'KRW',
  occurred_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(120) NOT NULL DEFAULT 'PAYMENT_SYNC',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_order_financial_events_event_key_unique UNIQUE (event_key),
  CONSTRAINT v2_order_financial_events_amount_non_negative CHECK (amount >= 0),
  CONSTRAINT v2_order_financial_events_currency_format CHECK (currency_code ~ '^[A-Z]{3}$')
);

CREATE INDEX IF NOT EXISTS idx_v2_order_financial_events_order_type_time
  ON public.v2_order_financial_events(order_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_order_financial_events_payment_id
  ON public.v2_order_financial_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_v2_order_financial_events_occurred_at
  ON public.v2_order_financial_events(occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.v2_order_item_financial_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  financial_event_id UUID NOT NULL REFERENCES public.v2_order_financial_events(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.v2_order_items(id) ON DELETE CASCADE,
  event_type v2_financial_event_type_enum NOT NULL,
  allocated_amount INTEGER NOT NULL DEFAULT 0,
  allocation_policy_version VARCHAR(80) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_order_item_financial_allocations_unique UNIQUE (financial_event_id, order_item_id),
  CONSTRAINT v2_order_item_financial_allocations_amount_non_negative CHECK (allocated_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_order_item_financial_allocations_order_id
  ON public.v2_order_item_financial_allocations(order_id);
CREATE INDEX IF NOT EXISTS idx_v2_order_item_financial_allocations_order_item_id
  ON public.v2_order_item_financial_allocations(order_item_id);
CREATE INDEX IF NOT EXISTS idx_v2_order_item_financial_allocations_event_type
  ON public.v2_order_item_financial_allocations(event_type);

CREATE OR REPLACE VIEW public.v2_admin_sales_item_facts_view AS
SELECT
  oi.id AS order_item_id,
  oi.order_id,
  o.order_no,
  o.sales_channel_id,
  o.order_status,
  o.payment_status,
  o.currency_code,
  o.placed_at,
  (o.placed_at AT TIME ZONE 'UTC')::date AS placed_date,
  oi.line_type,
  oi.quantity,
  oi.final_line_total,
  oi.project_id_snapshot,
  oi.project_name_snapshot,
  oi.campaign_id_snapshot,
  oi.campaign_name_snapshot,
  c.campaign_type
FROM public.v2_order_items oi
JOIN public.v2_orders o
  ON o.id = oi.order_id
LEFT JOIN public.v2_campaigns c
  ON c.id = oi.campaign_id_snapshot
WHERE oi.line_type IN ('STANDARD', 'BUNDLE_PARENT');

CREATE OR REPLACE VIEW public.v2_admin_financial_allocation_facts_view AS
SELECT
  a.id AS allocation_id,
  a.financial_event_id,
  a.order_id,
  a.order_item_id,
  a.event_type,
  a.allocated_amount,
  a.allocation_policy_version,
  fe.event_key,
  fe.payment_id,
  fe.currency_code,
  fe.occurred_at,
  (fe.occurred_at AT TIME ZONE 'UTC')::date AS occurred_date,
  fe.source,
  o.order_no,
  o.sales_channel_id,
  oi.project_id_snapshot,
  oi.project_name_snapshot,
  oi.campaign_id_snapshot,
  oi.campaign_name_snapshot,
  c.campaign_type
FROM public.v2_order_item_financial_allocations a
JOIN public.v2_order_financial_events fe
  ON fe.id = a.financial_event_id
JOIN public.v2_orders o
  ON o.id = a.order_id
JOIN public.v2_order_items oi
  ON oi.id = a.order_item_id
LEFT JOIN public.v2_campaigns c
  ON c.id = oi.campaign_id_snapshot;

DROP TRIGGER IF EXISTS update_v2_order_financial_events_updated_at ON public.v2_order_financial_events;
CREATE TRIGGER update_v2_order_financial_events_updated_at
  BEFORE UPDATE ON public.v2_order_financial_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_order_item_financial_allocations_updated_at ON public.v2_order_item_financial_allocations;
CREATE TRIGGER update_v2_order_item_financial_allocations_updated_at
  BEFORE UPDATE ON public.v2_order_item_financial_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.v2_order_financial_events IS 'Normalized order-level financial events for settlement analytics';
COMMENT ON TABLE public.v2_order_item_financial_allocations IS 'Item-level allocated financial events for project/campaign settlement reporting';
COMMENT ON VIEW public.v2_admin_sales_item_facts_view IS 'Admin sales fact rows (non-component order lines)';
COMMENT ON VIEW public.v2_admin_financial_allocation_facts_view IS 'Admin settlement fact rows allocated to order item/project/campaign';
