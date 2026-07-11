"use client";
import { useState } from "react";
import { useAuth, SignInButton, UserButton } from "@clerk/nextjs";

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");

  const askAI = async () => {
    if (!question.trim()) return;

    const newHistory = [...history, { role: "User", content: question }];
    setHistory(newHistory);
    setQuestion("");
    setIsLoading(true);

    try {
      const response = await fetch("https://obscure-fiesta-v67p99954773pqxw-8000.app.github.dev/ask", {  
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newHistory[newHistory.length - 1].content }),
      });

      const data = await response.json();
      setHistory([...newHistory, { role: "AI", content: data.answer }]);
    } catch (error) {
      setHistory([...newHistory, { role: "AI", content: "Error connecting to backend." }]);
    }
 
    setIsLoading(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploadStatus("Uploading to AskDocAI...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("https://obscure-fiesta-v67p99954773pqxw-8000.app.github.dev/upload", {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        setUploadStatus("✅ Upload successful! You can now ask questions.");
      } else {
        setUploadStatus("❌ Upload failed. Check the backend terminal.");
      }
    } catch (error) {
      setUploadStatus("❌ Error connecting to backend.");
    }
  };

  // Prevent flicker while Clerk checks auth status
  if (!isLoaded) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-10 font-sans relative">
      
      {/* --- USER PROFILE BUTTON (Top Right) --- */}
      <div className="absolute top-6 right-8">
        {isSignedIn && <UserButton />}
      </div>

      <h1 className="text-4xl font-bold text-blue-500 mb-2">AskDoc AI</h1>
      <p className="text-gray-400 mb-8">Grounded answers from your documents — powered by RAG</p>

      {/* --- WHAT LOGGED OUT USERS SEE --- */}
      {!isSignedIn ? (
        <div className="flex flex-col items-center justify-center mt-20 bg-gray-800 p-10 rounded-lg shadow-xl border border-gray-700">
          <p className="mb-6 text-xl text-gray-300">Please sign in to securely access your documents.</p>
          <SignInButton mode="modal">
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-lg font-bold transition-all">
              Sign In to AskDoc AI
            </button>
          </SignInButton>
        </div>
      ) : (
        /* --- WHAT LOGGED IN USERS SEE --- */
        <>
          <div className="mb-6 flex flex-col items-center justify-center gap-3 w-full max-w-3xl">
            <div className="flex items-center justify-center gap-4">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600 cursor-pointer"
              />
              <button
                onClick={handleUpload}
                disabled={!file}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md disabled:opacity-50 font-semibold transition-all"
              >
                Upload PDF
              </button>
            </div>
            {uploadStatus && <p className="text-sm text-blue-400">{uploadStatus}</p>}
          </div>

          <div className="w-full max-w-3xl bg-gray-800 rounded-lg shadow-xl p-6 mb-6 h-[500px] overflow-y-auto flex flex-col space-y-4">
            {history.length === 0 ? (
              <p className="text-gray-500 text-center mt-auto mb-auto">Type a question below to start.</p>
            ) : (
              history.map((msg, index) => (
                <div key={index} className={`p-4 rounded-lg w-3/4 ${msg.role === "User" ? "bg-blue-600 self-end text-right" : "bg-gray-700 self-start text-left"}`}>
                  <span className="font-bold text-sm opacity-75">{msg.role}</span>
                  <p className="mt-1">{msg.content}</p>
                </div>
              ))
            )}
            {isLoading && <p className="text-gray-400 text-sm italic">AI is thinking...</p>}
          </div>

          <div className="w-full max-w-3xl flex space-x-4">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askAI()}
              placeholder="Ask a question about the data..."
              className="flex-1 bg-gray-700 text-white rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={askAI}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-lg font-bold transition-all"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}