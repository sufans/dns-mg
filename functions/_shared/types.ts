export interface Env {
  DB: D1Database;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD_HASH: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  SEND_EMAIL_DOMAIN: string;
}

export type PagesFunction<
  EnvType = Env,
  Params extends string = string,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = (
  context: EventContext<EnvType, Params, Data>,
) => Response | Promise<Response>;

export type EventContext<
  EnvType = Env,
  Params extends string = string,
  Data extends Record<string, unknown> = Record<string, unknown>,
> = {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: EnvType & {
    ASSETS: {
      fetch: typeof fetch;
    };
  };
  params: Record<Params, string>;
  data: Data;
};

export type AuthenticatedEventContext = EventContext<Env, string, { user: { sub: string } }>;
