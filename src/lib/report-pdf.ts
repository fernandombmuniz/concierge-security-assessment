import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export interface AssessmentPdfOptions {
  fileName: string;
  companyName?: string;
  generatedAt?: Date;
}

const PDF_BACKGROUND = '#020617';
const CAPTURE_WIDTH_PX = 1440;
const SLIDE_WIDTH_MM = 338.67;  // 13.333 in
const SLIDE_HEIGHT_MM = 190.50; // 7.5 in
const SLIDE_PADDING_MM = 8;

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
  clone.style.padding = '34px';
  clone.style.boxSizing = 'border-box';
  clone.style.background = PDF_BACKGROUND;

  removeInteractiveElements(clone);

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-20000px';
  host.style.top = '0';
  host.style.width = `${CAPTURE_WIDTH_PX}px`;
  host.style.zIndex = '-9999';
  host.style.background = PDF_BACKGROUND;
  host.style.pointerEvents = 'none';
  host.style.overflow = 'hidden';

  host.appendChild(clone);
  document.body.appendChild(host);

  return { host, clone };
};

type SlideSlice = {
  start: number;
  end: number;
};

const collectUsefulBreaks = (root: HTMLElement) => {
  const rootRect = root.getBoundingClientRect();

  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'section, article, [data-report-slide-break="true"]',
    ),
  )
    .map((element) => {
      const rect = element.getBoundingClientRect();

      return {
        top: Math.max(0, rect.top - rootRect.top),
        height: rect.height,
      };
    })
    .filter((item) => item.top > 0 && item.height > 0)
    .map((item) => item.top)
    .sort((a, b) => a - b);
};


const collectTopLevelSectionStarts = (root: HTMLElement) => {
  const rootRect = root.getBoundingClientRect();

  return Array.from(root.children)
    .filter((element): element is HTMLElement => element instanceof HTMLElement)
    .filter((element) => element.tagName.toLowerCase() === 'section')
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return Math.max(0, rect.top - rootRect.top);
    })
    .filter((top) => top > 0)
    .sort((a, b) => a - b);
};


type ProtectedRange = {
  start: number;
  end: number;
};

const collectProtectedRanges = (root: HTMLElement): ProtectedRange[] => {
  const rootRect = root.getBoundingClientRect();

  return Array.from(root.querySelectorAll<HTMLElement>('article'))
    .map((element) => {
      const rect = element.getBoundingClientRect();

      return {
        start: Math.max(0, rect.top - rootRect.top),
        end: Math.max(0, rect.bottom - rootRect.top),
      };
    })
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start);
};

const buildSlideSlices = (
  totalHeight: number,
  targetHeight: number,
  breaks: number[],
  protectedRanges: ProtectedRange[] = [],
): SlideSlice[] => {
  const slides: SlideSlice[] = [];
  let start = 0;

  while (start < totalHeight - 1) {
    let idealEnd = Math.min(totalHeight, start + targetHeight);

    if (idealEnd >= totalHeight) {
      slides.push({ start, end: totalHeight });
      break;
    }

    // Se o corte cair no meio de um card de "Pontos principais",
    // preservamos o card inteiro.
    const crossingRange = protectedRanges.find(
      (range) =>
        range.start < idealEnd &&
        range.end > idealEnd &&
        range.end > start,
    );

    if (crossingRange) {
      const contentBeforeCard = crossingRange.start - start;
      const fullCardHeight = crossingRange.end - crossingRange.start;

      // Se já existe conteúdo suficiente antes do card, encerramos o slide
      // exatamente antes dele.
      if (contentBeforeCard >= targetHeight * 0.34) {
        idealEnd = crossingRange.start;
      } else {
        // Caso o card comece cedo no slide, mantemos o card inteiro.
        // Mesmo que a faixa fique um pouco maior, o conteúdo é reduzido
        // proporcionalmente para caber no slide 16:9.
        idealEnd = Math.min(
          totalHeight,
          Math.max(crossingRange.end, start + Math.min(fullCardHeight, targetHeight)),
        );
      }
    } else {
      const minUseful = start + targetHeight * 0.64;

      const candidate = breaks
        .filter((point) => point > minUseful && point < idealEnd)
        .at(-1);

      if (candidate && candidate > start + 250) {
        idealEnd = candidate;
      }
    }

    // Proteção contra loops por arredondamento ou ranges muito próximos.
    if (idealEnd <= start + 1) {
      idealEnd = Math.min(totalHeight, start + targetHeight);
    }

    slides.push({ start, end: idealEnd });
    start = idealEnd;
  }

  return slides;
};

