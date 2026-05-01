import {makeScene2D, Img, Layout, Rect, Txt} from '@revideo/2d';
import {
  all,
  createRef,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  linear,
  useScene,
  waitFor,
} from '@revideo/core';

type VideoSegment = {
  text: string;
  imagePath: string;
};

function wrapOverlayText(text: string, maxCharsPerLine: number, maxLines: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return '';
  }

  const charCount = (value: string) => Array.from(value).length;
  let tokens: string[];

  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter !== 'undefined') {
    const segmenter = new Intl.Segmenter('th', {granularity: 'word'});
    const segmented = Array.from(segmenter.segment(cleaned), part => part.segment).filter(Boolean);
    tokens = segmented.length > 0 ? segmented : cleaned.split(/(\s+)/).filter(Boolean);
  } else {
    tokens = cleaned.split(/(\s+)/).filter(Boolean);
  }

  if (tokens.length === 1 && !/\s/.test(tokens[0])) {
    tokens = Array.from(tokens[0]);
  }

  const lines: string[] = [];
  let currentLine = '';

  for (const token of tokens) {
    const nextLine = `${currentLine}${token}`;
    if (currentLine && charCount(nextLine) > maxCharsPerLine) {
      lines.push(currentLine.trim());
      currentLine = token.trimStart();
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  if (lines.length > maxLines) {
    const trimmed = lines.slice(0, maxLines);
    const lastLine = trimmed[maxLines - 1];
    const clipped = Array.from(lastLine).slice(0, Math.max(0, maxCharsPerLine - 1)).join('').trimEnd();
    trimmed[maxLines - 1] = `${clipped}…`;
    return trimmed.join('\n');
  }

  return lines.join('\n');
}

export default makeScene2D('blog-video', function* (view) {
  const scene = useScene();
  const logoPath = String(scene.variables.get('logoPath', 'images/logo.jpg')());
  const title = String(scene.variables.get('title', 'Blog Title')());
  const rawSegments = scene.variables.get('segments', [] as VideoSegment[] | string)();
  const ctaText = String(scene.variables.get('ctaText', 'Read the full blog - link in description!')());
  const introDuration = Number(scene.variables.get('introDuration', 3)()) || 3;
  const outroDuration = Number(scene.variables.get('outroDuration', 3)()) || 3;
  const narrationDuration = Number(scene.variables.get('narrationDuration', 60)()) || 60;
  const brandColor = String(scene.variables.get('brandColor', '#2563eb')());
  const rawSegmentDurations = scene.variables.get('segmentDurations', [] as number[] | string)();
  const wrappedTitle = wrapOverlayText(title, 22, 3);
  const wrappedCtaText = wrapOverlayText(ctaText, 22, 3);

  let segments: VideoSegment[] = [];
  if (Array.isArray(rawSegments)) {
    segments = rawSegments as VideoSegment[];
  } else if (typeof rawSegments === 'string') {
    try {
      const parsed = JSON.parse(rawSegments);
      if (Array.isArray(parsed)) {
        segments = parsed as VideoSegment[];
      }
    } catch (error) {
      // Ignore parse failures and use fallback segment below.
    }
  }

  let segmentDurations: number[] = [];
  if (Array.isArray(rawSegmentDurations)) {
    segmentDurations = rawSegmentDurations as number[];
  } else if (typeof rawSegmentDurations === 'string') {
    try {
      const parsed = JSON.parse(rawSegmentDurations);
      if (Array.isArray(parsed)) {
        segmentDurations = parsed as number[];
      }
    } catch (error) {
      // Ignore parse failures.
    }
  }

  const safeSegments = segments.length > 0 ? segments : [{text: title, imagePath: logoPath}];

  // Use per-segment durations if provided, otherwise fall back to equal division
  const safeSegmentDurations: number[] = safeSegments.map((_, i) => {
    if (segmentDurations[i] && Number.isFinite(segmentDurations[i]) && segmentDurations[i] > 0) {
      return segmentDurations[i];
    }
    // Fallback: equal division based on narrationDuration
    const totalDuration = Math.max(20, narrationDuration);
    const contentDuration = Math.max(safeSegments.length * 4, totalDuration - introDuration - outroDuration);
    return contentDuration / safeSegments.length;
  });

  // Intro
  const introLayoutRef = createRef<Layout>();
  const introLogoRef = createRef<Img>();
  const introTitleRef = createRef<Txt>();
  view.add(
    <Layout ref={introLayoutRef}>
      <Rect width={1080} height={1920} fill="#0a0a0a" />
      <Img
        ref={introLogoRef}
        src={logoPath}
        width={400}
        height={400}
        x={0}
        y={-200}
        radius={20}
        opacity={0}
      />
      <Txt
        ref={introTitleRef}
        text={wrappedTitle}
        fontSize={62}
        fontWeight={700}
        fill="#ffffff"
        textAlign="center"
        width={860}
        x={0}
        y={300}
        lineHeight={76}
        opacity={0}
      />
    </Layout>,
  );

  yield* all(
    introLogoRef().opacity(1, 0.8, easeOutCubic),
    introLogoRef().scale(0.8, 0).to(1, 0.8, easeOutBack),
    introTitleRef().opacity(1, 0.8, easeOutCubic),
    introTitleRef().y(280, 0.8, easeOutCubic),
  );
  yield* waitFor(Math.max(0.2, introDuration - 1.3));
  yield* all(
    introLogoRef().opacity(0, 0.5, easeInOutCubic),
    introTitleRef().opacity(0, 0.5, easeInOutCubic),
  );
  introLayoutRef().remove();

  // Content segments
  for (let segIdx = 0; segIdx < safeSegments.length; segIdx++) {
    const segment = safeSegments[segIdx];
    const segmentDuration = safeSegmentDurations[segIdx];
    const wrappedSegmentText = wrapOverlayText(segment.text, 24, 4);
    const fadeInDuration = Math.min(0.6, Math.max(0.2, segmentDuration * 0.2));
    const fadeOutDuration = Math.min(0.5, Math.max(0.2, segmentDuration * 0.2));
    const holdDuration = Math.max(0.2, segmentDuration - fadeInDuration - fadeOutDuration);
    const segmentLayoutRef = createRef<Layout>();
    const imgRef = createRef<Img>();
    const overlayRef = createRef<Rect>();
    const textBgRef = createRef<Rect>();
    const textRef = createRef<Txt>();

    view.add(
      <Layout ref={segmentLayoutRef}>
        <Img
          ref={imgRef}
          src={segment.imagePath}
          width={1080}
          height={1920}
          opacity={0}
        />
        <Rect
          ref={overlayRef}
          width={1080}
          height={1920}
          fill="rgba(0,0,0,0.45)"
          opacity={0}
        />
        <Rect
          ref={textBgRef}
          width={940}
          height={300}
          fill={brandColor}
          x={0}
          y={620}
          opacity={0}
          radius={20}
        />
        <Txt
          ref={textRef}
          text={wrappedSegmentText}
          fontSize={44}
          fontWeight={700}
          fill="#ffffff"
          textAlign="center"
          width={840}
          x={0}
          y={620}
          lineHeight={58}
          opacity={0}
        />
      </Layout>,
    );

    imgRef().scale(1.08);
    yield* all(
      imgRef().opacity(1, fadeInDuration, easeOutCubic),
      overlayRef().opacity(1, fadeInDuration, easeOutCubic),
      textBgRef().opacity(0.9, fadeInDuration, easeOutCubic),
      textRef().opacity(1, fadeInDuration, easeOutCubic),
      textRef().y(600, fadeInDuration, easeOutCubic),
    );
    yield* all(
      imgRef().scale(1, holdDuration, linear),
      waitFor(holdDuration),
    );
    yield* all(
      imgRef().opacity(0, fadeOutDuration, easeInOutCubic),
      overlayRef().opacity(0, fadeOutDuration, easeInOutCubic),
      textBgRef().opacity(0, fadeOutDuration, easeInOutCubic),
      textRef().opacity(0, fadeOutDuration, easeInOutCubic),
    );
    segmentLayoutRef().remove();
  }

  // Outro
  const outroLayoutRef = createRef<Layout>();
  const outroBgRef = createRef<Rect>();
  const outroLogoRef = createRef<Img>();
  const outroTextRef = createRef<Txt>();

  view.add(
    <Layout ref={outroLayoutRef}>
      <Rect ref={outroBgRef} width={1080} height={1920} fill={brandColor} opacity={0} />
      <Img
        ref={outroLogoRef}
        src={logoPath}
        width={300}
        height={300}
        x={0}
        y={-250}
        radius={20}
        opacity={0}
      />
      <Txt
        ref={outroTextRef}
        text={wrappedCtaText}
        fontSize={56}
        fontWeight={700}
        fill="#ffffff"
        textAlign="center"
        width={860}
        x={0}
        y={220}
        lineHeight={72}
        opacity={0}
      />
    </Layout>,
  );

  yield* all(
    outroBgRef().opacity(1, 0.5, easeOutCubic),
    outroLogoRef().opacity(1, 0.8, easeOutCubic),
    outroLogoRef().scale(0.8, 0).to(1, 0.8, easeOutBack),
    outroTextRef().opacity(1, 0.8, easeOutCubic),
    outroTextRef().y(190, 0.8, easeOutCubic),
  );
  yield* waitFor(Math.max(0.2, outroDuration - 1.3));
  yield* all(
    outroBgRef().opacity(0, 0.5, easeInOutCubic),
    outroLogoRef().opacity(0, 0.5, easeInOutCubic),
    outroTextRef().opacity(0, 0.5, easeInOutCubic),
  );
  outroLayoutRef().remove();
});
