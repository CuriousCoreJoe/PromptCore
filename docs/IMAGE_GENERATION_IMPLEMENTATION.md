# Image Generation Implementation

## Overview

This document describes the image generation implementation for the Media Gen mode in PromptCore. The system uses a fallback chain to ensure image generation works even when some services are unavailable.

## Architecture

### Fallback Chain

The image generation system uses a multi-tier fallback approach:

```
1. OpenRouter (Nano Banana / google/gemini-3-pro-image-preview) - DEFAULT
   ↓ (if fails)
2. Pollinations.ai (FREE, no API key required)
   ↓ (if fails)
3. Together.ai (black-forest-labs/FLUX.1-schnell)
   ↓ (if fails)
4. Gemini Native (imagen-4.0-generate-001)
```

### Service Details

| Service | Model | API Key Required | Notes |
|---------|-------|------------------|-------|
| OpenRouter | google/gemini-3-pro-image-preview | Yes (OPENROUTER_API_KEY) | Default model, highest quality |
| Pollinations.ai | N/A | No | Free fallback, URL-based API |
| Together.ai | black-forest-labs/FLUX.1-schnell | Yes (TOGETHER_API_KEY) | Fast FLUX model |
| Gemini | imagen-4.0-generate-001 | Yes (GEMINI_API_KEY) | Native Gemini Imagen 4.0 |

## Implementation

### Files Modified

1. **`netlify/functions/execute.ts`** - Main implementation file
2. **`.env.example`** - Updated with Pollinations.ai documentation

### Key Functions

#### `generateImageWithPollinations(prompt: string)`
- **Purpose**: Generate images using Pollinations.ai (free service)
- **API**: URL-based, no authentication required
- **Format**: `https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true`
- **Returns**: `ImageGenerationResult` with image URL

#### `generateImageWithTogether(prompt: string, togetherKey?: string)`
- **Purpose**: Generate images using Together.ai FLUX model
- **Model**: `black-forest-labs/FLUX.1-schnell`
- **Returns**: `ImageGenerationResult` with base64 image data

#### `generateImageWithGemini(prompt: string, geminiKey: string)`
- **Purpose**: Generate images using Google Gemini Imagen
- **Model**: `imagen-4.0-generate-001`
- **Returns**: `ImageGenerationResult` with base64 image data

#### `generateImageWithFallback(prompt: string, options)`
- **Purpose**: Main function that orchestrates the fallback chain
- **Parameters**:
  - `prompt`: The image generation prompt
  - `options.openRouterKey`: OpenRouter API key
  - `options.geminiKey`: Gemini API key
  - `options.togetherKey`: Together.ai API key
  - `options.requestedModel`: User's requested model
- **Returns**: `ImageGenerationResult` from the first successful service

### Type Definitions

```typescript
type ImageService = 'openrouter' | 'gemini' | 'together' | 'pollinations';

interface ImageGenerationResult {
    success: boolean;
    imageUrl?: string;
    service?: ImageService;
    error?: string;
}
```

## Usage in Media Gen Mode

When a user runs a prompt in Media Gen mode:

1. The system extracts the image prompt from the JSON or text
2. Cleans the prompt (removes special characters, limits to 500 chars)
3. Calls `generateImageWithFallback()` with the cleaned prompt
4. The fallback chain tries each service in order
5. On success, the image is embedded in the response:
   - Base64 images use special markers: `<!-- IMAGE_DATA_START -->...<!-- IMAGE_DATA_END -->`
   - URL images use markdown: `![Generated Image](url)`
6. On failure, an error message is displayed

## Error Handling

Each service has comprehensive error logging:

```typescript
console.log(`[ServiceName] Generating image with prompt: "${prompt.substring(0, 100)}..."`);
console.log(`[ServiceName] Response status: ${response.status}`);
console.log(`[ServiceName] Error: ${error.message}`);
```

Error messages are propagated to the user when all services fail.

