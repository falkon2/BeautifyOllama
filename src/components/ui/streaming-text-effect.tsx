"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ThinkingRenderer } from "@/components/ThinkingRenderer";

export const StreamingTextEffect = ({
  text,
  isComplete = false,
  className,
  onComplete,
}: {
  text: string;
  isComplete?: boolean;
  className?: string;
  onComplete?: () => void;
}) => {
  const [showCursor, setShowCursor] = useState(true);

  // Hide cursor when streaming is complete
  useEffect(() => {
    if (isComplete) {
      setShowCursor(false);
      onComplete?.();
    }
  }, [isComplete, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn("font-normal", className)}
    >
      <ThinkingRenderer 
        content={text}
        className="leading-relaxed [&_code]:bg-muted/80 [&_code]:text-foreground"
      />
      {showCursor && !isComplete && text.length > 0 && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
          className="ml-1"
        >
          ▌
        </motion.span>
      )}
    </motion.div>
  );
};
