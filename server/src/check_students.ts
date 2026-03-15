import { Client } from 'pg';

const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/ziyokor'
});

async function run() {
    try {
        await client.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'students'");
        console.log(res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
