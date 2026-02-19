# 📊 Neo4j Cypher Query Guide — Complete Syntax Reference

## What is Cypher?

Cypher is **Neo4j's query language** — it is to Neo4j what SQL is to MySQL/PostgreSQL. It is designed specifically for graph databases, making it easy to express patterns of nodes and relationships. Cypher uses an ASCII-art style syntax where `()` represents nodes and `-->` represents relationships, making queries visually intuitive.

---

## Core Concepts

### Nodes and Relationships

In a graph database, everything is either a **node** or a **relationship**:

- **Node** — An entity (e.g., a Movie, an Actor, a Director). Written as `(variable:Label {property: value})`
- **Relationship** — A connection between two nodes (e.g., ACTED_IN, DIRECTED). Written as `-[:RELATIONSHIP_TYPE]->`
- **Label** — The type/category of a node (e.g., `:Movie`, `:Actor`)
- **Property** — Key-value data stored on a node or relationship (e.g., `title: "Inception"`, `year: 2010`)

### Pattern Matching

Cypher works by **describing patterns** that the database should find:

- `(a:Actor)` — Find all Actor nodes
- `(a:Actor)-[:ACTED_IN]->(m:Movie)` — Find Actor nodes connected to Movie nodes via ACTED_IN relationship
- `(d:Director)-[:DIRECTED]->(m:Movie)<-[:ACTED_IN]-(a:Actor)` — Find patterns where a Director directed a Movie that an Actor acted in

---

## 1. MATCH — Finding Data

`MATCH` is the most fundamental Cypher clause. It describes a pattern and finds all data matching that pattern.

### Find all nodes of a type

```cypher
MATCH (m:Movie)
RETURN m
```

Finds every node with the label `Movie`.

**Example 2:**

```cypher
MATCH (a:Actor)
RETURN a.name
```

Returns just the `name` property of all Actor nodes.

### Find nodes with a specific property

```cypher
MATCH (m:Movie {title: "Inception"})
RETURN m
```

Finds the Movie node whose `title` is exactly "Inception".

**Example 2:**

```cypher
MATCH (m:Movie {year: 2010})
RETURN m.title, m.year
```

Returns the title and year of all movies released in 2010.

### Follow a relationship

```cypher
MATCH (d:Director)-[:DIRECTED]->(m:Movie)
RETURN d.name, m.title
```

Finds all Director → Movie connections via the DIRECTED relationship.

**Example 2:**

```cypher
MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)
RETURN a.name, m.title
```

Finds all Actor → Movie connections via the ACTED_IN relationship.

---

## 2. WHERE — Filtering Results

`WHERE` adds conditions to filter MATCH results.

### Basic equality

```cypher
MATCH (m:Movie)
WHERE m.year = 2020
RETURN m.title
```

Returns titles of all movies from 2020.

**Example 2:**

```cypher
MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)
WHERE a.name = "Tom Hardy"
RETURN m.title, m.year
```

Returns all movies that Tom Hardy acted in.

### Comparison operators

```cypher
MATCH (m:Movie)
WHERE m.year > 2015
RETURN m.title, m.year
ORDER BY m.year DESC
```

Movies released after 2015, sorted newest first.

**Example 2:**

```cypher
MATCH (m:Movie)
WHERE m.year >= 2000 AND m.year <= 2010
RETURN m.title, m.year
```

Movies from the 2000s decade.

### String matching with CONTAINS

```cypher
MATCH (a:Actor)
WHERE a.name CONTAINS "Chris"
RETURN a.name
```

Finds actors whose name contains "Chris" (e.g., "Chris Hemsworth", "Chris Pratt", "Christopher Nolan").

**Example 2:**

```cypher
MATCH (m:Movie)
WHERE m.title CONTAINS "Dark"
RETURN m.title
```

Finds movies with "Dark" in their title.

### String matching with STARTS WITH and ENDS WITH

```cypher
MATCH (a:Actor)
WHERE a.name STARTS WITH "Leo"
RETURN a.name
```

Finds actors whose name starts with "Leo".

**Example 2:**

```cypher
MATCH (m:Movie)
WHERE m.title ENDS WITH "Knight"
RETURN m.title
```

Finds movies whose title ends with "Knight".

### Case-insensitive matching with toLower()

