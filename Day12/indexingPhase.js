import * as dotenv from "dotenv";
dotenv.config();
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"; // For loading the pdf
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"; // For splitting the pdf into chunks
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"; // For embedding the chunks
import { Pinecone } from "@pinecone-database/pinecone"; // For configuring the pinecone client
import { PineconeStore } from "@langchain/pinecone"; // For uploading the chunks to pinecone

//* Step1:- Load the document
const PDF_PATH = "./Node-js-Notes.pdf";
const pdfLoader = new PDFLoader(PDF_PATH);
const rawDocs = await pdfLoader.load();

// console.log("\nRaw Data:\n", rawDocs); // This will give us the metadata and the page content
console.log("Raw data means pdf page length: ", rawDocs.length); // This will give us the number of pages

//* Step2:- Split the document into chunks or Create the chunk of the PDF.
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});
const chunkedDocs = await textSplitter.splitDocuments(rawDocs);

// console.log("\nChunking Data:\n", chunkedDocs); // This will give us the chunked content
console.log("Chunked data length: ", chunkedDocs.length); // This will give us the number of chunks

//* Step3:- Configure the Gemini Embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "text-embedding-004",
});

//* Step4:- Configure the pinecone client
const pinecone = new Pinecone();
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

//* Step5:- Embed the chunks and upload to pinecone
await PineconeStore.fromDocuments(chunkedDocs, embeddings, {
  pineconeIndex,
  maxConcurrency: 5, // It means we are embedding 5 chunks at a time, so it will be faster.
});
