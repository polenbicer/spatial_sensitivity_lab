'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, ArrowDown } from 'lucide-react';
import type { Decision, Neighbourhood } from './model';
import { reactionsFor } from './reactions';
import styles from './resident-chat.module.css';

type Props = { decisions: Decision[]; areas: Neighbourhood[]; seed: number; open: boolean; onOpen: () => void; onClose: () => void };
export default function ResidentChat({ decisions, areas, seed, open, onOpen, onClose }: Props) {
  const batches = useMemo(() => reactionsFor(decisions, areas, seed), [decisions, areas, seed]);
  const feed = batches.flatMap(b => b.comments.map((comment,i) => ({...comment, turn:b.turn, title:b.title, first:i===0})));
  const [revealed, setRevealed] = useState(0);
  const [read, setRead] = useState(0);
  const [following, setFollowing] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const length = feed.length;
  const count = Math.min(revealed, length);
  const typing = count < length;
  const unread = Math.max(0, count - read);
  useEffect(() => { if (revealed > length) setRevealed(length); if (!length) { setRead(0); setFollowing(true); } }, [length, revealed]);
  useEffect(() => {
    if (!typing) return;
    const timer = window.setTimeout(() => setRevealed(n => Math.min(n + 1, length)), count === 0 ? 300 : 1050);
    return () => window.clearTimeout(timer);
  }, [typing, count, length]);
  useEffect(() => { if (open) setRead(count); }, [open, count]);
  useEffect(() => {
    if (open && following && scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [open, count, following]);
  useEffect(() => {
    function escape(e: KeyboardEvent) { if (e.key === 'Escape' && open) { onClose(); trigger.current?.focus(); } }
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open, onClose]);
  if (!decisions.length) return null;
  const visible = feed.slice(0, count);
  return <>
    {!open && <button ref={trigger} className={styles.launcher} onClick={onOpen} aria-controls="resident-chat" aria-expanded={false}><MessageCircle size={18} aria-hidden="true"/><span>Neighbourhood chat</span><b>{unread > 0 ? `${unread} new` : count}</b></button>}
    {open && <aside id="resident-chat" className={styles.panel} aria-labelledby="chat-title">
      <div className={styles.header}><div><p><span className={styles.dot}/> THE GROUP CHAT 🌶️</p><h2 id="chat-title">Brussels has opinions. 🍿</h2></div><button onClick={() => {onClose();}} aria-label="Close neighbourhood chat"><X size={20}/></button></div>
      <p className={styles.disclaimer}>Fictional residents. Scripted reactions.<br/>Zero chill. No real messages are posted.</p>
      <div className={styles.feed} ref={scroller} onScroll={() => {const el=scroller.current;if(el)setFollowing(el.scrollHeight-el.scrollTop-el.clientHeight < 70);}} role="log" aria-label="Fictional resident reactions" aria-live="polite" aria-relevant="additions">
        {visible.map(c => <div key={`${c.turn}-${c.id}`}>
          {c.first && <div className={styles.event}><span>DECISION 0{c.turn} CONFIRMED</span><strong>{c.title}</strong></div>}
          <article className={styles.message}>
            <div className={styles.avatar} aria-hidden="true">{['🫠','😎','🤨','🥵','👀','🙃','🧐','🤌','😤','😏'][Number(c.id.split('-')[1]) % 10]}</div>
            <div><div className={styles.byline}><strong>@{c.handle}</strong><span>{c.neighbourhood}</span></div><p>{c.text}</p><span className={styles.reaction}>{c.mood==='cheer'?'🥹👏 Rare municipal W':c.mood==='side-eye'?'🤨🍿 Explain yourself, mayor.':'😂💀 The chat is not okay'}</span></div>
          </article>
        </div>)}
        {typing && <p className={styles.typing}><i/><i/><i/> Someone is typing a strongly worded opinion… 👀</p>}
        {!typing && visible.length > 0 && <p className={styles.caughtUp}>You’re caught up. Nobody has calmed down. 🍿</p>}
      </div>
      {!following && <button className={styles.jump} onClick={() => setFollowing(true)}><ArrowDown size={14}/> Latest reactions</button>}
      <div className={styles.bottom}><MessageCircle size={16}/><span>{decisions.length === 3 ? 'Budget: gone. Opinions: unlimited. 💸💀' : 'Make a decision. Release the group chat. 📱🌶️'}</span></div>
    </aside>}
  </>;
}
