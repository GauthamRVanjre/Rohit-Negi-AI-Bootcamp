import * as dotenv from "dotenv";
dotenv.config();

import readlineSync from "readline-sync";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});
const History = [];

async function transformQuery(question) {
  History.push({
    role: "user",
    parts: [{ text: question }],
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: History,
    config: {
      systemInstruction: `You are a query rewriting expert. Based on the provided chat history, rephrase the "Follow Up user Question" into a complete, standalone question that can be understood without the chat history.
    Only output the rewritten question and nothing else.
      `,
    },
  });

  History.pop();

  return response.text;
}

async function chatting(userProblem) {
  const enhancedUserQuery = await transformQuery(userProblem);

  // convert this question into vector
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004",
  });

  // query vector
  const queryVector = await embeddings.embedQuery(enhancedUserQuery);
  console.log(queryVector);

  // make connection with DB
  const pinecone = new Pinecone();
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

  // query DB with query vector
  const searchResults = await pineconeIndex.query({
    topK: 10, // fetching 10 most relevant documents
    vector: queryVector,
    includeMetadata: true,
  });

  // top 10 documents: 10 metadata and 10 text part
  const context = searchResults.matches
    .map((match) => match.metadata.text)
    .join("\n\n---\n\n");

  // create context for the LLM to pass so that it can answer the question in user friendly way.
  History.push({
    role: "user",
    parts: [{ text: userProblem }],
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: History,
    config: {
      systemInstruction: `You have to behave like a Data Structure and Algorithm Expert.
    You will be given a context of relevant information and a user question.
    Your task is to answer the user's question based ONLY on the provided context.
    If the answer is not in the context, you must say "I could not find the answer in the provided document."
    Keep your answers clear, concise, and educational.
      
      Context: ${context}
      `,
    },
  });

  History.push({
    role: "model",
    parts: [{ text: response.text }],
  });

  console.log("\n");
  console.log(response.text);
}

async function main() {
  const userProblem = readlineSync.question("Ask me anything--> ");
  await chatting(userProblem);
  main();
}

main();
