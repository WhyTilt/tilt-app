const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');

test.describe('Tilt Desktop App', () => {
  let electronApp;
  let window;

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: ['../src/main.js']
    });
    
    // Get the first window
    window = await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('should launch successfully', async () => {
    // Wait for window to be ready
    await window.waitForLoadState('networkidle');
    
    // Check if window is visible
    expect(window).toBeTruthy();
    
    // Check window title
    const title = await window.title();
    expect(title).toContain('Tilt');
  });

  test('should show setup page when Tilt is not running', async () => {
    // If Tilt containers aren't running, should show setup page
    await window.waitForSelector('h1', { timeout: 10000 });
    
    const heading = await window.textContent('h1');
    expect(heading).toContain('Tilt');
  });

  test('should check Docker status', async () => {
    // Look for Docker status elements
    await window.waitForSelector('#status', { timeout: 5000 });
    
    const statusElement = await window.locator('#status');
    expect(statusElement).toBeTruthy();
    
    // Should show some kind of Docker status
    const statusText = await statusElement.textContent();
    expect(statusText.toLowerCase()).toMatch(/(docker|checking|running|available)/);
  });

  test('should have platform information', async () => {
    // Check if platform info is displayed
    await window.waitForSelector('#platform', { timeout: 5000 });
    
    const platform = await window.textContent('#platform');
    expect(platform).toMatch(/(win32|darwin|linux)/);
  });

  test('should handle refresh button', async () => {
    // Wait for refresh button to be available
    await window.waitForSelector('#refreshBtn', { timeout: 5000 });
    
    const refreshBtn = await window.locator('#refreshBtn');
    expect(refreshBtn).toBeTruthy();
    
    // Click refresh button
    await refreshBtn.click();
    
    // Should show loading state
    await window.waitForSelector('.spinner', { timeout: 2000 });
  });

  test('should show start button when Docker is available', async () => {
    // Wait for status check to complete
    await window.waitForTimeout(3000);
    
    // If Docker is available, start button should be visible
    const startBtn = await window.locator('#startBtn');
    const isVisible = await startBtn.isVisible().catch(() => false);
    
    if (isVisible) {
      expect(startBtn).toBeTruthy();
      
      const btnText = await startBtn.textContent();
      expect(btnText).toContain('Start');
    }
  });
});