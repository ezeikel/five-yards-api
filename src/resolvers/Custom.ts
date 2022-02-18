import { GraphQLScalarType } from 'graphql';
import { GraphQLUpload } from 'graphql-upload';
import { Kind } from 'graphql/language';
import md5 from 'md5';

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
  Upload: GraphQLUpload,
  User: {
    gravatar: (parent: any) => {
      const hash = md5(parent.email);
      return `https://gravatar.com/avatar/${hash}?s=200`;
    },
  },
};

export default Custom;
