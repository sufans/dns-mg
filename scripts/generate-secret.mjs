import { randomBytes } from 'node:crypto';

const bytes = randomBytes(32);
console.log(bytes.toString('base64url'));
