import { socket } from "./matchmaking";

let mounted = false;
let containerEl: HTMLElement | null = null;
let listEl: HTMLUListElement | null = null;
let formEl: HTMLFormElement | null = null;
let inputEl: HTMLInputElement | null = null;
let headerEl: HTMLElement | null = null;
let rosterEl: HTMLUListElement | null = null;
let contextMenuEl: HTMLDivElement | null = null;
let dmBadgeEl: HTMLDivElement | null = null;
let dmTarget: { id: string; name: string } | null = null;
let blocked = new Set<string>();
let lastRoster: Array<{ id: string; name: string }> = [];

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

function ensureDOM(target: HTMLElement) {
  // Styling: rightmost column, white background, black border
  target.innerHTML = `
    <div id="roomChat" style="position:fixed; top:0; right:0; height:100vh; width:320px; background:#fff; color:#000; border:1px solid #000; box-sizing:border-box; padding:10px; font:14px/1.3 system-ui, sans-serif; display:flex; flex-direction:column; gap:8px;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <strong id="roomChatTitle">ROOM </strong>
        <small id="roomChatHint" style="opacity:.7;">Press Enter to send</small>
      </div>
      <div style="display:flex; flex-direction:column; gap:6px;">
        <div style="font-weight:600;">Players</div>
        <ul id="roomRoster" style="list-style:none; margin:0; padding:0; border:1px solid #000; height:120px; overflow:auto; background:#fafafa;"></ul>
      </div>
      <ul id="roomChatList" style="list-style:none; margin:0; padding:0; flex:1; overflow-y:auto; border:1px solid #000; background:#fafafa;"></ul>
      <div id="inviteBanner" style="display:none; border:1px solid #000; padding:6px; background:#eef; color:#000;">
        <span id="inviteText"></span>
        <button id="inviteAccept" style="margin-left:6px; border:1px solid #000; background:#fff; color:#000;">Join</button>
        <button id="inviteDecline" style="margin-left:6px; border:1px solid #000; background:#fff; color:#000;">Decline</button>
      </div>
      <div id="dmBadge" style="display:none; font-size:12px; color:#0047ab;">
        DM to <span id="dmName"></span>
        <button id="dmClear" style="margin-left:6px; border:1px solid #000; background:#fff; color:#000; padding:0 6px;">x</button>
      </div>
      
      <form id="roomChatForm" style="display:flex; gap:6px;">
        <input id="roomChatInput" type="text" placeholder="Type a message" maxlength="300" style="flex:1; padding:6px; border-radius:4px; border:1px solid #000; background:#fff; color:#000;" />
        <button type="submit" style="padding:6px 10px; border:1px solid #000; background:#fff; color:#000;">Send</button>
      </form>
      <div id="chatContextMenu" style="display:none; position:absolute; z-index:9999; background:#fff; border:1px solid #000; box-shadow:2px 2px 0 rgba(0,0,0,.1);">
        <ul style="list-style:none; margin:0; padding:4px;">
          <li data-action="dm" style="padding:4px 8px; cursor:pointer;">DM</li>
          <li data-action="invite" style="padding:4px 8px; cursor:pointer;">Invite to room</li>
          <li data-action="toggleBlock" style="padding:4px 8px; cursor:pointer;">Block</li>
          <li data-action="viewProfile" style="padding:4px 8px; cursor:pointer;">View profile</li>
          <li data-action="reply" style="display:none; padding:4px 8px; cursor:pointer;">Reply</li>
        </ul>
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

  // Fill room code in header
  const code = sessionStorage.getItem('roomCode') || '';
  if (headerEl) headerEl.textContent = `ROOM ${code}`;
}

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
  li.style.opacity = msg.system ? '0.8' : '1';
  li.style.whiteSpace = 'pre-wrap';
  li.style.wordBreak = 'break-word';
  (li.style as any).overflowWrap = 'anywhere';
  const isDM = !!(msg as any).dm;
  li.innerText = `[${hh}:${mm}] ${tag}: ${msg.text}`;
  if (isDM) li.style.color = '#0047ab';
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
  // bind form
  if (formEl && inputEl) {
    formEl.addEventListener('submit', onSubmit);
    // prevent propagation so game hotkeys don't eat spacebar etc.
    inputEl.addEventListener('keydown', (e) => {
      e.stopPropagation();
    });
  }
  // clear dm
  const clearBtn = containerEl?.querySelector('#dmClear') as HTMLButtonElement | null;
  clearBtn?.addEventListener('click', () => setDMTarget(null));
  // global close of context menu
  document.addEventListener('click', () => closeContextMenu());

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
  // Disable DM/Block (and Reply) when right-clicking yourself or system
  const isSystem = !id || id === 'system';
  const self = !!(socket as any)?.id && (socket as any).id === id;
  const hideActions = isSystem || self;
  // DM is allowed across rooms; only hide for self/system
  if (dmItem) dmItem.style.display = hideActions ? 'none' : 'block';
  if (inviteItem) inviteItem.style.display = hideActions ? 'none' : 'block';
  if (blockItem) blockItem.style.display = hideActions ? 'none' : 'block';
  if (replyItem && hideActions) replyItem.style.display = 'none';
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
    // cosmetic for now
    alert(`Viewing profile: ${target.name || target.id.slice(0, 6)}`);
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