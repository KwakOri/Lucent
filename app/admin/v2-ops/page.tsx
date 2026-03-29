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
  useV2AdminCutoverBatches,
  useV2AdminCutoverDomains,
  useV2AdminCutoverGateChecklist,
  useV2AdminCutoverGateReports,
  useV2AdminCutoverPolicy,
  useV2AdminCutoverPolicyCheck,
  useV2AdminCutoverReopenReadiness,
  useV2AdminCutoverRoutingFlags,
  useV2AdminCutoverStageIssues,
  useV2AdminCutoverStageRuns,
  useV2AdminDispatchShipment,
  useV2AdminFulfillmentQueue,
  useV2AdminInventoryHealth,
  useV2AdminMyRbac,
  useV2AdminOrderQueue,
  useV2AdminRefundOrder,
  useV2AdminReissueEntitlement,
  useV2AdminRevokeEntitlement,
  useV2AdminSaveCutoverBatch,
  useV2AdminSaveCutoverGateReport,
  useV2AdminSaveCutoverRoutingFlag,
  useV2AdminSaveCutoverStageIssue,
  useV2AdminSaveCutoverStageRun,
  useV2AdminUpdateCutoverDomain,
} from '@/lib/client/hooks/useV2AdminOps';
import type {
  UpdateV2AdminCutoverDomainInput,
  V2AdminActionStatus,
  V2CutoverBatchStatus,
  V2CutoverGateResult,
  V2CutoverGateType,
  V2CutoverIssueSeverity,
  V2CutoverIssueStatus,
  V2CutoverRouteTarget,
  V2CutoverStageRunStatus,
  V2CutoverStatus,
} from '@/lib/client/api/v2-admin-ops.api';
import { V2OpsNavTabs } from '@/src/components/admin/v2-ops/V2OpsNavTabs';

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

function isApprovalRequiredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const maybeError = error as { errorCode?: string; message?: string };
  if (maybeError.errorCode === 'V2_ADMIN_APPROVAL_REQUIRED') {
    return true;
  }
  if (typeof maybeError.message === 'string') {
    return maybeError.message.includes('승인이 필요한 액션');
  }
  return false;
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

function resolveCutoverGateResultIntent(result?: string | null) {
  if (result === 'PASS') {
    return 'success' as const;
  }
  if (result === 'FAIL') {
    return 'error' as const;
  }
  if (result === 'WARN') {
    return 'warning' as const;
  }
  return 'default' as const;
}

function resolveCutoverStatusIntent(status?: string | null) {
  if (status === 'LEGACY_READONLY' || status === 'WRITE_DEFAULT_V2') {
    return 'success' as const;
  }
  if (status === 'LIMITED_CUTOVER' || status === 'SHADOW_VERIFIED') {
    return 'warning' as const;
  }
  return 'default' as const;
}

function resolveCutoverBatchStatusIntent(status?: string | null) {
  if (status === 'SUCCEEDED') {
    return 'success' as const;
  }
  if (status === 'FAILED' || status === 'CANCELED') {
    return 'error' as const;
  }
  if (status === 'RUNNING') {
    return 'warning' as const;
  }
  return 'default' as const;
}

function resolveStageRunStatusIntent(status?: string | null) {
  if (status === 'COMPLETED') {
    return 'success' as const;
  }
  if (status === 'BLOCKED' || status === 'ROLLED_BACK' || status === 'CANCELED') {
    return 'error' as const;
  }
  if (status === 'RUNNING') {
    return 'warning' as const;
  }
  return 'default' as const;
}

function resolveIssueSeverityIntent(severity?: string | null) {
  if (severity === 'LOW') {
    return 'default' as const;
  }
  if (severity === 'MEDIUM') {
    return 'warning' as const;
  }
  return 'error' as const;
}

