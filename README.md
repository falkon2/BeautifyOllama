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

> **⚠️ Early Development Notice**  
> This project is in active development. Features and APIs may change. We welcome contributions and feedback from the community.

## 🎥 Demo


Video Demo

[![BeautifyOllama Demo](https://img.youtube.com/vi/cO2X56MxP9A/maxresdefault.jpg)](https://youtu.be/cO2X56MxP9A)

https://github.com/user-attachments/assets/8ed11232-de9c-469b-b332-143ca41daf15

## ✨ Features

### Current Features
- **🎬 Animated Shine Borders** - Eye-catching animated message borders with color cycling
- **📱 Responsive Design** - Mobile-first approach with seamless cross-device compatibility  
- **🌙 Theme System** - Dark/light mode with system preference detection
- **⚡ Real-time Streaming** - Live response streaming from Ollama models
- **🎯 Clean Interface** - Simplified message rendering focused on readability
- **🔄 Model Management** - Easy switching between available Ollama models
- **⌨️ Smart Input** - Keyboard shortcuts (Enter to send, Shift+Enter for newlines)
- **🎨 Modern UI/UX** - Glassmorphism effects and smooth micro-animations

### 🚧 Upcoming Features
- **🔐 API Key Management** - Secure storage and management of API credentials
- **💾 Conversation History** - Persistent chat history with search functionality
- **🔧 Advanced Settings** - Customizable model parameters and system prompts
- **📁 File Upload Support** - Document and image processing capabilities
- **🌐 Multi-language Support** - Internationalization for global users
- **📊 Usage Analytics** - Token usage tracking and conversation insights
- **🔌 Plugin System** - Extensible architecture for third-party integrations
- **☁️ Cloud Sync** - Optional cloud backup for conversations and settings

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

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

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

# Verify installation
ollama list
```

### Step 3: Install BeautifyOllama

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

### Step 4: Access the Application

Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Ollama Configuration
NEXT_PUBLIC_OLLAMA_API_URL=http://localhost:11434
NEXT_PUBLIC_DEFAULT_MODEL=llama2

# Feature Flags (Coming Soon)
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_CLOUD_SYNC=false

# API Keys (Future Feature)
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
4. **Switch Models**: Use the model selector in the sidebar
5. **Theme Toggle**: Click the theme button to switch between light/dark modes

### Mobile Usage

- **Access Sidebar**: Tap the menu button on mobile devices
- **Touch Gestures**: Swipe gestures for navigation
- **Responsive Layout**: Optimized for all screen sizes

## 🏗️ Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 15 + React 19 | Modern React framework with App Router |
| **Styling** | TailwindCSS 4 | Utility-first CSS framework |
| **Animation** | Framer Motion | Smooth animations and transitions |
| **Language** | TypeScript | Type safety and developer experience |
| **State Management** | React Hooks | Local state management |
| **Theme** | next-themes | Dark/light mode functionality |

### Project Structure

```
beautifyollama/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── Chat.tsx          # Main chat interface
│   │   ├── ShineBorder.tsx   # Animated border component
│   │   ├── MarkdownRenderer.tsx
│   │   └── ui/               # Reusable UI components
│   ├── config/               # Configuration files
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions
│   └── types/                # TypeScript type definitions
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
npm test             # Run tests (when available)
```

## 🛣️ Roadmap

### Phase 1: Core Features (Current)
- [x] Basic chat interface
- [x] Ollama integration
- [x] Theme system
- [x] Responsive design
- [ ] Enhanced error handling
- [ ] Performance optimizations

### Phase 2: Advanced Features (Next)
- [ ] API key management system
- [ ] Conversation history persistence
- [ ] File upload and processing
- [ ] Advanced model settings
- [ ] Export/import conversations

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
| Theme System | ✅ Complete | High |
| Mobile Support | ✅ Complete | High |
| API Keys | 🚧 In Progress | High |
| File Upload | 📋 Planned | Medium |
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
```

**Build Errors**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
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
