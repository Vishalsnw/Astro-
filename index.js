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

1. 🔮 PERSONALITY REVELATION (The Mirror): Start by describing the user's core personality, hidden strengths, and a specific secret trait that only someone who knows their "Kundli" would know. This builds immediate trust.
2. 📖 CHART EXPLANATION: Detailed explanation of the planetary positions and what they mean for the user.
3. 🎯 FOCUS ON QUESTION: Directly address the user's specific concern: "${question}". Provide a summarized answer here.
4. [LOCKED] 💎 PREMIUM GUIDANCE & REMEDIES: This section contains the most powerful remedies, precise calculations, and life-changing solutions. In the text response, mention that "The sacred remedies and full detailed analysis are available in your Premium PDF Report. Unlock it now to reveal the path to your success."

Birth Details:
Name: ${name}, DOB: ${dob}, Time: ${time}, Place: ${place}, Gender: ${gender}

IMPORTANT:
- The entire response MUST be in ${language}.
- Do NOT use markdown symbols like ** or ## in the result text.
- Be very specific about personality traits based on birth details to build "Aha!" moments.
- The tone should be "Divine, Personal, and Accurate".
- In the PDF generation, include the FULL report including all remedies and detailed charts.
- FOR THE KUNDLI DIAGRAM: Generate a text-based ASCII North Indian Style Diamond Chart. 
  Example structure (use double backslashes for diagonal lines):
      / \\ / \\
     / 12| 1 \\
    |\\  / \\  /|
    | \\/ 2 \\/ |
    |11/\\   /\\3|
    | /  \\ /  \\|
    |/ 10 \\ 4 \\|
    |\\    / \\  /|
    | \\  / 7 \\/ |
    | 9\\/_____\\ 5|
     \\ 8 | 6 /
      \\ / \\ /
  Place the zodiac numbers and planetary symbols based on birth details.`;

        const response = await axios.post(DEEPSEEK_API_URL, {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'You are a professional Vedic Astrologer. Provide structured analysis without markdown formatting. Keep the response concise but accurate. Avoid generating very long reports to prevent timeout.' },
                { role: 'user', content: prompt }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 110000
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

        // Register fonts for Hindi support
        try {
            if (fs.existsSync('fonts/NotoSansDevanagari-Regular.ttf') && fs.existsSync('fonts/NotoSans-Regular.ttf')) {
                doc.registerFont('Hindi', 'fonts/NotoSansDevanagari-Regular.ttf');
                doc.registerFont('Main', 'fonts/NotoSans-Regular.ttf');
                doc.font('Main');
            } else {
                console.log('Font files missing, using Helvetica');
                doc.font('Helvetica');
            }
        } catch (e) {
            console.log('Font loading failed:', e.message);
            doc.font('Helvetica');
        }

        // Professional PDF Styling
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0F041A');
        
        doc.fillColor('#D4AF37').fontSize(26).text('ASTRO GURU', { align: 'center' });
        doc.fontSize(14).text('Sacred Astrological Revelation', { align: 'center' });
        doc.moveDown(2);
        
        doc.fillColor('#F5F5F5').fontSize(12);
        doc.text(`Prepared for: ${name}`, { continued: true }).fillColor('#D4AF37').text(` | Date: ${new Date().toLocaleDateString()}`);
        doc.fillColor('#F5F5F5').text(`Birth Details: ${dob} at ${time}, ${place}`);
        doc.moveDown();
        doc.rect(50, doc.y, 500, 2).fill('#D4AF37');
        doc.moveDown();

        // Split report into sections and handle ASCII chart separately
        const sections = reportContent.split('\n\n');
        sections.forEach(section => {
            if (section.includes('/') || section.includes('|')) {
                // ASCII Chart
                doc.font('Courier').fillColor('#D4AF37').fontSize(10).text(section, { align: 'center' });
                doc.font('Main');
            } else {
                // Check if text contains Hindi characters
                const hasHindi = /[\u0900-\u097F]/.test(section);
                if (hasHindi) doc.font('Hindi');
                
                doc.fillColor('#F5F5F5').fontSize(11).text(section, {
                    align: 'justify',
                    lineGap: 5
                });
                
                doc.font('Main');
            }
            doc.moveDown();
        });
        
        doc.moveDown(2);
        doc.font('Main').fillColor('#D4AF37').fontSize(14).text('💎 PREMIUM SACRED REMEDIES', { underline: true });
        doc.fillColor('#F5F5F5').fontSize(11).text('Based on your unique Lagna and planetary alignments, we provide specialized remedies to align your life path with the celestial forces.');
        
        doc.end();

    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        const statusCode = error.response?.status || 500;
        const errorDetail = error.response?.data || error.message;
        
        // If it's a timeout or connection issue, let's try a smaller prompt
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
             return res.status(504).json({ error: 'Celestial alignment taking longer than expected. Please simplify your question or try again.' });
        }

        res.status(statusCode).json({ 
            error: 'Astrological consultation failed. Please try again.',
            details: errorDetail
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Astro Guru server running on port ${PORT}`);
});
