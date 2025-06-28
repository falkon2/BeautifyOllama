"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Eye } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cn } from "@/lib/utils";

interface ThinkingRendererProps {
  content: string;
  className?: string;
}

interface ThinkingSection {
  id: string;
  content: string;
  isExpanded: boolean;
}

export function ThinkingRenderer({ content, className }: ThinkingRendererProps) {
  // Parse content to separate thinking sections from regular content
  const parseContent = (text: string) => {
    const parts: Array<{ type: 'regular' | 'thinking'; content: string; id?: string }> = [];
    
    // Multiple patterns for thinking content
    const patterns = [
      // <think>...</think> tags
      { regex: /<think>([\s\S]*?)<\/think>/g, name: 'think-tags' },
      // Thinking... pattern
      { regex: /Thinking\.\.\.([\s\S]*?)\.\.\.done thinking\./g, name: 'thinking-dots' },
      // Other potential patterns
      { regex: /\[THINKING\]([\s\S]*?)\[\/THINKING\]/g, name: 'thinking-brackets' },
    ];
    
    let processedText = text;
    let thinkingIndex = 0;
    const foundMatches: Array<{ start: number; end: number; content: string; id: string }> = [];
    
    // Find all thinking patterns
    for (const pattern of patterns) {
      let match;
      pattern.regex.lastIndex = 0; // Reset regex
      
      while ((match = pattern.regex.exec(text)) !== null) {
        foundMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1].trim(),
          id: `thinking-${thinkingIndex++}`
        });
      }
    }
    
    // Sort matches by start position
    foundMatches.sort((a, b) => a.start - b.start);
    
    let lastIndex = 0;
    
    // Process each match
    for (const match of foundMatches) {
      // Add regular content before this thinking section
      if (match.start > lastIndex) {
        const regularContent = text.slice(lastIndex, match.start);
        if (regularContent.trim()) {
          parts.push({ type: 'regular', content: regularContent });
        }
      }
      
      // Add thinking section
      parts.push({ 
        type: 'thinking', 
        content: match.content, 
        id: match.id
      });
      
      lastIndex = match.end;
    }
    
    // Add remaining regular content
    if (lastIndex < text.length) {
      const remainingContent = text.slice(lastIndex);
      if (remainingContent.trim()) {
        parts.push({ type: 'regular', content: remainingContent });
      }
    }
    
    return parts;
  };

  const parts = parseContent(content);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // If no thinking sections found, render normally
  if (!parts.some(part => part.type === 'thinking')) {
    return (
      <MarkdownRenderer 
        content={content}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {parts.map((part, index) => {
        if (part.type === 'regular') {
          return (
            <MarkdownRenderer 
              key={index}
              content={part.content}
              className="leading-relaxed"
            />
          );
        }
        
        // Thinking section
        const isExpanded = expandedSections.has(part.id!);
        return (
          <div key={part.id} className="border border-border/30 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 px-3 hover:bg-muted/50"
              onClick={() => toggleSection(part.id!)}
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 mr-2" />
              ) : (
                <ChevronRight className="w-3 h-3 mr-2" />
              )}
              <Eye className="w-3 h-3 mr-2 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Thinking process {isExpanded ? "(expanded)" : "(click to expand)"}
              </span>
            </Button>
            
            {isExpanded && (
              <div className="px-3 pb-3">
                <div className="text-xs text-muted-foreground/70 border-l-2 border-muted-foreground/20 pl-3 whitespace-pre-wrap">
                  {part.content.trim()}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
