# 🎬 GraphRAG Query Pipeline — Complete Flow Documentation

## Overview

This is the **Query Phase** of the GraphRAG system. After the indexing phase has populated both databases (Neo4j with graph relationships and Pinecone with vector embeddings), the query pipeline allows users to ask natural language questions and receive intelligent answers.

The query pipeline is an **interactive CLI (Command Line Interface)** that follows a universal flow for every query:

1. **Entity Resolution** — Extract entity names from the query, then search Neo4j to figure out what each entity actually is (Actor? Director? Movie? Genre?)
2. **Classification** — Using the resolved entity context, classify the query as either "graph" (answerable from structured data) or "similarity" (needs vector search for recommendations)
3. **Routing** — Send the query to the appropriate handler:
   - **Graph Handler** → Uses Neo4j for factual, descriptive, and relationship queries
   - **Similarity Handler** → Uses Pinecone + Neo4j + LLM for recommendation queries

---

## Entry Point: `13_runQuery.js`

This is the **starting point** of the query system — running this file launches an interactive CLI where users can ask movie-related questions.

### `startCLI()` — Setting Up the Interactive Interface

This function creates an interactive command-line interface using Node.js's built-in `readline` module. It sets up a `readline.createInterface` that listens on `process.stdin` (keyboard input) and `process.stdout` (terminal output).

The function defines an inner `ask()` function that works recursively:

1. It prompts the user with `"🎬 You: "`
2. Reads the user's input
3. If the input is `"exit"`, it closes the readline interface, calls `closeConnections()` to shut down the Neo4j connection pool, and exits the process
4. If the input is empty, it simply prompts again
5. Otherwise, it passes the query to `processQuery()` — wrapped in a try-catch so that errors don't crash the CLI
6. After processing, it calls `ask()` again to prompt for the next question — creating an infinite loop until the user types "exit"

### `processQuery(query)` — The Universal Query Flow

This is the core function that processes every user query through the same 3-step pipeline. It is an async function that orchestrates the entire query-answering process.

#### Step 1 → `resolveQueryEntities(query)` is called

- This function comes from `9_entityResolver.js`
- It takes the raw query string as input
- First, an LLM extracts entity names from the query (e.g., "Action movies with Tom Hardy" → ["Action", "Tom Hardy"])
- Then, each extracted entity is searched across all node types in Neo4j to determine what it is
- Returns a `resolved` object containing: the original query, an array of resolved entities (with their labels and exact database names), and an array of unresolved entities (names not found in the graph)

#### Step 2 → `classifyQuery(query, resolved)` is called

- This function comes from `10_queryClassifier.js`
- It receives both the original query and the resolved entities
- Using the resolved entity context, the LLM classifies the query as either `"graph"` or `"similarity"`
- Returns an object with `type` (the classification) and `reasoning` (one sentence explaining why)

#### Step 3 → Routing to the appropriate handler

Based on the classification result:

- If `"similarity"` → `handleSimilarityQuery(query, resolved)` is called from `12_similarityHandler.js`
- If `"graph"` (or any other value) → `handleGraphQuery(query, resolved)` is called from `11_graphHandler.js`

The handler returns an answer string, which is printed to the terminal.

---

## Step 1 Detail: `9_entityResolver.js` — Extract and Resolve Entities

This file **runs first for every single query**, without exception. Its job is to figure out what the user is talking about before any further processing happens.

### Why is Entity Resolution Needed?

When a user says "DiCaprio", the system has no way of knowing whether they mean an Actor, a Director, or even a Movie — only the graph database knows. Similarly, "Nolan" could be a Director or an Actor, and "Oscar" could be an Award or an Actor named Oscar. Entity resolution eliminates this ambiguity by searching the actual database.

### `NODE_TYPES` — The Search Configuration

A constant array defines all 6 node types in the graph and which property to search on:

- Movie → search by `title`
- Director, Actor, Genre, Theme, Award → search by `name`

### `extractEntities(query)` — LLM Extracts Entity Names

This function uses the Gemini LLM to extract meaningful entity names from the user's natural language query. The LLM is given a system prompt with clear rules:

- **DO extract:** person names, movie titles, genre names, theme names, award names
- **DO NOT extract:** generic words like "movies", "recommend", "find", "show" or adjectives like "good", "best", "latest"
- Several examples are provided in the prompt to guide the LLM

