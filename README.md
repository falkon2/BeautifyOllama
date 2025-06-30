# BeautifyOllama

<div align="center">
  <img src="beautifyOllama.png" alt="BeautifyOllama Logo" width="200" height="200">
  
  <p align="center">
    <strong>A modern, beautiful web interface for Ollama AI models</strong>
  </p>
  
  <p align="center">
    Transform your local AI interactions with an elegant, feature-rich chat interface
  </p>

  <p align="center">
    <a href="https://github.com/falkon2/BeautifyOllama/stargazers">
      <img src="https://img.shields.io/github/stars/falkon2/BeautifyOllama?style=for-the-badge&logo=github&color=FFD700" alt="GitHub Stars">
    </a>
    <a href="https://github.com/falkon2/BeautifyOllama/network/members">
      <img src="https://img.shields.io/github/forks/falkon2/BeautifyOllama?style=for-the-badge&logo=github&color=87CEEB" alt="GitHub Forks">
    </a>
    <a href="https://github.com/falkon2/BeautifyOllama/issues">
      <img src="https://img.shields.io/github/issues/falkon2/BeautifyOllama?style=for-the-badge&logo=github&color=FF6B6B" alt="GitHub Issues">
    </a>
    <a href="https://github.com/falkon2/BeautifyOllama/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/falkon2/BeautifyOllama?style=for-the-badge&color=32CD32" alt="License">
    </a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-15.3.3-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
    <img src="https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/TailwindCSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS">
    <img src="https://img.shields.io/badge/Made%20by-17%20year%20old%20developer-orange?style=for-the-badge")

  </p>

  <p align="center">
    <a href="#demo">Demo</a> •
    <a href="#features">Features</a> •
    <a href="#installation">Installation</a> •
    <a href="#usage">Usage</a> •
    <a href="#contributing">Contributing</a> •
    <a href="#roadmap">Roadmap</a>
  </p>
</div>

---

## 📖 About

BeautifyOllama is an open-source web interface that enhances your local Ollama AI model interactions with a beautiful, modern design. Built with cutting-edge web technologies, it provides a seamless chat experience with stunning visual effects and enterprise-grade functionality.

**🎉 Latest Updates (v1.6.9)**
- **🔧 Custom Port Support** - Configure Ollama to run on any port
- **⚙️ Comprehensive Settings Panel** - Complete Ollama service management
- **🔍 Enhanced Web Search** - Improved search with source tracking and reliability
- **📱 Cross-Platform Desktop App** - Native desktop application with Tauri
- **🧠 Advanced AI Features** - Thinking mode, verbose stats, and conversation management
- **🛠️ Developer Experience** - Improved error handling and Windows compatibility

> **⚠️ Early Development Notice**  
> This project is in active development. Features and APIs may change. We welcome contributions and feedback from the community.

## 🎥 Demo


Video Demo

