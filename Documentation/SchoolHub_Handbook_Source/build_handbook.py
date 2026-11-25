"""
SchoolHub Project Handbook - PDF generator (editable source).
Edit the text below and run:   python build_handbook.py
Needs:  pip install reportlab pillow
Keep terminal_screenshot.png in the same folder.
"""
import os
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "SchoolHub_Project_Handbook.pdf")
SHOT = os.path.join(HERE, "terminal_screenshot.png")
LIVE_URL = "https://schoolhub-demo.netlify.app"
LINKEDIN = "https://www.linkedin.com/in/ammaarquadri/"
TOTAL = 10

W, H = A4
M = 56
CW = W - 2 * M

NAVY = HexColor("#14284B")
BLUE = HexColor("#2F5FA8")
SKY = HexColor("#5B8DD6")
PALE = HexColor("#EEF3FB")
LINE = HexColor("#D2DDEE")
TEXT = HexColor("#1F2A44")
MUTED = HexColor("#5C6B85")
GREEN = HexColor("#2E9E6B")
RED = HexColor("#D9534F")
AMBER = HexColor("#C98A1B")
AMBER_BG = HexColor("#FFF6E3")

body = ParagraphStyle("body", fontName="Helvetica", fontSize=11, leading=16.5, textColor=TEXT)
small = ParagraphStyle("small", parent=body, fontSize=10, leading=14.5)
cap = ParagraphStyle("cap", parent=body, fontName="Helvetica-Oblique", fontSize=9.5, leading=13, textColor=MUTED)
h3 = ParagraphStyle("h3", parent=body, fontName="Helvetica-Bold", fontSize=12.5, leading=16, textColor=NAVY)
cell = ParagraphStyle("cell", parent=body, fontSize=10.5, leading=15)
cellb = ParagraphStyle("cellb", parent=cell, fontName="Helvetica-Bold", textColor=NAVY)
code = ParagraphStyle("code", parent=cell, fontName="Courier-Bold", fontSize=10.5, textColor=NAVY)
th = ParagraphStyle("th", parent=cell, fontName="Helvetica-Bold", textColor=white)
ctr = ParagraphStyle("ctr", parent=body, fontSize=10, leading=13, alignment=TA_CENTER)


# ---------------------------------------------------------------- helpers
def measure(text, w, style=body):
    return Paragraph(text, style).wrap(w, 2000)[1]


def P(c, text, x, ytop, w, style=body):
    p = Paragraph(text, style)
    h = p.wrap(w, 2000)[1]
    p.drawOn(c, x, ytop - h)
    return ytop - h


def bullets(c, items, x, ytop, w, style=body, gap=5):
    y = ytop
    for it in items:
        h = measure(it, w - 16, style)
        c.setFillColor(BLUE)
        c.circle(x + 4, y - style.leading * 0.62, 2.2, stroke=0, fill=1)
        P(c, it, x + 16, y, w - 16, style)
        y -= h + gap
    return y


def section_title(c, num, title, sub=None):
    c.setFillColor(NAVY)
    c.setFont("Times-Bold", 26)
    c.drawString(M, H - 100, f"{num}  {title}")
    c.setFillColor(SKY)
    c.rect(M, H - 112, 54, 3, stroke=0, fill=1)
    y = H - 128
    if sub:
        y = P(c, sub, M, y, CW, ParagraphStyle("sub", parent=body, textColor=MUTED, fontSize=11.5)) - 8
    return y


def frame(c, n, running):
    if n > 1:
        c.setFillColor(NAVY)
        c.rect(0, H - 34, W, 34, stroke=0, fill=1)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(M, H - 21, "SchoolHub  |  Project Handbook")
        c.setFont("Helvetica", 9.5)
        c.drawRightString(W - M, H - 21, running)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.line(M, 46, W - M, 46)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9.5)
    c.drawString(M, 30, f"Page {n} of {TOTAL}")
    label = "Prepared by M.A.Q."
    c.setFont("Helvetica-Oblique", 10)
    c.setFillColor(BLUE)
    c.drawRightString(W - M, 30, label)
    tw = c.stringWidth(label, "Helvetica-Oblique", 10)
    c.linkURL(LINKEDIN, (W - M - tw - 2, 24, W - M + 2, 42), relative=0, thickness=0)


