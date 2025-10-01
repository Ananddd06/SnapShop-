import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = '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'

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json()

    const systemPrompt = `You are a helpful shopping assistant AI. Help users find products, compare prices, and provide shopping advice. 

If the user asks about a specific product they've analyzed, use the context provided to give relevant information about shopping options, alternatives, or related products.

Keep responses concise, helpful, and focused on shopping and product discovery.`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://productfinder.com',
        'X-Title': 'Product Finder Chat',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'x-ai/grok-4-fast:free',
        messages: [
          {
            role: 'system',
            content: systemPrompt + (context ? `\n\nCurrent product context: ${JSON.stringify(context)}` : '')
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Chat service unavailable' }, { status: 500 })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not process your request.'

    return NextResponse.json({ reply })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Chat service error' }, { status: 500 })
  }
}
