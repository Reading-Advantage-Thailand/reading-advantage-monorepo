#!/usr/bin/env tsx
/**
 * The launch script of the review copy of the milestone week (plan task 5.6, rule 6.5).
 *
 * The script makes the teacher account `teach-01`, writes its password to a password file outside
 * the log, starts the app review copy and the review server on free local ports, and prints the
 * URL of the review page, the Git commit of the tree, and the path of the password file (finding
 * F972). The password never goes into the log, into the arguments, or into a reply.
 *
 * The review server proxies to the app review copy and binds `127.0.0.1`. The review copy stays a
 * desktop copy: a second device reaches it only through a tunnel, and a tunnel needs Daniel's go
 * (finding F973).
 *
 * The script refuses the ports 3005 and 3099 (P5.8), and it refuses a password file that is the
 * log file. The plan function stays pure: it starts no server and touches no database. The
 * program path touches the database once, through `scripts/make-accounts.ts`, and only when the
 * orchestrator runs the script.
 *
 * The app review copy needs a production build (`next build`). The script starts `next start`, so a
 * missing build fails the launch with a clear message.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  chmodSync,
  createWriteStream,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkedPort, startReviewServer } from "./review-server";

/** The folder of the Storytime app. */
const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The root of the monorepo. */
const REPO_ROOT = resolve(APP, "..", "..");

/** The username of the teacher account of the review copy. */
export const TEACHER_USERNAME = "teach-01";

/** The CSV of the one teacher account of the review copy. */
const ACCOUNT_CSV = "name,class,role\nTeacher One,teach,teacher\n";

/** The options of one launch of the review copy. */
export interface LaunchOptions {
  /** The port of the review server. */
  port: number;
  /** The folder that holds the received weeks. */
  contentDir: string;
  /** The path of the answers file. */
  answersPath: string;
  /** The path of the file that holds the password of the teacher account. */
  passwordFile: string;
  /** The path of the log file of the servers. */
  logFile: string;
  /** The Git commit of the tree. */
  commit: string;
}

/** The plan of one launch of the review copy. */
export interface LaunchPlan extends LaunchOptions {
  /** The URL of the review page. */
  url: string;
}

/**
 * Plans one launch of the review copy, with no server and no database.
 * @param options The port, the content folder, the answers path, the password file, the log file,
 *   and the commit.
 * @returns The same fields plus the URL of the review page.
 * @throws When the port is refused (3005 or 3099), the password file is the log file, the content
 *   folder is empty, or the commit is empty.
 */
export function planLaunch(options: LaunchOptions): LaunchPlan {
  const port = checkedPort(options.port);
  if (resolve(options.passwordFile) === resolve(options.logFile)) {
    throw new Error("the launch refuses a password file that is the log file");
  }
  if (options.contentDir.trim() === "") throw new Error("the launch holds no content folder");
  if (options.answersPath.trim() === "") throw new Error("the launch holds no answers path");
  if (options.commit.trim() === "") throw new Error("the launch holds no commit");
  return { ...options, port, url: `http://127.0.0.1:${port}/review` };
}

/**
 * Gives the value of one named argument.
 * @param argv The arguments of the script.
 * @param name The name of the argument, for example `--port`.
 * @returns The value that follows the name, or undefined when the arguments hold no name.
 */
function optionalValueOf(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  const value = index >= 0 ? argv[index + 1] : undefined;
  return value === undefined || value === "" ? undefined : value;
}

/**
 * Gives the value of one required named argument.
 * @param argv The arguments of the script.
 * @param name The name of the argument, for example `--content-dir`.
 * @returns The value that follows the name.
 * @throws When the arguments hold no value for the name.
 */
function valueOf(argv: string[], name: string): string {
  const value = optionalValueOf(argv, name);
  if (value === undefined) throw new Error(`the arguments hold no ${name} value`);
  return value;
}

/**
 * Gives a free port that is never 3005 or 3099.
 * @returns The port.
 */
async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((settle, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => settle());
  });
  const address = server.address();
  const port = address !== null && typeof address === "object" ? address.port : 0;
  await new Promise<void>((settle) => server.close(() => settle()));
  if (port === 0) throw new Error("the launch found no free port");
  return checkedPort(port);
}

/**
 * Gives the Git commit of the tree.
 * @returns The commit.
 * @throws When git answers no commit.
 */
function currentCommit(): string {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" });
  const commit = (result.stdout ?? "").trim();
  if (result.status !== 0 || commit === "") {
    throw new Error("the launch cannot read the Git commit of the tree");
  }
  return commit;
}

/**
 * Makes the teacher account and writes its password to the password file.
 *
 * The account script writes the card list into a temporary folder outside the repository. The
 * launch copies the password of `teach-01` into the password file with mode 0600, then deletes
 * the temporary folder. The password never goes into the log and never goes into an argument.
 * @param plan The plan of the launch.
 * @throws When the account script fails, the card list holds no `teach-01` password, or the
 *   password file cannot be written.
 */
