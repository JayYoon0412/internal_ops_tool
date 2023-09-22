import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class Seller {

    @Field(() => String)
    uuid: string;

    @Field(() => String)
    email: string;

    @Field(() => String)
    mobile: string;

    @Field(() => String)
    category: string;
}