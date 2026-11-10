import type { Decision, Neighbourhood } from './model';

export type Pool = 'duchesse-funded' | 'louise-funded' | 'marolles-funded' | 'duchesse-waiting' | 'louise-waiting' | 'marolles-waiting' | 'split' | 'concentrated' | 'all-funded' | 'civic';
export type Mood = 'cheer' | 'side-eye' | 'banter';
export type Comment = { id: string; text: string; handle: string; neighbourhood: string; pool: Pool; mood: Mood };
const scripts: Record<Pool, [Mood, string][]> = {
  'duchesse-funded': [
    ["cheer", "DUCHESSE GOT MONEY?? 😭💸 Nobody touch anything. This might be a clerical error."],
    ["banter", "The pavement has been preheating since breakfast 🥵🍳 Good call, chef. Finally cooking the budget instead of us."],
    ["cheer", "Heat AND low income? The spreadsheet read the room before the council did 💅📊 Rare municipal W."],
    ["side-eye", "Love the announcement 🥰 Now please do not spend half the money announcing the announcement 🎤📸🤡"],
    ["banter", "Our street was giving air fryer 🥵🍟 This plot twist has my full attention 👀"],
    ["cheer", "Actual MONEY for Duchesse?? 💸🥹 Not a workshop about a roadmap towards possibly discussing money? WE MOVE 🕺"],
    ["side-eye", "Respectfully, mayor: a budget line is not shade 🤨🌳 Put the scissors down and call the builders ✂️📸"],
    ["banter", "Duchesse entering its slightly-less-cooked era 🫠✨ Subject to seventeen permits and one mysterious delay 📋"],
    ["cheer", "Heat and income pointing to the same place? 📊🤝 The spreadsheet ate. No crumbs. Just extremely hot pavement 🍽️🥵"],
    ["side-eye", "Okay mayor, decent start 👀👏 My eyebrow has returned to a legally acceptable height 🤨"],
  ],
  'louise-funded': [
    ["cheer", "Public green at 0.2% 😭🌱 Even my dying phone has more coverage 🔋 Thank you for noticing, bestie."],
    ["side-eye", "Louise got the bag 💸👀 Hope your press officer stretched before explaining this one 🧘🎤"],
    ["cheer", "The green-deficit bar screamed and someone LISTENED 📊📢🌳 I am experiencing unfamiliar municipal emotions 🥹"],
    ["banter", "The imaginary public tree in my head just stood up and applauded 🌳👏😭"],
    ["side-eye", "Low public green ≠ biggest need overall, bestie 🤨📊 Cute investment. Complicated justification. 🍿"],
    ["banter", "Plant trees. Not a giant sign saying FUTURE TREES 🌳🚧 We cannot sit in the shade of your branding 🤡"],
    ["cheer", "You saw a green deficit and funded it?? 🌱💸 Is this... follow-through? In this economy? 🥹"],
    ["side-eye", "Congrats on having a budget, mayor 🎉 You now have 900 unpaid opinion consultants. Hello, we are the residents 👋🤓"],
    ["cheer", "Less ribbon, more roots ✂️🚫🌳 But yes, I am emotionally attached to this budget line now 🥹💚"],
    ["banter", "The green inventory said almost nothing 🌱🔎 The budget said HOLD MY WATERING CAN 🪴💸"],
  ],
  'marolles-funded': [
    ["cheer", "Marolles got funded 😭💸 Shout-out to whoever remembered income exists between the pie charts 🥧📊"],
    ["side-eye", "Before ordering fifty identical benches: ask where people actually cool down 🪑🥵 Revolutionary concept, I know 🤯"],
    ["banter", "A park on Excel is not automatically somewhere cool to sit 📊🌳 My laptop is also green. It is currently on fire 🫠💻"],
    ["cheer", "Our income is almost as low as Duchesse’s 👀📊 Glad that survived the very pretty colour palette 🎨👏"],
    ["banter", "MAROLLES FUNDING ARC UNLOCKED 🔓💸 The neighbourhood chat will be insufferable for the next 48 hours 🥳📱"],
    ["side-eye", "Funding secured ✅💰 Next boss: a project that actually works 🎮👹 Bring snacks. And residents."],
    ["cheer", "Not the hottest place, still a real claim 🥵📊 Mayor has unlocked a SECOND thought 🤯👏 Growth!"],
    ["side-eye", "Do we help design it or just receive a newsletter with your face on it? 🤨📰 Asking before the professional photographer arrives 📸"],
    ["cheer", "Income in the conversation, money on the table 💸🤝 A sentence I did not expect to type today 🥹"],
    ["banter", "The budget has arrived in Marolles 💸📍 Nature documentary voice: a rare sighting. Do not startle it 🦌🤫"],
  ],
  'duchesse-waiting': [
    ["side-eye", "Duchesse still waiting with the highest surface temperature 🥵📊 Mayor, be so astronomically for real 🤨🚀"],
    ["banter", "Our pavement is doing a FREE TRIAL OF THE SUN 🥵☀️ When do we cancel the subscription? 📞😭"],
    ["side-eye", "We brought heat AND low income to the meeting 🥵💸 Was there a dress code? Should the spreadsheet have worn a tie? 👔🤡"],
    ["banter", "Duchesse has left the chat 🥵📱 Phone too hot. Pavement too hot. Takes: somehow still getting hotter 🌶️"],
    ["side-eye", "Gorgeous allocation, mayor 💅📊 Unfortunately our pavement has requested to speak to your manager 🥵☎️"],
    ["cheer", "Other places need money too. I get it 🤝 But please do not let Duchesse become the footnote with heatstroke vibes 🫠📋"],
    ["side-eye", "Top temperature score, zero funding 😭📊 Our neighbourhood is doing numbers in all the wrong categories 🏆🫠"],
    ["banter", "The funding is arriving by tram, apparently 🚋💸 It says 3 minutes. It has said 3 minutes since Tuesday 🫠"],
    ["side-eye", "Mayor blink twice if you looked at all three indicators 👀👀 No, the legend does not count 🤨📊"],
    ["cheer", "I see the reasoning 🤝 I am still standing here looking like a melted candle 🕯️🫠 Please remember us."],
  ],
  'louise-waiting': [
    ["side-eye", "Louise: 0.2% public green 🌱🔬 Our need did not disappear when you clicked somewhere else, your clickiness 🖱️👑"],
    ["banter", "Would the council’s houseplant count as our allocation? 🪴🤨 Can we at least borrow it on weekends? 😭"],
    ["side-eye", "I understand the heat argument 📊👍 I would also like to meet a public tree in person 🌳🤝"],
    ["banter", "Our green-space strategy is currently manifesting a park 🧘✨🌳 Results pending. Funding also pending 💸👻"],
    ["cheer", "Duchesse has a strong case 🤝🥵 We support that. We would ALSO like a tree. Two thoughts can coexist 🧠🌳"],
    ["side-eye", "The green-deficit bar is doing OLYMPIC GYMNASTICS for your attention 🤸📊 Somebody give it a medal. Or funding 🥇💸"],
    ["banter", "Louise has been waitlisted for photosynthesis 🌱⏳ Apparently chlorophyll is invitation-only now 💅😭"],
    ["side-eye", "Not all green is PUBLIC green, bestie 🌳🔐 You cannot count a private garden we have to admire through a gate 👀"],
    ["cheer", "Fair enough this round 🤝 Just checking: waiting is not the same category as magically fine 🫠📋"],
    ["banter", "Our application has become a tasteful PDF 📄✨ Nature is healing. Elsewhere. 🌳🚶"],
  ],
  'marolles-waiting': [
    ["side-eye", "Marolles income score: 96 📊 Funding vibes: buffering ⏳🫠 Have you tried turning the mayor off and on again? 🔌"],
    ["banter", "The budget passed us like a tram saying NOT IN SERVICE 🚋💸 The eye contact was devastating 😭"],
    ["side-eye", "More public green ON PAPER 📄🌳 Amazing. Shall we sit under the PDF? 🫠🪑"],
    ["cheer", "I see why you picked the other place 🤝 Now explain ours without saying holistic or stakeholder 🤨🎤"],
    ["banter", "We have received a GENEROUS allocation of further consideration 🎁📋 Do you water that or what? 🪴😭"],
    ["side-eye", "Lower temperature ≠ no cooling need 🤨🌡️ I fear the nuance has missed its tram 🚋💨"],
    ["banter", "Welcome to our apparently-you-can-wait era ⏳💅 The aesthetic is mostly staring at a budget we are not in 👀💸"],
    ["side-eye", "Please do not make residents win a PowerPoint pageant for attention 📊👑 My transitions are terrible and my street is hot 🥵"],
    ["cheer", "Others have real needs too 🤝 We are simply asking not to become the deleted scene 🎬👻"],
    ["banter", "Marolles would like the PREMIUM version of being considered 💳✨ Apparently basic consideration includes ads and no funding 🤡"],
  ],
  split: [
    ["cheer", "More neighbourhoods get actual money, not a polite email 💌🚫💸 Stunning development. Historians are taking notes 🧐"],
    ["banter", "Budget: split 💸 Group chat: split 📱 Friendships: under review 🤺 Beautiful administrative symmetry 🤌"],
    ["side-eye", "Equal slices, different needs 🥧🤨 That cake metaphor is carrying this entire administration on its back 🏋️"],
    ["banter", "Diplomacy unlocked 🕊️🔓 Universal gratitude: still a paid expansion pack 🎮💳"],
    ["cheer", "More than one place gets a budget line? 💸🤝 Okay, I can work with this. Cautious little W 🥹"],
    ["side-eye", "Sharing does not come with a FREE NEUTRALITY CERTIFICATE 📜🤨 The scissors emoji cannot do your ethics for you ✂️"],
    ["banter", "Everyone got a slice and immediately measured the other slice 🥧📏 Peak neighbourhood group chat 👀😭"],
    ["cheer", "Public investment has escaped its first postcode 📍💸 We love a budget with range 🕺"],
    ["side-eye", "Cute compromise 🤝✨ Are the smaller packages useful or have we just bought three ceremonial shovels? 🪏📸"],
    ["banter", "Mayor discovered splitting the restaurant bill 🍽️💸 Someone is still furious because they only ordered shade 🧾🫠"],
  ],
  concentrated: [
    ["side-eye", "More money for a place already funded? 👀💸 Your repeat-customer loyalty scheme is getting noticed 🏷️🤨"],
    ["cheer", "Building on an earlier investment can make sense 🏗️👍 Now give us the reason without a 40-slide warm-up 📊😴"],
    ["banter", "One neighbourhood got the deluxe edition 💎 Others are still watching the trailer 🍿🎬"],
    ["side-eye", "Deep investment or tunnel vision? 🔭🤨 Same money, VERY different documentary on your administration 🎥🍿"],
    ["banter", "Mayor picked a main character and renewed them for season two 👑📺 The rest of us are unpaid extras 🚶😭"],
    ["cheer", "Concentrating money can be defensible 🤝📊 Pretending there are no trade-offs? That is a clown car with a municipal logo 🤡🚗"],
    ["side-eye", "The smaller-budget neighbourhoods would like to know when their character development begins 🎬⏳👀"],
    ["banter", "The ribbon-cutting photographer is saving SO MUCH on travel ✂️📸🚲 Sustainable governance, apparently 🤡"],
    ["cheer", "A bigger package might help 👍🏗️ The explanation is currently smaller than the press release, though 🔎📰"],
    ["side-eye", "This plan has focus 🔦 So does my cat staring at ONE treat while ignoring the rest of the room 🐈🤨"],
  ],
  'all-funded': [
    ["cheer", "All three got something 💸💸💸 Low bar? Yes. Cleared? Also yes. Tiny confetti cannon 🎉🥹"],
    ["banter", "Nobody got zero 😭💸 The chat has encountered an unfamiliar emotion. Please stand by 📱🫠"],
    ["side-eye", "All funded ≠ all needs met 📊🤨 Put that on the confetti cannon before you fire it 🎉🚫"],
    ["cheer", "A budget that visits more than one postcode 📍💸 Look at it go. Dora the Allocator 🗺️🎒"],
    ["banter", "Three neighbourhoods. Three budget lines. THIRTY-SEVEN OPINIONS 📱📢 Someone mute the uncle 🫠"],
    ["side-eye", "Before the victory lap: who got the smallest slice? 🥧🔎 Your confetti is obstructing my questions 🎉🤨"],
    ["cheer", "Nobody completely left out 🥹🤝 Now please turn the budget graphic into something we can actually sit under 🌳🪑"],
    ["banter", "Everyone partly happy, everyone partly annoyed 🤝😤 Extremely Brussels. Honestly iconic 🧇"],
    ["side-eye", "The chart looks balanced 📊✨ So did my tray before I dropped three coffees. Zoom in ☕🫠"],
    ["banter", "We can all complain about implementation together now 🏗️📢 Community cohesion has never been stronger 🤝😭"],
  ],
  civic: [
    ["banter", "The spreadsheet entered politics and immediately requested sick leave 📊🤒 HR says the form is another spreadsheet 💀"],
    ["side-eye", "Normal English please 🤨🎤 Not procurement-flavoured fog with a side of stakeholder engagement 🌫️📋"],
    ["cheer", "Three indicators and a decision we can actually argue with 📊🤝 A mystery algorithm could never 💅"],
    ["banter", "A consultant is making 94 slides called Shade: A Journey 📊🌳 The invoice is already warmer than the pavement 🧾🥵"],
    ["banter", "This meeting could have been a tree 🌳📧 I will not be taking questions. Unlike the mayor, who absolutely should 🎤👀"],
    ["side-eye", "SURFACE temperature, not today’s weather forecast 🌡️📊 Please stop beefing with the wrong number 🤺😭"],
    ["cheer", "I disagree but at least I can see the choice 🤝👀 Transparent enough for me to be SPECIFICALLY annoyed. Progress 🥹"],
    ["banter", "We said we need a conversation 🗣️ Now everyone is talking and the mayor looks physically unwell 📱🫠🍿"],
    ["side-eye", "The bar chart is cute 📊💅 It cannot attend a residents’ meeting and defend you, though 🎤🤡"],
    ["banter", "The budget is fictional 💸✨ My opinions have somehow become a full-time job 📱💀 Who do I invoice? 🧾"],
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