function makeTeacherAccount(plan: LaunchPlan): void {
  const folder = mkdtempSync(resolve(tmpdir(), "storytime-review-accounts-"));
  try {
    writeFileSync(resolve(folder, "accounts.csv"), ACCOUNT_CSV, "utf8");
    const script = resolve(APP, "scripts", "make-accounts.ts");
    const result = spawnSync(
      resolve(REPO_ROOT, "node_modules/.bin/tsx"),
      [script, "--folder", folder, "--database-url-env", "STORYTIME_DATABASE_URL"],
      { cwd: REPO_ROOT, encoding: "utf8", env: process.env },
    );
    if (result.status !== 0) {
      throw new Error("the launch could not make the teacher account");
    }
    const cards = readFileSync(resolve(folder, "sign-in-cards.csv"), "utf8").split("\n");
    const row = cards.find((line) => line.split(",")[0] === TEACHER_USERNAME);
    const password = (row?.split(",").at(-1) ?? "").trim();
    if (password === "") throw new Error(`the launch holds no ${TEACHER_USERNAME} password`);
    mkdirSync(dirname(plan.passwordFile), { recursive: true });
    writeFileSync(plan.passwordFile, `${password}\n`, { encoding: "utf8", mode: 0o600 });
    chmodSync(plan.passwordFile, 0o600);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

/**
 * Starts the app review copy with the draft media switch on.
 * @param port The port of the app.
 * @param plan The plan of the launch.
 * @returns The child process of the app.
 */
function startApp(port: number, plan: LaunchPlan): ChildProcess {
  mkdirSync(dirname(plan.logFile), { recursive: true });
  const log = createWriteStream(plan.logFile, { flags: "a" });
  const child = spawn(
    resolve(REPO_ROOT, "node_modules/.bin/next"),
    ["start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: APP,
      env: {
        ...process.env,
        STORYTIME_SHOW_DRAFT_MEDIA: "1",
        STORYTIME_TEACHER_ROUTES: "1",
        STORYTIME_CONTENT_DIR: plan.contentDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
  return child;
}

/**
 * Waits until the app review copy answers.
 * @param port The port of the app.
 * @throws When the app does not answer within three minutes.
 */
async function waitForApp(port: number): Promise<void> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/th/st/2/1`, {
        signal: AbortSignal.timeout(2000),
      });
      if (response.status > 0) return;
    } catch {
      // The app did not answer yet.
    }
    await new Promise((settle) => setTimeout(settle, 1000));
  }
  throw new Error(`the app review copy did not answer on port ${port}; read the log file`);
}

/**
 * Runs the launch script as a program.
 * @param argv The arguments, which hold `--content-dir`, `--answers`, and `--password-file`, and
 *   may hold `--port`, `--log-file`, and `--commit`.
 * @returns 0 when the review copy ran, and 2 when an argument is missing or a step failed.
 */
export async function main(argv: string[]): Promise<number> {
  try {
    const commit = optionalValueOf(argv, "--commit") ?? currentCommit();
    const requestedPort = optionalValueOf(argv, "--port");
    const appPort = await freePort();
    let port = requestedPort === undefined ? await freePort() : Number(requestedPort);
    while (port === appPort) port = await freePort();
    const plan = planLaunch({
      port,
      contentDir: resolve(valueOf(argv, "--content-dir")),
      answersPath: resolve(valueOf(argv, "--answers")),
      passwordFile: resolve(valueOf(argv, "--password-file")),
      logFile: resolve(optionalValueOf(argv, "--log-file") ?? resolve(tmpdir(), "storytime-review.log")),
      commit,
    });
    mkdirSync(dirname(plan.answersPath), { recursive: true });
    makeTeacherAccount(plan);
    const child = startApp(appPort, plan);
    try {
      await waitForApp(appPort);
      const server = await startReviewServer({
        port: plan.port,
        appUrl: `http://127.0.0.1:${appPort}`,
        answersPath: plan.answersPath,
        commit: plan.commit,
      });
      console.log(`review_url=${server.url}`);
      console.log(`review_commit=${plan.commit}`);
      console.log(`review_password_file=${plan.passwordFile}`);
      console.log(`review_log=${plan.logFile}`);
      console.log("Press Ctrl-C to stop the review copy.");
      await new Promise<void>((settle) => {
        const stop = (): void => {
          if (!child.killed) child.kill("SIGTERM");
          void server.close().finally(settle);
        };
        process.once("SIGINT", stop);
        process.once("SIGTERM", stop);
      });
      return 0;
    } finally {
      if (!child.killed) child.kill("SIGTERM");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
}

const invoked = process.argv[1];
if (invoked !== undefined && fileURLToPath(import.meta.url) === resolve(invoked)) {
  void main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: Error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
