import fs from "fs";
import path from "path";
import { spawn, execFileSync } from "child_process";
import tempy from "tempy";
import chokidar from "chokidar";

const torVersion = (bin) => (execFileSync(bin, ["--version"])).toString();

const prepareNewServiceDir = async () => {
  const serviceDir = tempy.directory();
  fs.chmodSync(serviceDir, 0o700);

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
      console.log(`File ${path} now exists`);
      const hostname = fs.readFileSync(hostnamePath, { encoding: "utf8", flag: "r" });
      console.log(`hostname file contains ${hostname}`);
      resolve(hostname);
    });
  });
};

const startTor = async (options) => {
  options = {
    binary: "tor",
    port: 8089,
    ...options,
  };

  console.log(`[TOR] Starting ${torVersion(options.binary)}`);

  const serviceDir = options.serviceDir || await prepareNewServiceDir();

  const args = [];

  args.push("HiddenServiceDir", serviceDir);

  // sandbox
  args.push("Sandbox", 1);
  args.push("RunAsDaemon", 0);
  args.push("SocksPort", 0);

  if (options.nonAnonymous) {
    args.push("HiddenServiceNonAnonymousMode", 1);
    args.push("HiddenServiceSingleHopMode", 1);
  }

  // port
  args.push("HiddenServicePort", `80 127.0.0.1:${options.port}`);

  // args.push("Log", "info stdout");

  console.log(args);

  const subprocess = spawn(options.binary, args, { stdio: "inherit" });
  subprocess.ref();
  process.on("exit", () => {
    subprocess.kill();
  });

  const hostname = await getHostname(serviceDir);
  console.log(`HOSTNAME: ${hostname}`);

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
