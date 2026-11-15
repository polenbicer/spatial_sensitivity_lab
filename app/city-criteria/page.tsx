import data from '../../public/data/city_criteria.json';
import styles from './city-criteria.module.css';

export const metadata = {
  title: 'City criteria | Spatial Sensitivity Lab',
  description: 'Do the criteria Brussels and Amsterdam use single out the neighbourhoods they prioritise?',
};

const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)}%`);
const VERDICT: Record<string, string> = { consistent: 'Consistent', inconsistent: 'Inconsistent', undetermined: 'Undetermined', 'not in universe': 'Not in this set' };
const UNIVERSE: Record<string, string> = { any_part: 'Areas partly or wholly in the City of Brussels', wholly: 'Areas wholly in the City of Brussels' };
const GREEN: Record<string, string> = { access_2012: 'access to public green (IBSA, 2012)', deficit_current: 'public-green deficit (prototype)' };
const FIELD: Record<string, string> = {
  priority_balanced: 'Equal weighting', priority_heat_led: 'Surface temperature first', priority_nature_deficit_led: 'Green deficit first',
  priority_income_led: 'Lower median income first', score_surface_temperature: 'Surface temperature only', score_green_deficit: 'Green deficit only',
  score_income_deprivation: 'Lower median income only',
};
const CATEGORY: Record<string, string> = { climate: 'Climate (perceived temperature)', exposure: 'Exposure', sensitivity: 'Sensitivity', adaptive_capacity: 'Adaptive capacity' };

export default function CityCriteria() {
  const b = data.brussels, a = data.amsterdam;
  return (
    <main className={styles.page}>
      <header className={styles.header}><a href="/">SPATIAL SENSITIVITY LAB</a><span>[06] CITY CRITERIA</span><a href="/methods.html">Methods ↗</a></header>
      <section className={styles.intro}>
        <p className={styles.eyebrow}>Research demonstrator · v{data.version} · {data.built}</p>
        <h1>Do the cities’ own criteria explain their priorities?</h1>
        <p>The main lab varies weights on three indicators chosen by the researcher. This page uses the criteria each city states. In Brussels it asks whether the five criteria the City declared single out the neighbourhoods it called vulnerable. In Amsterdam it reconstructs the municipal heat-risk map and compares it with the lab’s rankings. Neither result shows how either city actually decided.</p>
      </section>

      <section className={styles.block}>
        <p className={styles.eyebrow}>Brussels · City of Brussels heat-island study</p>
        <h2>Five declared criteria, unknown weights</h2>
        <p>The City’s 2024 council file lists temperature, population density, age, income and access to green, and names Nord, Laeken, Neder-over-Hembeek and the Pentagone as particularly vulnerable. It does not publish how the criteria were combined. The test below was fixed before the results were seen: every weight between 10% and 40% in 5-point steps, summing to 100% ({b.variants[0].combinations} combinations); an area counts as standing out when it is in the top quartile; the listing is <b>consistent</b> if the area stands out in at least three quarters of combinations, <b>inconsistent</b> if in fewer than one quarter.</p>
        <p className={styles.note}>Sources: {Object.values(b.sources).map(s => `${s.title} (${s.year})`).join('; ')}; surface temperature and income as in the main lab. Monitoring neighbourhoods are coarser than the statistical sectors the City used, so this tests the criteria at a different scale.</p>
        {b.variants.map(v => (
          <div className={styles.variant} key={v.universe + v.green}>
            <h3>{UNIVERSE[v.universe]} · {GREEN[v.green]} <small>{v.n_areas} areas · top quartile = {v.top_quartile_size}</small></h3>
            <table>
              <thead><tr><th>Listed as vulnerable</th><th>Monitoring area</th><th>Top-quartile share</th><th>Result</th></tr></thead>
              <tbody>{v.listed.map(l => (
                <tr key={l.code} className={styles[l.verdict.replace(/ /g, '_')]}>
                  <td>{l.quartier}</td><td>{l.name ?? `Area ${l.code}`}</td><td>{pct(l.share)}</td><td>{VERDICT[l.verdict]}</td>
                </tr>))}
              </tbody>
            </table>
            <p className={styles.note}>Not listed but most often in the top quartile: {v.not_listed_most_often_top.filter(x => x.share > 0).map(x => `${x.name} (${pct(x.share)})`).join(', ') || 'none'}.</p>
          </div>
        ))}
        <aside className={styles.reading}><b>Reading.</b> Across all four variants, Marolles, Stalingrad, Anneessens and Vieux Laeken Ouest stand out under almost any weighting. Heembeek (Neder-over-Hembeek) never does, and parts of the Pentagone (Sablon, Quartier Royal, Notre-Dame-aux-Neiges) rarely do. The declared criteria therefore explain part of the City’s list, not all of it. What else shaped the list is a question for the City, not a finding about it.</aside>
      </section>

      <section className={styles.block}>
        <p className={styles.eyebrow}>Amsterdam · municipal heat-risk map (hitterisicokaart)</p>
        <h2>Equal averaging across four categories</h2>
        <p>The municipal map scores {a.buurten} buurten from 1 to 5. Using its published layer, the total is reproduced as the plain mean of four categories, each the plain mean of its indicator scores (largest difference {a.reconstruction_max_error}). Equal averaging is itself a weighting: each indicator’s implicit weight depends on how many indicators share its category.</p>
        <table>
          <thead><tr><th>Category (25% each)</th><th>Indicators</th><th>Implicit weight per indicator</th></tr></thead>
          <tbody>{Object.entries(a.categories).map(([cat, fields]) => (
            <tr key={cat}><td>{CATEGORY[cat]}</td><td>{fields.length}</td><td>{pct(a.implicit_indicator_weights[fields[0] as keyof typeof a.implicit_indicator_weights])}</td></tr>))}
          </tbody>
        </table>
        <p className={styles.note}>Perceived temperature alone carries 25%; each of the six sensitivity indicators (including 65+, long-term illness and income below the social minimum) carries about 4%.</p>
        <h3>How close is the lab to the municipal map? <small>{a.wijken_compared} wijken · all {a.buurten_joined} buurten joined spatially</small></h3>
        <table>
          <thead><tr><th>Lab ranking</th><th>Rank correlation with municipal heat risk</th></tr></thead>
          <tbody>{Object.entries(a.spearman_with_prototype).map(([f, r]) => <tr key={f}><td>{FIELD[f]}</td><td>{r.toFixed(2)}</td></tr>)}</tbody>
        </table>
        <p className={styles.note}>Each buurt’s residents are allocated to the lab’s wijken in proportion to the share of the buurt’s area in each wijk ({a.buurten_in_single_wijk} of {a.buurten_joined} buurten lie in a single wijk). Assigning each buurt wholly to its largest wijk gives the same correlations; the earlier match by buurt name ({a.robustness.name.buurten_used} buurten) gave equal weighting {a.robustness.name.spearman_with_prototype.priority_balanced.toFixed(2)}.</p>
        <aside className={styles.reading}><b>Reading.</b> The lab’s equal weighting agrees only weakly with the municipal map. Surface temperature from satellites barely tracks the municipality’s perceived-temperature indicator, while lower income comes closest. Choosing indicators changes which places appear first, before any weight is set.</aside>
      </section>
      <footer className={styles.footer}>Research demonstrator · not an allocation system · <a href="/data/city_criteria.json">Download the results (JSON)</a></footer>
    </main>
  );
}
