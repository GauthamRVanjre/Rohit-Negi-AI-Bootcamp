// loading PDF
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";

import * as dotenv from "dotenv";
dotenv.config();

async function LoadDocument() {
  const PDF_PATH = "./dsa.pdf";
  const loader = new PDFLoader(PDF_PATH);
  const docs = await loader.load();

  console.log("PDF loaded");

  // chunking
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunkedDocs = await textSplitter.splitDocuments(docs);
  console.log("chunks created");

  // vector embedding model
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004",
  });
  console.log("embeddings created");

  // loading the DB
  // initialize pinecone client
  const pinecone = new Pinecone();
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

  console.log("DB loaded");

  // langchain (embedding the chunks into DB)
  await PineconeStore.fromDocuments(chunkedDocs, embeddings, {
    pineconeIndex,
    maxConcurrency: 5,
  });

  console.log("DB updated with vectorized chunks");
}

LoadDocument();
