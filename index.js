const express = require('express');
const axios = require('axios');
require('dotenv').config();
const { translate } = require('google-translate-api-x');

const path = require('path');
const app = express();
app.use(express.json());

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const PDFDocument = require('pdfkit');
const fs = require('fs');

async function translateToHindi(text) {
    try {
        const res = await translate(text, { to: 'hi' });
        return res.text;
    } catch (err) {
        console.error('Translation error:', err);
        return text; // Fallback to original text if translation fails
    }
}

app.post('/api/astrology', async (req, res) => {
    try {
        const { name, dob, time, place, gender, question, language = 'English' } = req.body;
        
        if (!process.env.DEEPSEEK_API_KEY) {
            return res.status(500).json({ error: 'DeepSeek API Key is missing' });
        }

        const sanitizedName = name.trim();
        const sanitizedQuestion = question.trim();
        const sanitizedPlace = place.trim();

        // STRICT English-only instruction for DeepSeek to avoid 500 errors
        const systemInstruction = 'You are an expert Vedic astrologer. Provide a detailed, professional report EXCLUSIVELY in English language. Do not use markdown formatting. Use clear headings starting with numbers (e.g. 1. Heading).';

        const userPrompt = `
Birth Details:
Name: ${sanitizedName}
DOB: ${dob}
Time: ${time}
Place: ${sanitizedPlace}
Gender: ${gender}

User Question (Translate to English if needed internally): ${sanitizedQuestion}

Please provide the structured report in English.`;

        let response;
        try {
            response = await axios.post(DEEPSEEK_API_URL, {
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 2500,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 85000
            });
        } catch (apiError) {
            console.error('DeepSeek API Error:', apiError.response?.data || apiError.message);
            return res.status(500).json({ error: 'The stars are temporarily obscured. Please try again in a moment.' });
        }

        let reportContent = response.data.choices[0].message.content;
        reportContent = reportContent.replace(/\*\*/g, '').replace(/##/g, '').replace(/#/g, '');

        // Translate to Hindi if requested, outside DeepSeek
        if (language === 'Hindi' || language === 'हिंदी') {
            console.log('Translating report to Hindi...');
            reportContent = await translateToHindi(reportContent);
        }

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
            const hindiFontPath = path.join(__dirname, 'fonts', 'NotoSansDevanagari-Regular.ttf');
            const mainFontPath = path.join(__dirname, 'fonts', 'NotoSans-Regular.ttf');
            
            if (fs.existsSync(hindiFontPath)) {
                doc.registerFont('Hindi', hindiFontPath);
            } else {
                console.error('CRITICAL: Hindi font missing at', hindiFontPath);
            }
            
            if (fs.existsSync(mainFontPath)) {
                doc.registerFont('Main', mainFontPath);
                doc.font('Main');
            } else {
                doc.font('Helvetica');
            }
        } catch (e) {
            console.error('Font registration failed:', e.message);
            doc.font('Helvetica');
        }

        // Safe Font Selection Helper
        const setSafeFont = (fontName) => {
            try {
                if (fontName === 'Hindi') {
                    doc.font('Hindi');
                } else if (fontName === 'Main') {
                    doc.font('Main');
                } else {
                    doc.font(fontName);
                }
            } catch (e) {
                doc.font('Helvetica');
            }
        };

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

        // Split report into lines and handle formatting
        const lines = reportContent.split('\n');
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
                doc.moveDown();
                return;
            }

            // Detect ASCII Chart (High Priority)
            const isChartLine = trimmedLine.includes('|') || trimmedLine.includes('/') || trimmedLine.includes('\\') || trimmedLine.includes('--');
            
            if (isChartLine) {
                setSafeFont('Courier');
                doc.fillColor('#2D0B5A').fontSize(8).text(line, { align: 'center', lineGap: 0 });
                setSafeFont('Main');
            } else {
                // Regular Text
                const hasHindi = /[\u0900-\u097F]/.test(line);
                if (hasHindi) {
                    setSafeFont('Hindi');
                } else {
                    setSafeFont('Main');
                }
                
                // Section Title (1. Heading)
                if (/^\d\./.test(trimmedLine)) {
                    doc.fillColor('#2D0B5A').fontSize(14).text(trimmedLine, { underline: true });
                    doc.moveDown(0.5);
                } else {
                    // Split line into smaller chunks if it's too long to prevent xCoordinate error
                    const words = trimmedLine.split(' ');
                    let currentLine = '';
                    words.forEach(word => {
                        if (currentLine.length + word.length > 60) {
                            doc.text(currentLine.trim(), { align: 'justify', lineGap: 4 });
                            currentLine = word + ' ';
                        } else {
                            currentLine += word + ' ';
                        }
                    });
                    if (currentLine) {
                        doc.text(currentLine.trim(), { align: 'justify', lineGap: 4 });
                    }
                }
            }

            // Page Break Logic
            if (doc.y > 700) {
                doc.addPage();
                doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFFFFF');
                doc.fillColor('#0F041A').rect(0, 0, doc.page.width, 40).fill();
                setSafeFont('Main');
                doc.fillColor('#D4AF37').fontSize(12).text('ASTRO GURU - Premium Report', { align: 'center', y: 15 });
                doc.moveDown(3);
                doc.fillColor('#333333');
            }
        });

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
