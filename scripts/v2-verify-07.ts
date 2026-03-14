import { writeFile } from 'node:fs/promises';

type VerifyArgs = {
  baseUrl: string;
  adminToken: string | null;
  domainKey: string | null;
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
      'V2 07 Migration/Cutover 자동 점검',
      '',
      'Usage:',
      '  npx tsx scripts/v2-verify-07.ts [options]',
      '',
      'Options:',
      '  --base-url <url>        API host (default: http://127.0.0.1:3001)',
      '  --admin-token <token>   Admin bearer token (optional, LUCENT_ADMIN_TOKEN)',
      '  --domain-key <key>      특정 domain_key 존재 여부 및 checklist 확인',
      '  --json                  JSON 출력',
      '  --out <path>            결과 파일 저장',
      '  --help, -h              도움말',
      '',
      'Environment:',
      '  LUCENT_BASE_URL, LUCENT_ADMIN_TOKEN',
    ].join('\n'),
  );
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

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    adminToken:
      trimText(readArg('--admin-token')) ||
      trimText(process.env.LUCENT_ADMIN_TOKEN),
    domainKey: trimText(readArg('--domain-key')),
    output: hasFlag('--json') ? 'json' : 'markdown',
    outFile: trimText(readArg('--out')),
  };
}

async function fetchApi<T>(
  baseUrl: string,
  path: string,
  token: string | null,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers,
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

function buildMarkdown(result: VerifyResult): string {
  const lines = [
    '# V2 07 Migration/Cutover 검증 리포트',
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

  const withDomainFilter = args.domainKey
    ? `?domain_key=${encodeURIComponent(args.domainKey)}`
    : '';

  try {
    const domains = await fetchApi<{ items: Array<{ domain_key: string }> }>(
      args.baseUrl,
      '/api/v2/admin/cutover/domains?limit=50',
      args.adminToken,
    );

    checks.push({
      key: 'cutover_domains_read',
      passed: domains.items.length > 0,
      detail: `items=${domains.items.length}`,
    });

    if (args.domainKey) {
      const exists = domains.items.some(
        (item) => item.domain_key === args.domainKey,
      );
      checks.push({
        key: 'cutover_domain_exists',
        passed: exists,
        detail: `domain_key=${args.domainKey}`,
      });
    }
  } catch (error) {
    checks.push({
      key: 'cutover_domains_read',
      passed: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }

  try {
    const reports = await fetchApi<{ items: Array<{ id: string }> }>(
      args.baseUrl,
      `/api/v2/admin/cutover/gates?limit=20${args.domainKey ? `&domain_key=${encodeURIComponent(args.domainKey)}` : ''}`,
      args.adminToken,
    );
    checks.push({
      key: 'cutover_gate_reports_read',
      passed: true,
      detail: `items=${reports.items.length}`,
    });
  } catch (error) {
    checks.push({
      key: 'cutover_gate_reports_read',
      passed: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }

  try {
    const batches = await fetchApi<{ items: Array<{ id: string }> }>(
      args.baseUrl,
      `/api/v2/admin/cutover/batches?limit=20${args.domainKey ? `&domain_key=${encodeURIComponent(args.domainKey)}` : ''}`,
      args.adminToken,
    );
    checks.push({
      key: 'cutover_batches_read',
      passed: true,
      detail: `items=${batches.items.length}`,
    });
  } catch (error) {
    checks.push({
      key: 'cutover_batches_read',
      passed: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }

  try {
    const routingFlags = await fetchApi<{ items: Array<{ id: string }> }>(
      args.baseUrl,
      `/api/v2/admin/cutover/routing-flags?limit=20${args.domainKey ? `&domain_key=${encodeURIComponent(args.domainKey)}` : ''}`,
      args.adminToken,
    );
    checks.push({
      key: 'cutover_routing_flags_read',
      passed: true,
      detail: `items=${routingFlags.items.length}`,
    });
  } catch (error) {
    checks.push({
      key: 'cutover_routing_flags_read',
      passed: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }

  try {
    const stageRuns = await fetchApi<{ items: Array<{ id: string }> }>(
      args.baseUrl,
      `/api/v2/admin/cutover/stage-runs?limit=20${args.domainKey ? `&domain_key=${encodeURIComponent(args.domainKey)}` : ''}`,
      args.adminToken,
    );
    checks.push({
      key: 'cutover_stage_runs_read',
      passed: true,
      detail: `items=${stageRuns.items.length}`,
    });
  } catch (error) {
    checks.push({
      key: 'cutover_stage_runs_read',
      passed: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }

  try {
    const stageIssues = await fetchApi<{ items: Array<{ id: string; status: string }> }>(
      args.baseUrl,
      `/api/v2/admin/cutover/stage-issues?limit=20${args.domainKey ? `&domain_key=${encodeURIComponent(args.domainKey)}` : ''}`,
      args.adminToken,
    );
    const openIssues = stageIssues.items.filter((item) => item.status !== 'RESOLVED').length;
    checks.push({
      key: 'cutover_stage_issues_read',
      passed: true,
      detail: `items=${stageIssues.items.length}, open=${openIssues}`,
    });
  } catch (error) {
    checks.push({
      key: 'cutover_stage_issues_read',
      passed: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    });
  }

  try {
    const checklist = await fetchApi<{
      required_gate_types: string[];
      domains: Array<{
        domain: { domain_key: string };
        decision: 'READY' | 'REVIEW' | 'BLOCKED';
        summary: { passed: number; warn: number; failed: number; missing: number };
      }>;
      summary: { total_domains: number; ready_count: number; review_count: number; blocked_count: number };
    }>(
      args.baseUrl,
      `/api/v2/admin/cutover/gates/checklist${withDomainFilter}`,
      args.adminToken,
    );

    const hasAllRequiredTypes = [
      'DATA_CONSISTENCY',
      'BEHAVIORAL',
      'OPERATIONS',
      'ROLLBACK_READY',
    ].every((gateType) => checklist.required_gate_types.includes(gateType));

    checks.push({
      key: 'cutover_gate_checklist_read',
      passed: checklist.summary.total_domains > 0,
      detail: `domains=${checklist.summary.total_domains}, ready=${checklist.summary.ready_count}, review=${checklist.summary.review_count}, blocked=${checklist.summary.blocked_count}`,
    });

    checks.push({
      key: 'cutover_gate_checklist_required_types',
      passed: hasAllRequiredTypes,
      detail: `required_gate_types=${checklist.required_gate_types.join(',')}`,
    });

    if (args.domainKey) {
      const domainChecklist = checklist.domains.find(
        (item) => item.domain.domain_key === args.domainKey,
      );
      checks.push({
        key: 'cutover_gate_checklist_domain',
        passed: Boolean(domainChecklist),
        detail: domainChecklist
          ? `${args.domainKey} decision=${domainChecklist.decision}, pass=${domainChecklist.summary.passed}, warn=${domainChecklist.summary.warn}, fail=${domainChecklist.summary.failed}, missing=${domainChecklist.summary.missing}`
          : `${args.domainKey} checklist 없음`,
      });
    }
  } catch (error) {
    checks.push({
      key: 'cutover_gate_checklist_read',
      passed: false,
      detail: error instanceof Error ? error.message : 'unknown error',
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
    error instanceof Error ? error.message : 'unexpected error while verify-07',
  );
  process.exit(1);
});
