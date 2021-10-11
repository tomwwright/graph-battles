import * as React from "react";
import { Card, Box, Subhead, Divider, Image, Container } from 'rebass';
import Styled from 'styled-components';

import { NewGame } from 'lobby/containers/NewGame';
import { SavedGameList } from 'lobby/containers/SavedGameList';

const Wrapper = Styled(Card) `
  margin: auto;
`;

export const Root: React.StatelessComponent<{}> = () => (
  <Wrapper width={800} my={1}>
    <Image width='100%' src={`/assets/territory-portrait.jpg`} />
    <Box p={4}>
      <Subhead>New Game</Subhead>
      <NewGame />
      <Divider color='#CCC' my={4} mx={3} />
      <Subhead>Saved Games</Subhead>
      <SavedGameList />
    </Box>
  </Wrapper>
);