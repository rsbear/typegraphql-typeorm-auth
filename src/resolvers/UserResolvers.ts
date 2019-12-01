import { ObjectType, Field, Resolver, Query, Ctx, Mutation, Arg } from "type-graphql";
import { User } from "../entity/User";
import { AppContext } from "../AppContext";
import { verify } from "jsonwebtoken";
import { Auth } from "../entity/Auth";
import { sendRefreshToken } from "../sendRefreshToken";
import { createRefreshToken, createAccessToken } from "../tokenGenerators";
import { getConnection } from "typeorm";

@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;

  @Field(() => User)
  user: User;
}

@Resolver()
export class UserResolvers {

  @Query(() => [User])
  async users() {
    await User.find()
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() context: AppContext) {
    const auth = context.req.headers["authorization"];

    if (!auth) {
      return null
    }

    try {
      const token = auth.split(" ")[1]
      const payload: any = verify(token, process.env.ACCESS_TOKEN_SECRET!);
      return User.findOne(payload.userId)
    } catch (err) {
      console.log(err)
      return null
    }
  }

  @Mutation(() => Boolean)
  async signup(
    @Arg("email") email: string,
    @Arg("username") username: string,
    @Arg("secret") secret: string,
  ) {
    try {
      const auth: Auth | undefined = await Auth.findOne({ where: { email } })

      if (!auth) {
        console.log("The auth object has not yet been created")
        return false
      }

      if (auth.secret !== secret) {
        console.log("Secrets did not match")
        return false
      }

      await User.insert({ email, username })

    } catch (err) {
      console.log(err)
      return false
    }
  }

  @Mutation(() => LoginResponse)
  async login(
    @Arg("email") email: string,
    @Arg("secret") secret: string,
    @Ctx() { res }: AppContext
  ): Promise<LoginResponse> {
    const user = await User.findOne({ where: { email } })
    const auth: any = await Auth.findOne({ where: { email } })

    if (!user) {
      throw new Error("Could not find user")
    }

    if (secret !== auth.secret) {
      throw new Error("User found, but that's not the magic word.")
    }

    sendRefreshToken(res, createRefreshToken(user))

    return {
      accessToken: createAccessToken(user),
      user
    }
  }

  @Mutation(() => Boolean)
  async revokeRefreshTokensForUser(@Arg("userId") userId: string) {
    await getConnection()
      .getRepository(User)
      .increment({ id: userId }, "tokenVersion", 1);

    return true;
  }

  @Mutation(() => Boolean)
  async deleteUser(
    @Arg("id") id: string,
  ) {
    try {
      await User.delete({
        id: id
      })
    } catch (err) {
      console.log(err)
      return false
    }
  }
}