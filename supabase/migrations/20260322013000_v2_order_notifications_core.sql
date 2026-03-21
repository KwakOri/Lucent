-- V2 Order Notifications Core Schema Migration
-- Created: 2026-03-22
-- Description: Add v2 order notification audit table for Kakao Alimtalk delivery tracking
-- Reference: docs/v2-plans/04/*, docs/v2-plans/06/*

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE v2_order_notification_event_enum AS ENUM (
    'ORDER_PLACED',
    'PAYMENT_CAPTURED',
    'SHIPMENT_DISPATCHED',
    'SHIPMENT_DELIVERED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_order_notification_status_enum AS ENUM (
    'ACCEPTED',
    'FAILED',
    'DISABLED',
    'SKIPPED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.v2_order_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.v2_shipments(id) ON DELETE SET NULL,
  event_type v2_order_notification_event_enum NOT NULL,
  channel VARCHAR(50) NOT NULL DEFAULT 'KAKAO_ALIMTALK',
  provider VARCHAR(50) NOT NULL DEFAULT 'sendon',
  template_id VARCHAR(120),
  recipient_phone VARCHAR(40),
  variables_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status v2_order_notification_status_enum NOT NULL DEFAULT 'SKIPPED',
  provider_request_id VARCHAR(255),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v2_order_notifications_order_id
  ON public.v2_order_notifications(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_order_notifications_shipment_id
  ON public.v2_order_notifications(shipment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_order_notifications_status
  ON public.v2_order_notifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_order_notifications_event_type
  ON public.v2_order_notifications(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_order_notifications_provider_request_id
  ON public.v2_order_notifications(provider_request_id);

DROP TRIGGER IF EXISTS update_v2_order_notifications_updated_at
  ON public.v2_order_notifications;
CREATE TRIGGER update_v2_order_notifications_updated_at
  BEFORE UPDATE ON public.v2_order_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.v2_order_notifications IS
  'Commerce notification delivery audit rows for v2 order lifecycle events';
COMMENT ON COLUMN public.v2_order_notifications.event_type IS
  'Notification trigger event from v2 commerce flow';
COMMENT ON COLUMN public.v2_order_notifications.variables_json IS
  'Template variable snapshot used at send attempt time';
COMMENT ON COLUMN public.v2_order_notifications.payload_json IS
  'Provider payload snapshot used for delivery request';
COMMENT ON COLUMN public.v2_order_notifications.response_json IS
  'Provider response snapshot for accepted/failed/disabled outcomes';
