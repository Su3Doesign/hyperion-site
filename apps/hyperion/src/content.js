// All copy and studio details live here so the owner can edit them without touching components.
// Empty strings hide a field rather than shipping a dead link.

export const studio = {
  name: 'Sumanth Richie',
  disciplines: ['3D environment design', 'Hard-surface modelling', 'VFX'],
  email: '', // e.g. 'hello@yourdomain.com' — shown as selectable text with a copy button
  links: [
    { label: 'Behance', href: '' },
    { label: 'Instagram', href: '' },
    { label: 'LinkedIn', href: '' },
  ],
  // the studio's AI chat (apps/pitwall) and the case study (apps/teardown). The artifact preview build
  // links to the published previews; the GitHub Pages build serves them in sub-folders of the site.
  pitwall: import.meta.env.VITE_MODEL_WRAP ? 'https://claude.ai/artifact/63Bzikf32mBaq292tNQCBC' : './pitwall/',
  teardown: import.meta.env.VITE_MODEL_WRAP ? 'https://claude.ai/artifact/5U9ZjUJav93rqtKW1v3tuy' : './teardown/',
};
