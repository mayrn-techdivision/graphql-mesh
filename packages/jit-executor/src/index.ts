import { ExecutionResult, GraphQLSchema } from 'graphql';
import { CompiledQuery, compileQuery, isCompiledQuery } from 'graphql-jit';
import { Logger } from '@graphql-mesh/types';
import { createLruCache, printWithCache } from '@graphql-mesh/utils';
import {
  ExecutionRequest,
  Executor,
  getOperationASTFromRequest,
  memoize1,
} from '@graphql-tools/utils';

const getLruCacheForSchema = memoize1(function getLruCacheForSchema(schema: GraphQLSchema) {
  return createLruCache(1000, 3600);
});

export function createJITExecutor(schema: GraphQLSchema, prefix: string, logger: Logger): Executor {
  const lruCache = getLruCacheForSchema(schema);
  return function jitExecutor<
    TReturn extends Record<string, any>,
    TVariables,
    TContext,
    TRoot,
    TExtensions,
  >(request: ExecutionRequest<TVariables, TContext, TRoot, TExtensions>) {
    const { document, variables, context, operationName, rootValue } = request;
    const documentStr = printWithCache(document);
    logger.debug(`Executing ${documentStr}`);
    const cacheKey = [prefix, documentStr, operationName].join('_');
    let compiledQueryFn:
      | CompiledQuery<TReturn, TVariables>['query']
      | CompiledQuery<TReturn, TVariables>['subscribe'] = lruCache.get(cacheKey);
    if (!compiledQueryFn) {
      logger.debug(`Compiling ${documentStr}`);
      const compiledQuery = compileQuery<TReturn, TVariables>(schema, document, operationName);
      if (
        isCompiledQuery<CompiledQuery<TReturn, TVariables>, ExecutionResult<TReturn, any>>(
          compiledQuery,
        )
      ) {
        const { operation } = getOperationASTFromRequest(request);
        if (operation === 'subscription') {
          compiledQueryFn = compiledQuery.subscribe.bind(compiledQuery);
        } else {
          compiledQueryFn = compiledQuery.query.bind(compiledQuery);
        }
      } else {
        compiledQueryFn = () => compiledQuery;
      }
      lruCache.set(cacheKey, compiledQueryFn);
    } else {
      logger.debug(`Compiled version found for ${documentStr}`);
    }
    return compiledQueryFn(rootValue, context, variables);
  };
}
