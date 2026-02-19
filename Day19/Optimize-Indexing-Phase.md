# 🎬 Optimized GraphRAG Indexing Pipeline — Complete Flow Documentation

## Overview

This is the **optimized version** of the GraphRAG Indexing Pipeline originally built in Day18. The core objective remains the same — read a PDF file containing 1000 movies, extract structured data, and store it in two databases:

1. **Neo4j** (Graph Database) — Stores facts and relationships (e.g., "Which actor acted in which movie")
2. **Pinecone** (Vector Database) — Stores embeddings for similarity-based search (e.g., "Show me movies like this")

The pipeline still runs in 3 steps, but **Step 3 (Vector Store)** has been fundamentally redesigned:

| Step   | Day18 (Previous)                         | Day19 (Optimized)                                   |
| ------ | ---------------------------------------- | --------------------------------------------------- |
| Step 1 | PDF → Gemini → Extract entities          | Same (no change)                                    |
| Step 2 | Entities → Neo4j graph                   | Same (no change)                                    |
| Step 3 | Entities → Clean text → Embed → Pinecone | **PDF → Parse → Chunk raw text → Embed → Pinecone** |

### Why Was Step 3 Redesigned?

In Day18, the vector store was built from **entity-based clean text** — each movie's entities (title, director, actors, genres, themes, awards) were combined into a single sentence and embedded. This approach had a critical limitation:

- **Information loss** — The clean text was a **lossy summary** of the movie data. Any information in the PDF that was not captured as a structured entity (e.g., plot descriptions, production notes, interesting trivia) was permanently lost from the vector store
- **Dependency on entity extraction** — If entity extraction missed a movie or extracted incomplete data, the vector store would also be incomplete
- **Shallow embeddings** — The generated sentences were formulaic ("X is a Y movie released in Z"), producing embeddings that captured **structure** rather than **meaning**

In Day19, the vector store is built from **raw PDF text chunks** — the PDF is parsed independently, the text is split into natural chunks, and each chunk is embedded directly. This means:

- **No information loss** — Every word from the PDF is preserved in the vector store
- **Independence** — The vector store does not depend on entity extraction; even if Step 1 fails, Step 3 can still work
- **Richer embeddings** — Raw text captures the full semantic meaning, not just structured fields

---

## Entry Point: `7_runIndexing.js`

This is the **starting point** of the entire indexing pipeline — running this file kicks off the whole process.

### PDF Path Requirement

First, a `pdfPath` variable is defined which holds the path to the PDF file (`./data/movies.pdf`). This path is passed to the `runIndexing` function. If the PDF path is not available, the program prints an error message and exits.

### `runIndexing(pdfPath)` — Main Orchestrator Function

This is an **async function** that controls the entire pipeline. It acts as a manager — calling specialist functions in the correct order without doing any heavy lifting itself.

This function performs 3 tasks sequentially:

#### Step 1 → `extractAllEntities(pdfPath)` is called

- This function comes from the `4_entityExtractor.js` file
- It receives the PDF file path as input
- It uploads the PDF to Gemini AI and extracts structured JSON data — each movie's title, director, actors, genres, themes, awards
- The result is an **array of entities**

#### Step 2 → `buildGraph(entities)` is called

- This function comes from the `5_graphBuilder.js` file
- It receives the entities array from Step 1
- It stores each entity as nodes and relationships in the Neo4j database

#### Step 3 → `buildVectorStore(pdfPath)` is called

> **🔄 Key Change from Day18:** In the previous version, `buildVectorStore(entities)` received the **entities array** from Step 1. In the optimized version, `buildVectorStore(pdfPath)` receives the **PDF file path** directly. This is because the vector store no longer depends on extracted entities — it processes the PDF independently from scratch (parse → chunk → embed). This makes Step 3 completely decoupled from Step 1.

- This function comes from the `6_vectorStore.js` file
- It receives the PDF path directly (not entities)
- It parses the PDF locally, splits the text into chunks, generates embeddings for each chunk, and stores them in Pinecone

#### Error Handling & Cleanup

If an error occurs at any step, the `catch` block logs that error. Whether the pipeline succeeds or fails, the `finally` block calls `closeConnections()` (imported from `2_config.js`) — this closes the Neo4j connection pool to free up resources.

---

## Foundation: `2_config.js` — All Connections in One Place

This file is the **backbone** of the entire project. All other files import their database connections and AI models from here. If any API key or connection detail needs to change, it only needs to be modified in this single file.

> **No changes from Day18** — This file remains identical in its purpose and functionality.

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

This file's job is to send the PDF to Gemini AI and receive structured JSON entities back.

