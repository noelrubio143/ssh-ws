import { connect } from 'cloudflare:sockets';

export default {
  async fetch(req, env) {
    try {
      if (req.headers.get('Upgrade') !== 'websocket') {
        return new Response(
          'Expected WebSocket. SSH_HOST: ' + (env.SSH_HOST ? 'OK' : 'MISSING'),
          { status: 426 }
        );
      }

      const [client, server] = Object.values(new WebSocketPair());
      server.accept();

      const socket = connect({ hostname: env.SSH_HOST, port: 22 });
      const writer = socket.writable.getWriter();

      server.addEventListener('message', e =>
        writer.write(typeof e.data === 'string'
          ? new TextEncoder().encode(e.data)
          : new Uint8Array(e.data)));
      server.addEventListener('close', () => socket.close());

      socket.readable.pipeTo(new WritableStream({
        write(chunk) { server.send(chunk); },
        close() { server.close(); }
      })).catch(() => {});

      return new Response(null, { status: 101, webSocket: client });
    } catch (e) {
      return new Response('Error: ' + e.message, { status: 500 });
    }
  }
};
