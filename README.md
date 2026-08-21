# 🌾 AgriMitra — AI-Powered Crop Recommendation Platform

AgriMitra helps Indian farmers choose the right crop for their land using a machine learning model trained on soil nutrients (N, P, K), soil pH, and climate data (temperature, humidity, rainfall). Farmers get personalised top-3 crop suggestions, can commit a suggestion to a specific number of their fields, and track everything from a live dashboard.

---

## ✨ Features

- 🔐 **Authentication** — secure signup/login with JWT sessions and hashed passwords
- 🌱 **Crop Recommendation** — ML-powered top-3 suggestions from 7 soil/climate inputs
- ✅ **Guided Crop Selection** — pick one of the 3 suggested crops and assign it to a number of fields, validated against the farmer's registered field count
- 📊 **Live Dashboard** — profile, fields, active crop, and full recommendation history, all pulled from the database
- 🌗 **Light / Dark Theme** — persisted across sessions
- 🌐 **Hindi Translation** — one-click page translation via Google's free website-translator widget
- 📱 **Responsive UI** — same design system across all pages

---

## 🏗️ Architecture

```
┌──────────────┐      REST API       ┌───────────────┐      internal call     ┌──────────────────┐
│   Frontend    │ ──────────────────▶│  Node/Express   │ ──────────────────────▶│  Python FastAPI    │
│ (HTML/CSS/JS) │ ◀────────────────── │  (Auth + DB)    │ ◀────────────────────── │  (LightGBM model)  │
└──────────────┘      JSON            └───────┬────────┘        JSON            └──────────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  MongoDB     │
                                        └─────────────┘
```

Why two backends? Node/Express handles auth, database, and business logic — familiar MERN territory. The `.pkl` ML model (LightGBM + scikit-learn) can only run in Python, so it's isolated into a small, single-purpose FastAPI microservice that Node calls internally. This keeps the ML layer swappable (retrain/replace the model anytime) without touching the rest of the app.

---

## 📁 Project Structure

```
agrimitra/
├── ml-service/              # Python FastAPI — serves the crop recommendation model
│   ├── main.py
│   ├── requirements.txt
│   ├── lightgbm_model.pkl
│   └── standardscaler.pkl
│
├── server/                  # Node.js/Express — auth, MongoDB, dashboard, ML proxy
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── config/db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Field.js
│   │   └── Recommendation.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── fields.js
│   │   ├── recommend.js
│   │   └── dashboard.js
│   └── middleware/auth.js
│
└── frontend/                 # Static HTML/CSS/JS
    ├── index.html            # Home + crop/disease tools
    ├── about.html
    ├── dashboard.html
    ├── login.html
    ├── signup.html
    ├── style.css
    └── script.js
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (custom design system), Vanilla JS |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| ML Service | Python, FastAPI, LightGBM, scikit-learn |
| Auth | JWT, bcrypt |
| Translation | Google Website Translator (free, no API key) |

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.11 or 3.12** (avoid brand-new releases like 3.14 — ML packages may lack pre-built wheels)
- **Node.js LTS** (18+)
- **MongoDB** running locally or a MongoDB Atlas connection string
- VS Code + **Live Server** extension (for the frontend)

### 1. Clone / extract the project
```bash
cd agrimitra
```

### 2. Start the ML microservice
```bash
cd ml-service
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
Runs at **http://localhost:8000**. Verify: open the URL in a browser — you should see `{"message": "AgriMitra ML service is running"}`.

### 3. Start the Node/Express backend
```bash
cd server
npm install
cp .env.example .env     # Windows: copy .env.example .env
```
Edit `.env` and set `MONGO_URI` and `JWT_SECRET`.
```bash
npm run dev     # or: npm start
```
Runs at **http://localhost:5000**.

### 4. Launch the frontend
Open `frontend/index.html` with VS Code's **Live Server** (right-click → *Open with Live Server*). Runs at **http://127.0.0.1:5500** by default.

> Keep all three running simultaneously — the frontend calls the Node API, which calls the ML service.

---

## 🔑 Environment Variables (`server/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Node server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/agrimitra` |
| `JWT_SECRET` | Secret for signing JWTs | any long random string |
| `ML_SERVICE_URL` | FastAPI service base URL | `http://127.0.0.1:8000` |
| `CLIENT_ORIGIN` | Allowed CORS origin for the frontend | `http://127.0.0.1:5500` |

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | – | Create account (sets total field count) |
| POST | `/api/auth/login` | – | Login, returns JWT |
| GET | `/api/dashboard` | ✅ | Profile + fields + recommendation history |
| PUT | `/api/dashboard/profile` | ✅ | Update profile details |
| GET | `/api/fields` | ✅ | List the farmer's registered fields |
| PUT | `/api/fields/:id` | ✅ | Update a field's name/area |
| POST | `/api/recommend` | ✅ | Submit soil/climate data → get top-3 crops |
| POST | `/api/recommend/:id/select` | ✅ | Confirm a chosen crop + field count |
| GET | `/api/recommend/history` | ✅ | Past recommendations |
| POST | `/predict` (ML service) | – | Raw model inference (called internally by Node) |

All authenticated routes require `Authorization: Bearer <token>`.

---

## 🧪 Testing the Recommendation Flow

Sample values known to predict **Rice** with high confidence (from the training data):

| N | P | K | Temperature | Humidity | pH | Rainfall |
|---|---|---|---|---|---|---|
| 80 | 48 | 40 | 24°C | 82% | 6.4 | 236 mm |

> ⚠️ The trained dataset covers 22 crops (rice, maize, chickpea, kidney beans, pigeon peas, moth beans, mung bean, black gram, lentil, pomegranate, banana, mango, grapes, watermelon, muskmelon, apple, orange, papaya, coconut, cotton, jute, coffee).
---

## ⚠️ Known Limitations
- Google Translate widget requires an internet connection (loads from `translate.google.com`).

---

## 🩺 Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'fastapi'` | venv not activated, or packages installed outside it | Recreate venv, confirm `(venv)` shows in prompt, re-run `pip install -r requirements.txt` |
| `numpy` build fails during `pip install` | Python version too new (e.g. 3.14) lacks pre-built wheels | Use Python 3.11/3.12 |
| `Cannot find module 'dotenv'` | `npm install` wasn't run in `server/` | `cd server && npm install` |
| Recommendations always return the same 2–3 crops | Wrong scaler used | Fixed — service now uses `standardscaler.pkl`, not `minmaxscaler_1.pkl` |
| `ML service is not running` error from Node | FastAPI service isn't started | Start it: `cd ml-service && python main.py` |

---

## 📄 License

For educational/personal project use. Update this section with your preferred license before publishing publicly.

---

## 🙌 Credits

Built by the AgriMitra team — combining agronomy expertise with machine learning to support Indian farmers.
