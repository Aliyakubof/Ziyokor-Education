import PDFDocument from 'pdfkit';
import { Player, Quiz, UnitQuiz } from './types';

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

        doc.on('error', (err) => {
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
        const startY = doc.y;
        const tableTop = startY;
        const col1 = 50;
        const col2 = 100;
        const col3 = 350;
        const col4 = 450;

        doc.font('Helvetica-Bold');
        doc.text('#', col1, tableTop);
        doc.text('O\'quvchi Ismi', col2, tableTop);
        doc.text('Ball', col3, tableTop);
        doc.text('Status', col4, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.font('Helvetica');

        // Table Body
        let y = tableTop + 25;
        players.sort((a, b) => b.score - a.score).forEach((player, index) => {
            if (y > 700) {
                doc.addPage();
                y = 50;
            }

            doc.text((index + 1).toString(), col1, y);
            // Truncate name if too long
            const name = player.name.length > 30 ? player.name.substring(0, 30) + '...' : player.name;
            doc.text(name, col2, y);
            doc.text(player.score.toString(), col3, y);

            const status = player.status || 'Offline';
            if (status === 'Cheating') {
                doc.fillColor('red').text(status, col4, y).fillColor('black');
            } else {
                doc.text(status, col4, y);
            }

            y += 20;
            doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('#aaaaaa').lineWidth(0.5).stroke();
        });

        doc.end();
    });
};
