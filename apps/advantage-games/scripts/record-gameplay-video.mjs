import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function recordGameplay() {
  const outputDir = path.join(__dirname, '../out/gameplay-videos');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('Launching browser...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50 // Slow down operations for better visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile portrait
    recordVideo: {
      dir: outputDir,
      size: { width: 390, height: 844 }
    }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to game
    console.log('Navigating to Wizard vs Zombie game...');
    await page.goto('http://localhost:3000/en/student/games/vocabulary/wizard-vs-zombie/', { waitUntil: 'networkidle' });
    
    // Wait for game to fully load
    console.log('Waiting for game to load...');
    await page.waitForTimeout(3000);
    
    // Try to start the game
    console.log('Attempting to start game...');
    
    // Look for difficulty selection or start button
    const startButton = page.locator('button:has-text("Start"), button:has-text("Play"), button:has-text("Begin")').first();
    
    if (await startButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Found start button, clicking...');
      await startButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Select difficulty if needed
    const difficultyButton = page.locator('button:has-text("Normal"), button:has-text("Easy")').first();
    if (await difficultyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Selecting difficulty...');
      await difficultyButton.click();
      await page.waitForTimeout(500);
    }
    
    // Look for a final start button
    const finalStartButton = page.locator('button:has-text("Start Game"), button:has-text("Play")').first();
    if (await finalStartButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Clicking final start button...');
      await finalStartButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Record gameplay for 15 seconds
    console.log('Recording gameplay for 15 seconds...');
    const startTime = Date.now();
    const duration = 15000; // 15 seconds
    
    while (Date.now() - startTime < duration) {
      // Simulate random movement
      const action = Math.random();
      
      if (action < 0.3) {
        // Move up
        await page.keyboard.down('ArrowUp');
        await page.waitForTimeout(50);
        await page.keyboard.up('ArrowUp');
      } else if (action < 0.6) {
        // Move down
        await page.keyboard.down('ArrowDown');
        await page.waitForTimeout(50);
        await page.keyboard.up('ArrowDown');
      } else if (action < 0.8) {
        // Move left
        await page.keyboard.down('ArrowLeft');
        await page.waitForTimeout(50);
        await page.keyboard.up('ArrowLeft');
      } else if (action < 0.95) {
        // Move right
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(50);
        await page.keyboard.up('ArrowRight');
      } else {
        // Cast spell (Space or Enter)
        await page.keyboard.down('Space');
        await page.waitForTimeout(50);
        await page.keyboard.up('Space');
      }
      
      await page.waitForTimeout(30);
    }
    
    console.log('Gameplay recording complete!');
    
  } catch (error) {
    console.error('Error during recording:', error);
  } finally {
    // Close browser to save video
    await context.close();
    await browser.close();
    
    console.log(`Video saved to ${outputDir}`);
    
    // Find the recorded video file
    const files = fs.readdirSync(outputDir);
    const videoFile = files.find(f => f.endsWith('.webm'));
    if (videoFile) {
      const oldPath = path.join(outputDir, videoFile);
      const newPath = path.join(outputDir, 'wizard-vs-zombie-gameplay.webm');
      fs.renameSync(oldPath, newPath);
      console.log(`\nVideo recorded successfully: ${newPath}`);
    }
  }
}

recordGameplay().catch(console.error);