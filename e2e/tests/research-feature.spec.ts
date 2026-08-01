import { test, expect } from '@playwright/test';

test('Pesquisar na Internet — abre modal, preenche e redireciona para processamento', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Botão deve existir na HomePage
  const btn = page.getByRole('button', { name: /pesquisar na internet/i });
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();

  // Modal de research — identificado pelo heading "Pesquisar na Internet"
  const modal = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Pesquisar na Internet' }) }).first();
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Preencher campos via placeholder exato
  await modal.getByPlaceholder('Ex: Engenharia de Dados com Databricks').fill('Teste Research');
  await modal.getByPlaceholder('Ex: Databricks, Snowflake e dbt para engenharia de dados').fill('Python para iniciantes');

  // Clicar em Criar e Pesquisar
  await modal.getByRole('button', { name: 'Criar e Pesquisar' }).click();

  // Deve redirecionar para página de processamento do subject
  await expect(page).toHaveURL(/\/subjects\/\d+/, { timeout: 10000 });
});
