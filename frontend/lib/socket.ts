import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

class SocketService {
    private static instance: Socket | null = null;

    public static getSocket(): Socket {
        if (!SocketService.instance) {
            SocketService.instance = io(SOCKET_URL, {
                reconnectionDelayMax: 10000,
                transports: ["websocket", "polling"]
            });

            SocketService.instance.on("connect", () => {
                console.log("Socket connected:", SocketService.instance?.id);
            });

            SocketService.instance.on("disconnect", () => {
                console.log("Socket disconnected");
            });
        }

        return SocketService.instance;
    }
}

export const getSocket = SocketService.getSocket;
