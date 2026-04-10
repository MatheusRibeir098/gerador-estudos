import { YoutubeTranscript } from 'youtube-transcript';
import { transcribeAudio } from './openai';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function getYoutubeTranscript(
  videoUrl: string
): Promise<{ transcript: string; method: 'youtube' | 'whisper'; title: string | null }> {
  try {
    let items;
    try {
      items = await YoutubeTranscript.fetchTranscript(videoUrl, { lang: 'pt' });
    } catch {
      items = await YoutubeTranscript.fetchTranscript(videoUrl);
    }
    const transcript = items.map((i) => i.text).join(' ');
    return { transcript, method: 'youtube', title: null };
  } catch {
    try {
      const tmpDir = path.join(os.tmpdir(), 'studygen-audio');
      fs.mkdirSync(tmpDir, { recursive: true });
      const outputPath = path.join(tmpDir, `${Date.now()}.mp3`);
      execSync(`yt-dlp -x --audio-format mp3 -o "${outputPath}" "${videoUrl}"`, {
        timeout: 120000,
      });
      const transcript = await transcribeAudio(outputPath);
      fs.unlinkSync(outputPath);
      return { transcript, method: 'whisper', title: null };
    } catch (error) {
      throw new Error(
        `Falha ao transcrever vídeo ${videoUrl}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

export async function getVideoTitle(videoUrl: string): Promise<string | null> {
  try {
    return execSync(`yt-dlp --get-title "${videoUrl}"`, { timeout: 15000 })
      .toString()
      .trim();
  } catch {
    return null;
  }
}
