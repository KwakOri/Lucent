import { writeFile } from "node:fs/promises";

type VerifyArgs = {
  baseUrl: string;
  userToken: string | null;
  adminToken: string | null;
  variantId: string | null;
  digitalVariantId: string | null;
  stockLocationId: string | null;
  shippingMethodId: string | null;
  shippingZoneId: string | null;
  shippingProfileId: string | null;
  quantity: number;
  shippingAmount: number;
  expectedShippingFee: number | null;
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
  created_reservation_id: string | null;
  created_shipment_id: string | null;
  created_entitlement_id: string | null;
};

function printHelp(): void {
  console.log(
    [
      "V2 05 자동 점검",
      "",
      "Usage:",
      "  npx tsx scripts/v2-verify-05.ts [options]",
      "",
      "Options:",
      "  --base-url <url>              API host (default: http://127.0.0.1:3001)",
      "  --user-token <token>          User bearer token (LUCENT_USER_TOKEN)",
      "  --admin-token <token>         Admin bearer token (LUCENT_ADMIN_TOKEN, default=user token)",
      "  --variant-id <uuid>           PHYSICAL 주문 생성 variant id",
      "  --digital-variant-id <uuid>   DIGITAL 주문 생성 variant id (optional)",
      "  --stock-location-id <uuid>    재고 예약 location id",
      "  --shipping-method-id <uuid>   shipping method id",
      "  --shipping-zone-id <uuid>     shipping zone id",
      "  --shipping-profile-id <uuid>  shipping profile id (optional)",
      "  --quantity <num>              주문 수량 (default: 1)",
      "  --shipping-amount <num>       주문 생성 시 배송비 (default: 0)",
      "  --expected-shipping-fee <num> shipping quote 기대 금액 (optional)",
      "  --json                        JSON 출력",
      "  --out <path>                  결과 파일 저장",
      "  --help, -h                    도움말",
      "",
      "Environment:",
      "  LUCENT_BASE_URL, LUCENT_USER_TOKEN, LUCENT_ADMIN_TOKEN",
      "  LUCENT_VARIANT_ID, LUCENT_DIGITAL_VARIANT_ID",
      "  LUCENT_STOCK_LOCATION_ID, LUCENT_SHIPPING_METHOD_ID, LUCENT_SHIPPING_ZONE_ID, LUCENT_SHIPPING_PROFILE_ID",
      "",
      "Note:",
      "  --digital-variant-id가 없으면 디지털 entitlement 경로 검증은 skip됩니다.",
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
    "http://127.0.0.1:3001";
  const userToken =
    readArg("--user-token") || process.env.LUCENT_USER_TOKEN || null;
  const adminTokenRaw =
    readArg("--admin-token") || process.env.LUCENT_ADMIN_TOKEN || null;
  const variantId =
    readArg("--variant-id") || process.env.LUCENT_VARIANT_ID || null;
  const digitalVariantId =
    readArg("--digital-variant-id") ||
    process.env.LUCENT_DIGITAL_VARIANT_ID ||
    null;
  const stockLocationId =
    readArg("--stock-location-id") ||
    process.env.LUCENT_STOCK_LOCATION_ID ||
    null;
  const shippingMethodId =
    readArg("--shipping-method-id") ||
    process.env.LUCENT_SHIPPING_METHOD_ID ||
    null;
  const shippingZoneId =
    readArg("--shipping-zone-id") ||
    process.env.LUCENT_SHIPPING_ZONE_ID ||
    null;
  const shippingProfileId =
    readArg("--shipping-profile-id") ||
    process.env.LUCENT_SHIPPING_PROFILE_ID ||
    null;
  const quantityRaw = readArg("--quantity") || "1";
  const shippingAmountRaw = readArg("--shipping-amount") || "0";
  const expectedShippingFeeRaw = readArg("--expected-shipping-fee");
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
  let expectedShippingFee: number | null = null;
  if (expectedShippingFeeRaw) {
    const parsedExpected = Number.parseInt(expectedShippingFeeRaw, 10);
    if (!Number.isInteger(parsedExpected) || parsedExpected < 0) {
      throw new Error(
        `Invalid --expected-shipping-fee value: ${expectedShippingFeeRaw}`,
      );
    }
    expectedShippingFee = parsedExpected;
  }

  const trimText = (value: string | null): string | null =>
    value && value.trim().length > 0 ? value.trim() : null;
  const normalizedAdminToken = trimText(adminTokenRaw) || trimText(userToken);

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    userToken: trimText(userToken),
    adminToken: normalizedAdminToken,
    variantId: trimText(variantId),
    digitalVariantId: trimText(digitalVariantId),
    stockLocationId: trimText(stockLocationId),
    shippingMethodId: trimText(shippingMethodId),
    shippingZoneId: trimText(shippingZoneId),
    shippingProfileId: trimText(shippingProfileId),
    quantity,
    shippingAmount,
    expectedShippingFee,
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
    "# V2 05 자동 검증 리포트",
    "",
    `- generated_at: ${result.generated_at}`,
    `- base_url: ${result.base_url}`,
    `- created_order_id: ${result.created_order_id || "-"}`,
    `- created_reservation_id: ${result.created_reservation_id || "-"}`,
    `- created_shipment_id: ${result.created_shipment_id || "-"}`,
    `- created_entitlement_id: ${result.created_entitlement_id || "-"}`,
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
  let createdReservationId: string | null = null;
  let createdShipmentId: string | null = null;
  let createdEntitlementId: string | null = null;

  if (!args.userToken) {
    checks.push({
      key: "user_auth_ready",
      passed: false,
      detail: "LUCENT_USER_TOKEN(또는 --user-token)이 필요합니다.",
    });
    return {
      generated_at: new Date().toISOString(),
      base_url: args.baseUrl,
      checks,
      summary: {
        passed: 0,
        failed: checks.length,
      },
      created_order_id: null,
      created_reservation_id: null,
      created_shipment_id: null,
      created_entitlement_id: null,
    };
  }

  const adminToken = args.adminToken;
  if (!adminToken) {
    checks.push({
      key: "admin_auth_ready",
      passed: false,
      detail:
        "관리자 API 호출을 위해 admin token이 필요합니다. (--admin-token 또는 LUCENT_ADMIN_TOKEN)",
    });
  }

  const requiredFixtureFields: Array<[string, string | null]> = [
    ["variant_id", args.variantId],
    ["stock_location_id", args.stockLocationId],
    ["shipping_method_id", args.shippingMethodId],
    ["shipping_zone_id", args.shippingZoneId],
  ];
  for (const [key, value] of requiredFixtureFields) {
    checks.push({
      key: `fixture_${key}`,
      passed: Boolean(value),
      detail: value ? `${key}=${value}` : `${key}가 필요합니다.`,
    });
  }

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

  if (args.variantId) {
    try {
      await fetchApi(args.baseUrl, "/api/v2/checkout/cart/items", args.userToken, {
        method: "POST",
        body: JSON.stringify({
          variant_id: args.variantId,
          quantity: args.quantity,
        }),
      });
      checks.push({
        key: "cart_add_item_physical",
        passed: true,
        detail: `variant_id=${args.variantId}, quantity=${args.quantity}`,
      });
    } catch (error) {
      checks.push({
        key: "cart_add_item_physical",
        passed: false,
        detail: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  if (args.digitalVariantId) {
    try {
      await fetchApi(args.baseUrl, "/api/v2/checkout/cart/items", args.userToken, {
        method: "POST",
        body: JSON.stringify({
          variant_id: args.digitalVariantId,
          quantity: 1,
        }),
      });
      checks.push({
        key: "cart_add_item_digital",
        passed: true,
        detail: `digital_variant_id=${args.digitalVariantId}`,
      });
    } catch (error) {
      checks.push({
        key: "cart_add_item_digital",
        passed: false,
        detail: error instanceof Error ? error.message : "unknown error",
      });
    }
  } else {
    checks.push({
      key: "cart_add_item_digital",
      passed: true,
      detail: "digital variant 미지정으로 skip",
    });
  }

  try {
    await fetchApi(args.baseUrl, "/api/v2/checkout/validate", args.userToken, {
      method: "POST",
      body: JSON.stringify({
        shipping_amount: args.shippingAmount,
      }),
    });
    checks.push({
      key: "checkout_validate",
      passed: true,
      detail: `shipping_amount=${args.shippingAmount}`,
    });
  } catch (error) {
    checks.push({
      key: "checkout_validate",
      passed: false,
      detail: error instanceof Error ? error.message : "unknown error",
    });
  }

  const idempotencyKey = `VERIFY05-${Date.now().toString(36).toUpperCase()}`;
  try {
    const orderCreate = await fetchApi<{
      idempotent_replayed: boolean;
      order: { id: string };
    }>(args.baseUrl, "/api/v2/checkout/orders", args.userToken, {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        shipping_amount: args.shippingAmount,
      }),
    });
    createdOrderId = orderCreate.order.id;
    checks.push({
      key: "order_create",
      passed: !orderCreate.idempotent_replayed && Boolean(createdOrderId),
      detail: `order_id=${createdOrderId}, replay=${orderCreate.idempotent_replayed}`,
    });
  } catch (error) {
    checks.push({
      key: "order_create",
      passed: false,
      detail: error instanceof Error ? error.message : "unknown error",
    });
  }

  if (!createdOrderId || !adminToken) {
    checks.push({
      key: "fulfillment_admin_flow",
      passed: false,
      detail: "order_id 또는 admin token이 없어 fulfillment 검증을 진행하지 못했습니다.",
    });
  } else if (
    !args.stockLocationId ||
    !args.shippingMethodId ||
    !args.shippingZoneId
  ) {
    checks.push({
      key: "fulfillment_admin_flow",
      passed: false,
      detail: "stock_location_id / shipping_method_id / shipping_zone_id가 필요합니다.",
    });
  } else {
    let hasDigitalLine = false;

    try {
      const orderDetail = await fetchApi<{
        id: string;
        grand_total: number;
        items?: Array<{
          id: string;
          fulfillment_type_snapshot?: string | null;
          requires_shipping_snapshot?: boolean | null;
        }>;
      }>(
        args.baseUrl,
        `/api/v2/checkout/orders/${createdOrderId}`,
        args.userToken,
      );

      const items = Array.isArray(orderDetail.items) ? orderDetail.items : [];
      hasDigitalLine = items.some(
        (item) =>
          item.fulfillment_type_snapshot === "DIGITAL" ||
          item.requires_shipping_snapshot === false,
      );

      const plan = await fetchApi<{
        groups: Array<{ id: string; kind: string }>;
      }>(args.baseUrl, "/api/v2/fulfillment/admin/plans/generate", adminToken, {
        method: "POST",
        body: JSON.stringify({
          order_id: createdOrderId,
          stock_location_id: args.stockLocationId,
          shipping_profile_id: args.shippingProfileId,
          shipping_method_id: args.shippingMethodId,
          shipping_zone_id: args.shippingZoneId,
          metadata: {
            source: "verify-05",
          },
        }),
      });

      const kinds = (plan.groups || []).map((group) => group.kind);
      checks.push({
        key: "fulfillment_plan_generate",
        passed:
          kinds.includes("SHIPMENT") &&
          (!hasDigitalLine || kinds.includes("DIGITAL")),
        detail: `group_kinds=${kinds.join(",") || "-"}`,
      });

      const quote = await fetchApi<{
        amount: number;
        matched_rule?: { id?: string; amount?: number } | null;
      }>(args.baseUrl, "/api/v2/fulfillment/admin/shipping/quote", adminToken, {
        method: "POST",
        body: JSON.stringify({
          shipping_profile_id: args.shippingProfileId,
          shipping_method_id: args.shippingMethodId,
          shipping_zone_id: args.shippingZoneId,
          order_amount: orderDetail.grand_total || 0,
          item_count: items.length,
          currency_code: "KRW",
        }),
      });

      const feeMatch =
        args.expectedShippingFee === null
          ? quote.amount >= 0
          : quote.amount === args.expectedShippingFee;
      checks.push({
        key: "shipping_quote",
        passed: feeMatch,
        detail: `amount=${quote.amount}, expected=${args.expectedShippingFee ?? ">=0"}, rule_id=${quote.matched_rule?.id || "-"}`,
      });

      const cutoverPolicy = await fetchApi<{
        write_enabled: boolean;
        shipment_write_enabled: boolean;
        digital_write_enabled: boolean;
        allowed_channels: string[];
        allowed_variant_ids: string[];
      }>(args.baseUrl, "/api/v2/fulfillment/admin/cutover-policy", adminToken);
      checks.push({
        key: "cutover_policy_read",
        passed:
          cutoverPolicy.write_enabled &&
          cutoverPolicy.shipment_write_enabled &&
          cutoverPolicy.digital_write_enabled,
        detail: `write=${cutoverPolicy.write_enabled}, shipment=${cutoverPolicy.shipment_write_enabled}, digital=${cutoverPolicy.digital_write_enabled}`,
      });

      const cutoverCheck = await fetchApi<{
        eligible: boolean;
        reasons?: string[];
      }>(args.baseUrl, "/api/v2/fulfillment/admin/cutover-policy/check", adminToken, {
        method: "POST",
        body: JSON.stringify({
          order_id: createdOrderId,
          reserve_inventory: true,
          grant_entitlement: true,
        }),
      });
      checks.push({
        key: "cutover_policy_check",
        passed: cutoverCheck.eligible,
        detail: cutoverCheck.eligible
          ? "eligible=true"
          : `eligible=false reasons=${(cutoverCheck.reasons || []).join(";")}`,
      });

      const orchestrate = await fetchApi<{
        created: {
          fulfillments: number;
          shipments: number;
          reservations: number;
          entitlements: number;
        };
        group_results?: Array<{
          group_id: string;
          kind: string;
          shipment_id?: string | null;
          reservation_ids?: string[];
          entitlement_ids?: string[];
        }>;
      }>(args.baseUrl, "/api/v2/fulfillment/admin/orchestrate", adminToken, {
        method: "POST",
        body: JSON.stringify({
          order_id: createdOrderId,
          stock_location_id: args.stockLocationId,
          shipping_profile_id: args.shippingProfileId,
          shipping_method_id: args.shippingMethodId,
          shipping_zone_id: args.shippingZoneId,
          reserve_inventory: true,
          grant_entitlement: true,
          metadata: {
            source: "verify-05",
          },
        }),
      });

      checks.push({
        key: "mixed_orchestrator",
        passed: (orchestrate.created?.fulfillments || 0) >= 1,
        detail: `created=${JSON.stringify(orchestrate.created || {})}`,
      });

      const groupResults = Array.isArray(orchestrate.group_results)
        ? orchestrate.group_results
        : [];
      const shipmentResult = groupResults.find(
        (group) => group.kind === "SHIPMENT" && group.shipment_id,
      );
      const digitalResult = groupResults.find((group) => group.kind === "DIGITAL");
      const reservationId =
        shipmentResult?.reservation_ids && shipmentResult.reservation_ids.length > 0
          ? shipmentResult.reservation_ids[0]
          : null;
      const entitlementId =
        digitalResult?.entitlement_ids && digitalResult.entitlement_ids.length > 0
          ? digitalResult.entitlement_ids[0]
          : null;

      createdShipmentId = shipmentResult?.shipment_id || null;
      createdReservationId = reservationId;
      createdEntitlementId = entitlementId;

      if (createdShipmentId) {
        try {
          const packed = await fetchApi<{ shipment: { status: string } }>(
            args.baseUrl,
            `/api/v2/fulfillment/admin/shipments/${createdShipmentId}/pack`,
            adminToken,
            { method: "POST", body: JSON.stringify({}) },
          );
          const registered = await fetchApi<{ shipment: { status: string } }>(
            args.baseUrl,
            `/api/v2/fulfillment/admin/shipments/${createdShipmentId}/register-tracking`,
            adminToken,
            {
              method: "POST",
              body: JSON.stringify({
                tracking_no: `VERIFY05-${Date.now().toString(36).toUpperCase()}`,
                carrier: "VERIFY",
                service_level: "STANDARD",
              }),
            },
          );
          const dispatched = await fetchApi<{ shipment: { status: string } }>(
            args.baseUrl,
            `/api/v2/fulfillment/admin/shipments/${createdShipmentId}/dispatch`,
            adminToken,
            { method: "POST", body: JSON.stringify({}) },
          );
          const delivered = await fetchApi<{ shipment: { status: string } }>(
            args.baseUrl,
            `/api/v2/fulfillment/admin/shipments/${createdShipmentId}/deliver`,
            adminToken,
            { method: "POST", body: JSON.stringify({}) },
          );

          checks.push({
            key: "shipment_lifecycle",
            passed:
              packed.shipment.status === "PACKING" &&
              (registered.shipment.status === "PACKING" ||
                registered.shipment.status === "SHIPPED") &&
              dispatched.shipment.status === "SHIPPED" &&
              delivered.shipment.status === "DELIVERED",
            detail: `packed=${packed.shipment.status}, registered=${registered.shipment.status}, dispatched=${dispatched.shipment.status}, delivered=${delivered.shipment.status}`,
          });
        } catch (error) {
          checks.push({
            key: "shipment_lifecycle",
            passed: false,
            detail: error instanceof Error ? error.message : "unknown error",
          });
        }
      } else {
        checks.push({
          key: "shipment_lifecycle",
          passed: false,
          detail: "shipment_id를 확보하지 못했습니다.",
        });
      }

      if (createdReservationId) {
        try {
          const before = await fetchApi<{ status: string }>(
            args.baseUrl,
            `/api/v2/fulfillment/admin/inventory/reservations/${createdReservationId}`,
            adminToken,
          );
          await fetchApi(
            args.baseUrl,
            `/api/v2/fulfillment/admin/inventory/reservations/${createdReservationId}/consume`,
            adminToken,
            {
              method: "POST",
              body: JSON.stringify({
                idempotency_key: `VERIFY05-CONSUME-${Date.now().toString(36).toUpperCase()}`,
              }),
            },
          );
          const after = await fetchApi<{ status: string }>(
            args.baseUrl,
            `/api/v2/fulfillment/admin/inventory/reservations/${createdReservationId}`,
            adminToken,
          );

          checks.push({
            key: "reservation_lifecycle",
            passed: before.status === "ACTIVE" && after.status === "CONSUMED",
            detail: `before=${before.status}, after=${after.status}`,
          });
        } catch (error) {
          checks.push({
            key: "reservation_lifecycle",
            passed: false,
            detail: error instanceof Error ? error.message : "unknown error",
          });
        }
      } else {
        checks.push({
          key: "reservation_lifecycle",
          passed: false,
          detail: "reservation_id를 확보하지 못했습니다.",
        });
      }

      if (!hasDigitalLine) {
        checks.push({
          key: "entitlement_lifecycle",
          passed: true,
          detail: "디지털 라인이 없어 skip",
        });
      } else if (!createdEntitlementId) {
        checks.push({
          key: "entitlement_lifecycle",
          passed: false,
          detail: "디지털 라인이 있는데 entitlement_id를 확보하지 못했습니다.",
        });
      } else {
        try {
          const before = await fetchApi<{ status: string }>(
            args.baseUrl,
            `/api/v2/fulfillment/admin/entitlements/${createdEntitlementId}`,
            adminToken,
          );
          await fetchApi(
            args.baseUrl,
            `/api/v2/fulfillment/admin/entitlements/${createdEntitlementId}/download-log`,
            adminToken,
            { method: "POST", body: JSON.stringify({}) },
          );
          await fetchApi(
            args.baseUrl,
            `/api/v2/fulfillment/admin/entitlements/${createdEntitlementId}/reissue`,
            adminToken,
            {
              method: "POST",
              body: JSON.stringify({
                token_reference: `REISSUE-${Date.now().toString(36).toUpperCase()}`,
              }),
            },
          );
          await fetchApi(
            args.baseUrl,
            `/api/v2/fulfillment/admin/entitlements/${createdEntitlementId}/revoke`,
            adminToken,
            {
              method: "POST",
              body: JSON.stringify({
                reason: "VERIFY05_END",
              }),
            },
          );
          const after = await fetchApi<{ status: string }>(
            args.baseUrl,
            `/api/v2/fulfillment/admin/entitlements/${createdEntitlementId}`,
            adminToken,
          );

          checks.push({
            key: "entitlement_lifecycle",
            passed: before.status === "GRANTED" && after.status === "REVOKED",
            detail: `before=${before.status}, after=${after.status}`,
          });
        } catch (error) {
          checks.push({
            key: "entitlement_lifecycle",
            passed: false,
            detail: error instanceof Error ? error.message : "unknown error",
          });
        }
      }

      const queueSummary = await fetchApi<{
        summary: {
          pending_group_count: number;
          shipment_queue_count: number;
          entitlement_queue_count: number;
        };
      }>(args.baseUrl, "/api/v2/fulfillment/admin/ops/queue-summary?limit=10", adminToken);
      checks.push({
        key: "ops_queue_summary",
        passed:
          typeof queueSummary.summary?.pending_group_count === "number" &&
          typeof queueSummary.summary?.shipment_queue_count === "number" &&
          typeof queueSummary.summary?.entitlement_queue_count === "number",
        detail: `pending_groups=${queueSummary.summary?.pending_group_count ?? "-"}, shipment_queue=${queueSummary.summary?.shipment_queue_count ?? "-"}, entitlement_queue=${queueSummary.summary?.entitlement_queue_count ?? "-"}`,
      });

      const inventoryHealth = await fetchApi<{
        summary: {
          mismatch_count: number;
          low_stock_count: number;
        };
      }>(args.baseUrl, "/api/v2/fulfillment/admin/ops/inventory-health?limit=10", adminToken);
      checks.push({
        key: "ops_inventory_health",
        passed:
          typeof inventoryHealth.summary?.mismatch_count === "number" &&
          typeof inventoryHealth.summary?.low_stock_count === "number",
        detail: `mismatch=${inventoryHealth.summary?.mismatch_count ?? "-"}, low_stock=${inventoryHealth.summary?.low_stock_count ?? "-"}`,
      });
    } catch (error) {
      checks.push({
        key: "fulfillment_admin_flow",
        passed: false,
        detail: error instanceof Error ? error.message : "unknown error",
      });
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
    created_reservation_id: createdReservationId,
    created_shipment_id: createdShipmentId,
    created_entitlement_id: createdEntitlementId,
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
    console.error(`[v2-verify-05] ${error.message}`);
  } else {
    console.error("[v2-verify-05] Unknown error");
  }
  process.exit(1);
});
