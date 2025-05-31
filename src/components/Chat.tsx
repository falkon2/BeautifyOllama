"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { askOllama, listOllamaModels } from "@/app/services/ollamaService";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { TextGenerateEffect } from "@/components/ui/enhanced-text-generate-effect";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Bot, User, Plus, MoreHorizontal, Menu, Sun, Moon, Trash2, X } from "lucide-react";
import { ShineBorder } from "@/components/magicui/shine-border";
import { OllamaChatIcon } from "@/components/ui/ollama-chat-icon";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  hasAnimated?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

export default function Chat() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start with false to match SSR
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const placeholders = [
    "What can you help me with today?",
    "Ask me anything...",
    "How can I assist you?",
    "Tell me what you're thinking about...",
    "What would you like to know?",
  ];

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  // Load conversations from localStorage on mount
  useEffect(() => {
    setMounted(true);
    setSidebarOpen(true); // Set to true after mounting
    const savedConversations = localStorage.getItem('ollama-conversations');
    const savedCurrentId = localStorage.getItem('ollama-current-conversation');
    
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        // Convert date strings back to Date objects
        const conversationsWithDates = parsed.map((conv: any) => ({
          ...conv,
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setConversations(conversationsWithDates);
        
        if (savedCurrentId && conversationsWithDates.find((c: any) => c.id === savedCurrentId)) {
          setCurrentConversationId(savedCurrentId);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    }

    // Handle responsive sidebar behavior
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize(); // Set initial state based on screen size
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (mounted && conversations.length > 0) {
      localStorage.setItem('ollama-conversations', JSON.stringify(conversations));
    }
  }, [conversations, mounted]);

  // Save current conversation ID to localStorage
  useEffect(() => {
    if (mounted && currentConversationId) {
      localStorage.setItem('ollama-current-conversation', currentConversationId);
    }
  }, [currentConversationId, mounted]);

  useEffect(() => {
    listOllamaModels().then((availableModels) => {
      setModels(availableModels);
      if (availableModels.length > 0) {
        setModel(availableModels[0]);
      }
    });
  }, []);

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: "New Conversation",
      messages: [],
      updatedAt: new Date(),
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
  };

  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (currentConversationId === conversationId) {
      const remaining = conversations.filter(c => c.id !== conversationId);
      setCurrentConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const clearAllConversations = () => {
    setConversations([]);
    setCurrentConversationId(null);
    localStorage.removeItem('ollama-conversations');
    localStorage.removeItem('ollama-current-conversation');
  };

  const updateConversationTitle = (conversationId: string, firstMessage: string) => {
    const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage;
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, title } 
          : conv
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const inputElement = e.currentTarget.querySelector('input[type="text"]') as HTMLInputElement;
    const currentInput = (inputElement?.value || input).trim();
    if (!currentInput || !model || loading) return;

    let conversationId = currentConversationId;
    
    // Create new conversation if none exists
    if (!conversationId) {
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: "New Conversation",
        messages: [],
        updatedAt: new Date(),
      };
      setConversations(prev => [newConversation, ...prev]);
      conversationId = newConversation.id;
      setCurrentConversationId(conversationId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentInput,
      role: "user",
      timestamp: new Date(),
    };

    // Update conversation with user message
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { 
              ...conv, 
              messages: [...conv.messages, userMessage],
              updatedAt: new Date()
            } 
          : conv
      )
    );

    // Update title if this is the first message
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation || conversation.messages.length === 0) {
      updateConversationTitle(conversationId, currentInput);
    }

    setInput("");
    // Clear the input element directly since PlaceholdersAndVanishInput manages its own state
    if (inputElement) {
      inputElement.value = "";
    }
    setLoading(true);

    try {
      const response = await askOllama(currentInput, model);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: "assistant",
        timestamp: new Date(),
        hasAnimated: false,
      };
      
      // Update conversation with assistant message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                messages: [...conv.messages, assistantMessage],
                updatedAt: new Date()
              } 
            : conv
        )
      );
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Prevent hydration mismatches by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'w-64 md:w-64' : 'w-0'
      } transition-all duration-300 overflow-hidden border-r border-border bg-card/80 backdrop-blur-sm flex flex-col
      ${sidebarOpen ? 'fixed md:relative z-50 md:z-auto' : ''} 
      ${sidebarOpen ? 'left-0 top-0 h-full md:h-auto' : ''}`}>
        <div className="p-4 border-b border-border">
          <Button onClick={createNewConversation} className="w-full justify-start touch-manipulation" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conversation) => (
            <div key={conversation.id} className="relative">
              <div
                className={`w-full text-left p-3 rounded-lg mb-2 hover:bg-accent active:bg-accent/80 transition-colors touch-manipulation cursor-pointer ${
                  conversation.id === currentConversationId ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      setCurrentConversationId(conversation.id);
                      // Close sidebar on mobile after selecting conversation
                      if (window.innerWidth < 768) {
                        setSidebarOpen(false);
                      }
                    }}
                  >
                    <span className="text-sm font-medium truncate pr-2">{conversation.title}</span>
                    <div className="text-xs text-muted-foreground">
                      {conversation.messages.length} messages
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === conversation.id ? null : conversation.id);
                    }}
                    className="p-1 hover:bg-accent rounded opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Dropdown menu */}
              {openMenuId === conversation.id && (
                <>
                  {/* Backdrop to close menu */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setOpenMenuId(null)}
                  />
                  
                  {/* Menu content */}
                  <div className="absolute right-2 top-12 z-50 bg-card border border-border rounded-lg shadow-lg min-w-[160px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conversation.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-destructive/10 hover:text-destructive rounded-t-lg transition-colors flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                    <button
                      onClick={() => setOpenMenuId(null)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-b-lg transition-colors flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {/* Clear all conversations button */}
          {conversations.length > 0 && (
            <div className="pt-2 mt-2 border-t border-border">
              <Button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete all conversations? This action cannot be undone.')) {
                    clearAllConversations();
                  }
                }}
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">{/* min-w-0 prevents flex item from overflowing */}
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center justify-between p-3 md:p-4">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex-shrink-0"
              >
                <Menu className="w-4 h-4" />
              </Button>
              <OllamaChatIcon className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" size={24} />
              <h1 className="text-base md:text-lg font-semibold truncate min-w-0">
                {currentConversation?.title || "Ollama Chat"}
              </h1>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => mounted && setTheme(theme === "dark" ? "light" : "dark")}
              >
                {mounted ? (
                  theme === "dark" ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-32 md:w-48">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m} value={m}>
                      <span className="truncate">{m}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4 md:space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-4">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center">
                <OllamaChatIcon className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg md:text-xl font-semibold">Welcome to Ollama Chat</h2>
                <p className="text-sm md:text-base text-muted-foreground max-w-md">
                  Start a conversation with your local AI model. Ask questions, get help, or just chat!
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-4 md:space-y-6 px-1 md:px-0">
              {messages.map((message) => (
                <div key={message.id} className={`flex space-x-2 md:space-x-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                      <OllamaChatIcon className="w-3 h-3 md:w-4 md:h-4" size={16} />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] md:max-w-[75%] ${message.role === "user" ? "order-first" : ""}`}>
                    <div className="text-xs font-medium mb-1 md:mb-2 px-2">
                      {message.role === "user" ? "You" : "Assistant"}
                    </div>
                    
                    <div className="relative">
                      <div
                        className={`relative p-3 md:p-4 rounded-xl md:rounded-2xl border text-sm md:text-base ${
                          message.role === "user" 
                            ? "bg-primary text-primary-foreground border-primary/20" 
                            : "bg-muted/50 text-foreground border-border"
                        }`}
                      >
                        <ShineBorder
                          className="rounded-xl md:rounded-2xl"
                          shineColor={message.role === "user" ? "#ffffff" : "#3b82f6"}
                          duration={10}
                          borderWidth={1}
                        />
                        <div className="prose prose-sm max-w-none relative z-10">
                          {message.role === "assistant" ? (
                            <TextGenerateEffect 
                              words={message.content} 
                              hasAnimated={message.hasAnimated}
                              onAnimationComplete={() => {
                                setConversations(prev => 
                                  prev.map(conv => 
                                    conv.id === currentConversationId 
                                      ? { 
                                          ...conv, 
                                          messages: conv.messages.map(msg => 
                                            msg.id === message.id 
                                              ? { ...msg, hasAnimated: true }
                                              : msg
                                          )
                                        } 
                                      : conv
                                  )
                                );
                              }}
                            />
                          ) : (
                            <MarkdownRenderer 
                              content={message.content}
                              className={`leading-relaxed ${
                                message.role === "user" 
                                  ? "[&_code]:bg-primary-foreground/20 [&_code]:text-primary-foreground [&_strong]:text-primary-foreground [&_em]:text-primary-foreground [&_p]:text-primary-foreground" 
                                  : "[&_code]:bg-muted/80 [&_code]:text-foreground"
                              }`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {message.role === "user" && (
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-3 h-3 md:w-4 md:h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex space-x-2 md:space-x-4 justify-start">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                    <OllamaChatIcon className="w-3 h-3 md:w-4 md:h-4" size={16} />
                  </div>
                  <div className="max-w-[85%] md:max-w-[75%]">
                    <div className="text-xs font-medium mb-1 md:mb-2 px-2">Assistant</div>
                    <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-muted/50 text-foreground border border-border">
                      <div className="text-sm text-muted-foreground flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <span className="text-xs md:text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card/80 backdrop-blur-sm p-3 md:p-4">
          <div className="max-w-4xl mx-auto">
            <PlaceholdersAndVanishInput
              placeholders={placeholders}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
