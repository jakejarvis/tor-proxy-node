import express from "express";
import compression from "compression";
import { createProxyMiddleware, responseInterceptor } from "http-proxy-middleware";

const startProxy = async (options) => {
  options = {
    port: 8089,
    addHeaders: {},
    removeHeaders: [
      "Server",
    ],
    ...options,
  };

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

    // IMPORTANT: avoid res.end() being called automatically,
    // res.end() will be called internally by responseInterceptor() below
    selfHandleResponse: true,

    // response intercept to modify headers and replace clearnet URLs
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
      // remove unwanted clearnet headers
      options.removeHeaders.forEach((header) => res.removeHeader(header));

      // add new tor-only headers
      Object.keys(options.addHeaders).forEach((header) => res.setHeader(header, options.addHeaders[header]));

      // replace clearnet domain with onion domain in bodies
      const type = proxyRes.headers["content-type"] || proxyRes.headers["Content-Type"];
      if (type.startsWith("text/") || type.startsWith("application/javascript") || type.startsWith("application/xml") || type.startsWith("application/atom") || type.startsWith("application/json") || type.startsWith("application/manifest")) {
        const response = responseBuffer.toString("utf8"); // convert buffer to string
        return response.replaceAll(options.origin, options.onionDomain);
      } else {
        // don't touch non-text files at all (this messed up images/fonts/other binary files)
        return responseBuffer;
      }
    }),
  });

  app.use(compression()); // enable gzip responses
  app.use("/", clearnetProxy);
  app.listen(options.port);

  console.log(`[SERVER] Server listening on port ${options.port}`);
  console.log(`[SERVER] Open http://localhost:${options.port}/`);
};

export { startProxy };
