# Product Finder - AI-Powered Product Recognition

A modern web application that uses AI to identify products from images and provides shopping links across multiple e-commerce platforms.

## Features

- 🔍 **AI Product Recognition** - Upload any product image for instant identification
- 🛒 **Multi-Platform Shopping** - Direct links to Amazon, Flipkart, and Meesho
- 📱 **Mobile-First Design** - Responsive, modern UI with glassmorphism effects
- 📚 **Search History** - Local storage of past searches
- 🌙 **Dark Mode** - Automatic system theme detection
- ⚡ **Real-time Analysis** - Fast API responses with loading states

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **React + TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Framer Motion** (animations)

### Backend
- **Python Flask**
- **OpenRouter API** (Grok Vision model)
- **PIL** (image processing)

## Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp ../.env.example .env
# Edit .env and add your OpenRouter API key
```

4. Run the Flask server:
```bash
python app.py
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## API Configuration

The application uses OpenRouter API with the Grok Vision model. Update the API key in:
- `backend/app.py` (line 12)
- Or set `OPENROUTER_API_KEY` environment variable

## Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
# Deploy to Vercel
```

### Backend (Render/Heroku)
```bash
cd backend
# Deploy Flask app to your preferred platform
```

## Project Structure

```
productfinder/
├── frontend/           # Next.js React app
│   ├── app/           # App router pages
│   ├── components/    # UI components
│   ├── lib/          # Utilities
│   └── hooks/        # Custom hooks
├── backend/           # Flask API
│   ├── app.py        # Main Flask application
│   └── requirements.txt
└── .env.example      # Environment variables template
```

## Usage

1. Upload a clear product image
2. Click "Analyze Product" 
3. View AI-detected product information
4. Click shopping platform buttons to search
5. Use alternative search queries for better results
6. Access search history from the header

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
# SnapShop-
