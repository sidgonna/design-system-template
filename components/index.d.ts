// Types for components/index.js (dependency-free DOM helpers).
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type CardVariant = 'flat' | 'raised';
export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info';
export declare function createButton(o?: { label?: string; variant?: ButtonVariant; type?: 'button' | 'submit' | 'reset'; disabled?: boolean; loading?: boolean; onClick?: (e: MouseEvent) => void }): HTMLButtonElement;
export declare function setButtonLoading(button: HTMLButtonElement, loading?: boolean): HTMLButtonElement;
export declare function createInput(o: { label: string; hint?: string; error?: string; id?: string; type?: string; name?: string; required?: boolean; disabled?: boolean; value?: string; autocomplete?: string; inputmode?: string }): HTMLDivElement;
export declare function setInputError(root: HTMLElement, message: string | null): HTMLElement;
export declare function createCard(o?: { variant?: CardVariant; interactive?: boolean; as?: string; children?: (Node | string)[] | string }): HTMLElement;
export declare function createBadge(o?: { label?: string; variant?: BadgeVariant }): HTMLSpanElement;
export declare function replay<T extends Element>(el: T): T;
export declare const variants: { button: ButtonVariant[]; card: CardVariant[]; badge: BadgeVariant[] };
