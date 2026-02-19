# 🔍 AI Code Reviewer - Complete Project Guide

[Notion Docs Link](https://www.notion.so/Lecture-07-Build-Code-Reviewer-2d3a9af81c988071b829e3163129b078?source=copy_link)

> A step-by-step guide to building an AI-powered code reviewer using Google's Gemini API with function calling capabilities.

---

## 📑 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [How It Works](#how-it-works)
6. [Usage](#usage)
7. [Expert Tips & Improvements](#expert-tips--improvements)
8. [Security Considerations](#security-considerations)

---

## 📋 Project Overview

**What does this project do?**

- Scans a directory for code files (HTML, CSS, JS, TS, JSX, TSX)
- Uses AI (Gemini) to analyze code for bugs, security issues, and quality problems
- Automatically fixes issues and writes corrected code back
- Provides a summary report of all changes

**Key Concept: Function Calling (Tool Use)**
This project demonstrates **Agentic AI** - where the AI model calls tools (functions) to interact with the real world (file system).

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Request                            │
│                "Review code in ./my-project"                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI Agent (Gemini)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              System Instruction (Prompt)                  │   │
│  │  - Role definition                                        │   │
│  │  - Workflow steps                                         │   │
│  │  - Analysis criteria                                      │   │
│  │  - Output format                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Function Calling Loop                        │
│                                                                 │
│   AI decides which tool to call ──► Tool executes ──► Result   │
│                                        │                        │
│                                        ▼                        │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │ list_files  │  │  read_file  │  │ write_file  │            │
│   │   Tool      │  │    Tool     │  │    Tool     │            │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Final Summary Report                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Prerequisites

### Dependencies

```bash
npm install @google/genai dotenv
```

### Environment Setup

Create a `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
GOOGLE_GENAI_USE_VERTEXAI=false
```

---

## 📝 Step-by-Step Implementation

### Step 1: Import Required Modules

```javascript
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config"; // Auto-loads .env file
import fs from "fs";
import path from "path";
```

**Why these imports?**

- `GoogleGenAI`: Main SDK to interact with Gemini API
- `Type`: Used for defining function parameter types in JSON Schema format
- `dotenv/config`: Automatically loads environment variables from `.env`
- `fs`, `path`: Node.js file system utilities

---

### Step 2: Create Tool Functions

**Tool 1: List Files**

```javascript
async function listFiles({ directory }) {
  const files = [];
  const extensions = [".html", ".css", ".js", ".ts", ".jsx", ".tsx"];

  function scan(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      // Skip common non-source directories
      if (
        fullPath.includes("node_modules") ||
        fullPath.includes("dist") ||
        fullPath.includes("build")
      )
        continue;

      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        scan(fullPath); // Recursive scan
      } else {
        if (extensions.includes(path.extname(item))) {
          files.push(fullPath);
        }
      }
    }
  }

  scan(directory);
  return { files };
}
```

**Key Concepts:**

- Uses **recursive directory scanning**
- Filters by file extension
- Skips `node_modules`, `dist`, `build` directories

---

**Tool 2: Read File**

```javascript
async function readFile({ file_path }) {
  const content = fs.readFileSync(file_path, "utf-8");
  return { content };
}
```

---

**Tool 3: Write File**

```javascript
async function writeFile({ file_path, content }) {
  fs.writeFileSync(file_path, content, "utf-8");
  return { success: true };
}
```

---

### Step 3: Create Tool Registry

```javascript
const toolRegistry = {
  list_files: listFiles,
  read_file: readFile,
  write_file: writeFile,
};
```

**Why?** Maps AI's function call names to actual JavaScript functions.

---

### Step 4: Define Tool Declarations (JSON Schema)

The AI needs to know:

1. What tools are available
2. What parameters each tool accepts

```javascript
const listFilesTool = {
  name: "listFiles",
  description: "List all files in the directory",
  parameters: {
    type: Type.OBJECT,
    properties: {
      directory: {
        type: Type.STRING,
        description: "The directory path to scan",
      },
    },
    required: ["directory"],
  },
};
```

**Important:** The `name` in declaration must match the registry key.

---

### Step 5: Initialize AI Client

```javascript
const ai = new GoogleGenAI({});
```

The SDK automatically reads `GEMINI_API_KEY` from environment.

---

### Step 6: Create the Agent Function

```javascript
export async function codeReviewer({ directoryPath }) {
  const History = [
    {
      role: "user",
      parts: [
        { text: `Review and fix all code in: ${directoryPath}` },
      ],
    },
  ];

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: History,
      config: {
        systemInstruction: `...`, // Your optimized prompt
        tools: [{ functionDeclarations: [...] }],
      },
    });

    if (response.functionCalls?.length > 0) {
      // Execute each function call
      for (const functionCall of response.functionCalls) {
        const { name, args } = functionCall;
        const toolResponse = await toolRegistry[name](args);

        // Add to conversation history
        History.push({ role: "model", parts: [functionCall] });
        History.push({
          role: "user",
          parts: [{
            functionResponse: {
              name,
              response: { result: toolResponse },
            },
          }],
        });
      }
    } else {
      // No more function calls - output final response
      console.log(response.text);
      break;
    }
  }
}
```

**The Agentic Loop Explained:**

1. Send request to AI
2. If AI calls a function → execute it → add result to history → repeat
3. If AI returns text → print it → exit loop

---

### Step 7: Run the Agent

```javascript
const directory = process.argv[2] || ".";
await codeReviewer({ directoryPath: directory });
```

---

## 🔄 How It Works (Flow)

```
1. User runs: node codeReviewer.js ./my-project
                    │
2. AI receives: "Review and fix all code in: ./my-project"
                    │
3. AI decides: "I need to list files first"
   └─► Calls: list_files({ directory: "./my-project" })
                    │
4. Tool returns: { files: ["./my-project/app.js", ...] }
                    │
5. AI decides: "I need to read each file"
   └─► Calls: read_file({ file_path: "./my-project/app.js" })
                    │
6. Tool returns: { content: "const x = null.something..." }
                    │
7. AI analyzes and finds bug, decides to fix
   └─► Calls: write_file({ file_path: "...", content: "..." })
                    │
8. Repeat for all files...
                    │
9. AI outputs final summary report (TEXT, no function call)
                    │
10. Loop breaks, program exits
```

---

## 🚀 Usage

```bash
# Review current directory
node codeReviewer.js .

# Review specific project
node codeReviewer.js ../my-project

# Review a folder
node codeReviewer.js /path/to/project
```

---

## 💡 Expert Tips & Improvements

### 1. **Add Parallel File Processing**

Currently files are processed sequentially. For large projects:

```javascript
// Process files in parallel batches
const BATCH_SIZE = 5;
const batches = chunk(files, BATCH_SIZE);
for (const batch of batches) {
  await Promise.all(batch.map((file) => processFile(file)));
}
```

### 2. **Add Dry-Run Mode**

Don't modify files, just report:

```javascript
const DRY_RUN = process.argv.includes("--dry-run");

async function writeFile({ file_path, content }) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would fix: ${file_path}`);
    return { success: true, dryRun: true };
  }
  fs.writeFileSync(file_path, content, "utf-8");
  return { success: true };
}
```

### 3. **Add Backup Before Modification**

```javascript
async function writeFile({ file_path, content }) {
  // Create backup
  const backupPath = `${file_path}.backup.${Date.now()}`;
  if (fs.existsSync(file_path)) {
    fs.copyFileSync(file_path, backupPath);
  }

  fs.writeFileSync(file_path, content, "utf-8");
  return { success: true, backup: backupPath };
}
```

### 4. **Add File Type Specific Linting Tools**

```javascript
// For JS/TS files, you could also run ESLint
import { ESLint } from "eslint";

async function lintFile({ file_path }) {
  const eslint = new ESLint({ fix: true });
  const results = await eslint.lintFiles([file_path]);
  await ESLint.outputFixes(results);
  return { lintResults: results };
}
```

### 5. **Add Rate Limiting**

Prevent API quota exhaustion:

```javascript
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// In the loop
await sleep(1000); // 1 second delay between API calls
```

### 6. **Add Structured Logging**

```javascript
import pino from "pino";
const logger = pino({ level: "info" });

// Replace console.log
logger.info({ file: file_path }, "Reading file");
logger.warn({ issue: "XSS vulnerability" }, "Security issue found");
```

### 7. **Add Configuration File Support**

```javascript
// .codereviewer.json
{
  "extensions": [".js", ".ts", ".jsx", ".tsx"],
  "ignore": ["node_modules", "dist", "*.test.js"],
  "severity": "high",
  "dryRun": false
}
```

### 8. **Add Git Integration**

```javascript
import { execSync } from "child_process";

function isGitRepo(directory) {
  try {
    execSync("git rev-parse --is-inside-work-tree", { cwd: directory });
    return true;
  } catch {
    return false;
  }
}

function createBranch(name) {
  execSync(`git checkout -b ai-fixes-${Date.now()}`);
}
```

---

## 🔒 Security Considerations

### 1. ⚠️ **API Key Exposure**

**Risk:** API key in `.env` can be accidentally committed.

**Mitigation:**

```bash
# Add to .gitignore
echo ".env" >> .gitignore
```

### 2. ⚠️ **Arbitrary File Write**

**Risk:** AI could potentially write to any file on the system.

**Mitigation:**

```javascript
async function writeFile({ file_path, content }) {
  // Validate path is within allowed directory
  const resolvedPath = path.resolve(file_path);
  const allowedDir = path.resolve(process.cwd());

  if (!resolvedPath.startsWith(allowedDir)) {
    throw new Error("Path traversal attempt blocked");
  }

  fs.writeFileSync(file_path, content, "utf-8");
  return { success: true };
}
```

### 3. ⚠️ **Sensitive Data in Code**

**Risk:** AI sees your source code, including any hardcoded secrets.

**Mitigation:**

- Never have secrets in code being reviewed
- Consider filtering content before sending to API

### 4. ⚠️ **No Input Validation**

**Risk:** Command line argument can be manipulated.

**Mitigation:**

```javascript
const directory = process.argv[2] || ".";

// Validate directory exists
if (!fs.existsSync(directory)) {
  console.error("Directory does not exist");
  process.exit(1);
}

// Validate it's a directory
if (!fs.statSync(directory).isDirectory()) {
  console.error("Path is not a directory");
  process.exit(1);
}
```

### 5. ⚠️ **Unlimited Loop Risk**

**Risk:** If AI keeps calling functions infinitely.

**Mitigation:**

```javascript
const MAX_ITERATIONS = 50;
let iterations = 0;

while (true) {
  iterations++;
  if (iterations > MAX_ITERATIONS) {
    console.error("Max iterations reached, stopping");
    break;
  }
  // ... rest of loop
}
```

### 6. ⚠️ **No Error Handling**

**Risk:** Synchronous file operations can throw.

**Mitigation:**

```javascript
async function readFile({ file_path }) {
  try {
    const content = fs.readFileSync(file_path, "utf-8");
    return { content };
  } catch (error) {
    return { error: error.message };
  }
}
```

---

## 📚 Key Learning Points

1. **Function Calling** = AI calling your code
2. **Agentic Loop** = Continuous AI-tool interaction cycle
3. **Tool Declaration** = JSON Schema describing function interface
4. **Conversation History** = Maintains context between calls
5. **System Instruction** = Defines AI's behavior and expertise

---

## 🎯 Summary

| Component           | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `listFiles`         | Recursively scan directory for code files     |
| `readFile`          | Read file content for AI analysis             |
| `writeFile`         | Write AI-corrected code back                  |
| `toolRegistry`      | Map function names to implementations         |
| `toolDeclarations`  | Tell AI what tools are available              |
| `systemInstruction` | Define AI's role, workflow, and output format |
| `History`           | Maintain conversation context                 |
| `while(true)` loop  | Agentic execution loop                        |

---