```cypher
MATCH (n:Actor)
WHERE toLower(n.name) = toLower("dicaprio")
RETURN n.name
```

Case-insensitive exact match — finds "DiCaprio" regardless of how the user types it.

**Example 2:**

```cypher
MATCH (n:Actor)
WHERE toLower(n.name) CONTAINS toLower("hardy")
RETURN n.name
```

Case-insensitive partial match — finds "Tom Hardy" from "hardy".

### NOT operator

```cypher
MATCH (m:Movie)-[:BELONGS_TO]->(g:Genre)
WHERE NOT g.name = "Horror"
RETURN m.title, g.name
```

Movies that are NOT in the Horror genre.

**Example 2:**

```cypher
MATCH (m:Movie)
WHERE NOT EXISTS { MATCH (m)-[:WON]->(:Award) }
RETURN m.title
```

Movies that have NOT won any awards.

### IN operator

```cypher
MATCH (m:Movie)-[:BELONGS_TO]->(g:Genre)
WHERE g.name IN ["Action", "Thriller", "Sci-Fi"]
RETURN m.title, g.name
```

Movies in any of the listed genres.

**Example 2:**

```cypher
MATCH (m:Movie)
WHERE m.year IN [2010, 2014, 2020]
RETURN m.title, m.year
```

Movies from specific years.

---

## 3. RETURN — Specifying Output

`RETURN` specifies what data should be sent back.

### Return specific properties

```cypher
MATCH (m:Movie)
RETURN m.title, m.year
```

**Example 2:**

```cypher
MATCH (d:Director)-[:DIRECTED]->(m:Movie)
RETURN d.name AS director, m.title AS movie
```

Using `AS` to rename output columns.

### DISTINCT — Remove duplicates

```cypher
MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)-[:BELONGS_TO]->(g:Genre)
RETURN DISTINCT g.name
```

Returns each unique genre name only once, even if many movies belong to it.

**Example 2:**

```cypher
MATCH (d:Director)-[:DIRECTED]->(m:Movie)
RETURN DISTINCT d.name
```

Returns each director's name only once.

---

## 4. OPTIONAL MATCH — Left Join Equivalent

`OPTIONAL MATCH` is like `MATCH` but returns `null` if no pattern is found (instead of eliminating the row). It is the graph equivalent of SQL's `LEFT JOIN`.

### Why it matters

```cypher
MATCH (m:Movie {title: "Inception"})
OPTIONAL MATCH (m)-[:WON]->(aw:Award)
RETURN m.title, aw.name, aw.category
```

Returns the movie even if it has no awards (awards will be null). If you used regular `MATCH`, movies without awards would disappear from results entirely.

**Example 2:**

```cypher
MATCH (m:Movie {title: "Inception"})
OPTIONAL MATCH (d:Director)-[:DIRECTED]->(m)
OPTIONAL MATCH (a:Actor)-[:ACTED_IN]->(m)
OPTIONAL MATCH (m)-[:BELONGS_TO]->(g:Genre)
OPTIONAL MATCH (m)-[:EXPLORES]->(t:Theme)
OPTIONAL MATCH (m)-[:WON]->(aw:Award)
RETURN m.title, m.year,
       collect(DISTINCT d.name) AS directors,
       collect(DISTINCT a.name) AS actors,
       collect(DISTINCT g.name) AS genres,
       collect(DISTINCT t.name) AS themes,
       collect(DISTINCT aw.name) AS awards
```

Gets ALL information about a movie including all its relationships. This is the pattern used in the `executeDescribe` function of the query pipeline to provide comprehensive entity information.

---

## 5. Aggregation Functions

### count() — Count results

```cypher
MATCH (m:Movie)
RETURN count(m) AS totalMovies
```

Counts all movies.

**Example 2:**

```cypher
MATCH (m:Movie)-[:BELONGS_TO]->(g:Genre {name: "Sci-Fi"})
RETURN count(m) AS sciFiMovies
```

Counts how many movies belong to the Sci-Fi genre.

### collect() — Gather into a list

```cypher
MATCH (a:Actor)-[:ACTED_IN]->(m:Movie {title: "Inception"})
RETURN collect(a.name) AS cast
```

Returns all actors in Inception as a single list.

