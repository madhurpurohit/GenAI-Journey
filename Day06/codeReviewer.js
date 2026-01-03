import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";
import fs from "fs";
import path from "path";

//* Step1:- Make a tool for list all the folder & files.
async function listFiles({ directory }) {
  const files = [];
  const extensions = [".html", ".css", ".js", ".ts", ".jsx", ".tsx"];

  function scan(dir) {
    const items = fs.readdirSync(dir); // This will return all the files & folders in the directory. & it will return an array of strings.

    for (const item of items) {
      const fullPath = path.join(dir, item); // This will return the full path of the file or folder.

      if (
        fullPath.includes("node_modules") ||
        fullPath.includes("dist") ||
        fullPath.includes("build")
      )
        continue;

      const stats = fs.statSync(fullPath); // This will return the stats of the file or folder, means it will return that is it directory or file.

      if (stats.isDirectory()) {
        scan(fullPath);
      } else {
        const extension = path.extname(item);
        if (extensions.includes(extension)) {
          files.push(fullPath);
        }
      }
    }
  }

  scan(directory);
  console.log(`Found ${files.length} files`);
  return { files };
}

//* Step2:- Make a tool for read the file.
async function readFile({ file_path }) {
  const content = fs.readFileSync(file_path, "utf-8");
  console.log(`Reading: ${file_path}`);
  return { content };
}

//* Step3:- Make a tool for write the file.
async function writeFile({ file_path, content }) {
  fs.writeFileSync(file_path, content, "utf-8");
  console.log(`✍️ Fixed: ${file_path}`);
  return { success: true };
}

//* Step4:- Make a Tool Registry
const toolRegistry = {
  listFiles: listFiles,
  readFile: readFile,
  writeFile: writeFile,
};

//* Step5:- Make a Tool Declaration
const listFilesTool = {
  name: "listFiles",
  description: "This tool is used to list all the files in the directory.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      directory: {
        type: Type.STRING,
        description: "The directory path to scan.",
      },
    },
    required: ["directory"],
  },
};

const writeFileTool = {
  name: "writeFile",
  description: "This tool is used to write the content to the file.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      file_path: {
        type: Type.STRING,
        description: "The file path to write the content.",
      },
      content: {
        type: Type.STRING,
        description: "The content to write to the file.",
      },
    },
    required: ["file_path", "content"],
  },
};

const readFileTool = {
  name: "readFile",
  description: "This tool is used to read the content of the file.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      file_path: {
        type: Type.STRING,
        description: "The file path to read the content.",
      },
    },
    required: ["file_path"],
  },
};

//* Step6: Create an instance of GoogleGenAI.
const ai = new GoogleGenAI({});

