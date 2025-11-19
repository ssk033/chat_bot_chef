"use client";

import { useState, useRef, useEffect } from "react";

export default function Page() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
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
      const res = await fetch("/api/query", {
        method: "POST",
        body: JSON.stringify({ message: userInput }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            🍳 Chef Chatbot
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your AI cooking assistant powered by recipe search
          </p>
        </div>

        {/* Chat Messages */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 h-[500px] overflow-y-auto border border-gray-200 dark:border-gray-700">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="text-6xl mb-4">👨‍🍳</div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Ask me about recipes, ingredients, or cooking tips!
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                  Try: "What can I make with chicken and rice?"
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
                        : "bg-gradient-to-br from-orange-100 to-amber-100 dark:from-gray-700 dark:to-gray-600 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1 opacity-90">
                      {m.role === "user" ? "You" : "👨‍🍳 Chef"}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {m.text}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                      <span className="ml-2">Chef is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <input
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Type ingredients or ask for a recipe..."
              disabled={isLoading}
            />
            <button
              onClick={send}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 active:scale-95 transition-all shadow-lg hover:shadow-xl"
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
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 active:scale-95 transition-all shadow-lg hover:shadow-xl"
              >
                ⏹️ Stop
              </button>
            ) : (
              <button
                onClick={playLatestWithBrowserTTS}
                disabled={messages.filter(m => m.role === "bot").length === 0}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-700 hover:to-green-800 active:scale-95 transition-all shadow-lg hover:shadow-xl"
              >
                🔊 Speak
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
            Using browser text-to-speech (free & unlimited) • Press Enter to send
          </p>
        </div>
      </div>
    </div>
  );
}