import type { Decision, Neighbourhood } from './model';

export type Pool = 'duchesse-funded' | 'louise-funded' | 'marolles-funded' | 'duchesse-waiting' | 'louise-waiting' | 'marolles-waiting' | 'split' | 'concentrated' | 'all-funded' | 'civic';
export type Mood = 'cheer' | 'side-eye' | 'banter';
export type Comment = { id: string; text: string; handle: string; neighbourhood: string; pool: Pool; mood: Mood };
const scripts: Record<Pool, [Mood, string][]> = {
  'duchesse-funded': [
    ['cheer', 'Duchesse got the funding?? Refreshing in case this is a clerical error.'],
    ['banter', 'The pavement has been preheating since breakfast. Good call, chef.'],
    ['cheer', 'Highest surface temperature AND low income. The spreadsheet finally read the room.'],
    ['side-eye', 'Love the announcement. Please do not spend half the budget on the announcement.'],
    ['banter', 'Our street was giving air fryer. This is a promising plot twist.'],
    ['cheer', 'Actual money for Duchesse. Not a consultation about the possibility of money. We move.'],
    ['side-eye', 'Respectfully, a funding allocation is not shade. See you at the construction site.'],
    ['banter', 'Duchesse enters its slightly-less-cooked era. Pending implementation, obviously.'],
    ['cheer', 'Heat and income pointing to the same place? Rare spreadsheet W.'],
    ['side-eye', 'Okay mayor, decent start. I have temporarily lowered my eyebrow.'],
  ],
  'louise-funded': [
    ['cheer', 'Public green space at 0.2%. Even my phone battery has more coverage. Thank you.'],
    ['side-eye', 'A Louise investment? The press conference better explain the trade-offs.'],
    ['cheer', 'Finally, a budget line that has met our public-green deficit.'],
    ['banter', 'Louise getting green funding. The one imaginary tree in my head is emotional.'],
    ['side-eye', 'Low public green does not automatically mean greatest need overall. Just putting that in the group chat.'],
    ['banter', 'Please plant trees, not a giant sign saying FUTURE TREES.'],
    ['cheer', 'You saw the green deficit and did something. Honestly? Refreshing behaviour.'],
    ['side-eye', 'This choice has a rationale. It also has critics. Welcome to having a budget.'],
    ['cheer', 'Less ribbon, more roots. But yes, I am happy about the investment.'],
    ['banter', 'The public-green inventory said almost nothing. The budget said hold my watering can.'],
  ],
  'marolles-funded': [
    ['cheer', 'Marolles got funded. I would like to thank everyone who remembered income exists.'],
    ['side-eye', 'Please ask where people actually cool down before ordering fifty identical benches.'],
    ['banter', 'A park on a spreadsheet is not automatically a cool place to sit. My favourite plot twist.'],
    ['cheer', 'Our median income is almost as low as Duchesse’s. Glad that did not get lost in the colours.'],
    ['banter', 'Marolles funding arc unlocked. The neighbourhood group chat is briefly unbearable in a good way.'],
    ['side-eye', 'Funding secured. Now comes the boss level: making the project useful.'],
    ['cheer', 'Not the highest temperature, still a serious claim. Thank you for having more than one thought.'],
    ['side-eye', 'Do we get a say in the design or just a newsletter with a smiling mayor?'],
    ['cheer', 'Income in the conversation, money on the table. Solid start.'],
    ['banter', 'Someone tell the budget it has arrived in Marolles. We were starting to think it was a myth.'],
  ],
  'duchesse-waiting': [
    ['side-eye', 'Duchesse still waiting with the highest surface temperature. Be so for real.'],
    ['banter', 'Our pavement is apparently doing a free trial of the sun.'],
    ['side-eye', 'We brought heat AND low income to the meeting. Was there a dress code we missed?'],
    ['banter', 'Duchesse has left the chat. Too hot to hold the phone.'],
    ['side-eye', 'A very elegant allocation. Our very inelegant pavement would like a word.'],
    ['cheer', 'I get that other places need investment too. Please keep Duchesse in the next round.'],
    ['side-eye', 'Being a top score and a low budget line is a wild combination.'],
    ['banter', 'The funding will arrive by tram, apparently. That explains the suspense.'],
    ['side-eye', 'Mayor, blink twice if you have actually looked at our three indicators.'],
    ['cheer', 'Not calling it a disaster yet. There is still a next decision.'],
  ],
  'louise-waiting': [
    ['side-eye', 'Louise still has 0.2% public green. Our claim did not vanish when you clicked elsewhere.'],
    ['banter', 'Would a houseplant in the council chamber count as our allocation? Asking for a neighbourhood.'],
    ['side-eye', 'I see the heat argument. I would also like to see a public tree.'],
    ['banter', 'Our green-space strategy is currently imagining a park really hard.'],
    ['cheer', 'Duchesse has a strong case. We can recognise that and still ask what happens here next.'],
    ['side-eye', 'The green-deficit bar is doing a full gymnastics routine to get your attention.'],
    ['banter', 'Louise has been put on the waiting list for photosynthesis.'],
    ['side-eye', 'Not all green is public green, bestie. The indicator is making a specific point.'],
    ['cheer', 'Fair enough for this round. Please do not confuse waiting with not needing anything.'],
    ['banter', 'Our funding application has been converted into a tasteful PDF. Nature is healing elsewhere.'],
  ],
  'marolles-waiting': [
    ['side-eye', 'Marolles income score: 96. Funding vibes: loading.'],
    ['banter', 'The budget passed us like a tram with NOT IN SERVICE on the front.'],
    ['side-eye', 'More public green on paper does not mean every hot day is sorted.'],
    ['cheer', 'I can see why you funded the other place. I would still like an explanation for this one.'],
    ['banter', 'We have been allocated a generous amount of further consideration.'],
    ['side-eye', 'Lower temperature is not the same as no cooling need. Tiny distinction, huge consequences.'],
    ['banter', 'Our neighbourhood has entered its apparently-you-can-wait era.'],
    ['side-eye', 'Please do not make lower-income residents win a PowerPoint competition for attention.'],
    ['cheer', 'Other neighbourhoods have real needs too. Keep us in the conversation, though.'],
    ['banter', 'Marolles would like to subscribe to the premium version of being considered.'],
  ],
  split: [
    ['cheer', 'A split allocation. More neighbourhoods get actual money instead of a polite email.'],
    ['banter', 'You have split the budget. The group chat has split into factions. Beautiful symmetry.'],
    ['side-eye', 'Equal slices, different needs. The cake metaphor is doing a lot of work here.'],
    ['banter', 'Diplomacy unlocked. Universal gratitude remains unavailable.'],
    ['cheer', 'A bit for both waiting places? I can work with that.'],
    ['side-eye', 'Sharing the money is a decision too. It does not come with a free neutrality certificate.'],
    ['banter', 'Everyone got a slice and immediately checked the size of the other slice.'],
    ['cheer', 'At least this spreads public investment beyond the first winner.'],
    ['side-eye', 'Nice compromise. Now tell us whether the smaller packages are actually useful.'],
    ['banter', 'The mayor has discovered the municipal equivalent of splitting the restaurant bill.'],
  ],
  concentrated: [
    ['side-eye', 'Another investment in a place already funded. The waiting room has noticed.'],
    ['cheer', 'Building on the first investment could make sense. Please explain why it beats starting elsewhere.'],
    ['banter', 'One neighbourhood is getting the deluxe edition. Others are watching the trailer.'],
    ['side-eye', 'Deep investment or tunnel vision? Same budget, very different headline.'],
    ['banter', 'Mayor picked a main character and committed to the season finale.'],
    ['cheer', 'Concentrating money is not automatically wrong. Quietly pretending nobody loses out would be.'],
    ['side-eye', 'The unfunded neighbourhood would like to know when its character development begins.'],
    ['banter', 'The ribbon-cutting photographer is saving on travel.'],
    ['cheer', 'A bigger package might be useful. We still need a reason for the distribution.'],
    ['side-eye', 'This plan has focus. So does a torch pointed at exactly one person.'],
  ],
  'all-funded': [
    ['cheer', 'All three neighbourhoods got something. A low bar, cleared with style.'],
    ['banter', 'Nobody got zero. The group chat is struggling to process this development.'],
    ['side-eye', 'All funded does not mean all needs met. Please leave room for that in the victory speech.'],
    ['cheer', 'A city budget reaching more than one postcode. We love to see it.'],
    ['banter', 'Three neighbourhoods, three budget lines, thirty-seven opinions.'],
    ['side-eye', 'Before the confetti: who got the smallest share, and why?'],
    ['cheer', 'I like that nobody is completely left out. Now show us what the money can do.'],
    ['banter', 'The mayor has successfully made everyone partly happy. Extremely Brussels.'],
    ['side-eye', 'A balanced-looking chart can still hide a difficult choice. Zoom in.'],
    ['banter', 'We can all complain about implementation together now. Community building.'],
  ],
  civic: [
    ['banter', 'The spreadsheet has entered politics and immediately needs a lie-down.'],
    ['side-eye', 'Can we get the explanation in normal English, not procurement-flavoured fog?'],
    ['cheer', 'Three indicators on screen, actual choices to argue about. Better than a mystery score.'],
    ['banter', 'Somewhere a consultant is preparing a 94-slide deck called Shade: A Journey.'],
    ['banter', 'This meeting could have been a tree.'],
    ['side-eye', 'Those are surface temperatures, not today’s weather forecast. Please stop yelling at the wrong number.'],
    ['cheer', 'I disagree with the choice, but at least I can see what we are disagreeing about.'],
    ['banter', 'Big day for people who say we need to have a conversation and then actually have one.'],
    ['side-eye', 'Do not let a colourful bar chart do your public justification for you.'],
    ['banter', 'The budget is fictional. My opinions are somehow already very real.'],
  ],
};
const handles = ['ShadePlease', 'TramStopPhilosopher', 'MunicipalSideEye', 'NoMorePDFs', 'BenchEnjoyer', 'ActuallyReadTheReport', 'LocalOverthinker', 'PavementReviewer', 'TreeWhen', 'NeighbourhoodLurker'];
const home: Partial<Record<Pool, string>> = { 'duchesse-funded':'Duchesse', 'duchesse-waiting':'Duchesse', 'louise-funded':'Louise–Longue Haie', 'louise-waiting':'Louise–Longue Haie', 'marolles-funded':'Marolles', 'marolles-waiting':'Marolles' };
export const COMMENT_BANK: Comment[] = Object.entries(scripts).flatMap(([pool, entries], p) => entries.map(([mood,text], i) => ({id:`comment-${p * 10 + i + 1}`, text, mood, pool:pool as Pool, handle:`${handles[i]}_${pool.startsWith('duchesse')?'D':pool.startsWith('louise')?'L':pool.startsWith('marolles')?'M':'BRU'}`, neighbourhood:home[pool as Pool] || 'Brussels'})));
export type ReactionBatch = { turn: number; title: string; comments: Comment[] };
const placeKeys = ['duchesse', 'louise', 'marolles'];
function hash(value: string) { let n = 2166136261; for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
export function reactionsFor(decisions: Decision[], areas: Neighbourhood[], seed: number): ReactionBatch[] {
  const used = new Set<string>();
  const running = [0,0,0];
  return decisions.map((decision, turn) => {
    const comments: Comment[] = [];
    function pick(pool: Pool, mood?: Mood) {
      const candidates = COMMENT_BANK.filter(c => c.pool === pool && !used.has(c.id) && (!mood || c.mood === mood));
      candidates.sort((a,b) => hash(`${seed}-${turn}-${a.id}`) - hash(`${seed}-${turn}-${b.id}`));
      const c = candidates[0]; if (c) { comments.push(c); used.add(c.id); }
    }
    const funded = decision.amounts.map((v,i) => v > 0 ? i : -1).filter(i => i >= 0);
    const waiting = [0,1,2].filter(i => !funded.includes(i) && running[i] === 0);
    // Always include both a supportive and a critical voice tied to the actual decision.
    pick(`${placeKeys[funded[0]]}-funded` as Pool, 'cheer');
    if (waiting.length) pick(`${placeKeys[waiting[turn % waiting.length]]}-waiting` as Pool, 'side-eye');
    else pick('all-funded','side-eye');
    for (const i of funded.slice(1)) pick(`${placeKeys[i]}-funded` as Pool);
    if (funded.length > 1) pick('split');
    else if (running[funded[0]] > 0) pick('concentrated');
    else pick(`${placeKeys[funded[0]]}-funded` as Pool);
    for (const i of waiting) if (comments.length < 5) pick(`${placeKeys[i]}-waiting` as Pool);
    decision.amounts.forEach((v,i) => running[i] += v);
    if (turn === 2 && running.every(v=>v > 0)) pick('all-funded');
    pick('civic','banter');
    if (comments.length < 7) pick('civic');
    const title = decision.amounts.map((v,i)=>v>0?`${areas[i].name} +€${Number(v.toFixed(1))}m`:null).filter(Boolean).join(' / ');
    return {turn:turn+1,title,comments};
  });
}
