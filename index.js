const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const PDFDocument = require('pdfkit');
const fs = require('fs');

app.post('/api/astrology', async (req, res) => {
    try {
        const { name, dob, time, place, gender, question } = req.body;
        
        if (!process.env.DEEPSEEK_API_KEY) {
            return res.status(500).json({ error: 'DeepSeek API Key is missing' });
        }

        const prompt = `You are a professional Vedic Astrologer. 
Format your response as a professional report with the following structure:
1. ✨ KUNDLI DIAGRAM: Generate a text-based representation of the North Indian style Diamond Chart (Lagna Chart). Represent the 12 houses and place the planets based on the birth details provided.
2. 📖 CHART EXPLANATION: Detailed explanation of the planetary positions and what they mean for the user.
3. 🎯 FOCUS ON QUESTION: Directly answer the user's specific concern: "${question}".
4. 🪔 REMEDIES: Specific behavioral, practical, and spiritual solutions to achieve the desired outcome or solve the problem.

Birth Details:
Name: ${name}, DOB: ${dob}, Time: ${time}, Place: ${place}, Gender: ${gender}

Keep the tone professional, encouraging, and detailed. Use clear headings.`;

        const response = await axios.post(DEEPSEEK_API_URL, {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'You are a professional Vedic Astrologer providing structured reports.' },
                { role: 'user', content: prompt }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000
        });

        const reportContent = response.data.choices[0].message.content;

        // Generate PDF
        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            let pdfData = Buffer.concat(buffers);
            res.json({ 
                result: reportContent,
                pdf: pdfData.toString('base64')
            });
        });

        doc.fontSize(20).text('Astro Guru - Astrological Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Name: ${name}`);
        doc.text(`Birth Details: ${dob}, ${time}, ${place}`);
        doc.moveDown();
        doc.text(reportContent);
        doc.end();

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