**Example 2:**

```cypher
MATCH (d:Director)-[:DIRECTED]->(m:Movie)
RETURN d.name, collect(m.title) AS movies
```

For each director, returns their name and a list of all their movies.

### collect(DISTINCT ...) — Unique list

```cypher
MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)-[:BELONGS_TO]->(g:Genre)
WHERE a.name = "Tom Hardy"
RETURN collect(DISTINCT g.name) AS genres
```

Returns a unique list of genres Tom Hardy has acted in (no duplicates).

**Example 2:**

```cypher
MATCH (d:Director)-[:DIRECTED]->(m:Movie)<-[:ACTED_IN]-(a:Actor)
WHERE d.name = "Christopher Nolan"
RETURN collect(DISTINCT a.name) AS collaborators
```

All unique actors who have worked with Christopher Nolan.

### Collecting objects

```cypher
MATCH (d:Director {name: "Christopher Nolan"})-[:DIRECTED]->(m:Movie)
RETURN collect(DISTINCT {title: m.title, year: m.year}) AS movies
```

Returns a list of objects — each with title and year — instead of flat values.

**Example 2:**

```cypher
MATCH (m:Movie)-[:WON]->(aw:Award)
RETURN m.title, collect({name: aw.name, category: aw.category}) AS awards
```

For each movie, returns a list of award objects (name + category).

### sum(), avg(), min(), max()

```cypher
MATCH (m:Movie)
RETURN min(m.year) AS earliest, max(m.year) AS latest
```

Finds the earliest and latest movie years.

**Example 2:**

```cypher
MATCH (d:Director)-[:DIRECTED]->(m:Movie)
RETURN d.name, count(m) AS movieCount, avg(m.year) AS avgYear
ORDER BY movieCount DESC
LIMIT 5
```

Top 5 most prolific directors with their average movie year.

---

## 6. WITH — Pipeline Intermediate Results

`WITH` passes results from one query stage to the next — like a pipe operator. It enables multi-step processing within a single query.

### Filter after aggregation

```cypher
MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)
WITH a, count(m) AS movieCount
WHERE movieCount > 5
RETURN a.name, movieCount
ORDER BY movieCount DESC
```

Actors who appeared in more than 5 movies.

**Example 2:**

```cypher
MATCH (m:Movie)-[:BELONGS_TO]->(g:Genre)
WITH m, collect(g.name) AS genres
WHERE any(genre IN genres WHERE genre IN ["Action", "Thriller"])
RETURN m.title, genres
```

Movies that belong to either Action or Thriller (or both). The `any()` function checks if any element in the `genres` list satisfies the condition.

---

## 7. ORDER BY and LIMIT

### Sort results

```cypher
MATCH (m:Movie)
RETURN m.title, m.year
ORDER BY m.year DESC
```

All movies sorted by year, newest first.

**Example 2:**

```cypher
MATCH (m:Movie)
RETURN m.title, m.year
ORDER BY m.year ASC
LIMIT 10
```

Oldest 10 movies.

### Combine with aggregation

```cypher
MATCH (g:Genre)<-[:BELONGS_TO]-(m:Movie)
RETURN g.name, count(m) AS movieCount
ORDER BY movieCount DESC
LIMIT 5
```

Top 5 genres by number of movies.

**Example 2:**

```cypher
MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)
RETURN a.name, count(m) AS films
ORDER BY films DESC
LIMIT 10
```

Top 10 most active actors.

---

## 8. CREATE — Creating Nodes and Relationships

### Create a node

```cypher
CREATE (m:Movie {title: "New Movie", year: 2025})
RETURN m
```

Creates a new Movie node.

**Example 2:**

```cypher
CREATE (a:Actor {name: "New Actor"})
RETURN a
```

### Create a relationship

```cypher
MATCH (d:Director {name: "Christopher Nolan"}), (m:Movie {title: "Inception"})
CREATE (d)-[:DIRECTED]->(m)
```

Creates a DIRECTED relationship between an existing Director and Movie.

**Example 2:**

```cypher
MATCH (a:Actor {name: "Tom Hardy"}), (m:Movie {title: "Inception"})
CREATE (a)-[:ACTED_IN]->(m)
```

---

## 9. MERGE — Create If Not Exists

