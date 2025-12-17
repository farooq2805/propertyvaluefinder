import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PropertyDetails, ValuationResult } from '../types';

export const getPropertyValuation = async (details: PropertyDetails): Promise<ValuationResult> => {
  const apiKey = process.env.API_KEY || 'FAKE_API_KEY_FOR_DEVELOPMENT';
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Act as a senior Real Estate Analyst for the Indian market, specializing in ${details.city} and specifically the ${details.locality} area (Pincode: ${details.pincode}).
    
    Calculate a detailed property valuation based on the following parameters:
    - Type: ${details.propertyType}
    - Configuration: ${details.bhk} BHK
    - Area: ${details.area} sq ft
    - Floor Details: ${details.floor ? `Located on floor ${details.floor} of ${details.totalFloors}` : 'N/A'}
    - Age: ${details.ageOfProperty} years
    - Furnishing: ${details.furnishing}
    - Possession: ${details.possession}

    Provide a realistic market value range (Min and Max) in INR (Indian Rupees).
    Also provide historical price trends for this locality for the last 5 years.
    Give 3-4 bullet points of location insights specific to this pincode/locality (e.g., proximity to metro, schools, upcoming infra).
    Determine the market sentiment (Bullish/Bearish/Neutral).
    Confidence score based on data availability for this area (0-100).

    IMPORTANT: If the pincode or locality doesn't perfectly match known data, infer from the nearest known major locality in ${details.city}.
    The price should reflect current market rates in 2024-2025.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      minPrice: { type: Type.NUMBER, description: "Minimum estimated price in INR" },
      maxPrice: { type: Type.NUMBER, description: "Maximum estimated price in INR" },
      currency: { type: Type.STRING, description: "Currency symbol, usually Ã¢ÂÂ¹ or INR" },
      avgPricePerSqFt: { type: Type.NUMBER, description: "Average price per square foot in INR" },
      trends: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.STRING },
            price: { type: Type.NUMBER, description: "Average price per sq ft for that year" }
          }
        }
      },
      locationInsights: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      marketSentiment: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Neutral'] },
      confidenceScore: { type: Type.NUMBER }
    },
    required: ['minPrice', 'maxPrice', 'avgPricePerSqFt', 'trends', 'locationInsights', 'marketSentiment', 'confidenceScore']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response generated");

    return JSON.parse(text) as ValuationResult;
  } catch (error) {
    console.error("Valuation Service Error:", error);
    throw error;
  }
};