import {makeScene2D} from '@revideo/2d';
import {Rect, Txt} from '@revideo/2d';
import {waitFor} from '@revideo/core';

export default makeScene2D('test-scene', function* (view) {
  view.add(
    <Rect width={100} height={100} fill="#ff0000" />
  );
  view.add(
    <Txt text="Hello" fontSize={30} fill="#ffffff" />
  );
  yield* waitFor(1);
});
