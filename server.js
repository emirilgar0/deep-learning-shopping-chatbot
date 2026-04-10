import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Entity Extraction için hedef JSON formatı
const SYSTEM_INSTRUCTION = `
Sen bir "entity extraction" aracısın.
Kullanıcı metninden şu alanları çıkar ve SADECE JSON döndür (markdown yok, açıklama yok):

{
  "age": number | null,
  "is_weekend": 0 | 1 | null,
  "time_of_day": "morning" | "afternoon" | "evening" | "night" | null,
  "category": "Books"|"Clothing"|"Cosmetics"|"Food & Beverage"|"Shoes"|"Souvenir"|"Technology"|"Toys"|null,
  "shopping_mall": string | null,
  "payment_method": "Cash"|"Credit Card"|"Debit Card"|null,
  "gender": "Female"|"Male"|null,
  "quantity": number | null,
  "extra_notes": string | null
}

Kurallar:
- Metinde yoksa null ver.
- "hafta sonu" => is_weekend:1, "hafta içi" => 0
- "akşam" => evening, "gece" => night, "sabah" => morning, "öğlen/öğleden sonra" => afternoon
- Kategori Türkçe geçse bile dataset kategorilerine map et (giyim=>Clothing, kozmetik=>Cosmetics, teknoloji=>Technology, kitap=>Books, oyuncak=>Toys, ayakkabı=>Shoes, yiyecek/içecek=>Food & Beverage, hediyelik=>Souvenir)
- AVM adı geçmiyorsa null
`;

// Basit JSON temizleme (model yanlışlıkla ``` koyarsa)
function safeJsonParse(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/g, "")
    .trim();
  return JSON.parse(cleaned);
}

app.post("/extract", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // hızlı/ucuz
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent(text);
    const raw = result.response.text();

    const json = safeJsonParse(raw);
    return res.json(json);
  } catch (err) {
    return res.status(500).json({
      error: "Gemini extract failed",
      detail: String(err?.message || err),
    });
  }
});

app.listen(3000, () => console.log("Server running: http://localhost:3000"));
