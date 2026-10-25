"""Fetch versioned open source snapshots; the existing project LST composite is separate."""
from pathlib import Path
import urllib.request
from build_amsterdam_neighbourhoods import URLS
root=Path(__file__).resolve().parents[1]/'data/source/amsterdam_neighbourhood'
root.mkdir(parents=True,exist_ok=True)
for filename,key in [('income_2024.json','income'),('income_indicator.json','definition'),('boundaries_2022.geojson','boundaries'),('worldcover_2021.tif','worldcover')]:
    destination=root/filename
    with urllib.request.urlopen(URLS[key],timeout=60) as response,destination.open('wb') as output:
        while data:=response.read(1024*1024):output.write(data)
    print(filename,destination.stat().st_size)
print('Also place the supplied ams_bru_landsat_lst_2019_2023_jja.tif at landsat_lst_2019_2023_jja.tif in this directory.')
