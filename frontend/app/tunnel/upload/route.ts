import { NextResponse } from 'next/server';

// This lets us test if the route is awake by just visiting the URL!
export async function GET() {
  return NextResponse.json({ message: "THE TUNNEL IS AWAKE!" });
}

export async function POST(request: Request) {
  console.log("🔥 Next.js received the file! Forwarding to Render...");
  
  try {
    const formData = await request.formData();
    
    const response = await fetch("https://enterprise-rag-system-2lqh.onrender.com/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.log("❌ Render rejected the file with status:", response.status);
      return NextResponse.json({ error: "Backend rejected it" }, { status: response.status });
    }

    const data = await response.json();
    console.log("✅ Render processed it successfully!");
    return NextResponse.json(data);
    
  } catch (error) {
    console.log("❌ Next.js could not reach Render.");
    return NextResponse.json({ error: "Connection failed" }, { status: 500 });
  }
}
