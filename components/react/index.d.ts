// Types for components/react (plain-JS wrappers; no build step). React 18+.
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, ForwardRefExoticComponent, RefAttributes, ElementType } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual role. Default "primary". One primary per view. */
  variant?: ButtonVariant;
  /** Shows the spinner, sets aria-busy and aria-disabled, ignores clicks; the label stays visible. */
  loading?: boolean;
}
export declare const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  /** Visible label (required: never use a placeholder as the label). */
  label: ReactNode;
  /** Help text under the field, linked with aria-describedby. */
  hint?: ReactNode;
  /** Error message. When set: data-variant="error", aria-invalid, the message is linked, the field shakes once. */
  error?: ReactNode;
}
export declare const Input: ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>>;

export type CardVariant = 'flat' | 'raised';
export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  /** Lift on hover / focus-within. Put a real link or button inside. */
  interactive?: boolean;
  /** Element to render. Default "article". */
  as?: ElementType;
}
export declare const Card: ForwardRefExoticComponent<CardProps & RefAttributes<HTMLElement>>;

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info';
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}
export declare const Badge: ForwardRefExoticComponent<BadgeProps & RefAttributes<HTMLSpanElement>>;
