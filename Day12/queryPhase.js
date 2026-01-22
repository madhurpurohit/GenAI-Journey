import * as dotenv from "dotenv";
dotenv.config();
import readlineSync from "readline-sync";
import { Pinecone } from "@pinecone-database/pinecone"; // For configuring the pinecone client
import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai"; // For configuring the google embeddings and chat model
import { PromptTemplate } from "@langchain/core/prompts"; // For creating the prompt template
import { StringOutputParser } from "@langchain/core/output_parsers"; // For parsing the output of the model
import { RunnableSequence } from "@langchain/core/runnables"; // For creating the chain

//* Step1:- Configure the google embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "text-embedding-004",
});

//* Step2:- Configure the pinecone client
const pinecone = new Pinecone();
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

//* Step3:- Configure the chat model
const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.5-flash",
  temperature: 0.3,
});

//* Step4:- Create a chatting function
async function chatting(question) {
  //* Step4.1:- Embed the user input
  const queryVector = await embeddings.embedQuery(question);

  //* Step4.2.1:- Query the pinecone index
  const searchResults = await pineconeIndex.query({
    topK: 10,
    vector: queryVector,
    includeMetadata: true,
  });

  //* Step4.2.2:- Extract the metadata from the search results
  const context = searchResults.matches
    .map((match) => match.metadata.text)
    .join("\n\n---\n\n");

  //* Step4.3:- Create a prompt template
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

  //* Step4.4:- Create a chain (prompt → model → parser). Here RunnableSequence means we are creating a chain of operations.
  const chain = RunnableSequence.from([
    promptTemplate,
    model,
    new StringOutputParser(),
  ]);

  //* Step4.5:- Invoke the chain and get the answer, it means here we actually call the model and pass the context and question to it.
  const answer = await chain.invoke({
    context: context,
    question: question,
  });

  console.log("Answer:", answer);
}

//* Step5:- Take the User input
async function main() {
  const userProblem = readlineSync.question("Ask me anything--> ");
  await chatting(userProblem);
  main();
}

main();
