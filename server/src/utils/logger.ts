import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

export function createLogger(service: string) {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: combine(timestamp(), colorize(), logFormat),
    defaultMeta: { service },
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: "logs/combined.log",
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });
}
