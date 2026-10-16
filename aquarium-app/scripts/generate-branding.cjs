const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const xml=fs.readFileSync(path.join(root,'branding/android-launcher.xml'),'utf8');
const names={'pathData':'d','fillColor':'fill','strokeColor':'stroke','strokeWidth':'stroke-width','strokeLineCap':'stroke-linecap','strokeLineJoin':'stroke-linejoin'};
const paths=[...xml.matchAll(/<path\b([\s\S]*?)\/>/g)].map(match=>{
 const attrs=[...match[1].matchAll(/android:(\w+)="([^"]*)"/g)].filter(a=>names[a[1]]).map(a=>{
  let value=a[2];if(value==='#00000000')value='none';return `${names[a[1]]}="${value}"`;
 }).join(' ');return '<path '+attrs+'/>';
});
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108"><rect width="108" height="108" fill="#082F3D"/>'+paths.join('')+'</svg>';
fs.writeFileSync(path.join(root,'branding/app-icon.svg'),svg+'\n');
(async()=>{
 let sharp;try{sharp=require('sharp');}catch(e){if(!process.env.AQUARIUM_SHARP_MODULE)throw Error('SVG hazır. PNG dışa aktarımı için sharp kurun veya AQUARIUM_SHARP_MODULE yolunu belirtin.');sharp=require(process.env.AQUARIUM_SHARP_MODULE);}
 const output=path.join(root,'ios/SinifAkvaryumu/Assets.xcassets/AppIcon.appiconset');fs.mkdirSync(output,{recursive:true});
 await sharp(Buffer.from(svg)).resize(1024,1024).removeAlpha().png().toFile(path.join(output,'AppIcon-1024.png'));
 fs.writeFileSync(path.join(output,'Contents.json'),JSON.stringify({images:[{filename:'AppIcon-1024.png',idiom:'universal',platform:'ios',size:'1024x1024'}],info:{author:'xcode',version:1}},null,2)+'\n');
 fs.writeFileSync(path.join(root,'ios/SinifAkvaryumu/Assets.xcassets/Contents.json'),JSON.stringify({info:{author:'xcode',version:1}},null,2)+'\n');
 console.log('SVG ve 1024×1024 iOS simgesi hazır.');
})();
