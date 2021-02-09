import DashaSdk, * as dasha from "@dasha.ai/platform-sdk";
import { DebugLogger, runConsoleChat } from "./helpers";

type CallResult = {
  success: boolean;
  details: string;
};

type CallResultExtended = CallResult & {
  target: string;
  action: string;
};

const currentState: {
  [target: string]: { [action: string]: boolean | undefined };
} = {
  light: { "turn on": true, "turn off": false },
  conditioner: { "turn on": true, "turn off": false },
  trunk: { open: true, close: false },
  "snow mode": { "turn on": true, "turn off": false },
};

const antonyms: Record<string, string> = {
  "turn on": "turn off",
  "turn off": "turn on",
  open: "close",
  close: "open",
};

const newCommands: { details: string; action: string; target: string }[] = [];

setTimeout(() => {
  newCommands.push({
    details: "It's snowing outside. Would you like to turn the snow mode on?",
    action: "turn on",
    target: "snow mode",
  });
}, 20000);

const rpcHandler: Record<string, (...args: any[]) => any> = {
  async command({
    target,
    action,
  }: {
    target: string;
    action: string;
  }): Promise<CallResult> {
    const resolved = currentState[target]?.[action];
    const command = `"${action} the ${target}"`;
    switch (resolved) {
      case true:
        currentState[target][action] = false;
        currentState[target][antonyms[action]] = true;
        // i do not think the answer is understandable now. it was better, i think.
        return { success: true, details: command };
      case false:
      case undefined:
        return { success: false, details: `Cannot ${command}` };
      default:
        const s: never = resolved;
        throw new Error(`unknown command resolved value: ${s}`);
    }
  },
  async checkCommandUpdate(): Promise<CallResultExtended> {
    if (newCommands.length === 0) {
      return { success: false, details: "", action: "", target: "" };
    }
    const popped = newCommands.pop()!;
    currentState[popped.target][popped.action] = true;
    currentState[popped.target][antonyms[popped.action]] = false;
    return {
      success: true,
      details: `${popped.details} Command "${popped.action} the ${popped.target}" is available.`,
      action: popped.action,
      target: popped.target,
    };
  },
};

async function main() {
  const sdk = new DashaSdk({
    server: "app.us.dasha.ai",
    apiKey: process.env.DASHA_APIKEY!,
  });
  let app: dasha.IApplication;
  try {
    app = await sdk.registerApp({
      appPackagePath: "./app",
      concurrency: 10,
      progressReporter: dasha.progress.consoleReporter,
    });
    app.setLogger(console);
    console.log(`App ${app.applicationId}, instance ${app.instanceId}`);

    const audio = await app.addSessionConfig({
      name: "audio",
      config: {
        type: "audio",
        channel: {
          type: "sip",
          configName: "default"
        },
        stt: {
          configName: "Default-en"
        },
        tts: {
          type: "synthesized",
          configName: "Dasha"
        },
        noiseVolume: 0
      }
    });
    await app.addSessionConfig({ name: "text", config: { type: "text" } });

    const phone = process.argv[2];
    const jobOptions = createJob(phone !== "chat" ? phone : "");

    console.log(`Job starting: connect to ${phone !== "chat" ? phone : "chat"}`);
    let job: dasha.IJob;
    if (phone !== "chat") {
      job = await app.startJob("testJob", audio, {
        ...jobOptions,
        debugEvents: new DebugLogger(),
      });
      console.log("Job started");
    } else {
      job = await app.startJob("testJob", "text", {
        ...jobOptions,
        debugEvents: new DebugLogger(),
      });
      runConsoleChat(await sdk.connectChat(job.internalId)).catch(
        console.error
      );
    }
    const result = await job.result;
    console.log("Job completed:", result);
  } catch (e) {
    console.error(e);
  } finally {
    app!?.disconnect();
  }
}

function createJob(phone: string) {
  return {
    data: {
      phone,
    },
    rpcHandler,
  };
}

main();
