import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

const PORT = process.env.PORT || 5000;

console.log("Initializing Secure Feedback System Backend...");

try {
    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    server.on('error', (err) => {
        console.error("Server failed to start:", err);
    });

    // Handle unexpected closures
    server.on('close', () => {
        console.log("Server connection closed");
    });

} catch (error) {
    console.error("Initialization error:", error);
}