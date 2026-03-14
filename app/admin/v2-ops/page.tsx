'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  useV2AdminActionCatalog,
  useV2AdminActionLogs,
  useV2AdminApprovals,
  useV2AdminDispatchShipment,
  useV2AdminFulfillmentQueue,
  useV2AdminInventoryHealth,
  useV2AdminMyRbac,
  useV2AdminOrderQueue,
  useV2AdminRefundOrder,
  useV2AdminReissueEntitlement,
  useV2AdminRevokeEntitlement,
} from '@/lib/client/hooks/useV2AdminOps';
import type { V2AdminActionStatus } from '@/lib/client/api/v2-admin-ops.api';

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: string;
      response?: { data?: { message?: string } };
    };
    if (maybeError.response?.data?.message) {
      return maybeError.response.data.message;
    }
    if (maybeError.message) {
      return maybeError.message;
    }
  }
  return '요청 처리 중 오류가 발생했습니다.';
}

function resolveActionStatusIntent(status: V2AdminActionStatus) {
  if (status === 'SUCCEEDED') {
    return 'success' as const;
  }
  if (status === 'FAILED' || status === 'REJECTED' || status === 'CANCELED') {
    return 'error' as const;
  }
  if (status === 'PENDING') {
    return 'warning' as const;
  }
  return 'default' as const;
}

