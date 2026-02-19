# 🎬 GraphRAG Indexing Pipeline — Complete Flow Documentation

## Overview

This is a **GraphRAG (Graph + Retrieval Augmented Generation) Indexing Pipeline** that reads a PDF file (containing data for 1000 movies) and stores the extracted data in two databases:

1. **Neo4j** (Graph Database) — Facts and relationships are stored here, such as "Which actor appeared in which movie", "Which director made which movie", etc.
2. **Pinecone** (Vector Database) — Movie description embeddings are stored here to enable similarity-based search, such as "Show me more movies like this one".

The pipeline works in 3 steps:

- **Step 1:** Upload the PDF and extract entities using Gemini AI
- **Step 2:** Build a graph in Neo4j from those entities
- **Step 3:** Generate embeddings from those entities and store them in Pinecone

---

## Entry Point: `7_runIndexing.js`

This is the **starting point** of the entire indexing pipeline — running this file kicks off the whole process.

### PDF Path Requirement

First, a `pdfPath` variable is defined which holds the path to the PDF file (`./data/movies.pdf`). This path is passed to the `runIndexing` function. If the PDF path is not available, the program prints an error message and exits.

### `runIndexing(pdfPath)` — Main Orchestrator Function

This is an **async function** that controls the entire pipeline. Think of it as a manager — it doesn't do any heavy lifting itself, but calls other specialist functions in the correct order.

This function performs 3 tasks sequentially:

#### Step 1 → `extractAllEntities(pdfPath)` is called

- This function comes from the `4_entityExtractor.js` file
- It receives the PDF file path as input
- It sends the entire PDF to Gemini AI and returns structured JSON data — each movie's title, director, actors, genres, themes, awards, etc.
- The result is an **array of entities**

#### Step 2 → `buildGraph(entities)` is called

- This function comes from the `5_graphBuilder.js` file
- It receives the entities array from Step 1
- It stores each entity as nodes and relationships in the Neo4j database

#### Step 3 → `buildVectorStore(entities)` is called

- This function comes from the `6_vectorStore.js` file
- It also receives the same entities array
- It creates a clean text description for each movie, generates its embedding (numerical vector) via Gemini, and stores it in the Pinecone database

#### Error Handling & Cleanup

If an error occurs at any step, the `catch` block logs that error. Whether the pipeline succeeds or fails, the `finally` block calls `closeConnections()` (imported from `2_config.js`) — this closes the Neo4j connection pool to free up resources.

---

## Foundation: `2_config.js` — All Connections in One Place

This file is the **backbone** of the entire project. All other files import their database connections and AI models from here. If any API key or connection detail needs to change, it only needs to be modified in this single file.

### This file sets up 4 things:

1. **Neo4j Driver** — Used to connect to the graph database. It creates a connection pool (meaning it can handle multiple queries simultaneously). The `neo4j+s://` protocol is used, which is the Bolt protocol with TLS encryption (required for cloud-based Aura).

2. **Pinecone Client & Index** — Used to connect to the vector database. `Pinecone()` creates the client, then `pinecone.index()` points to a specific index (similar to a table). The index name comes from the `.env` file.

3. **Gemini LLM (via LangChain)** — This is Google's AI model that understands text and produces structured output. The `gemini-2.5-flash` model is used because it is fast and cost-effective. `temperature: 0` is set to make the output deterministic (same input always produces the same output).

4. **Google GenAI SDK** — This is Google's direct SDK. It is used in two places: for generating embeddings and for uploading PDF files. The direct SDK is used instead of LangChain because it is simpler and is already required for PDF uploads.

### Embedding Functions

- **`embedText(text)`** — Generates an embedding for a single text. It uses the `gemini-embedding-001` model and returns a 3072-dimensional vector. The response contains an `.embeddings` array (even for a single text), and each element has a `.values` property which is the actual vector.

- **`embedTexts(texts)`** — Generates embeddings for multiple texts at once. It uses the same model and returns an array of vectors.

### `closeConnections()`

This function closes the Neo4j driver's connection pool. It is called when all pipeline work is complete, from the `finally` block in `7_runIndexing.js`.

---

## Step 1 Detail: `4_entityExtractor.js` — Entity Extraction from PDF

This is the most complex file in the entire indexing pipeline. Its job is to send the PDF to Gemini AI and receive structured JSON entities back.

### Approach — What is the strategy?

Instead of locally parsing the PDF and extracting text, this file uploads the PDF directly to the **Gemini Files API**. Gemini's 1 million token context window is large enough to read the entire 1000-movie PDF at once. It then extracts entities in batches (50 movies per batch).

**Efficiency**: 1000 movies ÷ 50 per batch = only 20 API calls (not a separate call for each movie — it is done in bulk).

