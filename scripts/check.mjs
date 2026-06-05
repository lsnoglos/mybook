import { readFile } from 'node:fs/promises';

const files = ['index.html', 'src/main.js', 'src/styles.css'];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  if (!content.trim()) throw new Error(`${file} is empty`);
}
console.log('Static Book app files validated.');