> **🔄 Key Change from Day18:** The model used for extraction has been upgraded from `gemini-2.5-flash-lite` to `gemini-2.5-flash`. The "lite" version was lighter and cheaper but produced lower quality output — it was more likely to return malformed JSON, miss entities, or hallucinate data. The upgrade to the full `gemini-2.5-flash` model provides better accuracy and more reliable JSON output, which is critical when extracting structured data for a knowledge graph where precision matters.

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

- A specified model (`gemini-2.5-flash`)
- A `contents` array containing two parts:
  1. **PDF file reference** — Here, the **`createPartFromUri(fileInfo.uri, fileInfo.mimeType)`** function is used
  2. **Text prompt** — Which specifies which movies to extract

#### `createPartFromUri()` Explained

This function is imported from the `@google/genai` package. Its job is to create a **"part" object** that tells the Gemini API that there is a file already uploaded on Google's servers, and to include it in the context.

**Why is it necessary?** — When you send multi-modal content (text + file) to the Gemini API, you need to provide "parts" inside the `contents` array. For text, you simply provide `{ text: "..." }`. However, for an uploaded file, you need to specify its URI and MIME type — this is exactly what `createPartFromUri()` does. It returns an object that Gemini can understand, essentially saying "this file is stored on my servers at this URI, go read it from there".

**When is it used?** — Every time a batch needs to be extracted. The PDF is uploaded only once, but each batch API call uses `createPartFromUri()` to create a new reference so that Gemini knows which file to read. It does **not re-upload** the file — it simply provides a pointer to the already uploaded file.

**Response processing:**

The raw text returned by Gemini sometimes contains markdown backticks. These are first cleaned out, and then `JSON.parse()` is used to parse the result. If the result is not an array, it is wrapped in one before being returned.

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

> **No changes from Day18** — This file is completely identical to the Day18 version.

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
6. **Award nodes + WON relationships** — For each award, regex pattern matching is applied to parse the award type and category

#### Award Regex Parsing

Awards in the PDF appear in the following format: `"Oscar (Best Cinematography)"`. A regex pattern `/^(.+?)\s*\((.+)\)$/` is used to extract:

- `match[1]` = `"Oscar"` (award type)
- `match[2]` = `"Best Cinematography"` (category)

These are stored as separate properties in the Award node (`name` = award type, `category` = category). A `WON` relationship is then created between the Movie and the Award. If the award format does not match, it is skipped.

After usage, the session is closed via `session.close()` (in the `finally` block) — this is essential because each session in Neo4j consumes a database connection.

---

## Step 3 Detail: `6_vectorStore.js` — Chunk-Based Vector Embedding (Completely Redesigned)

> **🔄 Major Rewrite from Day18** — This is the most significantly changed file in the entire pipeline. The entire approach to building the vector store has been redesigned.

### What Changed and Why

| Aspect                 | Day18 (Previous)                                    | Day19 (Optimized)                                            | Why                                                      |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| **Input**              | Entities array (from Step 1)                        | PDF file path (independent)                                  | Decouples vector store from entity extraction            |
| **Text source**        | AI-generated clean sentence per movie               | Raw PDF text, split into natural chunks                      | Preserves all original information                       |
| **Embedding function** | `embedTexts()` (batch)                              | `embedText()` (single, with retry)                           | Per-chunk retry ensures no silent failures               |
| **Record ID**          | Movie title (e.g., `"the-dark-knight"`)             | Sequential chunk ID (e.g., `"chunk-0"`)                      | Chunks are text blocks, not movies                       |
| **Metadata**           | Title, year, director, genres, themes, actors, text | Only the raw text of the chunk                               | Raw text is self-contained — no structured fields needed |
| **Retry logic**        | None (relied on `embedTexts` to succeed)            | Dedicated `embedWithRetry()` with 3 attempts                 | More robust against transient failures                   |
| **Import**             | `embedTexts`, `pineconeIndex` from config           | `embedText`, `pineconeIndex` from config + `fs`, `pdf-parse` | Needs filesystem access for PDF parsing                  |

### Why Move from Entity-Based to Chunk-Based?

In Day18, the vector store was built by taking each movie's extracted entities (title, genres, director, etc.) and crafting a clean sentence like "The Dark Knight is a Action, Crime movie released in 2008. Directed by Christopher Nolan. Starring Christian Bale, Heath Ledger." This was then embedded and stored.

**The problem:** This sentence is a **lossy compression** of the movie data. If the PDF contains rich descriptions, plot summaries, or additional notes about a movie, none of that makes it into the vector store. The embeddings only capture the structured fields — not the full semantic richness.

**The solution:** Instead of depending on entities, the optimized version reads the PDF directly, splits it into chunks, and embeds the raw text. This way, **every piece of information** from the PDF is captured in the vector store, making similarity searches significantly more accurate and informative.

### New Imports

This file now imports:

