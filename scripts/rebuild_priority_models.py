"""Rebuild each city at native neighbourhood scale with its documented income definition."""
from build_amsterdam_neighbourhoods import main as amsterdam
from build_brussels_neighbourhoods import main as brussels
if __name__ == '__main__':
    amsterdam()
    brussels()
