import * as React from 'react';
import { Fixed, Overlay, Heading, Text } from 'rebass';

export const ReadyPopup: React.StatelessComponent<{}> = () => (
  <div>
    <Fixed top right bottom left />
    <Overlay>
      <Heading>Ready</Heading>
      <Text>Waiting for other players...</Text>
    </Overlay>
  </div>
);
