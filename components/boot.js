// Board boot: wire tabs, switches, dialogs, tooltips, toasts and pattern forms after the page is parsed.
// index.js does not run this on import, so the React server render and the helper tests stay free of side effects.
import { mount } from './index.js';

function boot() { mount(document); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