The LLM responds with a JSON array of strings (e.g., `["Action", "Tom Hardy"]`). The response is cleaned (markdown backticks removed) and parsed. If parsing fails, an empty array is returned as a fallback.

### `resolveEntity(entityName)` — Search One Entity Across All Node Types

This function takes a single entity name and searches for it across all 6 node types in Neo4j. The search uses a **two-tier strategy**:

**Tier 1 — Exact Match (case-insensitive):**
For each node type, a Cypher query checks if any node's property exactly matches the entity name (using `toLower()` for case-insensitive comparison). For example, "Inception" will exactly match Movie "Inception". If an exact match is found for a given label, Tier 2 is skipped for that label.

**Tier 2 — Partial Match (CONTAINS):**
If no exact match is found, a second query checks if any node's property **contains** the entity name. For example, "Nolan" will match "Christopher Nolan" via CONTAINS. This enables fuzzy matching where users can use partial names.

**Match Priority:**
After searching all node types, if any exact matches were found, only those are returned (partial matches are discarded). This prevents cases where "Inception" would match both Movie "Inception" (exact) and Theme "Deception" (partial CONTAINS) — the exact match is always preferred.

Each match result contains: `searchTerm` (what the user said), `label` (what type of node it is), `nodeName` (the exact name in the database), and `matchType` (exact or partial).

### `resolveQueryEntities(query)` — The Complete Resolution Pipeline

This is the main function that orchestrates the entire entity resolution process:

1. Calls `extractEntities(query)` to get the entity names from the LLM
2. For each entity name, calls `resolveEntity(entityName)` to search the database
3. Entities that found matches are added to the `resolved` array; those that did not are added to the `unresolved` array
4. Returns an object containing: the original query, the resolved entities array, and the unresolved entities array

---

## Step 2 Detail: `10_queryClassifier.js` — Query Classification

This file classifies each query into one of two types based on the resolved entity context.

### Why Only Two Types?

The system uses just two categories:

1. **`"graph"`** — Anything that can be answered from structured data in Neo4j:
   - **Factual:** "Movies directed by Nolan" (graph traversal)
   - **Descriptive:** "Tell me about Inception" (get all relationships)
   - **Relationship:** "How is DiCaprio related to Nolan?" (path finding)
   - **Filtered:** "Action movies with Tom Hardy" (multi-traversal + filter)
   - **Counts:** "How many sci-fi movies?" (aggregation)

2. **`"similarity"`** — Finding similar or recommended items:
   - "Movies like Inception"
   - "Recommend something similar to The Matrix"
   - "What should I watch if I liked Interstellar?"

The reasoning is that factual, descriptive, and relationship queries are all fundamentally about "traversing the graph" — only similarity queries need Pinecone (vector search).

### `classifyQuery(query, resolvedEntities)` — The Classification Function

This function builds a prompt for the LLM that includes:

1. **Entity context** — A formatted string telling the LLM what each entity is. For example: `"Nolan" is a Director (full name: "Christopher Nolan")`. This gives the LLM concrete knowledge about the entities instead of making it guess.

2. **Unresolved context** — If any entities were not found in the database, the LLM is informed about that as well.

3. **Classification rules** — Clear definitions of what "graph" and "similarity" mean, with examples for each.

The LLM responds with a JSON object: `{"type": "graph" or "similarity", "reasoning": "one sentence"}`. The response is cleaned and parsed. If parsing fails, the function defaults to `"graph"` as a safe fallback — because graph queries are more general and less likely to produce bad results from a misclassification.

---

## Graph Path: `8_cypherTemplates.js` — Safe Cypher Generation

This file is a **security layer** that sits between the LLM and the Neo4j database. The LLM never writes raw Cypher queries directly — instead, it outputs a JSON plan, and this file validates and converts that plan into safe, read-only Cypher.

### Why Not Let the LLM Write Cypher Directly?

If the LLM were allowed to write raw Cypher, it could potentially generate destructive queries like `DELETE`, `SET`, or `CREATE` — either through a bug, a hallucination, or a malicious prompt injection. This template system guarantees that only safe, read-only operations can ever reach the database.

### Whitelists — The Security Foundation

The file defines strict whitelists:

