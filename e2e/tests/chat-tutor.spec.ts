import { test, expect } from '@playwright/test';

test.describe('Chat Tutor', () => {
  test('navega para /subjects/1 e exibe a página', async ({ page }) => {
    await page.goto('/subjects/1');
    await expect(page.getByRole('heading', { name: 'Estatística' })).toBeVisible();
  });

  test('clica na aba Chat Tutor e vê mensagem de boas-vindas', async ({ page }) => {
    await page.goto('/subjects/1');
    await page.getByRole('button', { name: /Chat Tutor/i }).click();
    await expect(page.getByText('Olá! Sou seu tutor para esta aula.')).toBeVisible();
  });

  test('digita uma pergunta e ela aparece na conversa', async ({ page }) => {
    await page.goto('/subjects/1');
    await page.getByRole('button', { name: /Chat Tutor/i }).click();
    await expect(page.getByText('Olá! Sou seu tutor para esta aula.')).toBeVisible();
    const input = page.getByPlaceholder('Faça uma pergunta sobre a aula...');
    await input.fill('O que são algoritmos?');
    await page.getByRole('button', { name: /Enviar/i }).click();
    await expect(page.getByText('O que são algoritmos?')).toBeVisible();
  });
});