`MERGE` is the safer alternative to `CREATE`. It first checks if the pattern already exists — if yes, it uses the existing one; if no, it creates a new one. This prevents duplicate nodes.

### Why MERGE is preferred over CREATE

```cypher
MERGE (a:Actor {name: "Zendaya"})
RETURN a
```

If "Zendaya" already exists, returns the existing node. If not, creates it.

**Example 2:**

```cypher
MERGE (d:Director {name: "Christopher Nolan"})
MERGE (m:Movie {title: "Inception"})
MERGE (d)-[:DIRECTED]->(m)
```

Creates the director, movie, and relationship only if they don't already exist. This is exactly the pattern used in `5_graphBuilder.js` during the indexing phase.

### MERGE with SET — Update properties after merge

```cypher
MERGE (m:Movie {title: "Inception"})
SET m.year = 2010
RETURN m
```

Creates the movie if it doesn't exist, then sets (or updates) the year.

**Example 2:**

```cypher
MERGE (m:Movie {title: "Tenet"})
SET m.year = 2020, m.rating = 7.4
RETURN m
```

Creates or finds the movie, then updates multiple properties.

---

## 10. SET — Updating Properties

### Update a property

```cypher
MATCH (m:Movie {title: "Inception"})
SET m.rating = 8.8
RETURN m
```

**Example 2:**

```cypher
MATCH (m:Movie)
WHERE m.year < 2000
SET m.era = "classic"
RETURN m.title, m.era
```

Adds an `era` property to all movies before 2000.

### Add a new label

```cypher
MATCH (m:Movie {title: "Inception"})
SET m:Blockbuster
RETURN labels(m)
```

Adds the `Blockbuster` label to the Inception node. Nodes can have multiple labels.

**Example 2:**

```cypher
MATCH (m:Movie)-[:WON]->(:Award)
SET m:AwardWinner
```

Adds an `AwardWinner` label to all movies that have won any award.

---

## 11. DELETE and DETACH DELETE

### Delete a node (no relationships)

```cypher
MATCH (m:Movie {title: "Bad Movie"})
DELETE m
```

Deletes the node. **This will fail** if the node has any relationships.

**Example 2:**

```cypher
MATCH (t:Theme {name: "Unused Theme"})
DELETE t
```

### DETACH DELETE — Delete with all relationships

```cypher
MATCH (m:Movie {title: "Bad Movie"})
DETACH DELETE m
```

Deletes the node AND all its relationships. Use this when a node has connections.

**Example 2:**

```cypher
MATCH (a:Actor {name: "Unknown Actor"})
DETACH DELETE a
```

Removes the actor node and all its ACTED_IN relationships.

### Delete a relationship only

```cypher
MATCH (a:Actor {name: "Tom Hardy"})-[r:ACTED_IN]->(m:Movie {title: "Inception"})
DELETE r
```

Removes only the relationship, keeping both nodes intact.

**Example 2:**

```cypher
MATCH ()-[r:EXPLORES]->()
DELETE r
```

Deletes all EXPLORES relationships in the database.

---

## 12. REMOVE — Removing Properties and Labels

### Remove a property

```cypher
MATCH (m:Movie {title: "Inception"})
REMOVE m.rating
RETURN m
```

Removes the `rating` property from the node.

**Example 2:**

```cypher
MATCH (m:Movie)
WHERE m.era IS NOT NULL
REMOVE m.era
```

Removes the `era` property from all movies that have it.

### Remove a label

```cypher
MATCH (m:Movie:Blockbuster)
REMOVE m:Blockbuster
RETURN m
```

Removes the `Blockbuster` label from nodes that have it.

---

## 13. INDEX — Performance Optimization

Indexes speed up `MATCH` and `WHERE` lookups. Without indexes, Neo4j scans every node of a type to find matches. With indexes, it uses a lookup table.

### Create an index

```cypher
CREATE INDEX IF NOT EXISTS FOR (m:Movie) ON (m.title)
```

Creates an index on Movie's `title` property. The `IF NOT EXISTS` prevents errors on re-run.

**Example 2:**

```cypher
CREATE INDEX IF NOT EXISTS FOR (a:Actor) ON (a.name)
```

This is exactly how `5_graphBuilder.js` creates indexes before inserting data — to make MERGE operations fast.

