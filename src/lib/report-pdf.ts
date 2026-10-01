import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export interface AssessmentPdfOptions {
  fileName: string;
  companyName?: string;
  generatedAt?: Date;
}

const PDF_BACKGROUND = '#020617';
const CAPTURE_WIDTH_PX = 1240;
const SLIDE_WIDTH_MM = 320;
const SLIDE_HEIGHT_MM = 180;
const SLIDE_PADDING_MM = 10;
const BACKGROUND_RGB = { r: 2, g: 6, b: 23 };

const isCanvasMostlyBackground = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return false;

  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height).data;
  let total = 0;
  let backgroundLike = 0;
  const step = 10;
  const tolerance = 12;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      const r = imageData[index];
      const g = imageData[index + 1];
      const b = imageData[index + 2];
      const a = imageData[index + 3];
      if (a < 8) continue;
      total += 1;

      if (
        Math.abs(r - BACKGROUND_RGB.r) <= tolerance &&
        Math.abs(g - BACKGROUND_RGB.g) <= tolerance &&
        Math.abs(b - BACKGROUND_RGB.b) <= tolerance
      ) {
        backgroundLike += 1;
      }
    }
  }

  return total === 0 || backgroundLike / total >= 0.992;
};

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

const waitForImages = async (root: HTMLElement) => {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(async (image) => {
      if (image.complete) return;
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
      });
    }),
  );
};

const removeInteractiveElements = (root: HTMLElement) => {
  root
    .querySelectorAll<HTMLElement>('[data-pdf-ignore="true"]')
    .forEach((element) => element.remove());
};

const prepareClone = (source: HTMLElement) => {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('data-assessment-report');
  clone.style.width = `${CAPTURE_WIDTH_PX}px`;
  clone.style.maxWidth = `${CAPTURE_WIDTH_PX}px`;
  clone.style.minWidth = `${CAPTURE_WIDTH_PX}px`;
  clone.style.margin = '0';
  clone.style.padding = '30px 42px 42px';
  clone.style.boxSizing = 'border-box';
  clone.style.background = PDF_BACKGROUND;

  removeInteractiveElements(clone);

  clone
    .querySelectorAll<HTMLElement>('section, article, [data-report-keep-together="true"]')
    .forEach((element) => {
      element.style.overflow = 'visible';
      element.style.maxHeight = 'none';
      element.style.height = 'auto';
    });

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-20000px';
  host.style.top = '0';
  host.style.width = `${CAPTURE_WIDTH_PX}px`;
  host.style.zIndex = '-9999';
  host.style.background = PDF_BACKGROUND;
  host.style.pointerEvents = 'none';
  host.style.overflow = 'visible';

  host.appendChild(clone);
  document.body.appendChild(host);
  return { host, clone };
};

const fitInsideSlide = (imageWidth: number, imageHeight: number) => {
  const availableWidth = SLIDE_WIDTH_MM - SLIDE_PADDING_MM * 2;
  const availableHeight = SLIDE_HEIGHT_MM - SLIDE_PADDING_MM * 2;
  const imageRatio = imageWidth / imageHeight;
  const boxRatio = availableWidth / availableHeight;

  if (imageRatio >= boxRatio) {
    const width = availableWidth;
    const height = width / imageRatio;
    return {
      width,
      height,
      x: SLIDE_PADDING_MM,
      y: (SLIDE_HEIGHT_MM - height) / 2,
    };
  }

  const height = availableHeight;
  const width = height * imageRatio;
  return {
    width,
    height,
    x: (SLIDE_WIDTH_MM - width) / 2,
    y: SLIDE_PADDING_MM,
  };
};

const createGroupedPage = (
  host: HTMLElement,
  elements: HTMLElement[],
  columns: 1 | 2,
) => {
  const wrapper = document.createElement('div');
  wrapper.style.width = `${CAPTURE_WIDTH_PX}px`;
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.background = PDF_BACKGROUND;
  wrapper.style.padding = '24px 28px';
  wrapper.style.display = 'grid';
  wrapper.style.gridTemplateColumns = columns === 2 ? 'repeat(2, minmax(0, 1fr))' : '1fr';
  wrapper.style.gap = '20px';
  wrapper.style.alignItems = 'stretch';

  elements.forEach((element) => {
    const child = element.cloneNode(true) as HTMLElement;
    child.style.margin = '0';
    child.style.width = '100%';
    child.style.maxWidth = 'none';
    child.style.minWidth = '0';
    child.style.height = 'auto';
    child.style.maxHeight = 'none';
    child.style.overflow = 'visible';
    wrapper.appendChild(child);
  });

  host.appendChild(wrapper);
  return wrapper;
};

