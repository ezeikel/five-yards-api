// https://itnext.io/how-to-extend-the-expressjs-request-object-with-typescript-26675cda0632

// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars
declare namespace Express {
  export interface Request {
    id: string;
    userId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      permissions: [string];
    };
  }
}
// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars
declare namespace NodeJS {
  export interface ProcessEnv {
    DATABASE_ENDPOINT: string;
    ACCESS_TOKEN_SECRET: string;
  }
}

export {};
