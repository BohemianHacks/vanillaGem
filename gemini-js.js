/**
 * Gemini.js - Open Source Vanilla JS Library for Gemini API
 * Created by Void Labs - An open source AI inclusive think tank
 * 
 * This library provides a simple interface for interacting with Google's
 * Gemini AI models via their API.
 */

/**
 * Main client class for Gemini API
 */
class GeminiClient {
  /**
   * Initialize a new Gemini API client
   * @param {string} apiKey - Your Gemini API key
   * @param {Object} options - Configuration options
   * @param {string} options.model - Default model to use (defaults to "gemini-1.5-pro")
   * @param {number} options.maxRetries - Maximum number of retries for failed requests (defaults to 3)
   * @param {number} options.timeout - Request timeout in milliseconds (defaults to 30000)
   */
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = options.model || 'gemini-1.5-pro';
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 30000;
    
    // Create specialized handlers
    this.text = new TextHandler(this);
    this.code = new CodeHandler(this);
    this.vision = new VisionHandler(this);
    this.embeddings = new EmbeddingsHandler(this);
  }

  /**
   * Make a request to the Gemini API
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @returns {Promise<Object>} - API response
   */
  async request(endpoint, data) {
    const url = `${this.baseUrl}/${endpoint}?key=${this.apiKey}`;
    
    let retries = 0;
    while (retries <= this.maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const error = await response.json();
          throw new GeminiError(error.error || response.statusText, response.status);
        }
        
        return await response.json();
      } catch (error) {
        retries++;
        if (error.name === 'AbortError') {
          throw new GeminiError('Request timed out', 408);
        }
        
        if (retries > this.maxRetries || !isRetryableError(error)) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 2 ** retries * 500));
      }
    }
  }
  
  /**
   * Get available models from the Gemini API
   * @returns {Promise<Array>} - List of available models
   */
  async listModels() {
    const response = await this.request('models', {});
    return response.models || [];
  }
  
  /**
   * Set the default model for this client
   * @param {string} model - Model identifier
   */
  setModel(model) {
    this.model = model;
    return this;
  }
}

/**
 * Handler for text generation capabilities
 */
class TextHandler {
  constructor(client) {
    this.client = client;
  }
  
  /**
   * Generate text content from a prompt
   * @param {string|Object} prompt - Text prompt or prompt object
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated content
   */
  async generate(prompt, options = {}) {
    const model = options.model || this.client.model;
    const endpoint = `models/${model}:generateContent`;
    
    const data = {
      contents: [
        {
          parts: typeof prompt === 'string' 
            ? [{ text: prompt }]
            : prompt.parts || [{ text: prompt.text || '' }]
        }
      ],
      generationConfig: {
        temperature: options.temperature || 0.7,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxTokens || 1024,
        stopSequences: options.stopSequences || []
      },
      safetySettings: options.safetySettings || []
    };
    
    const response = await this.client.request(endpoint, data);
    return new TextResponse(response);
  }
  
  /**
   * Start a conversation (chat) session
   * @param {Object} options - Chat session options
   * @returns {ChatSession} - A new chat session
   */
  chat(options = {}) {
    return new ChatSession(this.client, options);
  }
}

/**
 * Handler for code-related capabilities
 */
class CodeHandler {
  constructor(client) {
    this.client = client;
  }
  
  /**
   * Generate code from a description
   * @param {string} description - Description of the code to generate
   * @param {string} language - Programming language (e.g., "javascript", "python")
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Generated code
   */
  async generate(description, language, options = {}) {
    const prompt = `Generate ${language} code that ${description}. Provide only the code with no explanations.`;
    
    const response = await this.client.text.generate(prompt, {
      ...options,
      temperature: options.temperature || 0.2 // Lower temperature for code
    });
    
    return {
      code: response.text(),
      ...response
    };
  }
  
  /**
   * Analyze and explain code
   * @param {string} code - Code to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Analysis results
   */
  async analyze(code, options = {}) {
    const prompt = `Analyze this code and explain what it does:\n\n${code}`;
    
    return await this.client.text.generate(prompt, options);
  }
  
  /**
   * Suggest improvements to code
   * @param {string} code - Code to improve
   * @param {Object} options - Improvement options
   * @returns {Promise<Object>} - Suggested improvements
   */
  async improve(code, options = {}) {
    const prompt = `Suggest improvements for this code:\n\n${code}`;
    
    return await this.client.text.generate(prompt, options);
  }
}

/**
 * Handler for vision (image) capabilities
 */
class VisionHandler {
  constructor(client) {
    this.client = client;
  }
  
