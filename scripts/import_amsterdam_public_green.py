from pathlib import Path
import openpyxl,json,hashlib
import argparse
root=Path(__file__).resolve().parents[1];src=root/'data/source/amsterdam_wijk'
parser=argparse.ArgumentParser();parser.add_argument('xlsx',type=Path);args=parser.parse_args()
p=args.xlsx
s=openpyxl.load_workbook(p,read_only=True,data_only=True).active
it=s.values;h=next(it);out={}
for x in it:
 if x[2]=='Wijk' and str(x[3])=='20250101' and x[6] in ['ORLAND','ORPUBGROEN','ORPUBGROEN_P']:
  assert str(x[4])=='20220324'
  out.setdefault(x[0],{'name':x[1]})[x[6]]=x[7]
assert len(out)==110
for c,r in out.items():
 assert 0<=r['ORPUBGROEN_P']<=1
 assert abs(r['ORPUBGROEN']/r['ORLAND']-r['ORPUBGROEN_P'])<1e-10
payload={'source':'https://onderzoek.amsterdam.nl/dataset/groen-in-amsterdam','snapshot':'2025-01-01','boundary_date':'2022-03-24','source_file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'unit':'ORPUBGROEN_P is a fraction; multiply by 100 for percent','rows':out}
(src/'public_green_2025.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2))