## Configuration

### Environment Variables

```bash
# Required for OpenRouter (default model)
OPENROUTER_API_KEY=sk-or-...

# Required for Gemini native
GEMINI_API_KEY=AI...

# Required for Together.ai
TOGETHER_API_KEY=...

# Pollinations.ai - NO KEY REQUIRED
```

### Model Selection

The default model for Media Gen mode is **Nano Banana** (`google/gemini-3-pro-image-preview`) via OpenRouter. This is automatically selected when the mode is set to 'Media Gen'.

#### Available Models

Users can select from the following image generation models:

| Model Name | OpenRouter ID | Notes |
|------------|---------------|-------|
| Nano Banana | google/gemini-3-pro-image-preview | Default, highest quality |
| DALL-E 3 | openai/dall-e-3 | OpenAI's image generation model |
| Midjourney v6 | midjourney/mj-v6 | Midjourney's latest model |
| Stable Diffusion XL | stabilityai/stable-diffusion-xl-base-1.0 | Stability AI's SDXL model |

### Dev User Bypass

The dev user (`dev@promptcore.com`) has unlimited access to all features and is not subject to:
- Credit limits
- Feature locks
- Usage restrictions
- Rate tier multipliers

This is implemented in [`chat.ts`](netlify/functions/chat.ts:230-341) with the `isDev` flag that bypasses all restrictions.

## Testing

### Manual Testing Steps

1. **Test with OpenRouter only**:
   - Set `OPENROUTER_API_KEY`
   - Clear other API keys
   - Run a Media Gen prompt
   - Verify image generation works

2. **Test with Gemini only**:
   - Set `GEMINI_API_KEY`
   - Clear other API keys
   - Run a Media Gen prompt
   - Verify image generation works

3. **Test with Together.ai only**:
   - Set `TOGETHER_API_KEY`
   - Clear other API keys
   - Run a Media Gen prompt
   - Verify image generation works

4. **Test with no API keys**:
   - Clear all API keys
   - Run a Media Gen prompt
   - Verify Pollinations.ai fallback works

5. **Test error handling**:
   - Use invalid API keys
   - Verify appropriate error messages

### Expected Console Output

```
[ImageGen] Starting fallback chain for prompt: "a beautiful sunset..."
[ImageGen] Trying OpenRouter with model: google/gemini-3-pro-image-preview
[ImageGen] OpenRouter response: {...}
[ImageGen] OpenRouter image generation successful
```

Or if OpenRouter fails:

```
[ImageGen] Starting fallback chain for prompt: "a beautiful sunset..."
[ImageGen] Trying OpenRouter with model: google/gemini-3-pro-image-preview
[ImageGen] OpenRouter failed: 401
[ImageGen] Trying Pollinations.ai (free fallback)
[Pollinations.ai] Generating image with prompt: "a beautiful sunset..."
[Pollinations.ai] Image generation successful
```

## Troubleshooting

### Issue: No image is generated

**Check console logs for:**
- Which service was attempted
- Error messages from each service
- Whether Pollinations.ai fallback was reached

**Common causes:**
- Invalid API keys
- API quota exceeded
- Network issues
- Service downtime

### Issue: Image doesn't display in chat

**Check:**
- Is the image URL valid?
- For base64 images, check the `IMAGE_DATA_START` markers
- Check browser console for image loading errors

### Issue: Slow image generation

**Solutions:**
- Pollinations.ai is the fastest (no API call overhead)
- Together.ai FLUX is fast
- OpenRouter and Gemini may be slower due to API latency

## Future Improvements

1. Add more image generation services (e.g., Stability AI, Replicate)
2. Implement caching for repeated prompts
3. Add image size/quality options
4. Support for image-to-image generation
5. Add image editing capabilities

## References

- [OpenRouter Models](https://openrouter.ai/models)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [Together.ai API](https://docs.together.ai/)
- [Pollinations.ai](https://pollinations.ai/)
