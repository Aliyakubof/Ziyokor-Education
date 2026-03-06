import { parentPort, workerData } from 'worker_threads';
import { generateQuizResultPDF } from '../pdfGenerator';

async function main() {
    if (!parentPort) return;

    try {
        const { quiz, players, groupName, teacherName } = workerData;
        const pdfBuffer = await generateQuizResultPDF(quiz, players, groupName, teacherName);
        parentPort.postMessage({ success: true, pdfBuffer });
    } catch (error: any) {
        parentPort.postMessage({ success: false, error: error.message });
    }
}

main();
