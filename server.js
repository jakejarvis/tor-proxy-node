import getPort from "get-port";
import { startTor } from "./lib/tor.js";
import { startProxy } from "./lib/proxy.js";

(async () => {
  const httpPort = await getPort();
  const onionDomain = "http://jarvis2i2vp4j4tbxjogsnqdemnte5xhzyi7hziiyzxwge3hzmh57zad.onion";

  startProxy({
    port: httpPort,

    // base URL to proxy to
    origin: "https://jarv.is",

    // optionally set to "" for all relative URIs
    onionDomain: onionDomain,

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
      "x-got-milk",
    ],
  });

  startTor({
    port: httpPort,

    // config option 1:
    // serviceDir: "/var/lib/tor/my_hidden_service",

    // config option 2:
    hostname: onionDomain,
    pubKey: "asdf",
    privKey: "1234",
  });
})();
