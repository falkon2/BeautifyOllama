# Markdown Features Demo

Your chat application now supports rich markdown formatting! Here are some examples you can try:

## Text Formatting

**Bold text** using `**bold text**`
*Italic text* using `*italic text*`
***Bold and italic*** using `***bold and italic***`

## Inline Code

You can use `inline code` with backticks: `console.log("Hello, World!");`

## Code Blocks

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
- First item
- Second item
- Third item

### Ordered List
1. First step
2. Second step
3. Third step

## Quotes

> This is a blockquote
> It can span multiple lines
> And provides emphasis to important text

## Test Messages

Try sending these messages in your chat to test the markdown features:

1. **Basic formatting**: `Hello **world**! This is *italic* text.`

2. **Code example**: 
```
Here's some code:
`const message = "Hello, World!";`
```

3. **Code block**:
```
Try sending this message:

\`\`\`javascript
function sayHello() {
    return "Hello from markdown!";
}
\`\`\`
```

The copy button will appear on hover for code blocks, making it easy to copy code snippets!
