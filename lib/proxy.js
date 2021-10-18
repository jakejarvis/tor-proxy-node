import express from "express";
import compression from "compression";
import { createProxyMiddleware, responseInterceptor } from "http-proxy-middleware";
import logger from "./logger.js";

const startProxy = async (options) => {
  const app = express();

  // configure proxy middleware
  const clearnetProxy = createProxyMiddleware({
    target: options.origin,

    // ensure origin knows we're looking for the clearnet domain
    changeOrigin: true,

    headers: {
      // ask nicely for an uncompressed response (server might not accomodate)
      "accept-encoding": "identity",
    },

    autoRewrite: true,
    followRedirects: true,
    logLevel: "error",

    // IMPORTANT: avoid res.end() being called automatically,
    // res.end() will be called internally by responseInterceptor() below
    selfHandleResponse: true,

    // intercept response to modify headers and replace clearnet URLs
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
      // remove unwanted clearnet headers
      [
        "onion-location",
        "accept-ranges",
        "connection",
        "content-encoding",
        "content-length",
        "etag",
        "server",
        "transfer-encoding",
        "vary",
        ...options.removeHeaders,
      ].forEach((header) => res.removeHeader(header));

      // add/overwrite new tor-only headers
      Object.keys(options.addHeaders).forEach((header) => res.setHeader(header, options.addHeaders[header]));

      // replace clearnet domain with onion domain in bodies
      const type = proxyRes.headers["content-type"] || proxyRes.headers["Content-Type"];
      if (type.startsWith("text/") ||
          type.startsWith("application/javascript") ||
          type.startsWith("application/xml") ||
          type.startsWith("application/atom") ||
          type.startsWith("application/json") ||
          type.startsWith("application/manifest")) {
        const response = responseBuffer.toString("utf8"); // convert buffer to string
        return response.replaceAll(options.origin, options.onionDomain);
      } else {
        // don't touch non-text files at all (this messed up images/fonts/other binary files)
        return responseBuffer;
      }
    }),
  });

  // don't send X-Powered-By: Express for "security" reasons
  app.disable("x-powered-by");

  app.use(compression()); // enable gzip responses
  app.use("/", clearnetProxy);
  app.listen(options.port);

  logger.info(`Local web server is now listening on port ${options.port}`);
  logger.info(`Proxying http://127.0.0.1:${options.port} -> ${options.origin}`);
};

export { startProxy };
