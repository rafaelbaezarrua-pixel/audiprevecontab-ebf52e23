import { test, expect } from '@playwright/test';

test.describe('Autenticação e Acesso', () => {
    test('deve carregar a página de login', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveTitle(/Audipreve/);
        await expect(page.locator('h1')).toContainText(/Login/i);
    });

    test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
        await page.goto('/login');
        await page.getByPlaceholder(/seu@email.com/i).fill('errado@teste.com');
        await page.getByPlaceholder(/sua senha/i).fill('senha123');
        await page.getByRole('button', { name: /entrar/i }).click();

        // Verifica se o toast de erro aparece
        await expect(page.locator('text=Login inválido')).toBeVisible();
    });
});
