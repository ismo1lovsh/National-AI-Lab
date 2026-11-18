// Ikkala ilovani BITTA deploy papkasiga yig'adi:
//   dist_all/        ← landing sayt (frontend/build)
//   dist_all/lab/    ← 3D laboratoriya (dist)
// Shunday qilib hakamlarga bitta havola yetadi: sayt ochiladi, undan
// "Labni ochish" bosilsa /lab ga o'tadi.
import { cp, rm, mkdir, stat } from 'node:fs/promises';

const need = async (p, nom) => {
  try { await stat(p); } catch {
    console.error(`✗ ${nom} topilmadi: ${p}\n  Avval build qiling.`);
    process.exit(1);
  }
};

await need('frontend/build', 'Sayt build');
await need('dist',           'Lab build');

await rm('dist_all', { recursive: true, force: true });
await mkdir('dist_all', { recursive: true });

await cp('frontend/build', 'dist_all',     { recursive: true });
await cp('dist',           'dist_all/lab', { recursive: true });

console.log('✓ dist_all tayyor:  /  → sayt,   /lab  → laboratoriya');
