# Tools Directory

This directory contains external tools and components used by BeautifyOllama that were previously in separate directories to avoid git submodule conflicts.

## Structure

### `/tools/web-search/`
Contains the Python-based web search implementation using SearxNG instances.

**Files:**
- `main.py` - Main web search script with Ollama integration
- `config.json` - Configuration for models and SearxNG instances
- `requirements.txt` - Python dependencies
- `search_api.py` - Legacy search API (deprecated)
- `setup.py` - Package setup configuration
- `README.md` - Web search documentation
- `LICENSE` - License for the web search component

**Usage:**
```bash
cd tools/web-search
python main.py --query "your search query" --json
```

## Migration Notes

These directories were moved from:
- `ollama-web-search/` → `tools/web-search/`

This reorganization resolves git submodule conflicts that were causing GitHub Actions workflow failures.

## Integration

The Rust backend (`src-tauri/src/lib.rs`) has been updated to look for the Python script at the new location:
- Primary path: `tools/web-search/main.py`
- Fallback paths include legacy locations for backward compatibility

## SearxNG Setup

For setting up your own SearxNG instance (recommended for privacy), refer to:
- The automated setup script: `setup-searxng.sh` in the project root
- Documentation: `SEARXNG_SETUP.md`
- Or visit: https://docs.searxng.org/admin/installation.html
