const YOUTUBE_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([\w-]{11})/;

export function isValidYoutubeUrl(url: string): boolean {
  return YOUTUBE_REGEX.test(url.trim());
}

export function extractVideoId(url: string): string | null {
  const match = url.trim().match(YOUTUBE_REGEX);
  return match ? match[1] : null;
}

export function parseYoutubeUrls(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(isValidYoutubeUrl);
}
