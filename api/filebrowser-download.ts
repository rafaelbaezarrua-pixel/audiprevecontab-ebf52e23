import type { VercelRequest, VercelResponse } from "@vercel/node";
import { proxyFileBrowserRequest } from "./_filebrowser";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = typeof req.query.path === "string" ? req.query.path : "";
  const safePath = path.startsWith("/") ? path : `/${path}`;
  await proxyFileBrowserRequest(req, res, `/api/raw${safePath}`, {
    allowRaw: true,
    forceInline: true,
  });
}