### Composite index (multiple properties)

```cypher
CREATE INDEX IF NOT EXISTS FOR (aw:Award) ON (aw.name, aw.category)
```

An index on multiple properties. Used when MERGE checks both `name` and `category` together.

**Example 2:**

```cypher
CREATE INDEX IF NOT EXISTS FOR (m:Movie) ON (m.title, m.year)
```

Useful if you frequently search by both title and year.

### List all indexes

```cypher
SHOW INDEXES
```

Shows all existing indexes in the database.

### Drop an index

```cypher
DROP INDEX index_name IF EXISTS
```

Removes a specific index by name.

---

## 14. shortestPath — Finding Connections

`shortestPath()` finds the shortest connection between two nodes through any relationships.

### Find how two entities are related

```cypher
MATCH (a:Actor {name: "Leonardo DiCaprio"}),
      (d:Director {name: "Christopher Nolan"}),
      path = shortestPath((a)-[*..6]-(d))
RETURN path
```

Finds the shortest path between DiCaprio and Nolan through up to 6 hops. The `*..6` means "any relationship type, minimum 1 hop, maximum 6 hops".

**Example 2:**

```cypher
MATCH (a:Actor {name: "Tom Hardy"}),
      (b:Actor {name: "Cillian Murphy"}),
      path = shortestPath((a)-[*..4]-(b))
RETURN [node IN nodes(path) | coalesce(node.name, node.title)] AS pathNodes,
       [rel IN relationships(path) | type(rel)] AS pathRels
```

Finds the shortest path between two actors and returns readable node names and relationship types. This is the pattern used in `executePath()` in the graph handler.

### All shortest paths

```cypher
MATCH (a:Actor {name: "Leonardo DiCaprio"}),
      (d:Director {name: "Christopher Nolan"}),
      paths = allShortestPaths((a)-[*..6]-(d))
RETURN paths
```

Returns ALL paths of the same shortest length (there might be multiple).

---

## 15. coalesce() — Handle Nulls

`coalesce()` returns the first non-null value from its arguments.

```cypher
MATCH (n)
RETURN coalesce(n.name, n.title) AS displayName
```

Returns `name` if it exists, otherwise `title`. Useful when nodes have different property names.

**Example 2:**

```cypher
MATCH (n)
RETURN coalesce(n.name, n.title, "Unknown") AS displayName
```

Falls back to "Unknown" if both `name` and `title` are null.

---

## 16. labels() and type() — Inspecting Types

### Get a node's labels

```cypher
MATCH (n {name: "Christopher Nolan"})
RETURN labels(n)
```

Returns `["Director"]` — the labels attached to that node.

**Example 2:**

```cypher
MATCH (n)
RETURN DISTINCT labels(n), count(n)
```

Shows all label types and how many nodes of each type exist.

### Get a relationship's type

```cypher
MATCH (a)-[r]->(b)
RETURN DISTINCT type(r), count(r)
```

Shows all relationship types and their counts.

**Example 2:**

```cypher
MATCH (a:Actor {name: "Tom Hardy"})-[r]->(m:Movie)
RETURN type(r), m.title
```

Shows what types of relationships Tom Hardy has with movies.

---

## 17. any(), all(), none() — List Predicates

### any() — At least one matches

```cypher
MATCH (m:Movie)-[:BELONGS_TO]->(g:Genre)
WITH m, collect(g.name) AS genres
WHERE any(genre IN genres WHERE genre IN ["Action", "Sci-Fi"])
RETURN m.title, genres
```

Movies that belong to at least one of the specified genres.

**Example 2:**

```cypher
MATCH (m:Movie)-[:EXPLORES]->(t:Theme)
WITH m, collect(t.name) AS themes
WHERE any(theme IN themes WHERE theme CONTAINS "love")
RETURN m.title, themes
```

Movies with any theme containing "love".

### all() — Every item matches

```cypher
MATCH (m:Movie)-[:BELONGS_TO]->(g:Genre)
WITH m, collect(g.name) AS genres
WHERE all(genre IN genres WHERE genre IN ["Action", "Thriller"])
RETURN m.title, genres
```

Movies where ALL genres are either Action or Thriller.

### none() — No item matches

