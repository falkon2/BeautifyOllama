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
