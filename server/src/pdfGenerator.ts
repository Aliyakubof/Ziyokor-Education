import PDFDocument from 'pdfkit';
import { Player, Quiz, UnitQuiz } from './types';
import { checkAnswer } from './utils';

export const generateQuizResultPDF = (
    quiz: Quiz | UnitQuiz,
    players: Player[],
    groupName: string,
    teacherName: string
): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        doc.on('error', (err: Error) => {
            reject(err);
        });

        const path = require('path');
        const fs = require('fs');
        const regularFontPath = fs.existsSync(path.join(__dirname, 'assets', 'LiberationSans-Regular.ttf'))
            ? path.join(__dirname, 'assets', 'LiberationSans-Regular.ttf')
            : path.join(__dirname, '..', 'src', 'assets', 'LiberationSans-Regular.ttf');

        const boldFontPath = fs.existsSync(path.join(__dirname, 'assets', 'LiberationSans-Bold.ttf'))
            ? path.join(__dirname, 'assets', 'LiberationSans-Bold.ttf')
            : path.join(__dirname, '..', 'src', 'assets', 'LiberationSans-Bold.ttf');

        const hasRegular = fs.existsSync(regularFontPath);
        const hasBold = fs.existsSync(boldFontPath);

        if (hasRegular) doc.registerFont('CustomRegular', regularFontPath);
        if (hasBold) doc.registerFont('CustomBold', boldFontPath);

        const fontRegular = hasRegular ? 'CustomRegular' : 'Helvetica';
        const fontBold = hasBold ? 'CustomBold' : 'Helvetica-Bold';

        doc.fontSize(24).font(fontBold).text('Ziyokor Education', { align: 'center' });
        doc.fontSize(16).font(fontRegular).text('Quiz natijalari', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Test: ${quiz.title}`, { align: 'left' });
        doc.text(`O'qituvchi: ${teacherName}`, { align: 'left' });
        doc.text(`Guruh: ${groupName}`, { align: 'left' });
        doc.text(`Sana: ${new Date().toLocaleString()}`, { align: 'left' });
        doc.moveDown();

        // Table Header
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 100;
        const col3 = 450;

        doc.font(fontBold);
        doc.text('#', col1, tableTop);
        doc.text('O\'quvchi Ismi', col2, tableTop);
        doc.text('Ball', col3, tableTop);

        doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.font(fontRegular);

        // Table Body
        let y = tableTop + 25;
        const total = quiz.questions.filter(q => q.type !== 'info-slide').length;

        players.sort((a, b) => b.score - a.score).forEach((player, index) => {
            if (y > 700) {
                doc.addPage();
                y = 50;
                doc.font(fontRegular);
            }

            // Calculate correct count accurately (excluding info-slides)
            let correctCount = 0;
            quiz.questions.forEach((q, qIdx) => {
                if (q.type === 'info-slide') return;

                if (player.partialScoreMap && player.partialScoreMap[qIdx] !== undefined) {
                    if (player.partialScoreMap[qIdx] > 0) correctCount++;
                } else {
                    const answer = player.answers[qIdx];
                    if (answer !== undefined) {
                        if (['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'word-box', 'vocabulary', 'matching'].includes(q.type || '')) {
                            if (checkAnswer(answer, q.acceptedAnswers || [])) {
                                correctCount++;
                            }
                        } else {
                            if (Number(answer) === q.correctIndex) {
                                correctCount++;
                            }
                        }
                    }
                }
            });

            doc.text((index + 1).toString(), col1, y);
            const name = player.name.length > 50 ? player.name.substring(0, 50) + '...' : player.name;
            doc.text(name, col2, y);
            doc.text(`${correctCount} / ${total}`, col3, y);

            y += 20;
            doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('#aaaaaa').lineWidth(0.5).stroke();
        });

        // Detailed Breakdown Section
        players.forEach((player) => {
            doc.addPage();
            doc.font(fontRegular);

            // Player Detail Header
            doc.fontSize(18).font(fontBold).text('Batafsil natijalar:', { align: 'left' });
            doc.fontSize(14).fillColor('#4f46e5').text(player.name);
            doc.fillColor('black').fontSize(12).font(fontRegular).text(`Umumiy ball: ${player.score}`);
            doc.moveDown();

            let actualQIdx = 1;
            quiz.questions.forEach((q, qIdx) => {
                if (q.type === 'info-slide') return;

                const answer = player.answers[qIdx];
                let isCorrect = false;
                let studentDisplayAnswer = 'Javob berilmagan';

                const textTypes = ['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'word-box', 'vocabulary', 'matching'];

                // 1. Determine the display answer based on question type
                if (textTypes.includes(q.type || '')) {
                    studentDisplayAnswer = answer !== undefined ? String(answer) : 'Javob berilmagan';
                } else {
                    const ansIdx = Number(answer);
                    if (answer !== undefined && !isNaN(ansIdx)) {
                        studentDisplayAnswer = q.options ? q.options[ansIdx] || 'Noma\'lum' : 'Noma\'lum';
                    }
                }

                // Removed char replacement that caused '?' issues
                // studentDisplayAnswer = studentDisplayAnswer.replace(/[^\x00-\xFF]/g, '?');

                // 2. Determine if the answer is correct
                if (player.partialScoreMap && player.partialScoreMap[qIdx] !== undefined) {
                    isCorrect = player.partialScoreMap[qIdx] > 0;
                } else if (textTypes.includes(q.type || '')) {
                    if (answer !== undefined && checkAnswer(answer, q.acceptedAnswers || [])) {
                        isCorrect = true;
                    }
                } else {
                    const ansIdx = Number(answer);
                    if (answer !== undefined && !isNaN(ansIdx)) {
                        if (ansIdx === q.correctIndex) {
                            isCorrect = true;
                        }
                    }
                }

                // Check for page overflow
                if (doc.y > 650) {
                    doc.addPage();
                    doc.font(fontRegular);
                }

                doc.fontSize(11).font(fontBold).text(`${actualQIdx}. ${q.text}`);
                doc.fontSize(10).font(fontRegular);

                doc.fillColor(isCorrect ? '#059669' : '#dc2626')
                    .text(`Sizning javobingiz: ${studentDisplayAnswer} ${isCorrect ? ' (TO\'G\'RI)' : ' (NOTO\'G\'RI)'}`);

                if (!isCorrect) {
                    const correctAnswer = textTypes.includes(q.type || '')
                        ? (q.acceptedAnswers?.[0] || 'N/A')
                        : (q.options[q.correctIndex] || 'N/A');
                    doc.fillColor('#4b5563').text(`To'g'ri javob: ${correctAnswer}`);
                }

                doc.fillColor('black').moveDown(0.5);
                actualQIdx++;
            });
        });

        doc.end();
    });
};

