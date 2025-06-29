# BeautifyOllama - Web Search Integration

## 🔍 New Feature: Intelligent Web Search

BeautifyOllama now includes powerful web search capabilities that allow the AI to access real-time information from the internet using SearxNG search engines.

### ✨ Features

- **🌐 Multi-Engine Search**: Uses multiple SearxNG instances for reliability
- **🧠 AI-Powered Query Optimization**: Automatically generates optimal search queries  
- **🎯 Smart Result Selection**: AI selects the most relevant search results
- **📄 Content Extraction**: Retrieves and summarizes webpage content
- **🔒 Privacy-Focused**: Supports local SearxNG instance for maximum privacy
- **⚡ Thinking Mode Control**: Toggle AI reasoning on/off

### 🚀 Quick Start

#### 1. Setup Local SearxNG (Recommended)

```bash
# Run the automated setup script
./setup-searxng.sh
```

Or manually:

```bash
# Clone SearxNG Docker setup
git clone https://github.com/searxng/searxng-docker.git searxng
cd searxng
docker compose up -d
```

#### 2. Install Python Dependencies

```bash
pip install ollama requests
```

#### 3. Start BeautifyOllama

```bash
npm run tauri dev
```

#### 4. Use Web Search

1. Click the web search toggle in the chat interface
2. Ask questions requiring current information
3. View sources displayed below AI responses

### 🔧 Configuration

#### SearxNG Instances (Priority Order)

1. `http://localhost:32768` - **Local Docker instance** (fastest, most private)
2. `https://search.inetol.net/search` - Public fallback
3. `https://searx.be/search` - Public fallback
4. `https://search.brave4u.com/search` - Public fallback  
5. `https://priv.au/search` - Public fallback

#### Python Configuration (`ollama-web-search/config.json`)

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
  "timeout": 10
}
```

### 📖 Usage Examples

- "What are the latest developments in AI?"
- "Current weather in Tokyo"
- "Recent news about space exploration"
- "How to install Docker on Ubuntu 2024"

### 🔧 Technical Architecture

```
User Query → Rust Backend → Python Script → SearxNG → Content Extraction → AI Summary → User
```

#### Components

- **Frontend**: React/TypeScript chat interface with search toggles
- **Backend**: Rust Tauri application with search command
- **Python Script**: SearxNG integration and AI processing
- **SearxNG**: Search engine providing web results

### 📚 Documentation

- [📋 SearxNG Setup Guide](SEARXNG_SETUP.md) - Detailed setup instructions
- [🔌 Web Search Integration](WEB_SEARCH_INTEGRATION.md) - Technical integration guide  
- [🛠️ Search API Documentation](SEARCH_API_DOCS.md) - API reference and usage

### 🔍 Testing

#### Test Python Script Directly

```bash
# Basic search test
python3 ollama-web-search/main.py --query "What is the capital of France?" --json

# With thinking mode
python3 ollama-web-search/main.py --query "Latest AI developments" --json --thinking

# Interactive mode
python3 ollama-web-search/main.py
```

#### Test SearxNG Connectivity

```bash
# Test local instance
curl "http://localhost:32768?q=test&format=json"

# Test the application integration
npm run tauri dev
```

### 🛠️ Troubleshooting

#### Common Issues

1. **SearxNG Not Accessible**
   - Check Docker container: `docker ps`
   - Verify port in config.json matches container port
   - Test web interface: `http://localhost:32768`

2. **Python Dependencies Missing**
   ```bash
   pip install ollama requests
   ```

3. **Ollama Not Running**
   ```bash
   ollama serve
   ```

4. **Search Results Not Appearing**
   - Enable web search toggle in chat interface
   - Check browser console for errors
   - Test Python script directly

#### Debug Mode

```bash
RUST_LOG=debug npm run tauri dev
```

### 🔒 Privacy & Security

- **Local SearxNG**: No external search queries when using local instance
- **No Logging**: Properly configured SearxNG doesn't log queries
- **Source Attribution**: All search sources are clearly displayed
- **Local Processing**: AI processing happens locally via Ollama

### 🚀 Performance Tips

1. **Use Local SearxNG**: Significantly faster than public instances
2. **Optimize Timeouts**: Adjust in config.json based on network speed
3. **Model Selection**: Smaller Ollama models respond faster
4. **Result Limiting**: Reduce max_results for faster processing

### 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/web-search-improvement`
3. Make changes and test thoroughly
4. Submit pull request with detailed description

### 📄 License

This web search integration is part of BeautifyOllama and follows the same license terms.

---

**Note**: This integration uses the exact SearxNG instances and workflow as specified in the original `ollama-web-search/main.py` script, ensuring compatibility and reliability.
