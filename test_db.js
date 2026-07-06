import { db } from './server/db.js';

const rows = db.prepare("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 10").all();
console.log(rows);
