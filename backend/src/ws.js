const { WebSocketServer } = require('ws');

const connessioniPerSessione = new Map();

function avviaWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (socket) => {
    console.log('Nuovo client connesso');
    socket.sessioneId = null;

    socket.on('message', (data) => {
      let messaggio;
      try {
        messaggio = JSON.parse(data);
      } catch {
        return;
      }

      if (messaggio.tipo === 'iscriviti' && messaggio.sessioneId) {
        socket.sessioneId = messaggio.sessioneId;

        if (!connessioniPerSessione.has(messaggio.sessioneId)) {
          connessioniPerSessione.set(messaggio.sessioneId, new Set());
        }
        connessioniPerSessione.get(messaggio.sessioneId).add(socket);

        console.log(`Client iscritto alla sessione ${messaggio.sessioneId}`);
      }
    });

    socket.on('close', () => {
      if (socket.sessioneId && connessioniPerSessione.has(socket.sessioneId)) {
        connessioniPerSessione.get(socket.sessioneId).delete(socket);
      }
      console.log('Client disconnesso');
    });
  });

  return wss;
}

function broadcast(sessioneId, messaggio) {
  const set = connessioniPerSessione.get(sessioneId);
  if (!set) return;

  const payload = JSON.stringify(messaggio);
  for (const socket of set) {
    if (socket.readyState === socket.OPEN) {
      socket.send(payload);
    }
  }
}

module.exports = { avviaWebSocket, broadcast };