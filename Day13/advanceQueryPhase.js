import * as dotenv from "dotenv";
dotenv.config();
import readlineSync from "readline-sync";
import { Pinecone } from "@pinecone-database/pinecone";
import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

//* Step1:- Configure the Google embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "text-embedding-004",
});

//* Step2:- Configure the Pinecone client
const pinecone = new Pinecone();
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

//* Step3:- Configure the Router LLM (Gemini-2.5-Flash-Lite for fast routing)
const routerModel = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.5-flash-lite",
  temperature: 0,
});

//* Step4:- Configure the Final Answer LLM (Gemini-2.5-Flash)
const answerModel = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.5-flash",
  temperature: 0.3,
});

//* Step5:- Chat History Array
// Each object: { role: "user" | "assistant", content: string, query_no: number | null }
let chatHistory = [];
let queryCounter = 0;

//* Step6:- Router System Prompt
const ROUTER_SYSTEM_PROMPT = `You are a Query Transformer. Your job is to make the user's query 'standalone' and decide the retrieval mode.

CRITICAL RULES:
1. Return ONLY valid JSON. No markdown, no explanation.

2. **PRONOUN RESOLUTION**: When user uses pronouns like "it", "this", "that", "the above", ALWAYS resolve them to the topic from the MOST RECENT user query, NOT the first query.
   - Example: If queries were [Q1: "What is Node.js?", Q2: "What is V8 Engine?"] and current query is "Explain it briefly", 
     then "it" = "V8 Engine" (the most recent topic), NOT "Node.js".

3. **function_call DECISION**:
   - "Normal": When user asks a follow-up about their OWN PREVIOUS QUESTION's topic (e.g., "Explain it", "Tell me more", "What about that?").
     In this case, you only need user's previous queries as context, NOT the AI's response.
   - "Advance": ONLY when user EXPLICITLY references content from the AI's PREVIOUS RESPONSE (e.g., "Explain the code you showed", "What does the example you gave mean?", "Give more details on your answer").
     In this case, you need the AI's response as context.

4. **query_type DECISION**:
   - "independent": New query with no reference to previous conversation (e.g., "What is a Buffer?").
   - "dependent": Query refers to something from previous conversation.

5. **query_no**: Set to the query number being referenced. For pronouns like "it", this should be the MOST RECENT relevant query number.

JSON SCHEMA:
{{
  "query": "standalone query with pronouns replaced by actual topic from most recent relevant query",
  "function_call": "Normal" | "Advance",
  "query_no": number | null,
  "query_type": "independent" | "dependent"
}}`;

//* Step7:- Router Function (Stage 1)
async function routeQuery(currentQuery) {
  // Get only previous user queries for context
  const userQueries = chatHistory
    .filter((entry) => entry.role === "user")
    .map((entry) => `[Query ${entry.query_no}]: ${entry.content}`)
    .join("\n");

  const routerPrompt = PromptTemplate.fromTemplate(`
${ROUTER_SYSTEM_PROMPT}

Previous User Queries:
{userQueries}

Current Query: {currentQuery}

Analyze and return JSON:`);

  const routerChain = RunnableSequence.from([
    routerPrompt,
    routerModel,
    new StringOutputParser(),
  ]);

  const response = await routerChain.invoke({
    userQueries: userQueries || "No previous queries",
    currentQuery: currentQuery,
  });

  // Clean and parse the JSON response
  try {
    const cleanedResponse = response.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.log("Router JSON parse error, defaulting to independent query");
    return {
      query: currentQuery,
      function_call: "Normal",
      query_no: null,
      query_type: "independent",
    };
  }
}

//* Step8:- Vector Search Function
async function vectorSearch(query) {
  const queryVector = await embeddings.embedQuery(query);
  const searchResults = await pineconeIndex.query({
    topK: 10,
    vector: queryVector,
    includeMetadata: true,
  });

  return searchResults.matches
    .map((match) => match.metadata.text)
    .join("\n\n---\n\n");
}

//* Step9:- Build Context Based on Router Decision (Stage 2)
function buildContext(routerDecision, vectorContext) {
  let additionalContext = "";

  if (routerDecision.query_type === "independent") {
    // No history needed, just return vector context
    return vectorContext;
  }

  if (routerDecision.function_call === "Normal") {
    // Include all previous user queries as context
    const userQueries = chatHistory
      .filter((entry) => entry.role === "user")
      .map((entry) => `[Query ${entry.query_no}]: ${entry.content}`)
      .join("\n");
    additionalContext = `\n\nPrevious User Queries:\n${userQueries}`;
  } else if (routerDecision.function_call === "Advance") {
    // Include specific user query and AI response based on query_no
    const targetQueryNo = routerDecision.query_no;
    const userEntry = chatHistory.find(
      (entry) => entry.role === "user" && entry.query_no === targetQueryNo,
    );
    const assistantEntry = chatHistory.find(
      (entry) => entry.role === "assistant" && entry.query_no === targetQueryNo,
    );

    if (userEntry && assistantEntry) {
      additionalContext = `\n\nReferenced Conversation [Query ${targetQueryNo}]:
User: ${userEntry.content}
Assistant: ${assistantEntry.content}`;
    }
  }

  return vectorContext + additionalContext;
}

//* Step10:- Main Chatting Function
async function chatting(question) {
  console.log("\n🤔 System is thinking...\n");

  // Stage 1: Route the query
  const routerDecision = await routeQuery(question);
  console.log("📍 Router Decision:", JSON.stringify(routerDecision, null, 2));

  // Use the rewritten query for vector search
  const searchQuery = routerDecision.query || question;

  // Perform vector search
  const vectorContext = await vectorSearch(searchQuery);

  // Stage 2: Build context based on router decision
  const fullContext = buildContext(routerDecision, vectorContext);

  // Create prompt template for final answer
  const promptTemplate = PromptTemplate.fromTemplate(`
You are a helpful assistant answering questions based on the provided documentation.

Context from the documentation:
{context}

Question: {question}

Instructions:
- Answer the question using ONLY the information from the context above
- If the answer is not in the context, say "I don't have enough information to answer that question."
- Be concise and clear
- Use code examples from the context if relevant

Answer:`);

  // Create the answer chain
  const chain = RunnableSequence.from([
    promptTemplate,
    answerModel,
    new StringOutputParser(),
  ]);

  // Get the answer
  const answer = await chain.invoke({
    context: fullContext,
    question: question,
  });

  // Update chat history
  queryCounter++;
  chatHistory.push({
    role: "user",
    content: question,
    query_no: queryCounter,
  });
  chatHistory.push({
    role: "assistant",
    content: answer,
    query_no: queryCounter,
  });

  console.log("\n✅ Answer:", answer);
}

//* Step11:- Main Loop (Using while loop instead of recursion to prevent stack overflow)
async function main() {
  console.log("🚀 Two-Stage Intelligent RAG System Started!");
  console.log("Type 'exit' to quit.\n");

  while (true) {
    const userInput = readlineSync.question("Ask me anything --> ");

    if (userInput.toLowerCase() === "exit") {
      console.log("👋 Goodbye!");
      break;
    }

    if (!userInput.trim()) {
      console.log("Please enter a valid question.");
      continue;
    }

    await chatting(userInput);
    console.log("\n" + "=".repeat(50) + "\n");
  }
}

main();
