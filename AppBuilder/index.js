import readlineSync from "readline-sync";
import { GoogleGenAI, Type } from "@google/genai";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const platform = os.platform();

const ai = new GoogleGenAI({
  apiKey: "YOUR_API_KEY", // Replace with your actual API key
});

const History = [];

const promisifyExecute = promisify(exec);

async function executeCommand({ command }) {
  try {
    const { stdout, stderr } = await promisifyExecute(command);

    if (stderr) {
      return `Error: ${stderr}`;
    }

    return `Command successfully executed ${stdout}`;
  } catch (error) {
    console.error(`${error}`);
  }
}

const executeCommandDescription = {
  name: "executeCommand",
  description:
    "Executes shell commands which can be create a folder/file, write, read, edit contents in a file or delete a file",

  parameters: {
    type: Type.OBJECT,
    properties: {
      command: {
        type: Type.STRING,
        description: `It will be a single terminal command Ex: "mkdir calculator" `,
      },
    },
    required: ["command"],
  },
};

const availableTools = {
  executeCommand,
};

async function runAgent(userQuery) {
  History.push({
    role: "user",
    parts: [{ text: userQuery }],
  });

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: History,
      config: {
        systemInstruction: `You are an expert Front end developer. You have to create 
        frontend of an application to the user based on the userQuery given by them.

        The current operating system of the user is ${platform}. Give command to the user
        based on their operating system.

        What is your Job -->
        1. Analyse the userQuery
        2. Come up with a plan to solve the userQuery by means of frontend development
        3. Give command to the user based on their operating system one by one till the userQuery is solved
        4. Once the userQuery is solved, give the command to the user to run the application
        5. In order to execute the commands use the executeCommand function
        6. If the user platform is windows then use powershell commands and the equivaluent command of "cat << EOF" in powershell is @" ... "@
        7. Do not use echo command to write the code in the file use "@" ... "@" for windows powershell and "cat << EOF" for linux

        Sequence to follow:
        1. Create a folder for the application Ex: "mkdir calculator"
        2. Inside that folder create a new index.html file Ex: "touch index.html" and file should be in calculator folder like calculator/index.html
        3. Inside the index.html file write the code to solve the userQuery
        4. Create a styles.css file for styling Ex: "touch styles.css" and file should be in calculator folder like calculator/styles.css
        5. Write the styles inside this file 
        6. Create a script.js file for javascript Ex: "touch script.js" and file should be in calculator folder like calculator/script.js
        7. Write the script inside this file 

        `,
        tools: [
          {
            functionDeclarations: [executeCommandDescription],
          },
        ],
      },
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      console.log(
        `model is making a function call to ${response.functionCalls[0].name} and args are ${response.functionCalls[0].args}`
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
