import fs from "fs";
import path from "path";
import { spawn, execFileSync } from "child_process";
import tempy from "tempy";
import chokidar from "chokidar";
import logger from "./logger.js";

const torVersion = (bin) => (execFileSync(bin, ["--version", "--quiet"])).toString().split("\n")[0].trim();

const prepareNewServiceDir = async () => {
  const serviceDir = tempy.directory();
  fs.chmodSync(serviceDir, 0o700);

  console.warn(`An existing hidden service directory wasn't provided. Provide a path to pre-generated keys to persist the .onion hostname between server restarts. A temporary hostname and key pair is being generated for you in ${serviceDir}`);

  return serviceDir;
};

const getHostname = async (serviceDir) => {
  const hostnamePath = path.join(serviceDir, "hostname");
  const watcher = chokidar.watch(hostnamePath, {
    stabilityThreshold: 2000,
    pollInterval: 100,
  });

  return new Promise((resolve) => {
    watcher.on("add", (path) => {
      const hostname = fs.readFileSync(path, { encoding: "utf8", flag: "r" });
      resolve(hostname.trim());
    });
  });
};

const startTor = async (options) => {
  logger.info(`Starting ${torVersion(options.binary)}`);

  const serviceDir = options.serviceDir || await prepareNewServiceDir();

  const args = [];

  args.push("HiddenServiceDir", serviceDir);

  // sandbox
  args.push("Sandbox", 1);
  args.push("RunAsDaemon", 0);
  args.push("SocksPort", 0);

  if (options.nonAnonymous) {
    logger.warn("Non-anonymous mode is enabled. Hops between this server and end users is decreased to 1 and anonymity is NOT guaranteed. This is likely fine for non-sensitive websites to make connections faster; otherwise, set nonAnonymous to false.");
    args.push("HiddenServiceNonAnonymousMode", 1);
    args.push("HiddenServiceSingleHopMode", 1);
  }

  // local express port -> hidden service port 80
  args.push("HiddenServicePort", `80 127.0.0.1:${options.port}`);

  args.push("Log", "err stderr");

  const subprocess = spawn(options.binary, ["--quiet", ...args], { stdio: "inherit" });
  subprocess.ref();
  process.on("exit", () => {
    subprocess.kill();
  });

  const hostname = await getHostname(serviceDir);

  return {
    stdout: subprocess.stdout,
    stderr: subprocess.stderr,
    stop() {
      subprocess.kill();
    },
    hostname: hostname,
  };
};

export { startTor };