export const generateGroupContactPDF = (
    groupName: string,
    students: any[]
): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const path = require('path');
        const fs = require('fs');
        const regularFontPath = fs.existsSync(path.join(__dirname, 'assets', 'LiberationSans-Regular.ttf'))
            ? path.join(__dirname, 'assets', 'LiberationSans-Regular.ttf')
            : path.join(__dirname, '..', 'src', 'assets', 'LiberationSans-Regular.ttf');

        const boldFontPath = fs.existsSync(path.join(__dirname, 'assets', 'LiberationSans-Bold.ttf'))
            ? path.join(__dirname, 'assets', 'LiberationSans-Bold.ttf')
            : path.join(__dirname, '..', 'src', 'assets', 'LiberationSans-Bold.ttf');

        const hasRegular = fs.existsSync(regularFontPath);
        const hasBold = fs.existsSync(boldFontPath);

        if (hasRegular) doc.registerFont('CustomRegular', regularFontPath);
        if (hasBold) doc.registerFont('CustomBold', boldFontPath);

        const fontRegular = hasRegular ? 'CustomRegular' : 'Helvetica';
        const fontBold = hasBold ? 'CustomBold' : 'Helvetica-Bold';

        doc.fontSize(20).font(fontBold).text('Ziyokor Education', { align: 'center' });
        doc.fontSize(14).font(fontRegular).text('Guruh o\'quvchilari kontakt ma\'lumotlari', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).font(fontBold).text(`Guruh: ${groupName}`);
        doc.fontSize(10).font(fontRegular).text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`);
        doc.moveDown();

        // Table Header
        const tableTop = doc.y;
        const col1 = 40;
        const col2 = 60;
        const col3 = 240;
        const col4 = 340;
        const col5 = 440;

        doc.font(fontBold).fontSize(9);
        doc.text('#', col1, tableTop);
        doc.text('F.I.SH', col2, tableTop);
        doc.text('O\'quvchi Tel', col3, tableTop);
        doc.text('Ota-ona', col4, tableTop);
        doc.text('Ota-ona Tel', col5, tableTop);

        doc.moveTo(col1, tableTop + 12).lineTo(560, tableTop + 12).stroke();
        doc.font(fontRegular);

        let y = tableTop + 20;

        students.forEach((s, index) => {
            if (y > 700) {
                doc.addPage();
                y = 40;
            }

            doc.text((index + 1).toString(), col1, y);
            doc.text(s.name, col2, y, { width: 170 });
            doc.text(s.phone || '-', col3, y);
            doc.text(s.parent_name || '-', col4, y, { width: 90 });
            doc.text(s.parent_phone || '-', col5, y);

            y += 25;
            doc.moveTo(40, y - 5).lineTo(560, y - 5).strokeColor('#eeeeee').lineWidth(0.5).stroke();
            doc.strokeColor('black');
        });

        doc.end();
    });
};
