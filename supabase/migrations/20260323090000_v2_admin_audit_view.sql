-- V2 Admin Unified Audit View
-- Created: 2026-03-23
-- Description: Unified read model to inspect legacy/v2 operational audit events in one place

CREATE OR REPLACE VIEW public.v2_admin_audit_view AS
SELECT
  l.id AS audit_id,
  'logs'::text AS source_table,
  'LEGACY_EVENT'::text AS source_kind,
  COALESCE(l.created_at, NOW()) AS occurred_at,
  l.created_at,
  UPPER(COALESCE(NULLIF(l.event_category, ''), 'LEGACY')) AS domain,
  l.event_type,
  NULL::text AS status,
  UPPER(COALESCE(NULLIF(l.severity, ''), 'INFO')) AS severity,
  l.resource_type,
  l.resource_id,
  COALESCE(l.admin_id, l.user_id) AS actor_id,
  COALESCE(admin_profile.email, user_profile.email) AS actor_email,
  CASE
    WHEN COALESCE(l.resource_type, '') ILIKE 'order' THEN l.resource_id
    ELSE NULL
  END AS order_id,
  NULL::uuid AS action_log_id,
  l.message,
  COALESCE(l.metadata, '{}'::jsonb) ||
    jsonb_build_object(
      'ip_address', l.ip_address::text,
      'request_path', l.request_path,
      'user_agent', l.user_agent,
      'changes', l.changes
    ) AS metadata
FROM public.logs l
LEFT JOIN public.profiles user_profile
  ON user_profile.id = l.user_id
LEFT JOIN public.profiles admin_profile
  ON admin_profile.id = l.admin_id

UNION ALL

SELECT
  al.id AS audit_id,
  'v2_admin_action_logs'::text AS source_table,
  'V2_ADMIN_ACTION'::text AS source_kind,
  COALESCE(al.finished_at, al.started_at, al.created_at) AS occurred_at,
  al.created_at,
  UPPER(al.domain) AS domain,
  al.action_key AS event_type,
  al.action_status::text AS status,
  CASE
    WHEN al.action_status IN ('FAILED', 'REJECTED', 'CANCELED') THEN 'ERROR'
    WHEN al.action_status = 'PENDING' THEN 'WARNING'
    ELSE 'INFO'
  END AS severity,
  al.resource_type,
  al.resource_id,
  al.actor_id,
  al.actor_email_snapshot AS actor_email,
  CASE
    WHEN COALESCE(al.resource_type, '') ILIKE 'order' THEN al.resource_id
    ELSE NULL
  END AS order_id,
  al.id AS action_log_id,
  COALESCE(
    al.error_message,
    CONCAT('action ', al.action_key, ' ', al.action_status::text)
  ) AS message,
  COALESCE(al.metadata, '{}'::jsonb) ||
    jsonb_build_object(
      'request_id', al.request_id,
      'requires_approval', al.requires_approval,
      'error_code', al.error_code,
      'input_payload', al.input_payload,
      'precheck_result', al.precheck_result,
      'permission_result', al.permission_result,
      'transition_result', al.transition_result,
      'execution_result', al.execution_result
    ) AS metadata
FROM public.v2_admin_action_logs al

UNION ALL

SELECT
  st.id AS audit_id,
  'v2_admin_state_transition_logs'::text AS source_table,
  'V2_STATE_TRANSITION'::text AS source_kind,
  st.created_at AS occurred_at,
  st.created_at,
  UPPER(st.domain) AS domain,
  st.transition_key AS event_type,
  NULL::text AS status,
  'INFO'::text AS severity,
  st.resource_type,
  st.resource_id,
  st.actor_id,
  NULL::text AS actor_email,
  CASE
    WHEN COALESCE(st.resource_type, '') ILIKE 'order' THEN st.resource_id
    ELSE NULL
  END AS order_id,
  st.action_log_id,
  COALESCE(
    st.reason,
    CONCAT(
      'transition ',
      st.transition_key,
      ' ',
      COALESCE(st.from_state, '-'),
      ' -> ',
      COALESCE(st.to_state, '-')
    )
  ) AS message,
  COALESCE(st.payload, '{}'::jsonb) ||
    jsonb_build_object(
      'from_state', st.from_state,
      'to_state', st.to_state,
      'reason', st.reason,
      'action_log_id', st.action_log_id
    ) AS metadata
FROM public.v2_admin_state_transition_logs st

UNION ALL

