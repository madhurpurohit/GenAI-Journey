# Terminal AI Agent like Cursor: Technical Documentation & Workflow

## 📌 Overview

This project is a **Node.js-based AI Agent** that leverages the Google Gemini API to interact with the local operating system. Unlike a standard chatbot, this script can actually "do" things on your computer (like creating folders, installing packages, or reading files) by converting your natural language instructions into executable shell commands.

---

## 🛠 Project Components

### 1. Environment & Dependencies

- **`@google/genai`**: The official SDK to interact with Gemini models.
- **`child_process` & `util.promisify**`: Used to execute shell commands and handle them using `async/await`.
- **`os`**: Detects the platform (Windows, Linux, macOS) to ensure the AI provides the correct syntax for that specific OS.
- **`readline-sync`**: Handles synchronous user input in the terminal.

### 2. The Core Tool: `executeCMD`

This is a Javascript function that takes a `command` string, runs it in your terminal, and returns the result (either `stdout` for success or `stderr` for errors).

### 3. Function Calling (Tool Definition)

The `executeTool` object is a schema that describes the `executeCMD` function to the AI. It tells the model:

- **Name**: What the function is called.
- **Description**: When the AI should use it.
- **Parameters**: What inputs (like the command string) are required.

---

## 🔄 Step-by-Step Workflow

When you run the script, the following sequence occurs:

1. **Initialization**: The script detects your OS (e.g., `win32`) and initializes the Gemini Model.
2. **User Input**: You type a request (e.g., "Create a new React app called 'my-app'").
3. **The Reasoning Loop (`webBuilder` function)**:

- The prompt is sent to Gemini along with the **Tool Definition**.
- **Decision**: Gemini decides if it needs to run a command.
- _If yes_: It returns a `functionCall`.
- _If no_: It returns a text response.

4. **Action**: If a `functionCall` is received, the script runs `executeCMD(args.command)` locally.
5. **Feedback**: The result of the command (Success/Error) is pushed back into the `History` array.
6. **Recursive Check**: The model is called again with the updated history. It sees the result of the previous command and decides what to do next (e.g., "The folder was created, now I should run `npm install`").
7. **Final Output**: Once the task is complete, the AI provides a final text summary to the user.

---

## 🧠 Key Logic: Handling History

The script maintains a `History` array. This is crucial because:

- It allows the AI to remember what it has already done.
- It provides the "State" of the terminal back to the AI.
- Roles are toggled between `user` and `model` to maintain a valid conversation flow required by the API.

---

## 💡 Pro-Tips for Revision

### 1. The Power of System Prompts

The `getSystemPrompt(platform)` is the "Brain" of the operation. It should strictly instruct the AI to:

- Identify the current directory.
- Use OS-specific commands (e.g., `dir` for Windows vs `ls` for Linux).
- Be concise and avoid unnecessary explanations.

### 2. Security Warning (Critical)

Using `exec` with AI is **powerful but dangerous**. The AI could theoretically run `rm -rf /` or `del /s /q C:\`.

- **Tip**: For a production version, always add a "Confirm" step before `executeCMD` actually runs the code.

### 3. Debugging

If a command fails, the `stderr` is sent back to the AI. Gemini is smart enough to see the error, understand what went wrong, and try a corrected command automatically.

### 4. Scalability

You can expand this by adding more tools to the `functionDeclarations` array, such as:

- `readFile`: To let the AI read your code.
- `fetchURL`: To let the AI get documentation from the web.

---

## 🚀 How to build/run this

1. Ensure a `.env` file exists with your `GOOGLE_API_KEY`.
2. Install dependencies: `npm install @google/genai dotenv readline-sync`.
3. Run the script: `node index.js`.

---
