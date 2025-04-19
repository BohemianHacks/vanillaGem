# Gemini.js

A lightweight, open-source vanilla JavaScript library for interacting with Google's Gemini AI models.

## 🌟 Features

- **Promise-based** - Clean async/await support
- **Multimodal** - Text, code, and vision capabilities

## 🚀 Quick Start

```javascript
// Import the library
import { GeminiClient } from 'gemini-js';
// or for browser via CDN: const { GeminiClient } = window;

// Initialize the client with your API key
const client = new GeminiClient('YOUR_API_KEY');

// Generate text
async function generateText() {
  const response = await client.text.generate(
    "Explain quantum computing in simple terms"
  );
  console.log(response.text());
}

generateText();
```

## 📘 Usage Examples

### Text Generation

```javascript
const client = new GeminiClient('YOUR_API_KEY');

// Simple text generation
const response = await client.text.generate(
  "Write a short story about robots learning to paint.",
  { 
    temperature: 0.8,
    maxTokens: 1024
  }
);

console.log(response.text());
```

### Chat Conversations

```javascript
// Create a chat session
const chat = client.text.chat({
  systemPrompt: "You are a helpful assistant specializing in JavaScript."
});

// First message
const response1 = await chat.send(
  "How do I handle asynchronous operations in JavaScript?"
);
console.log("Bot:", response1.text());

// Follow-up (maintains conversation context)
const response2 = await chat.send(
  "Can you show me an example with Promises?"
);
console.log("Bot:", response2.text());

// Get conversation history
const history = chat.getHistory();
```

### Code Generation and Analysis

```javascript
// Generate code
const codeResult = await client.code.generate(
  "creates a function that sorts an array using the quicksort algorithm",
  "javascript"
);
console.log(codeResult.code);

// Analyze existing code
const analysis = await client.code.analyze(`
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n-1) + fibonacci(n-2);
}
`);
console.log(analysis.text());

// Suggest improvements
const improvements = await client.code.improve(`
function search(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}
`);
console.log(improvements.text());
```

### Vision (Image Analysis)

```javascript
// Analyze an image from URL
const imageResult = await client.vision.analyze(
  "https://example.com/image.jpg",
  "What's in this image?"
);
console.log(imageResult.text());

// Or use a File/Blob (e.g., from file input)
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  const analysis = await client.vision.analyze(
    file,
    "Describe this image in detail"
  );
  console.log(analysis.text());
});
```

### Embeddings for Semantic Search

```javascript
// Generate embeddings for a set of texts
const texts = [
  "JavaScript is a programming language",
  "Python is used for data science",
  "TypeScript adds static typing to JavaScript"
];

const embeddings = await client.embeddings.generate(texts);
const vectors = embeddings.embeddings();

// Create a simple semantic search
async function searchTexts(query) {
  const queryEmbedding = await client.embeddings.generate(query);
  const queryVector = queryEmbedding.embeddings()[0];
  
  // Calculate similarities
  return texts.map((text, i) => ({
    text,
    similarity: cosineSimilarity(queryVector, vectors[i])
  })).sort((a, b) => b.similarity - a.similarity);
}

// Usage
const results = await searchTexts("JavaScript types");
console.log(results);

// Helper function for cosine similarity
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

## 📚 API Reference

### `GeminiClient`

The main client for interacting with the Gemini API.

```javascript
const client = new GeminiClient(apiKey, options);
```

**Parameters:**
- `apiKey` (string): Your Gemini API key
- `options` (object, optional):
  - `model` (string): Default model to use (defaults to "gemini-1.5-pro")
  - `maxRetries` (number): Maximum number of retries (defaults to 3)
  - `timeout` (number): Request timeout in milliseconds (defaults to 30000)

**Methods:**
- `listModels()`: List available models
- `setModel(model)`: Set the default model

### Text Generation

```javascript
const response = await client.text.generate(prompt, options);
```

**Parameters:**
- `prompt` (string or object): Text prompt or prompt object
- `options` (object, optional):
  - `model` (string): Model to use (overrides client default)
  - `temperature` (number): Controls randomness (0.0 to 1.0)
  - `topK` (number): Limits token selection to top K options
  - `topP` (number): Nucleus sampling parameter (0.0 to 1.0)
  - `maxTokens` (number): Maximum tokens to generate
  - `stopSequences` (array): Sequences that stop generation
  - `safetySettings` (array): Custom safety settings

### Chat Sessions

```javascript
const chat = client.text.chat(options);
const response = await chat.send(message, options);
```

**Chat Options:**
- `systemPrompt` (string): System prompt for the conversation
- `model` (string): Model to use for this chat

**Chat Methods:**
- `send(message, options)`: Send a message and get response
- `clear()`: Clear conversation history
- `getHistory()`: Get conversation history

### Code

```javascript
// Generate code
const result = await client.code.generate(description, language, options);

// Analyze code
const analysis = await client.code.analyze(code, options);

// Improve code
const improvements = await client.code.improve(code, options);
```

### Vision

```javascript
const result = await client.vision.analyze(image, prompt, options);
```

**Parameters:**
- `image` (string|Blob|File): Image as URL, base64, Blob or File
- `prompt` (string): Text prompt (defaults to "Describe this image in detail")
- `options` (object): Same options as text.generate()

### Embeddings

```javascript
const result = await client.embeddings.generate(texts, options);
const vectors = result.embeddings();
```

## 🛠️ Error Handling

```javascript
try {
  const response = await client.text.generate("Your prompt");
  console.log(response.text());
} catch (error) {
  if (error.code === 429) {
    console.error("Rate limit exceeded. Try again later.");
  } else {
    console.error("Error:", error.message);
  }
}
```