```cypher
MATCH (m:Movie)-[:BELONGS_TO]->(g:Genre)
WITH m, collect(g.name) AS genres
WHERE none(genre IN genres WHERE genre = "Horror")
RETURN m.title, genres
```

Movies that have no Horror genre.

---

## 18. UNWIND — Expanding Lists

`UNWIND` converts a list into individual rows — the opposite of `collect()`.

```cypher
UNWIND ["Action", "Comedy", "Drama"] AS genre
MATCH (m:Movie)-[:BELONGS_TO]->(g:Genre {name: genre})
RETURN genre, count(m) AS movieCount
```

Iterates over a list and counts movies for each genre.

**Example 2:**

```cypher
MATCH (m:Movie {title: "Inception"})
OPTIONAL MATCH (m)-[:BELONGS_TO]->(g:Genre)
WITH m, collect(g.name) AS genres
UNWIND genres AS genre
RETURN genre
```

Expands the genres list into individual rows.

---

## 19. EXISTS and IS NOT NULL — Checking Existence

### Check if a relationship exists

```cypher
MATCH (m:Movie)
WHERE EXISTS { MATCH (m)-[:WON]->(:Award) }
RETURN m.title
```

Movies that have won at least one award.

**Example 2:**

```cypher
MATCH (a:Actor)
WHERE EXISTS { MATCH (a)-[:ACTED_IN]->(:Movie)-[:WON]->(:Award) }
RETURN a.name
```

Actors who have acted in award-winning movies.

### Check if a property exists

```cypher
MATCH (m:Movie)
WHERE m.rating IS NOT NULL
RETURN m.title, m.rating
```

Movies that have a `rating` property.

---

## 20. Multi-Hop Traversals

### Two-hop traversal

```cypher
MATCH (a:Actor)-[:ACTED_IN]->(m:Movie)-[:BELONGS_TO]->(g:Genre)
WHERE a.name = "Tom Hardy"
RETURN DISTINCT g.name AS genres
```

From Actor → through Movie → to Genre. Finds what genres Tom Hardy has acted in.

**Example 2:**

```cypher
MATCH (d:Director)-[:DIRECTED]->(m:Movie)-[:EXPLORES]->(t:Theme)
WHERE d.name = "Christopher Nolan"
RETURN DISTINCT t.name AS themes
```

What themes Christopher Nolan's movies explore.

### Three-hop traversal

```cypher
MATCH (a1:Actor)-[:ACTED_IN]->(m:Movie)<-[:ACTED_IN]-(a2:Actor)
WHERE a1.name = "Tom Hardy" AND a1 <> a2
RETURN DISTINCT a2.name AS coActors
```

All actors who have appeared in the same movie as Tom Hardy. The `a1 <> a2` ensures we don't return Tom Hardy himself.

**Example 2:**

```cypher
MATCH (d1:Director)-[:DIRECTED]->(m:Movie)<-[:DIRECTED]-(d2:Director)
WHERE d1 <> d2
RETURN d1.name, d2.name, m.title
```

Movies directed by multiple directors.

---

## 21. CALL {} Subqueries (Neo4j 5+)

Subqueries allow complex, multi-step logic within a single query.

```cypher
MATCH (d:Director)
CALL (d) {
  MATCH (d)-[:DIRECTED]->(m:Movie)
  RETURN count(m) AS movieCount
}
RETURN d.name, movieCount
ORDER BY movieCount DESC
LIMIT 10
```

Top 10 directors by movie count using a subquery.

**Example 2:**

```cypher
MATCH (g:Genre)
CALL (g) {
  MATCH (m:Movie)-[:BELONGS_TO]->(g)
  RETURN count(m) AS total, avg(m.year) AS avgYear
}
RETURN g.name, total, avgYear
ORDER BY total DESC
```

Genre statistics with subquery aggregation.

---

## 22. Database Statistics Queries

These queries provide insights into the overall state of your graph.

### Count all nodes

```cypher
MATCH (n)
RETURN count(n) AS totalNodes
```

### Count all relationships

```cypher
MATCH ()-[r]->()
RETURN count(r) AS totalRelationships
```

### Node counts by label

```cypher
MATCH (n)
RETURN labels(n)[0] AS label, count(n) AS count
ORDER BY count DESC
```

