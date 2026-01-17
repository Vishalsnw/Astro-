const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

app.post('/api/astrology', async (req, res) => {
    try {
        const { name, dob, time, place, gender, question } = req.body;
        
        if (!process.env.DEEPSEEK_API_KEY) {
            return res.status(500).json({ error: 'DeepSeek API Key is missing' });
        }

        const prompt = `You are a professional Vedic Astrologer.
Birth Details:
Name: ${name}
Date of Birth: ${dob}
Time of Birth: ${time}
Place of Birth: ${place}
Gender: ${gender}

User's Question: ${question}

Please provide a detailed analysis in three parts:
1. Kundli Overview (Personality, Strengths, Weaknesses)
2. Life Analysis (Focused on the user's question)
3. Remedies & Solutions (Practical and spiritual guidance)

Keep the tone encouraging and non-fear-based.`;

        const response = await axios.post(DEEPSEEK_API_URL, {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'You are a professional Vedic Astrologer.' },
                { role: 'user', content: prompt }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 seconds timeout
        });

        res.json({ result: response.data.choices[0].message.content });
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'Astrological consultation failed. Please try again later.',
            details: error.response?.data || error.message
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Astro Guru server running on port ${PORT}`);
});
