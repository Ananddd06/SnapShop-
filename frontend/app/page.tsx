"use client"

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Search, ExternalLink, History, Sparkles, Camera, ShoppingBag, MessageCircle, Send, X, Plus, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface ProductResult {
  title: string
  brand: string
  category: string
  confidence: number
  searchQueries: string[]
}

interface SearchHistory {
  id: string
  timestamp: number
  image: string
  result: ProductResult
}

const ecommerceLinks = [
  { name: 'Amazon', url: 'https://www.amazon.in/s?k=', color: 'from-orange-500 to-yellow-500' },
  { name: 'Flipkart', url: 'https://www.flipkart.com/search?q=', color: 'from-blue-500 to-indigo-500' },
  { name: 'Meesho', url: 'https://www.meesho.com/search?q=', color: 'from-pink-500 to-purple-500' }
]

export default function ProductFinder() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<ProductResult | null>(null)
  const [history, setHistory] = useState<SearchHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('productFinderHistory')
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory))
    }
  }, [])

  // Save history to localStorage
  const saveToHistory = (image: string, result: ProductResult) => {
    const newEntry: SearchHistory = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      image,
      result
    }
    const updatedHistory = [newEntry, ...history].slice(0, 10)
    setHistory(updatedHistory)
    localStorage.setItem('productFinderHistory', JSON.stringify(updatedHistory))
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      })
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string)
      setResult(null)
      setChatMessages([])
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        processFile(file)
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive"
        })
      }
    }
  }

  const analyzeImage = async () => {
    if (!selectedImage) return

    setIsAnalyzing(true)
    try {
      const response = await fetch(selectedImage)
      const blob = await response.blob()
      
      const formData = new FormData()
      formData.append('image', blob, 'image.jpg')

      const apiResponse = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      })

      if (!apiResponse.ok) {
        throw new Error('Analysis failed')
      }

      const data = await apiResponse.json()
      setResult(data)
      saveToHistory(selectedImage, data)
      
      // Add welcome message to chat
      setChatMessages([{
        role: 'assistant',
        content: `I've analyzed your image and found "${data.title}" by ${data.brand}. Feel free to ask me anything about this product - features, pricing, alternatives, or where to buy it!`
      }])
      
      toast({
        title: "Analysis Complete!",
        description: `Found: ${data.title} with ${Math.round(data.confidence * 100)}% confidence`
      })
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Please try again with a different image",
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsChatLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: result,
          image: selectedImage
        })
      })

      const data = await response.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const openEcommerceSearch = (platform: string, query: string) => {
    const link = ecommerceLinks.find(e => e.name === platform)
    if (link) {
      window.open(link.url + encodeURIComponent(query), '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Product Finder
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">AI-Powered Recognition</p>
            </div>
          </motion.div>
          <Button
            variant="ghost"
            onClick={() => setShowHistory(!showHistory)}
            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <History className="w-5 h-5 mr-2" />
            History ({history.length})
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-8">
        {/* Upload Section */}
        <div className="mb-8">
          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-xl">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3">
                <Camera className="w-6 h-6 text-purple-500" />
                Upload Product Image
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Drag & drop or click to upload a clear product image
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedImage ? (
                <motion.div 
                  className="space-y-6"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="relative group">
                    <img
                      src={selectedImage}
                      alt="Selected product"
                      className="max-w-full max-h-80 mx-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={analyzeImage}
                      disabled={isAnalyzing}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex-1 h-12 rounded-xl font-semibold"
                    >
                      {isAnalyzing ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 mr-2"
                        >
                          <Search className="w-5 h-5" />
                        </motion.div>
                      ) : (
                        <Search className="w-5 h-5 mr-2" />
                      )}
                      {isAnalyzing ? 'Analyzing...' : 'Analyze Product'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-12 px-6 rounded-xl"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Change
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                    isDragOver 
                      ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 scale-105' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="space-y-6">
                    <motion.div
                      animate={{ 
                        y: isDragOver ? -10 : 0,
                        scale: isDragOver ? 1.1 : 1 
                      }}
                      className="relative"
                    >
                      <div className="p-6 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 w-fit mx-auto">
                        <Upload className="w-12 h-12 text-purple-500" />
                      </div>
                    </motion.div>
                    <div className="space-y-2">
                      <p className="text-gray-900 dark:text-white font-semibold text-lg">
                        {isDragOver ? 'Drop your image here!' : 'Drop image here or click to browse'}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        Supports PNG, JPG, WEBP up to 5MB
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </div>

        {/* Product Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-gray-200 dark:border-gray-700">
                  <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3">
                    <ShoppingBag className="w-6 h-6 text-green-500" />
                    Product Identified
                    <div className="ml-auto flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      {Math.round(result.confidence * 100)}% Match
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{result.title}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Brand</p>
                        <p className="text-gray-900 dark:text-white font-semibold">{result.brand}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Category</p>
                        <p className="text-gray-900 dark:text-white font-semibold">{result.category}</p>
                      </div>
                    </div>
                  </div>

                  {/* E-commerce Links */}
                  <div className="space-y-4">
                    <h4 className="text-gray-900 dark:text-white font-semibold text-lg flex items-center gap-2">
                      <ExternalLink className="w-5 h-5" />
                      Shop Now
                    </h4>
                    <div className="grid gap-3">
                      {ecommerceLinks.map((platform, index) => (
                        <motion.div
                          key={platform.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Button
                            onClick={() => openEcommerceSearch(platform.name, result.title)}
                            className={`w-full bg-gradient-to-r ${platform.color} hover:opacity-90 text-white h-12 rounded-xl font-semibold shadow-lg transition-all hover:scale-105`}
                          >
                            <ExternalLink className="w-5 h-5 mr-3" />
                            Search on {platform.name}
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Search Queries */}
                  {result.searchQueries.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Alternative Searches
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {result.searchQueries.map((query, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEcommerceSearch('Amazon', query)}
                              className="rounded-lg"
                            >
                              {query}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Messages */}
        <div className="flex-1 mb-4">
          {chatMessages.length > 0 && (
            <div className="space-y-4 max-h-96 overflow-y-auto chat-scroll">
              {chatMessages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex items-start gap-3 max-w-[80%]">
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`p-4 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md shadow-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isChatLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl rounded-bl-md shadow-sm">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ChatGPT-style Input at Bottom */}
      <div className="sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendChatMessage()
                  }
                }}
                placeholder={selectedImage ? "Ask me about this product..." : "Upload an image first to start chatting"}
                disabled={!selectedImage}
                rows={1}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              {selectedImage && (
                <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            <Button
              onClick={sendChatMessage}
              disabled={!chatInput.trim() || isChatLoading || !selectedImage}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          
          {!selectedImage && (
            <div className="text-center mt-3">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                💡 Upload a product image above to start a visual conversation with AI!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
