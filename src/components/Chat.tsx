"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { askOllama, listOllamaModels, forceRefreshModels, checkOllamaStatus, askOllamaVerbose, askOllamaStreaming, searchWeb, clearPortCache, type OllamaStatus } from "@/app/services/ollamaService";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { TextGenerateEffect } from "@/components/ui/enhanced-text-generate-effect";
import { StreamingTextEffect } from "@/components/ui/streaming-text-effect";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ThinkingRenderer } from "@/components/ThinkingRenderer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Bot, User, Plus, MoreHorizontal, Menu, Sun, Moon, Trash2, X, Settings as SettingsIcon, Terminal, Eye, EyeOff, RefreshCw, BarChart3, Search } from "lucide-react";
import { ShineBorder } from "@/components/magicui/shine-border";
import { OllamaChatIcon } from "@/components/ui/ollama-chat-icon";
import { OllamaSetupOverlay } from "@/components/OllamaSetupOverlay";
import { Settings } from "@/components/Settings";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  hasAnimated?: boolean;
  verboseInfo?: string;
  showVerbose?: boolean;
  webSearchSources?: string[];
  showSources?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

interface CommandLog {
  id: string;
  command: string;
  timestamp: Date;
  status: 'running' | 'success' | 'error';
  output?: string;
  error?: string;
}

interface ClearConfirmationState {
  isOpen: boolean;
  isClearing: boolean;
}