def card(c, x, ytop, w, title, text, style=small, min_h=0, accent=BLUE, fill=PALE):
    th_ = measure(title, w - 32, h3)
    bh = measure(text, w - 32, style)
    h = max(min_h, 16 + th_ + 6 + bh + 16)
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.roundRect(x, ytop - h, w, h, 8, stroke=1, fill=1)
    c.setFillColor(accent)
    c.rect(x, ytop - h + 8, 4, h - 16, stroke=0, fill=1)
    y = P(c, title, x + 18, ytop - 14, w - 32, h3)
    P(c, text, x + 18, y - 6, w - 32, style)
    return ytop - h


def card_h(w, title, text, style=small):
    return 16 + measure(title, w - 32, h3) + 6 + measure(text, w - 32, style) + 16


def table(c, data, col_w, x, ytop, header=True, pad=7):
    rows = []
    for r, row in enumerate(data):
        rows.append([Paragraph(v, th if (header and r == 0) else v_style) if isinstance(v, str) else v
                     for v, v_style in zip(row, [cellb, cell, cell, cell][:len(row)])])
    t = Table(rows, colWidths=col_w)
    st = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), pad), ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("LINEBELOW", (0, 0), (-1, -1), 0.6, LINE),
        ("BOX", (0, 0), (-1, -1), 0.8, LINE),
    ]
    if header:
        st.append(("BACKGROUND", (0, 0), (-1, 0), NAVY))
    for r in range(1 if header else 0, len(rows)):
        if (r % 2 == 0):
            st.append(("BACKGROUND", (0, r), (-1, r), PALE))
    t.setStyle(TableStyle(st))
    w_, h_ = t.wrap(sum(col_w), 2000)
    t.drawOn(c, x, ytop - h_)
    return ytop - h_


def arrow(c, x1, y1, x2, y2, color=BLUE):
    import math
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(1.6)
    ang = math.atan2(y2 - y1, x2 - x1)
    hx, hy = x2 - 7 * math.cos(ang), y2 - 7 * math.sin(ang)
    c.line(x1, y1, hx, hy)
    p = c.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(hx + 4 * math.sin(ang), hy - 4 * math.cos(ang))
    p.lineTo(hx - 4 * math.sin(ang), hy + 4 * math.cos(ang))
    p.close()
    c.drawPath(p, stroke=0, fill=1)


def box(c, x, ytop, w, h, text, fill=PALE, stroke=BLUE, style=ctr, txt=None):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(1.2)
    c.roundRect(x, ytop - h, w, h, 8, stroke=1, fill=1)
    if txt:
        style = ParagraphStyle("t", parent=style, textColor=txt)
    ph = measure(text, w - 12, style)
    P(c, text, x + 6, ytop - (h - ph) / 2, w - 12, style)


def chip(c, x, y, text, fill=NAVY, color=white, size=10):
    tw = c.stringWidth(text, "Helvetica-Bold", size)
    c.setFillColor(fill)
    c.roundRect(x, y, tw + 20, 22, 11, stroke=0, fill=1)
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", size)
    c.drawString(x + 10, y + 7, text)
    return x + tw + 20 + 8


