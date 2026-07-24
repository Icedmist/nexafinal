export async function generateProductDescription(productName: string, category: string, brandColor?: string) {
  try {
    const res = await fetch("/api/gemini/generate-description", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productName, category, brandColor }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Server error generating description");
    }

    const data = await res.json();
    return data.description || "";
  } catch (error) {
    console.error("Gemini proxy error:", error);
    throw new Error("Failed to generate description");
  }
}
