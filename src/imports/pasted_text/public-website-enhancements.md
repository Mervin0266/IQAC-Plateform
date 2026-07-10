Make the public-facing website (PublicWebsite.tsx) more interactive and visually 
polished. Do NOT change any internal platform pages, AuthContext.tsx, 
permissions.ts, or any backend files.

---

HERO SECTION:

Replace the current static hero with a full-screen image slideshow hero:
- Add 4 rotating background images using these Unsplash URLs, cycling every 5 
  seconds with a smooth 1.2s opacity crossfade transition:
    1. https://images.unsplash.com/photo-1562774053-701939374585?w=1600&q=80
    2. https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&q=80
    3. https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1600&q=80
    4. https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80
- Add a dark overlay gradient: rgba(10,16,60,0.88) to rgba(10,16,60,0.6)
- Add a 5px vertical gold bar (#e8c84a) on the left edge of the hero
- Add small dot indicators at the bottom of the hero to show which image is 
  active; clicking a dot jumps to that image
- Animate all hero text with a fadeSlideIn keyframe 
  (from opacity:0, translateY 24px → to opacity:1, translateY 0), 
  staggered with 0s, 0.15s, 0.3s, 0.45s delays
- Add a bouncing ChevronDown icon at the bottom center of the hero as a 
  scroll cue

---

CAMPUS LOGO IN NAVBAR:

The current navbar shows a plain text logo. Replace it with the same logo 
treatment used in the internal Sidebar.tsx — use the same christLogo import 
(figma:asset/e4f652b12ffea64be11193ae1ce02c65502fc8ea.png) and wrap it in an 
ImageWithFallback component exactly as done in Sidebar.tsx. If the image fails 
to load, fall back to a 40×40 circular gold badge with text "CU" in navy 
(background: linear-gradient(135deg,#e8c84a,#d4a820), color: #0f1746, 
fontWeight:800). Place the logo to the left with "Christ University" in white 
bold and "IQAC Portal" in gold (#e8c84a) small caps below it.

---

NAVBAR SCROLL BEHAVIOUR:

Make the navbar transparent over the hero and switch to a solid dark navy 
background (rgba(15,23,70,0.97)) with a blur backdrop-filter when the user 
scrolls more than 40px. Use a smooth 0.35s ease transition. This requires a 
scroll event listener updating a boolean state.

---

ANIMATED STAT COUNTERS:

Below the hero, add a dark navy stats bar (#0f1746) with 5 counters. Each 
counter should animate from 0 to its target number when it scrolls into the 
viewport, using an IntersectionObserver. Stats:
- Research Papers: 312+
- Patents Filed: 48
- Placement Rate: 92%
- Industry Partners: 186+
- International MoUs: 24

---

FADE-IN SCROLL ANIMATIONS:

Wrap every section's content (cards, headers, grids) in a fade-in animation 
that triggers when the element enters the viewport using IntersectionObserver. 
Animate from opacity:0, translateY:28px to opacity:1, translateY:0 over 0.6s. 
Stagger cards within grids using incremental delays (0ms, 60ms, 120ms...).

---

REMOVE SIDEBARS FROM PUBLIC SECTION PAGES:

In the public view of ALL of the following pages, remove the <Sidebar> 
component entirely:
- PlacementsInternshipsPage
- InfrastructureFacilitiesPage
- ConsultancyProjectsPage
- InternationalInteractionsPage
- CentreExcellencePage
- IncubationsPage
- IndustryConnectsPage

Replace the layout on each of these pages with a full-width structure that has:
- A coloured hero banner at the top: page icon + title + subtitle on a deep 
  coloured background (use a distinct accent colour per page, no two pages 
  the same colour)
- Content in a max-width 1280px centred container with padding
- No left margin offset (remove the ml-64 that compensates for the sidebar)

---

ALL PUBLIC SECTION PAGES — SUMMARY CARDS ONLY:

For every section rendered in the public website (Achievements, Research, 
Rankings, Placements, Infrastructure, International Interactions, Centres of 
Excellence, Incubations, Industry Connects, Consultancy), replace all detailed 
tables, expanded accordions, and in-depth data panels with simple summary cards.

Each summary card must contain only:
1. A small icon (from lucide-react, matching the section theme)
2. A bold title (project/item name)
3. One short subtitle sentence (max 15 words)
4. Up to 3 small tag badges
5. One meta line (department, date, or value)

No full tables. No expandable rows. No per-item detail modals. Keep it 
high-level and scannable.

Card style: white background, 4px left border in the section accent colour, 
subtle box-shadow, hover lifts with translateY(-3px).

---

MOBILE RESPONSIVE NAVBAR:

On screens under 900px wide, hide the desktop nav links and show a hamburger 
menu icon (Menu from lucide-react). Clicking it opens a dropdown showing all 
nav links vertically. Clicking a link closes the menu and navigates.

---

DO NOT CHANGE:
- AuthContext.tsx
- permissions.ts
- LoginPage.tsx
- Sidebar.tsx
- Any internal platform page logic
- Any backend files
- The internal dashboard, charts, or role-based behaviour