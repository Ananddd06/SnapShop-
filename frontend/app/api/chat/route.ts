import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message, context, image } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    // Build context-aware system prompt
    const systemPrompt = `You are a helpful AI shopping assistant. You can see and analyze product images and help users with shopping decisions, product information, comparisons, and recommendations.

Key capabilities:
- Analyze product images in detail
- Provide shopping advice and recommendations
- Compare products and suggest alternatives
- Answer questions about product features, pricing, and availability
- Help with product selection based on user needs

Be conversational, helpful, and specific in your responses. If you can see a product image, describe what you observe and provide relevant insights.`

    // Prepare messages for the API
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ]

    // Add context if available
    if (context && context.title) {
      const contextText = `Current product context: ${context.title} by ${context.brand} in ${context.category} category.`
      messages.push({
        role: 'assistant',
        content: `I can see you're looking at: ${contextText}`
      })
    }

    // Add user message with image if available
    const userContent: any[] = [{ type: 'text', text: message }]
    if (image) {
      userContent.push({
        type: 'image_url',
        image_url: { url: image }
      })
    }

    messages.push({
      role: 'user',
      content: userContent.length === 1 ? userContent[0].text : userContent
    })

    // API request
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://productfinder.com',
        'X-Title': 'Product Finder Chat',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'x-ai/grok-4-fast:free',
        messages,
        max_tokens: 800,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Chat API Error:', response.status, errorText)
      return NextResponse.json({ error: 'Chat API failed' }, { status: 500 })
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0]) {
      return NextResponse.json({ error: 'Invalid chat response' }, { status: 500 })
    }

    const reply = data.choices[0].message.content.trim()

    return NextResponse.json({ reply })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 })
  }
}
