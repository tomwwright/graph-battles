import * as React from "react";
import { Card, Box } from "rebass";

const InfoPane: React.StatelessComponent<{}> = ({ children }) => (
  <Card width={256} my={1}>
    <Box p={1}>{children}</Box>
  </Card>
);

export default InfoPane;
