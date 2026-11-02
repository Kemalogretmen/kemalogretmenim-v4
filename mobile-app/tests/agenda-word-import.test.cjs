const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vendor = path.resolve(__dirname, '../vendor/agenda');
const JSZip = require(path.join(vendor, 'jszip.min.js'));
const mammoth = require(path.join(vendor, 'mammoth.browser.min.js'));
const XLSX = require(path.join(vendor, 'xlsx.full.min.js'));
const { jsPDF } = require(path.join(vendor, 'jspdf.umd.min.js'));
async function documentFixture({ externalImage = false } = {}) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  const image = externalImage ? '<w:r><w:drawing><wp:inline><wp:docPr id="1" name="Fixture image"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:blipFill><a:blip r:link="externalImage"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>' : '';
  zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body><w:p><w:r><w:t>Öğretmen Şule, İğne ve Çiçek.</w:t></w:r>' + image + '</w:p></w:body></w:document>');
  if (externalImage) zip.file('word/_rels/document.xml.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="externalImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="file:///private/fixture-secret.png" TargetMode="External"/></Relationships>');
  return zip.generateAsync({ type: 'arraybuffer' });
}

test('patched offline Word reader preserves Turkish text and the public extractRawText API', async () => {
  const arrayBuffer = await documentFixture();
  const result = await mammoth.extractRawText({ arrayBuffer });
  assert.equal(result.value, 'Öğretmen Şule, İğne ve Çiçek.\n\n');
  assert.deepEqual(result.messages, []);
});

test('patched browser Word reader rejects external linked images without embedding file contents', async () => {
  const arrayBuffer = await documentFixture({ externalImage: true });
  const text = await mammoth.extractRawText({ arrayBuffer });
  assert.equal(text.value, 'Öğretmen Şule, İğne ve Çiçek.\n\n');
  const html = await mammoth.convertToHtml({ arrayBuffer });
  assert.equal(html.value, '<p>Öğretmen Şule, İğne ve Çiçek.</p>');
  assert.ok(html.messages.some(item => /external file access is disabled|cannot open linked files from a web browser/.test(item.message)));
  assert.equal(html.value.includes('data:image'), false);
});

test('patched offline spreadsheet reader round-trips Turkish annual-plan cells', () => {
  assert.equal(XLSX.version, '0.20.3');
  const rows = [['Hafta', 'Öğrenme çıktısı'], [8, 'İki basamaklı sayıları çözümleyebilme']];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Yıllık Plan');
  const buffer = XLSX.write(book, { type: 'array', bookType: 'xlsx' });
  const restored = XLSX.read(buffer, { type: 'array', cellDates: false });
  assert.deepEqual(XLSX.utils.sheet_to_json(restored.Sheets['Yıllık Plan'], { header: 1, raw: false, defval: '' }), [['Hafta', 'Öğrenme çıktısı'], ['8', 'İki basamaklı sayıları çözümleyebilme']]);
});

test('patched offline PDF exporter supports the existing new jsPDF, addImage and binary output API', () => {
  assert.equal(jsPDF.version, '4.2.1');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.text('Ajanda', 10, 10);
  pdf.addImage({ imageData: { data: new Uint8ClampedArray([118, 84, 183, 255]), width: 1, height: 1 }, format: 'RGBA', x: 10, y: 20, width: 20, height: 20 });
  const output = Buffer.from(pdf.output('arraybuffer'));
  assert.equal(output.subarray(0, 5).toString(), '%PDF-');
  assert.ok(output.length > 1000);
});

test('vendored security upgrades are pinned to their recorded official distribution bytes', () => {
  for (const [name, file, version] of [['mammoth', 'mammoth.browser.min.js', '1.11.0'], ['jspdf', 'jspdf.umd.min.js', '4.2.1'], ['xlsx', 'xlsx.full.min.js', '0.20.3']]) {
    const proof = JSON.parse(fs.readFileSync(path.join(vendor, name + '-provenance.json')));
    assert.equal(proof.version, version);
    assert.ok(/^https:\/\/(?:registry\.npmjs\.org|cdn\.sheetjs\.com)\//.test(proof.source));
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(vendor, file))).digest('hex'), proof.assetSha256);
  }
});
