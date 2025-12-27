import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const token = process.argv[2];
if (!token) {
  console.error('Usage: tsx scripts/print-claims.ts <jwt>');
  process.exit(1);
}

const decoded = jwt.decode(token, { complete: true });
console.log(JSON.stringify(decoded, null, 2));
