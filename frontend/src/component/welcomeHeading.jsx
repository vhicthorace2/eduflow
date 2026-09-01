import { useState } from 'react';
import { consumeNewUserFlag } from './sessionFlags.js';

function WelcomeHeading({ name }) {
  const [isNewUser] = useState(consumeNewUserFlag);
  return <>{isNewUser ? 'Welcome' : 'Welcome back'}, {name}</>;
}

export default WelcomeHeading;