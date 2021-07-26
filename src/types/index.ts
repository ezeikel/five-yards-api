// https://itnext.io/how-to-extend-the-expressjs-request-object-with-typescript-26675cda0632
declare namespace Express {
  export interface Request {
    id: string;
    userId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      permission: [string];
    };
  }
}

declare namespace NodeJS {
  export interface ProcessEnv {
    DATABASE_ENDPOINT: string;
    ACCESS_TOKEN_SECRET: string;
  }
}
