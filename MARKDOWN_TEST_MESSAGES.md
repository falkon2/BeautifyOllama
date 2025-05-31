# Markdown Test Messages

Copy and paste these messages in your chat to test the markdown features:

## Basic Text Formatting

**Bold text test:** This text contains **bold words** and *italic words* and ***bold italic words***.

## Inline Code Test

Here's some `inline code` that should be highlighted: `console.log("Hello, World!");`

## Code Block Tests

### JavaScript Example
```javascript
function greetUser(name) {
    console.log(`Hello, ${name}!`);
    return `Welcome to the chat, ${name}`;
}

greetUser("World");
```

### Python Example  
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Calculate the 10th Fibonacci number
result = fibonacci(10)
print(f"The 10th Fibonacci number is: {result}")
```

### Plain Code Block
```
This is a plain code block
without syntax highlighting.
You can still copy it though!
```

## Lists

### Unordered List
- First item with **bold text**
- Second item with *italic text*
- Third item with `inline code`

### Ordered List
1. First step
2. Second step with **important** information
3. Third step with `code snippet`

## Blockquotes

> This is a blockquote
> It can span multiple lines
> And provides emphasis to important text

## Combined Example

Here's a **comprehensive example** with *multiple* formatting types:

1. **Installation**: Run `npm install markdown-parser`
2. **Usage**: 
   ```javascript
   import { parseMarkdown } from 'markdown-parser';
   const result = parseMarkdown('**Hello** *World*!');
   ```
3. **Result**: The parsed output will contain proper HTML markup

> **Note**: Make sure to test all features including the copy button for code blocks!
