## **Problem Statement: Hybrid Movie Intelligence & Discovery Engine**

[Notion Docs Link](https://www.notion.so/Lecture-17-Project-2fea9af81c98800caa23eccb3fb108d0?source=copy_link)

### **Context**

You are required to design the backend architecture for a next-generation **Movie Discovery System**. The dataset is provided in a **PDF format containing 1000 movies**, where each movie follows a specific detail-oriented structure (including Director, Cast, Awards, Themes, etc.). The goal of the system is not just to "search" but to understand complex user queries and provide highly accurate results.

### **Data Schema (As per the 1000-movie PDF)**

The system must process data according to the following structure found in the document:

- **Identifiers:** Movie Title, Release Year.
- **Entities:** Director, Actors (List).
- **Taxonomy:** Genre, Themes (multiple tags like 'Technology', 'Power', 'Corruption', 'Time').
- **Achievements:** Awards (e.g., Oscar categories or 'None') mapped to specific movies.

### **The Challenge: Query Diversity**

The system must efficiently handle two distinct types of queries:

**1. Factual & Relational Queries (Structured):**

- "Movies directed by Christopher Nolan."
- "Actors who worked in Nolan movies."
- "Actors who won an Oscar in a different movie and genre."

**2. Semantic & Exploratory Queries (Unstructured):**

- "Movies similar to Inception."
- "Movies like Inception."
- "Mind-bending sci-fi movies."
- "Recommend similar films."

### **Requirements for the Candidate**

As an Engineer, you must design:

1. **Unified Query Parsing:** A system that can analyze a query to determine if it is "Fact-based", "Similarity-based", or a "Hybrid" of both.
2. **Data Modeling:** A strategy to ingest the 1000-movie PDF data and store it such that multi-hop relations (e.g., Director -> Movie -> Actor -> Award) and high-dimensional vector embeddings are both supported.
3. **Accuracy vs. Serendipity:** Structured queries must have 100% precision, while recommendation queries should balance relevance with variety.
4. **Scalability:** Ensuring the retrieval logic remains robust even if the complexity of the relationships or the dataset size increases.

---
