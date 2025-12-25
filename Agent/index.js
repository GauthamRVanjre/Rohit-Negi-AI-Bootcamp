import readlineSync from "readline-sync";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "YOUR_API_KEY", // Replace with your actual API key
});

const History = [];

function sum({ num1, num2 }) {
  return num1 + num2;
}

function prime({ num }) {
  for (let i = 2; i < num; i++) {
    if (num % i === 0) {
      return false;
    }
  }
  return true;
}

async function getCryptoPrice({ coin }) {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin}`;
  const response = await fetch(url);
  const data = await response.json();
  return data[0].current_price;
}

const sumDeclaration = {
  name: "sum",
  description: "Gets sum of 2 numbers",

  parameters: {
    type: Type.OBJECT,
    properties: {
      num1: {
        type: Type.NUMBER,
        description: "First number to add",
      },
      num2: {
        type: Type.NUMBER,
        description: "Second number to add",
      },
    },
    required: ["num1", "num2"],
  },
};

const primeDeclaration = {
  name: "prime",
  description: "Checks if a number is prime",

  parameters: {
    type: Type.OBJECT,
    properties: {
      num: {
        type: Type.NUMBER,
        description: "Number to check",
      },
    },
    required: ["num"],
  },
};

const cryptoDeclaration = {
  name: "crypto",
  description: "Gets the price of a crypto coin",

  parameters: {
    type: Type.OBJECT,
    properties: {
      coin: {
        type: Type.STRING,
        description: "Name of the crypto coin",
      },
    },
    required: ["coin"],
  },
};

async function runAgent(userQuery) {
  History.push({
    role: "user",
    parts: [{ text: userQuery }],
  });
  const availableTools = {
    sum,
    prime,
    crypto: getCryptoPrice,
  };

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: History,
      config: {
        systemInstruction: `You are a helpful AI agent. You have access to 3 function namely:
          1. sum - which gets sum of 2 numbers
          2. prime - which checks if a number is prime
          3. crypto - which gets the price of a crypto coin

          If any user ask any question which is not related to above functions, 
          then you answer that you can answer questions only related to above functions.
          Example: If user asks how are you?
          Answer: I can only answer questions related to sum of 2 numbers, detecting prime numbers and getting the current price of a crypto coin. 
          This is one of the sample answer you can give.
          
          Be kind and helpful. Answer as concisely as possible and in as simple english as possible.
        `,
        tools: [
          {
            functionDeclarations: [
              sumDeclaration,
              primeDeclaration,
              cryptoDeclaration,
            ],
          },
        ],
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log(
        `model is making a function call to ${
          response.functionCalls[0].name
        }  with arguments ${JSON.stringify(response.functionCalls[0].args)}`
      );
      const { name, args } = response.functionCalls[0];

      const funCall = availableTools[name];

      const result = await funCall(args);

      const funtionResponsePart = {
        name: name,
        response: {
          result: result,
        },
      };

      // giving function response to LLM
      History.push({
        role: "model",
        parts: [{ functionCall: response.functionCalls[0] }],
      });

      // LLM will refine the function response and send it back to user
      History.push({
        role: "user",
        parts: [
          {
            functionResponse: funtionResponsePart,
          },
        ],
      });
    } else {
      console.log(response.text);
      History.push({
        role: "model",
        parts: [{ text: response.text }],
      });
      break;
    }
  }
}

const main = async () => {
  const userQuestion = readlineSync.question("What is your question? ");
  await runAgent(userQuestion);
};

main();
