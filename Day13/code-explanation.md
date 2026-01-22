# Two-Stage Intelligent RAG System - Step by Step Approach

This document explains the thinking and approach behind the `advanceQueryPhase.js` code.

---

## Problem Statement

A simple RAG system has a major problem - **context loss**. When a user asks follow-up questions like "Explain it briefly" or "Tell me more about that", the system should understand what "it" or "that" refers to.

---

## Solution Architecture

We designed a **Two-Stage Architecture**:

1. **Stage 1: Router/Query Transformer** - Analyzes the user's query and decides how to build context
2. **Stage 2: Answer Generator** - Generates the final answer with proper context

---

## Step-by-Step Approach

### Step 1: Environment Setup

**Thinking:** First, we need to set up basic configuration - API keys, embeddings model, and Pinecone vector database connection.

**Approach:**

- Load environment variables using dotenv
- Configure Google Generative AI Embeddings (text-embedding-004 model)
- Initialize the Pinecone client and connect to the index

---

### Step 2: Dual LLM Strategy

**Thinking:** Using a single LLM for all tasks is inefficient. We need a fast/cheap model for routing decisions and a powerful model for answer generation.

**Approach:**

- **Router LLM** → `gemini-2.5-flash-lite` (fast, low cost, temperature 0 for deterministic output)
- **Answer LLM** → `gemini-2.5-flash` (powerful, temperature 0.3 for slightly creative answers)

---

### Step 3: Chat History Management

**Thinking:** To handle follow-up questions, we need to maintain conversation history. Each entry should track role (user/assistant), content, and query number.

**Approach:**

- Maintain a `chatHistory` array
- Store each entry as: `{ role, content, query_no }`
- Track each conversation turn using `queryCounter`

---

### Step 4: Router System Prompt Design

**Thinking:** The router needs clear instructions on:

1. How to resolve pronouns ("it", "this", "that")
2. When to assign `function_call: "Normal"` vs `function_call: "Advance"`
3. Whether the query is independent or dependent

**Approach:**

- **Pronoun Resolution Rule** → Always resolve to the MOST RECENT query's topic
- **Normal vs Advance Rule:**
  - `Normal` → User is asking about their own previous question's topic
  - `Advance` → User is explicitly referencing content from the AI's response
- Define a JSON schema with clear fields

---

### Step 5: Router Function Implementation

**Thinking:** The router function needs to:

1. Take previous user queries as context
2. Analyze the current query
3. Return a JSON decision

**Approach:**

- Filter only user queries from chat history (format: `[Query N]: content`)
- Use PromptTemplate with dynamic variables
- Create a RunnableSequence chain: Prompt → LLM → StringOutputParser
- Parse JSON with error handling and fallback to independent query

---

### Step 6: Vector Search Function

**Thinking:** For semantic search in Pinecone, the query must first be embedded, then similar vectors are retrieved.

**Approach:**

- Embed the query using Google Embeddings
- Query Pinecone with topK=10
- Extract text metadata from results and join them

---

### Step 7: Context Building Logic (Core Intelligence)

**Thinking:** This is the most critical step. Context must be built based on the router's decision:

1. **Independent Query** → Only vector search results
2. **Dependent + Normal** → Vector results + Previous user queries
3. **Dependent + Advance** → Vector results + Specific user query + AI response

**Approach:**

- If `query_type === "independent"` → Return only vector context
- If `function_call === "Normal"` → Append all previous user queries
- If `function_call === "Advance"` → Find the specific query_no's user entry and assistant entry, append both

---

### Step 8: Main Chatting Function Flow

**Thinking:** All pieces need to be connected into a single flow.

**Approach:**

1. Receive the user query
2. Call the router → Get decision (rewritten query, function_call, query_no, query_type)
3. Perform vector search using the rewritten query
4. Build full context based on the router decision
5. Send context + question to the Answer LLM
6. Update chat history (both user and assistant entries)
7. Display the answer

---

### Step 9: Answer Generation Prompt

**Thinking:** The final answer prompt should be clear and focused.

**Approach:**

- Provide context clearly
- Include instructions: Answer only from context, say "I don't have enough information" if not found
- Ask to include code examples if relevant

---

### Step 10: Main Loop Design

**Thinking:** Provide an interactive CLI experience. Avoid recursion (stack overflow risk).

**Approach:**

- Use a `while(true)` loop
- Take synchronous input using `readline-sync`
- Break on "exit"
- Handle empty input gracefully

---

## Key Design Decisions

| Decision                        | Reason                                      |
| ------------------------------- | ------------------------------------------- |
| Dual LLM                        | Cost optimization + Speed for routing       |
| Temperature 0 for Router        | Deterministic, consistent routing decisions |
| Query numbering                 | Precise reference to past conversations     |
| Separate user/assistant history | Different use cases for Normal vs Advance   |
| Most recent pronoun resolution  | Natural conversation flow expectation       |

---

## Edge Cases Handled

1. **Pronoun resolution** → "it", "this", "that" → Most recent topic
2. **New independent query** → No history needed
3. **Follow-up on own question** → Normal mode, user queries as context
4. **Reference to AI's answer** → Advance mode, full conversation as context
5. **JSON parse failure** → Fallback to independent query
6. **Empty user input** → Skip and ask again
