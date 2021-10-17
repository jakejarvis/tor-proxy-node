import { packageConfig } from "pkg-conf";
import getPort from "get-port";
import { startTor } from "./lib/tor.js";
import { startProxy } from "./lib/proxy.js";
import logger from "./lib/logger.js";

(async () => {
  const config = await packageConfig("torProxy");
  const httpPort = config.localPort || await getPort();

  const { hostname } = await startTor({
    binary: config.binary || "tor",
    port: httpPort,
    serviceDir: config.serviceDir,

    // enables HiddenServiceNonAnonymousMode & HiddenServiceSingleHopMode, much faster
    nonAnonymous: config.nonAnonymous === true,
  });

  startProxy({
    port: httpPort,

    // base URL to proxy to
    origin: config.proxyDomain,

    // optionally set to "" for all relative URIs
    onionDomain: `http://${hostname}`,

    // tor-only headers to add
    addHeaders: config.addHeaders || {},

    // clearnet headers to remove from response (some may be automatically reset)
    removeHeaders: config.removeHeaders || [],
  });

  logger.success(`[TOR] Tor service will be live at: http://${hostname}`);
})();
