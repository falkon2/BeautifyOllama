import { invoke } from '@tauri-apps/api/core';

// Streaming Ollama wrapper for real-time text generation
export async function askOllamaStreaming(
  prompt: string, 
  model: string = "llama2",
  thinking: boolean = false,
  onChunk?: (chunk: string) => void,
  onComplete?: () => void
): Promise<string> {
  try {
    // Add /nothinking by default, only add thinking if toggled on
    const finalPrompt = thinking ? prompt : `/nothinking ${prompt}`;
    
    const requestBody = { 
      model, 
      prompt: finalPrompt,
      stream: true 
    };

    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    
    if (!res.ok) throw new Error("Ollama API error");
    
    if (res.body) {
      const reader = res.body.getReader();
      let result = '';
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split(/\r?\n/)) {
          if (line.trim()) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                result += json.response;
                onChunk?.(json.response);
              }
            } catch (e) {
              // Ignore lines that aren't valid JSON
            }
          }
        }
      }
      
      onComplete?.();
      return result;
    }
    
    throw new Error("No response body");
  } catch (e: any) {
    throw new Error(`Error: ${e.message}`);
  }
}

// Minimal Ollama wrapper for Next.js (calls local Ollama API)
export async function askOllama(
  prompt: string, 
  model: string = "llama2", 
  images?: string[],
  thinking: boolean = false
): Promise<string> {
  try {
    // Add /nothinking by default, only add thinking if toggled on
    const finalPrompt = thinking ? prompt : `/nothinking ${prompt}`;
    
    const requestBody: any = { model, prompt: finalPrompt };
    if (images && images.length > 0) {
      requestBody.images = images;
    }

    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    if (!res.ok) throw new Error("Ollama API error");
    // Try streaming approach first
    if (res.body) {
      const reader = res.body.getReader();
      let result = '';
      let decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split(/\r?\n/)) {
            if (line.trim()) {
              try {
                const json = JSON.parse(line);
                if (json.response) result += json.response;
              } catch (e) {
                // Ignore lines that aren't valid JSON
              }
            }
          }
        }
        done = doneReading;
      }
      if (result) return result;
    }
    // Fallback: try to parse as JSON (non-streaming)
    const data = await res.text();
    try {
      const json = JSON.parse(data);
      return json.response || "No response from Ollama.";
    } catch (err) {
      return data || "No response from Ollama.";
    }
  } catch (e: any) {
    return `Error: ${e.message}`;
  }
}

export async function listOllamaModels(): Promise<string[]> {
  try {
    // Primary method: Try the API directly
    const res = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    if (!res.ok) throw new Error("Failed to fetch Ollama models");
    const data = await res.json();
    // The API returns { models: [{name: string, ...}, ...] }
    const models = data.models?.map((m: { name: string }) => m.name) || [];
    
    // If we got models from API, return them
    if (models.length > 0) {
      return models;
    }
    
    // If no models from API, try the backend command as fallback
    try {
      const backendModels = await invoke('list_installed_models') as string[];
      return backendModels || [];
    } catch (backendError) {
      console.warn('Backend model listing failed:', backendError);
      return [];
    }
  } catch (e: any) {
    console.warn('API model listing failed:', e);
    
    // Fallback: Try the backend command
    try {
      const backendModels = await invoke('list_installed_models') as string[];
      return backendModels || [];
    } catch (backendError) {
      console.error('Both API and backend model listing failed:', backendError);
      return [];
    }
  }
}

// Add periodic model refresh and Windows-specific fixes
export async function listOllamaModelsWithRetry(): Promise<string[]> {
  const maxRetries = 5; // Increased from 3 for Windows
  const retryDelay = 800; // Slightly reduced delay
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const models = await listOllamaModels();
      if (models.length > 0) {
        return models;
      }
      
      // If no models found and not the last attempt, wait and retry
      if (attempt < maxRetries) {
        // On Windows, add a small random jitter to avoid timing issues
        const jitter = Math.random() * 200; // 0-200ms
        await new Promise(resolve => setTimeout(resolve, (retryDelay * attempt) + jitter));
      }
    } catch (error) {
      console.warn(`Model listing attempt ${attempt} failed:`, error);
      
      // If not the last attempt, wait and retry
      if (attempt < maxRetries) {
        const jitter = Math.random() * 200; // 0-200ms
        await new Promise(resolve => setTimeout(resolve, (retryDelay * attempt) + jitter));
      }
    }
  }
  
  return [];
}

