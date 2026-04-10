import { YoutubeTranscript } from 'youtube-transcript';

const videoId = process.argv[2];
if (!videoId) { console.error('Usage: node transcriber.mjs <videoId>'); process.exit(1); }

try {
  const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'pt' });
  const text = segments.map(s => s.text).join(' ');
  console.log(text);
} catch (e) {
  console.error('ERRO:', e.message);
  process.exit(1);
}
