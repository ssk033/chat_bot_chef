"use client";

import { useState, useRef, useEffect } from "react";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { BackgroundGradient } from "@/components/ui/background-gradient";

export default function Page() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [modelStatus, setModelStatus] = useState<{ available: boolean; loading: boolean }>({ available: false, loading: true });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastRequestTime = useRef<number>(0);
  const minRequestInterval = 2000; // Minimum 2 seconds between requests

  // STOP AUDIO PLAYBACK
  function stopAudio() {
    // Stop browser TTS
    window.speechSynthesis.cancel();
    
    // Stop Audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setIsPlaying(false);
    utteranceRef.current = null;
  }

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // Check model status
    fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '__check_model__' })
    }).then(res => res.json()).then(data => {
      // If we get a proper response (not error), model is working
      setModelStatus({ available: !data.error || data.reply?.includes('recipes'), loading: false });
    }).catch(() => {
      setModelStatus({ available: false, loading: false });
    });
    
    // Cleanup: stop audio when component unmounts
    return () => {
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // SEND MESSAGE TO AI
  async function send() {
    if (!input.trim() || isLoading) return;

    // Rate limiting: prevent requests too close together
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    if (timeSinceLastRequest < minRequestInterval) {
      const waitTime = Math.ceil((minRequestInterval - timeSinceLastRequest) / 1000);
      setMessages((prev) => [...prev, { 
        role: "bot", 
        text: `Please wait ${waitTime} second${waitTime > 1 ? 's' : ''} before sending another message.` 
      }]);
      return;
    }

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    const userInput = input;
    setInput("");
    setIsLoading(true);
    lastRequestTime.current = now;

    try {
      // Send conversation history along with current message
      // Map "bot" to "assistant" for backend compatibility
      const conversationHistory = messages.map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text.trim()
      })).filter(m => m.content.length > 0); // Remove empty messages
      
      const res = await fetch("/api/query", {
        method: "POST",
        body: JSON.stringify({ 
          message: userInput,
          history: conversationHistory 
        }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      
      // Update model status if we get a successful response
      if (data.reply && !data.error) {
        setModelStatus({ available: true, loading: false });
      }

      // Handle rate limit errors specifically
      if (res.status === 429) {
        const botMsg = {
          role: "bot",
          text: data.reply || "⚠️ Rate limit reached. Please wait a moment and try again.",
        };
        setMessages((prev) => [...prev, botMsg]);
      } else if (data.error && !data.reply) {
        const botMsg = {
          role: "bot",
          text: `Error: ${data.error}`,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const botMsg = {
          role: "bot",
          text: data.reply || "Sorry, I couldn't generate a response.",
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { 
        role: "bot", 
        text: "Error: Could not get response. Please check your connection and try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  // PLAY LAST BOT RESPONSE USING WEB SPEECH API (Free & Unlimited)
  function playLatestWithBrowserTTS() {
    const lastBot = [...messages].reverse().find((m) => m.role === "bot");
    if (!lastBot) return alert("No bot message to speak.");

    // Stop any ongoing speech
    stopAudio();

    const utterance = new SpeechSynthesisUtterance(lastBot.text);
    utteranceRef.current = utterance;
    
    // Find a nice English voice (prefer Google or natural-sounding ones)
    const englishVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))
    ) || voices.find(v => v.lang.startsWith('en'));
    
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    utterance.rate = 1.0; // Speed
    utterance.pitch = 1.0; // Pitch
    utterance.volume = 1.0; // Volume

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
      alert("Error playing audio");
    };

    window.speechSynthesis.speak(utterance);
  }

  // TTS now uses browser's built-in Web Speech API (no external services needed)

  return (
    <BackgroundBeamsWithCollision className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text text-transparent">
            🍳 Chef Chatbot
          </h1>
          <p className="text-gray-300">
            Your AI cooking assistant powered by recipe search
          </p>
          {/* Model Status Indicator */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {modelStatus.loading ? (
              <span className="text-xs text-gray-400">Checking model...</span>
            ) : modelStatus.available ? (
              <span className="text-xs text-cyan-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
                Google Colab trained model active (1M recipes, 450K examples)
              </span>
            ) : (
              <span className="text-xs text-blue-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Model checking...
              </span>
            )}
          </div>
        </div>

        {/* Chat Messages - Card with Background Gradient */}
        <BackgroundGradient className="rounded-2xl max-w-full p-1 mb-6">
          <div className="bg-black/90 rounded-2xl p-6 h-[500px] overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <div className="text-6xl mb-4">👨‍🍳</div>
                  <p className="text-gray-300 text-lg">
                    Ask me about recipes, ingredients, or cooking tips!
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Try: &quot;What can I make with chicken and rice?&quot;
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        m.role === "user"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-800/80 text-gray-100 rounded-bl-sm border border-gray-700/50"
                      }`}
                    >
                      <div className="font-semibold text-sm mb-1 opacity-90">
                        {m.role === "user" ? "You" : "👨‍🍳 Chef"}
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {m.text.replace(/"/g, '&quot;')}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800/80 rounded-2xl rounded-bl-sm px-4 py-3 border border-gray-700/50">
                      <div className="flex items-center gap-2 text-gray-300">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        </div>
                        <span className="ml-2">Chef is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </BackgroundGradient>

        {/* Input Area - Card with Background Gradient */}
        <BackgroundGradient className="rounded-2xl max-w-full p-1">
          <div className="bg-black/90 rounded-2xl p-4 border border-gray-800/50">
          <div className="flex gap-3">
            <input
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-700 bg-gray-900/50 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type ingredients or ask for a recipe..."
              disabled={isLoading}
            />
            <button
              onClick={send}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-500 hover:to-cyan-500 active:scale-95 transition-all shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                </span>
              ) : (
                "Send"
              )}
            </button>
            {isPlaying ? (
              <button
                onClick={stopAudio}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-500 hover:to-red-600 active:scale-95 transition-all shadow-lg hover:shadow-xl"
              >
                ⏹️ Stop
              </button>
            ) : (
              <button
                onClick={playLatestWithBrowserTTS}
                disabled={messages.filter(m => m.role === "bot").length === 0}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-500 hover:to-emerald-500 active:scale-95 transition-all shadow-lg hover:shadow-xl"
              >
                🔊 Speak
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Using browser text-to-speech (free & unlimited) • Press Enter to send
          </p>
          </div>
        </BackgroundGradient>
      </div>
    </BackgroundBeamsWithCollision>
  );
}