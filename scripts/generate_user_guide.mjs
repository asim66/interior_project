import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'docs','user-guide.md');
const template=path.join(root,'docs','Studio-Ledger-Software-Documentation.docx');
const output=path.join(root,'docs','Studio-Ledger-User-Guide.docx');
const work=fs.mkdtempSync(path.join(os.tmpdir(),'studio-ledger-user-guide-'));

const BLUE='2E74B5';
const DARK_BLUE='1F4D78';
const NAVY='1F3A5F';
const INK='20262E';
const MUTED='5E6875';
const LIGHT_BLUE='E8EEF5';
const LIGHT_GRAY='F2F4F7';
const BORDER='C7D0DA';
const GOLD='9A6A16';

function run(command,args,cwd){
  const result=spawnSync(command,args,{cwd,encoding:'utf8'});
  if(result.status!==0)throw new Error(`${command} failed:\n${result.stdout}\n${result.stderr}`);
}

function esc(value){
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}

function runXml(text,{bold=false,italic=false,color=INK,size=22,font='Calibri'}={}){
  const preserve=/^\s|\s$/.test(text)?' xml:space="preserve"':'';
  return `<w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>${bold?'<w:b/>':''}${italic?'<w:i/>':''}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t${preserve}>${esc(text)}</w:t></w:r>`;
}

function inlineRuns(text,options={}){
  const parts=String(text).split(/(\*\*.+?\*\*)/g).filter(Boolean);
  return parts.map(part=>part.startsWith('**')&&part.endsWith('**')
    ?runXml(part.slice(2,-2),{...options,bold:true})
    :runXml(part,options)).join('');
}

function paragraph(text='',{
  style,
  align,
  before=0,
  after=120,
  line=300,
  keepNext=false,
  keepTogether=false,
  pageBreakBefore=false,
  numId,
  fill,
  border,
  indent,
  runOptions={},
}={}){
  const pPr=[
    style?`<w:pStyle w:val="${style}"/>`:'',
    align?`<w:jc w:val="${align}"/>`:'',
    `<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>`,
    keepNext?'<w:keepNext/>':'',
    keepTogether?'<w:keepLines/>':'',
    pageBreakBefore?'<w:pageBreakBefore/>':'',
    numId?`<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr>`:'',
    indent?`<w:ind w:left="${indent}"/>`:'',
    fill?`<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`:'',
    border?`<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="${border}"/></w:pBdr>`:'',
  ].join('');
  return `<w:p><w:pPr>${pPr}</w:pPr>${inlineRuns(text,runOptions)}</w:p>`;
}

