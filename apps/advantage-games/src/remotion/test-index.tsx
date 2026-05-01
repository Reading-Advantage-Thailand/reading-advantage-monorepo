import { registerRoot } from 'remotion';
import { Composition, Still } from 'remotion';
import { WizardZombiePromo } from './compositions/WizardZombiePromo';

registerRoot(() => (
  <>
    <Still
      id="WizardZombiePromo-Still"
      component={WizardZombiePromo}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
  </>
));