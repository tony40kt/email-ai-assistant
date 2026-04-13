# Email AI Assistant

AI-powered email management assistant with cloud deployment

## 免費手機AI助理 – Free Mobile AI Email Assistant

A free, mobile-first AI assistant for managing emails. Powered by [Google Gemini](https://aistudio.google.com/) (free tier).

### Features

| Feature | Description |
|---|---|
| ✍️ **Compose** | Generate professional emails from a subject and brief context |
| 📋 **Summarize** | Get a concise bullet-point summary of any email |
| ↩️ **Smart Reply** | Auto-generate a context-aware reply |
| ⭐ **Improve** | Polish your existing draft for clarity and professionalism |

- 🌍 Multi-language support (English, Traditional/Simplified Chinese, Japanese, Spanish, French)
- 🌙 Dark/light mode
- 📱 PWA-ready – installable on Android & iOS
- 🔒 Rate-limited API to prevent abuse
- ☁️ Ready for cloud deployment (Railway, Render, Fly.io, etc.)

---

## Quick Start

### 1. Get a free Gemini API key

Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and create a free API key.

### 2. Clone & install

```bash
git clone https://github.com/tony40kt/email-ai-assistant.git
cd email-ai-assistant
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY
```

### 4. Run

```bash
npm start
# Open http://localhost:3000 in your browser
```

For development with auto-reload:

```bash
npm run dev
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & config status |
| `POST` | `/api/compose` | Generate an email |
| `POST` | `/api/summarize` | Summarize an email |
| `POST` | `/api/reply` | Generate a reply |
| `POST` | `/api/improve` | Improve a draft |

### Example: Compose

```bash
curl -X POST http://localhost:3000/api/compose \
  -H 'Content-Type: application/json' \
  -d '{"subject":"Request time off","tone":"professional","language":"English"}'
```

---

## Deployment

### Railway / Render / Fly.io

1. Push this repo to GitHub
2. Connect to your preferred platform
3. Set the `GEMINI_API_KEY` environment variable
4. Deploy – the `npm start` command is used automatically

### Docker (optional)

```bash
docker build -t email-ai-assistant .
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key email-ai-assistant
```

---

## Running Tests

```bash
npm test
```

---

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JS (mobile-first, PWA)
- **AI**: Google Gemini 1.5 Flash (free tier)
- **Rate limiting**: express-rate-limit

## License

MIT
