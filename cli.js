#!/usr/bin/env node
import { packageConfig } from "pkg-conf";
import server from "./server.js";

(async () => {
  const config = await packageConfig("torProxy");

  server(config);
})();
