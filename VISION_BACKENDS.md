# Vision Backend Configuration Guide

Kleinanzeiger supports multiple vision AI backends for product image analysis. Choose the one that best fits your needs.

## Available Backends

### 1. BLIP-2 (Local - FREE) ⭐ Recommended for Testing
**Cost:** Free  
**Requirements:** ~15GB disk space for model  
**Speed:** Fast on GPU, slower on CPU  
**Quality:** Good for basic product analysis  

**Pros:**
- ✅ No API key needed
- ✅ Completely offline
- ✅ No recurring costs
- ✅ Privacy-focused (data stays local)

**Cons:**
- ❌ Requires ~15GB disk space (first run)
- ❌ Slower than cloud APIs
- ❌ Less detailed analysis than commercial APIs

**Configuration:**
```yaml
vision:
  backend: "blip2"
  blip2:
    model_name: "Salesforce/blip2-opt-2.7b"  # or blip2-flan-t5-xl for better quality
    device: "auto"  # auto, cuda, or cpu
    max_new_tokens: 500
```

**First Run:** Model will auto-download (~15GB). This takes 10-30 minutes depending on your connection.

---

### 2. Claude Vision (Anthropic)
**Cost:** ~$0.01-0.03 per image set  
**Requirements:** ANTHROPIC_API_KEY  
**Speed:** Very fast  
**Quality:** Excellent  

**Pros:**
- ✅ Very detailed analysis
- ✅ Excellent understanding of German context
- ✅ Good at condition assessment
- ✅ Reliable JSON formatting

**Cons:**
- ❌ Requires API key
- ❌ Costs per use
- ❌ Requires internet

**Configuration:**
```yaml
vision:
  backend: "claude"
  claude:
    api_key: ${ANTHROPIC_API_KEY}
    model: "claude-3-5-sonnet-20241022"
    max_tokens: 2000
    temperature: 0.7
```

**Get API Key:** https://console.anthropic.com/

---

### 3. OpenAI GPT-4 Vision
**Cost:** ~$0.01-0.04 per image set  
**Requirements:** OPENAI_API_KEY  
**Speed:** Fast  
**Quality:** Excellent  

**Pros:**
- ✅ Very detailed analysis
- ✅ Good at detecting brands/products
- ✅ Supports more image formats (GIF)

**Cons:**
- ❌ Requires API key
- ❌ Costs per use
- ❌ May require VPN in some regions

**Configuration:**
```yaml
vision:
  backend: "openai"
  openai:
    api_key: ${OPENAI_API_KEY}
    model: "gpt-4-vision-preview"
    max_tokens: 2000
```

**Get API Key:** https://platform.openai.com/api-keys

---

### 4. Google Gemini Vision
**Cost:** Free tier available, then ~$0.002-0.008 per image  
**Requirements:** GEMINI_API_KEY  
**Speed:** Very fast  
**Quality:** Good  

**Pros:**
- ✅ Generous free tier
- ✅ Fast responses
- ✅ Good value for money

**Cons:**
- ❌ Requires API key
- ❌ Newer, less tested

**Configuration:**
```yaml
vision:
  backend: "gemini"
  gemini:
    api_key: ${GEMINI_API_KEY}
    model: "gemini-pro-vision"
```

**Get API Key:** https://makersuite.google.com/app/apikey

---

## Quick Start

### Option 1: Start FREE with BLIP-2 (Recommended)

1. Edit `config/settings.yaml`:
   ```yaml
   vision:
     backend: "blip2"
   ```

2. Install dependencies:
   ```bash
   pip install torch transformers accelerate
   ```

3. Run (first time downloads model):
   ```bash
   python -m src.main --image-folder ./products/test --postal-code 10115
   ```

### Option 2: Use Claude (Best Quality)

1. Get API key from https://console.anthropic.com/

2. Add to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Edit `config/settings.yaml`:
   ```yaml
   vision:
     backend: "claude"
   ```

4. Run:
   ```bash
   python -m src.main --image-folder ./products/test --postal-code 10115
   ```

### Option 3: Use OpenAI GPT-4 Vision

1. Get API key from https://platform.openai.com/api-keys

2. Add to `.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```

3. Edit `config/settings.yaml`:
   ```yaml
   vision:
     backend: "openai"
   ```

4. Install:
   ```bash
   pip install openai
   ```

### Option 4: Use Google Gemini

1. Get API key from https://makersuite.google.com/app/apikey

2. Add to `.env`:
   ```
   GEMINI_API_KEY=...
   ```

3. Edit `config/settings.yaml`:
   ```yaml
   vision:
     backend: "gemini"
   ```

4. Install:
   ```bash
   pip install google-generativeai
   ```

---

## Comparison Table

| Backend | Cost | Speed | Quality | Offline | Setup Difficulty |
|---------|------|-------|---------|---------|------------------|
| **BLIP-2** | Free | Medium | Good | ✅ Yes | Easy |
| **Claude** | $$ | Fast | Excellent | ❌ No | Easy |
| **OpenAI** | $$$ | Fast | Excellent | ❌ No | Easy |
| **Gemini** | Free/$ | Very Fast | Good | ❌ No | Easy |

---

## Troubleshooting

### BLIP-2 Issues

**Error: "CUDA out of memory"**
- Solution: Use CPU instead:
  ```yaml
  blip2:
    device: "cpu"
  ```

**Error: "Model download failed"**
- Check internet connection
- Ensure ~15GB free disk space
- Try smaller model: `Salesforce/blip2-opt-2.7b`

**Slow performance on CPU**
- Normal for CPU
- Consider using GPU or cloud API
- Reduce `max_new_tokens` to 250

### API Backend Issues

**Error: "API key not found"**
- Check `.env` file exists
- Verify API key is correct
- Ensure no quotes in `.env`: `ANTHROPIC_API_KEY=sk-ant-123` (not `"sk-ant-123"`)

**Error: "Rate limit exceeded"**
- You've hit API quota
- Wait or upgrade plan
- Switch to BLIP-2 temporarily

---

## Architecture

The vision backend system uses the **Strategy Pattern**:

```
ProductAnalyzer (Facade)
    ↓
VisionAnalyzerFactory
    ↓
VisionAnalyzer (Abstract Base)
    ↓
├── ClaudeVisionAnalyzer
├── BLIP2VisionAnalyzer
├── OpenAIVisionAnalyzer
└── GeminiVisionAnalyzer
```

### Adding Custom Backends

1. Create new analyzer in `src/vision/`:
   ```python
   from .base import VisionAnalyzer
   
   class MyCustomAnalyzer(VisionAnalyzer):
       def analyze_images(self, image_folder):
           # Your implementation
           pass
   ```

2. Register in `factory.py`:
   ```python
   ANALYZERS = {
       'claude': ClaudeVisionAnalyzer,
       'my_custom': MyCustomAnalyzer,  # Add here
   }
   ```

3. Configure in `settings.yaml`:
   ```yaml
   vision:
     backend: "my_custom"
     my_custom:
       # Your config
   ```

---

## Best Practices

1. **Start with BLIP-2** for testing (free)
2. **Use Claude/OpenAI** for production (better quality)
3. **Gemini** for high volume (best price)
4. **Monitor costs** when using APIs
5. **Cache results** to avoid re-analysis

---

## Performance Tips

### BLIP-2
- Use GPU if available
- Reduce max_new_tokens for faster processing
- Consider BLIP-2-XL for better quality

### All API Backends
- Process images in batches
- Resize large images before sending
- Use appropriate quality settings

---

**Need Help?** Open an issue or see the main README.md
