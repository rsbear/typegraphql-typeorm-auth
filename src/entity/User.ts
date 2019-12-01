import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
import { ObjectType, Field, } from "type-graphql";

@ObjectType()
@Entity("users")
export class User extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Field()
  @Column("text")
  email: string;

  @Field()
  @Column("text")
  username: string;

  @Column("int", { default: 0 })
  tokenVersion: number;
}