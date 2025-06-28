# SearxNG Web Search Integration

This document explains how to set up and use the SearxNG web search integration with BeautifyOllama.

## Overview

BeautifyOllama now includes intelligent web search capabilities powered by SearxNG instances. The integration uses the exact Python script from `ollama-web-search/main.py` with multiple SearxNG fallback instances.

## SearxNG Instances

The app is configured to use the following SearxNG instances in order of preference:

1. `http://localhost:32768` - **Local Docker SearxNG instance** (primary)
2. `https://search.inetol.net/search` - Public fallback
3. `https://searx.be/search` - Public fallback  
4. `https://search.brave4u.com/search` - Public fallback
5. `https://priv.au/search` - Public fallback

## Local SearxNG Setup (Recommended)

For the best performance and privacy, run SearxNG locally using Docker:

### Quick Start

```bash
# Clone the SearxNG Docker setup
git clone https://github.com/searxng/searxng-docker.git searxng
cd searxng

# Generate secret key
sed -i "s|ultrasecretkey|$(openssl rand -hex 32)|g" searx/settings.yml

# Start SearxNG
docker compose up -d

# Check the running port
docker ps
```

The SearxNG instance will typically run on a random port (e.g., `32768`). Update the configuration in `ollama-web-search/config.json` to match your port.

### Configuration

Edit `searxng/searx/settings.yml` to optimize for API usage:

```yaml
general:
  debug: false
  instance_name: "BeautifyOllama Search"
  public_instance: false

server:
  port: 8080
  bind_address: "0.0.0.0"
  secret_key: "your-secret-key-here"

search:
  safe_search: 0
  autocomplete: ""
  default_lang: "en"
  formats:
    - html
    - json

ui:
  static_use_hash: false
  default_theme: simple
  infinite_scroll: false

outgoing:
  request_timeout: 3.0
  max_request_timeout: 6.0

engines:
  - name: google
    engine: google
    categories: [general, web]
    use_mobile_ui: false

# Disable rate limiting for local use
limiter: false
```

## Integration Architecture

### Backend (Rust)
- `src-tauri/src/lib.rs` - Contains the `search_web` Tauri command
- Calls the Python script directly using `Command::new("python3")`
- Parses JSON response from Python script
- Formats results for the frontend

### Python Script
- `ollama-web-search/main.py` - Main search logic
- Uses the exact SearxNG instances as specified
- Supports `--json` flag for machine-readable output
- Supports `--thinking` flag for AI reasoning control

### Frontend (React/TypeScript)
- `src/components/Chat.tsx` - Main chat interface with web search toggle
- `src/app/services/ollamaService.ts` - API wrapper for backend calls
- Web search sources are displayed in the UI
- Thinking mode can be toggled on/off

## Usage

### In the Application

1. **Enable Web Search**: Toggle the web search button in the chat interface
2. **Optional Thinking Mode**: Toggle thinking mode to see AI reasoning
3. **Ask Questions**: Type any question and the AI will search the web for current information
4. **View Sources**: Sources are displayed below the AI response

### Command Line (Testing)

```bash
# Test web search with JSON output
python3 ollama-web-search/main.py --query "What is the capital of France?" --json

# Test with thinking mode enabled
python3 ollama-web-search/main.py --query "Latest AI developments" --json --thinking

# Interactive mode
python3 ollama-web-search/main.py
```

## Configuration

### Python Configuration
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
  ],
  "max_results": 8,
  "timeout": 10,
  "max_retries": 3
}
```

### Rust Backend
The backend automatically detects the Python script location and calls it with appropriate parameters.

## Dependencies

### Python Dependencies
```bash
pip install ollama requests
```

### System Requirements
- Python 3.8+
- Ollama running locally
- Internet connection for public SearxNG instances
- Docker (optional, for local SearxNG)

## Troubleshooting

### Common Issues

1. **SearxNG Connection Failed**
   - Check if your local SearxNG Docker container is running
   - Verify the port number in the configuration
   - Test the SearxNG web interface: `http://localhost:32768`

2. **Python Script Not Found**
   - Ensure the script is executable: `chmod +x ollama-web-search/main.py`
   - Check the path in the Rust backend

3. **Ollama Connection Error**
   - Make sure Ollama is running: `ollama serve`
   - Check if the specified model is installed: `ollama list`

4. **Thinking Mode Not Working**
   - Thinking mode control depends on the Ollama model
   - Some models may not support `/set nothink` and `/set think` commands

### Debug Mode

Enable debug logging by running:
```bash
RUST_LOG=debug npm run tauri dev
```

## Security Considerations

- Local SearxNG provides better privacy than public instances
- Public instances may have rate limiting or access restrictions
- Consider using VPN when accessing public instances
- SearxNG does not log user queries when properly configured

## Performance Tips

1. **Use Local SearxNG**: Faster response times and no rate limits
2. **Configure Timeouts**: Adjust timeout values in `config.json` based on your network
3. **Optimize SearxNG**: Disable unnecessary engines in SearxNG configuration
4. **Model Selection**: Smaller models respond faster for search query generation

## Future Improvements

- [ ] Automatic SearxNG Docker container management
- [ ] Multiple search result aggregation
- [ ] Search result caching
- [ ] Custom search engine preferences
- [ ] Search history and bookmarking
