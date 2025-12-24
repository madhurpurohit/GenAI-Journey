import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
import readlineSync from "readline-sync";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const context = [];

(async function main() {
  while (true) {
    const prompt = readlineSync.question("\nEnter a prompt: ");

    if (prompt === "exit") {
      console.log("\nGoodbye! Have a Nice Day!");
      break;
    }

    const user = {
      role: "user",
      parts: [{ text: prompt }],
    };

    context.push(user);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: context,
    });

    const model = {
      role: "model",
      parts: [{ text: response.text }],
    };

    context.push(model);
    console.log("\nResponse: ", response.text);
  }
})();
