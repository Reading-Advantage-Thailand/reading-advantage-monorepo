import React from 'react';
import { Composition } from 'remotion';
import { WizardZombiePromo } from './compositions/WizardZombiePromo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WizardZombiePromo"
        component={WizardZombiePromo}
        durationInFrames={1050} // 35 seconds at 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};