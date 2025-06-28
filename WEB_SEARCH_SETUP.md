# Web Search Configuration

The web search functionality now follows the Python implementation from `ollama-search/src/simplesearch.py`.

## Setup

1. **Start the TypeScript Search Service** (from `ollama-search/src/search.ts`):
   ```bash
   cd ollama-search/src
   deno run --allow-net search.ts
   ```
   This will start the search service on `http://localhost:3000`

2. **Alternative: Use Custom Cloud Service**:
   Set the environment variable:
   ```bash
   export CLOUD_SERVICE_URL=https://your-cloud-service.com
   ```

## How it works

1. **Query Generation**: Uses Ollama to generate 3 Google search queries based on the user's input
2. **Search Context**: Fetches search results from the cloud service (or TypeScript service)  
3. **Summarization**: Uses Ollama to summarize each set of search results
4. **Source Extraction**: Extracts and displays all URLs used for the answer

## Search Flow

1. User asks a question with web search enabled
2. Generate 3 related search queries using Ollama
3. For each query:
   - Fetch search context from cloud service
   - Extract sources (URLs)
   - Summarize results using Ollama
4. Combine all summaries and display sources

This matches the Python `simplesearch.py` implementation exactly.
