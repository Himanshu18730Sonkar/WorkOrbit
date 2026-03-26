import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const sourceLogoSvg = path.join(root, 'public', 'applogo.svg');
const sourceLogoPng = path.join(root, 'public', 'applogo.png');
const buildDir = path.join(root, 'build');
const iconPng = path.join(buildDir, 'icon.png');
const iconIco = path.join(buildDir, 'icon.ico');
const sizes = [16, 24, 32, 48, 64, 128, 256];

function circleMaskSvg(size) {
  const radius = Math.floor(size / 2);
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/></svg>`
  );
}

function circleBackgroundSvg(size, color) {
  const radius = Math.floor(size / 2);
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="${color}"/></svg>`
  );
}

async function ensureSourceLogo() {
  try {
    await fs.access(sourceLogoSvg);
    return sourceLogoSvg;
  } catch {
    try {
      await fs.access(sourceLogoPng);
      return sourceLogoPng;
    } catch {
      throw new Error(`Missing source logo at ${sourceLogoSvg} or ${sourceLogoPng}`);
    }
  }
}

async function createBrandedIconBuffer(sourceLogo, size) {
  const logoSize = Math.round(size * 0.72);

  const logoBuffer = await sharp(sourceLogo, { density: 512 })
    .resize(logoSize, logoSize, { fit: 'contain' })
    .ensureAlpha()
    .negate({ alpha: false })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: circleBackgroundSvg(size, '#0ea5e9') },
      { input: logoBuffer, gravity: 'center' },
      { input: circleMaskSvg(size), blend: 'dest-in' }
    ])
    .png()
    .toBuffer();
}

async function main() {
  const sourceLogo = await ensureSourceLogo();
  await fs.mkdir(buildDir, { recursive: true });

  const largeBuffer = await createBrandedIconBuffer(sourceLogo, 512);
  await fs.writeFile(iconPng, largeBuffer);

  const pngBuffers = await Promise.all(
    sizes.map((size) => createBrandedIconBuffer(sourceLogo, size))
  );

  const icoBuffer = await pngToIco(pngBuffers);
  await fs.writeFile(iconIco, icoBuffer);

  console.log(`Generated ${iconPng}`);
  console.log(`Generated ${iconIco}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
