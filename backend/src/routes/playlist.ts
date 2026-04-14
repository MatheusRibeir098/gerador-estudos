import { Router } from 'express';
import { GetPlaylistData } from 'youtube-search-api';

const router: ReturnType<typeof Router> = Router();

router.get('/playlist', async (req, res) => {
  const url = req.query.url as string;
  if (!url) { res.status(400).json({ error: 'URL obrigatória' }); return; }

  const match = url.match(/[?&]list=([\w-]+)/);
  if (!match) { res.status(400).json({ error: 'URL de playlist inválida' }); return; }

  try {
    const data = await GetPlaylistData(match[1], 300);
    const videos = (data.items || [])
      .filter((item: any) => item.id)
      .map((item: any) => ({
        url: 'https://www.youtube.com/watch?v=' + item.id,
        title: item.title || null,
      }));

    if (videos.length === 0) { res.status(404).json({ error: 'Playlist vazia ou não encontrada' }); return; }
    res.json({ data: videos, total: videos.length });
  } catch (error) {
    console.error('Erro ao buscar playlist:', error);
    res.status(500).json({ error: 'Erro ao buscar playlist' });
  }
});

export default router;