### Extraction Prompt

A fixed `EXTRACTION_PROMPT` string is defined that tells Gemini what to do:

- Extract movies {START} through {END} from the PDF
- Return a JSON structure for each movie containing the movie title, year, director name, actors list, genres list, themes list, and awards list
- If awards say "None", return an empty array
- The response should contain only valid JSON — no markdown or explanations

`{START}` and `{END}` are placeholders that get replaced for each batch.

### `uploadPDF(pdfPath)` — Uploading the PDF to Gemini's Servers

This function uploads the PDF file to Google's servers via `genai.files.upload()`. After uploading, the file is not immediately ready — its state is "PROCESSING". The function runs a polling loop: every 3 seconds it checks whether the file has finished processing. When the state changes from "PROCESSING":

- If the state is "FAILED", an error is thrown
- Otherwise, a `fileInfo` object is returned containing the file's `uri`, `name`, and `mimeType`

The uploaded file remains on Google's servers for **48 hours**, after which it is automatically deleted.

### `extractBatch(fileInfo, start, end, attempt)` — Extracting a Single Batch

This function extracts a specific range of movies (e.g., 1 to 50, 51 to 100). It receives the uploaded file's `fileInfo` object.

**How the API call works:**

The `genai.models.generateContent()` function is called with:

- A specified model (`gemini-2.5-flash-lite`)
- A `contents` array containing two parts:
  1. **PDF file reference** — Here, the **`createPartFromUri(fileInfo.uri, fileInfo.mimeType)`** function is used
  2. **Text prompt** — Which specifies which movies to extract

#### Detailed Explanation of `createPartFromUri()`

This function is imported from the `@google/genai` package. Its job is to create a **"part" object** that tells the Gemini API that there is a file already uploaded on Google's servers, and to include it in the context.

**Why is it necessary?** — When you send multi-modal content (text + file) to the Gemini API, you need to provide "parts" inside the `contents` array. For text, you simply provide `{ text: "..." }`. However, for an uploaded file, you need to specify its URI and MIME type — this is exactly what `createPartFromUri()` does. It returns an object that Gemini can understand, essentially saying "this file is stored on my servers at this URI, go read it from there".

**When is it used?** — Every time a batch needs to be extracted. The PDF is uploaded only once, but each batch API call uses `createPartFromUri()` to create a new reference so that Gemini knows which file to read. It does **not re-upload** the file — it simply provides a pointer to the already uploaded file.

**When would you need it?** — Whenever you upload a file to the Gemini Files API and then want to reference that file in a `generateContent` call. Without it, Gemini would have no way of knowing which uploaded file to use.

**Response processing:**

The raw text returned by Gemini sometimes contains markdown backticks (`\`\`\`json ... \`\`\``). These are first cleaned out, and then `JSON.parse()` is used to parse the result. If the result is not an array, it is wrapped in one before being returned.

#### Retry Strategy

Each batch gets a maximum of 3 attempts:

- **429 Error (Rate Limit)** — This means Google's servers have indicated too many requests are being sent. In this case, a longer wait is applied: 30s, 60s, 90s (attempt × 30 seconds)
- **Any other error** (JSON parse failure, network timeout, 500/503 server error) — A shorter wait is applied: 10s, 20s, 30s (attempt × 10 seconds)
- If all 3 attempts fail, an empty array is returned and that batch is marked as "failed"

### `extractAllEntities(pdfPath, totalMovies, batchSize)` — The Complete Extraction Process

This is the main function that orchestrates the entire extraction. Default values are: 1000 movies, 50 per batch.

**Step-by-step breakdown:**

1. **PDF upload** — `uploadPDF(pdfPath)` is called. The file is uploaded once and a `fileInfo` object is obtained

2. **Building the batch list** — A loop calculates which ranges need to be extracted: (1-50), (51-100), (101-150), ... (951-1000). This results in a total of 20 batches

3. **Pass 1 — Parallel extraction** — 5 batches are run simultaneously (in parallel). This is controlled by `CONCURRENCY = 5`. This means 20 batches ÷ 5 parallel = 4 rounds. In each round, `Promise.all()` is used to fire 5 requests at the same time. A small 2-second break is added between rounds. Successfully returned batches have their results added to the main list. Failed batches are added to the `failedBatches` list.

4. **Pass 2 — Retrying failed batches** — If any batches failed, after a 5-second wait, all failed batches are retried one by one (sequentially), with a 2-second gap between each retry

5. **Cleanup** — The uploaded PDF file is deleted from Google's servers using `genai.files.delete()` (it would auto-delete in 48 hours anyway, but proactive cleanup is better practice)

