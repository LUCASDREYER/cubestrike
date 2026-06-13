// Realtime multiplayer transport over Supabase Realtime (a hosted service).
// No game server to run: clients join a room channel, use presence for the
// roster + host election, and relay typed messages via broadcast. The Supabase
// SDK is imported from a CDN at connect time so the game keeps its no-build,
// no-dependency setup. If NET isn't configured the whole module stays dormant.
import { NET } from './config.js';

export const net = {
  online: false,
  myId: Math.random().toString(36).slice(2, 10),
  name: '',
  room: '',
  isHost: false,
  peers: new Map(), // id -> { id, name, joinedAt }
  joinedAt: 0,
  _channel: null,
  _client: null,
  _handlers: {},

  configured() { return !!(NET.supabaseUrl && NET.supabaseKey); },

  on(event, cb) { (this._handlers[event] ||= []).push(cb); },
  _emit(event, payload, from) {
    for (const cb of this._handlers[event] || []) cb(payload, from);
  },

  async connect(room, name) {
    if (!this.configured()) {
      throw new Error('Multiplayer is not set up — add your Supabase URL and anon key to NET in js/config.js.');
    }
    const { createClient } = await import(NET.sdkUrl);
    this.name = name || 'Player';
    this.room = room;
    this.joinedAt = Date.now();
    this._client = createClient(NET.supabaseUrl, NET.supabaseKey, {
      realtime: { params: { eventsPerSecond: Math.max(10, NET.tickHz * 4) } },
    });
    const channel = this._client.channel(`cubestrike:${room}`, {
      config: { broadcast: { self: false }, presence: { key: this.myId } },
    });
    this._channel = channel;

    channel.on('broadcast', { event: 'm' }, ({ payload }) => {
      if (payload && payload.from !== this.myId) this._emit(payload.e, payload.d, payload.from);
    });
    channel.on('presence', { event: 'sync' }, () => this._syncPresence());
    channel.on('presence', { event: 'join' }, () => this._syncPresence());
    channel.on('presence', { event: 'leave' }, () => this._syncPresence());

    await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('Realtime connection timed out.')), 10000);
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(to);
          await channel.track({ id: this.myId, name: this.name, joinedAt: this.joinedAt });
          this.online = true;
          this._syncPresence();
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(to);
          reject(new Error(`Realtime connection failed (${status}). Check your Supabase keys.`));
        }
      });
    });
  },

  _syncPresence() {
    if (!this._channel) return;
    const state = this._channel.presenceState();
    const peers = new Map();
    for (const key in state) {
      const meta = state[key][0];
      if (meta && meta.id) peers.set(meta.id, { id: meta.id, name: meta.name, joinedAt: meta.joinedAt });
    }
    if (!peers.has(this.myId)) {
      peers.set(this.myId, { id: this.myId, name: this.name, joinedAt: this.joinedAt });
    }
    this.peers = peers;
    // host is the earliest joiner; id breaks ties so everyone agrees
    let host = null;
    for (const p of peers.values()) {
      if (!host || p.joinedAt < host.joinedAt || (p.joinedAt === host.joinedAt && p.id < host.id)) host = p;
    }
    const wasHost = this.isHost;
    this.isHost = !!host && host.id === this.myId;
    this._emit('roster', [...peers.values()]);
    if (this.isHost !== wasHost) this._emit('hostchange', this.isHost);
  },

  send(e, d) {
    if (!this.online || !this._channel) return;
    this._channel.send({ type: 'broadcast', event: 'm', payload: { e, d, from: this.myId } });
  },

  async disconnect() {
    this.online = false;
    this.isHost = false;
    try { if (this._channel) await this._channel.unsubscribe(); } catch { /* ignore */ }
    try { if (this._client) await this._client.removeAllChannels(); } catch { /* ignore */ }
    this._channel = null;
    this._client = null;
    this.peers = new Map();
  },
};
