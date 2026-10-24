'use client';

import { useEffect, useMemo, useState } from 'react';
import { exampleIds, mapPaths, rankCity, SCENARIOS, type City, type GeoData, type Row } from './model';
import styles from './priority-lines.module.css';

export default function PriorityLines() {
  const [city, setCity] = useState<City>('Brussels');
  const [rows, setRows] = useState<Row[]>([]);
  const [geography, setGeography] = useState<GeoData>({ features: [] });
  const [selection, setSelection] = useState('');
  const [showContext, setShowContext] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('city') === 'Amsterdam') setCity('Amsterdam');
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    Promise.all(['/data/neighbourhood_priority.json', '/data/neighbourhood_priority.geojson'].map(async url => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Data unavailable');
      return response.json();
    })).then(([rawScores, rawGeometry]) => {
      const scores = rawScores as { rows: Row[] };
      const geometry = rawGeometry as GeoData;
      if (!Array.isArray(scores.rows) || !Array.isArray(geometry.features)) throw new Error('Invalid data');
      setRows(scores.rows); setGeography(geometry);
    }).catch(error => { if (error.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, [attempt]);

  const ranked = useMemo(() => rankCity(rows, city), [rows, city]);
  const examples = useMemo(() => exampleIds(ranked, city), [ranked, city]);
  const rankedIds = useMemo(() => new Set(ranked.map(row => row.id)), [ranked]);
  const paths = useMemo(() => mapPaths(geography.features.filter(feature => feature.properties.city === city)), [geography, city]);
  const selected = ranked.find(row => row.id === selection) ?? ranked.find(row => row.id === examples[examples.length - 1]);
  const options = useMemo(() => [...ranked].sort((a, b) => a.neighbourhood_name.localeCompare(b.neighbourhood_name)), [ranked]);
  const count = ranked.length;
  const rankY = (rank: number) => 30 + (rank - 1) / Math.max(1, count - 1) * 500;
  const ticks = [...new Set([1, ...[50, 100, 200, 300, 400, 500].filter(value => value < count), count])];
  const rankXs = [60, 240, 420, 600];
  const excluded = paths.filter(path => !rankedIds.has(path.id)).length;

  useEffect(() => {
    if (!playing || !examples.length) return;
    const interval = window.setInterval(() => {
      setSelection(current => examples[(examples.indexOf(current) + 1) % examples.length]);
    }, 2600);
    return () => window.clearInterval(interval);
  }, [playing, examples]);

  function choose(id: string) { setPlaying(false); setSelection(id); }
  function changeCity(next: City) {
    setPlaying(false); setSelection(''); setCity(next);
    const url = new URL(window.location.href);
    url.searchParams.set('city', next);
    window.history.replaceState(null, '', url);
  }

  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Primary navigation">
        <a href="/">← Spatial Sensitivity Lab</a>
        <div><a href="/rankings">Full rankings</a><a href="/priority-lines" aria-current="page">Priority Lines</a><a href="/methods.html">Methods</a></div>
      </nav>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Cartographic experiment / Brussels &amp; Amsterdam</p>
        <h1>Same city.<br />Different priorities.</h1>
        <p className={styles.intro}>This chart compares the four population-based scenarios. Amsterdam’s income model is available in Full rankings. Choose a neighbourhood and follow its line across these four scenarios. The place stays the same; the importance assigned to each indicator changes.</p>
      </header>
      <div className={styles.how}>
        <p><b>01 · Find a place.</b> Select a name or click a neighbourhood on the map.</p>
        <p><b>02 · Follow its line.</b> Each point is its rank under a different weighting. Rank 1 is the highest priority.</p>
        <p><b>03 · Read the shift.</b> A line rising means higher priority; a line falling means lower priority. Left to right is a scenario comparison, not time.</p>
      </div>
      <section className={styles.controls} aria-label="Explore priority lines">
        <div className={styles.cities} aria-label="City">
          {(['Brussels', 'Amsterdam'] as City[]).map(name => <button key={name} type="button" aria-pressed={city === name} onClick={() => changeCity(name)}>{name}</button>)}
        </div>
        <label className={styles.select}>Neighbourhood
          <select value={selected?.id ?? ''} onChange={event => choose(event.target.value)} disabled={!count}>
            {!count && <option value="">Loading…</option>}
            {options.map(row => <option key={row.id} value={row.id}>{row.neighbourhood_name}</option>)}
          </select>
        </label>
        <button type="button" disabled={!examples.length} aria-pressed={playing} onClick={() => { if (!playing) setSelection(examples[0]); setPlaying(!playing); }}>{playing ? 'Pause examples' : 'Play six examples'}</button>
        <button type="button" disabled={!count} aria-pressed={showContext} onClick={() => setShowContext(!showContext)}>Other lines: {showContext ? 'on' : 'off'}</button>
      </section>
      {error ? <p role="alert" className={styles.status}>The map data could not be loaded. <button type="button" onClick={() => setAttempt(attempt + 1)}>Try again</button></p> : !count ? <p role="status" className={styles.status}>Loading neighbourhood boundaries and scenario scores…</p> : <>
        <section className={styles.visuals} aria-label={`${city} map and scenario ranks`}>
          <div className={styles.mapPanel}>
            <h2>{city} <span>Find a place</span></h2>
            <svg viewBox="0 0 700 650" className={styles.map} role="group" aria-label={`${city} neighbourhood map. Choose a neighbourhood with the selector or on the map.`}>
              <text x="25" y="30" className={styles.mapLabel}>N ↑</text>
              {paths.map(path => {
                const eligible = rankedIds.has(path.id);
                return <path key={path.id} d={path.path} fillRule="evenodd" className={`${styles.area} ${selected?.id === path.id ? styles.chosenArea : ''} ${!eligible ? styles.excluded : ''}`}
                  role={eligible ? 'button' : undefined} tabIndex={eligible ? 0 : undefined} aria-label={`${path.neighbourhood_name}${eligible ? '' : ' — not ranked: insufficient mapped coverage'}`} aria-pressed={eligible ? selected?.id === path.id : undefined}
                  onClick={() => eligible && choose(path.id)} onKeyDown={event => { if (eligible && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); choose(path.id); } }}>
                  <title>{path.neighbourhood_name}{eligible ? '' : ' · not ranked'}</title>
                </path>;
              })}
            </svg>
            <p className={styles.caption}>Real neighbourhood boundaries · {count} ranked{excluded ? ` · ${excluded} unranked in grey` : ''}. Maps are fitted separately; they do not share a scale.</p>
          </div>
          <div className={styles.chartPanel}>
            <h2>Follow the line <span>Within-city rank</span></h2>
            <p className={styles.weightKey}>Weights: sealed surface / green deficit / population (%)</p>
            <div className={styles.chartScroll} tabIndex={0} role="region" aria-label="Scenario rank chart; scroll horizontally on small screens">
              <div className={styles.chartInner}>
                <div className={styles.scenarioLabels}>{SCENARIOS.map(scenario => <div key={scenario.field}><b>{scenario.title}</b><span>{scenario.weights}</span></div>)}</div>
                <svg viewBox="0 0 660 570" role="img" aria-label={selected ? `${selected.neighbourhood_name}: ${selected.ranks.map((rank, index) => `${SCENARIOS[index].title}, rank ${rank}`).join('; ')}` : 'Scenario rankings'}>
                  {ticks.map(rank => <g key={rank}><line x1="45" x2="620" y1={rankY(rank)} y2={rankY(rank)} className={styles.guide} /><text x="30" y={rankY(rank) + 4} textAnchor="end" className={styles.tick}>{rank}</text></g>)}
                  {showContext && ranked.filter(row => row.id !== selected?.id).map(row => <path key={row.id} d={row.ranks.map((rank, index) => `${index ? 'L' : 'M'}${rankXs[index]},${rankY(rank)}`).join('')} className={styles.backgroundLine} />)}
                  {selected && <g>{<path d={selected.ranks.map((rank, index) => `${index ? 'L' : 'M'}${rankXs[index]},${rankY(rank)}`).join('')} className={styles.selectedLine} />}{selected.ranks.map((rank, index) => <g key={index}><circle cx={rankXs[index]} cy={rankY(rank)} r="5" className={styles.point} /><text x={rankXs[index]} y={rankY(rank) - 12} textAnchor="middle" className={styles.rankLabel}>#{rank}</text></g>)}</g>}
                </svg>
              </div>
            </div>
            <p className={styles.caption}>The red line follows the red neighbourhood. Faint lines are the other {city} neighbourhoods.</p>
          </div>
        </section>
        {selected && <section className={styles.detail} aria-label="Selected neighbourhood details" aria-live="polite">
          <div><p className={styles.eyebrow}>Selected neighbourhood</p><h2>{selected.neighbourhood_name}</h2><p>Rank range <b>#{Math.min(...selected.ranks)}–#{Math.max(...selected.ranks)}</b>: {selected.span} places apart across these scenarios.</p></div>
          <dl className={styles.scores}>{SCENARIOS.map((scenario, index) => <div key={scenario.field}><dt>{scenario.title}</dt><dd>#{selected.ranks[index]}<span>Score {selected[scenario.field].toFixed(1)}</span></dd></div>)}</dl>
        </section>}
        <div className={styles.examples}><span>Six examples:</span>{examples.map(id => { const row = ranked.find(row => row.id === id); return row && <button key={id} type="button" aria-pressed={selected?.id === id} onClick={() => choose(id)}>{row.neighbourhood_name}</button>; })}</div>
        <p className={styles.caption}>{city === 'Brussels' ? 'The Brussels examples reproduce the first experiment and illustrate different directions of movement.' : 'Amsterdam examples: the highest-ranked neighbourhood under balanced weighting, plus five with the largest rank spans across the four scenarios.'} Examples are illustrative, not a representative sample.</p>
      </>}
      <footer className={styles.footer}>
        <h2>What this experiment shows</h2>
        <p>These lines expose the effect of weighting choices. They do not show changes over time, actual municipal decisions, or a comparison of city performance. The four existing scenarios use sealed surfaces, green deficit and population. Age 65+ and one-person households are not included in this experiment.</p>
        <p>Neighbourhood scores are overlap-area-weighted means of eligible 500 m cell scores. Each city is ranked separately; equal scores share a rank. Boundaries and scores are loaded from the same datasets as the full rankings, so this page does not maintain a separate copy.</p>
        <div><a href="/rankings">Inspect the full ranking →</a><a href="/methods.html">Methods and sources →</a></div>
      </footer>
    </main>
  );
}
