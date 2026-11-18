import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Lab bitta deploy ichida saytning /lab/ yo'lida joylashadi, shuning
// uchun production'da base = '/lab/'. Dev'da ildizda qolaveradi.
// VoiceLab (o'zbekcha ovoz) kaliti faqat shu serverda qoladi: brauzer
// /voicelab/... ga so'rov yuboradi, Vite uni kalit bilan api.voicelab.uz ga uzatadi.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const vlKey = (env.VOICELAB_API_KEY || '').trim().replace(/^["']|["']$/g, '')
  if (command === 'serve') {
    console.log(vlKey
      ? `\n  [O'qituvchi] VoiceLab ovozi: ULANDI (kalit ${vlKey.slice(0, 7)}…)\n`
      : `\n  [O'qituvchi] VoiceLab ovozi: O'CHIQ — .env.local da VOICELAB_API_KEY topilmadi (Gemini/brauzer ovozi ishlatiladi)\n`)
  }
  const voicelabProxy = vlKey ? {
    '/voicelab': {
      target: 'https://api.voicelab.uz',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/voicelab/, ''),
      headers: { Authorization: `Bearer ${vlKey}`, 'Accept-Language': 'uz' },
    },
  } : {}
  return {
  base: command === 'build' ? '/lab/' : '/',
  plugins: [react()],
  define: {
    __VOICELAB__: JSON.stringify(Boolean(vlKey) && command === 'serve'),
    __VOICELAB_VOICE__: JSON.stringify(env.VOICELAB_VOICE_ID || ''),
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: voicelabProxy,
  },
  build: {
    // Bitta 1.2MB lik fayl o'rniga bir nechta bo'lakka bo'lamiz: brauzer
    // ularni parallel yuklaydi va kod o'zgarganda three.js qayta yuklanmaydi
    // (keshda qoladi) — demo paytida sahifa tezroq ochiladi.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          react: ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
}
})
