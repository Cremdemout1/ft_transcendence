/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chat.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: gude-cas <gude-cas@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/12/03 21:05:41 by gude-cas          #+#    #+#             */
/*   Updated: 2025/12/04 15:57:53 by gude-cas         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { socket } from "./matchmaking";

let mounted = false;
let containerEl: HTMLElement | null = null;
let listEl: HTMLUListElement | null = null;
let formEl: HTMLFormElement | null = null;
let inputEl: HTMLInputElement | null = null;
let headerEl: HTMLElement | null = null;
let closeBtnEl: HTMLButtonElement | null = null;
let showBtnEl: HTMLButtonElement | null = null;
let rosterEl: HTMLUListElement | null = null;
let contextMenuEl: HTMLDivElement | null = null;
let dmBadgeEl: HTMLDivElement | null = null;
let profileCardEl: HTMLDivElement | null = null;
let dmTarget: { id: string; name: string } | null = null;
let blocked = new Set<string>();
let lastRoster: Array<{ id: string; name: string }> = [];
let headerInjected = false;

function decodeJwt(token: string) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getUsernameFromJwt(): string | null {
  const jwt = sessionStorage.getItem('jwt');
  if (!jwt) return null;
  const payload = decodeJwt(jwt);
  return payload?.username || null;
}

function getRoomCode(): string {
  // Try sessionStorage, URL search params, and a socket-attached value if present
  const fromSession = sessionStorage.getItem('roomCode');
  if (fromSession && fromSession !== 'undefined' && fromSession !== 'null') return fromSession;
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (code) return code;
  } catch {}
  try {
    const maybe = (socket as any)?.roomCode;
    if (maybe) return String(maybe);
  } catch {}
  return '';
}

function ensureDOM(target: HTMLElement) {
  // Styling: rightmost column, dark background with neon-cyan accents to match game
  target.innerHTML = `
    <button id="roomChatShowBtn" style="display:none; position:fixed; right:16px; top:80px; z-index:11; padding:6px 10px; border:2px solid rgba(0,255,255,0.35); background:#0b0f14; color:#00ffff; text-shadow:0 0 6px #00ffff; border-radius:6px; font:14px 'Courier New', monospace;">Show chat</button>
    <div id="roomChat" style="position:fixed; top:0; right:0; height:100vh; width:320px; background:#0b0f14; color:#d7ffff; border:2px solid rgba(0,255,255,0.3); box-shadow:0 0 10px rgba(0,255,255,0.2); border-radius:8px; box-sizing:border-box; padding:10px; font:14px/1.3 'Courier New', monospace; display:flex; flex-direction:column; gap:8px;">
      <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px;">
        <small id="roomChatHint" style="opacity:.7; color:#8fd7d7;">Press Enter to send</small>
        <button id="roomChatClose" aria-label="Close chat" title="Close chat" style="padding:2px 8px; border:2px solid rgba(255,100,100,0.35); background:#0b0f14; color:#ff9e9e; border-radius:6px; font-size:20px; line-height:1;">×</button>
      </div>
      <div id="roomRosterSection" style="display:flex; flex-direction:column; gap:6px;">
        <div style="font-weight:600; color:#00ffff; text-shadow:0 0 6px #00ffff;">Online players:</div>
        <ul id="roomRoster" style="list-style:none; margin:0; padding:0; border:2px solid rgba(0,255,255,0.25); max-height:140px; overflow:auto; background:#0e141b;"></ul>
      </div>
      <ul id="roomChatList" style="list-style:none; margin:0; padding:8px; flex:1; overflow-y:auto; border:2px solid rgba(0,255,255,0.25); background:#0e141b;"></ul>
      <div id="inviteBanner" style="display:none; border:2px solid rgba(0,255,255,0.35); padding:6px; background:#0d1620; color:#cfffff; box-shadow:0 0 8px rgba(0,255,255,0.15);">
        <span id="inviteText"></span>
        <button id="inviteAccept" style="margin-left:6px; border:2px solid rgba(0,255,255,0.35); background:#0b0f14; color:#00ffff; text-shadow:0 0 6px #00ffff; padding:4px 8px; border-radius:4px;">Join</button>
        <button id="inviteDecline" style="margin-left:6px; border:2px solid rgba(255,100,100,0.35); background:#0b0f14; color:#ff9e9e; padding:4px 8px; border-radius:4px;">Decline</button>
      </div>
      <div id="dmBadge" style="display:none; font-size:12px; color:#7fd9ff;">
        DM to <span id="dmName"></span>
        <button id="dmClear" style="margin-left:6px; border:2px solid rgba(0,255,255,0.35); background:#0b0f14; color:#cfffff; padding:0 6px; border-radius:4px;">x</button>
      </div>
      
      <form id="roomChatForm" style="display:flex; gap:6px;">
        <input id="roomChatInput" type="text" placeholder="Type a message" maxlength="300" style="flex:1; padding:6px; border-radius:4px; border:2px solid rgba(0,255,255,0.35); background:#0b0f14; color:#cfffff;" />
        <button type="submit" style="padding:6px 10px; border:2px solid rgba(0,255,255,0.35); background:#0b0f14; color:#00ffff; text-shadow:0 0 6px #00ffff; border-radius:4px;">Send</button>
      </form>
      <div id="chatContextMenu" style="display:none; position:absolute; z-index:9999; background:#0b0f14; border:2px solid rgba(0,255,255,0.35); box-shadow:0 0 10px rgba(0,255,255,0.2);">
        <ul style="list-style:none; margin:0; padding:4px;">
          <li data-action="dm" style="padding:4px 8px; cursor:pointer; color:#cfffff;">DM</li>
          <li data-action="invite" style="padding:4px 8px; cursor:pointer; color:#cfffff;">Invite to room</li>
          <li data-action="toggleBlock" style="padding:4px 8px; cursor:pointer; color:#ff9e9e;">Block</li>
          <li data-action="viewProfile" style="padding:4px 8px; cursor:pointer; color:#cfffff;">View profile</li>
          <li data-action="reply" style="display:none; padding:4px 8px; cursor:pointer; color:#7fd9ff;">Reply</li>
        </ul>
      </div>
      <div id="miniProfileCard" style="display:none; position:absolute; z-index:10000; background:#0b0f14; color:#d7ffff; border:2px solid rgba(0,255,255,0.35); box-shadow:0 0 10px rgba(0,255,255,0.2); border-radius:8px; padding:10px; width:240px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="color:#00ffff; text-shadow:0 0 6px #00ffff;">Profile</strong>
          <button id="miniProfileClose" style="border:2px solid rgba(255,100,100,0.35); background:#0b0f14; color:#ff9e9e; border-radius:6px; font-size:16px; line-height:1; padding:0 6px;">×</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div><span style="opacity:.8;">Username:</span> <span id="miniProfileUsername">—</span></div>
          <div><span style="opacity:.8;">Firstname:</span> <span id="miniProfileFirstname">—</span></div>
          <div><span style="opacity:.8;">Lastname:</span> <span id="miniProfileLastname">—</span></div>
          <div><span style="opacity:.8;">Email:</span> <span id="miniProfileEmail">—</span></div>
        </div>
      </div>
    </div>
  `;
  containerEl = target;
  listEl = target.querySelector('#roomChatList');
  formEl = target.querySelector('#roomChatForm');
  inputEl = target.querySelector('#roomChatInput');
  headerEl = target.querySelector('#roomChatTitle');
  rosterEl = target.querySelector('#roomRoster');
  contextMenuEl = target.querySelector('#chatContextMenu');
  dmBadgeEl = target.querySelector('#dmBadge');
  profileCardEl = target.querySelector('#miniProfileCard');
  closeBtnEl = target.querySelector('#roomChatClose') as HTMLButtonElement | null;
  showBtnEl = target.querySelector('#roomChatShowBtn') as HTMLButtonElement | null;

  // Inject header item into the list and set code
  injectOrUpdateHeader();
}

function injectOrUpdateHeader() {
  // Requirement: completely remove the ROOM: XXXXX header from the chat UI.
  // If a header exists from a previous render, remove it; do not re-create.
  if (!listEl) return;
  const header = listEl.querySelector('#roomChatTitle') as HTMLElement | null;
  if (header) {
    header.remove();
    headerInjected = false;
  }
}

function hideChat() {
  const panel = document.getElementById('roomChat');
  if (!panel) return;
  panel.style.display = 'none';
  closeContextMenu();
  if (showBtnEl) showBtnEl.style.display = 'inline-block';
}

function showChat() {
  const panel = document.getElementById('roomChat');
  if (!panel) return;
  panel.style.display = 'flex';
  if (showBtnEl) showBtnEl.style.display = 'none';
}

export function hideChatUI() { hideChat(); }
export function showChatUI() { showChat(); }

function appendMessage(msg: { id: string; from: string; text: string; ts: number; system?: boolean }) {
  if (!listEl) return;
  // Hide messages from blocked users (non-system)
  const senderId = (msg as any).from as string;
  if (!msg.system && senderId && blocked.has(senderId)) return;
  const li = document.createElement('li');
  const time = new Date(msg.ts);
  const hh = ("0" + time.getHours().toString()).slice(-2);
  const mm = ("0" + time.getMinutes().toString()).slice(-2);
  const tag = msg.system ? 'system' : ((msg as any).fromName || msg.from.slice(0, 6));
  li.style.margin = '4px 0';
  li.style.opacity = msg.system ? '0.85' : '1';
  li.style.whiteSpace = 'pre-wrap';
  li.style.wordBreak = 'break-word';
  (li.style as any).overflowWrap = 'anywhere';
  const isDM = !!(msg as any).dm;
  li.innerText = `[${hh}:${mm}] ${tag}: ${msg.text}`;
  if (isDM) li.style.color = '#7fd9ff';
  if (msg.system) li.style.color = '#8fd7d7';
  // Attach metadata for context menu
  (li as any).__meta = { id: (msg as any).from, name: (msg as any).fromName, isDM };
  li.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openContextMenu(e.pageX, e.pageY, (msg as any).from, (msg as any).fromName, isDM);
  });
  listEl.appendChild(li);
  // auto-scroll
  listEl.scrollTop = listEl.scrollHeight;
}

function bindSocketOnce() {
  if ((socket as any).__chatBound) return;
  (socket as any).__chatBound = true;
  socket.on('chat:new', (msg: any) => {
    appendMessage(msg);
  });
  socket.on('chat:history', ({ messages }: { messages: any[] }) => {
    if (!listEl) return;
    listEl.innerHTML = '';
    // keep header at top
    injectOrUpdateHeader();
    messages.forEach(appendMessage);
  });
  socket.on('chat:roster', ({ players, online }: { players: Array<{id: string; name: string}>, online: Array<{id: string; name: string}> }) => {
    // Merge players-in-room and online-not-in-room; mark membership
    const merged = [
      ...players.map(p => ({...p, inRoom: true})),
      ...online.map(o => ({...o, inRoom: false})),
    ];
    // Deduplicate by id, prefer inRoom=true if duplicates occur
    const byId = new Map<string, {id: string; name: string; inRoom?: boolean}>();
    for (const p of merged) {
      const existing = byId.get(p.id);
      if (!existing || (p.inRoom && !existing.inRoom)) {
        byId.set(p.id, p);
      }
    }
    const combined = Array.from(byId.values());
    lastRoster = combined as any;
    renderRoster(combined as any);
  });
  socket.on('chat:dmError', ({ message }: { message: string }) => {
    const txt = /blocked you/i.test(message) ? 'this user has blocked you' : (message || 'DM could not be delivered');
    appendSystem(txt);
  });
  // Explicit chat reset (e.g., at tournament round transitions)
  socket.on('chat:reset', () => {
    try {
      if (listEl) {
        listEl.innerHTML = '';
        injectOrUpdateHeader();
      }
    } catch {}
  });
}

export function setChatMode(mode: 'default' | 'ingame') {
  const panel = document.getElementById('roomChat') as HTMLElement | null;
  const showBtn = document.getElementById('roomChatShowBtn') as HTMLElement | null;
  const rosterSection = document.getElementById('roomRosterSection') as HTMLElement | null;
  if (!panel) return;
  if (mode === 'ingame') {
    panel.style.position = 'absolute';
    panel.style.height = '25vh';
    panel.style.width = '320px';
    panel.style.top = '0';
    panel.style.right = '0';
    panel.style.zIndex = '10';
    panel.style.fontSize = '11px';
    if (rosterSection) rosterSection.style.display = 'none';
    if (showBtn) {
      showBtn.style.position = 'absolute';
      showBtn.style.right = '0';
      showBtn.style.top = '-24px';
      showBtn.style.zIndex = '11';
      (showBtn.style as any).whiteSpace = 'nowrap';
      (showBtn.style as any).fontSize = '11px';
    }
  } else {
    panel.style.position = 'fixed';
    panel.style.top = '0';
    panel.style.right = '0';
    panel.style.height = '100vh';
    panel.style.width = '320px';
    panel.style.fontSize = '14px';
    if (rosterSection) rosterSection.style.display = 'flex';
    if (showBtn) {
      showBtn.style.position = 'fixed';
      showBtn.style.right = '16px';
      showBtn.style.top = '80px';
      (showBtn.style as any).whiteSpace = 'nowrap';
      (showBtn.style as any).fontSize = '12px';
    }
  }
}

export function mountChat(target: HTMLElement) {
  ensureDOM(target);
  // load blocked list
  try {
    const saved = sessionStorage.getItem('chatBlocked');
    if (saved) blocked = new Set(JSON.parse(saved));
  } catch {}
  bindSocketOnce();
  if (!mounted) {
    mounted = true;
  }
  // Identify user by username from JWT once per mount
  const username = getUsernameFromJwt();
  if (username) socket.emit('chat:identify', { username });
  // request current history for this room
  socket.emit('chat:history');
  // in case code becomes available later, attempt update on roster/hints
  setTimeout(() => injectOrUpdateHeader(), 100);
  // bind form
  if (formEl && inputEl) {
    formEl.addEventListener('submit', onSubmit);
    // prevent propagation so game hotkeys don't eat spacebar etc.
    inputEl.addEventListener('keydown', (e) => {
      e.stopPropagation();
    });
  }
  // close / show chat toggles
  closeBtnEl?.addEventListener('click', hideChat);
  showBtnEl?.addEventListener('click', showChat);
  // clear dm
  const clearBtn = containerEl?.querySelector('#dmClear') as HTMLButtonElement | null;
  clearBtn?.addEventListener('click', () => setDMTarget(null));
  // global close of context menu
  document.addEventListener('click', () => closeContextMenu());
  document.addEventListener('click', (e) => {
    if (!profileCardEl) return;
    const targetEl = e.target as HTMLElement;
    if (profileCardEl.style.display !== 'none' && profileCardEl && !profileCardEl.contains(targetEl) && targetEl.closest('#chatContextMenu') === null) {
      closeProfileCard();
    }
  });

  // removed inline invite; use context menu Invite instead
}

export function unmountChat() {
  if (formEl) formEl.removeEventListener('submit', onSubmit);
  if (containerEl) containerEl.innerHTML = '';
  containerEl = null;
  listEl = null;
  formEl = null;
  inputEl = null;
  // keep socket listeners bound globally so chat survives view changes
}

function onSubmit(e: Event) {
  e.preventDefault();
  if (!inputEl) return;
  const text = inputEl.value.trim();
  if (!text) return;
  if (dmTarget) {
    socket.emit('chat:dm', { to: dmTarget.id, text });
    // After sending a DM, return to normal chat mode
    setDMTarget(null);
  } else {
    socket.emit('chat:send', { text });
  }
  inputEl.value = '';
}

function renderRoster(players: Array<{id: string; name: string; inRoom?: boolean}>) {
  if (!rosterEl) return;
  rosterEl.innerHTML = '';
  players.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = p.name;
    li.style.padding = '2px 4px';
    if (blocked.has(p.id)) li.style.opacity = '0.5';
    li.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openContextMenu(e.pageX, e.pageY, p.id, p.name, false, p.inRoom !== false);
    });
    rosterEl!.appendChild(li);
  });
  // Dynamic roster height based on number of players; cap to keep box compact
  try {
    const rows = players.length;
    const rowHeight = 22; // approximate per-item height
    const maxPx = 140;
    const desired = Math.min(rows * rowHeight, maxPx);
    (rosterEl as HTMLElement).style.maxHeight = desired + 'px';
    (rosterEl as HTMLElement).style.overflowY = rows * rowHeight > maxPx ? 'auto' : 'hidden';
  } catch {}
}

function openContextMenu(x: number, y: number, id: string, name?: string, isDM?: boolean, inRoom: boolean = true) {
  if (!contextMenuEl) return;
  const panel = document.getElementById('roomChat');
  let left = x;
  let top = y;
  if (panel) {
    const rect = panel.getBoundingClientRect();
    left = x - rect.left;
    top = y - rect.top;
  }
  contextMenuEl.style.display = 'block';
  contextMenuEl.style.left = left + 'px';
  contextMenuEl.style.top = top + 'px';
  (contextMenuEl as any).__target = { id, name };
  // Toggle Reply visibility for DM messages
  const replyItem = contextMenuEl.querySelector('li[data-action="reply"]') as HTMLElement | null;
  if (replyItem) replyItem.style.display = isDM ? 'block' : 'none';
  // Toggle Block label
  const blockItem = contextMenuEl.querySelector('li[data-action="toggleBlock"]') as HTMLElement | null;
  if (blockItem) blockItem.textContent = blocked.has(id) ? 'Unblock' : 'Block';
  const dmItem = contextMenuEl.querySelector('li[data-action="dm"]') as HTMLElement | null;
  const inviteItem = contextMenuEl.querySelector('li[data-action="invite"]') as HTMLElement | null;
  const viewProfileItem = contextMenuEl.querySelector('li[data-action="viewProfile"]') as HTMLElement | null;
  // Disable DM/Block (and Reply) when right-clicking yourself or system
  const isSystem = !id || id === 'system';
  const self = !!(socket as any)?.id && (socket as any).id === id;
  const hideActions = isSystem || self;
  // DM is allowed across rooms; only hide for self/system
  if (dmItem) dmItem.style.display = hideActions ? 'none' : 'block';
  if (inviteItem) inviteItem.style.display = hideActions ? 'none' : 'block';
  if (blockItem) blockItem.style.display = hideActions ? 'none' : 'block';
  if (replyItem && hideActions) replyItem.style.display = 'none';
  // View Profile should NOT be possible on system messages; allow for self and others
  if (viewProfileItem) viewProfileItem.style.display = isSystem ? 'none' : 'block';
  // Bind clicks
  contextMenuEl.querySelectorAll('li').forEach((li) => {
    li.addEventListener('click', onContextAction, { once: true });
  });
}

function closeContextMenu() {
  if (!contextMenuEl) return;
  contextMenuEl.style.display = 'none';
}

function onContextAction(e: Event) {
  const action = (e.currentTarget as HTMLElement).dataset.action as string;
  const target = (contextMenuEl as any).__target as { id: string; name?: string } | undefined;
  if (!target) return closeContextMenu();
  const isSystem = !target.id || target.id === 'system';
  const self = !!(socket as any)?.id && (socket as any).id === target.id;
  if ((action === 'dm' || action === 'toggleBlock' || action === 'reply') && (isSystem || self)) {
    return closeContextMenu();
  }
  if (action === 'dm' || action === 'reply') {
    setDMTarget({ id: target.id, name: target.name || target.id.slice(0, 6) });
  } else if (action === 'invite') {
    socket.emit('chat:invite', { to: target.id });
  } else if (action === 'toggleBlock') {
    toggleBlock(target.id);
  } else if (action === 'viewProfile') {
    openProfileCard(target.id, target.name);
  }
  closeContextMenu();
}

function setDMTarget(target: { id: string; name: string } | null) {
  dmTarget = target;
  if (!dmBadgeEl) return;
  const nameEl = dmBadgeEl.querySelector('#dmName');
  if (target) {
    if (nameEl) nameEl.textContent = target.name;
    dmBadgeEl.style.display = 'block';
  } else {
    dmBadgeEl.style.display = 'none';
  }
}

function toggleBlock(id: string) {
  if (blocked.has(id)) blocked.delete(id); else blocked.add(id);
  try { sessionStorage.setItem('chatBlocked', JSON.stringify(Array.from(blocked))); } catch {}
  // inform server of block state for enforcement
  try { socket.emit('chat:block', { target: id, block: blocked.has(id) }); } catch {}
  // roster UI will update on next roster push; no-op here
  const person = lastRoster.find(p => p.id === id);
  const name = person?.name || id.slice(0, 6);
  appendSystem(blocked.has(id) ? `User ${name} has been blocked` : `User ${name} has been unblocked`);
}

function appendSystem(text: string) {
  appendMessage({ id: String(Date.now()) + Math.random().toString(36).slice(2), from: 'system', text, ts: Date.now(), system: true } as any);
}

// Invitation banner (receiver)
let pendingInvite: { code: string } | null = null;
try{
socket.on('chat:invited', ({ fromName, code, currentCount, numPlayers }: any) => {
  const banner = document.getElementById('inviteBanner');
  const text = document.getElementById('inviteText');
  const accept = document.getElementById('inviteAccept');
  const decline = document.getElementById('inviteDecline');
  if (!banner || !text || !accept || !decline) return;
  pendingInvite = { code };
  text.textContent = `${fromName} invited you to join room ${code} (${currentCount}/${numPlayers}).`;
  banner.style.display = 'block';
  (accept as HTMLButtonElement).onclick = () => {
    if (pendingInvite) {
      socket.emit('joinRoom', { code: pendingInvite.code, alias: getUsernameFromJwt() });
      banner.style.display = 'none';
      pendingInvite = null;
    }
  };
  (decline as HTMLButtonElement).onclick = () => {
    banner.style.display = 'none';
    pendingInvite = null;
  };
});
}
catch(err){
  console.log(err);
}

socket.on('chat:inviteError', ({ message }: any) => {
  appendSystem(`Invite error: ${message}`);
});

socket.on('chat:inviteSent', ({ toName }: any) => {
  appendSystem(`Invite sent to ${toName}.`);
});

async function openProfileCard(id: string, name?: string) {
  if (!profileCardEl) return;
  const panel = document.getElementById('roomChat');
  let left = 20;
  let top = 20;
  if (contextMenuEl && contextMenuEl.style.display !== 'none') {
    const rect = contextMenuEl.getBoundingClientRect();
    left = rect.left + 8;
    top = rect.bottom + 8;
    if (panel) {
      const pRect = panel.getBoundingClientRect();
      left = rect.left - pRect.left + 8;
      top = rect.bottom - pRect.top + 8;
    }
  }
  profileCardEl.style.left = left + 'px';
  profileCardEl.style.top = top + 'px';
  setProfileFields({ username: name || '—', firstname: '—', lastname: '—', email: '—' });
  profileCardEl.style.display = 'block';
  try {
    // Resolve username prioritizing self (JWT), else by socket id
    let usernameForLookup: string | null = null;
    if (id && id !== 'system') {
      const selfUsername = getUsernameFromJwt();
      const isSelf = !!(socket as any)?.id && (socket as any).id === id;
      if (isSelf && selfUsername) {
        usernameForLookup = selfUsername;
      } else {
        usernameForLookup = await new Promise<string | null>((resolve) => {
        const handler = ({ id: respId, username }: { id: string; username: string | null }) => {
          if (respId === id) {
            (socket as any).off('profile:username', handler);
            resolve(username || null);
          }
        };
        (socket as any).on('profile:username', handler);
        (socket as any).emit('profile:getUsername', { id });
        // Timeout safety
        setTimeout(() => { (socket as any).off('profile:username', handler); resolve(null); }, 1200);
        });
      }
    }
    // Prefer explicit username lookup; fallback to /api/me for self
    const self = !!(socket as any)?.id && (socket as any).id === id;
    const url = usernameForLookup ? `/api/profile/${encodeURIComponent(usernameForLookup)}` : (self ? '/api/me' : '');
    if (url) {
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const payload = data?.user || data;
        const firstname = payload?.firstname || payload?.firstName || payload?.profile?.firstname || payload?.profile?.firstName || '—';
        const lastname = payload?.lastname || payload?.lastName || payload?.profile?.lastname || payload?.profile?.lastName || '—';
        const usernameVal = payload?.username || payload?.name || payload?.profile?.username || usernameForLookup || selfUsername || (name || '—');
        const email = payload?.email || payload?.profile?.email || '—';
        setProfileFields({ username: usernameVal, firstname, lastname, email });
      } else {
        // Fallback to JWT for minimal info if API fails
        const selfUsername2 = getUsernameFromJwt();
        if (self && selfUsername2) {
          setProfileFields({ username: selfUsername2, firstname: '—', lastname: '—', email: '—' });
        }
      }
    } else if (self) {
      // Last fallback: populate from JWT if no URL could be determined
      const selfUsername3 = getUsernameFromJwt();
      if (selfUsername3) {
        setProfileFields({ username: selfUsername3, firstname: '—', lastname: '—', email: '—' });
      }
    }
  } catch {}
  const closeBtn = profileCardEl.querySelector('#miniProfileClose') as HTMLButtonElement | null;
  closeBtn?.addEventListener('click', () => closeProfileCard(), { once: true });
}

function setProfileFields({ firstname, lastname, username, email }: { firstname: string; lastname: string; username: string; email: string }) {
  const fn = document.getElementById('miniProfileFirstname');
  const ln = document.getElementById('miniProfileLastname');
  const un = document.getElementById('miniProfileUsername');
  const em = document.getElementById('miniProfileEmail');
  if (fn) fn.textContent = firstname;
  if (ln) ln.textContent = lastname;
  if (un) un.textContent = username;
  if (em) em.textContent = email;
}

function closeProfileCard() {
  if (!profileCardEl) return;
  profileCardEl.style.display = 'none';
}