export default function V2AdminOpsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [refundOrderId, setRefundOrderId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('manual refund from ops');

  const [dispatchShipmentId, setDispatchShipmentId] = useState('');
  const [reissueEntitlementId, setReissueEntitlementId] = useState('');
  const [revokeEntitlementId, setRevokeEntitlementId] = useState('');
  const [revokeReason, setRevokeReason] = useState('manual revoke from ops');

  const { data: myRbac, isLoading: rbacLoading } = useV2AdminMyRbac();
  const { data: actionCatalog, isLoading: catalogLoading } = useV2AdminActionCatalog();
  const { data: actionLogs, isLoading: logsLoading } = useV2AdminActionLogs({ limit: 20 });
  const { data: approvals, isLoading: approvalsLoading } = useV2AdminApprovals({ limit: 20 });
  const { data: orderQueue, isLoading: orderQueueLoading } = useV2AdminOrderQueue({ limit: 20 });
  const { data: fulfillmentQueue, isLoading: fulfillmentQueueLoading } =
    useV2AdminFulfillmentQueue({ limit: 20 });
  const { data: inventoryHealth, isLoading: inventoryLoading } = useV2AdminInventoryHealth({
    limit: 20,
  });

  const refundOrder = useV2AdminRefundOrder();
  const dispatchShipment = useV2AdminDispatchShipment();
  const reissueEntitlement = useV2AdminReissueEntitlement();
  const revokeEntitlement = useV2AdminRevokeEntitlement();

  const isActionPending =
    refundOrder.isPending ||
    dispatchShipment.isPending ||
    reissueEntitlement.isPending ||
    revokeEntitlement.isPending;

  const queueSummary = useMemo(
    () => ({
      orders: orderQueue?.items?.length ?? 0,
      fulfillment: fulfillmentQueue?.items?.length ?? 0,
      inventoryMismatches: inventoryHealth?.summary?.mismatch_count ?? 0,
      approvals: approvals?.items?.filter((item) => item.status === 'PENDING').length ?? 0,
    }),
    [orderQueue, fulfillmentQueue, inventoryHealth, approvals],
  );

  const clearNotice = () => {
    setMessage(null);
    setErrorMessage(null);
  };

  const runAction = async (task: () => Promise<void>) => {
    clearNotice();
    try {
      await task();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleRefund = async () => {
    const orderId = refundOrderId.trim();
    if (!orderId) {
      setErrorMessage('order_id를 입력해주세요.');
      return;
    }
    const parsedAmount = refundAmount.trim() ? Number(refundAmount.trim()) : undefined;
    if (parsedAmount !== undefined && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      setErrorMessage('refund amount는 1 이상의 숫자여야 합니다.');
      return;
    }

    await runAction(async () => {
      await refundOrder.mutateAsync({
        orderId,
        data: {
          amount: parsedAmount,
          reason: refundReason.trim() || null,
        },
      });
      setMessage('환불 액션을 실행했습니다. Action Log에서 결과를 확인하세요.');
    });
  };

  const handleDispatch = async () => {
    const shipmentId = dispatchShipmentId.trim();
    if (!shipmentId) {
      setErrorMessage('shipment_id를 입력해주세요.');
      return;
    }

    await runAction(async () => {
      await dispatchShipment.mutateAsync({
        shipmentId,
        data: {},
      });
      setMessage('출고 액션을 실행했습니다. Action Log에서 결과를 확인하세요.');
    });
  };

  const handleReissue = async () => {
    const entitlementId = reissueEntitlementId.trim();
    if (!entitlementId) {
      setErrorMessage('entitlement_id를 입력해주세요.');
      return;
    }

    await runAction(async () => {
      await reissueEntitlement.mutateAsync({
        entitlementId,
        data: {},
      });
      setMessage('재발급 액션을 실행했습니다. Action Log에서 결과를 확인하세요.');
    });
  };

  const handleRevoke = async () => {
    const entitlementId = revokeEntitlementId.trim();
    if (!entitlementId) {
      setErrorMessage('entitlement_id를 입력해주세요.');
      return;
    }

    await runAction(async () => {
      await revokeEntitlement.mutateAsync({
        entitlementId,
        data: {
          reason: revokeReason.trim() || null,
        },
      });
      setMessage('회수 액션을 실행했습니다. Action Log에서 결과를 확인하세요.');
    });
  };

  if (rbacLoading || catalogLoading || logsLoading || approvalsLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">V2 Admin / Ops</h1>
        <p className="mt-1 text-sm text-gray-500">
          Action 기반 운영 큐 조회와 고위험 액션 실행 화면입니다.
        </p>
      </div>

      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">내 권한 수</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {myRbac?.permissions?.length ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">주문 큐</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{queueSummary.orders}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Fulfillment 큐</div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">
            {queueSummary.fulfillment}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">승인 대기</div>
          <div className="mt-2 text-2xl font-semibold text-amber-600">
            {queueSummary.approvals}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">Action Catalog</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {(actionCatalog?.screens || []).map((screen) => (
            <div key={screen.screen_key} className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-800">{screen.screen_name}</div>
              <div className="mt-3 space-y-2">
                {screen.actions.map((action) => (
                  <div key={action.action_key} className="rounded-md bg-gray-50 p-3 text-xs">
                    <div className="font-semibold text-gray-900">{action.action_key}</div>
                    <div className="mt-1 text-gray-600">{action.endpoint}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge size="sm">{action.domain}</Badge>
                      {action.requires_approval ? (
                        <Badge intent="warning" size="sm">
                          Approval
                        </Badge>
                      ) : (
                        <Badge intent="success" size="sm">
                          Direct
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">고위험 액션 실행</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-800">Order Refund</div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <Input
                  placeholder="order_id"
                  value={refundOrderId}
                  onChange={(event) => setRefundOrderId(event.target.value)}
                />
                <Input
                  placeholder="amount (optional)"
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                />
                <Textarea
                  placeholder="reason"
                  rows={2}
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                />
                <Button loading={refundOrder.isPending} disabled={isActionPending} onClick={handleRefund}>
                  환불 실행
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-800">Shipment Dispatch</div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <Input
                  placeholder="shipment_id"
                  value={dispatchShipmentId}
                  onChange={(event) => setDispatchShipmentId(event.target.value)}
                />
                <Button
                  loading={dispatchShipment.isPending}
                  disabled={isActionPending}
                  onClick={handleDispatch}
                >
                  출고 실행
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-semibold text-gray-800">Entitlement Reissue / Revoke</div>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <Input
                  placeholder="entitlement_id (for reissue)"
                  value={reissueEntitlementId}
                  onChange={(event) => setReissueEntitlementId(event.target.value)}
                />
                <Button
                  loading={reissueEntitlement.isPending}
                  disabled={isActionPending}
                  onClick={handleReissue}
                >
                  재발급 실행
                </Button>
                <Input
                  placeholder="entitlement_id (for revoke)"
                  value={revokeEntitlementId}
                  onChange={(event) => setRevokeEntitlementId(event.target.value)}
                />
                <Textarea
                  placeholder="revoke reason"
                  rows={2}
                  value={revokeReason}
                  onChange={(event) => setRevokeReason(event.target.value)}
                />
                <Button
                  intent="danger"
                  loading={revokeEntitlement.isPending}
                  disabled={isActionPending}
                  onClick={handleRevoke}
                >
                  회수 실행
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">최근 Action Log</h2>
            <div className="mt-3 space-y-2">
              {(actionLogs?.items || []).slice(0, 10).map((item) => (
                <div key={item.id} className="rounded-md bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-900">{item.action_key}</div>
                    <Badge intent={resolveActionStatusIntent(item.action_status)}>
                      {item.action_status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {item.domain} · {item.resource_type || '-'} · {item.resource_id || '-'}
                  </div>
                </div>
              ))}
              {(!actionLogs || actionLogs.items.length === 0) && (
                <div className="text-sm text-gray-500">로그 데이터가 없습니다.</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-gray-900">승인 요청</h2>
            <div className="mt-3 space-y-2">
              {(approvals?.items || []).slice(0, 10).map((item) => (
                <div key={item.id} className="rounded-md bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-900">{item.action_key}</div>
                    <Badge intent={item.status === 'PENDING' ? 'warning' : 'default'}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    assignee role: {item.assignee_role_code || '-'}
                  </div>
                </div>
              ))}
              {(!approvals || approvals.items.length === 0) && (
                <div className="text-sm text-gray-500">승인 요청이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900">Order Queue</h3>
          {orderQueueLoading ? (
            <div className="mt-3 text-sm text-gray-500">로딩 중...</div>
          ) : (
            <div className="mt-3 space-y-2">
              {(orderQueue?.items || []).slice(0, 5).map((item) => (
                <div key={item.order_id} className="rounded-md bg-gray-50 px-3 py-2 text-xs">
                  <div className="font-semibold text-gray-800">{item.order_no}</div>
                  <div className="text-gray-600">
                    {item.order_status} / {item.payment_status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900">Fulfillment Queue</h3>
          {fulfillmentQueueLoading ? (
            <div className="mt-3 text-sm text-gray-500">로딩 중...</div>
          ) : (
            <div className="mt-3 space-y-2">
              {(fulfillmentQueue?.items || []).slice(0, 5).map((item) => (
                <div
                  key={item.fulfillment_group_id}
                  className="rounded-md bg-gray-50 px-3 py-2 text-xs"
                >
                  <div className="font-semibold text-gray-800">{item.fulfillment_group_status}</div>
                  <div className="text-gray-600">
                    {item.fulfillment_kind} / shipment: {item.shipment_status || '-'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900">Inventory Health</h3>
          {inventoryLoading ? (
            <div className="mt-3 text-sm text-gray-500">로딩 중...</div>
          ) : (
            <div className="mt-3 space-y-2">
              {(inventoryHealth?.items || []).slice(0, 5).map((item) => (
                <div key={item.inventory_level_id} className="rounded-md bg-gray-50 px-3 py-2 text-xs">
                  <div className="font-semibold text-gray-800">
                    variant {item.variant_id.slice(0, 8)}...
                  </div>
                  <div className="text-gray-600">
                    delta: {item.reservation_delta}, available: {item.available_quantity}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
