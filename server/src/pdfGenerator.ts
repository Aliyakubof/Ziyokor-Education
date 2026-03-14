import PDFDocument from 'pdfkit';
import { Player, Quiz, UnitQuiz } from './types';
import { checkAnswer, countCorrectParts } from './utils';

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
        let total = 0;
        quiz.questions.forEach(q => {
            if (q.type === 'info-slide') return;
            if (q.type === 'matching' || q.type === 'word-box') {
                total += q.acceptedAnswers?.length || 0;
            } else {
                total += 1;
            }
        });

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
                    correctCount += player.partialScoreMap[qIdx];
                } else {
                    const answer = player.answers[qIdx];
                    if (answer !== undefined) {
                        if (q.type === 'matching' || q.type === 'word-box') {
                            correctCount += countCorrectParts(answer, q.acceptedAnswers || []);
                        } else if (['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'vocabulary'].includes(q.type || '')) {
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
                if (q.type === 'matching' || q.type === 'word-box') {
                    studentDisplayAnswer = answer !== undefined ? String(answer).split('+').join(' | ') : 'Javob berilmagan';
                } else if (textTypes.includes(q.type || '')) {
                    studentDisplayAnswer = answer !== undefined ? String(answer) : 'Javob berilmagan';
                } else {
                    const ansIdx = Number(answer);
                    if (answer !== undefined && !isNaN(ansIdx)) {
                        studentDisplayAnswer = q.options ? q.options[ansIdx] || 'Noma\'lum' : 'Noma\'lum';
                    }
                }

                // Removed char replacement that caused '?' issues
                // studentDisplayAnswer = studentDisplayAnswer.replace(/[^\x00-\xFF]/g, '?');

                // 2. Determine if the answer is correct and what score was earned
                let earnedScore = 0;
                let maxPossibleQScore = 1;

                if (player.partialScoreMap && player.partialScoreMap[qIdx] !== undefined) {
                    earnedScore = player.partialScoreMap[qIdx];
                    if (q.type === 'matching' || q.type === 'word-box') {
                        maxPossibleQScore = q.acceptedAnswers?.length || 1;
                    }
                    isCorrect = earnedScore === maxPossibleQScore;
                } else if (textTypes.includes(q.type || '')) {
                    if (q.type === 'matching' || q.type === 'word-box') {
                        maxPossibleQScore = q.acceptedAnswers?.length || 1;
                        earnedScore = countCorrectParts(answer, q.acceptedAnswers || []);
                        isCorrect = earnedScore === maxPossibleQScore;
                    } else if (answer !== undefined && checkAnswer(answer, q.acceptedAnswers || [])) {
                        isCorrect = true;
                        earnedScore = 1;
                    }
                } else {
                    const ansIdx = Number(answer);
                    if (answer !== undefined && !isNaN(ansIdx)) {
                        if (ansIdx === q.correctIndex) {
                            isCorrect = true;
                            earnedScore = 1;
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

                const statusColor = isCorrect ? '#059669' : (earnedScore > 0 ? '#d97706' : '#dc2626');
                const statusText = isCorrect ? ' (TO\'G\'RI)' : (earnedScore > 0 ? ` (QISMAN TO'G'RI: ${earnedScore}/${maxPossibleQScore})` : ' (NOTO\'G\'RI)');

                doc.fillColor(statusColor)
                    .text(`Sizning javobingiz: ${studentDisplayAnswer}${statusText}`);

                if (!isCorrect) {
                    const correctAnswer = (q.type === 'matching' || q.type === 'word-box')
                        ? (q.acceptedAnswers?.join(' | ') || 'N/A')
                        : (textTypes.includes(q.type || '')
                            ? (q.acceptedAnswers?.[0] || 'N/A')
                            : (q.options[q.correctIndex] || 'N/A'));
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

export const generateSoloQuizPDF = (
    quizTitle: string,
    studentName: string,
    score: number,
    maxScore: number,
    percentage: number,
    questions: any[],
    answers: Record<number, any>
): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
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

        doc.fontSize(24).font(fontBold).text('Ziyokor Education', { align: 'center' });
        doc.fontSize(16).font(fontRegular).text('Solo Quiz Natijasi', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).font(fontBold).text(`O'quvchi: ${studentName}`);
        doc.font(fontRegular).text(`Test: ${quizTitle}`);
        doc.text(`Natija: ${percentage}% (${score} / ${maxScore} ball)`);
        doc.text(`Sana: ${new Date().toLocaleString('uz-UZ')}`);
        doc.moveDown();

        doc.fontSize(14).font(fontBold).text('Batafsil natijalar:', { align: 'left' });
        doc.moveDown(0.5);

        let actualIdx = 1;
        questions.forEach((q, idx) => {
            if (q.type === 'info-slide') return;

            if (doc.y > 650) {
                doc.addPage();
                doc.font(fontRegular);
            }

            const studentAns = answers[idx];
            let isCorrect = false;
            let displayAns = studentAns !== undefined ? String(studentAns) : 'Javob berilmagan';

            if (q.type === 'multiple-choice' || q.type === 'true-false') {
                isCorrect = studentAns !== undefined && Number(studentAns) === q.correctIndex;
                if (studentAns !== undefined && q.options) {
                    displayAns = q.options[Number(studentAns)] || displayAns;
                }
            } else {
                const earned = countCorrectParts(studentAns, q.acceptedAnswers || []);
                isCorrect = earned === (q.acceptedAnswers?.length || 1);
            }

            doc.fontSize(11).font(fontBold).text(`${actualIdx}. ${q.text}`);
            const statusColor = isCorrect ? '#059669' : '#dc2626';
            doc.fontSize(10).font(fontRegular).fillColor(statusColor).text(`Sizning javobingiz: ${displayAns} ${isCorrect ? '(TO\'G\'RI)' : '(NOTO\'G\'RI)'}`);
            
            if (!isCorrect) {
                const correct = (q.type === 'multiple-choice' || q.type === 'true-false') 
                    ? (q.options ? q.options[q.correctIndex] : 'N/A')
                    : (q.acceptedAnswers?.join(' | ') || 'N/A');
                doc.fillColor('#4b5563').text(`To'g'ri javob: ${correct}`);
            }

            doc.fillColor('black').moveDown();
            actualIdx++;
        });

        doc.end();
    });
};
