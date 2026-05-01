import {makeScene2D, Img, Layout, Rect, Txt} from '@revideo/2d';
import {all, createRef, easeInOutCubic, easeOutBack, easeOutCubic, useScene} from '@revideo/core';

export default makeScene2D('outro', function* (view) {
  const scene = useScene();
  const logoPath = String(scene.variables.get('logoPath', 'images/logo.jpg')());
  const ctaText = String(scene.variables.get('ctaText', 'Read the full blog - link in description!')());
  const outroDuration = Number(scene.variables.get('outroDuration', 3)()) || 3;
  const brandColor = String(scene.variables.get('brandColor', '#2563eb')());
  const ctaFontSize = Number(scene.variables.get('ctaFontSize', 56)()) || 56;

  const layoutRef = createRef<Layout>();
  const bgRef = createRef<Rect>();
  const logoRef = createRef<Img>();
  const textRef = createRef<Txt>();

  view.add(
    <Layout ref={layoutRef}>
      <Rect ref={bgRef} width={1080} height={1920} fill={brandColor} opacity={0} />
      <Img
        ref={logoRef}
        src={logoPath}
        width={300}
        height={300}
        x={0}
        y={-300}
        radius={20}
        opacity={0}
      />
      <Txt
        ref={textRef}
        text={ctaText}
        fontSize={ctaFontSize}
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
    bgRef().opacity(1, 0.5, easeOutCubic),
    logoRef().opacity(1, 0.8, easeOutCubic),
    logoRef().scale(0.8, 0).to(1, 0.8, easeOutBack),
    textRef().opacity(1, 0.8, easeOutCubic),
    textRef().y(190, 0.8, easeOutCubic),
  );
  yield* all(
    bgRef().opacity(1, Math.max(0.2, outroDuration - 1.3)),
    logoRef().opacity(1, Math.max(0.2, outroDuration - 1.3)),
    textRef().opacity(1, Math.max(0.2, outroDuration - 1.3)),
  );
  yield* all(
    bgRef().opacity(0, 0.5, easeInOutCubic),
    logoRef().opacity(0, 0.5, easeInOutCubic),
    textRef().opacity(0, 0.5, easeInOutCubic),
  );
});
