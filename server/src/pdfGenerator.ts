import PDFDocument from 'pdfkit';
import { Player, Quiz, UnitQuiz } from './types';
import { checkAnswer, countCorrectParts } from './utils';
const path = require('path');
const fs = require('fs');

function getFonts() {
    const regularPaths = [
        path.join(__dirname, 'assets', 'LiberationSans-Regular.ttf'),
        path.join(__dirname, '..', 'src', 'assets', 'LiberationSans-Regular.ttf'),
        path.join(process.cwd(), 'server', 'src', 'assets', 'LiberationSans-Regular.ttf'),
        path.join(process.cwd(), 'src', 'assets', 'LiberationSans-Regular.ttf'),
        path.join(process.cwd(), 'assets', 'LiberationSans-Regular.ttf'),
    ];

    const boldPaths = [
        path.join(__dirname, 'assets', 'LiberationSans-Bold.ttf'),
        path.join(__dirname, '..', 'src', 'assets', 'LiberationSans-Bold.ttf'),
        path.join(process.cwd(), 'server', 'src', 'assets', 'LiberationSans-Bold.ttf'),
        path.join(process.cwd(), 'src', 'assets', 'LiberationSans-Bold.ttf'),
        path.join(process.cwd(), 'assets', 'LiberationSans-Bold.ttf'),
    ];

    const regular = regularPaths.find(p => fs.existsSync(p));
    const bold = boldPaths.find(p => fs.existsSync(p));

    return { regular, bold };
}

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
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const { regular: regularFontPath, bold: boldFontPath } = getFonts();

        if (regularFontPath) doc.registerFont('CustomRegular', regularFontPath);
        if (boldFontPath) doc.registerFont('CustomBold', boldFontPath);

        const fontRegular = regularFontPath ? 'CustomRegular' : 'Helvetica';
        const fontBold = boldFontPath ? 'CustomBold' : 'Helvetica-Bold';

        doc.fontSize(24).font(fontBold).text('Ziyokor Education', { align: 'center' });
        doc.fontSize(16).font(fontRegular).text('Quiz natijalari', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Test: ${quiz.title}`, { align: 'left' });
        doc.text(`O'qituvchi: ${teacherName}`, { align: 'left' });
        doc.text(`Guruh: ${groupName}`, { align: 'left' });
        doc.text(`Sana: ${new Date().toLocaleString()}`, { align: 'left' });
        doc.moveDown();

        // Robust parsing for questions
        let questions: any[] = [];
        try {
            if (Array.isArray(quiz.questions)) {
                questions = quiz.questions;
            } else if (typeof quiz.questions === 'string') {
                questions = JSON.parse(quiz.questions);
            }
        } catch (e) {
            console.error('[generateQuizResultPDF] Error parsing quiz.questions:', e);
            questions = [];
        }

        if (!players || players.length === 0) {
            doc.text("Bu testda ishtirokchilar mavjud emas.", { align: 'center' });
            doc.end();
            return;
        }

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
        questions.forEach(q => {
            if (q.type === 'info-slide') return;
            if (q.type === 'matching' || q.type === 'word-box' || q.type === 'inline-blank' || q.type === 'inline-choice') {
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
            questions.forEach((q, qIdx) => {
                if (q.type === 'info-slide') return;

                if (player.partialScoreMap && player.partialScoreMap[qIdx] !== undefined) {
                    correctCount += player.partialScoreMap[qIdx];
                } else {
                    const answer = player.answers[qIdx];
                    if (answer !== undefined) {
                        if (['matching', 'word-box', 'inline-blank', 'inline-choice'].includes(q.type || '')) {
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
            questions.forEach((q, qIdx) => {
                if (q.type === 'info-slide') return;

                const answer = player.answers[qIdx];
                let isCorrect = false;
                let studentDisplayAnswer = 'Javob berilmagan';

                const textTypes = ['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'word-box', 'vocabulary', 'matching', 'inline-blank', 'inline-choice'];

                // 1. Determine the display answer based on question type
                if (['matching', 'word-box', 'inline-blank', 'inline-choice'].includes(q.type || '')) {
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
                    if (['matching', 'word-box', 'inline-blank', 'inline-choice'].includes(q.type || '')) {
                        maxPossibleQScore = q.acceptedAnswers?.length || 1;
                    }
                    isCorrect = earnedScore === maxPossibleQScore;
                } else if (textTypes.includes(q.type || '')) {
                    if (['matching', 'word-box', 'inline-blank', 'inline-choice'].includes(q.type || '')) {
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
                    const correctAnswer = (q.type === 'matching' || q.type === 'word-box' || q.type === 'inline-blank' || q.type === 'inline-choice')
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
            const studentName = String(s.name || 'Ismsiz').substring(0, 50);
            doc.text(studentName, col2, y, { width: 170 });
            doc.text(String(s.phone || '-'), col3, y);
            doc.text(String(s.parent_name || '-'), col4, y, { width: 90 });
            doc.text(String(s.parent_phone || '-'), col5, y);

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
    answers: Record<number, any>,
    partialScoreMap: Record<number, number> = {}
): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const { regular: regularFontPath, bold: boldFontPath } = getFonts();

        if (regularFontPath) doc.registerFont('CustomRegular', regularFontPath);
        if (boldFontPath) doc.registerFont('CustomBold', boldFontPath);

        const fontRegular = regularFontPath ? 'CustomRegular' : 'Helvetica';
        const fontBold = boldFontPath ? 'CustomBold' : 'Helvetica-Bold';

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
            let resultLabel = '';

            if (partialScoreMap && partialScoreMap[idx] !== undefined) {
                const earned = partialScoreMap[idx];
                const totalParts = (['matching', 'word-box', 'inline-blank', 'inline-choice'].includes(q.type || '')) ? (q.acceptedAnswers?.length || 1) : 1;
                isCorrect = earned === totalParts;
                if (!isCorrect && earned > 0) {
                    resultLabel = `(${earned}/${totalParts} TO'G'RI)`;
                } else {
                    resultLabel = isCorrect ? '(TO\'G\'RI)' : '(NOTO\'G\'RI)';
                }
                
                if (q.type === 'multiple-choice' || q.type === 'true-false') {
                    if (studentAns !== undefined && q.options) displayAns = q.options[Number(studentAns)] || displayAns;
                }
            } else if (q.type === 'multiple-choice' || q.type === 'true-false') {
                isCorrect = studentAns !== undefined && Number(studentAns) === q.correctIndex;
                if (studentAns !== undefined && q.options) {
                    displayAns = q.options[Number(studentAns)] || displayAns;
                }
            } else {
                const earned = countCorrectParts(studentAns, q.acceptedAnswers || []);
                const totalParts = (['matching', 'word-box', 'inline-blank', 'inline-choice'].includes(q.type || '')) ? (q.acceptedAnswers?.length || 1) : 1;
                isCorrect = earned === totalParts;
                if (!isCorrect && earned > 0) {
                    resultLabel = `(${earned}/${totalParts} TO'G'RI)`;
                } else {
                    resultLabel = isCorrect ? '(TO\'G\'RI)' : '(NOTO\'G\'RI)';
                }
            }

            doc.fontSize(11).font(fontBold).text(`${actualIdx}. ${q.text}`);
            const statusColor = isCorrect ? '#059669' : '#dc2626';
            doc.fontSize(10).font(fontRegular).fillColor(statusColor).text(`Sizning javobingiz: ${displayAns} ${resultLabel}`);
            
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
export const generateWeeklyTeacherReportPDF = (
    teacherName: string,
    startDate: string,
    endDate: string,
    bookings: any[]
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

        // Header
        doc.fontSize(24).font(fontBold).text('Ziyokor Education', { align: 'center' });
        doc.fontSize(16).font(fontRegular).text('Haftalik o\'tilgan darslar hisoboti', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).font(fontBold).text(`O'qituvchi: ${teacherName}`);
        doc.font(fontRegular).text(`Davr: ${startDate} - ${endDate}`);
        doc.text(`Jami darslar: ${bookings.length}`);
        doc.moveDown();

        // Table Header
        const tableTop = doc.y;
        const col1 = 50;  // Date/Time
        const col2 = 180; // Group
        const col3 = 280; // Topic
        const col4 = 450; // Student

        doc.font(fontBold).fontSize(10);
        doc.text('Sana va Vaqt', col1, tableTop);
        doc.text('Guruh', col2, tableTop);
        doc.text('Mavzu', col3, tableTop);
        doc.text('O\'quvchi', col4, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.font(fontRegular).fontSize(9);

        let y = tableTop + 25;

        bookings.forEach((b, index) => {
            if (y > 700) {
                doc.addPage();
                y = 50;
                doc.font(fontBold).fontSize(10);
                doc.text('Sana va Vaqt', col1, y);
                doc.text('Guruh', col2, y);
                doc.text('Mavzu', col3, y);
                doc.text('O\'quvchi', col4, y);
                doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
                y += 25;
                doc.font(fontRegular).fontSize(9);
            }

            const dateStr = new Date(b.created_at).toLocaleDateString('uz-UZ');
            doc.text(`${dateStr} / ${b.time_slot}`, col1, y, { width: 120 });
            doc.text(b.group_name || 'Noma\'lum', col2, y, { width: 90 });
            doc.text(b.topic || '-', col3, y, { width: 160 });
            doc.text(b.student_name || 'Noma\'lum', col4, y, { width: 100 });

            const rowHeight = Math.max(
                doc.heightOfString(`${dateStr} / ${b.time_slot}`, { width: 120 }),
                doc.heightOfString(b.topic || '-', { width: 160 })
            ) + 10;

            y += rowHeight;
            doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('#eeeeee').lineWidth(0.5).stroke();
            doc.strokeColor('black');
        });

        doc.end();
    });
};
export const generateNextDaySchedulePDF = (
    teacherName: string,
    dateStr: string,
    bookings: any[]
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

        // Header
        doc.fontSize(24).font(fontBold).text('Ziyokor Education', { align: 'center' });
        doc.fontSize(16).font(fontRegular).text('Ertangi kun jadvali', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).font(fontBold).text(`O'qituvchi: ${teacherName}`);
        doc.font(fontRegular).text(`Sana: ${dateStr}`);
        doc.text(`Jami darslar: ${bookings.length}`);
        doc.moveDown();

        // Table Header
        const tableTop = doc.y;
        const col1 = 50;  // Time
        const col2 = 120; // Group
        const col3 = 220; // Student
        const col4 = 370; // Topic

        doc.font(fontBold).fontSize(11);
        doc.text('Vaqt', col1, tableTop);
        doc.text('Guruh', col2, tableTop);
        doc.text('O\'quvchi', col3, tableTop);
        doc.text('Mavzu', col4, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.font(fontRegular).fontSize(10);

        let y = tableTop + 25;

        bookings.forEach((b) => {
            if (y > 700) {
                doc.addPage();
                y = 50;
                doc.font(fontBold).fontSize(11);
                doc.text('Vaqt', col1, y);
                doc.text('Guruh', col2, y);
                doc.text('O\'quvchi', col3, y);
                doc.text('Mavzu', col4, y);
                doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
                y += 25;
                doc.font(fontRegular).fontSize(10);
            }

            doc.text(b.time_slot, col1, y, { width: 60 });
            doc.text(b.group_name || '-', col2, y, { width: 90 });
            doc.text(b.student_name || '-', col3, y, { width: 140 });
            doc.text(b.topic || '-', col4, y, { width: 180 });

            const rowHeight = Math.max(
                doc.heightOfString(b.student_name || '-', { width: 140 }),
                doc.heightOfString(b.topic || '-', { width: 180 })
            ) + 12;

            y += rowHeight;
            doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('#eeeeee').lineWidth(0.5).stroke();
            doc.strokeColor('black');
        });

        doc.end();
    });
};