- **`ALLOWED_LABELS`** — Only 6 node types are allowed: Movie, Director, Actor, Genre, Theme, Award. Any other label is rejected.
- **`ALLOWED_RELATIONSHIPS`** — Only 5 relationship types: DIRECTED, ACTED_IN, BELONGS_TO, EXPLORES, WON.
- **`ALLOWED_PROPERTIES`** — Each label can only access specific properties (e.g., Movie can access "title" and "year", but nothing else).
- **`ALLOWED_OPERATORS`** — Only safe comparison operators: `=`, `<>`, `>`, `<`, `>=`, `<=`, `CONTAINS`, `STARTS WITH`.
- **`LABEL_VAR_MAP`** — Short variable names for each label (Movie → "m", Director → "d", etc.) used in building Cypher strings.

### `validateStep(step)` — Validating Each Step

This function validates a single step from the LLM's plan against the whitelists. It uses a switch statement to check different step types:

- **`traversal`** — Checks that `from` label, `to` label, and `rel` relationship are all in the whitelists
- **`filter`** — Splits `field` into label and property, checks both against whitelists, and verifies the operator is allowed
- **`projection`** — Validates every field in the projection list
- **`aggregation`** — Checks that the aggregation function is one of: count, collect, sum, avg, min, max
- **`sort`** — Validates the label and checks that direction is either ASC or DESC
- **`limit`** — Ensures the value is a number between 1 and 100

If any validation fails, an error is thrown with a descriptive message.

### `buildCypher(plan)` — Building the Cypher Query

This is the main function that converts a validated plan into a Cypher query string. It processes each step and builds up four components:

1. **MATCH clauses** — From traversal steps. Each traversal produces a `MATCH (var:Label)-[:REL]->(var:Label)` clause
2. **WHERE clauses** — From filter steps. Each filter adds a condition using parameterized values (e.g., `d.name = $p0`). Filter values are stored as named parameters (`$p0`, `$p1`, etc.) to prevent injection attacks
3. **RETURN clause** — From projection or aggregation steps. Projections return specific fields; aggregations return computed values (with optional GROUP BY)
4. **ORDER BY and LIMIT** — From sort and limit steps

These components are assembled into the final Cypher string, and the function returns both the `cypher` string and the `params` object.

---

## Graph Path: `11_graphHandler.js` — Unified Graph Query Handler

This file handles **all queries** that are classified as "graph" — including factual, descriptive, and relationship queries. The core philosophy is that they are all just "traverse the graph around resolved entities."

### `createQueryPlan(query, resolvedEntities)` — LLM Creates a Query Plan

This function asks the LLM to look at the user's query (along with the resolved entity context) and output a structured JSON plan. The prompt provides:

1. **Resolved entity context** — So the LLM knows exactly what each entity is and its exact database name
2. **Graph schema** — The full schema: all node types with their properties, and all relationship types
3. **Available step types** — 8 types of operations the LLM can use:
   - `traversal` — Follow a relationship between two node types
   - `filter` — Apply a condition on a property
   - `projection` — Select which fields to return
   - `aggregation` — Count, sum, average, etc.
   - `sort` — Order results
   - `limit` — Cap the number of results
   - `describe` — Get all relationships around a specific entity
   - `path` — Find the shortest path between two entities
4. **Examples** — Several example queries with their expected JSON plans

The LLM's response is cleaned and parsed into a JSON plan object.

### `handleGraphQuery(query, resolvedEntities)` — Main Handler Function

This is the exported function that orchestrates the entire graph query process. It works in 3 steps:

**Step 1 — Create the plan:**
Calls `createQueryPlan()` to get the LLM's JSON plan.

**Step 2 — Execute based on plan type:**
Looks at the first step in the plan to determine which execution path to take:

- **`describe` step** → Calls `executeDescribe(label, name)` — Gets all relationships around an entity
- **`path` step** → Calls `executePath(fromLabel, fromName, toLabel, toName)` — Finds shortest path between two entities
- **Any other step** → Calls `executeTemplateCypher(plan)` — Uses the Cypher template system for safe query execution

**Step 3 — Format the answer:**
If results are found, the raw database records are sent to the LLM along with the original question. The LLM is instructed to provide a clear, natural language answer without mentioning databases, Cypher, or JSON. If no results are found or an error occurred, a simple error message is returned.

### `executeDescribe(label, name)` — Describe an Entity

This function handles queries like "Tell me about Inception" or "Who is Christopher Nolan?" It fetches **all relationships** connected to the specified entity by using different Cypher queries based on the entity type:

