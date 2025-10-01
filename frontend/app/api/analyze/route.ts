import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const imageUrl = `data:${image.type};base64,${base64}`

    const systemPrompt = `You are an expert product recognition AI. Analyze the uploaded image and identify the product with high accuracy. 

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Product name/title",
  "brand": "Brand name (or 'Unknown' if not visible)",
  "category": "Product category (e.g., Electronics, Clothing, Home & Garden)",
  "confidence": 0.85,
  "searchQueries": ["alternative search term 1", "alternative search term 2", "generic product type"]
}

Focus on:
- Clear, searchable product titles
- Accurate brand identification
- Realistic confidence scores (0.0-1.0)
- 2-4 alternative search queries that would help find this product
- Be specific but use terms that would work well in e-commerce search`

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://productfinder.com',
        'X-Title': 'Product Finder',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'x-ai/grok-4-fast:free',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: systemPrompt + '\n\nPlease analyze this product image and return the JSON response as specified.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter API Error:', response.status, errorText)
      return NextResponse.json({ error: `API request failed: ${response.status}` }, { status: 500 })
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0]) {
      return NextResponse.json({ error: 'Invalid API response' }, { status: 500 })
    }

    let content = data.choices[0].message.content.trim()
    
    // Clean up JSON response
    if (content.startsWith('```json')) {
      content = content.slice(7)
    }
    if (content.endsWith('```')) {
      content = content.slice(0, -3)
    }
    content = content.trim()

    try {
      const result = JSON.parse(content)
      
      // Validate and sanitize result
      const sanitizedResult = {
        title: result.title || 'Product Detected',
        brand: result.brand || 'Unknown',
        category: result.category || 'General',
        confidence: Math.max(0, Math.min(1, parseFloat(result.confidence) || 0.5)),
        searchQueries: Array.isArray(result.searchQueries) ? result.searchQueries : ['product search']
      }

      return NextResponse.json(sanitizedResult)
    } catch (parseError) {
      // Fallback response if JSON parsing fails
      return NextResponse.json({
        title: 'Product Detected',
        brand: 'Unknown',
        category: 'General',
        confidence: 0.5,
        searchQueries: ['product search', 'similar item']
      })
    }

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Server error occurred' }, { status: 500 })
  }
}
