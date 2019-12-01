import 'dotenv/config';
import 'reflect-metadata'
import express from "express";
import { ApolloServer } from 'apollo-server-express'
// import { graphqlUploadExpress } from 'graphql-upload';
import { buildSchema } from 'type-graphql'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { verify } from 'jsonwebtoken';
import { createConnection } from 'typeorm';
import { User } from './entity/User'
import { createAccessToken, createRefreshToken } from './tokenGenerators'
import { sendRefreshToken } from './sendRefreshToken'

import { AuthResolvers } from './resolvers/AuthResolvers'
import { UserResolvers } from './resolvers/UserResolvers'


(async () => {
  const app = express()
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }))
  app.use(cookieParser())
  app.get("/", (_req, res) => res.send("check 1 2"))
  app.post("/refresh_token", async (req, res) => {
    const token = req.cookies.rfs
    if (!token) {
      return res.send({ ok: false, accessToken: "" })
    }

    let payload: any = null
    try {
      payload = verify(token, process.env.REFRESH_TOKEN_SECRET!)
    } catch (err) {
      console.log(err)
      return res.send({ ok: false, accessToken: "" })
    }

    // token is valid and
    // we can send back an access token
    const user = await User.findOne({ id: payload.userId });

    if (!user) {
      return res.send({ ok: false, accessToken: "" });
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return res.send({ ok: false, accessToken: "" });
    }

    sendRefreshToken(res, createRefreshToken(user));

    return res.send({ ok: true, accessToken: createAccessToken(user) });
  })

  try {
    await createConnection()
  } catch (err) {
    console.log(`connection err ${err}`)
  }

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      validate: false,
      resolvers: [
        AuthResolvers,
        UserResolvers,
      ]
    }),
    context: ({ req, res }) => ({ req, res })
  });

  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(4000, () => {
    console.log('🚀 SERVER UP AND RUNNING ON http://localhost:4000/graphql')
  })
})();

