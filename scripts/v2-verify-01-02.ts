import { writeFile } from 'node:fs/promises';

type VerifyArgs = {
  baseUrl: string;
  token: string;
  sampleLimit: number;
  bundleDefinitionId: string | null;
  parentQuantity: number;
  parentUnitAmount: number | null;
  strictAdvisory: boolean;
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
  read_switch: {
    ready: boolean;
    blocking_checks: string[];
    recommended_order: string[];
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

type ReadSwitchRemediationTaskReport = {
  summary: {
    failed_total: number;
    blocking_failed: number;
    advisory_failed: number;
  };
};

type V2BundleDefinition = {
  id: string;
  bundle_product_id: string;
  version_no: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
};

type V2BundleValidationResult = {
  ready: boolean;
  checks: Array<{
    key: string;
    passed: boolean;
    detail: string;
  }>;
};

type V2BundleResolveResult = {
  summary?: {
    allocation?: {
      difference_per_parent?: number | null;
    };
  };
};

type V2BundleOpsContractResult = {
  summary?: {
    component_line_count?: number;
  };
};

type V2BundleCanaryReportResult = {
  targets: Array<{
    definition_id: string;
    canary_status: 'READY' | 'MONITORING' | 'BLOCKED';
    shadow_resolution?: {
      pass?: boolean;
      error?: string | null;
    };
  }>;
};

type VerificationCheck = {
  key: string;
  passed: boolean;
  detail: string;
};

type VerificationResult = {
  generated_at: string;
  base_url: string;
  sample_limit: number;
  target_bundle_definition_id: string | null;
  checks: VerificationCheck[];
  overall_passed: boolean;
  summary: {
    passed: number;
    failed: number;
  };
};

function printHelp(): void {
  console.log(
    [
      'V2 01/02 자동 점검',
      '',
      'Usage:',
      '  npx tsx scripts/v2-verify-01-02.ts [options]',
      '',
      'Options:',
      '  --base-url <url>            Frontend host (default: http://localhost:3000)',
      '  --token <token>             Admin Bearer token (or LUCENT_ADMIN_TOKEN)',
      '  --sample-limit <num>        Readiness sample limit (default: 20)',
      '  --bundle-definition-id <id> 검증할 bundle definition id (미지정 시 ACTIVE 첫 건)',
      '  --parent-quantity <num>     Resolve/Ops/Canary parent quantity (default: 1)',
      '  --parent-unit-amount <num>  Resolve/Ops/Canary parent unit amount (default: 10000)',
      '  --strict-advisory           advisory 실패도 FAIL로 처리',
      '  --json                      JSON 출력',
      '  --out <path>                파일 저장 (stdout도 함께 출력)',
      '  --help, -h                  도움말 출력',
      '',
      'Environment:',
      '  LUCENT_BASE_URL, LUCENT_ADMIN_TOKEN, LUCENT_SAMPLE_LIMIT',
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

  const baseUrl =
    readArg('--base-url') || process.env.LUCENT_BASE_URL || 'http://localhost:3000';
  const token = readArg('--token') || process.env.LUCENT_ADMIN_TOKEN || '';
  const sampleLimitRaw =
    readArg('--sample-limit') || process.env.LUCENT_SAMPLE_LIMIT || '20';
  const bundleDefinitionId = readArg('--bundle-definition-id') || null;
  const parentQuantityRaw = readArg('--parent-quantity') || '1';
  const parentUnitAmountRaw = readArg('--parent-unit-amount') || '10000';
  const strictAdvisory = hasFlag('--strict-advisory');
  const output = hasFlag('--json') ? 'json' : 'markdown';
  const outFile = readArg('--out') || null;

  const sampleLimit = Number.parseInt(sampleLimitRaw, 10);
  if (!Number.isInteger(sampleLimit) || sampleLimit <= 0) {
    throw new Error(`Invalid --sample-limit value: ${sampleLimitRaw}`);
  }

  const parentQuantity = Number.parseInt(parentQuantityRaw, 10);
  if (!Number.isInteger(parentQuantity) || parentQuantity <= 0) {
    throw new Error(`Invalid --parent-quantity value: ${parentQuantityRaw}`);
  }

  const parentUnitAmount = Number.parseInt(parentUnitAmountRaw, 10);
  if (!Number.isInteger(parentUnitAmount) || parentUnitAmount < 0) {
    throw new Error(`Invalid --parent-unit-amount value: ${parentUnitAmountRaw}`);
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
    bundleDefinitionId,
    parentQuantity,
    parentUnitAmount,
    strictAdvisory,
    output,
    outFile,
  };
}

function buildSearchParams(values: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

async function fetchApi<T>(
  baseUrl: string,
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const raw = await response.text();
  let json: ApiEnvelope<T> | undefined;
  try {
    json = JSON.parse(raw) as ApiEnvelope<T>;
  } catch {
    throw new Error(
      `Failed to parse response: ${path}, status=${response.status}, body=${raw.slice(
        0,
        200,
      )}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Request failed: ${path}, status=${response.status}, message=${
        json?.message || raw.slice(0, 200)
      }`,
    );
  }

  if (!json?.data) {
    throw new Error(`Missing data field from ${path}`);
  }

  return json.data;
}

function buildMarkdown(result: VerificationResult): string {
  const lines: string[] = [
    '# V2 01/02 자동 검증 리포트',
    '',
    `- generated_at: ${result.generated_at}`,
    `- base_url: ${result.base_url}`,
    `- sample_limit: ${result.sample_limit}`,
    `- target_bundle_definition_id: ${result.target_bundle_definition_id || '-'}`,
    `- overall: ${result.overall_passed ? 'PASS' : 'FAIL'}`,
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

function pickDefinitionId(
  requestedDefinitionId: string | null,
  activeDefinitions: V2BundleDefinition[],
): { targetDefinitionId: string | null; detail: string } {
  if (requestedDefinitionId) {
    const exists = activeDefinitions.some(
      (definition) => definition.id === requestedDefinitionId,
    );
    if (exists) {
      return {
        targetDefinitionId: requestedDefinitionId,
        detail: '요청한 definition id를 사용했습니다.',
      };
    }
    return {
      targetDefinitionId: null,
      detail: '요청한 definition id가 ACTIVE 목록에 없습니다.',
    };
  }

  if (activeDefinitions.length === 0) {
    return {
      targetDefinitionId: null,
      detail: 'ACTIVE bundle definition이 없습니다.',
    };
  }

  return {
    targetDefinitionId: activeDefinitions[0].id,
    detail: `ACTIVE 첫 번째 definition을 사용했습니다 (count=${activeDefinitions.length}).`,
  };
}

async function runVerification(args: VerifyArgs): Promise<VerificationResult> {
  const query = buildSearchParams({ sampleLimit: String(args.sampleLimit) });

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
    fetchApi<ReadSwitchRemediationTaskReport>(
      args.baseUrl,
      args.token,
      `/api/v2/catalog/admin/migration/remediation-tasks${query}`,
    ),
  ]);

  const checks: VerificationCheck[] = [];
  const gateA = remediation.summary.blocking_failed === 0;
  const gateB = (checklist.blocking_failed_checks || 0) === 0;
  const advisoryPass = args.strictAdvisory
    ? remediation.summary.advisory_failed === 0
    : true;

  checks.push({
    key: '01.gateA.blocking_remediation',
    passed: gateA,
    detail: `blocking_failed=${remediation.summary.blocking_failed}`,
  });
  checks.push({
    key: '01.gateB.blocking_checklist',
    passed: gateB,
    detail: `blocking_failed_checks=${checklist.blocking_failed_checks || 0}`,
  });
  checks.push({
    key: '01.compare.read_switch_ready',
    passed: compareReport.read_switch.ready,
    detail: `read_switch.ready=${compareReport.read_switch.ready}`,
  });
  checks.push({
    key: '01.advisory_policy',
    passed: advisoryPass,
    detail: `advisory_failed=${remediation.summary.advisory_failed}, strict=${args.strictAdvisory}`,
  });

  const activeDefinitions = await fetchApi<V2BundleDefinition[]>(
    args.baseUrl,
    args.token,
    `/api/v2/catalog/admin/bundles/definitions${buildSearchParams({
      status: 'ACTIVE',
    })}`,
  );

  const picked = pickDefinitionId(args.bundleDefinitionId, activeDefinitions);
  checks.push({
    key: '02.bundle.target_definition',
    passed: !!picked.targetDefinitionId,
    detail: picked.detail,
  });

  let validation: V2BundleValidationResult | null = null;
  let resolve: V2BundleResolveResult | null = null;
  let opsContract: V2BundleOpsContractResult | null = null;
  let canary: V2BundleCanaryReportResult | null = null;

  if (picked.targetDefinitionId) {
    validation = await fetchApi<V2BundleValidationResult>(
      args.baseUrl,
      args.token,
      `/api/v2/catalog/admin/bundles/definitions/${picked.targetDefinitionId}/validate`,
      {
        method: 'POST',
        body: JSON.stringify({ selected_components: [] }),
      },
    );

    const failedValidationCount = validation.checks.filter(
      (item) => !item.passed,
    ).length;
    checks.push({
      key: '02.bundle.validation_ready',
      passed: validation.ready,
      detail: `ready=${validation.ready}, failed_checks=${failedValidationCount}`,
    });

    if (validation.ready) {
      resolve = await fetchApi<V2BundleResolveResult>(
        args.baseUrl,
        args.token,
        '/api/v2/catalog/admin/bundles/resolve',
        {
          method: 'POST',
          body: JSON.stringify({
            bundle_definition_id: picked.targetDefinitionId,
            parent_quantity: args.parentQuantity,
            parent_unit_amount: args.parentUnitAmount,
            selected_components: [],
          }),
        },
      );

      const allocationDiff =
        resolve.summary?.allocation?.difference_per_parent ?? null;
      const allocationPassed = allocationDiff === null || allocationDiff === 0;
      checks.push({
        key: '02.bundle.resolve_allocation',
        passed: allocationPassed,
        detail: `difference_per_parent=${allocationDiff}`,
      });

      opsContract = await fetchApi<V2BundleOpsContractResult>(
        args.baseUrl,
        args.token,
        '/api/v2/catalog/admin/bundles/ops-contract',
        {
          method: 'POST',
          body: JSON.stringify({
            bundle_definition_id: picked.targetDefinitionId,
            parent_quantity: args.parentQuantity,
            parent_unit_amount: args.parentUnitAmount,
            selected_components: [],
          }),
        },
      );

      const componentLineCount = opsContract.summary?.component_line_count || 0;
      checks.push({
        key: '02.bundle.ops_contract',
        passed: componentLineCount > 0,
        detail: `component_line_count=${componentLineCount}`,
      });
    } else {
      checks.push({
        key: '02.bundle.resolve_allocation',
        passed: false,
        detail: 'validation.ready=false 이므로 resolve를 실행하지 않았습니다.',
      });
      checks.push({
        key: '02.bundle.ops_contract',
        passed: false,
        detail: 'validation.ready=false 이므로 ops-contract를 실행하지 않았습니다.',
      });
    }

    canary = await fetchApi<V2BundleCanaryReportResult>(
      args.baseUrl,
      args.token,
      '/api/v2/catalog/admin/bundles/canary-report',
      {
        method: 'POST',
        body: JSON.stringify({
          definition_ids: [picked.targetDefinitionId],
          sample_parent_quantity: args.parentQuantity,
          sample_parent_unit_amount: args.parentUnitAmount,
        }),
      },
    );

    const canaryTarget = canary.targets.find(
      (target) => target.definition_id === picked.targetDefinitionId,
    );
    const canaryPassed =
      !!canaryTarget && canaryTarget.canary_status !== 'BLOCKED';
    checks.push({
      key: '02.bundle.canary_not_blocked',
      passed: canaryPassed,
      detail: canaryTarget
        ? `canary_status=${canaryTarget.canary_status}, shadow_pass=${String(
            canaryTarget.shadow_resolution?.pass,
          )}, shadow_error=${canaryTarget.shadow_resolution?.error || '-'}`
        : 'canary 결과에 target definition이 없습니다.',
    });
  } else {
    checks.push({
      key: '02.bundle.validation_ready',
      passed: false,
      detail: 'target definition 미선정으로 검증을 건너뛰었습니다.',
    });
    checks.push({
      key: '02.bundle.resolve_allocation',
      passed: false,
      detail: 'target definition 미선정으로 검증을 건너뛰었습니다.',
    });
    checks.push({
      key: '02.bundle.ops_contract',
      passed: false,
      detail: 'target definition 미선정으로 검증을 건너뛰었습니다.',
    });
    checks.push({
      key: '02.bundle.canary_not_blocked',
      passed: false,
      detail: 'target definition 미선정으로 검증을 건너뛰었습니다.',
    });
  }

  const passedCount = checks.filter((check) => check.passed).length;
  const failedCount = checks.length - passedCount;

  return {
    generated_at: compareReport.generated_at,
    base_url: args.baseUrl,
    sample_limit: args.sampleLimit,
    target_bundle_definition_id: picked.targetDefinitionId,
    checks,
    overall_passed: failedCount === 0,
    summary: {
      passed: passedCount,
      failed: failedCount,
    },
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await runVerification(args);

  if (args.output === 'json') {
    const content = JSON.stringify(result, null, 2);
    if (args.outFile) {
      await writeFile(args.outFile, `${content}\n`, 'utf8');
      console.log(`[saved] ${args.outFile}`);
    }
    console.log(content);
  } else {
    const content = buildMarkdown(result);
    if (args.outFile) {
      await writeFile(args.outFile, `${content}\n`, 'utf8');
      console.log(`[saved] ${args.outFile}`);
    }
    console.log(content);
  }

  if (!result.overall_passed) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(`[v2-verify-01-02] ${error.message}`);
  } else {
    console.error('[v2-verify-01-02] Unknown error');
  }
  process.exit(1);
});
