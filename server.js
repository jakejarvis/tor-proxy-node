import { packageConfig } from "pkg-conf";
import getPort from "get-port";
import { startTor } from "./lib/tor.js";
import { startProxy } from "./lib/proxy.js";

const start = async () => {
  const config = await packageConfig("torProxy");
  const httpPort = await getPort();

  const { hostname } = await startTor({
    port: httpPort,

    // optional, will create ephemeral service without:
    serviceDir: config.serviceDir,
  });
  console.log(hostname);

  startProxy({
    port: httpPort,

    // base URL to proxy to
    origin: config.proxyDomain,

    // optionally set to "" for all relative URIs
    onionDomain: `http://${hostname}`,

    // tor-only headers to add
    addHeaders: {
      "content-security-policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'",
      "referrer-policy": "no-referrer",
      "permissions-policy": "interest-cohort=()",
    },

    // clearnet headers to remove from response (some may be automatically reset)
    removeHeaders: [
      "onion-location",
      "content-security-policy",
      "feature-policy",
      "permissions-policy",
      "nel",
      "server",
      "report-to",
      "access-control-allow-origin",
      "access-control-allow-methods",
      "strict-transport-security",
      "x-content-type-options",
      "x-frame-options",
      "x-xss-protection",
      "referrer-policy",
      "vary",
      "accept-ranges",
      "connection",
      "cache-control",
      "content-length",
      "age",
      "date",
      "etag",
      "expires",
      "pragma",
      "x-nf-request-id",
      "x-vercel-cache",
      "x-vercel-id",
      "x-view-source",
    ],
  });
};

export default start;
