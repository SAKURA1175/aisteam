import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function buildUpstreamUrl(request: NextRequest, path: string[]) {
  const backendOrigin =
    process.env.EGGSHELL_API_ORIGIN ?? process.env.TUTORMARKET_API_ORIGIN ?? "http://127.0.0.1:8080";
  const normalizedOrigin = backendOrigin.endsWith("/") ? backendOrigin.slice(0, -1) : backendOrigin;
  const requestUrl = new URL(request.url);
  const pathname = path.join("/");
  return `${normalizedOrigin}/${pathname}${requestUrl.search}`;
}

function buildUpstreamHeaders(request: NextRequest) {
  const headers = new Headers();

  for (const [key, value] of request.headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  const requestUrl = new URL(request.url);
  headers.set("x-forwarded-host", request.headers.get("host") ?? requestUrl.host);
  headers.set("x-forwarded-proto", requestUrl.protocol.replace(":", ""));

  return headers;
}

function buildResponseHeaders(upstreamHeaders: Headers) {
  const headers = new Headers();

  for (const [key, value] of upstreamHeaders.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }

  return headers;
}

async function buildUpstreamBody(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (
    contentType.includes("application/json") ||
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.startsWith("text/")
  ) {
    return await request.text();
  }

  const arrayBuffer = await request.arrayBuffer();
  return arrayBuffer.byteLength > 0 ? Buffer.from(arrayBuffer) : undefined;
}

async function proxy(request: NextRequest, context: RouteContext) {
  const resolvedParams = await context.params;
  const upstreamUrl = buildUpstreamUrl(request, resolvedParams.path ?? []);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: buildUpstreamHeaders(request),
      body: await buildUpstreamBody(request),
      cache: "no-store",
      redirect: "manual"
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: buildResponseHeaders(upstreamResponse.headers)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown proxy error";
    return Response.json({ message: `Backend request failed: ${message}` }, { status: 502 });
  }
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