function pageBreak(){
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function heading(text,level,{cover=false,pageBreakBefore=false}={}){
  if(cover&&level===1){
    return paragraph(text,{align:'center',before:1240,after:80,line:320,keepNext:true,
      runOptions:{font:'Calibri',size:60,color:NAVY,bold:true}});
  }
  if(cover&&level===2){
    return paragraph(text,{align:'center',after:260,line:300,keepNext:true,
      runOptions:{font:'Calibri',size:30,color:DARK_BLUE,bold:false}});
  }
  const style=level===1?'Heading1':level===2?'Heading2':'Heading3';
  return paragraph(text,{style,keepNext:true,keepTogether:true,pageBreakBefore});
}

function callout(text,{cover=false}={}){
  return paragraph(text,{
    before:cover?240:80,
    after:180,
    line:300,
    fill:LIGHT_GRAY,
    border:GOLD,
    indent:180,
    keepTogether:true,
    runOptions:{size:21,color:INK},
  });
}

function chooseWidths(headers,rows){
  const cols=headers.length;
  const max=headers.map((header,index)=>Math.max(
    header.length,
    ...rows.map(row=>(row[index]||'').length),
  ));
  const weights=max.map((value,index)=>{
    if(cols===3&&index===0)return Math.max(10,Math.min(value,20));
    return Math.max(8,Math.min(value,42));
  });
  const totalWeight=weights.reduce((sum,value)=>sum+value,0);
  const widths=weights.map(value=>Math.round(9360*value/totalWeight));
  widths[widths.length-1]+=9360-widths.reduce((sum,value)=>sum+value,0);
  return widths;
}

function cellXml(text,width,{header=false,index=0}={}){
  const align=index===0?'left':'left';
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:tcMar><w:top w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>${header?`<w:shd w:val="clear" w:color="auto" w:fill="${LIGHT_BLUE}"/>`:''}<w:vAlign w:val="center"/></w:tcPr>${paragraph(text,{align,after:0,line:276,runOptions:{size:19,color:header?NAVY:INK,bold:header}})}</w:tc>`;
}

function tableXml(headers,rows){
  const widths=chooseWidths(headers,rows);
  const borders=`<w:tblBorders><w:top w:val="single" w:sz="4" w:color="${BORDER}"/><w:left w:val="single" w:sz="4" w:color="${BORDER}"/><w:bottom w:val="single" w:sz="4" w:color="${BORDER}"/><w:right w:val="single" w:sz="4" w:color="${BORDER}"/><w:insideH w:val="single" w:sz="4" w:color="${BORDER}"/><w:insideV w:val="single" w:sz="4" w:color="${BORDER}"/></w:tblBorders>`;
  const rowXml=(cells,header=false)=>`<w:tr><w:trPr>${header?'<w:tblHeader/>':''}<w:cantSplit/></w:trPr>${cells.map((cell,index)=>cellXml(cell,widths[index],{header,index})).join('')}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borders}<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>${widths.map(width=>`<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${rowXml(headers,true)}${rows.map(row=>rowXml(row)).join('')}</w:tbl>${paragraph('',{after:80})}`;
}

function parseMarkdown(markdown){
  const lines=markdown.split(/\r?\n/);
  const blocks=[];
  let index=0;
  while(index<lines.length){
    const line=lines[index];
    if(!line.trim()){index++;continue;}
    if(line==='\\pagebreak'){blocks.push({type:'pagebreak'});index++;continue;}
    const headingMatch=line.match(/^(#{1,3})\s+(.+)$/);
    if(headingMatch){
      blocks.push({type:'heading',level:headingMatch[1].length,text:headingMatch[2]});
      index++;
      continue;
    }
    if(line.startsWith('> ')){
      blocks.push({type:'callout',text:line.slice(2)});
      index++;
      continue;
    }
    if(line.startsWith('|')){
      const rows=[];
      while(index<lines.length&&lines[index].startsWith('|')){
        rows.push(lines[index].split('|').slice(1,-1).map(value=>value.trim()));
        index++;
      }
      if(rows.length>=2&&rows[1].every(value=>/^:?-+:?$/.test(value))){
        blocks.push({type:'table',headers:rows[0],rows:rows.slice(2)});
      }
      continue;
    }
    const bulletMatch=line.match(/^-\s+(.+)$/);
    if(bulletMatch){
      const items=[];
      while(index<lines.length){
        const match=lines[index].match(/^-\s+(.+)$/);
        if(!match)break;
        items.push(match[1]);
        index++;
      }
      blocks.push({type:'bullets',items});
      continue;
    }
    const numberMatch=line.match(/^\d+\.\s+(.+)$/);
    if(numberMatch){
      const items=[];
      while(index<lines.length){
        const match=lines[index].match(/^\d+\.\s+(.+)$/);
        if(!match)break;
        items.push(match[1]);
        index++;
      }
      blocks.push({type:'numbers',items});
      continue;
    }
    if(line==='---'){blocks.push({type:'rule'});index++;continue;}
    const para=[line.trim()];
    index++;
    while(index<lines.length&&lines[index].trim()&&!/^(#{1,3})\s+/.test(lines[index])&&!lines[index].startsWith('|')&&!lines[index].startsWith('> ')&&!/^-\s+/.test(lines[index])&&!/^\d+\.\s+/.test(lines[index])&&lines[index]!=='\\pagebreak'&&lines[index]!=='---'){
      para.push(lines[index].trim());
      index++;
    }
    blocks.push({type:'paragraph',text:para.join(' ')});
  }
  return blocks;
}

run('unzip',['-q',template,'-d',work],root);

const blocks=parseMarkdown(fs.readFileSync(source,'utf8'));
let cover=true;
let lastWasPageBreak=false;
let nextOrderedNumId=26;
const usedOrderedNumIds=[];
const body=[];

for(const block of blocks){
  if(block.type==='pagebreak'){
    body.push(pageBreak());
    if(cover)cover=false;
    lastWasPageBreak=true;
    continue;
  }
  if(block.type==='heading'){
    body.push(heading(block.text,block.level,{cover,pageBreakBefore:false}));
  }else if(block.type==='callout'){
    body.push(callout(block.text,{cover}));
  }else if(block.type==='table'){
    body.push(tableXml(block.headers,block.rows));
  }else if(block.type==='bullets'){
    for(const item of block.items)body.push(paragraph(item,{numId:10,after:80,line:300}));
  }else if(block.type==='numbers'){
    const numId=nextOrderedNumId++;
    usedOrderedNumIds.push(numId);
    for(const item of block.items)body.push(paragraph(item,{numId,after:80,line:300}));
  }else if(block.type==='rule'){
    body.push(paragraph('',{after:100,border:BORDER}));
  }else{
    const metadata=cover&&block.text.startsWith('**');
    body.push(paragraph(block.text,{
      align:cover?'center':'left',
      after:metadata?60:120,
      line:cover?280:300,
      runOptions:{size:cover?20:22,color:cover?MUTED:INK},
    }));
  }
  lastWasPageBreak=false;
}

const sectPr=`<w:sectPr><w:headerReference w:type="default" r:id="rId9"/><w:footerReference w:type="default" r:id="rId10"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/><w:cols w:space="720"/><w:titlePg/><w:docGrid w:linePitch="360"/></w:sectPr>`;
const documentXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14"><w:body>${body.join('')}${sectPr}</w:body></w:document>`;
fs.writeFileSync(path.join(work,'word','document.xml'),documentXml);

const numberingPath=path.join(work,'word','numbering.xml');
let numbering=fs.readFileSync(numberingPath,'utf8');
const newNums=usedOrderedNumIds.map(numId=>`<w:num w:numId="${numId}"><w:abstractNumId w:val="10"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('');
numbering=numbering.replace('</w:numbering>',`${newNums}</w:numbering>`);
fs.writeFileSync(numberingPath,numbering);

for(const [filename,replacements] of [
  ['header1.xml',[
    ['STUDIO LEDGER  /  SOFTWARE DOCUMENTATION','STUDIO LEDGER  /  USER GUIDE'],
  ]],
  ['footer1.xml',[
    ['Studio Ledger  •  Version 2.0  •  ','Studio Ledger User Guide  •  Version 2.0  •  '],
  ]],
]){
  const filepath=path.join(work,'word',filename);
  let xml=fs.readFileSync(filepath,'utf8');
  for(const [from,to] of replacements)xml=xml.replace(from,to);
  fs.writeFileSync(filepath,xml);
}

const corePath=path.join(work,'docProps','core.xml');
let core=fs.readFileSync(corePath,'utf8')
  .replace(/<dc:title>.*?<\/dc:title>/,'<dc:title>Studio Ledger User Guide</dc:title>')
  .replace(/<dc:subject>.*?<\/dc:subject>/,'<dc:subject>End-user operating guide for Studio Ledger</dc:subject>')
  .replace(/<dc:description>.*?<\/dc:description>/,'<dc:description>Setup, daily workflows, controls, corrections, backup, and troubleshooting.</dc:description>');
fs.writeFileSync(corePath,core);

if(fs.existsSync(output))fs.unlinkSync(output);
run('zip',['-q','-r',output,'.'],work);
console.log(output);