- **Movie** — Fetches: director, actors, genres, themes, awards
- **Director** — Fetches: movies directed, genres of those movies, themes, collaborating actors, awards
- **Actor** — Fetches: movies acted in, directors of those movies, genres, themes, awards
- **Genre** — Fetches: movies in that genre, directors of those movies
- **Theme** — Fetches: movies exploring that theme, directors
- **Award** — Fetches: movies that won this award, directors

Each query uses `OPTIONAL MATCH` to ensure that if a particular relationship does not exist (e.g., a movie has no awards), it does not prevent the rest of the data from being returned. Results are collected using `collect(DISTINCT ...)` to avoid duplicates.

The session is opened in **read-only mode** (`defaultAccessMode: "READ"`) for safety.

### `executePath(fromLabel, fromName, toLabel, toName)` — Find Shortest Path

This function handles queries like "How is DiCaprio related to Nolan?" It uses Neo4j's `shortestPath()` function to find the shortest connection between two entities through up to 6 intermediate relationships (`[*..6]`).

The function dynamically constructs the Cypher query because the matching property differs by node type — Movies match on `title`, while all other node types match on `name`.

The path result includes:

- `pathNodes` — All nodes along the path, each with their labels, name/title, and year
- `pathRels` — The relationship types along the path (e.g., ACTED_IN, DIRECTED)

This allows the system to explain connections like: "DiCaprio -[ACTED_IN]→ Inception ←[DIRECTED]- Nolan".

### `executeTemplateCypher(plan)` — Template-Based Execution

This function handles all standard factual queries. It calls `buildCypher(plan)` from `8_cypherTemplates.js` to generate a safe Cypher query from the LLM's plan, then executes it against Neo4j.

Results are processed to handle Neo4j integer objects (which have a `.toNumber()` method) by converting them to regular JavaScript numbers.

---

## Similarity Path: `12_similarityHandler.js` — Similarity Search Handler

This file handles queries classified as "similarity" — when users want recommendations or movies similar to a specific one. It combines three technologies: Pinecone (vector similarity), Neo4j (genre/theme validation), and LLM (final ranking and explanation).

### Why Not Just Use Pinecone Alone?

Vector similarity can find movies that share similar text descriptions, but it sometimes recommends movies from completely different genres just because they have similar plot keywords. By adding Neo4j genre filtering, the system ensures that recommendations actually share genres with the source movie, making recommendations more relevant.

### `extractTitleFromChunk(chunkText)` — Extract Movie Title from Raw Chunk

Since the vector store now contains raw PDF chunks (not entity-based records), this function extracts the movie title from a chunk's text by looking for the `"Movie Title: XYZ"` pattern using regex.

### Helper Functions — Neo4j Lookups

- **`getMovieGenres(movieTitle)`** — Queries Neo4j to get all genres a specific movie belongs to
- **`getMovieThemes(movieTitle)`** — Queries Neo4j to get all themes a specific movie explores
- **`filterByGenre(movieTitles, sourceGenres)`** — Given a list of candidate movie titles and the source movie's genres, queries Neo4j to find which candidates share at least one genre. Uses the Cypher `any()` function to check if any genre in the candidate's genre list exists in the source genre list

### `handleSimilarityQuery(query, resolvedEntities)` — Main Handler Function

This is the core function with a 6-step process:

**Step 1 — Find the source movie from resolved entities:**
Looks through the resolved entities for one with the label "Movie". Since entity resolution already ran, the movie is already confirmed to exist in the database. If no movie entity was resolved, it falls back to a pure vector search.

**Step 2 — Pinecone vector search:**
Embeds the movie name using `embedText()` and queries Pinecone for the top 50 most similar chunks (`topK: 50`). The query includes `includeMetadata: true` so that the raw text of each matching chunk is returned.

**Step 3 — Get source movie's genres and themes from Neo4j:**
Calls `getMovieGenres()` and `getMovieThemes()` to find out what genres and themes the source movie has. If the movie has no genres in the graph, it falls back to pure vector search.

**Step 4 — Extract movie names from the top 50 chunks:**
Iterates through the Pinecone results and uses `extractTitleFromChunk()` to get the movie title from each chunk's metadata text. The source movie itself is excluded from the candidates. A `chunkMap` is built mapping titles to their full chunk text for later use.

**Step 5 — Filter candidates by genre in Neo4j:**
Calls `filterByGenre()` with the candidate titles and the source movie's genres. Only movies that share at least one genre with the source movie survive this filter.

