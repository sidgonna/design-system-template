// expect: unknown-component=3
// @ts-nocheck — a lint fixture, not app code: an app's tsconfig that includes **/*.tsx must not type-check it.
// The inventory's bare import path is this design system, not a third-party package, so its tags are checked.
import { Button, Badge } from 'design-system/components/react';
import { Card } from '@acme/ui/design-system/components/react';
export const Bar = () => (
  <div>
    <Button variant="tertiary">Go</Button>
    <Badge variant="info" size="lg">New</Badge>
    <Card variant="glass">x</Card>
  </div>
);