6. **Return** — The final result is an array containing all extracted entities. If some movies are missing, a warning is printed

---

## Step 2 Detail: `5_graphBuilder.js` — Building the Graph in Neo4j

This file's job is to store the extracted entities as nodes and relationships in a graph database (Neo4j).

### Core Concept — MERGE vs CREATE

When inserting data into the graph, there is an important decision:

- **CREATE** — Always creates a new node, even if the same data already exists. This causes duplicates (e.g., two "Zendaya" nodes)
- **MERGE** — First checks whether the node already exists. If yes, it uses the existing one; if no, it creates a new one. This prevents duplicates

The entire project uses **MERGE** to ensure that each actor or genre exists as only a single node.

### `buildGraph(entities)` — Main Function

This function controls the entire graph building process. It receives the entities array (which comes from Step 1).

**Step 1 — Creating indexes:**

Before inserting any data, indexes are created in Neo4j for each label (Movie, Director, Actor, Genre, Theme, Award). Why are indexes necessary? Because when performing a MERGE, Neo4j first needs to check "does this node already exist?". Without an index, this check requires **scanning all nodes** (slow). With an index, it uses a lookup table for instant retrieval (fast). `CREATE INDEX IF NOT EXISTS` is used so that if the index already exists, no error is thrown.

**Step 2 — Inserting movies:**

A loop calls `insertMovieGraph(entity)` for each entity. After every 50 movies or at the last movie, progress is logged.

**Step 3 — Printing statistics:**

After all data is inserted, two Cypher queries are executed:

- Count total nodes (`MATCH (n) RETURN count(n)`)
- Count total relationships (`MATCH ()-[r]->() RETURN count(r)`)

### `insertMovieGraph(entity)` — Inserting a Complete Graph for a Single Movie

This function creates all nodes and relationships in Neo4j for a single movie entity. It runs within **a single transaction** (`session.executeWrite`) — meaning either all data is inserted or none of it is (all-or-nothing).

Inside the transaction, the following nodes and relationships are created:

1. **Movie node** — A Movie node is MERGEd based on the title, and the year is set
2. **Director node + DIRECTED relationship** — A Director node is MERGEd, then a `DIRECTED` relationship is MERGEd between that Director and the Movie
3. **Actor nodes + ACTED_IN relationships** — For each actor, an Actor node is MERGEd and an `ACTED_IN` relationship connects it to the Movie
4. **Genre nodes + BELONGS_TO relationships** — For each genre, a Genre node is MERGEd and a `BELONGS_TO` relationship connects the Movie to the Genre
5. **Theme nodes + EXPLORES relationships** — For each theme, a Theme node is MERGEd and an `EXPLORES` relationship connects the Movie to the Theme
6. **Award nodes + WON relationships** — For each award, regex pattern matching is applied

#### Detailed Explanation of Award Regex Parsing (Line 84)

Awards in the PDF appear in the following format: `"Oscar (Best Cinematography)"`. This function uses a regex pattern: `/^(.+?)\s*\((.+)\)$/`

Here is the breakdown of this regex:

- `^(.+?)` — Matches any text from the beginning (non-greedy), such as "Oscar" or "Golden Globe" — this is the **award type**
- `\s*` — Skips any optional spaces in between
- `\((.+)\)$` — Everything inside the opening and closing brackets — this is the **category**, such as "Best Cinematography"

So `"Oscar (Best Cinematography)"` produces two capture groups:

- `match[1]` = `"Oscar"` (award type)
- `match[2]` = `"Best Cinematography"` (category)

These two values are stored as separate properties in the Award node (`name` = award type, `category` = category). A `WON` relationship is then created between the Movie and the Award.

If the award is not in this format (i.e., no brackets are present), the regex match fails and that award is skipped.

After usage, the session is closed via `session.close()` (in the `finally` block) — this is essential because each session in Neo4j consumes a database connection.

---

## Step 3 Detail: `6_vectorStore.js` — Storing Vectors in Pinecone

This file's job is to create a meaningful text description for each movie, convert it into an embedding (numerical vector), and store it in the Pinecone vector database.

### Purpose of the Vector Database

