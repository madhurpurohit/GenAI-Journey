import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";
import readlineSync from "readline-sync";
import { exec } from "child_process";
import util from "util";
import os from "os";
import { getSystemPrompt } from "./systemPrompt.js";

const platform = os.platform();

const execute = util.promisify(exec);

async function executeCMD({ command }) {
  try {
    const { stdout, stderr } = await execute(command);

    if (stderr) {
      return `Error: ${stderr}`;
    }

    return `Success: ${stdout}`;
  } catch (error) {
    return `Error: ${error}`;
  }
}

const executeTool = {
  name: "executeCMD",
  description: "This tool is used to execute a command in the terminal/shell",
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: {
        type: Type.STRING,
        description:
          "The command to execute e.g. mkdir test, touch test.txt etc.",
      },
    },
    required: ["command"],
  },
};

const History = [];

const ai = new GoogleGenAI({});

async function webBuilder() {
  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: History,
      config: {
        tools: [
          {
            functionDeclarations: [executeTool],
          },
        ],
        systemInstruction: getSystemPrompt(platform),
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];
      const { name, args } = functionCall;

      const executeCMDResult = await executeCMD(args);

      const functionResponsePart = {
        name: functionCall.name,
        response: {
          result: executeCMDResult,
        },
      };

      History.push({
        role: "model",
        parts: [{ functionCall: functionCall }],
      });

      History.push({
        role: "user",
        parts: [{ functionResponse: functionResponsePart }],
      });
    } else {
      console.log(response.text);
      History.push({
        role: "model",
        parts: [{ text: response.text }],
      });
      break;
    }
  }
}

while (true) {
  const question = readlineSync.question("\nWhat should I build today?\n");

  if (question === "exit") {
    console.log("\nGoodbye! Have a Nice Day!");
    break;
  }

  History.push({
    role: "user",
    parts: [{ text: question }],
  });

  await webBuilder();
}
