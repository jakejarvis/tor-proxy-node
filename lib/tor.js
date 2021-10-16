import fs from "fs";
import path from "path";
import { spawn, execFileSync } from "child_process";
import tempy from "tempy";

const torVersion = (bin) => (execFileSync(bin, ["--version"])).toString();

const prepareServiceDir = async (hostname, pubKey, privKey) => {
  const serviceDir = tempy.directory();
  fs.chmodSync(serviceDir, 0o700);

  fs.writeFileSync(path.join(serviceDir, "hostname"), hostname);
  fs.writeFileSync(path.join(serviceDir, "hs_ed25519_public_key"), pubKey);
  fs.writeFileSync(path.join(serviceDir, "hs_ed25519_secret_key"), privKey);

  return serviceDir;
};

const startTor = async (options) => {
  options = {
    binary: "tor",
    port: 8089,
    pubKey: process.env.TOR_HS_ED25519_PUBLIC_KEY,
    privKey: process.env.TOR_HS_ED25519_PRIVATE_KEY,
    ...options,
  };

  console.log(`[TOR] Starting ${torVersion(options.binary)}`);

  const args = [];

  if (options.serviceDir) {
    args.push("HiddenServiceDir", options.serviceDir);
  } else {
    args.push("HiddenServiceDir", await prepareServiceDir(options.hostname, options.pubKey, options.privKey));
  }

  // sandbox
  args.push("Sandbox", 1);
  args.push("RunAsDaemon", 0);
  args.push("SocksPort", 0);
  args.push("HiddenServiceNonAnonymousMode", 1);
  args.push("HiddenServiceSingleHopMode", 1);

  // port
  args.push("HiddenServicePort", options.port);

  console.log(args);

  const subprocess = spawn(options.binary, args, { stdio: "inherit" });
  subprocess.ref();
  process.on("exit", () => {
    subprocess.kill();
  });

  return {
    stdout: subprocess.stdout,
    stderr: subprocess.stderr,
    stop() {
      subprocess.kill();
    },
  };
};

export { startTor };
