import { z } from 'zod';

export const createSubjectSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  youtubeUrls: z
    .array(z.string().url('URL inválida'))
    .min(1, 'Pelo menos 1 link')
    .max(20, 'Máximo 20 links'),
});