const cropCanvas = (
  source: HTMLCanvasElement,
  startY: number,
  endY: number,
) => {
  const height = Math.max(1, endY - startY);
  const slice = document.createElement('canvas');

  slice.width = source.width;
  slice.height = height;

  const context = slice.getContext('2d');

  if (!context) {
    throw new Error('Não foi possível preparar o slide do relatório.');
  }

  context.fillStyle = PDF_BACKGROUND;
  context.fillRect(0, 0, slice.width, slice.height);

  context.drawImage(
    source,
    0,
    startY,
    source.width,
    height,
    0,
    0,
    source.width,
    height,
  );

  return slice;
};

const fitInsideSlide = (
  imageWidth: number,
  imageHeight: number,
) => {
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

    const capture = await html2canvas(clone, {
      backgroundColor: PDF_BACKGROUND,
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: CAPTURE_WIDTH_PX,
      windowWidth: 1440,
      scrollX: 0,
      scrollY: 0,
    });

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

    const printableWidthMm = SLIDE_WIDTH_MM - SLIDE_PADDING_MM * 2;
    const printableHeightMm = SLIDE_HEIGHT_MM - SLIDE_PADDING_MM * 2;

    const targetSlideHeightCss =
      clone.scrollWidth * (printableHeightMm / printableWidthMm);

    const breaks = collectUsefulBreaks(clone);
    const topLevelSections = collectTopLevelSectionStarts(clone);
    const protectedRanges = collectProtectedRanges(clone);

    // O primeiro slide deve preservar como um único bloco:
    // cabeçalho + "Resumo do diagnóstico" + "Indicador de maturidade / Visão por área".
    // Em vez de cortar no meio do score, encerramos o primeiro slide
    // exatamente antes da terceira seção principal ("O que entendemos").
    const firstSlideEnd =
      topLevelSections.length >= 3
        ? topLevelSections[2]
        : Math.min(clone.scrollHeight, targetSlideHeightCss);

    const remainingBreaks = breaks.filter((point) => point > firstSlideEnd);

    const remainingSlices =
      firstSlideEnd < clone.scrollHeight
        ? buildSlideSlices(
            clone.scrollHeight - firstSlideEnd,
            targetSlideHeightCss,
            remainingBreaks.map((point) => point - firstSlideEnd),
            protectedRanges
              .filter((range) => range.end > firstSlideEnd)
              .map((range) => ({
                start: Math.max(0, range.start - firstSlideEnd),
                end: Math.max(0, range.end - firstSlideEnd),
              })),
          ).map(({ start, end }) => ({
            start: start + firstSlideEnd,
            end: end + firstSlideEnd,
          }))
        : [];

    const slicesCss = [
      { start: 0, end: firstSlideEnd },
      ...remainingSlices,
    ];

    const scaleY = capture.height / clone.scrollHeight;

    const slides = slicesCss.map(({ start, end }) => ({
      start: Math.max(0, Math.round(start * scaleY)),
      end: Math.min(capture.height, Math.round(end * scaleY)),
    }));

    const totalSlides = slides.length;

    slides.forEach(({ start, end }, index) => {
      if (index > 0) {
        pdf.addPage([SLIDE_WIDTH_MM, SLIDE_HEIGHT_MM], 'landscape');
      }

      pdf.setFillColor(2, 6, 23);
      pdf.rect(0, 0, SLIDE_WIDTH_MM, SLIDE_HEIGHT_MM, 'F');

      const slideCanvas = cropCanvas(capture, start, end);
      const image = slideCanvas.toDataURL('image/jpeg', 0.95);

      const placement = fitInsideSlide(
        slideCanvas.width,
        slideCanvas.height,
      );

      pdf.addImage(
        image,
        'JPEG',
        placement.x,
        placement.y,
        placement.width,
        placement.height,
        undefined,
        'FAST',
      );

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.2);
      pdf.setTextColor(100, 116, 139);

      pdf.text(
        `Concierge Security Assessment${options.companyName ? ` | ${options.companyName}` : ''}`,
        8,
        SLIDE_HEIGHT_MM - 4.5,
      );

      pdf.text(
        `${index + 1} / ${totalSlides}`,
        SLIDE_WIDTH_MM - 8,
        SLIDE_HEIGHT_MM - 4.5,
        { align: 'right' },
      );
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