  /**
   * Analyze an image with optional text prompt
   * @param {string|Blob|File} image - Image as URL, base64, Blob or File
   * @param {string} prompt - Optional text prompt
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Analysis results
   */
  async analyze(image, prompt = "Describe this image in detail", options = {}) {
    const model = options.model || this.client.model;
    const endpoint = `models/${model}:generateContent`;
    
    // Process image input
    let imagePart;
    if (typeof image === 'string') {
      // Check if it's a URL or base64
      if (image.startsWith('data:') || image.startsWith('http')) {
        imagePart = { inline_data: { mime_type: 'image/jpeg', data: image } };
      } else {
        throw new Error('Image must be a URL, base64 string, Blob, or File');
      }
    } else if (image instanceof Blob || image instanceof File) {
      // Convert Blob/File to base64
      const base64 = await this._blobToBase64(image);
      imagePart = { 
        inline_data: { 
          mime_type: image.type || 'image/jpeg', 
          data: base64
        } 
      };
    }
    
    const data = {
      contents: [
        {
          parts: [
            imagePart,
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: options.temperature || 0.7,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxTokens || 1024
      }
    };
    
    const response = await this.client.request(endpoint, data);
    return new TextResponse(response);
  }
  
  /**
   * Convert a Blob to base64
   * @private
   * @param {Blob} blob - Image blob
   * @returns {Promise<string>} - Base64 string
   */
  async _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

/**
 * Handler for embeddings capabilities
 */
class EmbeddingsHandler {
  constructor(client) {
    this.client = client;
  }
  
  /**
   * Generate embeddings for text
   * @param {string|string[]} texts - Text or array of texts
   * @param {Object} options - Embedding options
   * @returns {Promise<Object>} - Embeddings response
   */
  async generate(texts, options = {}) {
    const model = options.model || 'embedding-001'; // Use embedding model
    const endpoint = `models/${model}:embedContent`;
    
    // Normalize input to array
    const textArray = Array.isArray(texts) ? texts : [texts];
    
    const data = {
      model: `models/${model}`,
      content: {
        parts: textArray.map(text => ({ text }))
      }
    };
    
    const response = await this.client.request(endpoint, data);
    return new EmbeddingsResponse(response);
  }
}

/**
 * Chat session for maintaining conversation context
 */
class ChatSession {
  constructor(client, options = {}) {
    this.client = client;
    this.model = options.model || client.model;
    this.messages = [];
    this.systemPrompt = options.systemPrompt || '';
  }
  
  /**
   * Send a message in this chat session
   * @param {string} message - User message
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Assistant's response
   */
  async send(message, options = {}) {
    // Add user message to history
    this.messages.push({
      role: 'user',
      parts: [{ text: message }]
    });
    
    const endpoint = `models/${this.model}:generateContent`;
    
    let contents = [...this.messages];
    
    // Add system prompt if provided
    if (this.systemPrompt) {
      contents.unshift({
        role: 'system',
        parts: [{ text: this.systemPrompt }]
      });
    }
    
    const data = {
      contents,
      generationConfig: {
        temperature: options.temperature || 0.7,
        topK: options.topK || 40,
        topP: options.topP || 0.95,
        maxOutputTokens: options.maxTokens || 1024
      }
    };
    
    const response = await this.client.request(endpoint, data);
    const textResponse = new TextResponse(response);
    
    // Add assistant response to history
    this.messages.push({
      role: 'model',
      parts: [{ text: textResponse.text() }]
    });
    
    return textResponse;
  }
  
  /**
   * Clear chat history
   */
  clear() {
    this.messages = [];
    return this;
  }
  
  /**
   * Get chat history
   */
  getHistory() {
    return this.messages;
  }
}

/**
 * Response wrapper for text generations
 */
class TextResponse {
  constructor(rawResponse) {
    this.raw = rawResponse;
    this._candidates = rawResponse.candidates || [];
  }
  
  /**
   * Get the generated text from the first candidate
   * @returns {string} - Generated text
   */
  text() {
    if (this._candidates.length === 0) {
      return '';
    }
    
    const parts = this._candidates[0].content.parts || [];
    return parts.map(part => part.text || '').join('');
  }
  
  /**
   * Get all candidates
   * @returns {Array} - All response candidates
   */
  candidates() {
    return this._candidates;
  }
  
  /**
   * Get safety ratings
   * @returns {Array} - Safety ratings
   */
  safetyRatings() {
    if (this._candidates.length === 0) {
      return [];
    }
    
    return this._candidates[0].safetyRatings || [];
  }
}

/**
 * Response wrapper for embeddings
 */
class EmbeddingsResponse {
  constructor(rawResponse) {
    this.raw = rawResponse;
  }
  
  /**
   * Get embeddings vectors
   * @returns {Array<Array<number>>} - Embedding vectors
   */
  embeddings() {
    return this.raw.embeddings?.map(emb => emb.values) || [];
  }
}

/**
 * Custom error class for Gemini API errors
 */
class GeminiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
  }
}

/**
 * Check if an error is retryable
 * @private
 * @param {Error} error - The error to check
 * @returns {boolean} - Whether the error is retryable
 */
function isRetryableError(error) {
  // Retry on rate limits, server errors, and network issues
  if (error instanceof GeminiError) {
    return [429, 500, 502, 503, 504].includes(error.code);
  }
  return error.name === 'TypeError' || error.name === 'NetworkError';
}

// Export the library
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    GeminiClient,
    GeminiError
  };
} else {
  window.GeminiClient = GeminiClient;
  window.GeminiError = GeminiError;
}
