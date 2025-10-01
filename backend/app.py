from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import base64
import json
import os
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# Insert your OpenRouter API key here
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')

def encode_image_to_base64(image_file):
    """Convert uploaded image to base64 string"""
    try:
        # Open and process the image
        image = Image.open(image_file)
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if too large (max 1024x1024 for API efficiency)
        if image.width > 1024 or image.height > 1024:
            image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        
        # Convert to base64
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=85)
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return f"data:image/jpeg;base64,{image_base64}"
    except Exception as e:
        raise Exception(f"Error processing image: {str(e)}")

@app.route('/analyze', methods=['POST'])
def analyze_product():
    try:
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({'error': 'No image file selected'}), 400
        
        # Convert image to base64
        image_base64 = encode_image_to_base64(image_file)
        
        # System prompt for product recognition
        system_prompt = """You are an expert product recognition AI. Analyze the uploaded image and identify the product with high accuracy. 

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
- Be specific but use terms that would work well in e-commerce search"""

        # Prepare the API request
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer": "https://productfinder.com",
            "X-Title": "Product Finder",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "x-ai/grok-vision-beta",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": system_prompt + "\n\nPlease analyze this product image and return the JSON response as specified."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_base64
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500,
            "temperature": 0.1
        }
        
        print(f"Making API request to OpenRouter...")
        
        # Make API call to OpenRouter
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print(f"API Response Status: {response.status_code}")
        print(f"API Response: {response.text}")
        
        if response.status_code != 200:
            return jsonify({'error': f'API request failed: {response.status_code} - {response.text}'}), 500
        
        # Parse the response
        api_response = response.json()
        
        if 'choices' not in api_response or not api_response['choices']:
            return jsonify({'error': 'Invalid API response format'}), 500
        
        # Extract the content
        content = api_response['choices'][0]['message']['content'].strip()
        
        # Try to parse as JSON
        try:
            # Clean up the content (remove markdown code blocks if present)
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            result = json.loads(content)
            
            # Validate required fields
            required_fields = ['title', 'brand', 'category', 'confidence', 'searchQueries']
            for field in required_fields:
                if field not in result:
                    return jsonify({'error': f'Missing required field: {field}'}), 500
            
            # Ensure confidence is a float between 0 and 1
            result['confidence'] = max(0.0, min(1.0, float(result['confidence'])))
            
            # Ensure searchQueries is a list
            if not isinstance(result['searchQueries'], list):
                result['searchQueries'] = []
            
            return jsonify(result)
            
        except json.JSONDecodeError as e:
            # If JSON parsing fails, create a fallback response
            return jsonify({
                'title': 'Product Detected',
                'brand': 'Unknown',
                'category': 'General',
                'confidence': 0.5,
                'searchQueries': ['product search', 'similar item']
            })
    
    except Exception as e:
        print(f"Error in analyze_product: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Product Finder API is running'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