// Windows-specific model refresh with force reload
export async function forceRefreshModels(): Promise<string[]> {
  try {
    // On Windows, sometimes we need to force a refresh of the Ollama connection
    // First, try to "wake up" Ollama by making a simple API call
    await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    }).catch(() => {}); // Ignore errors, this is just to wake up the service
    
    // Wait a moment for the service to respond
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Now try to get the models with retry logic
    const models = await listOllamaModelsWithRetry();
    
    // If still no models on Windows, try one more aggressive approach
    if (models.length === 0) {
      try {
        // Try the backend command directly as a last resort
        const backendModels = await invoke('list_installed_models') as string[];
        if (backendModels && backendModels.length > 0) {
          return backendModels;
        }
      } catch (backendError) {
        console.warn('Backend fallback failed:', backendError);
      }
    }
    
    return models;
  } catch (error) {
    console.error('Force refresh failed:', error);
    return [];
  }
}

export interface OllamaStatus {
  isInstalled: boolean;
  isRunning: boolean;
  version?: string;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export async function checkOllamaStatus(): Promise<OllamaStatus> {
  try {
    // Primary method: Try to connect to Ollama API using standard fetch
    const res = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    
    if (res.ok) {
      // Service is running, get version info
      try {
        const version = await invoke('check_ollama_installed') as string;
        return { isInstalled: true, isRunning: true, version };
      } catch {
        return { isInstalled: true, isRunning: true };
      }
    }
  } catch (e) {
    // API not reachable, check if Ollama is installed but not running
  }
  
  // Secondary method: Check if Ollama is installed (command available)
  try {
    const version = await invoke('check_ollama_installed') as string;
    return { isInstalled: true, isRunning: false, version };
  } catch (e) {
    return { isInstalled: false, isRunning: false };
  }
}

export async function getPlatform(): Promise<string> {
  try {
    return await invoke('get_platform');
  } catch (e) {
    // Fallback to browser detection
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) return 'macos';
    if (userAgent.includes('win')) return 'windows';
    return 'unknown';
  }
}

export async function getOllamaDownloadUrl(): Promise<string> {
  const platform = await getPlatform();
  
  switch (platform) {
    case 'macos':
      return 'https://ollama.ai/download/Ollama-darwin.zip';
    case 'windows':
      return 'https://ollama.ai/download/OllamaSetup.exe';
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export async function downloadOllama(
  onProgress?: (progress: DownloadProgress) => void
): Promise<string> {
  try {
    const downloadUrl = await getOllamaDownloadUrl();
    
    // For now, we'll redirect to the download page
    // In the future, we can implement direct download with Tauri
    window.open(downloadUrl, '_blank');
    
    return downloadUrl;
  } catch (e: any) {
    throw new Error(`Download failed: ${e.message}`);
  }
}

export async function installOllama(filePath: string): Promise<boolean> {
  try {
    const platform = await getPlatform();
    
    if (platform === 'macos') {
      // On macOS, we need to extract the zip and move it to Applications
      await invoke('install_ollama_macos', { filePath });
    } else if (platform === 'windows') {
      // On Windows, run the installer
      await invoke('install_ollama_windows', { filePath });
    }
    
    return true;
  } catch (e: any) {
    console.error('Installation failed:', e);
    return false;
  }
}

export async function startOllama(): Promise<boolean> {
  try {
    await invoke('start_ollama');
    return true;
  } catch (e: any) {
    console.error('Failed to start Ollama:', e);
    return false;
  }
}

export async function askOllamaVerbose(
  prompt: string, 
  model: string = "llama2",
  thinking: boolean = false
): Promise<string> {
  try {
    // Add /nothinking by default, only add thinking if toggled on
    const finalPrompt = thinking ? prompt : `/nothinking ${prompt}`;
    
    return await invoke('ask_ollama_verbose', { model, prompt: finalPrompt }) as string;
  } catch (e: any) {
    throw new Error(`Verbose Ollama request failed: ${e.message || e}`);
  }
}

export async function searchWeb(query: string, thinking: boolean = false): Promise<string> {
  try {
    return await invoke('search_web', { query, thinking }) as string;
  } catch (e: any) {
    throw new Error(`Web search failed: ${e.message || e}`);
  }
}