**Step 6 — LLM selects top 10 with reasoning:**
The genre-filtered candidates (along with their genres and chunk text) are sent to the LLM. The LLM is asked to pick the 10 best matches, ranking by: genre overlap (most important), theme similarity, and overall vibe/style match. For each pick, the LLM provides a 1-2 sentence explanation of why it is similar.

### `fallbackVectorSearch(query)` — Fallback When No Movie is Resolved

This function handles cases where no specific movie was resolved from the user's query. It performs a pure Pinecone vector search:

1. Embeds the query text itself (not a movie name)
2. Queries Pinecone for the top 20 matches
3. Sends all matching chunk texts to the LLM
4. The LLM picks the 10 best matches and explains why each fits the query

---

## Complete Pipeline Flow Diagram

```
User types a question
        │
        ▼
   ┌─────────────────────────────────────┐
   │  13_runQuery.js → processQuery()     │
   └──┬──────────────────────────────────┘
      │
      ▼
   ┌─────────────────────────────────────┐
   │  STEP 1: Entity Resolution           │
   │  9_entityResolver.js                 │
   │                                      │
   │  LLM extracts names → search Neo4j   │
   │  "Nolan" → Director "C. Nolan"       │
   └──┬──────────────────────────────────┘
      │
      ▼
   ┌─────────────────────────────────────┐
   │  STEP 2: Classification              │
   │  10_queryClassifier.js               │
   │                                      │
   │  LLM decides: "graph" or "similarity"│
   └──┬────────────────┬─────────────────┘
      │                │
      ▼                ▼
  ┌──────────┐   ┌──────────────────────┐
  │  GRAPH   │   │  SIMILARITY          │
  │ HANDLER  │   │  HANDLER             │
  │          │   │                      │
  │ 11_graph │   │ 12_similarity        │
  │ Handler  │   │ Handler              │
  └──┬───────┘   └──┬───────────────────┘
     │               │
     ▼               ▼
  ┌──────────┐   ┌──────────────────────┐
  │ Query    │   │ 1. Pinecone search   │
  │ Plan     │   │ 2. Neo4j genre check │
  │ (LLM)    │   │ 3. LLM picks top 10 │
  └──┬───────┘   └──┬───────────────────┘
     │               │
     ▼               │
  ┌──────────┐       │
  │ Template │       │
  │ System   │       │
  │ 8_cypher │       │
  │ Templates│       │
  └──┬───────┘       │
     │               │
     ▼               ▼
  ┌──────────┐   ┌──────────────────────┐
  │ Neo4j    │   │  LLM formats         │
  │ Execute  │   │  the answer           │
  └──┬───────┘   └──┬───────────────────┘
     │               │
     ▼               ▼
  ┌──────────────────────────────────────┐
  │          Final Answer                 │
  │          Printed to CLI               │
  └──────────────────────────────────────┘
```

### File Dependency Chain

```
2_config.js (Foundation — all connections)
     ↑          ↑          ↑          ↑
     │          │          │          │
9_entity     10_query   11_graph   12_similarity
Resolver.js  Classifier Handler.js Handler.js
     ↑          ↑      ↑    ↑         ↑
     │          │      │    │         │
     │          │      │  8_cypher   │
     │          │      │  Templates  │
     │          │      │    .js      │
     │          │      │             │
     └──────────┼──────┼─────────────┘
                │      │
           13_runQuery.js (Entry Point)
```

### Summary Table

| File                      | Purpose                                             | Input                     | Output                       |
| ------------------------- | --------------------------------------------------- | ------------------------- | ---------------------------- |
| `13_runQuery.js`          | Interactive CLI + Universal query flow              | User's text input         | Printed answer               |
| `9_entityResolver.js`     | Extract entities from query → resolve each in Neo4j | Query string              | Resolved entities object     |
| `10_queryClassifier.js`   | Classify query as "graph" or "similarity"           | Query + resolved entities | Classification object        |
| `8_cypherTemplates.js`    | Validate LLM plan → build safe Cypher               | JSON plan                 | Cypher string + params       |
| `11_graphHandler.js`      | Handle all graph queries (factual, describe, path)  | Query + resolved entities | Natural language answer      |
| `12_similarityHandler.js` | Handle similarity/recommendation queries            | Query + resolved entities | Natural language answer      |
| `2_config.js`             | All connections (Neo4j, Pinecone, Gemini LLM)       | `.env` file               | Exported clients & functions |
