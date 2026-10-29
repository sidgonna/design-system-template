// Types for components/react (plain-JS wrappers; no build step). React 18+.
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, ForwardRefExoticComponent, RefAttributes, ElementType, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual role. Default "primary". One primary per view. */
  variant?: ButtonVariant;
  /** Shows the spinner, sets aria-busy and aria-disabled, ignores clicks; the label stays visible. */
  loading?: boolean;
  /** Announced to screen readers while loading (a visually hidden role="status"). Default "Loading". */
  loadingLabel?: string;
}
export declare const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'children'> {
  /** Visible label (required: never use a placeholder as the label). */
  label: ReactNode;
  /** Help text under the field, linked with aria-describedby. */
  hint?: ReactNode;
  /** Error message. When set: data-variant="error", aria-invalid, the message is linked, the field shakes once
   *  (again when a text message changes; a JSX message shakes only when it first appears). */
  error?: ReactNode;
}
export declare const Input: ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>>;

export type CardVariant = 'flat' | 'raised';
export interface CardProps extends HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  /** Lift on hover / focus-within. Put a real link or button inside. */
  interactive?: boolean;
  /** Play the entrance animation (data-enter): for a card that arrives after load, not every card in a list. */
  enter?: boolean;
  /** Element to render. Default "article". */
  as?: ElementType;
}
export declare const Card: ForwardRefExoticComponent<CardProps & RefAttributes<HTMLElement>>;

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info';
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** A status that changes while the user is on the page: role="status", announced politely. */
  live?: boolean;
}
export declare const Badge: ForwardRefExoticComponent<BadgeProps & RefAttributes<HTMLSpanElement>>;

export type FieldVariant = 'default' | 'error';
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children?: ReactNode;
}
export declare const Select: ForwardRefExoticComponent<SelectProps & RefAttributes<HTMLSelectElement>>;

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  rows?: number;
}
export declare const Textarea: ForwardRefExoticComponent<TextareaProps & RefAttributes<HTMLTextAreaElement>>;

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label: ReactNode;
}
export declare const Checkbox: ForwardRefExoticComponent<CheckboxProps & RefAttributes<HTMLInputElement>>;

export interface RadioOption { label: ReactNode; value: string; disabled?: boolean }
export interface RadioProps extends HTMLAttributes<HTMLFieldSetElement> {
  legend: ReactNode;
  options?: RadioOption[];
  name?: string;
  value?: string;
  disabled?: boolean;
}
export declare const Radio: ForwardRefExoticComponent<RadioProps & RefAttributes<HTMLFieldSetElement>>;

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'role'> {
  label: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
}
export declare const Switch: ForwardRefExoticComponent<SwitchProps & RefAttributes<HTMLButtonElement>>;

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';
export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: ReactNode;
  /** Announces the message: role=alert for error and warning, role=status otherwise. */
  live?: boolean;
}
export declare const Alert: ForwardRefExoticComponent<AlertProps & RefAttributes<HTMLDivElement>>;

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';
export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant;
  title?: ReactNode;
  /** Fixed corner toast for apps. The board leaves this off so the toast stays in the page flow. */
  float?: boolean;
  onDismiss?: () => void;
}
export declare const Toast: ForwardRefExoticComponent<ToastProps & RefAttributes<HTMLDivElement>>;

export interface DialogProps extends HTMLAttributes<HTMLDialogElement> {
  open?: boolean;
  title: ReactNode;
  onClose?: () => void;
}
export declare const Dialog: ForwardRefExoticComponent<DialogProps & RefAttributes<HTMLDialogElement>>;

export interface TooltipProps {
  tip: ReactNode;
  children?: ReactNode;
}
export declare function Tooltip(props: TooltipProps): ReactNode;

export type AvatarVariant = 'initials' | 'icon';
export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: AvatarVariant;
  /** Accessible name. */
  label: string;
}
export declare const Avatar: ForwardRefExoticComponent<AvatarProps & RefAttributes<HTMLSpanElement>>;

export interface TableProps extends HTMLAttributes<HTMLDivElement> {
  caption?: ReactNode;
}
export declare const Table: ForwardRefExoticComponent<TableProps & RefAttributes<HTMLDivElement>>;

export interface TabItem { id?: string; label: ReactNode; panel?: ReactNode }
export interface TabsProps {
  label?: string;
  tabs?: TabItem[];
  value?: string;
}
export declare function Tabs(props: TabsProps): ReactNode;

export interface NavItem { href: string; label: ReactNode; current?: boolean }
export interface NavProps extends HTMLAttributes<HTMLElement> {
  label?: string;
  items?: NavItem[];
}
export declare const Nav: ForwardRefExoticComponent<NavProps & RefAttributes<HTMLElement>>;
