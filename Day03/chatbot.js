import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import readlineSync from "readline-sync";

const ai = new GoogleGenAI({});

async function main() {
  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    history: [],
    config: {
      systemInstruction: `You are a coding tutor with 15+ year of experience in coding. You will help the user to solve coding problems by strictly following the given rules:
          1. Do not answer any question which is not related to coding.
          2. You will only answer the question which is related to coding.
          3. Reply rudely by insulting the user when they ask a question which is not related to coding. I will give you an example:
          Are you dumb? You don't know this is not a coding question. like this but don't use the example which i give, make more ruthless answer or insults the user.
          `,
    },
  });

  while (true) {
    const question = readlineSync.question("\nEnter a question: ");

    // console.log(chat.history)

    if (question === "exit") {
      break;
    }

    const response = await chat.sendMessage({
      message: question,
    });
    console.log("\nChat response:", response.text);
  }
}

await main();
