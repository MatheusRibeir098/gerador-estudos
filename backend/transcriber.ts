const { YoutubeTranscript } = require('youtube-transcript') as any;
const yt = require('youtube-transcript');

const videoId = process.argv[2];
if (!videoId) { console.error('Usage: tsx transcriber.ts <videoId>'); process.exit(1); }

async function main() {
  // Try different export patterns
  const Transcript = yt.YoutubeTranscript || yt.default?.YoutubeTranscript || yt;
  const fn = Transcript.fetchTranscript || yt.fetchTranscript;
  if (!fn) {
    console.error('Could not find fetchTranscript');
    process.exit(1);
  }
  const segments = await fn.call(Transcript, videoId, { lang: 'pt' });
  const text = segments.map((s: any) => s.text).join(' ');
  console.log(text);
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
