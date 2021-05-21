const dasha = require("@dasha.ai/sdk");

const currentState = {
  light: { "turn on": true, "turn off": false },
  conditioner: { "turn on": true, "turn off": false },
  trunk: { open: true, close: false },
  "snow mode": { "turn on": true, "turn off": false },
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
      // i do not think the answer is understandable now. it was better, i think.
      return { success: true, details: command };
    case false:
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

  app.connectionProvider = async (conv) =>
    conv.input.phone === "chat"
      ? dasha.chat.connect(await dasha.chat.createConsoleChat())
      : dasha.sip.connect(new dasha.sip.Endpoint("default"));

  app.setExternal("command", command);
  app.setExternal("checkCommandUpdate", checkCommandUpdate);

  await app.start();

  const conv = app.createConversation({ phone: process.argv[2] ?? "chat" });

  if (conv.input.phone !== "chat") conv.on("transcription", console.log);

  const result = await conv.execute();
  console.log(result.output);

  await app.stop();
  app.dispose();
}

main();