- **`fs`** — Node.js file system module for reading the PDF from disk
- **`pdf-parse`** (specifically `pdf-parse/lib/pdf-parse.js`) — Library for extracting text from PDF files
- **`embedText`** — Single-text embedding function from `2_config.js` (previously used `embedTexts` for batch embedding)
- **`pineconeIndex`** — Pinecone index client from `2_config.js`

### Constants

Three constants are defined at the top:

- **`EMBED_CONCURRENCY = 5`** — How many embeddings to generate in parallel at a time
- **`EMBED_DELAY_MS = 500`** — Delay in milliseconds between embedding rounds to avoid overwhelming the API
- **`UPSERT_BATCH_SIZE = 100`** — How many vectors to send to Pinecone in a single upsert call

> **Why constants at the top?** — In Day18, these values were hardcoded inside functions (e.g., `batchSize = 50`). Extracting them to the top as named constants makes it easy to tune performance without digging through function logic.

### `parsePDF(pdfPath)` — New Inline PDF Parser

> **Why a new parser?** In Day18, `3_pdfParser.js` existed but was not used in the indexing pipeline because Gemini handled PDF reading directly. In Day19, the vector store needs to read the PDF independently, so a lightweight inline parser was added directly inside `6_vectorStore.js`. It does not import from `3_pdfParser.js` because the return format is different — `3_pdfParser.js` returns an array of movie blocks, while this parser returns the complete raw text as a single string.

This function:

1. Reads the PDF file from disk as a binary buffer using `fs.readFileSync()`
2. Parses the buffer using `pdf-parse` to extract all text from all pages
3. Returns the complete raw text as a single string

### `chunkText(rawText)` — Splitting Text into Chunks

This is a **new function** that did not exist in Day18. Its job is to take the full raw text from the PDF and split it into manageable, meaningful chunks.

How it works:

1. Splits the raw text by a pattern of 5 or more dashes on their own line (`/\n-{5,}\n/`) — this is the separator between individual movie entries in the PDF
2. For each resulting text block, trims whitespace
3. Filters out any blocks that are empty or shorter than 20 characters (to skip noise like stray separators or page breaks)
4. Returns an array of clean text chunks

Each chunk roughly corresponds to one movie's complete text entry from the PDF — but crucially, it is the **raw, unprocessed text** rather than a structured entity.

### `embedWithRetry(text, maxRetries)` — Embedding with Built-in Retry

> **Why this new function?** In Day18, the `embedTexts()` function was called without any retry mechanism. If the API call failed (due to rate limiting, network issues, or server errors), the entire batch was lost silently. In Day19, each individual chunk gets its own retry logic, ensuring maximum resilience.

This function wraps the `embedText()` call with retry logic:

1. Attempts to generate an embedding for the given text
2. If it fails:
   - **429 Error (Rate Limit)** — Waits longer: 20s, 40s, 60s (attempt × 20 seconds)
   - **Any other error** — Waits shorter: 5s, 10s, 15s (attempt × 5 seconds)
3. After all 3 attempts fail, returns `null` instead of throwing — this allows the pipeline to continue and track how many chunks failed

### `buildVectorStore(pdfPath)` — Main Function (Redesigned)

> **Signature change:** Previously `buildVectorStore(entities)`, now `buildVectorStore(pdfPath)`. This is the most visible indicator that the vector store no longer depends on entity extraction.

This function orchestrates the complete vector store building process. It works in 4 steps:

#### Step 1 — Parse the PDF

`parsePDF(pdfPath)` is called to extract the complete raw text from the PDF file. This happens locally on the machine using `pdf-parse` — it does **not** use Gemini for this step (unlike entity extraction which uploads the PDF to Gemini).

#### Step 2 — Chunk the text

`chunkText(rawText)` is called to split the raw text into individual chunks. The function also validates that at least some chunks were created — if the chunk count is zero (indicating an issue with the PDF format), the function returns early with an error message.

#### Step 3 — Embed all chunks

This is where the bulk of the work happens. Chunks are embedded in rounds of `EMBED_CONCURRENCY` (5 at a time):

1. For each round, `Promise.all()` fires 5 concurrent `embedWithRetry()` calls
2. Each successful embedding produces a vector record with:
   - **`id`** — A sequential identifier like `"chunk-0"`, `"chunk-1"`, etc. (unlike Day18 which used movie titles as IDs)
   - **`values`** — The 3072-dimensional embedding vector
   - **`metadata`** — Contains only the raw text of the chunk. This is much simpler than Day18 which stored title, year, director, genres, themes, actors, and text as separate metadata fields. The simplification works because the raw text itself contains all that information — when a similarity search returns a matching chunk, the full text provides all the context needed
3. Failed embeddings (where `embedWithRetry` returned `null`) are counted but do not block the pipeline
4. Progress is logged every 10 rounds and at the final round
5. A `EMBED_DELAY_MS` (500ms) pause is added between rounds to respect API rate limits

#### Step 4 — Upsert to Pinecone

