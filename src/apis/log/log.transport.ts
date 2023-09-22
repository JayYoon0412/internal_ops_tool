import TransportStream = require('winston-transport');
import * as WebSocket from 'ws';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

export class DashboardTransport extends TransportStream {
  constructor() {
    super({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike('OpsTool', {
          colors: true,
          prettyPrint: true,
        }),
      ),
    });
  }

  log(info: any, callback: () => void) {
    const logMessage = JSON.stringify(info);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(logMessage);
      }
    });
    setImmediate(() => {
      this.emit('logged', info);
    });
    callback();
  }
}
