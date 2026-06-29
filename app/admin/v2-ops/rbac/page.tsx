'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import {
  AdminPageHeader,
  AdminStatCard,
  adminButtonClass,
  adminInputClass,
  adminLegacyBridgeClass,
  adminPrimaryButtonClass,
  adminSelectClass,
  adminTableBodyClass,
  adminTableContainerClass,
  adminTableHeadCellClass,
  adminTableHeadClass,
} from '@/src/components/admin/AdminDesignSystem';
import {
  useV2AdminAssignRbacRole,
  useV2AdminRbacUsers,
  useV2AdminRevokeRbacRole,
  useV2AdminRoles,
} from '@/lib/client/hooks/useV2AdminOps';
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

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleString('ko-KR');
}

export default function V2AdminRbacPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [targetUserEmail, setTargetUserEmail] = useState('');
  const [selectedRoleCode, setSelectedRoleCode] = useState('');
  const [assignedReason, setAssignedReason] = useState('manual assignment from admin');

  const [revokeReason, setRevokeReason] = useState('manual revoke from admin');
  const [revokingAssignmentId, setRevokingAssignmentId] = useState<string | null>(null);

  const { data: roles, isLoading: rolesLoading } = useV2AdminRoles();
  const { data: users, isLoading: usersLoading, isFetching } = useV2AdminRbacUsers({
    limit: 50,
    search: search || undefined,
  });

  const assignRbacRole = useV2AdminAssignRbacRole();
  const revokeRbacRole = useV2AdminRevokeRbacRole();

  const assignableRoles = useMemo(
    () => (roles || []).filter((role) => role.is_active),
    [roles],
  );

  const summary = useMemo(() => {
    const userCount = users?.items?.length ?? 0;
    const roleCount =
      users?.items?.reduce((accumulator, user) => accumulator + user.active_roles.length, 0) ?? 0;
    return { userCount, roleCount };
  }, [users]);

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleAssignRole = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    const email = targetUserEmail.trim();
    if (!email) {
      setErrorMessage('권한을 부여할 사용자 이메일을 입력해 주세요.');
      return;
    }
    if (!selectedRoleCode) {
      setErrorMessage('부여할 역할을 선택해 주세요.');
      return;
    }

    try {
      const result = await assignRbacRole.mutateAsync({
        user_email: email,
        role_code: selectedRoleCode,
        assigned_reason: assignedReason.trim() || null,
      });

      setMessage(
        result.created
          ? `권한이 부여되었습니다. (${result.assignment.role_code || selectedRoleCode})`
          : '이미 동일한 활성 권한이 있어 기존 권한을 반환했습니다.',
      );
      setSearch('');
      setSearchInput('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleRevokeRole = async (assignmentId: string) => {
    setMessage(null);
    setErrorMessage(null);
    setRevokingAssignmentId(assignmentId);
    try {
      await revokeRbacRole.mutateAsync({
        assignment_id: assignmentId,
        reason: revokeReason.trim() || null,
      });
      setMessage('선택한 권한을 회수했습니다.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setRevokingAssignmentId(null);
    }
  };

  if (rolesLoading || usersLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className={`${adminLegacyBridgeClass} space-y-6`}>
      <AdminPageHeader
        eyebrow="v2 ops"
        title="V2 관리자 권한 관리"
        description="DB 기반 RBAC 권한을 사용자에게 부여/회수합니다."
      />

      <V2OpsNavTabs />

      {message ? (
        <div className="rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AdminStatCard label="조회된 사용자" value={summary.userCount} />
        <AdminStatCard label="활성 권한 수" value={summary.roleCount} />
      </section>

      <section className="rounded-[22px] border border-[#e7e3d3] bg-white p-5 shadow-none">
        <h2 className="text-lg font-black text-[#1a1a2e]">권한 부여</h2>
        <form className="mt-4 space-y-3" onSubmit={handleAssignRole}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-black text-[#1a1a2e]">사용자 이메일</label>
              <Input
                value={targetUserEmail}
                onChange={(event) => setTargetUserEmail(event.target.value)}
                placeholder="admin@example.com"
                className={adminInputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-black text-[#1a1a2e]">역할</label>
              <select
                value={selectedRoleCode}
                onChange={(event) => setSelectedRoleCode(event.target.value)}
                className={adminSelectClass}
              >
                <option value="">역할 선택</option>
                {assignableRoles.map((role) => (
                  <option key={role.id} value={role.code}>
                    {role.code} ({role.name})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-black text-[#1a1a2e]">부여 사유</label>
            <Textarea
              rows={2}
              value={assignedReason}
              onChange={(event) => setAssignedReason(event.target.value)}
              placeholder="권한 부여 이유를 입력하세요"
              className={adminInputClass}
            />
          </div>
          <Button
            type="submit"
            intent="primary"
            className={adminPrimaryButtonClass}
            loading={assignRbacRole.isPending}
            disabled={assignRbacRole.isPending}
          >
            권한 부여
          </Button>
        </form>
      </section>

      <section className="rounded-[22px] border border-[#e7e3d3] bg-white p-5 shadow-none">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#1a1a2e]">사용자 권한 목록</h2>
            <p className="mt-1 text-xs font-medium text-[#1a1a2e]/50">
              검색어가 없으면 현재 활성 권한이 있는 사용자만 보여줍니다.
            </p>
          </div>
          <form className="flex w-full max-w-lg items-center gap-2" onSubmit={handleSearchSubmit}>
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="이메일 또는 이름 검색"
              className={adminInputClass}
            />
            <Button type="submit" intent="secondary" size="sm" className={adminButtonClass}>
              검색
            </Button>
            <Button
              type="button"
              intent="ghost"
              size="sm"
              className={adminButtonClass}
              onClick={() => {
                setSearch('');
                setSearchInput('');
              }}
            >
              초기화
            </Button>
          </form>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="w-full max-w-md">
            <label className="mb-1 block text-xs font-black text-[#1a1a2e]/60">권한 회수 사유(기본값)</label>
            <Input
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              placeholder="manual revoke from admin"
              className={adminInputClass}
            />
          </div>
          {isFetching ? <span className="text-xs font-medium text-[#1a1a2e]/50">목록 새로고침 중...</span> : null}
        </div>

        {users?.items?.length ? (
          <div className={`mt-4 ${adminTableContainerClass}`}>
            <table className="min-w-full text-sm">
              <thead className={adminTableHeadClass}>
                <tr>
                  <th className={adminTableHeadCellClass}>사용자</th>
                  <th className={adminTableHeadCellClass}>활성 권한</th>
                  <th className={adminTableHeadCellClass}>작업</th>
                </tr>
              </thead>
              <tbody className={adminTableBodyClass}>
                {users.items.map((user) => (
                  <tr key={user.user_id}>
                    <td className="px-3 py-3 align-top">
                      <div className="font-bold text-[#1a1a2e]">{user.email || user.user_id}</div>
                      <div className="text-xs font-medium text-[#1a1a2e]/50">{user.name || '-'}</div>
                      <button
                        type="button"
                        className="mt-1 text-xs font-black text-[#a35200] hover:text-[#7a3c00]"
                        onClick={() => setTargetUserEmail(user.email || '')}
                      >
                        부여 폼에 이메일 채우기
                      </button>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {user.active_roles.length > 0 ? (
                        <div className="space-y-2">
                          {user.active_roles.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="rounded-[12px] border border-[#eee7d6] bg-[#faf9f3] px-2 py-2"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge intent="info">{assignment.role_code || 'UNKNOWN'}</Badge>
                                <span className="text-xs font-medium text-[#1a1a2e]/60">
                                  {assignment.role_name || '-'}
                                </span>
                              </div>
                              <div className="mt-1 text-xs font-medium text-[#1a1a2e]/50">
                                부여일: {formatDateTime(assignment.assigned_at)} · 만료일:{' '}
                                {formatDateTime(assignment.expires_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-[#1a1a2e]/50">활성 권한 없음</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {user.active_roles.length > 0 ? (
                        <div className="space-y-2">
                          {user.active_roles.map((assignment) => (
                            <Button
                              key={assignment.id}
                              intent="danger"
                              size="sm"
                              className="!rounded-[12px] !bg-[#ca2a30] !font-bold !text-white hover:!bg-[#b0242a]"
                              loading={revokeRbacRole.isPending && revokingAssignmentId === assignment.id}
                              disabled={revokeRbacRole.isPending}
                              onClick={() => {
                                void handleRevokeRole(assignment.id);
                              }}
                            >
                              {assignment.role_code || 'ROLE'} 회수
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-[#1a1a2e]/50">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 rounded-[14px] border border-dashed border-[#e7e3d3] bg-[#faf9f3] px-4 py-6 text-sm font-medium text-[#1a1a2e]/55">
            표시할 사용자가 없습니다.
          </div>
        )}
      </section>
    </div>
  );
}
