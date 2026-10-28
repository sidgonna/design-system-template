'use client';
// React wrappers for the shipped components. 'use client' (first line of every wrapper): they use hooks and refs,
// so in the Next.js App Router they are Client Components that a Server Component page can still render. Import:
//   import { Button, Input, Card, Badge } from '../design-system/components/react';
// The CSS comes with it (one import of ../components.css); the tokens must be imported once in the app entry:
//   import '../design-system/design-build/preview/tokens.css';
import '../components.css';

export { Button } from './Button.js';
export { Input } from './Input.js';
export { Card } from './Card.js';
export { Badge } from './Badge.js';
