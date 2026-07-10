Make the following design changes to the public website and login page in 
PublicWebsite.tsx and LoginPage.tsx. Do NOT change AuthContext.tsx, 
permissions.ts, any internal platform pages, or any backend files.

---

NAVBAR FONT COLOUR AT TOP OF PAGE:

When the page is at the very top (not yet scrolled), the navbar is transparent 
over the hero image and the nav link text is currently grey and unreadable. 
Fix this by:
- At scroll position 0 (before scrolling), render all nav link text in dark 
  navy (#0f1746) with fontWeight 600 so it is clearly readable against the 
  light top of the page
- Once the user scrolls past 40px and the navbar background switches to dark 
  navy, switch the nav link text colour to white (rgba(255,255,255,0.85)) as 
  it currently does
- The active nav link should remain gold (#e8c84a) at all scroll positions
- Apply the same colour switching logic to the hamburger menu icon on mobile

---

ACHIEVEMENTS PAGE — PUBLIC VIEW (remove sidebar, summary cards):

In the public view of AchievementsPage, remove the <Sidebar> component 
entirely and remove the ml-64 left margin offset.

Replace the layout with:
- A full-width coloured hero banner at the top with background colour #0f1746, 
  showing the Award icon from lucide-react, the title "Achievements" and 
  subtitle "Celebrating faculty, student and institutional excellence."
- A max-width 1280px centred content area below it

Replace the existing achievement grid with summary cards only. Each card:
1. Award icon from lucide-react
2. Bold title (achievement name)
3. One subtitle sentence, max 15 words
4. Up to 3 tag badges
5. One meta line (department or date)
Card style: white background, 4px left border in #0f1746, subtle box-shadow, 
hover translateY(-3px). Display in a responsive grid: 
repeat(auto-fill, minmax(320px, 1fr)).

Hide the AddProjectButton, AchievementFilters, and AchievementTabs components 
in public view. Pass a prop isPublicView={true} from PublicWebsite.tsx when 
rendering AchievementsPage so the page knows to use the public layout.

---

RESEARCH & INNOVATION PAGE — PUBLIC VIEW (remove sidebar, summary cards):

In the public view of ResearchInnovationPage, remove the <Sidebar> component 
entirely and remove the ml-64 left margin offset.

Replace the layout with:
- A full-width hero banner with background colour #1e3a5f, showing the 
  BookOpen icon, title "Research & Innovation" and subtitle "Driving knowledge 
  creation across all disciplines."
- A max-width 1280px centred content area

Add a summary stats row at the top of the content area with 4 stat boxes 
(white cards, centred): Total Publications 312, Patents Filed 48, 
Patents Granted 12, PhD Scholars 89.

Below the stats row, show summary cards for patents and publications only. 
Each card:
1. BookOpen or Award icon
2. Bold title (patent/paper name)
3. One subtitle sentence (inventors and department, max 15 words)
4. Up to 3 tag badges (status, department, year)
5. One meta line (filed date or journal name)
Card style: white background, 4px left border in #1e3a5f, subtle box-shadow, 
hover translateY(-3px).

Hide all year/department filter dropdowns, detailed tabs, and expandable 
sections in public view. Pass isPublicView={true} when rendering from 
PublicWebsite.tsx.

---

RANKINGS PAGE — PUBLIC VIEW (remove sidebar, summary cards):

In the public view of RankingPage, remove the <Sidebar> component entirely 
and remove the ml-64 left margin offset.

Replace the layout with:
- A full-width hero banner with background colour #166534, showing the Trophy 
  icon, title "Rankings & Accreditation" and subtitle "National and 
  international recognition of academic quality."
- A max-width 1280px centred content area

Show summary cards for each ranking. Each card:
1. Trophy or BarChart3 icon from lucide-react
2. Bold title (e.g. "NIRF Overall Ranking — #96")
3. One subtitle sentence (body name and category, max 15 words)
4. Up to 3 tag badges (framework, category, year)
5. One meta line showing rank change (e.g. "Improved from #100 in 2023")
Card style: white background, 4px left border in #166534, subtle box-shadow, 
hover translateY(-3px).

Hide all detailed comparison tables and accreditation document lists in public 
view. Pass isPublicView={true} when rendering from PublicWebsite.tsx.

---

LOGIN PAGE REDESIGN — UNIQUE CARD THEMES PER ROLE:

Redesign LoginPage.tsx so each of the 3 role selection cards has a completely 
unique visual identity. Keep all existing login logic, credentials, and 
AuthContext usage exactly as-is. Only change the visual design.

The overall login page layout:
- Full screen, split into two halves on desktop
- Left half: the existing campus logo (christLogo via ImageWithFallback), 
  university name, IQAC tagline, and a rotating campus image background 
  (use the same 4 Unsplash URLs from the public hero, cycling every 5s) 
  with a dark navy overlay. Add the same 5px gold left border from the 
  public hero.
- Right half: white background, centred content, showing the 3 role cards

Role card unique designs:

1. ADMIN card:
- Deep navy background (#0f1746)
- Shield icon from lucide-react in gold (#e8c84a)
- Title "Admin Login" in white, bold
- Subtitle "Full system access and management" in rgba(255,255,255,0.6)
- A subtle gold shimmer border: border: 1px solid rgba(232,200,74,0.4)
- On hover: gold glow box-shadow rgba(232,200,74,0.25) 0px 8px 32px

2. FACULTY card:
- Deep blue gradient background: linear-gradient(135deg, #1e40af, #1d4ed8)
- User icon from lucide-react in white
- Title "Faculty Login" in white, bold
- Subtitle in rgba(255,255,255,0.65)
- Thin white border: border: 1px solid rgba(255,255,255,0.2)
- On hover: brighter blue glow box-shadow rgba(59,130,246,0.4) 0px 8px 32px

3. COORDINATOR card:
- Teal/dark cyan gradient background: 
  linear-gradient(135deg, #0f766e, #0d9488)
- Users icon from lucide-react in white
- Title "Coordinator Login" in white, bold
- Subtitle in rgba(255,255,255,0.65)
- Thin white border: border: 1px solid rgba(255,255,255,0.15)
- On hover: teal glow box-shadow rgba(20,184,166,0.4) 0px 8px 32px

All 3 cards: borderRadius 16px, padding 28px, cursor pointer, 
transition all 0.25s, on hover scale(1.03) transform.

When a card is selected (active state), add a 2px solid bright border in 
the card's accent colour and keep the hover glow permanently.

The credentials input form that appears after role selection should be on 
the same right panel, replacing the 3 cards with a styled form matching 
the selected role's colour theme (navy for admin, blue for faculty, 
teal for coordinator). Add a back arrow button to return to role selection.

---

DO NOT CHANGE:
- AuthContext.tsx login logic or credentials
- permissions.ts
- Any internal platform page logic
- Sidebar.tsx
- Any backend files
- The internal dashboard or role-based behaviour