"""
AgriMitra ML Microservice
--------------------------
Sirf ek kaam: crop recommendation model ko serve karna.
Node.js backend (server/) is service ko internally call karega.

Run: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
import numpy as np
import pickle
import os

BASE_DIR = os.path.dirname(__file__)
model = pickle.load(open(os.path.join(BASE_DIR, "lightgbm_model.pkl"), "rb"))
# NOTE: the model was trained using StandardScaler-scaled features
# (verified against the original training CSV) — NOT MinMaxScaler.
# Using the wrong scaler here caused every prediction to collapse to
# the same 2-3 crops regardless of input.
ss = pickle.load(open(os.path.join(BASE_DIR, "standardscaler.pkl"), "rb"))

app = FastAPI(title="AgriMitra ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Node backend hi isse baat karega, isliye locked down bhi kar sakte ho later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

crop_icons = {
    "rice": "🌾", "maize": "🌽", "jute": "🧵", "cotton": "☁️", "coconut": "🥥",
    "papaya": "🍈", "orange": "🍊", "apple": "🍎", "muskmelon": "🍈",
    "watermelon": "🍉", "grapes": "🍇", "mango": "🥭", "banana": "🍌",
    "pomegranate": "🍎", "lentil": "🫘", "blackgram": "🫘", "mungbean": "🫘",
    "mothbeans": "🫘", "pigeonpeas": "🫘", "kidneybeans": "🫘",
    "chickpea": "🫘", "coffee": "☕",
}


class RecommendationRequest(BaseModel):
    nitrogen: float = Field(..., ge=0)
    phosphorus: float = Field(..., ge=0)
    potassium: float = Field(..., ge=0)
    temperature: float
    humidity: float = Field(..., ge=0, le=100)
    ph: float = Field(..., ge=0, le=14)
    rainfall: float = Field(..., ge=0)


class CropRecommendation(BaseModel):
    name: str
    suitabilityScore: float
    profitCategory: str
    icon: str


@app.get("/")
def read_root():
    return {"message": "AgriMitra ML service is running", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=List[CropRecommendation])
def predict(data: RecommendationRequest):
    try:
        features = np.array([[
            data.nitrogen, data.phosphorus, data.potassium,
            data.temperature, data.humidity, data.ph, data.rainfall,
        ]])
        scaled = ss.transform(features)
        probs = model.predict_proba(scaled)[0]
        top_indices = np.argsort(probs)[::-1][:3]

        results = []
        for idx in top_indices:
            # model.classes_ already holds the crop name strings in the
            # exact order predict_proba returns them (alphabetical) —
            # use this directly instead of any manual index->name mapping.
            crop_name_raw = model.classes_[idx]
            crop_name = crop_name_raw.capitalize()
            score = float(probs[idx]) * 100
            results.append({
                "name": crop_name,
                "suitabilityScore": round(score, 2),
                "profitCategory": "High" if score > 60 else ("Medium" if score > 30 else "Low"),
                "icon": crop_icons.get(crop_name_raw.lower(), "🌱"),
            })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
