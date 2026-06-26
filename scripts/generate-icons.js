const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../logo.jpg');
const iconsDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  try {
    const image = await Jimp.read(logoPath);
    
    // 192x192
    const icon192 = image.clone();
    icon192.resize({ w: 192, h: 192 });
    await icon192.write(path.join(iconsDir, 'icon-192x192.png'));
    console.log('Created icon-192x192.png');

    // 512x512
    const icon512 = image.clone();
    icon512.resize({ w: 512, h: 512 });
    await icon512.write(path.join(iconsDir, 'icon-512x512.png'));
    console.log('Created icon-512x512.png');

  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

generateIcons();
