import { NextRequest } from "next/server";
import { proxyBackendRequest } from "@/lib/server/utils/backend-proxy";

export async function POST(request: NextRequest) {
  return proxyBackendRequest(request, {
    path: "/api/profiles/me/phone-verification/request",
  });
}
