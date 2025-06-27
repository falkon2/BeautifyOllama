import { invoke } from '@tauri-apps/api/core';

// Minimal Ollama wrapper for Next.js (calls local Ollama API)
export async function askOllama(
  prompt: string, 
  model: string = "llama2", 
  images?: string[]
): Promise<string> {
  try {
    const requestBody: any = { model, prompt };
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
    const res = await fetch("http://localhost:11434/api/tags");
    if (!res.ok) throw new Error("Failed to fetch Ollama models");
    const data = await res.json();
    // The API returns { models: [{name: string, ...}, ...] }
    return data.models?.map((m: { name: string }) => m.name) || [];
  } catch (e: any) {
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
