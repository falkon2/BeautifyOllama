# Web Search Integration Guide

## Overview

BeautifyOllama now includes intelligent web search capabilities that allow the AI to access real-time information from the internet. This feature uses SearxNG search engines and is seamlessly integrated into the chat interface.

## Features

### 🔍 Intelligent Web Search
- **Multi-Engine Fallback**: Uses multiple SearxNG instances for reliability
- **AI-Powered Query Optimization**: Automatically generates optimal search queries
- **Smart Result Selection**: AI selects the most relevant search results
- **Content Extraction**: Retrieves and summarizes webpage content

### 🧠 Thinking Mode Control
- **Disabled by Default**: Clean, direct responses without reasoning traces
- **Optional Thinking**: Toggle to see AI's reasoning process
- **Model-Specific**: Uses `/set nothink` and `/set think` commands

### 🌐 SearxNG Integration
- **Local Instance Support**: Primary support for local Docker SearxNG
- **Public Instance Fallbacks**: Multiple backup search engines
- **Privacy-Focused**: No query logging when using local instance

## Quick Start

### 1. Install Dependencies

```bash
# Python dependencies for web search
pip install ollama requests

# Make sure Ollama is running
ollama serve
```

### 2. Setup Local SearxNG (Optional but Recommended)

```bash
# Clone SearxNG Docker setup
git clone https://github.com/searxng/searxng-docker.git searxng
cd searxng

# Start SearxNG
docker compose up -d

# Note the port number (e.g., localhost:32768)
docker ps
```

### 3. Configure Search Instances

Edit `ollama-web-search/config.json`:

```json
{
  "model": "qwen3:0.6b",
  "searxng_instances": [
    "http://localhost:32768",
    "https://search.inetol.net/search",
    "https://searx.be/search",
    "https://search.brave4u.com/search",
    "https://priv.au/search"
  ]
}
```

### 4. Start the Application

```bash
npm run tauri dev
```

## Usage

### In the Chat Interface

1. **Enable Web Search**: Click the web search toggle button
2. **Ask Questions**: Type any question requiring current information
3. **View Sources**: Sources are automatically displayed below responses
4. **Toggle Thinking**: Enable to see AI's reasoning process

### Example Queries

- "What are the latest developments in AI?"
- "Current weather in Tokyo"
- "Recent news about space exploration"
- "How to install Docker on Ubuntu 2024"

## Architecture

### Data Flow

```
User Query → Rust Backend → Python Script → SearxNG → Content Extraction → AI Summary → User
```

### Components

1. **Frontend** (`src/components/Chat.tsx`)
   - Web search toggle
   - Thinking mode toggle
   - Source display

2. **Backend** (`src-tauri/src/lib.rs`)
   - `search_web` Tauri command
   - Python script execution
   - JSON response parsing

3. **Python Script** (`ollama-web-search/main.py`)
   - Search query generation
   - SearxNG API calls
   - Result selection and summarization

## Configuration Options

### Python Configuration (`ollama-web-search/config.json`)

```json
{
  "model": "qwen3:0.6b",           // Ollama model to use
  "searxng_instances": [...],       // SearxNG instances (in priority order)
  "max_results": 8,                 // Maximum search results to process
  "timeout": 10,                    // Request timeout in seconds
  "max_retries": 3,                 // Maximum retry attempts
  "history_file": "search_history.json"  // Search history storage
}
```

### SearxNG Configuration

For optimal performance, configure your local SearxNG instance:

- Disable rate limiting for local use
- Enable JSON format output
- Optimize search engines for your needs
- Set appropriate timeouts

## API Reference

### Tauri Commands

```typescript
// Perform web search
await invoke('search_web', {
  query: 'search query',
  thinking: false  // optional thinking mode
});
```

### Python Script CLI

```bash
# JSON output for API integration
python3 ollama-web-search/main.py --query "question" --json

# With thinking mode
python3 ollama-web-search/main.py --query "question" --json --thinking

# Interactive mode
python3 ollama-web-search/main.py
```

## Troubleshooting

### Common Issues

1. **No Search Results**
   - Check SearxNG instance connectivity
   - Verify Ollama is running and accessible
   - Test with `curl http://localhost:32768`

2. **Python Script Errors**
   - Install required dependencies: `pip install ollama requests`
   - Check Python path in Rust backend
   - Verify script permissions: `chmod +x ollama-web-search/main.py`

3. **Thinking Mode Not Working**
   - Some models don't support `/set nothink` commands
   - Try different Ollama models
   - Check model compatibility

### Debug Mode

Enable detailed logging:

```bash
RUST_LOG=debug npm run tauri dev
```

### Testing Search Integration

```bash
# Test Python script directly
cd ollama-web-search
python3 main.py --query "test query" --json

# Test SearxNG connectivity
curl "http://localhost:32768?q=test&format=json"
```

## Security and Privacy

### Best Practices

- **Use Local SearxNG**: Better privacy and no rate limits
- **Configure Properly**: Disable logging in SearxNG settings
- **Network Security**: Consider using VPN for public instances
- **Data Handling**: Search history is stored locally only

### Privacy Features

- No query logging (with proper SearxNG config)
- Local content extraction via Jina Reader API
- Source attribution for transparency
- Optional search history (can be disabled)

## Performance Optimization

### Tips for Better Performance

1. **Local SearxNG**: Significantly faster than public instances
2. **Model Selection**: Smaller models respond faster
3. **Timeout Tuning**: Adjust based on your network speed
4. **Result Limiting**: Reduce `max_results` for faster processing

### SearxNG Optimization

```yaml
# In searx/settings.yml
outgoing:
  request_timeout: 3.0
  max_request_timeout: 6.0

# Disable unnecessary engines
engines:
  - name: google
    disabled: false
  - name: bing  
    disabled: true  # Disable if not needed
```

## Contributing

### Adding New Search Engines

1. Add SearxNG instance to configuration
2. Test connectivity and JSON format support
3. Update fallback priority order
4. Document any special requirements

### Improving AI Integration

1. Enhance query generation prompts
2. Improve result selection logic
3. Add specialized search categories
4. Optimize content summarization

## License

This web search integration maintains the same license as the main BeautifyOllama project.
