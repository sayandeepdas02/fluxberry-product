from build import page
rows = [
  ('Fluxberry', 'Pro, flat price, unlimited users', 39, True),
  ('Manatal', 'Professional, $19 per recruiter', 57, False),
  ('Zoho Recruit', 'Standard, $30 per recruiter', 90, False),
  ('JazzHR', 'Hero, flat price', 110, False),
  ('Breezy HR', 'Startup, flat price', 189, False),
  ('Ashby', 'Foundations, 1–10 employees', 300, False),
  ('Gem', 'Startup program, 1–10 employees', 300, False),
  ('Workable', 'Standard, 1–20 employees', 360, False),
]
W, left, right, rowh, bar = 1440, 400, 90, 62, 24
plotw = W - left - right
maxv = 400
svg = [f'<svg width="{W}" height="{len(rows)*rowh+50}" viewBox="0 0 {W} {len(rows)*rowh+50}" xmlns="http://www.w3.org/2000/svg" font-family="Inter">']
for t in [0,100,200,300,400]:
    x = left + plotw*t/maxv
    svg.append(f'<line x1="{x}" y1="0" x2="{x}" y2="{len(rows)*rowh}" stroke="#eceff4" stroke-width="1"/>')
    svg.append(f'<text x="{x}" y="{len(rows)*rowh+32}" font-size="17" fill="#888" text-anchor="middle">${t}</text>')
for i,(name,basis,v,hl) in enumerate(rows):
    y = i*rowh + (rowh-bar)/2
    w = plotw*v/maxv
    color = '#2d81ff' if hl else '#8791a8'
    # square at the baseline, 4px round at the data end
    svg.append(f'<path d="M{left} {y} H{left+w-4} Q{left+w} {y} {left+w} {y+4} V{y+bar-4} Q{left+w} {y+bar} {left+w-4} {y+bar} H{left} Z" fill="{color}"/>')
    svg.append(f'<text x="{left-24}" y="{y+10}" font-family="Manrope" font-weight="700" font-size="22" fill="#000" text-anchor="end">{name}</text>')
    svg.append(f'<text x="{left-24}" y="{y+33}" font-size="16" fill="#888" text-anchor="end">{basis}</text>')
    svg.append(f'<text x="{left+w+12}" y="{y+18}" font-family="Manrope" font-weight="700" font-size="20" fill="{"#0d6eff" if hl else "#333"}">${v}</text>')
svg.append('</svg>')
body = f'<div style="margin-top:48px">{"".join(svg)}</div>'
note = 'Lowest published price on each vendor&rsquo;s pricing page, billed monthly, checked September 2026. Entry plans differ in features and limits. Greenhouse, Lever, Teamtailor, Pinpoint and Recruitee publish no prices.'
html = page(body, 'What an ATS costs a 10-person company with 3 recruiters', 'Monthly price, billed monthly, in US dollars', note)
html = html.replace('<p class="note">', '<p class="note" style="max-width:1150px;line-height:1.5">')
open('ats-monthly-cost-comparison.html','w').write(html)
print('ok')
