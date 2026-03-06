// Socket.IO client singleton for Next.js client components
import { io } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

let socket;

export function getSocket() {
    if (!socket) {
        socket = io(BACKEND_URL, {
            transports: ["websocket", "polling"],
            autoConnect: true,
        });
    }
    return socket;
}

export default getSocket;