### Relationship counts by type

```cypher
MATCH ()-[r]->()
RETURN type(r) AS relationship, count(r) AS count
ORDER BY count DESC
```

---

## 23. Full-Text Search (Neo4j 5+)

For advanced text search beyond simple CONTAINS.

### Create a full-text index

```cypher
CREATE FULLTEXT INDEX movieSearch IF NOT EXISTS
FOR (m:Movie) ON EACH [m.title]
```

### Search using the full-text index

```cypher
CALL db.index.fulltext.queryNodes("movieSearch", "dark night")
YIELD node, score
RETURN node.title, score
ORDER BY score DESC
LIMIT 10
```

Fuzzy search — finds "The Dark Knight" even when searching "dark night".

**Example 2:**

```cypher
CREATE FULLTEXT INDEX personSearch IF NOT EXISTS
FOR (a:Actor, d:Director) ON EACH [a.name, d.name]
```

```cypher
CALL db.index.fulltext.queryNodes("personSearch", "leo dicap*")
YIELD node, score
RETURN node.name, labels(node), score
```

Wildcard search across multiple node types — finds "Leonardo DiCaprio" from "leo dicap\*".

---

## 24. FOREACH — Looping Inside Queries

```cypher
MATCH (m:Movie {title: "Inception"})
FOREACH (genre IN ["Sci-Fi", "Thriller", "Action"] |
  MERGE (g:Genre {name: genre})
  MERGE (m)-[:BELONGS_TO]->(g)
)
```

Creates multiple genres and relationships in a single query.

**Example 2:**

```cypher
MATCH path = shortestPath((a:Actor {name: "Tom Hardy"})-[*]-(b:Actor {name: "Cillian Murphy"}))
FOREACH (node IN nodes(path) |
  SET node.visited = true
)
```

Mark all nodes in a path as visited.

---

## Quick Reference: Queries Used in This Project

| Query Pattern                                                  | Where Used                | Purpose                             |
| -------------------------------------------------------------- | ------------------------- | ----------------------------------- |
| `MERGE (n:Label {prop: $val})`                                 | `5_graphBuilder.js`       | Create node if not exists           |
| `MERGE (a)-[:REL]->(b)`                                        | `5_graphBuilder.js`       | Create relationship if not exists   |
| `CREATE INDEX IF NOT EXISTS FOR (n:Label) ON (n.prop)`         | `5_graphBuilder.js`       | Speed up MERGE lookups              |
| `MATCH (n) RETURN count(n)`                                    | `5_graphBuilder.js`       | Count total nodes                   |
| `MATCH ()-[r]->() RETURN count(r)`                             | `5_graphBuilder.js`       | Count total relationships           |
| `MATCH (n:Label) WHERE toLower(n.prop) = toLower($val)`        | `9_entityResolver.js`     | Case-insensitive exact match        |
| `MATCH (n:Label) WHERE toLower(n.prop) CONTAINS toLower($val)` | `9_entityResolver.js`     | Fuzzy/partial match                 |
| `MATCH ... OPTIONAL MATCH ... collect(DISTINCT ...)`           | `11_graphHandler.js`      | Describe entity (all relationships) |
| `shortestPath((a)-[*..6]-(b))`                                 | `11_graphHandler.js`      | Find path between entities          |
| `MATCH ... WHERE m.title IN $titles`                           | `12_similarityHandler.js` | Filter movies by title list         |
| `WITH m, collect(g.name) AS genres WHERE any(...)`             | `12_similarityHandler.js` | Genre overlap checking              |

---

## Tips for This Project

1. **Always use MERGE over CREATE** when inserting — prevents duplicate nodes
2. **Create indexes BEFORE bulk imports** — makes MERGE checks fast
3. **Use parameterized queries** (`$paramName`) — prevents injection and improves performance via query caching
4. **Open sessions in READ mode** for queries — `{ defaultAccessMode: "READ" }` adds a safety layer
5. **Always close sessions** in `finally` blocks — each session uses a database connection
6. **Use OPTIONAL MATCH** when fetching related data that might not exist — prevents losing the main entity from results
7. **Use `collect(DISTINCT ...)` with OPTIONAL MATCH** — avoids duplicate values when multiple OPTIONAL MATCHes create cartesian products
