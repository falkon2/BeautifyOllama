# BeautifyOllama 🎨

A beautiful, modern web interface for chatting with your local Ollama models. Features stunning visual effects, responsive design, and a clean user experience.

![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black)
![React](https://img.shields.io/badge/React-19.0.0-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-06B6D4)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)

## ✨ Features

- **🎬 Animated Shine Borders**: Beautiful animated borders around messages that cycle through different colors
- **📱 Mobile-First Design**: Fully responsive interface that works seamlessly on desktop, tablet, and mobile devices
- **🌙 Dark/Light Theme**: Built-in theme switching with system preference detection
- **⚡ Real-time Chat**: Stream responses from your local Ollama models in real-time
- **🎯 Clean Plain Text**: Simplified message rendering focusing on content without markdown complexity
- **🔄 Model Selection**: Easy switching between different Ollama models
- **⌨️ Keyboard Shortcuts**: Send messages with Enter, add new lines with Shift+Enter
- **🎨 Modern UI**: Beautiful glassmorphism effects and smooth animations throughout

## 🚀 Quick Start

### Prerequisites

Before running this application, you need to have Ollama installed and running on your system.

1. **Install Ollama** (if you haven't already):
   ```bash
   # macOS
   brew install ollama
   
   # Or download from https://ollama.ai
   ```

2. **Start Ollama service**:
   ```bash
   ollama serve
   ```

3. **Pull a model** (e.g., Llama 2):
   ```bash
   ollama pull llama2
   # or any other model you prefer
   ollama pull codellama
   ollama pull mistral
   ```

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/falkon2/OllamaChat.git
   cd OllamaChat
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Configuration

### Ollama Connection

By default, the application connects to Ollama at `http://localhost:11434`. If your Ollama instance is running on a different host or port, you can modify the configuration in the chat component.

### Environment Variables

Create a `.env.local` file in the root directory if you need to customize any settings:

```env
# Optional: Custom Ollama API endpoint
NEXT_PUBLIC_OLLAMA_API_URL=http://localhost:11434
```

## 🏗️ How It Works

### Architecture Overview

The application is built with modern web technologies:

- **Next.js 15**: React framework with App Router for optimal performance
- **React 19**: Latest React features for enhanced user experience
- **TailwindCSS 4**: Utility-first CSS framework for rapid UI development
- **Framer Motion**: Smooth animations and transitions
- **TypeScript**: Type safety and better developer experience

### Key Components

1. **Chat Component** (`src/components/Chat.tsx`):
   - Manages conversation state and message history
   - Handles streaming responses from Ollama API
   - Implements responsive layout with mobile sidebar
   - Features animated shine borders around messages

2. **MarkdownRenderer** (`src/components/MarkdownRenderer.tsx`):
   - Simplified plain text renderer
   - Preserves whitespace and line breaks
   - No markdown processing for clean, readable output

3. **ShineBorder** (`src/components/ShineBorder.tsx`):
   - Animated border component with customizable colors
   - 10-second animation cycles for visual appeal
   - Different colors for user and assistant messages

4. **Theme Provider** (`src/components/theme-provider.tsx`):
   - Dark/light theme management
   - System preference detection
   - Smooth theme transitions

### Message Flow

1. User types a message and presses Enter
2. Message is sent to the local Ollama API endpoint
3. Response is streamed back in real-time
4. Messages are displayed with animated shine borders
5. Conversation history is maintained in component state

## 📱 Mobile Experience

The interface is optimized for mobile devices with:

- **Responsive Layout**: Adapts to different screen sizes
- **Mobile Sidebar**: Collapsible navigation with backdrop overlay
- **Touch-Friendly**: Appropriately sized touch targets
- **Optimized Typography**: Readable text sizes across devices
- **Smooth Animations**: Performance-optimized animations for mobile

## 🎨 Customization

### Themes

The application supports custom themes through TailwindCSS. You can modify colors and styles in:

- `src/app/globals.css`: Global styles and animations
- `tailwind.config.js`: Theme configuration
- Components: Individual component styling

### Shine Border Colors

Customize the animated border colors in `src/components/Chat.tsx`:

```typescript
// User messages (white shine)
<ShineBorder color="#ffffff" borderRadius={12} duration={10}>

// Assistant messages (blue shine)  
<ShineBorder color="#3b82f6" borderRadius={12} duration={10}>
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to a Git repository
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy with one click

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Self-Hosted

```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`.

## 🔧 Development

### Project Structure

```
beautifyollama/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   │   ├── Chat.tsx        # Main chat interface
│   │   ├── MarkdownRenderer.tsx
│   │   ├── ShineBorder.tsx
│   │   └── ui/             # UI components
│   └── lib/                # Utilities
├── public/                 # Static assets
├── tailwind.config.js      # TailwindCSS configuration
└── package.json           # Dependencies and scripts
```

### Available Scripts

- `npm run dev`: Start development server with Turbopack
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

### Key Dependencies

- **UI Framework**: Next.js 15, React 19
- **Styling**: TailwindCSS 4, Framer Motion
- **Icons**: Lucide React, Tabler Icons
- **Theme**: next-themes
- **Utilities**: clsx, tailwind-merge

## 🐛 Troubleshooting

### Common Issues

1. **Ollama not responding**:
   - Ensure Ollama is running: `ollama serve`
   - Check if models are installed: `ollama list`
   - Verify connection at `http://localhost:11434`

2. **Hydration errors**:
   - Clear browser cache and restart development server
   - Ensure theme provider is properly configured

3. **Mobile layout issues**:
   - Check viewport meta tag in layout
   - Verify Tailwind responsive classes

4. **Build errors**:
   - Clear `.next` folder: `rm -rf .next`
   - Reinstall dependencies: `npm ci`

### Performance Tips

- Use production build for better performance: `npm run build && npm start`
- Optimize images in the `public` folder
- Consider implementing message pagination for long conversations

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai) for the excellent local AI model runtime
- [Next.js](https://nextjs.org) team for the amazing React framework
- [TailwindCSS](https://tailwindcss.com) for the utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) for smooth animations

---

**Enjoy chatting with your local AI models in style! 🎉**