> **Why a separate upsert step?** In Day18, embedding and upserting happened together in the same loop — each batch of 50 was embedded and immediately upserted. In Day19, all embeddings are generated first, then all vectors are upserted in a separate step. This separation provides clearer progress tracking (you know exactly how many embeddings succeeded before starting the upsert) and allows for larger, more efficient upsert batches.

The generated vectors are sent to Pinecone in batches of `UPSERT_BATCH_SIZE` (100 vectors per batch):

1. Vectors are sliced into batches of 100
2. Each batch is upserted via `pineconeIndex.upsert(batch)`
3. Progress is logged for each batch

At the end, `pineconeIndex.describeIndexStats()` is called to print the total vector count and total time taken, confirming that all data has been stored successfully.

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
        ┌───────────┼──────────────────────────────────────┐
        |           |                                      |
        v           v                                      v
   ┌─ STEP 1 ─┐  ┌── STEP 2 ──┐               ┌─── STEP 3 ───┐
   | Extract   |  | Build      |               | Parse PDF    |
   | Entities  |  | Neo4j Graph|               | → Chunk      |
   | (Gemini)  |  | (Neo4j)    |               | → Embed      |
   └───────────┘  └────────────┘               | → Pinecone   |
        |              ^                       └──────────────┘
        |              |                              ^
        └──entities──>─┘                              |
                                                      |
                           pdfPath ──────────────────>┘
                                                      |
                                                      v
                                             closeConnections()
```

> **Notice:** In Day18, Step 3 received `entities` from Step 1. In Day19, Step 3 receives `pdfPath` directly — making it completely independent of entity extraction.

### File Dependency Chain

```
2_config.js (Foundation — all connections)
     ↑ import           ↑ import             ↑ import
     |                  |                    |
4_entityExtractor.js  5_graphBuilder.js  6_vectorStore.js
(uses: genai,         (uses: driver)     (uses: embedText,
 createPartFromUri)                       pineconeIndex,
                                          fs, pdf-parse)
     ↑ import           ↑ import             ↑ import
     |                  |                    |
     └──────────────────┼────────────────────┘
                        |
                7_runIndexing.js (Entry Point)
```

### Summary Table

| File                   | Purpose                                                | Input          | Output                       | Changed from Day18?     |
| ---------------------- | ------------------------------------------------------ | -------------- | ---------------------------- | ----------------------- |
| `2_config.js`          | Sets up all connections (Neo4j, Pinecone, Gemini)      | `.env` file    | Exported clients & functions | ❌ No                   |
| `3_pdfParser.js`       | Extracts text from PDF (not directly used in pipeline) | PDF path       | Text blocks array            | ❌ No                   |
| `4_entityExtractor.js` | PDF → Gemini → Structured JSON entities                | PDF path       | Array of entity objects      | ⚡ Model upgraded       |
| `5_graphBuilder.js`    | Entities → Neo4j graph (nodes + relationships)         | Entities array | Graph database populated     | ❌ No                   |
| `6_vectorStore.js`     | PDF → Parse → Chunk → Embed → Pinecone                 | **PDF path**   | Vector database populated    | ✅ **Complete rewrite** |
| `7_runIndexing.js`     | Calls all files in the correct order                   | PDF path       | Complete indexed system      | ⚡ Step 3 call changed  |

### All Changes at a Glance

| Change                      | File                   | What Changed                                               | Why                                                                      |
| --------------------------- | ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| Model upgrade               | `4_entityExtractor.js` | `gemini-2.5-flash-lite` → `gemini-2.5-flash`               | Better accuracy, more reliable JSON output                               |
| Step 3 input change         | `7_runIndexing.js`     | `buildVectorStore(entities)` → `buildVectorStore(pdfPath)` | Vector store now processes PDF independently                             |
| Vector store rewrite        | `6_vectorStore.js`     | Entity-based → Chunk-based embedding                       | Richer embeddings, no information loss, decoupled from entity extraction |
| New functions added         | `6_vectorStore.js`     | `parsePDF()`, `chunkText()`, `embedWithRetry()`            | PDF parsing, text chunking, and resilient embedding                      |
| Retry added                 | `6_vectorStore.js`     | No retry → `embedWithRetry()` with 3 attempts              | Prevents silent data loss on API failures                                |
| Record structure simplified | `6_vectorStore.js`     | Rich metadata (title, year, etc.) → Just raw text          | Raw text is self-contained, no structured fields needed                  |
| Embedding approach changed  | `6_vectorStore.js`     | `embedTexts()` batch → `embedText()` single with retry     | Per-chunk retry ensures maximum resilience                               |

> **Note:** `3_pdfParser.js` still exists but remains unused in the pipeline. The vector store has its own inline `parsePDF()` function because it needs the raw text as a single string, whereas `3_pdfParser.js` returns an array of movie blocks.
