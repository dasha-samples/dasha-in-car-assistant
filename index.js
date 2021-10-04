const dasha = require("@dasha.ai/sdk");
const fs = require("fs");

const currentState = {
  light: { "turn on": true, "turn off": false },
  conditioner: { "turn on": true, "turn off": false },
  "snow mode": { "turn on": true, "turn off": false },
  trunk: { open: true, close: false },
  window: { open: true, close: false },
};

const antonyms = {
  "turn on": "turn off",
  "turn off": "turn on",
  open: "close",
  close: "open",
};

const newCommands = [];

setTimeout(() => {
  newCommands.push({
    details: "It's snowing outside. Would you like to turn the snow mode on?",
    action: "turn on",
    target: "snow mode",
  });
}, 20000);

async function command({ target, action }) {
  const resolved = currentState[target]?.[action];
  const command = `"${action} the ${target}"`;
  switch (resolved) {
    case true:
      currentState[target][action] = false;
      currentState[target][antonyms[action]] = true;
      return { success: true, details: command };
    case false:
      return {
        success: false,
        details: `${target} already ${action}`,
      };
    case undefined:
      return { success: false, details: `Cannot ${command}` };
    default:
      throw new Error(`unknown command resolved value: ${s}`);
  }
}

async function checkCommandUpdate() {
  if (newCommands.length === 0) {
    return { success: false, details: "", action: "", target: "" };
  }
  const popped = newCommands.pop();
  currentState[popped.target][popped.action] = true;
  currentState[popped.target][antonyms[popped.action]] = false;
  return {
    success: true,
    details: `${popped.details} Command "${popped.action} the ${popped.target}" is available.`,
    action: popped.action,
    target: popped.target,
  };
}

async function main() {
  const app = await dasha.deploy("./app");

  app.ttsDispatcher = () => "dasha";

  app.setExternal("command", command);
  app.setExternal("checkCommandUpdate", checkCommandUpdate);

  await app.start();

  const conv = app.createConversation({ phone: process.argv[2] ?? "chat" });

  const logFile = await fs.promises.open("./log.txt", "w");
  await logFile.appendFile("#".repeat(100) + "\n");

  conv.on("transcription", async (entry) => {
    await logFile.appendFile(`${entry.speaker}: ${entry.text}\n`);
  });

  conv.on("debugLog", async (event) => {
    await logFile.appendFile(JSON.stringify(event, undefined, 2) + "\n");
  });

  conv.audio.tts = "dasha";

  if (conv.input.phone === "chat") {
    await dasha.chat.createConsoleChat(conv);
  } else {
    conv.on("transcription", console.log);
  }


  const result = await conv.execute({
    channel: conv.input.phone === "chat" ? "text" : "audio",
  });
  
  console.log(result.output);

  await app.stop();
  app.dispose();
}

main();
