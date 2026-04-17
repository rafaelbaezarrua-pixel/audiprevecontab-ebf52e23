import type { VercelRequest, VercelResponse } from "@vercel/node";
import { proxyFileBrowserRequest } from "./_filebrowser";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const target = typeof req.query.target === "string" ? req.query.target : "";
  await proxyFileBrowserRequest(req, res, target, { allowRaw: false });
}
