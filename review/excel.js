/* Imports a first-worksheet risk register. Parsing stays local in the browser. */
(() => {
  const decoder = new TextDecoder();
  const maxArchive = 12 * 1024 * 1024, maxExpanded = 40 * 1024 * 1024;
  function xml(bytes) {
    const doc=new DOMParser().parseFromString(decoder.decode(bytes),'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('Invalid Excel worksheet XML.');
    return doc;
  }
  const elements=(root,name)=>[...root.getElementsByTagName('*')].filter(x=>x.localName===name);
  function text(node){return node?.textContent?.trim()||'';}
  function cellIndex(ref){let n=0;for(const c of ref.match(/^[A-Z]+/)?.[0]||''){n=n*26+c.charCodeAt(0)-64;}return n-1;}
  function parse(buffer) {
    if (buffer.byteLength>maxArchive) throw new Error('Excel file is larger than 12 MB.');
    const files=fflate.unzipSync(new Uint8Array(buffer));
    if (Object.values(files).reduce((n,x)=>n+x.byteLength,0)>maxExpanded) throw new Error('Excel file expands beyond the safe size limit.');
    const wb=files['xl/workbook.xml'];const rel=files['xl/_rels/workbook.xml.rels'];
    if (!wb||!rel) throw new Error('This file does not look like an .xlsx workbook.');
    const sheet=elements(xml(wb),'sheet')[0];if(!sheet) throw new Error('Workbook has no worksheets.');
    const rid=sheet.getAttribute('r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    const relationship=elements(xml(rel),'Relationship').find(x=>x.getAttribute('Id')===rid);
    if(!relationship) throw new Error('Cannot locate the first worksheet.');
    const target=relationship.getAttribute('Target')||'';
    const path=target.startsWith('/xl/')?target.slice(1):target.startsWith('xl/')?target:'xl/'+target.replace(/^\//,'');
    if (path.includes('..')||!path.startsWith('xl/worksheets/')||!files[path]) throw new Error('Unsupported worksheet path.');
    const shared=files['xl/sharedStrings.xml'] ? elements(xml(files['xl/sharedStrings.xml']),'si').map(text) : [];
    const sheetXml=xml(files[path]); const rows=[];
    for(const row of elements(sheetXml,'row')){
      const cells=[];
      for(const cell of elements(row,'c')){
        const idx=cellIndex(cell.getAttribute('r')||'');if(idx<0||idx>2000)continue;
        if(elements(cell,'f').length) throw new Error(`Formula found in row ${row.getAttribute('r')||'?'}. Import plain text values instead.`);
        const raw=text(elements(cell,'v')[0]);const type=cell.getAttribute('t');
        const value=type==='s'?shared[Number(raw)]:type==='inlineStr'?text(elements(cell,'is')[0]):raw;
        cells[idx]=value??'';
      }
      if(cells.some(x=>String(x||'').trim()))rows.push(cells);
      if(rows.length>5000)throw new Error('Workbook exceeds 5,000 nonempty rows.');
    }
    return parseRows(rows);
  }
  function parseRows(rows) {
    const names=['item number','item id','id','status','risk statement','risk','statement'];
    const at=rows.findIndex(row=>row.filter(x=>names.includes(String(x||'').trim().toLowerCase())).length>=2);
    if(at<0)throw new Error('Find a header row with Item ID and Risk Statement columns.');
    const header=rows[at].map(x=>String(x||'').trim().toLowerCase());
    const col=(...keys)=>header.findIndex(x=>keys.includes(x));
    const idCol=col('item number','item id','id'),textCol=col('risk statement','risk','statement'),statusCol=col('status'),sectionCol=col('section');
    if(idCol<0||textCol<0)throw new Error('Item ID and Risk Statement columns are required.');
    const parsed=[],ids=new Set();
    for(let r=at+1;r<rows.length;r++){
      const row=rows[r],id=String(row[idCol]||'').trim(),statement=String(row[textCol]||'').trim();
      if(!id&&!statement)continue;
      if(!id||!statement||statement.length>50000||id.length>80)throw new Error(`Row ${r+1}: item ID and risk statement are required.`);
      if(ids.has(id))throw new Error(`Duplicate item ID: ${id}`);ids.add(id);
      const rawStatus=String(row[statusCol]||'open').trim().toLowerCase();
      if(!['open','pending','closed'].includes(rawStatus))throw new Error(`Row ${r+1}: unknown status ${rawStatus}.`);
      const roundPairs=[];
      for(let c=4;c<row.length;c+=2){const note=String(row[c]||'').trim(),answer=String(row[c+1]||'').trim();if(answer&&!note)throw new Error(`Row ${r+1}: answer without adjacent instruction.`);if(note){if(note.length>5000||answer.length>100000)throw new Error(`Row ${r+1}: review text is too long.`);roundPairs.push({instruction:note,answer});}}
      parsed.push({id,statement,status:rawStatus,section:sectionCol<0?'':String(row[sectionCol]||'').slice(0,200),rounds:roundPairs.reverse()});
      if(parsed.length>3000)throw new Error('Import is limited to 3,000 items at a time.');
    }
    if(!parsed.length)throw new Error('No review items found in the first worksheet.');
    return parsed;
  }
  globalThis.ReviewExcel={parse,parseRows};
})();
