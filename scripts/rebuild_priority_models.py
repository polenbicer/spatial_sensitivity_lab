"""Rebuild each city at native neighbourhood scale with its documented income definition."""
from build_amsterdam_wijken import main as amsterdam
from build_brussels_neighbourhoods import main as brussels
if __name__ == '__main__':
    amsterdam()
    brussels()
    import runpy
    runpy.run_path(str(__import__("pathlib").Path(__file__).with_name("apply_brussels_public_green.py")))
