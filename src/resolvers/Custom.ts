import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';

const Custom = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    serialize(value: { getTime: () => string }) {
      return value.getTime(); // value sent to client
    },
    parseValue(value) {
      return new Date(value as string); // value from the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value); // ast value is always in string format
      }
      return null;
    },
  }),
};

export default Custom;
