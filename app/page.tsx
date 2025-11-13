"use client";

import { useState, useRef } from "react";

export default function Page() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // SEND MESSAGE TO AI
  async function send() {
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    const userInput = input;
    setInput("");

    const res = await fetch("/api/query", {
      method: "POST",
      body: JSON.stringify({ message: userInput }),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    const botMsg = {
      role: "bot",
      text: data.reply || "Sorry, I couldn't generate a response.",
    };

    setMessages((prev) => [...prev, botMsg]);
  }

  // PLAY LAST BOT RESPONSE AS AUDIO
  async function playLatest() {
    const lastBot = [...messages].reverse().find((m) => m.role === "bot");
    if (!lastBot) return alert("No bot message to speak.");

    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lastBot.text }),
    });

    const data = await res.json();

    if (!data.audioBase64) {
      console.error("TTS response debug:", data);
      return alert("Audio not available. Check server logs.");
    }

    // Base64 → Blob → Audio
    const audioBlob = b64toBlob(data.audioBase64, "audio/mp3");
    const audioUrl = URL.createObjectURL(audioBlob);

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
    } else {
      audioRef.current.src = audioUrl;
    }

    audioRef.current.play();
  }

  // Convert base64 string → Blob
  function b64toBlob(b64Data: string, contentType = "", sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Chef Chatbot</h1>

      <div className="border p-4 h-96 overflow-y-auto rounded mb-4 bg-white/5">
        {messages.map((m, i) => (
          <div key={i} className="mb-3">
            <b className={m.role === "user" ? "text-blue-400" : "text-green-400"}>
              {m.role === "user" ? "You" : "Chef"}:
            </b>{" "}
            {m.text}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border p-2 rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type ingredients or ask for a recipe..."
        />
        <button
          onClick={send}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Send
        </button>
        <button
          onClick={playLatest}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Play
        </button>
      </div>
    </div>
  );
}