//* Step7:- Create Agent Function.
export async function codeReviewer({ directoryPath }) {
  console.log(`🔍 Reviewing: ${directoryPath}\n`);

  //* Step7.1:- Create a array which stores the history.
  const History = [
    {
      role: "user",
      parts: [{ text: `Review and fix all code files in: ${directoryPath}` }],
    },
  ];

  const MAX_ITERATIONS = 20;
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: History,
        config: {
          systemInstruction: `# ROLE
            You are a senior full-stack code reviewer with expertise in HTML, CSS, JavaScript, and TypeScript. Your mission: analyze, identify, and AUTO-FIX code issues.
    
            # WORKFLOW (Execute in order - MANDATORY)
            1. **SCAN**: Call \`listFiles\` with the provided directory path
            2. **READ**: Call \`readFile\` for EVERY file returned - DO NOT SKIP ANY FILE
            3. **ANALYZE**: Identify issues in each file
            4. **FIX**: You MUST call \`writeFile\` with the COMPLETE FIXED CODE for each file that has issues. Do NOT just describe fixes - ACTUALLY WRITE the fixed file content.
            5. **REPORT**: After all writeFile calls are complete, output final summary
            
            ⚠️ CRITICAL: Step 4 requires you to call writeFile with the entire fixed file content. Do not skip this step. Do not just report issues without fixing them.
            
            # ANALYSIS CRITERIA
            
            ## 🔴 CRITICAL (Must Fix)
            | Category | Issues |
            |----------|--------|
            | Security | Hardcoded secrets, API keys, passwords, eval(), innerHTML with user input, XSS vulnerabilities, SQL injection patterns |
            | Runtime Bugs | Null/undefined access, missing await, unhandled promise rejections, infinite loops, memory leaks |
            
            ## 🟠 HIGH (Should Fix)
            | Category | Issues |
            |----------|--------|
            | HTML | Missing DOCTYPE, no meta charset/viewport, missing alt attributes, broken semantic structure, accessibility violations (ARIA) |
            | CSS | Syntax errors, invalid properties, !important abuse, z-index conflicts |
            | JS/TS | Unused variables, unreachable code, type coercion bugs, missing error handling |
            
            ## 🟡 MEDIUM (Recommended)
            | Category | Issues |
            |----------|--------|
            | Performance | Inefficient selectors, render-blocking patterns, unnecessary DOM queries |
            | Code Quality | console.log statements, commented code blocks, poor naming, magic numbers |
            | Maintainability | Missing JSDoc, overly complex functions (>30 lines), deep nesting (>3 levels) |
            
            # FIX RULES
            - Preserve original functionality
            - Add defensive null checks where needed
            - Replace insecure patterns with safe alternatives
            - Remove debug code (console.log, debugger)
            - Do NOT change code style preferences (tabs vs spaces, quotes)
            
            # OUTPUT FORMAT
            \`\`\`
            📊 CODE REVIEW SUMMARY
            ━━━━━━━━━━━━━━━━━━━━━
            Files Scanned: [X] | Files Fixed: [Y] | Issues Found: [Z]
            
            🔴 CRITICAL FIXES:
            • [filename]:[line] - [issue] → [fix applied]
            
            🟠 HIGH PRIORITY FIXES:
            • [filename]:[line] - [issue] → [fix applied]
            
            🟡 IMPROVEMENTS:
            • [filename]:[line] - [issue] → [fix applied]
            
            ✅ CLEAN FILES: [list files with no issues]
            \`\`\`
            
            # CONSTRAINTS
            - Skip node_modules, dist, build, .git directories
            - Process only: .html, .css, .js, .ts, .jsx, .tsx
            - If file has no issues, do not call writeFile for it
            - Be precise, do not fabricate issues`,

          tools: [
            {
              functionDeclarations: [
                listFilesTool,
                writeFileTool,
                readFileTool,
              ],
            },
          ],
        },
      });

      //* Step7.2:- Check if the response has function calls.
      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        //* Step7.2.1:- Collect all function calls parts for model message
        const modelParts = [];
        const userParts = [];

        for (const functionCall of functionCalls) {
          const { name, args } = functionCall;

          console.log(`📌 ${name}`);

          // Check if function exists in registry
          if (!toolRegistry[name]) {
            console.error(`❌ Unknown function: ${name}`);
            continue;
          }

          const toolResponse = await toolRegistry[name](args);

          // Collect model's function call part
          modelParts.push({ functionCall });

          // Collect user's function response part
          userParts.push({
            functionResponse: {
              name,
              response: {
                result: toolResponse,
              },
            },
          });
        }

        // Push all function calls in a single model message
        if (modelParts.length > 0) {
          History.push({
            role: "model",
            parts: modelParts,
          });

          // Push all function responses in a single user message
          History.push({
            role: "user",
            parts: userParts,
          });
        }
      } else {
        // Get the text response
        console.log("\n" + response.text);
        break;
      }
    } catch (error) {
      console.error(`\n❌ API Error: ${error.message}`);
      if (error.message.includes("429") || error.message.includes("quota")) {
        console.error("💡 Rate limit hit. Please wait and try again.");
      }
      break;
    }
  }

  if (iteration >= MAX_ITERATIONS) {
    console.log("\n⚠️ Max iterations reached. Stopping.");
  }
}

//* Step8:- Get the directory path from the command line arguments. Here process.argv is an array of command line arguments (e.g. ["node", "codeReviewer.js", "../Day05/Cursor.js"], in this case process.argv[2] will be "../Day05/Cursor.js").
const directory = process.argv[2] || ".";

//* Step9:- Run the agent.
await codeReviewer({ directoryPath: directory });
