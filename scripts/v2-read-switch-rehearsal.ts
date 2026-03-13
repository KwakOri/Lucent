import { writeFile } from 'node:fs/promises';

type RehearsalArgs = {
  baseUrl: string;
  token: string;
  sampleLimit: number;
  output: 'markdown' | 'json';
  outFile: string | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

type MigrationCompareReport = {
  generated_at: string;
  sample_limit: number;
  read_switch: {
    ready: boolean;
    blocking_checks: string[];
    recommended_order: string[];
  };
  counts: {
    legacy: {
      projects: number;
      artists: number;
      products: number;
    };
    v2: {
      projects_mapped: number;
      artists_mapped: number;
      products_mapped: number;
      variants_total: number;
    };
  };
};

type ReadSwitchChecklist = {
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  blocking_failed_checks?: number;
  advisory_failed_checks?: number;
  blocking_checks: string[];
};

type RemediationTask = {
  check_key: string;
  title: string;
  action: string;
  sample_count: number;
};

type ReadSwitchRemediation = {
  summary: {
    failed_total: number;
    blocking_failed: number;
    advisory_failed: number;
  };
  blocking_tasks: RemediationTask[];
  advisory_tasks: RemediationTask[];
};

function parseArgs(argv: string[]): RehearsalArgs {
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

  const baseUrl =
    readArg('--base-url') || process.env.LUCENT_BASE_URL || 'http://localhost:3000';
  const token = readArg('--token') || process.env.LUCENT_ADMIN_TOKEN || '';
  const sampleLimitRaw =
    readArg('--sample-limit') || process.env.LUCENT_SAMPLE_LIMIT || '20';
  const output = hasFlag('--json') ? 'json' : 'markdown';
  const outFile = readArg('--out') || null;

  const sampleLimit = Number.parseInt(sampleLimitRaw, 10);
  if (!Number.isFinite(sampleLimit) || sampleLimit <= 0) {
    throw new Error(`Invalid --sample-limit value: ${sampleLimitRaw}`);
  }
  if (!token) {
    throw new Error(
      'Admin token is required. Use --token <TOKEN> or set LUCENT_ADMIN_TOKEN.',
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    token,
    sampleLimit,
    output,
    outFile,
  };
}

function printHelp(): void {
  console.log(
    [
      'V2 Read Switch Rehearsal',
      '',
      'Usage:',
      '  npx tsx scripts/v2-read-switch-rehearsal.ts [options]',
      '',
      'Options:',
      '  --base-url <url>       Frontend host (default: http://localhost:3000)',
      '  --token <token>        Admin Bearer token (or LUCENT_ADMIN_TOKEN)',
      '  --sample-limit <num>   Sample limit for migration checks (default: 20)',
      '  --json                 Print summary in JSON format',
      '  --out <path>           Save result to file (in addition to stdout)',
      '  --help, -h             Show help',
      '',
      'Environment variables:',
      '  LUCENT_BASE_URL, LUCENT_ADMIN_TOKEN, LUCENT_SAMPLE_LIMIT',
    ].join('\n'),
  );
}

async function fetchApi<T>(
  baseUrl: string,
  token: string,
  path: string,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const raw = await response.text();
  let json: ApiEnvelope<T> | undefined;
  try {
    json = JSON.parse(raw) as ApiEnvelope<T>;
  } catch {
    throw new Error(
      `Failed to parse response from ${path}. status=${response.status} body=${raw.slice(
        0,
        200,
      )}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Request failed: ${path} status=${response.status} message=${
        json?.message || raw.slice(0, 200)
      }`,
    );
  }
  if (!json?.data) {
    throw new Error(`Missing data field from ${path}`);
  }

  return json.data;
}

function buildMarkdownReport(input: {
  baseUrl: string;
  sampleLimit: number;
  compareReport: MigrationCompareReport;
  checklist: ReadSwitchChecklist;
  remediation: ReadSwitchRemediation;
}): string {
  const { baseUrl, sampleLimit, compareReport, checklist, remediation } = input;
  const gateA = remediation.summary.blocking_failed === 0;
  const gateB = (checklist.blocking_failed_checks || 0) === 0;
  const finalRecommendation = gateA && gateB ? '진행 가능(수동 Gate 확인 필요)' : '보류';

  const lines: string[] = [
    '# V2 Read Switch 리허설 리포트',
    '',
    `- 기준 시각: ${compareReport.generated_at}`,
    `- 대상 호스트: ${baseUrl}`,
    `- sample_limit: ${sampleLimit}`,
    '',
    '## 수치 요약',
    `- compare.read_switch.ready: ${compareReport.read_switch.ready}`,
    `- checklist: total=${checklist.total_checks}, passed=${checklist.passed_checks}, failed=${checklist.failed_checks}`,
    `- remediation: failed_total=${remediation.summary.failed_total}, blocking_failed=${remediation.summary.blocking_failed}, advisory_failed=${remediation.summary.advisory_failed}`,
    '',
    '## Gate 판정',
    `- Gate A (blocking_failed=0): ${gateA ? 'PASS' : 'FAIL'}`,
    `- Gate B (checklist blocking_failed_checks=0): ${gateB ? 'PASS' : 'FAIL'}`,
    '- Gate C (기능 스모크): MANUAL',
    '- Gate D (롤백 준비): MANUAL',
    `- 자동 판정 결과: ${finalRecommendation}`,
    '',
    '## Blocking 보정 작업',
  ];

  if (remediation.blocking_tasks.length === 0) {
    lines.push('- 없음');
  } else {
    remediation.blocking_tasks.forEach((task, index) => {
      lines.push(
        `${index + 1}. ${task.title} (${task.check_key}) - sample=${task.sample_count}`,
      );
      lines.push(`- 조치: ${task.action}`);
    });
  }

  lines.push('', '## Advisory 보정 작업');
  if (remediation.advisory_tasks.length === 0) {
    lines.push('- 없음');
  } else {
    remediation.advisory_tasks.forEach((task, index) => {
      lines.push(
        `${index + 1}. ${task.title} (${task.check_key}) - sample=${task.sample_count}`,
      );
      lines.push(`- 조치: ${task.action}`);
    });
  }

  lines.push(
    '',
    '## 승인 기록 템플릿',
    '- Gate A: PASS/FAIL',
    '- Gate B: PASS/FAIL',
    '- Gate C: PASS/FAIL',
    '- Gate D: PASS/FAIL',
    '- 최종 결정: 진행/보류',
    '- 비고:',
  );

  return lines.join('\n');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const query = `?sampleLimit=${args.sampleLimit}`;

  const [compareReport, checklist, remediation] = await Promise.all([
    fetchApi<MigrationCompareReport>(
      args.baseUrl,
      args.token,
      `/api/v2/catalog/admin/migration/compare-report${query}`,
    ),
    fetchApi<ReadSwitchChecklist>(
      args.baseUrl,
      args.token,
      `/api/v2/catalog/admin/migration/read-switch-checklist${query}`,
    ),
    fetchApi<ReadSwitchRemediation>(
      args.baseUrl,
      args.token,
      `/api/v2/catalog/admin/migration/remediation-tasks${query}`,
    ),
  ]);

  if (args.output === 'json') {
    const gateA = remediation.summary.blocking_failed === 0;
    const gateB = (checklist.blocking_failed_checks || 0) === 0;
    const result = JSON.stringify(
      {
        generated_at: compareReport.generated_at,
        base_url: args.baseUrl,
        sample_limit: args.sampleLimit,
        compare_read_ready: compareReport.read_switch.ready,
        checklist,
        remediation_summary: remediation.summary,
        gates: {
          gate_a_data_remediation: gateA ? 'PASS' : 'FAIL',
          gate_b_checklist: gateB ? 'PASS' : 'FAIL',
          gate_c_smoke_test: 'MANUAL',
          gate_d_rollback_ready: 'MANUAL',
        },
      },
      null,
      2,
    );
    if (args.outFile) {
      await writeFile(args.outFile, `${result}\n`, 'utf8');
      console.log(`[saved] ${args.outFile}`);
    }
    console.log(result);
    return;
  }

  const result = buildMarkdownReport({
    baseUrl: args.baseUrl,
    sampleLimit: args.sampleLimit,
    compareReport,
    checklist,
    remediation,
  });
  if (args.outFile) {
    await writeFile(args.outFile, `${result}\n`, 'utf8');
    console.log(`[saved] ${args.outFile}`);
  }
  console.log(result);
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(`[v2-read-switch-rehearsal] ${error.message}`);
  } else {
    console.error('[v2-read-switch-rehearsal] Unknown error');
  }
  process.exit(1);
});
