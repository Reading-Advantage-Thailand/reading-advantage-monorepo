import {makeScene2D, Img, Layout, Rect, Txt} from '@revideo/2d';
import {all, createRef, easeInOutCubic, easeOutBack, easeOutCubic, useScene} from '@revideo/core';

export default makeScene2D('intro', function* (view) {
  const scene = useScene();
  const logoPath = String(scene.variables.get('logoPath', 'images/logo.jpg')());
  const title = String(scene.variables.get('title', 'Blog Title')());
  const introDuration = Number(scene.variables.get('introDuration', 3)()) || 3;
  const titleFontSize = Number(scene.variables.get('titleFontSize', 62)()) || 62;

  const layoutRef = createRef<Layout>();
  const logoRef = createRef<Img>();
  const titleRef = createRef<Txt>();

  view.add(
    <Layout ref={layoutRef}>
      <Rect width={1080} height={1920} fill="#0a0a0a" />
      <Img
        ref={logoRef}
        src={logoPath}
        width={400}
        height={400}
        x={0}
        y={-350}
        radius={20}
        opacity={0}
      />
      <Txt
        ref={titleRef}
        text={title}
        fontSize={titleFontSize}
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
    logoRef().opacity(1, 0.8, easeOutCubic),
    logoRef().scale(0.8, 0).to(1, 0.8, easeOutBack),
    titleRef().opacity(1, 0.8, easeOutCubic),
    titleRef().y(280, 0.8, easeOutCubic),
  );
  yield* all(
    logoRef().scale(1, Math.max(0.2, introDuration - 1.3)),
    titleRef().opacity(1, Math.max(0.2, introDuration - 1.3)),
  );
  yield* all(
    logoRef().opacity(0, 0.5, easeInOutCubic),
    titleRef().opacity(0, 0.5, easeInOutCubic),
  );
});
