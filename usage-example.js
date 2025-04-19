// Example 1: Simple Text Generation
const client = new GeminiClient('YOUR_API_KEY');

async function generateText() {
  try {
    const response = await client.text.generate(
      "Write a short poem about artificial intelligence.",
      { temperature: 0.8 }
    );
    console.log(response.text());
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Example 2: Code Generation
async function generateCode() {
  try {
    const result = await client.code.generate(
      "creates a function that calculates the Fibonacci sequence",
      "javascript"
    );
    console.log(result.code);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Example 3: Image Analysis (Vision)
async function analyzeImage() {
  const imageUrl = "https://example.com/image.jpg";
  try {
    const analysis = await client.vision.analyze(
      imageUrl,
      "What objects are in this image?"
    );
    console.log(analysis.text());
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Example 4: Chat Conversation
async function chatExample() {
  const chat = client.text.chat({
    systemPrompt: "You are a helpful AI assistant specialized in JavaScript."
  });
  
  try {
    const response1 = await chat.send("How do I create a Promise in JavaScript?");
    console.log("Assistant:", response1.text());
    
    const response2 = await chat.send("Can you show an example with async/await?");
    console.log("Assistant:", response2.text());
    
    // Get conversation history
    const history = chat.getHistory();
    console.log("Chat history:", history);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Example 5: Generate Embeddings for Semantic Search
async function generateEmbeddings() {
  try {
    const texts = [
      "JavaScript is a programming language",
      "Python is used for data science",
      "TypeScript adds static typing to JavaScript"
    ];
    
    const embeddings = await client.embeddings.generate(texts);
    console.log(embeddings.embeddings());
    
    // Simple cosine similarity function for semantic search
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
    
    // Example query embedding
    const queryEmbedding = await client.embeddings.generate("JavaScript types");
    const queryVector = queryEmbedding.embeddings()[0];
    
    // Find most similar text
    const results = embeddings.embeddings().map((vector, index) => ({
      text: texts[index],
      similarity: cosineSimilarity(queryVector, vector)
    }));
    
    results.sort((a, b) => b.similarity - a.similarity);
    console.log("Search results:", results);
  } catch (error) {
    console.error("Error:", error.message);
  }
}
