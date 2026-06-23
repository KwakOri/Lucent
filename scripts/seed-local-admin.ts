import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import type { Database } from "../types/database";

type SeedArgs = {
  email: string;
  password: string;
  roleCode: string;
};

type LocalSupabaseEnv = {
  apiUrl: string;
  serviceRoleKey: string;
};

type LocalSupabaseClient = SupabaseClient<Database>;

const DEFAULT_EMAIL = "admin@admin.com";
const DEFAULT_PASSWORD = "admin123";
const DEFAULT_ROLE_CODE = "SUPER_ADMIN";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");

function printHelp(): void {
  console.log(
    [
      "Local admin seed",
      "",
      "Usage:",
      "  npm run ops:v2-seed-admin:local",
      "  npx tsx scripts/seed-local-admin.ts [options]",
      "",
      "Options:",
      "  --email <email>         Admin email (default: admin@admin.com)",
      "  --password <password>   Admin password (default: admin123)",
      "  --role-code <code>      Admin role code (default: SUPER_ADMIN)",
      "  --help, -h              Show help",
      "",
      "Environment overrides:",
      "  LUCENT_LOCAL_ADMIN_EMAIL",
      "  LUCENT_LOCAL_ADMIN_PASSWORD",
      "  LUCENT_LOCAL_ADMIN_ROLE_CODE",
      "",
      "Safety:",
      "  This script only runs against localhost/127.0.0.1 Supabase URLs.",
    ].join("\n"),
  );
}

function readArg(argv: string[], key: string): string | undefined {
  const index = argv.indexOf(key);
  if (index < 0) {
    return undefined;
  }
  return argv[index + 1];
}

function parseArgs(argv: string[]): SeedArgs {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const email = (
    readArg(argv, "--email") ||
    process.env.LUCENT_LOCAL_ADMIN_EMAIL ||
    DEFAULT_EMAIL
  )
    .trim()
    .toLowerCase();
  const password =
    readArg(argv, "--password") ||
    process.env.LUCENT_LOCAL_ADMIN_PASSWORD ||
    DEFAULT_PASSWORD;
  const roleCode = (
    readArg(argv, "--role-code") ||
    process.env.LUCENT_LOCAL_ADMIN_ROLE_CODE ||
    DEFAULT_ROLE_CODE
  )
    .trim()
    .toUpperCase();

  if (!email || !email.includes("@")) {
    throw new Error(`Invalid admin email: ${email || "(empty)"}`);
  }
  if (password.length < 6) {
    throw new Error("Admin password must be at least 6 characters.");
  }
  if (!roleCode) {
    throw new Error("Admin role code is required.");
  }

  return { email, password, roleCode };
}

function parseEnvOutput(raw: string): Record<string, string> {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line) => {
      const match = /^([A-Z_]+)=(.*)$/.exec(line);
      if (!match) {
        return acc;
      }
      acc[match[1]] = match[2].replace(/^"|"$/g, "");
      return acc;
    }, {});
}

function readSupabaseStatusEnv(): Record<string, string> {
  try {
    const raw = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return parseEnvOutput(raw);
  } catch {
    return {};
  }
}

function assertLocalSupabaseUrl(apiUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(apiUrl);
  } catch {
    throw new Error(`Invalid Supabase URL: ${apiUrl}`);
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!localHosts.has(parsed.hostname)) {
    throw new Error(
      `Refusing to seed admin against non-local Supabase URL: ${apiUrl}`,
    );
  }
}

function loadLocalSupabaseEnv(): LocalSupabaseEnv {
  const statusEnv = readSupabaseStatusEnv();
  const apiUrl =
    statusEnv.API_URL ||
    process.env.LOCAL_SUPABASE_API_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const serviceRoleKey =
    statusEnv.SERVICE_ROLE_KEY ||
    process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "";

  if (!apiUrl || !serviceRoleKey) {
    throw new Error(
      "Local Supabase env not found. Run `npm run dev:v2-local:db:start` first.",
    );
  }

  assertLocalSupabaseUrl(apiUrl);
  return { apiUrl, serviceRoleKey };
}

async function findUserByEmail(
  client: LocalSupabaseClient,
  email: string,
): Promise<User | null> {
  const perPage = 100;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      throw error;
    }

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );
    if (found) {
      return found;
    }
    if (data.users.length < perPage) {
      return null;
    }
  }

  throw new Error("Too many local users. Narrow the seed target manually.");
}

async function ensureAuthUser(
  client: LocalSupabaseClient,
  args: SeedArgs,
): Promise<User> {
  const existing = await findUserByEmail(client, args.email);
  const metadata = {
    fixture: "seed-local-admin",
    name: "Local Admin",
  };

  if (existing) {
    const { data, error } = await client.auth.admin.updateUserById(existing.id, {
      password: args.password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        ...metadata,
      },
      app_metadata: {
        ...(existing.app_metadata || {}),
        provider: existing.app_metadata?.provider || "email",
        providers: existing.app_metadata?.providers || ["email"],
      },
    });
    if (error) {
      throw error;
    }
    return data.user;
  }

  const { data, error } = await client.auth.admin.createUser({
    email: args.email,
    password: args.password,
    email_confirm: true,
    user_metadata: metadata,
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
  });

  if (error) {
    throw error;
  }
  return data.user;
}

async function ensureProfile(
  client: LocalSupabaseClient,
  user: User,
  email: string,
): Promise<void> {
  const { error } = await client.from("profiles").upsert(
    {
      id: user.id,
      email,
      name: "Local Admin",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    throw error;
  }
}

async function ensureAdminRole(
  client: LocalSupabaseClient,
  user: User,
  roleCode: string,
): Promise<string> {
  const { data: role, error: roleError } = await client
    .from("v2_admin_roles")
    .select("id, code")
    .eq("code", roleCode)
    .eq("is_active", true)
    .maybeSingle();
  if (roleError) {
    throw roleError;
  }
  if (!role?.id) {
    throw new Error(
      `Admin role not found: ${roleCode}. Run local migrations/db reset first.`,
    );
  }

  const { data: existing, error: existingError } = await client
    .from("v2_admin_user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role_id", role.id)
    .eq("scope_type", "GLOBAL")
    .is("scope_id", null)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (existingError) {
    throw existingError;
  }

  const assignment = {
    user_id: user.id,
    role_id: role.id,
    scope_type: "GLOBAL",
    scope_id: null,
    status: "ACTIVE",
    expires_at: null,
    assigned_by: user.id,
    assigned_reason: "Local admin seed",
    metadata: { fixture: "seed-local-admin" },
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await client
      .from("v2_admin_user_roles")
      .update(assignment)
      .eq("id", existing.id);
    if (error) {
      throw error;
    }
    return existing.id;
  }

  const { data: inserted, error } = await client
    .from("v2_admin_user_roles")
    .insert(assignment)
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  return inserted.id;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const env = loadLocalSupabaseEnv();
  const client = createClient<Database>(env.apiUrl, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const user = await ensureAuthUser(client, args);
  await ensureProfile(client, user, args.email);
  const assignmentId = await ensureAdminRole(client, user, args.roleCode);

  console.log(`[seed-local-admin] Supabase: ${env.apiUrl}`);
  console.log(`[seed-local-admin] Admin user: ${args.email}`);
  console.log(`[seed-local-admin] User id: ${user.id}`);
  console.log(`[seed-local-admin] Role: ${args.roleCode}`);
  console.log(`[seed-local-admin] Role assignment id: ${assignmentId}`);
  console.log("[seed-local-admin] Done.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[seed-local-admin] Failed: ${message}`);
  process.exit(1);
});
