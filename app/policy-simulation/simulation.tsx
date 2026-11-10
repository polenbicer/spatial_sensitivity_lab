'use client';
import { useEffect, useRef, useState } from 'react';
import { mayorProfile, money, totals, type Decision, type Neighbourhood } from './model';
import styles from './simulation.module.css';
import ResidentChat from './resident-chat';

const labels = ['Surface temperature', 'Green deficit', 'Lower median income'];
const stories = [
  'The highest surface temperature of these three neighbourhoods — alongside low median income and very little public green space.',
  'The least public green space of these three neighbourhoods. Its temperature and lower-income scores are lower than Duchesse’s.',
  'Median income is almost as low as Duchesse’s. Its surface temperature is lower and its public-green share is higher.',
];
export default function PolicySimulation({ neighbourhoods: areas }: { neighbourhoods: Neighbourhood[] }) {
  const [started, setStarted] = useState(false);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeed, setChatSeed] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const funding = totals(decisions);
  const step = decisions.length;
  const finished = step === 3;
  useEffect(() => {
    if (started) { heading.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  }, [step, started]);
  const remaining = 100 - funding.reduce((a, b) => a + b, 0);
  const first = decisions.length ? decisions[0].amounts.indexOf(50) : 0;
  const others = [0, 1, 2].filter(i => i !== first);
  const allocate = (index: number, amount: number) => [0, 1, 2].map(i => i === index ? amount : 0);
  const options: Decision[] = step === 0
    ? areas.map((n, i) => ({ title: `Fund ${n.name}`, amounts: allocate(i, 50) }))
    : step === 1
      ? [...others.map(i => ({ title: `Fund ${areas[i].name}`, amounts: allocate(i, 30) })), { title: 'Split between both waiting neighbourhoods', amounts: [0, 1, 2].map(i => i === first ? 0 : 15) }]
      : [...areas.map((n, i) => ({ title: `Invest the final €20m in ${n.name}`, amounts: allocate(i, 20) })), { title: 'Share the final €20m equally', amounts: [20 / 3, 20 / 3, 20 / 3] }];
  const pending = selected === null ? null : options[selected];
  const shown = pending ? funding.map((v, i) => v + pending.amounts[i]) : funding;
  const profile = mayorProfile(areas, funding);
  const least = funding.indexOf(Math.min(...funding));
  const most = funding.indexOf(Math.max(...funding));
  function confirm() {
    if (pending === null) return;
    setDecisions([...decisions, pending]); setSelected(null); setChatOpen(true);
    heading.current?.focus();
  }
  function restart() { setDecisions([]); setSelected(null); setStarted(false); setChatOpen(false); heading.current?.focus(); }
  return <main className={`${styles.page} ${started && !finished ? styles.playing : ""} ${chatOpen && decisions.length ? styles.chatDocked : ""}`}>
    <header className={styles.header}><a href="/">SPATIAL SENSITIVITY LAB</a><span>[BRU] POLICY SIMULATION</span><a href="/#explore">Back to the lab ↗</a></header>
    <section className={styles.banner}>
      <div><p className={styles.label}>Brussels-Capital Region · Three neighbourhoods · Three decisions</p><h1 ref={heading} tabIndex={-1}>{finished ? 'Your budget. Your priorities.' : started ? ['Make your first investment.', 'Who is still waiting?', 'Spend your final €20m.'][step] : 'You’re the mayor.\nWho gets cooled?'}</h1>
      <p className={styles.intro}>{finished ? 'The money is allocated. Here is what your choices say about your priorities.' : !started ? 'You have €100 million for urban cooling. Three neighbourhoods have different needs. Decide where the money goes.' : step === 0 ? 'Choose one neighbourhood for a €50m cooling package. Compare all three indicators before deciding.' : step === 1 ? `${areas[first].name} received €50m. The other two neighbourhoods are still waiting. Allocate the next €30m.` : 'Strengthen an earlier investment, support the least-funded neighbourhood, or share what remains.'}</p></div>
      <aside className={styles.budget} aria-live="polite"><span className={styles.label}>{finished ? 'Total allocated' : 'Budget remaining'}</span><strong>{finished ? '€100m' : money(remaining)}</strong><div className={styles.budgetTrack}><i style={{ width: `${finished ? 100 : remaining}%` }} /></div><span>{finished ? 'Three decisions completed' : !started ? 'Fictional investment fund' : `Decision ${step + 1} / 3 · ${[50,30,20][step]}m to allocate`}</span></aside>
    </section>
    {!started && <div className={styles.start}><button className={styles.primary} onClick={() => {setStarted(true); setChatSeed(Math.floor(Math.random() * 1000000)); heading.current?.focus();}}>Begin your term <span>↘</span></button><p>About 2 minutes. Real indicators. Fictional budgets. The neighbourhood group chat is watching.</p></div>}
    {started && <ol className={styles.progress} aria-label="Simulation progress">{['First investment · €50m', 'Respond to unmet needs · €30m', 'Final allocation · €20m'].map((text, i) => <li key={text} aria-current={!finished && step === i ? 'step' : undefined} className={i < step ? styles.complete : step === i ? styles.current : ''}><b>{i < step ? '✓' : `0${i + 1}`}</b>{text}</li>)}</ol>}
    {finished && <section className={styles.result} aria-labelledby="mayor-title"><div><p className={styles.label}>Your simulated mayor profile</p><h2 id="mayor-title">{profile.title}</h2><p>{profile.text}</p><p className={styles.resultNote}>A description of your funding choices, not a score of fairness or a political identity.</p></div><div className={styles.resultSummary}><p className={styles.label}>What your plan leaves open</p><p>{areas[most].name} receives {money(funding[most])}. {areas[least].name} receives {money(funding[least])}.</p><p>{funding[least] === 0 ? 'One neighbourhood receives no funding despite having documented needs.' : 'All three receive funding, but this does not tell us whether their needs are met.'}</p><strong>How would you justify this distribution to the residents?</strong></div></section>}
    <section className={styles.evidence} aria-labelledby="evidence-title"><div className={styles.sectionHeading}><h2 id="evidence-title">{finished ? 'Your investment plan' : 'Three places. Different claims.'}</h2><span>Indicator scores · 0–100 within Brussels · Higher = greater modelled need</span></div>
      <div className={styles.cards}>{areas.map((n, i) => <article key={n.id} className={styles.card}>
        <div className={styles.cardTop}><span className={styles.label}>[BRU] / 0{i + 1}</span><span className={styles.allocation}>{money(shown[i])}<small>{pending && shown[i] !== funding[i] ? 'if confirmed' : 'allocated'}</small></span></div>
        <h3>{n.name}</h3><p className={styles.story}>{stories[i]}</p>
        <div className={styles.metrics}>{labels.map((label, k) => <div key={label}><div><span>{label}</span><b>{Math.round(n.scores[k])}<small>/100</small></b></div><div className={styles.track}><i style={{width:`${n.scores[k]}%`}} /></div></div>)}</div>
        <details className={styles.sourceValues}><summary>View source values</summary><dl className={styles.raw}><div><dt>Summer surface temperature</dt><dd>{n.temperature.toFixed(1)} °C</dd></div><div><dt>Public-green area share</dt><dd>{n.green.toFixed(1)}%</dd></div><div><dt>Median annual income</dt><dd>€{Math.round(n.income).toLocaleString('en-GB')}</dd></div></dl></details>
        <div className={styles.fundingTrack} aria-label={`${n.name}: ${money(shown[i])} allocated`}><i style={{ width: `${shown[i]}%` }} /></div>
      </article>)}</div>
    </section>
    {started && !finished && <section className={styles.decision} aria-labelledby="decision-title"><div className={styles.sectionHeading}><h2 id="decision-title">{step === 0 ? 'Where will you start?' : step === 1 ? 'Respond to the waiting neighbourhoods.' : 'Your last decision.'}</h2><span>Select a plan, then confirm.</span></div><div className={styles.options}>{options.map((option, i) => <button key={`${step}-${i}`} aria-pressed={selected === i} onClick={() => setSelected(i)} className={selected === i ? styles.selected : ''}><span className={styles.label}>[0{i + 1}] {selected === i ? 'SELECTED' : 'OPTION'}</span><strong>{option.title}</strong><span>{option.amounts.map((v, j) => v > 0 ? `${areas[j].name}: ${money(v)}` : null).filter(Boolean).join(' · ')}</span></button>)}</div><div className={styles.confirm}><p role="status">{pending ? `This decision allocates ${money([50,30,20][step])}. ${money(remaining - [50,30,20][step])} will remain.` : 'No decision confirmed yet. Compare the three claims above.'}</p><button className={styles.primary} disabled={selected === null} onClick={confirm}>{step === 2 ? 'See your mayor profile' : 'Confirm investment'} <span>↘</span></button></div>{step > 0 && <button className={styles.textButton} onClick={() => {setDecisions(decisions.slice(0,-1)); setSelected(null);}}>← Revisit previous decision</button>}</section>}
    {finished && <section className={styles.after}><details><summary>How was my profile calculated?</summary><p>An even distribution (a funding spread of no more than €30m) gives the Balancing Mayor profile. Otherwise, we compare the three budget-weighted indicator scores against an equal split across these same neighbourhoods. The largest positive difference determines the profile. This is a game rule, not an estimate of cooling benefits, a recovered weighting, or a comparison with every Brussels neighbourhood.</p></details><div><button className={styles.primary} onClick={restart}>Try another term ↺</button><a href="/#explore">Explore the full Brussels model ↗</a></div><details><summary>Your decision record</summary><ol>{decisions.map((d,i) => <li key={i}>{d.title} — {d.amounts.map((v,j) => v > 0 ? `${areas[j].name}: ${money(v)}` : null).filter(Boolean).join(' · ')}</li>)}</ol></details></section>}
    <footer className={styles.footer}><p className={styles.label}>Real indicators / Fictional allocation</p><p>Three illustrative neighbourhoods, not a citywide shortlist. €100m and the €50m / €30m / €20m packages are game assumptions, not municipal budgets or cost estimates. Funding does not change the observed indicators or predict cooling effects.</p><details><summary>Data, dates & limitations</summary><p>Surface temperature: Landsat summer composite, 2019–2023; surface temperature is not air temperature. Public green: Bruxelles Environnement public inventory, downloaded 26 October 2026; reference year unverified. It does not measure all vegetation or access to shade. Income: IBSA/Statbel median equivalised after-tax income, 2023; neighbourhood medians do not describe every resident. Scores are the Lab’s existing within-city scores across eligible Brussels neighbourhoods.</p><a href="/#method">Read the Lab’s methods & sources ↗</a></details></footer>
    <ResidentChat decisions={decisions} areas={areas} seed={chatSeed} open={chatOpen} onOpen={() => setChatOpen(true)} onClose={() => setChatOpen(false)} />
  </main>;
}
