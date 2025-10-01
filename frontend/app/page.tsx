"use client"

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Search, ExternalLink, History, Sparkles, Camera, ShoppingBag, MessageCircle, Send } from 'lucide-react'
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
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

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
    const updatedHistory = [newEntry, ...history].slice(0, 10) // Keep only last 10
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
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
      // Reset chat when new image is uploaded
      setChatMessages([])
      setShowChat(false)
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
      
      // Auto-open chat and add welcome message
      setShowChat(true)
      setChatMessages([{
        role: 'assistant',
        content: `I can see you've uploaded an image of "${data.title}" by ${data.brand}. I'm ready to help you with any questions about this product! You can ask me about features, pricing, alternatives, or where to buy it.`
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
          image: selectedImage // Pass the uploaded image to chat
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Glassmorphism Header */}
      <header className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-50 shadow-2xl">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-75"></div>
              <div className="relative p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Product Finder
              </h1>
              <p className="text-sm text-gray-400">AI-Powered Recognition</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-3"
          >
            <Button
              variant="ghost"
              onClick={() => setShowChat(!showChat)}
              className="text-white hover:bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Chat AI
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowHistory(!showHistory)}
              className="text-white hover:bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-6"
            >
              <History className="w-5 h-5 mr-2" />
              History ({history.length})
            </Button>
          </motion.div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-white flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  Upload Product Image
                </CardTitle>
                <CardDescription className="text-gray-300 text-base">
                  Drag & drop or click to upload a clear product image
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {selectedImage ? (
                  <motion.div 
                    className="space-y-6"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                      <img
                        src={selectedImage}
                        alt="Selected product"
                        className="relative max-w-full max-h-80 mx-auto rounded-2xl shadow-2xl border border-white/20"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={analyzeImage}
                        disabled={isAnalyzing}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex-1 h-12 rounded-xl font-semibold shadow-lg"
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
                        {isAnalyzing ? 'Analyzing Magic...' : 'Analyze Product'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-white/20 text-white hover:bg-white/10 backdrop-blur-sm h-12 px-6 rounded-xl"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Change
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                      isDragOver 
                        ? 'border-purple-400 bg-purple-500/10 scale-105' 
                        : 'border-white/20 hover:border-white/40 hover:bg-white/5'
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
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur opacity-50"></div>
                        <div className="relative p-6 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/20 w-fit mx-auto">
                          <Upload className="w-12 h-12 text-white" />
                        </div>
                      </motion.div>
                      <div className="space-y-2">
                        <p className="text-white font-semibold text-lg">
                          {isDragOver ? 'Drop your image here!' : 'Drop image here or click to browse'}
                        </p>
                        <p className="text-gray-400">
                          Supports PNG, JPG, WEBP up to 5MB
                        </p>
                        <div className="flex items-center justify-center gap-4 mt-4">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            AI Powered
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            Instant Results
                          </div>
                        </div>
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
          </motion.div>

          {/* Results Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ type: "spring", damping: 20 }}
                >
                  <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-white/10">
                      <CardTitle className="text-white flex items-center gap-3 text-xl">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                          <ShoppingBag className="w-6 h-6 text-white" />
                        </div>
                        Product Identified
                        <div className="ml-auto flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          {Math.round(result.confidence * 100)}% Match
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-white leading-tight">{result.title}</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-gray-400 text-sm">Brand</p>
                            <p className="text-white font-semibold">{result.brand}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-gray-400 text-sm">Category</p>
                            <p className="text-white font-semibold">{result.category}</p>
                          </div>
                        </div>
                      </div>

                      {/* E-commerce Links */}
                      <div className="space-y-4">
                        <h4 className="text-white font-semibold text-lg flex items-center gap-2">
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
                          <h4 className="text-white font-semibold flex items-center gap-2">
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
                                  className="border-white/20 text-white hover:bg-white/10 backdrop-blur-sm rounded-lg"
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

            {/* Chat Panel */}
            <AnimatePresence>
              {showChat && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl">
                    <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/10">
                      <CardTitle className="text-white flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                          <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        AI Shopping Assistant
                        {selectedImage && (
                          <div className="ml-auto flex items-center gap-2 text-sm text-gray-300">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Image Loaded
                          </div>
                        )}
                      </CardTitle>
                      <CardDescription className="text-gray-300">
                        {selectedImage 
                          ? "Ask me anything about the uploaded product image!" 
                          : "Upload an image first to start a visual conversation"
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Image Preview in Chat */}
                        {selectedImage && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
                          >
                            <img
                              src={selectedImage}
                              alt="Current product"
                              className="w-12 h-12 rounded-lg object-cover border border-white/20"
                            />
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">
                                {result?.title || "Product Image Loaded"}
                              </p>
                              <p className="text-gray-400 text-xs">
                                I can see this image and answer questions about it
                              </p>
                            </div>
                          </motion.div>
                        )}

                        {/* Chat Messages */}
                        <div className="h-80 overflow-y-auto space-y-4 p-4 bg-white/5 rounded-xl border border-white/10 chat-scroll">
                          {chatMessages.length === 0 ? (
                            <div className="text-center text-gray-400 py-12">
                              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                              {selectedImage ? (
                                <div className="space-y-2">
                                  <p className="text-lg font-medium">Ready to chat about your image!</p>
                                  <p className="text-sm">Try asking:</p>
                                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                                    {[
                                      "What is this product?",
                                      "Where can I buy this?",
                                      "What are similar products?",
                                      "Tell me about this item"
                                    ].map((suggestion, i) => (
                                      <button
                                        key={i}
                                        onClick={() => setChatInput(suggestion)}
                                        className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-colors border border-white/20"
                                      >
                                        {suggestion}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-lg">Upload an image to start chatting!</p>
                                  <p className="text-sm">I can help you identify products, compare prices, and answer shopping questions.</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            chatMessages.map((msg, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className="flex items-start gap-3 max-w-[85%]">
                                  {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                                      <MessageCircle className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                  <div
                                    className={`p-4 rounded-2xl ${
                                      msg.role === 'user'
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-md'
                                        : 'bg-white/10 text-gray-100 border border-white/20 rounded-bl-md'
                                    }`}
                                  >
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                  </div>
                                  {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1">
                                      <span className="text-white text-xs font-bold">U</span>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            ))
                          )}
                          {isChatLoading && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex justify-start"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                  <MessageCircle className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-white/10 border border-white/20 p-4 rounded-2xl rounded-bl-md">
                                  <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                        
                        {/* Chat Input */}
                        <div className="flex gap-3">
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                              placeholder={selectedImage ? "Ask me about this product..." : "Upload an image first to chat"}
                              disabled={!selectedImage}
                              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            {selectedImage && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={sendChatMessage}
                            disabled={!chatInput.trim() || isChatLoading || !selectedImage}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed h-12"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {!selectedImage && (
                          <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                            <p className="text-yellow-300 text-sm">
                              💡 Upload a product image above to start a visual conversation with AI!
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* History Panel */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white">Search History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {history.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No searches yet</p>
                      ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {history.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                              onClick={() => {
                                setSelectedImage(item.image)
                                setResult(item.result)
                              }}
                            >
                              <img
                                src={item.image}
                                alt="History item"
                                className="w-12 h-12 rounded object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{item.result.title}</p>
                                <p className="text-gray-400 text-sm">
                                  {new Date(item.timestamp).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