export default function Chat() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start with false to match SSR
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({ isInstalled: false, isRunning: false });
  const [showOllamaSetup, setShowOllamaSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState<ClearConfirmationState>({
    isOpen: false,
    isClearing: false
  });
  const [verboseMode, setVerboseMode] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [webSearchMode, setWebSearchMode] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Set initial state based on screen size after mount to prevent hydration mismatch
    setTimeout(() => {
      handleResize();
    }, 0);
    
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

  // Handle keyboard events for clear confirmation modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (clearConfirmation.isOpen && event.key === 'Escape' && !clearConfirmation.isClearing) {
        handleClearCancel();
      }
    };

    if (clearConfirmation.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [clearConfirmation.isOpen, clearConfirmation.isClearing]);

  const refreshModels = useCallback(async (forceRefresh: boolean = false) => {
    if (!ollamaStatus.isRunning) return;
    
    setRefreshingModels(true);
    try {
      // Use force refresh on Windows or when explicitly requested
      const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');
      const availableModels = forceRefresh || isWindows 
        ? await forceRefreshModels() 
        : await listOllamaModels();
      
      setModels(availableModels);
      
      // Set default model if none selected or current model not available
      if (availableModels.length > 0) {
        if (!model || !availableModels.includes(model)) {
          setModel(availableModels[0]);
        }
      } else if (isWindows) {
        // On Windows, if we still don't have models, try multiple times with increasing delays
        const retryAttempts = [1000, 3000, 5000]; // 1s, 3s, 5s delays
        
        for (let i = 0; i < retryAttempts.length; i++) {
          setTimeout(async () => {
            try {
              const retryModels = await forceRefreshModels();
              if (retryModels.length > 0) {
                setModels(retryModels);
                if (!model || !retryModels.includes(model)) {
                  setModel(retryModels[0]);
                }
                // Success, exit early
                return;
              }
            } catch (error) {
              console.error(`Windows model retry ${i + 1} failed:`, error);
            }
          }, retryAttempts[i]);
        }
      }
    } catch (error) {
      console.error('Error loading models:', error);
      // If API fails, still keep any existing models
    } finally {
      setRefreshingModels(false);
    }
  }, [ollamaStatus.isRunning, model]);

  // Event handler wrapper for refresh button clicks
  const handleRefreshModels = useCallback(() => {
    refreshModels(false);
  }, [refreshModels]);

  // Event handler wrapper for force refresh
  const handleForceRefreshModels = useCallback(() => {
    refreshModels(true);
  }, [refreshModels]);

  useEffect(() => {
    // Check Ollama status first, then load models if available
    const checkStatus = async () => {
      try {
        const status = await checkOllamaStatus();
        setOllamaStatus(status);
        if (status.isRunning) {
          // Use the new refreshModels function
          await refreshModels();
        } else {
          // Show setup overlay if Ollama is not running
          setShowOllamaSetup(true);
        }
      } catch (error) {
        console.error('Error checking Ollama status:', error);
        setOllamaStatus({ isInstalled: false, isRunning: false });
        setShowOllamaSetup(true);
      }
    };

    if (mounted) {
      checkStatus();
    }
  }, [mounted, refreshModels]); // Add mounted and refreshModels to dependencies

  const handleOllamaStatusChange = useCallback(async (status: OllamaStatus) => {
    setOllamaStatus(status);
    if (status.isRunning) {
      // Always try to reload models when Ollama is running
      await refreshModels();
    } else {
      setModels([]);
      setModel("");
    }
  }, [refreshModels]);

  // Windows-specific: Periodic background model refresh
  useEffect(() => {
    const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');
    
    if (!isWindows || !ollamaStatus.isRunning) return;
    
    // Set up periodic refresh for Windows every 30 seconds
    const interval = setInterval(async () => {
      try {
        // Only refresh if we don't have models or there's been a long time since last refresh
        if (models.length === 0) {
          console.log('Windows: Background model refresh - no models detected');
          await refreshModels(true);
        }
      } catch (error) {
        console.error('Windows background model refresh failed:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [ollamaStatus.isRunning, models.length, refreshModels]);

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

  const clearAllConversations = async () => {
    // Safety check
    if (conversations.length === 0) {
      setClearConfirmation({ isOpen: false, isClearing: false });
      return;
    }

    setClearConfirmation(prev => ({ ...prev, isClearing: true }));
    
    try {
      // Clear state
      setConversations([]);
      setCurrentConversationId(null);
      
      // Also close any open menu states
      setOpenMenuId(null);
      
      // Clear localStorage with error handling
      try {
        localStorage.removeItem('ollama-conversations');
        localStorage.removeItem('ollama-current-conversation');
      } catch (storageError) {
        console.warn('Failed to clear localStorage:', storageError);
        // Continue anyway since the state is cleared
      }
      
      // Close sidebar on mobile after clearing
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
      
      // Close confirmation modal
      setClearConfirmation({ isOpen: false, isClearing: false });
      
      // Optional: Add success feedback (could be toast notification)
      console.log('All conversations cleared successfully');
      
    } catch (error) {
      console.error('Error clearing conversations:', error);
      setClearConfirmation(prev => ({ ...prev, isClearing: false }));
      // Could show error toast here
    }
  };

  const handleClearAllRequest = () => {
    // Additional safety check
    if (conversations.length === 0) return;
    setClearConfirmation({ isOpen: true, isClearing: false });
  };

  const handleClearCancel = () => {
    setClearConfirmation({ isOpen: false, isClearing: false });
  };

  // Command logging functions
  const addCommandLog = (command: string): string => {
    const logId = Date.now().toString();
    const newLog: CommandLog = {
      id: logId,
      command,
      timestamp: new Date(),
      status: 'running'
    };
    setCommandLogs(prev => [...prev, newLog]);
    return logId;
  };

  const updateCommandLog = (logId: string, status: 'success' | 'error', output?: string, error?: string) => {
    setCommandLogs(prev => prev.map(log => 
      log.id === logId 
        ? { ...log, status, output, error }
        : log
    ));
  };

  const clearCommandLogs = () => {
    setCommandLogs([]);
  };

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commandLogs, showLogs]);

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
    if (!currentInput || !model || loading || !ollamaStatus.isRunning) return;

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

    // Create the assistant message first with empty content for streaming
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: "",
      role: "assistant",
      timestamp: new Date(),
      hasAnimated: false,
      verboseInfo: undefined,
      showVerbose: false,
    };

    // Add the empty assistant message to the conversation
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

    // Set this message as streaming
    setStreamingMessageId(assistantMessage.id);

    try {
      let fullResponse = "";
      let verboseInfo: string | undefined;
      let webSearchSources: string[] = [];
      
      // If web search mode is enabled, perform web search first
      let finalInput = currentInput;
      if (webSearchMode) {
        try {
          const searchLogId = addCommandLog(`Web search: "${currentInput}"`);
          const searchResults = await searchWeb(currentInput, thinkingMode);
          
          console.log('Web search results:', searchResults); // Debug logging
          
          // Extract sources from search results with multiple parsing methods
          let sourceMatches: string[] = [];
          
          // Method 1: Look for "Sources:" section
          const sourcesMatch = searchResults.match(/Sources:\s*((?:\d+\.\s*https?:\/\/[^\s\n]+\s*\n?)*)/i);
          if (sourcesMatch && sourcesMatch[1]) {
            const sourcesSection = sourcesMatch[1];
            console.log('Found sources section:', sourcesSection); // Debug logging
            const numberedSources = sourcesSection.match(/\d+\.\s*(https?:\/\/[^\s\n]+)/g);
            if (numberedSources) {
              sourceMatches = numberedSources.map(match => {
                const urlMatch = match.match(/https?:\/\/[^\s\n]+/);
                return urlMatch ? urlMatch[0] : '';
              }).filter(Boolean);
            }
          }
          
          // Method 2: Fallback to general URL extraction
          if (sourceMatches.length === 0) {
            console.log('No sources found in structured format, trying general URL extraction'); // Debug
            sourceMatches = searchResults.match(/https?:\/\/[^\s\n]+/g) || [];
          }
          
          console.log('Extracted sources:', sourceMatches); // Debug logging
          webSearchSources = [...new Set(sourceMatches)]; // Remove duplicates
          updateCommandLog(searchLogId, 'success', `Found ${webSearchSources.length} sources`);
          
          // Add search context to the prompt
          const enhancedPrompt = `${currentInput}\n\nWeb search context:\n${searchResults}`;
          finalInput = enhancedPrompt;
        } catch (error: any) {
          const errorMsg = error.message || 'Web search failed';
          addCommandLog(`Web search failed: ${errorMsg}`);
          // Continue with original prompt even if search fails
        }
      }
      
      if (verboseMode) {
        // For verbose mode, use the non-streaming version and only show stats
        const response = await askOllamaVerbose(finalInput, model, thinkingMode);
        // Parse verbose output - timing info is usually after "=== VERBOSE STATS ==="
        const statsMarker = "=== VERBOSE STATS ===";
        const statsIndex = response.indexOf(statsMarker);
        
        if (statsIndex !== -1) {
          const contentPart = response.substring(0, statsIndex).trim();
          const statsPart = response.substring(statsIndex + statsMarker.length).trim();
          
          // Clean up the stats by removing ANSI escape codes and control characters
          let cleanStats = statsPart
            .replace(/\x1b\[[?]?[0-9;]*[a-zA-Z]/g, '') // Remove ANSI escape codes
            .replace(/\[[?]?[0-9;]*[a-zA-Z]/g, '') // Remove additional escape sequences
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
          
          // Format the stats with proper line breaks
          cleanStats = cleanStats
            .replace(/total duration:/g, '\ntotal duration:')
            .replace(/load duration:/g, '\nload duration:')
            .replace(/prompt eval count:/g, '\nprompt eval count:')
            .replace(/prompt eval duration:/g, '\nprompt eval duration:')
            .replace(/prompt eval rate:/g, '\nprompt eval rate:')
            .replace(/eval count:/g, '\neval count:')
            .replace(/eval duration:/g, '\neval duration:')
            .replace(/eval rate:/g, '\neval rate:')
            .replace(/^\n/, '') // Remove leading newline
            .trim();
          
          verboseInfo = cleanStats;
          fullResponse = contentPart; // Show the actual response content
        } else {
          // If no stats marker found, try to extract stats from the raw response
          const lines = response.split('\n');
          const statsLines = lines.filter(line => 
            line.includes('total duration:') || 
            line.includes('load duration:') || 
            line.includes('prompt eval count:') || 
            line.includes('prompt eval duration:') || 
            line.includes('prompt eval rate:') || 
            line.includes('eval count:') || 
            line.includes('eval duration:') || 
            line.includes('eval rate:')
          );
          
          if (statsLines.length > 0) {
            // Clean the stats lines
            const cleanedStatsLines = statsLines.map(line => 
              line
                .replace(/\x1b\[[?]?[0-9;]*[a-zA-Z]/g, '') // Remove ANSI escape codes
                .replace(/\[[?]?[0-9;]*[a-zA-Z]/g, '') // Remove additional escape sequences
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .trim()
            ).filter(line => line.length > 0);
            
            verboseInfo = cleanedStatsLines.join('\n');
          } else {
            // Try to extract stats from a single line format
            let rawStats = response
              .replace(/\x1b\[[?]?[0-9;]*[a-zA-Z]/g, '') // Remove ANSI escape codes
              .replace(/\[[?]?[0-9;]*[a-zA-Z]/g, '') // Remove additional escape sequences
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
            
            // Format single line stats with proper line breaks
            if (rawStats.includes('total duration:')) {
              let formattedStats = rawStats
                .replace(/total duration:/g, '\ntotal duration:')
                .replace(/load duration:/g, '\nload duration:')
                .replace(/prompt eval count:/g, '\nprompt eval count:')
                .replace(/prompt eval duration:/g, '\nprompt eval duration:')
                .replace(/prompt eval rate:/g, '\nprompt eval rate:')
                .replace(/eval count:/g, '\neval count:')
                .replace(/eval duration:/g, '\neval duration:')
                .replace(/eval rate:/g, '\neval rate:')
                .replace(/^\n/, '') // Remove leading newline
                .trim();
              
              verboseInfo = formattedStats;
            }
          }
          
          // Get the actual response content (everything that's not stats)
          const contentLines = lines.filter(line => 
            !line.includes('total duration:') && 
            !line.includes('load duration:') && 
            !line.includes('prompt eval') && 
            !line.includes('eval count:') && 
            !line.includes('eval duration:') && 
            !line.includes('eval rate:') &&
            line.trim().length > 0
          );
          
          fullResponse = contentLines.join('\n').trim() || response;
        }

        // Update the message with the complete response
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId 
              ? { 
                  ...conv, 
                  messages: conv.messages.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { 
                          ...msg, 
                          content: fullResponse, 
                          verboseInfo, 
                          hasAnimated: true, 
                          showVerbose: !!verboseInfo,
                          webSearchSources: webSearchSources.length > 0 ? webSearchSources : undefined,
                          showSources: webSearchSources.length > 0
                        }
                      : msg
                  ),
                  updatedAt: new Date()
                } 
              : conv
          )
        );
      } else {
        // Use streaming for regular mode
        await askOllamaStreaming(
          finalInput, 
          model,
          thinkingMode,
          (chunk: string) => {
            // Update the message content in real-time
            fullResponse += chunk;
            setConversations(prev => 
              prev.map(conv => 
                conv.id === conversationId 
                  ? { 
                      ...conv, 
                      messages: conv.messages.map(msg => 
                        msg.id === assistantMessage.id 
                          ? { ...msg, content: fullResponse }
                          : msg
                      ),
                      updatedAt: new Date()
                    } 
                  : conv
              )
            );
          },
          () => {
            // Mark as complete when streaming finishes
            setStreamingMessageId(null);
            setConversations(prev => 
              prev.map(conv => 
                conv.id === conversationId 
                  ? { 
                      ...conv, 
                      messages: conv.messages.map(msg => 
                        msg.id === assistantMessage.id 
                          ? { 
                              ...msg, 
                              hasAnimated: true,
                              webSearchSources: webSearchSources.length > 0 ? webSearchSources : undefined,
                              showSources: webSearchSources.length > 0
                            }
                          : msg
                      ),
                      updatedAt: new Date()
                    } 
                  : conv
              )
            );
          }
        );
      }
    } catch (error) {
      console.error("Error:", error);
      // Update the message with error
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                messages: conv.messages.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: `Error: ${error}`, hasAnimated: true }
                    : msg
                ),
                updatedAt: new Date()
              } 
            : conv
        )
      );
    } finally {
      setLoading(false);
      setStreamingMessageId(null);
    }
  };

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSetupComplete = useCallback(async (selectedModels: string[]) => {
    // Refresh Ollama status and models
    try {
      const status = await checkOllamaStatus();
      setOllamaStatus(status);
      
      if (status.isRunning) {
        await refreshModels();
      }
    } catch (error) {
      console.error('Error updating status after setup:', error);
    }
  }, [refreshModels]);

  const handlePortChanged = useCallback(async () => {
    // When the port changes, refresh Ollama status and models to use the new port
    try {
      // Clear cached port to force re-fetch from backend
      clearPortCache();
      
      const status = await checkOllamaStatus();
      setOllamaStatus(status);
      
      if (status.isRunning) {
        await refreshModels();
      }
    } catch (error) {
      console.error('Error updating status after port change:', error);
    }
  }, [refreshModels]);

  const handleStatsRequest = async () => {
    // Toggle verbose mode for future messages
    setVerboseMode(!verboseMode);
    const logId = addCommandLog(`Verbose mode ${!verboseMode ? 'enabled' : 'disabled'}`);
    updateCommandLog(logId, 'success', `Verbose mode is now ${!verboseMode ? 'enabled' : 'disabled'}. Future messages will ${!verboseMode ? 'include' : 'exclude'} timing statistics.`);
  };

  const handleThinkingToggle = async () => {
    // Toggle thinking mode for future messages
    setThinkingMode(!thinkingMode);
    const logId = addCommandLog(`Thinking mode ${!thinkingMode ? 'enabled' : 'disabled'}`);
    updateCommandLog(logId, 'success', `Thinking mode is now ${!thinkingMode ? 'enabled' : 'disabled'}. Future messages will ${!thinkingMode ? 'show' : 'hide'} reasoning process.`);
  };

  const handleWebSearchToggle = async () => {
    // Toggle web search mode for future messages
    setWebSearchMode(!webSearchMode);
    const logId = addCommandLog(`Web search mode ${!webSearchMode ? 'enabled' : 'disabled'}`);
    updateCommandLog(logId, 'success', `Web search mode is now ${!webSearchMode ? 'enabled' : 'disabled'}. Future messages will ${!webSearchMode ? 'include' : 'exclude'} web search results.`);
  };

  // Prevent hydration mismatches by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex h-screen main-container">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen main-container">
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
                onClick={handleClearAllRequest}
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                type="button"
                disabled={clearConfirmation.isClearing}
                aria-label={`Clear all ${conversations.length} conversations`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {clearConfirmation.isClearing ? 'Clearing...' : `Clear All (${conversations.length})`}
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
                onClick={() => setShowLogs(!showLogs)}
                title={showLogs ? "Hide Command Logs" : "Show Command Logs"}
                className={commandLogs.length > 0 ? "relative" : ""}
              >
                <Terminal className="w-4 h-4" />
                {commandLogs.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {commandLogs.length}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                title="Settings"
              >
                <SettingsIcon className="w-4 h-4" />
              </Button>
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
              <div className="flex items-center space-x-2">
                <Select value={model} onValueChange={setModel} disabled={!ollamaStatus.isRunning || models.length === 0}>
                  <SelectTrigger className="w-32 md:w-48">
                    <SelectValue placeholder={models.length === 0 ? "No models" : "Select model"} />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m} value={m}>
                        <span className="truncate">{m}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshModels}
                  disabled={!ollamaStatus.isRunning || refreshingModels}
                  title="Refresh model list"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshingModels ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4 md:space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-4">
              {!ollamaStatus.isRunning ? (
                <div className="space-y-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center">
                    <OllamaChatIcon className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" size={32} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg md:text-xl font-semibold">Setting up Ollama</h2>
                    <p className="text-sm md:text-base text-muted-foreground max-w-md">
                      Please complete the Ollama setup to start chatting with AI models.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowOllamaSetup(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Open Setup
                  </Button>
                </div>
              ) : models.length === 0 ? (
                <div className="space-y-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center">
                    <OllamaChatIcon className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" size={32} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg md:text-xl font-semibold">No Models Available</h2>
                    <p className="text-sm md:text-base text-muted-foreground max-w-md">
                      Ollama is running, but no AI models are currently loaded. Download and install a model to start chatting.
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setShowOllamaSetup(true)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      Manage Models
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRefreshModels}
                      disabled={refreshingModels}
                    >
                      {refreshingModels ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Refresh
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center">
                    <OllamaChatIcon className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" size={32} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg md:text-xl font-semibold">Welcome to Ollama Chat</h2>
                    <p className="text-sm md:text-base text-muted-foreground max-w-md">
                      Start a conversation with your local AI model. Ask questions, get help, or just chat!
                    </p>
                  </div>
                </>
              )}
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
                            streamingMessageId === message.id ? (
                              <StreamingTextEffect 
                                text={message.content} 
                                isComplete={false}
                              />
                            ) : message.hasAnimated ? (
                              <ThinkingRenderer 
                                content={message.content}
                                className="leading-relaxed [&_code]:bg-muted/80 [&_code]:text-foreground"
                              />
                            ) : (
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
                            )
                          ) : (
                            <ThinkingRenderer 
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
                      
                      {/* Verbose Stats - only for assistant messages */}
                      {message.role === "assistant" && message.verboseInfo && (
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => {
                              setConversations(prev => 
                                prev.map(conv => 
                                  conv.id === currentConversationId 
                                    ? { 
                                        ...conv, 
                                        messages: conv.messages.map(msg => 
                                          msg.id === message.id 
                                            ? { ...msg, showVerbose: !msg.showVerbose }
                                            : msg
                                        )
                                      } 
                                    : conv
                                )
                              );
                            }}
                          >
                            <BarChart3 className="w-3 h-3 mr-1" />
                            {message.showVerbose ? "Hide" : "Show"} Stats
                          </Button>
                          
                          {message.showVerbose && (
                            <div className="mt-2 p-2 bg-muted/30 rounded-lg border border-border/50">
                              <div className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                                {message.verboseInfo}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Web Search Sources - only for assistant messages */}
                      {message.role === "assistant" && message.webSearchSources && message.webSearchSources.length > 0 && (
                        <div className="mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6 px-2"
                            onClick={() => {
                              setConversations(prev => 
                                prev.map(conv => 
                                  conv.id === currentConversationId 
                                    ? { 
                                        ...conv, 
                                        messages: conv.messages.map(msg => 
                                          msg.id === message.id 
                                            ? { ...msg, showSources: !msg.showSources }
                                            : msg
                                        )
                                      } 
                                    : conv
                                )
                              );
                            }}
                          >
                            <Search className="w-3 h-3 mr-1" />
                            {message.showSources ? "Hide" : "Show"} Sources ({message.webSearchSources.length})
                          </Button>
                          
                          {message.showSources && (
                            <div className="mt-2 p-2 bg-muted/30 rounded-lg border border-border/50">
                              <div className="text-xs text-muted-foreground mb-2 font-medium">
                                Web Search Sources:
                              </div>
                              <div className="space-y-1">
                                {message.webSearchSources.map((source, index) => (
                                  <div key={index} className="text-xs">
                                    <a 
                                      href={source} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
                                    >
                                      {index + 1}. {source}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card/80 backdrop-blur-sm p-3 md:p-4">
          <div className="max-w-4xl mx-auto">
            <PlaceholdersAndVanishInput
              placeholders={!ollamaStatus.isRunning 
                ? ["Complete Ollama setup to start chatting..."]
                : models.length === 0 
                ? ["Download a model to start chatting..."]
                : placeholders
              }
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              disabled={!ollamaStatus.isRunning || models.length === 0}
            />
            
            {/* Control buttons below input */}
            <div className="flex items-center justify-center space-x-2 mt-3">
              <Button
                variant={verboseMode ? "default" : "ghost"}
                size="sm"
                onClick={handleStatsRequest}
                disabled={!ollamaStatus.isRunning}
                title={verboseMode ? "Disable Verbose Mode (Stats)" : "Enable Verbose Mode (Stats)"}
                className="text-xs"
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                Stats
              </Button>
              <Button
                variant={thinkingMode ? "default" : "ghost"}
                size="sm"
                onClick={handleThinkingToggle}
                disabled={!ollamaStatus.isRunning}
                title={thinkingMode ? "Disable Thinking Mode" : "Enable Thinking Mode"}
                className="text-xs"
              >
                <Eye className={`w-3 h-3 mr-1 ${thinkingMode ? '' : 'opacity-50'}`} />
                Thinking
              </Button>
              <Button
                variant={webSearchMode ? "default" : "ghost"}
                size="sm"
                onClick={handleWebSearchToggle}
                disabled={!ollamaStatus.isRunning}
                title={webSearchMode ? "Disable Web Search Mode" : "Enable Web Search Mode"}
                className="text-xs"
              >
                <Search className={`w-3 h-3 mr-1 ${webSearchMode ? '' : 'opacity-50'}`} />
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Command Logs Panel */}
      {showLogs && (
        <div className="w-80 border-l border-border bg-card/90 backdrop-blur-sm flex flex-col max-h-screen">
          <div className="border-b border-border p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4" />
              <h3 className="font-semibold">Command Logs</h3>
              <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                {commandLogs.length}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCommandLogs}
                title="Clear Logs"
                disabled={commandLogs.length === 0}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogs(false)}
                title="Hide Logs"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {commandLogs.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No commands executed yet
              </div>
            ) : (
              commandLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2 rounded-md border text-xs ${
                    log.status === 'running'
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                      : log.status === 'success'
                      ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-semibold">{log.command}</span>
                    <div className="flex items-center space-x-1">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          log.status === 'running'
                            ? 'bg-blue-500 animate-pulse'
                            : log.status === 'success'
                            ? 'bg-green-500'
                            : 'bg-red-500'
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  {log.output && (
                    <div className="mt-1 p-1 bg-background/50 rounded text-green-700 dark:text-green-300 font-mono">
                      {log.output}
                    </div>
                  )}
                  {log.error && (
                    <div className="mt-1 p-1 bg-background/50 rounded text-red-700 dark:text-red-300 font-mono">
                      {log.error}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {clearConfirmation.isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-dialog-title"
          aria-describedby="clear-dialog-description"
          onClick={(e) => {
            // Close modal if clicking the backdrop (not the modal content) and not clearing
            if (e.target === e.currentTarget && !clearConfirmation.isClearing) {
              handleClearCancel();
            }
          }}
        >
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 id="clear-dialog-title" className="text-lg font-semibold text-foreground">
                    Clear All Conversations
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
              
              <p id="clear-dialog-description" className="text-foreground mb-6">
                Are you sure you want to delete all {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}? 
                All messages and conversation history will be permanently removed.
              </p>
              
              <div className="flex justify-end space-x-3">
                <Button
                  ref={(el) => {
                    // Auto-focus cancel button when modal opens
                    if (el && clearConfirmation.isOpen && !clearConfirmation.isClearing) {
                      setTimeout(() => el.focus(), 100);
                    }
                  }}
                  variant="outline"
                  onClick={handleClearCancel}
                  disabled={clearConfirmation.isClearing}
                  className="px-4"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={clearAllConversations}
                  disabled={clearConfirmation.isClearing}
                  className="px-4"
                >
                  {clearConfirmation.isClearing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear All
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ollama Setup Overlay */}
      <OllamaSetupOverlay 
        isOpen={showOllamaSetup}
        onClose={() => setShowOllamaSetup(false)}
        onComplete={handleSetupComplete}
        onCommandLog={addCommandLog}
        onCommandUpdate={updateCommandLog}
      />

      {/* Settings Modal */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onPortChanged={handlePortChanged}
        onOllamaStatusChange={handleOllamaStatusChange}
      />
    </div>
  );
}
