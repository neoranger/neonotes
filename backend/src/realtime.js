const userConnections = new Map();

export function track(userId, res) {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId).add(res);
}

export function untrack(userId, res) {
  const set = userConnections.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) {
    userConnections.delete(userId);
  }
}

export function notifyUser(userId, payload) {
  const set = userConnections.get(userId);
  if (!set || set.size === 0) return;

  const frame = `event: data_changed\ndata: ${JSON.stringify(payload)}\n\n`;

  for (const res of Array.from(set)) {
    try {
      res.write(frame);
    } catch (err) {
      res.destroy();
      untrack(userId, res);
    }
  }
}