A vector database stores **meaning**, not facts. It can answer: "Show me more movies similar to this one" (similarity search). It **cannot** answer: "Who directed this movie?" (that is Neo4j's job).

### `createEmbeddingText(entity)` — Creating a Clean Description

This function creates a clean, human-readable text description from an entity object. Since raw PDF text contains noise (extra spaces, formatting issues), a clean text produces better embedding results.

The description looks something like this: `"[Title] is a [genres] movie released in [year]. Directed by [director]. Starring [actors]. The movie explores themes of [themes]. Awards: [awards]."` — The awards part is only included when awards actually exist.

### `buildVectorStore(entities)` — Inserting Data into Pinecone

This is the main function. It receives the entities array and works in batches of 50 entities.

**Here is what happens in each batch:**

1. **Creating texts** — `createEmbeddingText()` is called for each entity in the batch. The result is an array of clean text descriptions

2. **Generating embeddings** — `embedTexts(texts)` is called (imported from `2_config.js`). This generates embeddings for all texts via Gemini — each text becomes a 3072-dimensional numerical vector

3. **Creating Pinecone records** — A record object is created for each entity containing:

#### Detailed Explanation of the Records Structure (Lines 54-66)

A Pinecone record needs to be created for each movie. Each record contains 3 components:

- **`id`** — This is a unique identifier for each movie. It takes the movie's title, replaces all spaces with hyphens (`-`), and converts everything to lowercase. For example, "The Dark Knight" becomes "the-dark-knight". This is necessary because every vector in Pinecone must have a unique ID, and having a human-readable ID helps during debugging.

- **`values`** — This is the actual embedding vector — an array of 3072 numbers that represents the meaning of that movie. This is the vector obtained from `embedTexts()`. Pinecone performs similarity search based on this — two vectors that are close to each other (in cosine similarity) represent movies that are similar.

- **`metadata`** — This is additional information stored alongside the vector. When Pinecone performs a similarity search and a vector matches, this metadata is returned so that you know which movie that vector belongs to. It includes: the movie title, year, director name, genres (comma-separated string), themes (comma-separated string), actors (comma-separated string), and the original clean text description. Arrays are converted to comma-separated strings using `.join(", ")` because Pinecone metadata does not directly support array storage.

4. **Upserting** — `pineconeIndex.upsert(records)` sends the records to Pinecone. **Upsert = Update + Insert**. This means if a movie with the same ID already exists, it will be updated; if it does not exist, it will be inserted as new. This prevents duplicates.

5. **Delay** — A 500ms wait is added after each batch (except the last one) — this prevents overwhelming Pinecone with too many requests at once

**At the end** — `pineconeIndex.describeIndexStats()` is called to print the total vector count, confirming that all data has been stored successfully.

---

## Complete Pipeline Flow Diagram

```
1. User runs: node 7_runIndexing.js
                    |
                    v
2. pdfPath = './data/movies.pdf' is set
                    |
                    v
3. runIndexing(pdfPath) is called
                    |
        ┌───────────┼───────────────────────────────────┐
        |           |                                   |
        v           v                                   v
   ┌─ STEP 1 ─┐  ┌── STEP 2 ──┐              ┌── STEP 3 ──┐
   | Extract   |  | Build      |              | Build      |
   | Entities  |  | Neo4j Graph|              | Vector     |
   | (Gemini)  |  | (Neo4j)    |              | Store      |
   └───────────┘  └────────────┘              | (Pinecone) |
        |              ^                      └────────────┘
        |              |                           ^
        └──entities──>─┘                           |
                       |                           |
                       └─────────entities─────────>┘
                                                   |
                                                   v
                                          closeConnections()
```

### File Dependency Chain

```
2_config.js (Foundation — all connections)
     ↑ import           ↑ import             ↑ import
     |                  |                    |
4_entityExtractor.js  5_graphBuilder.js  6_vectorStore.js
     ↑ import           ↑ import             ↑ import
     |                  |                    |
     └──────────────────┼────────────────────┘
                        |
                7_runIndexing.js (Entry Point)
```

### Summary Table

| File                   | Purpose                                                     | Input          | Output                       |
| ---------------------- | ----------------------------------------------------------- | -------------- | ---------------------------- |
| `2_config.js`          | Sets up all connections (Neo4j, Pinecone, Gemini)           | `.env` file    | Exported clients & functions |
| `3_pdfParser.js`       | Extracts text from PDF (not directly used in this pipeline) | PDF path       | Text blocks array            |
| `4_entityExtractor.js` | PDF → Gemini → Structured JSON entities                     | PDF path       | Array of entity objects      |
| `5_graphBuilder.js`    | Entities → Neo4j graph (nodes + relationships)              | Entities array | Graph database populated     |
| `6_vectorStore.js`     | Entities → Embeddings → Pinecone vectors                    | Entities array | Vector database populated    |
| `7_runIndexing.js`     | Calls all files in the correct order                        | PDF path       | Complete indexed system      |

> **Note:** The `3_pdfParser.js` file is not directly used in this indexing pipeline. It represents an alternative approach where the PDF is parsed locally. In the current pipeline, the PDF is uploaded directly to Gemini (via `4_entityExtractor.js`), so local parsing is not required.
