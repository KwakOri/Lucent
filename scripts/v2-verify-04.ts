import { writeFile } from "node:fs/promises";

type VerifyArgs = {
  baseUrl: string;
  userToken: string | null;
  adminToken: string | null;
  variantId: string | null;
  quantity: number;
  shippingAmount: number;
  output: "markdown" | "json";
  outFile: string | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  status?: "success" | "error";
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
  created_order_id: string | null;
};

function printHelp(): void {
  console.log(
    [
      "V2 04 자동 점검",
      "",
      "Usage:",
      "  npx tsx scripts/v2-verify-04.ts [options]",
      "",
      "Options:",
      "  --base-url <url>         Frontend host (default: http://localhost:3000)",
      "  --user-token <token>     User bearer token (LUCENT_USER_TOKEN)",
      "  --admin-token <token>    Admin bearer token (LUCENT_ADMIN_TOKEN)",
      "  --variant-id <uuid>      주문 생성 검증용 variant id",
      "  --quantity <num>         주문 수량 (default: 1)",
      "  --shipping-amount <num>  배송비 (default: 0)",
      "  --json                   JSON 출력",
      "  --out <path>             결과 파일 저장",
      "  --help, -h               도움말",
      "",
      "Environment:",
      "  LUCENT_BASE_URL, LUCENT_USER_TOKEN, LUCENT_ADMIN_TOKEN",
      "",
      "Note:",
      "  --variant-id를 지정하면 테스트 주문이 실제로 생성됩니다.",
    ].join("\n"),
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

  if (hasFlag("--help") || hasFlag("-h")) {
    printHelp();
    process.exit(0);
  }

  const baseUrl =
    readArg("--base-url") ||
    process.env.LUCENT_BASE_URL ||
    "http://localhost:3000";
  const userToken =
    readArg("--user-token") || process.env.LUCENT_USER_TOKEN || null;
  const adminToken =
    readArg("--admin-token") || process.env.LUCENT_ADMIN_TOKEN || null;
  const variantId = readArg("--variant-id") || null;
  const quantityRaw = readArg("--quantity") || "1";
  const shippingAmountRaw = readArg("--shipping-amount") || "0";
  const output = hasFlag("--json") ? "json" : "markdown";
  const outFile = readArg("--out") || null;

  const quantity = Number.parseInt(quantityRaw, 10);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Invalid --quantity value: ${quantityRaw}`);
  }
  const shippingAmount = Number.parseInt(shippingAmountRaw, 10);
  if (!Number.isInteger(shippingAmount) || shippingAmount < 0) {
    throw new Error(`Invalid --shipping-amount value: ${shippingAmountRaw}`);
  }

  const trimToken = (token: string | null): string | null =>
    token && token.trim().length > 0 ? token.trim() : null;

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    userToken: trimToken(userToken),
    adminToken: trimToken(adminToken),
    variantId,
    quantity,
    shippingAmount,
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
    "Content-Type": "application/json",
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

function buildMarkdown(result: VerifyResult): string {
  const lines = [
    "# V2 04 자동 검증 리포트",
    "",
    `- generated_at: ${result.generated_at}`,
    `- base_url: ${result.base_url}`,
    `- created_order_id: ${result.created_order_id || "-"}`,
    `- summary: passed=${result.summary.passed}, failed=${result.summary.failed}`,
    "",
    "## Checks",
  ];

  result.checks.forEach((check, index) => {
    lines.push(
      `${index + 1}. [${check.passed ? "PASS" : "FAIL"}] ${check.key} - ${check.detail}`,
    );
  });

  return lines.join("\n");
}

async function run(args: VerifyArgs): Promise<VerifyResult> {
  const checks: VerifyCheck[] = [];
  let createdOrderId: string | null = null;

  if (!args.userToken) {
    checks.push({
      key: "user_auth_ready",
      passed: false,
      detail: "LUCENT_USER_TOKEN(또는 --user-token)이 필요합니다.",
    });
  } else {
    try {
      const cart = await fetchApi<{ id: string }>(
        args.baseUrl,
        "/api/v2/checkout/cart",
        args.userToken,
      );
      checks.push({
        key: "cart_read",
        passed: true,
        detail: `cart_id=${cart.id}`,
      });
    } catch (error) {
      checks.push({
        key: "cart_read",
        passed: false,
        detail: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  if (args.userToken && args.variantId) {
    try {
      await fetchApi(
        args.baseUrl,
        "/api/v2/checkout/cart/items",
        args.userToken,
        {
          method: "POST",
          body: JSON.stringify({
            variant_id: args.variantId,
            quantity: args.quantity,
          }),
        },
      );
      checks.push({
        key: "cart_add_item",
        passed: true,
        detail: `variant_id=${args.variantId}, quantity=${args.quantity}`,
      });
    } catch (error) {
      checks.push({
        key: "cart_add_item",
        passed: false,
        detail: error instanceof Error ? error.message : "unknown error",
      });
    }

    try {
      const validateResult = await fetchApi<{
        quote?: { quote_reference?: string };
      }>(args.baseUrl, "/api/v2/checkout/validate", args.userToken, {
        method: "POST",
        body: JSON.stringify({
          shipping_amount: args.shippingAmount,
        }),
      });
      checks.push({
        key: "checkout_validate",
        passed: true,
        detail: `quote_reference=${validateResult?.quote?.quote_reference || "-"}`,
      });
    } catch (error) {
      checks.push({
        key: "checkout_validate",
        passed: false,
        detail: error instanceof Error ? error.message : "unknown error",
      });
    }

    const idempotencyKey = `VERIFY04-${Date.now().toString(36).toUpperCase()}`;
    try {
      const firstOrder = await fetchApi<{
        idempotent_replayed: boolean;
        order: { id: string };
      }>(args.baseUrl, "/api/v2/checkout/orders", args.userToken, {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          shipping_amount: args.shippingAmount,
        }),
      });
      createdOrderId = firstOrder.order.id;
      checks.push({
        key: "order_create_first",
        passed: !firstOrder.idempotent_replayed && Boolean(createdOrderId),
        detail: `idempotent_replayed=${firstOrder.idempotent_replayed}, order_id=${createdOrderId}`,
      });

      const replayOrder = await fetchApi<{
        idempotent_replayed: boolean;
        order: { id: string };
      }>(args.baseUrl, "/api/v2/checkout/orders", args.userToken, {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          shipping_amount: args.shippingAmount,
        }),
      });
      checks.push({
        key: "order_idempotency_replay",
        passed:
          replayOrder.idempotent_replayed &&
          replayOrder.order.id === createdOrderId,
        detail: `idempotent_replayed=${replayOrder.idempotent_replayed}, replay_order_id=${replayOrder.order.id}`,
      });
    } catch (error) {
      checks.push({
        key: "order_idempotency",
        passed: false,
        detail: error instanceof Error ? error.message : "unknown error",
      });
    }
  } else {
    checks.push({
      key: "order_idempotency",
      passed: false,
      detail:
        "--variant-id와 user token이 없어서 주문 멱등 검증을 실행하지 않았습니다.",
    });
  }

  if (createdOrderId) {
    const debugToken = args.adminToken || args.userToken;
    if (!debugToken) {
      checks.push({
        key: "order_debug_read",
        passed: false,
        detail: "debug 조회를 위한 token이 없습니다.",
      });
    } else {
      try {
        await fetchApi(
          args.baseUrl,
          `/api/v2/checkout/orders/${createdOrderId}/debug`,
          debugToken,
        );
        checks.push({
          key: "order_debug_read",
          passed: true,
          detail: `order_id=${createdOrderId}`,
        });
      } catch (error) {
        checks.push({
          key: "order_debug_read",
          passed: false,
          detail: error instanceof Error ? error.message : "unknown error",
        });
      }
    }
  }

  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;

  return {
    generated_at: new Date().toISOString(),
    base_url: args.baseUrl,
    checks,
    summary: {
      passed,
      failed,
    },
    created_order_id: createdOrderId,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await run(args);
  const outputText =
    args.output === "json"
      ? JSON.stringify(result, null, 2)
      : buildMarkdown(result);

  if (args.outFile) {
    await writeFile(args.outFile, `${outputText}\n`, "utf8");
    console.log(`[saved] ${args.outFile}`);
  }
  console.log(outputText);

  if (result.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(`[v2-verify-04] ${error.message}`);
  } else {
    console.error("[v2-verify-04] Unknown error");
  }
  process.exit(1);
});
