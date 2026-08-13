import mongoose from "mongoose";
import { env } from "../config/env";
import { getMongoHostDisplay, getMongoSchemeDisplay } from "../shared/mongo-uri";
import { logger } from "../shared/logger";

let isConnected = false;

export class MongoConnectionError extends Error {
  constructor(message = "MongoDB connection failed") {
    super(message);
    this.name = "MongoConnectionError";
  }
}

function logMongoConnectionFailure(error: unknown): void {
  const host = getMongoHostDisplay(env.MONGODB_URI);
  const scheme = getMongoSchemeDisplay(env.MONGODB_URI);

  console.error("[MONGODB] Connection failed.\n");
  console.error("Possible causes:");
  console.error("1. MongoDB is not running locally.");
  console.error("2. MONGODB_URI is incorrect.");
  console.error("3. MongoDB Atlas is unreachable.");
  console.error("4. Network/firewall issue.");
  console.error("");
  console.error(`Current scheme: ${scheme}`);
  console.error(`Current host: ${host}`);

  if (error instanceof Error && error.name === "MongooseServerSelectionError") {
    console.error("");
    console.error("Details: server selection timed out or connection was refused.");
  }
}

export async function connectMongoDB(): Promise<void> {
  if (isConnected) {
    return;
  }

  logger.mongodb("Connecting to MongoDB...");

  try {
    await mongoose.connect(env.MONGODB_URI);
    isConnected = true;
    logger.mongodb("MongoDB connected");
  } catch (error) {
    logMongoConnectionFailure(error);
    throw new MongoConnectionError();
  }
}

export async function disconnectMongoDB(): Promise<void> {
  if (!isConnected) {
    return;
  }

  logger.mongodb("Disconnecting from MongoDB...");

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.mongodb("MongoDB disconnected");
  } catch (error) {
    logger.error("Failed to disconnect from MongoDB", error);
    throw error;
  }
}

export function getMongoConnectionState(): boolean {
  return isConnected;
}
