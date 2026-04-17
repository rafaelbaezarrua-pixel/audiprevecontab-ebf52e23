import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as http from "http";
import * as https from "https";
import { URL } from "url";

const FB_URL = process.env.FILEBROWSER_URL;
const FB_USER = process.env.FILEBROWSER_USER;
const FB_PASS = process.env.FILEBROWSER_PASS;

const TOKEN_TTL_MS = 90 * 60 * 1000;
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

const json = (res: VercelResponse, status: number, body: Record<string, unknown>) => {
  res.status(status).json(body);
};

const ensureConfig = (res: VercelResponse): boolean => {
  if (!FB_URL || !FB_USER || !FB_PASS) {
    json(res, 500, { error: "Integração com FileBrowser não configurada." });
    return false;
  }

  return true;
};

const getHttpLib = (url: URL) => (url.protocol === "https:" ? https : http);

const readResponseBody = (response: http.IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    response.on("data", (chunk: Buffer) => chunks.push(chunk));
    response.on("end", () => resolve(Buffer.concat(chunks)));
    response.on("error", reject);
  });

const loginAndGetToken = async (): Promise<string> => {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  if (!FB_URL || !FB_USER || !FB_PASS) {
    throw new Error("FileBrowser não configurado");
  }

  const baseUrl = new URL(FB_URL);
  const loginUrl = new URL("/api/login", baseUrl);
  const payload = JSON.stringify({ username: FB_USER, password: FB_PASS });

  const token = await new Promise<string>((resolve, reject) => {
    const request = getHttpLib(loginUrl).request(
      loginUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload).toString(),
        },
      },
      async (response) => {
        try {
          const body = await readResponseBody(response);
          if ((response.statusCode || 500) >= 400) {
            reject(new Error("Falha ao autenticar no FileBrowser"));
            return;
          }

          resolve(body.toString("utf8"));
        } catch (error) {
          reject(error);
        }
      }
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });

  cachedToken = token;
  tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
  return token;
};

export const invalidateFileBrowserToken = () => {
  cachedToken = null;
  tokenExpiresAt = 0;
};

export const buildFileBrowserUrl = (targetPath: string): URL => {
  if (!FB_URL) {
    throw new Error("FileBrowser não configurado");
  }

  return new URL(targetPath, new URL(FB_URL));
};

export const assertAllowedTarget = (targetPath: string, allowRaw = false): boolean => {
  if (typeof targetPath !== "string" || !targetPath.startsWith("/api/")) {
    return false;
  }

  if (targetPath.startsWith("/api/resources")) {
    return true;
  }

  return allowRaw && targetPath.startsWith("/api/raw");
};

export const proxyFileBrowserRequest = async (
  req: VercelRequest,
  res: VercelResponse,
  targetPath: string,
  options?: { allowRaw?: boolean; forceInline?: boolean }
) => {
  if (!ensureConfig(res)) {
    return;
  }

  if (!assertAllowedTarget(targetPath, options?.allowRaw)) {
    json(res, 400, { error: "Destino do FileBrowser inválido." });
    return;
  }

  let token: string;
  try {
    token = await loginAndGetToken();
  } catch (error) {
    console.error("[FILEBROWSER] auth error:", error);
    json(res, 502, { error: "Falha ao autenticar no servidor de arquivos." });
    return;
  }

  const targetUrl = buildFileBrowserUrl(targetPath);

  const headers: Record<string, string> = {
    "X-Auth": token,
  };

  const forwardedContentType = req.headers["content-type"];
  const forwardedContentLength = req.headers["content-length"];

  if (typeof forwardedContentType === "string") {
    headers["Content-Type"] = forwardedContentType;
  }

  if (typeof forwardedContentLength === "string") {
    headers["Content-Length"] = forwardedContentLength;
  }

  const upstreamRequest = getHttpLib(targetUrl).request(
    targetUrl,
    {
      method: req.method,
      headers,
    },
    (upstreamResponse) => {
      const statusCode = upstreamResponse.statusCode || 500;

      if (statusCode === 401 || statusCode === 403) {
        invalidateFileBrowserToken();
      }

      res.statusCode = statusCode;

      Object.entries(upstreamResponse.headers).forEach(([key, value]) => {
        if (value === undefined) return;
        if (key.toLowerCase() === "transfer-encoding") return;
        if (options?.forceInline && key.toLowerCase() === "content-disposition") {
          res.setHeader("Content-Disposition", "inline");
          return;
        }
        res.setHeader(key, value as string | string[]);
      });

      upstreamResponse.pipe(res);
    }
  );

  upstreamRequest.on("error", (error) => {
    console.error("[FILEBROWSER] proxy error:", error);
    if (!res.headersSent) {
      json(res, 502, { error: "Falha na comunicação com o servidor de arquivos." });
    } else {
      res.end();
    }
  });

  if (req.method === "GET" || req.method === "HEAD") {
    upstreamRequest.end();
    return;
  }

  req.pipe(upstreamRequest);
};
