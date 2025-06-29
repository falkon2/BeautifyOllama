# Search API Documentation

## Overview

The `search_api.py` module provides a command-line interface for the Ollama Web Search functionality. This script is called by the Rust backend to perform web searches and return structured JSON results.

## Usage

### Basic Search

```bash
python3 ollama-web-search/main.py --query "What is the capital of France?" --json
```

### With Thinking Mode

```bash
python3 ollama-web-search/main.py --query "Latest AI developments" --json --thinking
```

### Interactive Mode

```bash
python3 ollama-web-search/main.py
```

## Command Line Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `--query` | Search query string | Required in JSON mode |
| `--json` | Output results in JSON format | False |
| `--thinking` | Enable AI thinking mode | False |
| `--model` | Ollama model to use | From config |
| `--history` | Show search history | False |
| `--config` | Show configuration | False |

## JSON Response Format

### Successful Response

```json
{
  "success": true,
  "user_query": "What is the capital of France?",
  "search_queries": ["capital France"],
  "summaries": [
    {
      "query": "capital France",
      "summary": "Paris is the capital and largest city of France...",
      "sources": ["https://en.wikipedia.org/wiki/Paris"],
      "title": "Paris - Wikipedia"
    }
  ],
  "sources": ["https://en.wikipedia.org/wiki/Paris"],
  "error": null
}
```

### Error Response

```json
{
  "success": false,
  "user_query": "search query",
  "search_queries": [],
  "summaries": [],
  "sources": [],
  "error": "Error description"
}
```

## Configuration

### Configuration File (`config.json`)

```json
{
  "model": "qwen3:0.6b",
  "searxng_instances": [
    "http://localhost:32768",
    "https://search.inetol.net/search",
    "https://searx.be/search",
    "https://search.brave4u.com/search",
    "https://priv.au/search"
  ],
  "max_results": 8,
  "timeout": 10,
  "max_retries": 3,
  "history_file": "search_history.json",
  "enable_colors": true,
  "streaming_delay": 0.02
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_HOST` | Ollama server host | `localhost:11434` |

## API Classes and Methods

### WebSearchAssistant

Main class that handles web search operations.

#### Methods

##### `generate_search_query(question: str, thinking: bool = False) -> Optional[str]`

Generates an optimized search query from a user question.

**Parameters:**
- `question`: User's original question
- `thinking`: Enable thinking mode for query generation

**Returns:** Optimized search query string or None if generation fails

##### `browse_web(query: str) -> Optional[List[Dict]]`

Searches the web using configured SearxNG instances.

**Parameters:**
- `query`: Search query string

**Returns:** List of search results or None if all instances fail

##### `select_best_result(question: str, query: str, results: List[Dict], thinking: bool = False) -> Optional[Tuple[str, str]]`

Uses AI to select the most relevant search result.

**Parameters:**
- `question`: Original user question
- `query`: Generated search query
- `results`: List of search results
- `thinking`: Enable thinking mode

**Returns:** Tuple of (title, url) or None if selection fails

##### `retrieve_page_information(url: str) -> Optional[str]`

Retrieves and cleans webpage content using Jina Reader API.

**Parameters:**
- `url`: URL to extract content from

**Returns:** Cleaned webpage content or None if extraction fails

##### `model_response(model: str, message: str, max_retries: int = 3, thinking: bool = False) -> Optional[str]`

Gets response from Ollama model with thinking mode control.

**Parameters:**
- `model`: Ollama model name
- `message`: Message to send to model
- `max_retries`: Maximum retry attempts
- `thinking`: Enable thinking mode

**Returns:** Model response or None if all retries fail

## Search Flow

1. **Query Generation**: Convert user question to optimized search query
2. **Web Search**: Search using SearxNG instances with fallback
3. **Result Selection**: AI selects most relevant result
4. **Content Extraction**: Retrieve webpage content via Jina Reader
5. **Summarization**: Generate AI summary of extracted content
6. **Response Formatting**: Return structured JSON response

## Error Handling

### Common Error Types

- **Ollama Connection Error**: Cannot connect to Ollama server
- **Search Instance Failure**: All SearxNG instances failed
- **Content Extraction Timeout**: Jina Reader API timeout
- **Model Response Error**: Ollama model response failure

### Retry Logic

- **Search Instances**: Automatic fallback to next instance
- **Model Responses**: Exponential backoff retry (up to 3 attempts)
- **Content Extraction**: Single attempt with timeout

## Integration with Rust Backend

### Rust Command Execution

```rust
let mut cmd = Command::new("python3");
cmd.arg("ollama-web-search/main.py")
   .arg("--query")
   .arg(&query)
   .arg("--json");

if thinking_mode {
    cmd.arg("--thinking");
}

let output = cmd.output()?;
```

### Response Parsing

```rust
let response = String::from_utf8_lossy(&output.stdout);
let json: serde_json::Value = serde_json::from_str(&response)?;

if json.get("success").and_then(|v| v.as_bool()).unwrap_or(false) {
    // Handle successful response
    format_search_results_from_python(&json, &query)
} else {
    // Handle error
    let error = json.get("error").and_then(|v| v.as_str()).unwrap_or("Unknown error");
    Err(format!("Python search failed: {}", error))
}
```

## Testing

### Unit Tests

```bash
# Test search query generation
python3 -c "
from main import WebSearchAssistant
assistant = WebSearchAssistant()
query = assistant.generate_search_query('What is Python?')
print(f'Generated query: {query}')
"
```

### Integration Tests

```bash
# Test full search flow
python3 ollama-web-search/main.py --query "test query" --json

# Test thinking mode
python3 ollama-web-search/main.py --query "test query" --json --thinking
```

### SearxNG Connectivity Test

```bash
# Test local instance
curl "http://localhost:32768?q=test&format=json"

# Test public instance
curl "https://search.inetol.net/search?q=test&format=json"
```

## Performance Considerations

### Optimization Tips

1. **Use Local SearxNG**: Significantly faster than public instances
2. **Adjust Timeouts**: Balance between speed and reliability
3. **Limit Results**: Reduce `max_results` for faster processing
4. **Model Selection**: Smaller models respond faster

### Resource Usage

- **Memory**: ~50MB for Python process
- **Network**: Dependent on search instances and content extraction
- **CPU**: Model inference for query generation and summarization

## Security Notes

### Data Flow

- User queries are sent to configured SearxNG instances
- Webpage content is extracted via Jina Reader API
- All processing happens locally except for web requests

### Privacy

- No logging of user queries (with proper SearxNG configuration)
- Search history stored locally only
- Can be configured to use local SearxNG instance only

## Contributing

### Adding Features

1. Fork the repository
2. Add new methods to `WebSearchAssistant` class
3. Update JSON response format if needed
4. Add corresponding tests
5. Update documentation

### Reporting Issues

Please include:
- Python version
- Ollama version and models
- SearxNG instance details
- Error messages and logs
- Steps to reproduce
