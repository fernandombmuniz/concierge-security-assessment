import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export interface AssessmentPdfOptions {
  fileName: string;
  companyName?: string;
  generatedAt?: Date;
}
const WIDTH = 1180;
const HEIGHT = WIDTH * 210 / 297;
const BG = '#07192b';
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
export const sanitizePdfFileName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'empresa';

async function waitForAssets(root: HTMLElement) {
  await Promise.all([400,500,600,700,800].map(weight => document.fonts.load(`${weight} 13px "Assessment Jakarta"`)));
  await document.fonts.ready;
  await Promise.all(Array.from(root.querySelectorAll('img')).map(async img => {
    if (!img.complete) await new Promise<void>((resolve,reject) => {
      const timer = window.setTimeout(() => reject(new Error('Uma marca do relatório não carregou. Tente novamente.')), 15000);
      img.addEventListener('load', () => {window.clearTimeout(timer);resolve();},{once:true});
      img.addEventListener('error', () => {window.clearTimeout(timer);reject(new Error('Não foi possível carregar uma marca do relatório.'));},{once:true});
    });
    if (!img.naturalWidth) throw new Error('Imagem do relatório indisponível.');
    await img.decode();
  }));
}

function newPageShell(original: HTMLElement) {
  const page = original.cloneNode(false) as HTMLElement;
  page.appendChild(original.querySelector('.al-top')!.cloneNode(true));
  page.appendChild(original.querySelector('.al-heading')!.cloneNode(true));
  const body = document.createElement('div'); body.className = 'al-body'; page.appendChild(body);
  page.appendChild(original.querySelector('.al-footer')!.cloneNode(true));
  return page;
}

/** Split only between complete cards/rows. Never crop a card or silently shrink a long page. */
function paginate(root: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];
  const originals = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-page="true"]'));
  for (const original of originals) {
    if (original.getBoundingClientRect().height <= HEIGHT + 2) { result.push(original); continue; }
    const originalBody = original.querySelector<HTMLElement>('.al-body')!;
    let blocks = Array.from(originalBody.children) as HTMLElement[];
    const nested = blocks.length === 1 && blocks[0]!.matches('.al-findings,.al-actions,.al-details');
    const wrapper = nested ? blocks[0]! : null;
    if (wrapper) blocks = Array.from(wrapper.children) as HTMLElement[];
    const pages: HTMLElement[] = [];
    let page = newPageShell(original); root.appendChild(page);
    let body = page.querySelector<HTMLElement>('.al-body')!;
    let target = body;
    if (wrapper) {target = wrapper.cloneNode(false) as HTMLElement; body.appendChild(target);}
    for (const block of blocks) {
      const copy = block.cloneNode(true) as HTMLElement;
      target.appendChild(copy);
      if (page.getBoundingClientRect().height <= HEIGHT + 2) continue;
      target.removeChild(copy);
      if (!target.children.length) throw new Error('Um bloco do relatório excedeu o espaço de uma página. Reduza o texto informado para exportar.');
      pages.push(page);
      page = newPageShell(original); root.appendChild(page);
      body = page.querySelector<HTMLElement>('.al-body')!;
      target = body;
      if (wrapper) {target = wrapper.cloneNode(false) as HTMLElement;body.appendChild(target);}
      target.appendChild(copy);
      if (page.getBoundingClientRect().height > HEIGHT + 2) throw new Error('Um bloco do relatório excedeu o espaço de uma página. Reduza o texto informado para exportar.');
    }
    pages.push(page);
    original.remove(); result.push(...pages);
  }
  return result;
}

function looksBlank(canvas:HTMLCanvasElement) {
  const context = canvas.getContext('2d',{willReadFrequently:true});
  if (!context) return true;
  const {width,height} = canvas;
  const pixels = context.getImageData(0,0,width,height).data;
  let content = 0;
  for(let y=0;y<height;y+=12) for(let x=0;x<width;x+=12) {
    const i = (y*width+x)*4;
    if (pixels[i]! > 70 && pixels[i+1]! > 85 && pixels[i+2]! > 95) content++;
  }
  return content < 50;
}

export async function generateAssessmentPdf(source:HTMLElement, options:AssessmentPdfOptions) {
  const report = source.matches('[data-lumina-assessment]') ? source : source.querySelector<HTMLElement>('[data-lumina-assessment]');
  if (!report) throw new Error('Área do relatório Lúmina não encontrada.');
  const clone = report.cloneNode(true) as HTMLElement;
  clone.classList.add('al-export');
  clone.querySelectorAll('[data-pdf-ignore="true"]').forEach(el => el.remove());
  const host = document.createElement('div');
  host.setAttribute('aria-hidden','true');
  Object.assign(host.style,{position:'absolute',left:'-20000px',top:'0',width:`${WIDTH}px`,pointerEvents:'none',background:BG});
  host.appendChild(clone); document.body.appendChild(host);
  try {
    await waitForAssets(clone); await frame();
    const pages = paginate(clone);
    if(!pages.length) throw new Error('Nenhuma página disponível para exportação.');
    const pdf = new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
    pdf.setProperties({title:`Concierge Security Assessment - ${options.companyName || 'Relatório'}`,subject:'Devolutiva Lúmina · Diagnóstico declaratório',author:'Concierge Segurança Digital | QOS Tecnologia',creator:'Concierge Security Assessment'});
    for(let i=0;i<pages.length;i++) {
      const page = pages[i]!;
      const footer = page.querySelector<HTMLElement>('.al-footer')!;
      const counter = document.createElement('span');counter.textContent = `${i+1} / ${pages.length}`;footer.appendChild(counter);
      await frame();
      const rect = page.getBoundingClientRect();
      const canvas = await html2canvas(page,{backgroundColor:BG,scale:2,useCORS:true,allowTaint:false,logging:false,width:WIDTH,height:Math.ceil(HEIGHT),windowWidth:WIDTH,windowHeight:Math.ceil(HEIGHT),scrollX:0,scrollY:0});
      if(looksBlank(canvas)) throw new Error(`A página ${i+1} não foi capturada corretamente. O arquivo não foi baixado.`);
      if(i) pdf.addPage('a4','landscape');
      pdf.addImage(canvas.toDataURL('image/jpeg',0.96),'JPEG',0,0,297,210,undefined,'FAST');
      // Keep technical and legal references clickable even though the page is rasterized.
      page.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link => {
        if(!/^https?:\/\//i.test(link.href)) return;
        for (const box of Array.from(link.getClientRects())) {
          pdf.link((box.left-rect.left)/WIDTH*297,(box.top-rect.top)/HEIGHT*210,box.width/WIDTH*297,box.height/HEIGHT*210,{url:link.href});
        }
      });
      // Release large canvases as each page is added, rather than holding the full report in memory.
      canvas.width=0;canvas.height=0;
    }
    const date = new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Fortaleza'}).format(options.generatedAt ?? new Date());
    pdf.setPage(pages.length);pdf.setFont('helvetica','normal');pdf.setFontSize(6);pdf.setTextColor(157,185,205);
    pdf.text(`Gerado em ${date} (horario de Brasilia). Informacoes declaradas no Assessment.`,8,207.8);
    pdf.save(options.fileName);
  } finally { host.remove(); }
}
