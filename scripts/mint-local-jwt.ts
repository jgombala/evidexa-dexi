import dotenv from 'dotenv';
import { mintLocalJwt } from '../src/auth/localJwt.js';

dotenv.config();

try {
  const token = mintLocalJwt();
  console.log(token);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
