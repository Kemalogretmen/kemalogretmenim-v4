/* Keep PDF parsing, copying and compression off the drawing/UI thread. */
let source, output;
self.onmessage = async function(event) {
  const {id, op, data} = event.data;
  try {
    if(op === 'start') { importScripts(data.library);source = await PDFLib.PDFDocument.load(data.bytes); output = await PDFLib.PDFDocument.create(); }
    if(op === 'page') {
      let page;
      if(data.page === null) page = output.addPage([595.28, 595.28 * data.height / data.width]);
      else { [page] = await output.copyPages(source, [data.page - 1]); output.addPage(page); }
      if(data.overlay) {
        const image = await output.embedPng(data.overlay), c = page.getCropBox(), r = ((page.getRotation().angle % 360) + 360) % 360;
        page.drawImage(image, {x:c.x + (r===90||r===180 ? c.width : 0), y:c.y + (r===180||r===270 ? c.height : 0),
          width:r%180 ? c.height : c.width, height:r%180 ? c.width : c.height, rotate:PDFLib.degrees(r)});
      }
    }
    if(op === 'finish') { const bytes = await output.save(); self.postMessage({id,bytes},[bytes.buffer]); source = output = null; return; }
    self.postMessage({id});
  } catch(error) { self.postMessage({id,error:{name:error.name,message:error.message}}); }
};