[![BeautifyOllama Demo](https://img.youtube.com/vi/cO2X56MxP9A/maxresdefault.jpg)](https://youtu.be/cO2X56MxP9A)

https://github.com/user-attachments/assets/8ed11232-de9c-469b-b332-143ca41daf15

## ✨ Features

### Current Features
- **🔍 Intelligent Web Search** - Real-time internet search with SearxNG integration and source tracking
- **🧠 Thinking Mode Control** - Toggle AI reasoning traces on/off with clean rendering
- **🌐 Multi-Engine Fallback** - Multiple SearxNG instances for reliability and uptime
- **🔧 Custom Port Support** - Configure Ollama to run on any port (not just 11434)
- **⚙️ Comprehensive Settings** - Complete Ollama management, model downloads, and configuration
- **🎬 Animated Shine Borders** - Eye-catching animated message borders with color cycling
- **📱 Responsive Design** - Mobile-first approach with seamless cross-device compatibility  
- **🌙 Theme System** - Dark/light mode with system preference detection
- **⚡ Real-time Streaming** - Live response streaming from Ollama models with typing effects
- **🎯 Clean Interface** - Simplified message rendering focused on readability
- **🔄 Advanced Model Management** - Download, delete, and switch between Ollama models
- **📊 Verbose Statistics** - Toggle detailed timing and performance stats for responses
- **💬 Conversation Management** - Persistent chat history with sidebar navigation
- **🖥️ Cross-Platform Support** - Windows, macOS, and Linux compatibility with platform-specific optimizations
- **⌨️ Smart Input** - Keyboard shortcuts (Enter to send, Shift+Enter for newlines)
- **🎨 Modern UI/UX** - Glassmorphism effects, smooth micro-animations, and polished design

### 🚧 Upcoming Features
- ** File Upload Support** - Document and image processing capabilities
- **🌐 Multi-language Support** - Internationalization for global users
- **📊 Advanced Usage Analytics** - Enhanced token usage tracking and conversation insights
- **🔌 Plugin System** - Extensible architecture for third-party integrations
- **☁️ Cloud Sync** - Optional cloud backup for conversations and settings
- **🔐 Multi-API Support** - Integration with OpenAI, Anthropic, and other AI providers
- **🎯 Advanced Prompt Templates** - Pre-built and custom prompt management
- **🔒 Enhanced Security** - API key encryption and secure credential storage

## 🚀 Installation

### Prerequisites

Ensure you have the following installed on your system:

- **Node.js** (v18 or higher)
- **npm**, **yarn**, or **pnpm**
- **Ollama** (for local AI model serving)

### Step 1: Install Ollama

```bash
# macOS
brew install ollama

# Windows
# Download from https://ollama.ai/download
```

### Step 2: Setup Ollama Models

```bash
# Start Ollama service
ollama serve

# Pull recommended models
ollama pull llama2
ollama pull codellama
ollama pull mistral

# For web search feature, also pull a small model:
ollama pull qwen2:0.5b

# Verify installation
ollama list
```

### Step 3: Setup Web Search (Optional)

For enhanced web search capabilities, BeautifyOllama includes integrated Python-based web search:

```bash
# Install Python dependencies for web search
pip install ollama requests

# The web search feature uses multiple SearxNG instances
# No additional setup required - it's built-in!
```

For detailed web search setup and configuration, see [Web Search Integration Guide](WEB_SEARCH_INTEGRATION.md).

### Step 4: Install BeautifyOllama

```bash
# Clone the repository
git clone https://github.com/falkon2/BeautifyOllama.git
cd BeautifyOllama

# Install dependencies
npm install
# or
yarn install
# or  
pnpm install

# Start development server
npm run dev
# or
yarn dev
# or
pnpm dev
```

### Step 5: Access the Application

Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Ollama Configuration
NEXT_PUBLIC_OLLAMA_API_URL=http://localhost:11434
NEXT_PUBLIC_DEFAULT_MODEL=llama2
OLLAMA_PORT=11434

# Web Search Configuration
SEARXNG_INSTANCES=https://search.example.com,https://searx.example.org

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_CLOUD_SYNC=false

# Future API Keys
# OPENAI_API_KEY=your_openai_key_here
# ANTHROPIC_API_KEY=your_anthropic_key_here
```

### Advanced Configuration

For custom Ollama installations or advanced setups, modify the configuration in `src/config/ollama.ts`:

```typescript
export const ollamaConfig = {
  apiUrl: process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434',
  defaultModel: process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'llama2',
  timeout: 30000,
  maxRetries: 3
}
```

## 📚 Usage

### Basic Chat Interface

1. **Start a Conversation**: Type your message in the input field
2. **Send Messages**: Press `Enter` or click the send button
3. **New Lines**: Use `Shift + Enter` for multi-line messages
4. **Switch Models**: Use the model selector in the header
5. **Theme Toggle**: Click the theme button to switch between light/dark modes
6. **Enable Features**: Use the toggle buttons below the input for:
   - **Stats Mode**: View detailed response timing and performance
   - **Thinking Mode**: See AI reasoning process (when supported)
   - **Web Search**: Include real-time internet search in responses

### Advanced Features

- **Settings Panel**: Click the gear icon to access:
  - **Connection Settings**: Configure custom Ollama ports
  - **Model Management**: Download new models or delete existing ones
  - **Service Control**: Start/stop Ollama service
  - **Command Logs**: View detailed operation logs
- **Conversation Management**: Navigate between chats using the sidebar
- **Response Features**: View sources for web search results and detailed statistics

### Mobile Usage

- **Access Sidebar**: Tap the menu button on mobile devices
- **Touch Gestures**: Swipe gestures for navigation
- **Responsive Layout**: Optimized for all screen sizes

## 🏗️ Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 15 + React 19 | Modern React framework with App Router |
| **Backend** | Tauri + Rust | Native desktop integration and system calls |
| **Styling** | TailwindCSS 4 | Utility-first CSS framework |
| **Animation** | Framer Motion | Smooth animations and transitions |
| **Language** | TypeScript + Rust | Type safety and high-performance backend |
| **State Management** | React Hooks | Local state management |
| **Theme** | next-themes | Dark/light mode functionality |
| **Search** | Python + SearxNG | Integrated web search capabilities |

### Project Structure

```
beautifyollama/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── services/          # Service layer
│   │       └── ollamaService.ts
│   ├── components/            # React components
│   │   ├── Chat.tsx          # Main chat interface
│   │   ├── Settings.tsx      # Settings modal
│   │   ├── MarkdownRenderer.tsx
│   │   ├── ThinkingRenderer.tsx
│   │   └── ui/               # Reusable UI components
│   ├── config/               # Configuration files
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions
│   └── types/                # TypeScript type definitions
├── src-tauri/                # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs          # Main Tauri entry
│   │   └── lib.rs           # Core backend logic
│   └── Cargo.toml          # Rust dependencies
├── tools/                    # External tools
│   ├── web-search/          # Python web search integration
│   └── README.md           # Tools documentation
├── public/                   # Static assets
├── docs/                     # Documentation
└── tests/                    # Test files
```

## 🤝 Contributing

We welcome contributions from the community! BeautifyOllama is an early-stage project with lots of opportunities to make an impact.

### Ways to Contribute

1. **🐛 Bug Reports** - Help us identify and fix issues
2. **💡 Feature Requests** - Suggest new functionality
3. **📝 Code Contributions** - Submit pull requests
4. **📚 Documentation** - Improve README, guides, and code comments
5. **🎨 Design** - UI/UX improvements and suggestions
6. **🧪 Testing** - Help test new features and edge cases

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/BeautifyOllama.git
   cd BeautifyOllama
   ```
3. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Start development server**:
   ```bash
   npm run dev
   ```

### Contribution Guidelines

- **Code Style**: Follow the existing code style and use TypeScript
- **Commits**: Use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
- **Testing**: Add tests for new features when applicable
- **Documentation**: Update README and inline comments for new features
- **Pull Requests**: Provide clear descriptions and link related issues

### Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
npm run tauri dev    # Start Tauri development mode
npm run tauri build  # Build Tauri desktop application
npm test             # Run tests (when available)
```

## 🛣️ Roadmap

### Phase 1: Core Features (Current)
- [x] Basic chat interface with real-time streaming
- [x] Ollama integration with custom port support
- [x] Theme system (dark/light mode)
- [x] Responsive design for all devices
- [x] Web search integration with SearxNG
- [x] Comprehensive settings and model management
- [x] Conversation history and management
- [x] Advanced thinking and verbose modes
- [x] Cross-platform support (Windows, macOS, Linux)
- [ ] Enhanced error handling and user feedback
- [ ] Performance optimizations for large conversations

### Phase 2: Advanced Features (Next)
- [ ] File upload and document processing
- [ ] Advanced prompt templates and management
- [ ] Export/import conversations (JSON, Markdown)
- [ ] Custom model parameter configuration
- [ ] Plugin architecture foundation
- [ ] Enhanced search within conversation history

### Phase 3: Enterprise Features (Future)
- [ ] Multi-user support
- [ ] Cloud synchronization
- [ ] Plugin architecture
- [ ] Usage analytics
- [ ] Advanced security features

### Phase 4: Ecosystem (Long-term)
- [ ] Mobile applications
- [ ] Desktop applications
- [ ] API for third-party integrations
- [ ] Marketplace for extensions

## 📊 Project Status

| Feature | Status | Priority |
|---------|--------|----------|
| Core Chat | ✅ Complete | High |
| Web Search | ✅ Complete | High |
| Settings Panel | ✅ Complete | High |
| Model Management | ✅ Complete | High |
| Theme System | ✅ Complete | High |
| Mobile Support | ✅ Complete | High |
| Custom Ports | ✅ Complete | Medium |
| File Upload | 📋 Planned | Medium |
| Multi-API Support | 📋 Planned | Medium |
| Cloud Sync | 📋 Planned | Low |

## 🐛 Troubleshooting

### Common Issues

**Ollama Connection Failed**
```bash
# Check if Ollama is running
ollama serve

# Verify models are available
ollama list

# Test API endpoint
curl http://localhost:11434/api/tags

# For custom ports, test the specific port
curl http://localhost:YOUR_PORT/api/tags
```

**Model Loading Issues (Windows)**
```bash
# Force refresh models in the app or try:
ollama list
ollama pull llama2
# Then refresh the model list in BeautifyOllama settings
```

**Web Search Not Working**
```bash
# Ensure Python dependencies are installed
pip install ollama requests

# Check if SearxNG instances are accessible
# The app will automatically try multiple instances
```

**Build Errors**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# For Tauri build issues
cd src-tauri && cargo clean
```

**Hydration Errors**
- Clear browser cache and localStorage
- Restart development server
- Check for theme provider issues

### Getting Help

- 📖 [Documentation](docs/)
- 💬 [GitHub Discussions](https://github.com/falkon2/BeautifyOllama/discussions)
- 🐛 [Issue Tracker](https://github.com/falkon2/BeautifyOllama/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Ollama Team](https://ollama.ai)** - For the excellent local AI runtime
- **[Next.js Team](https://nextjs.org)** - For the amazing React framework  
- **[Vercel](https://vercel.com)** - For seamless deployment platform
- **[TailwindCSS](https://tailwindcss.com)** - For the utility-first CSS framework
- **[Framer Motion](https://www.framer.com/motion/)** - For beautiful animations
- **All Contributors** - For making this project better

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=falkon2/BeautifyOllama&type=Date)](https://star-history.com/#falkon2/BeautifyOllama&Date)

---

<div align="center">
  <p>
    Made with ❤️ by the BeautifyOllama team
  </p>
  <p>
    <a href="https://github.com/falkon2/BeautifyOllama">⭐ Star us on GitHub</a> •
    <a href="https://github.com/falkon2/BeautifyOllama/issues">🐛 Report Bug</a> •
    <a href="https://github.com/falkon2/BeautifyOllama/discussions">💬 Join Discussion</a>
  </p>
</div>
