"""
Sources for the blog's diagrams (public/blog/<slug>/*.webp): each writes an
HTML page in the brand's type and colours, which render.js screenshots.

    cd frontend/scripts/blog-images
    python3 build.py && python3 chart.py
    NODE_PATH=../../../node_modules node render.js *.html
    # then convert each PNG to WebP, 1600px wide, into public/blog/<slug>/

chart.py holds the published competitor prices behind ats-monthly-cost-comparison.webp.
Re-check them and re-render the chart whenever a price changes, including Fluxberry's.
"""
FMARK = '<svg viewBox="0 0 2000 2000"><rect width="2000" height="2000" fill="#2d81ff"/><path fill="#fff" d="M616.3 335.5H1452.5V526H853V888.9H1337.6V1075.2H853V1630.5H616.3Z"/></svg>'
def page(body, title, sub, note=''):
    return f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="base.css"></head>
<body><div class="frame"><h1>{title}</h1><p class="sub">{sub}</p>{body}</div>
{f'<p class="note">{note}</p>' if note else ''}<div class="brand">{FMARK}Fluxberry</div></body></html>'''

# 1. How an ATS works (post 3)
steps = [
  ('Post the job','Careers page and job boards'),
  ('Collect applications','Every resume in one place'),
  ('Parse and score','AI reads each resume against the job'),
  ('Review the shortlist','Scores, strengths and concerns'),
  ('Interview','Scheduled on your calendar, feedback on scorecards'),
  ('Offer and hire','Offer sent, hire handed to HR'),
]
cells = ''.join(f'''<div class="card" style="position:relative;padding:26px 24px;height:230px;display:flex;flex-direction:column;gap:12px">
<span class="pill" style="align-self:flex-start">{i+1}</span>
<div style="font-family:Manrope;font-weight:700;font-size:26px;letter-spacing:-.02em;color:#000;line-height:1.15">{t}</div>
<div style="font-size:18px;line-height:1.45;color:#666">{d}</div></div>''' for i,(t,d) in enumerate(steps))
arrows = ''
body = f'''<div style="margin-top:70px;display:grid;grid-template-columns:repeat(6,1fr);gap:22px;position:relative">{cells}</div>
<div style="margin-top:34px;display:grid;grid-template-columns:repeat(6,1fr);gap:22px">
<div style="grid-column:1/3;border-top:3px solid #cfdcf3;padding-top:14px;font-family:Manrope;font-weight:600;font-size:19px;color:#3b4366">Attract</div>
<div style="grid-column:3/5;border-top:3px solid #2d81ff;padding-top:14px;font-family:Manrope;font-weight:600;font-size:19px;color:#0d6eff">Screen: where an ATS saves the most time</div>
<div style="grid-column:5/7;border-top:3px solid #cfdcf3;padding-top:14px;font-family:Manrope;font-weight:600;font-size:19px;color:#3b4366">Decide and hire</div></div>'''
open('how-an-ats-works.html','w').write(page(body,'How an applicant tracking system works','From job post to hire, every candidate moves through the same six steps in one shared system.'))

# 2. Recruiting software by hiring stage (post 4)
stages = [
  ('Attract', [('Sourcing','Find people who have not applied'),('Recruiting CRM','Nurture future candidates')]),
  ('Screen', [('Applicant tracking (ATS)','The system of record'),('AI screening','Score and rank applicants')]),
  ('Interview', [('Scheduling','Book rounds without email tag'),('Assessments','Test skills before interviews'),('Interview intelligence','Notes and transcripts')]),
  ('Hire', [('Background checks and offers','Verify, then sign')]),
]
cols=''
for name, items in stages:
    its=''.join(f'''<div class="card" style="padding:18px 20px"><div style="font-family:Manrope;font-weight:700;font-size:22px;color:#000;letter-spacing:-.015em">{t}</div><div style="margin-top:6px;font-size:17px;color:#666">{d}</div></div>''' for t,d in items)
    cols+=f'''<div style="display:flex;flex-direction:column;gap:14px"><div style="font-family:Manrope;font-weight:700;font-size:20px;color:#0d6eff;padding:10px 0;border-bottom:3px solid #2d81ff">{name}</div>{its}</div>'''
body=f'<div style="margin-top:56px;display:grid;grid-template-columns:repeat(4,1fr);gap:26px">{cols}</div>'
open('recruiting-software-by-hiring-stage.html','w').write(page(body,'The eight types of recruiting software','Where each type of tool fits in the hiring process. Small teams usually start with an ATS and add the rest as volume grows.'))

# 3. Switching plan (posts 1 and 2)
def plan(name):
    weeks=[
      ('Week 1','Export and set up',[f'Export candidates, jobs and notes from {name}','Rebuild pipeline stages and application forms','Invite hiring managers']),
      ('Weeks 2 to 3','Run both tools',['Open every new role in the new ATS',f'Let roles already in {name} finish there','Compare time to shortlist on both']),
      ('Week 4','Close out',[f'Move any candidates still in play out of {name}','Keep the export for your records',f'Cancel {name} before the renewal date']),
    ]
    cells=''
    for w,t,items in weeks:
        li=''.join(f'<li style="margin-top:10px">{x}</li>' for x in items)
        cells+=f'''<div class="card" style="padding:28px 28px 30px"><span class="pill">{w}</span><div style="margin-top:16px;font-family:Manrope;font-weight:700;font-size:28px;color:#000;letter-spacing:-.02em">{t}</div><ul style="margin-top:8px;padding-left:22px;font-size:19px;line-height:1.45;color:#555">{li}</ul></div>'''
    body=f'<div style="margin-top:60px;display:grid;grid-template-columns:repeat(3,1fr);gap:26px">{cells}</div>'
    return page(body,f'A four-week plan for switching from {name}','Run the old and new ATS side by side, so no candidate falls through the gap.')
open('switch-from-ashby.html','w').write(plan('Ashby'))
open('switch-from-greenhouse.html','w').write(plan('Greenhouse'))
print('ok')
