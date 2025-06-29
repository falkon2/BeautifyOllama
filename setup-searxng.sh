#!/bin/bash

# SearxNG Setup Script for BeautifyOllama
# This script sets up a local SearxNG instance optimized for BeautifyOllama

set -e

echo "🔍 Setting up SearxNG for BeautifyOllama..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   macOS: brew install --cask docker"
    echo "   Linux: sudo apt-get install docker.io docker-compose"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create searxng directory if it doesn't exist
if [ ! -d "searxng" ]; then
    echo "📦 Cloning SearxNG Docker setup..."
    git clone https://github.com/searxng/searxng-docker.git searxng
    cd searxng
else
    echo "📁 Using existing searxng directory..."
    cd searxng
fi

# Generate secret key if not already done
if grep -q "ultrasecretkey" searx/settings.yml 2>/dev/null; then
    echo "🔑 Generating secret key..."
    if command -v openssl &> /dev/null; then
        SECRET_KEY=$(openssl rand -hex 32)
        sed -i.bak "s|ultrasecretkey|$SECRET_KEY|g" searx/settings.yml
        echo "✅ Secret key generated and updated"
    else
        echo "⚠️  OpenSSL not found. Please manually replace 'ultrasecretkey' in searx/settings.yml"
    fi
fi

# Create optimized settings for BeautifyOllama
echo "⚙️  Configuring SearxNG for BeautifyOllama..."

cat > searx/settings.yml << 'EOF'
# SearxNG Configuration optimized for BeautifyOllama
use_default_settings: true

general:
  debug: false
  instance_name: "BeautifyOllama Search"
  contact_url: false
  public_instance: false
  enable_metrics: false

brand:
  new_issue_url: false
  docs_url: false
  public_instances: false
  wiki_url: false
  issue_url: false

search:
  safe_search: 0
  autocomplete: ""
  default_lang: "en"
  max_page: 0
  formats:
    - html
    - json

server:
  port: 8080
  bind_address: "0.0.0.0"
  secret_key: "BeautifyOllama-Search-Key-$(openssl rand -hex 16 2>/dev/null || echo 'fallback-secret-key')"
  limiter: false
  public_instance: false
  image_proxy: true

ui:
  static_use_hash: false
  default_theme: simple
  center_alignment: false
  infinite_scroll: false
  cache_url: false

preferences:
  lock:
    - autocomplete
    - method
    - safesearch

outgoing:
  request_timeout: 3.0
  max_request_timeout: 6.0
  useragent_suffix: ""
  pool_connections: 100
  pool_maxsize: 20
  enable_http2: true

engines:
  - name: google
    engine: google
    categories: [general, web]
    use_mobile_ui: false
    
  - name: duckduckgo
    engine: duckduckgo
    categories: [general, web]
    
  - name: bing
    engine: bing
    categories: [general, web]
    
  - name: startpage
    engine: startpage
    categories: [general, web]

# Disable unnecessary engines for better performance
  - name: wikipedia
    disabled: true
  - name: wikidata
    disabled: true
  - name: currency
    disabled: true
  - name: diccionario
    disabled: true
EOF

echo "📝 SearxNG configuration updated for BeautifyOllama"

# Start SearxNG
echo "🚀 Starting SearxNG..."
docker compose up -d

# Wait for container to start
echo "⏳ Waiting for SearxNG to start..."
sleep 10

# Get the container port
CONTAINER_ID=$(docker compose ps -q searxng)
if [ -n "$CONTAINER_ID" ]; then
    PORT=$(docker port $CONTAINER_ID 8080/tcp | cut -d: -f2)
    
    if [ -n "$PORT" ]; then
        echo "✅ SearxNG is running on port $PORT"
        echo "🌐 Web interface: http://localhost:$PORT"
        echo "🔧 JSON API: http://localhost:$PORT?q=test&format=json"
        
        # Update BeautifyOllama configuration
        echo "📝 Updating BeautifyOllama configuration..."
        cd ../ollama-web-search
        
        # Update config.json with the correct port
        if [ -f "config.json" ]; then
            # Create backup
            cp config.json config.json.bak
            
            # Update the localhost port
            sed -i.tmp "s|http://localhost:[0-9]*|http://localhost:$PORT|g" config.json
            rm -f config.json.tmp
            
            echo "✅ Updated ollama-web-search/config.json with port $PORT"
        else
            # Create new config.json
            cat > config.json << EOF
{
  "model": "qwen3:0.6b",
  "searxng_instances": [
    "http://localhost:$PORT",
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
EOF
            echo "✅ Created ollama-web-search/config.json with port $PORT"
        fi
        
        cd ..
        
        # Test the connection
        echo "🔍 Testing SearxNG connection..."
        if curl -s "http://localhost:$PORT?q=test&format=json" > /dev/null; then
            echo "✅ SearxNG API is responding correctly"
        else
            echo "⚠️  SearxNG API test failed, but container is running"
        fi
        
        echo ""
        echo "🎉 SearxNG setup complete!"
        echo ""
        echo "Next steps:"
        echo "1. Test the search: python3 ollama-web-search/main.py --query 'test' --json"
        echo "2. Start BeautifyOllama: npm run tauri dev"
        echo "3. Enable web search in the chat interface"
        echo ""
        echo "To stop SearxNG: cd searxng && docker compose down"
        echo "To restart SearxNG: cd searxng && docker compose up -d"
        
    else
        echo "❌ Could not determine SearxNG port"
        exit 1
    fi
else
    echo "❌ SearxNG container not found"
    exit 1
fi
