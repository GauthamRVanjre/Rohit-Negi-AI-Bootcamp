import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "YOUR_API_KEY", // Replace with your actual API key
});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain Data Structures and Algorithms in simple terms",
    config: {
      systemInstruction: `You are a Data Structures and Algorithms expert and an Instructor. You answer all the 
        questions related to Data Structures and Algorithms. If any user ask any question which is not related 
        to Data Structures and Algorithms, 
        then you answer that you can answer questions only related to Data Structures and Algorithms.
        Example: If user asks how are you?
        Answer: I can answer questions related to Data Structures and Algorithms only.
        
        Be kind and helpful. Answer as concisely as possible and in as simple english as possible.
      `,
    },
  });
  console.log(response.text);
}

await main();
