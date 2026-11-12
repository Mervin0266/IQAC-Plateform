# IQAC homepage redesign

## Design direction

A CHRIST-branded institutional gateway, combining the original project's public profile sections with the clear access routes, institutional recognition, and service-directory structure visible in Osmania's indexed homepage.

- Campus community photography, navy and warm gold, restrained editorial typography.
- Quick access to the institutional workspace, quality resources, and institutional profile.
- Verified IQAC context, five quality verticals, and NAAC recognition.
- A searchable directory of the ten existing public institutional sections.
- Official resource links and an interactive explanation of the quality improvement cycle.
- Responsive navigation, visible keyboard focus, and reduced-motion support.

## Reference access

- Requested project deployment: https://iqac-plateform-q8rnx3cap-mervin0266-7386.vercel.app/
  - Returned Vercel authentication protection. Its live visuals could not be inspected.
  - The local repository's earlier homepage was reviewed for structure and existing destinations.
- Osmania IQAC: https://iqac.osmania.ac.in/
  - Direct access timed out. Search-indexed homepage content showed role gateways, institutional recognition, and a service directory.
  - No Osmania statistics, branding, or institutional claims were transferred to CHRIST.

## Content and image sources

- CHRIST IQAC overview: https://christuniversity.in/center/C/iqac2026
- Accreditation: https://christuniversity.in/center/C/IQAC2026/naac
  - A+ grade, 3.42/4 CGPA, validity until 25 October 2027.
- Academic audit: https://christuniversity.in/center/C/IQAC2026/annual-academic-audit
- IQAC report: https://christuniversity.in/center/C/IQAC2026/iqac-report
- Strategic initiatives: https://christuniversity.in/center/C/IQAC2026/strategic-initiatives

Images are locally served WebP versions of photographs published on the official CHRIST homepage:
- Community: https://christuniversity.in/uploads/banners/banner/356507398_2026-09-30_05-05-19.jpg
  - `src/assets/iqac-community.webp`, 1600 x 773, 84,430 bytes.
- Library: https://christuniversity.in/uploads/banners/banner/83851659_2026-08-14_10-47-32.jpg
  - `src/assets/iqac-library.webp`, 900 x 435, 39,416 bytes.

The hero image loads with high priority. The below-fold library image loads lazily. No new dependencies, remote font requests, autoplay media, fabricated news, or invented metrics were added.

## Typography and motion enhancement

- Locally hosted Manrope variable and DM Serif Display regular/italic fonts; SIL Open Font License texts are included in src/assets/fonts.
- Staged hero entrance, desktop-only scroll drift, SVG orbit accents, section reveals, featured institutional card, animated filtering, and resource hover treatments.
- The quality cycle has an animated progress path and stage transitions. A moving word band and navy closing panel complete the page.
- Decorative movement can be disabled with the hero control. System reduced-motion changes are applied immediately, including changes made while the page is open.
- Existing Motion dependency is reused. Font assets total approximately 74 KB; the main bundle increased by approximately 43 KB gzip over the prior build.
- Production build and existing interaction checks passed. Additional browser checks verified font loading, completed entrance, pause/resume, live reduced-motion switching, and no overflow at 320, 390, 768, 1024, and 1440px.

## Page-wide motion refinement

- The hero's editorial movement now carries through the public journey: access routes and fact cards enter in sequence, verticals lift on interaction, accreditation has a quiet orbital detail, service results enter progressively, and resources, process stages, marquee, and closing call-to-action have their own restrained feedback.
- A shared `Reveal` state supplies section-level entrance timing while CSS handles decorative details. This keeps the choreography lightweight, avoids additional libraries, and lets the existing pause and reduced-motion settings disable non-essential movement consistently.
- The public page now uses a compact type scale based on locally served IQ Display for editorial headings and IQ Manrope for utility and reading text, including the navigation and footer.

## Validation

- Production build: `npm run build` passed.
- Browser checks at 1440, 1024, 768, 390, and 320px: one H1, constrained logo, no horizontal overflow.
- Search, categories, no-results recovery, and clear-search controls passed.
- All four quality-cycle stages worked with keyboard activation.
- Public-page-to-homepage section navigation restored the intended section and focus.
- Mobile navigation, Escape behavior, and section navigation passed.
- Login form opened and returned to the public portal; backend authentication was not tested.
- Both photographs loaded successfully; no browser runtime errors were observed.
- Desktop and mobile screenshots reviewed.

## Local preview

## Section experience refinement

- Public destinations explicitly suppress the staff sidebar. Research now forwards its public layout flag; authenticated pages retain the shared sidebar with a mobile toggle.
- Authenticated research links open their individual pages directly, avoiding the additional research workspace header around the selected subsection.
- Shared headers, metric cards, tables, filters, and section typography extend the existing Manrope/DM Serif, navy, and gold visual language. SVG line entrances and short card entrances finish automatically; reduced-motion disables decoration.
- Production build passed. Browser checks exercised all ten public destinations with no staff sidebar, and verified Placement mobile width, reduced motion, and authenticated mobile navigation with a mocked session and API responses. Live backend operations and real sign-in were not tested.
- The temporary preview is stopped after verification.

Run `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` from the repository.
Open http://127.0.0.1:5173/.

If Vite retains an older stylesheet after replacing a CSS file on Windows, restart the dev server. This occurred during the redesign and was resolved before final visual checks.
