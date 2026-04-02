import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import net from "net";
import { register, Counter } from "prom-client";

const PORT = 3002;
const LOGSTASH_HOST = process.env.LOGSTASH_HOST || "localhost";
const LOGSTASH_PORT = 5000;

// Prometheus Metrics
const connectionCounter = new Counter({
  name: "chat_connections_total",
  help: "Total number of user connections",
});

const disconnectionCounter = new Counter({
  name: "chat_disconnections_total",
  help: "Total number of user disconnections",
});

const messageCounter = new Counter({
  name: "chat_messages_sent_total",
  help: "Total number of messages sent",
});

// Function to send logs to Logstash
function sendToLogstash(logData: any) {
  const client = net.createConnection(LOGSTASH_PORT, LOGSTASH_HOST, () => {
    client.write(JSON.stringify(logData) + "\n");
    client.end();
  });

  client.on("error", (err) => {
    console.error("Failed to connect to Logstash:", err.message);
  });
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  // In-memory storage
  const messages: any[] = [];
  const onlineUsers = new Map<string, { id: string; name: string }>();
  const userRegistry = new Map<string, string>(); // userId -> name mapping

  // Socket.io Logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    
    // Increment connection counter
    connectionCounter.inc();
    
    // Send connection log to Logstash
    sendToLogstash({
      timestamp: new Date().toISOString(),
      event: "user_connected",
      socketId: socket.id,
      message: `User connected with socket ID: ${socket.id}`,
    });

    socket.on("join", ({ name, id }) => {
      let userId = id;
      let userName = name;

      // If ID is provided, try to recover name from registry
      if (userId && userRegistry.has(userId)) {
        userName = userRegistry.get(userId);
      } else if (!userId) {
        // New user
        userId = uuidv4();
      }

      // If we have a name (either passed or recovered), register it
      if (userName) {
        userRegistry.set(userId, userName);
      } else {
        // If we still don't have a name, we can't join properly
        socket.emit("error", { message: "User name required for new IDs" });
        return;
      }

      const user = { id: userId, name: userName };

      // Store user as online
      onlineUsers.set(socket.id, user);

      // Send initial state
      socket.emit("init", {
        userId,
        userName,
        messages: messages.slice(-50),
        users: Array.from(onlineUsers.values()),
      });

      // Broadcast join status
      const statusMsg = {
        id: uuidv4(),
        type: "status",
        content: `${userName} joined the chat`,
        timestamp: Date.now(),
      };

      messages.push(statusMsg);
      if (messages.length > 100) messages.shift();

      io.emit("status_update", { user, status: "connected", message: statusMsg });
    });

    socket.on("send_message", (data) => {
      const message = {
        id: uuidv4(),
        type: "chat",
        userId: data.userId,
        userName: data.userName,
        content: data.content,
        timestamp: Date.now(),
      };

      // Increment message counter
      messageCounter.inc();

      // Store message
      messages.push(message);
      if (messages.length > 100) messages.shift();

      io.emit("new_message", message);
    });

    socket.on("disconnect", () => {
      const user = onlineUsers.get(socket.id);
      if (user) {
        onlineUsers.delete(socket.id);
        
        // Increment disconnection counter
        disconnectionCounter.inc();
        
        const statusMsg = {
          id: uuidv4(),
          type: "status",
          content: `${user.name} left the chat`,
          timestamp: Date.now(),
        };
        messages.push(statusMsg);
        if (messages.length > 100) messages.shift();

        io.emit("status_update", { user, status: "disconnected", message: statusMsg });
        
        // Send disconnection log to Logstash
        sendToLogstash({
          timestamp: new Date().toISOString(),
          event: "user_disconnected",
          socketId: socket.id,
          userId: user.id,
          userName: user.name,
          message: `User ${user.name} (${user.id}) disconnected`,
        });
      }
      console.log("User disconnected:", socket.id);
    });
  });

  // Prometheus metrics endpoint (must be before Vite middleware to take priority)
  app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