function resolveReopenDecisionIntent(decision?: string | null) {
  if (decision === 'READY') {
    return 'success' as const;
  }
  if (decision === 'BLOCKED') {
    return 'error' as const;
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

  const [domainUpdateKey, setDomainUpdateKey] = useState('');
  const [domainUpdateStatus, setDomainUpdateStatus] = useState('');
  const [domainUpdateStage, setDomainUpdateStage] = useState('');
  const [domainUpdateNextAction, setDomainUpdateNextAction] = useState('');

  const [gateDomainKey, setGateDomainKey] = useState('');
  const [gateType, setGateType] = useState('DATA_CONSISTENCY');
  const [gateKey, setGateKey] = useState('');
  const [gateResult, setGateResult] = useState('PASS');
  const [gateDetail, setGateDetail] = useState('');

  const [batchDomainKey, setBatchDomainKey] = useState('');
  const [batchKey, setBatchKey] = useState('');
  const [batchRunType, setBatchRunType] = useState('BACKFILL');
  const [batchStatus, setBatchStatus] = useState('PENDING');

  const [routingDomainKey, setRoutingDomainKey] = useState('');
  const [routingTarget, setRoutingTarget] = useState('LEGACY');
  const [routingTrafficPercent, setRoutingTrafficPercent] = useState('0');
  const [routingReason, setRoutingReason] = useState('');

  const [stageRunDomainKey, setStageRunDomainKey] = useState('');
  const [stageRunNo, setStageRunNo] = useState('');
  const [stageRunKey, setStageRunKey] = useState('');
  const [stageRunStatus, setStageRunStatus] = useState('PLANNED');
  const [stageRunMode, setStageRunMode] = useState('LIMITED');

  const [issueDomainKey, setIssueDomainKey] = useState('');
  const [issueStageNo, setIssueStageNo] = useState('');
  const [issueStageRunId, setIssueStageRunId] = useState('');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueSeverity, setIssueSeverity] = useState('MEDIUM');
  const [issueStatus, setIssueStatus] = useState('OPEN');
  const [issueDetail, setIssueDetail] = useState('');
  const [issueRecoveryAction, setIssueRecoveryAction] = useState('');

  const { data: myRbac, isLoading: rbacLoading } = useV2AdminMyRbac();
  const { data: cutoverPolicy, isLoading: cutoverLoading } = useV2AdminCutoverPolicy();
  const { data: actionCatalog, isLoading: catalogLoading } = useV2AdminActionCatalog();
  const { data: actionLogs, isLoading: logsLoading } = useV2AdminActionLogs({ limit: 20 });
  const { data: approvals, isLoading: approvalsLoading } = useV2AdminApprovals({ limit: 20 });
  const { data: orderQueue, isLoading: orderQueueLoading } = useV2AdminOrderQueue({ limit: 20 });
  const { data: fulfillmentQueue, isLoading: fulfillmentQueueLoading } =
    useV2AdminFulfillmentQueue({ limit: 20 });
  const { data: inventoryHealth, isLoading: inventoryLoading } = useV2AdminInventoryHealth({
    limit: 20,
  });
  const { data: cutoverDomains, isLoading: cutoverDomainsLoading } =
    useV2AdminCutoverDomains({ limit: 50 });
  const { data: cutoverGateChecklist, isLoading: cutoverGateChecklistLoading } =
    useV2AdminCutoverGateChecklist();
  const { data: cutoverReopenReadiness, isLoading: cutoverReopenReadinessLoading } =
    useV2AdminCutoverReopenReadiness();
  const { data: cutoverGateReports, isLoading: cutoverGateReportsLoading } =
    useV2AdminCutoverGateReports({ limit: 20 });
  const { data: cutoverBatches, isLoading: cutoverBatchesLoading } =
    useV2AdminCutoverBatches({ limit: 20 });
  const { data: cutoverRoutingFlags, isLoading: cutoverRoutingFlagsLoading } =
    useV2AdminCutoverRoutingFlags({ limit: 20 });
  const { data: cutoverStageRuns, isLoading: cutoverStageRunsLoading } =
    useV2AdminCutoverStageRuns({ limit: 20 });
  const { data: cutoverStageIssues, isLoading: cutoverStageIssuesLoading } =
    useV2AdminCutoverStageIssues({ limit: 20 });

  const refundOrder = useV2AdminRefundOrder();
  const dispatchShipment = useV2AdminDispatchShipment();
  const reissueEntitlement = useV2AdminReissueEntitlement();
  const revokeEntitlement = useV2AdminRevokeEntitlement();
  const checkCutoverPolicy = useV2AdminCutoverPolicyCheck();
  const updateCutoverDomain = useV2AdminUpdateCutoverDomain();
  const saveCutoverGateReport = useV2AdminSaveCutoverGateReport();
  const saveCutoverBatch = useV2AdminSaveCutoverBatch();
  const saveCutoverRoutingFlag = useV2AdminSaveCutoverRoutingFlag();
  const saveCutoverStageRun = useV2AdminSaveCutoverStageRun();
  const saveCutoverStageIssue = useV2AdminSaveCutoverStageIssue();

  const isActionPending =
    refundOrder.isPending ||
    dispatchShipment.isPending ||
    reissueEntitlement.isPending ||
    revokeEntitlement.isPending ||
    checkCutoverPolicy.isPending ||
    updateCutoverDomain.isPending ||
    saveCutoverGateReport.isPending ||
    saveCutoverBatch.isPending ||
    saveCutoverRoutingFlag.isPending ||
    saveCutoverStageRun.isPending ||
    saveCutoverStageIssue.isPending;

  const queueSummary = useMemo(
    () => ({
      orders: orderQueue?.items?.length ?? 0,
      fulfillment: fulfillmentQueue?.items?.length ?? 0,
      inventoryMismatches: inventoryHealth?.summary?.mismatch_count ?? 0,
      approvals: approvals?.items?.filter((item) => item.status === 'PENDING').length ?? 0,
    }),
    [orderQueue, fulfillmentQueue, inventoryHealth, approvals],
  );

  const cutoverSummary = useMemo(
    () => ({
      domains: cutoverDomains?.items?.length ?? 0,
      readyDomains: cutoverGateChecklist?.summary?.ready_count ?? 0,
      reviewDomains: cutoverGateChecklist?.summary?.review_count ?? 0,
      blockedDomains: cutoverGateChecklist?.summary?.blocked_count ?? 0,
      gates: cutoverGateReports?.items?.length ?? 0,
      batches: cutoverBatches?.items?.length ?? 0,
      routingFlags: cutoverRoutingFlags?.items?.length ?? 0,
      stageRuns: cutoverStageRuns?.items?.length ?? 0,
      openIssues:
        cutoverStageIssues?.items?.filter((item) => item.status !== 'RESOLVED').length ??
        0,
      reopenRequired: cutoverReopenReadiness?.summary?.reopen_required_count ?? 0,
      reopenReady: cutoverReopenReadiness?.summary?.ready_count ?? 0,
      reopenBlocked: cutoverReopenReadiness?.summary?.blocked_count ?? 0,
    }),
    [
      cutoverDomains,
      cutoverGateChecklist,
      cutoverReopenReadiness,
      cutoverGateReports,
      cutoverBatches,
      cutoverRoutingFlags,
      cutoverStageRuns,
      cutoverStageIssues,
    ],
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
      const policyCheck = await checkCutoverPolicy.mutateAsync({
        action_key: 'ORDER_REFUND_EXECUTE',
        requires_approval: true,
      });
      try {
        await refundOrder.mutateAsync({
          orderId,
          data: {
            amount: parsedAmount,
            reason: refundReason.trim() || null,
          },
        });
      } catch (error) {
        if (
          policyCheck.decision === 'APPROVAL_REQUIRED' &&
          isApprovalRequiredError(error)
        ) {
          setMessage('환불 액션이 승인 대기로 등록되었습니다. 승인 큐를 확인하세요.');
          return;
        }
        throw error;
      }

      if (policyCheck.decision === 'APPROVAL_REQUIRED') {
        setMessage('환불 액션이 승인 대기로 등록되었습니다. 승인 큐를 확인하세요.');
      } else {
        setMessage('환불 액션을 실행했습니다. Action Log에서 결과를 확인하세요.');
      }
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
      const policyCheck = await checkCutoverPolicy.mutateAsync({
        action_key: 'FULFILLMENT_ENTITLEMENT_REVOKE',
        requires_approval: true,
      });
      try {
        await revokeEntitlement.mutateAsync({
          entitlementId,
          data: {
            reason: revokeReason.trim() || null,
          },
        });
      } catch (error) {
        if (
          policyCheck.decision === 'APPROVAL_REQUIRED' &&
          isApprovalRequiredError(error)
        ) {
          setMessage('회수 액션이 승인 대기로 등록되었습니다. 승인 큐를 확인하세요.');
          return;
        }
        throw error;
      }
      if (policyCheck.decision === 'APPROVAL_REQUIRED') {
        setMessage('회수 액션이 승인 대기로 등록되었습니다. 승인 큐를 확인하세요.');
      } else {
        setMessage('회수 액션을 실행했습니다. Action Log에서 결과를 확인하세요.');
      }
    });
  };

  const handleUpdateCutoverDomain = async () => {
    const domainKey = domainUpdateKey.trim();
    if (!domainKey) {
      setErrorMessage('domain_key를 입력해주세요.');
      return;
    }

    const payload: UpdateV2AdminCutoverDomainInput = {};
    const normalizedStatus = domainUpdateStatus.trim();
    if (normalizedStatus) {
      payload.status = normalizedStatus as V2CutoverStatus;
    }
    const normalizedStage = domainUpdateStage.trim();
    if (normalizedStage) {
      const stage = Number.parseInt(normalizedStage, 10);
      if (!Number.isInteger(stage) || stage < 0 || stage > 8) {
        setErrorMessage('current_stage는 0~8 범위 정수여야 합니다.');
        return;
      }
      payload.current_stage = stage;
    }
    if (domainUpdateNextAction.trim()) {
      payload.next_action = domainUpdateNextAction.trim();
    }

    if (Object.keys(payload).length === 0) {
      setErrorMessage('업데이트할 값을 하나 이상 입력해주세요.');
      return;
    }

    await runAction(async () => {
      await updateCutoverDomain.mutateAsync({
        domainKey,
        data: payload,
      });
      setMessage('도메인 상태를 업데이트했습니다.');
    });
  };

  const handleSaveGateReport = async () => {
    const domainKey = gateDomainKey.trim();
    const normalizedGateKey = gateKey.trim();
    if (!domainKey || !normalizedGateKey) {
      setErrorMessage('gate report는 domain_key와 gate_key가 필요합니다.');
      return;
    }

    await runAction(async () => {
      await saveCutoverGateReport.mutateAsync({
        domain_key: domainKey,
        gate_type: gateType.trim() as V2CutoverGateType,
        gate_key: normalizedGateKey,
        gate_result: gateResult.trim() as V2CutoverGateResult,
        detail: gateDetail.trim() || null,
      });
      setMessage('gate report를 저장했습니다.');
      setGateKey('');
      setGateDetail('');
    });
  };

  const handleSaveBatch = async () => {
    const domainKey = batchDomainKey.trim();
    const normalizedBatchKey = batchKey.trim();
    const normalizedRunType = batchRunType.trim();
    if (!domainKey || !normalizedBatchKey || !normalizedRunType) {
      setErrorMessage('batch는 domain_key, batch_key, run_type이 필요합니다.');
      return;
    }

    await runAction(async () => {
      await saveCutoverBatch.mutateAsync({
        domain_key: domainKey,
        batch_key: normalizedBatchKey,
        run_type: normalizedRunType,
        status: batchStatus.trim() as V2CutoverBatchStatus,
      });
      setMessage('migration batch를 저장했습니다.');
      setBatchKey('');
    });
  };

  const handleSaveRoutingFlag = async () => {
    const domainKey = routingDomainKey.trim();
    if (!domainKey) {
      setErrorMessage('routing flag는 domain_key가 필요합니다.');
      return;
    }
    const trafficPercent = Number.parseInt(routingTrafficPercent.trim(), 10);
    if (!Number.isInteger(trafficPercent) || trafficPercent < 0 || trafficPercent > 100) {
      setErrorMessage('traffic_percent는 0~100 범위 정수여야 합니다.');
      return;
    }

    await runAction(async () => {
      await saveCutoverRoutingFlag.mutateAsync({
        domain_key: domainKey,
        target: routingTarget.trim() as V2CutoverRouteTarget,
        traffic_percent: trafficPercent,
        reason: routingReason.trim() || null,
      });
      setMessage('routing flag를 저장했습니다.');
    });
  };

  const handleSaveStageRun = async () => {
    const domainKey = stageRunDomainKey.trim();
    const runKey = stageRunKey.trim();
    if (!domainKey || !runKey) {
      setErrorMessage('stage run은 domain_key와 run_key가 필요합니다.');
      return;
    }

    const stageNo = Number.parseInt(stageRunNo.trim(), 10);
    if (!Number.isInteger(stageNo) || stageNo < 0 || stageNo > 8) {
      setErrorMessage('stage_no는 0~8 범위 정수여야 합니다.');
      return;
    }

    await runAction(async () => {
      await saveCutoverStageRun.mutateAsync({
        domain_key: domainKey,
        stage_no: stageNo,
        run_key: runKey,
        status: stageRunStatus.trim() as V2CutoverStageRunStatus,
        transition_mode: stageRunMode.trim() as 'BASELINE' | 'LIMITED' | 'FULL' | 'ROLLBACK',
      });
      setMessage('stage run을 저장했습니다.');
      setStageRunKey('');
    });
  };

  const handleSaveStageIssue = async () => {
    const domainKey = issueDomainKey.trim();
    const title = issueTitle.trim();
    if (!domainKey || !title) {
      setErrorMessage('stage issue는 domain_key와 title이 필요합니다.');
      return;
    }

    const stageNo = Number.parseInt(issueStageNo.trim(), 10);
    if (!Number.isInteger(stageNo) || stageNo < 0 || stageNo > 8) {
      setErrorMessage('stage_no는 0~8 범위 정수여야 합니다.');
      return;
    }

    await runAction(async () => {
      await saveCutoverStageIssue.mutateAsync({
        stage_run_id: issueStageRunId.trim() || null,
        domain_key: domainKey,
        stage_no: stageNo,
        status: issueStatus.trim() as V2CutoverIssueStatus,
        severity: issueSeverity.trim() as V2CutoverIssueSeverity,
        title,
        detail: issueDetail.trim() || null,
        recovery_action: issueRecoveryAction.trim() || null,
      });
      setMessage('stage issue를 저장했습니다.');
      setIssueTitle('');
      setIssueDetail('');
      setIssueRecoveryAction('');
    });
  };

  if (
    rbacLoading ||
    cutoverLoading ||
    catalogLoading ||
    logsLoading ||
    approvalsLoading
  ) {
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

      <V2OpsNavTabs />

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
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Cutover Policy</h2>
          <Badge intent="info" size="md">
            {cutoverPolicy?.rollout_stage || 'STAGE_1'}
          </Badge>
          {cutoverPolicy?.approval_enforced ? (
            <Badge intent="warning">approval enforced</Badge>
          ) : (
            <Badge intent="success">approval observe-only</Badge>
          )}
          <Badge>{cutoverPolicy?.legacy_write_mode || '-'}</Badge>
        </div>
        <p className="mt-2 text-sm text-gray-600">{cutoverPolicy?.description}</p>
        {cutoverPolicy?.approval_enforced_actions?.length ? (
          <div className="mt-3 text-xs text-gray-500">
            enforced actions: {cutoverPolicy.approval_enforced_actions.join(', ')}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Migration Cutover Board</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge intent="info">domains {cutoverSummary.domains}</Badge>
            <Badge intent="success">ready {cutoverSummary.readyDomains}</Badge>
            <Badge intent="warning">review {cutoverSummary.reviewDomains}</Badge>
            <Badge intent="error">blocked {cutoverSummary.blockedDomains}</Badge>
            <Badge intent="default">gates {cutoverSummary.gates}</Badge>
            <Badge intent="default">batches {cutoverSummary.batches}</Badge>
            <Badge intent="default">routing {cutoverSummary.routingFlags}</Badge>
            <Badge intent="default">stage-runs {cutoverSummary.stageRuns}</Badge>
            <Badge intent="warning">open-issues {cutoverSummary.openIssues}</Badge>
            <Badge intent="info">reopen-required {cutoverSummary.reopenRequired}</Badge>
            <Badge intent="success">reopen-ready {cutoverSummary.reopenReady}</Badge>
            <Badge intent="error">reopen-blocked {cutoverSummary.reopenBlocked}</Badge>
          </div>
        </div>

        {cutoverDomainsLoading ? (
          <div className="mt-3 text-sm text-gray-500">도메인 상태 로딩 중...</div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {(cutoverDomains?.items || []).map((domain) => (
              <div key={domain.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-gray-900">{domain.domain_key}</div>
                  <Badge intent={resolveCutoverStatusIntent(domain.status)} size="sm">
                    {domain.status}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-gray-500">{domain.domain_name}</div>
                <div className="mt-2 text-xs text-gray-600">stage {domain.current_stage}</div>
                <div className="mt-1 text-xs text-gray-600">
                  owner: {domain.owner_role_code || '-'}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                  <span>gate</span>
                  <Badge intent={resolveCutoverGateResultIntent(domain.last_gate_result)} size="sm">
                    {domain.last_gate_result}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-gray-600">{domain.next_action || '-'}</div>
              </div>
            ))}
            {(!cutoverDomains || cutoverDomains.items.length === 0) && (
              <div className="text-sm text-gray-500">도메인 상태 데이터가 없습니다.</div>
            )}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-900">
            Gate Checklist Decision
          </div>
          {cutoverGateChecklistLoading ? (
            <div className="mt-2 text-xs text-gray-500">checklist 로딩 중...</div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
              {(cutoverGateChecklist?.domains || []).map((item) => (
                <div
                  key={item.domain.id}
                  className="rounded-md bg-gray-50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-800">
                      {item.domain.domain_key}
                    </div>
                    <Badge
                      intent={
                        item.decision === 'READY'
                          ? 'success'
                          : item.decision === 'REVIEW'
                          ? 'warning'
                          : 'error'
                      }
                      size="sm"
                    >
                      {item.decision}
                    </Badge>
                  </div>
                  <div className="mt-1 text-gray-600">
                    pass {item.summary.passed} / warn {item.summary.warn} / fail{' '}
                    {item.summary.failed} / missing {item.summary.missing}
                  </div>
                </div>
              ))}
              {(!cutoverGateChecklist || cutoverGateChecklist.domains.length === 0) && (
                <div className="text-xs text-gray-500">checklist 데이터가 없습니다.</div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-900">
            Rollback / Reopen Readiness
          </div>
          {cutoverReopenReadinessLoading ? (
            <div className="mt-2 text-xs text-gray-500">reopen readiness 로딩 중...</div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
              {(cutoverReopenReadiness?.domains || []).map((item) => (
                <div
                  key={item.domain.id}
                  className="rounded-md bg-gray-50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-800">
                      {item.domain.domain_key}
                    </div>
                    <Badge
                      intent={resolveReopenDecisionIntent(item.reopen_decision)}
                      size="sm"
                    >
                      {item.reopen_decision}
                    </Badge>
                  </div>
                  <div className="mt-1 text-gray-600">
                    gate {item.gate.decision} · unresolved {item.issues.unresolved_count} ·
                    latest-run {item.latest_stage_run?.status || '-'}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <Badge
                      intent={item.approval_checks.gate_ready ? 'success' : 'error'}
                      size="sm"
                    >
                      gate-ready
                    </Badge>
                    <Badge
                      intent={
                        item.approval_checks.unresolved_issues_cleared
                          ? 'success'
                          : 'error'
                      }
                      size="sm"
                    >
                      issues-cleared
                    </Badge>
                    <Badge
                      intent={
                        item.approval_checks.latest_stage_run_completed
                          ? 'success'
                          : 'warning'
                      }
                      size="sm"
                    >
                      run-completed
                    </Badge>
                    {item.rollback.needs_reopen ? (
                      <Badge intent="warning" size="sm">
                        reopen-required
                      </Badge>
                    ) : (
                      <Badge intent="default" size="sm">
                        not-required
                      </Badge>
                    )}
                  </div>
                  {item.blockers.length > 0 && (
                    <div className="mt-1 text-red-600">{item.blockers.join(' / ')}</div>
                  )}
                </div>
              ))}
              {(!cutoverReopenReadiness ||
                cutoverReopenReadiness.domains.length === 0) && (
                <div className="text-xs text-gray-500">
                  reopen readiness 데이터가 없습니다.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <div className="text-sm font-semibold text-gray-900">도메인 상태 업데이트</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input
              placeholder="domain_key (예: CATALOG)"
              value={domainUpdateKey}
              onChange={(event) => setDomainUpdateKey(event.target.value)}
            />
            <Input
              placeholder="status (예: SHADOW_VERIFIED)"
              value={domainUpdateStatus}
              onChange={(event) => setDomainUpdateStatus(event.target.value)}
            />
            <Input
              placeholder="current_stage (0~8)"
              value={domainUpdateStage}
              onChange={(event) => setDomainUpdateStage(event.target.value)}
            />
            <Input
              placeholder="next_action"
              value={domainUpdateNextAction}
              onChange={(event) => setDomainUpdateNextAction(event.target.value)}
            />
          </div>
          <div className="mt-3">
            <Button
              loading={updateCutoverDomain.isPending}
              disabled={isActionPending}
              onClick={handleUpdateCutoverDomain}
            >
              도메인 상태 저장
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900">Gate Reports</h3>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <Input
              placeholder="domain_key"
              value={gateDomainKey}
              onChange={(event) => setGateDomainKey(event.target.value)}
            />
            <Input
              placeholder="gate_type (DATA_CONSISTENCY)"
              value={gateType}
              onChange={(event) => setGateType(event.target.value)}
            />
            <Input
              placeholder="gate_key"
              value={gateKey}
              onChange={(event) => setGateKey(event.target.value)}
            />
            <Input
              placeholder="gate_result (PASS/FAIL/WARN/SKIP)"
              value={gateResult}
              onChange={(event) => setGateResult(event.target.value)}
            />
            <Textarea
              placeholder="detail"
              rows={2}
              value={gateDetail}
              onChange={(event) => setGateDetail(event.target.value)}
            />
            <Button
              loading={saveCutoverGateReport.isPending}
              disabled={isActionPending}
              onClick={handleSaveGateReport}
            >
              Gate 저장
            </Button>
          </div>
          {cutoverGateReportsLoading ? (
            <div className="mt-3 text-xs text-gray-500">로딩 중...</div>
          ) : (
            <div className="mt-3 space-y-2">
              {(cutoverGateReports?.items || []).slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-md bg-gray-50 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-800">{item.gate_key}</div>
                    <Badge intent={resolveCutoverGateResultIntent(item.gate_result)} size="sm">
                      {item.gate_result}
                    </Badge>
                  </div>
                  <div className="text-gray-600">
                    {item.domain?.domain_key || '-'} · {item.gate_type}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900">Migration Batches</h3>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <Input
              placeholder="domain_key"
              value={batchDomainKey}
              onChange={(event) => setBatchDomainKey(event.target.value)}
            />
            <Input
              placeholder="batch_key"
              value={batchKey}
              onChange={(event) => setBatchKey(event.target.value)}
            />
            <Input
              placeholder="run_type"
              value={batchRunType}
              onChange={(event) => setBatchRunType(event.target.value)}
            />
            <Input
              placeholder="status (PENDING/RUNNING/SUCCEEDED/FAILED)"
              value={batchStatus}
              onChange={(event) => setBatchStatus(event.target.value)}
            />
            <Button
              loading={saveCutoverBatch.isPending}
              disabled={isActionPending}
              onClick={handleSaveBatch}
            >
              Batch 저장
            </Button>
          </div>
          {cutoverBatchesLoading ? (
            <div className="mt-3 text-xs text-gray-500">로딩 중...</div>
          ) : (
            <div className="mt-3 space-y-2">
              {(cutoverBatches?.items || []).slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-md bg-gray-50 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-800">{item.batch_key}</div>
                    <Badge intent={resolveCutoverBatchStatusIntent(item.status)} size="sm">
                      {item.status}
                    </Badge>
                  </div>
                  <div className="text-gray-600">
                    {item.domain?.domain_key || '-'} · {item.run_type}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900">Routing Flags</h3>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <Input
              placeholder="domain_key"
              value={routingDomainKey}
              onChange={(event) => setRoutingDomainKey(event.target.value)}
            />
            <Input
              placeholder="target (LEGACY/V2/SHADOW)"
              value={routingTarget}
              onChange={(event) => setRoutingTarget(event.target.value)}
            />
            <Input
              placeholder="traffic_percent (0~100)"
              value={routingTrafficPercent}
              onChange={(event) => setRoutingTrafficPercent(event.target.value)}
            />
            <Textarea
              placeholder="reason"
              rows={2}
              value={routingReason}
              onChange={(event) => setRoutingReason(event.target.value)}
            />
            <Button
              loading={saveCutoverRoutingFlag.isPending}
              disabled={isActionPending}
              onClick={handleSaveRoutingFlag}
            >
              Routing 저장
            </Button>
          </div>
          {cutoverRoutingFlagsLoading ? (
            <div className="mt-3 text-xs text-gray-500">로딩 중...</div>
          ) : (
            <div className="mt-3 space-y-2">
              {(cutoverRoutingFlags?.items || []).slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-md bg-gray-50 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-800">{item.domain?.domain_key || '-'}</div>
                    <Badge size="sm">{item.target}</Badge>
                  </div>
                  <div className="text-gray-600">
                    traffic {item.traffic_percent}% · priority {item.priority}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900">Stage 0~8 Runs</h3>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <Input
              placeholder="domain_key"
              value={stageRunDomainKey}
              onChange={(event) => setStageRunDomainKey(event.target.value)}
            />
            <Input
              placeholder="stage_no (0~8)"
              value={stageRunNo}
              onChange={(event) => setStageRunNo(event.target.value)}
            />
            <Input
              placeholder="run_key (예: CATALOG-stage1-20260314)"
              value={stageRunKey}
              onChange={(event) => setStageRunKey(event.target.value)}
            />
            <Input
              placeholder="status (PLANNED/RUNNING/COMPLETED/BLOCKED)"
              value={stageRunStatus}
              onChange={(event) => setStageRunStatus(event.target.value)}
            />
            <Input
              placeholder="transition_mode (BASELINE/LIMITED/FULL/ROLLBACK)"
              value={stageRunMode}
              onChange={(event) => setStageRunMode(event.target.value)}
            />
            <Button
              loading={saveCutoverStageRun.isPending}
              disabled={isActionPending}
              onClick={handleSaveStageRun}
            >
              Stage Run 저장
            </Button>
          </div>
          {cutoverStageRunsLoading ? (
            <div className="mt-3 text-xs text-gray-500">로딩 중...</div>
          ) : (
            <div className="mt-3 space-y-2">
              {(cutoverStageRuns?.items || []).slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-md bg-gray-50 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-800">{item.run_key}</div>
                    <Badge intent={resolveStageRunStatusIntent(item.status)} size="sm">
                      {item.status}
                    </Badge>
                  </div>
                  <div className="text-gray-600">
                    {item.domain?.domain_key || '-'} · stage {item.stage_no} ·{' '}
                    {item.transition_mode}
                  </div>
                </div>
              ))}
              {(!cutoverStageRuns || cutoverStageRuns.items.length === 0) && (
                <div className="text-xs text-gray-500">stage run 데이터가 없습니다.</div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900">Issue / Recovery Log</h3>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <Input
              placeholder="domain_key"
              value={issueDomainKey}
              onChange={(event) => setIssueDomainKey(event.target.value)}
            />
            <Input
              placeholder="stage_no (0~8)"
              value={issueStageNo}
              onChange={(event) => setIssueStageNo(event.target.value)}
            />
            <Input
              placeholder="stage_run_id (optional)"
              value={issueStageRunId}
              onChange={(event) => setIssueStageRunId(event.target.value)}
            />
            <Input
              placeholder="title"
              value={issueTitle}
              onChange={(event) => setIssueTitle(event.target.value)}
            />
            <Input
              placeholder="severity (LOW/MEDIUM/HIGH/CRITICAL)"
              value={issueSeverity}
              onChange={(event) => setIssueSeverity(event.target.value)}
            />
            <Input
              placeholder="status (OPEN/MITIGATING/RESOLVED)"
              value={issueStatus}
              onChange={(event) => setIssueStatus(event.target.value)}
            />
            <Textarea
              placeholder="detail"
              rows={2}
              value={issueDetail}
              onChange={(event) => setIssueDetail(event.target.value)}
            />
            <Textarea
              placeholder="recovery_action"
              rows={2}
              value={issueRecoveryAction}
              onChange={(event) => setIssueRecoveryAction(event.target.value)}
            />
            <Button
              loading={saveCutoverStageIssue.isPending}
              disabled={isActionPending}
              onClick={handleSaveStageIssue}
            >
              Stage Issue 저장
            </Button>
          </div>
          {cutoverStageIssuesLoading ? (
            <div className="mt-3 text-xs text-gray-500">로딩 중...</div>
          ) : (
            <div className="mt-3 space-y-2">
              {(cutoverStageIssues?.items || []).slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-md bg-gray-50 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-gray-800">{item.title}</div>
                    <div className="flex items-center gap-1">
                      <Badge intent={resolveIssueSeverityIntent(item.severity)} size="sm">
                        {item.severity}
                      </Badge>
                      <Badge
                        intent={item.status === 'RESOLVED' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-gray-600">
                    {item.domain?.domain_key || '-'} · stage {item.stage_no} ·{' '}
                    {item.issue_type}
                  </div>
                </div>
              ))}
              {(!cutoverStageIssues || cutoverStageIssues.items.length === 0) && (
                <div className="text-xs text-gray-500">stage issue 데이터가 없습니다.</div>
              )}
            </div>
          )}
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
