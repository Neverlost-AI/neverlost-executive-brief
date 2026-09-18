import worker from "./server/index.js";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

// Build Output API Node request/response adapter for the compiled Vinext worker.
export default async function serve(request, response) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  const protocol = headers.get("x-forwarded-proto") || "https";
  const host = headers.get("x-forwarded-host") || headers.get("host");
  const url = new URL(request.url, `${protocol}://${host}`);
  const init = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = Readable.toWeb(request);
    init.duplex = "half";
  }
  const result = await worker.fetch(new Request(url, init), {}, undefined);
  response.statusCode = result.status;
  result.headers.forEach((value, name) => {
    if (name !== "set-cookie") response.setHeader(name, value);
  });
  const cookies = result.headers.getSetCookie();
  if (cookies.length) response.setHeader("set-cookie", cookies);
  if (!result.body || request.method === "HEAD") response.end();
  else await pipeline(Readable.fromWeb(result.body), response);
}
