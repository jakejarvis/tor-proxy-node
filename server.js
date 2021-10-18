import getPort from "get-port";
import { startTor } from "./lib/tor.js";
import { startProxy } from "./lib/proxy.js";
import logger from "./lib/logger.js";

const server = async (config) => {
  const httpPort = config.localPort || await getPort();

  const tor = await startTor({
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
    onionDomain: `http://${tor.hostname}`,

    // tor-only headers to add/overwrite
    addHeaders: config.addHeaders || {},

    // clearnet headers to remove from response (some may be automatically reset)
    removeHeaders: config.removeHeaders || [],
  });

  logger.success(`Tor service will be live at: http://${tor.hostname}`);
};

export default server;
