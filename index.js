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

1. PERSONALITY REVELATION: Provide a deep, 2-page equivalent analysis of core personality, hidden strengths, and karmic traits based on birth details.
2. CHART EXPLANATION: Detailed explanation of all planetary positions (Grahas) in Houses (Bhavas).
3. FOCUS ON QUESTION: Directly and exhaustively address "${question}".
4. PREMIUM SACRED REMEDIES: Detailed life-changing solutions, gemstone recommendations with logic, and specific rituals.

IMPORTANT:
- The entire response MUST be in ${language}. 
- For Hindi, use ONLY Hindi text.
- Do NOT use markdown symbols like ** or ##.
- WE NEED A VERY LONG RESPONSE (3-4 PAGES MINIMUM). Write in great detail.
- Include a text-based ASCII North Indian Style Diamond Chart.`;

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

        // Professional PDF Styling (White Theme)
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFFFFF');
        
        doc.fillColor('#0F041A').rect(0, 0, doc.page.width, 80).fill();
        doc.fillColor('#D4AF37').fontSize(24).text('ASTRO GURU', { align: 'center', y: 25 });
        doc.fontSize(12).text('Premium Astrological Report', { align: 'center' });
        doc.moveDown(3);
        
        doc.fillColor('#333333').fontSize(11);
        doc.text(`Name: ${name}`, { continued: true }).text(` | Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.text(`Birth Details: ${dob} at ${time}, ${place}`);
        doc.moveDown();
        doc.path('M 50 ' + doc.y + ' L 545 ' + doc.y).stroke('#D4AF37');
        doc.moveDown();

        // Split report into sections and handle ASCII chart separately
        const lines = reportContent.split('\n');
        lines.forEach(line => {
            if (!line.trim()) {
                doc.moveDown();
                return;
            }

            if (line.includes('/') || line.includes('|') || line.includes('\\')) {
                // ASCII Chart
                doc.font('Courier').fillColor('#2D0B5A').fontSize(9).text(line, { align: 'center', lineGap: 0 });
                try { doc.font('Main'); } catch(e) { doc.font('Helvetica'); }
            } else {
                // Check if text contains Hindi characters
                const hasHindi = /[\u0900-\u097F]/.test(line);
                if (hasHindi) {
                    try { doc.font('Hindi'); } catch(e) { doc.font('Helvetica'); }
                } else {
                    try { doc.font('Main'); } catch(e) { doc.font('Helvetica'); }
                }
                
                // Section Title Styling
                if (/^\d\./.test(line.trim())) {
                    doc.fillColor('#2D0B5A').fontSize(14).text(line.trim(), { underline: true });
                    doc.moveDown(0.5);
                } else {
                    doc.fillColor('#333333').fontSize(11).text(line, {
                        align: 'justify',
                        lineGap: 3
                    });
                }
            }

            if (doc.y > 720) {
                doc.addPage();
                doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFFFFF');
                doc.fillColor('#0F041A').rect(0, 0, doc.page.width, 40).fill();
                doc.fillColor('#D4AF37').fontSize(12).text('ASTRO GURU - Premium Report', { align: 'center', y: 15 });
                doc.moveDown(3);
                doc.fillColor('#333333');
            }
        });
        
        doc.moveDown(2);
        try { doc.font('Main'); } catch(e) { doc.font('Helvetica'); }
        doc.fillColor('#D4AF37').fontSize(14).text('💎 PREMIUM SACRED REMEDIES', { underline: true });
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
