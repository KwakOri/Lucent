import { writeFile } from 'node:fs/promises';

type VerifyArgs = {
  baseUrl: string;
  adminToken: string | null;
  actionKey: string;
  requiresApproval: boolean;
  expectDecision: 'APPROVAL_REQUIRED' | 'DIRECT_EXECUTE' | null;
  orderId: string | null;
  output: 'markdown' | 'json';
  outFile: string | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  status?: 'success' | 'error';
  data?: T;
  message?: string;
};

type VerifyCheck = {
  key: string;
  passed: boolean;
  detail: string;
};

type VerifyResult = {
  generated_at: string;
  base_url: string;
  checks: VerifyCheck[];
  summary: {
    passed: number;
    failed: number;
  };
};

function printHelp(): void {
  console.log(
    [
      'V2 06 Cutover Policy 자동 점검',
      '',
      'Usage:',
      '  npx tsx scripts/v2-verify-06.ts [options]',
      '',
      'Options:',
      '  --base-url <url>              API host (default: http://127.0.0.1:3001)',
      '  --admin-token <token>         Admin bearer token (LUCENT_ADMIN_TOKEN)',
      '  --action-key <key>            점검 action key (default: ORDER_REFUND_EXECUTE)',
      '  --requires-approval <bool>    action approval 필요 여부 (default: true)',
      '  --expect-decision <value>     기대 decision (APPROVAL_REQUIRED|DIRECT_EXECUTE)',
      '  --order-id <uuid>             선택: 실제 refund 실행 대상 order_id',
      '  --json                        JSON 출력',
      '  --out <path>                  결과 파일 저장',
      '  --help, -h                    도움말',
      '',
      'Environment:',
      '  LUCENT_BASE_URL, LUCENT_ADMIN_TOKEN',
    ].join('\n'),
  );
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function parseArgs(argv: string[]): VerifyArgs {
  const readArg = (key: string): string | undefined => {
    const index = argv.indexOf(key);
    if (index < 0) {
      return undefined;
    }
    return argv[index + 1];
  };
  const hasFlag = (key: string): boolean => argv.includes(key);

  if (hasFlag('--help') || hasFlag('-h')) {
    printHelp();
    process.exit(0);
  }

  const trimText = (value: string | null | undefined): string | null => {
    if (!value) {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  };

  const baseUrl =
    trimText(readArg('--base-url')) ||
    trimText(process.env.LUCENT_BASE_URL) ||
    'http://127.0.0.1:3001';
  const adminToken =
    trimText(readArg('--admin-token')) || trimText(process.env.LUCENT_ADMIN_TOKEN);
  const actionKey = trimText(readArg('--action-key')) || 'ORDER_REFUND_EXECUTE';
  const requiresApproval = parseBoolean(readArg('--requires-approval'), true);
  const expectDecisionRaw = trimText(readArg('--expect-decision'));
  const expectDecision =
    expectDecisionRaw === 'APPROVAL_REQUIRED' || expectDecisionRaw === 'DIRECT_EXECUTE'
      ? expectDecisionRaw
      : null;
  const orderId = trimText(readArg('--order-id'));
  const output = hasFlag('--json') ? 'json' : 'markdown';
  const outFile = trimText(readArg('--out'));

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    adminToken,
    actionKey,
    requiresApproval,
    expectDecision,
    orderId,
    output,
    outFile,
  };
}

async function fetchApi<T>(
  baseUrl: string,
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  });

  const raw = await response.text();
  let json: ApiEnvelope<T> | undefined;
  try {
    json = JSON.parse(raw) as ApiEnvelope<T>;
  } catch {
    throw new Error(
      `응답 JSON 파싱 실패: ${path}, status=${response.status}, body=${raw.slice(0, 200)}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `요청 실패: ${path}, status=${response.status}, message=${
        json?.message || raw.slice(0, 200)
      }`,
    );
  }
  if (!json?.data) {
    throw new Error(`응답 data 필드 누락: ${path}`);
  }

  return json.data;
}

async function fetchApiAllowError<T>(
  baseUrl: string,
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<{ status: number; data: T | null; raw: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  });

  const raw = await response.text();
  let json: ApiEnvelope<T> | undefined;
  try {
    json = JSON.parse(raw) as ApiEnvelope<T>;
  } catch {
    return { status: response.status, data: null, raw };
  }

  return {
    status: response.status,
    data: json?.data || null,
    raw,
  };
}

function buildMarkdown(result: VerifyResult): string {
  const lines = [
    '# V2 06 Cutover Policy 검증 리포트',
    '',
    `- generated_at: ${result.generated_at}`,
    `- base_url: ${result.base_url}`,
    `- summary: passed=${result.summary.passed}, failed=${result.summary.failed}`,
    '',
    '## Checks',
  ];

  result.checks.forEach((check, index) => {
    lines.push(
      `${index + 1}. [${check.passed ? 'PASS' : 'FAIL'}] ${check.key} - ${check.detail}`,
    );
  });

  return lines.join('\n');
}

async function run(args: VerifyArgs): Promise<VerifyResult> {
  const checks: VerifyCheck[] = [];

  if (!args.adminToken) {
    checks.push({
      key: 'admin_token_ready',
      passed: false,
      detail: 'LUCENT_ADMIN_TOKEN(또는 --admin-token)이 필요합니다.',
    });
    return {
      generated_at: new Date().toISOString(),
      base_url: args.baseUrl,
      checks,
      summary: {
        passed: 0,
        failed: checks.length,
      },
    };
  }

  try {
    const policy = await fetchApi<{
      rollout_stage: string;
      approval_enforced: boolean;
      approval_enforced_actions: string[];
    }>(args.baseUrl, '/api/v2/admin/cutover-policy', args.adminToken);
    checks.push({
      key: 'cutover_policy_read',
      passed: true,
      detail: `stage=${policy.rollout_stage}, approval_enforced=${policy.approval_enforced}`,
    });
  } catch (error) {
    checks.push({
      key: 'cutover_policy_read',
      passed: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }

  try {
    const check = await fetchApi<{
      decision: 'APPROVAL_REQUIRED' | 'DIRECT_EXECUTE';
    }>(args.baseUrl, '/api/v2/admin/cutover-policy/check', args.adminToken, {
      method: 'POST',
      body: JSON.stringify({
        action_key: args.actionKey,
        requires_approval: args.requiresApproval,
      }),
    });

    const expectationMatched = args.expectDecision
      ? check.decision === args.expectDecision
      : true;
    checks.push({
      key: 'cutover_policy_check',
      passed: expectationMatched,
      detail: args.expectDecision
        ? `decision=${check.decision}, expected=${args.expectDecision}`
        : `decision=${check.decision}`,
    });
  } catch (error) {
    checks.push({
      key: 'cutover_policy_check',
      passed: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }

  try {
    const catalog = await fetchApi<{ screens: Array<{ actions: unknown[] }> }>(
      args.baseUrl,
      '/api/v2/admin/actions/catalog',
      args.adminToken,
    );
    const actionCount = (catalog.screens || []).reduce(
      (sum, screen) => sum + screen.actions.length,
      0,
    );
    checks.push({
      key: 'action_catalog_read',
      passed: actionCount > 0,
      detail: `action_count=${actionCount}`,
    });
  } catch (error) {
    checks.push({
      key: 'action_catalog_read',
      passed: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }

  try {
    const logs = await fetchApi<{ items: Array<{ action_key: string }> }>(
      args.baseUrl,
      '/api/v2/admin/audit/action-logs?limit=5',
      args.adminToken,
    );
    checks.push({
      key: 'action_logs_read',
      passed: true,
      detail: `items=${logs.items.length}`,
    });
  } catch (error) {
    checks.push({
      key: 'action_logs_read',
      passed: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }

  try {
    const approvals = await fetchApi<{ items: Array<{ status: string }> }>(
      args.baseUrl,
      '/api/v2/admin/audit/approvals?limit=5',
      args.adminToken,
    );
    checks.push({
      key: 'approvals_read',
      passed: true,
      detail: `items=${approvals.items.length}`,
    });
  } catch (error) {
    checks.push({
      key: 'approvals_read',
      passed: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }

  if (args.orderId) {
    const response = await fetchApiAllowError(
      args.baseUrl,
      `/api/v2/checkout/orders/${args.orderId}/refund`,
      args.adminToken,
      {
        method: 'POST',
        body: JSON.stringify({
          amount: 1,
          reason: 'verify-06-smoke',
        }),
      },
    );

    const passed = response.status === 200 || response.status === 409;
    checks.push({
      key: 'refund_action_smoke',
      passed,
      detail: `status=${response.status} (200=direct execute, 409=approval required)`,
    });
  }

  const failed = checks.filter((check) => !check.passed).length;
  const passed = checks.length - failed;

  return {
    generated_at: new Date().toISOString(),
    base_url: args.baseUrl,
    checks,
    summary: {
      passed,
      failed,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await run(args);

  const output =
    args.output === 'json'
      ? JSON.stringify(result, null, 2)
      : buildMarkdown(result);
  console.log(output);

  if (args.outFile) {
    await writeFile(args.outFile, output, 'utf8');
    console.log(`\n[write] ${args.outFile}`);
  }

  if (result.summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'unexpected error while verify-06',
  );
  process.exit(1);
});
