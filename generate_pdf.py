import os
import sys
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_header_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Do not draw on cover page (page 1)
        if self._pageNumber > 1:
            # Header
            self.drawString(54, 800, "CHRIST (Deemed to be University) — Internal Quality Assurance Cell (IQAC)")
            self.drawRightString(540, 800, "IQAC Platform Dashboard Manual")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.75)
            self.line(54, 792, 540, 792)

            # Footer
            self.line(54, 45, 540, 45)
            self.drawString(54, 32, "Confidential — For Internal Quality Management & Academic Accreditation")
            page_text = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(540, 32, page_text)

        self.restoreState()

def build_pdf(filename="IQAC_Platform_Dashboard_Complete_Details.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#1e3a8a")     # Deep Blue
    secondary_color = colors.HexColor("#2563eb")   # Royal Blue
    accent_color = colors.HexColor("#d97706")      # Amber
    dark_text = colors.HexColor("#0f172a")         # Slate 900
    muted_text = colors.HexColor("#475569")        # Slate 600

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=8
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=17,
        textColor=muted_text,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=secondary_color,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'Heading3_Custom',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=dark_text,
        spaceBefore=6,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=dark_text,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    callout_style = ParagraphStyle(
        'Callout_Text',
        parent=body_style,
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor("#1e293b")
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=dark_text
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # ==================== COVER PAGE ====================
    story.append(Spacer(1, 20))
    # University Header Bar
    univ_header = [
        [
            Paragraph("<font size=16 color='#1e3a8a'><b>CHRIST (Deemed to be University)</b></font><br/><font size=10 color='#475569'>Bengaluru, Karnataka, India | Accredited 'A+' Grade by NAAC</font>", styles['Normal']),
            Paragraph("<font size=11 color='#1e3a8a'><b>IQAC PLATFORM</b></font><br/><font size=8 color='#64748b'>Internal Quality Assurance Cell</font>", ParagraphStyle('RightH', parent=styles['Normal'], alignment=2))
        ]
    ]
    t_header = Table(univ_header, colWidths=[330, 155])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_header)
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1e3a8a"), spaceBefore=2, spaceAfter=25))

    # Main Cover Title Block
    story.append(Paragraph("Institutional Quality Assurance & Analytics Dashboard", title_style))
    story.append(Paragraph("Complete Technical Architecture, Functional Modules, Academic Metrics, Accreditation Tracking & Role-Based Workflows Documentation", subtitle_style))
    story.append(Spacer(1, 10))

    # Metadata Card Box
    meta_data = [
        [Paragraph("<b>Platform Version</b>", table_cell_bold), Paragraph("v1.0.0 (Production Release)", table_cell_style),
         Paragraph("<b>Target Entity</b>", table_cell_bold), Paragraph("Christ University IQAC & Academic Depts", table_cell_style)],
        [Paragraph("<b>Application Stack</b>", table_cell_bold), Paragraph("React 18, TypeScript, TailwindCSS, Node.js, Express, PostgreSQL", table_cell_style),
         Paragraph("<b>Authentication</b>", table_cell_bold), Paragraph("JWT with 5-Tier Role-Based Access Control (RBAC)", table_cell_style)],
        [Paragraph("<b>Accreditation Alignments</b>", table_cell_bold), Paragraph("NAAC (7 Criteria), NBA, NIRF, QS World/India, THE World", table_cell_style),
         Paragraph("<b>Deployment Mode</b>", table_cell_bold), Paragraph("Full-Stack Microservices Architecture (REST API)", table_cell_style)],
        [Paragraph("<b>Date of Issue</b>", table_cell_bold), Paragraph("Academic Year 2024–2026", table_cell_style),
         Paragraph("<b>Document Classification</b>", table_cell_bold), Paragraph("Official Institutional Documentation", table_cell_style)]
    ]
    t_meta = Table(meta_data, colWidths=[110, 140, 110, 125])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 20))

    # Executive Overview Box
    exec_summary = [
        [Paragraph("<b>Executive Overview:</b> The Christ University IQAC Platform is an enterprise quality management and institutional intelligence suite designed to unify institutional data ingestion, validate department-level achievements, track strategic KPIs, streamline accreditation reporting (NAAC, NBA, NIRF), and provide real-time interactive analytical dashboards for academic leadership.", callout_style)]
    ]
    t_exec = Table(exec_summary, colWidths=[485])
    t_exec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#eff6ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#93c5fd")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_exec)
    story.append(Spacer(1, 20))

    # Table of Contents Summary Grid
    toc_data = [
        [Paragraph("<b>Section</b>", table_header_style), Paragraph("<b>Core Module & Focus Area</b>", table_header_style), Paragraph("<b>Scope & Target Audience</b>", table_header_style)],
        [Paragraph("Section 1", table_cell_bold), Paragraph("Executive Summary & Institutional Framework", table_cell_style), Paragraph("IQAC Mandate, University Vision & Objectives", table_cell_style)],
        [Paragraph("Section 2", table_cell_bold), Paragraph("System Architecture & Technology Stack", table_cell_style), Paragraph("React, Node.js, Express, Sequelize, PostgreSQL", table_cell_style)],
        [Paragraph("Section 3", table_cell_bold), Paragraph("Primary Dashboard Visual Analytics & KPI Engine", table_cell_style), Paragraph("Live KPI counters, Radar charts, Area & Bar trends", table_cell_style)],
        [Paragraph("Section 4", table_cell_bold), Paragraph("In-Depth Placement & Internship Intelligence", table_cell_style), Paragraph("Dept-wise, batch-wise, salary tiers (<5 to >15 LPA), recruiters", table_cell_style)],
        [Paragraph("Section 5", table_cell_bold), Paragraph("Academics & Department Management Subsystems", table_cell_style), Paragraph("Faculty, Student lifecycle, PhD thesis, Course repositories", table_cell_style)],
        [Paragraph("Section 6", table_cell_bold), Paragraph("Research, Innovation & Extension (RIE) Management", table_cell_style), Paragraph("Scopus/WoS Publications, Patents lifecycle, Grants, MoUs", table_cell_style)],
        [Paragraph("Section 7", table_cell_bold), Paragraph("Accreditation & Ranking Frameworks", table_cell_style), Paragraph("NAAC 7 Criteria, NBA compliance, NIRF 5 parameters, QS/THE", table_cell_style)],
        [Paragraph("Section 8", table_cell_bold), Paragraph("Strategic Planning & Department Tracking", table_cell_style), Paragraph("Goal milestones, institutional KPI weights & completion %", table_cell_style)],
        [Paragraph("Section 9", table_cell_bold), Paragraph("Security Architecture & 5-Tier RBAC System", table_cell_style), Paragraph("Admin, Authority, HOD, Coordinator, Faculty matrix", table_cell_style)],
        [Paragraph("Section 10", table_cell_bold), Paragraph("Database Schema & REST API Reference", table_cell_style), Paragraph("14 relational models, 47+ secured endpoints, Audit trails", table_cell_style)],
    ]
    t_toc = Table(toc_data, colWidths=[65, 235, 185])
    t_toc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e3a8a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_toc)

    story.append(PageBreak())

    # ==================== SECTION 1 ====================
    story.append(Paragraph("1. Executive Summary & Institutional Context", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=1, spaceAfter=8))
    
    story.append(Paragraph("The <b>Internal Quality Assurance Cell (IQAC)</b> at CHRIST (Deemed to be University) operates as the primary nodal agency for establishing, sustaining, and enhancing quality culture across all academic departments, research centers, and administrative divisions. As higher education compliance demands rigorous evidence-based verification, this integrated digital platform replaces fragmented manual data collation with an automated, synchronized, and audit-ready data ecosystem.", body_style))
    
    story.append(Paragraph("Key Objectives of the IQAC Platform:", h2_style))
    story.append(Paragraph("• <b>Centralized Data Aggregation:</b> Eliminate departmental data silos by harmonizing faculty publications, student achievements, placement figures, patents, and consultancy earnings into a single relational database.", bullet_style))
    story.append(Paragraph("• <b>Continuous Quality Monitoring:</b> Real-time KPI scorecards providing department heads and university leadership with live progression data on strategic goals and NAAC/NBA targets.", bullet_style))
    story.append(Paragraph("• <b>Audit Trail & Verification Workflow:</b> Institutionalized approval hierarchy where submissions by faculty members undergo scrutiny by Department Coordinators and HODs before institutional sign-off.", bullet_style))
    story.append(Paragraph("• <b>Rankings Readiness:</b> Instant extraction of structured data formatted to NIRF, NAAC SSR, NBA SAR, and QS/THE international ranking templates.", bullet_style))

    # ==================== SECTION 2 ====================
    story.append(Spacer(1, 6))
    story.append(Paragraph("2. Full-Stack System Architecture & Technology Stack", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=1, spaceAfter=8))
    
    story.append(Paragraph("The platform is engineered using modern, scalable, enterprise-grade open-source web technologies ensuring low latency, responsive UX, strict type-safety, and secure asynchronous data handling.", body_style))

    tech_stack_data = [
        [Paragraph("<b>Layer</b>", table_header_style), Paragraph("<b>Technology / Framework</b>", table_header_style), Paragraph("<b>Technical Capabilities & Responsibilities</b>", table_header_style)],
        [Paragraph("Frontend Core", table_cell_bold), Paragraph("React 18 + Vite + TypeScript", table_cell_style), Paragraph("Fast compilation, strictly typed state interfaces, single-page application routing, responsive component hierarchy.", table_cell_style)],
        [Paragraph("UI & Styling", table_cell_bold), Paragraph("TailwindCSS + Lucide Icons + Shadcn UI", table_cell_style), Paragraph("Customized Christ University design token system, responsive grid layouts, custom accessible modals, slide-overs, and forms.", table_cell_style)],
        [Paragraph("Data Visualizations", table_cell_bold), Paragraph("Recharts (SVG Charting Engine)", table_cell_style), Paragraph("Interactive Bar, Area, Line, Radar, and Pie charts with dynamic tooltips, multi-axis scaling, and responsive view containers.", table_cell_style)],
        [Paragraph("Backend Framework", table_cell_bold), Paragraph("Node.js (v18+) + Express.js", table_cell_style), Paragraph("Modular RESTful API server, non-blocking asynchronous event loop, structured routing, controller-service pattern.", table_cell_style)],
        [Paragraph("Database & ORM", table_cell_bold), Paragraph("PostgreSQL + Sequelize ORM", table_cell_style), Paragraph("Relational integrity with foreign keys, composite indexes, automated timestamps, migrations, model validations, and connection pooling.", table_cell_style)],
        [Paragraph("Security & Auth", table_cell_bold), Paragraph("JWT + bcryptjs + Helmet + Rate-Limiting", table_cell_style), Paragraph("Stateless cryptographic bearer token authentication, salted password hashing, HTTP security headers, CORS origin whitelisting.", table_cell_style)],
        [Paragraph("File Management", table_cell_bold), Paragraph("Multer Multipart Storage", table_cell_style), Paragraph("Secure binary handling for course syllabus files, publication proofs, sanction letters, and NAAC compliance certificates.", table_cell_style)],
    ]
    t_tech = Table(tech_stack_data, colWidths=[80, 155, 250])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_tech)

    story.append(PageBreak())

    # ==================== SECTION 3 ====================
    story.append(Paragraph("3. Primary Dashboard Visual Analytics & KPI Engine", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=1, spaceAfter=8))
    
    story.append(Paragraph("Upon authentication, the user is presented with an Executive Analytics Dashboard featuring live synchronized metrics, interactive data filters, and visual diagnostic tools tailored to academic performance evaluation.", body_style))

    story.append(Paragraph("3.1 Live KPI Summary Cards", h2_style))
    story.append(Paragraph("The top tier of the dashboard showcases high-level aggregated quantitative indicators pulled directly from active database records:", body_style))

    kpi_data = [
        [Paragraph("<b>Metric Card</b>", table_header_style), Paragraph("<b>Current Metric</b>", table_header_style), Paragraph("<b>Growth Trend</b>", table_header_style), Paragraph("<b>Operational Definition & Underlying Data Source</b>", table_header_style)],
        [Paragraph("Total Achievements", table_cell_bold), Paragraph("120+ Verified", table_cell_style), Paragraph("+10% YoY", table_cell_style), Paragraph("Aggregates all published institutional awards, student competition titles, faculty fellowships, and patents across all departments.", table_cell_style)],
        [Paragraph("Faculty Achievements", table_cell_bold), Paragraph("85+ Publications/Awards", table_cell_style), Paragraph("+8% YoY", table_cell_style), Paragraph("Filtered count of high-impact journal publications, external research awards, research grants, and editorial appointments.", table_cell_style)],
        [Paragraph("Annual Reports", table_cell_bold), Paragraph("15 Department Files", table_cell_style), Paragraph("+8% Complete", table_cell_style), Paragraph("Completed and approved annual academic quality documentation and departmental audit summaries submitted to IQAC.", table_cell_style)],
        [Paragraph("Placements Tracked", table_cell_bold), Paragraph("1,245 Students Placed", table_cell_style), Paragraph("+7.8% YoY", table_cell_style), Paragraph("Overall university placement record for current graduating cohort across 6 tracked engineering and sciences streams.", table_cell_style)],
    ]
    t_kpi = Table(kpi_data, colWidths=[95, 75, 65, 250])
    t_kpi.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), secondary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_kpi)

    story.append(Spacer(1, 8))
    story.append(Paragraph("3.2 Core Analytical Charts & Multi-Dimensional Visualizations", h2_style))
    story.append(Paragraph("The dashboard incorporates four purpose-built chart modules powered by Recharts:", body_style))

    story.append(Paragraph("• <b>Department Performance Radar Chart:</b> Plots balanced academic quality indices across 6 flagship departments (CSE: 92%, AI & DS: 95%, Mech: 88%, Civil Eng: 85%, EEE: 81%, ECE: 78%). Measures composite metrics including curriculum delivery, research output, faculty qualification ratio, and accreditation progress.", bullet_style))
    story.append(Paragraph("• <b>Student & Faculty Achievements Area Chart:</b> Monthly trend visualization illustrating seasonal spikes in publications and hackathon wins between January and August, demonstrating student research engagement.", bullet_style))
    story.append(Paragraph("• <b>University Highlights Multi-Line Graph:</b> Longitudinal tracking of Research Publications (climbing from 12 to 22/mo), Academic Events/Symposia (8 to 15/mo), and National/International Awards (5 to 10/mo).", bullet_style))
    story.append(Paragraph("• <b>Annual Quality Assurance Reports Progress:</b> Stacked status bars showing month-by-month completed vs pending departmental compliance document reviews.", bullet_style))

    # ==================== SECTION 4 ====================
    story.append(Spacer(1, 6))
    story.append(Paragraph("4. In-Depth Placement & Career Intelligence Suite", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=1, spaceAfter=8))
    
    story.append(Paragraph("A highlight of the dashboard is the dynamic Placement Statistics Module. It enables university authorities and coordinators to toggle between three analytical viewpoints:", body_style))

    story.append(Paragraph("1. Department-wise Comparative Analytics:", h3_style))
    story.append(Paragraph("Compares registered students against successfully placed candidates and average salary offers per department. Provides immediate insight into department conversion efficiencies.", body_style))

    dept_place_data = [
        [Paragraph("<b>Department</b>", table_header_style), Paragraph("<b>Placed</b>", table_header_style), Paragraph("<b>Total Eligible</b>", table_header_style), Paragraph("<b>Placement Rate</b>", table_header_style), Paragraph("<b>Average Package</b>", table_header_style)],
        [Paragraph("Artificial Intelligence & Data Science", table_cell_bold), Paragraph("87", table_cell_style), Paragraph("90", table_cell_style), Paragraph("96.7%", table_cell_style), Paragraph("13.2 LPA", table_cell_style)],
        [Paragraph("Computer Science & Engineering", table_cell_bold), Paragraph("172", table_cell_style), Paragraph("180", table_cell_style), Paragraph("95.6%", table_cell_style), Paragraph("12.5 LPA", table_cell_style)],
        [Paragraph("Electronics & Communication Engg", table_cell_bold), Paragraph("142", table_cell_style), Paragraph("150", table_cell_style), Paragraph("94.7%", table_cell_style), Paragraph("9.8 LPA", table_cell_style)],
        [Paragraph("Electrical & Electronics Engineering", table_cell_bold), Paragraph("110", table_cell_style), Paragraph("120", table_cell_style), Paragraph("91.7%", table_cell_style), Paragraph("8.5 LPA", table_cell_style)],
        [Paragraph("Mechanical Engineering", table_cell_bold), Paragraph("125", table_cell_style), Paragraph("140", table_cell_style), Paragraph("89.3%", table_cell_style), Paragraph("7.8 LPA", table_cell_style)],
        [Paragraph("Civil Engineering", table_cell_bold), Paragraph("98", table_cell_style), Paragraph("110", table_cell_style), Paragraph("89.1%", table_cell_style), Paragraph("6.5 LPA", table_cell_style)],
    ]
    t_dp = Table(dept_place_data, colWidths=[185, 60, 80, 80, 80])
    t_dp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_dp)

    story.append(Spacer(1, 6))
    story.append(Paragraph("2. Multi-Year Historical Cohort Trends (Batch 2020–21 to 2024–25):", h3_style))
    story.append(Paragraph("Demonstrates continuous institutional progression: Placed numbers rose from 980 (2020-21) to 1,245 (2024-25); Total offers expanded from 1,120 to 1,456; Average compensation increased steadily from 6.8 LPA to 8.5 LPA (with peak CTC touching 42.0 LPA).", body_style))

    story.append(Paragraph("3. Granular Single-Department & Salary Tier Breakdown:", h3_style))
    story.append(Paragraph("Drilldown module presenting Salary Distribution Tiers (<5 LPA, 5–10 LPA, 10–15 LPA, >15 LPA) alongside Top Hiring Partners (e.g., Google: 22, Amazon: 65, Microsoft: 18, TCS: 235, Wipro: 190).", body_style))

    story.append(PageBreak())

    # ==================== SECTION 5 ====================
    story.append(Paragraph("5. Comprehensive Academic & Departmental Subsystems", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=1, spaceAfter=8))
    
    story.append(Paragraph("Beyond high-level dashboards, the platform houses 12 dedicated subsystems accessible through the left navigation hierarchy:", body_style))

    subsystems_data = [
        [Paragraph("<b>Navigation Module</b>", table_header_style), Paragraph("<b>Key Functional Scope & Monitored Parameters</b>", table_header_style), Paragraph("<b>Compliance / Audit Relevance</b>", table_header_style)],
        [Paragraph("Faculty Details", table_cell_bold), Paragraph("Profiles of all teaching faculty, designations, highest qualifications (PhD/Postdoc), teaching experience, guided PhD scholars, and ongoing research projects.", table_cell_style), Paragraph("NIRF TLR Parameter & NAAC Criterion 2 (Teaching-Learning & Evaluation).", table_cell_style)],
        [Paragraph("Student Details", table_cell_bold), Paragraph("Undergraduate, Postgraduate, and Doctoral student enrollment numbers, gender diversity ratio, out-of-state/international student ratio, and academic progression rates.", table_cell_style), Paragraph("NIRF Student Diversity & Outreach (OI) & NAAC Criterion 1.", table_cell_style)],
        [Paragraph("Department Details", table_cell_bold), Paragraph("Departmental profiles, faculty-to-student ratios, laboratory equipment inventories, budgetary utilization, and departmental advisory board minutes.", table_cell_style), Paragraph("NBA Criteria 4, 5 & 6 (Program Curriculum & Faculty Cadre).", table_cell_style)],
        [Paragraph("Course Files Repository", table_cell_bold), Paragraph("Digital repository of course syllabi, lesson plans, course outcomes (CO), program outcomes (PO) mapping matrices, internal assessment rubrics, and answer keys.", table_cell_style), Paragraph("NBA Criterion 3 & NAAC Outcome-Based Education (OBE) Audit.", table_cell_style)],
        [Paragraph("Achievements & Awards", table_cell_bold), Paragraph("Categorized record of academic awards, national fellowships, hackathon victories, patent publications, and institutional recognition with proof verification.", table_cell_style), Paragraph("NAAC Criterion 3 (Research, Innovations & Extension) & Criterion 5.", table_cell_style)],
        [Paragraph("PhD Thesis & Scholars", table_cell_bold), Paragraph("Tracking of doctoral candidates, research guides, topic proposals, synopsis submissions, thesis reviews, and final defense status.", table_cell_style), Paragraph("UGC Minimum Standards Compliance & NIRF RPC Parameter.", table_cell_style)],
    ]
    t_sub = Table(subsystems_data, colWidths=[105, 230, 150])
    t_sub.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_sub)

    # ==================== SECTION 6 ====================
    story.append(Spacer(1, 8))
    story.append(Paragraph("6. Research, Innovation & Extension (RIE) Subsystems", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=1, spaceAfter=8))
    
    story.append(Paragraph("Research is central to university rankings. The RIE module provides comprehensive tracking across 5 critical dimensions:", body_style))

    story.append(Paragraph("• <b>Research Metrics Grid:</b> Aggregates journal publications indexed in Scopus, Web of Science, and UGC-CARE. Computes institutional h-index, i10-index, average impact factor, and citation distribution across departments.", bullet_style))
    story.append(Paragraph("• <b>Patents Lifecycle Management:</b> Tracks intellectual property through four sequential status gates: <i>Filed</i> → <i>Published</i> → <i>Granted</i> → <i>Commercialized</i>. Stores application numbers, patent office details, and commercial licensing revenue.", bullet_style))
    story.append(Paragraph("• <b>Sponsored Research Grants:</b> Records extra-mural research funding from national/international agencies (DST, DBT, SERB, ICSSR, EU Horizon). Tracks sanctioned amount, utilization certificate (UC) filings, and principal investigators (PI).", bullet_style))
    story.append(Paragraph("• <b>Consultancy Projects:</b> Captures corporate consulting engagements, client contracts, deliverables, faculty expert hours, and generated revenue share.", bullet_style))
    story.append(Paragraph("• <b>Incubations & Centers of Excellence (CoE):</b> Manages on-campus startup incubation facilities, seed grants, patent incubation, and specialized research centers of excellence.", bullet_style))
    story.append(Paragraph("• <b>International Interactions & MoUs:</b> Tracks active bilateral MoUs with foreign universities, dual-degree agreements, student exchange contingents, and visiting international scholar lectures.", bullet_style))

    story.append(PageBreak())

    # ==================== SECTION 7 ====================
    story.append(Paragraph("7. Accreditation & Ranking Framework Alignments", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=1, spaceAfter=8))
    
    story.append(Paragraph("The platform is engineered specifically around the quantitative assessment matrices mandated by statutory accreditation bodies and global university ranking organizations:", body_style))

    ranking_framework_data = [
        [Paragraph("<b>Framework</b>", table_header_style), Paragraph("<b>Key Evaluated Parameters</b>", table_header_style), Paragraph("<b>IQAC Platform Mapping & Automation</b>", table_header_style)],
        [Paragraph("NIRF (National Institutional Ranking Framework)", table_cell_bold), Paragraph("1. Teaching, Learning & Resources (TLR)<br/>2. Research and Professional Practice (RPC)<br/>3. Graduation Outcomes (GO)<br/>4. Outreach and Inclusivity (OI)<br/>5. Peer Perception (PR)", table_cell_style), Paragraph("Automated computation of faculty student ratios, approved intake vs placed counts, Scopus indexed publications per faculty, and women student diversity percentages.", table_cell_style)],
        [Paragraph("NAAC (National Assessment and Accreditation Council)", table_cell_bold), Paragraph("Criterion 1: Curricular Aspects<br/>Criterion 2: Teaching-Learning & Evaluation<br/>Criterion 3: Research, Innovations & Extension<br/>Criterion 4: Infrastructure & Learning Resources<br/>Criterion 5: Student Support & Progression<br/>Criterion 6: Governance, Leadership & Mgmt<br/>Criterion 7: Institutional Values & Best Practices", table_cell_style), Paragraph("Direct alignment of Document and Achievement models with NAAC 7 Criteria. Facilitates automated Self-Study Report (SSR) quantitative metric tables and evidence file packaging.", table_cell_style)],
        [Paragraph("NBA (National Board of Accreditation)", table_cell_bold), Paragraph("Criteria 1–10: Program Curriculum, Teaching-Learning, Course Outcomes (CO-PO Attainment), Faculty Cadre, Facilities, Continuous Improvement.", table_cell_style), Paragraph("Department-level Course Files, CO attainment tracking, continuous evaluation documentation, and laboratory facility inventories.", table_cell_style)],
        [Paragraph("QS World & India Rankings", table_cell_bold), Paragraph("Academic Reputation, Employer Reputation, Faculty/Student Ratio, Citations per Faculty, International Faculty/Student Ratio.", table_cell_style), Paragraph("Consolidated international interaction counters, placement partner metrics, and bibliometric citation exports.", table_cell_style)],
    ]
    t_rf = Table(ranking_framework_data, colWidths=[90, 185, 210])
    t_rf.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_rf)

    # ==================== SECTION 8 ====================
    story.append(Spacer(1, 8))
    story.append(Paragraph("8. Institutional Strategic Planning & Department Tracking", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=1, spaceAfter=8))
    
    story.append(Paragraph("The <b>Strategic Plan Subsystem</b> allows university leadership to cascade long-term strategic quality goals down to individual academic departments with measurable milestones and real-time progress monitoring.", body_style))

    story.append(Paragraph("• <b>Departmental Goal Tracking:</b> Individual tracking pages for Civil Engineering, ECE, EEE, Mechanical & Automobile, CSE, Sciences & Humanities, School of Architecture, and AI & Data Science.", bullet_style))
    story.append(Paragraph("• <b>Milestone Progression Engine:</b> Strategic initiatives record target completion dates, allocated budgets, designated coordinators, and percentage progress (0%–100%).", bullet_style))
    story.append(Paragraph("• <b>Aggregation Algorithm:</b> The dashboard computes departmental completion scores automatically to populate the Department Performance Radar on the main dashboard.", bullet_style))

    # ==================== SECTION 9 ====================
    story.append(Spacer(1, 8))
    story.append(Paragraph("9. Security Architecture & 5-Tier Role-Based Access Control (RBAC)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=1, spaceAfter=8))
    
    story.append(Paragraph("To ensure data governance, confidentiality, and integrity, the platform implements a granular 5-Tier RBAC model enforced simultaneously at the React router/UI level and the Express backend middleware layer.", body_style))

    rbac_data = [
        [Paragraph("<b>Role Name</b>", table_header_style), Paragraph("<b>Display Title</b>", table_header_style), Paragraph("<b>Permitted System Scope & Actions</b>", table_header_style), Paragraph("<b>Restrictions</b>", table_header_style)],
        [Paragraph("admin", table_cell_bold), Paragraph("System Administrator", table_cell_style), Paragraph("Full system access: User CRUD, role allocation, system configuration, all department view, delete/modify data, audit log inspection.", table_cell_style), Paragraph("None (Superuser).", table_cell_style)],
        [Paragraph("authority", table_cell_bold), Paragraph("Institutional Authority", table_cell_style), Paragraph("University-wide executive analytics, institutional reports generation, ranking metrics view, cross-department comparisons.", table_cell_style), Paragraph("Read-only; cannot alter data or manage user accounts.", table_cell_style)],
        [Paragraph("hod", table_cell_bold), Paragraph("Head of Department", table_cell_style), Paragraph("Department-level oversight, approve/reject faculty submissions, edit department strategic plans, manage department documents.", table_cell_style), Paragraph("Scoped strictly to assigned academic department.", table_cell_style)],
        [Paragraph("coordinator", table_cell_bold), Paragraph("Department Coordinator", table_cell_style), Paragraph("Data collation, departmental batch uploads, verification of student/faculty records, draft submission approval.", table_cell_style), Paragraph("Cannot manage university users or view other departments.", table_cell_style)],
        [Paragraph("faculty", table_cell_bold), Paragraph("Faculty Member", table_cell_style), Paragraph("Upload course files, submit personal research papers, record awards/patents, view departmental academic summaries.", table_cell_style), Paragraph("Cannot approve submissions or edit locked records.", table_cell_style)],
    ]
    t_rbac = Table(rbac_data, colWidths=[65, 95, 215, 110])
    t_rbac.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_rbac)

    story.append(PageBreak())

    # ==================== SECTION 10 ====================
    story.append(Paragraph("10. Database Schema & Relational Entity Reference", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=1, spaceAfter=8))
    
    story.append(Paragraph("The platform backend utilizes PostgreSQL managed via Sequelize ORM with 14 normalized relational entities enforcing referential integrity and audit trails:", body_style))

    db_models_data = [
        [Paragraph("<b>Model Name</b>", table_header_style), Paragraph("<b>Key Attributes & Datatypes</b>", table_header_style), Paragraph("<b>Foreign Keys & Associations</b>", table_header_style), Paragraph("<b>Purpose & Lifecycle</b>", table_header_style)],
        [Paragraph("User", table_cell_bold), Paragraph("id (UUID), name (String), email (Unique), password (Hash), role (Enum: admin, authority, hod, coordinator, faculty), department (String), isActive (Boolean)", table_cell_style), Paragraph("1-to-Many with Achievements, Documents, Patents, Placements, Plans.", table_cell_style), Paragraph("User identity, authentication tokens, and permission context.", table_cell_style)],
        [Paragraph("Achievement", table_cell_bold), Paragraph("id, title, description, category (rankings, research, awards, sports, etc.), department, date, year, status (draft, pending, approved), userId", table_cell_style), Paragraph("BelongsTo User (creator), Foreign key: userId.", table_cell_style), Paragraph("Tracks faculty/student accolades with approval status.", table_cell_style)],
        [Paragraph("Document", table_cell_bold), Paragraph("id, title, category (course_file, report, policy, accreditation), department, fileUrl, fileType, fileSize, uploadDate, status, userId", table_cell_style), Paragraph("BelongsTo User (uploader), Foreign key: userId.", table_cell_style), Paragraph("Stores binary metadata and URLs for academic course files and annual reports.", table_cell_style)],
        [Paragraph("Patent", table_cell_bold), Paragraph("id, title, applicationNumber, status (filed, published, granted, commercialized), filingDate, grantDate, department, inventors, userId", table_cell_style), Paragraph("BelongsTo User (lead inventor), Foreign key: userId.", table_cell_style), Paragraph("Tracks intellectual property generation lifecycle.", table_cell_style)],
        [Paragraph("Placement", table_cell_bold), Paragraph("id, studentName, registerNumber, department, company, package (Numeric LPA), batch, placementType (placement, internship), userId", table_cell_style), Paragraph("BelongsTo User (coordinator), Foreign key: userId.", table_cell_style), Paragraph("Underpins all dashboard career analytics, salary tiers, and top recruiter charts.", table_cell_style)],
        [Paragraph("StrategicPlan", table_cell_bold), Paragraph("id, title, description, department, goalYear, progress (0-100), status (planning, in-progress, completed), budget, userId", table_cell_style), Paragraph("BelongsTo User (HOD/Admin), Foreign key: userId.", table_cell_style), Paragraph("Supplies data for departmental radar chart and strategic milestones.", table_cell_style)],
        [Paragraph("ResearchMetric", table_cell_bold), Paragraph("id, department, academicYear, scopusCount, wosCount, ugcCount, totalCitations, hIndex, i10Index, fundsSanctioned", table_cell_style), Paragraph("BelongsTo Department.", table_cell_style), Paragraph("Feeds Research Metrics Grid and NIRF/NAAC bibliometric scores.", table_cell_style)],
        [Paragraph("AuditLog / Notification", table_cell_bold), Paragraph("id, userId, action, entity, entityId, ipAddress, userAgent, isRead, message, timestamp", table_cell_style), Paragraph("BelongsTo User, Foreign key: userId.", table_cell_style), Paragraph("System security audit trail, live polling notifications, edit requests.", table_cell_style)],
    ]
    t_db = Table(db_models_data, colWidths=[80, 165, 120, 120])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_db)

    story.append(Spacer(1, 8))
    story.append(Paragraph("11. REST API Endpoints & Data Ingestion Reference", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=primary_color, spaceBefore=1, spaceAfter=8))
    
    story.append(Paragraph("The backend provides 47+ authenticated REST endpoints organized under logical resource routers:", body_style))

    api_data = [
        [Paragraph("<b>HTTP & Route</b>", table_header_style), Paragraph("<b>Auth & Min Role</b>", table_header_style), Paragraph("<b>Request Payload / Parameters</b>", table_header_style), Paragraph("<b>Response Output / Action</b>", table_header_style)],
        [Paragraph("POST /api/auth/login", table_cell_bold), Paragraph("Public", table_cell_style), Paragraph("{ email, password }", table_cell_style), Paragraph("Returns signed JWT bearer token and user profile object.", table_cell_style)],
        [Paragraph("GET /api/auth/me", table_cell_bold), Paragraph("JWT Bearer", table_cell_style), Paragraph("Authorization header", table_cell_style), Paragraph("Returns authenticated user profile, assigned role & permissions.", table_cell_style)],
        [Paragraph("GET /api/achievements", table_cell_bold), Paragraph("JWT (Faculty+)", table_cell_style), Paragraph("?department, ?category, ?year", table_cell_style), Paragraph("Filtered list of verified achievements and awards.", table_cell_style)],
        [Paragraph("POST /api/achievements", table_cell_bold), Paragraph("JWT (Faculty+)", table_cell_style), Paragraph("{ title, category, department, year, date }", table_cell_style), Paragraph("Creates new achievement record in draft/pending status.", table_cell_style)],
        [Paragraph("GET /api/documents", table_cell_bold), Paragraph("JWT (Faculty+)", table_cell_style), Paragraph("?department, ?category", table_cell_style), Paragraph("Course files and annual departmental quality documentation.", table_cell_style)],
        [Paragraph("POST /api/documents/upload", table_cell_bold), Paragraph("JWT (Faculty+)", table_cell_style), Paragraph("Multipart form-data (file, metadata)", table_cell_style), Paragraph("Stores binary, extracts file size/type, returns document record.", table_cell_style)],
        [Paragraph("GET /api/placements", table_cell_bold), Paragraph("JWT (Faculty+)", table_cell_style), Paragraph("?batch, ?department, ?company", table_cell_style), Paragraph("All placement/internship records for dashboard chart aggregation.", table_cell_style)],
        [Paragraph("GET /api/strategic-plans", table_cell_bold), Paragraph("JWT (Faculty+)", table_cell_style), Paragraph("?department, ?status", table_cell_style), Paragraph("Milestones and completion % used in radar chart calculation.", table_cell_style)],
        [Paragraph("GET /api/notifications", table_cell_bold), Paragraph("JWT (All roles)", table_cell_style), Paragraph("Polled every 10s via client", table_cell_style), Paragraph("Real-time notifications of approvals, edit requests, system alerts.", table_cell_style)],
    ]
    t_api = Table(api_data, colWidths=[120, 75, 130, 160])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), secondary_color),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_api)

    story.append(Spacer(1, 10))
    # Footer Notice
    footer_box = [
        [Paragraph("<b>Quality Assurance Certification:</b> This document accurately details the features, technical design, visual analytics, data schemas, and access controls of the CHRIST University IQAC Platform as deployed for the 2024–2026 academic cycle.", callout_style)]
    ]
    t_foot = Table(footer_box, colWidths=[485])
    t_foot.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#94a3b8")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_foot)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

if __name__ == "__main__":
    build_pdf()