def number_dot(c, cx, cy, n, r=13):
    c.setFillColor(NAVY)
    c.circle(cx, cy, r, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(cx, cy - 4, str(n))


def cap_logo(c, x, y, s=1.0, fill=white):
    c.setFillColor(fill)
    p = c.beginPath()
    p.moveTo(x, y + 14 * s); p.lineTo(x + 26 * s, y + 26 * s)
    p.lineTo(x + 52 * s, y + 14 * s); p.lineTo(x + 26 * s, y + 2 * s); p.close()
    c.drawPath(p, stroke=0, fill=1)
    p = c.beginPath()
    p.moveTo(x + 10 * s, y + 10 * s); p.lineTo(x + 10 * s, y - 4 * s)
    p.curveTo(x + 18 * s, y - 12 * s, x + 34 * s, y - 12 * s, x + 42 * s, y - 4 * s)
    p.lineTo(x + 42 * s, y + 10 * s); p.lineTo(x + 26 * s, y + 3 * s); p.close()
    c.drawPath(p, stroke=0, fill=1)


# ---------------------------------------------------------------- pages
def page1(c):
    c.setFillColor(NAVY)
    c.rect(0, H - 400, W, 400, stroke=0, fill=1)
    c.saveState()
    clip = c.beginPath()
    clip.rect(0, H - 400, W, 400)
    c.clipPath(clip, stroke=0, fill=0)
    c.setFillColor(HexColor("#1D3A6B"))
    c.circle(W - 60, H - 90, 150, stroke=0, fill=1)
    c.setFillColor(HexColor("#18305A"))
    c.circle(W - 190, H - 380, 90, stroke=0, fill=1)
    c.restoreState()
    c.setFillColor(HexColor("#233F73"))
    c.roundRect(M, H - 130, 70, 70, 16, stroke=0, fill=1)
    cap_logo(c, M + 9, H - 98, 1.0)
    c.setFillColor(HexColor("#A9C4EE"))
    c.setFont("Helvetica", 15)
    c.drawString(M, H - 190, "Project Handbook")
    c.setFillColor(white)
    c.setFont("Times-Bold", 66)
    c.drawString(M, H - 262, "SchoolHub")
    c.setFillColor(SKY)
    c.rect(M, H - 284, 70, 4, stroke=0, fill=1)
    c.setFillColor(HexColor("#DCE8FA"))
    c.setFont("Times-Roman", 24)
    c.drawString(M, H - 322, "A Simple School Management System")
    c.setFont("Helvetica", 12)
    c.setFillColor(HexColor("#A9C4EE"))
    c.drawString(M, H - 360, "Dashboard  |  Students  |  Teachers  |  Classes  |  Attendance")

    y = H - 440
    y = P(c, "SchoolHub is a small, modern web application for managing a school's students, teachers, classes "
             "and daily attendance. It was built with core web technologies and a serverless backend, "
             "and is deployed live on Netlify.",
          M, y, CW, ParagraphStyle("lead", parent=body, fontSize=12.5, leading=19))
    y -= 22
    x = M
    for t in ["HTML5", "CSS3", "JavaScript", "Node.js", "Netlify Functions", "Netlify Blobs"]:
        x = chip(c, x, y - 22, t)
    y -= 56
    rows = [
        ["Project type", "Simple school management system"],
        ["Frontend", "HTML5, CSS3, Vanilla JavaScript"],
        ["Backend", "Node.js, Netlify Functions"],
        ["Data storage", "Netlify Blobs"],
        ["Hosting", "Netlify (deployed with Netlify CLI)"],
        ["Live website", f'<link href="{LIVE_URL}" color="#2F5FA8">schoolhub-demo.netlify.app</link>'],
    ]
    table(c, rows, [120, CW - 120], M, y, header=False, pad=6)
    frame(c, 1, "")


def page2(c):
    y = section_title(c, "1", "Introduction")
    y -= 6
    y = P(c, "What is SchoolHub?", M, y, CW, h3) - 4
    y = P(c, "SchoolHub is a simple web-based school management system. It lets a school office keep track of "
             "its students, teachers and classes and record daily attendance, all from one clean dashboard that "
             "opens in any web browser.", M, y, CW) - 14
    y = P(c, "Why it was created", M, y, CW, h3) - 4
    y = P(c, "SchoolHub is a demonstration project: a complete, working web application that is deliberately "
             "kept small. It shows how a web page can have a real backend and permanent storage without a large "
             "or complicated setup, using only core web technologies and a serverless platform.", M, y, CW) - 18
    y = P(c, "Problems it addresses", M, y, CW, h3) - 8
    gap = 12
    w3 = (CW - 2 * gap) / 3
    items = [
        ("Scattered records", "Student, teacher and class details are often kept in different notebooks or files. SchoolHub keeps them together."),
        ("Slow attendance", "Paper registers take time to total and are hard to look back through. SchoolHub marks and stores attendance in a few clicks."),
        ("No quick overview", "The dashboard shows today's numbers at a glance, so nobody has to count by hand."),
    ]
    hh = max(card_h(w3, t, d) for t, d in items)
    for i, (t, d) in enumerate(items):
        card(c, M + i * (w3 + gap), y, w3, t, d, min_h=hh)
    y -= hh + 22
    y = P(c, "Objectives", M, y, CW, h3) - 6
    bullets(c, [
        "Manage students, teachers and classes in one simple system.",
        "Record attendance by class and date, and review earlier records.",
        "Store data permanently, so it is still there after a refresh or a later visit.",
        "Present everything in a clean, modern interface designed for desktop and mobile screens.",
        "Publish the project as a live website on Netlify.",
    ], M, y, CW)
    frame(c, 2, "Introduction")


def page3(c):
    y = section_title(c, "2", "Technology Stack",
                      "SchoolHub uses a small set of technologies, so each part is easy to understand.")
    y -= 4
    rows = [
        ["Layer", "Technology", "What it does"],
        ["Frontend", "HTML5, CSS3, Vanilla JavaScript",
         "Builds the pages, styles the dashboard and handles clicks, forms and charts in the browser. No framework is used."],
        ["Backend", "Node.js, Netlify Functions",
         "One small serverless function receives requests from the page and checks and saves the data."],
        ["Data storage", "Netlify Blobs",
         "Keeps records permanently as simple JSON data. There is no database server to install or manage."],
        ["Hosting", "Netlify", "Publishes the website and the backend function on the internet."],
    ]
    y = table(c, rows, [90, 150, CW - 240], M, y) - 26

    y = P(c, "How the parts connect", M, y, CW, h3) - 10
    bw, bh, g = 100, 78, (CW - 4 * 100) / 3
    top = y
    labels = [("<b>Browser</b><br/>HTML, CSS and JavaScript", PALE), ("<b>API requests</b><br/>sent to /api/...", white),
              ("<b>Netlify Function</b><br/>Node.js backend", PALE), ("<b>Netlify Blobs</b><br/>stored data", PALE)]
    for i, (t, f) in enumerate(labels):
        x = M + i * (bw + g)
        box(c, x, top, bw, bh, t, fill=f, stroke=BLUE if i != 1 else LINE)
        if i < 3:
            arrow(c, x + bw + 3, top - bh / 2, x + bw + g - 3, top - bh / 2)
    y = top - bh - 14
    c.setFillColor(NAVY)
    c.roundRect(M, y - 28, CW, 28, 6, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawCentredString(W / 2, y - 18, "All hosted on Netlify")
    y -= 28 + 8
    y = P(c, "Illustrative architecture diagram.", M, y, CW, cap) - 20

    y = P(c, "Deliberately left out", M, y, CW, h3) - 8
    x = M
    for t in ["React", "PostgreSQL", "MongoDB", "Docker", "GitHub-based deployment", "Login system"]:
        x = chip(c, x, y - 22, t, fill=PALE, color=NAVY)
    y -= 36
    P(c, "These were kept out on purpose. Fewer tools means fewer things to learn and fewer things that can break, "
         "which suits a small demonstration project.", M, y, CW)
    frame(c, 3, "Technology Stack")


def donut(c, cx, cy, r, parts):
    start = 90
    for frac, col in parts:
        ext = -360 * frac
        c.setFillColor(col)
        c.wedge(cx - r, cy - r, cx + r, cy + r, start, ext, stroke=0, fill=1)
        start += ext
    c.setFillColor(white)
    c.circle(cx, cy, r * 0.58, stroke=0, fill=1)


def page4(c):
    y = section_title(c, "3", "Application Dashboard",
                      "The dashboard is the first screen. It gives a quick picture of the whole school.")
    y -= 6
    # illustrative mock layout
    mx, mw, mh = M, CW, 262
    top = y
    c.setFillColor(white); c.setStrokeColor(LINE); c.setLineWidth(1)
    c.roundRect(mx, top - mh, mw, mh, 10, stroke=1, fill=1)
    sbw = 96
    c.setFillColor(NAVY)
    c.roundRect(mx, top - mh, sbw, mh, 10, stroke=0, fill=1)
    c.rect(mx + sbw - 12, top - mh, 12, mh, stroke=0, fill=1)
    c.setFillColor(white); c.setFont("Helvetica-Bold", 9.5)
    c.drawString(mx + 12, top - 22, "SchoolHub")
    for i, n in enumerate(["Dashboard", "Students", "Teachers", "Classes", "Attendance", "Demo Data"]):
        yy = top - 48 - i * 26
        if i == 0:
            c.setFillColor(white); c.roundRect(mx + 8, yy - 6, sbw - 16, 20, 6, stroke=0, fill=1)
            c.setFillColor(NAVY)
        else:
            c.setFillColor(HexColor("#B8CCEB"))
        c.setFont("Helvetica", 8.5)
        c.drawString(mx + 14, yy, n)
    ix = mx + sbw + 12
    iw = mw - sbw - 24
    c.setFillColor(PALE); c.roundRect(ix, top - 30, iw, 22, 5, stroke=0, fill=1)
    c.setFillColor(MUTED); c.setFont("Helvetica", 8.5)
    c.drawString(ix + 8, top - 23, "Top bar: page title, date, user")
    # banner
    c.setFillColor(BLUE); c.roundRect(ix, top - 72, iw, 34, 6, stroke=0, fill=1)
    c.setFillColor(white); c.setFont("Helvetica-Bold", 9.5)
    c.drawString(ix + 10, top - 58, "Welcome banner with quick actions")
    # cards
    gap = 6
    cw5 = (iw - 4 * gap) / 5
    names = ["Students", "Teachers", "Classes", "Present", "Absent"]
    cols = [BLUE, HexColor("#8A79F0"), AMBER, GREEN, RED]
    for i, (n, col) in enumerate(zip(names, cols)):
        x = ix + i * (cw5 + gap)
        c.setFillColor(white); c.setStrokeColor(LINE); c.roundRect(x, top - 128, cw5, 46, 6, stroke=1, fill=1)
        c.setFillColor(col); c.circle(x + 12, top - 105, 6, stroke=0, fill=1)
        c.setFillColor(LINE); c.rect(x + 24, top - 101, cw5 - 32, 5, stroke=0, fill=1)
        c.setFillColor(TEXT); c.setFont("Helvetica", 8)
        c.drawString(x + 8, top - 122, n)
    # charts
    ch_top = top - 138
    ch_h = mh - 138 - 8
    half = (iw - gap) / 2
    c.setFillColor(white); c.setStrokeColor(LINE)
    c.roundRect(ix, ch_top - ch_h, half, ch_h, 6, stroke=1, fill=1)
    c.roundRect(ix + half + gap, ch_top - ch_h, half, ch_h, 6, stroke=1, fill=1)
    c.setFillColor(NAVY); c.setFont("Helvetica-Bold", 8.5)
    c.drawString(ix + 8, ch_top - 14, "Today's attendance")
    c.drawString(ix + half + gap + 8, ch_top - 14, "Last 7 days")
    donut(c, ix + 40, ch_top - ch_h / 2 - 6, 30, [(0.7, GREEN), (0.2, RED), (0.1, LINE)])
    for i, (n, col) in enumerate([("Present", GREEN), ("Absent", RED), ("Not marked", LINE)]):
        c.setFillColor(col); c.rect(ix + 82, ch_top - 42 - i * 16, 8, 8, stroke=0, fill=1)
        c.setFillColor(TEXT); c.setFont("Helvetica", 8); c.drawString(ix + 95, ch_top - 41 - i * 16, n)
    bx = ix + half + gap + 14
    for i, hgt in enumerate([0.8, 0.9, 0.7, 0.95, 0.85, 0.6, 0.9]):
        c.setFillColor(SKY)
        c.roundRect(bx + i * 24, ch_top - ch_h + 10, 14, (ch_h - 36) * hgt, 3, stroke=0, fill=1)
    y = top - mh - 8
    y = P(c, "Illustrative diagram of the dashboard layout. This is not a screenshot of the application; "
             "bar heights and proportions are for illustration only.", M, y, CW, cap) - 20

    y = P(c, "What the dashboard shows", M, y, CW, h3) - 8
    rows = [
        ["Feature", "What it shows"],
        ["Summary cards", "Total students, total teachers and total classes."],
        ["Today's attendance", "How many students are present, absent or not yet marked today."],
        ["Charts", "A ring chart for today and a bar chart of the last 7 days."],
        ["Quick actions", "Buttons to mark attendance or add a student straight from the welcome banner."],
    ]
    table(c, rows, [140, CW - 140], M, y)
    frame(c, 4, "Application Dashboard")


def page5(c):
    y = section_title(c, "4", "Management Modules",
                      "Students, teachers and classes are managed in the same simple way.")
    y -= 6
    gap = 12
    w3 = (CW - 2 * gap) / 3
    items = [
        ("Students", "<b>Details kept</b><br/>&bull; Name<br/>&bull; Admission number<br/>&bull; Class<br/>&bull; Parent name<br/>&bull; Contact number"
                     "<br/><br/><b>What you can do</b><br/>&bull; Add, view, edit, delete<br/>&bull; Search as you type"),
        ("Teachers", "<b>Details kept</b><br/>&bull; Name<br/>&bull; Subject<br/>&bull; Contact number"
                     "<br/><br/><b>What you can do</b><br/>&bull; Add, view, edit, delete<br/>&bull; See which class each teacher leads"),
        ("Classes", "<b>Details kept</b><br/>&bull; Class name<br/>&bull; Class teacher"
                    "<br/><br/><b>What you can do</b><br/>&bull; Add, edit, delete<br/>&bull; Assign a teacher to a class<br/>&bull; See how many students each class has"),
    ]
    hh = max(card_h(w3, t, d) for t, d in items)
    for i, (t, d) in enumerate(items):
        card(c, M + i * (w3 + gap), y, w3, t, d, min_h=hh)
    y -= hh + 26
    y = P(c, "Built-in checks and safeguards", M, y, CW, h3) - 8
    rows = [
        ["Rule", "How it works"],
        ["Required fields", "A student needs a name, admission number and class. A teacher needs a name and subject. A class needs a name."],
        ["No duplicate admission numbers", "Two students cannot share an admission number, even if the capital letters differ."],
        ["Search", "Students are filtered as you type, by name, admission number, class, parent or contact."],
        ["Clear messages", "Success and error messages appear on screen, and empty lists show a friendly message."],
        ["Safe deleting", "Every delete asks for confirmation. Deleting a teacher leaves their class without a teacher. Deleting a class keeps its students."],
    ]
    table(c, rows, [160, CW - 160], M, y)
    frame(c, 5, "Management Modules")


def page6(c):
    y = section_title(c, "5", "Attendance Management",
                      "Attendance is marked by class and date, and every saved record can be viewed again.")
    y -= 8
    y = P(c, "The attendance workflow", M, y, CW, h3) - 10
    steps = ["Select a class", "Choose the date", "Mark Present or Absent", "Save attendance", "View saved records"]
    n = len(steps)
    g = 16
    bw = (CW - (n - 1) * g) / n
    bh = 78
    top = y
    for i, s in enumerate(steps):
        x = M + i * (bw + g)
        box(c, x, top, bw, bh, s, fill=PALE, stroke=BLUE)
        number_dot(c, x + bw / 2, top + 1, i + 1, r=11)
        if i < n - 1:
            arrow(c, x + bw + 2, top - bh / 2, x + bw + g - 2, top - bh / 2)
    y = top - bh - 8
    y = P(c, "Illustrative workflow diagram.", M, y, CW, cap) - 16
    y = P(c, "How marking works", M, y, CW, h3) - 6
    y = bullets(c, [
        "After choosing a class, its students are listed and everyone starts as <b>Present</b>.",
        "Each student can be switched to <b>Present</b> or <b>Absent</b>. A <b>Mark all present</b> button speeds things up.",
        "Attendance is saved for that class on that date. Opening the same date again shows the saved attendance.",
        "The <b>Saved records</b> table lists each date and class with present and absent counts, and a view button.",
    ], M, y, CW) - 14

    y = P(c, "Demo data", M, y, CW, h3) - 8
    gap = 14
    w2 = (CW - gap) / 2
    a = ("Load sample data", "Adds 3 classes, 3 teachers, 12 students and 5 days of attendance, each clearly tagged <b>Sample</b>. "
                            "It only loads when the system is empty, so existing records are never mixed up.")
    b = ("Clear all data", "Removes all students, teachers, classes and attendance after a confirmation, "
                           "so the system can be reset and explored again from scratch.")
    hh = max(card_h(w2, *a), card_h(w2, *b))
    card(c, M, y, w2, *a, min_h=hh)
    card(c, M + w2 + gap, y, w2, *b, min_h=hh)
    y -= hh + 18
    P(c, "Demo data lets anyone explore the system immediately without typing records first.", M, y, CW, cap)
    frame(c, 6, "Attendance Management")


def page7(c):
    y = section_title(c, "6", "Development Journey",
                      "From idea to live website, in the order the work was done.")
    steps = [
        ("Identifying the need", "A simple, attractive school management web page was needed to show a complete project: records, attendance and a dashboard in one place."),
        ("Planning the essential modules", "The scope was kept small: Dashboard, Students, Teachers, Classes and Attendance, plus demo data tools."),
        ("Designing the dashboard and interface", "A modern layout with a sidebar, top bar, summary cards, tables and pop-up forms in a blue, white and light-purple palette."),
        ("Developing the frontend", "Built with HTML5, CSS3 and vanilla JavaScript, with no frameworks."),
        ("Creating the backend", "One Node.js function on Netlify Functions provides the routes for students, teachers, classes, attendance and the dashboard, and checks what is saved."),
        ("Implementing persistent storage", "Records are saved in Netlify Blobs so they remain after a refresh and on later visits."),
        ("Testing and fixing issues", "Automated checks ran on the backend and in a simulated browser. They found that the dashboard's Load sample data button did nothing; this was fixed."),
        ("Deploying with Netlify CLI", "The project was deployed directly from the local computer using Netlify CLI. No GitHub repository was connected."),
        ("Verifying the live website", "A draft deployment was opened and checked in the browser first, then the production deployment was completed."),
    ]
    y0 = y - 18
    step_h = 66
    x_dot = M + 14
    c.setStrokeColor(LINE); c.setLineWidth(2)
    c.line(x_dot, y0 - 6, x_dot, y0 - step_h * (len(steps) - 1) - 6)
    for i, (t, d) in enumerate(steps):
        yy = y0 - i * step_h
        number_dot(c, x_dot, yy - 6, i + 1)
        yt = P(c, t, M + 42, yy + 6, CW - 42, h3)
        P(c, d, M + 42, yt - 2, CW - 42, small)
    frame(c, 7, "Development Journey")


def page8(c):
    y = section_title(c, "7", "Deployment on Netlify",
                      "SchoolHub was published straight from the local project folder, without GitHub.")
    y -= 8
    y = P(c, "The deployment workflow", M, y, CW, h3) - 10
    labels = ["Local project folder", "Netlify CLI", "Netlify draft deployment",
              "Browser testing", "Production deployment", "Live SchoolHub website"]
    g = 34
    bw = (CW - 2 * g) / 3
    bh = 52
    for r in range(2):
        top = y - r * (bh + 34)
        for k in range(3):
            i = r * 3 + k
            x = M + k * (bw + g) if r == 0 else M + (2 - k) * (bw + g)
            last = i == 5
            box(c, x, top, bw, bh, f"<b>{labels[i]}</b>", fill=NAVY if last else PALE, stroke=NAVY if last else BLUE,
                txt=white if last else NAVY)
            if k < 2:
                if r == 0:
                    arrow(c, x + bw + 3, top - bh / 2, x + bw + g - 3, top - bh / 2)
                else:
                    arrow(c, x - 3, top - bh / 2, x - g + 3, top - bh / 2)
    # down arrow between rows (right side)
    xr = M + 2 * (bw + g) + bw / 2
    arrow(c, xr, y - bh - 3, xr, y - bh - 34 + 3)
    y = y - 2 * bh - 34 - 8
    y = P(c, "Illustrative workflow diagram.", M, y, CW, cap) - 18

    y = P(c, "The commands used", M, y, CW, h3) - 8
    rows = [
        ["Command", "What it does in plain English"],
        [Paragraph("npm install", code), "Downloads the one extra tool the project needs (@netlify/blobs) into the project folder. Done once."],
        [Paragraph("netlify login", code), "Opens the browser so you can sign in to Netlify and allow the command line tool to use your account. Done once."],
        [Paragraph("netlify deploy", code), "Uploads the project as a <b>draft</b>. Netlify gives a temporary web address so the site can be tested before anyone else sees it."],
        [Paragraph("netlify deploy --prod", code), "Publishes the project to the main website address. This is the step that makes the new version live."],
    ]
    y = table(c, rows, [180, CW - 180], M, y) - 18
    P(c, "Because no GitHub repository is connected, nothing is published automatically. To publish a change, "
         "run <font name='Courier-Bold'>netlify deploy --prod</font> again.", M, y, CW)
    frame(c, 8, "Deployment on Netlify")


def page9(c):
    y = section_title(c, "8", "Deployment Proof",
                      "A real screenshot of the terminal after the production deployment.")
    y -= 6
    im = Image.open(SHOT).convert("RGB")
    crop = im.crop((450, 130, 1400, 960))
    crop_path = os.path.join(HERE, "_terminal_crop.png")
    crop.save(crop_path)
    w_img = CW
    h_img = w_img * crop.size[1] / crop.size[0]
    c.setStrokeColor(LINE); c.setLineWidth(1)
    c.setFillColor(PALE)
    c.roundRect(M - 4, y - h_img - 4, w_img + 8, h_img + 8, 6, stroke=1, fill=1)
    c.drawImage(crop_path, M, y - h_img, w_img, h_img)
    y -= h_img + 14
    y = P(c, "Genuine screenshot of the Netlify CLI output in the terminal, cropped to the output area. "
             "Nothing in it has been edited.", M, y, CW, cap) - 14
    y = P(c, "What the output confirms", M, y, CW, h3) - 6
    bullets(c, [
        "The function was bundled, and Netlify deployed <b>4 files and 1 function</b>.",
        "Netlify reported <b>Deploy is live!</b> and <b>Production deploy is live</b>.",
        f'The production address is <link href="{LIVE_URL}" color="#2F5FA8">schoolhub-demo.netlify.app</link>. '
        "The Netlify build took 9.1 seconds.",
    ], M, y, CW, style=small, gap=3)
    frame(c, 9, "Deployment Proof")


def page10(c):
    y = section_title(c, "9", "Testing, Outcome and Future Scope")
    y -= 4
    y = P(c, "Testing performed", M, y, CW, h3) - 8
    rows = [
        ["Area", "Result"],
        ["Backend API", "30 checks passed, run against the real API code with an in-memory substitute for Netlify Blobs."],
        ["Frontend", "15-step simulated browser test passed: all pages, search, the add form, validation, saving and viewing attendance."],
        ["Covered by these tests", "Add, edit and delete; search and form validation; attendance saving and retrieval; dashboard and sample data."],
        ["Draft deployment", "Opened and checked in the browser."],
        ["Production deployment", "Completed successfully (see the terminal screenshot)."],
    ]
    y = table(c, rows, [150, CW - 150], M, y, pad=6) - 16

    ltxt = ("&bull; Real Netlify Blobs persistence was <b>not verified</b> by the automated tests, which used an in-memory substitute.<br/>"
            "&bull; Visual appearance was not fully tested across different browsers and devices.<br/>"
            "&bull; The application has <b>no login or authentication</b>.<br/>"
            "&bull; It is a demonstration project and is <b>not suitable for real student personal information</b>.")
    y = card(c, M, y, CW, "Honest limitations", ltxt, style=small, accent=AMBER, fill=AMBER_BG) - 18

    y = P(c, "Final outcome", M, y, CW, h3) - 4
    y = P(c, f'SchoolHub is live at <link href="{LIVE_URL}" color="#2F5FA8">{LIVE_URL}</link>. '
             "It provides a dashboard, student, teacher and class management, attendance with saved history and demo data tools, "
             "built with a small stack and deployed directly from the local computer with Netlify CLI.", M, y, CW, small) - 14
    y = P(c, "Possible future scope", M, y, CW, h3) - 6
    bullets(c, [
        "Add a login system with user roles.",
        "Confirm data persistence on the live site and test on more browsers and devices.",
        "Add more modules, such as timetables, exams or fees.",
        "Add reports and exports for attendance.",
    ], M, y, CW, style=small, gap=3)
    frame(c, 10, "Testing and Outcome")


def build():
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle("SchoolHub Project Handbook")
    c.setAuthor("M.A.Q.")
    c.setSubject("Simple School Management System")
    for fn in [page1, page2, page3, page4, page5, page6, page7, page8, page9, page10]:
        fn(c)
        c.showPage()
    c.save()
    print("Created", OUT)


if __name__ == "__main__":
    build()