const captureElement = async (element: HTMLElement) => {
  element.style.overflow = 'visible';
  element.style.maxHeight = 'none';
  element.style.height = 'auto';

  await nextFrame();

  const rect = element.getBoundingClientRect();
  const width = Math.max(Math.ceil(rect.width), element.scrollWidth, 1);
  const height = Math.max(Math.ceil(rect.height), element.scrollHeight, 1) + 12;

  return html2canvas(element, {
    backgroundColor: PDF_BACKGROUND,
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    width,
    height,
    windowWidth: CAPTURE_WIDTH_PX,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
  });
};

export const sanitizePdfFileName = (value: string) => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized || 'empresa';
};

export async function generateAssessmentPdf(
  source: HTMLElement,
  options: AssessmentPdfOptions,
) {
  const generatedAt = options.generatedAt ?? new Date();
  const { host, clone } = prepareClone(source);

  try {
    await nextFrame();
    await waitForImages(clone);

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [SLIDE_WIDTH_MM, SLIDE_HEIGHT_MM],
      compress: true,
    });

    pdf.setProperties({
      title: `Concierge Security Assessment - ${options.companyName || 'Relatório'}`,
      subject: 'Relatório executivo de segurança',
      author: 'Concierge Segurança Digital',
      creator: 'Concierge Security Assessment',
    });

    const logicalPages = Array.from(
      clone.querySelectorAll<HTMLElement>('[data-pdf-page="true"]'),
    ).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (logicalPages.length === 0) {
      throw new Error('Nenhum bloco de página foi encontrado para gerar o PDF.');
    }

    const pageCanvases: HTMLCanvasElement[] = [];
    const temporaryPages: HTMLElement[] = [];

    for (let index = 0; index < logicalPages.length; index += 1) {
      const element = logicalPages[index];

      const groupName = element.dataset['pdfGroup'];
      if (groupName) {
        const group: HTMLElement[] = [element];
        while (
          index + 1 < logicalPages.length &&
          logicalPages[index + 1]?.dataset['pdfGroup'] === groupName
        ) {
          group.push(logicalPages[index + 1]);
          index += 1;
        }

        const wrapper = createGroupedPage(host, group, 1);
        wrapper.style.padding = '26px 34px';
        wrapper.style.gap = '18px';
        temporaryPages.push(wrapper);
        const canvas = await captureElement(wrapper);
        if (!isCanvasMostlyBackground(canvas)) pageCanvases.push(canvas);
        continue;
      }

      if (element.dataset['pdfDetail'] === 'true') {
        const batch: HTMLElement[] = [element];
        const next = logicalPages[index + 1];
        if (next?.dataset['pdfDetail'] === 'true') {
          batch.push(next);
          index += 1;
        }

        const wrapper = createGroupedPage(host, batch, batch.length === 2 ? 2 : 1);
        if (batch.length === 1) {
          const onlyChild = wrapper.firstElementChild as HTMLElement | null;
          if (onlyChild) {
            onlyChild.style.maxWidth = '820px';
            onlyChild.style.margin = '0 auto';
          }
        }
        temporaryPages.push(wrapper);
        const canvas = await captureElement(wrapper);
        if (!isCanvasMostlyBackground(canvas)) pageCanvases.push(canvas);
        continue;
      }

      const canvas = await captureElement(element);
      if (!isCanvasMostlyBackground(canvas)) pageCanvases.push(canvas);
    }

    temporaryPages.forEach((element) => element.remove());

    if (pageCanvases.length === 0) {
      throw new Error('O relatório não possui conteúdo visível para exportação.');
    }

    const totalSlides = pageCanvases.length;

    pageCanvases.forEach((slideCanvas, index) => {
      if (index > 0) pdf.addPage([SLIDE_WIDTH_MM, SLIDE_HEIGHT_MM], 'landscape');

      pdf.setFillColor(2, 6, 23);
      pdf.rect(0, 0, SLIDE_WIDTH_MM, SLIDE_HEIGHT_MM, 'F');

      const image = slideCanvas.toDataURL('image/jpeg', 0.98);
      const placement = fitInsideSlide(slideCanvas.width, slideCanvas.height);

      pdf.addImage(
        image,
        'JPEG',
        placement.x,
        placement.y,
        placement.width,
        placement.height,
        undefined,
        'MEDIUM',
      );

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.2);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `Concierge Security Assessment${options.companyName ? ` | ${options.companyName}` : ''}`,
        8,
        SLIDE_HEIGHT_MM - 4.5,
      );
      pdf.text(`${index + 1} / ${totalSlides}`, SLIDE_WIDTH_MM - 8, SLIDE_HEIGHT_MM - 4.5, {
        align: 'right',
      });
    });

    const dateLabel = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(generatedAt);

    pdf.setPage(totalSlides);
    pdf.setFontSize(6.4);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      `Gerado em ${dateLabel}. Diagnóstico inicial baseado nas informações fornecidas durante o Assessment.`,
      8,
      SLIDE_HEIGHT_MM - 1.8,
    );

    pdf.save(options.fileName);
  } finally {
    host.remove();
  }
}
