"use client";
import { useEffect, useState } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
  hasAnimated = false,
  onAnimationComplete,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
  hasAnimated?: boolean;
  onAnimationComplete?: () => void;
}) => {
  const [scope, animate] = useAnimate();
  const [localHasAnimated, setLocalHasAnimated] = useState(hasAnimated);
  const [mounted, setMounted] = useState(false);
  let wordsArray = words.split(" ");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !localHasAnimated) {
      if (mounted && !localHasAnimated) {
        // First time animation - typewriter effect
        animate(
          "span",
          {
            opacity: 1,
            filter: filter ? "blur(0px)" : "none",
          },
          {
            duration: duration ? duration : 1,
            delay: stagger(0.2),
          }
        ).then(() => {
          setLocalHasAnimated(true);
          onAnimationComplete?.();
        });
      }
    }
  }, [scope.current, localHasAnimated, mounted, animate, filter, duration, onAnimationComplete]);

  if (localHasAnimated && hasAnimated) {
    // Simple motion reveal for subsequent views
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn("font-normal", className)}
      >
        {words}
      </motion.div>
    );
  }

  return (
    <div className={cn("font-normal", className)}>
      <motion.div ref={scope}>
        {wordsArray.map((word, idx) => {
          return (
            <motion.span
              key={word + idx}
              className="opacity-0"
              style={{
                filter: filter ? "blur(10px)" : "none",
              }}
            >
              {word}{" "}
            </motion.span>
          );
        })}
      </motion.div>
    </div>
  );
};
