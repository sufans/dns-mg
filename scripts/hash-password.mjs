import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usage: npm run secret:password -- "your-password-with-at-least-12-chars"');
  process.exit(1);
}
const salt = bcrypt.genSaltSync(12);
console.log(bcrypt.hashSync(password, salt));
