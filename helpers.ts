import { IChatChannel, IDebugEvents } from "@dasha.ai/platform-sdk";
import * as readline from "readline";

export class DebugLogger implements IDebugEvents {
  async log(msg: string) {
    console.log({ Log: msg });
  }
  async transcription(msg: string, incoming: boolean) {
    console.log(incoming ? { Human: msg } : { AI: msg });
  }
}

export async function runConsoleChat(chatChannel: IChatChannel) {
  const cli = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("chat opened");

  chatChannel.receivedMessages.subscribe({
    next: (text) => {
      console.log("AI:", text);
    },
    complete: () => {
      cli.close();
      console.log("chat closed");
    },
    error: (error) => {
      cli.close();
      console.warn("chat error:", error);
    },
  });

  for await (const line of cli) {
    if (line === "") {
      await chatChannel.close();
      break;
    } else {
      await chatChannel.sendMessage(line);
    }
  }

  cli.close();
}
