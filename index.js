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
        const { name, dob, time, place, gender, question, language = 'English' } = req.body;
        
        if (!process.env.DEEPSEEK_API_KEY) {
            return res.status(500).json({ error: 'DeepSeek API Key is missing' });
        }

        const prompt = `You are a professional Vedic Astrologer. 
Format your response as a professional report in ${language} language with the following structure:

1. ✨ KUNDLI INSIGHTS: Provide a deep analysis of the user's birth chart. Focus on their soul purpose and planetary strengths.
2. 📖 CHART EXPLANATION: Detailed explanation of the planetary positions and what they mean for the user.
3. 🎯 FOCUS ON QUESTION: Directly address the user's specific concern: "${question}". Provide a summarized answer here.
4. [LOCKED] 💎 PREMIUM GUIDANCE & REMEDIES: This section contains the most powerful remedies, precise calculations, and life-changing solutions. In the text response, mention that "The sacred remedies and full detailed analysis are available in your Premium PDF Report. Unlock it now to reveal the path to your success."

Birth Details:
Name: ${name}, DOB: ${dob}, Time: ${time}, Place: ${place}, Gender: ${gender}

IMPORTANT:
- The entire response MUST be in ${language}.
- Do NOT use markdown symbols like ** or ## in the result text.
- Create a professional tone.
- In the PDF generation, include the FULL report including all remedies and detailed charts.
- FOR THE KUNDLI DIAGRAM: Generate a text-based ASCII North Indian Style Diamond Chart. 
  Example structure:
      / \ / \
     / 12| 1 \
    |\  / \  /|
    | \/ 2 \/ |
    |11/\   /\3|
    | /  \ /  \|
    |/ 10 \ 4 \|
    |\    / \  /|
    | \  / 7 \/ |
    | 9\/_____\ 5|
     \ 8 | 6 /
      \ / \ /
  Place the zodiac numbers and planetary symbols based on birth details.`;

        const response = await axios.post(DEEPSEEK_API_URL, {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'You are a professional Vedic Astrologer. Provide structured analysis without markdown formatting. Always include a section for Premium Remedies which is only visible in the full report.' },
                { role: 'user', content: prompt }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000
        });

        let reportContent = response.data.choices[0].message.content;
        reportContent = reportContent.replace(/\*\*/g, '').replace(/##/g, '').replace(/#/g, '');

        // Generate PDF
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            let pdfData = Buffer.concat(buffers);
            res.json({ 
                result: reportContent,
                pdf: pdfData.toString('base64')
            });
        });

        // Professional PDF Styling
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0F041A');
        doc.fillColor('#D4AF37').fontSize(26).text('ASTRO GURU', { align: 'center' });
        doc.fontSize(14).text('Sacred Astrological Revelation', { align: 'center' });
        doc.moveDown(2);
        
        doc.fillColor('#F5F5F5').fontSize(12).text(`Prepared for: ${name}`, { continued: true }).fillColor('#D4AF37').text(` | Date: ${new Date().toLocaleDateString()}`);
        doc.fillColor('#F5F5F5').text(`Birth Details: ${dob} at ${time}, ${place}`);
        doc.moveDown();
        doc.rect(50, doc.y, 500, 2).fill('#D4AF37');
        doc.moveDown();

        doc.fillColor('#F5F5F5').fontSize(11).text(reportContent, {
            align: 'justify',
            lineGap: 5
        });
        
        doc.moveDown(2);
        doc.fillColor('#D4AF37').fontSize(14).text('💎 PREMIUM SACRED REMEDIES', { underline: true });
        doc.fillColor('#F5F5F5').fontSize(11).text('Based on your unique Lagna and planetary alignments, we recommend the following sacred rituals and behavioral changes to align yourself with the universe and overcome your current obstacles...');
        // (Add more premium filler or specific AI generated remedies here if the prompt handled it)

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
