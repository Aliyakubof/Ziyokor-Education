import PDFDocument from 'pdfkit';
import { Player, Quiz, UnitQuiz } from './types';
import { checkAnswer } from './utils';

export const generateQuizResultPDF = (
    quiz: Quiz | UnitQuiz,
    players: Player[],
    groupName: string
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

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('Ziyokor Education', { align: 'center' });
        doc.fontSize(16).font('Helvetica').text('Quiz natijalari', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Test: ${quiz.title}`, { align: 'left' });
        doc.text(`Guruh: ${groupName}`, { align: 'left' });
        doc.text(`Sana: ${new Date().toLocaleString()}`, { align: 'left' });
        doc.moveDown();

        // Table Header
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 100;
        const col3 = 450;

        doc.font('Helvetica-Bold');
        doc.text('#', col1, tableTop);
        doc.text('O\'quvchi Ismi', col2, tableTop);
        doc.text('Ball', col3, tableTop);

        doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.font('Helvetica');

        // Table Body
        let y = tableTop + 25;
        const total = quiz.questions.filter(q => q.type !== 'info-slide').length;

        players.sort((a, b) => b.score - a.score).forEach((player, index) => {
            if (y > 700) {
                doc.addPage();
                y = 50;
            }

            // Calculate correct count accurately (excluding info-slides)
            let correctCount = 0;
            quiz.questions.forEach((q, qIdx) => {
                if (q.type === 'info-slide') return;
                const answer = player.answers[qIdx];
                if (answer !== undefined) {
                    if (['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'word-box'].includes(q.type || '')) {
                        if (checkAnswer(answer, q.acceptedAnswers || [])) {
                            correctCount++;
                        }
                    } else {
                        if (Number(answer) === q.correctIndex) {
                            correctCount++;
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

            // Player Detail Header
            doc.fontSize(18).font('Helvetica-Bold').text('Batafsil natijalar:', { align: 'left' });
            doc.fontSize(14).fillColor('#4f46e5').text(player.name);
            doc.fillColor('black').fontSize(12).font('Helvetica').text(`Umumiy ball: ${player.score}`);
            doc.moveDown();

            let actualQIdx = 1;
            quiz.questions.forEach((q, qIdx) => {
                if (q.type === 'info-slide') return;

                const answer = player.answers[qIdx];
                let isCorrect = false;
                let studentDisplayAnswer = 'Javob berilmagan';

                const textTypes = ['text-input', 'fill-blank', 'find-mistake', 'rewrite', 'word-box'];

                if (textTypes.includes(q.type || '')) {
                    studentDisplayAnswer = answer !== undefined ? String(answer) : 'Javob berilmagan';
                    if (answer !== undefined && checkAnswer(answer, q.acceptedAnswers || [])) {
                        isCorrect = true;
                    }
                } else {
                    const ansIdx = Number(answer);
                    if (answer !== undefined && !isNaN(ansIdx)) {
                        studentDisplayAnswer = q.options[ansIdx] || 'Noma\'lum';
                        if (ansIdx === q.correctIndex) {
                            isCorrect = true;
                        }
                    }
                }

                // Check for page overflow
                if (doc.y > 650) doc.addPage();

                doc.fontSize(11).font('Helvetica-Bold').text(`${actualQIdx}. ${q.text}`);
                doc.fontSize(10).font('Helvetica');

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
