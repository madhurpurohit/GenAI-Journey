import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents:
      "Hello, Tell the below question answers. 1. What is my Name?, 2. What is the current Date?, 3. What is the current Time in India.",
    config: {
      systemInstruction: `Current user name is Madhur Purohit. He is a Full Stack MERN Web Developer. Today's date is ${new Date()}.`,
    },
  });
  console.log(response.text);
}

await main();

//* If we don't want to show our apiKey in our code then we can use .env file, where we can store our apiKey. & also install one dependency called "dotenv", after that in our code we just need to write the below line of code:
//! import 'dotenv/config';
//? When we import dotenv than we don't need to write apiKey in our code, because it automatically get apiKey from .env file, but remember that the key name is GEMINI_API_KEY in .env file otherwise it will not work.

//! Why don't we use process.env.GEMINI_API_KEY directly in our code?
//? Because when we write new GoogleGenAi({})l this is a SDK of Gemini inside this SDK we have a method called apiKey, which is directly set apiKey from .env file when it see GEMINI_API_KEY.
