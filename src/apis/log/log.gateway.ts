import { SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from 'ws'

@WebSocketGateway(8000)
export class LogGateway {
    @WebSocketServer()
    server: Server;

    @SubscribeMessage('events')
    onEvent(client: any, data: any) {
        return { event: 'events', data: 'client sent message to server' };
    }
}