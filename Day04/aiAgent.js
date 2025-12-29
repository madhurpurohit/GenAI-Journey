// Step1:- Import required dependencies - GoogleGenAI SDK for AI capabilities, dotenv for environment variables, readline-sync for user input handling
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";
import readlineSync from "readline-sync";
import weatherInfo from "./weatherTool.js";
import cryptoCurrency from "./cryptoTool.js";

// Step2:- Initialize the GoogleGenAI client - This creates our AI model instance for making API calls
const ai = new GoogleGenAI({});

// Step3:- Define the Weather Tool schema - This tells the AI what this tool does and what parameters it requires
const weatherToolInfo = {
  name: "weatherInfo", // Unique tool identifier that AI will use to call this function
  description: "Get the current weather information for a given city", // Tool description - AI uses this to determine when to invoke this tool
  parameters: {
    type: Type.OBJECT,
    properties: {
      city: {
        type: Type.STRING,
        description: "The name of the city e.g. london, mumbai etc.",
      },
    },
    required: ["city"], // City parameter is mandatory for this tool
  },
};

// Step4:- Define the Crypto Tool schema - This enables cryptocurrency price fetching functionality
const cryptoToolInfo = {
  name: "cryptoCurrency",
  description:
    "Get the current crypto currency information for a given coin in a given currency or country currency",
  parameters: {
    type: Type.OBJECT,
    properties: {
      coin: {
        type: Type.STRING,
        description: "The name of the coin e.g. bitcoin, ethereum etc.",
      },
      curr: {
        type: Type.STRING,
        description:
          "The country currency or currency in which you want to get the information e.g. inr, usd etc. If user didn't give any country or currency name then it will be inr by default.",
      },
    },
    required: ["coin", "curr"], // Both parameters are required for this tool
  },
};

// Step5:- Create the tools array - Bundle all available tools into an array that will be passed to the AI model
const tools = [
  {
    functionDeclarations: [weatherToolInfo, cryptoToolInfo],
  },
];

// Step6:- Create tool functions mapping - Maps tool names to their actual function implementations
// When AI calls a tool by name, this mapping is used to execute the corresponding function
const toolFunctions = {
  weatherInfo: weatherInfo,
  cryptoCurrency: cryptoCurrency,
};

// Step7:- Initialize conversation history array - Stores the entire chat history to maintain context across interactions
const history = [];

// Step8:- Define the AI Agent's core function - This implements the Agent Loop pattern for processing requests
async function runAgent() {
  // SubStep1:- Start an infinite loop - Continues until a final response is generated (no more tool calls needed)
  while (true) {
    // SubStep2:- Call the AI model with current conversation history and available tools
    // The model will decide whether to call a tool or provide a direct text response
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: history,
      config: { tools },
    });

    console.log(`AI Response ${i}: `, response.functionCalls);

    // SubStep3:- Check if the AI decided to make any function/tool calls
    if (response.functionCalls && response.functionCalls.length > 0) {
      // SubStep4:- Extract the first function call from the response (handles one tool call per iteration)
      const functionCall = response.functionCalls[0];

      // SubStep5:- Destructure the function name and arguments from the function call object
      const { name, args } = functionCall;

      // SubStep6:- Execute the actual tool function using the extracted arguments
      // The toolFunctions object enables dynamic function invocation based on the tool name
      const result = await toolFunctions[name](args);

      // SubStep7:- Prepare the function response object that will be sent back to the AI
      const functionResponsePart = {
        name: functionCall.name,
        response: {
          result: result,
        },
      };

      // SubStep8:- Add the model's function call to the conversation history
      // This is essential for the AI to maintain context about what tool it requested
      history.push({
        role: "model",
        parts: [{ functionCall: functionCall }],
      });

      // SubStep9:- Add the tool's result to the history as a user role message
      // The AI will process this result in the next iteration to generate the final response
      history.push({
        role: "user",
        parts: [{ functionResponse: functionResponsePart }],
      });

      // SubStep10:- Continue the loop - AI will now process the tool result and decide next action
    } else {
      // SubStep11:- No function call detected - AI has generated a final text response
      // The processing is complete and we can exit the loop

      // SubStep12:- Save the final response to the conversation history for future context
      history.push({
        role: "model",
        parts: [{ text: response.text }],
      });

      // SubStep13:- Display the final response to the user in the console
      console.log(response.text);

      // SubStep14:- Break out of the loop - Agent's task for this query is complete
      break;
    }
  }
}

// Step9:- Main program loop - Continuously accepts user input until exit command is received
while (true) {
  // Step10:- Prompt and capture user input from the console
  const question = readlineSync.question("\nAsk me anything: ");

  // Step11:- Check for exit condition - Terminate the program if user types "exit"
  if (question === "exit") {
    console.log("\nGoodbye! Have a Nice Day!");
    break;
  }

  // Step12:- Add the user's question to the conversation history
  history.push({
    role: "user",
    parts: [{ text: question }],
  });

  // Step13:- Execute the agent to process the query and generate a response
  await runAgent();
}