SELECT
  ar.id AS audit_id,
  'v2_admin_approval_requests'::text AS source_table,
  'V2_APPROVAL'::text AS source_kind,
  COALESCE(ar.decided_at, ar.requested_at, ar.created_at) AS occurred_at,
  ar.created_at,
  UPPER(ar.domain) AS domain,
  ar.action_key AS event_type,
  ar.status::text AS status,
  CASE
    WHEN ar.status = 'REJECTED' THEN 'ERROR'
    WHEN ar.status = 'PENDING' THEN 'WARNING'
    ELSE 'INFO'
  END AS severity,
  al.resource_type,
  al.resource_id,
  COALESCE(ar.approver_id, ar.requester_id) AS actor_id,
  NULL::text AS actor_email,
  CASE
    WHEN COALESCE(al.resource_type, '') ILIKE 'order' THEN al.resource_id
    ELSE NULL
  END AS order_id,
  ar.action_log_id,
  CONCAT('approval ', ar.status::text, ' ', ar.action_key) AS message,
  COALESCE(ar.metadata, '{}'::jsonb) ||
    jsonb_build_object(
      'assignee_role_code', ar.assignee_role_code,
      'decision_note', ar.decision_note,
      'requester_id', ar.requester_id,
      'approver_id', ar.approver_id
    ) AS metadata
FROM public.v2_admin_approval_requests ar
LEFT JOIN public.v2_admin_action_logs al
  ON al.id = ar.action_log_id

UNION ALL

SELECT
  n.id AS audit_id,
  'v2_order_notifications'::text AS source_table,
  'V2_ORDER_NOTIFICATION'::text AS source_kind,
  COALESCE(n.sent_at, n.created_at) AS occurred_at,
  n.created_at,
  'ORDER'::text AS domain,
  n.event_type::text AS event_type,
  n.status::text AS status,
  CASE
    WHEN n.status = 'FAILED' THEN 'ERROR'
    WHEN n.status IN ('DISABLED', 'SKIPPED') THEN 'WARNING'
    ELSE 'INFO'
  END AS severity,
  CASE
    WHEN n.shipment_id IS NULL THEN 'ORDER'
    ELSE 'SHIPMENT'
  END AS resource_type,
  COALESCE(n.shipment_id, n.order_id) AS resource_id,
  NULL::uuid AS actor_id,
  NULL::text AS actor_email,
  n.order_id,
  NULL::uuid AS action_log_id,
  COALESCE(
    n.error_message,
    CONCAT(n.provider, ' ', n.event_type::text, ' ', n.status::text)
  ) AS message,
  COALESCE(n.metadata, '{}'::jsonb) ||
    jsonb_build_object(
      'channel', n.channel,
      'provider', n.provider,
      'template_id', n.template_id,
      'provider_request_id', n.provider_request_id,
      'recipient_phone', n.recipient_phone,
      'variables_json', n.variables_json,
      'payload_json', n.payload_json,
      'response_json', n.response_json
    ) AS metadata
FROM public.v2_order_notifications n

UNION ALL

SELECT
  dee.id AS audit_id,
  'v2_digital_entitlement_events'::text AS source_table,
  'V2_ENTITLEMENT_EVENT'::text AS source_kind,
  dee.event_at AS occurred_at,
  dee.created_at,
  'FULFILLMENT'::text AS domain,
  dee.event_type::text AS event_type,
  NULL::text AS status,
  CASE
    WHEN dee.event_type IN ('REVOKED', 'EXPIRED') THEN 'WARNING'
    ELSE 'INFO'
  END AS severity,
  'DIGITAL_ENTITLEMENT'::text AS resource_type,
  dee.entitlement_id AS resource_id,
  dee.actor_id,
  NULL::text AS actor_email,
  de.order_id,
  NULL::uuid AS action_log_id,
  CONCAT('entitlement ', dee.event_type::text) AS message,
  COALESCE(dee.payload, '{}'::jsonb) ||
    jsonb_build_object(
      'actor_type', dee.actor_type,
      'order_item_id', de.order_item_id
    ) AS metadata
FROM public.v2_digital_entitlement_events dee
LEFT JOIN public.v2_digital_entitlements de
  ON de.id = dee.entitlement_id

UNION ALL

SELECT
  fe.id AS audit_id,
  'v2_order_financial_events'::text AS source_table,
  'V2_FINANCIAL_EVENT'::text AS source_kind,
  fe.occurred_at AS occurred_at,
  fe.created_at,
  'FINANCE'::text AS domain,
  fe.event_type::text AS event_type,
  NULL::text AS status,
  CASE
    WHEN fe.event_type = 'CHARGEBACK' THEN 'WARNING'
    ELSE 'INFO'
  END AS severity,
  'ORDER'::text AS resource_type,
  fe.order_id AS resource_id,
  NULL::uuid AS actor_id,
  NULL::text AS actor_email,
  fe.order_id,
  NULL::uuid AS action_log_id,
  CONCAT('financial ', fe.event_type::text, ' ', fe.amount::text, ' ', fe.currency_code) AS message,
  COALESCE(fe.metadata, '{}'::jsonb) ||
    jsonb_build_object(
      'event_key', fe.event_key,
      'payment_id', fe.payment_id,
      'amount', fe.amount,
      'currency_code', fe.currency_code,
      'source', fe.source
    ) AS metadata
FROM public.v2_order_financial_events fe;

COMMENT ON VIEW public.v2_admin_audit_view IS
  'Unified admin audit read model across legacy logs + v2 operation/event tables';
