require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const FinancialData = require('./models/FinancialData');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log('Connected to MongoDB cluster securely.'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Multer setup for temporary file storage
const upload = multer({ dest: 'uploads/' });

// Helper to query all data to feed to frontend or Gemini
async function getAllData() {
    const data = await FinancialData.find({}).lean();
    return data.map(doc => ({
        Month: doc.month,
        Date: doc.date,
        Type: doc.type,
        Category: doc.category,
        Department: doc.department,
        Client: doc.client,
        Project: doc.project,
        Description: doc.description,
        Amount: doc.amount,
        Status: doc.status
    }));
}

// Routes

// 1. Upload CSV Route
app.post('/api/upload/:month', upload.single('file'), (req, res) => {
    const month = parseInt(req.params.month);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                await FinancialData.deleteMany({ month: month });

                const docsToInsert = results.map(row => {
                    const getV = (keyMatch) => {
                        const k = Object.keys(row).find(k => k.toLowerCase().trim() === keyMatch.toLowerCase().trim());
                        return k ? row[k] : null;
                    };

                    return {
                        month: month,
                        date: getV('Date'),
                        type: getV('Type'),
                        category: getV('Category'),
                        department: getV('Department'),
                        client: getV('Client'),
                        project: getV('Project'),
                        description: getV('Description'),
                        amount: parseFloat(getV('Amount')) || 0,
                        status: getV('Status')
                    };
                });

                await FinancialData.insertMany(docsToInsert);
                fs.unlinkSync(req.file.path);
                res.json({ message: `Successfully loaded data for month ${month}` });

            } catch (err) {
                console.error("Migration/Upload Error:", err);
                res.status(500).json({ error: err.message });
            }
        });
});

// 2. Fetch Data Route
app.get('/api/data', async (req, res) => {
    try {
        const rows = await getAllData();
        res.json({ data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. AI Query Route
app.post('/api/ask', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is missing' });

    try {
        // Fetch all financial context
        const rows = await getAllData();

        // Convert to compact text for Gemini
        const compactContext = rows.map(r =>
            `M:${r.Month}|D:${r.Date}|T:${r.Type}|C:${r.Category}|Dept:${r.Department}|Amt:${r.Amount}`
        ).join('\n');

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are a financial assistant. Answer questions about the financial data provided.

Financial Data (${rows.length} records):
${rows.length === 0 ? "NO DATA FOUND. Tell the user to upload CSV files." : compactContext}

Schema: M=Month (1-12), D=Date, T=Type (Income/Expense), C=Category, Dept=Department, Amt=Amount.

Instructions:
- Answer based ONLY on the provided financial data.
- Format amounts as currency (₹).
- Be helpful and natural.
- If no data matches, say so politely.
- For breakdowns, list departments/sources with amounts.
- For totals, sum the amounts.

User query: ${query}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        res.json({ answer: responseText });

    } catch (err) {
        console.error("AI Route Error:", err);
        res.status(500).json({ error: "Failed to generate AI response: " + err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});